import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient, DayOfWeek } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables - try root .env first, then packages/database/.env
dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../packages/database/.env' });

const app = express();
const PORT = process.env.TIMETABLE_SERVICE_PORT || 3009;

// Prisma Singleton with connection pooling
let prisma: PrismaClient;

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

app.use(cors());
app.use(express.json());

// JWT Secret - must match auth service
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-v2-jwt-secret-change-in-production';

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

    res.json({ data: period });
  } catch (error) {
    console.error('Error creating period:', error);
    res.status(500).json({ error: 'Failed to create period' });
  }
});

// POST /periods/bulk - Create default periods
app.post('/periods/bulk', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const db = getPrisma();

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

    res.json({ data: { periods, count: created.count } });
  } catch (error) {
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

    const period = await db.period.update({
      where: { id, schoolId },
      data: { name, startTime, endTime, order, isBreak, duration },
    });

    res.json({ data: period });
  } catch (error) {
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

    await db.period.delete({
      where: { id, schoolId },
    });

    res.json({ message: 'Period deleted' });
  } catch (error) {
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

    res.json({ data: entry });
  } catch (error: any) {
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

    res.json({ data: entry });
  } catch (error) {
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

    await db.timetableEntry.delete({
      where: { id, schoolId },
    });

    res.json({ message: 'Entry deleted' });
  } catch (error) {
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

    res.json({ data: { created: created.count } });
  } catch (error) {
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
    const { teacherId, subjectId, isPrimary, maxPeriodsPerWeek, preferredGrades } = req.body;
    const db = getPrisma();

    const assignment = await db.teacherSubjectAssignment.upsert({
      where: { teacherId_subjectId: { teacherId, subjectId } },
      update: { isPrimary, maxPeriodsPerWeek, preferredGrades },
      create: { teacherId, subjectId, isPrimary, maxPeriodsPerWeek, preferredGrades },
      include: { teacher: true, subject: true },
    });

    res.json({ data: assignment });
  } catch (error) {
    console.error('Error assigning subject:', error);
    res.status(500).json({ error: 'Failed to assign subject' });
  }
});

