import dotenv from 'dotenv';
import path from 'path';

// Load environment variables — root .env in local dev, Cloud Run env vars in production
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback: also check service-local .env

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { prisma, prismaRead, feedRanker } from './context';
import { initRedis } from './redis';
import sseRouter from './sse';
import dmRouter, { initDMRoutes } from './dm';
import clubsRouter, { initClubsRoutes } from './clubs';
import calendarRouter from './calendar';
import storiesRouter from './stories';
import mediaRouter from './routes/media.routes';
import { authenticateToken } from './middleware/auth';
import { startGamificationJobs } from './gamificationJobs';

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
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = parseInt(process.env.PORT || process.env.FEED_SERVICE_PORT || '3010', 10);

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
    await Promise.all([
      prisma.$disconnect(),
      prismaRead.$disconnect(),
    ]);
    console.log('✅ DB disconnected');
  } catch (e) {
    console.error('⚠️ Cleanup error:', e);
  }
  process.exit(0);
}

// ─── Database Warmup ───────────────────────────────────────────────
type DbWarmupState = {
  isWarm: boolean;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  primaryLatencyMs?: number;
  readLatencyMs?: number;
  totalLatencyMs?: number;
  error?: string;
};

let dbWarmupState: DbWarmupState = { isWarm: false };
let dbWarmupInFlight: Promise<void> | null = null;

const pingDatabase = async (client: typeof prisma) => {
  const startedAt = Date.now();
  await client.$queryRaw`SELECT 1`;
  return Date.now() - startedAt;
};

const warmUpDb = async (reason = 'scheduled') => {
  if (dbWarmupInFlight) return dbWarmupInFlight;

  dbWarmupInFlight = (async () => {
    const startedAt = Date.now();
    dbWarmupState = {
      ...dbWarmupState,
      isWarm: false,
      lastAttemptAt: new Date().toISOString(),
      error: undefined,
    };

    try {
      const [primaryLatencyMs, readLatencyMs] = await Promise.all([
        pingDatabase(prisma),
        pingDatabase(prismaRead),
      ]);

      dbWarmupState = {
        isWarm: true,
        lastAttemptAt: dbWarmupState.lastAttemptAt,
        lastSuccessAt: new Date().toISOString(),
        primaryLatencyMs,
        readLatencyMs,
        totalLatencyMs: Date.now() - startedAt,
      };
      console.log(`✅ Feed Service - Database ready (${reason}, primary=${primaryLatencyMs}ms, read=${readLatencyMs}ms)`);
    } catch (error: any) {
      dbWarmupState = {
        ...dbWarmupState,
        isWarm: false,
        error: error?.message || 'Database warmup failed',
        totalLatencyMs: Date.now() - startedAt,
      };
      console.error(`⚠️ Feed Service - Database warmup failed (${reason}):`, dbWarmupState.error);
    } finally {
      dbWarmupInFlight = null;
    }
  })();

  return dbWarmupInFlight;
};

setInterval(() => { void warmUpDb('keepalive'); }, 4 * 60 * 1000);

// ─── Background Jobs ──────────────────────────────────────────────
// CLOUD RUN NOTE: On Cloud Run, multiple instances can run simultaneously.
// Set ENABLE_BACKGROUND_JOBS=true on exactly ONE instance (via Cloud Run
// min-instances=1 with a dedicated revision, or just accept duplicate runs
// on free tier since refreshPostScores is idempotent and low-frequency).
// Set DISABLE_BACKGROUND_JOBS=true to opt a specific instance OUT.
const runBackgroundJobs = process.env.DISABLE_BACKGROUND_JOBS !== 'true';

