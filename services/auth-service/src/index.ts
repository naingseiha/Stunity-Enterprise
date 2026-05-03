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
import * as tokenBlacklist from './utils/tokenBlacklist';
import passwordResetRoutes from './routes/passwordReset.routes';
import socialAuthRoutes from './routes/socialAuth.routes';
import twoFactorRoutes from './routes/twoFactor.routes';
import ssoRoutes from './routes/sso.routes';
import translationRoutes from './routes/translation.routes';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = process.env.PORT || process.env.AUTH_SERVICE_PORT || 3001;
// Security: fail startup in production if JWT_SECRET is unset
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
// Remember-me style: long-lived tokens until explicit logout
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '30d';       // Access token: 30d (reduces refresh calls)
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '365d'; // Refresh: 1 year
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const parentDirectoryCache = new Map<string, { data: any; timestamp: number }>();
const PARENT_DIRECTORY_CACHE_TTL_MS = 60 * 1000;

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

// Prisma opens DB connections lazily per request.
// Avoid startup warmup queries to reduce noisy pooler errors during cold starts.

// Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Middleware - CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

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

function getParentDirectoryCacheKey(schoolId: string, page: number, limit: number, search: string) {
  return `${schoolId}:${page}:${limit}:${search.toLowerCase()}`;
}

