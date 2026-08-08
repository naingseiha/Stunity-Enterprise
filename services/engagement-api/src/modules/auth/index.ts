import { getSharedPrisma } from '../../core/prisma';
import { getJwtSecret } from '../../../../lib/jwt-secret';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { withPrismaPoolParams } from '../../../../lib/prisma-pool-url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import ClaimCodeGenerator from './utils/claimCodeGenerator';
import * as tokenBlacklist from './utils/tokenBlacklist';
import { generateUniqueUsername } from './utils/username';
import passwordResetRoutes from './routes/passwordReset.routes';
import socialAuthRoutes from './routes/socialAuth.routes';
import twoFactorRoutes from './routes/twoFactor.routes';
import ssoRoutes from './routes/sso.routes';
import translationRoutes from './routes/translation.routes';
import passwordlessRoutes from './routes/passwordless.routes';
import oidcTelegramRoutes from './routes/oidcTelegram.routes';
import passkeyRoutes from './routes/passkey.routes';
import { isPasswordHashUsable, publicRegistrationAuthorization } from './security/authPolicy';
import { normalizeEmail, normalizePhone, phoneLookupCandidates } from './security/identifiers';
import { buildMaskedClaimPreview } from './security/claimPreview';
import { createSharedRateLimitStore } from './security/rateLimitStore';
import { assertPasswordlessProductionConfig, buildPasswordlessReadiness } from './passwordless/providerConfig';
import { createStructuredAuthMetrics } from './observability/authOperationalMetrics';
import { requireNormalizedSchoolLinkRequestId } from './domain/legacySchoolLinkAdapter';
import { publicPendingLinkData } from './security/publicAuthResponse';
import { compareSchoolAuthorizationProjection } from './security/schoolAuthorizationProjection';
import { requireInternalServiceToken } from './security/internalServiceAuth';
import { createAdminPermissionRouter } from './security/adminPermissionRoutes';
import { PERMISSIONS, hasPermission } from '../../../../lib/admin-permissions';
import {
  assertSecureAuthSessionConfig,
  authDbSessionsEnabled,
  authLegacyJwtRefreshEnabled,
  durationToMilliseconds,
  getAuthSessionSecurityStatus,
  issueRefreshCredential,
} from './security/refreshCredential';
import {
  signAccessToken,
  signTwoFactorChallenge,
  verifyAccessToken,
  verifyLegacyRefreshToken,
} from './security/tokenClaims';
import {
  AuthSessionError,
  rotateAuthSession,
  revokeAuthSession,
} from './security/authSessionService';
import {
  AuthSessionManagementError,
  listActiveAuthSessions,
  revokeOtherOwnedAuthSessions,
  revokeOwnedAuthSession,
} from './domain/authSessionManagement';
import {
  SchoolLinkError,
  approveSchoolLinkRequest,
  cancelSchoolLinkRequest,
  getCurrentSchoolLink,
  listSchoolLinkRequests,
  rejectSchoolLinkRequest,
  submitSchoolLinkRequest,
  unlinkSchoolLinkRequest,
} from './domain/schoolLinkService';

// Load environment variables from root .env

assertSecureAuthSessionConfig();

const app = express.Router();
const PORT = process.env.PORT || process.env.AUTH_SERVICE_PORT || 3001;
const passwordlessConfig = assertPasswordlessProductionConfig();
const authOperationalMetrics = createStructuredAuthMetrics();
for (const warning of passwordlessConfig.warnings) {
  console.warn(`Passwordless configuration warning: ${warning}`);
}
const JWT_SECRET = getJwtSecret();
// Remember-me UX comes from the rotating device session, not a long-lived
// bearer token. Short access tokens limit exposure without logging users out.
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '15m';
// Sliding idle window: each refresh extends expiry from now. Active users stay
// signed in indefinitely; unused sessions expire after this idle period.
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '365d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const parentDirectoryCache = new Map<string, { data: any; timestamp: number }>();
const PARENT_DIRECTORY_CACHE_TTL_MS = 60 * 1000;

// ✅ Singleton pattern to prevent multiple Prisma instances

const prisma = getSharedPrisma();


// Prisma opens DB connections lazily per request.
// Avoid startup warmup queries to reduce noisy pooler errors during cold starts.

// Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Middleware - CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];


// Security headers
app.use('/auth', hpp());
app.use('/auth', express.json({ limit: '10kb' }));
app.use('/admin', hpp());
app.use('/admin', express.json({ limit: '10kb' }));

// Redis-backed in production so limits apply across all Cloud Run instances.
const globalLimiter = rateLimit({
  store: createSharedRateLimitStore('global'),
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' },
});

const authLimiter = rateLimit({
  store: createSharedRateLimitStore('login'),
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  store: createSharedRateLimitStore('register'),
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many accounts created. Try again later.' },
});

const claimPreviewLimiter = rateLimit({
  store: createSharedRateLimitStore('claim-preview'),
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many claim code attempts. Try again later.' },
});

