import {
  getMonthlyReportMonthsForGrades,
  resolveReportTermPlan,
} from './dynamic-months';

const terms = [
  {
    id: 'regular-s2',
    name: 'Semester 2',
    termNumber: 2,
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    examMonth: 7,
    excludedMonths: [4],
    gradeLevels: [7, 8, 10, 11],
  },
  {
    id: 'exam-s2',
    name: 'Semester 2 exam grades',
    termNumber: 2,
    startDate: '2026-03-01',
    endDate: '2026-07-31',
    examMonth: 6,
    excludedMonths: [4],
    gradeLevels: [9, 12],
  },
] as any;

describe('dynamic report term plans', () => {
  test('stops monthly averaging at the configured exam month', () => {
    const plan = resolveReportTermPlan(terms, 12, 2);
    expect(plan.examMonth).toBe(6);
    expect(plan.countedMonths.map((month) => month.number)).toEqual([3, 5]);
    expect(plan.countedMonths.map((month) => month.number)).not.toContain(7);
  });

  test('keeps the regular grade group on its own exam month', () => {
    const plan = resolveReportTermPlan(terms, 10, 2);
    expect(plan.examMonth).toBe(7);
    expect(plan.countedMonths.map((month) => month.number)).toEqual([3, 5, 6]);
  });

  test('does not invent a shared monthly month for incompatible groups', () => {
    const shared = getMonthlyReportMonthsForGrades(terms, [10, 12]);
    expect(shared.map((month) => month.number)).toEqual([3, 5]);
  });

  test('does not reuse another semester when the requested term is missing', () => {
    const plan = resolveReportTermPlan(terms, 10, 1);
    expect(plan.termNumber).toBe(1);
    expect(plan.countedMonths).toEqual([]);
    expect(plan.examMonth).toBeNull();
  });
});
