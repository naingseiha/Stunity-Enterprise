import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import ClaimCodeGenerator from './utils/claimCodeGenerator';
import passwordResetRoutes from './routes/passwordReset.routes';
import socialAuthRoutes from './routes/socialAuth.routes';
import twoFactorRoutes from './routes/twoFactor.routes';
import ssoRoutes from './routes/sso.routes';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ✅ Singleton pattern to prevent multiple Prisma instances
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Keep database connection warm (Supabase Pooler)
let isDbWarm = false;
const warmUpDb = async () => {
  if (isDbWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbWarm = true;
    console.log('✅ Auth Service - Database ready');
  } catch (error) {
    console.error('⚠️ Auth Service - Database warmup failed');
  }
};
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000); // Every 4 minutes

// Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Middleware - CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(hpp());
app.use(express.json({ limit: '10kb' }));

// Rate limiters (in-memory — sufficient for single-instance / solo dev)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many accounts created. Try again later.' },
});

app.use('/auth', globalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/parent/login', authLimiter);
app.use('/auth/register', registerLimiter);
app.use('/auth/parent/register', registerLimiter);

// ─── Password Policy ─────────────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password1',
  'iloveyou', 'admin', 'letmein', 'welcome', 'monkey', 'master',
  'dragon', 'login', 'princess', 'football', 'shadow', 'sunshine',
  'trustno1', 'password123', 'stunity', 'stunity123',
]);

function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters required');
  if (password.length > 128) errors.push('Maximum 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least 1 number');
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) errors.push('At least 1 special character');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) errors.push('This password is too common');
  return { isValid: errors.length === 0, errors };
}

// ─── Brute Force Protection ──────────────────────────────────────────
async function checkAccountLock(user: any): Promise<{ locked: boolean; message?: string }> {
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
    return { locked: true, message: `Account locked. Try again in ${minutesLeft} minutes.` };
  }
  if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }
  return { locked: false };
}

async function recordFailedAttempt(user: any) {
  const attempts = (user.failedAttempts || 0) + 1;
  let lockMinutes: number | null = null;
  if (attempts >= 15) lockMinutes = 24 * 60;
  else if (attempts >= 10) lockMinutes = 60;
  else if (attempts >= 5) lockMinutes = 15;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: attempts,
      lockedUntil: lockMinutes ? new Date(Date.now() + lockMinutes * 60 * 1000) : null,
    },
  });
}

async function recordSuccessfulLogin(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
      loginCount: { increment: 1 },
    },
  });
}

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

    // Invalidate tokens issued before password change
    if (user.passwordChangedAt && decoded.iat) {
      const changedTimestamp = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          error: 'Password changed. Please log in again.',
        });
      }
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

// ─── Mount modular route files ───────────────────────────────────────
app.use('/auth', passwordResetRoutes(prisma));
app.use('/auth/social', socialAuthRoutes(prisma));
app.use('/auth/sso', ssoRoutes(prisma));
app.use('/auth/2fa', twoFactorRoutes(prisma));

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
    version: '2.1.0',
    endpoints: {
      health: '/health',
      login: '/auth/login (POST)',
      register: '/auth/register (POST)',
      verify: '/auth/verify (GET)',
      refresh: '/auth/refresh (POST)',
      parentFindStudent: '/auth/parent/find-student (GET)',
      parentRegister: '/auth/parent/register (POST)',
      parentLogin: '/auth/parent/login (POST)',
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

      // Debug logging
      console.log('🔐 Login attempt:', {
        email,
        passwordLength: password?.length,
        timestamp: new Date().toISOString()
      });

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
        console.log('❌ User not found:', email);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      console.log('✅ User found:', user.email);

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is suspended',
        });
      }

      // Check account lockout (brute force protection)
      const lockCheck = await checkAccountLock(user);
      if (lockCheck.locked) {
        return res.status(423).json({
          success: false,
          error: lockCheck.message,
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

      console.log('🔑 Password check:', {
        email: user.email,
        valid: isPasswordValid
      });

      if (!isPasswordValid) {
        console.log('❌ Invalid password for:', user.email);
        await recordFailedAttempt(user);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      console.log('✅ Login successful for:', user.email);

      // Reset failed attempts + update last login
      await recordSuccessfulLogin(user.id);

      // Generate tokens (include school data to avoid DB queries on every request)
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          school: user.school ? {
            id: user.school.id,
            name: user.school.name,
            slug: user.school.slug,
            subscriptionTier: user.school.subscriptionTier,
            subscriptionEnd: user.school.subscriptionEnd,
            isTrial: user.school.isTrial,
            isActive: user.school.isActive,
          } : null,
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
            profilePictureUrl: user.profilePictureUrl,
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

// ============================================
// REGISTER ENDPOINT
// ============================================

/**
 * POST /auth/register
 * Basic registration for social-only users (no school affiliation)
 */
app.post(
  '/auth/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
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

      const { email, password, firstName, lastName, phone, role = 'STUDENT' } = req.body;

      // Enforce password policy
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          details: passwordCheck.errors,
        });
      }

      console.log('📝 Registration attempt:', {
        email,
        firstName,
        lastName,
        role,
        timestamp: new Date().toISOString()
      });

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
          accountType: 'SOCIAL_ONLY', // No school affiliation
          socialFeaturesEnabled: true,
          isEmailVerified: false,
          isActive: true,
        },
      });

      console.log('✅ User created:', user.email);

      // Generate tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          accountType: user.accountType,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRATION } as jwt.SignOptions
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            accountType: user.accountType,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRATION,
          },
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create account',
        details: error.message,
      });
    }
  }
);

