import {
  DayOfWeek,
  AttendanceSession,
  PrismaClient,
  Prisma,
} from '@prisma/client';

const DAY_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** Map YYYY-MM-DD (calendar date string from client / interval) → DayOfWeek using UTC calendar date */
export function utcDateStringToDayOfWeek(ymd: string): DayOfWeek | null {
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const dow = new Date(utc).getUTCDay();
  const mondayIndexed = dow === 0 ? 6 : dow - 1;
  return DAY_ORDER[mondayIndexed] ?? null;
}

const WORKING_DAY_NUM_TO_ENUM: Record<number, DayOfWeek> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

export type WeeklySessionPattern = Record<
  DayOfWeek,
  { morning: boolean; afternoon: boolean }
>;

export function emptyWeeklyPattern(): WeeklySessionPattern {
  const pattern = {} as WeeklySessionPattern;
  for (const d of DAY_ORDER) {
    pattern[d] = { morning: false, afternoon: false };
  }
  return pattern;
}

/** Classify period slot into attendance session buckets from period.startTime ("HH:mm" or leading hour). */
export function classifyPeriodSession(startTime: string): AttendanceSession {
  const trimmed = startTime.trim();
  const hm = trimmed.match(/^(\d{1,2})/);
  const hour = hm ? parseInt(hm[1], 10) : 12;
  return hour < 12 ? 'MORNING' : 'AFTERNOON';
}

export function mergePattern(
  pattern: WeeklySessionPattern,
  day: DayOfWeek,
  session: AttendanceSession
): void {
  if (session === 'MORNING') pattern[day].morning = true;
  else pattern[day].afternoon = true;
}

async function fetchTimetablePattern(
  prisma: PrismaClient,
  teacherId: string,
  schoolId: string,
  academicYearId: string
): Promise<{ pattern: WeeklySessionPattern; periodCount: number }> {
  const entries = await prisma.timetableEntry.findMany({
    where: {
      teacherId,
      schoolId,
      academicYearId,
    },
    include: { period: true },
  });

  const pattern = emptyWeeklyPattern();
  let teachingSlots = 0;

  for (const e of entries) {
    if (!e.period || e.period.isBreak) continue;
    if (!e.teacherId) continue;
    teachingSlots++;
    mergePattern(pattern, e.dayOfWeek, classifyPeriodSession(e.period.startTime));
  }

  return { pattern, periodCount: teachingSlots };
}

function workingDaysFallbackPattern(
  workingDays?: number[] | null
): WeeklySessionPattern {
  const nums = Array.isArray(workingDays) && workingDays.length
    ? workingDays
    : [1, 2, 3, 4, 5];

  const pattern = emptyWeeklyPattern();
  const seen = new Set<DayOfWeek>();

  for (const n of nums) {
    const d = WORKING_DAY_NUM_TO_ENUM[n];
    if (d && !seen.has(d)) {
      seen.add(d);
      pattern[d] = { morning: true, afternoon: true };
    }
  }

  if (seen.size === 0) {
    pattern.MONDAY = { morning: true, afternoon: true };
    pattern.TUESDAY = { morning: true, afternoon: true };
    pattern.WEDNESDAY = { morning: true, afternoon: true };
    pattern.THURSDAY = { morning: true, afternoon: true };
    pattern.FRIDAY = { morning: true, afternoon: true };
  }

  return pattern;
}

/** Resolve academic year that overlaps query range */
export async function findAcademicYearForRange(
  prisma: PrismaClient,
  schoolId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<{ id: string; startDate: Date; endDate: Date } | null> {
  return prisma.academicYear.findFirst({
    where: {
      schoolId,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
    },
    orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
  });
}

export type TeacherWeeklySchedule = {
  academicYearId: string | null;
  source: 'timetable' | 'fallback';
  pattern: WeeklySessionPattern;
  scheduledWeekdays: DayOfWeek[];
};

export async function getTeacherWeeklySchedule(
  prisma: PrismaClient,
  teacherId: string,
  schoolId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<TeacherWeeklySchedule> {
  const ay = await findAcademicYearForRange(
    prisma,
    schoolId,
    rangeStart,
    rangeEnd
  );

  if (!ay) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { workingDays: true },
    });
    const pattern = workingDaysFallbackPattern(school?.workingDays ?? undefined);
    return {
      academicYearId: null,
      source: 'fallback',
      pattern,
      scheduledWeekdays: DAY_ORDER.filter(
        (d) => pattern[d].morning || pattern[d].afternoon
      ),
    };
  }

  const { pattern, periodCount } = await fetchTimetablePattern(
    prisma,
    teacherId,
    schoolId,
    ay.id
  );

  if (periodCount === 0) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { workingDays: true },
    });
    const fb = workingDaysFallbackPattern(school?.workingDays ?? undefined);
    return {
      academicYearId: ay.id,
      source: 'fallback',
      pattern: fb,
      scheduledWeekdays: DAY_ORDER.filter(
        (d) => fb[d].morning || fb[d].afternoon
      ),
    };
  }

  return {
    academicYearId: ay.id,
    source: 'timetable',
    pattern,
    scheduledWeekdays: DAY_ORDER.filter(
      (d) => pattern[d].morning || pattern[d].afternoon
    ),
  };
}