app.use('/auth', globalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/parent/login', authLimiter);
app.use('/auth/social', authLimiter);
app.use('/auth/oidc/telegram', authLimiter);
app.use('/auth/passkeys', authLimiter);
app.use('/auth/register', registerLimiter);
app.use('/auth/parent/register', registerLimiter);
app.use('/auth/claim-codes/validate', claimPreviewLimiter);
app.use('/auth/claim-codes/preview', claimPreviewLimiter);

// Legacy parent enrollment linked school/roster data before approval. Keep existing
// parent password login, but close new enrollment until it uses SchoolLinkService.
app.use(['/auth/parent/register', '/auth/parent/find-student'], (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    code: 'GENERAL_ACCOUNT_REQUIRED',
    error: 'Create a General Account first, then link school access with a Claim Code and admin approval.',
  });
});

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
    permissions?: unknown;
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

    const decoded = verifyAccessToken(token, JWT_SECRET);

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

    // Access tokens issued before a school unlink are invalid immediately. Tokens
    // created before this field existed are version 0 for backward compatibility.
    const tokenSchoolAccessVersion = Number.isInteger(decoded.schoolAccessVersion)
      ? decoded.schoolAccessVersion
      : 0;
    if (tokenSchoolAccessVersion !== user.schoolAccessVersion) {
      return res.status(401).json({
        success: false,
        code: 'SCHOOL_ACCESS_CHANGED',
        error: 'School access changed. Please sign in again.',
      });
    }

    // Phase 5 shadow read: compare normalized membership authorization with the
    // legacy User projection without changing the live authorization decision.
    if (process.env.AUTH_SCHOOL_MEMBERSHIP_DUAL_READ_ENABLED === 'true') {
      const membership = await prisma.schoolMembership.findFirst({
        where: user.schoolId
          ? { userId: user.id, schoolId: user.schoolId }
          : { userId: user.id, status: 'ACTIVE' },
        select: {
          schoolId: true,
          studentId: true,
          teacherId: true,
          role: true,
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      const comparison = compareSchoolAuthorizationProjection({
        schoolId: user.schoolId,
        studentId: user.studentId,
        teacherId: user.teacherId,
        role: user.role,
      }, membership);
      authOperationalMetrics.increment('school_membership_projection_total', {
        result: comparison.comparisonCode,
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
      permissions: user.permissions,
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
 * passwords for users who may not have email access. The target can be either
 * a User id or a linked Student/Teacher/Parent profile id.
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

      // 1. Authorization: User must be a school/platform admin
      // SUPER_ADMIN = platform admin (full access), ADMIN/SCHOOL_ADMIN = school-scoped
      const isSuper = requester.role === 'SUPER_ADMIN';
      const isAdmin = hasPermission(requester, PERMISSIONS.RESET_USER_PASSWORDS);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Admin privileges required'
        });
      }

      // 2. Fetch target user
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { studentId: userId },
            { teacherId: userId },
            { parentId: userId },
          ],
        },
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
        where: { id: targetUser.id },
        data: {
          password: hashedPassword,
          isActive: true,
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
      });
    }
  }
);

// ─── Mount modular route files ───────────────────────────────────────
app.use('/auth', passwordResetRoutes(prisma));
app.use('/auth', passwordlessRoutes(prisma, {
  jwtSecret: JWT_SECRET,
  accessTokenExpiration: JWT_EXPIRATION,
  refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION,
  metrics: authOperationalMetrics,
}));
app.use('/auth/social', socialAuthRoutes(prisma));
app.use('/auth/oidc/telegram', oidcTelegramRoutes(prisma, { metrics: authOperationalMetrics }));
app.use('/auth', passkeyRoutes(prisma, authenticateToken, {
  jwtSecret: JWT_SECRET,
  accessTokenExpiration: JWT_EXPIRATION,
  refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION,
  metrics: authOperationalMetrics,
}));
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

// Readiness is explicit and may touch the database. Passwordless configuration
// is reported without provider credentials or destinations so staging gates can
// distinguish a healthy legacy-password service from a ready OTP pilot.
app.get(['/ready', '/health/ready'], async (_req: Request, res: Response) => {
  const passwordless = buildPasswordlessReadiness();
  const sessions = getAuthSessionSecurityStatus();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ready = passwordless.ready && sessions.ready;
    return res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      service: 'auth-service',
      checks: {
        database: { ready: true },
        passwordless,
        sessions: {
          ready: sessions.ready,
          dbSessions: sessions.dbSessions,
          legacyRefresh: sessions.legacyRefresh,
        },
      },
    });
  } catch {
    return res.status(503).json({
      status: 'not_ready',
      service: 'auth-service',
      checks: {
        database: { ready: false },
        passwordless,
        sessions: {
          ready: sessions.ready,
          dbSessions: sessions.dbSessions,
          legacyRefresh: sessions.legacyRefresh,
        },
      },
    });
  }
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
    body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email must be valid when provided'),
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
      const normalizedEmail = normalizeEmail(email);
      const rawPhone = typeof phone === 'string' ? phone.trim() : '';
      const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;

      if (!normalizedEmail && !rawPhone) {
        return res.status(400).json({
          success: false,
          error: 'Please provide email or phone number',
        });
      }
      if (rawPhone && !normalizedPhone) {
        return res.status(400).json({ success: false, error: 'Invalid phone number' });
      }

      // Debug logging
      console.log('🔐 Login attempt:', {
        method: normalizedEmail ? 'email' : 'phone',
        passwordLength: password?.length,
        timestamp: new Date().toISOString()
      });

      // Find user by email or phone
      const user = normalizedEmail
        ? await prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
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
          where: { phone: { in: phoneLookupCandidates(rawPhone) } },
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
        console.log('❌ User not found for submitted identifier');
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      console.log('✅ User found for submitted identifier');

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
      // Authentication method is determined by the credential, never by school affiliation.
      if (!hasUsablePasswordHash) {
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
        userId: user.id,
        valid: isPasswordValid
      });

      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', user.id);
        await recordFailedAttempt(user);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      const twoFactor = await prisma.twoFactorSecret.findUnique({
        where: { userId: user.id },
        select: { isEnabled: true },
      });
      if (twoFactor?.isEnabled) {
        return res.json({
          success: true,
          data: {
            requires2FA: true,
            challengeToken: signTwoFactorChallenge(user.id, JWT_SECRET),
            email: user.email,
          },
        });
      }

      console.log('✅ Login successful for user:', user.id);

      // Full authentication is complete only after any required second factor.
      await recordSuccessfulLogin(user.id);
      if (user.accountType === 'SOCIAL_ONLY') {
        await prisma.user.update({
          where: { id: user.id },
          data: { accountType: 'HYBRID' },
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

      const accessToken = signAccessToken(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          schoolAccessVersion: user.schoolAccessVersion,
          isSuperAdmin: user.role === 'SUPER_ADMIN', // derived from role for backward compat
          schoolAccessScope: schoolAccess.accessScope,
          school: schoolPayload,
        },
        JWT_SECRET,
        JWT_EXPIRATION,
      );

      const refreshToken = await issueRefreshCredential({
        prisma, userId: user.id, schoolAccessVersion: user.schoolAccessVersion,
        jwtSecret: JWT_SECRET, refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION, req,
      });

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
            teacherId: user.teacherId,
            studentId: user.studentId,
            teacher: user.teacherId ? { id: user.teacherId } : null,
            isSuperAdmin: user.role === 'SUPER_ADMIN', // derived from role
            linkingStatus: user.linkingStatus,
            pendingLinkData: publicPendingLinkData(user.pendingLinkData),
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
      });
    }
  }
);

