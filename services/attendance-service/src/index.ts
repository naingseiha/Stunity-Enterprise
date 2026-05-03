import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient, AttendanceStatus, AttendanceSession } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  endOfDay,
  subMonths,
  isWeekend,
  eachDayOfInterval,
  differenceInDays
} from 'date-fns';
import {
  getTeacherWeeklySchedule,
  buildExpectationsIndex,
  tallyTimetableCompliance,
  utcDateStringToDayOfWeek,
  findAcademicYearForRange,
  teacherHasClassPeriodOnDay,
  teacherTeachesClassSessionOnDate,
  parseYmdUtc,
  serializeWeeklyPattern,
} from './teacherSchedule';

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)

// ✅ Singleton pattern to prevent multiple Prisma instances
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'], // Changed from ['error'] to see more details if needed
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
    console.log('✅ Attendance Service - Database ready');
  } catch (error: any) {
    console.error('⚠️ Attendance Service - Database warmup failed details:', error?.message || error);
    // Log stack trace in dev/debug if needed
    if (process.env.NODE_ENV !== 'production') console.error(error);
  }
};
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000); // Every 4 minutes

const schoolSummaryCache = new Map<string, { data: any; timestamp: number }>();
const SCHOOL_SUMMARY_CACHE_TTL_MS = 60 * 1000;
const schoolLocationsCache = new Map<string, { data: any; timestamp: number }>();
const SCHOOL_LOCATIONS_CACHE_TTL_MS = 5 * 60 * 1000;

function readSchoolSummaryCache(cacheKey: string) {
  const cached = schoolSummaryCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > SCHOOL_SUMMARY_CACHE_TTL_MS) {
    schoolSummaryCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeSchoolSummaryCache(cacheKey: string, data: any) {
  schoolSummaryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearSchoolSummaryCache(schoolId?: string) {
  for (const key of schoolSummaryCache.keys()) {
    if (!schoolId || key.startsWith(`${schoolId}:`)) {
      schoolSummaryCache.delete(key);
    }
  }
}

function readSchoolLocationsCache(cacheKey: string) {
  const cached = schoolLocationsCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > SCHOOL_LOCATIONS_CACHE_TTL_MS) {
    schoolLocationsCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeSchoolLocationsCache(cacheKey: string, data: any) {
  schoolLocationsCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearSchoolLocationsCache(schoolId?: string) {
  for (const key of schoolLocationsCache.keys()) {
    if (!schoolId || key.startsWith(`${schoolId}:`)) {
      schoolLocationsCache.delete(key);
    }
  }
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}

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

// JWT Authentication Middleware with Multi-tenant support
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId: string;
  };
  schoolId?: string;
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
          message: 'School trial has expired',
        });
      }
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };
    req.schoolId = decoded.schoolId;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

/** School-level attendance dashboards, exports — not teachers/students/parents */
const SCHOOL_ATTENDANCE_OPS_ROLES = new Set(['ADMIN', 'STAFF', 'SUPER_ADMIN']);

function requireSchoolAttendanceOpsRole(req: AuthRequest, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (!role || !SCHOOL_ATTENDANCE_OPS_ROLES.has(role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions for this attendance administration resource',
    });
  }
  next();
}

function csvEscape(cell: unknown): string {
  const s = cell === null || cell === undefined ? '' : String(cell);
  if (/["\r\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ========================================
// Notification Helper
// ========================================

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Send notification to parent(s) of a student
const notifyParents = async (studentId: string, type: string, title: string, message: string, link?: string) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/notifications/parent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, type, title, message, link }),
    });
    if (response.ok) {
      const result = await response.json();
      console.log(`📧 Parent notification sent to ${result.parentsNotified} parent(s): ${title}`);
    }
  } catch (error) {
    // Silent fail - parent may not be registered
  }
};

const notifyStudent = async (studentId: string, type: string, title: string, message: string, link?: string) => {
  try {
    await fetch(`${AUTH_SERVICE_URL}/notifications/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, type, title, message, link }),
    });
  } catch (error) {
    // Silent fail
  }
};

// Types
interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface BulkAttendanceRequest {
  classId: string;
  date: string;
  session: AttendanceSession;
  attendance: AttendanceRecord[];
  acknowledgeOffSchedule?: boolean;
}

// Utility Functions
const calculateAttendancePercentage = (present: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
};

const getSchoolDays = (startDate: Date, endDate: Date): number => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => !isWeekend(day)).length;
};

const validateAttendanceStatus = (status: string): boolean => {
  const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'PERMISSION'];
  return validStatuses.includes(status);
};

const validateAttendanceSession = (session: string): session is AttendanceSession => {
  return session === 'MORNING' || session === 'AFTERNOON';
};

/** When `true` (default), teacher check-in/out must match published timetable unless client sends acknowledgeOffSchedule */
const TIMETABLE_ENFORCE_TEACHER = process.env.ATTENDANCE_TIMETABLE_ENFORCE !== '0';

function resolveTeacherLocalDate(req: AuthRequest): string {
  const q = typeof req.query.localDate === 'string' ? req.query.localDate.trim() : '';
  const b =
    typeof (req.body as { localDate?: string } | undefined)?.localDate === 'string'
      ? (req.body as { localDate: string }).localDate.trim()
      : '';
  const raw = (/^\d{4}-\d{2}-\d{2}$/.test(q) && q) || (/^\d{4}-\d{2}-\d{2}$/.test(b) && b) || '';
  if (raw) return raw;
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(n.getUTCDate()).padStart(2, '0')}`;
}

async function verifyTeacherPersonalSessionScheduled(opts: {
  teacherId: string;
  schoolId: string;
  localDateStr: string;
  session: AttendanceSession;
  bypassOffSchedule?: boolean;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  if (!TIMETABLE_ENFORCE_TEACHER || opts.bypassOffSchedule) {
    return { ok: true };
  }

  const d = parseYmdUtc(opts.localDateStr);
  const sched = await getTeacherWeeklySchedule(
    prisma,
    opts.teacherId,
    opts.schoolId,
    d,
    d,
  );

  const dow = utcDateStringToDayOfWeek(opts.localDateStr);
  if (!dow) return { ok: true };

  const usesExplicitTimetable =
    sched.source === 'timetable' &&
    Array.isArray(sched.scheduledWeekdays) &&
    sched.scheduledWeekdays.length > 0;

  if (!usesExplicitTimetable) return { ok: true };

  const p = sched.pattern[dow];
  const allowed =
    opts.session === 'MORNING' ? Boolean(p?.morning) : Boolean(p?.afternoon);

  if (allowed) return { ok: true };

  return {
    ok: false,
    code: 'NOT_ON_TIMETABLE',
    message:
      opts.session === 'MORNING'
        ? 'You have no scheduled morning periods today. Confirm an off-schedule check-in if you are working anyway.'
        : 'You have no scheduled afternoon periods today. Confirm an off-schedule check-in if you are working anyway.',
  };
}

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Attendance Service is running',
    service: 'attendance-service',
    port: process.env.ATTENDANCE_SERVICE_PORT || 3008,
  });
});