function readParentDirectoryCache(cacheKey: string) {
  const cached = parentDirectoryCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > PARENT_DIRECTORY_CACHE_TTL_MS) {
    parentDirectoryCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeParentDirectoryCache(cacheKey: string, data: any) {
  parentDirectoryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearParentDirectoryCache(schoolId?: string) {
  for (const key of parentDirectoryCache.keys()) {
    if (!schoolId || key.startsWith(`${schoolId}:`)) {
      parentDirectoryCache.delete(key);
    }
  }
}

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

function isPasswordHashUsable(hash: string | null | undefined): boolean {
  if (!hash) return false;
  // bcrypt hashes are 60 chars and start with $2a$, $2b$, or $2y$
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

type SchoolAccessScope = 'FULL' | 'PENDING_REVIEW';

type SchoolAccessSnapshot = {
  isActive?: boolean | null;
  subscriptionEnd?: Date | string | null;
  registrationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
} | null | undefined;

function resolveSchoolAccessContext(
  school: SchoolAccessSnapshot,
  isSuperAdmin: boolean
): {
  allowed: boolean;
  statusCode?: number;
  error?: string;
  details?: Record<string, unknown>;
  accessScope: SchoolAccessScope;
  canUseHighRiskFeatures: boolean;
} {
  if (isSuperAdmin || !school) {
    return {
      allowed: true,
      accessScope: 'FULL',
      canUseHighRiskFeatures: true,
    };
  }

  if (school.registrationStatus === 'REJECTED') {
    return {
      allowed: false,
      statusCode: 403,
      error: 'School registration was rejected. Please contact platform support.',
      accessScope: 'PENDING_REVIEW',
      canUseHighRiskFeatures: false,
    };
  }

  if (!school.isActive) {
    return {
      allowed: false,
      statusCode: 403,
      error:
        school.registrationStatus === 'PENDING'
          ? 'School registration is pending super admin approval'
          : 'School subscription is inactive',
      accessScope: 'PENDING_REVIEW',
      canUseHighRiskFeatures: false,
    };
  }

  if (school.subscriptionEnd && new Date(school.subscriptionEnd) < new Date()) {
    return {
      allowed: false,
      statusCode: 403,
      error: 'School subscription has expired',
      details: {
        expiredAt: school.subscriptionEnd,
      },
      accessScope: 'PENDING_REVIEW',
      canUseHighRiskFeatures: false,
    };
  }

  if (school.registrationStatus === 'PENDING') {
    return {
      allowed: true,
      accessScope: 'PENDING_REVIEW',
      canUseHighRiskFeatures: false,
    };
  }

  return {
    allowed: true,
    accessScope: 'FULL',
    canUseHighRiskFeatures: true,
  };
}

async function findPendingUserForClaimCode(code: string, excludeUserId?: string): Promise<{ id: string } | null> {
  const pendingUsers = await prisma.user.findMany({
    where: {
      linkingStatus: 'PENDING',
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: {
      id: true,
      pendingLinkData: true,
    },
  });

  return pendingUsers.find((user) => {
    const data = user.pendingLinkData as any;
    return typeof data?.code === 'string' && data.code.toUpperCase() === code.toUpperCase();
  }) || null;
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
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const accessContext = resolveSchoolAccessContext(user.school, user.role === 'SUPER_ADMIN');
    if (!accessContext.allowed) {
      return res.status(accessContext.statusCode || 403).json({
        success: false,
        error: accessContext.error || 'Access denied',
        ...(accessContext.details ? { details: accessContext.details } : {}),
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

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
    }
    next();
  };
};

/**
 * 🛡️ Admin Password Reset
 * Allows School Admins (same school) or Super Admins (any school) to manually reset 
 * passwords for users (Student/Parent) who may not have email access.
 */
app.post(
  '/auth/admin/reset-password',
  authenticateToken as any,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('newPassword').notEmpty().withMessage('New password is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId, newPassword } = req.body;
      const requester = req.user!;

      // 1. Authorization: User must be an ADMIN or SUPER_ADMIN
      // SUPER_ADMIN = platform admin (full access), ADMIN = school admin (school-scoped)
      const isSuper = requester.role === 'SUPER_ADMIN';
      const isAdmin = requester.role === 'ADMIN' || isSuper;

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Admin privileges required'
        });
      }

      // 2. Fetch target user
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // 3. Multi-tenant Check: School Admin can only reset their own users
      if (!isSuper && targetUser.schoolId !== requester.schoolId) {
        console.warn(`🛑 MULTI-TENANT VIOLATION ATTEMPT: Admin ${requester.id} tried to reset user ${userId} in another school`);
        return res.status(403).json({
          success: false,
          error: 'Permission denied: User belongs to a different school'
        });
      }

      // 4. Update password and force change
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          isDefaultPassword: true,  // Trigger force-change on mobile/web
          passwordChangedAt: new Date(),
          failedAttempts: 0,        // Unlock account if it was locked
          lockedUntil: null,
          lastPasswordHashes: [],   // Clear history for admin override
        },
      });

      clearParentDirectoryCache();

      console.log(`🛡️ Admin Reset: ${requester.email || requester.id} reset password for user ${userId}`);

      res.json({
        success: true,
        message: 'Password reset successfully. The user will be required to change it on their next login.',
      });
    } catch (error: any) {
      console.error('Admin reset error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * 👨‍👩‍👧 Admin Parent Directory
 * Allows school admins to view parent accounts linked to students in their school.
 */
app.get(
  '/auth/admin/parents',
  authenticateToken as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const requester = req.user!;
      const isSuper = requester.role === 'SUPER_ADMIN';
      const isAdmin = requester.role === 'ADMIN' || isSuper;

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Admin privileges required',
        });
      }

      const requestedSchoolId =
        (typeof req.query.schoolId === 'string' && req.query.schoolId.trim()) ||
        requester.schoolId;

      if (!requestedSchoolId) {
        return res.status(400).json({
          success: false,
          error: 'School ID is required for parent management',
        });
      }

      if (!isSuper && requestedSchoolId !== requester.schoolId) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied: Cannot access parents from another school',
        });
      }

      const pageNum = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const skip = (pageNum - 1) * limitNum;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const cacheKey = getParentDirectoryCacheKey(requestedSchoolId, pageNum, limitNum, search);
      const cachedResponse = readParentDirectoryCache(cacheKey);

      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      const where: any = {
        AND: [
          {
            studentParents: {
              some: {
                student: {
                  schoolId: requestedSchoolId,
                },
              },
            },
          },
        ],
      };

      if (search) {
        where.AND.push({
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            {
              user: {
                is: {
                  OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
            {
              studentParents: {
                some: {
                  student: {
                    OR: [
                      { firstName: { contains: search, mode: 'insensitive' } },
                      { lastName: { contains: search, mode: 'insensitive' } },
                      { studentId: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          ],
        });
      }

      const [parents, total] = await Promise.all([
        prisma.parent.findMany({
          where,
          select: {
            id: true,
            parentId: true,
            firstName: true,
            lastName: true,
            englishName: true,
            email: true,
            phone: true,
            relationship: true,
            isAccountActive: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                failedAttempts: true,
                lockedUntil: true,
                isDefaultPassword: true,
              },
            },
            studentParents: {
              where: {
                student: {
                  schoolId: requestedSchoolId,
                },
              },
              select: {
                relationship: true,
                isPrimary: true,
                student: {
                  select: {
                    id: true,
                    studentId: true,
                    firstName: true,
                    lastName: true,
                    class: {
                      select: {
                        id: true,
                        name: true,
                        grade: true,
                        section: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { updatedAt: 'desc' },
            { lastName: 'asc' },
            { firstName: 'asc' },
          ],
          skip,
          take: limitNum,
        }),
        prisma.parent.count({ where }),
      ]);

      const mappedParents = parents.map((parent) => ({
        id: parent.id,
        parentId: parent.parentId,
        firstName: parent.firstName,
        lastName: parent.lastName,
        fullName: `${parent.firstName} ${parent.lastName}`.trim(),
        englishName: parent.englishName,
        email: parent.email,
        phone: parent.phone,
        relationship: parent.relationship,
        isAccountActive: parent.isAccountActive,
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
        account: parent.user
          ? {
              userId: parent.user.id,
              email: parent.user.email,
              phone: parent.user.phone,
              isActive: parent.user.isActive,
              lastLogin: parent.user.lastLogin,
              createdAt: parent.user.createdAt,
              failedAttempts: parent.user.failedAttempts,
              lockedUntil: parent.user.lockedUntil,
              isDefaultPassword: parent.user.isDefaultPassword,
            }
          : null,
        linkedStudents: parent.studentParents.map((link) => ({
          relationship: link.relationship,
          isPrimary: link.isPrimary,
          student: {
            id: link.student.id,
            studentId: link.student.studentId,
            firstName: link.student.firstName,
            lastName: link.student.lastName,
            fullName: `${link.student.firstName} ${link.student.lastName}`.trim(),
            class: link.student.class,
          },
        })),
      }));

      const responseBody = {
        success: true,
        data: mappedParents,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.max(1, Math.ceil(total / limitNum)),
        },
      };

      writeParentDirectoryCache(cacheKey, responseBody);
      res.json(responseBody);
    } catch (error: any) {
      console.error('Admin parent directory error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch parents',
        details: error.message,
      });
    }
  }
);

// ─── Mount modular route files ───────────────────────────────────────
app.use('/auth', passwordResetRoutes(prisma));
app.use('/auth/social', socialAuthRoutes(prisma));
app.use('/auth/sso', ssoRoutes(prisma));
app.use('/auth/2fa', twoFactorRoutes(prisma));
app.use('/auth/translations', translationRoutes(prisma, authenticateToken, authorize));

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

// Login endpoint — accepts email OR phone (like Facebook)
app.post(
  '/auth/login',
  [
    body('email').optional().isEmail().withMessage('Email must be valid when provided'),
    body('phone').optional().notEmpty().withMessage('Phone must be non-empty when provided'),
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

      const { email, phone, password } = req.body;
      const emailTrim = typeof email === 'string' ? email.trim() : '';
      const phoneTrim = typeof phone === 'string' ? phone.trim() : '';

      if (!emailTrim && !phoneTrim) {
        return res.status(400).json({
          success: false,
          error: 'Please provide email or phone number',
        });
      }

      // Debug logging
      console.log('🔐 Login attempt:', {
        email: emailTrim || '(none)',
        phone: phoneTrim || '(none)',
        passwordLength: password?.length,
        timestamp: new Date().toISOString()
      });

      // Find user by email or phone
      const user = emailTrim
        ? await prisma.user.findUnique({
          where: { email: emailTrim },
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
                registrationStatus: true,
                educationModel: true,
              },
            },
          },
        })
        : await prisma.user.findFirst({
          where: { phone: phoneTrim },
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
                registrationStatus: true,
                educationModel: true,
              },
            },
          },
        });

      if (!user) {
        console.log('❌ User not found:', emailTrim || phoneTrim);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      console.log('✅ User found:', user.email || user.phone);

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

      const isSuperAdmin = user.role === 'SUPER_ADMIN';
      const schoolAccess = resolveSchoolAccessContext(user.school, isSuperAdmin);
      if (!schoolAccess.allowed) {
        return res.status(schoolAccess.statusCode || 403).json({
          success: false,
          error: schoolAccess.error || 'Access denied',
          ...(schoolAccess.details ? { details: schoolAccess.details } : {}),
        });
      }

      const hasUsablePasswordHash = isPasswordHashUsable(user.password);
      const isLegacyAdminPasswordAccount =
        user.accountType === 'SOCIAL_ONLY' &&
        hasUsablePasswordHash &&
        (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

      // Reject password flow for social-only accounts, except legacy admin records
      if (
        !hasUsablePasswordHash ||
        (user.accountType === 'SOCIAL_ONLY' && !isLegacyAdminPasswordAccount)
      ) {
        return res.status(401).json({
          success: false,
          error: 'This account uses social sign-in or requires password reset',
        });
      }

      // Verify password
      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (compareError: any) {
        console.warn('⚠️ Password compare failed for user:', user.id, compareError?.message);
        return res.status(401).json({
          success: false,
          error: 'Password authentication unavailable for this account. Please reset password.',
        });
      }

      console.log('🔑 Password check:', {
        identifier: user.email || user.phone,
        valid: isPasswordValid
      });

      if (!isPasswordValid) {
        console.log('❌ Invalid password for:', user.email || user.phone);
        await recordFailedAttempt(user);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      console.log('✅ Login successful for:', user.email || user.phone);

      // Reset failed attempts + update last login
      await recordSuccessfulLogin(user.id);
      if (isLegacyAdminPasswordAccount) {
        await prisma.user.update({
          where: { id: user.id },
          data: { accountType: 'SCHOOL_ONLY' },
        });
      }

      // Generate tokens (include school data to avoid DB queries on every request)
      const schoolPayload = user.school
        ? {
          id: user.school.id,
          name: user.school.name,
          slug: user.school.slug,
          subscriptionTier: user.school.subscriptionTier,
          subscriptionEnd: user.school.subscriptionEnd,
          isTrial: user.school.isTrial,
          isActive: user.school.isActive,
          registrationStatus: user.school.registrationStatus,
          educationModel: user.school.educationModel,
          accessScope: schoolAccess.accessScope,
          canUseHighRiskFeatures: schoolAccess.canUseHighRiskFeatures,
        }
      : null;

      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          isSuperAdmin: user.role === 'SUPER_ADMIN', // derived from role for backward compat
          schoolAccessScope: schoolAccess.accessScope,
          school: schoolPayload,
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
            isSuperAdmin: user.role === 'SUPER_ADMIN', // derived from role
            linkingStatus: user.linkingStatus,
            pendingLinkData: user.pendingLinkData,
          },
          school: schoolPayload,
          accessScope: schoolAccess.accessScope,
          reviewState: {
            canUseHighRiskFeatures: schoolAccess.canUseHighRiskFeatures,
            isPendingReview: schoolAccess.accessScope === 'PENDING_REVIEW',
          },
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
 * Accepts email OR phone (at least one required, like Facebook)
 */
app.post(
  '/auth/register',
  [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').optional().isEmail().withMessage('Email must be valid when provided'),
    body('phone').optional().notEmpty().withMessage('Phone must be non-empty when provided'),
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
      const emailTrim = typeof email === 'string' ? email.trim() : '';
      const phoneTrim = typeof phone === 'string' ? phone.trim() : '';

      // Require at least one of email or phone
      if (!emailTrim && !phoneTrim) {
        return res.status(400).json({
          success: false,
          error: 'Please provide email or phone number (at least one required)',
        });
      }

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
        email: emailTrim || '(none)',
        phone: phoneTrim || '(none)',
        firstName,
        lastName,
        role,
        timestamp: new Date().toISOString()
      });

      // Check if email already exists (when provided)
      if (emailTrim) {
        const existingByEmail = await prisma.user.findUnique({
          where: { email: emailTrim },
        });
        if (existingByEmail) {
          return res.status(400).json({
            success: false,
            error: 'Email already registered',
          });
        }
      }

      // Check if phone already exists (when provided)
      if (phoneTrim) {
        const existingByPhone = await prisma.user.findFirst({
          where: { phone: phoneTrim },
        });
        if (existingByPhone) {
          return res.status(400).json({
            success: false,
            error: 'Phone number already registered',
          });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create user (email and phone are optional in schema)
      const user = await prisma.user.create({
        data: {
          email: emailTrim || null,
          phone: phoneTrim || null,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          accountType: 'SOCIAL_ONLY', // No school affiliation
          socialFeaturesEnabled: true,
          isEmailVerified: false,
          isActive: true,
        },
      });

      console.log('✅ User created:', user.email || user.phone);

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
 * Revoke refresh token (blacklist) so it cannot be used to obtain new access tokens.
 * Client should send refreshToken in body.
 */
app.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && typeof refreshToken === 'string') {
      const maxAgeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
      tokenBlacklist.revokeRefreshToken(refreshToken, maxAgeMs);
    }
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

    // Check if token was revoked (logout)
    if (tokenBlacklist.isRevoked(refreshToken)) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked. Please log in again.',
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
            registrationStatus: true,
            educationModel: true,
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

    const schoolAccess = resolveSchoolAccessContext(user.school, user.role === 'SUPER_ADMIN');
    if (!schoolAccess.allowed) {
      return res.status(schoolAccess.statusCode || 403).json({
        success: false,
        error: schoolAccess.error || 'Access denied',
        ...(schoolAccess.details ? { details: schoolAccess.details } : {}),
      });
    }

    const schoolPayload = user.school
      ? {
        id: user.school.id,
        name: user.school.name,
        slug: user.school.slug,
        subscriptionTier: user.school.subscriptionTier,
        subscriptionEnd: user.school.subscriptionEnd,
        isTrial: user.school.isTrial,
        isActive: user.school.isActive,
        registrationStatus: user.school.registrationStatus,
        educationModel: user.school.educationModel,
        accessScope: schoolAccess.accessScope,
        canUseHighRiskFeatures: schoolAccess.canUseHighRiskFeatures,
      }
    : null;

    // Generate new tokens
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        isSuperAdmin: user.role === 'SUPER_ADMIN', // derived from role for backward compat
        schoolAccessScope: schoolAccess.accessScope,
        school: schoolPayload,
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
        accessScope: schoolAccess.accessScope,
        reviewState: {
          canUseHighRiskFeatures: schoolAccess.canUseHighRiskFeatures,
          isPendingReview: schoolAccess.accessScope === 'PENDING_REVIEW',
        },
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
          studentParents: {
            some: {
              parent: {
                phone: phone as string,
              }
            }
          },
          isAccountActive: true,
        },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          customFields: true,
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
          customFields: true,
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

      const { firstName, lastName, email, phone, password, studentId, relationship } = req.body;

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
            email: email || null,
            phone,
            relationship,
            isAccountActive: true,
          } as any,
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
                      customFields: true,
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

      if (!isPasswordHashUsable(user.password)) {
        return res.status(401).json({
          success: false,
          error: 'Password authentication unavailable for this account. Please reset password.',
        });
      }

      // Verify password
      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (compareError: any) {
        console.warn('⚠️ Parent password compare failed for user:', user.id, compareError?.message);
        return res.status(401).json({
          success: false,
          error: 'Password authentication unavailable for this account. Please reset password.',
        });
      }

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
        fullName: `${sp.student.firstName} ${sp.student.lastName}`,
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
        coverPhotoUrl: user.coverPhotoUrl,
        bio: user.bio,
        headline: user.headline,
        professionalTitle: user.professionalTitle,
        location: user.location,
        interests: user.interests,
        skills: user.skills,
        socialLinks: user.socialLinks,
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

/**
 * GET /users/me/profile-change-requests
 * Return the current user's pending profile change requests.
 */
app.get('/users/me/profile-change-requests', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const requests = await prisma.profileChangeRequest.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: requests });
  } catch (error: any) {
    console.error('Fetch own profile change requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

/**
 * POST /users/me/profile-change-requests
 * Submit a request to change school-controlled student/teacher profile data.
 */
app.post('/users/me/profile-change-requests', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        schoolId: true,
        role: true,
        studentId: true,
        teacherId: true,
        student: { select: { isProfileLocked: true } },
        teacher: { select: { isProfileLocked: true } },
      },
    });
    if (!user || !user.schoolId || !['STUDENT', 'TEACHER'].includes(user.role)) {
      return res.status(400).json({ success: false, error: 'User is not linked to a school' });
    }
    const profileLocked =
      (user.role === 'STUDENT' && user.student?.isProfileLocked) ||
      (user.role === 'TEACHER' && user.teacher?.isProfileLocked);
    if (profileLocked) {
      return res.status(409).json({
        success: false,
        error: 'Profile editing is locked by the school admin',
      });
    }

    const existingPending = await prisma.profileChangeRequest.findFirst({
      where: { userId, schoolId: user.schoolId, status: 'PENDING' },
      orderBy: { updatedAt: 'desc' },
    });

    const requestedData = req.body;

    if (existingPending) {
      const currentData =
        existingPending.requestedData &&
        typeof existingPending.requestedData === 'object' &&
        !Array.isArray(existingPending.requestedData)
          ? (existingPending.requestedData as Record<string, any>)
          : {};
      const incomingData =
        requestedData && typeof requestedData === 'object' && !Array.isArray(requestedData)
          ? requestedData
          : {};
      const currentCustomFields =
        currentData.customFields && typeof currentData.customFields === 'object' && !Array.isArray(currentData.customFields)
          ? currentData.customFields
          : {};
      const incomingCustomFields =
        incomingData.customFields && typeof incomingData.customFields === 'object' && !Array.isArray(incomingData.customFields)
          ? incomingData.customFields
          : {};

      const mergedRequestedData = {
        ...currentData,
        ...incomingData,
        ...(Object.keys(currentCustomFields).length > 0 || Object.keys(incomingCustomFields).length > 0
          ? {
              customFields: {
                ...currentCustomFields,
                ...incomingCustomFields,
                regional: {
                  ...(currentCustomFields.regional || {}),
                  ...(incomingCustomFields.regional || {}),
                },
              },
            }
          : {}),
      };

      const request = await prisma.profileChangeRequest.update({
        where: { id: existingPending.id },
        data: { requestedData: mergedRequestedData },
      });

      return res.json({ success: true, message: 'Profile change request updated', data: request });
    }

    const request = await prisma.profileChangeRequest.create({
      data: {
        userId,
        schoolId: user.schoolId,
        requestedData,
      },
    });

    res.json({ success: true, message: 'Profile change request submitted', data: request });
  } catch (error: any) {
    console.error('Profile change request error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit request' });
  }
});

