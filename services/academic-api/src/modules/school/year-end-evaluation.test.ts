import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROMOTION_POLICY,
  averagePercent,
  calculateAnnualAcademicResult,
  canAcceptSystemRecommendation,
  duplicateIds,
  gradePercentage,
  isExcusedAbsenceStatus,
  normalizePromotionPolicy,
  recommendYearEndOutcome,
} from './year-end-evaluation';

test('detects duplicate enrollment owners without silently choosing a row', () => {
  assert.deepEqual(duplicateIds(['student-1', 'student-2', 'student-1', 'student-1']), ['student-1']);
  assert.deepEqual(duplicateIds(['student-1', 'student-2']), []);
});

test('counts every lawful absence status toward the annual absence threshold', () => {
  assert.equal(isExcusedAbsenceStatus('EXCUSED'), true);
  assert.equal(isExcusedAbsenceStatus('PERMISSION'), true);
  assert.equal(isExcusedAbsenceStatus('MEDICAL_LEAVE'), true);
  assert.equal(isExcusedAbsenceStatus('LATE'), false);
  assert.equal(isExcusedAbsenceStatus('PRESENT'), false);
});

test('calculates normalized grade percentages and averages', () => {
  assert.equal(gradePercentage({ score: 42, maxScore: 50 }), 84);
  assert.equal(gradePercentage({ score: 1, maxScore: 0 }), null);
  assert.equal(averagePercent([80, 90, null]), 85);
});

test('calculates an annual result only when both configured semesters exist', () => {
  const terms = [
    { termNumber: 1, startDate: new Date('2025-11-01T00:00:00.000Z'), endDate: new Date('2026-02-28T23:59:59.000Z'), examMonth: 2, excludedMonths: [], gradeLevels: [] },
    // The calendar ends in August, but July is the latest month with results.
    { termNumber: 2, startDate: new Date('2026-03-01T00:00:00.000Z'), endDate: new Date('2026-08-31T23:59:59.000Z'), examMonth: 8, excludedMonths: [], gradeLevels: [] },
  ];
  const subject = { coefficient: 1 };
  const grades = [
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 11, year: 2025, subject },
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 12, year: 2025, subject },
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 1, year: 2026, subject },
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 2, year: 2026, subject },
    { subjectId: 'math', score: 30, maxScore: 50, monthNumber: 3, year: 2026, subject },
    { subjectId: 'math', score: 30, maxScore: 50, monthNumber: 4, year: 2026, subject },
    { subjectId: 'math', score: 30, maxScore: 50, monthNumber: 5, year: 2026, subject },
    { subjectId: 'math', score: 30, maxScore: 50, monthNumber: 6, year: 2026, subject },
    { subjectId: 'math', score: 30, maxScore: 50, monthNumber: 7, year: 2026, subject },
  ];
  const result = calculateAnnualAcademicResult(grades, terms, 10);
  assert.equal(result.semester1Average, 80);
  assert.equal(result.semester2Average, 60);
  assert.equal(result.annualAverage, 70);
  assert.equal(result.isComplete, true);
  assert.deepEqual(result.flags, []);
});

test('matches the MoEYS semester report when a configured pre-exam month has no grades', () => {
  const terms = [
    { termNumber: 1, startDate: new Date('2025-11-01T00:00:00.000Z'), endDate: new Date('2026-02-28T23:59:59.000Z'), examMonth: 2, excludedMonths: [], gradeLevels: [11] },
    // April is a holiday (Khmer New Year) and must be excluded from Sem2 monthly avg.
    { termNumber: 2, startDate: new Date('2026-03-01T00:00:00.000Z'), endDate: new Date('2026-08-31T23:59:59.000Z'), examMonth: 7, excludedMonths: [4], gradeLevels: [11] },
  ];
  const subject = { coefficient: 1 };
  const grades = [
    { subjectId: 'math', score: 46.34, maxScore: 50, monthNumber: 11, year: 2025, subject },
    { subjectId: 'math', score: 46.34, maxScore: 50, monthNumber: 12, year: 2025, subject },
    { subjectId: 'math', score: 46.34, maxScore: 50, monthNumber: 1, year: 2026, subject },
    { subjectId: 'math', score: 45.41, maxScore: 50, monthNumber: 2, year: 2026, subject },
    { subjectId: 'math', score: 46.83, maxScore: 50, monthNumber: 3, year: 2026, subject },
    // April has no result and is excluded via excludedMonths — must not count as zero.
    { subjectId: 'math', score: 46.82, maxScore: 50, monthNumber: 5, year: 2026, subject },
    { subjectId: 'math', score: 46.83, maxScore: 50, monthNumber: 6, year: 2026, subject },
    { subjectId: 'math', score: 47.14, maxScore: 50, monthNumber: 7, year: 2026, subject },
  ];
  const result = calculateAnnualAcademicResult(grades, terms, 11);
  assert.equal(result.semester1Average, 91.75); // 45.88 / 50 in the printed report
  // Sem2 pre months = Mar/May/Jun (April excluded): ((93.66+93.64+93.66)/3 + 94.28) / 2
  assert.equal(result.semester2Average, 93.97);
  assert.equal(result.annualAverage, 92.86);
  assert.equal(recommendYearEndOutcome({
    academicAverage: result.annualAverage,
    attendanceRate: 100,
    absentCount: 0,
    totalAbsenceCount: 0,
    disciplineIncidentCount: 0,
    hasTargetGrade: true,
    isTerminalGrade: false,
  }, DEFAULT_PROMOTION_POLICY).outcome, 'PROMOTE');
});