// ============================================
// LOGOUT ENDPOINT
// ============================================

/**
 * POST /auth/logout
 * Logout user and invalidate refresh token
 */
app.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    // In a production system, you would:
    // 1. Get refresh token from request
    // 2. Blacklist/invalidate the refresh token
    // 3. Update lastLogout timestamp

    // For now, just return success
    // The client will clear tokens locally
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
      details: error.message,
    });
  }
});

// ============================================
// REFRESH TOKEN ENDPOINT
// ============================================

/**
 * POST /auth/refresh
 * Validates a refresh token and returns a new token pair
 */
app.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    // Check password change invalidation
    if (user.passwordChangedAt && decoded.iat) {
      const changedTimestamp = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          error: 'Password changed. Please log in again.',
        });
      }
    }

    // Check school active status
    if (user.school && !user.school.isActive) {
      return res.status(403).json({
        success: false,
        error: 'School subscription is inactive',
      });
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        school: user.school ? {
          id: user.school.id,
          name: user.school.name,
          slug: user.school.slug,
          subscriptionTier: user.school.subscriptionTier,
          subscriptionEnd: user.school.subscriptionEnd,
          isTrial: user.school.isTrial,
          isActive: user.school.isActive,
        } : null,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRATION } as jwt.SignOptions
    );

    console.log('🔄 Token refreshed successfully for:', user.email);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: JWT_EXPIRATION,
      },
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      details: error.message,
    });
  }
});

// ============================================
// PARENT PORTAL ENDPOINTS
// ============================================

// Find student by phone number or student ID (for parent registration)
app.get('/auth/parent/find-student', async (req: Request, res: Response) => {
  try {
    const { phone, studentId } = req.query;

    if (!phone && !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Phone number or student ID is required',
      });
    }

    let students;

    if (phone) {
      // Find students by parent phone
      students = await prisma.student.findMany({
        where: {
          parentPhone: phone as string,
          isAccountActive: true,
        },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          khmerName: true,
          class: {
            select: {
              name: true,
              grade: true,
            },
          },
        },
      });
    } else {
      // Find student by student ID
      students = await prisma.student.findMany({
        where: {
          studentId: studentId as string,
          isAccountActive: true,
        },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          khmerName: true,
          class: {
            select: {
              name: true,
              grade: true,
            },
          },
        },
      });
    }

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No student found with the provided information',
      });
    }

    // Transform to include class info
    const studentsWithClass = students.map(s => ({
      ...s,
      className: s.class?.name,
      grade: s.class?.grade,
    }));

    res.json({
      success: true,
      data: {
        students: studentsWithClass,
      },
    });
  } catch (error: any) {
    console.error('Find student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find student',
      details: error.message,
    });
  }
});

