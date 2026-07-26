/**
 * Engagement API — consolidated auth/social/learning service.
 *
 * Phase 0 consolidation (docs/ARCHITECTURE_REVIEW_2026-07.md §5): the former
 * auth/feed/learn/messaging/notification/analytics services now run as router
 * modules inside this single deployable. Route paths are unchanged, so
 * existing clients only need their *_SERVICE_URL env values pointed here.
 *
 * feed-service owned the process's WebSocket upgrade handling and long-lived
 * SSE keep-alive tuning; that responsibility moves to this core file since
 * only the top-level HTTP server (not a per-module router) can attach an
 * 'upgrade' listener or set server-level timeouts.
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

import { getSharedPrisma } from './core/prisma';
import {
  shouldRunDbStartupWarmup,
  shouldRunDbKeepalive,
  scheduleDbKeepalive,
} from '../../lib/prisma-pool-url';

import authRouter from './modules/auth';
import feedRouter from './modules/feed';
import learnRouter from './modules/learn';
import messagingRouter from './modules/messaging';
import notificationRouter from './modules/notification';
import analyticsRouter from './modules/analytics';
import { initWebSocketServer } from './modules/feed/websocket';
import { isQuizWarEnabled } from './modules/feed/featureFlags';
import { requestIdMiddleware } from './core/requestId';

const app = express();
app.set('trust proxy', 1); // Cloud Run / proxy X-Forwarded-For

const prisma = getSharedPrisma();

if (shouldRunDbStartupWarmup()) {
  (async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database ready');
    } catch {
      console.error('⚠️ DB warmup failed');
    }
  })();
}
if (shouldRunDbKeepalive()) {
  scheduleDbKeepalive(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      /* next tick retries */
    }
  });
}

const PORT = process.env.PORT || process.env.ENGAGEMENT_API_PORT || 3022;

if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN === '*') {
  throw new Error('Refusing to start engagement-api with wildcard CORS_ORIGIN in production');
}

// ── Shared middleware (was duplicated per service before consolidation) ──
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
     'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.CORS_ORIGIN === '*') return callback(null, true);
    if (!origin) return callback(null, true); // mobile apps, curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Device-ID', 'X-Device-Name'],
}));
app.use(requestIdMiddleware);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
// 6 merged services each budgeted ~200/15min; keep that combined ceiling.
// Auth/feed keep their own tighter per-route limiters (globalLimiter,
// authLimiter, generalLimiter, …) layered on top of this outer default.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 1200),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests' },
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'engagement-api', timestamp: new Date().toISOString() });
});

// ── Module mounts ──
// Body-size limits differ per module (auth 10kb, feed/learn 50mb for media,
// messaging/notification 1mb) — each module scopes its own express.json()
// to its own path prefix, so no single global body parser is set here.
app.use(authRouter);
app.use(learnRouter);
app.use(messagingRouter);
app.use(notificationRouter);
app.use(analyticsRouter);
app.use(feedRouter); // mounted last: many feed routes have no path prefix (/posts, /users, …)

app.use((err: any, req: Request, res: Response, _next: express.NextFunction) => {
  const requestId = res.locals.requestId;
  console.error(JSON.stringify({
    level: 'ERROR', requestId, method: req.method, path: req.path,
    message: err?.message || 'Unhandled error', stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
  }));
  res.status(Number(err?.statusCode || err?.status) || 500).json({
    success: false, error: 'An error occurred', requestId,
  });
});

const server = app.listen(PORT, () => {
  console.log(`💬 Engagement API running on port ${PORT}`);
  console.log('   modules: auth, feed, learn, messaging, notification, analytics');
});

if (isQuizWarEnabled()) {
  initWebSocketServer(server);
} else {
  console.log('🎮 Quiz War disabled by QUIZ_WAR_ENABLED (default: false)');
}

// Cloud Run: keep-alive timeout must exceed the load balancer's 600s timeout
// (carried over from feed-service — this prevented "connection reset" on
// long-lived SSE streams there; same constraint applies to the merged process)
server.keepAliveTimeout = 620 * 1000;
server.headersTimeout = 630 * 1000;

const shutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down Engagement API`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
