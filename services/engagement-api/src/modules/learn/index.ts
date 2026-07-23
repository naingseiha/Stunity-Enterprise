import path from 'path';

// Load environment variables

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import { prisma } from './context';
import coursesRouter from './routes/courses.routes';
import toolDraftsRouter from './routes/tool-drafts.routes';
import { authenticateToken } from './middleware/auth';
import { CertificateController } from './controllers/certificate.controller';
import { MediaController } from './controllers/media.controller';
import { shouldRunDbStartupWarmup } from '../../../../lib/prisma-pool-url';

const app = express.Router();
const PORT = parseInt(process.env.PORT || process.env.LEARN_SERVICE_PORT || '3018', 10);

// Graceful Shutdown
let server: any;
let isShuttingDown = false;


async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 ${signal} received — draining connections...`);
  if (server) {
    server.close(() => console.log('✅ HTTP server closed'));
  }
  
  // Quick timeout for pending connections
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    await prisma.$disconnect();
    console.log('✅ DB disconnected');
  } catch (e) {
    console.error('⚠️ Cleanup error:', e);
  }
  process.exit(0);
}

// Database Warmup
const warmUpDb = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Learn Service - Database ready');
  } catch (error) {
    console.error('⚠️ Learn Service - Database warmup failed');
  }
};

// Middleware
app.use(compression());
app.use(['/courses', '/learning-paths', '/media', '/tool-drafts'], express.json({ limit: '50mb' }));
app.use(['/courses', '/learning-paths', '/media', '/tool-drafts'], express.urlencoded({ limit: '50mb', extended: true }));
app.use(hpp());

// Health Check (liveness only; no DB query)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Readiness — verifies database connectivity when explicitly requested
app.get(['/ready', '/health/ready'], async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'healthy', uptime: process.uptime() });
  } catch (error: any) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Routes
app.use('/courses', authenticateToken as any, coursesRouter);
app.use('/learning-paths', authenticateToken as any, coursesRouter);
app.use('/media', authenticateToken as any, MediaController.getPresignedUrl as any);
app.use('/tool-drafts', authenticateToken as any, toolDraftsRouter);

// Public Routes
app.get('/certificates/verify/:code', CertificateController.verifyCertificate as any);

// Start Server

export default app;