// ==================== A. Attendance Marking ====================

// GET /attendance/class/:classId/date/:date - Fetch all students in class with their attendance
app.get('/attendance/class/:classId/date/:date', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, date } = req.params;
    const schoolId = req.schoolId!;

    // Validate class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Parse date
    const targetDate = parseISO(date);
    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(targetDate);

    // Get students via both direct classId and StudentClass junction table
    const [directStudents, enrolledStudents] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId: classId,
          schoolId: schoolId,
        },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
        },
      }),
      prisma.studentClass.findMany({
        where: {
          classId: classId,
          status: 'ACTIVE',
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              schoolId: true,
            },
          },
        },
      }),
    ]);

    // Merge and deduplicate students from both sources
    const studentMap = new Map<string, typeof directStudents[0]>();
    for (const s of directStudents) {
      studentMap.set(s.id, s);
    }
    for (const sc of enrolledStudents) {
      if (sc.student.schoolId === schoolId && !studentMap.has(sc.student.id)) {
        studentMap.set(sc.student.id, {
          id: sc.student.id,
          studentId: sc.student.studentId,
          firstName: sc.student.firstName,
          lastName: sc.student.lastName,
          photoUrl: sc.student.photoUrl,
        });
      }
    }
    const students = Array.from(studentMap.values()).sort((a, b) =>
      a.firstName.localeCompare(b.firstName)
    );

    // Get attendance records for the date
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: classId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Map attendance to students
    const studentsWithAttendance = students.map(student => {
      const morningAttendance = attendanceRecords.find(
        record => record.studentId === student.id && record.session === 'MORNING'
      );
      const afternoonAttendance = attendanceRecords.find(
        record => record.studentId === student.id && record.session === 'AFTERNOON'
      );

      return {
        studentId: student.id,
        studentNumber: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        photo: student.photoUrl,
        morning: morningAttendance ? {
          id: morningAttendance.id,
          status: morningAttendance.status,
          remarks: morningAttendance.remarks,
        } : null,
        afternoon: afternoonAttendance ? {
          id: afternoonAttendance.id,
          status: afternoonAttendance.status,
          remarks: afternoonAttendance.remarks,
        } : null,
      };
    });

    const dateKey = format(targetDate, 'yyyy-MM-dd');
    let timetableContext:
      | {
          teacherTeachingThisClassToday: boolean;
          patternSource: 'timetable' | 'fallback';
          academicYearId: string | null;
          date: string;
        }
      | undefined;

    if (req.user?.role === 'TEACHER') {
      const rosterTeacher = await prisma.teacher.findFirst({
        where: { schoolId, user: { id: req.user!.id } },
        select: { id: true },
      });
      if (rosterTeacher) {
        const tctx = await teacherHasClassPeriodOnDay({
          prisma,
          teacherId: rosterTeacher.id,
          classId,
          schoolId,
          localDateStr: dateKey,
        });
        timetableContext = {
          teacherTeachingThisClassToday: tctx.linkedDay,
          patternSource: tctx.patternSource,
          academicYearId: tctx.academicYearId,
          date: dateKey,
        };
      }
    }

    res.json({
      success: true,
      data: {
        classId,
        date: dateKey,
        students: studentsWithAttendance,
        ...(timetableContext ? { timetableContext } : {}),
      },
    });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message,
    });
  }
});

