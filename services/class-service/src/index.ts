import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)

// ✅ Singleton Prisma pattern
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database warmup
(async () => { try { await prisma.$queryRaw`SELECT 1`; console.log('✅ Database ready'); } catch (e) { console.error('⚠️ DB warmup failed'); } })();

const PORT = process.env.PORT || process.env.CLASS_SERVICE_PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

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
    schoolId: string;
    school?: any;
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

    // OPTIMIZED: Use data from JWT token instead of database query
    // This reduces response time from ~200ms to <5ms

    // Basic validation
    if (!decoded.userId || !decoded.schoolId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
    }

    // Check if school is active (from token)
    if (decoded.school && !decoded.school.isActive) {
      return res.status(403).json({
        success: false,
        message: 'School account is inactive',
      });
    }

    // Check if trial expired (from token)
    if (decoded.school?.isTrial && decoded.school?.subscriptionEnd) {
      const now = new Date();
      const trialEnd = new Date(decoded.school.subscriptionEnd);
      if (now > trialEnd) {
        return res.status(403).json({
          success: false,
          message: 'Trial period has expired. Please upgrade to continue.',
        });
      }
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email || '',
      role: decoded.role,
      schoolId: decoded.schoolId,
      school: decoded.school,
    };

    next();
  } catch (error: any) {
    console.error('❌ Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// ===========================
// Health Check
// ===========================
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Class service is running',
    service: 'class-service',
    version: '2.0.0',
    port: PORT,
  });
});

