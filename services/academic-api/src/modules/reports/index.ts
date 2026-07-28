/**
 * School Reports Dashboard — cross-domain aggregation (Grade + Attendance +
 * Class + Student + Teacher) for the Monthly / Semester / Yearly analytics
 * dashboard. Lives in its own module because it spans domains that each
 * already have their own router (grade, attendance, class, ...).
 */
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getSharedPrisma } from '../../core/prisma';
import { getJwtSecret } from '../../../../lib/jwt-secret';
import {
  resolveGradeScale,
  gradeLevelForScale,
  isPassingForScale,
  buildStudentAverageMap,
} from '../grade/reports/grade-systems';
import { parseAcademicStartYearName } from '../grade/reports/report-utils';
import {
  fallbackReportTerm,
  enumerateReportPeriods,
  buildGradePeriodWhere,
  reportPeriodCacheKey,
  monthStart,
  monthEnd,
  type ReportPeriod,
} from '../grade/reports/period-utils';

const app = express.Router();
const prisma = getSharedPrisma();
const JWT_SECRET = getJwtSecret();

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    email: string;
    role: string;
    schoolId?: string;
    school?: { id: string };
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

const getSchoolId = (req: AuthRequest): string | null => req.user?.schoolId || req.user?.school?.id || null;
const getAuthUserId = (req: AuthRequest): string | null => req.user?.userId || req.user?.id || null;

const SCHOOL_WIDE_REPORT_ROLES = new Set(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

const dashboardCache = new Map<string, { data: any; timestamp: number }>();
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

function readDashboardCache(key: string) {
  const cached = dashboardCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > DASHBOARD_CACHE_TTL_MS) {
    dashboardCache.delete(key);
    return null;
  }
  return cached.data;
}

function writeDashboardCache(key: string, data: any) {
  dashboardCache.set(key, { data, timestamp: Date.now() });
}

type AccessResult =
  | { allowed: true; classIds: string[]; scopeClassId: string | null }
  | { allowed: false; status: number; message: string };

/** Resolve which class ids this request may aggregate over. */
async function resolveAllowedClassIds(
  req: AuthRequest,
  schoolId: string,
  yearId: string,
  requestedClassId?: string
): Promise<AccessResult> {
  const role = req.user?.role;

  if (role && SCHOOL_WIDE_REPORT_ROLES.has(role)) {
    if (requestedClassId) {
      const classData = await prisma.class.findFirst({
        where: { id: requestedClassId, schoolId, academicYearId: yearId },
        select: { id: true },
      });
      if (!classData) return { allowed: false, status: 404, message: 'Class not found in this academic year' };
      return { allowed: true, classIds: [requestedClassId], scopeClassId: requestedClassId };
    }

    const classes = await prisma.class.findMany({
      where: { schoolId, academicYearId: yearId },
      select: { id: true },
    });
    return { allowed: true, classIds: classes.map((c) => c.id), scopeClassId: null };
  }

  if (role !== 'TEACHER') {
    return { allowed: false, status: 403, message: 'You do not have access to school reports' };
  }

  const userId = getAuthUserId(req);
  const userRecord = userId
    ? await prisma.user.findFirst({ where: { id: userId, schoolId }, select: { teacherId: true } })
    : null;
  const teacherId = userRecord?.teacherId;
  if (!teacherId) {
    return { allowed: false, status: 403, message: 'Teacher profile is not linked to this account' };
  }

  const ownClasses = await prisma.class.findMany({
    where: {
      schoolId,
      academicYearId: yearId,
      OR: [
        { homeroomTeacherId: teacherId },
        { teacherClasses: { some: { teacherId } } },
        { timetableEntries: { some: { teacherId } } },
      ],
    },
    select: { id: true },
  });
  const ownClassIds = ownClasses.map((c) => c.id);

  if (requestedClassId) {
    if (!ownClassIds.includes(requestedClassId)) {
      return { allowed: false, status: 403, message: 'Teacher is not assigned to this class' };
    }
    return { allowed: true, classIds: [requestedClassId], scopeClassId: requestedClassId };
  }

  return { allowed: true, classIds: ownClassIds, scopeClassId: ownClassIds.length === 1 ? ownClassIds[0] : null };
}

type PeriodType = 'month' | 'semester' | 'year';