if (runBackgroundJobs) {
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
          if (rankedFeed.items.length > 0) {
            const { feedCache: cache } = require('./redis');
            await cache.set(
              `feed:precomputed:${userId}`,
              JSON.stringify(rankedFeed.items.map((item: any) => item.type === 'POST' ? item.data.post.id : item.type)),
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

  // Gamification & Academic Background Jobs
  startGamificationJobs(prisma);
} else {
  console.log('⏭️  Background jobs disabled on this instance (DISABLE_BACKGROUND_JOBS=true)');
}

// ─── Redis ─────────────────────────────────────────────────────────
initRedis();

// ─── Rate Limiting ─────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Too many requests, please try again later' },
});

// Write-endpoint rate limits (enterprise security)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Too many write requests, slow down' },
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Upload limit reached, try again later' },
});

// ─── CORS ──────────────────────────────────────────────────────────
// In production (Cloud Run), set ALLOWED_ORIGINS env var to comma-separated list
// e.g. ALLOWED_ORIGINS=https://stunity.com,https://app.stunity.com
const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3010'];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in production if CORS_ORIGIN is set to *
    if (process.env.CORS_ORIGIN === '*') return callback(null, true);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Security Headers (Enterprise) ─────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // CSP handled at reverse proxy level
  crossOriginEmbedderPolicy: false, // Allow media embeds
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply HPP *after* body parsers so it doesn't try to buffer multipart binary streams
app.use(hpp());

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let isHealthy = true;

  const [primaryDb, readDb] = await Promise.allSettled([
    pingDatabase(prisma),
    pingDatabase(prismaRead),
  ]);

  if (primaryDb.status === 'fulfilled') {
    checks.database = { status: 'healthy', latencyMs: primaryDb.value };
  } else {
    isHealthy = false;
    checks.database = { status: 'unhealthy', error: primaryDb.reason?.message || 'Primary database unavailable' };
  }

  if (readDb.status === 'fulfilled') {
    checks.readDatabase = { status: 'healthy', latencyMs: readDb.value };
  } else {
    isHealthy = false;
    checks.readDatabase = { status: 'unhealthy', error: readDb.reason?.message || 'Read database unavailable' };
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
    databaseWarmup: {
      status: dbWarmupState.isWarm ? 'warm' : 'warming',
      ...dbWarmupState,
    },
  });
});

// ─── Static & Media ────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/upload', uploadLimiter); // Rate limit file uploads
app.use('/', mediaRouter);

// ─── Write-Endpoint Rate Limiting ──────────────────────────────────
// Apply stricter limits to POST/PUT/DELETE on content endpoints
app.post('/posts', writeLimiter);
app.post('/posts/:id/comments', writeLimiter);
app.post('/posts/:id/repost', writeLimiter);
app.put('/posts/:id', writeLimiter);
app.delete('/posts/:id', writeLimiter);

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
// SSE: EventSource can't send headers, so accept token via query param
app.use('/api/events', (req, res, next) => {
  if (!req.headers['authorization'] && req.query.token) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  next();
}, authenticateToken as any, sseRouter);
initDMRoutes(prisma);
app.use('/dm', authenticateToken as any, dmRouter);
initClubsRoutes(prisma);
app.use('/clubs', authenticateToken as any, clubsRouter);
app.use('/calendar', authenticateToken as any, calendarRouter);
app.use('/stories', authenticateToken as any, storiesRouter);

// ─── Phase 1 Day 7: Error Handler (must be last) ───────────────────
app.use(errorLogger);

// ─── Start Server ──────────────────────────────────────────────────
const startServer = async () => {
  await warmUpDb('startup');

  server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   📱 Feed Service - Stunity Enterprise v8.0   ║');
    console.log('║   Secure · Modular · Enterprise-Ready          ║');
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
    console.log('   stories           → Stories');
    console.log('');
  });

  // Cloud Run: keep-alive timeout must exceed the load balancer's 600s timeout
  // This prevents "connection reset" errors on long-lived SSE streams
  server.keepAliveTimeout = 620 * 1000; // 620 seconds
  server.headersTimeout = 630 * 1000;   // must be > keepAliveTimeout
};

void startServer();
