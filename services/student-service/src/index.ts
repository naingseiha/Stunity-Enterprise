import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, Gender } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateStudentId } from './utils/studentIdGenerator';
import { parseDate } from './utils/dateParser';
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
app.use(express.json());

// Serve static files from public/uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/students');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: student-{timestamp}-{random}.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// JWT Authentication Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId: string;
  };
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'stunity-enterprise-secret-2026') as any;

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
      id: decoded.userId,
      email: decoded.email || '',
      role: decoded.role,
      schoolId: decoded.schoolId,
    };

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// ===========================
// POST /students/batch
// Batch create students (for onboarding - no auth required)
// ===========================
app.post('/students/batch', async (req: Request, res: Response) => {
  try {
    const { schoolId, students } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'schoolId is required',
      });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'students array is required',
      });
    }

    console.log(`➕ [Onboarding] Batch creating ${students.length} students for school ${schoolId}...`);

    const createdStudents = [];
    const errors = [];

    for (const studentData of students) {
      try {
        const {
          firstName,
          lastName,
          gender,
          dateOfBirth,
          grade,
          classId,
          parentPhone,
        } = studentData;

        // Basic validation
        if (!firstName || !lastName) {
          errors.push({
            student: studentData,
            error: 'Missing required fields (firstName, lastName)',
          });
          continue;
        }

        // Create student
        const student = await prisma.student.create({
          data: {
            schoolId,
            firstName,
            lastName,
            khmerName: `${firstName} ${lastName}`, // Default Khmer name
            gender: gender || 'M',
            dateOfBirth: dateOfBirth || '2008-01-01',
            classId: classId || null,
            phoneNumber: parentPhone || null,
          },
        });

        createdStudents.push(student);
        console.log(`✅ Created student: ${student.firstName} ${student.lastName}`);
      } catch (error: any) {
        console.error(`❌ Error creating student:`, error);
        errors.push({
          student: studentData,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Created ${createdStudents.length} students`,
      data: {
        studentsCreated: createdStudents.length,
        students: createdStudents,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Batch create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating students',
      error: error.message,
    });
  }
});

// Health check endpoint (no auth required) - must be before auth middleware
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'student-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Apply auth middleware to all routes
app.use(authenticateToken);

// ==========================================
// Background cache refresh helper
// ==========================================
async function refreshCache(
  cacheKey: string,
  schoolId: string,
  page: number,
  limit: number,
  skip: number,
  classId?: string,
  gender?: string,
  academicYearId?: string
) {
  try {
    const where: any = { schoolId };
    if (classId && classId !== "all") where.classId = classId;
    if (gender && gender !== "all") where.gender = gender === "male" ? "MALE" : "FEMALE";

    let students: any[];
    let totalCount: number;

    if (!academicYearId) {
      [totalCount, students] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
          where,
          select: {
            id: true, studentId: true, firstName: true, lastName: true, khmerName: true, englishName: true,
            email: true, dateOfBirth: true, gender: true, phoneNumber: true, classId: true, isAccountActive: true,
            class: { select: { id: true, name: true, grade: true } },
            fatherName: true, motherName: true, parentPhone: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
    } else {
      const enrollments = await prisma.studentClass.findMany({
        where: {
          academicYearId,
          status: { in: ['ACTIVE', 'INACTIVE'] },
          class: { schoolId },
          ...(classId && classId !== 'all' ? { classId } : {}),
        },
        select: { studentId: true, classId: true, status: true, class: { select: { id: true, name: true, grade: true } } },
        distinct: ['studentId'],
      });

      const studentIds = enrollments.map(e => e.studentId);
      const enrollmentMap = new Map(enrollments.map(e => [e.studentId, e]));
      const studentWhere: any = {
        id: { in: studentIds },
        ...(gender && gender !== 'all' ? { gender: gender === 'male' ? 'MALE' : 'FEMALE' } : {}),
      };

      [totalCount, students] = await Promise.all([
        prisma.student.count({ where: studentWhere }),
        prisma.student.findMany({
          where: studentWhere,
          select: {
            id: true, studentId: true, firstName: true, lastName: true, khmerName: true, englishName: true,
            email: true, dateOfBirth: true, gender: true, phoneNumber: true, classId: true, isAccountActive: true,
            fatherName: true, motherName: true, parentPhone: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      students = students.map(s => ({
        ...s,
        class: enrollmentMap.get(s.id)?.class || null,
        enrollmentStatus: enrollmentMap.get(s.id)?.status || null,
      }));
    }

    const totalPages = Math.ceil(totalCount / limit);
    const response = {
      success: true,
      data: students,
      pagination: { page, limit, total: totalCount, totalPages, hasMore: page < totalPages },
    };

    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    console.log(`🔄 Background cache refreshed for ${cacheKey}`);
  } catch (error) {
    console.error('❌ Background refresh failed:', error);
  }
}

// ==========================================
// STUDENT ENDPOINTS (Multi-Tenant)
// ==========================================

/**
 * GET /students/lightweight
 * ⚡ OPTIMIZED - Fast loading for grid/list views
 */
app.get('/students/lightweight', async (req: AuthRequest, res: Response) => {
  try {
    const startTime = Date.now();
    const schoolId = req.user!.schoolId;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Filters
    const classId = req.query.classId as string | undefined;
    const gender = req.query.gender as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;

    // Create cache key
    const cacheKey = `students:${schoolId}:${page}:${limit}:${classId || 'all'}:${gender || 'all'}:${academicYearId || 'all'}`;

    // Check cache with stale-while-revalidate pattern
    const cached = cache.get(cacheKey);
    const now = Date.now();
    const isFresh = cached && (now - cached.timestamp) < CACHE_TTL;
    const isStale = cached && (now - cached.timestamp) < STALE_TTL;

    if (isFresh) {
      console.log(`✅ Cache hit (${now - startTime}ms)`);
      return res.json(cached.data);
    }

    // Serve stale data immediately while refreshing in background
    if (isStale) {
      console.log(`⏳ Serving stale cache while refreshing...`);
      // Trigger background refresh (non-blocking)
      refreshCache(cacheKey, schoolId, page, limit, skip, classId, gender, academicYearId).catch(console.error);
      return res.json(cached.data);
    }

    // Build simple where clause
    const where: any = { schoolId };

    if (classId && classId !== "all") {
      where.classId = classId;
    }
    if (gender && gender !== "all") {
      where.gender = gender === "male" ? "MALE" : "FEMALE";
    }

    let students: any[];
    let totalCount: number;

    // OPTIMIZATION: Use simpler query when no year filter
    if (!academicYearId) {
      // Fast path: simple query
      [totalCount, students] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
          where,
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            englishName: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            phoneNumber: true,
            classId: true,
            isAccountActive: true,
            class: {
              select: { id: true, name: true, grade: true },
            },
            fatherName: true,
            motherName: true,
            parentPhone: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
    } else {
      // Year filter: First get enrollments, then fetch students
      const enrollments = await prisma.studentClass.findMany({
        where: {
          academicYearId,
          status: { in: ['ACTIVE', 'INACTIVE'] },
          class: { schoolId },
          ...(classId && classId !== 'all' ? { classId } : {}),
        },
        select: {
          studentId: true,
          classId: true,
          status: true,
          class: { select: { id: true, name: true, grade: true } },
        },
        distinct: ['studentId'],
      });

      const studentIds = enrollments.map(e => e.studentId);
      const enrollmentMap = new Map(enrollments.map(e => [e.studentId, e]));

      // Apply additional filters
      const studentWhere: any = {
        id: { in: studentIds },
        ...(gender && gender !== 'all' ? { gender: gender === 'male' ? 'MALE' : 'FEMALE' } : {}),
      };

      [totalCount, students] = await Promise.all([
        prisma.student.count({ where: studentWhere }),
        prisma.student.findMany({
          where: studentWhere,
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            englishName: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            phoneNumber: true,
            classId: true,
            isAccountActive: true,
            fatherName: true,
            motherName: true,
            parentPhone: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      // Add year-specific class info
      students = students.map((s: any) => {
        const enrollment = enrollmentMap.get(s.id);
        return {
          ...s,
          class: enrollment?.class || null,
          enrollmentStatus: enrollment?.status,
        };
      });
    }

    const totalPages = Math.ceil(totalCount / limit);
    const queryTime = Date.now() - startTime;
    console.log(`⚡ Fetched ${students.length} students in ${queryTime}ms`);

    const response = {
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    res.json(response);
  } catch (error: any) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
});

/**
 * GET /students
 * Get all students (full data)
 */
app.get('/students', async (req: AuthRequest, res: Response) => {
  try {
    console.log("📋 Fetching all students (full data)...");
    const schoolId = req.user!.schoolId; // Multi-tenant filter

    const students = await prisma.student.findMany({
      where: { schoolId }, // Multi-tenant filter
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Fetched ${students.length} students for school ${schoolId}`);

    res.json({
      success: true,
      data: students,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
});

/**
 * GET /students/promote/eligible/:yearId
 * Must be registered BEFORE /students/:id to avoid route conflict
 */
app.get('/students/promote/eligible/:yearId', async (req: AuthRequest, res: Response) => {
  try {
    const { yearId } = req.params;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: yearId, schoolId },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    const classes = await prisma.class.findMany({
      where: {
        academicYearId: yearId,
        schoolId,
      },
      include: {
        studentClasses: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                gender: true,
                dateOfBirth: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        grade: 'asc',
      },
    });

    const eligibleStudents = classes.map((cls) => ({
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      section: cls.section,
      track: cls.track,
      studentCount: cls.studentClasses.length,
      students: cls.studentClasses.map((sc) => ({
        id: sc.student.id,
        studentId: sc.student.studentId,
        firstName: sc.student.firstName,
        lastName: sc.student.lastName,
        khmerName: sc.student.khmerName,
        gender: sc.student.gender,
        dateOfBirth: sc.student.dateOfBirth,
        photoUrl: sc.student.photoUrl,
      })),
    }));

    const totalStudents = eligibleStudents.reduce((sum, cls) => sum + cls.studentCount, 0);

    res.json({
      success: true,
      data: {
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
          status: academicYear.status,
        },
        classes: eligibleStudents,
        totalStudents,
      },
    });
  } catch (error: any) {
    console.error('Error fetching eligible students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligible students',
      error: error.message,
    });
  }
});

