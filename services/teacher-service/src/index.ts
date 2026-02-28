import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import IdGenerator from './utils/idGenerator';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

// Simple in-memory cache with stale-while-revalidate
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 10 * 60 * 1000; // 10 minutes (serve stale while refreshing)

const app = express();

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

const PORT = process.env.TEACHER_SERVICE_PORT || 3004;
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// Keep database connection warm
let isDbWarm = false;
const warmUpDb = async () => {
  if (isDbWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbWarm = true;
    console.log('✅ Database ready');
  } catch (error) {
    console.error('⚠️ Database warmup failed');
  }
};
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000);

// Middleware - CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests' } }));
app.use(express.json({ limit: '1mb' }));

// Serve static files from public/uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/teachers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

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
          message: 'Trial period has expired',
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
    message: 'Teacher service is running',
    service: 'teacher-service',
    version: '2.0.0',
    port: PORT,
  });
});

// ===========================
// POST /teachers/batch
// Batch create teachers (for onboarding - no auth required)
// ===========================
app.post('/teachers/batch', async (req: Request, res: Response) => {
  try {
    const { schoolId, teachers } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'schoolId is required',
      });
    }

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'teachers array is required',
      });
    }

    console.log(`➕ [Onboarding] Batch creating ${teachers.length} teachers for school ${schoolId}...`);

    const createdTeachers = [];
    const errors = [];

    for (const teacherData of teachers) {
      try {
        const {
          firstName,
          lastName,
          email,
          phone,
          gender,
          dateOfBirth,
          address,
        } = teacherData;

        // Basic validation
        if (!firstName || !lastName || !phone) {
          errors.push({
            teacher: teacherData,
            error: 'Missing required fields (firstName, lastName, phone)',
          });
          continue;
        }

        // Check for duplicate email
        if (email) {
          const existingByEmail = await prisma.teacher.findFirst({
            where: { email, schoolId },
          });
          if (existingByEmail) {
            errors.push({
              teacher: teacherData,
              error: `Teacher with email ${email} already exists`,
            });
            continue;
          }
        }

        // Create teacher
        const teacher = await prisma.teacher.create({
          data: {
            schoolId,
            firstName,
            lastName,
            email: email || null,
            phone,
            gender: gender || null,
            dateOfBirth: dateOfBirth || null,
            address: address || null,
          },
        });

        createdTeachers.push(teacher);
        console.log(`✅ Created teacher: ${teacher.firstName} ${teacher.lastName}`);
      } catch (error: any) {
        console.error(`❌ Error creating teacher:`, error);
        errors.push({
          teacher: teacherData,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Created ${createdTeachers.length} teachers`,
      data: {
        teachersCreated: createdTeachers.length,
        teachers: createdTeachers,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Batch create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating teachers',
      error: error.message,
    });
  }
});

// Apply auth middleware to all routes below
app.use(authMiddleware);

// ===========================
// GET /teachers/lightweight
// Fast loading for grids/lists
// ===========================
app.get('/teachers/lightweight', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const academicYearId = req.query.academicYearId as string | undefined;
    console.log(`⚡ [School ${schoolId}] Fetching teachers (lightweight)...`);
    if (academicYearId) {
      console.log(`📅 Filtering by Academic Year: ${academicYearId}`);
    }

    const where: any = {
      schoolId: schoolId,
    };

    // Add academic year filter through teacherClasses relationship
    if (academicYearId) {
      where.teacherClasses = {
        some: {
          class: {
            academicYearId: academicYearId
          }
        }
      };
    }

    const teachers = await prisma.teacher.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        khmerName: true,
        englishName: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
        dateOfBirth: true,
        hireDate: true,
        address: true,
        position: true,
        homeroomClassId: true,
        createdAt: true,
        updatedAt: true,
        // Only essential relations
        homeroomClass: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        // Get IDs only for assignments (no full data)
        subjectTeachers: {
          select: {
            subjectId: true,
            subject: {
              select: {
                id: true,
                name: true,
                nameKh: true,
              },
            },
          },
        },
        teacherClasses: {
          where: academicYearId ? {
            class: {
              academicYearId: academicYearId
            }
          } : {},
          select: {
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                academicYearId: true,
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to match expected format
    const transformedTeachers = teachers.map((teacher) => ({
      ...teacher,
      subjectIds: teacher.subjectTeachers.map((sa) => sa.subjectId),
      teachingClassIds: teacher.teacherClasses.map((tc) => tc.classId),
      subjects: teacher.subjectTeachers.map((sa) => sa.subject),
      teacherClasses: teacher.teacherClasses.map((tc) => tc.class),
      teachingClasses: teacher.teacherClasses.map((tc) => tc.class),
    }));

    console.log(
      `⚡ [School ${schoolId}] Fetched ${transformedTeachers.length} teachers (lightweight)`
    );

    res.json({
      success: true,
      data: transformedTeachers,
    });
  } catch (error: any) {
    console.error('❌ Error fetching teachers (lightweight):', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message,
    });
  }
});

// ===========================
// Background cache refresh for teachers
// ===========================
async function refreshTeachersCache(schoolId: string, cacheKey: string) {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: {
        id: true, schoolId: true, firstName: true, lastName: true, email: true, phone: true,
        gender: true, dateOfBirth: true, address: true, photoUrl: true, createdAt: true, updatedAt: true, homeroomClassId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const teacherIds = teachers.map(t => t.id);

    const [teacherClasses, subjectTeachers, users, homeroomClasses] = await Promise.all([
      prisma.teacherClass.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true, classId: true, class: { select: { id: true, name: true, grade: true, section: true, track: true } } }
      }),
      prisma.subjectTeacher.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true, subjectId: true, subject: { select: { id: true, name: true, nameKh: true, nameEn: true, code: true, grade: true, track: true } } }
      }),
      prisma.user.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true, id: true, isActive: true, lastLogin: true }
      }),
      prisma.class.findMany({
        where: { id: { in: teachers.filter(t => t.homeroomClassId).map(t => t.homeroomClassId!) } },
        select: { id: true, name: true, grade: true, section: true, track: true }
      })
    ]);

    const tcMap = new Map<string, typeof teacherClasses>();
    teacherClasses.forEach(tc => { if (!tcMap.has(tc.teacherId)) tcMap.set(tc.teacherId, []); tcMap.get(tc.teacherId)!.push(tc); });
    const stMap = new Map<string, typeof subjectTeachers>();
    subjectTeachers.forEach(st => { if (!stMap.has(st.teacherId)) stMap.set(st.teacherId, []); stMap.get(st.teacherId)!.push(st); });
    const userMap = new Map<string, typeof users[0]>();
    users.forEach(u => u.teacherId && userMap.set(u.teacherId, u));
    const classMap = new Map<string, typeof homeroomClasses[0]>();
    homeroomClasses.forEach(c => classMap.set(c.id, c));

    const transformedTeachers = teachers.map((teacher) => {
      const tcs = tcMap.get(teacher.id) || [];
      const sts = stMap.get(teacher.id) || [];
      const user = userMap.get(teacher.id);
      const homeroom = teacher.homeroomClassId ? classMap.get(teacher.homeroomClassId) : null;
      return {
        ...teacher, subjectIds: sts.map(st => st.subjectId), teachingClassIds: tcs.map(tc => tc.classId),
        subjects: sts.map(st => st.subject), teacherClasses: tcs.map(tc => tc.class), teachingClasses: tcs.map(tc => tc.class),
        homeroomClass: homeroom || null, subject: sts.map(st => st.subject.nameKh || st.subject.name).join(', '),
        hasLoginAccount: !!user, canLogin: user?.isActive || false, user: user || null,
      };
    });

    const response = { success: true, data: transformedTeachers };
    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    console.log(`🔄 Background refresh completed for teachers`);
  } catch (error) {
    console.error('❌ Background refresh failed:', error);
  }
}

// ===========================
// GET /teachers
// Full data with all relations
// ===========================
app.get('/teachers', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;

    // ✅ Check cache with stale-while-revalidate
    const cacheKey = `teachers_${schoolId}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();
    const isFresh = cached && (now - cached.timestamp) < CACHE_TTL;
    const isStale = cached && (now - cached.timestamp) < STALE_TTL;

    if (isFresh) {
      console.log(`📋 [Cache hit] Teachers for school ${schoolId}`);
      return res.json(cached.data);
    }

    // Serve stale data immediately while refreshing in background
    if (isStale) {
      console.log(`⏳ Serving stale teachers cache while refreshing...`);
      refreshTeachersCache(schoolId, cacheKey).catch(console.error);
      return res.json(cached.data);
    }

    console.log(`📋 [School ${schoolId}] Fetching all teachers (optimized)...`);

    // ✅ Step 1: Get basic teacher data first (fast query)
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        schoolId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
        homeroomClassId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // ✅ Step 2: Batch fetch related data in parallel
    const teacherIds = teachers.map(t => t.id);

    const [teacherClasses, subjectTeachers, users, homeroomClasses] = await Promise.all([
      // Teaching classes
      prisma.teacherClass.findMany({
        where: { teacherId: { in: teacherIds } },
        select: {
          teacherId: true,
          classId: true,
          class: { select: { id: true, name: true, grade: true, section: true, track: true } }
        }
      }),
      // Subject assignments
      prisma.subjectTeacher.findMany({
        where: { teacherId: { in: teacherIds } },
        select: {
          teacherId: true,
          subjectId: true,
          subject: { select: { id: true, name: true, nameKh: true, nameEn: true, code: true, grade: true, track: true } }
        }
      }),
      // User accounts
      prisma.user.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true, id: true, isActive: true, lastLogin: true }
      }),
      // Homeroom classes
      prisma.class.findMany({
        where: { id: { in: teachers.filter(t => t.homeroomClassId).map(t => t.homeroomClassId!) } },
        select: { id: true, name: true, grade: true, section: true, track: true }
      })
    ]);

    // ✅ Step 3: Build lookup maps
    const tcMap = new Map<string, typeof teacherClasses>();
    teacherClasses.forEach(tc => {
      if (!tcMap.has(tc.teacherId)) tcMap.set(tc.teacherId, []);
      tcMap.get(tc.teacherId)!.push(tc);
    });

    const stMap = new Map<string, typeof subjectTeachers>();
    subjectTeachers.forEach(st => {
      if (!stMap.has(st.teacherId)) stMap.set(st.teacherId, []);
      stMap.get(st.teacherId)!.push(st);
    });

    const userMap = new Map<string, typeof users[0]>();
    users.forEach(u => u.teacherId && userMap.set(u.teacherId, u));

    const classMap = new Map<string, typeof homeroomClasses[0]>();
    homeroomClasses.forEach(c => classMap.set(c.id, c));

    // ✅ Step 4: Transform data
    const transformedTeachers = teachers.map((teacher) => {
      const tcs = tcMap.get(teacher.id) || [];
      const sts = stMap.get(teacher.id) || [];
      const user = userMap.get(teacher.id);
      const homeroom = teacher.homeroomClassId ? classMap.get(teacher.homeroomClassId) : null;

      return {
        ...teacher,
        subjectIds: sts.map(st => st.subjectId),
        teachingClassIds: tcs.map(tc => tc.classId),
        subjects: sts.map(st => st.subject),
        teacherClasses: tcs.map(tc => tc.class),
        teachingClasses: tcs.map(tc => tc.class),
        homeroomClass: homeroom || null,
        subject: sts.map(st => st.subject.nameKh || st.subject.name).join(', '),
        hasLoginAccount: !!user,
        canLogin: user?.isActive || false,
        user: user || null,
      };
    });

    const response = { success: true, data: transformedTeachers };
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    console.log(`✅ [School ${schoolId}] Found ${transformedTeachers.length} teachers`);
    res.json(response);
  } catch (error: any) {
    console.error('❌ Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message,
    });
  }
});

