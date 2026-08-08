export type YearEndOutcome =
  | 'PENDING'
  | 'PROMOTE'
  | 'CONDITIONAL_PROMOTE'
  | 'REPEAT'
  | 'GRADUATE'
  | 'WITHDRAWN';

export interface PromotionPolicyValues {
  passAverage: number;
  minAttendanceRate: number;
  terminalGrade: number;
  maxUnexcusedAbsences: number | null;
  maxDisciplineIncidents: number | null;
  requireCompleteGrades: boolean;
  allowConditionalPromotion: boolean;
  allowSupplementaryExam: boolean;
  requireReasonForOverride: boolean;
  requireSecondApproval: boolean;
  additionalRules: Record<string, unknown>;
}

export const DEFAULT_PROMOTION_POLICY: PromotionPolicyValues = {
  passAverage: 50,
  minAttendanceRate: 75,
  terminalGrade: 12,
  maxUnexcusedAbsences: null,
  maxDisciplineIncidents: null,
  requireCompleteGrades: false,
  allowConditionalPromotion: true,
  allowSupplementaryExam: true,
  requireReasonForOverride: true,
  requireSecondApproval: false,
  additionalRules: {},
};

const finiteNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nullableNonNegativeInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

export function normalizePromotionPolicy(input: Partial<PromotionPolicyValues> | null | undefined): PromotionPolicyValues {
  return {
    passAverage: Math.min(100, Math.max(0, finiteNumber(input?.passAverage, DEFAULT_PROMOTION_POLICY.passAverage))),
    minAttendanceRate: Math.min(100, Math.max(0, finiteNumber(input?.minAttendanceRate, DEFAULT_PROMOTION_POLICY.minAttendanceRate))),
    terminalGrade: Math.min(20, Math.max(1, Math.round(finiteNumber(input?.terminalGrade, DEFAULT_PROMOTION_POLICY.terminalGrade)))),
    maxUnexcusedAbsences: nullableNonNegativeInt(input?.maxUnexcusedAbsences),
    maxDisciplineIncidents: nullableNonNegativeInt(input?.maxDisciplineIncidents),
    requireCompleteGrades: input?.requireCompleteGrades === true,
    allowConditionalPromotion: input?.allowConditionalPromotion !== false,
    allowSupplementaryExam: input?.allowSupplementaryExam !== false,
    requireReasonForOverride: input?.requireReasonForOverride !== false,
    requireSecondApproval: input?.requireSecondApproval === true,
    additionalRules:
      input?.additionalRules && typeof input.additionalRules === 'object' && !Array.isArray(input.additionalRules)
        ? input.additionalRules
        : {},
  };
}

export function gradePercentage(grade: { percentage?: number | null; score: number; maxScore: number }): number | null {
  if (typeof grade.percentage === 'number' && Number.isFinite(grade.percentage)) {
    return Math.min(100, Math.max(0, grade.percentage));
  }
  if (!Number.isFinite(grade.score) || !Number.isFinite(grade.maxScore) || grade.maxScore <= 0) return null;
  return Math.min(100, Math.max(0, (grade.score / grade.maxScore) * 100));
}

export function averagePercent(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 100) / 100;
}

export interface YearEndGradeRecord {
  subjectId: string;
  score: number;
  maxScore: number;
  percentage?: number | null;
  month?: string | null;
  monthNumber?: number | null;
  year?: number | null;
  subject: { coefficient: number };
}

export interface YearEndTermWindow {
  termNumber: number;
  startDate: Date;
  endDate: Date;
  excludedMonths: number[];
  gradeLevels: number[];
}

export interface AnnualAcademicResult {
  semester1Average: number | null;
  semester2Average: number | null;
  annualAverage: number | null;
  isComplete: boolean;
  flags: string[];
}

const monthAliases: Record<string, number> = {
  jan: 1, january: 1, 'មករា': 1,
  feb: 2, february: 2, 'កុម្ភៈ': 2,
  mar: 3, march: 3, 'មីនា': 3,
  apr: 4, april: 4, 'មេសា': 4,
  may: 5, 'ឧសភា': 5,
  jun: 6, june: 6, 'មិថុនា': 6,
  jul: 7, july: 7, 'កក្កដា': 7,
  aug: 8, august: 8, 'សីហា': 8,
  sep: 9, september: 9, 'កញ្ញា': 9,
  oct: 10, october: 10, 'តុលា': 10,
  nov: 11, november: 11, 'វិច្ឆិកា': 11,
  dec: 12, december: 12, 'ធ្នូ': 12,
};

function normalizedGradeMonth(grade: YearEndGradeRecord): number | null {
  if (Number.isInteger(grade.monthNumber) && grade.monthNumber! >= 1 && grade.monthNumber! <= 12) {
    return grade.monthNumber!;
  }
  const key = String(grade.month || '').trim().toLowerCase();
  return monthAliases[key] || null;
}