/**
 * GET /students/:id
 * Get student by ID
 */
app.get('/students/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId; // Multi-tenant filter

    const student = await prisma.student.findFirst({
      where: {
        id,
        schoolId, // Multi-tenant filter
      },
      include: {
        class: true,
        grades: {
          include: {
            subject: true,
          },
        },
        attendance: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your school",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching student",
      error: error.message,
    });
  }
});

/**
 * POST /students
 * Create new student
 */
app.post('/students', async (req: AuthRequest, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 CREATE STUDENT REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const schoolId = req.user!.schoolId; // Multi-tenant context
    console.log(`🏫 School ID: ${schoolId}`);

    // Check school usage limits
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const currentStudents = await prisma.student.count({
      where: { schoolId },
    });

    if (currentStudents >= school.maxStudents) {
      return res.status(403).json({
        success: false,
        message: `Student limit reached (${school.maxStudents} max). Please upgrade your subscription.`,
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      dateOfBirth,
      gender,
      placeOfBirth,
      currentAddress,
      phoneNumber,
      classId,
      fatherName,
      motherName,
      parentPhone,
      parentOccupation,
      remarks,
    } = req.body;

    // Validations
    if (!firstName || firstName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "គោត្តនាម (First name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!lastName || lastName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "នាម (Last name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!khmerName || khmerName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ឈ្មោះជាអក្សរខ្មែរ (Khmer name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "ថ្ងៃខែឆ្នាំកំណើត (Date of birth) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!gender || (gender !== "MALE" && gender !== "FEMALE")) {
      return res.status(400).json({
        success: false,
        message: "ភេទត្រូវតែជា MALE ឬ FEMALE",
      });
    }

    // Generate student ID using new ID generator system
    // Get school configuration for ID format
    const schoolConfig = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        idFormat: true,
        idPrefix: true,
        nextStudentNumber: true,
        schoolType: true,
      },
    });

    if (!schoolConfig) {
      return res.status(404).json({
        success: false,
        message: "School configuration not found",
      });
    }

    // Get next sequential number atomically
    const sequentialNumber = await prisma.$transaction(async (tx) => {
      const updated = await tx.school.update({
        where: { id: schoolId },
        data: { nextStudentNumber: { increment: 1 } },
      });
      return updated.nextStudentNumber;
    });

    // Prepare student params for ID generation
    const studentParams = {
      gender: gender as Gender,
      entryYear: new Date().getFullYear(),
      classId,
      schoolType: schoolConfig.schoolType,
    };

    // Generate student ID using configured format
    const studentId = IdGenerator.generateStudentId(
      schoolConfig.idFormat,
      schoolConfig.idPrefix || '01',
      studentParams,
      sequentialNumber
    );

    // Generate permanent ID
    const permanentId = IdGenerator.generatePermanentId('STU');

    // Generate metadata for audit trail
    const studentIdMeta = IdGenerator.generateStudentMetadata(
      schoolConfig.idFormat,
      studentParams,
      sequentialNumber
    );

    console.log(`🎯 Generated Student ID: ${studentId}`);
    console.log(`🔒 Permanent ID: ${permanentId}`);

    const studentEmail =
      email && email.trim() !== ""
        ? email.trim()
        : `${studentId}@student.edu.kh`;

    console.log(`📧 Email: ${studentEmail}`);

    // Verify class belongs to same school
    if (classId && classId.trim() !== "") {
      const classExists = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId, // Multi-tenant check
        },
      });

      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: "រកមិនឃើញថ្នាក់នេះទេ (Class not found in your school)",
        });
      }
    }

    const studentData: any = {
      schoolId, // Multi-tenant
      studentId,
      permanentId,
      studentIdFormat: schoolConfig.idFormat,
      studentIdMeta,
      entryYear: new Date().getFullYear(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      khmerName: khmerName.trim(),
      englishName: englishName?.trim() || null,
      email: studentEmail,
      dateOfBirth,
      gender: gender as Gender,
      placeOfBirth: placeOfBirth?.trim() || "ភ្នំពេញ",
      currentAddress: currentAddress?.trim() || "ភ្នំពេញ",
      phoneNumber: phoneNumber?.trim() || null,
      fatherName: fatherName?.trim() || "ឪពុក",
      motherName: motherName?.trim() || "ម្តាយ",
      parentPhone: parentPhone?.trim() || null,
      parentOccupation: parentOccupation?.trim() || "កសិករ",
      remarks: remarks?.trim() || null,
    };

    if (classId && classId.trim() !== "") {
      studentData.classId = classId;
    }

    console.log("💾 Creating student in database...");

    const student = await prisma.student.create({
      data: studentData,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    // Update school's current student count
    await prisma.school.update({
      where: { id: schoolId },
      data: { currentStudents: currentStudents + 1 },
    });

    // Log ID generation for audit trail
    await prisma.idGenerationLog.create({
      data: {
        schoolId,
        entityType: 'STUDENT',
        entityId: student.id,
        generatedId: studentId,
        format: schoolConfig.idFormat,
        metadata: studentIdMeta,
        createdBy: req.user!.id,
      },
    });

    console.log("✅ Student created successfully!");
    console.log(`   ID: ${student.id}`);
    console.log(`   Student ID: ${student.studentId}`);
    console.log(`   Permanent ID: ${student.permanentId}`);
    console.log(`   Name: ${student.khmerName}`);
    console.log(`   School: ${schoolId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(201).json({
      success: true,
      message: "បង្កើតសិស្សបានជោគជ័យ (Student created successfully)",
      data: student,
    });
  } catch (error: any) {
    console.error("❌ Error creating student:", error);
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការបង្កើតសិស្ស (Error creating student)",
      error: error.message,
    });
  }
});

/**
 * POST /students/bulk
 * Bulk create students
 */
app.post('/students/bulk', async (req: AuthRequest, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 BULK CREATE STUDENTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const schoolId = req.user!.schoolId; // Multi-tenant context
    const { classId, students } = req.body;

    if (!classId || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "classId and students array are required",
      });
    }

    // Check school usage limits
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const currentStudents = await prisma.student.count({
      where: { schoolId },
    });

    if (currentStudents + students.length > school.maxStudents) {
      return res.status(403).json({
        success: false,
        message: `Adding ${students.length} students would exceed your limit of ${school.maxStudents}. Please upgrade your subscription.`,
      });
    }

    // Verify class belongs to school
    const classExists = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId, // Multi-tenant check
      },
      select: { id: true, name: true, grade: true },
    });

    if (!classExists) {
      return res.status(400).json({
        success: false,
        message: "Class not found in your school",
      });
    }

    console.log(`📊 Class: ${classExists.name} (Grade ${classExists.grade})`);
    console.log(`👥 Students to create: ${students.length}`);
    console.log(`🏫 School ID: ${schoolId}`);

    const results: any = { success: [], failed: [] };

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const rowNumber = i + 1;

      try {
        // Parse name
        const fullName = studentData.name?.trim();
        if (!fullName) throw new Error("Name is required");

        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts.pop() || "";
        const lastName = nameParts.join(" ") || firstName;

        // Parse gender
        let gender: "MALE" | "FEMALE" = "MALE";
        if (studentData.gender) {
          const g = studentData.gender.toString().trim().toUpperCase();
          if (["ប", "ប្រុស", "M", "MALE", "BOY"].includes(g)) {
            gender = "MALE";
          } else if (["ស", "ស្រី", "F", "FEMALE", "GIRL"].includes(g)) {
            gender = "FEMALE";
          }
        }

        // Parse date
        let dateOfBirth: string;
        try {
          if (!studentData.dateOfBirth) {
            throw new Error("Date of birth is required");
          }
          dateOfBirth = parseDate(studentData.dateOfBirth);
          console.log(`  📅 Row ${rowNumber}: ${studentData.dateOfBirth} → ${dateOfBirth}`);
        } catch (dateError: any) {
          throw new Error(`Invalid date: ${dateError.message}`);
        }

        // Generate student ID (school-specific)
        const studentId = await generateStudentId(classId, schoolId);

        // Create student
        const newStudent = await prisma.student.create({
          data: {
            schoolId, // Multi-tenant
            studentId,
            firstName,
            lastName,
            khmerName: fullName,
            dateOfBirth,
            gender,
            classId,
            email: `${studentId}@student.edu.kh`,
            previousGrade: studentData.previousGrade?.trim() || null,
            previousSchool: studentData.previousSchool?.trim() || null,
            repeatingGrade: studentData.repeatingGrade?.trim() || null,
            transferredFrom: studentData.transferredFrom?.trim() || null,
            grade9ExamSession: studentData.grade9ExamSession?.trim() || null,
            grade9ExamCenter: studentData.grade9ExamCenter?.trim() || null,
            grade9ExamRoom: studentData.grade9ExamRoom?.trim() || null,
            grade9ExamDesk: studentData.grade9ExamDesk?.trim() || null,
            grade9PassStatus: studentData.grade9PassStatus?.trim() || null,
            grade12ExamSession: studentData.grade12ExamSession?.trim() || null,
            grade12ExamCenter: studentData.grade12ExamCenter?.trim() || null,
            grade12ExamRoom: studentData.grade12ExamRoom?.trim() || null,
            grade12ExamDesk: studentData.grade12ExamDesk?.trim() || null,
            grade12PassStatus: studentData.grade12PassStatus?.trim() || null,
            grade12Track: studentData.grade12Track?.trim() || null,
            remarks: studentData.remarks?.trim() || null,
            placeOfBirth: "ភ្នំពេញ",
            currentAddress: "ភ្នំពេញ",
            fatherName: "ឪពុក",
            motherName: "ម្តាយ",
            parentOccupation: "កសិករ",
          },
          include: {
            class: {
              select: { id: true, name: true, grade: true },
            },
          },
        });

        results.success.push({
          row: rowNumber,
          studentId: newStudent.studentId,
          name: newStudent.khmerName,
        });

        console.log(`  ✅ Row ${rowNumber}: ${newStudent.khmerName} (${newStudent.studentId})`);
      } catch (error: any) {
        results.failed.push({
          row: rowNumber,
          name: studentData.name || "Unknown",
          error: error.message,
        });
        console.error(`  ❌ Row ${rowNumber}: ${error.message}`);
      }
    }

    // Update school's current student count
    await prisma.school.update({
      where: { id: schoolId },
      data: { currentStudents: currentStudents + results.success.length },
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Success: ${results.success.length}/${students.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${students.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(201).json({
      success: true,
      message: `Created ${results.success.length} students successfully`,
      data: {
        total: students.length,
        success: results.success.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error: any) {
    console.error("❌ Bulk create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create students",
      error: error.message,
    });
  }
});

/**
 * PUT /students/:id
 * Update student
 */
app.put('/students/:id', async (req: AuthRequest, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝 UPDATE STUDENT REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { id } = req.params;
    const schoolId = req.user!.schoolId; // Multi-tenant context

    // Verify student belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        schoolId, // Multi-tenant check
      },
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your school",
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      gender,
      dateOfBirth,
      placeOfBirth,
      currentAddress,
      phoneNumber,
      email,
      classId,
      fatherName,
      motherName,
      parentPhone,
      parentOccupation,
      previousGrade,
      previousSchool,
      repeatingGrade,
      transferredFrom,
      grade9ExamSession,
      grade9ExamCenter,
      grade9ExamRoom,
      grade9ExamDesk,
      grade9PassStatus,
      grade12ExamSession,
      grade12ExamCenter,
      grade12ExamRoom,
      grade12ExamDesk,
      grade12PassStatus,
      grade12Track,
      remarks,
      photoUrl,
    } = req.body;

    // Verify new class belongs to same school
    if (classId && classId.trim() !== "") {
      const classExists = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId, // Multi-tenant check
        },
      });

      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: "Class not found in your school",
        });
      }
    }

    // Build update data
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName?.trim() || "";
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || "";
    if (khmerName !== undefined) updateData.khmerName = khmerName?.trim() || "";
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (englishName !== undefined) updateData.englishName = englishName?.trim() === "" ? null : englishName?.trim();
    if (email !== undefined) updateData.email = email?.trim() === "" ? null : email?.trim();
    if (placeOfBirth !== undefined) updateData.placeOfBirth = placeOfBirth?.trim() === "" ? null : placeOfBirth?.trim();
    if (currentAddress !== undefined) updateData.currentAddress = currentAddress?.trim() === "" ? null : currentAddress?.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber?.trim() === "" ? null : phoneNumber?.trim();
    if (classId !== undefined) updateData.classId = classId?.trim() === "" ? null : classId?.trim();
    if (fatherName !== undefined) updateData.fatherName = fatherName?.trim() === "" ? null : fatherName?.trim();
    if (motherName !== undefined) updateData.motherName = motherName?.trim() === "" ? null : motherName?.trim();
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone?.trim() === "" ? null : parentPhone?.trim();
    if (parentOccupation !== undefined) updateData.parentOccupation = parentOccupation?.trim() === "" ? null : parentOccupation?.trim();
    if (previousGrade !== undefined) updateData.previousGrade = previousGrade?.trim() === "" ? null : previousGrade?.trim();
    if (previousSchool !== undefined) updateData.previousSchool = previousSchool?.trim() === "" ? null : previousSchool?.trim();
    if (repeatingGrade !== undefined) updateData.repeatingGrade = repeatingGrade?.trim() === "" ? null : repeatingGrade?.trim();
    if (transferredFrom !== undefined) updateData.transferredFrom = transferredFrom?.trim() === "" ? null : transferredFrom?.trim();
    if (grade9ExamSession !== undefined) updateData.grade9ExamSession = grade9ExamSession?.trim() === "" ? null : grade9ExamSession?.trim();
    if (grade9ExamCenter !== undefined) updateData.grade9ExamCenter = grade9ExamCenter?.trim() === "" ? null : grade9ExamCenter?.trim();
    if (grade9ExamRoom !== undefined) updateData.grade9ExamRoom = grade9ExamRoom?.trim() === "" ? null : grade9ExamRoom?.trim();
    if (grade9ExamDesk !== undefined) updateData.grade9ExamDesk = grade9ExamDesk?.trim() === "" ? null : grade9ExamDesk?.trim();
    if (grade9PassStatus !== undefined) updateData.grade9PassStatus = grade9PassStatus?.trim() === "" ? null : grade9PassStatus?.trim();
    if (grade12ExamSession !== undefined) updateData.grade12ExamSession = grade12ExamSession?.trim() === "" ? null : grade12ExamSession?.trim();
    if (grade12ExamCenter !== undefined) updateData.grade12ExamCenter = grade12ExamCenter?.trim() === "" ? null : grade12ExamCenter?.trim();
    if (grade12ExamRoom !== undefined) updateData.grade12ExamRoom = grade12ExamRoom?.trim() === "" ? null : grade12ExamRoom?.trim();
    if (grade12ExamDesk !== undefined) updateData.grade12ExamDesk = grade12ExamDesk?.trim() === "" ? null : grade12ExamDesk?.trim();
    if (grade12PassStatus !== undefined) updateData.grade12PassStatus = grade12PassStatus?.trim() === "" ? null : grade12PassStatus?.trim();
    if (grade12Track !== undefined) updateData.grade12Track = grade12Track?.trim() === "" ? null : grade12Track?.trim();
    if (remarks !== undefined) updateData.remarks = remarks?.trim() === "" ? null : remarks?.trim();
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl?.trim() === "" ? null : photoUrl?.trim();

    console.log(`💾 Updating student ${id} in school ${schoolId}...`);

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
      },
    });

    console.log("✅ Student updated successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.json({
      success: true,
      data: student,
      message: "Student updated successfully",
    });
  } catch (error: any) {
    console.error("❌ UPDATE STUDENT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error updating student",
      error: error.message,
    });
  }
});

/**
 * DELETE /students/:id
 * Delete student
 */
app.delete('/students/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId; // Multi-tenant context

    // Verify student belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        schoolId, // Multi-tenant check
      },
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your school",
      });
    }

    await prisma.student.delete({
      where: { id },
    });

    // Update school's current student count
    const currentCount = await prisma.student.count({
      where: { schoolId },
    });

    await prisma.school.update({
      where: { id: schoolId },
      data: { currentStudents: currentCount },
    });

    res.json({
      success: true,
      message: "លុបសិស្សបានជោគជ័យ (Student deleted successfully)",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការលុបសិស្ស (Error deleting student)",
      error: error.message,
    });
  }
});

/**
 * POST /students/:id/photo
 * Upload photo for a student
 */
app.post('/students/:id/photo', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided',
      });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: { id, schoolId },
    });

    if (!student) {
      // Delete uploaded file if student not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Student not found in your school',
      });
    }

    // Delete old photo if exists
    if (student.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '../public', student.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update student with new photo URL
    const photoUrl = `/uploads/students/${req.file.filename}`;
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: { photoUrl },
    });

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photoUrl,
        student: updatedStudent,
      },
    });
  } catch (error: any) {
    // Clean up uploaded file on error
    if ((req as any).file) {
      fs.unlinkSync((req as any).file.path);
    }
    console.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
      error: error.message,
    });
  }
});

// ============================================
// STUDENT PROMOTION & PROGRESSION ENDPOINTS
// ============================================

/**
 * Preview automatic promotion
 * Shows which students will be promoted from current year to next
 */
app.post('/students/promote/preview', async (req: AuthRequest, res: Response) => {
  try {
    const { fromAcademicYearId, toAcademicYearId } = req.body;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!fromAcademicYearId || !toAcademicYearId) {
      return res.status(400).json({
        success: false,
        message: 'fromAcademicYearId and toAcademicYearId are required',
      });
    }

    // Get all classes from source year
    const fromClasses = await prisma.class.findMany({
      where: {
        academicYearId: fromAcademicYearId,
        schoolId,
      },
      include: {
        studentClasses: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                gender: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    // Get target year classes
    const toClasses = await prisma.class.findMany({
      where: {
        academicYearId: toAcademicYearId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
      },
    });

    // Build promotion preview
    const promotionPreview = fromClasses.map((fromClass) => {
      // Find matching class in next year (same grade + 1)
      const nextGrade = (parseInt(fromClass.grade) + 1).toString();
      const suggestedToClass = toClasses.find(
        (c) => c.grade === nextGrade && c.section === fromClass.section
      );

      return {
        fromClass: {
          id: fromClass.id,
          name: fromClass.name,
          grade: fromClass.grade,
          section: fromClass.section,
          studentCount: fromClass.studentClasses.length,
        },
        toClass: suggestedToClass || null,
        students: fromClass.studentClasses.map((sc) => ({
          id: sc.student.id,
          studentId: sc.student.studentId,
          name: {
            latin: `${sc.student.firstName} ${sc.student.lastName}`,
            khmer: sc.student.khmerName,
          },
          gender: sc.student.gender,
          photo: sc.student.photoUrl,
          canPromote: !!suggestedToClass,
        })),
      };
    });

    res.json({
      success: true,
      data: {
        fromAcademicYearId,
        toAcademicYearId,
        totalStudents: promotionPreview.reduce((sum, p) => sum + p.students.length, 0),
        promotableStudents: promotionPreview
          .filter((p) => p.toClass)
          .reduce((sum, p) => sum + p.students.length, 0),
        preview: promotionPreview,
      },
    });
  } catch (error: any) {
    console.error('Error previewing promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview promotion',
      error: error.message,
    });
  }
});

/**
 * Execute automatic promotion
 * Promotes students from one academic year to the next automatically
 */
app.post('/students/promote/automatic', async (req: AuthRequest, res: Response) => {
  try {
    const { fromAcademicYearId, toAcademicYearId, promotions } = req.body;
    const schoolId = req.user?.schoolId;
    const userId = req.user?.id;

    if (!schoolId || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!fromAcademicYearId || !toAcademicYearId || !Array.isArray(promotions)) {
      return res.status(400).json({
        success: false,
        message: 'fromAcademicYearId, toAcademicYearId, and promotions array are required',
      });
    }

    // Validate academic years exist
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: fromAcademicYearId, schoolId },
      }),
      prisma.academicYear.findFirst({
        where: { id: toAcademicYearId, schoolId },
      }),
    ]);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    // Process each promotion
    for (const promo of promotions) {
      try {
        const { studentId, fromClassId, toClassId } = promo;

        // Verify student exists and belongs to from class
        const studentClass = await prisma.studentClass.findFirst({
          where: {
            studentId,
            classId: fromClassId,
          },
        });

        if (!studentClass) {
          results.failed.push({
            studentId,
            reason: 'Student not found in source class',
          });
          continue;
        }

        // Check if already promoted
        const existingProgression = await prisma.studentProgression.findFirst({
          where: {
            studentId,
            fromAcademicYearId,
            toAcademicYearId,
          },
        });

        if (existingProgression) {
          results.failed.push({
            studentId,
            reason: 'Already promoted to this academic year',
          });
          continue;
        }

        // Create progression record and assign to new class
        await prisma.$transaction(async (tx) => {
          // Create progression record
          await tx.studentProgression.create({
            data: {
              studentId,
              fromAcademicYearId,
              toAcademicYearId,
              fromClassId,
              toClassId,
              promotionType: 'AUTOMATIC',
              promotionDate: new Date(),
              promotedBy: userId,
            },
          });

          // Assign student to new class
          const existingAssignment = await tx.studentClass.findFirst({
            where: {
              studentId,
              classId: toClassId,
            },
          });

          if (!existingAssignment) {
            await tx.studentClass.create({
              data: {
                studentId,
                classId: toClassId,
                enrolledAt: new Date(),
              },
            });
          }
        });

        results.successful.push({
          studentId,
          fromClassId,
          toClassId,
        });
      } catch (error: any) {
        results.failed.push({
          studentId: promo.studentId,
          reason: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Promoted ${results.successful.length} students successfully`,
      data: {
        successCount: results.successful.length,
        failureCount: results.failed.length,
        results,
      },
    });
  } catch (error: any) {
    console.error('Error executing automatic promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute promotion',
      error: error.message,
    });
  }
});

