import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient, Gender } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { generateStudentId } from './utils/studentIdGenerator';
import { parseDate } from './utils/dateParser';
import IdGenerator from './utils/idGenerator';
import { studentPayloadSchema, getStudentValidationMessage } from './validators/student.validator';
import { withPrismaPoolParams, scheduleDbKeepalive, shouldRunDbStartupWarmup } from '../../../../lib/prisma-pool-url';
import { getSharedPrisma } from '../../core/prisma';
import { getJwtSecret } from '../../../../lib/jwt-secret';

// Load environment variables from root .env

// Simple in-memory cache with stale-while-revalidate
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 10 * 60 * 1000; // 10 minutes (serve stale while refreshing)
const TRANSCRIPT_FORMULA_VERSION = 'KHM_MOEYS_TRANSCRIPT_V1';
const TRANSCRIPT_ISSUER_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

const app = express.Router();

// ✅ Singleton pattern to prevent multiple Prisma instances

const prisma = getSharedPrisma();


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
scheduleDbKeepalive(() => { isDbWarm = false; void warmUpDb(); });

const normalizeRegionalValue = (value: any) => {
  if (typeof value === 'string') return value.trim() || null;
  return value ?? null;
};

const stableJson = (value: any): any => {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((result: Record<string, any>, key) => {
        result[key] = stableJson(value[key]);
        return result;
      }, {});
  }
  return value instanceof Date ? value.toISOString() : value;
};

const createTranscriptChecksum = (payload: any) =>
  crypto.createHash('sha256').update(JSON.stringify(stableJson(payload))).digest('hex');

const createTranscriptVerificationCode = () =>
  `TR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

const createTranscriptDocumentNumber = (schoolId: string, academicYearName: string | null | undefined, sequence: number) => {
  const yearPart = (academicYearName || 'YEAR').replace(/[^0-9A-Za-z-]/g, '').slice(0, 16) || 'YEAR';
  const schoolPart = schoolId.replace(/[^0-9A-Za-z]/g, '').slice(-6).toUpperCase() || 'SCHOOL';
  return `TR-${schoolPart}-${yearPart}-${String(sequence).padStart(5, '0')}`;
};

function collectRegionalFields(
  payload: Record<string, any>,
  regionalKeys: string[],
  topLevelKeys: string[]
) {
  const regional: Record<string, any> = {
    ...(payload.customFields?.regional && typeof payload.customFields.regional === 'object'
      ? payload.customFields.regional
      : {}),
  };
  const topLevel = new Set([...topLevelKeys, 'customFields']);

  for (const key of regionalKeys) {
    if (payload[key] !== undefined) regional[key] = normalizeRegionalValue(payload[key]);
  }
  for (const [key, value] of Object.entries(payload)) {
    if (!topLevel.has(key) && !regionalKeys.includes(key) && value !== undefined) {
      regional[key] = normalizeRegionalValue(value);
    }
  }

  return regional;
}


// Middleware - CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];


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

async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as any;

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
}

const requireOnboardingAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role || '';
  const schoolId = String(req.body?.schoolId || '');
  if (!['ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(role)) {
    return res.status(403).json({ success: false, message: 'School administrator access required' });
  }
  if (role !== 'SUPER_ADMIN' && (!schoolId || req.user?.schoolId !== schoolId)) {
    return res.status(403).json({ success: false, message: 'You can only manage your own school' });
  }
  next();
};

const ensureStudentClassEnrollment = async (
  studentId: string,
  classId: string,
  schoolId: string,
  classYearCache?: Map<string, string>
) => {
  let academicYearId = classYearCache?.get(classId);

  if (!academicYearId) {
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
      select: {
        academicYearId: true,
      },
    });

    academicYearId = classRecord?.academicYearId;

    if (classYearCache && academicYearId) {
      classYearCache.set(classId, academicYearId);
    }
  }

  if (!academicYearId) {
    return null;
  }

  return prisma.studentClass.upsert({
    where: {
      studentId_classId_academicYearId: {
        studentId,
        classId,
        academicYearId,
      },
    },
    update: {
      status: 'ACTIVE',
    },
    create: {
      studentId,
      classId,
      academicYearId,
      status: 'ACTIVE',
    },
  });
};

const STUDENT_REGIONAL_KEYS = [
  'khmerName', 'englishName', 'placeOfBirth', 'currentAddress',
  'fatherName', 'motherName', 'parentPhone', 'parentOccupation',
  'previousGrade', 'previousSchool', 'repeatingGrade', 'transferredFrom',
  'grade9ExamSession', 'grade9ExamCenter', 'grade9ExamRoom', 'grade9ExamDesk', 'grade9PassStatus',
  'grade12ExamSession', 'grade12ExamCenter', 'grade12ExamRoom', 'grade12ExamDesk', 'grade12PassStatus',
  'grade12Track', 'remarks',
];

const STUDENT_TOP_LEVEL_KEYS = [
  'firstName', 'lastName', 'englishFirstName', 'englishLastName',
  'email', 'dateOfBirth', 'gender', 'phoneNumber', 'classId',
  'photoUrl', 'isAccountActive',
];

// ===========================
// POST /students/batch
// Batch create students for onboarding (school-admin auth required)
// ===========================
app.post('/students/batch', authenticateToken, requireOnboardingAdmin, async (req: AuthRequest, res: Response) => {
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
    const classYearCache = new Map<string, string>();

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

        const normalizedGender = gender === 'F' || gender === 'FEMALE' ? 'FEMALE' : 'MALE';
        const generatedStudentId = await generateStudentId(classId || undefined, schoolId);

        // Create student
        const student = await prisma.student.create({
          data: {
            schoolId,
            studentId: generatedStudentId,
            firstName,
            lastName,
            customFields: {
              regional: {
                khmerName: `${firstName} ${lastName}`
              }
            },
            gender: normalizedGender,
            dateOfBirth: dateOfBirth || '2008-01-01',
            classId: classId || null,
            phoneNumber: parentPhone || null,
          },
        });

        if (classId) {
          await ensureStudentClassEnrollment(student.id, classId, schoolId, classYearCache);
        }

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

    if (createdStudents.length > 0) {
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          currentStudents: {
            increment: createdStudents.length,
          },
        },
      });
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

// Public transcript verification. Returns document metadata only; score and
// attendance details remain behind authenticated transcript views.
app.get('/transcripts/verify/:code', async (req: Request, res: Response) => {
  try {
    const verificationCode = String(req.params.code || '').trim().toUpperCase();
    if (!verificationCode || !(prisma as any).studentTranscriptDocument?.findUnique) {
      return res.status(404).json({ success: false, error: 'Transcript document not found' });
    }

    const document = await (prisma as any).studentTranscriptDocument.findUnique({
      where: { verificationCode },
      select: {
        schoolId: true,
        studentId: true,
        academicYearId: true,
        status: true,
        documentNumber: true,
        verificationCode: true,
        snapshotChecksum: true,
        formulaVersion: true,
        approvedAt: true,
        issuedAt: true,
        revokedAt: true,
      },
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Transcript document not found' });
    }

    const [student, school, academicYear] = await Promise.all([
      prisma.student.findFirst({
        where: { id: document.studentId, schoolId: document.schoolId },
        select: { studentId: true, firstName: true, lastName: true },
      }),
      prisma.school.findUnique({
        where: { id: document.schoolId },
        select: { name: true },
      }),
      prisma.academicYear.findUnique({
        where: { id: document.academicYearId },
        select: { name: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        status: document.status,
        isValid: document.status === 'OFFICIAL',
        documentNumber: document.documentNumber,
        verificationCode: document.verificationCode,
        issuedAt: document.issuedAt,
        approvedAt: document.approvedAt,
        revokedAt: document.revokedAt,
        formulaVersion: document.formulaVersion,
        snapshotChecksum: document.snapshotChecksum,
        schoolName: school?.name || null,
        academicYear: academicYear?.name || null,
        student: student
          ? {
              studentId: student.studentId,
              name: `${student.lastName} ${student.firstName}`.trim(),
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Transcript verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify transcript document',
      ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {}),
    });
  }
});

// Apply auth middleware to all routes
app.use('/students', authenticateToken);

// ==========================================
// Admissions — application intake and review
// ==========================================
const ADMISSION_STATUSES = new Set([
  'DRAFT', 'RECEIVED', 'UNDER_REVIEW', 'WAITLISTED', 'APPROVED',
  'REJECTED', 'ENROLLED', 'WITHDRAWN',
]);
const ADMISSION_TYPES = new Set(['NEW_STUDENT', 'RETURNING_STUDENT', 'TRANSFER_IN']);
const ADMISSION_INTAKE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'STAFF', 'TEACHER', 'SCHOOL_ADMIN']);
const ADMISSION_REVIEW_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'STAFF', 'SCHOOL_ADMIN']);
const ADMISSION_TRANSITIONS: Record<string, Set<string>> = {
  DRAFT: new Set(['RECEIVED', 'WITHDRAWN']),
  RECEIVED: new Set(['UNDER_REVIEW', 'WAITLISTED', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
  UNDER_REVIEW: new Set(['WAITLISTED', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
  WAITLISTED: new Set(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
  APPROVED: new Set(['UNDER_REVIEW', 'ENROLLED', 'WITHDRAWN']),
  REJECTED: new Set(['UNDER_REVIEW']),
  ENROLLED: new Set(),
  WITHDRAWN: new Set(['RECEIVED']),
};

const admissionNumber = (academicYearName?: string | null) => {
  const year = (academicYearName || String(new Date().getFullYear())).replace(/[^0-9A-Za-z]/g, '').slice(0, 10);
  return `ADM-${year || new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};
