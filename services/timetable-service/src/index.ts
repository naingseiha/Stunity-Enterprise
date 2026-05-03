import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { PrismaClient, DayOfWeek } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables - try root .env first, then packages/database/.env
dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../packages/database/.env' });

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = process.env.PORT || process.env.TIMETABLE_SERVICE_PORT || 3009;

// Prisma Singleton with connection pooling
let prisma: PrismaClient;
const timetableCache = new Map<string, { data: any; timestamp: number }>();
const TIMETABLE_CACHE_TTL_MS = 2 * 60 * 1000;

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

function readTimetableCache(cacheKey: string) {
  const cached = timetableCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > TIMETABLE_CACHE_TTL_MS) {
    timetableCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeTimetableCache(cacheKey: string, data: any) {
  timetableCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearTimetableCache(schoolId?: string) {
  for (const key of timetableCache.keys()) {
    if (!schoolId || key.startsWith(`${schoolId}:`)) {
      timetableCache.delete(key);
    }
  }
}

async function getTimetablePublishState(db: PrismaClient, schoolId: string, academicYearId: string) {
  const latest = await db.timetablePublish.findFirst({
    where: { schoolId, academicYearId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    isPublished: latest?.status === 'PUBLISHED',
    latest,
  };
}

async function getPublishedTimetableLocks(db: PrismaClient, schoolId: string) {
  const publishes = await db.timetablePublish.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
  });
  const latestByYear = new Map<string, (typeof publishes)[number]>();

  for (const publish of publishes) {
    if (!latestByYear.has(publish.academicYearId)) {
      latestByYear.set(publish.academicYearId, publish);
    }
  }

  return Array.from(latestByYear.values()).filter((publish) => publish.status === 'PUBLISHED');
}

async function ensureTimetableEditable(db: PrismaClient, schoolId: string, academicYearId: string) {
  const publishState = await getTimetablePublishState(db, schoolId, academicYearId);
  if (publishState.isPublished) {
    const error = new Error('This timetable is published and locked. Unpublish it before making changes.');
    (error as any).statusCode = 423;
    (error as any).publishState = publishState;
    throw error;
  }
}

async function ensurePeriodScheduleEditable(db: PrismaClient, schoolId: string) {
  const locks = await getPublishedTimetableLocks(db, schoolId);
  if (locks.length > 0) {
    const error = new Error('Period settings are locked because an official timetable is published.');
    (error as any).statusCode = 423;
    (error as any).publishedAcademicYearIds = locks.map((lock) => lock.academicYearId);
    throw error;
  }
}

function sendLockError(res: express.Response, error: any) {
  if (error?.statusCode !== 423) return false;
  res.status(423).json({
    error: error.message,
    publishState: error.publishState,
    publishedAcademicYearIds: error.publishedAcademicYearIds,
  });
  return true;
}

function slotLabel(entry: { dayOfWeek: DayOfWeek; period?: { name?: string | null; order?: number | null } | null }) {
  const periodName = entry.period?.name || (entry.period?.order ? `Period ${entry.period.order}` : 'Unknown period');
  return `${entry.dayOfWeek} ${periodName}`;
}

function normalizeEntryIds(entries: Array<{ id: string }>) {
  return entries.map((entry) => entry.id).sort();
}

function buildConflictFingerprint(type: string, entries: Array<{ id: string; teacherId?: string | null; classId?: string | null; periodId: string; dayOfWeek: DayOfWeek }>) {
  const first = entries[0];
  const entryIds = normalizeEntryIds(entries).join(',');

  if (type === 'TEACHER_CONFLICT') {
    return `${type}|${first.teacherId || 'none'}|${first.dayOfWeek}|${first.periodId}|${entryIds}`;
  }

  if (type === 'CLASS_SLOT_CONFLICT') {
    return `${type}|${first.classId || 'none'}|${first.dayOfWeek}|${first.periodId}|${entryIds}`;
  }

  return `${type}|${first.dayOfWeek}|${first.periodId}|${entryIds}`;
}

function serializeConflictEntries(entries: any[]) {
  return entries.map((entry) => ({
    entryId: entry.id,
    classId: entry.classId,
    className: entry.class?.name,
    subjectId: entry.subjectId,
    subjectName: entry.subject?.name,
    subjectCode: entry.subject?.code,
    teacherId: entry.teacherId,
    teacherName: entry.teacher ? `${entry.teacher.firstName || ''} ${entry.teacher.lastName || ''}`.trim() : null,
    periodId: entry.periodId,
    periodName: entry.period?.name,
    periodOrder: entry.period?.order,
    dayOfWeek: entry.dayOfWeek,
    room: entry.room,
  }));
}

async function buildTimetableValidationReport(db: PrismaClient, schoolId: string, academicYearId: string) {
  const [classes, periods, entries, publishState, activeExceptions] = await Promise.all([
    db.class.findMany({
      where: { schoolId, academicYearId },
      select: { id: true, name: true, grade: true, section: true },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }, { name: 'asc' }],
    }),
    db.period.findMany({
      where: { schoolId, isBreak: false },
      select: { id: true, name: true, order: true, startTime: true, endTime: true },
      orderBy: { order: 'asc' },
    }),
    db.timetableEntry.findMany({
      where: { schoolId, academicYearId },
      select: {
        id: true,
        classId: true,
        teacherId: true,
        subjectId: true,
        periodId: true,
        dayOfWeek: true,
        room: true,
        class: { select: { id: true, name: true, grade: true, section: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true, code: true } },
        period: { select: { id: true, name: true, order: true, startTime: true, endTime: true } },
      },
    }),
    getTimetablePublishState(db, schoolId, academicYearId),
    (db as any).timetableConflictException.findMany({
      where: { schoolId, academicYearId, isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const issues: any[] = [];
  const warnings: any[] = [];
  const approvedExceptions: any[] = [];
  const activeExceptionByFingerprint = new Map<string, any>(
    activeExceptions.map((exception: any) => [exception.fingerprint, exception])
  );
  const classSlotMap = new Map<string, typeof entries>();
  const teacherSlotMap = new Map<string, typeof entries>();
  const roomSlotMap = new Map<string, typeof entries>();

  for (const entry of entries) {
    const classKey = `${entry.classId}|${entry.dayOfWeek}|${entry.periodId}`;
    classSlotMap.set(classKey, [...(classSlotMap.get(classKey) || []), entry]);

    if (entry.teacherId) {
      const teacherKey = `${entry.teacherId}|${entry.dayOfWeek}|${entry.periodId}`;
      teacherSlotMap.set(teacherKey, [...(teacherSlotMap.get(teacherKey) || []), entry]);
    }

    if (entry.room?.trim()) {
      const roomKey = `${entry.room.trim().toLowerCase()}|${entry.dayOfWeek}|${entry.periodId}`;
      roomSlotMap.set(roomKey, [...(roomSlotMap.get(roomKey) || []), entry]);
    }
  }

  const classSlotConflicts = Array.from(classSlotMap.values()).filter((group) => group.length > 1);
  const teacherConflicts = Array.from(teacherSlotMap.values()).filter((group) => group.length > 1);
  const roomConflicts = Array.from(roomSlotMap.values()).filter((group) => group.length > 1);
  const entriesWithoutSubject = entries.filter((entry) => !entry.subjectId);
  const entriesWithoutTeacher = entries.filter((entry) => !entry.teacherId);
  const totalSlotsPerClass = periods.length * 6;
  const entriesByClass = new Map<string, number>();

  for (const entry of entries) {
    entriesByClass.set(entry.classId, (entriesByClass.get(entry.classId) || 0) + 1);
  }

  const lowCoverageClasses = classes
    .map((cls) => {
      const entryCount = entriesByClass.get(cls.id) || 0;
      const coverage = totalSlotsPerClass > 0 ? Math.round((entryCount / totalSlotsPerClass) * 100) : 0;
      return { ...cls, entryCount, totalSlots: totalSlotsPerClass, coverage };
    })
    .filter((cls) => cls.coverage < 60);

  for (const group of classSlotConflicts) {
    const fingerprint = buildConflictFingerprint('CLASS_SLOT_CONFLICT', group);
    issues.push({
      type: 'CLASS_SLOT_CONFLICT',
      severity: 'blocker',
      message: `${group[0].class?.name || 'Class'} has ${group.length} entries in ${slotLabel(group[0])}.`,
      exceptionFingerprint: fingerprint,
      canApprove: false,
      entryIds: normalizeEntryIds(group),
      entries: group,
    });
  }

  for (const group of teacherConflicts) {
    const fingerprint = buildConflictFingerprint('TEACHER_CONFLICT', group);
    const approvedException = activeExceptionByFingerprint.get(fingerprint);
    const teacherName = group[0].teacher ? `${group[0].teacher.firstName} ${group[0].teacher.lastName}` : 'Teacher';
    const message = `${teacherName} is assigned to ${group.length} classes in ${slotLabel(group[0])}.`;

    if (approvedException) {
      approvedExceptions.push({
        type: 'TEACHER_CONFLICT',
        severity: 'approved',
        message: `Approved combined-class exception: ${message}`,
        exceptionFingerprint: fingerprint,
        entryIds: normalizeEntryIds(group),
        exception: approvedException,
        entries: group,
      });
      continue;
    }

    issues.push({
      type: 'TEACHER_CONFLICT',
      severity: 'blocker',
      message,
      exceptionFingerprint: fingerprint,
      canApprove: true,
      entryIds: normalizeEntryIds(group),
      entries: group,
    });
  }

  for (const group of roomConflicts) {
    warnings.push({
      type: 'ROOM_CONFLICT',
      severity: 'warning',
      message: `Room ${group[0].room} is used by ${group.length} classes in ${slotLabel(group[0])}.`,
      entries: group,
    });
  }

  if (entriesWithoutSubject.length > 0) {
    warnings.push({
      type: 'MISSING_SUBJECT',
      severity: 'warning',
      message: `${entriesWithoutSubject.length} timetable entries have no subject assigned.`,
      count: entriesWithoutSubject.length,
    });
  }

  if (entriesWithoutTeacher.length > 0) {
    warnings.push({
      type: 'MISSING_TEACHER',
      severity: 'warning',
      message: `${entriesWithoutTeacher.length} timetable entries have no teacher assigned.`,
      count: entriesWithoutTeacher.length,
    });
  }

  if (lowCoverageClasses.length > 0) {
    warnings.push({
      type: 'LOW_COVERAGE',
      severity: 'warning',
      message: `${lowCoverageClasses.length} classes are below 60% timetable coverage.`,
      classes: lowCoverageClasses,
    });
  }

  const totalSlots = classes.length * totalSlotsPerClass;
  const status = issues.length > 0 ? 'BLOCKED' : warnings.length > 0 ? 'NEEDS_REVIEW' : 'READY';

  return {
    status,
    publishState,
    summary: {
      classes: classes.length,
      periods: periods.length,
      totalSlots,
      filledSlots: entries.length,
      coverage: totalSlots > 0 ? Math.round((entries.length / totalSlots) * 100) : 0,
      classSlotConflicts: classSlotConflicts.length,
      teacherConflicts: issues.filter((issue) => issue.type === 'TEACHER_CONFLICT').length,
      approvedTeacherConflicts: approvedExceptions.filter((exception) => exception.type === 'TEACHER_CONFLICT').length,
      totalTeacherConflicts: teacherConflicts.length,
      roomConflicts: roomConflicts.length,
      entriesWithoutSubject: entriesWithoutSubject.length,
      entriesWithoutTeacher: entriesWithoutTeacher.length,
      lowCoverageClasses: lowCoverageClasses.length,
    },
    issues,
    warnings,
    approvedExceptions,
  };
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}

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

const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// Auth Middleware
interface AuthUser {
  userId: string;
  email: string;
  schoolId: string;
  role: string;
}

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Days of week helper
const DAYS_ORDER: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const WORKING_DAY_MAP: Record<number, DayOfWeek> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};
const DEFAULT_SECONDARY_SUBJECT_WEEKLY_HOURS: Record<string, number> = {
  KH: 5,
  MATH: 6,
  ENG: 4,
  PHY: 3,
  CHEM: 3,
  BIO: 3,
  HIST: 2,
  GEO: 2,
  CIV: 2,
  PE: 2,
  CS: 2,
  ART: 2,
  MUS: 1,
  HE: 1,
  AGR: 2,
};

function getWorkingDays(workingDays?: number[] | null): DayOfWeek[] {
  const resolvedDays = (workingDays || [1, 2, 3, 4, 5])
    .map((day) => WORKING_DAY_MAP[day])
    .filter((day): day is DayOfWeek => Boolean(day));

  return resolvedDays.length > 0 ? resolvedDays : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
}

function getEffectiveWeeklyHours(subject: { code?: string | null; weeklyHours?: number | null }): number {
  if ((subject.weeklyHours || 0) > 0) {
    return Math.ceil(subject.weeklyHours || 0);
  }

  const baseCode = subject.code?.split('-')[0]?.toUpperCase() || '';
  return DEFAULT_SECONDARY_SUBJECT_WEEKLY_HOURS[baseCode] || 1;
}

// ========================================
// Period Endpoints (School time slots)
// ========================================

// GET /periods - List all periods for school
app.get('/periods', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    const periods = await db.period.findMany({
      where: { schoolId },
      orderBy: { order: 'asc' },
    });

    res.json({ data: { periods } });
  } catch (error) {
    console.error('Error fetching periods:', error);
    res.status(500).json({ error: 'Failed to fetch periods' });
  }
});

// POST /periods - Create a period
app.post('/periods', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { name, startTime, endTime, order, isBreak, duration } = req.body;
    const db = getPrisma();

    await ensurePeriodScheduleEditable(db, schoolId);

    // Check for duplicate order
    const existing = await db.period.findUnique({
      where: { schoolId_order: { schoolId, order } },
    });
    if (existing) {
      return res.status(400).json({ error: 'Period with this order already exists' });
    }

    const period = await db.period.create({
      data: {
        schoolId,
        name,
        startTime,
        endTime,
        order,
        isBreak: isBreak || false,
        duration: duration || 45,
      },
    });

    clearTimetableCache(schoolId);

    res.json({ data: period });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error creating period:', error);
    res.status(500).json({ error: 'Failed to create period' });
  }
});