function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${d.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmdUtc(ymd: string): Date {
  const [y, mo, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

export type ScheduledDayExpectation = {
  expectsMorning: boolean;
  expectsAfternoon: boolean;
};

/** Inclusive UTC calendar days as YYYY-MM-DD */
export function eachUtcCalendarDayInclusive(
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  const dates: string[] = [];
  let cur = parseYmdUtc(ymdUtc(rangeStart)).getTime();
  const lim = parseYmdUtc(ymdUtc(rangeEnd)).getTime();
  while (cur <= lim) {
    dates.push(ymdUtc(new Date(cur)));
    cur += 86400000;
  }
  return dates;
}

/** Expectations for calendar date strings in range — used for denominators */
export function buildExpectationsIndex(
  weekly: WeeklySessionPattern,
  ay: { startDate: Date; endDate: Date } | null,
  rangeStart: Date,
  rangeEnd: Date
): Map<string, ScheduledDayExpectation> {
  const map = new Map<string, ScheduledDayExpectation>();

  let startYmd = ymdUtc(rangeStart);
  let endYmd = ymdUtc(rangeEnd);

  if (ay) {
    const ayR0 = ymdUtc(ay.startDate);
    const ayR1 = ymdUtc(ay.endDate);
    if (startYmd.localeCompare(ayR0) < 0) startYmd = ayR0;
    if (endYmd.localeCompare(ayR1) > 0) endYmd = ayR1;
  }

  for (const ymd of eachUtcCalendarDayInclusive(
    parseYmdUtc(startYmd),
    parseYmdUtc(endYmd)
  )) {
    const dow = utcDateStringToDayOfWeek(ymd);
    if (!dow) continue;

    const p = weekly[dow];
    if (!p || (!p.morning && !p.afternoon)) continue;

    map.set(ymd, {
      expectsMorning: p.morning,
      expectsAfternoon: p.afternoon,
    });
  }

  return map;
}

type TeacherAttendanceMinimal = {
  date: Date;
  session: AttendanceSession;
  status: string;
};

export type TimetableCompliance = {
  expectedSessions: number;
  fulfilledScheduledSessions: number;
  missedScheduledSessions: number;
  scheduledWorkDaysInRange: number;
};

export function tallyTimetableCompliance(
  expectations: Map<string, ScheduledDayExpectation>,
  records: TeacherAttendanceMinimal[]
): TimetableCompliance {
  const keyed = new Map<
    string,
    Partial<Record<'MORNING' | 'AFTERNOON', string>>
  >();

  for (const r of records) {
    const ymd = ymdUtc(r.date);
    let slot = keyed.get(ymd);
    if (!slot) {
      slot = {};
      keyed.set(ymd, slot);
    }
    slot[r.session] = r.status;
  }

  let expectedSessions = 0;
  let fulfilledScheduledSessions = 0;
  let missedScheduledSessions = 0;
  const daysWithExpectation = new Set<string>();

  for (const [ymd, exp] of expectations) {
    if (exp.expectsMorning) {
      expectedSessions++;
      daysWithExpectation.add(ymd);
      const st = keyed.get(ymd)?.MORNING;
      if (st === 'PRESENT' || st === 'LATE' || st === 'PERMISSION') {
        fulfilledScheduledSessions++;
      } else {
        missedScheduledSessions++;
      }
    }
    if (exp.expectsAfternoon) {
      expectedSessions++;
      daysWithExpectation.add(ymd);
      const st = keyed.get(ymd)?.AFTERNOON;
      if (st === 'PRESENT' || st === 'LATE' || st === 'PERMISSION') {
        fulfilledScheduledSessions++;
      } else {
        missedScheduledSessions++;
      }
    }
  }

  return {
    expectedSessions,
    fulfilledScheduledSessions,
    missedScheduledSessions,
    scheduledWorkDaysInRange: daysWithExpectation.size,
  };
}

/** Whether teacher has at least one non-break period for this class on this weekday */
export async function teacherHasClassPeriodOnDay(params: {
  prisma: PrismaClient;
  teacherId: string;
  classId: string;
  schoolId: string;
  localDateStr: string;
}): Promise<{
  linkedDay: boolean;
  academicYearId: string | null;
  patternSource: TeacherWeeklySchedule['source'];
}> {
  const { prisma, teacherId, classId, schoolId, localDateStr } = params;
  const dow = utcDateStringToDayOfWeek(localDateStr);
  if (!dow) {
    return { linkedDay: false, academicYearId: null, patternSource: 'fallback' };
  }

  const d = parseYmdUtc(localDateStr);
  const ay = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      startDate: { lte: d },
      endDate: { gte: d },
    },
    orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
    select: { id: true },
  });

  type TeachingEntryWithPeriod = Prisma.TimetableEntryGetPayload<{
    include: { period: true };
  }>;
  let teachingEntry: TeachingEntryWithPeriod | null = null;

  if (ay) {
    teachingEntry = await prisma.timetableEntry.findFirst({
      where: {
        teacherId,
        classId,
        schoolId,
        academicYearId: ay.id,
        dayOfWeek: dow,
      },
      include: { period: true },
    });

    const anySlotsForTeacherInYear =
      teachingEntry ??
      (await prisma.timetableEntry.findFirst({
        where: { teacherId, schoolId, academicYearId: ay.id },
        select: { id: true },
      }));

    const hasTeachingSlot =
      teachingEntry &&
      teachingEntry.period &&
      !teachingEntry.period.isBreak &&
      Boolean(teachingEntry.teacherId);

    if (!anySlotsForTeacherInYear) {
      return {
        linkedDay: true,
        academicYearId: ay.id,
        patternSource: 'fallback',
      };
    }

    return {
      linkedDay: !!hasTeachingSlot,
      academicYearId: ay.id,
      patternSource: 'timetable',
    };
  }

  return {
    linkedDay: true,
    academicYearId: null,
    patternSource: 'fallback',
  };
}