/**
 * GET /auth/admin/profile-change-requests
 * Get all pending profile change requests for the school
 */
app.get('/auth/admin/profile-change-requests', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Derive schoolId from the authenticated admin's token — no need for query param
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'Admin is not linked to a school' });
    }

    const requests = await prisma.profileChangeRequest.findMany({
      where: {
        schoolId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true,
            studentId: true,
            teacherId: true,
            student: {
              select: { id: true, studentId: true, firstName: true, lastName: true },
            },
            teacher: {
              select: { id: true, employeeId: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Surface `requestedData` fields (firstName/lastName) as top-level for the web UI
    const enriched = requests.map((r) => {
      const data = r.requestedData as any;
      return {
        ...r,
        requestedData: data,
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error('Fetch profile requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

/**
 * POST /auth/admin/profile-change-requests/:id/approve
 */
app.post('/auth/admin/profile-change-requests/:id/approve', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    if (!req.user?.schoolId) {
      return res.status(400).json({ success: false, error: 'Admin is not linked to a school' });
    }

    const { id } = req.params;
    const request = await prisma.profileChangeRequest.findUnique({ where: { id }, include: { user: true } });

    if (!request || request.status !== 'PENDING') {
      return res.status(404).json({ success: false, error: 'Valid request not found' });
    }
    if (request.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: 'Cannot approve requests from another school' });
    }

    const changes = request.requestedData as any;

    await prisma.$transaction(async (tx) => {
      // Approve the request
      await tx.profileChangeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: req.user?.id,
          reviewedAt: new Date(),
        },
      });

      const userUpdateData: Record<string, any> = {};
      if (changes.firstName !== undefined) userUpdateData.firstName = changes.firstName || request.user.firstName;
      if (changes.lastName !== undefined) userUpdateData.lastName = changes.lastName || request.user.lastName;
      if (changes.englishFirstName !== undefined) userUpdateData.englishFirstName = changes.englishFirstName || null;
      if (changes.englishLastName !== undefined) userUpdateData.englishLastName = changes.englishLastName || null;
      if (changes.bio !== undefined) userUpdateData.bio = changes.bio;
      if (changes.headline !== undefined) userUpdateData.headline = changes.headline;
      if (changes.professionalTitle !== undefined) userUpdateData.professionalTitle = changes.professionalTitle;
      if (changes.location !== undefined) userUpdateData.location = changes.location;
      if (changes.languages !== undefined) userUpdateData.languages = Array.isArray(changes.languages) ? changes.languages : [];
      if (changes.interests !== undefined) userUpdateData.interests = Array.isArray(changes.interests) ? changes.interests : [];
      if (changes.careerGoals !== undefined) userUpdateData.careerGoals = changes.careerGoals;
      if (changes.socialLinks !== undefined) userUpdateData.socialLinks = changes.socialLinks;
      if (changes.profileVisibility !== undefined) userUpdateData.profileVisibility = changes.profileVisibility;
      if (changes.isOpenToOpportunities !== undefined) userUpdateData.isOpenToOpportunities = changes.isOpenToOpportunities;
      if (changes.profilePictureUrl !== undefined) userUpdateData.profilePictureUrl = changes.profilePictureUrl;
      if (changes.profilePictureKey !== undefined) userUpdateData.profilePictureKey = changes.profilePictureKey || null;
      if (changes.coverPhotoUrl !== undefined) userUpdateData.coverPhotoUrl = changes.coverPhotoUrl;
      if (changes.coverPhotoKey !== undefined) userUpdateData.coverPhotoKey = changes.coverPhotoKey || null;
      userUpdateData.profileUpdatedAt = new Date();

      // Update User
      await tx.user.update({
        where: { id: request.userId },
        data: userUpdateData,
      });

      // Update Student/Teacher if linked
      if (request.user.studentId) {
         const existingStudent = await tx.student.findUnique({
           where: { id: request.user.studentId },
           select: { customFields: true },
         });
         const existingCustomFields =
           existingStudent?.customFields && typeof existingStudent.customFields === 'object' && !Array.isArray(existingStudent.customFields)
             ? (existingStudent.customFields as Record<string, any>)
             : {};
         const incomingCustomFields =
           changes.customFields && typeof changes.customFields === 'object' && !Array.isArray(changes.customFields)
             ? (changes.customFields as Record<string, any>)
             : {};
         await tx.student.update({
           where: { id: request.user.studentId },
           data: {
             firstName: changes.firstName || undefined,
             lastName: changes.lastName || undefined,
             englishFirstName: changes.englishFirstName ?? undefined,
             englishLastName: changes.englishLastName ?? undefined,
             ...(Object.keys(incomingCustomFields).length > 0 ? {
               customFields: {
                 ...existingCustomFields,
                 ...incomingCustomFields,
                 regional: {
                   ...(existingCustomFields.regional || {}),
                   ...(incomingCustomFields.regional || {}),
                 },
               } as any,
             } : {}),
           },
         });
      } else if (request.user.teacherId) {
         const existingTeacher = await tx.teacher.findUnique({
           where: { id: request.user.teacherId },
           select: { customFields: true },
         });
         const existingCustomFields =
           existingTeacher?.customFields && typeof existingTeacher.customFields === 'object' && !Array.isArray(existingTeacher.customFields)
             ? (existingTeacher.customFields as Record<string, any>)
             : {};
         const incomingCustomFields =
           changes.customFields && typeof changes.customFields === 'object' && !Array.isArray(changes.customFields)
             ? (changes.customFields as Record<string, any>)
             : {};
         await tx.teacher.update({
           where: { id: request.user.teacherId },
           data: {
             firstName: changes.firstName || undefined,
             lastName: changes.lastName || undefined,
             englishFirstName: changes.englishFirstName ?? undefined,
             englishLastName: changes.englishLastName ?? undefined,
             ...(Object.keys(incomingCustomFields).length > 0 ? {
               customFields: {
                 ...existingCustomFields,
                 ...incomingCustomFields,
                 regional: {
                   ...(existingCustomFields.regional || {}),
                   ...(incomingCustomFields.regional || {}),
                 },
               } as any,
             } : {}),
           },
         });
      }
    });

    res.json({ success: true, message: 'Profile change approved' });
  } catch (error: any) {
    console.error('Approve profile request error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve request' });
  }
});

/**
 * POST /auth/admin/profile-change-requests/:id/reject
 */
app.post('/auth/admin/profile-change-requests/:id/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    if (!req.user?.schoolId) {
      return res.status(400).json({ success: false, error: 'Admin is not linked to a school' });
    }

    const { id } = req.params;
    const request = await prisma.profileChangeRequest.findUnique({ where: { id } });

    if (!request || request.status !== 'PENDING') {
      return res.status(404).json({ success: false, error: 'Valid request not found' });
    }
    if (request.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: 'Cannot reject requests from another school' });
    }

    const reasonRaw =
      typeof req.body?.reason === 'string'
        ? req.body.reason
        : typeof req.body?.rejectionNote === 'string'
        ? req.body.rejectionNote
        : '';
    const rejectionNote = reasonRaw.trim().slice(0, 500);

    await prisma.profileChangeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        rejectionNote: rejectionNote || null,
      },
    });

    res.json({ success: true, message: 'Profile change rejected' });
  } catch (error: any) {
    console.error('Reject profile request error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject request' });
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
            registrationStatus: true,
            educationModel: true,
          },
        },
        ...(req.user!.role === 'PARENT' && {
          parent: {
            include: {
              studentParents: {
                include: {
                  student: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      customFields: true,
                      studentId: true,
                    },
                  },
                },
              },
            },
          },
        }),
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const children =
      user.role === 'PARENT' && user.parent?.studentParents
        ? user.parent.studentParents.map((sp: any) => ({
          id: sp.student.id,
          firstName: sp.student.firstName,
          lastName: sp.student.lastName,
          fullName: `${sp.student.firstName} ${sp.student.lastName}`,
          studentId: sp.student.studentId,
          relationship: sp.relationship,
          isPrimary: sp.isPrimary,
        }))
        : undefined;

    const schoolAccess = resolveSchoolAccessContext(user.school, user.role === 'SUPER_ADMIN');
    if (!schoolAccess.allowed) {
      return res.status(schoolAccess.statusCode || 403).json({
        success: false,
        error: schoolAccess.error || 'Access denied',
        ...(schoolAccess.details ? { details: schoolAccess.details } : {}),
      });
    }

    const schoolPayload = user.school
      ? {
        ...user.school,
        accessScope: schoolAccess.accessScope,
        canUseHighRiskFeatures: schoolAccess.canUseHighRiskFeatures,
      }
      : null;

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
          coverPhotoUrl: user.coverPhotoUrl,
          bio: user.bio,
          headline: user.headline,
          professionalTitle: user.professionalTitle,
          location: user.location,
          interests: user.interests,
          skills: user.skills,
          socialLinks: user.socialLinks,
          schoolId: user.schoolId,
          linkingStatus: user.linkingStatus,
          isSuperAdmin: user.role === 'SUPER_ADMIN', // derived from role
          ...(children && { children }),
        },
        school: schoolPayload,
        accessScope: schoolAccess.accessScope,
        reviewState: {
          canUseHighRiskFeatures: schoolAccess.canUseHighRiskFeatures,
          isPendingReview: schoolAccess.accessScope === 'PENDING_REVIEW',
        },
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
            user: { select: { id: true } },
            // include class info for the confirmation alert
            studentClasses: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: {
                class: { select: { name: true, grade: true } },
              },
            },
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
            user: { select: { id: true } },
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

    if ((claimCode as any).student?.user || (claimCode as any).teacher?.user) {
      return res.status(409).json({
        success: false,
        error: 'This school profile is already linked to an account.',
      });
    }

    // Return validation success with data
    res.json({
      success: true,
      data: {
        code: claimCode.code,
        type: claimCode.type,
        school: (claimCode as any).school,
        student: (claimCode as any).student
          ? {
              ...(claimCode as any).student,
              className: (claimCode as any).student.studentClasses?.[0]?.class?.name || null,
              gradeLevel: (claimCode as any).student.studentClasses?.[0]?.class?.grade || null,
            }
          : null,
        teacher: (claimCode as any).teacher || null,
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

    // Idempotency Guards
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.linkingStatus === 'PENDING') {
      return res.status(409).json({
        success: false,
        error: 'You already have a pending link request. Please wait for admin approval.',
      });
    }
    if (currentUser?.schoolId) {
      return res.status(409).json({
        success: false,
        error: 'Your account is already linked to a school.',
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

    const linkedProfile =
      claimCode.studentId
        ? await prisma.user.findUnique({ where: { studentId: claimCode.studentId }, select: { id: true } })
        : claimCode.teacherId
          ? await prisma.user.findUnique({ where: { teacherId: claimCode.teacherId }, select: { id: true } })
          : null;
    if (linkedProfile) {
      return res.status(409).json({
        success: false,
        error: 'This school profile is already linked to an account.',
      });
    }

    const pendingForCode = await findPendingUserForClaimCode((claimCode as any).code, userId);
    if (pendingForCode) {
      return res.status(409).json({
        success: false,
        error: 'This claim code already has a pending approval request.',
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

    // Store pending link data — do NOT apply role/schoolId yet
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkingStatus: 'PENDING',
        pendingLinkData: {
          code: (claimCode as any).code,
          schoolId: (claimCode as any).school.id,
          schoolName: (claimCode as any).school.name,
          type: (claimCode as any).type,
          studentId: (claimCode as any).studentId || null,
          teacherId: (claimCode as any).teacherId || null,
          submittedAt: new Date().toISOString(),
          verificationData: verificationData || null,
        } as any,
      },
    });

    // Return success with pending status
    res.json({
      success: true,
      message: 'Link request submitted. Awaiting admin approval.',
      data: {
        linkingStatus: 'PENDING',
        school: {
          id: (claimCode as any).school.id,
          name: (claimCode as any).school.name,
        },
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
 * GET /auth/admin/pending-links
 * Returns all users with linkingStatus = PENDING for a given school
 * Requires admin authentication
 */
app.get('/auth/admin/pending-links', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.query;

    // Only ADMIN or SUPER_ADMIN can access
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        linkingStatus: 'PENDING',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePictureUrl: true,
        pendingLinkData: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Post-filter by schoolId if provided
    const filtered = schoolId
      ? pendingUsers.filter((u: any) => (u.pendingLinkData as any)?.schoolId === schoolId)
      : pendingUsers;

    const actionablePending = [];
    for (const pendingUser of filtered) {
      const data = pendingUser.pendingLinkData as any;
      if (!data?.schoolId || !data?.code) {
        await prisma.user.update({
          where: { id: pendingUser.id },
          data: { linkingStatus: 'NONE', pendingLinkData: null },
        });
        continue;
      }

      const normalizedCode = String(data.code).trim().toUpperCase();
      const claimCode = await prisma.claimCode.findUnique({
        where: { code: normalizedCode },
        select: { claimedAt: true, claimedByUserId: true },
      });

      if (claimCode?.claimedAt && claimCode.claimedByUserId !== pendingUser.id) {
        await prisma.user.update({
          where: { id: pendingUser.id },
          data: { linkingStatus: 'NONE', pendingLinkData: null },
        });
        continue;
      }

      if (data.studentId) {
        const targetStudent = await prisma.student.findFirst({
          where: { id: data.studentId, schoolId: data.schoolId },
          select: { user: { select: { id: true } } },
        });
        if (targetStudent?.user && targetStudent.user.id !== pendingUser.id) {
          await prisma.user.update({
            where: { id: pendingUser.id },
            data: { linkingStatus: 'NONE', pendingLinkData: null },
          });
          continue;
        }
        if (targetStudent?.user?.id === pendingUser.id) {
          await prisma.user.update({
            where: { id: pendingUser.id },
            data: { linkingStatus: 'APPROVED', pendingLinkData: null },
          });
          continue;
        }
      }

      if (data.teacherId) {
        const targetTeacher = await prisma.teacher.findFirst({
          where: { id: data.teacherId, schoolId: data.schoolId },
          select: { user: { select: { id: true } } },
        });
        if (targetTeacher?.user && targetTeacher.user.id !== pendingUser.id) {
          await prisma.user.update({
            where: { id: pendingUser.id },
            data: { linkingStatus: 'NONE', pendingLinkData: null },
          });
          continue;
        }
        if (targetTeacher?.user?.id === pendingUser.id) {
          await prisma.user.update({
            where: { id: pendingUser.id },
            data: { linkingStatus: 'APPROVED', pendingLinkData: null },
          });
          continue;
        }
      }

      actionablePending.push(pendingUser);
    }

    res.json({ success: true, data: actionablePending });
  } catch (error: any) {
    console.error('Fetch pending links error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending links' });
  }
});

/**
 * POST /auth/admin/approve-link/:userId
 * Approves a pending school link request and applies the role/schoolId
 */
app.post('/auth/admin/approve-link/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.linkingStatus !== 'PENDING') {
      return res.status(404).json({ success: false, error: 'No pending link request found for this user' });
    }

    const pendingData = user.pendingLinkData as any;
    if (!pendingData?.code || !pendingData?.schoolId) {
      return res.status(400).json({ success: false, error: 'Invalid pending link data' });
    }
    if (pendingData.schoolId !== req.user.schoolId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Cannot approve requests from another school' });
    }

    // Find the claim code
    const claimCode = await prisma.claimCode.findUnique({
      where: { code: String(pendingData.code).trim().toUpperCase() },
      include: { school: true, student: true, teacher: true },
    });

    if (!claimCode && !pendingData.studentId && !pendingData.teacherId) {
      return res.status(404).json({
        success: false,
        error: 'Claim code no longer exists and no target profile was stored. Please reject this request and ask the user to scan a new code.',
      });
    }

    if (claimCode && claimCode.schoolId !== pendingData.schoolId) {
      return res.status(409).json({ success: false, error: 'Claim code school does not match this request' });
    }

    if (claimCode?.claimedAt && claimCode.claimedByUserId !== userId) {
      return res.status(409).json({ success: false, error: 'Claim code was already used by another user' });
    }

    if (pendingData.studentId) {
      const targetStudent = await prisma.student.findFirst({
        where: { id: pendingData.studentId, schoolId: pendingData.schoolId },
        select: {
          id: true,
          user: { select: { id: true, email: true } },
        },
      });
      if (!targetStudent) {
        return res.status(404).json({ success: false, error: 'Target student no longer exists in this school' });
      }
      if (targetStudent.user && targetStudent.user.id !== userId) {
        return res.status(409).json({
          success: false,
          error: 'Target student is already linked to another account. Reject this request if the user scanned the wrong claim code.',
        });
      }
    }

    if (pendingData.teacherId) {
      const targetTeacher = await prisma.teacher.findFirst({
        where: { id: pendingData.teacherId, schoolId: pendingData.schoolId },
        select: {
          id: true,
          user: { select: { id: true, email: true } },
        },
      });
      if (!targetTeacher) {
        return res.status(404).json({ success: false, error: 'Target teacher no longer exists in this school' });
      }
      if (targetTeacher.user && targetTeacher.user.id !== userId) {
        return res.status(409).json({
          success: false,
          error: 'Target teacher is already linked to another account. Reject this request if the user scanned the wrong claim code.',
        });
      }
    }

    // Apply the link in a transaction
    await prisma.$transaction(async (tx) => {
      let finalStudentId = pendingData.studentId || null;
      let finalTeacherId = pendingData.teacherId || null;

      if (finalStudentId) {
        const targetStudent = await tx.student.findFirst({
          where: { id: finalStudentId, schoolId: pendingData.schoolId },
          select: { id: true },
        });
        if (!targetStudent) {
          throw new Error('Target student no longer exists in this school');
        }
      }

      if (finalTeacherId) {
        const targetTeacher = await tx.teacher.findFirst({
          where: { id: finalTeacherId, schoolId: pendingData.schoolId },
          select: { id: true },
        });
        if (!targetTeacher) {
          throw new Error('Target teacher no longer exists in this school');
        }
      }

      // Create Teacher profile if needed
      if (pendingData.type === 'TEACHER' && !finalTeacherId) {
        const newTeacher = await tx.teacher.create({
          data: {
            schoolId: pendingData.schoolId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || null,
            gender: 'MALE',
            customFields: { regional: { position: 'Teacher' } } as any,
          },
        });
        finalTeacherId = newTeacher.id;
      }

      // Create Student profile if needed
      if (pendingData.type === 'STUDENT' && !finalStudentId) {
        const newStudent = await tx.student.create({
          data: {
            schoolId: pendingData.schoolId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            dateOfBirth: pendingData.verificationData?.dateOfBirth || new Date().toISOString(),
            gender: 'MALE',
          } as any,
        });
        finalStudentId = newStudent.id;
      }

      // Now apply role, schoolId, and clear pending data
      await tx.user.update({
        where: { id: userId },
        data: {
          role: pendingData.type === 'TEACHER' ? 'TEACHER' : 'STUDENT',
          schoolId: pendingData.schoolId,
          accountType: 'HYBRID',
          organizationCode: pendingData.schoolId,
          organizationName: pendingData.schoolName,
          socialFeaturesEnabled: true,
          linkingStatus: 'APPROVED',
          pendingLinkData: null,
          ...(finalStudentId && { studentId: finalStudentId }),
          ...(finalTeacherId && { teacherId: finalTeacherId }),
        },
      });

      // Mark the claim code as claimed NOW (only on approval)
      if (claimCode) {
        await tx.claimCode.update({
          where: { id: claimCode.id },
          data: {
            claimedAt: new Date(),
            claimedByUserId: userId,
          },
        });
      }
    });

    // Send in-app notification to the user
    try {
      await prisma.notification.create({
        data: {
          recipientId: userId,
          type: 'SYSTEM',
          title: 'School Account Linked ✅',
          message: `Your account has been approved and linked to ${pendingData.schoolName}.`,
        },
      });
    } catch (notifError) {
      console.warn('Failed to send approval notification:', notifError);
    }

    res.json({ success: true, message: 'Account link approved successfully.' });
  } catch (error: any) {
    console.error('Approve link error:', error);
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Target profile is already linked to another account. Reject this request if the user scanned the wrong claim code.',
      });
    }
    res.status(500).json({ success: false, error: 'Failed to approve link request' });
  }
});

