import { PrismaClient, AttendanceSession } from '@prisma/client';
import { endOfDay, startOfDay } from 'date-fns';
import { utcDateStringToDayOfWeek, classifyPeriodSession, parseYmdUtc } from './teacherSchedule';

/** Minutes after period start-time after which teacher check-in is reported as late. */
export const SESSION_MONITOR_LATE_GRACE_MINUTES = 15;

export type SessionMonitorDisplayStatus =
  | 'NO_SLOT'
  | 'UNASSIGNED'
  | 'NOT_CHECKED_IN'
  | 'ABSENT'
  | 'PERMISSION'
  | 'EXCUSED'
  | 'PRESENT_ON_TIME'
  | 'PRESENT_LATE';

export type SessionMonitorRow = {
  classId: string;
  className: string;
  grade: string | null;
  periodId: string | null;
  periodName: string | null;
  periodStartTime: string | null;
  subjectId: string | null;
  subjectName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  timeInIso: string | null;
  timeOutIso: string | null;
  attendanceStatusRaw: string | null;
  displayStatus: SessionMonitorDisplayStatus;
};

export type SessionMonitorSummary = {
  totalClassesInYear: number;
  withFirstPeriod: number;
  unassignedSlots: number;
  notCheckedIn: number;
  absentMarked: number;
  permission: number;
  excused: number;
  onTime: number;
  late: number;
  noSlots: number;
};

function parseHm(hmStr: string): { h: number; m: number } | null {
  const trimmed = hmStr.trim();
  const matched = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!matched) return null;
  return { h: parseInt(matched[1], 10), m: parseInt(matched[2], 10) };
}

/**
 * Latest instant still counted as “on time” (period wall start + grace), using local calendar date.
 * Returns null when the date string or period start time cannot be parsed.
 */
export function graceDeadlineAfterPeriodStart(
  localDateYmd: string,
  periodStartHm: string,
  graceMinutes: number
): Date | null {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDateYmd.trim());
  const hm = parseHm(periodStartHm);
  if (!parsed || !hm) return null;
  const y = parseInt(parsed[1], 10);
  const mo = parseInt(parsed[2], 10);
  const d = parseInt(parsed[3], 10);
  const base = new Date(y, mo - 1, d, hm.h, hm.m, 0, 0);
  if (Number.isNaN(base.getTime())) return null;
  const deadline = new Date(base.getTime() + graceMinutes * 60 * 1000);
  return deadline;
}

export function teacherCheckInIsLateVsPeriod(
  timeIn: Date,
  localDateYmd: string,
  periodStartHm: string,
  graceMinutes: number = SESSION_MONITOR_LATE_GRACE_MINUTES
): boolean {
  const deadline = graceDeadlineAfterPeriodStart(localDateYmd, periodStartHm, graceMinutes);
  if (!deadline) return false;
  return timeIn.getTime() > deadline.getTime();
}

function teacherFullName(first?: string | null, last?: string | null): string {
  const s = `${first || ''} ${last || ''}`.trim();
  return s.length ? s : '—';
}

function resolveDisplayStatus(params: {
  hasSlot: boolean;
  teacherAssigned: boolean;
  ta: null | {
    status: string;
    timeIn: Date;
  };
  localDateYmd: string;
  periodStartHm: string | null;
}): SessionMonitorDisplayStatus {
  const { hasSlot, teacherAssigned, ta, localDateYmd, periodStartHm } = params;
  if (!hasSlot) return 'NO_SLOT';
  if (!teacherAssigned) return 'UNASSIGNED';
  if (!ta) return 'NOT_CHECKED_IN';

  const st = (ta.status || '').toUpperCase();
  if (st === 'ABSENT') return 'ABSENT';
  if (st === 'PERMISSION') return 'PERMISSION';
  if (st === 'EXCUSED') return 'EXCUSED';

  const hm = periodStartHm?.trim();
  if (hm && ta.timeIn && st !== 'LATE') {
    if (teacherCheckInIsLateVsPeriod(ta.timeIn, localDateYmd, hm)) {
      return 'PRESENT_LATE';
    }
  }
  if (st === 'LATE') return 'PRESENT_LATE';
  if (st === 'PRESENT') return 'PRESENT_ON_TIME';
  /* Unknown statuses: avoid mis-labeling lateness — still flag as needing review via raw status */
  return 'PRESENT_ON_TIME';
}