// ============================================
// REGISTER ENDPOINT
// ============================================

/**
 * POST /auth/register
 * Basic registration for General Accounts (no school affiliation)
 * Accepts email OR phone (at least one required, like Facebook)
 */
app.post(
  '/auth/register',
  [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email must be valid when provided'),
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

      const { email, password, firstName, lastName, phone } = req.body;
      const normalizedEmail = normalizeEmail(email);
      const rawPhone = typeof phone === 'string' ? phone.trim() : '';
      const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;
      const authorization = publicRegistrationAuthorization();

      // Require at least one of email or phone
      if (!normalizedEmail && !rawPhone) {
        return res.status(400).json({
          success: false,
          error: 'Please provide email or phone number (at least one required)',
        });
      }
      if (rawPhone && !normalizedPhone) {
        return res.status(400).json({ success: false, error: 'Invalid phone number' });
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
        method: normalizedEmail && normalizedPhone ? 'email_and_phone' : normalizedEmail ? 'email' : 'phone',
        timestamp: new Date().toISOString()
      });

      // Check if email already exists (when provided)
      if (normalizedEmail) {
        const existingByEmail = await prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        });
        if (existingByEmail) {
          return res.status(400).json({
            success: false,
            error: 'Email already registered',
          });
        }
      }

      // Check if phone already exists (when provided)
      if (normalizedPhone) {
        const existingByPhone = await prisma.user.findFirst({
          where: { phone: { in: phoneLookupCandidates(rawPhone) } },
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

      // Assign a unique username so public profile URLs (stunity.app/u/{username}) work from day one
      const username = await generateUniqueUsername(prisma, firstName, lastName);

      // Create user (email and phone are optional in schema)
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          phone: normalizedPhone,
          username,
          password: hashedPassword,
          firstName,
          lastName,
          role: authorization.role,
          accountType: authorization.accountType,
          socialFeaturesEnabled: true,
          isEmailVerified: false,
          isActive: true,
        },
      });

      console.log('✅ User created:', user.email || user.phone);

      // Generate tokens
      const accessToken = signAccessToken(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          accountType: user.accountType,
          schoolAccessVersion: user.schoolAccessVersion,
        },
        JWT_SECRET,
        JWT_EXPIRATION,
      );

      const refreshToken = await issueRefreshCredential({
        prisma, userId: user.id, schoolAccessVersion: user.schoolAccessVersion,
        jwtSecret: JWT_SECRET, refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION, req,
      });

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
      if (authDbSessionsEnabled()) {
        await revokeAuthSession(prisma, refreshToken, 'USER_LOGOUT');
      }
      tokenBlacklist.revokeRefreshToken(
        refreshToken,
        durationToMilliseconds(REFRESH_TOKEN_EXPIRATION),
      );
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
    });
  }
});

app.get('/auth/me/sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!authDbSessionsEnabled()) {
    return res.status(503).json({
      success: false,
      code: 'AUTH_SESSIONS_NOT_ENABLED',
      error: 'Session management is not enabled for this environment.',
    });
  }
  try {
    const deviceId = req.get('x-device-id')?.trim() || '';
    const sessions = await listActiveAuthSessions(prisma, req.user!.id);
    return res.json({
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          ...session,
          isCurrent: Boolean(deviceId && session.deviceId && session.deviceId === deviceId),
        })),
      },
    });
  } catch (error) {
    console.error('List auth sessions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to list sessions' });
  }
});

app.post('/auth/me/sessions/revoke-others', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!authDbSessionsEnabled()) {
    return res.status(503).json({
      success: false,
      code: 'AUTH_SESSIONS_NOT_ENABLED',
      error: 'Session management is not enabled for this environment.',
    });
  }
  const deviceId = req.get('x-device-id')?.trim() || '';
  try {
    const result = await revokeOtherOwnedAuthSessions(prisma, req.user!.id, deviceId);
    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AuthSessionManagementError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    console.error('Revoke other auth sessions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to revoke other sessions' });
  }
});