// DELETE /teacher-subjects/:teacherId/:subjectId - Remove assignment
app.delete('/teacher-subjects/:teacherId/:subjectId', authenticate, async (req, res) => {
  try {
    const { teacherId, subjectId } = req.params;
    const db = getPrisma();

    await db.teacherSubjectAssignment.delete({
      where: { teacherId_subjectId: { teacherId, subjectId } },
    });

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

    // Get class info
    const classInfo = await db.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get subjects for this grade
    const subjects = await db.subject.findMany({
      where: { grade: classInfo.grade, isActive: true },
    });

    // Get periods (non-break)
    const periods = await db.period.findMany({
      where: { schoolId, isBreak: false },
      orderBy: { order: 'asc' },
    });

    // Get teacher-subject assignments
    const teacherAssignments = await db.teacherSubjectAssignment.findMany({
      where: {
        teacher: { schoolId },
        isActive: true,
      },
      include: { teacher: true, subject: true },
    });

    // Get existing timetable entries for conflict checking
    const existingEntries = await db.timetableEntry.findMany({
      where: { schoolId, academicYearId },
    });

    // Clear existing entries for this class if requested
    if (options?.clearExisting) {
      await db.timetableEntry.deleteMany({
        where: { classId, academicYearId },
      });
    }

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
    const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    // Calculate required periods per subject based on weeklyHours
    const subjectPeriods = new Map<string, number>();
    subjects.forEach((s) => {
      // weeklyHours is typically the number of hours per week (e.g., 5 = 5 periods)
      subjectPeriods.set(s.id, Math.ceil(s.weeklyHours || 1));
    });

    // Sort subjects by constraint (fewer available teachers = higher priority)
    const sortedSubjects = [...subjects].sort((a, b) => {
      const aTeachers = teacherAssignments.filter((ta) => ta.subjectId === a.id).length;
      const bTeachers = teacherAssignments.filter((ta) => ta.subjectId === b.id).length;
      return aTeachers - bTeachers;
    });

    // Track assigned periods per subject for this class
    const assignedPerSubject = new Map<string, number>();

    // Iterate through days and periods
    for (const day of days) {
      for (const period of periods) {
        const slotKey = `${day}-${period.id}`;

        // Find a subject that needs more periods
        let assignedSubject: typeof subjects[0] | null = null;
        let assignedTeacher: typeof teacherAssignments[0] | null = null;

        for (const subject of sortedSubjects) {
          const required = subjectPeriods.get(subject.id) || 0;
          const assigned = assignedPerSubject.get(subject.id) || 0;

          if (assigned >= required) continue;

          // Find available teacher for this subject
          const availableTeachers = teacherAssignments.filter((ta) => {
            if (ta.subjectId !== subject.id) return false;
            if (!ta.isActive) return false;

            // Check if teacher is available at this slot
            const busyTeachers = teacherSchedule.get(slotKey) || new Set();
            if (busyTeachers.has(ta.teacherId)) return false;

            // Check workload limit
            const currentWorkload = teacherWorkload.get(ta.teacherId) || 0;
            if (currentWorkload >= ta.maxPeriodsPerWeek) return false;

            // Check preferred grades
            if (ta.preferredGrades?.length > 0 && !ta.preferredGrades.includes(classInfo.grade)) {
              return false;
            }

            return true;
          });

          if (availableTeachers.length > 0) {
            // Sort by workload (prefer teachers with less workload)
            if (options?.balanceWorkload) {
              availableTeachers.sort((a, b) => {
                const aWork = teacherWorkload.get(a.teacherId) || 0;
                const bWork = teacherWorkload.get(b.teacherId) || 0;
                return aWork - bWork;
              });
            }

            // Prefer primary subject teachers
            const primaryTeacher = availableTeachers.find((t) => t.isPrimary);
            assignedTeacher = primaryTeacher || availableTeachers[0];
            assignedSubject = subject;
            break;
          }
        }

        if (assignedSubject && assignedTeacher) {
          // Create entry
          const entry = await db.timetableEntry.create({
            data: {
              schoolId,
              classId,
              subjectId: assignedSubject.id,
              teacherId: assignedTeacher.teacherId,
              periodId: period.id,
              dayOfWeek: day,
              academicYearId,
            },
            include: { subject: true, teacher: true, period: true },
          });

          assignedEntries.push(entry);

          // Update tracking maps
          assignedPerSubject.set(assignedSubject.id, (assignedPerSubject.get(assignedSubject.id) || 0) + 1);
          teacherWorkload.set(assignedTeacher.teacherId, (teacherWorkload.get(assignedTeacher.teacherId) || 0) + 1);
          if (!teacherSchedule.has(slotKey)) {
            teacherSchedule.set(slotKey, new Set());
          }
          teacherSchedule.get(slotKey)!.add(assignedTeacher.teacherId);
        } else {
          unassignedSlots.push({ day, periodId: period.id, periodName: period.name });
        }
      }
    }

    // Get subject coverage stats
    const subjectCoverage = sortedSubjects.map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      required: subjectPeriods.get(s.id) || 0,
      assigned: assignedPerSubject.get(s.id) || 0,
    }));

    res.json({
      data: {
        assignedCount: assignedEntries.length,
        unassignedCount: unassignedSlots.length,
        unassignedSlots,
        subjectCoverage,
      },
    });
  } catch (error) {
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

    res.json({ data: updated });
  } catch (error) {
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

    res.json({ data: { entry1: updated1, entry2: updated2 } });
  } catch (error) {
    console.error('Error swapping entries:', error);
    res.status(500).json({ error: 'Failed to swap entries' });
  }
});

// ========================================
// Timetable Publishing
// ========================================

// POST /timetable/publish - Publish timetable
app.post('/timetable/publish', authenticate, async (req, res) => {
  try {
    const { schoolId, userId } = (req as any).user;
    const { academicYearId, notifyTeachers, notifyClasses, notes } = req.body;
    const db = getPrisma();

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

    res.json({ data: publish });
  } catch (error) {
    console.error('Error publishing timetable:', error);
    res.status(500).json({ error: 'Failed to publish timetable' });
  }
});

