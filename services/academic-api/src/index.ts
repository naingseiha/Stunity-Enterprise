/**
 * Academic API — consolidated School Information System service.
 *
 * Phase 0 consolidation (docs/ARCHITECTURE_REVIEW_2026-07.md §5): the former
 * school/student/teacher/class/subject/grade/attendance/timetable/club services
 * now run as router modules inside this single deployable. Route paths are
 * unchanged, so existing clients only need their *_SERVICE_URL env values
 * pointed here (club URLs get a `/club` suffix — see mount below).
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

import schoolRouter from './modules/school';
import studentRouter from './modules/student';
import teacherRouter from './modules/teacher';
import classRouter from './modules/class';
import subjectRouter from './modules/subject';
import gradeRouter from './modules/grade';
import attendanceRouter from './modules/attendance';
import timetableRouter from './modules/timetable';
import clubRouter from './modules/club';

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

const PORT = process.env.PORT || process.env.ACADEMIC_API_PORT || 3021;

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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
// 200/15min per service × 9 merged services → keep the same effective budget
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 1800),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests' },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'academic-api', timestamp: new Date().toISOString() });
});

// ── Module mounts ──
// Every module keeps its original path namespace (/schools, /students, …).
// club-service overlapped /subjects, /grades, /attendance with the dedicated
// services, so it is the one module mounted under a prefix: CLUB_SERVICE_URL
// must point at <academic-api>/club.
app.use(schoolRouter);
app.use(studentRouter);
app.use(teacherRouter);
app.use(classRouter);
app.use(subjectRouter);
app.use(gradeRouter);
app.use(attendanceRouter);
app.use(timetableRouter);
app.use('/club', clubRouter);

const server = app.listen(PORT, () => {
  console.log(`🏫 Academic API running on port ${PORT}`);
  console.log('   modules: schools, students, teachers, classes, subjects, grades, attendance, timetable, club/*');
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down Academic API`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