app.delete('/auth/me/sessions/:sessionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!authDbSessionsEnabled()) {
    return res.status(503).json({
      success: false,
      code: 'AUTH_SESSIONS_NOT_ENABLED',
      error: 'Session management is not enabled for this environment.',
    });
  }
  const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId.trim() : '';
  if (!sessionId || sessionId.length > 200) {
    return res.status(400).json({ success: false, error: 'Invalid session id' });
  }
  try {
    const result = await revokeOwnedAuthSession(prisma, req.user!.id, sessionId);
    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AuthSessionManagementError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    console.error('Revoke auth session error:', error);
    return res.status(500).json({ success: false, error: 'Failed to revoke session' });
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

    if (typeof refreshToken !== 'string' || refreshToken.length > 4096) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Check legacy/in-memory revocation (logout during the compatibility window).
    if (tokenBlacklist.isRevoked(refreshToken)) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked. Please log in again.',
      });
    }

    let decoded: any = null;
    let rotatedSession: Awaited<ReturnType<typeof rotateAuthSession>> | null = null;
    let refreshUserId: string;

    if (authDbSessionsEnabled() && !refreshToken.includes('.')) {
      try {
        rotatedSession = await rotateAuthSession(prisma, refreshToken, {
          expiresAt: new Date(Date.now() + durationToMilliseconds(REFRESH_TOKEN_EXPIRATION)),
        });
        refreshUserId = rotatedSession.userId;
      } catch (error) {
        if (error instanceof AuthSessionError) {
          const status = error.code === 'SESSION_CONFLICT' ? 409 : 401;
          return res.status(status).json({ success: false, code: error.code, error: error.message });
        }
        throw error;
      }
    } else if (!authDbSessionsEnabled() || authLegacyJwtRefreshEnabled()) {
      // Legacy JWT refresh credentials have a dedicated type, issuer, and
      // audience. Access and 2FA tokens must never pass this validation path.
      try {
        decoded = verifyLegacyRefreshToken(refreshToken, JWT_SECRET);
        refreshUserId = decoded.userId;
      } catch {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        code: 'LEGACY_REFRESH_DISABLED',
        error: 'Invalid refresh token',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: refreshUserId },
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
      if (rotatedSession) {
        await revokeAuthSession(prisma, rotatedSession.refreshToken, 'USER_INACTIVE');
      }
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    // Check password change invalidation
    const credentialIssuedAt = rotatedSession?.previousCreatedAt
      || (decoded?.iat ? new Date(decoded.iat * 1000) : null);
    if (user.passwordChangedAt && credentialIssuedAt) {
      const changedTimestamp = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (Math.floor(credentialIssuedAt.getTime() / 1000) < changedTimestamp) {
        if (rotatedSession) {
          await revokeAuthSession(prisma, rotatedSession.refreshToken, 'PASSWORD_CHANGED');
        }
        return res.status(401).json({
          success: false,
          error: 'Password changed. Please log in again.',
        });
      }
    }

    const schoolAccess = resolveSchoolAccessContext(user.school, user.role === 'SUPER_ADMIN');
    if (!schoolAccess.allowed) {
      if (rotatedSession) {
        await revokeAuthSession(prisma, rotatedSession.refreshToken, 'SCHOOL_ACCESS_DENIED');
      }
      return res.status(schoolAccess.statusCode || 403).json({
        success: false,
        error: schoolAccess.error || 'Access denied',
        ...(schoolAccess.details ? { details: schoolAccess.details } : {}),
      });
    }

    if (rotatedSession && rotatedSession.schoolAccessVersion !== user.schoolAccessVersion) {
      await revokeAuthSession(prisma, rotatedSession.refreshToken, 'SCHOOL_ACCESS_CHANGED');
      return res.status(401).json({
        success: false,
        code: 'SCHOOL_ACCESS_CHANGED',
        error: 'School access changed. Please sign in again.',
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
    const newAccessToken = signAccessToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolAccessVersion: user.schoolAccessVersion,
        isSuperAdmin: user.role === 'SUPER_ADMIN', // derived from role for backward compat
        schoolAccessScope: schoolAccess.accessScope,
        school: schoolPayload,
      },
      JWT_SECRET,
      JWT_EXPIRATION,
    );

    const newRefreshToken = rotatedSession?.refreshToken || await issueRefreshCredential({
      prisma, userId: user.id, schoolAccessVersion: user.schoolAccessVersion,
      jwtSecret: JWT_SECRET, refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION, req,
    });
    if (authDbSessionsEnabled() && decoded) {
      tokenBlacklist.revokeRefreshToken(refreshToken, durationToMilliseconds(REFRESH_TOKEN_EXPIRATION));
    }

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
          recordStatus: 'ACTIVE',
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
          recordStatus: 'ACTIVE',
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
        const parentUsername = await generateUniqueUsername(tx, firstName, lastName);
        const user = await tx.user.create({
          data: {
            email: email || null,
            phone,
            username: parentUsername,
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

      const twoFactor = await prisma.twoFactorSecret.findUnique({
        where: { userId: user.id },
        select: { isEnabled: true },
      });
      if (twoFactor?.isEnabled) {
        return res.json({
          success: true,
          data: {
            requires2FA: true,
            challengeToken: signTwoFactorChallenge(user.id, JWT_SECRET),
            email: user.email,
          },
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
      const accessToken = signAccessToken(
        {
          userId: user.id,
          phone: user.phone,
          role: user.role,
          schoolId: user.schoolId,
          schoolAccessVersion: user.schoolAccessVersion,
          parentId: user.parentId,
          children: children.map(c => c.id),
        },
        JWT_SECRET,
        JWT_EXPIRATION,
      );

      const refreshToken = await issueRefreshCredential({
        prisma, userId: user.id, schoolAccessVersion: user.schoolAccessVersion,
        jwtSecret: JWT_SECRET, refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION, req,
      });

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
app.get('/auth/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
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
    });
  }
});

// Get unread count
app.get('/auth/notifications/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.put('/auth/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.put('/auth/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.delete('/auth/notifications/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.post('/auth/notifications', requireInternalServiceToken, async (req: Request, res: Response) => {
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
    });
  }
});

// Send notification to parent(s) of a student (helper endpoint)
app.post('/auth/notifications/parent', requireInternalServiceToken, async (req: Request, res: Response) => {
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
    });
  }
});