// POST /periods/bulk - Create default periods
app.post('/periods/bulk', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    await ensurePeriodScheduleEditable(db, schoolId);

    // Delete existing periods
    await db.period.deleteMany({ where: { schoolId } });

    // Default Cambodian school schedule
    const defaultPeriods = [
      { name: 'Morning Assembly', startTime: '07:00', endTime: '07:15', order: 1, isBreak: true, duration: 15 },
      { name: 'Period 1', startTime: '07:15', endTime: '08:00', order: 2, isBreak: false, duration: 45 },
      { name: 'Period 2', startTime: '08:00', endTime: '08:45', order: 3, isBreak: false, duration: 45 },
      { name: 'Break', startTime: '08:45', endTime: '09:00', order: 4, isBreak: true, duration: 15 },
      { name: 'Period 3', startTime: '09:00', endTime: '09:45', order: 5, isBreak: false, duration: 45 },
      { name: 'Period 4', startTime: '09:45', endTime: '10:30', order: 6, isBreak: false, duration: 45 },
      { name: 'Break', startTime: '10:30', endTime: '10:45', order: 7, isBreak: true, duration: 15 },
      { name: 'Period 5', startTime: '10:45', endTime: '11:30', order: 8, isBreak: false, duration: 45 },
      { name: 'Lunch', startTime: '11:30', endTime: '13:30', order: 9, isBreak: true, duration: 120 },
      { name: 'Period 6', startTime: '13:30', endTime: '14:15', order: 10, isBreak: false, duration: 45 },
      { name: 'Period 7', startTime: '14:15', endTime: '15:00', order: 11, isBreak: false, duration: 45 },
      { name: 'Break', startTime: '15:00', endTime: '15:15', order: 12, isBreak: true, duration: 15 },
      { name: 'Period 8', startTime: '15:15', endTime: '16:00', order: 13, isBreak: false, duration: 45 },
    ];

    const created = await db.period.createMany({
      data: defaultPeriods.map((p) => ({ ...p, schoolId })),
    });

    const periods = await db.period.findMany({
      where: { schoolId },
      orderBy: { order: 'asc' },
    });

    clearTimetableCache(schoolId);

    res.json({ data: { periods, count: created.count } });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error creating default periods:', error);
    res.status(500).json({ error: 'Failed to create periods' });
  }
});

// PUT /periods/:id - Update period
app.put('/periods/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = (req as any).user;
    const { name, startTime, endTime, order, isBreak, duration } = req.body;
    const db = getPrisma();

    await ensurePeriodScheduleEditable(db, schoolId);

    const period = await db.period.update({
      where: { id, schoolId },
      data: { name, startTime, endTime, order, isBreak, duration },
    });

    clearTimetableCache(schoolId);

    res.json({ data: period });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error updating period:', error);
    res.status(500).json({ error: 'Failed to update period' });
  }
});

// DELETE /periods/:id - Delete period
app.delete('/periods/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    await ensurePeriodScheduleEditable(db, schoolId);

    await db.period.delete({
      where: { id, schoolId },
    });

    clearTimetableCache(schoolId);

    res.json({ message: 'Period deleted' });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error deleting period:', error);
    res.status(500).json({ error: 'Failed to delete period' });
  }
});

// ========================================
// Timetable Entry Endpoints
// ========================================

// GET /timetable/class/:classId - Get class timetable
app.get('/timetable/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    // Get periods for the school
    const periods = await db.period.findMany({
      where: { schoolId },
      orderBy: { order: 'asc' },
    });

    // Get class info
    const classInfo = await db.class.findFirst({
      where: { id: classId, schoolId },
      include: { academicYear: true },
    });

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get timetable entries
    const entries = await db.timetableEntry.findMany({
      where: {
        classId,
        schoolId,
        academicYearId: (academicYearId as string) || classInfo.academicYearId,
      },
      include: {
        subject: true,
        teacher: true,
        period: true,
      },
    });

    // Build grid structure
    const grid: Record<string, Record<string, any>> = {};
    DAYS_ORDER.forEach((day) => {
      grid[day] = {};
      periods.forEach((period) => {
        const entry = entries.find((e) => e.dayOfWeek === day && e.periodId === period.id);
        grid[day][period.id] = entry || null;
      });
    });

    res.json({
      data: {
        class: classInfo,
        periods,
        entries,
        grid,
        days: DAYS_ORDER.slice(0, 5), // Monday-Friday by default
      },
    });
  } catch (error) {
    console.error('Error fetching class timetable:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// GET /timetable/teacher/:teacherId - Get teacher schedule
app.get('/timetable/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    const teacher = await db.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Get current academic year if not specified
    let yearId = academicYearId as string;
    if (!yearId) {
      const currentYear = await db.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      yearId = currentYear?.id || '';
    }

    const periods = await db.period.findMany({
      where: { schoolId },
      orderBy: { order: 'asc' },
    });

    const entries = await db.timetableEntry.findMany({
      where: {
        teacherId,
        schoolId,
        academicYearId: yearId,
      },
      include: {
        subject: true,
        class: true,
        period: true,
      },
    });

    // Build grid
    const grid: Record<string, Record<string, any>> = {};
    DAYS_ORDER.forEach((day) => {
      grid[day] = {};
      periods.forEach((period) => {
        const entry = entries.find((e) => e.dayOfWeek === day && e.periodId === period.id);
        grid[day][period.id] = entry || null;
      });
    });

    // Count total periods per week
    const totalPeriods = entries.length;

    res.json({
      data: {
        teacher,
        periods,
        entries,
        grid,
        days: DAYS_ORDER.slice(0, 5),
        totalPeriods,
      },
    });
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// POST /timetable/entry - Create timetable entry
app.post('/timetable/entry', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { classId, subjectId, teacherId, periodId, dayOfWeek, room, academicYearId } = req.body;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    await ensureTimetableEditable(db, schoolId, academicYearId);

    // Check for conflicts
    const conflicts = await checkConflicts(db, schoolId, {
      classId,
      teacherId,
      periodId,
      dayOfWeek,
      academicYearId,
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: 'Schedule conflict detected',
        conflicts,
      });
    }

    const entry = await db.timetableEntry.create({
      data: {
        schoolId,
        classId,
        subjectId,
        teacherId,
        periodId,
        dayOfWeek,
        room,
        academicYearId,
      },
      include: {
        subject: true,
        teacher: true,
        period: true,
        class: true,
      },
    });

    clearTimetableCache(schoolId);

    res.json({ data: entry });
  } catch (error: any) {
    if (sendLockError(res, error)) return;
    console.error('Error creating timetable entry:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This time slot is already assigned for this class' });
    }
    res.status(500).json({ error: 'Failed to create timetable entry' });
  }
});

