import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}

const app = express();

// Singleton Prisma pattern
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database warmup
(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Club Service - Database ready');
  } catch (e) {
    console.error('⚠️ DB warmup failed');
  }
})();

const PORT = process.env.CLUB_SERVICE_PORT || 3012;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests' } }));
app.use(express.json({ limit: '1mb' }));

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

    const decoded = jwt.verify(token, JWT_SECRET) as any;

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
      const decoded = jwt.verify(token, JWT_SECRET) as any;
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

// Start server
app.listen(PORT, () => {
  console.log(`
🎓 Club Service running on port ${PORT}
📚 All Endpoints (55 total):
   GET    /health
   
   Club Management (10 endpoints):
   POST   /clubs - Create club
   GET    /clubs - List clubs
   GET    /clubs/:id - Get club details
   PUT    /clubs/:id - Update club
   DELETE /clubs/:id - Delete club
   POST   /clubs/:id/join - Join club
   POST   /clubs/:id/leave - Leave club
   GET    /clubs/:id/members - List members
   PUT    /clubs/:id/members/:userId/role - Update role
   DELETE /clubs/:id/members/:userId - Remove member
   
   Subject Management (6 endpoints):
   POST   /subjects/clubs/:clubId/subjects - Create subject
   GET    /subjects/clubs/:clubId/subjects - List subjects
   GET    /subjects/:id - Get subject
   PUT    /subjects/:id - Update subject
   DELETE /subjects/:id - Delete subject
   PUT    /subjects/:id/instructor - Assign instructor
   
   Grade Book (6 endpoints):
   POST   /grades/clubs/:clubId/grades - Create grade
   GET    /grades/clubs/:clubId/grades - List grades
   GET    /grades/clubs/:clubId/grades/members/:memberId/summary - Member summary
   GET    /grades/clubs/:clubId/grades/statistics - Statistics
   PUT    /grades/:id - Update grade
   DELETE /grades/:id - Delete grade
   
   Session Management (5 endpoints):
   POST   /sessions/clubs/:clubId/sessions - Create session
   GET    /sessions/clubs/:clubId/sessions - List sessions
   GET    /sessions/:id - Get session with attendance
   PUT    /sessions/:id - Update session
   DELETE /sessions/:id - Delete session
   
   Attendance Tracking (6 endpoints):
   POST   /attendance/sessions/:sessionId/attendance - Mark attendance
   GET    /attendance/sessions/:sessionId/attendance - Session attendance
   GET    /attendance/clubs/:clubId/attendance/members/:memberId/summary - Member summary
   GET    /attendance/clubs/:clubId/attendance/statistics - Statistics
   PUT    /attendance/:id - Update attendance
   DELETE /attendance/:id - Delete attendance
   
   Assignment Management (7 endpoints):
   POST   /assignments/clubs/:clubId/assignments - Create assignment
   GET    /assignments/clubs/:clubId/assignments - List assignments
   GET    /assignments/:id - Get assignment
   PUT    /assignments/:id - Update assignment
   DELETE /assignments/:id - Delete assignment
   POST   /assignments/:id/publish - Publish assignment
   GET    /assignments/:id/statistics - Assignment statistics
   
   Submission System (6 endpoints):
   POST   /submissions/assignments/:assignmentId/submit - Submit assignment
   GET    /submissions/assignments/:assignmentId/submissions - List submissions
   GET    /submissions/clubs/:clubId/members/:memberId/submissions - Member submissions
   GET    /submissions/:id - Get submission
   PUT    /submissions/:id/grade - Grade submission
   DELETE /submissions/:id - Delete submission
   
   Awards & Certificates (5 endpoints):
   POST   /awards/clubs/:clubId/awards - Create award
   GET    /awards/clubs/:clubId/awards - List club awards
   GET    /awards/clubs/:clubId/members/:memberId/awards - Member awards
   GET    /awards/:id - Get award details
   DELETE /awards/:id - Revoke award
   
   Reports & Transcripts (3 endpoints):
   GET    /reports/clubs/:clubId/members/:memberId/report - Generate member report
   GET    /reports/clubs/:clubId/report - Generate club report
   GET    /reports/clubs/:clubId/members/:memberId/transcript - Get transcript
  `);
});

export { prisma, authMiddleware, AuthRequest };