async function resolvePeriod(
  schoolId: string,
  yearId: string,
  period: PeriodType,
  semester: string,
  monthNumber: number | undefined,
  calendarYear: number | undefined
): Promise<{ startDate: Date; endDate: Date; periods: ReportPeriod[]; label: string; khmerLabel: string }> {
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: yearId, schoolId },
    include: { terms: { orderBy: { termNumber: 'asc' } } },
  });

  if (period === 'month') {
    const year = calendarYear || new Date().getFullYear();
    const mn = monthNumber && monthNumber >= 1 && monthNumber <= 12 ? monthNumber : new Date().getMonth() + 1;
    const startDate = monthStart(year, mn);
    const endDate = monthEnd(year, mn);
    const periods = enumerateReportPeriods(startDate, endDate);
    return { startDate, endDate, periods, label: `${year}-${String(mn).padStart(2, '0')}`, khmerLabel: periods[0]?.label || '' };
  }

  if (period === 'semester') {
    const semesterNumber = semester === '2' ? 2 : 1;
    const term = academicYear?.terms?.find((t) => t.termNumber === semesterNumber);
    if (term) {
      const periods = enumerateReportPeriods(term.startDate, term.endDate);
      return { startDate: term.startDate, endDate: term.endDate, periods, label: term.name, khmerLabel: term.name };
    }
    const startYear = parseAcademicStartYearName(academicYear?.name) || new Date().getFullYear();
    const fallback = fallbackReportTerm(semester, startYear);
    return {
      startDate: fallback.startDate,
      endDate: fallback.endDate,
      periods: fallback.periods,
      label: fallback.termName,
      khmerLabel: fallback.termName,
    };
  }

  // period === 'year'
  const startDate = academicYear?.startDate || monthStart(new Date().getFullYear(), 1);
  const endDate = academicYear?.endDate || monthEnd(new Date().getFullYear(), 12);
  const periods = enumerateReportPeriods(startDate, endDate);
  return { startDate, endDate, periods, label: academicYear?.name || '', khmerLabel: academicYear?.name || '' };
}

