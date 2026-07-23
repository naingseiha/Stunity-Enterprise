import {
  resolveGradeScale,
  gradeLevelForScale,
  isPassingForScale,
  buildStudentAverageMap,
} from './grade-systems';

/**
 * Scores in this system are stored on a 0–(coefficient × 50) scale, so the
 * coefficient is already baked into `score`. These tests pin the MoEYS rule
 * (Σscore/Σcoeff, capped at 50) against the legacy GENERIC weighted mean and
 * guard against the "double-applied coefficient" regression.
 */
const g = (studentId: string, subjectId: string, score: number, coefficient: number) => ({
  studentId,
  subjectId,
  score,
  subject: { coefficient },
});

describe('resolveGradeScale', () => {
  it('maps KHM_MOEYS to the 0–50 scale (passing 25)', () => {
    expect(resolveGradeScale('KHM_MOEYS')).toEqual({
      system: 'KHM_MOEYS',
      maxAverage: 50,
      passingMark: 25,
    });
  });

  it('normalises casing/hyphens', () => {
    expect(resolveGradeScale('khm-moeys').system).toBe('KHM_MOEYS');
  });

  it('falls back to GENERIC 0–100 for unknown/empty models', () => {
    expect(resolveGradeScale(null)).toEqual({ system: 'GENERIC', maxAverage: 100, passingMark: 50 });
    expect(resolveGradeScale('EU_STANDARD').system).toBe('GENERIC');
  });
});

describe('buildStudentAverageMap — KHM_MOEYS', () => {
  const scale = resolveGradeScale('KHM_MOEYS');

  it('computes Σscore/Σcoeff and never exceeds 50 at full marks', () => {
    // Full marks: each subject score = coefficient × 50.
    const grades = [
      g('s1', 'math', 100, 2), // out of 100
      g('s1', 'khmer', 75, 1.5), // out of 75
      g('s1', 'ict', 50, 1), // out of 50
    ];
    // Σscore = 225, Σcoeff = 4.5 → 50.00 (the cap)
    expect(buildStudentAverageMap(grades, scale).get('s1')).toBeCloseTo(50, 5);
  });

  it('does NOT double-apply the coefficient (regression guard)', () => {
    const grades = [
      g('s1', 'math', 50, 2), // 50/100
      g('s1', 'ict', 25, 1), // 25/50
    ];
    // Correct MoEYS: (50 + 25) / (2 + 1) = 25
    // Buggy weighted: (50*2 + 25*1) / 3 = 41.67  ← must NOT happen
    expect(buildStudentAverageMap(grades, scale).get('s1')).toBeCloseTo(25, 5);
  });

  it('means multiple entries for the same subject before combining', () => {
    const grades = [
      g('s1', 'math', 40, 2),
      g('s1', 'math', 60, 2), // mean 50
      g('s1', 'ict', 25, 1),
    ];
    // (mean(50) + 25) / (2 + 1) = 25
    expect(buildStudentAverageMap(grades, scale).get('s1')).toBeCloseTo(25, 5);
  });
});

describe('buildStudentAverageMap — GENERIC keeps the weighted mean', () => {
  const scale = resolveGradeScale(null);

  it('computes Σ(score×coeff)/Σcoeff on a 0–100 score scale', () => {
    const grades = [
      g('s1', 'math', 80, 2),
      g('s1', 'eng', 50, 1),
    ];
    // (80*2 + 50*1) / 3 = 70
    expect(buildStudentAverageMap(grades, scale).get('s1')).toBeCloseTo(70, 5);
  });
});

describe('gradeLevelForScale / isPassingForScale', () => {
  it('uses MoEYS letters and passing 25 on the 0–50 scale', () => {
    const scale = resolveGradeScale('KHM_MOEYS');
    expect(gradeLevelForScale(scale, 45)).toBe('A');
    expect(gradeLevelForScale(scale, 24)).toBe('F');
    expect(isPassingForScale(scale, 25)).toBe(true);
    expect(isPassingForScale(scale, 24.99)).toBe(false);
  });

  it('uses 0–100 letters and passing 50 for GENERIC', () => {
    const scale = resolveGradeScale(null);
    expect(gradeLevelForScale(scale, 90)).toBe('A');
    expect(gradeLevelForScale(scale, 49)).toBe('F');
    expect(isPassingForScale(scale, 50)).toBe(true);
  });
});