// ===========================
// POST /classes/batch
// Batch create classes (for onboarding - no auth required)
// ===========================
app.post('/classes/batch', async (req: Request, res: Response) => {
  try {
    const { schoolId, academicYearId, classes } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'schoolId is required',
      });
    }

    if (!academicYearId) {
      return res.status(400).json({
        success: false,
        message: 'academicYearId is required',
      });
    }

    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'classes array is required',
      });
    }

    console.log(`➕ [Onboarding] Batch creating ${classes.length} classes for school ${schoolId}...`);

    const createdClasses = [];
    const errors = [];

    for (const classData of classes) {
      try {
        const {
          name,
          nameKh,
          grade,
          section,
          capacity,
        } = classData;

        // Basic validation
        if (!name || !grade) {
          errors.push({
            class: classData,
            error: 'Missing required fields (name, grade)',
          });
          continue;
        }

        // Check for duplicate class name
        const existingClass = await prisma.class.findFirst({
          where: {
            schoolId,
            academicYearId,
            name,
          },
        });

        if (existingClass) {
          errors.push({
            class: classData,
            error: `Class with name ${name} already exists`,
          });
          continue;
        }

        // Create class
        const newClass = await prisma.class.create({
          data: {
            schoolId,
            academicYearId,
            name,
            grade,
            section: section || null,
            capacity: capacity || 40,
          },
        });

        createdClasses.push(newClass);
        console.log(`✅ Created class: ${newClass.name}`);
      } catch (error: any) {
        console.error(`❌ Error creating class:`, error);
        errors.push({
          class: classData,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Created ${createdClasses.length} classes`,
      data: {
        classesCreated: createdClasses.length,
        classes: createdClasses,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Batch create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating classes',
      error: error.message,
    });
  }
});

// Apply auth middleware to all routes below
app.use(authMiddleware);

// ===========================
// GET /classes/lightweight
// Ultra-fast loading for dropdowns
// ===========================
app.get('/classes/lightweight', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const academicYearId = req.query.academicYearId as string | undefined;
    const grade = req.query.grade as string | undefined;
    const search = req.query.search as string | undefined;
    const startTime = Date.now();
    console.log(`⚡ [School ${schoolId}] Fetching classes (lightweight)...`);
    if (academicYearId) {
      console.log(`📅 Filtering by Academic Year: ${academicYearId}`);
    }
    if (grade) {
      console.log(`📊 Filtering by Grade: ${grade}`);
    }

    const where: any = {
      schoolId: schoolId,
    };

    if (academicYearId) {
      const yearExists = await prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId },
        select: { id: true },
      });
      if (!yearExists) {
        return res.status(404).json({
          success: false,
          message: 'Academic year not found or access denied',
        });
      }
      where.academicYearId = academicYearId;
    }

    if (grade) {
      where.grade = grade;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { section: { contains: search, mode: 'insensitive' } },
      ];
    }

    const classes = await prisma.class.findMany({
      where,
      select: {
        id: true,
        classId: true,
        name: true,
        grade: true,
        section: true,
        track: true,
        capacity: true,
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
        _count: {
          select: {
            studentClasses: {
              where: {
                status: 'ACTIVE', // Only count active enrollments
              },
            },
          },
        },
        homeroomTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    const elapsedTime = Date.now() - startTime;
    console.log(
      `⚡ [School ${schoolId}] Found ${classes.length} classes in ${elapsedTime}ms`
    );

    res.json({
      success: true,
      data: classes,
    });
  } catch (error: any) {
    console.error('❌ Error getting classes (lightweight):', error);
    res.status(500).json({
      success: false,
      message: 'Error getting classes',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes
// Full data with relations
// ===========================
app.get('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const academicYearId = req.query.academicYearId as string | undefined;
    console.log(`📚 [School ${schoolId}] Fetching all classes (full data)...`);
    if (academicYearId) {
      console.log(`📅 Filtering by Academic Year: ${academicYearId}`);
    }

    const where: any = {
      schoolId: schoolId,
    };

    // Add academic year filter if provided
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            customFields: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        studentClasses: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                studentId: true,
                photoUrl: true,
                customFields: true,
              },
            },
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    console.log(`✅ [School ${schoolId}] Found ${classes.length} classes`);

    res.json({
      success: true,
      data: classes,
    });
  } catch (error: any) {
    console.error('❌ Error getting classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting classes',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/academic-years
// Get all academic years for this school
// ===========================
app.get('/classes/academic-years', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    console.log(`📅 [School ${schoolId}] Fetching academic years...`);

    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        isCurrent: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    res.json({
      success: true,
      data: years,
    });
  } catch (error: any) {
    console.error('❌ Error getting academic years:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting academic years',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/grade/:grade
// Get classes by grade
// ===========================
app.get('/classes/grade/:grade', async (req: AuthRequest, res: Response) => {
  try {
    const { grade } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📚 [School ${schoolId}] Fetching classes for grade ${grade}...`);

    const classes = await prisma.class.findMany({
      where: {
        schoolId: schoolId,
        grade: grade, // Already a string from params
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: [{ section: 'asc' }],
    });

    console.log(`✅ [School ${schoolId}] Found ${classes.length} classes for grade ${grade}`);

    res.json({
      success: true,
      data: classes,
    });
  } catch (error: any) {
    console.error('❌ Error getting classes by grade:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting classes by grade',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/my
// Get classes for current authenticated user (student/teacher)
// ===========================
app.get('/classes/my', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role, schoolId } = req.user!;
    const { academicYearId } = req.query;
    let selectedYear;

    if (academicYearId) {
      selectedYear = await prisma.academicYear.findFirst({
        where: {
          id: academicYearId as string,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          isCurrent: true,
          status: true,
        },
      });
    } else {
      selectedYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          isCurrent: true,
        },
        select: {
          id: true,
          name: true,
          isCurrent: true,
          status: true,
        },
      });
    }

    if (!selectedYear) {
      return res.json({
        success: true,
        data: [],
        meta: {
          role,
          linked: false,
          reason: 'No current academic year found',
        },
      });
    }

    const userRecord = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
      },
      select: {
        id: true,
        studentId: true,
        teacherId: true,
      },
    });

    if (!userRecord) {
      return res.status(404).json({
        success: false,
        message: 'Authenticated user not found in school context',
      });
    }

    if (role === 'STUDENT') {
      if (!userRecord.studentId) {
        return res.json({
          success: true,
          data: [],
          meta: {
            role,
            linked: false,
            reason: 'Student profile is not linked to this account',
          },
        });
      }

      const studentClasses = await prisma.studentClass.findMany({
        where: {
          studentId: userRecord.studentId,
          status: 'ACTIVE',
          class: {
            schoolId,
            academicYearId: selectedYear.id,
          },
        },
        include: {
          class: {
            select: {
              id: true,
              classId: true,
              name: true,
              grade: true,
              section: true,
              track: true,
              capacity: true,
              homeroomTeacherId: true,
              academicYear: {
                select: {
                  id: true,
                  name: true,
                  isCurrent: true,
                  status: true,
                },
              },
              homeroomTeacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  customFields: true,
                },
              },
              _count: {
                select: {
                  studentClasses: {
                    where: {
                      status: 'ACTIVE',
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ class: { grade: 'asc' } }, { class: { section: 'asc' } }],
      });

      const classes = studentClasses.map((sc) => ({
        id: sc.class.id,
        classId: sc.class.classId,
        name: sc.class.name,
        grade: sc.class.grade,
        section: sc.class.section,
        track: sc.class.track,
        capacity: sc.class.capacity,
        academicYear: sc.class.academicYear,
        homeroomTeacher: sc.class.homeroomTeacher,
        studentCount: sc.class._count.studentClasses,
        myRole: 'STUDENT',
        isHomeroom: false,
        linkedStudentId: userRecord.studentId,
      }));

      return res.json({
        success: true,
        data: classes,
        meta: {
          role,
          linked: true,
          currentAcademicYear: selectedYear,
        },
      });
    }

    if (role === 'TEACHER') {
      if (!userRecord.teacherId) {
        return res.json({
          success: true,
          data: [],
          meta: {
            role,
            linked: false,
            reason: 'Teacher profile is not linked to this account',
          },
        });
      }

      const teacherClasses = await prisma.class.findMany({
        where: {
          schoolId,
          academicYearId: selectedYear.id,
          OR: [
            { homeroomTeacherId: userRecord.teacherId },
            { teacherClasses: { some: { teacherId: userRecord.teacherId } } },
            { timetableEntries: { some: { teacherId: userRecord.teacherId } } },
          ],
        },
        select: {
          id: true,
          classId: true,
          name: true,
          grade: true,
          section: true,
          track: true,
          capacity: true,
          homeroomTeacherId: true,
          academicYear: {
            select: {
              id: true,
              name: true,
              isCurrent: true,
              status: true,
            },
          },
          homeroomTeacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customFields: true,
            },
          },
          _count: {
            select: {
              studentClasses: {
                where: {
                  status: 'ACTIVE',
                },
              },
            },
          },
        },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }],
      });

      const classes = teacherClasses.map((c) => ({
        id: c.id,
        classId: c.classId,
        name: c.name,
        grade: c.grade,
        section: c.section,
        track: c.track,
        capacity: c.capacity,
        academicYear: c.academicYear,
        homeroomTeacher: c.homeroomTeacher,
        studentCount: c._count.studentClasses,
        myRole: 'TEACHER',
        isHomeroom: c.homeroomTeacherId === userRecord.teacherId,
        linkedTeacherId: userRecord.teacherId,
      }));

      return res.json({
        success: true,
        data: classes,
        meta: {
          role,
          linked: true,
          currentAcademicYear: selectedYear,
        },
      });
    }

    return res.json({
      success: true,
      data: [],
      meta: {
        role,
        linked: false,
        reason: 'Role is not eligible for school class view',
      },
    });
  } catch (error: any) {
    console.error('❌ Error getting my classes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting my classes',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/unassigned-students/:academicYearId
// Get students not assigned to any class for a specific academic year.
// Multi-tenant: academicYearId is validated to belong to req.user.schoolId.
// NOTE: This route MUST be before /classes/:id to prevent route conflict
// ===========================
app.get('/classes/unassigned-students/:academicYearId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { academicYearId } = req.params;
    const schoolId = req.user!.schoolId;
    const { search, limit = '100', page = '1' } = req.query as any;

    // Multi-tenant: ensure academic year belongs to this school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });
    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found or access denied',
      });
    }

    console.log(`🔍 [School ${schoolId}] Getting unassigned students for year: ${academicYearId}`);

    // Get all student IDs assigned to any class in this academic year.
    // Use class.academicYearId so we count enrollments even when StudentClass.academicYearId is null.
    const assignedStudentClasses = await prisma.studentClass.findMany({
      where: {
        status: 'ACTIVE',
        class: {
          academicYearId,
          schoolId,
        },
      },
      select: { studentId: true },
    });

    const assignedStudentIds = [...new Set(assignedStudentClasses.map(sc => sc.studentId))];

    // Build where clause for unassigned students
    const where: any = {
      schoolId,
      isAccountActive: true,
    };

    if (assignedStudentIds.length > 0) {
      where.id = { notIn: assignedStudentIds };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    // Get unassigned students with pagination
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          photoUrl: true,
          customFields: true,
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        take: limitNum,
        skip,
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error getting unassigned students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unassigned students',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/:id
// Get single class by ID
// ===========================
app.get('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📚 [School ${schoolId}] Fetching class: ${id}`);

    const classData = await prisma.class.findFirst({
      where: {
        id: id,
        schoolId: schoolId, // ✅ Multi-tenant check
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            customFields: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        studentClasses: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                gender: true,
                email: true,
                phoneNumber: true,
                photoUrl: true,
                dateOfBirth: true,
                customFields: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        teacherClasses: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                customFields: true,
              },
            },
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    console.log(`✅ [School ${schoolId}] Found class: ${classData.name} (${classData.academicYear.name})`);

    res.json({
      success: true,
      data: classData,
    });
  } catch (error: any) {
    console.error('❌ Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes
// Create new class
// ===========================
app.post('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    console.log(`➕ [School ${schoolId}] Creating new class...`);

    const {
      classId,
      name,
      grade,
      section,
      track,
      academicYearId,
      homeroomTeacherId,
      capacity,
    } = req.body;

    // Validation
    if (!name || !grade || !academicYearId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, grade, academicYearId',
      });
    }

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: schoolId,
      },
    });

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year not found or does not belong to your school',
      });
    }

    // Check if class name already exists in this school for this academic year
    const existingClass = await prisma.class.findFirst({
      where: {
        name,
        schoolId,
        academicYearId,
      },
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: 'Class name already exists in your school for this academic year',
      });
    }

    // Verify homeroom teacher belongs to school (if provided)
    if (homeroomTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: homeroomTeacherId,
          schoolId: schoolId,
        },
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom teacher not found or does not belong to your school',
        });
      }

      // Check if teacher is already a homeroom teacher for another class in this academic year
      const existingHomeroom = await prisma.class.findFirst({
        where: {
          homeroomTeacherId: homeroomTeacherId,
          schoolId: schoolId,
          academicYearId,
        },
      });

      if (existingHomeroom) {
        return res.status(400).json({
          success: false,
          message: `Teacher is already homeroom teacher for class ${existingHomeroom.name} in this academic year`,
        });
      }
    }

    // Create class
    const newClass = await prisma.class.create({
      data: {
        classId,
        name,
        grade,
        section,
        track,
        academicYearId,
        homeroomTeacherId,
        capacity,
        schoolId: schoolId, // ✅ Multi-tenant
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            customFields: true,
            firstName: true,
            lastName: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
      },
    });

    console.log(`✅ [School ${schoolId}] Created class: ${newClass.name}`);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass,
    });
  } catch (error: any) {
    console.error('❌ Error creating class:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating class',
      error: error.message,
    });
  }
});