// PUT /timetable/entry/:id - Update timetable entry
app.put('/timetable/entry/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = (req as any).user;
    const { subjectId, teacherId, room } = req.body;
    const db = getPrisma();

    const existing = await db.timetableEntry.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await ensureTimetableEditable(db, schoolId, existing.academicYearId);

    // If teacher changed, check for conflicts
    if (teacherId && teacherId !== existing.teacherId) {
      const conflicts = await checkConflicts(db, schoolId, {
        classId: existing.classId,
        teacherId,
        periodId: existing.periodId,
        dayOfWeek: existing.dayOfWeek,
        academicYearId: existing.academicYearId,
        excludeId: id,
      });

      if (conflicts.length > 0) {
        return res.status(400).json({
          error: 'Teacher has a conflict at this time',
          conflicts,
        });
      }
    }

    const entry = await db.timetableEntry.update({
      where: { id },
      data: { subjectId, teacherId, room },
      include: {
        subject: true,
        teacher: true,
        period: true,
        class: true,
      },
    });

    clearTimetableCache(schoolId);

    res.json({ data: entry });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error updating timetable entry:', error);
    res.status(500).json({ error: 'Failed to update timetable entry' });
  }
});

// DELETE /timetable/entry/:id - Delete timetable entry
app.delete('/timetable/entry/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    const existing = await db.timetableEntry.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await ensureTimetableEditable(db, schoolId, existing.academicYearId);

    await db.timetableEntry.delete({ where: { id } });

    clearTimetableCache(schoolId);

    res.json({ message: 'Entry deleted' });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error deleting timetable entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// POST /timetable/check-conflicts - Check for scheduling conflicts
app.post('/timetable/check-conflicts', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { classId, teacherId, periodId, dayOfWeek, academicYearId } = req.body;
    const db = getPrisma();

    const conflicts = await checkConflicts(db, schoolId, {
      classId,
      teacherId,
      periodId,
      dayOfWeek,
      academicYearId,
    });

    res.json({ data: { hasConflicts: conflicts.length > 0, conflicts } });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// Helper function to check conflicts
async function checkConflicts(
  db: PrismaClient,
  schoolId: string,
  params: {
    classId: string;
    teacherId?: string;
    periodId: string;
    dayOfWeek: DayOfWeek;
    academicYearId: string;
    excludeId?: string;
  }
): Promise<Array<{ type: string; message: string; entry?: any }>> {
  const conflicts: Array<{ type: string; message: string; entry?: any }> = [];
  const { classId, teacherId, periodId, dayOfWeek, academicYearId, excludeId } = params;

  // Check class conflict (class already has this slot assigned)
  const classConflict = await db.timetableEntry.findFirst({
    where: {
      classId,
      periodId,
      dayOfWeek,
      academicYearId,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    include: { subject: true, teacher: true },
  });

  if (classConflict) {
    conflicts.push({
      type: 'CLASS_CONFLICT',
      message: 'This class already has a subject assigned at this time',
      entry: classConflict,
    });
  }

  // Check teacher conflict (teacher already teaching another class)
  if (teacherId) {
    const teacherConflict = await db.timetableEntry.findFirst({
      where: {
        teacherId,
        periodId,
        dayOfWeek,
        academicYearId,
        NOT: { classId },
        ...(excludeId && { NOT: { id: excludeId, classId } }),
      },
      include: { class: true, subject: true },
    });

    if (teacherConflict) {
      conflicts.push({
        type: 'TEACHER_CONFLICT',
        message: 'Teacher is already assigned to another class at this time',
        entry: teacherConflict,
      });
    }
  }

  return conflicts;
}

// POST /timetable/bulk-create - Bulk create entries
app.post('/timetable/bulk-create', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { entries, academicYearId, clearExisting } = req.body;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    await ensureTimetableEditable(db, schoolId, academicYearId);

    // Optionally clear existing entries for this year
    if (clearExisting) {
      await db.timetableEntry.deleteMany({
        where: { schoolId, academicYearId },
      });
    }

    // Check all entries for conflicts first
    const allConflicts: any[] = [];
    for (const entry of entries) {
      const conflicts = await checkConflicts(db, schoolId, {
        classId: entry.classId,
        teacherId: entry.teacherId,
        periodId: entry.periodId,
        dayOfWeek: entry.dayOfWeek,
        academicYearId,
      });
      if (conflicts.length > 0) {
        allConflicts.push({ entry, conflicts });
      }
    }

    if (allConflicts.length > 0 && !clearExisting) {
      return res.status(400).json({
        error: 'Some entries have conflicts',
        conflicts: allConflicts,
      });
    }

    // Create all entries
    const created = await db.timetableEntry.createMany({
      data: entries.map((e: any) => ({
        schoolId,
        classId: e.classId,
        subjectId: e.subjectId,
        teacherId: e.teacherId,
        periodId: e.periodId,
        dayOfWeek: e.dayOfWeek,
        room: e.room,
        academicYearId,
      })),
      skipDuplicates: true,
    });

    clearTimetableCache(schoolId);

    res.json({ data: { created: created.count } });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error bulk creating entries:', error);
    res.status(500).json({ error: 'Failed to bulk create entries' });
  }
});

// GET /timetable/stats - Get timetable statistics
app.get('/timetable/stats', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    // Get current year if not specified
    let yearId = academicYearId as string;
    if (!yearId) {
      const currentYear = await db.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      yearId = currentYear?.id || '';
    }

    const [totalEntries, totalPeriods, totalClasses, totalTeachers, entriesByDay] = await Promise.all([
      db.timetableEntry.count({ where: { schoolId, academicYearId: yearId } }),
      db.period.count({ where: { schoolId, isBreak: false } }),
      db.class.count({ where: { schoolId, academicYearId: yearId } }),
      db.teacher.count({ where: { schoolId } }),
      db.timetableEntry.groupBy({
        by: ['dayOfWeek'],
        where: { schoolId, academicYearId: yearId },
        _count: { id: true },
      }),
    ]);

    // Calculate coverage
    const totalSlots = totalPeriods * totalClasses * 6; // 6 days (Mon-Sat)
    const coverage = totalSlots > 0 ? Math.round((totalEntries / totalSlots) * 100) : 0;

    res.json({
      data: {
        totalEntries,
        totalPeriods,
        totalClasses,
        totalTeachers,
        totalSlots,
        coverage,
        entriesByDay: entriesByDay.map((e) => ({
          day: e.dayOfWeek,
          count: e._count.id,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ========================================
// School Shift Endpoints
// ========================================

// GET /shifts - List all shifts for school
app.get('/shifts', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    const shifts = await db.schoolShift.findMany({
      where: { schoolId },
      orderBy: { startTime: 'asc' },
    });

    res.json({ data: { shifts } });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// POST /shifts/defaults - Create default shifts (Morning + Afternoon)
app.post('/shifts/defaults', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    // Delete existing shifts
    await db.schoolShift.deleteMany({ where: { schoolId } });

    const defaultShifts = [
      {
        name: 'Morning',
        nameKh: 'ព្រឹក',
        startTime: '07:00',
        endTime: '12:00',
        isDefault: true,
        gradeLevel: 'HIGH_SCHOOL' as const,
        color: '#3B82F6',
      },
      {
        name: 'Afternoon',
        nameKh: 'រសៀល',
        startTime: '12:00',
        endTime: '17:00',
        isDefault: true,
        gradeLevel: 'SECONDARY' as const,
        color: '#F59E0B',
      },
    ];

    const created = await db.schoolShift.createMany({
      data: defaultShifts.map((s) => ({ ...s, schoolId })),
    });

    const shifts = await db.schoolShift.findMany({
      where: { schoolId },
      orderBy: { startTime: 'asc' },
    });

    res.json({ data: { shifts, count: created.count } });
  } catch (error) {
    console.error('Error creating default shifts:', error);
    res.status(500).json({ error: 'Failed to create default shifts' });
  }
});

// POST /shifts - Create a shift
app.post('/shifts', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { name, nameKh, startTime, endTime, isDefault, gradeLevel, color } = req.body;
    const db = getPrisma();

    const shift = await db.schoolShift.create({
      data: {
        schoolId,
        name,
        nameKh,
        startTime,
        endTime,
        isDefault: isDefault || false,
        gradeLevel,
        color,
      },
    });

    res.json({ data: shift });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// PUT /shifts/:id - Update shift
app.put('/shifts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = (req as any).user;
    const { name, nameKh, startTime, endTime, isDefault, gradeLevel, color } = req.body;
    const db = getPrisma();

    const shift = await db.schoolShift.update({
      where: { id },
      data: { name, nameKh, startTime, endTime, isDefault, gradeLevel, color },
    });

    res.json({ data: shift });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

// DELETE /shifts/:id - Delete shift
app.delete('/shifts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    await db.schoolShift.delete({ where: { id } });
    res.json({ message: 'Shift deleted' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

// ========================================
// Class Shift Assignment
// ========================================

// POST /shifts/assign-class - Assign shift to class
app.post('/shifts/assign-class', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { classId, shiftId } = req.body;
    const db = getPrisma();

    // Upsert class shift
    const classShift = await db.classShift.upsert({
      where: { classId },
      update: { shiftId },
      create: { classId, shiftId },
      include: { shift: true },
    });

    res.json({ data: classShift });
  } catch (error) {
    console.error('Error assigning shift:', error);
    res.status(500).json({ error: 'Failed to assign shift' });
  }
});

// POST /shifts/override - Override shift for specific day
app.post('/shifts/override', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { classId, dayOfWeek, shiftId } = req.body;
    const db = getPrisma();

    const override = await db.classShiftOverride.upsert({
      where: { classId_dayOfWeek: { classId, dayOfWeek } },
      update: { shiftId },
      create: { classId, dayOfWeek, shiftId },
      include: { shift: true },
    });

    res.json({ data: override });
  } catch (error) {
    console.error('Error creating shift override:', error);
    res.status(500).json({ error: 'Failed to create shift override' });
  }
});

// GET /shifts/class/:classId - Get class shift info
app.get('/shifts/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const db = getPrisma();

    const classShift = await db.classShift.findUnique({
      where: { classId },
      include: { shift: true },
    });

    const overrides = await db.classShiftOverride.findMany({
      where: { classId },
      include: { shift: true },
    });

    res.json({ data: { classShift, overrides } });
  } catch (error) {
    console.error('Error fetching class shift:', error);
    res.status(500).json({ error: 'Failed to fetch class shift' });
  }
});

// ========================================
// Teacher Subject Assignment
// ========================================

// GET /teacher-subjects - Get all teacher-subject assignments
app.get('/teacher-subjects', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const db = getPrisma();

    const assignments = await db.teacherSubjectAssignment.findMany({
      where: {
        teacher: { schoolId },
      },
      include: {
        teacher: true,
        subject: true,
      },
    });

    res.json({ data: { assignments } });
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    res.status(500).json({ error: 'Failed to fetch teacher subjects' });
  }
});

// GET /teacher-subjects/:teacherId - Get subjects for a teacher
app.get('/teacher-subjects/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const db = getPrisma();

    const assignments = await db.teacherSubjectAssignment.findMany({
      where: { teacherId },
      include: { subject: true },
    });

    res.json({ data: { assignments } });
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    res.status(500).json({ error: 'Failed to fetch teacher subjects' });
  }
});

// POST /teacher-subjects - Assign subject to teacher
app.post('/teacher-subjects', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { teacherId, subjectId, isPrimary, maxPeriodsPerWeek, preferredGrades } = req.body;
    const db = getPrisma();

    const assignment = await db.teacherSubjectAssignment.upsert({
      where: { teacherId_subjectId: { teacherId, subjectId } },
      update: { isPrimary, maxPeriodsPerWeek, preferredGrades },
      create: { teacherId, subjectId, isPrimary, maxPeriodsPerWeek, preferredGrades },
      include: { teacher: true, subject: true },
    });

    clearTimetableCache(schoolId);

    res.json({ data: assignment });
  } catch (error) {
    console.error('Error assigning subject:', error);
    res.status(500).json({ error: 'Failed to assign subject' });
  }
});