// POST /attendance/bulk - Bulk upsert attendance records
app.post('/attendance/bulk', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, date, session, attendance }: BulkAttendanceRequest = req.body;
    const schoolId = req.schoolId!;

    // Validation
    if (!classId || !date || !session || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, date, session, attendance',
      });
    }

    if (!validateAttendanceSession(session)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session. Must be MORNING or AFTERNOON',
      });
    }

    // Validate class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Validate all statuses
    for (const record of attendance) {
      if (!validateAttendanceStatus(record.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status: ${record.status}. Must be PRESENT, ABSENT, LATE, EXCUSED, or PERMISSION`,
        });
      }
    }

    // Parse date
    const targetDate = startOfDay(parseISO(date));

    const bulkAckOff = Boolean(
      (req.body as BulkAttendanceRequest).acknowledgeOffSchedule
    );
    if (
      TIMETABLE_ENFORCE_TEACHER &&
      req.user?.role === 'TEACHER' &&
      !bulkAckOff
    ) {
      const rosterTeacher = await prisma.teacher.findFirst({
        where: { schoolId, user: { id: req.user!.id } },
        select: { id: true },
      });
      if (rosterTeacher) {
        const ymd = format(targetDate, 'yyyy-MM-dd');
        const gate = await teacherTeachesClassSessionOnDate({
          prisma,
          teacherId: rosterTeacher.id,
          classId,
          schoolId,
          localDateStr: ymd,
          session,
        });
        if (!gate.allowed && gate.source === 'timetable') {
          return res.status(403).json({
            success: false,
            code: 'NOT_ON_TIMETABLE',
            message:
              'You do not have a scheduled lesson for this class, date, and session. Enable off-schedule acknowledgment to save anyway.',
          });
        }
      }
    }

    // Validate students belong to class (via direct classId or StudentClass junction)
    const studentIds = attendance.map(a => a.studentId);
    const [directStudents2, enrolledStudents2] = await Promise.all([
      prisma.student.findMany({
        where: {
          id: { in: studentIds },
          classId: classId,
          schoolId: schoolId,
        },
        select: { id: true },
      }),
      prisma.studentClass.findMany({
        where: {
          studentId: { in: studentIds },
          classId: classId,
          status: 'ACTIVE',
        },
        select: { studentId: true },
      }),
    ]);
    const validStudentIds = new Set([
      ...directStudents2.map(s => s.id),
      ...enrolledStudents2.map(sc => sc.studentId),
    ]);

    const invalidIds = studentIds.filter(id => !validStudentIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more students do not belong to this class',
      });
    }

    // Bulk upsert using transaction
    let savedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const record of attendance) {
        await tx.attendance.upsert({
          where: {
            studentId_classId_date_session: {
              studentId: record.studentId,
              classId: classId,
              date: targetDate,
              session: session,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks || null,
            updatedAt: new Date(),
          },
          create: {
            studentId: record.studentId,
            classId: classId,
            date: targetDate,
            session: session,
            status: record.status,
            remarks: record.remarks || null,
          },
        });
        savedCount++;
      }
    });

    // Send notifications to parents for absent/late students
    const alertStatuses = ['ABSENT', 'LATE'];
    const alertRecords = attendance.filter(a => alertStatuses.includes(a.status));

    for (const record of alertRecords) {
      const statusText = record.status === 'ABSENT' ? 'absent' : 'late';
      notifyParents(
        record.studentId,
        'ATTENDANCE_MARKED',
        `Attendance Alert: ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        `Your child was marked as ${statusText} on ${format(targetDate, 'MMM dd, yyyy')} (${session})`,
        `/parent/child/${record.studentId}/attendance`
      );
      notifyStudent(
        record.studentId,
        'ATTENDANCE_MARKED',
        `Attendance: ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        `You were marked as ${statusText} on ${format(targetDate, 'MMM dd, yyyy')} (${session})`,
        `/attendance`
      );
    }

    clearSchoolSummaryCache(schoolId);

    res.status(201).json({
      success: true,
      message: 'Attendance saved successfully',
      data: {
        savedCount,
        classId,
        date: format(targetDate, 'yyyy-MM-dd'),
        session,
      },
    });
  } catch (error: any) {
    console.error('Error saving bulk attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save attendance',
      error: error.message,
    });
  }
});

// PUT /attendance/:id - Update single attendance record
app.put('/attendance/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const schoolId = req.schoolId!;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    if (!validateAttendanceStatus(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be PRESENT, ABSENT, LATE, EXCUSED, or PERMISSION',
      });
    }

    // Check if attendance record exists and belongs to school
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        student: {
          select: { schoolId: true },
        },
      },
    });

    if (!existingAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    if (existingAttendance.student.schoolId !== schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update attendance
    const updatedAttendance = await prisma.attendance.update({
      where: { id },
      data: {
        status,
        remarks: remarks || null,
        updatedAt: new Date(),
      },
    });

    clearSchoolSummaryCache(schoolId);

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance',
      error: error.message,
    });
  }
});

// DELETE /attendance/:id - Delete attendance record
app.delete('/attendance/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId!;

    // Check if attendance record exists and belongs to school
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        student: {
          select: { schoolId: true },
        },
      },
    });

    if (!existingAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    if (existingAttendance.student.schoolId !== schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Delete attendance
    await prisma.attendance.delete({
      where: { id },
    });

    clearSchoolSummaryCache(schoolId);

    res.json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance',
      error: error.message,
    });
  }
});

// ==================== B. Grid/Calendar View ====================

// GET /attendance/class/:classId/month/:month/year/:year - Fetch entire month's attendance
app.get('/attendance/class/:classId/month/:month/year/:year', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, month, year } = req.params;
    const schoolId = req.schoolId!;

    // Validate parameters
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month. Must be between 1 and 12',
      });
    }

    if (isNaN(yearNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year',
      });
    }

    // Validate class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Get date range for the month
    const startDate = startOfMonth(new Date(yearNum, monthNum - 1, 1));
    const endDate = endOfMonth(startDate);

    // Get students via both direct classId and StudentClass junction table
    const [directStu, enrolledStu] = await Promise.all([
      prisma.student.findMany({
        where: { classId: classId, schoolId: schoolId },
        select: { id: true, studentId: true, firstName: true, lastName: true, photoUrl: true },
      }),
      prisma.studentClass.findMany({
        where: { classId: classId, status: 'ACTIVE' },
        include: {
          student: {
            select: { id: true, studentId: true, firstName: true, lastName: true, photoUrl: true, schoolId: true },
          },
        },
      }),
    ]);
    const stuMap = new Map<string, typeof directStu[0]>();
    for (const s of directStu) stuMap.set(s.id, s);
    for (const sc of enrolledStu) {
      if (sc.student.schoolId === schoolId && !stuMap.has(sc.student.id)) {
        stuMap.set(sc.student.id, {
          id: sc.student.id,
          studentId: sc.student.studentId,
          firstName: sc.student.firstName,
          lastName: sc.student.lastName,
          photoUrl: sc.student.photoUrl,
        });
      }
    }
    const students = Array.from(stuMap.values()).sort((a, b) =>
      a.firstName.localeCompare(b.firstName)
    );

    // Get all attendance records for the month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: classId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Group attendance by student
    const studentsWithAttendance = students.map(student => {
      // Filter records for this student
      const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);

      // Group by date and session
      const attendanceByDate: { [key: string]: any } = {};
      studentRecords.forEach(record => {
        const dateKey = format(record.date, 'yyyy-MM-dd');
        if (!attendanceByDate[dateKey]) {
          attendanceByDate[dateKey] = {};
        }
        attendanceByDate[dateKey][record.session.toLowerCase()] = {
          id: record.id,
          status: record.status,
          remarks: record.remarks,
        };
      });

      // Calculate totals
      const totals = {
        present: studentRecords.filter(r => r.status === 'PRESENT').length,
        absent: studentRecords.filter(r => r.status === 'ABSENT').length,
        late: studentRecords.filter(r => r.status === 'LATE').length,
        excused: studentRecords.filter(r => r.status === 'EXCUSED').length,
        permission: studentRecords.filter(r => r.status === 'PERMISSION').length,
      };

      return {
        studentId: student.id,
        studentNumber: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        photo: student.photoUrl,
        attendance: attendanceByDate,
        totals,
      };
    });

    res.json({
      success: true,
      data: {
        classId,
        month: monthNum,
        year: yearNum,
        students: studentsWithAttendance,
      },
    });
  } catch (error: any) {
    console.error('Error fetching month attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch month attendance',
      error: error.message,
    });
  }
});

// ==================== C. Statistics ====================

// GET /attendance/student/:studentId - Student attendance records (with startDate/endDate)
app.get('/attendance/student/:studentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    const schoolId = req.schoolId!;

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    let start: Date;
    let end: Date;
    if (startDate && endDate) {
      start = startOfDay(parseISO(startDate as string));
      end = endOfDay(parseISO(endDate as string));
    } else {
      const now = new Date();
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    const data = records.map((r) => ({
      id: r.id,
      date: format(r.date, 'yyyy-MM-dd'),
      status: r.status,
      session: r.session,
      remarks: r.remarks,
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
  }
});

// GET /attendance/student/:studentId/summary - Student attendance summary
app.get('/attendance/student/:studentId/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    const schoolId = req.schoolId!;

    // Validate student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or does not belong to your school',
      });
    }

    // Determine date range (default: current month)
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = startOfDay(parseISO(startDate as string));
      end = endOfDay(parseISO(endDate as string));
    } else {
      const now = new Date();
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: studentId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate totals
    const totals = {
      present: attendanceRecords.filter(r => r.status === 'PRESENT').length,
      absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
      late: attendanceRecords.filter(r => r.status === 'LATE').length,
      excused: attendanceRecords.filter(r => r.status === 'EXCUSED').length,
      permission: attendanceRecords.filter(r => r.status === 'PERMISSION').length,
    };

    // Calculate school days
    const totalSchoolDays = getSchoolDays(start, end);
    const totalSessions = totalSchoolDays * 2; // Morning + Afternoon
    const attendedSessions = totals.present + totals.late;
    const attendancePercentage = calculateAttendancePercentage(attendedSessions, totalSessions);

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentNumber: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
        },
        period: {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
        },
        totals,
        summary: {
          totalSchoolDays,
          totalSessions,
          attendedSessions,
          attendancePercentage,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching student attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary',
      error: error.message,
    });
  }
});

// GET /attendance/class/:classId/summary - Class-wide statistics
app.get('/attendance/class/:classId/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;
    const schoolId = req.schoolId!;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    // Validate class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Parse dates
    const start = startOfDay(parseISO(startDate as string));
    const end = endOfDay(parseISO(endDate as string));

    // Get all students in class
    const studentCount = await prisma.student.count({
      where: {
        classId: classId,
        schoolId: schoolId,
      },
    });

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: classId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate overall totals
    const totals = {
      present: attendanceRecords.filter(r => r.status === 'PRESENT').length,
      absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
      late: attendanceRecords.filter(r => r.status === 'LATE').length,
      excused: attendanceRecords.filter(r => r.status === 'EXCUSED').length,
      permission: attendanceRecords.filter(r => r.status === 'PERMISSION').length,
    };

    // Day-by-day breakdown
    const dayByDay: { [key: string]: any } = {};
    attendanceRecords.forEach(record => {
      const dateKey = format(record.date, 'yyyy-MM-dd');
      if (!dayByDay[dateKey]) {
        dayByDay[dateKey] = {
          date: dateKey,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          permission: 0,
        };
      }
      dayByDay[dateKey][record.status.toLowerCase()]++;
    });

    // Calculate attendance rate
    const totalSchoolDays = getSchoolDays(start, end);
    const totalPossibleSessions = totalSchoolDays * 2 * studentCount;
    const attendedSessions = totals.present + totals.late;
    const averageAttendanceRate = calculateAttendancePercentage(attendedSessions, totalPossibleSessions);

    res.json({
      success: true,
      data: {
        class: {
          id: classData.id,
          name: classData.name,
          studentCount,
        },
        period: {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
        },
        totals,
        summary: {
          totalSchoolDays,
          totalPossibleSessions,
          attendedSessions,
          averageAttendanceRate,
        },
        dayByDay: Object.values(dayByDay),
      },
    });
  } catch (error: any) {
    console.error('Error fetching class attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class attendance summary',
      error: error.message,
    });
  }
});

// GET /attendance/school/summary — School-wide aggregates (same RBAC as audit CSV)
app.get('/attendance/school/summary', authenticateToken, requireSchoolAttendanceOpsRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.schoolId!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing date range' });
    }

    const bypassFresh =
      req.query.fresh === '1' ||
      req.query.fresh === 'true' ||
      req.query.skipCache === '1';
    const cacheKey = `${schoolId}:${startDate}:${endDate}`;
    if (!bypassFresh) {
      const cachedResponse = readSchoolSummaryCache(cacheKey);
      if (cachedResponse) {
        res.setHeader('Cache-Control', 'private, max-age=15');
        return res.json(cachedResponse);
      }
    }

    // Use literal dates from query to avoid timezone shifts during startOfDay/endOfDay
    // We assume startDate and endDate are YYYY-MM-DD
    const start = startOfDay(new Date(startDate as string));
    const end = endOfDay(new Date(endDate as string));

    // For database matching, we also check for the exact midnight UTC version
    // because some records (TeacherAttendance) might be stored as midnight UTC
    const dbStart = new Date(start);
    const dbEnd = new Date(end);

    // Get all attendance records for the school in the date range
    const [attendanceRecords, teacherRecords] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          student: { schoolId },
          OR: [
            { date: { gte: dbStart, lte: dbEnd } },
            // Fallback for records stored as UTC midnight of the intended local day
            { date: { gte: new Date(dbStart.getTime() - 24 * 60 * 60 * 1000), lte: dbEnd } }
          ]
        },
      }),
      prisma.teacherAttendance.findMany({
        where: {
          teacher: { schoolId },
          OR: [
            { date: { gte: dbStart, lte: dbEnd } },
            // Fallback for records stored as UTC midnight of the intended local day
            { date: { gte: new Date(dbStart.getTime() - 24 * 60 * 60 * 1000), lte: dbEnd } }
          ]
        },
        include: {
          teacher: {
            select: {
              firstName: true,
              lastName: true,
              photoUrl: true,
              user: { select: { email: true } }
            }
          }
        }
      }),
    ]);

    const studentCount = await prisma.student.count({ where: { schoolId } });
    const teacherCount = await prisma.teacher.count({ where: { schoolId } });
    const totalSchoolDays = eachDayOfInterval({ start, end }).filter(date => !isWeekend(date)).length;

    // Calculate totals and session breakdown for students
    const totals = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      permission: 0,
    };

    const sessions = {
      MORNING: { present: 0, absent: 0, late: 0, total: 0 },
      AFTERNOON: { present: 0, absent: 0, late: 0, total: 0 },
    };

    // Calculate totals for teachers (unique days present)
    const uniqueTeacherPresence = new Set(
      teacherRecords
        .filter(r => r.status === 'PRESENT')
        .map(r => `${r.teacherId}_${new Date(r.date).toISOString().split('T')[0]}`)
    ).size;

    const teacherTotals = {
      present: uniqueTeacherPresence,
      absent: teacherRecords.filter(r => r.status === 'ABSENT').length,
    };

    const attendanceRate = (totalSchoolDays * 2 * studentCount) > 0
      ? Number(((attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length / (totalSchoolDays * 2 * studentCount)) * 100).toFixed(1))
      : 0;

    const teacherAttendanceRate = (totalSchoolDays * teacherCount) > 0
      ? Math.min(100, Number(((teacherTotals.present / (totalSchoolDays * teacherCount)) * 100).toFixed(1)))
      : 0;

    const classStats: { [key: string]: { name: string, present: number, total: number } } = {};

    attendanceRecords.forEach(r => {
      // Global totals
      if (r.status === 'PRESENT') totals.present++;
      else if (r.status === 'ABSENT') totals.absent++;
      else if (r.status === 'LATE') totals.late++;
      else if (r.status === 'EXCUSED') totals.excused++;
      else if (r.status === 'PERMISSION') totals.permission++;

      // Session breakdown
      const session = r.session as 'MORNING' | 'AFTERNOON';
      if (sessions[session]) {
        sessions[session].total++;
        if (r.status === 'PRESENT') sessions[session].present++;
        else if (r.status === 'LATE') sessions[session].late++;
        else if (r.status === 'ABSENT') sessions[session].absent++;
      }

      // Class stats for "at risk" analysis
      if (r.classId) {
        if (!classStats[r.classId]) {
          classStats[r.classId] = { name: `Class ${r.classId}`, present: 0, total: 0 };
        }
        classStats[r.classId].total++;
        if (r.status === 'PRESENT' || r.status === 'LATE') {
          classStats[r.classId].present++;
        }
      }
    });

    // Day-by-day trend
    const dailyTrend: { [key: string]: any } = {};
    attendanceRecords.forEach(record => {
      const dateKey = format(record.date, 'yyyy-MM-dd');
      if (!dailyTrend[dateKey]) {
        dailyTrend[dateKey] = {
          date: dateKey,
          present: 0,
          absent: 0,
          late: 0,
        };
      }
      if (record.status === 'PRESENT' || record.status === 'LATE') dailyTrend[dateKey].present++;
      if (record.status === 'ABSENT') dailyTrend[dateKey].absent++;
    });

    // Top and Bottom performing classes
    const performingClasses = Object.entries(classStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        rate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    const topClasses = performingClasses.slice(0, 5);
    const atRiskClasses = performingClasses.slice(-5).filter(c => c.rate < 80);

    const classCount = Object.keys(classStats).length;

    const recentCheckIns = teacherRecords
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 40);

    const responseBody = {
      success: true,
      data: {
        stats: {
          studentCount,
          teacherCount,
          classCount,
          attendanceRate,
          teacherAttendanceRate,
          totals,
          teacherTotals,
          sessions,
        },
        trend: Object.values(dailyTrend),
        topClasses,
        atRiskClasses,
        recentCheckIns,
      },
    };

    writeSchoolSummaryCache(cacheKey, responseBody);
    res.setHeader(
      'Cache-Control',
      bypassFresh ? 'private, no-store, max-age=0' : 'private, max-age=15'
    );
    res.json(responseBody);
  } catch (error: any) {
    console.error('Error fetching school summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch school summary', error: error.message });
  }
});

const MAX_AUDIT_EXPORT_SPAN_DAYS = 120;

// GET /attendance/school/audit-export — Combined teacher + learner attendance rows (CSV), school ops only
app.get(
  '/attendance/school/audit-export',
  authenticateToken,
  requireSchoolAttendanceOpsRole,
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.schoolId!;
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return res.status(400).json({ success: false, message: 'startDate and endDate must be YYYY-MM-DD' });
      }

      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
        return res.status(400).json({ success: false, message: 'Invalid date range' });
      }

      const spanDays = differenceInDays(end, start) + 1;
      if (spanDays > MAX_AUDIT_EXPORT_SPAN_DAYS) {
        return res.status(400).json({
          success: false,
          message: `Date range too large (max ${MAX_AUDIT_EXPORT_SPAN_DAYS} days)`,
        });
      }

      const dbStart = new Date(start);
      const dbEnd = new Date(end);

      const dateOr = [
        { date: { gte: dbStart, lte: dbEnd } },
        { date: { gte: new Date(dbStart.getTime() - 24 * 60 * 60 * 1000), lte: dbEnd } },
      ];

      const [teacherRows, studentRows] = await Promise.all([
        prisma.teacherAttendance.findMany({
          where: { teacher: { schoolId }, OR: dateOr },
          take: 75000,
          orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
          include: {
            teacher: {
              select: {
                id: true,
                teacherId: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
                user: { select: { email: true } },
              },
            },
            location: { select: { name: true } },
          },
        }),
        prisma.attendance.findMany({
          where: { student: { schoolId }, OR: dateOr },
          take: 75000,
          orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
              },
            },
            class: { select: { id: true, name: true } },
          },
        }),
      ]);

      const header = [
        'record_type',
        'record_id',
        'school_calendar_date',
        'session',
        'status',
        'internal_person_id',
        'external_id',
        'full_name',
        'email',
        'class_id',
        'class_name',
        'remarks',
        'teacher_time_in_utc',
        'teacher_time_out_utc',
        'campus_location_name',
        'created_at_utc',
        'updated_at_utc',
      ];

      const lines: string[] = [header.join(',')];

      for (const r of teacherRows) {
        const tchr = r.teacher;
        const name = `${tchr.firstName || ''} ${tchr.lastName || ''}`.trim();
        const email = tchr.user?.email || tchr.email || '';
        const externalId = tchr.teacherId || tchr.employeeId || '';
        lines.push(
          [
            'TEACHER_ATTENDANCE',
            r.id,
            format(r.date, 'yyyy-MM-dd'),
            r.session,
            r.status,
            tchr.id,
            externalId,
            name,
            email,
            '',
            '',
            '',
            r.timeIn ? r.timeIn.toISOString() : '',
            r.timeOut ? r.timeOut.toISOString() : '',
            r.location?.name || '',
            r.createdAt.toISOString(),
            r.updatedAt.toISOString(),
          ]
            .map(csvEscape)
            .join(',')
        );
      }

      for (const r of studentRows) {
        const st = r.student;
        const name = `${st.firstName || ''} ${st.lastName || ''}`.trim();
        lines.push(
          [
            'STUDENT_ATTENDANCE',
            r.id,
            format(r.date, 'yyyy-MM-dd'),
            r.session,
            r.status,
            st.id,
            st.studentId || '',
            name,
            '',
            r.classId || '',
            r.class?.name || '',
            r.remarks || '',
            '',
            '',
            '',
            r.createdAt.toISOString(),
            r.updatedAt.toISOString(),
          ]
            .map(csvEscape)
            .join(',')
        );
      }

      const csvBody = `\uFEFF${lines.join('\n')}\n`;
      const filename = `attendance-audit_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.status(200).send(csvBody);
    } catch (error: any) {
      console.error('Error exporting attendance audit:', error);
      res.status(500).json({ success: false, message: 'Failed to export attendance audit', error: error.message });
    }
  }
);

