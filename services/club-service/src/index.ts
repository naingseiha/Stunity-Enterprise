import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

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

const PORT = process.env.PORT || 3012;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

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

app.use('/clubs', authMiddleware, clubRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`
🎓 Club Service running on port ${PORT}
📚 Endpoints:
   GET    /health
   POST   /clubs (create club)
   GET    /clubs (list clubs)
   GET    /clubs/:id (get club details)
   PUT    /clubs/:id (update club)
   DELETE /clubs/:id (delete club)
   POST   /clubs/:id/join (join club)
   POST   /clubs/:id/leave (leave club)
   GET    /clubs/:id/members (list members)
   PUT    /clubs/:id/members/:userId/role (update role)
   DELETE /clubs/:id/members/:userId (remove member)
  `);
});

export { prisma, authMiddleware, AuthRequest };
