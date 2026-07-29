/**
 * System-aware grade scaling.
 *
 * Scores are stored on a 0–(coefficient × 50) scale: every subject has
 * `maxScore = coefficient × 50`, so the coefficient is ALREADY baked into
 * `grade.score`. For the Cambodian MoEYS system the correct per-student
 * average is therefore Σ(score) / Σ(coefficient), which lands on 0–50 with a
 * passing mark of 25 — matching the authoritative admin monthly report
 * (see reports/monthly/build-khm-moeys-monthly-report.ts).
 *
 * The legacy/system-agnostic path multiplied by the coefficient a second time
 * (Σ(score × coefficient) / Σ(coefficient)), inflating averages above the cap.
 * That weighted-mean behaviour is preserved only for the GENERIC fallback,
 * where scores are assumed to be on a plain 0–100 scale.
 */
import { khmerMonthlyGradeLevel, KHMER_MONTH_PASSING_AVERAGE } from './monthly/khm-moeys-logic';

export type GradeSystemId = 'KHM_MOEYS' | 'GENERIC';

export interface GradeScale {
  system: GradeSystemId;
  /** Maximum value an average can reach (50 for MoEYS, 100 generic). */
  maxAverage: number;
  /** Average at or above which a student passes. */
  passingMark: number;
}

/** Map a school's educationModel to a grading scale. */
export function resolveGradeScale(educationModel?: string | null): GradeScale {
  const model = (educationModel || '').trim().toUpperCase().replace(/-/g, '_');
  if (model === 'KHM_MOEYS') {
    return { system: 'KHM_MOEYS', maxAverage: 50, passingMark: KHMER_MONTH_PASSING_AVERAGE };
  }
  return { system: 'GENERIC', maxAverage: 100, passingMark: 50 };
}

/**
 * Generic 0–100 letter grade (unchanged legacy thresholds). Used both as the
 * GENERIC system's composite grade level, and — regardless of school system —
 * for any already-percentage value (e.g. a single subject's score/maxScore),
 * since a per-subject percentage is always 0–100 even at a KHM_MOEYS school.
 */
export function genericGradeLevel(value: number): string {
  if (value >= 90) return 'A';
  if (value >= 80) return 'B';
  if (value >= 70) return 'C';
  if (value >= 60) return 'D';
  if (value >= 50) return 'E';
  return 'F';
}

export function gradeLevelForScale(scale: GradeScale, average: number): string {
  return scale.system === 'KHM_MOEYS' ? khmerMonthlyGradeLevel(average) : genericGradeLevel(average);
}

export function isPassingForScale(scale: GradeScale, average: number): boolean {
  return average >= scale.passingMark;
}

interface AverageInputGrade {
  studentId: string;
  subjectId: string;
  score: number;
  subject: { coefficient: number };
}

/**
 * Per-student average keyed by studentId, system-aware.
 *
 * Multiple entries for the same subject (e.g. several months in a term query)
 * are meaned per subject first, matching the previous behaviour; only the way
 * subject means are combined differs by system:
 *   - KHM_MOEYS: Σ(subjectMean) / Σ(coefficient)            → 0–50
 *   - GENERIC:   Σ(subjectMean × coefficient) / Σ(coefficient) → 0–100 weighted
 */
/**
 * Combine a student's already-averaged per-subject means into one composite
 * average, system-aware. This is the same final step `buildStudentAverageMap`
 * runs per student — factored out so callers that pre-aggregate subject means
 * themselves (e.g. via a DB-side `groupBy` instead of fetching every raw grade
 * row) can reuse the exact formula instead of re-deriving it.
 */
export function combineSubjectAverages(
  subjectMeans: Array<{ mean: number; coefficient: number }>,
  scale: GradeScale
): number {
  let numerator = 0;
  let totalCoefficient = 0;

  subjectMeans.forEach(({ mean, coefficient }) => {
    numerator += scale.system === 'KHM_MOEYS' ? mean : mean * coefficient;
    totalCoefficient += coefficient;
  });

  return totalCoefficient > 0 ? numerator / totalCoefficient : 0;
}

export function buildStudentAverageMap(
  grades: AverageInputGrade[],
  scale: GradeScale
): Map<string, number> {
  const studentSubjectTotals = new Map<
    string,
    Map<string, { total: number; count: number; coefficient: number }>
  >();

  grades.forEach((grade) => {
    const subjectTotals = studentSubjectTotals.get(grade.studentId) || new Map();
    const subjectData = subjectTotals.get(grade.subjectId) || {
      total: 0,
      count: 0,
      coefficient: grade.subject.coefficient,
    };

    subjectData.total += grade.score;
    subjectData.count += 1;
    subjectData.coefficient = grade.subject.coefficient;
    subjectTotals.set(grade.subjectId, subjectData);
    studentSubjectTotals.set(grade.studentId, subjectTotals);
  });

  const averages = new Map<string, number>();

  studentSubjectTotals.forEach((subjectTotals, studentId) => {
    const subjectMeans = Array.from(subjectTotals.values()).map((data) => ({
      mean: data.count > 0 ? data.total / data.count : 0,
      coefficient: data.coefficient,
    }));
    averages.set(studentId, combineSubjectAverages(subjectMeans, scale));
  });

  return averages;
}