function termMonthKeys(term: YearEndTermWindow): Set<string> {
  const keys = new Set<string>();
  const cursor = new Date(Date.UTC(term.startDate.getUTCFullYear(), term.startDate.getUTCMonth(), 1));
  const endKey = term.endDate.getUTCFullYear() * 100 + term.endDate.getUTCMonth() + 1;
  while (cursor.getUTCFullYear() * 100 + cursor.getUTCMonth() + 1 <= endKey) {
    const month = cursor.getUTCMonth() + 1;
    if (!term.excludedMonths.includes(month)) keys.add(`${cursor.getUTCFullYear()}-${month}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function gradeBelongsToTerm(grade: YearEndGradeRecord, term: YearEndTermWindow): boolean {
  const month = normalizedGradeMonth(grade);
  if (month === null || term.excludedMonths.includes(month)) return false;
  const keys = termMonthKeys(term);
  if (Number.isInteger(grade.year)) return keys.has(`${grade.year}-${month}`);
  // Older grade rows may not have a year. Class ownership already restricts
  // them to one academic year, so matching the configured term month is safe.
  return [...keys].some((key) => key.endsWith(`-${month}`));
}

function semesterPercentage(grades: YearEndGradeRecord[], term: YearEndTermWindow | undefined): number | null {
  if (!term) return null;
  const bySubject = new Map<string, { percentages: number[]; coefficient: number }>();
  for (const grade of grades) {
    if (!gradeBelongsToTerm(grade, term)) continue;
    const percentage = gradePercentage(grade);
    if (percentage === null) continue;
    const current = bySubject.get(grade.subjectId) || {
      percentages: [],
      coefficient: Number.isFinite(grade.subject.coefficient) && grade.subject.coefficient > 0
        ? grade.subject.coefficient
        : 1,
    };
    current.percentages.push(percentage);
    bySubject.set(grade.subjectId, current);
  }
  if (bySubject.size === 0) return null;
  let weightedTotal = 0;
  let totalCoefficient = 0;
  for (const subject of bySubject.values()) {
    const mean = averagePercent(subject.percentages);
    if (mean === null) continue;
    weightedTotal += mean * subject.coefficient;
    totalCoefficient += subject.coefficient;
  }
  if (totalCoefficient === 0) return null;
  return Math.round((weightedTotal / totalCoefficient) * 100) / 100;
}

export function calculateAnnualAcademicResult(
  grades: YearEndGradeRecord[],
  terms: YearEndTermWindow[],
  gradeLevel: number | null,
): AnnualAcademicResult {
  const applicable = terms.filter((term) =>
    gradeLevel === null || term.gradeLevels.length === 0 || term.gradeLevels.includes(gradeLevel),
  );
  const semester1Average = semesterPercentage(grades, applicable.find((term) => term.termNumber === 1));
  const semester2Average = semesterPercentage(grades, applicable.find((term) => term.termNumber === 2));
  const flags: string[] = [];
  if (semester1Average === null) flags.push('SEMESTER_1_RESULT_MISSING');
  if (semester2Average === null) flags.push('SEMESTER_2_RESULT_MISSING');
  const annualAverage = semester1Average !== null && semester2Average !== null
    ? Math.round(((semester1Average + semester2Average) / 2) * 100) / 100
    : null;
  return {
    semester1Average,
    semester2Average,
    annualAverage,
    isComplete: annualAverage !== null,
    flags,
  };
}

export interface RecommendationInput {
  academicAverage: number | null;
  academicEvidenceFlags?: string[];
  attendanceRate: number | null;
  absentCount: number;
  disciplineIncidentCount: number | null;
  hasTargetGrade: boolean;
  isTerminalGrade: boolean;
}

export function recommendYearEndOutcome(
  input: RecommendationInput,
  policy: PromotionPolicyValues,
): { outcome: YearEndOutcome; reasonCode: string; flags: string[] } {
  const flags: string[] = [];

  if (input.academicAverage === null) {
    flags.push(...(input.academicEvidenceFlags?.length ? input.academicEvidenceFlags : ['ANNUAL_RESULT_INCOMPLETE']));
  } else if (input.academicAverage < policy.passAverage) {
    flags.push('ACADEMIC_BELOW_THRESHOLD');
  }

  if (input.attendanceRate !== null && input.attendanceRate < policy.minAttendanceRate) {
    flags.push('ATTENDANCE_BELOW_THRESHOLD');
  }
  if (policy.maxUnexcusedAbsences !== null && input.absentCount > policy.maxUnexcusedAbsences) {
    flags.push('EXCESSIVE_UNEXCUSED_ABSENCE');
  }
  if (
    policy.maxDisciplineIncidents !== null &&
    input.disciplineIncidentCount !== null &&
    input.disciplineIncidentCount > policy.maxDisciplineIncidents
  ) {
    flags.push('DISCIPLINE_REVIEW_REQUIRED');
  }

  if (flags.length > 0) {
    return { outcome: 'PENDING', reasonCode: flags[0], flags };
  }
  if (input.isTerminalGrade) {
    return { outcome: 'GRADUATE', reasonCode: 'TERMINAL_GRADE_COMPLETED', flags };
  }
  if (!input.hasTargetGrade) {
    return { outcome: 'PENDING', reasonCode: 'TARGET_CLASS_REQUIRED', flags: [...flags, 'TARGET_CLASS_REQUIRED'] };
  }
  return { outcome: 'PROMOTE', reasonCode: 'MEETS_SCHOOL_POLICY', flags };
}

export function parseGradeNumber(grade: string): number | null {
  const match = String(grade).match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function duplicateIds(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }
  return [...duplicates];
}
