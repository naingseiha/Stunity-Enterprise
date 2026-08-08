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

export interface RecommendationInput {
  academicAverage: number | null;
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
    if (policy.requireCompleteGrades) flags.push('GRADES_INCOMPLETE');
    else flags.push('NO_RECORDED_GRADES');
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

  const blockingFlags = flags.filter((flag) => flag !== 'NO_RECORDED_GRADES');
  if (blockingFlags.length > 0) {
    return { outcome: 'PENDING', reasonCode: blockingFlags[0], flags };
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