// GET /attendance/teacher/:teacherId/summary - Summary of attendance recorded by a teacher (for their classes)
app.get('/attendance/teacher/:teacherId/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { teacherId: teacherIdParam } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? startOfDay(new Date(startDate as string)) : startOfDay(subMonths(new Date(), 1));
    const end = endDate ? endOfDay(new Date(endDate as string)) : endOfDay(new Date());

    const dbStart = new Date(start);
    const dbEnd = new Date(end);

    const schoolId = req.schoolId!;

    const teacherRow = await prisma.teacher.findFirst({
      where: {
        schoolId,
        OR: [{ id: teacherIdParam }, { user: { id: teacherIdParam } }],
      },
      select: { id: true },
    });

    if (!teacherRow) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const teacherId = teacherRow.id;

    // Find all classes for this teacher
    const classes = await prisma.class.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacherId },
          { teacherClasses: { some: { teacherId } } }
        ]
      },
      select: { id: true, name: true }
    });

    const classIds = classes.map(c => c.id);

    // Get attendance records for these classes (Student Attendance)
    const [attendanceRecords, teacherAttendances] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          classId: { in: classIds },
          OR: [
            { date: { gte: dbStart, lte: dbEnd } },
            // Fallback for midnight UTC storage
            { date: { gte: new Date(dbStart.getTime() - 24 * 60 * 60 * 1000), lte: dbEnd } }
          ]
        },
      }),
      prisma.teacherAttendance.findMany({
        where: {
          teacherId,
          OR: [
            { date: { gte: dbStart, lte: dbEnd } },
            // Fallback for midnight UTC storage
            { date: { gte: new Date(dbStart.getTime() - 24 * 60 * 60 * 1000), lte: dbEnd } }
          ]
        },
      }),
    ]);

    // Aggregate stats
    const totals = {
      present: attendanceRecords.filter(r => r.status === 'PRESENT').length,
      absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
      late: attendanceRecords.filter(r => r.status === 'LATE').length,
      excused: attendanceRecords.filter(r => r.status === 'EXCUSED').length,
      permission: attendanceRecords.filter(r => r.status === 'PERMISSION').length,
    };

    // Staff stats (unique days present)
    const uniqueStaffPresence = new Set(
      teacherAttendances
        .filter(r => r.status === 'PRESENT')
        .map(r => new Date(r.date).toISOString().split('T')[0])
    ).size;

    const staffTotals = {
      present: uniqueStaffPresence,
      late: teacherAttendances.filter(r => r.status === 'LATE').length,
      absent: teacherAttendances.filter(r => r.status === 'ABSENT').length,
      permission: teacherAttendances.filter(r => r.status === 'PERMISSION').length,
    };

    const weeklyInfo = await getTeacherWeeklySchedule(
      prisma,
      teacherId,
      schoolId,
      dbStart,
      dbEnd
    );
    const ay = await findAcademicYearForRange(prisma, schoolId, dbStart, dbEnd);
    const expectations = buildExpectationsIndex(
      weeklyInfo.pattern,
      ay,
      start,
      end
    );
    const compliance = tallyTimetableCompliance(expectations, teacherAttendances);

    const legacyWeekdaySchoolDays = eachDayOfInterval({ start, end }).filter(date => !isWeekend(date))
      .length;

    const usesTimetableDenominator =
      weeklyInfo.source === 'timetable' &&
      weeklyInfo.scheduledWeekdays?.length > 0 &&
      compliance.expectedSessions > 0;

    const totalSchoolDays = usesTimetableDenominator
      ? compliance.scheduledWorkDaysInRange
      : legacyWeekdaySchoolDays;

    const recordedSessions = teacherAttendances.filter(r =>
      r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'PERMISSION'
    ).length;

    const totalRecords = attendanceRecords.length;
    const attendanceRate = totalRecords > 0
      ? Number(((totals.present + totals.late) / totalRecords * 100).toFixed(1))
      : 0;

    let personalAttendanceRate = 0;
    if (usesTimetableDenominator) {
      personalAttendanceRate = Math.min(
        100,
        Number(
          (
            (compliance.fulfilledScheduledSessions / compliance.expectedSessions) *
            100
          ).toFixed(1)
        )
      );
    } else if (legacyWeekdaySchoolDays > 0) {
      personalAttendanceRate = Math.min(
        100,
        Number(((staffTotals.present / legacyWeekdaySchoolDays) * 100).toFixed(1))
      );
    }

    // Breakdown by class
    const classBreakdown = classes.map(c => {
      const records = attendanceRecords.filter(r => r.classId === c.id);
      const p = records.filter(r => r.status === 'PRESENT').length;
      const l = records.filter(r => r.status === 'LATE').length;
      return {
        id: c.id,
        name: c.name,
        total: records.length,
        present: p,
        late: l,
        rate: records.length > 0 ? calculateAttendancePercentage(p + l, records.length) : 0
      };
    });

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json({
      success: true,
      data: {
        stats: {
          attendanceRate,
          totals,
          totalRecords,
          staffTotals,
          recordedSessions,
          personalAttendanceRate,
          totalSchoolDays,
          timetable: {
            source: weeklyInfo.source,
            academicYearId: weeklyInfo.academicYearId,
            weeklyPattern: serializeWeeklyPattern(weeklyInfo.pattern),
            scheduledWeekdays: weeklyInfo.scheduledWeekdays,
            expectedSessionsInRange: compliance.expectedSessions,
            fulfilledScheduledSessions: compliance.fulfilledScheduledSessions,
            missedScheduledSessions: compliance.missedScheduledSessions,
            legacyWeekdayDaysInRange: legacyWeekdaySchoolDays,
          },
        },
        classBreakdown,
        checkInHistory: teacherAttendances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      },
    });
  } catch (error: any) {
    console.error('Error fetching teacher summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher summary', error: error.message });
  }
});