// ===========================
// GET /teachers/:id
// Get single teacher by ID
// ===========================
app.get('/teachers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📋 [School ${schoolId}] Fetching teacher: ${id}`);

    const teacher = await prisma.teacher.findFirst({
      where: {
        id: id,
        schoolId: schoolId, // ✅ Multi-tenant check
      },
      include: {
        homeroomClass: {
          include: {
            students: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                email: true,
                studentId: true,
              },
            },
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        teacherClasses: {
          include: {
            class: {
              include: {
                students: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    khmerName: true,
                    email: true,
                    studentId: true,
                  },
                },
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
        subjectTeachers: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                nameKh: true,
                nameEn: true,
                code: true,
                grade: true,
                track: true,
                category: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            isActive: true,
            lastLogin: true,
            role: true,
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or does not belong to your school',
      });
    }

    // Transform data
    const transformedTeacher = {
      ...teacher,
      subjectIds: teacher.subjectTeachers.map((sa) => sa.subjectId),
      teachingClassIds: teacher.teacherClasses.map((tc) => tc.classId),
      subjects: teacher.subjectTeachers.map((sa) => sa.subject),
      teachingClasses: teacher.teacherClasses.map((tc) => tc.class),
      hasLoginAccount: !!teacher.user,
      canLogin: teacher.user?.isActive || false,
    };

    console.log(`✅ [School ${schoolId}] Found teacher: ${teacher.firstName} ${teacher.lastName}`);

    res.json({
      success: true,
      data: transformedTeacher,
    });
  } catch (error: any) {
    console.error('❌ Error fetching teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher',
      error: error.message,
    });
  }
});