/**
 * Manual promotion - promote individual student to specific class
 */
app.post('/students/promote/manual', async (req: AuthRequest, res: Response) => {
  try {
    const {
      studentId,
      fromAcademicYearId,
      toAcademicYearId,
      fromClassId,
      toClassId,
      notes,
    } = req.body;
    const schoolId = req.user?.schoolId;
    const userId = req.user?.id;

    if (!schoolId || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!studentId || !fromAcademicYearId || !toAcademicYearId || !fromClassId || !toClassId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Validate student belongs to school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if already promoted
    const existingProgression = await prisma.studentProgression.findFirst({
      where: {
        studentId,
        fromAcademicYearId,
        toAcademicYearId,
      },
    });

    if (existingProgression) {
      return res.status(400).json({
        success: false,
        message: 'Student already promoted to this academic year',
      });
    }

    // Create progression and assign to class
    const progression = await prisma.$transaction(async (tx) => {
      // Create progression record
      const prog = await tx.studentProgression.create({
        data: {
          studentId,
          fromAcademicYearId,
          toAcademicYearId,
          fromClassId,
          toClassId,
          promotionType: 'MANUAL',
          promotionDate: new Date(),
          promotedBy: userId,
          notes,
        },
        include: {
          student: {
            select: {
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          fromClass: {
            select: {
              name: true,
              grade: true,
            },
          },
          toClass: {
            select: {
              name: true,
              grade: true,
            },
          },
        },
      });

      // Assign to new class if not already assigned
      const existingAssignment = await tx.studentClass.findFirst({
        where: {
          studentId,
          classId: toClassId,
        },
      });

      if (!existingAssignment) {
        await tx.studentClass.create({
          data: {
            studentId,
            classId: toClassId,
            enrolledAt: new Date(),
          },
        });
      }

      return prog;
    });

    res.json({
      success: true,
      message: 'Student promoted successfully',
      data: progression,
    });
  } catch (error: any) {
    console.error('Error executing manual promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote student',
      error: error.message,
    });
  }
});

/**
 * Get student progression history
 */
app.get('/students/:id/progression', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: { id, schoolId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get progression history
    const progressions = await prisma.studentProgression.findMany({
      where: { studentId: id },
      include: {
        fromAcademicYear: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        toAcademicYear: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        fromClass: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        toClass: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: {
        promotionDate: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          name: {
            latin: `${student.firstName} ${student.lastName}`,
            khmer: student.khmerName,
          },
        },
        progressions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching progression history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progression history',
      error: error.message,
    });
  }
});

// Mark students as failed (repeat same grade)
app.post('/students/mark-failed', async (req: any, res: Response) => {
  try {
    const { studentIds, fromAcademicYearId, toAcademicYearId, notes } = req.body;
    const schoolId = req.user.schoolId;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'studentIds array is required',
      });
    }

    if (!fromAcademicYearId || !toAcademicYearId) {
      return res.status(400).json({
        success: false,
        error: 'fromAcademicYearId and toAcademicYearId are required',
      });
    }

    // Verify academic years belong to school
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: fromAcademicYearId, schoolId },
      }),
      prisma.academicYear.findFirst({
        where: { id: toAcademicYearId, schoolId },
      }),
    ]);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    const results = {
      processed: 0,
      failed: [] as any[],
    };

    // Process each student
    for (const studentId of studentIds) {
      try {
        // Get student with current class
        const student = await prisma.student.findFirst({
          where: { id: studentId, schoolId },
          include: {
            studentClasses: {
              where: { status: 'ACTIVE' },
              include: {
                class: true,
              },
              orderBy: { enrolledAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!student || student.studentClasses.length === 0) {
          results.failed.push({
            studentId,
            error: 'Student not found or not enrolled in any class',
          });
          continue;
        }

        const currentClass = student.studentClasses[0].class;

        // Find class in new year with same grade
        const repeatClass = await prisma.class.findFirst({
          where: {
            schoolId,
            academicYearId: toAcademicYearId,
            grade: currentClass.grade, // Same grade
          },
        });

        if (!repeatClass) {
          results.failed.push({
            studentId,
            error: `No class found for grade ${currentClass.grade} in target year`,
          });
          continue;
        }

        // Create progression record with REPEAT type
        await prisma.studentProgression.create({
          data: {
            studentId,
            fromAcademicYearId,
            toAcademicYearId,
            fromClassId: currentClass.id,
            toClassId: repeatClass.id,
            promotionType: 'REPEAT',
            promotionDate: new Date(),
            promotedBy: req.user.userId,
            notes: notes || 'Student marked as failed - repeating grade',
          },
        });

        // Add student to new class
        await prisma.studentClass.create({
          data: {
            studentId,
            classId: repeatClass.id,
            status: 'ACTIVE',
          },
        });

        results.processed++;
      } catch (err: any) {
        results.failed.push({
          studentId,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.processed} student(s)`,
      data: results,
    });
  } catch (error: any) {
    console.error('Mark failed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark students as failed',
      details: error.message,
    });
  }
});

// ========================================
// Student Academic Transcript
// ========================================

// GET /students/:id/transcript - Get complete academic transcript
app.get('/students/:id/transcript', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'School ID required' });
    }

    // Get student with school validation
    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        studentClasses: {
          include: {
            class: {
              include: {
                academicYear: true,
              }
            }
          },
          orderBy: { enrolledAt: 'desc' }
        },
        StudentProgression: {
          include: {
            fromClass: true,
            toClass: true,
            fromAcademicYear: true,
            toAcademicYear: true,
          },
          orderBy: { createdAt: 'desc' }
        },
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Get all classes student has been enrolled in
    const classIds = student.studentClasses.map((sc) => sc.classId);

    // Get all grades for student across all classes
    const grades = await prisma.grade.findMany({
      where: { studentId: id },
      include: {
        subject: true,
        class: {
          include: {
            academicYear: true,
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { monthNumber: 'desc' }
      ]
    });

    // Get all monthly summaries
    const monthlySummaries = await prisma.studentMonthlySummary.findMany({
      where: { studentId: id },
      orderBy: [
        { year: 'desc' },
        { monthNumber: 'desc' }
      ]
    });

    // Get attendance summaries by class
    const attendanceByClass: Record<string, any> = {};
    for (const sc of student.studentClasses) {
      const attendance = await prisma.attendance.findMany({
        where: {
          studentId: id,
          classId: sc.classId,
        }
      });

      const total = attendance.length;
      const present = attendance.filter((a) => a.status === 'PRESENT').length;
      const absent = attendance.filter((a) => a.status === 'ABSENT').length;
      const late = attendance.filter((a) => a.status === 'LATE').length;
      const excused = attendance.filter((a) => a.status === 'EXCUSED').length;

      attendanceByClass[sc.classId] = {
        total,
        present,
        absent,
        late,
        excused,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    }

    // Group grades by academic year
    const gradesByYear: Record<string, any> = {};
    grades.forEach((grade: any) => {
      const yearId = grade.class?.academicYear?.id || 'unknown';
      const yearName = grade.class?.academicYear?.name || 'Unknown Year';

      if (!gradesByYear[yearId]) {
        gradesByYear[yearId] = {
          yearId,
          yearName,
          startDate: grade.class?.academicYear?.startDate,
          endDate: grade.class?.academicYear?.endDate,
          className: grade.class?.name,
          gradeLevel: grade.class?.grade,
          subjects: {},
        };
      }

      const subjectId = grade.subjectId;
      if (!gradesByYear[yearId].subjects[subjectId]) {
        gradesByYear[yearId].subjects[subjectId] = {
          subjectId,
          subjectName: grade.subject?.name,
          subjectCode: grade.subject?.code,
          grades: [],
        };
      }

      gradesByYear[yearId].subjects[subjectId].grades.push({
        id: grade.id,
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: grade.percentage,
        month: grade.month,
        monthNumber: grade.monthNumber,
        year: grade.year,
        remarks: grade.remarks,
      });
    });

    // Calculate yearly averages
    Object.keys(gradesByYear).forEach(yearId => {
      const yearData = gradesByYear[yearId];
      const subjects = Object.values(yearData.subjects) as any[];

      let totalAvg = 0;
      let subjectCount = 0;

      subjects.forEach((subject: any) => {
        const subjectGrades = subject.grades;
        if (subjectGrades.length > 0) {
          const avg = subjectGrades.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0) / subjectGrades.length;
          subject.average = Math.round(avg * 100) / 100;
          subject.letterGrade = getLetterGrade(avg);
          totalAvg += avg;
          subjectCount++;
        }
      });

      yearData.overallAverage = subjectCount > 0 ? Math.round((totalAvg / subjectCount) * 100) / 100 : null;
      yearData.overallGrade = yearData.overallAverage ? getLetterGrade(yearData.overallAverage) : null;
      yearData.subjectCount = subjectCount;
    });

    // Format progressions
    const progressions = student.StudentProgression.map((p) => ({
      id: p.id,
      fromYear: p.fromAcademicYear?.name,
      toYear: p.toAcademicYear?.name,
      fromClass: p.fromClass?.name,
      toClass: p.toClass?.name,
      promotionType: p.promotionType,
      notes: p.notes,
      createdAt: p.createdAt,
    }));

    // Calculate overall statistics
    const allYears = Object.values(gradesByYear);
    const totalYears = allYears.length;
    const automaticPromoCount = progressions.filter((p) => p.promotionType === 'AUTOMATIC').length;
    const repeatCount = progressions.filter((p) => p.promotionType === 'REPEAT').length;
    const manualPromoCount = progressions.filter((p) => p.promotionType === 'MANUAL').length;

    let overallGPA = 0;
    let gpaCount = 0;
    allYears.forEach((year: any) => {
      if (year.overallAverage) {
        overallGPA += year.overallAverage;
        gpaCount++;
      }
    });

    // Build transcript response
    const transcript = {
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        photo: student.photoUrl,
        enrolledAt: student.createdAt,
        status: student.isAccountActive ? 'ACTIVE' : 'INACTIVE',
      },
      summary: {
        totalYears,
        currentClass: student.studentClasses[0]?.class?.name || null,
        currentGrade: student.studentClasses[0]?.class?.grade || null,
        cumulativeAverage: gpaCount > 0 ? Math.round((overallGPA / gpaCount) * 100) / 100 : null,
        cumulativeGrade: gpaCount > 0 ? getLetterGrade(overallGPA / gpaCount) : null,
        promotions: automaticPromoCount + manualPromoCount,
        repeats: repeatCount,
        totalProgressions: progressions.length,
      },
      academicYears: Object.values(gradesByYear).map((year: any) => ({
        ...year,
        subjects: Object.values(year.subjects),
        attendance: attendanceByClass[student.studentClasses.find((sc) =>
          sc.class?.academicYearId === year.yearId)?.classId || ''] || null,
      })).sort((a: any, b: any) => {
        return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
      }),
      progressions,
      monthlySummaries: monthlySummaries.map((ms) => ({
        month: ms.month,
        monthNumber: ms.monthNumber,
        year: ms.year,
        totalScore: ms.totalScore,
        totalMaxScore: ms.totalMaxScore,
        average: ms.average,
        classRank: ms.classRank,
        gradeLevel: ms.gradeLevel,
      })),
    };

    res.json({ success: true, data: transcript });

  } catch (error: any) {
    console.error('Transcript error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student transcript',
      details: error.message,
    });
  }
});

// Helper function for letter grades
function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  if (percentage >= 50) return 'E';
  return 'F';
}

// Start server
const PORT = process.env.STUDENT_SERVICE_PORT || 3003;

app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Student Service running on port ${PORT}`);
  console.log(`🏫 Multi-tenant support: ENABLED`);
  console.log(`🔒 JWT authentication: ENABLED`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET    /students/lightweight - Paginated list`);
  console.log(`   GET    /students - Full list`);
  console.log(`   GET    /students/:id - Get by ID`);
  console.log(`   POST   /students - Create student`);
  console.log(`   POST   /students/bulk - Bulk create`);
  console.log(`   PUT    /students/:id - Update student`);
  console.log(`   DELETE /students/:id - Delete student`);
  console.log(`   POST   /students/:id/photo - Upload photo`);
  console.log(`🎓 Student Promotion:`);
  console.log(`   GET    /students/promote/eligible/:yearId - Get eligible`);
  console.log(`   POST   /students/promote/preview - Preview promotion`);
  console.log(`   POST   /students/promote/automatic - Bulk promotion`);
  console.log(`   POST   /students/promote/manual - Manual promotion`);
  console.log(`   POST   /students/mark-failed - Mark as failed`);
  console.log(`   GET    /students/:id/progression - History`);
  console.log(`   GET    /health - Health check (no auth)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

export default app;
