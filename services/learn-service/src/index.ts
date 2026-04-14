import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import { prisma } from './context';
import coursesRouter from './routes/courses.routes';
import { authenticateToken } from './middleware/auth';

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.LEARN_SERVICE_PORT || '3018', 10);

// Graceful Shutdown
let server: any;
let isShuttingDown = false;

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

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
warmUpDb();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? '*' : true,
  credentials: true,
}));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(hpp());

// Health Check
app.get('/health', async (_req: Request, res: Response) => {
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

// Start Server
server = app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🎓 Learn Service - Stunity Enterprise v1.0   ║');
  console.log('║   Secure · Modular · Hierarchical LMS          ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`✅ Server running on port ${PORT}`);
});