// DELETE /teacher-subjects/:teacherId/:subjectId - Remove assignment
app.delete('/teacher-subjects/:teacherId/:subjectId', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { teacherId, subjectId } = req.params;
    const db = getPrisma();

    await db.teacherSubjectAssignment.delete({
      where: { teacherId_subjectId: { teacherId, subjectId } },
    });

    clearTimetableCache(schoolId);

    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

// ========================================
// Auto-Assignment Algorithm
// ========================================

interface AutoAssignOptions {
  classId: string;
  academicYearId: string;
  respectTeacherPreferences?: boolean;
  balanceWorkload?: boolean;
  clearExisting?: boolean;
}

// POST /timetable/auto-assign - Auto-assign teachers to class timetable
app.post('/timetable/auto-assign', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { classId, academicYearId, options } = req.body as { classId: string; academicYearId: string; options?: Partial<AutoAssignOptions> };
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    await ensureTimetableEditable(db, schoolId, academicYearId);

    // Get class info
    const classInfo = await db.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        grade: true,
        school: {
          select: {
            workingDays: true,
          },
        },
      },
    });
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get teacher-subject assignments
    const teacherAssignments = await db.teacherSubjectAssignment.findMany({
      where: {
        teacher: { schoolId },
        isActive: true,
        subject: {
          isActive: true,
          grade: classInfo.grade,
        },
      },
      include: { teacher: true, subject: true },
    });

    // Clear existing entries for this class if requested
    if (options?.clearExisting) {
      await db.timetableEntry.deleteMany({
        where: { classId, academicYearId },
      });
    }

    const relevantTeacherAssignments = teacherAssignments.filter((assignment) =>
      !assignment.preferredGrades?.length || assignment.preferredGrades.includes(classInfo.grade)
    );

    const schoolSubjectMap = new Map<string, typeof relevantTeacherAssignments[number]['subject']>();
    relevantTeacherAssignments.forEach((assignment) => {
      if (assignment.subject?.isActive) {
        schoolSubjectMap.set(assignment.subjectId, assignment.subject);
      }
    });

    const subjects = schoolSubjectMap.size > 0
      ? [...schoolSubjectMap.values()]
      : await db.subject.findMany({
          where: { grade: classInfo.grade, isActive: true },
        });

    // Get periods (non-break)
    const periods = await db.period.findMany({
      where: { schoolId, isBreak: false },
      orderBy: { order: 'asc' },
    });

    // Get existing timetable entries for conflict checking
    const existingEntries = await db.timetableEntry.findMany({
      where: { schoolId, academicYearId },
    });

    // Build teacher workload map
    const teacherWorkload = new Map<string, number>();
    existingEntries.forEach((e) => {
      if (e.teacherId) {
        teacherWorkload.set(e.teacherId, (teacherWorkload.get(e.teacherId) || 0) + 1);
      }
    });

    // Build teacher schedule map (day -> period -> teacherId)
    const teacherSchedule = new Map<string, Set<string>>();
    existingEntries.forEach((e) => {
      if (e.teacherId) {
        const key = `${e.dayOfWeek}-${e.periodId}`;
        if (!teacherSchedule.has(key)) {
          teacherSchedule.set(key, new Set());
        }
        teacherSchedule.get(key)!.add(e.teacherId);
      }
    });

    const assignedEntries: any[] = [];
    const unassignedSlots: any[] = [];
    const days = getWorkingDays(classInfo.school?.workingDays);

    // Calculate required periods per subject based on weeklyHours
    const subjectPeriods = new Map<string, number>();
    subjects.forEach((s) => {
      subjectPeriods.set(s.id, getEffectiveWeeklyHours(s));
    });

    // Sort subjects by constraint (fewer available teachers and more required periods = higher priority)
    const sortedSubjects = [...subjects].sort((a, b) => {
      const aTeachers = relevantTeacherAssignments.filter((ta) => ta.subjectId === a.id).length;
      const bTeachers = relevantTeacherAssignments.filter((ta) => ta.subjectId === b.id).length;
      if (aTeachers !== bTeachers) {
        return aTeachers - bTeachers;
      }

      const aRequired = subjectPeriods.get(a.id) || 0;
      const bRequired = subjectPeriods.get(b.id) || 0;
      if (aRequired !== bRequired) {
        return bRequired - aRequired;
      }

      return a.name.localeCompare(b.name);
    });
    const subjectOrder = new Map(sortedSubjects.map((subject, index) => [subject.id, index]));

    // Track assigned periods per subject for this class
    const assignedPerSubject = new Map<string, number>();
    const subjectDayDistribution = new Map<string, number>();
    const remainingSlots = days.flatMap((day) =>
      periods.map((period) => ({
        day,
        period,
        slotKey: `${day}-${period.id}`,
      }))
    );

    const getRemainingRequired = (subjectId: string) =>
      (subjectPeriods.get(subjectId) || 0) - (assignedPerSubject.get(subjectId) || 0);

    const getAvailableTeachersForSlot = (subjectId: string, slotKey: string) =>
      relevantTeacherAssignments.filter((ta) => {
        if (ta.subjectId !== subjectId) return false;
        if (!ta.isActive) return false;

        const busyTeachers = teacherSchedule.get(slotKey) || new Set();
        if (busyTeachers.has(ta.teacherId)) return false;

        const currentWorkload = teacherWorkload.get(ta.teacherId) || 0;
        if (currentWorkload >= ta.maxPeriodsPerWeek) return false;

        if (ta.preferredGrades?.length > 0 && !ta.preferredGrades.includes(classInfo.grade)) {
          return false;
        }

        return true;
      });

    while (remainingSlots.length > 0) {
      const subjectCandidates = sortedSubjects
        .map((subject) => {
          const remainingRequired = getRemainingRequired(subject.id);
          if (remainingRequired <= 0) {
            return null;
          }

          let availableSlotCount = 0;
          const eligibleTeacherIds = new Set<string>();

          for (const slot of remainingSlots) {
            const availableTeachers = getAvailableTeachersForSlot(subject.id, slot.slotKey);
            if (availableTeachers.length === 0) {
              continue;
            }

            availableSlotCount += 1;
            availableTeachers.forEach((teacher) => eligibleTeacherIds.add(teacher.teacherId));
          }

          if (availableSlotCount === 0) {
            return null;
          }

          return {
            subject,
            remainingRequired,
            availableSlotCount,
            teacherCount: eligibleTeacherIds.size,
            slack: availableSlotCount - remainingRequired,
            order: subjectOrder.get(subject.id) || 0,
          };
        })
        .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
        .sort((a, b) => {
          if (a.slack !== b.slack) {
            return a.slack - b.slack;
          }

          if (a.teacherCount !== b.teacherCount) {
            return a.teacherCount - b.teacherCount;
          }

          if (a.remainingRequired !== b.remainingRequired) {
            return b.remainingRequired - a.remainingRequired;
          }

          return a.order - b.order;
        });

      const nextSubject = subjectCandidates[0];
      if (!nextSubject) {
        break;
      }

      const slotCandidates = remainingSlots
        .map((slot, index) => {
          const availableTeachers = getAvailableTeachersForSlot(nextSubject.subject.id, slot.slotKey);
          if (availableTeachers.length === 0) {
            return null;
          }

          let slotFlexibility = 0;
          for (const subject of sortedSubjects) {
            if (getRemainingRequired(subject.id) <= 0) {
              continue;
            }

            if (getAvailableTeachersForSlot(subject.id, slot.slotKey).length > 0) {
              slotFlexibility += 1;
            }
          }

          return {
            index,
            slot,
            availableTeachers,
            slotFlexibility,
            sameDayCount: subjectDayDistribution.get(`${nextSubject.subject.id}-${slot.day}`) || 0,
          };
        })
        .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
        .sort((a, b) => {
          if (a.slotFlexibility !== b.slotFlexibility) {
            return a.slotFlexibility - b.slotFlexibility;
          }

          if (a.sameDayCount !== b.sameDayCount) {
            return a.sameDayCount - b.sameDayCount;
          }

          if (a.availableTeachers.length !== b.availableTeachers.length) {
            return a.availableTeachers.length - b.availableTeachers.length;
          }

          return a.slot.period.order - b.slot.period.order;
        });

      const selectedSlot = slotCandidates[0];
      if (!selectedSlot) {
        break;
      }

      if (options?.balanceWorkload) {
        selectedSlot.availableTeachers.sort((a, b) => {
          const aWork = teacherWorkload.get(a.teacherId) || 0;
          const bWork = teacherWorkload.get(b.teacherId) || 0;
          if (aWork !== bWork) {
            return aWork - bWork;
          }

          return (a.maxPeriodsPerWeek || 0) - (b.maxPeriodsPerWeek || 0);
        });
      }

      const primaryTeacher = selectedSlot.availableTeachers.find((teacher) => teacher.isPrimary);
      const assignedTeacher = primaryTeacher || selectedSlot.availableTeachers[0];
      const assignedSubject = nextSubject.subject;

      const entry = await db.timetableEntry.create({
        data: {
          schoolId,
          classId,
          subjectId: assignedSubject.id,
          teacherId: assignedTeacher.teacherId,
          periodId: selectedSlot.slot.period.id,
          dayOfWeek: selectedSlot.slot.day,
          academicYearId,
        },
        include: { subject: true, teacher: true, period: true },
      });

      assignedEntries.push(entry);
      assignedPerSubject.set(assignedSubject.id, (assignedPerSubject.get(assignedSubject.id) || 0) + 1);
      subjectDayDistribution.set(
        `${assignedSubject.id}-${selectedSlot.slot.day}`,
        (subjectDayDistribution.get(`${assignedSubject.id}-${selectedSlot.slot.day}`) || 0) + 1
      );
      teacherWorkload.set(assignedTeacher.teacherId, (teacherWorkload.get(assignedTeacher.teacherId) || 0) + 1);
      if (!teacherSchedule.has(selectedSlot.slot.slotKey)) {
        teacherSchedule.set(selectedSlot.slot.slotKey, new Set());
      }
      teacherSchedule.get(selectedSlot.slot.slotKey)!.add(assignedTeacher.teacherId);
      remainingSlots.splice(selectedSlot.index, 1);
    }

    remainingSlots.forEach((slot) => {
      unassignedSlots.push({
        day: slot.day,
        periodId: slot.period.id,
        periodName: slot.period.name,
      });
    });

    // Get subject coverage stats
    const subjectCoverage = sortedSubjects.map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      required: subjectPeriods.get(s.id) || 0,
      assigned: assignedPerSubject.get(s.id) || 0,
    }));

    clearTimetableCache(schoolId);

    res.json({
      data: {
        assignedCount: assignedEntries.length,
        unassignedCount: unassignedSlots.length,
        unassignedSlots,
        subjectCoverage,
      },
    });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error in auto-assign:', error);
    res.status(500).json({ error: 'Failed to auto-assign timetable' });
  }
});