// Parent registration
app.post(
  '/auth/parent/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('khmerName').notEmpty().withMessage('Khmer name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('relationship').notEmpty().withMessage('Relationship is required'),
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

      const { firstName, lastName, khmerName, email, phone, password, studentId, relationship } = req.body;

      console.log('👨‍👩‍👧 Parent registration attempt:', { firstName, lastName, phone, studentId });

      // Check if phone already registered
      const existingParent = await prisma.parent.findUnique({
        where: { phone },
      });

      if (existingParent) {
        return res.status(400).json({
          success: false,
          error: 'This phone number is already registered. Please login instead.',
        });
      }

      // Check if email already registered (if provided)
      if (email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            error: 'This email is already registered.',
          });
        }
      }

      // Find the student
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { school: true },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Student not found',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create parent and user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create Parent record
        const parent = await tx.parent.create({
          data: {
            firstName,
            lastName,
            khmerName,
            email: email || null,
            phone,
            relationship,
            isAccountActive: true,
          },
        });

        // Create StudentParent link
        await tx.studentParent.create({
          data: {
            studentId: student.id,
            parentId: parent.id,
            relationship,
            isPrimary: true,
          },
        });

        // Create User account for parent
        const user = await tx.user.create({
          data: {
            email: email || null,
            phone,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'PARENT',
            parentId: parent.id,
            schoolId: student.schoolId,
            isActive: true,
            isDefaultPassword: false,
          },
        });

        return { parent, user };
      });

      console.log('✅ Parent registered successfully:', result.user.id);

      res.json({
        success: true,
        message: 'Registration successful. Please login with your credentials.',
        data: {
          parentId: result.parent.id,
          userId: result.user.id,
        },
      });
    } catch (error: any) {
      console.error('Parent registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register',
        details: error.message,
      });
    }
  }
);

// Parent login (by phone)
app.post(
  '/auth/parent/login',
  [
    body('phone').notEmpty().withMessage('Phone number is required'),
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

      const { phone, password } = req.body;

      console.log('👨‍👩‍👧 Parent login attempt:', { phone });

      // Find user by phone with parent role
      const user = await prisma.user.findFirst({
        where: {
          phone,
          role: 'PARENT',
        },
        include: {
          parent: {
            include: {
              studentParents: {
                include: {
                  student: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      khmerName: true,
                      studentId: true,
                      schoolId: true,
                    },
                  },
                },
              },
            },
          },
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
        console.log('❌ Parent not found:', phone);
        return res.status(401).json({
          success: false,
          error: 'Invalid phone number or password',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is suspended',
        });
      }

      // Check account lockout (brute force protection)
      const parentLockCheck = await checkAccountLock(user);
      if (parentLockCheck.locked) {
        return res.status(423).json({
          success: false,
          error: parentLockCheck.message,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        console.log('❌ Invalid password for parent:', phone);
        await recordFailedAttempt(user);
        return res.status(401).json({
          success: false,
          error: 'Invalid phone number or password',
        });
      }

      console.log('✅ Parent login successful:', phone);

      // Reset failed attempts + update last login
      await recordSuccessfulLogin(user.id);

      // Get children info
      const children = user.parent?.studentParents.map(sp => ({
        id: sp.student.id,
        firstName: sp.student.firstName,
        lastName: sp.student.lastName,
        khmerName: sp.student.khmerName,
        studentId: sp.student.studentId,
        relationship: sp.relationship,
        isPrimary: sp.isPrimary,
      })) || [];

      // Generate tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
          role: user.role,
          schoolId: user.schoolId,
          parentId: user.parentId,
          children: children.map(c => c.id),
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRATION } as jwt.SignOptions
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            schoolId: user.schoolId,
            parentId: user.parentId,
            children,
          },
          school: user.school,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRATION,
          },
        },
      });
    } catch (error: any) {
      console.error('Parent login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to login',
        details: error.message,
      });
    }
  }
);

// ============================================
// END PARENT PORTAL ENDPOINTS
// ============================================

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

// Get notifications for current user
app.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user!.id;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { recipientId: userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      details: error.message,
    });
  }
});

// Get unread count
app.get('/notifications/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { recipientId: req.user!.id, isRead: false },
    });
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get count' });
  }
});