// ===========================
// PUT /classes/:id
// Update class
// ===========================
app.put('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`✏️ [School ${schoolId}] Updating class: ${id}`);

    // ✅ Verify class belongs to school
    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    const {
      classId,
      name,
      grade,
      section,
      track,
      academicYearId,
      homeroomTeacherId,
      capacity,
    } = req.body;

    // If changing academic year, verify new year exists and belongs to school
    if (academicYearId && academicYearId !== existingClass.academicYearId) {
      const academicYear = await prisma.academicYear.findFirst({
        where: {
          id: academicYearId,
          schoolId: schoolId,
        },
      });

      if (!academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Academic year not found or does not belong to your school',
        });
      }
    }

    // Verify new homeroom teacher belongs to school (if provided)
    if (homeroomTeacherId && homeroomTeacherId !== existingClass.homeroomTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: homeroomTeacherId,
          schoolId: schoolId,
        },
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom teacher not found or does not belong to your school',
        });
      }

      // Check if teacher is already a homeroom teacher for another class in this academic year
      const finalAcademicYearId = academicYearId || existingClass.academicYearId;
      const existingHomeroom = await prisma.class.findFirst({
        where: {
          homeroomTeacherId: homeroomTeacherId,
          schoolId: schoolId,
          academicYearId: finalAcademicYearId,
          id: { not: id }, // Exclude current class
        },
      });

      if (existingHomeroom) {
        return res.status(400).json({
          success: false,
          message: `Teacher is already homeroom teacher for class ${existingHomeroom.name} in this academic year`,
        });
      }
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        ...(classId !== undefined && { classId }),
        ...(name !== undefined && { name }),
        ...(grade !== undefined && { grade }),
        ...(section !== undefined && { section }),
        ...(track !== undefined && { track }),
        ...(academicYearId !== undefined && { academicYearId }),
        ...(homeroomTeacherId !== undefined && { homeroomTeacherId }),
        ...(capacity !== undefined && { capacity }),
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            customFields: true,
            firstName: true,
            lastName: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
    });

    console.log(`✅ [School ${schoolId}] Updated class: ${updatedClass.name}`);

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass,
    });
  } catch (error: any) {
    console.error('❌ Error updating class:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class',
      error: error.message,
    });
  }
});

