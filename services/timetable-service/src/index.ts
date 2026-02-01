import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient, DayOfWeek } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../packages/database/.env' });

const app = express();
const PORT = process.env.PORT || 3009;

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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-key-2024';

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
    const totalSlots = totalPeriods * totalClasses * 5; // 5 days
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'timetable-service', port: PORT });
});

// Start server
app.listen(PORT, () => {
  console.log(`🕐 Timetable Service running on port ${PORT}`);
});