// Mark notification as read
app.put('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id, recipientId: req.user!.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

// Mark all notifications as read
app.put('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.user!.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

// Delete notification
app.delete('/notifications/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id, recipientId: req.user!.id },
    });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

// Create notification (internal API for other services)
app.post('/notifications', async (req: Request, res: Response) => {
  try {
    const { recipientId, actorId, type, title, message, link, postId, commentId } = req.body;

    if (!recipientId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientId, type, title, message',
      });
    }

    const notification = await prisma.notification.create({
      data: {
        recipientId,
        actorId,
        type,
        title,
        message,
        link,
        postId,
        commentId,
      },
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error: any) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      details: error.message,
    });
  }
});

// Send notification to parent(s) of a student (helper endpoint)
app.post('/notifications/parent', async (req: Request, res: Response) => {
  try {
    const { studentId, type, title, message, link } = req.body;

    if (!studentId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, type, title, message',
      });
    }

    // Find all parents of the student
    const studentParents = await prisma.studentParent.findMany({
      where: { studentId },
      include: {
        parent: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    if (studentParents.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No parents found for this student',
      });
    }

    // Create notifications for each parent
    const notifications = await Promise.all(
      studentParents
        .filter(sp => sp.parent?.user?.id)
        .map(sp =>
          prisma.notification.create({
            data: {
              recipientId: sp.parent!.user!.id,
              type,
              title,
              message,
              link,
            },
          })
        )
    );

    res.status(201).json({
      success: true,
      data: notifications,
      parentsNotified: notifications.length,
    });
  } catch (error: any) {
    console.error('Send parent notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send parent notification',
      details: error.message,
    });
  }
});

// School→Feed Notification Bridge: notify students directly
app.post('/notifications/student', async (req: Request, res: Response) => {
  try {
    const { studentId, type, title, message, link } = req.body;

    if (!studentId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, type, title, message',
      });
    }

    // Find student's user account
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true } } },
    });

    if (!student?.user?.id) {
      return res.status(404).json({ success: false, error: 'Student user not found' });
    }

    const notification = await prisma.notification.create({
      data: {
        recipientId: student.user.id,
        type,
        title,
        message,
        link,
      },
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error: any) {
    console.error('Send student notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send student notification' });
  }
});

// School→Feed Notification Bridge: batch notify (e.g., class-wide announcements)
app.post('/notifications/batch', async (req: Request, res: Response) => {
  try {
    const { userIds, type, title, message, link, actorId } = req.body;

    if (!userIds?.length || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userIds[], type, title, message',
      });
    }

    const notifications = await prisma.notification.createMany({
      data: userIds.map((uid: string) => ({
        recipientId: uid,
        actorId: actorId || null,
        type,
        title,
        message,
        link,
      })),
    });

    res.status(201).json({
      success: true,
      count: notifications.count,
    });
  } catch (error: any) {
    console.error('Batch notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send batch notifications' });
  }
});

// ============================================
// END NOTIFICATION ENDPOINTS
// ============================================

// ============================================
// USER ENDPOINTS
// ============================================

// Get current user endpoint (for mobile app)
app.get('/users/me', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    // Calculate trial days remaining if applicable
    let trialDaysRemaining = null;
    if (user.school?.isTrial && user.school?.subscriptionEnd) {
      const now = new Date();
      const endDate = new Date(user.school.subscriptionEnd);
      trialDaysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (trialDaysRemaining < 0) trialDaysRemaining = 0;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        schoolId: user.schoolId,
        school: user.school ? {
          ...user.school,
          trialDaysRemaining,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      details: error.message,
    });
  }
});

// ============================================
// END USER ENDPOINTS
// ============================================

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
          profilePictureUrl: user.profilePictureUrl,
          bio: user.bio,
          headline: user.headline,
          interests: user.interests,
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

// ============================================================================
// CLAIM CODE ENDPOINTS
// ============================================================================

/**
 * POST /auth/claim-codes/validate
 * Validate a claim code without claiming it
 * Returns school and student/teacher information if valid
 */