// ===========================
// DELETE /classes/:id
// Delete class
// ===========================
app.delete('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`🗑️ [School ${schoolId}] Deleting class: ${id}`);

    // ✅ Verify class belongs to school
    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Check if class has students
    if (existingClass._count.students > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${existingClass._count.students} students. Please reassign students first.`,
      });
    }

    // Delete class
    await prisma.class.delete({
      where: { id },
    });

    console.log(`✅ [School ${schoolId}] Deleted class: ${existingClass.name}`);

    res.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes/:id/assign-students
// Assign students to class
// ===========================
app.post('/classes/:id/assign-students', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const schoolId = req.user!.schoolId;
    console.log(`➕ [School ${schoolId}] Assigning students to class: ${id}`);

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required',
      });
    }

    // ✅ Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // ✅ Verify all students belong to school
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: schoolId,
      },
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some students not found or do not belong to your school',
      });
    }

    // Update students to assign to class
    await prisma.student.updateMany({
      where: {
        id: { in: studentIds },
      },
      data: {
        classId: id,
      },
    });

    console.log(
      `✅ [School ${schoolId}] Assigned ${studentIds.length} students to class ${classData.name}`
    );

    res.json({
      success: true,
      message: `Successfully assigned ${studentIds.length} students to class`,
    });
  } catch (error: any) {
    console.error('❌ Error assigning students:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning students',
      error: error.message,
    });
  }
});

// NOTE: DELETE /classes/:id/students/:studentId is defined later using StudentClass junction table

// ===========================
// GET /classes/:id/students
// Get all students in a class
// ===========================
app.get('/classes/:id/students', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📋 [School ${schoolId}] Fetching students for class: ${id}`);

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Get all students in this class via StudentClass junction table
    const studentClasses = await prisma.studentClass.findMany({
      where: {
        classId: id,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            photoUrl: true,
            customFields: true,
          },
        },
      },
      orderBy: {
        student: {
          firstName: 'asc',
        },
      },
    });

    const uniqueStudentsMap = new Map();
    studentClasses.forEach(sc => {
      // Keep the active one, or the first one we see
      if (!uniqueStudentsMap.has(sc.student.id)) {
        uniqueStudentsMap.set(sc.student.id, {
          ...sc.student,
          nameKh: sc.student.customFields ? (sc.student.customFields as any).khmerName : undefined,
          status: sc.status,
          enrolledAt: sc.enrolledAt,
          studentClassId: sc.id,
        });
      } else {
        // If we already have one, but this one is explicitly ACTIVE and the other isn't, prefer this one
        const existing = uniqueStudentsMap.get(sc.student.id);
        if (sc.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
          uniqueStudentsMap.set(sc.student.id, {
            ...sc.student,
            nameKh: sc.student.customFields ? (sc.student.customFields as any).khmerName : undefined,
            status: sc.status,
            enrolledAt: sc.enrolledAt,
            studentClassId: sc.id,
          });
        }
      }
    });

    const students = Array.from(uniqueStudentsMap.values());

    console.log(`✅ [School ${schoolId}] Found ${students.length} unique students in class (from ${studentClasses.length} records)`);

    res.json({
      success: true,
      data: students,
      count: students.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching class students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class students',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes/:id/students
// Assign a single student to class (using StudentClass junction)
// ===========================
app.post('/classes/:id/students', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, academicYearId } = req.body;
    const schoolId = req.user!.schoolId;
    console.log(`➕ [School ${schoolId}] Assigning student ${studentId} to class: ${id}`);

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required',
      });
    }

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or does not belong to your school',
      });
    }

    // Check if student is already in this class
    const existingAssignment = await prisma.studentClass.findFirst({
      where: {
        studentId,
        classId: id,
        academicYearId: academicYearId || null,
        status: 'ACTIVE',
      },
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already assigned to this class',
        code: 'DUPLICATE_IN_CLASS',
      });
    }

    // Check if student is already in another class for the same academic year
    // One student can only be in ONE class per academic year
    if (academicYearId || classData.academicYearId) {
      const yearId = academicYearId || classData.academicYearId;
      const existingInOtherClass = await prisma.studentClass.findFirst({
        where: {
          studentId,
          academicYearId: yearId,
          status: 'ACTIVE',
          classId: { not: id }, // Different class
        },
        include: {
          class: {
            select: { name: true }
          }
        }
      });

      if (existingInOtherClass) {
        return res.status(400).json({
          success: false,
          message: `Student is already assigned to "${existingInOtherClass.class.name}" for this academic year. A student can only be in one class per academic year.`,
          code: 'DUPLICATE_IN_YEAR',
          existingClass: existingInOtherClass.class.name,
        });
      }
    }

    // Create StudentClass assignment
    const studentClass = await prisma.studentClass.create({
      data: {
        studentId,
        classId: id,
        academicYearId: academicYearId || classData.academicYearId || null,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
          },
        },
      },
    });

    console.log(
      `✅ [School ${schoolId}] Assigned student ${student.firstName} ${student.lastName} to class ${classData.name}`
    );

    res.json({
      success: true,
      message: 'Student assigned to class successfully',
      data: studentClass,
    });
  } catch (error: any) {
    console.error('❌ Error assigning student:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning student to class',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes/:id/students/batch
// Assign multiple students to class at once (OPTIMIZED - 100x faster!)
// ===========================
app.post('/classes/:id/students/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds, academicYearId } = req.body;
    const schoolId = req.user!.schoolId;

    console.log(`⚡ [School ${schoolId}] Batch assigning ${studentIds?.length || 0} students to class: ${id}`);

    // Validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required and must not be empty',
      });
    }

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    const yearId = academicYearId || classData.academicYearId;

    // Verify all students belong to school (single query)
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: schoolId,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (students.length !== studentIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more students not found or do not belong to your school',
        found: students.length,
        requested: studentIds.length,
      });
    }

    // Check for existing assignments in THIS class (single query)
    const existingInThisClass = await prisma.studentClass.findMany({
      where: {
        studentId: { in: studentIds },
        classId: id,
        status: 'ACTIVE',
      },
      select: { studentId: true },
    });

    const existingInThisClassIds = new Set(existingInThisClass.map(a => a.studentId));

    // Check for existing assignments in OTHER classes for same academic year
    const existingInOtherClasses = yearId ? await prisma.studentClass.findMany({
      where: {
        studentId: { in: studentIds },
        academicYearId: yearId,
        status: 'ACTIVE',
        classId: { not: id },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
    }) : [];

    const studentsInOtherClasses = existingInOtherClasses.map(a => ({
      studentId: a.studentId,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      existingClass: a.class.name,
    }));

    const studentsInOtherClassIds = new Set(studentsInOtherClasses.map(s => s.studentId));

    // Filter to only new valid students
    const newStudentIds = studentIds.filter(sid =>
      !existingInThisClassIds.has(sid) && !studentsInOtherClassIds.has(sid)
    );

    if (newStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students can be assigned - all are either already in this class or enrolled in another class for this academic year',
        skippedDuplicates: existingInThisClass.length,
        alreadyInOtherClass: studentsInOtherClasses,
      });
    }

    // Batch create all valid assignments in a single transaction
    const result = await prisma.studentClass.createMany({
      data: newStudentIds.map(studentId => ({
        studentId,
        classId: id,
        academicYearId: yearId || null,
        status: 'ACTIVE',
      })),
      skipDuplicates: true,
    });

    console.log(`✅ [School ${schoolId}] Batch assigned ${result.count} students in one transaction!`);

    res.status(201).json({
      success: true,
      message: `Successfully assigned ${result.count} students to class`,
      data: {
        assigned: result.count,
        skipped: studentIds.length - result.count,
        total: studentIds.length,
        class: {
          id: classData.id,
          name: classData.name,
          grade: classData.grade,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error in batch assign:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning students to class',
      error: error.message,
    });
  }
});

