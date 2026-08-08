import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROMOTION_POLICY,
  averagePercent,
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