app.post('/auth/claim-codes/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is required',
      });
    }

    // Validate format
    if (!ClaimCodeGenerator.validateFormat(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid claim code format',
      });
    }

    // Find claim code in database
    const claimCode = await prisma.claimCode.findUnique({
      where: { code },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            schoolType: true,
            address: true,
          },
        },
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        teacher: {
          select: {
            id: true,
            teacherId: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    if (!claimCode) {
      return res.status(404).json({
        success: false,
        error: 'Claim code not found',
      });
    }

    // Check if expired
    if (claimCode.expiresAt && claimCode.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has expired',
      });
    }

    // Check if already claimed
    if (claimCode.claimedAt) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has already been used',
      });
    }

    // Check if revoked
    if (claimCode.revokedAt) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has been revoked',
      });
    }

    // Check if active
    if (!claimCode.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is inactive',
      });
    }

    // Return validation success with data
    res.json({
      success: true,
      data: {
        code: claimCode.code,
        type: claimCode.type,
        school: claimCode.school,
        student: claimCode.student || null,
        teacher: claimCode.teacher || null,
        expiresAt: claimCode.expiresAt,
        requiresVerification: !!claimCode.verificationData,
      },
    });
  } catch (error: any) {
    console.error('Validate claim code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate claim code',
      details: error.message,
    });
  }
});

/**
 * POST /auth/claim-codes/link
 * Link a claim code to an existing user account
 * Requires authentication
 */
app.post('/auth/claim-codes/link', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code, verificationData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is required',
      });
    }

    // Find claim code
    const claimCode = await prisma.claimCode.findUnique({
      where: { code },
      include: {
        school: true,
        student: true,
        teacher: true,
      },
    });

    if (!claimCode) {
      return res.status(404).json({
        success: false,
        error: 'Claim code not found',
      });
    }

    // Validate claim code status
    if (claimCode.expiresAt && claimCode.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has expired',
      });
    }

    if (claimCode.claimedAt) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has already been used',
      });
    }

    if (claimCode.revokedAt || !claimCode.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is not valid',
      });
    }

    // Verify data if required
    if (claimCode.verificationData) {
      const expectedData = claimCode.verificationData as any;

      if (expectedData.firstName && verificationData?.firstName) {
        if (expectedData.firstName.toLowerCase() !== verificationData.firstName.toLowerCase()) {
          return res.status(400).json({
            success: false,
            error: 'Verification failed: First name does not match',
          });
        }
      }

      if (expectedData.lastName && verificationData?.lastName) {
        if (expectedData.lastName.toLowerCase() !== verificationData.lastName.toLowerCase()) {
          return res.status(400).json({
            success: false,
            error: 'Verification failed: Last name does not match',
          });
        }
      }

      if (expectedData.dateOfBirth && verificationData?.dateOfBirth) {
        if (expectedData.dateOfBirth !== verificationData.dateOfBirth) {
          return res.status(400).json({
            success: false,
            error: 'Verification failed: Date of birth does not match',
          });
        }
      }
    }

    // Link account based on type
    await prisma.$transaction(async (tx) => {
      // Mark claim code as claimed
      await tx.claimCode.update({
        where: { id: claimCode.id },
        data: {
          claimedAt: new Date(),
          claimedByUserId: userId,
        },
      });

      // Update user account
      const updateData: any = {
        accountType: 'HYBRID',
        organizationCode: claimCode.school.id, // Using school ID as organization code
        organizationName: claimCode.school.name,
        organizationType: claimCode.school.schoolType,
        socialFeaturesEnabled: true,
      };

      // Link to student or teacher by setting studentId/teacherId in User
      if (claimCode.type === 'STUDENT' && claimCode.studentId) {
        updateData.studentId = claimCode.studentId;
        updateData.role = 'STUDENT';
      } else if (claimCode.type === 'TEACHER' && claimCode.teacherId) {
        updateData.teacherId = claimCode.teacherId;
        updateData.role = 'TEACHER';
      }

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });
    });

    // Return success
    res.json({
      success: true,
      message: 'Account successfully linked to school',
      data: {
        accountType: 'HYBRID',
        school: {
          id: claimCode.school.id,
          name: claimCode.school.name,
          type: claimCode.school.schoolType,
        },
        role: claimCode.type,
      },
    });
  } catch (error: any) {
    console.error('Link claim code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link claim code',
      details: error.message,
    });
  }
});

/**
 * POST /auth/register/with-claim-code
 * Register a new account with a claim code
 * Creates user account and immediately links to school account
 */
