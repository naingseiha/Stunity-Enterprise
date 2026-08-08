import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken } from '../../../../lib/auth-tokens';
import { prisma } from './lib/prisma';
import { shouldRunDbStartupWarmup } from '../../../../lib/prisma-pool-url';
import { getJwtSecret } from '../../../../lib/jwt-secret';



const app = express.Router();

// Database warmup

const PORT = process.env.PORT || process.env.CLUB_SERVICE_PORT || 3012;
const JWT_SECRET = getJwtSecret();

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];


// ===========================
// JWT Auth Middleware
// ===========================
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    const decoded = verifyAccessToken(token, JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    console.error('Auth error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message === 'jwt expired' ? 'Token expired' : 'Invalid token',
    });
  }
};

// Optional auth middleware (allows both authenticated and anonymous access)
const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = verifyAccessToken(token, JWT_SECRET);
      if (decoded.userId) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      }
    }

    next(); // Continue regardless of auth status
  } catch (error: any) {
    // Silently continue without auth
    next();
  }
};

// ===========================
// Health Check
// ===========================
app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'Club Service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
    description: 'Independent teacher-created classes and study groups',
  });
});

// Import routes
import clubRoutes from './routes/clubs';
import subjectRoutes from './routes/subjects';
import gradeRoutes from './routes/grades';
import sessionRoutes from './routes/sessions';
import attendanceRoutes from './routes/attendance';
import assignmentRoutes from './routes/assignments';
import submissionRoutes from './routes/submissions';
import awardRoutes from './routes/awards';
import reportRoutes from './routes/reports';
import materialRoutes from './routes/materials';
import announcementRoutes from './routes/announcements';
import { getSharedPrisma } from '../../core/prisma';

// Club routes with optional auth for discovery
app.use('/clubs', optionalAuthMiddleware, clubRoutes);

// All other routes require auth
app.use('/subjects', authMiddleware, subjectRoutes);
app.use('/grades', authMiddleware, gradeRoutes);
app.use('/sessions', authMiddleware, sessionRoutes);
app.use('/attendance', authMiddleware, attendanceRoutes);
app.use('/assignments', authMiddleware, assignmentRoutes);
app.use('/submissions', authMiddleware, submissionRoutes);
app.use('/awards', authMiddleware, awardRoutes);
app.use('/reports', authMiddleware, reportRoutes);
app.use('/materials', authMiddleware, materialRoutes);
app.use('/announcements', authMiddleware, announcementRoutes);

// Start server

export { prisma, authMiddleware, AuthRequest };


export default app;