/**
 * POST /auth/admin/reject-link/:userId
 * Rejects a pending school link request and resets the user's status
 */
app.post('/auth/admin/reject-link/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.linkingStatus !== 'PENDING') {
      return res.status(404).json({ success: false, error: 'No pending request found' });
    }

    const pendingData = user.pendingLinkData as any;

    // Reset user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkingStatus: 'NONE',
        pendingLinkData: null,
      },
    });

    // Notify the user
    try {
      await prisma.notification.create({
        data: {
          recipientId: userId,
          type: 'SYSTEM',
          title: 'School Link Request Rejected',
          message: reason
            ? `Your request to link to ${pendingData?.schoolName} was rejected: ${reason}`
            : `Your request to link to ${pendingData?.schoolName} was not approved. Please contact your school admin.`,
        },
      });
    } catch (notifError) {
      console.warn('Failed to send rejection notification:', notifError);
    }

    res.json({ success: true, message: 'Link request rejected.' });
  } catch (error: any) {
    console.error('Reject link error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject link request' });
  }
});

/**
 * POST /auth/register/with-claim-code
 * Register a new account with a claim code
 * Creates a user account and submits the school link for admin approval
 */
app.post('/auth/register/with-claim-code', async (req: Request, res: Response) => {
  try {
    let { code, email, password, firstName, lastName, phone, verificationData } = req.body;
    const emailTrim = typeof email === 'string' ? email.trim() : '';
    const phoneTrim = typeof phone === 'string' ? phone.trim() : '';

    // Validate required fields (relaxed firstName/lastName as we can get them from claim code)
    if (!code || !password || (!emailTrim && !phoneTrim)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required credentials (code, password, and email or phone)',
      });
    }

    // Validate email format (if email is provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailTrim && !emailRegex.test(emailTrim)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Check if email / phone already exists
    if (emailTrim) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: emailTrim },
      });

      if (existingByEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }
    }
    if (phoneTrim) {
      const existingByPhone = await prisma.user.findFirst({
        where: { phone: phoneTrim },
      });

      if (existingByPhone) {
        return res.status(400).json({
          success: false,
          error: 'Phone number already registered',
        });
      }
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

    const registrationLinkedProfile =
      claimCode.studentId
        ? await prisma.user.findUnique({ where: { studentId: claimCode.studentId }, select: { id: true } })
        : claimCode.teacherId
          ? await prisma.user.findUnique({ where: { teacherId: claimCode.teacherId }, select: { id: true } })
          : null;
    if (registrationLinkedProfile) {
      return res.status(409).json({
        success: false,
        error: 'This school profile is already linked to an account.',
      });
    }

    const pendingForCode = await findPendingUserForClaimCode((claimCode as any).code);
    if (pendingForCode) {
      return res.status(409).json({
        success: false,
        error: 'This claim code already has a pending approval request.',
      });
    }

    // Fallback names from claimcode if missing
    if (!firstName || !lastName) {
      if (claimCode.type === 'STUDENT' && claimCode.student) {
        firstName = firstName || claimCode.student.firstName;
        lastName = lastName || claimCode.student.lastName;
      } else if (claimCode.type === 'TEACHER' && claimCode.teacher) {
        firstName = firstName || claimCode.teacher.firstName;
        lastName = lastName || claimCode.teacher.lastName;
      }
      
      if (!firstName || !lastName) {
        return res.status(400).json({
          success: false,
          error: 'Names could not be resolved from claim code. Please provide them manually.',
        });
      }
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

    // Create user and submit pending school link in transaction. Admin approval applies the school link.
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: emailTrim || null,
          password: hashedPassword,
          firstName,
          lastName,
          phone: phoneTrim || null,
          accountType: 'HYBRID',
          organizationCode: claimCode.school.id,
          organizationName: claimCode.school.name,
          organizationType: claimCode.school.schoolType,
          role: claimCode.type === 'TEACHER' ? 'TEACHER' : 'STUDENT',
          socialFeaturesEnabled: true,
          isEmailVerified: false,
          linkingStatus: 'PENDING',
          pendingLinkData: {
            code: (claimCode as any).code,
            schoolId: claimCode.school.id,
            schoolName: claimCode.school.name,
            type: claimCode.type,
            studentId: claimCode.studentId || null,
            teacherId: claimCode.teacherId || null,
            submittedAt: new Date().toISOString(),
            verificationData: verificationData || null,
          } as any,
        },
      });

      return user;
    });

    // Generate tokens using the same claim shape as normal login.
    const token = jwt.sign(
      {
        userId: result.id,
        email: result.email,
        role: result.role,
        schoolId: null,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
    );
    const refreshToken = jwt.sign(
      { userId: result.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRATION } as jwt.SignOptions
    );

    // Return success with token
    res.status(201).json({
      success: true,
      message: 'Account created. Your school link is awaiting admin approval.',
      data: {
        user: {
          id: result.id,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role,
          accountType: result.accountType,
          profilePictureUrl: result.profilePictureUrl,
          schoolId: null,
          linkingStatus: result.linkingStatus,
          pendingLinkData: result.pendingLinkData,
        },
        school: null,
        pendingSchool: {
          id: claimCode.school.id,
          name: claimCode.school.name,
          type: claimCode.school.schoolType,
        },
        linkingStatus: 'PENDING',
        token,
        tokens: {
          accessToken: token,
          refreshToken,
          expiresIn: JWT_EXPIRATION,
        },
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