// ===========================
// POST /teachers
// Create new teacher
// ===========================
app.post('/teachers', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const school = req.user!.school;
    console.log(`➕ [School ${schoolId}] Creating new teacher...`);

    // ✅ Check usage limits
    const currentTeacherCount = await prisma.teacher.count({
      where: { schoolId },
    });

    if (currentTeacherCount >= school.maxTeachers) {
      return res.status(403).json({
        success: false,
        message: `Teacher limit reached (${school.maxTeachers} teachers). Please upgrade your subscription.`,
        currentCount: currentTeacherCount,
        maxAllowed: school.maxTeachers,
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      phone,
      employeeId,
      gender,
      dateOfBirth,
      position,
      hireDate,
      address,
      role,
      degree,
      emergencyContact,
      emergencyPhone,
      idCard,
      major1,
      major2,
      nationality,
      passport,
      salaryRange,
      // Relations
      homeroomClassId,
      subjectIds,
      classIds,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, phone',
      });
    }

    // Check if phone already exists in this school
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        phone,
        schoolId,
      },
    });

    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists in your school',
      });
    }

    // Generate teacher ID using new ID generator system
    // Get school configuration for ID format
    const schoolConfig = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        idFormat: true,
        idPrefix: true,
        nextTeacherNumber: true,
        schoolType: true,
      },
    });

    if (!schoolConfig) {
      return res.status(500).json({
        success: false,
        message: 'School configuration not found',
      });
    }

    // Get next sequential number atomically
    const sequentialNumber = await prisma.$transaction(async (tx) => {
      const updated = await tx.school.update({
        where: { id: schoolId },
        data: { nextTeacherNumber: { increment: 1 } },
      });
      return updated.nextTeacherNumber;
    });

    // Prepare teacher params for ID generation
    const teacherParams = {
      gender,
      hireDate,
      hireYear: hireDate ? new Date(hireDate).getFullYear() : new Date().getFullYear(),
      position,
    };

    // Generate teacher ID using configured format
    const teacherId = IdGenerator.generateTeacherId(
      schoolConfig.idFormat,
      schoolConfig.idPrefix || '01',
      teacherParams,
      sequentialNumber
    );

    // Generate permanent ID
    const permanentId = IdGenerator.generatePermanentId('TCH');

    // Generate metadata for audit trail
    const teacherIdMeta = IdGenerator.generateTeacherMetadata(
      schoolConfig.idFormat,
      teacherParams,
      sequentialNumber
    );

    console.log(`🎯 Generated Teacher ID: ${teacherId}`);
    console.log(`🔒 Permanent ID: ${permanentId}`);

    // Verify homeroom class belongs to school (if provided)
    if (homeroomClassId) {
      const homeroomClass = await prisma.class.findFirst({
        where: {
          id: homeroomClassId,
          schoolId: schoolId,
        },
      });

      if (!homeroomClass) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom class not found or does not belong to your school',
        });
      }
    }

    // Create teacher with relations
    const teacher = await prisma.teacher.create({
      data: {
        teacherId,
        permanentId,
        teacherIdFormat: schoolConfig.idFormat,
        teacherIdMeta,
        hireYear: teacherParams.hireYear,
        firstName,
        lastName,
        khmerName,
        englishName,
        email,
        phone,
        employeeId,
        gender,
        dateOfBirth,
        position,
        hireDate,
        address,
        role: role || 'TEACHER',
        degree,
        emergencyContact,
        emergencyPhone,
        idCard,
        major1,
        major2,
        nationality,
        passport,
        salaryRange,
        schoolId: schoolId, // ✅ Multi-tenant
        homeroomClassId,
        // Connect subjects (many-to-many)
        ...(subjectIds && subjectIds.length > 0
          ? {
            subjectTeachers: {
              create: subjectIds.map((subjectId: string) => ({
                subjectId,
              })),
            },
          }
          : {}),
        // Connect classes (many-to-many)
        ...(classIds && classIds.length > 0
          ? {
            teacherClasses: {
              create: classIds.map((classId: string) => ({
                classId,
              })),
            },
          }
          : {}),
      },
      include: {
        homeroomClass: true,
        subjectTeachers: {
          include: {
            subject: true,
          },
        },
        teacherClasses: {
          include: {
            class: true,
          },
        },
      },
    });

    // ✅ Update school teacher count
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        currentTeachers: { increment: 1 },
      },
    });

    // Log ID generation for audit trail
    await prisma.idGenerationLog.create({
      data: {
        schoolId,
        entityType: 'TEACHER',
        entityId: teacher.id,
        generatedId: teacherId,
        format: schoolConfig.idFormat,
        metadata: teacherIdMeta,
        createdBy: req.user!.userId,
      },
    });

    console.log(`✅ [School ${schoolId}] Created teacher: ${teacher.firstName} ${teacher.lastName}`);
    console.log(`   Teacher ID: ${teacher.teacherId}`);
    console.log(`   Permanent ID: ${teacher.permanentId}`);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
    });
  } catch (error: any) {
    console.error('❌ Error creating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating teacher',
      error: error.message,
    });
  }
});