const cleanAdmissionText = (value: unknown, max = 250) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) || null : null;

app.use('/admissions', (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!ADMISSION_INTAKE_ROLES.has(req.user?.role || '')) {
    return res.status(403).json({ success: false, message: 'Admission workspace permission required' });
  }
  next();
});

app.get('/admissions/summary', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const academicYearId = cleanAdmissionText(req.query.academicYearId, 64);
    const where = { schoolId, ...(academicYearId ? { academicYearId } : {}) };
    const [grouped, awaitingPlacement] = await Promise.all([
      (prisma as any).admissionApplication.groupBy({
        by: ['status', 'applicantType'], where, _count: { _all: true },
      }),
      (prisma as any).admissionApplication.count({
        where: { ...where, status: 'ENROLLED', targetClassId: null },
      }),
    ]);
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const row of grouped) {
      byStatus[row.status] = (byStatus[row.status] || 0) + row._count._all;
      byType[row.applicantType] = (byType[row.applicantType] || 0) + row._count._all;
    }
    res.json({ success: true, data: { total: grouped.reduce((n: number, row: any) => n + row._count._all, 0), byStatus, byType, awaitingPlacement } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load admission summary', details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
});

app.get('/admissions', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 25));
    const search = cleanAdmissionText(req.query.search, 100);
    const status = cleanAdmissionText(req.query.status, 30);
    const applicantType = cleanAdmissionText(req.query.applicantType, 30);
    const academicYearId = cleanAdmissionText(req.query.academicYearId, 64);
    const where: any = {
      schoolId,
      ...(academicYearId ? { academicYearId } : {}),
      ...(status && ADMISSION_STATUSES.has(status) ? { status } : {}),
      ...(applicantType && ADMISSION_TYPES.has(applicantType) ? { applicantType } : {}),
      ...(search && search.length >= 2 ? {
        OR: [
          { applicationNumber: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { englishFirstName: { contains: search, mode: 'insensitive' } },
          { englishLastName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
          { student: { studentId: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };
    const [applications, total] = await Promise.all([
      (prisma as any).admissionApplication.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          academicYear: { select: { id: true, name: true } },
          targetClass: { select: { id: true, name: true, grade: true } },
          student: { select: { id: true, studentId: true, class: { select: { name: true, grade: true } } } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      (prisma as any).admissionApplication.count({ where }),
    ]);
    res.json({ success: true, data: { applications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load admission applications', details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
});

app.get('/admissions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const application = await (prisma as any).admissionApplication.findFirst({
      where: { id: req.params.id, schoolId: req.user!.schoolId },
      include: {
        academicYear: true, targetClass: true,
        student: { select: { id: true, studentId: true, firstName: true, lastName: true, class: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        events: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: { application } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load application', details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
});

app.post('/admissions', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const createdById = req.user!.id;
    const applicantType = String(req.body.applicantType || 'NEW_STUDENT');
    if (!ADMISSION_TYPES.has(applicantType) || applicantType === 'TRANSFER_IN') {
      return res.status(400).json({ success: false, message: 'Applicant type is not available in this phase' });
    }
    const academicYearId = cleanAdmissionText(req.body.academicYearId, 64);
    if (!academicYearId) return res.status(400).json({ success: false, message: 'Academic year is required' });
    const academicYear = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: { id: true, name: true } });
    if (!academicYear) return res.status(400).json({ success: false, message: 'Invalid academic year' });

    let source: any = req.body;
    let linkedStudent: any = null;
    if (applicantType === 'RETURNING_STUDENT') {
      const studentId = cleanAdmissionText(req.body.studentId, 64);
      linkedStudent = studentId ? await prisma.student.findFirst({ where: { id: studentId, schoolId, isAccountActive: true } }) : null;
      if (!linkedStudent) return res.status(400).json({ success: false, message: 'Please select an existing student' });
      source = {
        ...req.body,
        firstName: linkedStudent.firstName, lastName: linkedStudent.lastName,
        englishFirstName: linkedStudent.englishFirstName, englishLastName: linkedStudent.englishLastName,
        gender: linkedStudent.gender, dateOfBirth: linkedStudent.dateOfBirth,
        phoneNumber: linkedStudent.phoneNumber, email: linkedStudent.email,
      };
    }
    const firstName = cleanAdmissionText(source.firstName, 100);
    const lastName = cleanAdmissionText(source.lastName, 100);
    const dateOfBirth = cleanAdmissionText(source.dateOfBirth, 30);
    const gender = String(source.gender || '');
    if (!firstName || !lastName || !dateOfBirth || !['MALE', 'FEMALE'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Name, date of birth, and gender are required' });
    }
    if (linkedStudent) {
      const exists = await (prisma as any).admissionApplication.findFirst({ where: { schoolId, academicYearId, studentId: linkedStudent.id } });
      if (exists) return res.status(409).json({ success: false, message: 'This student already has an application for the selected year', data: { applicationId: exists.id } });
    } else {
      const duplicate = await (prisma as any).admissionApplication.findFirst({
        where: { schoolId, academicYearId, firstName: { equals: firstName, mode: 'insensitive' }, lastName: { equals: lastName, mode: 'insensitive' }, dateOfBirth, status: { notIn: ['REJECTED', 'WITHDRAWN'] } },
        select: { id: true, applicationNumber: true },
      });
      if (duplicate) return res.status(409).json({ success: false, message: 'A matching active application already exists', data: duplicate });
    }
    const targetClassId = cleanAdmissionText(req.body.targetClassId, 64);
    if (targetClassId) {
      const targetClass = await prisma.class.findFirst({ where: { id: targetClassId, schoolId, academicYearId } });
      if (!targetClass) return res.status(400).json({ success: false, message: 'Target class does not belong to this academic year' });
    }
    const data: any = {
      schoolId, academicYearId, createdById, applicantType, source: 'STAFF_ENTRY',
      applicationNumber: admissionNumber(academicYear.name), status: 'RECEIVED',
      studentId: linkedStudent?.id || null, targetClassId,
      requestedGrade: cleanAdmissionText(req.body.requestedGrade, 30),
      firstName, lastName, gender, dateOfBirth,
      englishFirstName: cleanAdmissionText(source.englishFirstName, 100), englishLastName: cleanAdmissionText(source.englishLastName, 100),
      phoneNumber: cleanAdmissionText(source.phoneNumber, 40), email: cleanAdmissionText(source.email, 160),
      placeOfBirth: cleanAdmissionText(req.body.placeOfBirth, 500), currentAddress: cleanAdmissionText(req.body.currentAddress, 500),
      fatherName: cleanAdmissionText(req.body.fatherName, 150), motherName: cleanAdmissionText(req.body.motherName, 150),
      guardianName: cleanAdmissionText(req.body.guardianName, 150), guardianPhone: cleanAdmissionText(req.body.guardianPhone, 40),
      previousSchool: cleanAdmissionText(req.body.previousSchool, 250), previousGrade: cleanAdmissionText(req.body.previousGrade, 30),
      notes: cleanAdmissionText(req.body.notes, 2000), customFields: req.body.customFields && typeof req.body.customFields === 'object' ? req.body.customFields : undefined,
      events: { create: { actorId: createdById, action: applicantType === 'RETURNING_STUDENT' ? 'RETURNING_APPLICATION_RECEIVED' : 'APPLICATION_RECEIVED', toStatus: 'RECEIVED', notes: cleanAdmissionText(req.body.notes, 2000) } },
    };
    const application = await (prisma as any).admissionApplication.create({ data, include: { academicYear: true, student: true, targetClass: true } });
    res.status(201).json({ success: true, data: { application } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create admission application', details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
});

app.patch('/admissions/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    if (!ADMISSION_REVIEW_ROLES.has(req.user!.role || '')) return res.status(403).json({ success: false, message: 'Admission review permission required' });
    const status = String(req.body.status || '');
    const current = await (prisma as any).admissionApplication.findFirst({ where: { id: req.params.id, schoolId: req.user!.schoolId } });
    if (!current) return res.status(404).json({ success: false, message: 'Application not found' });
    if (!ADMISSION_STATUSES.has(status) || status === 'ENROLLED' || !ADMISSION_TRANSITIONS[current.status]?.has(status)) {
      return res.status(409).json({ success: false, message: `Cannot move application from ${current.status} to ${status}` });
    }
    const notes = cleanAdmissionText(req.body.notes, 2000);
    if (['REJECTED', 'WITHDRAWN'].includes(status) && !notes) return res.status(400).json({ success: false, message: 'A reason is required for this status' });
    const application = await (prisma as any).admissionApplication.update({
      where: { id: current.id },
      data: {
        status, reviewedById: req.user!.id, reviewedAt: new Date(),
        events: { create: { actorId: req.user!.id, action: 'STATUS_CHANGED', fromStatus: current.status, toStatus: status, notes } },
      },
    });
    res.json({ success: true, data: { application } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update application status', details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
});

app.post('/admissions/:id/enroll', async (req: AuthRequest, res: Response) => {
  try {
    if (!ADMISSION_REVIEW_ROLES.has(req.user!.role || '')) return res.status(403).json({ success: false, message: 'Admission enrollment permission required' });
    const schoolId = req.user!.schoolId;
    const application = await (prisma as any).admissionApplication.findFirst({ where: { id: req.params.id, schoolId }, include: { academicYear: true } });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    if (application.applicantType !== 'NEW_STUDENT') return res.status(409).json({ success: false, message: 'Returning students remain linked to promotion/repeat workflow' });
    if (application.status !== 'APPROVED') return res.status(409).json({ success: false, message: 'Only approved applications can be enrolled' });
    const leaveUnassigned = req.body.leaveUnassigned === true;
    const classId = leaveUnassigned ? null : (cleanAdmissionText(req.body.classId, 64) || application.targetClassId);
    let targetClass: any = null;
    if (classId) {
      targetClass = await prisma.class.findFirst({ where: { id: classId, schoolId, academicYearId: application.academicYearId } });
      if (!targetClass) return res.status(400).json({ success: false, message: 'Select a class from the application academic year' });
    }
    const generatedStudentId = await generateStudentId(classId || undefined, schoolId);
    const result = await prisma.$transaction(async (tx: any) => {
      const student = await tx.student.create({ data: {
        schoolId, studentId: generatedStudentId, firstName: application.firstName, lastName: application.lastName,
        englishFirstName: application.englishFirstName, englishLastName: application.englishLastName,
        gender: application.gender, dateOfBirth: application.dateOfBirth, phoneNumber: application.phoneNumber,
        email: application.email, classId: classId || null, entryYear: new Date(application.academicYear.startDate).getFullYear(),
        customFields: { regional: {
          placeOfBirth: application.placeOfBirth, currentAddress: application.currentAddress,
          fatherName: application.fatherName, motherName: application.motherName,
          guardianName: application.guardianName, guardianPhone: application.guardianPhone,
          previousSchool: application.previousSchool, previousGrade: application.previousGrade,
          admissionApplicationNumber: application.applicationNumber,
        } },
      } });
      if (classId) await tx.studentClass.create({ data: { studentId: student.id, classId, academicYearId: application.academicYearId } });
      await tx.school.update({ where: { id: schoolId }, data: { currentStudents: { increment: 1 } } });
      const updatedApplication = await tx.admissionApplication.update({
        where: { id: application.id },
        data: { studentId: student.id, targetClassId: classId || null, status: 'ENROLLED', enrolledAt: new Date(), reviewedById: req.user!.id,
          events: { create: { actorId: req.user!.id, action: 'STUDENT_ENROLLED', fromStatus: 'APPROVED', toStatus: 'ENROLLED', metadata: { studentId: student.id, classId } } },
        },
      });
      return { student, application: updatedApplication };
    });
    cache.clear();
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ success: false, message: 'Student or application data conflicts with an existing record' });
    res.status(500).json({ success: false, message: 'Failed to enroll student', details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
});

// ==========================================

// Lightweight query helpers
// ==========================================
const LIGHTWEIGHT_STUDENT_SELECT = {
  id: true,
  studentId: true,
  firstName: true,
  lastName: true,
  englishFirstName: true,
  englishLastName: true,
  email: true,
  dateOfBirth: true,
  gender: true,
  phoneNumber: true,
  classId: true,
  photoUrl: true,
  isAccountActive: true,
  createdAt: true,
  customFields: true,
} as const;

const ENROLLMENT_ACTIVE_STATUSES = ['ACTIVE', 'INACTIVE'];

function applyStudentSearchFilter(where: any, search?: string) {
  const normalizedSearch = search?.trim().replace(/\s+/g, ' ');
  if (!normalizedSearch || normalizedSearch.length < 2) return;

  const searchTokens = normalizedSearch.split(' ').filter(Boolean).slice(0, 4);
  const isIdentifierLike = /^[\p{L}\p{N}._/@-]+$/u.test(normalizedSearch) && searchTokens.length === 1;
  const tokenFilters = searchTokens.map((token) => ({
    OR: [
      { firstName: { contains: token, mode: 'insensitive' } },
      { lastName: { contains: token, mode: 'insensitive' } },
      { englishFirstName: { contains: token, mode: 'insensitive' } },
      { englishLastName: { contains: token, mode: 'insensitive' } },
      { studentId: { contains: token, mode: 'insensitive' } },
    ],
  }));

  where.OR = [
    ...(isIdentifierLike
      ? [
          { studentId: { startsWith: normalizedSearch, mode: 'insensitive' } },
          { email: { startsWith: normalizedSearch, mode: 'insensitive' } },
          { phoneNumber: { startsWith: normalizedSearch, mode: 'insensitive' } },
        ]
      : []),
    { studentId: { contains: normalizedSearch, mode: 'insensitive' } },
    { email: { contains: normalizedSearch, mode: 'insensitive' } },
    { phoneNumber: { contains: normalizedSearch, mode: 'insensitive' } },
    { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
    { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
    { englishFirstName: { contains: normalizedSearch, mode: 'insensitive' } },
    { englishLastName: { contains: normalizedSearch, mode: 'insensitive' } },
    { AND: tokenFilters },
  ];
}

function getStudentGenderFilter(gender?: string) {
  if (!gender || gender === 'all') return undefined;
  return gender === 'male' ? 'MALE' : 'FEMALE';
}

async function getLightweightStudentsPayload({
  schoolId,
  page,
  limit,
  skip,
  classId,
  gender,
  academicYearId,
  placement,
  search,
}: {
  schoolId: string;
  page: number;
  limit: number;
  skip: number;
  classId?: string;
  gender?: string;
  academicYearId?: string;
  placement?: string;
  search?: string;
}) {
  const normalizedGender = getStudentGenderFilter(gender);
  const normalizedPlacement = placement === 'assigned' || placement === 'unassigned' ? placement : undefined;

  let students: any[] = [];
  let totalCount = 0;
  let assignedCount = 0;
  let unassignedCount = 0;

  if (!academicYearId) {
    const baseWhere: any = { schoolId, isAccountActive: true };
    if (classId && classId !== 'all') {
      baseWhere.classId = classId;
    }
    if (normalizedGender) {
      baseWhere.gender = normalizedGender;
    }
    applyStudentSearchFilter(baseWhere, search);

    const where: any = { ...baseWhere };
    if (normalizedPlacement === 'assigned') where.classId = { not: null };
    if (normalizedPlacement === 'unassigned') where.classId = null;

    [totalCount, students, assignedCount, unassignedCount] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        select: {
          ...LIGHTWEIGHT_STUDENT_SELECT,
          class: {
            select: { id: true, name: true, grade: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.student.count({ where: { ...baseWhere, classId: { not: null } } }),
      prisma.student.count({ where: { ...baseWhere, classId: null } }),
    ]);
  } else {
    const yearClasses = await prisma.class.findMany({
      where: {
        schoolId,
        academicYearId,
        ...(classId && classId !== 'all' ? { id: classId } : {}),
      },
      select: {
        id: true,
        name: true,
        grade: true,
      },
    });

    if (yearClasses.length > 0) {
      const yearClassIds = yearClasses.map((entry) => entry.id);
      const yearScopeFilter = {
        status: { in: ENROLLMENT_ACTIVE_STATUSES },
        classId: { in: yearClassIds },
      };

      const yearWhere: any = {
        schoolId,
        isAccountActive: true,
        studentClasses: {
          some: yearScopeFilter,
        },
      };
      const yearBaseWhere: any = { schoolId, isAccountActive: true };
      if (normalizedGender) {
        yearWhere.gender = normalizedGender;
        yearBaseWhere.gender = normalizedGender;
      }
      applyStudentSearchFilter(yearWhere, search);
      applyStudentSearchFilter(yearBaseWhere, search);

      if (normalizedPlacement === 'unassigned') {
        delete yearWhere.studentClasses;
        yearWhere.NOT = { studentClasses: { some: yearScopeFilter } };
      }

      const assignedWhere = { ...yearBaseWhere, studentClasses: { some: yearScopeFilter } };
      const unassignedWhere = { ...yearBaseWhere, NOT: { studentClasses: { some: yearScopeFilter } } };

      [totalCount, students, assignedCount, unassignedCount] = await Promise.all([
        prisma.student.count({ where: yearWhere }),
        prisma.student.findMany({
          where: yearWhere,
          select: {
            ...LIGHTWEIGHT_STUDENT_SELECT,
            studentClasses: {
              where: yearScopeFilter,
              select: {
                status: true,
                classId: true,
              },
              orderBy: {
                updatedAt: 'desc',
              },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.student.count({ where: assignedWhere }),
        prisma.student.count({ where: unassignedWhere }),
      ]);

      const classById = new Map(
        yearClasses.map((entry) => [
          entry.id,
          {
            id: entry.id,
            name: entry.name,
            grade: entry.grade,
          },
        ])
      );

      students = students.map((student) => {
        const { studentClasses, ...studentWithoutEnrollments } = student as any;
        const currentEnrollment = Array.isArray(studentClasses) ? studentClasses[0] : null;
        return {
          ...studentWithoutEnrollments,
          class: currentEnrollment ? classById.get(currentEnrollment.classId) || null : null,
          enrollmentStatus: currentEnrollment?.status || null,
        };
      });
    }
  }

  const totalPages = Math.ceil(totalCount / limit);
  return {
    success: true,
    data: students,
    summary: {
      total: assignedCount + unassignedCount,
      assigned: assignedCount,
      unassigned: unassignedCount,
    },
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

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
  academicYearId?: string,
  placement?: string,
  search?: string
) {
  try {
    const response = await getLightweightStudentsPayload({
      schoolId,
      page,
      limit,
      skip,
      classId,
      gender,
      academicYearId,
      placement,
      search,
    });

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
    const placement = req.query.placement as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    // Create cache key
    const cacheKey = `students:${schoolId}:${page}:${limit}:${classId || 'all'}:${gender || 'all'}:${academicYearId || 'all'}:${placement || 'all'}:${search || 'all'}`;

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
      refreshCache(cacheKey, schoolId, page, limit, skip, classId, gender, academicYearId, placement, search).catch(console.error);
      return res.json(cached.data);
    }

    const response = await getLightweightStudentsPayload({
      schoolId,
      page,
      limit,
      skip,
      classId,
      gender,
      academicYearId,
      placement,
      search,
    });
    const queryTime = Date.now() - startTime;
    console.log(`⚡ Fetched ${response.data.length} students in ${queryTime}ms`);

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
      select: {
        id: true,
        schoolId: true,
        studentId: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        email: true,
        phoneNumber: true,
        classId: true,
        photoUrl: true,
        isAccountActive: true,
        createdAt: true,
        updatedAt: true,
        customFields: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      } as any,
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
                customFields: true,
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
        khmerName: (sc.student.customFields as any)?.regional?.khmerName || null,
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
        class: {
          include: {
            academicYear: true,
          },
        },
        studentClasses: {
          where: { status: 'ACTIVE' },
          include: {
            class: {
              include: {
                academicYear: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
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
 * POST /students/import
 * Bulk import students using the same payload shape as POST /students.
 */
app.post('/students/import', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const rows = Array.isArray(req.body?.students) ? req.body.students : [];
    const commonClassId = typeof req.body?.classId === 'string' ? req.body.classId.trim() : '';

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'students array is required',
      });
    }

    if (rows.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Import is limited to 500 students per request',
      });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        maxStudents: true,
        idFormat: true,
        idPrefix: true,
        nextStudentNumber: true,
        schoolType: true,
      },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    const currentStudents = await prisma.student.count({ where: { schoolId } });
    if (currentStudents + rows.length > school.maxStudents) {
      return res.status(403).json({
        success: false,
        message: `Adding ${rows.length} students would exceed your limit of ${school.maxStudents}. Please upgrade your subscription.`,
      });
    }

    const validationErrors: Array<{ row: number; message: string }> = [];
    const parsedRows = rows.map((row, index) => {
      const payload = {
        ...row,
        classId: row?.classId ?? (commonClassId || undefined),
      };
      const validationResult = studentPayloadSchema.safeParse(payload);
      if (!validationResult.success) {
        validationErrors.push({
          row: index + 1,
          message: getStudentValidationMessage(validationResult.error),
        });
        return null;
      }

      const data = validationResult.data;
      if (!data.firstName || data.firstName.trim() === '') {
        validationErrors.push({ row: index + 1, message: 'គោត្តនាម (First name) ជាទិន្នន័យចាំបាច់' });
      }
      if (!data.lastName || data.lastName.trim() === '') {
        validationErrors.push({ row: index + 1, message: 'នាម (Last name) ជាទិន្នន័យចាំបាច់' });
      }
      if (!data.khmerName || data.khmerName.trim() === '') {
        validationErrors.push({ row: index + 1, message: 'ឈ្មោះជាអក្សរខ្មែរ (Khmer name) ជាទិន្នន័យចាំបាច់' });
      }
      if (!data.dateOfBirth) {
        validationErrors.push({ row: index + 1, message: 'ថ្ងៃខែឆ្នាំកំណើត (Date of birth) ជាទិន្នន័យចាំបាច់' });
      }
      if (!data.gender || (data.gender !== 'MALE' && data.gender !== 'FEMALE')) {
        validationErrors.push({ row: index + 1, message: 'ភេទត្រូវតែជា MALE ឬ FEMALE' });
      }

      return data;
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Import validation failed',
        errors: validationErrors,
      });
    }

    const classIds = Array.from(
      new Set(parsedRows.map(row => row?.classId?.trim()).filter(Boolean) as string[])
    );
    const classYearById = new Map<string, string | null>();

    if (classIds.length > 0) {
      const classRecords = await prisma.class.findMany({
        where: {
          id: { in: classIds },
          schoolId,
        },
        select: {
          id: true,
          academicYearId: true,
        },
      });

      if (classRecords.length !== classIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more classes were not found in your school',
        });
      }

      classRecords.forEach(classRecord => {
        classYearById.set(classRecord.id, classRecord.academicYearId);
      });
    }

    const importResult = await prisma.$transaction(async (tx) => {
      const updatedSchool = await tx.school.update({
        where: { id: schoolId },
        data: { nextStudentNumber: { increment: parsedRows.length } },
        select: { nextStudentNumber: true },
      });
      const firstSequentialNumber = updatedSchool.nextStudentNumber - parsedRows.length + 1;

      const prepared = parsedRows.map((row, index) => {
        const data = row!;
        const sequentialNumber = firstSequentialNumber + index;
        const assignedClassId = data.classId && data.classId.trim() !== '' ? data.classId : null;
        const studentParams = {
          gender: data.gender as Gender,
          entryYear: new Date().getFullYear(),
          classId: assignedClassId || undefined,
          schoolType: school.schoolType,
        };
        const studentId = IdGenerator.generateStudentId(
          school.idFormat,
          school.idPrefix || '01',
          studentParams,
          sequentialNumber
        );
        const regionalData = collectRegionalFields(
          data as any,
          STUDENT_REGIONAL_KEYS,
          STUDENT_TOP_LEVEL_KEYS
        );
        regionalData.khmerName = data.khmerName?.trim() || null;
        regionalData.englishName = data.englishName?.trim() || [
          data.englishFirstName?.trim(),
          data.englishLastName?.trim(),
        ].filter(Boolean).join(' ') || null;

        return {
          row: index + 1,
          studentId,
          permanentId: IdGenerator.generatePermanentId('STU'),
          studentIdFormat: school.idFormat,
          studentIdMeta: IdGenerator.generateStudentMetadata(
            school.idFormat,
            studentParams,
            sequentialNumber
          ),
          entryYear: new Date().getFullYear(),
          firstName: data.firstName!.trim(),
          lastName: data.lastName!.trim(),
          englishFirstName:
            data.englishFirstName !== undefined
              ? data.englishFirstName?.trim() || null
              : data.englishName?.trim()
                ? data.englishName.trim().split(/\s+/)[0] || null
                : null,
          englishLastName:
            data.englishLastName !== undefined
              ? data.englishLastName?.trim() || null
              : data.englishName?.trim()
                ? data.englishName.trim().split(/\s+/).slice(1).join(' ') || null
                : null,
          email:
            data.email && data.email.trim() !== ''
              ? data.email.trim()
              : `${studentId}@student.edu.kh`,
          dateOfBirth: data.dateOfBirth!,
          gender: data.gender as Gender,
          phoneNumber: data.phoneNumber?.trim() || null,
          classId: assignedClassId,
          customFields: {
            regional: regionalData,
          },
        };
      });

      const createdStudents = await tx.student.createManyAndReturn({
        data: prepared.map(({ row, ...student }) => ({
          schoolId,
          ...student,
        })),
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          classId: true,
          customFields: true,
        },
      });

      const createdByStudentId = new Map(createdStudents.map(student => [student.studentId, student]));
      const enrollmentRows = prepared
        .map(student => {
          if (!student.classId) return null;
          const createdStudent = createdByStudentId.get(student.studentId);
          const academicYearId = classYearById.get(student.classId);
          if (!createdStudent || !academicYearId) return null;
          return {
            studentId: createdStudent.id,
            classId: student.classId,
            academicYearId,
            status: 'ACTIVE',
          };
        })
        .filter(Boolean) as Array<{ studentId: string; classId: string; academicYearId: string; status: string }>;

      if (enrollmentRows.length > 0) {
        await tx.studentClass.createMany({
          data: enrollmentRows,
          skipDuplicates: true,
        });
      }

      await tx.school.update({
        where: { id: schoolId },
        data: { currentStudents: { increment: createdStudents.length } },
      });

      await tx.idGenerationLog.createMany({
        data: prepared.map(student => ({
          schoolId,
          entityType: 'STUDENT',
          entityId: createdByStudentId.get(student.studentId)?.id || '',
          generatedId: student.studentId,
          format: school.idFormat,
          metadata: student.studentIdMeta,
        })),
      });

      return {
        students: createdStudents,
        assignedCount: enrollmentRows.length,
      };
    });

    res.status(201).json({
      success: true,
      message: `Imported ${importResult.students.length} students`,
      data: {
        students: importResult.students,
        count: importResult.students.length,
        assignedCount: importResult.assignedCount,
      },
    });
  } catch (error: any) {
    console.error('Bulk import students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import students',
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

    const validationResult = studentPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: getStudentValidationMessage(validationResult.error),
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      englishFirstName,
      englishLastName,
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
    } = validationResult.data;

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

    const regionalData = collectRegionalFields(
      validationResult.data as any,
      [
        'khmerName', 'englishName', 'placeOfBirth', 'currentAddress',
        'fatherName', 'motherName', 'parentPhone', 'parentOccupation',
        'previousGrade', 'previousSchool', 'repeatingGrade', 'transferredFrom',
        'grade9ExamSession', 'grade9ExamCenter', 'grade9ExamRoom', 'grade9ExamDesk', 'grade9PassStatus',
        'grade12ExamSession', 'grade12ExamCenter', 'grade12ExamRoom', 'grade12ExamDesk', 'grade12PassStatus',
        'grade12Track', 'remarks',
      ],
      [
        'firstName', 'lastName', 'englishFirstName', 'englishLastName',
        'email', 'dateOfBirth', 'gender', 'phoneNumber', 'classId',
        'photoUrl', 'isAccountActive',
      ]
    );
    regionalData.khmerName = khmerName?.trim() || null;
    regionalData.englishName = englishName?.trim() || [
      englishFirstName?.trim(),
      englishLastName?.trim(),
    ].filter(Boolean).join(' ') || null;

    const studentData: any = {
      schoolId, // Multi-tenant
      studentId,
      permanentId,
      studentIdFormat: schoolConfig.idFormat,
      studentIdMeta,
      entryYear: new Date().getFullYear(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      englishFirstName:
        englishFirstName !== undefined
          ? englishFirstName?.trim() || null
          : englishName?.trim()
            ? englishName.trim().split(/\s+/)[0] || null
            : null,
      englishLastName:
        englishLastName !== undefined
          ? englishLastName?.trim() || null
          : englishName?.trim()
            ? englishName.trim().split(/\s+/).slice(1).join(' ') || null
            : null,
      email: studentEmail,
      dateOfBirth,
      gender: gender as Gender,
      phoneNumber: phoneNumber?.trim() || null,
      classId: (classId && classId.trim() !== "") ? classId : null,
      customFields: {
        regional: regionalData
      }
    };

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

    if (student.classId) {
      await ensureStudentClassEnrollment(student.id, student.classId, schoolId);
    }

    // Update school's current student count
    await prisma.school.update({
      where: { id: schoolId },
      data: { currentStudents: { increment: 1 } },
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
    console.log(`   Name: ${(student.customFields as any)?.regional?.khmerName || student.firstName}`);
    console.log(`   School: ${schoolId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    cache.clear();

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
            gender,
            dateOfBirth,
            classId,
            customFields: {
              regional: {
                khmerName: fullName,
                parentOccupation: "កសិករ",
              }
            }
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
          name: (newStudent.customFields as any)?.regional?.khmerName || fullName,
        });

        console.log(`  ✅ Row ${rowNumber}: ${(newStudent.customFields as any)?.regional?.khmerName || newStudent.firstName} (${newStudent.studentId})`);
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
      data: { currentStudents: { increment: results.success.length } },
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

    const validationResult = studentPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: getStudentValidationMessage(validationResult.error),
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      englishFirstName,
      englishLastName,
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
    } = validationResult.data;

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

    const regionalData = collectRegionalFields(
      validationResult.data as any,
      [
        'khmerName', 'englishName', 'placeOfBirth', 'currentAddress',
        'fatherName', 'motherName', 'parentPhone', 'parentOccupation',
        'previousGrade', 'previousSchool', 'repeatingGrade', 'transferredFrom',
        'grade9ExamSession', 'grade9ExamCenter', 'grade9ExamRoom', 'grade9ExamDesk', 'grade9PassStatus',
        'grade12ExamSession', 'grade12ExamCenter', 'grade12ExamRoom', 'grade12ExamDesk', 'grade12PassStatus',
        'grade12Track', 'remarks',
      ],
      [
        'firstName', 'lastName', 'englishFirstName', 'englishLastName',
        'gender', 'dateOfBirth', 'phoneNumber', 'email', 'classId',
        'photoUrl', 'isAccountActive',
      ]
    );

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (englishFirstName !== undefined) {
      updateData.englishFirstName = englishFirstName?.trim() === "" ? null : englishFirstName?.trim();
    } else if (englishName !== undefined) {
      updateData.englishFirstName = englishName?.trim()
        ? englishName.trim().split(/\s+/)[0] || null
        : null;
    }
    if (englishLastName !== undefined) {
      updateData.englishLastName = englishLastName?.trim() === "" ? null : englishLastName?.trim();
    } else if (englishName !== undefined) {
      updateData.englishLastName = englishName?.trim()
        ? englishName.trim().split(/\s+/).slice(1).join(' ') || null
        : null;
    }
    if (englishFirstName !== undefined || englishLastName !== undefined) {
      regionalData.englishName = [
        englishFirstName?.trim(),
        englishLastName?.trim(),
      ].filter(Boolean).join(' ') || null;
    }
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (email !== undefined) updateData.email = email?.trim() === "" ? null : email?.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber?.trim() === "" ? null : phoneNumber?.trim();
    if (classId !== undefined) updateData.classId = classId?.trim() === "" ? null : classId?.trim();
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl?.trim() === "" ? null : photoUrl?.trim();

    // Add regional fields to customFields
    if (Object.keys(regionalData).length > 0) {
      const existingCustomFields =
        existingStudent.customFields && typeof existingStudent.customFields === 'object' && !Array.isArray(existingStudent.customFields)
          ? existingStudent.customFields as any
          : {};
      updateData.customFields = {
        ...existingCustomFields,
        regional: {
          ...(existingCustomFields.regional || {}),
          ...regionalData,
        },
      };
    }

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
    cache.clear();

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

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: {
          isAccountActive: false,
          accountDeactivatedAt: new Date(),
          deactivationReason: 'Archived from student directory',
          classId: null,
        },
      });

      await tx.studentClass.updateMany({
        where: {
          studentId: id,
          status: { in: ENROLLMENT_ACTIVE_STATUSES },
        },
        data: { status: 'DROPPED' },
      });

      const currentCount = await tx.student.count({
        where: { schoolId, isAccountActive: true },
      });

      await tx.school.update({
        where: { id: schoolId },
        data: { currentStudents: currentCount },
      });
    });
    cache.clear();

    res.json({
      success: true,
      message: "បានរក្សាទុកសិស្សជាបណ្ណសារ (Student archived successfully)",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការលុបសិស្ស (Error deleting student)",
      error: error.message,
    });
  }
});

// POST /students/reassign - Atomically move one or more students into a class
app.post('/students/reassign', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const { studentId, studentIds, targetClassId } = req.body || {};
    const ids = Array.isArray(studentIds)
      ? studentIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : (typeof studentId === 'string' && studentId.trim() ? [studentId] : []);

    if (ids.length === 0 || typeof targetClassId !== 'string' || !targetClassId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'studentId/studentIds and targetClassId are required',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const targetClass = await tx.class.findFirst({
        where: { id: targetClassId, schoolId },
        select: { id: true, name: true, grade: true, academicYearId: true },
      });

      if (!targetClass) {
        throw new Error('Target class not found in your school');
      }

      const students = await tx.student.findMany({
        where: { id: { in: ids }, schoolId, isAccountActive: true },
        select: { id: true },
      });
      const validIds = students.map((student) => student.id);

      if (validIds.length !== ids.length) {
        throw new Error('One or more students were not found in your school');
      }

      await tx.studentClass.updateMany({
        where: {
          studentId: { in: validIds },
          status: { in: ENROLLMENT_ACTIVE_STATUSES },
          OR: [
            { academicYearId: targetClass.academicYearId },
            { class: { academicYearId: targetClass.academicYearId } },
          ],
        },
        data: { status: 'DROPPED' },
      });

      for (const id of validIds) {
        await tx.studentClass.upsert({
          where: {
            studentId_classId_academicYearId: {
              studentId: id,
              classId: targetClass.id,
              academicYearId: targetClass.academicYearId,
            },
          },
          update: { status: 'ACTIVE' },
          create: {
            studentId: id,
            classId: targetClass.id,
            academicYearId: targetClass.academicYearId,
            status: 'ACTIVE',
          },
        });
      }

      await tx.student.updateMany({
        where: { id: { in: validIds }, schoolId },
        data: { classId: targetClass.id },
      });

      await (tx as any).admissionApplication.updateMany({
        where: {
          schoolId,
          academicYearId: targetClass.academicYearId,
          studentId: { in: validIds },
          status: 'ENROLLED',
        },
        data: { targetClassId: targetClass.id },
      });

      return {
        assigned: validIds.length,
        class: targetClass,
      };
    });

    cache.clear();
    res.json({ success: true, data: result, message: 'Students reassigned successfully' });
  } catch (error: any) {
    console.error('Student reassignment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reassign students',
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
                customFields: true,
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
            khmer: (sc.student.customFields as any)?.regional?.khmerName || null,
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

    // Batch validation - fetch all required data in parallel
    const studentIds = promotions.map((p: any) => p.studentId);
    const fromClassIds = Array.from(new Set(promotions.map((p: any) => p.fromClassId)));

    const [sourceEnrollments, existingProgressions] = await Promise.all([
      prisma.studentClass.findMany({
        where: {
          studentId: { in: studentIds },
          classId: { in: fromClassIds },
          status: 'ACTIVE',
        },
        select: { studentId: true, classId: true },
      }),
      prisma.studentProgression.findMany({
        where: {
          studentId: { in: studentIds },
          fromAcademicYearId,
          toAcademicYearId,
        },
        select: { studentId: true },
      }),
    ]);

    const sourceSet = new Set(sourceEnrollments.map((e) => `${e.studentId}:${e.classId}`));
    const alreadyPromotedSet = new Set(existingProgressions.map((p) => p.studentId));

    // Build valid promotions list
    const validPromotions: Array<{ studentId: string; fromClassId: string; toClassId: string }> = [];
    for (const promo of promotions) {
      const { studentId, fromClassId, toClassId } = promo;
      if (!sourceSet.has(`${studentId}:${fromClassId}`)) {
        results.failed.push({ studentId, reason: 'Student not found in source class' });
        continue;
      }
      if (alreadyPromotedSet.has(studentId)) {
        results.failed.push({ studentId, reason: 'Already promoted to this academic year' });
        continue;
      }
      validPromotions.push({ studentId, fromClassId, toClassId });
    }

    const promotionDate = new Date();

    // Single transaction - batch create progressions and class enrollments
    if (validPromotions.length > 0) {
      await prisma.$transaction(
        async (tx) => {
          await tx.studentProgression.createMany({
            data: validPromotions.map((p) => ({
              studentId: p.studentId,
              fromAcademicYearId,
              toAcademicYearId,
              fromClassId: p.fromClassId,
              toClassId: p.toClassId,
              promotionType: 'AUTOMATIC',
              promotionDate,
              promotedBy: userId,
            })),
            skipDuplicates: true,
          });

          await tx.studentClass.createMany({
            data: validPromotions.map((p) => ({
              studentId: p.studentId,
              classId: p.toClassId,
              academicYearId: toAcademicYearId,
              enrolledAt: promotionDate,
              status: 'ACTIVE',
            })),
            skipDuplicates: true,
          });
        },
        { maxWait: 30000, timeout: 60000 }
      );

      for (const p of validPromotions) {
        results.successful.push({ studentId: p.studentId, fromClassId: p.fromClassId, toClassId: p.toClassId });
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
      include: {
        studentClasses: {
          include: {
            class: {
              include: { academicYear: true },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        StudentProgression: {
          include: {
            fromAcademicYear: {
              select: { id: true, name: true, startDate: true, endDate: true },
            },
            toAcademicYear: {
              select: { id: true, name: true, startDate: true, endDate: true },
            },
            fromClass: {
              select: { id: true, name: true, grade: true, section: true },
            },
            toClass: {
              select: { id: true, name: true, grade: true, section: true },
            },
          },
          orderBy: { promotionDate: 'asc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const progressions = student.StudentProgression;

    const currentEnrollment =
      student.studentClasses.find((enrollment) => enrollment.status === 'ACTIVE' && enrollment.class.academicYear?.status === 'ACTIVE') ||
      student.studentClasses.find((enrollment) => enrollment.status === 'ACTIVE') ||
      student.studentClasses[0] ||
      null;

    // Historical imports can leave two StudentClass rows for the same
    // placement (most commonly one row with academicYearId and one without).
    // Present one authoritative placement and prefer the active row so the
    // student timeline does not imply that they enrolled twice.
    const uniqueClassEnrollments = Array.from(
      student.studentClasses.reduce((placements, enrollment) => {
        const academicYearId = enrollment.class.academicYear?.id || enrollment.academicYearId || 'unknown';
        const placementKey = `${enrollment.classId}:${academicYearId}`;
        const existing = placements.get(placementKey);

        if (!existing || (existing.status !== 'ACTIVE' && enrollment.status === 'ACTIVE')) {
          placements.set(placementKey, enrollment);
        }

        return placements;
      }, new Map<string, (typeof student.studentClasses)[number]>()).values()
    );

    const classHistory = uniqueClassEnrollments.map((enrollment) => ({
      id: enrollment.id,
      academicYear: enrollment.class.academicYear
        ? {
            id: enrollment.class.academicYear.id,
            name: enrollment.class.academicYear.name,
            status: enrollment.class.academicYear.status,
          }
        : {
            id: enrollment.academicYearId || '',
            name: 'Unknown academic year',
            status: 'UNKNOWN',
          },
      class: {
        id: enrollment.class.id,
        name: enrollment.class.name,
        grade: enrollment.class.grade,
        section: enrollment.class.section,
      },
      enrolledAt: enrollment.enrolledAt,
      status: enrollment.status,
    }));

    const progressionItems = progressions.map((progression) => ({
      ...progression,
      fromYear: progression.fromAcademicYear,
      toYear: progression.toAcademicYear,
    }));

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          name: `${student.firstName} ${student.lastName}`.trim(),
          khmerName: (student.customFields as any)?.regional?.khmerName || null,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          photoUrl: student.photoUrl,
          currentClass: currentEnrollment
            ? {
                id: currentEnrollment.class.id,
                name: currentEnrollment.class.name,
                grade: currentEnrollment.class.grade,
              }
            : null,
          currentYear: currentEnrollment?.class.academicYear
            ? {
                id: currentEnrollment.class.academicYear.id,
                name: currentEnrollment.class.academicYear.name,
              }
            : null,
        },
        progressions: progressionItems,
        classHistory,
        summary: {
          totalYears: new Set(
            uniqueClassEnrollments
              .map((enrollment) => enrollment.class.academicYear?.id || enrollment.academicYearId)
              .filter(Boolean)
          ).size,
          totalProgressions: progressions.length,
          currentGrade: currentEnrollment?.class.grade || null,
          firstEnrolledYear: classHistory.length > 0
            ? classHistory[classHistory.length - 1].academicYear.name
            : null,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching progression history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progression history',
      ...(process.env.NODE_ENV !== 'production' ? { error: error.message } : {}),
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

    cache.clear();
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

    const classIds = [...new Set(student.studentClasses.map((sc) => sc.classId))];
    const [grades, monthlySummaries, attendanceRows, officialDocuments] = await Promise.all([
      prisma.grade.findMany({
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
      }),
      prisma.studentMonthlySummary.findMany({
        where: { studentId: id },
        orderBy: [
          { year: 'desc' },
          { monthNumber: 'desc' }
        ]
      }),
      classIds.length > 0
        ? prisma.attendance.findMany({
            where: { studentId: id, classId: { in: classIds } },
            select: { classId: true, status: true },
          })
        : Promise.resolve([]),
      (prisma as any).studentTranscriptDocument?.findMany
        ? (prisma as any).studentTranscriptDocument.findMany({
            where: { studentId: id, schoolId, status: { not: 'REVOKED' } },
            orderBy: { issuedAt: 'desc' },
            select: {
              id: true,
              academicYearId: true,
              status: true,
              documentNumber: true,
              verificationCode: true,
              snapshotChecksum: true,
              formulaVersion: true,
              approvedAt: true,
              issuedAt: true,
              approvedById: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const latestOfficialByYear = new Map<string, any>();
    (officialDocuments as any[]).forEach((document) => {
      if (!latestOfficialByYear.has(document.academicYearId)) {
        latestOfficialByYear.set(document.academicYearId, {
          status: document.status,
          isOfficial: document.status === 'OFFICIAL',
          documentNumber: document.documentNumber,
          verificationCode: document.verificationCode,
          snapshotChecksum: document.snapshotChecksum,
          formulaVersion: document.formulaVersion,
          approvedAt: document.approvedAt,
          approvedById: document.approvedById,
          issuedAt: document.issuedAt,
          generatedAt: document.issuedAt,
        });
      }
    });

    const attendanceByClass: Record<string, { total: number; present: number; absent: number; late: number; excused: number; rate: number }> = {};
    classIds.forEach((classId) => {
      attendanceByClass[classId] = { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 };
    });
    attendanceRows.forEach((attendance) => {
      if (!attendance.classId || !attendanceByClass[attendance.classId]) return;
      const bucket = attendanceByClass[attendance.classId];
      bucket.total += 1;
      if (attendance.status === 'PRESENT') bucket.present += 1;
      if (attendance.status === 'ABSENT') bucket.absent += 1;
      if (attendance.status === 'LATE') bucket.late += 1;
      if (attendance.status === 'EXCUSED' || attendance.status === 'PERMISSION') bucket.excused += 1;
    });
    Object.values(attendanceByClass).forEach((bucket) => {
      bucket.rate = bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : 0;
    });

    // Group grades by academic year
    const gradesByYear: Record<string, any> = {};
    student.studentClasses.forEach((enrollment) => {
      const academicYear = enrollment.class?.academicYear;
      if (!academicYear || gradesByYear[academicYear.id]) return;
      gradesByYear[academicYear.id] = {
        yearId: academicYear.id,
        yearName: academicYear.name,
        classId: enrollment.classId,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate,
        className: enrollment.class?.name,
        gradeLevel: enrollment.class?.grade,
        subjects: {},
      };
    });
    const normalizeSubjectIdentity = (value?: string | null) => value
      ?.normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase();

    grades.forEach((grade: any) => {
      const yearId = grade.class?.academicYear?.id || 'unknown';
      const yearName = grade.class?.academicYear?.name || 'Unknown Year';

      if (!gradesByYear[yearId]) {
        gradesByYear[yearId] = {
          yearId,
          yearName,
          classId: grade.classId,
          startDate: grade.class?.academicYear?.startDate,
          endDate: grade.class?.academicYear?.endDate,
          className: grade.class?.name,
          gradeLevel: grade.class?.grade,
          subjects: {},
        };
      }

      const subjectKey = normalizeSubjectIdentity(grade.subject?.nameKh)
        || normalizeSubjectIdentity(grade.subject?.code)
        || normalizeSubjectIdentity(grade.subject?.name)
        || grade.subjectId;

      if (!gradesByYear[yearId].subjects[subjectKey]) {
        gradesByYear[yearId].subjects[subjectKey] = {
          subjectId: grade.subjectId,
          subjectName: grade.subject?.name,
          subjectNameKh: grade.subject?.nameKh || null,
          subjectCode: grade.subject?.code,
          grades: [],
        };
      }

      const subjectGrades = gradesByYear[yearId].subjects[subjectKey].grades;
      const assessmentKey = `${grade.year ?? 'unknown'}:${grade.monthNumber ?? normalizeSubjectIdentity(grade.month) ?? grade.id}`;
      const duplicateIndex = subjectGrades.findIndex((item: any) => item.assessmentKey === assessmentKey);
      const gradeItem = {
        id: grade.id,
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: grade.percentage,
        month: grade.month,
        monthNumber: grade.monthNumber,
        year: grade.year,
        remarks: grade.remarks,
        assessmentKey,
        updatedAt: grade.updatedAt,
      };

      if (duplicateIndex === -1) {
        subjectGrades.push(gradeItem);
      } else if (new Date(grade.updatedAt).getTime() > new Date(subjectGrades[duplicateIndex].updatedAt).getTime()) {
        subjectGrades[duplicateIndex] = gradeItem;
      }
    });

    // Calculate yearly averages
    Object.keys(gradesByYear).forEach(yearId => {
      const yearData = gradesByYear[yearId];
      const subjects = Object.values(yearData.subjects) as any[];

      let totalAvg = 0;
      let subjectCount = 0;

      subjects.forEach((subject: any) => {
        const subjectGrades = subject.grades;
        const percentages = subjectGrades
          .map((grade: any) => {
            if (Number.isFinite(grade.percentage)) return grade.percentage;
            if (Number.isFinite(grade.score) && Number.isFinite(grade.maxScore) && grade.maxScore > 0) {
              return (grade.score / grade.maxScore) * 100;
            }
            return null;
          })
          .filter((percentage: number | null): percentage is number => percentage !== null);
        if (percentages.length > 0) {
          const avg = percentages.reduce((sum: number, percentage: number) => sum + percentage, 0) / percentages.length;
          subject.average = Math.round(avg * 100) / 100;
          subject.letterGrade = getLetterGrade(avg);
          totalAvg += avg;
          subjectCount++;
        }


        subject.grades = subjectGrades.map(({ assessmentKey, updatedAt, ...gradeItem }: any) => gradeItem);
      });

      yearData.overallAverage = subjectCount > 0 ? Math.round((totalAvg / subjectCount) * 100) / 100 : null;
      yearData.overallGrade = yearData.overallAverage !== null ? getLetterGrade(yearData.overallAverage) : null;
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
      if (typeof year.overallAverage === 'number' && Number.isFinite(year.overallAverage)) {
        overallGPA += year.overallAverage;
        gpaCount++;
      }
    });

    const currentEnrollment =
      student.studentClasses.find((enrollment) => enrollment.status === 'ACTIVE' && enrollment.class.academicYear?.status === 'ACTIVE') ||
      student.studentClasses.find((enrollment) => enrollment.status === 'ACTIVE') ||
      student.studentClasses[0] ||
      null;

    // Build transcript response
    const transcript = {
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        englishFirstName: student.englishFirstName,
        englishLastName: student.englishLastName,
        khmerName: (student.customFields as any)?.regional?.khmerName || null,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        photo: student.photoUrl,
        enrolledAt: student.createdAt,
        status: student.isAccountActive ? 'ACTIVE' : 'INACTIVE',
      },
      summary: {
        totalYears,
        currentClass: currentEnrollment?.class?.name || null,
        currentGrade: currentEnrollment?.class?.grade || null,
        cumulativeAverage: gpaCount > 0 ? Math.round((overallGPA / gpaCount) * 100) / 100 : null,
        cumulativeGrade: gpaCount > 0 ? getLetterGrade(overallGPA / gpaCount) : null,
        promotions: automaticPromoCount + manualPromoCount,
        repeats: repeatCount,
        totalProgressions: progressions.length,
      },
      academicYears: Object.values(gradesByYear).map((year: any) => ({
        ...year,
        subjects: Object.values(year.subjects),
        classId: student.studentClasses.find((sc) =>
          sc.class?.academicYearId === year.yearId)?.classId || year.classId || null,
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
        classId: ms.classId,
        totalScore: ms.totalScore,
        totalMaxScore: ms.totalMaxScore,
        average: ms.average,
        classRank: ms.classRank,
        gradeLevel: ms.gradeLevel,
      })),
      documentMetaByYear: Object.fromEntries(latestOfficialByYear),
      documentMeta: {
        status: officialDocuments.length > 0 ? 'OFFICIAL' : 'DRAFT',
        isOfficial: officialDocuments.length > 0,
        generatedAt: new Date().toISOString(),
        formulaVersion: TRANSCRIPT_FORMULA_VERSION,
        hasGrades: grades.length > 0,
        hasAttendance: attendanceRows.length > 0,
      },
    };

    res.json({ success: true, data: transcript });

  } catch (error: any) {
    console.error('Transcript error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student transcript',
      ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {}),
    });
  }
});

// POST /students/:id/transcript/issue - Lock an official transcript record
app.post('/students/:id/transcript/issue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    const userId = req.user?.id;
    const role = req.user?.role || '';
    const academicYearId = String(req.body?.academicYearId || '');

    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, error: 'School ID required' });
    }
    if (!TRANSCRIPT_ISSUER_ROLES.has(role)) {
      return res.status(403).json({ success: false, error: 'Administrator access required to issue official transcripts' });
    }
    if (!academicYearId) {
      return res.status(400).json({ success: false, error: 'Academic year is required' });
    }
    if (!(prisma as any).studentTranscriptDocument?.create) {
      return res.status(501).json({ success: false, error: 'Transcript issuance storage is not available. Apply the latest database migration first.' });
    }

    const existingOfficial = await (prisma as any).studentTranscriptDocument.findFirst({
      where: { schoolId, studentId: id, academicYearId, status: 'OFFICIAL' },
      select: { documentNumber: true, verificationCode: true, issuedAt: true },
    });
    if (existingOfficial) {
      return res.status(409).json({
        success: false,
        error: 'An official transcript already exists for this academic year. Revoke it before issuing a replacement.',
        data: existingOfficial,
      });
    }

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        englishFirstName: true,
        englishLastName: true,
        dateOfBirth: true,
        gender: true,
        customFields: true,
        studentClasses: {
          where: { OR: [{ academicYearId }, { class: { academicYearId } }] },
          select: {
            classId: true,
            status: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
                academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const enrollment = student.studentClasses.find((item) => item.status === 'ACTIVE') || student.studentClasses[0];
    if (!enrollment?.class?.academicYear) {
      return res.status(404).json({ success: false, error: 'Academic year enrollment not found for this student' });
    }

    const [grades, monthlySummaries, attendanceRows, existingCount] = await Promise.all([
      prisma.grade.findMany({
        where: { studentId: id, class: { academicYearId } },
        include: { subject: true },
        orderBy: [{ year: 'asc' }, { monthNumber: 'asc' }, { subjectId: 'asc' }],
      }),
      prisma.studentMonthlySummary.findMany({
        where: { studentId: id, classId: enrollment.classId },
        orderBy: [{ year: 'asc' }, { monthNumber: 'asc' }],
      }),
      prisma.attendance.findMany({
        where: { studentId: id, classId: enrollment.classId },
        select: { date: true, status: true, session: true },
        orderBy: { date: 'asc' },
      }),
      (prisma as any).studentTranscriptDocument.count({ where: { schoolId } }),
    ]);

    if (grades.length === 0) {
      return res.status(409).json({ success: false, error: 'Cannot issue an official transcript before grades are recorded for this academic year' });
    }

    const snapshotData = stableJson({
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        englishFirstName: student.englishFirstName,
        englishLastName: student.englishLastName,
        khmerName: (student.customFields as any)?.regional?.khmerName || null,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
      },
      academicYear: enrollment.class.academicYear,
      class: { id: enrollment.class.id, name: enrollment.class.name, grade: enrollment.class.grade },
      gradeRecords: grades.map((grade: any) => ({
        id: grade.id,
        subjectId: grade.subjectId,
        subjectCode: grade.subject?.code,
        subjectName: grade.subject?.name,
        subjectNameKh: grade.subject?.nameKh,
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: grade.percentage,
        month: grade.month,
        monthNumber: grade.monthNumber,
        year: grade.year,
        updatedAt: grade.updatedAt,
      })),
      monthlySummaries: monthlySummaries.map((summary) => ({
        month: summary.month,
        monthNumber: summary.monthNumber,
        year: summary.year,
        totalScore: summary.totalScore,
        totalMaxScore: summary.totalMaxScore,
        average: summary.average,
        classRank: summary.classRank,
        gradeLevel: summary.gradeLevel,
        updatedAt: summary.updatedAt,
      })),
      attendance: attendanceRows,
      formulaVersion: TRANSCRIPT_FORMULA_VERSION,
    });

    const issuedDocument = await (prisma as any).studentTranscriptDocument.create({
      data: {
        schoolId,
        studentId: id,
        academicYearId,
        status: 'OFFICIAL',
        documentNumber: createTranscriptDocumentNumber(schoolId, enrollment.class.academicYear.name, existingCount + 1),
        verificationCode: createTranscriptVerificationCode(),
        snapshotChecksum: createTranscriptChecksum(snapshotData),
        snapshotData,
        formulaVersion: TRANSCRIPT_FORMULA_VERSION,
        approvedById: userId,
        approvedAt: new Date(),
      },
      select: {
        id: true,
        academicYearId: true,
        status: true,
        documentNumber: true,
        verificationCode: true,
        snapshotChecksum: true,
        formulaVersion: true,
        approvedAt: true,
        issuedAt: true,
        approvedById: true,
      },
    });

    cache.clear();
    res.status(201).json({ success: true, data: issuedDocument });
  } catch (error: any) {
    console.error('Issue transcript error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to issue official transcript',
      ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {}),
    });
  }
});

// POST /students/:id/transcript/revoke - Revoke the active official transcript
app.post('/students/:id/transcript/revoke', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    const userId = req.user?.id;
    const role = req.user?.role || '';
    const academicYearId = String(req.body?.academicYearId || '');
    const reason = String(req.body?.reason || '').trim();

    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, error: 'School ID required' });
    }
    if (!TRANSCRIPT_ISSUER_ROLES.has(role)) {
      return res.status(403).json({ success: false, error: 'Administrator access required to revoke official transcripts' });
    }
    if (!academicYearId) {
      return res.status(400).json({ success: false, error: 'Academic year is required' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Revocation reason is required' });
    }
    if (!(prisma as any).studentTranscriptDocument?.update) {
      return res.status(501).json({ success: false, error: 'Transcript issuance storage is not available. Apply the latest database migration first.' });
    }

    const existingOfficial = await (prisma as any).studentTranscriptDocument.findFirst({
      where: { schoolId, studentId: id, academicYearId, status: 'OFFICIAL' },
      select: { id: true },
    });
    if (!existingOfficial) {
      return res.status(404).json({ success: false, error: 'No active official transcript found for this academic year' });
    }

    const revokedDocument = await (prisma as any).studentTranscriptDocument.update({
      where: { id: existingOfficial.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedById: userId,
        revocationReason: reason,
      },
      select: {
        id: true,
        academicYearId: true,
        status: true,
        documentNumber: true,
        verificationCode: true,
        revokedAt: true,
        revocationReason: true,
      },
    });

    cache.clear();
    res.json({ success: true, data: revokedDocument });
  } catch (error: any) {
    console.error('Revoke transcript error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke official transcript',
      ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {}),
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
const PORT = process.env.PORT || process.env.STUDENT_SERVICE_PORT || 3003;


export default app;

/**
 * PUT /students/:id/lock
 * Toggle profile lock for a student
 */
app.put('/students/:id/lock', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { id } = req.params;
    const { isProfileLocked } = req.body;
    const schoolId = req.user.schoolId;

    if (typeof isProfileLocked !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isProfileLocked must be a boolean' });
    }

    const existingStudent = await prisma.student.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existingStudent) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const student = await prisma.student.update({
      where: { id },
      data: { isProfileLocked },
    });

    res.json({ success: true, data: student });
  } catch (error: any) {
    console.error('Lock student profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to lock profile' });
  }
});