// ==================== D. Geofenced Location Management ====================

// GET /attendance/locations - Get all school locations
app.get('/attendance/locations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.schoolId!;
    const cacheKey = `${schoolId}:locations`;
    const cachedResponse = readSchoolLocationsCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const locations = await prisma.schoolLocation.findMany({
      where: { schoolId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const responseBody = { success: true, data: locations };
    writeSchoolLocationsCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch locations', error: error.message });
  }
});

// POST /attendance/locations - Create a new location
app.post('/attendance/locations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.schoolId!;
    const { name, latitude, longitude, radius } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newLocation = await prisma.schoolLocation.create({
      data: {
        schoolId,
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius ? parseFloat(radius) : 50,
      },
    });

    clearSchoolLocationsCache(schoolId);

    res.status(201).json({ success: true, message: 'Location created', data: newLocation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create location', error: error.message });
  }
});

// DELETE /attendance/locations/:id - Delete a location
app.delete('/attendance/locations/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId!;

    const location = await prisma.schoolLocation.findFirst({
      where: { id, schoolId },
    });

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    await prisma.schoolLocation.update({
      where: { id },
      data: { isActive: false },
    });

    clearSchoolLocationsCache(schoolId);

    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete location', error: error.message });
  }
});

// ==================== E. Geofenced Teacher Attendance ====================

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