// ========================================
// Get Teachers Available for a Slot
// ========================================

// GET /timetable/available-teachers - Get available teachers for a slot
app.get('/timetable/available-teachers', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { periodId, dayOfWeek, academicYearId, subjectId } = req.query;
    const db = getPrisma();

    // Get all teachers with their assignments
    const teachers = await db.teacher.findMany({
      where: { schoolId },
      include: {
        teacherSubjectAssignments: {
          include: { subject: true },
        },
      },
    });

    // Get busy teachers at this slot
    const busyEntries = await db.timetableEntry.findMany({
      where: {
        schoolId,
        periodId: periodId as string,
        dayOfWeek: dayOfWeek as DayOfWeek,
        academicYearId: academicYearId as string,
      },
      select: { teacherId: true, classId: true, class: { select: { name: true } } },
    });

    const busyTeacherIds = new Set(busyEntries.map((e) => e.teacherId).filter(Boolean));

    // Get teacher workloads
    const workloads = await db.timetableEntry.groupBy({
      by: ['teacherId'],
      where: { schoolId, academicYearId: academicYearId as string },
      _count: { id: true },
    });

    const workloadMap = new Map(workloads.map((w) => [w.teacherId, w._count.id]));

    // Filter and annotate teachers
    const availableTeachers = teachers.map((teacher) => {
      const isBusy = busyTeacherIds.has(teacher.id);
      const currentWorkload = workloadMap.get(teacher.id) || 0;
      const subjects = teacher.teacherSubjectAssignments;
      const canTeachSubject = !subjectId || subjects.some((s) => s.subjectId === subjectId);

      return {
        ...teacher,
        isBusy,
        busyWith: isBusy ? busyEntries.find((e) => e.teacherId === teacher.id)?.class?.name : null,
        currentWorkload,
        subjects: subjects.map((s) => ({
          id: s.subjectId,
          name: s.subject.name,
          isPrimary: s.isPrimary,
        })),
        canTeachSubject,
        available: !isBusy && canTeachSubject,
      };
    });

    // Sort: available first, then by workload
    availableTeachers.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return a.currentWorkload - b.currentWorkload;
    });

    res.json({ data: { teachers: availableTeachers } });
  } catch (error) {
    console.error('Error fetching available teachers:', error);
    res.status(500).json({ error: 'Failed to fetch available teachers' });
  }
});

// ========================================
// Bulk Move/Swap Entries (for drag & drop)
// ========================================

// POST /timetable/move - Move entry to new slot
app.post('/timetable/move', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { entryId, newPeriodId, newDayOfWeek } = req.body;
    const db = getPrisma();

    // Get existing entry
    const entry = await db.timetableEntry.findFirst({
      where: { id: entryId, schoolId },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await ensureTimetableEditable(db, schoolId, entry.academicYearId);

    // Check for conflicts at new slot
    const conflicts = await checkConflicts(db, schoolId, {
      classId: entry.classId,
      teacherId: entry.teacherId || undefined,
      periodId: newPeriodId,
      dayOfWeek: newDayOfWeek,
      academicYearId: entry.academicYearId,
      excludeId: entryId,
    });

    if (conflicts.length > 0) {
      return res.status(400).json({ error: 'Conflict at new slot', conflicts });
    }

    // Update entry
    const updated = await db.timetableEntry.update({
      where: { id: entryId },
      data: { periodId: newPeriodId, dayOfWeek: newDayOfWeek },
      include: { subject: true, teacher: true, period: true, class: true },
    });

    clearTimetableCache(schoolId);

    res.json({ data: updated });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error moving entry:', error);
    res.status(500).json({ error: 'Failed to move entry' });
  }
});