// School→Feed Notification Bridge: notify students directly
app.post('/auth/notifications/student', requireInternalServiceToken, async (req: Request, res: Response) => {
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
app.post('/auth/notifications/batch', requireInternalServiceToken, async (req: Request, res: Response) => {
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

const DEFAULT_MOBILE_APP_SETTINGS = {
  pushNotifications: true,
  emailNotifications: true,
  autoPlayVideos: true,
  hapticFeedback: true,
  showOnlineStatus: true,
  // Per-category push opt-in (opt-out model — all on by default). Consumed by
  // notification-service jobs via isPushCategoryEnabled().
  pushStreakReminders: true,
  pushWeeklyDigest: true,
  pushFollows: true,
  pushClubActivity: true,
  pushGrades: true,
  pushAssignments: true,
};

type MobileAppSettings = typeof DEFAULT_MOBILE_APP_SETTINGS;
type MobileAppSettingKey = keyof MobileAppSettings;

const normalizeMobileAppSettings = (value: unknown): MobileAppSettings => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Record<MobileAppSettingKey, unknown>>
    : {};

  // Every setting is a boolean with the same default-on behavior, so normalize uniformly.
  const result = {} as MobileAppSettings;
  (Object.keys(DEFAULT_MOBILE_APP_SETTINGS) as MobileAppSettingKey[]).forEach((key) => {
    result[key] = typeof source[key] === 'boolean'
      ? (source[key] as boolean)
      : DEFAULT_MOBILE_APP_SETTINGS[key];
  });
  return result;
};

const extractMobileAppSettings = (privacySettings: unknown): MobileAppSettings => {
  const settings = privacySettings && typeof privacySettings === 'object' && !Array.isArray(privacySettings)
    ? privacySettings as Record<string, unknown>
    : {};

  return normalizeMobileAppSettings(settings.mobileApp);
};

const mergePrivacySettingsWithMobileApp = (
  privacySettings: unknown,
  updates: Partial<MobileAppSettings>
) => {
  const current = privacySettings && typeof privacySettings === 'object' && !Array.isArray(privacySettings)
    ? privacySettings as Record<string, unknown>
    : {};

  const nextMobileApp = normalizeMobileAppSettings({
    ...extractMobileAppSettings(current),
    ...updates,
  });

  return {
    ...current,
    mobileApp: nextMobileApp,
  };
};

const ONLINE_PRESENCE_THRESHOLD_MS = 5 * 60 * 1000;

const getMobileAppRaw = (privacySettings: unknown): Record<string, unknown> => {
  const settings = privacySettings && typeof privacySettings === 'object' && !Array.isArray(privacySettings)
    ? privacySettings as Record<string, unknown>
    : {};
  const mobileApp = settings.mobileApp;
  return mobileApp && typeof mobileApp === 'object' && !Array.isArray(mobileApp)
    ? mobileApp as Record<string, unknown>
    : {};
};

const getLastActiveAt = (privacySettings: unknown): Date | null => {
  const raw = getMobileAppRaw(privacySettings).lastActiveAt;
  if (typeof raw !== 'string') return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isRecentlyActive = (lastActiveAt: Date | null, now = new Date()): boolean => {
  if (!lastActiveAt) return false;
  return now.getTime() - lastActiveAt.getTime() <= ONLINE_PRESENCE_THRESHOLD_MS;
};

const resolvePublicIsOnline = (privacySettings: unknown, now = new Date()): boolean => {
  const appSettings = extractMobileAppSettings(privacySettings);
  if (appSettings.showOnlineStatus === false) return false;
  return isRecentlyActive(getLastActiveAt(privacySettings), now);
};

const mergePresenceHeartbeat = (privacySettings: unknown) => {
  const current = privacySettings && typeof privacySettings === 'object' && !Array.isArray(privacySettings)
    ? privacySettings as Record<string, unknown>
    : {};

  return {
    ...current,
    mobileApp: {
      ...normalizeMobileAppSettings(getMobileAppRaw(current) as Partial<Record<MobileAppSettingKey, unknown>>),
      lastActiveAt: new Date().toISOString(),
    },
  };
};

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
        username: user.username,
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
        accountType: user.accountType,
        linkingStatus: user.linkingStatus,
        pendingLinkData: publicPendingLinkData(user.pendingLinkData),
        schoolAccessVersion: user.schoolAccessVersion,
        teacherId: user.teacherId,
        studentId: user.studentId,
        teacher: user.teacherId ? { id: user.teacherId } : null,
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
    });
  }
});

app.put('/users/me/username', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 30 characters' });
    }

    if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, dashes, and underscores' });
    }

    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing && existing.id !== req.user!.id) {
      return res.status(409).json({ success: false, error: 'Username is already taken' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { username: cleanUsername },
    });

    res.json({
      success: true,
      message: 'Username updated successfully',
      data: { username: updatedUser.username },
    });
  } catch (error: any) {
    console.error('Update username error:', error);
    res.status(500).json({ success: false, error: 'Failed to update username' });
  }
});

app.get('/users/me/app-settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { privacySettings: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: extractMobileAppSettings(user.privacySettings),
    });
  } catch (error: any) {
    console.error('Get app settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get app settings' });
  }
});

app.patch('/users/me/app-settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const allowedKeys: MobileAppSettingKey[] = [
      'pushNotifications',
      'emailNotifications',
      'autoPlayVideos',
      'hapticFeedback',
      'showOnlineStatus',
      'pushStreakReminders',
      'pushWeeklyDigest',
      'pushFollows',
      'pushClubActivity',
      'pushGrades',
      'pushAssignments',
    ];

    const updates: Partial<MobileAppSettings> = {};
    for (const key of allowedKeys) {
      if (req.body?.[key] === undefined) continue;
      if (typeof req.body[key] !== 'boolean') {
        return res.status(400).json({ success: false, error: `${key} must be a boolean` });
      }
      updates[key] = req.body[key];
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { privacySettings: true },
    });

    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const privacySettings = mergePrivacySettingsWithMobileApp(currentUser.privacySettings, updates);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { privacySettings },
      select: { privacySettings: true },
    });

    res.json({
      success: true,
      data: extractMobileAppSettings(updated.privacySettings),
    });
  } catch (error: any) {
    console.error('Update app settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update app settings' });
  }
});