app.get('/reports/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context is required' });

    const { yearId, period, semester = '1', monthNumber, year, classId } = req.query as Record<string, string | undefined>;
    if (!yearId) return res.status(400).json({ success: false, message: 'yearId is required' });
    const periodType: PeriodType = period === 'semester' || period === 'year' ? period : 'month';

    const access = await resolveAllowedClassIds(req, schoolId, yearId, classId);
    if (access.allowed === false) return res.status(access.status).json({ success: false, message: access.message });
    const { classIds, scopeClassId } = access;

    const cacheKey = `${schoolId}:reports-dashboard:${yearId}:${periodType}:${semester}:${monthNumber || ''}:${year || ''}:${scopeClassId || classIds.join(',')}`;
    const cached = readDashboardCache(cacheKey);
    if (cached) return res.json(cached);

    const term = await resolvePeriod(
      schoolId,
      yearId,
      periodType,
      semester,
      monthNumber ? Number(monthNumber) : undefined,
      year ? Number(year) : undefined
    );

    if (classIds.length === 0) {
      const gradeScale = resolveGradeScale(null);
      const empty = {
        period: { type: periodType, label: term.label, khmerLabel: term.khmerLabel, startDate: term.startDate.toISOString(), endDate: term.endDate.toISOString() },
        overview: { totalStudents: 0, totalTeachers: 0, totalClasses: 0, attendanceRate: 0 },
        averageScoreByGradeLevel: [],
        averageScoreBySubject: [],
        averageScoreByClass: [],
        passRate: { passing: 0, failing: 0, passRatePercent: 0 },
        topPerformingClasses: [],
        bottomPerformingClasses: [],
        trend: [],
        scale: gradeScale,
        scope: { schoolWide: false, classId: scopeClassId },
        generatedAt: new Date().toISOString(),
      };
      return res.json(empty);
    }

    const gradePeriodWhere = buildGradePeriodWhere(term.periods);

    const [school, classes, students, grades, attendanceRows] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { educationModel: true, name: true } }),
      prisma.class.findMany({
        where: { id: { in: classIds } },
        select: {
          id: true,
          name: true,
          grade: true,
          homeroomTeacherId: true,
          teacherClasses: { select: { teacherId: true } },
          timetableEntries: { select: { teacherId: true }, distinct: ['teacherId'] },
        },
      }),
      prisma.student.findMany({
        where: { schoolId, classId: { in: classIds } },
        select: { id: true, classId: true },
      }),
      prisma.grade.findMany({
        where: { classId: { in: classIds }, ...gradePeriodWhere },
        select: {
          studentId: true,
          subjectId: true,
          classId: true,
          score: true,
          maxScore: true,
          year: true,
          monthNumber: true,
          subject: { select: { id: true, name: true, nameKh: true, coefficient: true } },
        },
      }),
      prisma.attendance.findMany({
        where: { classId: { in: classIds }, date: { gte: term.startDate, lte: term.endDate } },
        select: { date: true, status: true },
      }),
    ]);

    const gradeScale = resolveGradeScale(school?.educationModel);

    // ── Overview ──
    const classMap = new Map(classes.map((c) => [c.id, { name: c.name, grade: c.grade }]));
    const teacherIdSet = new Set<string>();
    classes.forEach((c) => {
      if (c.homeroomTeacherId) teacherIdSet.add(c.homeroomTeacherId);
      c.teacherClasses.forEach((tc) => teacherIdSet.add(tc.teacherId));
      c.timetableEntries.forEach((te) => teacherIdSet.add(te.teacherId));
    });

    const totalSessions = attendanceRows.length;
    const presentSessions = attendanceRows.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

    const overview = {
      totalStudents: students.length,
      totalTeachers: teacherIdSet.size,
      totalClasses: classes.length,
      attendanceRate,
    };

    // ── Per-student averages (system-aware) + class/grade grouping ──
    const averageMap = buildStudentAverageMap(grades, gradeScale);
    const studentClassMap = new Map(students.map((s) => [s.id, s.classId]));

    const classTotals = new Map<string, { total: number; count: number }>();
    const gradeLevelTotals = new Map<string, { total: number; count: number }>();
    let passing = 0;
    let failing = 0;

    averageMap.forEach((average, studentId) => {
      const classId = studentClassMap.get(studentId);
      if (!classId) return;
      const classInfo = classMap.get(classId);

      const classBucket = classTotals.get(classId) || { total: 0, count: 0 };
      classBucket.total += average;
      classBucket.count += 1;
      classTotals.set(classId, classBucket);

      const gradeLevel = classInfo?.grade || 'unknown';
      const gradeBucket = gradeLevelTotals.get(gradeLevel) || { total: 0, count: 0 };
      gradeBucket.total += average;
      gradeBucket.count += 1;
      gradeLevelTotals.set(gradeLevel, gradeBucket);

      if (isPassingForScale(gradeScale, average)) passing += 1;
      else failing += 1;
    });

    const averageScoreByClass = Array.from(classTotals.entries())
      .map(([classId, data]) => ({
        classId,
        className: classMap.get(classId)?.name || classId,
        grade: classMap.get(classId)?.grade || '',
        average: Math.round((data.total / data.count) * 100) / 100,
        studentCount: data.count,
      }))
      .sort((a, b) => b.average - a.average)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const averageScoreByGradeLevel = Array.from(gradeLevelTotals.entries())
      .map(([grade, data]) => ({
        grade,
        average: Math.round((data.total / data.count) * 100) / 100,
        studentCount: data.count,
      }))
      .sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));

    const totalGraded = passing + failing;
    const passRate = {
      passing,
      failing,
      passRatePercent: totalGraded > 0 ? Math.round((passing / totalGraded) * 100) : 0,
    };

    // ── Subject breakdown (raw percentage, grouped by subject name across grades) ──
    const subjectTotals = new Map<string, { name: string; nameKh: string; total: number; count: number }>();
    const monthlyTotals = new Map<string, { total: number; count: number }>();

    grades.forEach((grade) => {
      const percentage = grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
      const subjectKey = grade.subject.name.trim().toLowerCase();
      const subjectBucket = subjectTotals.get(subjectKey) || {
        name: grade.subject.name,
        nameKh: grade.subject.nameKh,
        total: 0,
        count: 0,
      };
      subjectBucket.total += percentage;
      subjectBucket.count += 1;
      subjectTotals.set(subjectKey, subjectBucket);

      const monthKey = `${grade.year}-${grade.monthNumber}`;
      const monthBucket = monthlyTotals.get(monthKey) || { total: 0, count: 0 };
      monthBucket.total += percentage;
      monthBucket.count += 1;
      monthlyTotals.set(monthKey, monthBucket);
    });

    const averageScoreBySubject = Array.from(subjectTotals.values())
      .map((subject) => ({
        subject: subject.name,
        subjectKh: subject.nameKh,
        average: subject.count > 0 ? Math.round(subject.total / subject.count) : 0,
      }))
      .sort((a, b) => b.average - a.average);

    // ── Attendance per month (for trend) ──
    const attendanceByMonth = new Map<string, { present: number; total: number }>();
    attendanceRows.forEach((row) => {
      const d = new Date(row.date);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      const bucket = attendanceByMonth.get(key) || { present: 0, total: 0 };
      bucket.total += 1;
      if (row.status === 'PRESENT' || row.status === 'LATE') bucket.present += 1;
      attendanceByMonth.set(key, bucket);
    });

    const trend = term.periods.map((p) => {
      const key = `${p.year}-${p.monthNumber}`;
      const gradeBucket = monthlyTotals.get(key);
      const attendanceBucket = attendanceByMonth.get(key);
      return {
        label: `${p.year}-${String(p.monthNumber).padStart(2, '0')}`,
        khmerLabel: p.label,
        average: gradeBucket && gradeBucket.count > 0 ? Math.round(gradeBucket.total / gradeBucket.count) : 0,
        attendanceRate: attendanceBucket && attendanceBucket.total > 0 ? Math.round((attendanceBucket.present / attendanceBucket.total) * 100) : 0,
      };
    });

    const schoolWide = scopeClassId === null && classes.length > 1;

    const responseBody = {
      period: {
        type: periodType,
        label: term.label,
        khmerLabel: term.khmerLabel,
        startDate: term.startDate.toISOString(),
        endDate: term.endDate.toISOString(),
      },
      overview,
      averageScoreByGradeLevel,
      averageScoreBySubject,
      averageScoreByClass,
      passRate,
      topPerformingClasses: schoolWide ? averageScoreByClass.slice(0, 5) : [],
      bottomPerformingClasses: schoolWide ? averageScoreByClass.slice(-5).reverse() : [],
      trend,
      scale: gradeScale,
      scope: { schoolWide, classId: scopeClassId },
      generatedAt: new Date().toISOString(),
    };

    writeDashboardCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error: any) {
    console.error('❌ Error building reports dashboard:', error);
    res.status(500).json({ success: false, message: 'Error building reports dashboard', error: error.message });
  }
});

export default app;