// POST /timetable/swap - Swap two entries
app.post('/timetable/swap', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { entryId1, entryId2 } = req.body;
    const db = getPrisma();

    const [entry1, entry2] = await Promise.all([
      db.timetableEntry.findFirst({ where: { id: entryId1, schoolId } }),
      db.timetableEntry.findFirst({ where: { id: entryId2, schoolId } }),
    ]);

    if (!entry1 || !entry2) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await ensureTimetableEditable(db, schoolId, entry1.academicYearId);
    if (entry2.academicYearId !== entry1.academicYearId) {
      await ensureTimetableEditable(db, schoolId, entry2.academicYearId);
    }

    // Check if swap would cause conflicts
    // For entry1 moving to entry2's slot
    const conflicts1 = await checkConflicts(db, schoolId, {
      classId: entry1.classId,
      teacherId: entry1.teacherId || undefined,
      periodId: entry2.periodId,
      dayOfWeek: entry2.dayOfWeek,
      academicYearId: entry1.academicYearId,
      excludeId: entry1.id,
    });

    // For entry2 moving to entry1's slot
    const conflicts2 = await checkConflicts(db, schoolId, {
      classId: entry2.classId,
      teacherId: entry2.teacherId || undefined,
      periodId: entry1.periodId,
      dayOfWeek: entry1.dayOfWeek,
      academicYearId: entry2.academicYearId,
      excludeId: entry2.id,
    });

    // Filter out conflicts between the two entries being swapped
    const realConflicts = [...conflicts1, ...conflicts2].filter((c) => {
      if (c.entry?.id === entry1.id || c.entry?.id === entry2.id) return false;
      return true;
    });

    if (realConflicts.length > 0) {
      return res.status(400).json({ error: 'Swap would cause conflicts', conflicts: realConflicts });
    }

    // Perform swap using a transaction
    const [updated1, updated2] = await db.$transaction([
      db.timetableEntry.update({
        where: { id: entryId1 },
        data: { periodId: entry2.periodId, dayOfWeek: entry2.dayOfWeek },
        include: { subject: true, teacher: true, period: true },
      }),
      db.timetableEntry.update({
        where: { id: entryId2 },
        data: { periodId: entry1.periodId, dayOfWeek: entry1.dayOfWeek },
        include: { subject: true, teacher: true, period: true },
      }),
    ]);

    clearTimetableCache(schoolId);

    res.json({ data: { entry1: updated1, entry2: updated2 } });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error swapping entries:', error);
    res.status(500).json({ error: 'Failed to swap entries' });
  }
});

// ========================================
// Timetable Publishing
// ========================================

// GET /timetable/publish-status - Get official timetable lock state
app.get('/timetable/publish-status', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    const publishState = await getTimetablePublishState(db, schoolId, academicYearId as string);
    res.json({ data: publishState });
  } catch (error) {
    console.error('Error fetching timetable publish status:', error);
    res.status(500).json({ error: 'Failed to fetch publish status' });
  }
});

// GET /timetable/validation - Validate timetable readiness
app.get('/timetable/validation', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    const report = await buildTimetableValidationReport(db, schoolId, academicYearId as string);
    res.json({ data: report });
  } catch (error) {
    console.error('Error validating timetable:', error);
    res.status(500).json({ error: 'Failed to validate timetable' });
  }
});

// POST /timetable/publish - Publish timetable
app.post('/timetable/publish', authenticate, async (req, res) => {
  try {
    const { schoolId, userId } = (req as any).user;
    const { academicYearId, notifyTeachers, notifyClasses, notes } = req.body;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    const validation = await buildTimetableValidationReport(db, schoolId, academicYearId);
    if (validation.status === 'BLOCKED') {
      return res.status(400).json({
        error: 'Resolve timetable blockers before publishing',
        validation,
      });
    }

    const currentState = await getTimetablePublishState(db, schoolId, academicYearId);
    if (currentState.isPublished) {
      return res.json({ data: currentState.latest, validation, message: 'Timetable is already published' });
    }

    const publish = await db.timetablePublish.create({
      data: {
        schoolId,
        academicYearId,
        publishedBy: userId,
        status: 'PUBLISHED',
        notifyTeachers: notifyTeachers || false,
        notifyClasses: notifyClasses || false,
        notes,
      },
    });

    // TODO: Send notifications if enabled
    clearTimetableCache(schoolId);

    res.json({ data: publish, validation });
  } catch (error) {
    console.error('Error publishing timetable:', error);
    res.status(500).json({ error: 'Failed to publish timetable' });
  }
});

// POST /timetable/unpublish - Return an official timetable to draft mode
app.post('/timetable/unpublish', authenticate, async (req, res) => {
  try {
    const { schoolId, userId } = (req as any).user;
    const { academicYearId, notes } = req.body;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    const currentState = await getTimetablePublishState(db, schoolId, academicYearId);
    if (!currentState.isPublished) {
      return res.json({ data: currentState.latest, message: 'Timetable is already editable' });
    }

    const unpublish = await db.timetablePublish.create({
      data: {
        schoolId,
        academicYearId,
        publishedBy: userId,
        status: 'ARCHIVED',
        notifyTeachers: false,
        notifyClasses: false,
        notes: notes || 'Returned to draft for timetable changes.',
      },
    });

    clearTimetableCache(schoolId);

    res.json({ data: unpublish });
  } catch (error) {
    console.error('Error unpublishing timetable:', error);
    res.status(500).json({ error: 'Failed to unpublish timetable' });
  }
});

// GET /timetable/conflict-exceptions - List approved timetable conflict exceptions
app.get('/timetable/conflict-exceptions', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    const exceptions = await (db as any).timetableConflictException.findMany({
      where: { schoolId, academicYearId: academicYearId as string, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: exceptions });
  } catch (error) {
    console.error('Error fetching timetable conflict exceptions:', error);
    res.status(500).json({ error: 'Failed to fetch conflict exceptions' });
  }
});

// POST /timetable/conflict-exceptions - Approve a known timetable conflict
app.post('/timetable/conflict-exceptions', authenticate, async (req, res) => {
  try {
    const { schoolId, userId } = (req as any).user;
    const { academicYearId, type, entryIds, reason } = req.body as {
      academicYearId?: string;
      type?: string;
      entryIds?: string[];
      reason?: string;
    };
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }
    if (type !== 'TEACHER_CONFLICT') {
      return res.status(400).json({ error: 'Only teacher conflict exceptions can be approved.' });
    }
    if (!Array.isArray(entryIds) || entryIds.length < 2) {
      return res.status(400).json({ error: 'At least two timetable entry IDs are required.' });
    }

    await ensureTimetableEditable(db, schoolId, academicYearId);

    const normalizedEntryIds = Array.from(new Set(entryIds.filter(Boolean))).sort();
    const entries = await db.timetableEntry.findMany({
      where: {
        id: { in: normalizedEntryIds },
        schoolId,
        academicYearId,
      },
      include: {
        class: true,
        teacher: true,
        subject: true,
        period: true,
      },
    });

    if (entries.length !== normalizedEntryIds.length) {
      return res.status(404).json({ error: 'One or more timetable entries were not found.' });
    }

    const first = entries[0];
    if (!first.teacherId) {
      return res.status(400).json({ error: 'Teacher conflict exceptions require a teacher.' });
    }

    const sameTeacherSlot = entries.every((entry) =>
      entry.teacherId === first.teacherId &&
      entry.periodId === first.periodId &&
      entry.dayOfWeek === first.dayOfWeek
    );

    if (!sameTeacherSlot) {
      return res.status(400).json({
        error: 'These entries are not the same teacher in the same day and period.',
      });
    }

    const fingerprint = buildConflictFingerprint('TEACHER_CONFLICT', entries);
    const subjectIds = new Set(entries.map((entry) => entry.subjectId).filter(Boolean));
    const approvalReason = reason?.trim() || 'Approved combined-class session.';
    const exception = await (db as any).timetableConflictException.upsert({
      where: {
        schoolId_academicYearId_type_fingerprint: {
          schoolId,
          academicYearId,
          type: 'TEACHER_CONFLICT',
          fingerprint,
        },
      },
      update: {
        teacherId: first.teacherId,
        periodId: first.periodId,
        dayOfWeek: first.dayOfWeek,
        subjectId: subjectIds.size === 1 ? first.subjectId : null,
        entryIds: normalizedEntryIds,
        reason: approvalReason,
        approvedBy: userId,
        isActive: true,
        metadata: { entries: serializeConflictEntries(entries) },
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
      },
      create: {
        schoolId,
        academicYearId,
        type: 'TEACHER_CONFLICT',
        fingerprint,
        teacherId: first.teacherId,
        periodId: first.periodId,
        dayOfWeek: first.dayOfWeek,
        subjectId: subjectIds.size === 1 ? first.subjectId : null,
        entryIds: normalizedEntryIds,
        reason: approvalReason,
        approvedBy: userId,
        metadata: { entries: serializeConflictEntries(entries) },
      },
    });

    clearTimetableCache(schoolId);

    const validation = await buildTimetableValidationReport(db, schoolId, academicYearId);
    res.json({ data: exception, validation });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error approving timetable conflict exception:', error);
    res.status(500).json({ error: 'Failed to approve conflict exception' });
  }
});

// DELETE /timetable/conflict-exceptions/:id - Revoke an approved exception
app.delete('/timetable/conflict-exceptions/:id', authenticate, async (req, res) => {
  try {
    const { schoolId, userId } = (req as any).user;
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const db = getPrisma();

    const existing = await (db as any).timetableConflictException.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Conflict exception not found' });
    }

    await ensureTimetableEditable(db, schoolId, existing.academicYearId);

    const revoked = await (db as any).timetableConflictException.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: userId,
        revokeReason: reason?.trim() || 'Exception revoked from timetable validation.',
      },
    });

    clearTimetableCache(schoolId);

    const validation = await buildTimetableValidationReport(db, schoolId, existing.academicYearId);
    res.json({ data: revoked, validation });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error revoking timetable conflict exception:', error);
    res.status(500).json({ error: 'Failed to revoke conflict exception' });
  }
});

