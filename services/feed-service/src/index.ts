import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env FIRST before other imports
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { prisma } from './context';
import { feedRanker } from './context';
import { initRedis } from './redis';
import sseRouter from './sse';
import dmRouter, { initDMRoutes } from './dm';
import clubsRouter, { initClubsRoutes } from './clubs';
import calendarRouter from './calendar';
import coursesRouter from './courses';
import storiesRouter from './stories';
import mediaRouter from './routes/media.routes';
import { authenticateToken } from './middleware/auth';

// ─── Phase 1 Day 7: Performance Monitoring ─────────────────────────
import { 
  performanceMonitoring, 
  requestSizeTracking,
  errorLogger
} from './middleware/monitoring';

// ─── Route Modules ─────────────────────────────────────────────────
import postsRouter from './routes/posts.routes';
import postActionsRouter from './routes/postActions.routes';
import quizRouter from './routes/quiz.routes';
import analyticsRouter from './routes/analytics.routes';
import profileRouter from './routes/profile.routes';
import skillsRouter from './routes/skills.routes';
import experienceRouter from './routes/experience.routes';
import achievementsRouter from './routes/achievements.routes';

const app = express();
const PORT = 3010;

// ─── Graceful Shutdown ─────────────────────────────────────────────
let server: any;
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 ${signal} received — draining connections...`);
  if (server) {
    server.close(() => console.log('✅ HTTP server closed'));
  }
  await new Promise(resolve => setTimeout(resolve, 5000));
  try {
    await prisma.$disconnect();
    console.log('✅ DB disconnected');
  } catch (e) {
    console.error('⚠️ Cleanup error:', e);
  }
  process.exit(0);
}

// ─── Database Warmup ───────────────────────────────────────────────
let isDbWarm = false;
const warmUpDb = async () => {
  if (isDbWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbWarm = true;
    console.log('✅ Feed Service - Database ready');
  } catch (error) {
    console.error('⚠️ Feed Service - Database warmup failed');
  }
};
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000);

// ─── Background Jobs ──────────────────────────────────────────────
setInterval(async () => {
  try {
    const count = await feedRanker.refreshPostScores();
    console.log(`🧠 [FeedRanker] Refreshed ${count} post scores`);
  } catch (err) {
    console.error('❌ [FeedRanker] Score refresh error:', err);
  }
}, 5 * 60 * 1000);

setTimeout(async () => {
  try {
    const count = await feedRanker.refreshPostScores();
    console.log(`🧠 [FeedRanker] Initial score refresh: ${count} posts`);
  } catch (err) {
    console.error('❌ [FeedRanker] Initial score refresh error:', err);
  }
}, 5000);

// Pre-compute ranked feeds for top 100 active users every 5 minutes
setInterval(async () => {
  try {
    // Find the 100 most recently active users
    const activeUsers = await prisma.userFeedSignal.findMany({
      select: { userId: true },
      orderBy: { lastInteraction: 'desc' },
      distinct: ['userId'],
      take: 100,
    });

    let cached = 0;
    for (const { userId } of activeUsers) {
      try {
        const rankedFeed = await feedRanker.generateFeed(userId, { page: 1, limit: 20 });
        if (rankedFeed.posts.length > 0) {
          const { feedCache: cache } = require('./redis');
          await cache.set(
            `feed:precomputed:${userId}`,
            JSON.stringify(rankedFeed.posts.map((p: any) => p.id)),
            300 // 5min TTL
          );
          cached++;
        }
      } catch { /* skip individual user errors */ }
    }

    if (cached > 0) {
      console.log(`📦 [FeedCache] Pre-computed feeds for ${cached}/${activeUsers.length} active users`);
    }
  } catch (err) {
    console.error('❌ [FeedCache] Pre-compute error:', err);
  }
}, 5 * 60 * 1000);

// ─── Redis ─────────────────────────────────────────────────────────
initRedis();

// ─── Rate Limiting ─────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

// ─── Middleware ─────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3010'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(generalLimiter);

// ─── HTTP Compression (Phase 1 Optimization) ───────────────────────
// Compress responses > 1KB to reduce bandwidth by ~70%
app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6, // Balance between speed and compression ratio
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress JSON, text, and feed responses
    return compression.filter(req, res);
  }
}));

app.use(performanceMonitoring);
app.use(requestSizeTracking);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let isHealthy = true;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch (error: any) {
    isHealthy = false;
    checks.database = { status: 'unhealthy', error: error.message };
  }

  try {
    const { feedCache: cache } = require('./redis');
    const redisStart = Date.now();
    await cache.get('health-check');
    checks.redis = { status: 'healthy', latencyMs: Date.now() - redisStart };
  } catch (error: any) {
    checks.redis = { status: 'degraded', error: 'Using in-memory fallback' };
  }

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    checks,
  });
});

// ─── Static & Media ────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/', mediaRouter);

// ─── Route Modules ─────────────────────────────────────────────────
app.use('/', postsRouter);
app.use('/', postActionsRouter);
app.use('/', quizRouter);
app.use('/', analyticsRouter);
app.use('/', profileRouter);
app.use('/', skillsRouter);
app.use('/', experienceRouter);
app.use('/', achievementsRouter);

// ─── Feature Modules (existing routers) ────────────────────────────
app.use('/api/events', authenticateToken as any, sseRouter);
initDMRoutes(prisma);
app.use('/dm', authenticateToken as any, dmRouter);
initClubsRoutes(prisma);
app.use('/clubs', authenticateToken as any, clubsRouter);
app.use('/calendar', authenticateToken as any, calendarRouter);
app.use('/courses', authenticateToken as any, coursesRouter);
app.use('/learning-paths', authenticateToken as any, coursesRouter);
app.use('/stories', authenticateToken as any, storiesRouter);

// ─── Phase 1 Day 7: Error Handler (must be last) ───────────────────
app.use(errorLogger);

// ─── Start Server ──────────────────────────────────────────────────
server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   📱 Feed Service - Stunity Enterprise v7.0   ║');
  console.log('║        Modular Route Architecture              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📦 Route modules loaded:');
  console.log('   posts.routes      → GET/POST /posts, /posts/feed');
  console.log('   postActions       → CRUD post actions, comments, polls');
  console.log('   quiz              → Quiz submit, attempts, leaderboard');
  console.log('   analytics         → Views, insights, trending');
  console.log('   profile           → User profiles, search, follow');
  console.log('   skills            → Skills CRUD, endorsements');
  console.log('   experience        → Experiences, certs, projects');
  console.log('   achievements      → Achievements, recommendations');
  console.log('   media             → Upload, delete, proxy');
  console.log('   sse, dm, clubs    → Real-time, messaging, clubs');
  console.log('   courses, stories  → Learning, stories');
  console.log('');
});