test('does not count April in semester-2 monthly average when excludedMonths includes 4', () => {
  const terms = [
    {
      termNumber: 2,
      startDate: new Date('2026-03-01T00:00:00.000Z'),
      endDate: new Date('2026-08-31T23:59:59.000Z'),
      examMonth: 7,
      excludedMonths: [4],
      gradeLevels: [7, 8, 10, 11],
    },
  ];
  const subject = { coefficient: 1 };
  const grades = [
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 3, year: 2026, subject },
    { subjectId: 'math', score: 10, maxScore: 50, monthNumber: 4, year: 2026, subject }, // holiday noise
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 5, year: 2026, subject },
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 6, year: 2026, subject },
    { subjectId: 'math', score: 50, maxScore: 50, monthNumber: 7, year: 2026, subject },
  ];
  const result = calculateAnnualAcademicResult(grades, terms as any, 10);
  // pre = (80+80+80)/3 = 80; exam = 100; semester = 90
  assert.equal(result.semester2Average, 90);
  assert.equal(result.semester1Average, null);
});

test('does not invent an annual result when a semester is missing', () => {
  const result = calculateAnnualAcademicResult(
    [
      { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 11, year: 2025, subject: { coefficient: 1 } },
      { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 2, year: 2026, subject: { coefficient: 1 } },
    ],
    [
      { termNumber: 1, startDate: new Date('2025-11-01T00:00:00.000Z'), endDate: new Date('2026-02-28T23:59:59.000Z'), examMonth: 2, excludedMonths: [], gradeLevels: [] },
      { termNumber: 2, startDate: new Date('2026-03-01T00:00:00.000Z'), endDate: new Date('2026-08-31T23:59:59.000Z'), examMonth: 7, excludedMonths: [], gradeLevels: [] },
    ],
    10,
  );
  assert.equal(result.annualAverage, null);
  assert.equal(result.isComplete, false);
  assert.deepEqual(result.flags, ['SEMESTER_2_RESULT_MISSING']);
});

test('accepts only clear pending system recommendations', () => {
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'PROMOTE', targetGrade: '11' }), true);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'GRADUATE', targetGrade: null }), true);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'PROMOTE', targetGrade: null }), false);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'PENDING', targetGrade: '11' }), false);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PROMOTE', recommendedOutcome: 'PROMOTE', targetGrade: '11' }), false);
});

test('recommends promotion only when policy requirements pass', () => {
  const result = recommendYearEndOutcome({
    academicAverage: 70,
    attendanceRate: 90,
    absentCount: 2,
    totalAbsenceCount: 2,
    disciplineIncidentCount: 0,
    hasTargetGrade: true,
    isTerminalGrade: false,
  }, DEFAULT_PROMOTION_POLICY);
  assert.equal(result.outcome, 'PROMOTE');
  assert.equal(result.reasonCode, 'MEETS_SCHOOL_POLICY');
});

test('routes academic and attendance exceptions to human review', () => {
  const result = recommendYearEndOutcome({
    academicAverage: 45,
    attendanceRate: 70,
    absentCount: 25,
    totalAbsenceCount: 46,
    disciplineIncidentCount: null,
    hasTargetGrade: true,
    isTerminalGrade: false,
  }, normalizePromotionPolicy({ maxUnexcusedAbsences: 20 }));
  assert.equal(result.outcome, 'PENDING');
  assert.deepEqual(result.flags, [
    'ACADEMIC_BELOW_THRESHOLD',
    'EXCESSIVE_TOTAL_ABSENCE',
    'EXCESSIVE_UNEXCUSED_ABSENCE',
  ]);
});

test('uses excused plus unexcused absences and treats 45 as the review threshold', () => {
  const common = {
    academicAverage: 70,
    attendanceRate: 80,
    absentCount: 20,
    disciplineIncidentCount: 0,
    hasTargetGrade: true,
    isTerminalGrade: false,
  };
  assert.equal(recommendYearEndOutcome({ ...common, totalAbsenceCount: 44 }, DEFAULT_PROMOTION_POLICY).outcome, 'PROMOTE');
  const threshold = recommendYearEndOutcome({ ...common, totalAbsenceCount: 45 }, DEFAULT_PROMOTION_POLICY);
  assert.equal(threshold.outcome, 'PENDING');
  assert.deepEqual(threshold.flags, ['EXCESSIVE_TOTAL_ABSENCE']);
});

test('routes an incomplete annual result to later human evaluation', () => {
  const result = recommendYearEndOutcome({
    academicAverage: null,
    academicEvidenceFlags: ['SEMESTER_2_RESULT_MISSING'],
    attendanceRate: 95,
    absentCount: 1,
    totalAbsenceCount: 1,
    disciplineIncidentCount: 0,
    hasTargetGrade: true,
    isTerminalGrade: false,
  }, DEFAULT_PROMOTION_POLICY);
  assert.equal(result.outcome, 'PENDING');
  assert.equal(result.reasonCode, 'SEMESTER_2_RESULT_MISSING');
});

test('recommends graduation for terminal grade only after requirements pass', () => {
  const result = recommendYearEndOutcome({
    academicAverage: 80,
    attendanceRate: 95,
    absentCount: 1,
    totalAbsenceCount: 1,
    disciplineIncidentCount: null,
    hasTargetGrade: false,
    isTerminalGrade: true,
  }, DEFAULT_PROMOTION_POLICY);
  assert.equal(result.outcome, 'GRADUATE');
});