// GET /timetable/all-classes - Get timetables for all classes (for overview)
app.get('/timetable/all-classes', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId, gradeLevel } = req.query;
    const db = getPrisma();
    const cacheKey = `${schoolId}:timetable:all-classes:${String(academicYearId || '')}:${String(gradeLevel || 'all')}`;
    const cachedResponse = readTimetableCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Get classes
    const classes = await db.class.findMany({
      where: {
        schoolId,
        academicYearId: academicYearId as string,
        ...(gradeLevel && {
          grade: {
            in: gradeLevel === 'SECONDARY' ? ['7', '8', '9'] : ['10', '11', '12'],
          },
        }),
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });

    // Get entry counts per class
    const entryCounts = await db.timetableEntry.groupBy({
      by: ['classId'],
      where: {
        schoolId,
        academicYearId: academicYearId as string,
      },
      _count: { id: true },
    });

    const countMap = new Map(entryCounts.map((c) => [c.classId, c._count.id]));

    const periods = await db.period.count({
      where: { schoolId, isBreak: false },
    });

    const totalSlots = periods * 6; // 6 days (Mon-Sat)

    const classesWithStats = classes.map((c) => ({
      ...c,
      entryCount: countMap.get(c.id) || 0,
      totalSlots,
      coverage: totalSlots > 0 ? Math.round(((countMap.get(c.id) || 0) / totalSlots) * 100) : 0,
    }));

    const responseBody = { data: { classes: classesWithStats } };
    writeTimetableCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error) {
    console.error('Error fetching all classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// ========================================
// Enhanced Timetable Endpoints
// ========================================

// GET /timetable/teacher-availability - Check teacher availability for a slot
app.get('/timetable/teacher-availability', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { dayOfWeek, periodNumber, academicYearId } = req.query;
    const db = getPrisma();

    if (!dayOfWeek || !periodNumber || !academicYearId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Find the period by number/order
    const period = await db.period.findFirst({
      where: {
        schoolId,
        order: parseInt(periodNumber as string),
        isBreak: false,
      },
    });

    if (!period) {
      return res.status(404).json({ error: 'Period not found' });
    }

    // Get all teachers
    const teachers = await db.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customFields: true,
      },
    });

    // Get all entries for this time slot
    const busyEntries = await db.timetableEntry.findMany({
      where: {
        schoolId,
        dayOfWeek: dayOfWeek as DayOfWeek,
        periodId: period.id,
        academicYearId: academicYearId as string,
        teacherId: { not: null },
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    // Build busy teachers map
    const busyTeachers = new Set<string>();
    const teacherBusyInfo: Record<string, string> = {};

    busyEntries.forEach((entry) => {
      if (entry.teacherId) {
        busyTeachers.add(entry.teacherId);
        teacherBusyInfo[entry.teacherId] = `${entry.class?.name || 'Unknown'} - ${entry.subject?.name || 'Unknown'}`;
      }
    });

    res.json({
      data: {
        busyTeachers: Array.from(busyTeachers),
        teacherBusyInfo,
        totalTeachers: teachers.length,
        availableCount: teachers.length - busyTeachers.size,
      },
    });
  } catch (error) {
    console.error('Error checking teacher availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// POST /timetable/entry-by-period - Create entry using period number instead of periodId
app.post('/timetable/entry-by-period', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { classId, subjectId, teacherId, periodNumber, dayOfWeek, room, academicYearId } = req.body;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    await ensureTimetableEditable(db, schoolId, academicYearId);

    // Find the period by number
    const period = await db.period.findFirst({
      where: {
        schoolId,
        order: periodNumber,
        isBreak: false,
      },
    });

    if (!period) {
      return res.status(404).json({ error: 'Period not found' });
    }

    // Check for conflicts
    const conflicts = await checkConflicts(db, schoolId, {
      classId,
      teacherId,
      periodId: period.id,
      dayOfWeek,
      academicYearId,
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: 'Schedule conflict detected',
        conflicts,
      });
    }

    const entry = await db.timetableEntry.create({
      data: {
        schoolId,
        classId,
        subjectId,
        teacherId,
        periodId: period.id,
        dayOfWeek,
        room,
        academicYearId,
      },
      include: {
        subject: true,
        teacher: true,
        period: true,
        class: true,
      },
    });

    clearTimetableCache(schoolId);

    res.json({ data: entry });
  } catch (error: any) {
    if (sendLockError(res, error)) return;
    console.error('Error creating timetable entry:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This time slot is already assigned for this class' });
    }
    res.status(500).json({ error: 'Failed to create timetable entry' });
  }
});

// POST /timetable/move-entry - Move entry to a new slot
app.post('/timetable/move-entry', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { entryId, newDayOfWeek, newPeriodNumber } = req.body;
    const db = getPrisma();

    // Get existing entry
    const entry = await db.timetableEntry.findFirst({
      where: { id: entryId, schoolId },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await ensureTimetableEditable(db, schoolId, entry.academicYearId);

    // Find new period
    const newPeriod = await db.period.findFirst({
      where: {
        schoolId,
        order: newPeriodNumber,
        isBreak: false,
      },
    });

    if (!newPeriod) {
      return res.status(404).json({ error: 'Target period not found' });
    }

    // Check if target slot is already occupied
    const existingEntry = await db.timetableEntry.findFirst({
      where: {
        schoolId,
        classId: entry.classId,
        dayOfWeek: newDayOfWeek,
        periodId: newPeriod.id,
        academicYearId: entry.academicYearId,
        id: { not: entryId },
      },
    });

    if (existingEntry) {
      return res.status(400).json({ error: 'Target slot is already occupied' });
    }

    // Check for teacher conflicts in new slot
    if (entry.teacherId) {
      const teacherConflict = await db.timetableEntry.findFirst({
        where: {
          schoolId,
          teacherId: entry.teacherId,
          dayOfWeek: newDayOfWeek,
          periodId: newPeriod.id,
          academicYearId: entry.academicYearId,
          id: { not: entryId },
        },
        include: { class: true },
      });

      if (teacherConflict) {
        return res.status(400).json({
          error: `Teacher is already assigned to ${teacherConflict.class?.name || 'another class'} at this time`,
        });
      }
    }

    // Update the entry
    const updatedEntry = await db.timetableEntry.update({
      where: { id: entryId },
      data: {
        dayOfWeek: newDayOfWeek,
        periodId: newPeriod.id,
      },
      include: {
        subject: true,
        teacher: true,
        period: true,
        class: true,
      },
    });

    clearTimetableCache(schoolId);

    res.json({ data: updatedEntry });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error moving entry:', error);
    res.status(500).json({ error: 'Failed to move entry' });
  }
});