app.post('/users/me/presence', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { privacySettings: true },
    });

    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const appSettings = extractMobileAppSettings(currentUser.privacySettings);
    if (!appSettings.showOnlineStatus) {
      return res.json({
        success: true,
        data: {
          isOnline: false,
          showOnlineStatus: false,
        },
      });
    }

    const privacySettings = mergePresenceHeartbeat(currentUser.privacySettings);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { privacySettings },
      select: { privacySettings: true },
    });

    const lastActiveAt = getLastActiveAt(updated.privacySettings);

    res.json({
      success: true,
      data: {
        isOnline: true,
        showOnlineStatus: true,
        lastActiveAt: lastActiveAt?.toISOString() ?? null,
      },
    });
  } catch (error: any) {
    console.error('Presence heartbeat error:', error);
    res.status(500).json({ success: false, error: 'Failed to update presence' });
  }
});

app.post('/users/presence', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIds = Array.isArray(req.body?.userIds)
      ? req.body.userIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 50)
      : [];

    if (userIds.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, privacySettings: true },
    });

    const data: Record<string, boolean> = {};
    for (const user of users) {
      data[user.id] = resolvePublicIsOnline(user.privacySettings);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Presence lookup error:', error);
    res.status(500).json({ success: false, error: 'Failed to lookup presence' });
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
      },
    });
    if (!user || !user.schoolId || (!user.studentId && !user.teacherId)) {
      return res.status(400).json({ success: false, error: 'User is not linked to a school' });
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
      if (changes.email !== undefined) userUpdateData.email = changes.email || null;
      if (changes.phoneNumber !== undefined) userUpdateData.phone = changes.phoneNumber || null;
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
             gender: changes.gender || undefined,
             dateOfBirth: changes.dateOfBirth || undefined,
             phoneNumber: changes.phoneNumber ?? undefined,
             email: changes.email === '' ? null : changes.email ?? undefined,
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
             gender: changes.gender || undefined,
             dateOfBirth: changes.dateOfBirth === '' ? null : changes.dateOfBirth ?? undefined,
             phone: changes.phoneNumber === '' ? null : changes.phoneNumber ?? undefined,
             email: changes.email === '' ? null : changes.email ?? undefined,
             address: changes.address === '' ? null : changes.address ?? undefined,
             hireDate: changes.hireDate === '' ? null : changes.hireDate ?? undefined,
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

/**
 * POST /users/me/verification-request
 * Submit a request to become a verified educator
 */
app.post('/users/me/verification-request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Check if user is already verified
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isVerified) {
      return res.status(400).json({ success: false, error: 'User is already verified' });
    }

    // Check for existing pending request
    const existing = await prisma.verificationRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'A verification request is already pending' });
    }

    const { documentUrl, notes } = req.body;
    
    const request = await prisma.verificationRequest.create({
      data: {
        userId,
        documentUrl: documentUrl || null,
        notes: notes || null,
      },
    });

    res.json({ success: true, message: 'Verification request submitted', data: request });
  } catch (error: any) {
    console.error('Verification request error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit request' });
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
          teacherId: user.teacherId,
          studentId: user.studentId,
          /** Minimal shape so mobile can treat admin+teacher like TEACHER for feature flags */
          teacher: user.teacherId ? { id: user.teacherId } : null,
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
    });
  }
});

// ============================================================================
// CLAIM CODE ENDPOINTS
// ============================================================================

/**
 * POST /auth/claim-codes/validate (legacy) or /auth/claim-codes/preview (authenticated)
 * Preview a claim code without claiming it
 * Returns school and student/teacher information if valid
 */
async function handleClaimCodePreview(req: Request, res: Response) {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';

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
          },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
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
            firstName: true,
            lastName: true,
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

    // Preview is deliberately masked. Full roster data is never returned here.
    res.json({
      success: true,
      data: buildMaskedClaimPreview(claimCode as any),
    });
  } catch (error: any) {
    console.error('Validate claim code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate claim code',
    });
  }
}

// Legacy unauthenticated adapter retained for already-released claim scanners.
app.post('/auth/claim-codes/validate', handleClaimCodePreview);

// New school-link flow previews only after the user has authenticated.
app.post('/auth/claim-codes/preview', authenticateToken, handleClaimCodePreview);

/**
 * POST /auth/claim-codes/link
 * Link a claim code to an existing user account
 * Requires authentication
 */
app.post('/auth/claim-codes/link', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const { verificationData } = req.body;
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

    const result = await submitSchoolLinkRequest(prisma, userId, code, verificationData, { ipAddress: req.ip });
    authOperationalMetrics.increment('school_link_submitted_total');
    res.json({
      success: true,
      message: 'Link request submitted. Awaiting admin approval.',
      data: result,
    });
  } catch (error: any) {
    console.error('Link claim code error:', error);
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to link claim code',
    });
  }
});

// Normalized Phase 1 API. The legacy /claim-codes/link endpoint remains an
// adapter for already-released mobile clients.
app.post('/auth/school-links', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });
    const result = await submitSchoolLinkRequest(
      prisma,
      userId,
      typeof req.body?.code === 'string' ? req.body.code : '',
      req.body?.verificationData,
      { ipAddress: req.ip },
    );
    authOperationalMetrics.increment('school_link_submitted_total');
    return res.status(202).json({ success: true, message: 'Link request submitted. Awaiting admin approval.', data: result });
  } catch (error: any) {
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    console.error('Submit school link error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit school link request' });
  }
});

app.get('/auth/school-links/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, error: 'User not authenticated' });
    const request = await getCurrentSchoolLink(prisma, req.user.id);
    return res.json({ success: true, data: request });
  } catch (error) {
    console.error('Fetch current school link error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch school link' });
  }
});

