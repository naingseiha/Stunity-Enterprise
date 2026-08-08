import type { AcademicTerm } from '@/lib/api/academic-years';

export type TermCompatibilityGroup = {
  key: string;
  grades: string[];
  configured: boolean;
};

function normalizeGrade(gradeInput: string | number) {
  return String(Number(String(gradeInput).replace(/[^0-9]/g, '')) || 0);
}
/**
 * Canonical signature for the full academic-year calculation plan of a grade.
 * Classes can be generated together only when these signatures match exactly.
 */
export function getGradeTermCompatibilityKey(
  terms: AcademicTerm[],
  gradeInput: string | number,
) {
  const grade = Number(normalizeGrade(gradeInput));
  const applicable = terms
    .filter((term) => !term.gradeLevels?.length || term.gradeLevels.includes(grade))
    .sort((left, right) => {
      if (left.termNumber !== right.termNumber) return left.termNumber - right.termNumber;
      return String(left.startDate).localeCompare(String(right.startDate));
    });

  // Fail closed: without a configured plan, only classes from the same grade
  // may be batched. This prevents accidental cross-grade calculation rules.
  if (applicable.length === 0) return `unconfigured:${grade}`;

  return JSON.stringify(
    applicable.map((term) => ({
      termNumber: term.termNumber,
      startDate: String(term.startDate).slice(0, 10),
      endDate: String(term.endDate).slice(0, 10),
      examMonth: term.examMonth ?? null,
      excludedMonths: [...new Set(term.excludedMonths || [])].sort((a, b) => a - b),
    })),
  );
}

export function buildTermCompatibilityGroups(
  terms: AcademicTerm[],
  gradeInputs: Array<string | number>,
): TermCompatibilityGroup[] {
  const groups = new Map<string, TermCompatibilityGroup>();
  const grades = [...new Set(gradeInputs.map(normalizeGrade).filter((grade) => grade !== '0'))]
    .sort((left, right) => Number(left) - Number(right));

  grades.forEach((grade) => {
    const key = getGradeTermCompatibilityKey(terms, grade);
    const current = groups.get(key);
    if (current) {
      current.grades.push(grade);
      return;
    }
    groups.set(key, {
      key,
      grades: [grade],
      configured: !key.startsWith('unconfigured:'),
    });
  });

  return Array.from(groups.values());
}