// GET /timetable/master-stats - Get school-wide timetable statistics
app.get('/timetable/master-stats', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    const cacheKey = `${schoolId}:timetable:master-stats:${academicYearId as string}`;
    const cachedResponse = readTimetableCache(cacheKey);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const [classes, classEntryCounts, periods, teacherCount, timetableEntries, activeExceptions] = await Promise.all([
      db.class.findMany({
        where: { schoolId, academicYearId: academicYearId as string },
        select: {
          id: true,
          name: true,
          grade: true,
          section: true,
        },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }, { name: 'asc' }],
      }),
      db.timetableEntry.groupBy({
        by: ['classId'],
        where: { schoolId, academicYearId: academicYearId as string },
        _count: { id: true },
      }),
      db.period.count({
        where: { schoolId, isBreak: false },
      }),
      db.teacher.count({
        where: { schoolId },
      }),
      db.timetableEntry.findMany({
        where: { schoolId, academicYearId: academicYearId as string },
        select: {
          id: true,
          classId: true,
          teacherId: true,
          periodId: true,
          dayOfWeek: true,
        },
      }),
      (db as any).timetableConflictException.findMany({
        where: { schoolId, academicYearId: academicYearId as string, isActive: true },
        select: { fingerprint: true },
      }),
    ]);

    const entriesByClass = new Map<string, number>(
      classEntryCounts.map((entry) => [entry.classId, entry._count.id])
    );
    const conflictsByClass = new Map<string, number>();
    const teacherSlotMap = new Map<string, typeof timetableEntries>();
    const classSlotMap = new Map<string, typeof timetableEntries>();
    const approvedExceptionFingerprints = new Set<string>(
      activeExceptions.map((exception: any) => exception.fingerprint)
    );

    for (const entry of timetableEntries) {
      const classSlotKey = `${entry.classId}|${entry.dayOfWeek}|${entry.periodId}`;
      classSlotMap.set(classSlotKey, [...(classSlotMap.get(classSlotKey) || []), entry]);

      if (entry.teacherId) {
        const teacherSlotKey = `${entry.teacherId}|${entry.dayOfWeek}|${entry.periodId}`;
        teacherSlotMap.set(teacherSlotKey, [...(teacherSlotMap.get(teacherSlotKey) || []), entry]);
      }
    }

    for (const group of classSlotMap.values()) {
      if (group.length <= 1) continue;
      for (const entry of group) {
        conflictsByClass.set(entry.classId, (conflictsByClass.get(entry.classId) || 0) + 1);
      }
    }

    for (const group of teacherSlotMap.values()) {
      if (group.length <= 1) continue;
      const fingerprint = buildConflictFingerprint('TEACHER_CONFLICT', group);
      if (approvedExceptionFingerprints.has(fingerprint)) continue;
      for (const entry of group) {
        conflictsByClass.set(entry.classId, (conflictsByClass.get(entry.classId) || 0) + 1);
      }
    }

    const filledSlots = classEntryCounts.reduce(
      (sum, entry) => sum + entry._count.id,
      0
    );
    const totalSlots = classes.length * periods * 6; // 6 days

    const secondaryGrades = new Set(['7', '8', '9']);
    const highSchoolGrades = new Set(['10', '11', '12']);
    let secondaryClassCount = 0;
    let highSchoolClassCount = 0;
    let secondaryFilled = 0;
    let highSchoolFilled = 0;

    const classSummaries = classes.map((cls) => {
      const entryCount = entriesByClass.get(cls.id) || 0;
      const classTotalSlots = periods * 6;
      const grade = String(cls.grade);

      if (secondaryGrades.has(grade)) {
        secondaryClassCount += 1;
        secondaryFilled += entryCount;
      }
      if (highSchoolGrades.has(grade)) {
        highSchoolClassCount += 1;
        highSchoolFilled += entryCount;
      }

      return {
        id: cls.id,
        name: cls.name,
        grade: typeof cls.grade === 'string' ? parseInt(cls.grade, 10) : cls.grade,
        section: cls.section || null,
        entryCount,
        totalSlots: classTotalSlots,
        coverage: classTotalSlots > 0 ? Math.round((entryCount / classTotalSlots) * 100) : 0,
        conflicts: conflictsByClass.get(cls.id) || 0,
      };
    });

    const secondarySlots = secondaryClassCount * periods * 6;
    const highSchoolSlots = highSchoolClassCount * periods * 6;

    const responseBody = {
      data: {
        totalClasses: classes.length,
        totalSlots,
        filledSlots,
        coverage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0,
        secondary: {
          classes: secondaryClassCount,
          slots: secondarySlots,
          filled: secondaryFilled,
          coverage: secondarySlots > 0 ? Math.round((secondaryFilled / secondarySlots) * 100) : 0,
        },
        highSchool: {
          classes: highSchoolClassCount,
          slots: highSchoolSlots,
          filled: highSchoolFilled,
          coverage: highSchoolSlots > 0 ? Math.round((highSchoolFilled / highSchoolSlots) * 100) : 0,
        },
        teacherStats: {
          total: teacherCount,
          avgHoursPerTeacher: teacherCount > 0
            ? Math.round(filledSlots / teacherCount)
            : 0,
        },
        classes: classSummaries,
      },
    };

    writeTimetableCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error) {
    console.error('Error fetching master stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /timetable/all-teacher-workloads - Get workload for all teachers
app.get('/timetable/all-teacher-workloads', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId } = req.query;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    const cacheKey = `${schoolId}:timetable:all-teacher-workloads:${academicYearId as string}`;
    const cachedResponse = readTimetableCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Get all teachers with their assignments
    const teachers = await db.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        customFields: true,
      },
    });

    const [entryCounts, entries, assignments] = await Promise.all([
      db.timetableEntry.groupBy({
        by: ['teacherId'],
        where: {
          schoolId,
          academicYearId: academicYearId as string,
          teacherId: { not: null },
        },
        _count: { id: true },
      }),
      db.timetableEntry.findMany({
        where: {
          schoolId,
          academicYearId: academicYearId as string,
          teacherId: { not: null },
        },
        select: {
          teacherId: true,
          classId: true,
          class: {
            select: {
              name: true,
            },
          },
          subject: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.teacherSubjectAssignment.findMany({
        where: {
          teacher: { schoolId },
        },
        select: {
          teacherId: true,
          maxPeriodsPerWeek: true,
        },
      }),
    ]);

    const countMap = new Map(entryCounts.map((c) => [c.teacherId, c._count.id]));

    const maxHoursMap = new Map<string, number>();
    assignments.forEach((a) => {
      const current = maxHoursMap.get(a.teacherId) || 25;
      maxHoursMap.set(a.teacherId, Math.max(current, a.maxPeriodsPerWeek || 25));
    });

    const assignmentSummaryMap = new Map<
      string,
      Map<string, { classId: string; className: string; subjectName: string; hoursPerWeek: number }>
    >();

    entries.forEach((entry) => {
      if (!entry.teacherId) return;

      const teacherAssignments = assignmentSummaryMap.get(entry.teacherId) || new Map();
      const subjectName = entry.subject?.name || 'Unknown Subject';
      const className = entry.class?.name || 'Unknown Class';
      const summaryKey = `${entry.classId}:${subjectName}`;
      const existing = teacherAssignments.get(summaryKey);

      if (existing) {
        existing.hoursPerWeek += 1;
      } else {
        teacherAssignments.set(summaryKey, {
          classId: entry.classId,
          className,
          subjectName,
          hoursPerWeek: 1,
        });
      }

      assignmentSummaryMap.set(entry.teacherId, teacherAssignments);
    });

    const teacherWorkloads = teachers.map((t) => ({
      id: t.id,
      firstName: t.firstName || '',
      lastName: t.lastName || '',
      firstNameLatin: t.firstName || '',
      lastNameLatin: t.lastName || '',
      khmerName: (t.customFields as any)?.regional?.khmerName || null,
      email: t.email || null,
      totalHoursAssigned: countMap.get(t.id) || 0,
      maxHoursPerWeek: maxHoursMap.get(t.id) || 25,
      assignedClasses: Array.from(assignmentSummaryMap.get(t.id)?.values() || []).sort((a, b) => {
        if (a.className === b.className) {
          return a.subjectName.localeCompare(b.subjectName);
        }
        return a.className.localeCompare(b.className);
      }),
    }));

    const responseBody = { data: { teachers: teacherWorkloads } };
    writeTimetableCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error) {
    console.error('Error fetching teacher workloads:', error);
    res.status(500).json({ error: 'Failed to fetch workloads' });
  }
});

// ========================================
// Clear Class Timetable
// ========================================

// DELETE /timetable/clear-class/:classId - Clear all entries for a class
app.delete('/timetable/clear-class/:classId', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { classId } = req.params;
    const { academicYearId } = req.query;
    const db = getPrisma();

    // Verify class belongs to school
    const classInfo = await db.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (academicYearId) {
      await ensureTimetableEditable(db, schoolId, academicYearId as string);
    } else {
      const locks = await getPublishedTimetableLocks(db, schoolId);
      if (locks.length > 0) {
        const error = new Error('This action could affect a published timetable. Select a draft academic year or unpublish before clearing.');
        (error as any).statusCode = 423;
        (error as any).publishedAcademicYearIds = locks.map((lock) => lock.academicYearId);
        throw error;
      }
    }

    // Delete all entries for this class
    const deleted = await db.timetableEntry.deleteMany({
      where: {
        classId,
        schoolId,
        ...(academicYearId && { academicYearId: academicYearId as string }),
      },
    });

    clearTimetableCache(schoolId);

    res.json({
      data: {
        deletedCount: deleted.count,
        message: `Cleared ${deleted.count} timetable entries for ${classInfo.name}`,
      },
    });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error clearing class timetable:', error);
    res.status(500).json({ error: 'Failed to clear timetable' });
  }
});

// ========================================
// Copy Class Timetable
// ========================================

// POST /timetable/copy-class - Copy timetable from one class to another
app.post('/timetable/copy-class', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { sourceClassId, targetClassId, academicYearId, clearTarget } = req.body;
    const db = getPrisma();

    if (!academicYearId) {
      return res.status(400).json({ error: 'academicYearId is required' });
    }

    await ensureTimetableEditable(db, schoolId, academicYearId);

    // Verify both classes belong to school
    const [sourceClass, targetClass] = await Promise.all([
      db.class.findFirst({ where: { id: sourceClassId, schoolId } }),
      db.class.findFirst({ where: { id: targetClassId, schoolId } }),
    ]);

    if (!sourceClass) {
      return res.status(404).json({ error: 'Source class not found' });
    }
    if (!targetClass) {
      return res.status(404).json({ error: 'Target class not found' });
    }

    // Get source entries
    const sourceEntries = await db.timetableEntry.findMany({
      where: {
        classId: sourceClassId,
        schoolId,
        academicYearId,
      },
    });

    if (sourceEntries.length === 0) {
      return res.status(400).json({ error: 'Source class has no timetable entries' });
    }

    // Clear target if requested
    if (clearTarget) {
      await db.timetableEntry.deleteMany({
        where: {
          classId: targetClassId,
          schoolId,
          academicYearId,
        },
      });
    }

    // Check for conflicts at target
    const existingTargetEntries = await db.timetableEntry.findMany({
      where: {
        classId: targetClassId,
        schoolId,
        academicYearId,
      },
    });

    const existingSlots = new Set(
      existingTargetEntries.map((e) => `${e.dayOfWeek}-${e.periodId}`)
    );

    // Filter entries that can be copied (no slot conflicts)
    const entriesToCopy = sourceEntries.filter((e) => {
      const slotKey = `${e.dayOfWeek}-${e.periodId}`;
      return !existingSlots.has(slotKey);
    });

    // Check for teacher conflicts
    const conflictingEntries: any[] = [];
    const validEntries: any[] = [];

    for (const entry of entriesToCopy) {
      if (entry.teacherId) {
        // Check if teacher is busy at this slot
        const teacherConflict = await db.timetableEntry.findFirst({
          where: {
            teacherId: entry.teacherId,
            dayOfWeek: entry.dayOfWeek,
            periodId: entry.periodId,
            academicYearId,
            classId: { not: targetClassId },
          },
          include: { class: true },
        });

        if (teacherConflict) {
          conflictingEntries.push({
            entry,
            conflict: `Teacher busy with ${teacherConflict.class?.name || 'another class'}`,
          });
          continue;
        }
      }
      validEntries.push(entry);
    }

    // Create new entries for target class
    if (validEntries.length > 0) {
      await db.timetableEntry.createMany({
        data: validEntries.map((e) => ({
          schoolId,
          classId: targetClassId,
          subjectId: e.subjectId,
          teacherId: e.teacherId,
          periodId: e.periodId,
          dayOfWeek: e.dayOfWeek,
          room: e.room,
          academicYearId,
        })),
        skipDuplicates: true,
      });
    }

    clearTimetableCache(schoolId);

    res.json({
      data: {
        copiedCount: validEntries.length,
        conflictCount: conflictingEntries.length,
        skippedCount: sourceEntries.length - entriesToCopy.length,
        conflicts: conflictingEntries.map((c) => ({
          dayOfWeek: c.entry.dayOfWeek,
          periodId: c.entry.periodId,
          reason: c.conflict,
        })),
        message: `Copied ${validEntries.length} entries from ${sourceClass.name} to ${targetClass.name}`,
      },
    });
  } catch (error) {
    if (sendLockError(res, error)) return;
    console.error('Error copying timetable:', error);
    res.status(500).json({ error: 'Failed to copy timetable' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'timetable-service', port: PORT });
});

// Start server
app.listen(PORT, () => {
  console.log(`🕐 Timetable Service running on port ${PORT}`);
});
