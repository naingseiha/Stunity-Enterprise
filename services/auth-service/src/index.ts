import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

dotenv.config();

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';
const REFRESH_TOKEN_EXPIRATION = '30d';

const prisma = new PrismaClient();

// Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Middleware
app.use(cors());
app.use(express.json());

// Types
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId: string;
  };
}

// Auth Middleware
const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { school: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    if (user.school && !user.school.isActive) {
      return res.status(403).json({
        success: false,
        error: 'School subscription is inactive',
      });
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role,
      schoolId: user.schoolId || '',
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// API info
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'Stunity Enterprise - Authentication Service',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      login: '/auth/login (POST)',
      register: '/auth/register (POST)',
      verify: '/auth/verify (GET)',
      refresh: '/auth/refresh (POST)',
    },
  });
});

// Login endpoint
app.post(
  '/auth/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user with school
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          school: {
            select: {
              id: true,
              name: true,
              slug: true,
              subscriptionTier: true,
              subscriptionEnd: true,
              isTrial: true,
              isActive: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is suspended',
        });
      }

      // Check if school is active
      if (user.school && !user.school.isActive) {
        return res.status(403).json({
          success: false,
          error: 'School subscription is inactive',
        });
      }

      // Check subscription expiration
      if (user.school?.subscriptionEnd && new Date(user.school.subscriptionEnd) < new Date()) {
        return res.status(403).json({
          success: false,
          error: 'School subscription has expired',
          details: {
            expiredAt: user.school.subscriptionEnd,
          },
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          loginCount: { increment: 1 },
        },
      });

      // Generate tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRATION } as jwt.SignOptions
      );

      // Calculate trial days remaining if applicable
      let trialDaysRemaining = null;
      if (user.school?.isTrial && user.school.subscriptionEnd) {
        const now = new Date();
        const endDate = new Date(user.school.subscriptionEnd);
        trialDaysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            schoolId: user.schoolId,
          },
          school: user.school,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRATION,
          },
          trialDaysRemaining,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to login',
        details: error.message,
      });
    }
  }
);

// Verify token endpoint
app.get('/auth/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            subscriptionTier: true,
            subscriptionEnd: true,
            isTrial: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          schoolId: user.schoolId,
        },
        school: user.school,
      },
    });
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify token',
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🔐 Auth Service - Stunity Enterprise v2.0  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('�� Auth Endpoints:');
  console.log('   POST /auth/login   - Login user');
  console.log('   GET  /auth/verify  - Verify token');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