const getTeacherPermissionLocation = async (schoolId: string) => {
  const activeLocation = await prisma.schoolLocation.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (activeLocation) return activeLocation;

  const existingSystemLocation = await prisma.schoolLocation.findFirst({
    where: {
      schoolId,
      name: 'Online Permission (System)',
      isActive: false,
    },
  });
  if (existingSystemLocation) return existingSystemLocation;

  return prisma.schoolLocation.create({
    data: {
      schoolId,
      name: 'Online Permission (System)',
      latitude: 0,
      longitude: 0,
      radius: 1,
      isActive: false,
    },
  });
};

// POST /attendance/teacher/check-in - Record teacher time in
app.post('/attendance/teacher/check-in', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.schoolId!;
    const userId = req.user?.id;
    const { latitude, longitude, session } = req.body;
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);

    if (!Number.isFinite(numericLatitude) || !Number.isFinite(numericLongitude)) {
      return res.status(400).json({ success: false, message: 'Location coordinates required' });
    }

    if (session && !validateAttendanceSession(session)) {
      return res.status(400).json({ success: false, message: 'Invalid session. Must be MORNING or AFTERNOON' });
    }

    const targetSession: AttendanceSession = session && validateAttendanceSession(session)
      ? session
      : (new Date().getHours() < 12 ? 'MORNING' : 'AFTERNOON');

    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, user: { id: userId } },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const localDateStr = resolveTeacherLocalDate(req);
    const bypass = Boolean(
      (req.body as { acknowledgeOffSchedule?: boolean }).acknowledgeOffSchedule
    );
    const sessionGate = await verifyTeacherPersonalSessionScheduled({
      teacherId: teacher.id,
      schoolId,
      localDateStr,
      session: targetSession,
      bypassOffSchedule: bypass,
    });
    if (!sessionGate.ok) {
      const sg = sessionGate as { ok: false; code: string; message: string };
      return res.status(403).json({
        success: false,
        code: sg.code,
        message: sg.message,
      });
    }

    const locations = await prisma.schoolLocation.findMany({
      where: { schoolId, isActive: true },
    });

    if (locations.length === 0) {
      return res.status(400).json({ success: false, message: 'No school locations configured by admin' });
    }

    let matchedLocation = null;
    let shortestDistance = Infinity;

    for (const loc of locations) {
      const distance = getDistanceFromLatLonInM(numericLatitude, numericLongitude, loc.latitude, loc.longitude);
      if (distance <= loc.radius) {
        if (distance < shortestDistance) {
          shortestDistance = distance;
          matchedLocation = loc;
        }
      }
    }

    if (!matchedLocation) {
      return res.status(400).json({
        success: false,
        message: 'You are outside the allowed school area.',
        code: 'OUT_OF_BOUNDS'
      });
    }

    const todayDate = startOfDay(new Date());
    const utcStartStr = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const utcStart = new Date(utcStartStr);

    const activeAttendance = await prisma.teacherAttendance.findFirst({
      where: {
        teacherId: teacher.id,
        OR: [{ date: todayDate }, { date: utcStart }],
        timeOut: null
      }
    });

    if (activeAttendance) {
      return res.status(400).json({ success: false, message: `You are already checked in without checking out.` });
    }

    const existingSessionAttendance = await prisma.teacherAttendance.findFirst({
      where: {
        teacherId: teacher.id,
        OR: [{ date: todayDate }, { date: utcStart }],
        session: targetSession
      }
    });

    if (existingSessionAttendance) {
      return res.status(400).json({
        success: false,
        message: `Attendance already recorded for ${targetSession} session today.`
      });
    }

    const attendance = await prisma.teacherAttendance.create({
      data: {
        teacherId: teacher.id,
        locationId: matchedLocation.id,
        date: todayDate,
        timeIn: new Date(),
        session: targetSession,
        status: 'PRESENT',
      }
    });

    clearSchoolSummaryCache(schoolId);

    res.status(201).json({
      success: true,
      message: `Checked in successfully for ${targetSession} session`,
      data: attendance,
      locationName: matchedLocation.name
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Check-in failed', error: error.message });
  }
});