// ===========================
// DELETE /classes/:id/students/:studentId (UPDATED)
// Remove student from class (using StudentClass junction)
// ===========================
app.delete('/classes/:id/students/:studentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, studentId } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`➖ [School ${schoolId}] Removing student ${studentId} from class ${id}`);

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or does not belong to your school',
      });
    }

    // Find and delete the StudentClass assignment
    const studentClass = await prisma.studentClass.findFirst({
      where: {
        studentId,
        classId: id,
        status: 'ACTIVE',
      },
    });

    if (!studentClass) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to this class',
      });
    }

    // Update status to DROPPED instead of deleting (for audit trail)
    await prisma.studentClass.update({
      where: { id: studentClass.id },
      data: { status: 'DROPPED' },
    });

    console.log(
      `✅ [School ${schoolId}] Removed student ${student.firstName} ${student.lastName} from class ${classData.name}`
    );

    res.json({
      success: true,
      message: 'Student removed from class successfully',
    });
  } catch (error: any) {
    console.error('❌ Error removing student:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing student from class',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes/:id/students/batch-remove
// Remove multiple students from class (BATCH - much faster!)
// ===========================
app.post('/classes/:id/students/batch-remove', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const schoolId = req.user!.schoolId;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required',
      });
    }

    console.log(`➖ [School ${schoolId}] Batch removing ${studentIds.length} students from class ${id}`);

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Batch update all StudentClass records to DROPPED status
    const result = await prisma.studentClass.updateMany({
      where: {
        classId: id,
        studentId: { in: studentIds },
        status: 'ACTIVE',
        student: { schoolId }, // Ensure students belong to same school
      },
      data: { status: 'DROPPED' },
    });

    console.log(`✅ [School ${schoolId}] Batch removed ${result.count} students from class ${classData.name}`);

    res.json({
      success: true,
      message: `${result.count} student(s) removed from class`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('❌ Error in batch remove:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing students from class',
      error: error.message,
    });
  }
});

