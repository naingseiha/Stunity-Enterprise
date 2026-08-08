import { buildCambodiaAcademicTerms } from './academic-year-terms';

describe('Cambodia academic term preset', () => {
  test('keeps April inside semester 2 but marks it as vacation for both grade groups', () => {
    const terms = buildCambodiaAcademicTerms('2025-11-01', '2026-08-31');
    const semesterTwoTerms = terms.filter((term) => term.termNumber === 2);

    expect(semesterTwoTerms).toHaveLength(2);
    expect(semesterTwoTerms.every((term) => term.startDate === '2026-03-01')).toBe(true);
    expect(semesterTwoTerms.every((term) => term.excludedMonths.includes(4))).toBe(true);
  });

  test('uses separate semester-2 exam months for regular and exam grades', () => {
    const terms = buildCambodiaAcademicTerms('2025-11-01', '2026-08-31');
    const regular = terms.find(
      (term) => term.termNumber === 2 && term.gradeLevels.includes(7),
    );
    const examGrades = terms.find(
      (term) => term.termNumber === 2 && term.gradeLevels.includes(9),
    );

    expect(regular?.examMonth).toBe(7);
    expect(examGrades?.examMonth).toBe(6);
  });
});