app.post('/auth/school-links/current/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, error: 'User not authenticated' });
    const result = await cancelSchoolLinkRequest(prisma, req.user.id, { ipAddress: req.ip });
    return res.json({ success: true, message: 'School link request cancelled.', data: result });
  } catch (error: any) {
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    console.error('Cancel school link error:', error);
    return res.status(500).json({ success: false, error: 'Failed to cancel school link request' });
  }
});

app.get('/auth/admin/school-links', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.APPROVE_SCHOOL_LINKS)) {
      return res.status(403).json({ success: false, error: 'School-link approval permission required' });
    }
    const schoolId = req.user?.role === 'SUPER_ADMIN'
      ? (typeof req.query.schoolId === 'string' ? req.query.schoolId : '')
      : (req.user?.schoolId || '');
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'UNLINKED'] as const;
    const requestedStatus = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'PENDING';
    if (!allowedStatuses.includes(requestedStatus as any)) {
      return res.status(400).json({ success: false, error: 'Invalid school-link status' });
    }
    const requests = await listSchoolLinkRequests(prisma, schoolId, requestedStatus as any);
    return res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Fetch school links error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch school links' });
  }
});

app.post('/auth/admin/school-links/:requestId/approve', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.APPROVE_SCHOOL_LINKS)) {
      return res.status(403).json({ success: false, error: 'School-link approval permission required' });
    }
    const result = await approveSchoolLinkRequest(prisma, req.params.requestId, {
      userId: req.user!.id,
      role: req.user!.role,
      schoolId: req.user!.schoolId,
      ipAddress: req.ip,
    });
    authOperationalMetrics.increment('school_link_approved_total');
    try {
      await prisma.notification.create({
        data: {
          recipientId: result.userId,
          type: 'SYSTEM',
          title: 'School Account Linked ✅',
          message: `Your account has been approved and linked to ${result.schoolName}.`,
        },
      });
    } catch (notificationError) {
      console.warn('Failed to send approval notification:', notificationError);
    }
    return res.json({ success: true, message: 'Account link approved successfully.', data: result });
  } catch (error: any) {
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    console.error('Approve school link error:', error);
    return res.status(500).json({ success: false, error: 'Failed to approve link request' });
  }
});

app.post('/auth/admin/school-links/:requestId/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.APPROVE_SCHOOL_LINKS)) {
      return res.status(403).json({ success: false, error: 'School-link approval permission required' });
    }
    const result = await rejectSchoolLinkRequest(prisma, req.params.requestId, {
      userId: req.user!.id,
      role: req.user!.role,
      schoolId: req.user!.schoolId,
      ipAddress: req.ip,
    }, req.body?.reason);
    authOperationalMetrics.increment('school_link_rejected_total', { reason_code: 'UNSPECIFIED' });
    try {
      await prisma.notification.create({
        data: {
          recipientId: result.userId,
          type: 'SYSTEM',
          title: 'School Link Request Rejected',
          message: `Your school link request was rejected: ${result.reason}`,
        },
      });
    } catch (notificationError) {
      console.warn('Failed to send rejection notification:', notificationError);
    }
    return res.json({ success: true, message: 'Link request rejected.', data: result });
  } catch (error: any) {
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    console.error('Reject school link error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reject link request' });
  }
});