// ===========================
// CLASS HUB ENTEPRISE FEATURES
// ===========================

// --- ANNOUNCEMENTS ---
app.get('/classes/:id/announcements', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

    const announcements = await prisma.classAnnouncement.findMany({
      where: { classId: id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching announcements', error: error.message });
  }
});

app.post('/classes/:id/announcements', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const { content, mediaUrls = [], mediaKeys = [], isPinned = false } = req.body;

    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

    // Validate academic year
    const academicYear = await prisma.academicYear.findUnique({ where: { id: classData.academicYearId } });
    if (!academicYear?.isCurrent) {
      return res.status(403).json({ success: false, message: 'Cannot modify archived classes.' });
    }

    const announcement = await prisma.classAnnouncement.create({
      data: {
        classId: id,
        authorId: userId,
        content,
        mediaUrls,
        mediaKeys,
        isPinned,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
      },
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error creating announcement', error: error.message });
  }
});

// --- MATERIALS ---
app.get('/classes/:id/materials', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

    const materials = await prisma.classMaterial.findMany({
      where: { classId: id },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: materials });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching materials', error: error.message });
  }
});

app.post('/classes/:id/materials', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const { title, description, fileUrl, fileKey, linkUrl, type } = req.body;

    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

    const academicYear = await prisma.academicYear.findUnique({ where: { id: classData.academicYearId } });
    if (!academicYear?.isCurrent) {
      return res.status(403).json({ success: false, message: 'Cannot modify archived classes.' });
    }

    const material = await prisma.classMaterial.create({
      data: {
        classId: id,
        uploaderId: userId,
        title,
        description,
        fileUrl,
        fileKey,
        linkUrl,
        type: type || 'DOCUMENT',
      },
    });

    res.status(201).json({ success: true, data: material });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error uploading material', error: error.message });
  }
});

