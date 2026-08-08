import { AcademicTerm } from '@/lib/api/academic-years';
import { getKhmerMonthLabel } from './months';

export type AvailableMonth = {
  number: number;
  label: string;
  isExamMonth?: boolean;
  termNumber?: number;
};

export type AvailableMonthsOptions = {
  /** When false, semester exam months are omitted (for monthly registers). Default true. */
  includeExamMonths?: boolean;
};

export type ReportTermPlan = {
  grade: number;
  termNumber: number;
  countedMonths: AvailableMonth[];
  examMonth: number | null;
  excludedMonths: number[];
  startDate?: string;
  endDate?: string;
};

/** Get all month numbers between a start and end date */
export function getMonthsBetweenDates(startDateStr: string, endDateStr: string): number[] {
  const months: number[] = [];
  const current = new Date(startDateStr);
  current.setDate(1); // Set to 1st of month to avoid issues
  const end = new Date(endDateStr);

  while (current <= end) {
    months.push(current.getMonth() + 1); // getMonth is 0-indexed
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

/**
 * Returns the list of available months for a specific grade based on the active Academic Terms.
 * Finds all terms applicable to the grade, generates the months between their start/end dates,
 * filters out excluded months (holidays), and attaches metadata like whether a month is an exam month.
 */
export function getAvailableMonthsForGrade(
  terms: AcademicTerm[],
  gradeStr: string | number,
  options: AvailableMonthsOptions = {},
): AvailableMonth[] {
  if (!terms || terms.length === 0) return [];

  const includeExamMonths = options.includeExamMonths !== false;
  const grade = Number(String(gradeStr).replace(/[^0-9]/g, '')) || 0;

  // Find terms that apply to this grade.
  // A term applies if its gradeLevels array is empty (applies to all) OR includes the grade.
  const applicableTerms = terms.filter(
    (t) => !t.gradeLevels || t.gradeLevels.length === 0 || t.gradeLevels.includes(grade),
  );

  const availableMonths: AvailableMonth[] = [];
  const addedMonths = new Set<number>();

  // Sort terms by termNumber so we process Semester 1 before Semester 2
  const sortedTerms = [...applicableTerms].sort(
    (a, b) => (a.termNumber || 0) - (b.termNumber || 0),
  );

  for (const term of sortedTerms) {
    const allMonths = getMonthsBetweenDates(term.startDate, term.endDate);
    const examIndex = term.examMonth ? allMonths.indexOf(term.examMonth) : -1;
    const reportMonths =
      !includeExamMonths && examIndex >= 0
        ? allMonths.slice(0, examIndex)
        : allMonths;

    // We filter out excludedMonths (holidays / no-exam months such as April).
    const validMonths = reportMonths.filter((m) => !term.excludedMonths?.includes(m));

    for (const m of validMonths) {
      if (addedMonths.has(m)) continue;
      const isExamMonth = m === term.examMonth;
      // Monthly registers must not offer semester-exam months.
      if (!includeExamMonths && isExamMonth) continue;
      addedMonths.add(m);
      availableMonths.push({
        number: m,
        label: getKhmerMonthLabel(m),
        isExamMonth,
        termNumber: term.termNumber,
      });
    }
  }

  return availableMonths;
}

/**
 * Months shared by every selected grade (intersection).
 * Used when generating monthly reports for mixed grade classes in one batch.
 */
export function getMonthlyReportMonthsForGrades(
  terms: AcademicTerm[],
  grades: Array<string | number>,
): AvailableMonth[] {
  const normalized = [
    ...new Set(
      grades
        .map((grade) => Number(String(grade).replace(/[^0-9]/g, '')) || 0)
        .filter((grade) => grade > 0),
    ),
  ];

  if (normalized.length === 0) {
    return getAvailableMonthsForGrade(terms, 7, { includeExamMonths: false });
  }

  const lists = normalized.map((grade) =>
    getAvailableMonthsForGrade(terms, grade, { includeExamMonths: false }),
  );
  const [first, ...rest] = lists;
  if (!first?.length) return [];

  const shared = first.filter((month) =>
    rest.every((list) => list.some((item) => item.number === month.number)),
  );
  // A mixed batch must never silently borrow the first grade's month plan.
  // An empty intersection tells the UI to split the batch or ask for one group.
  return shared;
}

/**
 * Resolve the exact calculation window for one grade and semester. Months
 * after the configured exam are intentionally excluded from the average.
 */
export function resolveReportTermPlan(
  terms: AcademicTerm[],
  gradeInput: string | number,
  termNumber: number,
): ReportTermPlan {
  const grade = Number(String(gradeInput).replace(/[^0-9]/g, '')) || 0;
  const applicable = terms.filter(
    (term) => !term.gradeLevels?.length || term.gradeLevels.includes(grade),
  );
  const term = applicable.find((candidate) => candidate.termNumber === termNumber);

  if (!term) {
    return {
      grade,
      termNumber,
      countedMonths: [],
      examMonth: null,
      excludedMonths: [],
    };
  }

  const excludedMonths = [...new Set(term.excludedMonths || [])].sort((a, b) => a - b);
  const allMonths = getMonthsBetweenDates(term.startDate, term.endDate);
  const configuredExam = Number(term.examMonth);
  const examMonth = allMonths.includes(configuredExam)
    ? configuredExam
    : allMonths.at(-1) || null;
  const examIndex = examMonth == null ? -1 : allMonths.indexOf(examMonth);
  const preExamMonths = examIndex >= 0 ? allMonths.slice(0, examIndex) : allMonths;
  const countedMonths = preExamMonths
    .filter((month) => !excludedMonths.includes(month))
    .map((month) => ({
      number: month,
      label: getKhmerMonthLabel(month),
      isExamMonth: false,
      termNumber: term.termNumber,
    }));

  return {
    grade,
    termNumber: term.termNumber,
    countedMonths,
    examMonth,
    excludedMonths: excludedMonths.filter((month) => month !== examMonth),
    startDate: term.startDate,
    endDate: term.endDate,
  };
}

/** Exam months configured for a grade from AcademicTerm settings. */
export function getExamMonthsForGrade(
  terms: AcademicTerm[],
  gradeStr: string | number,
): AvailableMonth[] {
  return getAvailableMonthsForGrade(terms, gradeStr, { includeExamMonths: true }).filter(
    (month) => month.isExamMonth,
  );
}