// POST /attendance/teacher/check-out - Record teacher time out
app.post('/attendance/teacher/check-out', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.schoolId!;
    const userId = req.user?.id;
    const { latitude, longitude, session } = req.body;
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);

    if (!Number.isFinite(numericLatitude) || !Number.isFinite(numericLongitude)) {
      return res.status(400).json({ success: false, message: 'Location coordinates required' });
    }

    if (session && !validateAttendanceSession(session)) {
      return res.status(400).json({ success: false, message: 'Invalid session. Must be MORNING or AFTERNOON' });
    }

    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, user: { id: userId } },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const locations = await prisma.schoolLocation.findMany({
      where: { schoolId, isActive: true },
    });

    if (locations.length === 0) {
      return res.status(400).json({ success: false, message: 'No school locations configured by admin' });
    }

    let matchedLocation = null;

    for (const loc of locations) {
      const distance = getDistanceFromLatLonInM(numericLatitude, numericLongitude, loc.latitude, loc.longitude);
      if (distance <= loc.radius) {
        matchedLocation = loc;
        break;
      }
    }

    if (!matchedLocation) {
      return res.status(400).json({
        success: false,
        message: 'You are outside the allowed school area.',
        code: 'OUT_OF_BOUNDS'
      });
    }

    const todayDate = startOfDay(new Date());
    const utcStartStr = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const utcStart = new Date(utcStartStr);

    const targetSession: AttendanceSession | undefined = session && validateAttendanceSession(session)
      ? session
      : undefined;

    // Find active check-in session that isn't checked out
    const activeSession = await prisma.teacherAttendance.findFirst({
      where: {
        teacherId: teacher.id,
        OR: [{ date: todayDate }, { date: utcStart }],
        ...(targetSession ? { session: targetSession } : {}),
        timeOut: null,
      },
      orderBy: { timeIn: 'desc' }
    });

    if (!activeSession) {
      return res.status(400).json({
        success: false,
        message: targetSession
          ? `No active ${targetSession} check-in found to check out`
          : 'No active check-in found to check out'
      });
    }

    const updatedAttendance = await prisma.teacherAttendance.update({
      where: { id: activeSession.id },
      data: {
        timeOut: new Date(),
      }
    });

    clearSchoolSummaryCache(schoolId);

    res.json({
      success: true,
      message: `Checked out successfully for ${activeSession.session} session`,
      data: updatedAttendance
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Check-out failed', error: error.message });
  }
});