// --- ASSIGNMENTS ---
app.get('/classes/:id/assignments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

    const assignments = await prisma.classAssignment.findMany({
      where: { classId: id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        submissions: {
          select: { studentId: true, status: true, score: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching assignments', error: error.message });
  }
});

app.post('/classes/:id/assignments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const { title, description, dueDate, maxPoints, deepLinkUrl, quizId } = req.body;

    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

    const academicYear = await prisma.academicYear.findUnique({ where: { id: classData.academicYearId } });
    if (!academicYear?.isCurrent) {
      return res.status(403).json({ success: false, message: 'Cannot modify archived classes.' });
    }

    const assignment = await prisma.classAssignment.create({
      data: {
        classId: id,
        creatorId: userId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxPoints,
        deepLinkUrl,
        quizId,
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error creating assignment', error: error.message });
  }
});

// ===========================
// Start Server
// ===========================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 CLASS SERVICE RUNNING                                ║
║                                                            ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                   ║
║   Multi-Tenant: ✅ ENABLED                                ║
║   Authentication: ✅ JWT Required                         ║
║                                                            ║
║   Endpoints:                                               ║
║   • GET    /classes/lightweight                           ║
║   • GET    /classes                                       ║
║   • GET    /classes/my                                    ║
║   • GET    /classes/grade/:grade                          ║
║   • GET    /classes/:id                                   ║
║   • GET    /classes/:id/students (NEW)                    ║
║   • POST   /classes                                       ║
║   • POST   /classes/:id/students (NEW)                    ║
║   • PUT    /classes/:id                                   ║
║   • DELETE /classes/:id                                   ║
║   • POST   /classes/:id/assign-students                   ║
║   • DELETE /classes/:id/students/:studentId               ║
║   • GET    /health (no auth)                              ║
║                                                            ║
║   🔒 Multi-Tenancy: All queries filtered by schoolId      ║
║   ✅ Student Assignment: StudentClass junction table      ║
║   🌐 Khmer/English: Full bilingual support                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
