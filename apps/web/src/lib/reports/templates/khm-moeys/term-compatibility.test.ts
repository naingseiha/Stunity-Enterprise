import {
  buildTermCompatibilityGroups,
  getGradeTermCompatibilityKey,
} from './term-compatibility';

const terms = [
  {
    termNumber: 1,
    startDate: '2025-11-01',
    endDate: '2026-02-28',
    examMonth: 2,
    excludedMonths: [],
    gradeLevels: [7, 8, 10, 11],
  },
  {
    termNumber: 2,
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    examMonth: 7,
    excludedMonths: [4],
    gradeLevels: [7, 8, 10, 11],
  },
  {
    termNumber: 1,
    startDate: '2025-11-01',
    endDate: '2026-02-28',
    examMonth: 2,
    excludedMonths: [],
    gradeLevels: [9, 12],
  },
  {
    termNumber: 2,
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    examMonth: 6,
    excludedMonths: [4],
    gradeLevels: [9, 12],
  },
] as any;

describe('term compatibility groups', () => {
  test('groups grades with identical full-year settings', () => {
    const groups = buildTermCompatibilityGroups(terms, [7, 8, 9, 10, 11, 12]);
    expect(groups.map((group) => group.grades)).toEqual([
      ['7', '8', '10', '11'],
      ['9', '12'],
    ]);
  });

  test('prevents exam grades from mixing with the regular group', () => {
    expect(getGradeTermCompatibilityKey(terms, 7)).not.toBe(
      getGradeTermCompatibilityKey(terms, 9),
    );
  });

  test('fails closed by grade when terms are not configured', () => {
    const groups = buildTermCompatibilityGroups([], [7, 8]);
    expect(groups.map((group) => group.grades)).toEqual([['7'], ['8']]);
    expect(groups.every((group) => !group.configured)).toBe(true);
  });
});