app.post('/auth/register/with-claim-code', async (req: Request, res: Response) => {
  try {
    const { code, email, password, firstName, lastName, phone, verificationData } = req.body;

    // Validate required fields
    if (!code || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Find and validate claim code
    const claimCode = await prisma.claimCode.findUnique({
      where: { code },
      include: {
        school: true,
        student: true,
        teacher: true,
      },
    });

    if (!claimCode) {
      return res.status(404).json({
        success: false,
        error: 'Claim code not found',
      });
    }

    if (claimCode.expiresAt && claimCode.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has expired',
      });
    }

    if (claimCode.claimedAt) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has already been used',
      });
    }

    if (claimCode.revokedAt || !claimCode.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is not valid',
      });
    }

    // Verify data if required
    if (claimCode.verificationData) {
      const expectedData = claimCode.verificationData as any;

      if (expectedData.firstName && expectedData.firstName.toLowerCase() !== firstName.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Verification failed: First name does not match school records',
        });
      }

      if (expectedData.lastName && expectedData.lastName.toLowerCase() !== lastName.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Verification failed: Last name does not match school records',
        });
      }

      if (expectedData.dateOfBirth && verificationData?.dateOfBirth) {
        if (expectedData.dateOfBirth !== verificationData.dateOfBirth) {
          return res.status(400).json({
            success: false,
            error: 'Verification failed: Date of birth does not match',
          });
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user and link account in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          accountType: 'HYBRID',
          organizationCode: claimCode.school.id,
          organizationName: claimCode.school.name,
          organizationType: claimCode.school.schoolType,
          role: claimCode.type === 'TEACHER' ? 'TEACHER' : 'STUDENT',
          socialFeaturesEnabled: true,
          isEmailVerified: false,
          // Link to student or teacher via foreign key
          studentId: claimCode.type === 'STUDENT' ? claimCode.studentId : undefined,
          teacherId: claimCode.type === 'TEACHER' ? claimCode.teacherId : undefined,
        },
      });

      // Mark claim code as claimed
      await tx.claimCode.update({
        where: { id: claimCode.id },
        data: {
          claimedAt: new Date(),
          claimedByUserId: user.id,
        },
      });

      return user;
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: result.id,
        email: result.email,
        role: result.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
    );

    // Return success with token
    res.status(201).json({
      success: true,
      message: 'Account created and linked successfully',
      data: {
        user: {
          id: result.id,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role,
          accountType: result.accountType,
        },
        school: {
          id: claimCode.school.id,
          name: claimCode.school.name,
          type: claimCode.school.schoolType,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Register with claim code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register with claim code',
      details: error.message,
    });
  }
});

/**
 * POST /auth/login/claim-code
 * First-time login with claim code (for students/teachers who haven't registered yet)
 * Uses claim code as temporary authentication
 */
