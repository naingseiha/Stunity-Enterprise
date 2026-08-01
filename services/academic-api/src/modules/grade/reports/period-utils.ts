import type { PrismaClient } from '@prisma/client';

/**
 * Period/term resolution shared by grade reporting endpoints.
 *
 * This mirrors the private helpers in `grade/index.ts` (monthStart/monthEnd/
 * enumerateReportPeriods/resolveReportTermContext/buildGradePeriodWhere) so new
 * report endpoints can reuse the exact same term math without depending on
 * that file's unexported internals.
 */

export const KHMER_MONTH_LABELS: Record<number, string> = {
  1: 'មករា',
  2: 'កុម្ភៈ',
  3: 'មីនា',
  4: 'មេសា',
  5: 'ឧសភា',
  6: 'មិថុនា',
  7: 'កក្កដា',
  8: 'សីហា',
  9: 'កញ្ញា',
  10: 'តុលា',
  11: 'វិច្ឆិកា',
  12: 'ធ្នូ',
};

export type ReportPeriod = {
  year: number;
  monthNumber: number;
  label: string;
};

export type ReportTermContext = {
  academicYearId?: string;
  termId?: string;
  termName: string;
  termNumber: number;
  startDate: Date;
  endDate: Date;
  periods: ReportPeriod[];
};

export function monthStart(year: number, monthNumber: number) {
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

export function monthEnd(year: number, monthNumber: number) {
  return new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
}

export function enumerateReportPeriods(startDate: Date, endDate: Date): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  let year = startDate.getUTCFullYear();
  let monthNumber = startDate.getUTCMonth() + 1;
  const endValue = endDate.getUTCFullYear() * 100 + endDate.getUTCMonth() + 1;

  while (year * 100 + monthNumber <= endValue) {
    periods.push({
      year,
      monthNumber,
      label: KHMER_MONTH_LABELS[monthNumber] || `Month ${monthNumber}`,
    });
    monthNumber += 1;
    if (monthNumber > 12) {
      monthNumber = 1;
      year += 1;
    }
  }

  return periods;
}

export function fallbackReportTerm(semester: string, academicStartYear: number): ReportTermContext {
  const semesterNumber = semester === '2' ? 2 : 1;
  const start =
    semesterNumber === 1
      ? { year: academicStartYear, monthNumber: 11 }
      : { year: academicStartYear + 1, monthNumber: 3 };
  const end =
    semesterNumber === 1
      ? { year: academicStartYear + 1, monthNumber: 2 }
      : { year: academicStartYear + 1, monthNumber: 8 };

  const startDate = monthStart(start.year, start.monthNumber);
  const endDate = monthEnd(end.year, end.monthNumber);

  return {
    termName: semesterNumber === 1 ? 'Semester 1' : 'Semester 2',
    termNumber: semesterNumber,
    startDate,
    endDate,
    periods: enumerateReportPeriods(startDate, endDate),
  };
}

export async function resolveReportTermContext(
  prisma: PrismaClient,
  schoolId: string | null,
  semester: string,
  academicStartYear: number,
  gradeLevel?: number,
): Promise<ReportTermContext> {
  const semesterNumber = semester === '2' ? 2 : 1;

  if (!schoolId || !Number.isFinite(academicStartYear)) {
    return fallbackReportTerm(semester, academicStartYear || new Date().getFullYear());
  }

  const academicYearName = `${academicStartYear}-${academicStartYear + 1}`;
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      OR: [
        { name: academicYearName },
        {
          startDate: { lte: monthEnd(academicStartYear, 12) },
          endDate: { gte: monthStart(academicStartYear, 1) },
        },
      ],
    },
    include: {
      terms: {
        where: { termNumber: semesterNumber },
        orderBy: { termNumber: 'asc' },
      },
    },
    orderBy: [
      { name: 'desc' },
      { startDate: 'desc' },
    ],
  });

  const term = academicYear?.terms?.find(
    (candidate) => !Number.isFinite(gradeLevel) || candidate.gradeLevels.length === 0 || candidate.gradeLevels.includes(gradeLevel!),
  );
  if (!term) {
    const fallback = fallbackReportTerm(semester, academicStartYear);
    return {
      ...fallback,
      academicYearId: academicYear?.id,
    };
  }

  return {
    academicYearId: academicYear.id,
    termId: term.id,
    termName: term.name,
    termNumber: term.termNumber,
    startDate: term.startDate,
    endDate: term.endDate,
    periods: enumerateReportPeriods(term.startDate, term.endDate)
      .filter((period) => !term.excludedMonths.includes(period.monthNumber)),
  };
}

export function buildGradePeriodWhere(periods: ReportPeriod[]) {
  return {
    OR: periods.flatMap((period) => [
      { year: period.year, monthNumber: period.monthNumber },
      { year: period.year, month: period.label },
    ]),
  };
}

export function reportPeriodCacheKey(periods: ReportPeriod[]) {
  return periods.map((period) => `${period.year}-${period.monthNumber}`).join(',');
}
