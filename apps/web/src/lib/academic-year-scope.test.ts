import { getAcademicYearMode } from './academic-year-scope';
import type { AcademicYear } from './api/academic-years';

const baseYear: AcademicYear = {
  id: 'year',
  schoolId: 'school',
  name: '2025-2026',
  startDate: '2025-11-01T00:00:00.000Z',
  endDate: '2026-08-31T00:00:00.000Z',
  isCurrent: true,
  status: 'ACTIVE',
  copiedFromYearId: null,
  promotionDate: null,
  isPromotionDone: false,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('academic-year mode', () => {
  it('keeps the active current year operational', () => {
    expect(getAcademicYearMode(baseYear, new Date('2026-08-09T00:00:00.000Z'))).toBe('operational');
  });

  it('keeps a future planning year available for structural setup', () => {
    expect(getAcademicYearMode({
      ...baseYear,
      name: '2026-2027',
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2027-08-31T00:00:00.000Z',
      isCurrent: false,
      status: 'PLANNING',
    }, new Date('2026-08-09T00:00:00.000Z'))).toBe('planning');
  });

  it('treats a past-dated planning year as historical and read-only', () => {
    expect(getAcademicYearMode({
      ...baseYear,
      name: '2024-2025',
      startDate: '2024-09-01T00:00:00.000Z',
      endDate: '2025-08-31T00:00:00.000Z',
      isCurrent: false,
      status: 'PLANNING',
    }, new Date('2026-08-09T00:00:00.000Z'))).toBe('historical');
  });
});