export async function buildSessionMonitor(params: {
  prisma: PrismaClient;
  schoolId: string;
  localDateYmd: string;
  session: AttendanceSession;
}): Promise<{
  summary: SessionMonitorSummary;
  rows: SessionMonitorRow[];
  academicYearId: string | null;
  dayOfWeek: string | null;
}> {
  const { prisma, schoolId, localDateYmd, session } = params;

  const dow = utcDateStringToDayOfWeek(localDateYmd);
  if (!dow) {
    return {
      summary: emptySummary(0),
      rows: [],
      academicYearId: null,
      dayOfWeek: null,
    };
  }

  const d = parseYmdUtc(localDateYmd);
  const ay = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      startDate: { lte: d },
      endDate: { gte: d },
    },
    orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
    select: { id: true },
  });

  if (!ay) {
    return {
      summary: emptySummary(0),
      rows: [],
      academicYearId: null,
      dayOfWeek: dow,
    };
  }

  const classes = await prisma.class.findMany({
    where: { schoolId, academicYearId: ay.id },
    select: { id: true, name: true, grade: true },
    orderBy: { name: 'asc' },
  });

  const classIds = classes.map((c) => c.id);

  const entries =
    classIds.length === 0
      ? []
      : await prisma.timetableEntry.findMany({
          where: {
            schoolId,
            academicYearId: ay.id,
            dayOfWeek: dow,
            classId: { in: classIds },
          },
          include: {
            period: true,
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        });

  const byClass = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!e.period || e.period.isBreak) continue;
    if (classifyPeriodSession(e.period.startTime) !== session) continue;
    const list = byClass.get(e.classId) || [];
    list.push(e);
    byClass.set(e.classId, list);
  }

  for (const [, list] of byClass) {
    list.sort((a, b) => (a.period?.order ?? 0) - (b.period?.order ?? 0));
  }

  /* Align with `/attendance/school/summary` — same literal YYYY-MM-DD → range + UTC-midnight fallback */
  const dayStart = startOfDay(new Date(localDateYmd));
  const dayEnd = endOfDay(new Date(localDateYmd));
  const dateOr = [
    { date: { gte: dayStart, lte: dayEnd } },
    { date: { gte: new Date(dayStart.getTime() - 24 * 60 * 60 * 1000), lte: dayEnd } },
  ];

  const teacherRows = await prisma.teacherAttendance.findMany({
    where: {
      teacher: { schoolId },
      session,
      OR: dateOr,
    },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const taByTeacher = new Map<string, (typeof teacherRows)[0]>();
  for (const r of teacherRows) {
    const existing = taByTeacher.get(r.teacherId);
    if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      taByTeacher.set(r.teacherId, r);
    }
  }

  const rows: SessionMonitorRow[] = [];
  let withFirstPeriod = 0;
  let unassignedSlots = 0;
  let notCheckedIn = 0;
  let absentMarked = 0;
  let permission = 0;
  let excused = 0;
  let onTime = 0;
  let late = 0;
  let noSlots = 0;

  for (const cls of classes) {
    const list = byClass.get(cls.id) || [];
    const first = list[0];

    if (!first) {
      noSlots++;
      rows.push({
        classId: cls.id,
        className: cls.name,
        grade: cls.grade,
        periodId: null,
        periodName: null,
        periodStartTime: null,
        subjectId: null,
        subjectName: null,
        teacherId: null,
        teacherName: null,
        timeInIso: null,
        timeOutIso: null,
        attendanceStatusRaw: null,
        displayStatus: 'NO_SLOT',
      });
      continue;
    }

    withFirstPeriod++;
    const teacherId = first.teacherId ?? null;
    const teacherAssigned = Boolean(teacherId);
    const ta = teacherId ? taByTeacher.get(teacherId) ?? null : null;

    const periodStartHm = first.period?.startTime ?? null;
    const displayStatus = resolveDisplayStatus({
      hasSlot: true,
      teacherAssigned,
      ta: ta
        ? {
            status: ta.status,
            timeIn: ta.timeIn,
          }
        : null,
      localDateYmd,
      periodStartHm,
    });

    if (!teacherAssigned) unassignedSlots++;
    else if (displayStatus === 'NOT_CHECKED_IN') notCheckedIn++;
    else if (displayStatus === 'ABSENT') absentMarked++;
    else if (displayStatus === 'PERMISSION') permission++;
    else if (displayStatus === 'EXCUSED') excused++;
    else if (displayStatus === 'PRESENT_LATE') late++;
    else if (displayStatus === 'PRESENT_ON_TIME') onTime++;

    rows.push({
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      periodId: first.periodId,
      periodName: first.period?.name ?? null,
      periodStartTime: periodStartHm,
      subjectId: first.subjectId ?? null,
      subjectName: first.subject?.name ?? null,
      teacherId,
      teacherName: first.teacher
        ? teacherFullName(first.teacher.firstName, first.teacher.lastName)
        : null,
      timeInIso: ta?.timeIn ? ta.timeIn.toISOString() : null,
      timeOutIso: ta?.timeOut ? ta.timeOut.toISOString() : null,
      attendanceStatusRaw: ta?.status ?? null,
      displayStatus,
    });
  }

  const summary: SessionMonitorSummary = {
    totalClassesInYear: classes.length,
    withFirstPeriod,
    unassignedSlots,
    notCheckedIn,
    absentMarked,
    permission,
    excused,
    onTime,
    late,
    noSlots,
  };

  return {
    summary,
    rows,
    academicYearId: ay.id,
    dayOfWeek: dow,
  };
}

function emptySummary(totalClasses: number): SessionMonitorSummary {
  return {
    totalClassesInYear: totalClasses,
    withFirstPeriod: 0,
    unassignedSlots: 0,
    notCheckedIn: 0,
    absentMarked: 0,
    permission: 0,
    excused: 0,
    onTime: 0,
    late: 0,
    noSlots: 0,
  };
}