// GET /timetable/all-classes - Get timetables for all classes (for overview)
app.get('/timetable/all-classes', authenticate, async (req, res) => {
  try {
    const { schoolId } = (req as any).user;
    const { academicYearId, gradeLevel } = req.query;
    const db = getPrisma();

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

    res.json({ data: { classes: classesWithStats } });
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
        khmerName: true,
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

    res.json({ data: entry });
  } catch (error: any) {
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

    res.json({ data: updatedEntry });
  } catch (error) {
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

    // Get all classes for the year
    const classes = await db.class.findMany({
      where: { schoolId, academicYearId: academicYearId as string },
    });

    // Get all entries
    const entries = await db.timetableEntry.findMany({
      where: { schoolId, academicYearId: academicYearId as string },
    });

    // Get periods count
    const periods = await db.period.count({
      where: { schoolId, isBreak: false },
    });

    const totalSlots = classes.length * periods * 6; // 6 days
    const filledSlots = entries.length;

    // Group by class
    const entriesByClass: Record<string, number> = {};
    entries.forEach((e) => {
      entriesByClass[e.classId] = (entriesByClass[e.classId] || 0) + 1;
    });

    // Group by teacher
    const entriesByTeacher: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.teacherId) {
        entriesByTeacher[e.teacherId] = (entriesByTeacher[e.teacherId] || 0) + 1;
      }
    });

    // Calculate grade-level stats
    const secondaryClasses = classes.filter((c) => ['7', '8', '9'].includes(String(c.grade)));
    const highSchoolClasses = classes.filter((c) => ['10', '11', '12'].includes(String(c.grade)));

    const secondarySlots = secondaryClasses.length * periods * 6;
    const highSchoolSlots = highSchoolClasses.length * periods * 6;

    const secondaryFilled = entries.filter((e) =>
      secondaryClasses.some((c) => c.id === e.classId)
    ).length;
    const highSchoolFilled = entries.filter((e) =>
      highSchoolClasses.some((c) => c.id === e.classId)
    ).length;

    res.json({
      data: {
        totalClasses: classes.length,
        totalSlots,
        filledSlots,
        coverage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0,
        secondary: {
          classes: secondaryClasses.length,
          slots: secondarySlots,
          filled: secondaryFilled,
          coverage: secondarySlots > 0 ? Math.round((secondaryFilled / secondarySlots) * 100) : 0,
        },
        highSchool: {
          classes: highSchoolClasses.length,
          slots: highSchoolSlots,
          filled: highSchoolFilled,
          coverage: highSchoolSlots > 0 ? Math.round((highSchoolFilled / highSchoolSlots) * 100) : 0,
        },
        teacherStats: {
          total: Object.keys(entriesByTeacher).length,
          avgHoursPerTeacher: Object.keys(entriesByTeacher).length > 0
            ? Math.round(filledSlots / Object.keys(entriesByTeacher).length)
            : 0,
        },
      },
    });
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

    // Get all teachers with their assignments
    const teachers = await db.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        khmerName: true,
      },
    });

    // Get entry counts per teacher
    const entryCounts = await db.timetableEntry.groupBy({
      by: ['teacherId'],
      where: {
        schoolId,
        academicYearId: academicYearId as string,
        teacherId: { not: null },
      },
      _count: { id: true },
    });

    const countMap = new Map(entryCounts.map((c) => [c.teacherId, c._count.id]));

    // Get teacher subject assignments (filter by teacher's school)
    const assignments = await db.teacherSubjectAssignment.findMany({
      where: {
        teacher: { schoolId },
      },
      select: {
        teacherId: true,
        maxPeriodsPerWeek: true,
      },
    });

    const maxHoursMap = new Map<string, number>();
    assignments.forEach((a) => {
      const current = maxHoursMap.get(a.teacherId) || 25;
      maxHoursMap.set(a.teacherId, Math.max(current, a.maxPeriodsPerWeek || 25));
    });

    const teacherWorkloads = teachers.map((t) => ({
      ...t,
      totalHoursAssigned: countMap.get(t.id) || 0,
      maxHoursPerWeek: maxHoursMap.get(t.id) || 25,
    }));

    res.json({ data: { teachers: teacherWorkloads } });
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

    // Delete all entries for this class
    const deleted = await db.timetableEntry.deleteMany({
      where: {
        classId,
        schoolId,
        ...(academicYearId && { academicYearId: academicYearId as string }),
      },
    });

    res.json({
      data: {
        deletedCount: deleted.count,
        message: `Cleared ${deleted.count} timetable entries for ${classInfo.name}`,
      },
    });
  } catch (error) {
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
