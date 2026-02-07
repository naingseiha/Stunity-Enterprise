import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';
const REFRESH_TOKEN_EXPIRATION = '30d';

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

// Keep database connection warm to avoid Neon cold starts
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
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      console.log('✅ Login successful for:', user.email);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          loginCount: { increment: 1 },
        },
      });

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
      const hashedPassword = await bcrypt.hash(password, 10);

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

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        console.log('❌ Invalid password for parent:', phone);
        return res.status(401).json({
          success: false,
          error: 'Invalid phone number or password',
        });
      }

      console.log('✅ Parent login successful:', phone);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          loginCount: { increment: 1 },
        },
      });

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
        avatar: user.profilePictureUrl,
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
  console.log('║   🔐 Auth Service - Stunity Enterprise v2.2   ║');
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
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