// POST /attendance/teacher/permission-request - Request online permission (no geofence required)
app.post('/attendance/teacher/permission-request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.schoolId!;
    const userId = req.user?.id;
    const { session, reason } = req.body as { session?: string; reason?: string };

    if (session && !validateAttendanceSession(session)) {
      return res.status(400).json({ success: false, message: 'Invalid session. Must be MORNING or AFTERNOON' });
    }

    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
    if (normalizedReason.length > 500) {
      return res.status(400).json({ success: false, message: 'Reason must be 500 characters or less' });
    }

    const targetSession: AttendanceSession = session && validateAttendanceSession(session)
      ? session
      : (new Date().getHours() < 12 ? 'MORNING' : 'AFTERNOON');

    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, user: { id: userId } },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const localDateStrPm = resolveTeacherLocalDate(req);
    const bypassPm = Boolean(
      (req.body as { acknowledgeOffSchedule?: boolean }).acknowledgeOffSchedule
    );
    const permGate = await verifyTeacherPersonalSessionScheduled({
      teacherId: teacher.id,
      schoolId,
      localDateStr: localDateStrPm,
      session: targetSession,
      bypassOffSchedule: bypassPm,
    });
    if (!permGate.ok) {
      const pg = permGate as { ok: false; code: string; message: string };
      return res.status(403).json({
        success: false,
        code: pg.code,
        message: pg.message,
      });
    }

    const todayDate = startOfDay(new Date());
    const utcStartStr = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const utcStart = new Date(utcStartStr);

    const existingSessionAttendance = await prisma.teacherAttendance.findFirst({
      where: {
        teacherId: teacher.id,
        OR: [{ date: todayDate }, { date: utcStart }],
        session: targetSession,
      },
    });

    if (existingSessionAttendance) {
      if (existingSessionAttendance.status === 'PERMISSION') {
        return res.status(400).json({
          success: false,
          message: `Permission already requested for ${targetSession} session today.`,
        });
      }

      return res.status(400).json({
        success: false,
        message: `Attendance already recorded for ${targetSession} session today.`,
      });
    }

    const permissionLocation = await getTeacherPermissionLocation(schoolId);
    const requestedAt = new Date();

    const permissionRecord = await prisma.teacherAttendance.create({
      data: {
        teacherId: teacher.id,
        locationId: permissionLocation.id,
        date: todayDate,
        timeIn: requestedAt,
        timeOut: requestedAt,
        session: targetSession,
        status: 'PERMISSION',
      },
    });

    clearSchoolSummaryCache(schoolId);

    res.status(201).json({
      success: true,
      message: `Permission requested successfully for ${targetSession} session`,
      data: permissionRecord,
      requestedAnywhere: true,
      reason: normalizedReason || null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Permission request failed', error: error.message });
  }
});

// GET /attendance/teacher/today - Get today's attendance status
app.get('/attendance/teacher/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.schoolId!;
    const userId = req.user?.id;

    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, user: { id: userId } },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const todayDate = startOfDay(new Date());
    const utcStartStr = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const utcStart = new Date(utcStartStr);

    const attendanceRecords = await prisma.teacherAttendance.findMany({
      where: {
        teacherId: teacher.id,
        OR: [{ date: todayDate }, { date: utcStart }],
      },
      include: {
        location: true,
      },
      orderBy: { timeIn: 'asc' }
    });

    // Structure result by explicit session selection from check-in.
    const sessions = {
      MORNING: null as any,
      AFTERNOON: null as any,
    };

    attendanceRecords.forEach(record => {
      if (record.session === 'MORNING' && !sessions.MORNING) {
        sessions.MORNING = record;
      } else if (record.session === 'AFTERNOON' && !sessions.AFTERNOON) {
        sessions.AFTERNOON = record;
      } else {
        // Backward-compatible fallback for unexpected duplicate/session-less data.
        if (!sessions.MORNING) sessions.MORNING = record;
        else if (!sessions.AFTERNOON) sessions.AFTERNOON = record;
      }
    });

    const localDateToday = resolveTeacherLocalDate(req);
    const dayKey = utcDateStringToDayOfWeek(localDateToday);
    const schedDay =
      dayKey &&
      (
        await getTeacherWeeklySchedule(
          prisma,
          teacher.id,
          schoolId,
          parseYmdUtc(localDateToday),
          parseYmdUtc(localDateToday)
        )
      );
    const dayPattern =
      dayKey && schedDay ? schedDay.pattern[dayKey] : { morning: true, afternoon: true };

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json({
      success: true,
      data: {
        ...sessions,
        scheduleContext: {
          localDate: localDateToday,
          timetableSource: schedDay?.source ?? 'fallback',
          academicYearId: schedDay?.academicYearId ?? null,
          weekday: dayKey,
          expectsMorning: Boolean(dayPattern?.morning),
          expectsAfternoon: Boolean(dayPattern?.afternoon),
          isScheduledTeachingDay:
            Boolean(dayPattern?.morning || dayPattern?.afternoon),
          timetableEnforcement: TIMETABLE_ENFORCE_TEACHER,
          weeklyPattern: schedDay
            ? serializeWeeklyPattern(schedDay.pattern)
            : undefined,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance status', error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || process.env.ATTENDANCE_SERVICE_PORT || 3008;
app.listen(PORT, () => {
  console.log(`✅ Attendance Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});
