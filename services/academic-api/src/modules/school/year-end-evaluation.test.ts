import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROMOTION_POLICY,
  averagePercent,
  calculateAnnualAcademicResult,
  canAcceptSystemRecommendation,
  duplicateIds,
  gradePercentage,
  normalizePromotionPolicy,
  recommendYearEndOutcome,
} from './year-end-evaluation';

test('detects duplicate enrollment owners without silently choosing a row', () => {
  assert.deepEqual(duplicateIds(['student-1', 'student-2', 'student-1', 'student-1']), ['student-1']);
  assert.deepEqual(duplicateIds(['student-1', 'student-2']), []);
});

test('calculates normalized grade percentages and averages', () => {
  assert.equal(gradePercentage({ score: 42, maxScore: 50 }), 84);
  assert.equal(gradePercentage({ score: 1, maxScore: 0 }), null);
  assert.equal(averagePercent([80, 90, null]), 85);
});

test('calculates an annual result only when both configured semesters exist', () => {
  const terms = [
    { termNumber: 1, startDate: new Date('2025-11-01T00:00:00.000Z'), endDate: new Date('2026-02-28T23:59:59.000Z'), excludedMonths: [], gradeLevels: [] },
    { termNumber: 2, startDate: new Date('2026-03-01T00:00:00.000Z'), endDate: new Date('2026-08-31T23:59:59.000Z'), excludedMonths: [], gradeLevels: [] },
  ];
  const subject = { coefficient: 1 };
  const grades = [
    { subjectId: 'math', score: 40, maxScore: 50, monthNumber: 2, year: 2026, subject },
    { subjectId: 'math', score: 30, maxScore: 50, monthNumber: 8, year: 2026, subject },
  ];
  const result = calculateAnnualAcademicResult(grades, terms, 10);
  assert.equal(result.semester1Average, 80);
  assert.equal(result.semester2Average, 60);
  assert.equal(result.annualAverage, 70);
  assert.equal(result.isComplete, true);
  assert.deepEqual(result.flags, []);
});

test('does not invent an annual result when a semester is missing', () => {
  const result = calculateAnnualAcademicResult(
    [{ subjectId: 'math', score: 40, maxScore: 50, monthNumber: 2, year: 2026, subject: { coefficient: 1 } }],
    [
      { termNumber: 1, startDate: new Date('2025-11-01T00:00:00.000Z'), endDate: new Date('2026-02-28T23:59:59.000Z'), excludedMonths: [], gradeLevels: [] },
      { termNumber: 2, startDate: new Date('2026-03-01T00:00:00.000Z'), endDate: new Date('2026-08-31T23:59:59.000Z'), excludedMonths: [], gradeLevels: [] },
    ],
    10,
  );
  assert.equal(result.annualAverage, null);
  assert.equal(result.isComplete, false);
  assert.deepEqual(result.flags, ['SEMESTER_2_RESULT_MISSING']);
});

test('accepts only clear pending system recommendations', () => {
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'PROMOTE', targetClassId: 'next-class' }), true);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'GRADUATE', targetClassId: null }), true);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'PROMOTE', targetClassId: null }), false);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PENDING', recommendedOutcome: 'PENDING', targetClassId: 'next-class' }), false);
  assert.equal(canAcceptSystemRecommendation({ finalOutcome: 'PROMOTE', recommendedOutcome: 'PROMOTE', targetClassId: 'next-class' }), false);
});

test('recommends promotion only when policy requirements pass', () => {
  const result = recommendYearEndOutcome({
    academicAverage: 70,
    attendanceRate: 90,
    absentCount: 2,
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
    disciplineIncidentCount: null,
    hasTargetGrade: true,
    isTerminalGrade: false,
  }, normalizePromotionPolicy({ maxUnexcusedAbsences: 20 }));
  assert.equal(result.outcome, 'PENDING');
  assert.deepEqual(result.flags, [
    'ACADEMIC_BELOW_THRESHOLD',
    'ATTENDANCE_BELOW_THRESHOLD',
    'EXCESSIVE_UNEXCUSED_ABSENCE',
  ]);
});

test('routes an incomplete annual result to later human evaluation', () => {
  const result = recommendYearEndOutcome({
    academicAverage: null,
    academicEvidenceFlags: ['SEMESTER_2_RESULT_MISSING'],
    attendanceRate: 95,
    absentCount: 1,
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
    disciplineIncidentCount: null,
    hasTargetGrade: false,
    isTerminalGrade: true,
  }, DEFAULT_PROMOTION_POLICY);
  assert.equal(result.outcome, 'GRADUATE');
});
