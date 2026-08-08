/**
 * Resolve which months participate in a MoEYS semester average.
 *
 * Semester monthly average = mean of pre-exam months in the term
 * Final semester = (monthly average + exam month) / 2
 *
 * Holiday / break months are excluded from the monthly average when they are:
 * - listed on AcademicTerm.excludedMonths, or
 * - covered by Academic Calendar VACATION / HOLIDAY (school-closing) events.
 */

export type SemesterTermLike = {
  startDate: Date | string;
  endDate: Date | string;
  examMonth?: number | null;
  excludedMonths?: number[] | null;
};

export type CalendarBreakEventLike = {
  type?: string | null;
  isSchoolDay?: boolean | null;
  startDate: Date | string;
  endDate: Date | string;
};

export type SemesterMonthPlan = {
  preMonths: number[];
  examMonth: number;
  excludedMonths: number[];
  allTermMonths: number[];
};

/** Fallback only when AcademicTerm is unavailable — never includes April holiday. */
export const FALLBACK_SEMESTER_ONE_PRE_MONTHS = [11, 12, 1] as const;
export const FALLBACK_SEMESTER_TWO_PRE_MONTHS = [3, 5, 6] as const;
export const FALLBACK_SEMESTER_ONE_EXAM_MONTH = 2;
export const FALLBACK_SEMESTER_TWO_EXAM_MONTH = 7;

export function monthsBetweenInclusive(
  startDate: Date | string,
  endDate: Date | string,
): number[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const months: number[] = [];
  const cursor = new Date(start);
  cursor.setUTCFullYear(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const endBound = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1);

  while (Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1) <= endBound) {
    months.push(cursor.getUTCMonth() + 1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function normalizeExcludedMonths(raw?: number[] | null): number[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((value) => Number(value))
        .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12),
    ),
  ];
}

function isSchoolClosingEvent(event: CalendarBreakEventLike): boolean {
  const type = String(event.type || "").toUpperCase();
  // A VACATION means the school intentionally skips the monthly assessment
  // window (for example the Khmer New Year break in April). A one-day public
  // HOLIDAY must not remove an otherwise valid reporting month.
  return type === "VACATION";
}

/**
 * Months that contain a configured VACATION (វិសមកាល).
 * Even a short Khmer New Year vacation in April means that month has no monthly exam.
 */
export function monthsClosedByCalendarEvents(
  events: CalendarBreakEventLike[] | null | undefined,
): number[] {
  if (!events?.length) return [];
  const closed = new Set<number>();

  for (const event of events) {
    if (!isSchoolClosingEvent(event)) continue;
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      continue;
    }
    for (const month of monthsBetweenInclusive(start, end)) {
      closed.add(month);
    }
  }

  return [...closed].sort((a, b) => a - b);
}

export function mergeExcludedMonths(
  ...groups: Array<number[] | null | undefined>
): number[] {
  return normalizeExcludedMonths(groups.flatMap((group) => group || []));
}

/**
 * Build the official semester month plan from an AcademicTerm (preferred)
 * plus optional calendar-break months from Academic Calendar settings.
 */
export function resolveSemesterMonthPlan(
  termNumber: 1 | 2,
  term?: SemesterTermLike | null,
  options?: {
    fallbackExamMonth?: number;
    /** Extra break months from calendar VACATION/HOLIDAY (or term UI). */
    calendarBreakMonths?: number[] | null;
  },
): SemesterMonthPlan {
  const excludedMonths = mergeExcludedMonths(
    term?.excludedMonths,
    options?.calendarBreakMonths,
  );
  const fallbackExamMonth = options?.fallbackExamMonth;

  if (term) {
    const allTermMonths = monthsBetweenInclusive(term.startDate, term.endDate);
    const fallbackExam =
      fallbackExamMonth ??
      (termNumber === 1
        ? FALLBACK_SEMESTER_ONE_EXAM_MONTH
        : FALLBACK_SEMESTER_TWO_EXAM_MONTH);
    const configuredExam = Number(term.examMonth);
    const examMonth =
      Number.isInteger(configuredExam) &&
      configuredExam >= 1 &&
      configuredExam <= 12 &&
      allTermMonths.includes(configuredExam)
        ? configuredExam
        : allTermMonths.includes(fallbackExam)
          ? fallbackExam
          : (allTermMonths.at(-1) ?? fallbackExam);

    // Never exclude the exam month itself even if a holiday overlaps poorly configured data.
    const effectiveExcluded = excludedMonths.filter((month) => month !== examMonth);
    const examIdx = allTermMonths.indexOf(examMonth);
    const preMonths = (
      examIdx !== -1 ? allTermMonths.slice(0, examIdx) : allTermMonths
    ).filter(
      (month) => month !== examMonth && !effectiveExcluded.includes(month),
    );

    return {
      preMonths,
      examMonth,
      excludedMonths: effectiveExcluded,
      allTermMonths: allTermMonths.filter((month) => !effectiveExcluded.includes(month)),
    };
  }

  const preMonths = [
    ...(termNumber === 1
      ? FALLBACK_SEMESTER_ONE_PRE_MONTHS
      : FALLBACK_SEMESTER_TWO_PRE_MONTHS),
  ].filter((month) => !excludedMonths.includes(month));
  const examMonth =
    fallbackExamMonth ??
    (termNumber === 1
      ? FALLBACK_SEMESTER_ONE_EXAM_MONTH
      : FALLBACK_SEMESTER_TWO_EXAM_MONTH);

  return {
    preMonths,
    examMonth,
    excludedMonths,
    allTermMonths: [...preMonths, examMonth],
  };
}
