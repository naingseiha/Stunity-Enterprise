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

    // We filter out excludedMonths (holidays / no-exam months such as April).
    const validMonths = allMonths.filter((m) => !term.excludedMonths?.includes(m));

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
  // Mixed grade tracks (e.g. 7–11 vs 9–12) can have no shared months —
  // fall back to the first selected grade so the picker is never blank.
  return shared.length > 0 ? shared : first;
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
