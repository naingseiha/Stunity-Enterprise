/**
 * School Reports Dashboard — cross-domain aggregation (Grade + Attendance +
 * Class + Student + Teacher) for the Monthly / Semester / Yearly analytics
 * dashboard. Lives in its own module because it spans domains that each
 * already have their own router (grade, attendance, class, ...).
 *
 * Performance note: the grade side is aggregated in Postgres via `groupBy`
 * instead of `findMany`-ing every raw row and reducing in JS. For a school
 * with ~125K grade rows in one academic year, `groupBy(['studentId','subjectId'])`
 * (collapsing months) returns ~26K rows — ~5x less data over the wire and no
 * `subject` relation join, since subject metadata is cached in memory instead
 * (same pattern as `grade/index.ts`'s `getSubjectCoefficientMap`).
 */
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getSharedPrisma } from '../../core/prisma';
import { getJwtSecret } from '../../../../lib/jwt-secret';
import {
  resolveGradeScale,
  isPassingForScale,
  combineSubjectAverages,
  genericGradeLevel,
  type GradeScale,
} from '../grade/reports/grade-systems';
import { parseAcademicStartYearName } from '../grade/reports/report-utils';
import {
  fallbackReportTerm,
  enumerateReportPeriods,
  buildGradePeriodWhere,
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
const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000;

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

// ── Subject metadata cache (id -> name/nameKh/maxScore/coefficient) ──
// Subjects are a small, near-static table — cache instead of joining it onto
// every grouped row, same pattern as grade/index.ts's getSubjectCoefficientMap.
type SubjectMeta = { name: string; nameKh: string; maxScore: number; coefficient: number };
const SUBJECT_META_CACHE_TTL_MS = 10 * 60 * 1000;
let subjectMetaCache: { map: Map<string, SubjectMeta>; timestamp: number } | null = null;

async function getSubjectMetaMap(): Promise<Map<string, SubjectMeta>> {
  if (subjectMetaCache && Date.now() - subjectMetaCache.timestamp <= SUBJECT_META_CACHE_TTL_MS) {
    return subjectMetaCache.map;
  }
  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true, nameKh: true, maxScore: true, coefficient: true },
  });
  const map = new Map(subjects.map((s) => [s.id, { name: s.name, nameKh: s.nameKh, maxScore: s.maxScore, coefficient: s.coefficient }]));
  subjectMetaCache = { map, timestamp: Date.now() };
  return map;
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
  academicYear: { name: string; startDate: Date; endDate: Date; terms: Array<{ termNumber: number; name: string; startDate: Date; endDate: Date }> } | null,
  period: PeriodType,
  semester: string,
  monthNumber: number | undefined,
  calendarYear: number | undefined
): Promise<{ startDate: Date; endDate: Date; periods: ReportPeriod[]; label: string; khmerLabel: string }> {
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

function studentDisplayName(student: { firstName: string; lastName: string }): string {
  return `${student.firstName} ${student.lastName}`.trim();
}

function studentKhmerName(student: { customFields: unknown }): string | null {
  return (student.customFields as any)?.regional?.khmerName || null;
}

app.get('/reports/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context is required' });

    const { yearId, period, semester = '1', monthNumber, year, classId } = req.query as Record<string, string | undefined>;
    if (!yearId) return res.status(400).json({ success: false, message: 'yearId is required' });
    const periodType: PeriodType = period === 'semester' || period === 'year' ? period : 'month';

    // Independent lookups — resolve in parallel instead of one after another.
    const [access, academicYear] = await Promise.all([
      resolveAllowedClassIds(req, schoolId, yearId, classId),
      prisma.academicYear.findFirst({
        where: { id: yearId, schoolId },
        include: { terms: { orderBy: { termNumber: 'asc' } } },
      }),
    ]);
    if (access.allowed === false) return res.status(access.status).json({ success: false, message: access.message });
    const { classIds, scopeClassId } = access;

    const cacheKey = `${schoolId}:reports-dashboard:${yearId}:${periodType}:${semester}:${monthNumber || ''}:${year || ''}:${scopeClassId || classIds.join(',')}`;
    const cached = readDashboardCache(cacheKey);
    if (cached) return res.json(cached);

    const term = await resolvePeriod(
      academicYear,
      periodType,
      semester,
      monthNumber ? Number(monthNumber) : undefined,
      year ? Number(year) : undefined
    );

    if (classIds.length === 0) {
      const gradeScale = resolveGradeScale(null);
      const empty = {
        period: { type: periodType, label: term.label, khmerLabel: term.khmerLabel, startDate: term.startDate.toISOString(), endDate: term.endDate.toISOString() },
        overview: { totalStudents: 0, totalTeachers: 0, femaleTeachers: 0, totalClasses: 0, attendanceRate: 0, teacherAttendanceRate: null },
        averageScoreByGradeLevel: [],
        averageScoreBySubject: [],
        averageScoreByClass: [],
        passRate: { passing: 0, failing: 0, passRatePercent: 0 },
        topPerformingClasses: [],
        bottomPerformingClasses: [],
        topStudentsByGrade: [],
        topStudentsInClass: null,
        atRiskStudents: [],
        genderBreakdown: { male: { count: 0, passRatePercent: 0 }, female: { count: 0, passRatePercent: 0 } },
        studentFlow: {
          repeaters: { total: 0, female: 0 },
          transferIn: { total: 0, female: 0 },
          transferOut: { total: 0, female: 0 },
        },
        trend: [],
        scale: gradeScale,
        scope: { schoolWide: false, classId: scopeClassId },
        school: { name: '', address: null, phone: null, logo: null },
        generatedAt: new Date().toISOString(),
      };
      return res.json(empty);
    }

    const gradePeriodWhere = buildGradePeriodWhere(term.periods);

    const [school, classes, students, subjectMeta, studentSubjectGroups, monthSubjectGroups, attendanceRows, progressionRows] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { educationModel: true, name: true, address: true, phone: true, logo: true } }),
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
        select: { id: true, classId: true, firstName: true, lastName: true, customFields: true, gender: true },
      }),
      getSubjectMetaMap(),
      // Per-student, per-subject aggregate (collapses months) — drives composite
      // averages, class/grade/gender grouping, top-N, and per-subject pass/fail.
      prisma.grade.groupBy({
        by: ['studentId', 'subjectId'],
        where: { classId: { in: classIds }, ...gradePeriodWhere },
        _sum: { score: true },
        _count: { _all: true },
      }),
      // Per-month, per-subject aggregate (collapses students) — tiny, drives the
      // trend line only.
      prisma.grade.groupBy({
        by: ['year', 'monthNumber', 'subjectId'],
        where: { classId: { in: classIds }, ...gradePeriodWhere },
        _sum: { score: true },
        _count: { _all: true },
      }),
      prisma.attendance.findMany({
        where: { classId: { in: classIds }, date: { gte: term.startDate, lte: term.endDate } },
        select: { date: true, status: true },
      }),
      // MoEYS student-flow indicators (repeaters / transfers) — real
      // StudentProgression records, scoped to the selected period by
      // promotionDate so month/semester views reflect actual movement dates.
      prisma.studentProgression.findMany({
        where: {
          promotionType: { in: ['REPEAT', 'TRANSFER_IN', 'TRANSFER_OUT'] },
          promotionDate: { gte: term.startDate, lte: term.endDate },
          OR: [
            { toAcademicYearId: yearId, toClassId: { in: classIds } },
            { fromAcademicYearId: yearId, fromClassId: { in: classIds } },
          ],
        },
        select: { promotionType: true, student: { select: { gender: true } } },
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

    // Real teacher gender + attendance — mirrors the attendance module's own
    // PRESENT/LATE/PERMISSION-counts-as-present convention (teacherSchedule.ts).
    const teacherIds = Array.from(teacherIdSet);
    const [teacherRecords, teacherAttendanceRows] = await Promise.all([
      teacherIds.length
        ? prisma.teacher.findMany({ where: { id: { in: teacherIds } }, select: { gender: true } })
        : Promise.resolve([]),
      teacherIds.length
        ? prisma.teacherAttendance.findMany({
            where: { teacherId: { in: teacherIds }, date: { gte: term.startDate, lte: term.endDate } },
            select: { status: true },
          })
        : Promise.resolve([]),
    ]);
    const femaleTeachers = teacherRecords.filter((t) => t.gender === 'FEMALE').length;
    const teacherAttendanceTotal = teacherAttendanceRows.length;
    const teacherAttendancePresent = teacherAttendanceRows.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'PERMISSION'
    ).length;
    const teacherAttendanceRate =
      teacherAttendanceTotal > 0 ? Math.round((teacherAttendancePresent / teacherAttendanceTotal) * 100) : null;

    const overview = {
      totalStudents: students.length,
      totalTeachers: teacherIdSet.size,
      femaleTeachers,
      totalClasses: classes.length,
      attendanceRate,
      teacherAttendanceRate,
    };

    // ── Student flow (MoEYS) — real StudentProgression records for the period ──
    const studentFlowBuckets = {
      repeaters: { total: 0, female: 0 },
      transferIn: { total: 0, female: 0 },
      transferOut: { total: 0, female: 0 },
    };
    progressionRows.forEach((row) => {
      const bucket =
        row.promotionType === 'REPEAT'
          ? studentFlowBuckets.repeaters
          : row.promotionType === 'TRANSFER_IN'
            ? studentFlowBuckets.transferIn
            : row.promotionType === 'TRANSFER_OUT'
              ? studentFlowBuckets.transferOut
              : null;
      if (!bucket) return;
      bucket.total += 1;
      if (row.student.gender === 'FEMALE') bucket.female += 1;
    });

    // ── Per-student, per-subject means (from the DB-side aggregate) ──
    const studentSubjectMeans = new Map<string, Map<string, number>>();
    studentSubjectGroups.forEach((g) => {
      const count = g._count._all;
      if (count === 0) return;
      const mean = (g._sum.score || 0) / count;
      let inner = studentSubjectMeans.get(g.studentId);
      if (!inner) {
        inner = new Map();
        studentSubjectMeans.set(g.studentId, inner);
      }
      inner.set(g.subjectId, mean);
    });

    // Per-student composite average (system-aware), reusing the same
    // combination formula buildStudentAverageMap uses internally.
    const averageMap = new Map<string, number>();
    studentSubjectMeans.forEach((subjectMeansForStudent, studentId) => {
      const entries = Array.from(subjectMeansForStudent.entries()).map(([subjectId, mean]) => ({
        mean,
        coefficient: subjectMeta.get(subjectId)?.coefficient ?? 0,
      }));
      averageMap.set(studentId, combineSubjectAverages(entries, gradeScale));
    });

    const studentInfoMap = new Map(
      students.map((s) => [
        s.id,
        { classId: s.classId, name: studentDisplayName(s), khmerName: studentKhmerName(s), gender: s.gender },
      ])
    );

    const classTotals = new Map<string, { total: number; count: number }>();
    const gradeLevelTotals = new Map<string, { total: number; count: number }>();
    const gradeLevelStudents = new Map<string, Array<{ studentId: string; name: string; khmerName: string | null; average: number }>>();
    const genderTotals = new Map<string, { count: number; passing: number }>();
    let passing = 0;
    let failing = 0;

    averageMap.forEach((average, studentId) => {
      const info = studentInfoMap.get(studentId);
      if (!info?.classId) return;
      const classInfo = classMap.get(info.classId);
      const isPassing = isPassingForScale(gradeScale, average);

      const classBucket = classTotals.get(info.classId) || { total: 0, count: 0 };
      classBucket.total += average;
      classBucket.count += 1;
      classTotals.set(info.classId, classBucket);

      const gradeLevel = classInfo?.grade || 'unknown';
      const gradeBucket = gradeLevelTotals.get(gradeLevel) || { total: 0, count: 0 };
      gradeBucket.total += average;
      gradeBucket.count += 1;
      gradeLevelTotals.set(gradeLevel, gradeBucket);

      const gradeStudents = gradeLevelStudents.get(gradeLevel) || [];
      gradeStudents.push({ studentId, name: info.name, khmerName: info.khmerName, average: Math.round(average * 100) / 100 });
      gradeLevelStudents.set(gradeLevel, gradeStudents);

      const genderKey = info.gender || 'UNKNOWN';
      const genderBucket = genderTotals.get(genderKey) || { count: 0, passing: 0 };
      genderBucket.count += 1;
      if (isPassing) genderBucket.passing += 1;
      genderTotals.set(genderKey, genderBucket);

      if (isPassing) passing += 1;
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

    // ── Top 5 honor roll — per grade level, and (when scoped to one class) in-class ──
    const topStudentsByGrade = Array.from(gradeLevelStudents.entries())
      .map(([grade, list]) => ({
        grade,
        students: list
          .sort((a, b) => b.average - a.average)
          .slice(0, 5)
          .map((s, index) => ({ ...s, rank: index + 1 })),
      }))
      .sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));

    const topStudentsInClass = scopeClassId
      ? (gradeLevelStudents.get(classMap.get(scopeClassId)?.grade || '') || [])
          .filter((s) => studentInfoMap.get(s.studentId)?.classId === scopeClassId)
          .sort((a, b) => b.average - a.average)
          .slice(0, 5)
          .map((s, index) => ({ ...s, rank: index + 1 }))
      : null;

    // ── At-risk students (failing the composite average) — worst 10, for a "Needs Attention" panel ──
    const AT_RISK_LIMIT = 10;
    const atRiskStudents = Array.from(averageMap.entries())
      .filter(([, average]) => !isPassingForScale(gradeScale, average))
      .map(([studentId, average]) => {
        const info = studentInfoMap.get(studentId);
        const classInfo = info?.classId ? classMap.get(info.classId) : undefined;
        return {
          studentId,
          name: info?.name || '',
          khmerName: info?.khmerName || null,
          classId: info?.classId || '',
          className: classInfo?.name || '',
          average: Math.round(average * 100) / 100,
        };
      })
      .sort((a, b) => a.average - b.average)
      .slice(0, AT_RISK_LIMIT);

    // ── Gender breakdown ──
    const genderBreakdown = {
      male: {
        count: genderTotals.get('MALE')?.count || 0,
        passRatePercent: genderTotals.get('MALE')?.count
          ? Math.round(((genderTotals.get('MALE')?.passing || 0) / (genderTotals.get('MALE')?.count || 1)) * 100)
          : 0,
      },
      female: {
        count: genderTotals.get('FEMALE')?.count || 0,
        passRatePercent: genderTotals.get('FEMALE')?.count
          ? Math.round(((genderTotals.get('FEMALE')?.passing || 0) / (genderTotals.get('FEMALE')?.count || 1)) * 100)
          : 0,
      },
    };

    // ── Subject breakdown: average + pass/fail + A–F grade distribution ──
    // Subjects are grade-scoped rows (Subject.grade), so e.g. "Informatics" in
    // grade 7 and grade 10 are two different subjectIds — merge by normalized
    // name so the school-wide breakdown shows one bar per subject, not one per
    // (subject, grade) pair.
    // Letter grades here use the plain 0–100 A–F bands (genericGradeLevel)
    // regardless of the school's composite grading system: a single subject's
    // score/maxScore is always a 0–100 percentage, distinct from the MoEYS
    // 0–50 composite average used for overall pass/fail.
    const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
    const subjectAgg = new Map<
      string,
      {
        name: string;
        nameKh: string;
        total: number;
        count: number;
        passing: number;
        failing: number;
        gradeCounts: Map<string, { total: number; male: number; female: number }>;
      }
    >();
    studentSubjectMeans.forEach((subjectMeansForStudent, studentId) => {
      const info = studentInfoMap.get(studentId);
      subjectMeansForStudent.forEach((mean, subjectId) => {
        const meta = subjectMeta.get(subjectId);
        if (!meta) return;
        const key = meta.name.trim().toLowerCase();
        const bucket = subjectAgg.get(key) || {
          name: meta.name,
          nameKh: meta.nameKh,
          total: 0,
          count: 0,
          passing: 0,
          failing: 0,
          gradeCounts: new Map(GRADE_LETTERS.map((g) => [g, { total: 0, male: 0, female: 0 }])),
        };
        const percentage = meta.maxScore > 0 ? (mean / meta.maxScore) * 100 : 0;
        bucket.total += percentage;
        bucket.count += 1;
        if (percentage >= 50) bucket.passing += 1;
        else bucket.failing += 1;

        const letter = genericGradeLevel(percentage);
        const gradeBucket = bucket.gradeCounts.get(letter)!;
        gradeBucket.total += 1;
        if (info?.gender === 'MALE') gradeBucket.male += 1;
        else if (info?.gender === 'FEMALE') gradeBucket.female += 1;

        subjectAgg.set(key, bucket);
      });
    });

    const averageScoreBySubject = Array.from(subjectAgg.values())
      .map((data) => ({
        subject: data.name,
        subjectKh: data.nameKh,
        average: data.count > 0 ? Math.round(data.total / data.count) : 0,
        passCount: data.passing,
        failCount: data.failing,
        passRatePercent: data.count > 0 ? Math.round((data.passing / data.count) * 100) : 0,
        gradeDistribution: GRADE_LETTERS.map((letter) => ({
          grade: letter,
          ...data.gradeCounts.get(letter)!,
        })),
      }))
      .sort((a, b) => b.average - a.average);

    // ── Monthly trend (from the tiny month×subject aggregate) ──
    const monthlyTotals = new Map<string, { total: number; count: number }>();
    monthSubjectGroups.forEach((g) => {
      const meta = subjectMeta.get(g.subjectId);
      if (!meta || meta.maxScore <= 0) return;
      const count = g._count._all;
      if (count === 0) return;
      const mean = (g._sum.score || 0) / count;
      const percentage = (mean / meta.maxScore) * 100;

      const key = `${g.year}-${g.monthNumber}`;
      const bucket = monthlyTotals.get(key) || { total: 0, count: 0 };
      // Weight by how many grade entries this (month, subject) bucket represents,
      // so combining subjects back into one month figure equals the same
      // mean-of-individual-ratios the old per-row calculation produced.
      bucket.total += percentage * count;
      bucket.count += count;
      monthlyTotals.set(key, bucket);
    });

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
      topStudentsByGrade: scopeClassId ? [] : topStudentsByGrade,
      topStudentsInClass,
      atRiskStudents,
      genderBreakdown,
      studentFlow: studentFlowBuckets,
      trend,
      scale: gradeScale,
      scope: { schoolWide, classId: scopeClassId },
      school: { name: school?.name || '', address: school?.address || null, phone: school?.phone || null, logo: school?.logo || null },
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