/** True when this teacher has a scheduled (non-break) period for class on date for the given attendance session */
export async function teacherTeachesClassSessionOnDate(params: {
  prisma: PrismaClient;
  teacherId: string;
  classId: string;
  schoolId: string;
  localDateStr: string;
  session: AttendanceSession;
}): Promise<{ allowed: boolean; source: TeacherWeeklySchedule['source'] }> {
  const { prisma, teacherId, classId, schoolId, localDateStr, session } = params;
  const dow = utcDateStringToDayOfWeek(localDateStr);
  if (!dow) {
    return { allowed: true, source: 'fallback' };
  }

  const d = parseYmdUtc(localDateStr);
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
    return { allowed: true, source: 'fallback' };
  }

  const teacherHasAnySlotInYear = await prisma.timetableEntry.findFirst({
    where: {
      teacherId,
      schoolId,
      academicYearId: ay.id,
    },
    select: { id: true },
  });

  if (!teacherHasAnySlotInYear) {
    return { allowed: true, source: 'fallback' };
  }

  const dayEntries = await prisma.timetableEntry.findMany({
    where: {
      teacherId,
      classId,
      schoolId,
      academicYearId: ay.id,
      dayOfWeek: dow,
    },
    include: { period: true },
  });

  const teachingSlots = dayEntries.filter(
    (e) => e.period && !e.period.isBreak && Boolean(e.teacherId)
  );

  if (teachingSlots.length === 0) {
    return { allowed: false, source: 'timetable' };
  }

  const match = teachingSlots.some(
    (e) =>
      classifyPeriodSession((e.period as { startTime: string }).startTime) ===
      session
  );

  return { allowed: match, source: 'timetable' };
}

export function serializeWeeklyPattern(pattern: WeeklySessionPattern) {
  const o = {} as Record<DayOfWeek, { morning: boolean; afternoon: boolean }>;
  for (const d of DAY_ORDER) {
    o[d] = { ...pattern[d] };
  }
  return o;
}