app.post('/auth/login/claim-code', async (req: Request, res: Response) => {
  try {
    const { code, temporaryPassword, verificationData } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is required',
      });
    }

    // Find claim code
    const claimCode = await prisma.claimCode.findUnique({
      where: { code },
      include: {
        school: true,
        student: {
          include: {
            user: true,
          },
        },
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!claimCode) {
      return res.status(404).json({
        success: false,
        error: 'Claim code not found',
      });
    }

    // Validate claim code status
    if (claimCode.expiresAt && claimCode.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Claim code has expired',
      });
    }

    if (claimCode.revokedAt || !claimCode.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is not valid',
      });
    }

    // Check if already claimed (has user account)
    let user = null;
    if (claimCode.type === 'STUDENT' && claimCode.student?.user) {
      user = claimCode.student.user;
    } else if (claimCode.type === 'TEACHER' && claimCode.teacher?.user) {
      user = claimCode.teacher.user;
    }

    if (user) {
      return res.status(400).json({
        success: false,
        error: 'This account has already been activated. Please use regular login.',
        shouldUseRegularLogin: true,
      });
    }

    // Verify data if required
    if (claimCode.verificationData) {
      const expectedData = claimCode.verificationData as any;

      if (expectedData.firstName && verificationData?.firstName) {
        if (expectedData.firstName.toLowerCase() !== verificationData.firstName.toLowerCase()) {
          return res.status(400).json({
            success: false,
            error: 'Verification failed: First name does not match',
          });
        }
      }

      if (expectedData.lastName && verificationData?.lastName) {
        if (expectedData.lastName.toLowerCase() !== verificationData.lastName.toLowerCase()) {
          return res.status(400).json({
            success: false,
            error: 'Verification failed: Last name does not match',
          });
        }
      }

      if (expectedData.dateOfBirth && verificationData?.dateOfBirth) {
        if (expectedData.dateOfBirth !== verificationData.dateOfBirth) {
          return res.status(400).json({
            success: false,
            error: 'Verification failed: Date of birth does not match',
          });
        }
      }
    }

    // Generate temporary token for account setup
    const setupToken = jwt.sign(
      {
        claimCodeId: claimCode.id,
        code: claimCode.code,
        type: claimCode.type,
        schoolId: claimCode.schoolId,
        studentId: claimCode.studentId,
        teacherId: claimCode.teacherId,
        setup: true,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return setup token and instructions
    res.json({
      success: true,
      message: 'Claim code verified. Please complete account setup.',
      data: {
        setupToken,
        requiresSetup: true,
        school: {
          id: claimCode.school.id,
          name: claimCode.school.name,
          type: claimCode.school.schoolType,
        },
        student: claimCode.student ? {
          id: claimCode.student.id,
          studentId: claimCode.student.studentId,
          firstName: claimCode.student.firstName,
          lastName: claimCode.student.lastName,
        } : null,
        teacher: claimCode.teacher ? {
          id: claimCode.teacher.id,
          teacherId: claimCode.teacher.teacherId,
          firstName: claimCode.teacher.firstName,
          lastName: claimCode.teacher.lastName,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Login with claim code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login with claim code',
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🔐 Auth Service - Stunity Enterprise v3.0   ║');
  console.log('║   🛡️  Security: helmet + rate-limit + lockout  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('📋 Auth Endpoints:');
  console.log('   POST /auth/login         - Login user');
  console.log('   GET  /auth/verify        - Verify token');
  console.log('');
  console.log('🎫 Claim Code Endpoints:');
  console.log('   POST /auth/claim-codes/validate           - Validate claim code');
  console.log('   POST /auth/claim-codes/link               - Link code to account');
  console.log('   POST /auth/register/with-claim-code       - Register with code');
  console.log('   POST /auth/login/claim-code               - First-time login');
  console.log('');
  console.log('👨‍👩‍👧 Parent Portal Endpoints:');
  console.log('   GET  /auth/parent/find-student  - Find student');
  console.log('   POST /auth/parent/register      - Register parent');
  console.log('   POST /auth/parent/login         - Parent login');
  console.log('');
  console.log('🔔 Notification Endpoints:');
  console.log('   GET  /notifications             - Get notifications');
  console.log('   GET  /notifications/unread-count - Get unread count');
  console.log('   PUT  /notifications/:id/read    - Mark as read');
  console.log('   PUT  /notifications/read-all    - Mark all as read');
  console.log('   POST /notifications             - Create notification');
  console.log('   POST /notifications/parent      - Notify parent(s)');
  console.log('   POST /notifications/student     - Notify student');
  console.log('   POST /notifications/batch       - Batch notify users');
  console.log('');
  console.log('🔑 Password Reset:');
  console.log('   POST /auth/forgot-password       - Request reset email');
  console.log('   POST /auth/reset-password         - Reset with token');
  console.log('   POST /auth/change-password        - Change (authenticated)');
  console.log('');
  console.log('🌐 Social Login (OAuth2):');
  console.log('   POST /auth/social/google          - Google login');
  console.log('   POST /auth/social/apple           - Apple login');
  console.log('   POST /auth/social/facebook        - Facebook login');
  console.log('   POST /auth/social/linkedin        - LinkedIn login');
  console.log('   POST /auth/social/link            - Link provider (auth)');
  console.log('   DELETE /auth/social/unlink/:prov   - Unlink provider (auth)');
  console.log('');
  console.log('🔐 Two-Factor Auth:');
  console.log('   POST /auth/2fa/setup              - Generate QR (auth)');
  console.log('   POST /auth/2fa/verify-setup       - Enable 2FA (auth)');
  console.log('   POST /auth/2fa/verify             - Verify during login');
  console.log('   POST /auth/2fa/disable            - Disable 2FA (auth)');
  console.log('   POST /auth/2fa/backup-codes       - Regenerate codes (auth)');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