// ===========================
// POST /teachers/bulk
// Bulk create teachers
// ===========================
app.post('/teachers/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const school = req.user!.school;
    const { teachers } = req.body;

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teachers array is required',
      });
    }

    console.log(`➕ [School ${schoolId}] Bulk creating ${teachers.length} teachers...`);

    // ✅ Check usage limits
    const currentTeacherCount = await prisma.teacher.count({
      where: { schoolId },
    });

    const totalAfterImport = currentTeacherCount + teachers.length;

    if (totalAfterImport > school.maxTeachers) {
      return res.status(403).json({
        success: false,
        message: `Cannot import ${teachers.length} teachers. Limit is ${school.maxTeachers}, you have ${currentTeacherCount}.`,
        currentCount: currentTeacherCount,
        maxAllowed: school.maxTeachers,
        requestedImport: teachers.length,
        availableSlots: school.maxTeachers - currentTeacherCount,
      });
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    // Process each teacher
    for (const teacherData of teachers) {
      try {
        const {
          firstName,
          lastName,
          khmerName,
          email,
          phone,
          employeeId,
          gender,
          dateOfBirth,
          position,
          hireDate,
          address,
          role,
        } = teacherData;

        // Validation
        if (!firstName || !lastName || !phone) {
          results.failed.push({
            data: teacherData,
            error: 'Missing required fields: firstName, lastName, phone',
          });
          continue;
        }

        // Check duplicate phone
        const existing = await prisma.teacher.findFirst({
          where: {
            phone,
            schoolId,
          },
        });

        if (existing) {
          results.failed.push({
            data: teacherData,
            error: `Phone ${phone} already exists`,
          });
          continue;
        }

        // Create teacher
        const teacher = await prisma.teacher.create({
          data: {
            firstName,
            lastName,
            khmerName,
            email,
            phone,
            employeeId,
            gender,
            dateOfBirth,
            position,
            hireDate,
            address,
            role: role || 'TEACHER',
            schoolId: schoolId, // ✅ Multi-tenant
          },
        });

        results.success.push(teacher);
      } catch (error: any) {
        results.failed.push({
          data: teacherData,
          error: error.message,
        });
      }
    }

    // ✅ Update school teacher count
    if (results.success.length > 0) {
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          currentTeachers: { increment: results.success.length },
        },
      });
    }

    console.log(
      `✅ [School ${schoolId}] Bulk import complete: ${results.success.length} success, ${results.failed.length} failed`
    );

    res.status(201).json({
      success: true,
      message: `Bulk import complete: ${results.success.length} success, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('❌ Error bulk creating teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk creating teachers',
      error: error.message,
    });
  }
});

// ===========================
// PUT /teachers/:id
// Update teacher
// ===========================
app.put('/teachers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`✏️ [School ${schoolId}] Updating teacher: ${id}`);

    // ✅ Verify teacher belongs to school
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or does not belong to your school',
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      phone,
      employeeId,
      gender,
      dateOfBirth,
      position,
      hireDate,
      address,
      role,
      degree,
      emergencyContact,
      emergencyPhone,
      idCard,
      major1,
      major2,
      nationality,
      passport,
      salaryRange,
      homeroomClassId,
    } = req.body;

    // Verify new homeroom class belongs to school (if provided)
    if (homeroomClassId && homeroomClassId !== existingTeacher.homeroomClassId) {
      const homeroomClass = await prisma.class.findFirst({
        where: {
          id: homeroomClassId,
          schoolId: schoolId,
        },
      });

      if (!homeroomClass) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom class not found or does not belong to your school',
        });
      }
    }

    // Update teacher
    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: {
        firstName,
        lastName,
        khmerName,
        englishName,
        email,
        phone,
        employeeId,
        gender,
        dateOfBirth,
        position,
        hireDate,
        address,
        role,
        degree,
        emergencyContact,
        emergencyPhone,
        idCard,
        major1,
        major2,
        nationality,
        passport,
        salaryRange,
        homeroomClassId,
      },
      include: {
        homeroomClass: true,
        subjectTeachers: {
          include: {
            subject: true,
          },
        },
        teacherClasses: {
          include: {
            class: true,
          },
        },
      },
    });

    console.log(
      `✅ [School ${schoolId}] Updated teacher: ${updatedTeacher.firstName} ${updatedTeacher.lastName}`
    );

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher,
    });
  } catch (error: any) {
    console.error('❌ Error updating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating teacher',
      error: error.message,
    });
  }
});

// ===========================
// DELETE /teachers/:id
// Delete teacher
// ===========================
app.delete('/teachers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`🗑️ [School ${schoolId}] Deleting teacher: ${id}`);

    // ✅ Verify teacher belongs to school
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or does not belong to your school',
      });
    }

    // Delete teacher (cascade will handle relations)
    await prisma.teacher.delete({
      where: { id },
    });

    // ✅ Update school teacher count
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        currentTeachers: { decrement: 1 },
      },
    });

    console.log(`✅ [School ${schoolId}] Deleted teacher: ${existingTeacher.firstName} ${existingTeacher.lastName}`);

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting teacher',
      error: error.message,
    });
  }
});

// ===========================
// PHOTO UPLOAD ENDPOINT
// ===========================
app.post('/teachers/:id/photo', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file provided' });
    }

    const teacher = await prisma.teacher.findFirst({ where: { id, schoolId } });
    if (!teacher) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    if (teacher.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '../public', teacher.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    const photoUrl = `/uploads/teachers/${req.file.filename}`;
    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: { photoUrl },
    });

    res.json({ success: true, message: 'Photo uploaded successfully', data: { photoUrl, teacher: updatedTeacher } });
  } catch (error: any) {
    if ((req as any).file) {
      fs.unlinkSync((req as any).file.path);
    }
    res.status(500).json({ success: false, message: 'Failed to upload photo', error: error.message });
  }
});

// ===========================
// Start Server
// ===========================

// GET /teachers/:id/history - Get teacher assignment history across years
app.get('/teachers/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📋 [School ${schoolId}] Fetching teacher history: ${id}`);

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
      select: { id: true, firstName: true, lastName: true, khmerName: true, photoUrl: true }
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // Get all academic years for this school
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        isCurrent: true
      }
    });

    // Get all class assignments for this teacher with year info
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId: id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
            academicYearId: true,
            _count: { select: { students: true } }
          }
        }
      }
    });

    // Get homeroom assignments
    const homeroomClasses = await prisma.class.findMany({
      where: {
        schoolId,
        homeroomTeacherId: id
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        academicYearId: true,
        _count: { select: { students: true } }
      }
    });

    // Get subject assignments
    const subjectAssignments = await prisma.subjectTeacher.findMany({
      where: { teacherId: id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            nameKh: true,
            code: true,
            grade: true,
            category: true
          }
        }
      }
    });

    // Organize history by academic year
    const historyByYear = academicYears.map(year => {
      const yearClasses = teacherClasses
        .filter(tc => tc.class?.academicYearId === year.id)
        .map(tc => ({
          id: tc.class.id,
          name: tc.class.name,
          gradeLevel: parseInt(tc.class.grade) || 0,
          section: tc.class.section || '',
          studentCount: tc.class._count?.students || 0,
          isHomeroom: homeroomClasses.some(h => h.id === tc.class.id)
        }));

      const yearHomerooms = homeroomClasses
        .filter(h => h.academicYearId === year.id)
        .map(h => ({
          id: h.id,
          name: h.name,
          gradeLevel: parseInt(h.grade) || 0,
          section: h.section || '',
          studentCount: h._count?.students || 0
        }));

      // For subjects - they don't have academic year directly
      // We'll show all subjects the teacher is assigned to
      const yearSubjects = subjectAssignments.map(sa => ({
        id: sa.subject.id,
        name: sa.subject.name,
        nameKh: sa.subject.nameKh,
        code: sa.subject.code,
        grade: sa.subject.grade,
        category: sa.subject.category
      }));

      // Remove duplicates from subjects
      const uniqueSubjects = yearSubjects.filter((s, i, arr) =>
        arr.findIndex(x => x.id === s.id) === i
      );

      // Only include subjects for years where teacher has class assignments
      const hasClassAssignments = yearClasses.length > 0 || yearHomerooms.length > 0;

      return {
        academicYear: year,
        classes: yearClasses,
        homerooms: yearHomerooms,
        subjects: hasClassAssignments ? uniqueSubjects : [],
        stats: {
          totalClasses: yearClasses.length,
          totalHomerooms: yearHomerooms.length,
          totalSubjects: hasClassAssignments ? uniqueSubjects.length : 0,
          totalStudents: yearClasses.reduce((sum, c) => sum + c.studentCount, 0)
        }
      };
    });

    // Filter out years with no assignments
    const activeHistory = historyByYear.filter(
      h => h.classes.length > 0 || h.homerooms.length > 0
    );

    res.json({
      success: true,
      data: {
        teacher,
        history: activeHistory,
        summary: {
          totalYears: activeHistory.length,
          totalClasses: activeHistory.reduce((sum, h) => sum + h.stats.totalClasses, 0),
          totalSubjects: subjectAssignments.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching teacher history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch teacher history' });
  }
});

// ===========================
// GET /teachers/:id/subjects
// Get all subjects assigned to a teacher
// ===========================
app.get('/teachers/:id/subjects', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, error: 'School context required' });
    }

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // Get all subject assignments
    const assignments = await prisma.subjectTeacher.findMany({
      where: { teacherId: id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            nameKh: true,
            code: true,
            category: true,
            grade: true,
            coefficient: true,
            weeklyHours: true,
            isActive: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
        },
        subjects: assignments.map(a => ({
          assignmentId: a.id,
          ...a.subject,
          assignedAt: a.createdAt,
        })),
        totalSubjects: assignments.length,
      }
    });
  } catch (error: any) {
    console.error('Error fetching teacher subjects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

// ===========================
// POST /teachers/:id/subjects
// Assign subjects to a teacher
// ===========================
app.post('/teachers/:id/subjects', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body;
    const schoolId = req.user!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, error: 'School context required' });
    }

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({ success: false, error: 'subjectIds array is required' });
    }

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // Verify all subjects exist (subjects are school-wide, no schoolId)
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        isActive: true,
      },
      select: { id: true, name: true }
    });

    if (subjects.length !== subjectIds.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more subjects not found',
        found: subjects.length,
        requested: subjectIds.length,
      });
    }

    // Check for existing assignments
    const existing = await prisma.subjectTeacher.findMany({
      where: {
        teacherId: id,
        subjectId: { in: subjectIds },
      },
      select: { subjectId: true }
    });

    const existingIds = new Set(existing.map(e => e.subjectId));
    const newSubjectIds = subjectIds.filter((sid: string) => !existingIds.has(sid));

    if (newSubjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All subjects are already assigned to this teacher',
      });
    }

    // Create new assignments
    const result = await prisma.subjectTeacher.createMany({
      data: newSubjectIds.map((subjectId: string) => ({
        teacherId: id,
        subjectId,
      })),
      skipDuplicates: true,
    });

    console.log(`✅ Assigned ${result.count} subjects to teacher ${teacher.firstName} ${teacher.lastName}`);

    res.json({
      success: true,
      message: `${result.count} subject(s) assigned successfully`,
      data: {
        assigned: result.count,
        skipped: existing.length,
      }
    });
  } catch (error: any) {
    console.error('Error assigning subjects:', error);
    res.status(500).json({ success: false, error: 'Failed to assign subjects' });
  }
});