app.post('/auth/admin/school-links/:requestId/unlink', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.APPROVE_SCHOOL_LINKS)) {
      return res.status(403).json({ success: false, error: 'School-link approval permission required' });
    }
    // Destructive school-access changes require fresh credential proof. This is
    // deliberately server-verified rather than trusting a client timestamp.
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { password: true } });
    const adminPassword = typeof req.body?.adminPassword === 'string' ? req.body.adminPassword : '';
    if (!actor || !isPasswordHashUsable(actor.password) || !adminPassword || !(await bcrypt.compare(adminPassword, actor.password))) {
      return res.status(401).json({ success: false, code: 'ADMIN_REAUTH_REQUIRED', error: 'Admin password confirmation is required.' });
    }
    const result = await unlinkSchoolLinkRequest(prisma, req.params.requestId, {
      userId: req.user!.id,
      role: req.user!.role,
      schoolId: req.user!.schoolId,
      ipAddress: req.ip,
    }, req.body || {});
    authOperationalMetrics.increment('school_link_unlinked_total', { reason_code: 'UNSPECIFIED' });
    if (result.replacementClaimCode) authOperationalMetrics.increment('school_claim_reissued_total');
    try {
      await prisma.notification.create({
        data: {
          recipientId: result.userId,
          type: 'SYSTEM',
          title: 'School Account Unlinked',
          message: `Your General Account was unlinked from ${result.schoolName}. Your school records were preserved.`,
        },
      });
    } catch (notificationError) {
      console.warn('Failed to send unlink notification:', notificationError);
    }
    return res.json({ success: true, message: 'School link removed. Academic records were preserved.', data: result });
  } catch (error: any) {
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
    console.error('Unlink school account error:', error);
    return res.status(500).json({ success: false, error: 'Failed to unlink school account' });
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
    if (!hasPermission(req.user, PERMISSIONS.APPROVE_SCHOOL_LINKS)) {
      return res.status(403).json({ success: false, error: 'School-link approval permission required' });
    }

    const requestedSchoolId = req.user?.role === 'SUPER_ADMIN'
      ? (typeof schoolId === 'string' ? schoolId : '')
      : req.user?.schoolId;
    if (!requestedSchoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    const requests = await listSchoolLinkRequests(prisma, requestedSchoolId, 'PENDING');
    const legacyResponse = requests.map((request) => ({
      ...request.user,
      normalizedRequestId: request.id,
      pendingLinkData: {
        code: request.claimCode.code,
        schoolId: request.schoolId,
        schoolName: request.school.name,
        type: request.claimCode.type,
        studentId: request.studentId,
        teacherId: request.teacherId,
        submittedAt: request.submittedAt.toISOString(),
      },
    }));

    return res.json({ success: true, data: legacyResponse });
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
    if (!hasPermission(req.user, PERMISSIONS.APPROVE_SCHOOL_LINKS)) {
      return res.status(403).json({ success: false, error: 'School-link approval permission required' });
    }

    const { userId } = req.params;

    // Compatibility adapter for clients that still address a request by user id.
    const normalizedRequestId = await requireNormalizedSchoolLinkRequestId(prisma, userId, 'PENDING');
    const result = await approveSchoolLinkRequest(prisma, normalizedRequestId, {
      userId: req.user!.id,
      role: req.user!.role,
      schoolId: req.user!.schoolId,
      ipAddress: req.ip,
    });
    authOperationalMetrics.increment('school_link_approved_total');
    try {
      await prisma.notification.create({
        data: {
          recipientId: result.userId,
          type: 'SYSTEM',
          title: 'School Account Linked ✅',
          message: `Your account has been approved and linked to ${result.schoolName}.`,
        },
      });
    } catch (notificationError) {
      console.warn('Failed to send approval notification:', notificationError);
    }
    return res.json({ success: true, message: 'Account link approved successfully.', data: result });
  } catch (error: any) {
    console.error('Approve link error:', error);
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
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
    if (!hasPermission(req.user, PERMISSIONS.APPROVE_SCHOOL_LINKS)) {
      return res.status(403).json({ success: false, error: 'School-link approval permission required' });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    // Compatibility adapter for clients that still address a request by user id.
    const normalizedRequestId = await requireNormalizedSchoolLinkRequestId(prisma, userId, 'PENDING');
    const result = await rejectSchoolLinkRequest(prisma, normalizedRequestId, {
      userId: req.user!.id,
      role: req.user!.role,
      schoolId: req.user!.schoolId,
      ipAddress: req.ip,
    }, reason || 'Rejected by school administrator');
    authOperationalMetrics.increment('school_link_rejected_total', { reason_code: 'UNSPECIFIED' });
    try {
      await prisma.notification.create({
        data: {
          recipientId: result.userId,
          type: 'SYSTEM',
          title: 'School Link Request Rejected',
          message: `Your school link request was rejected: ${result.reason}`,
        },
      });
    } catch (notificationError) {
      console.warn('Failed to send rejection notification:', notificationError);
    }
    return res.json({ success: true, message: 'Link request rejected.', data: result });
  } catch (error: any) {
    console.error('Reject link error:', error);
    if (error instanceof SchoolLinkError) {
      return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    }
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
    code = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const normalizedEmail = normalizeEmail(email);
    const rawPhone = typeof phone === 'string' ? phone.trim() : '';
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;

    // Validate required fields (relaxed firstName/lastName as we can get them from claim code)
    if (!code || !password || (!normalizedEmail && !rawPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required credentials (code, password, and email or phone)',
      });
    }

    // Validate email format (if email is provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }
    if (rawPhone && !normalizedPhone) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordCheck.errors,
      });
    }

    // Check if email / phone already exists
    if (normalizedEmail) {
      const existingByEmail = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });

      if (existingByEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }
    }
    if (normalizedPhone) {
      const existingByPhone = await prisma.user.findFirst({
        where: { phone: { in: phoneLookupCandidates(rawPhone) } },
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

    const pendingForCode = await prisma.schoolLinkRequest.findFirst({
      where: { claimCodeId: claimCode.id, status: 'PENDING' },
      select: { id: true },
    });
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
    const authorization = publicRegistrationAuthorization();

    // The durable General Account is created first. School-link state is then
    // submitted through the normalized domain service, which owns dual-write,
    // reservation, audit, and concurrency rules.
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const claimUsername = await generateUniqueUsername(tx, firstName, lastName);
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          username: claimUsername,
          password: hashedPassword,
          firstName,
          lastName,
          phone: normalizedPhone,
          accountType: authorization.accountType,
          role: authorization.role,
          socialFeaturesEnabled: true,
          isEmailVerified: false,
          linkingStatus: 'NONE',
          pendingLinkData: null,
        },
      });

      return user;
    });

    // Keep this legacy endpoint compatible while routing its school-link state
    // through the normalized lifecycle and audit trail.
    const linkResult = await submitSchoolLinkRequest(prisma, result.id, code, verificationData, { ipAddress: req.ip });
    authOperationalMetrics.increment('school_link_submitted_total');

    // Generate tokens using the same claim shape as normal login.
    const token = signAccessToken(
      {
        userId: result.id,
        email: result.email,
        role: result.role,
        schoolId: null,
        schoolAccessVersion: result.schoolAccessVersion,
      },
      JWT_SECRET,
      JWT_EXPIRATION,
    );
    const refreshToken = await issueRefreshCredential({
      prisma, userId: result.id, schoolAccessVersion: result.schoolAccessVersion,
      jwtSecret: JWT_SECRET, refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION, req,
    });

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
          linkingStatus: linkResult.linkingStatus,
          pendingLinkData: publicPendingLinkData({
            schoolId: linkResult.school.id,
            schoolName: linkResult.school.name,
            type: claimCode.type,
          }),
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
    });
  }
});

/**
 * POST /auth/login/claim-code
 * First-time login with claim code (for students/teachers who haven't registered yet)
 * Uses claim code as temporary authentication
 */
app.post('/auth/login/claim-code', async (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    code: 'CLAIM_CODE_IS_NOT_AUTHENTICATION',
    error: 'Sign in or create a General Account first, then submit the Claim Code for school approval.',
  });

  /* Legacy implementation retained temporarily for rollback reference; this path is intentionally unreachable.
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
    });
  }
  */
});

// Versioned granular permission management. Legacy administrators retain their
// role defaults until an explicit rbacVersion=1 grant document is assigned.
app.use('/auth/admin', authenticateToken as any, createAdminPermissionRouter(prisma));
app.use('/admin', authenticateToken as any, createAdminPermissionRouter(prisma));

// Start server

export default app;