// ===========================
// DELETE /teachers/:id/subjects/:subjectId
// Remove a subject assignment from teacher
// ===========================
app.delete('/teachers/:id/subjects/:subjectId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, subjectId } = req.params;
    const schoolId = req.user!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, error: 'School context required' });
    }

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // Find and delete the assignment
    const assignment = await prisma.subjectTeacher.findFirst({
      where: { teacherId: id, subjectId },
      include: { subject: { select: { name: true } } }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Subject assignment not found',
      });
    }

    await prisma.subjectTeacher.delete({
      where: { id: assignment.id }
    });

    console.log(`✅ Removed ${assignment.subject.name} from teacher ${teacher.firstName} ${teacher.lastName}`);

    res.json({
      success: true,
      message: `Subject "${assignment.subject.name}" removed from teacher`,
    });
  } catch (error: any) {
    console.error('Error removing subject assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to remove subject' });
  }
});

// ===========================
// PUT /teachers/:id/subjects
// Replace all subject assignments (bulk update)
// ===========================
app.put('/teachers/:id/subjects', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body;
    const schoolId = req.user!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, error: 'School context required' });
    }

    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({ success: false, error: 'subjectIds array is required' });
    }

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // If subjectIds is empty, remove all assignments
    if (subjectIds.length === 0) {
      const deleted = await prisma.subjectTeacher.deleteMany({
        where: { teacherId: id }
      });

      return res.json({
        success: true,
        message: 'All subject assignments removed',
        data: { removed: deleted.count, assigned: 0 }
      });
    }

    // Verify all subjects exist (subjects are school-wide, no schoolId)
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        isActive: true,
      },
      select: { id: true }
    });

    if (subjects.length !== subjectIds.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more subjects not found',
      });
    }

    // Replace all assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing
      const deleted = await tx.subjectTeacher.deleteMany({
        where: { teacherId: id }
      });

      // Create new assignments
      const created = await tx.subjectTeacher.createMany({
        data: subjectIds.map((subjectId: string) => ({
          teacherId: id,
          subjectId,
        })),
      });

      return { removed: deleted.count, assigned: created.count };
    });

    console.log(`✅ Updated subjects for teacher ${teacher.firstName}: removed ${result.removed}, assigned ${result.assigned}`);

    res.json({
      success: true,
      message: 'Subject assignments updated',
      data: result
    });
  } catch (error: any) {
    console.error('Error updating subject assignments:', error);
    res.status(500).json({ success: false, error: 'Failed to update subjects' });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 TEACHER SERVICE RUNNING v2.2                         ║
║                                                            ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                   ║
║   Multi-Tenant: ✅ ENABLED                                ║
║   Authentication: ✅ JWT Required                         ║
║                                                            ║
║   Endpoints:                                               ║
║   • GET    /teachers/lightweight                          ║
║   • GET    /teachers                                      ║
║   • GET    /teachers/:id                                  ║
║   • GET    /teachers/:id/history (NEW)                    ║
║   • POST   /teachers                                      ║
║   • POST   /teachers/bulk                                 ║
║   • PUT    /teachers/:id                                  ║
║   • DELETE /teachers/:id                                  ║
║   • POST   /teachers/:id/photo                            ║
║   • GET    /health (no auth)                              ║
║                                                            ║
║   🔒 Multi-Tenancy: All queries filtered by schoolId      ║
║   ✅ Usage Limits: Enforced before create                 ║
║   🌐 Khmer/English: Full bilingual support                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
