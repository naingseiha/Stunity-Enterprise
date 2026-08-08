import { getAttendanceSummaryDateRange } from '../lib/attendance/summary-range';

describe('attendance summary academic-year scope', () => {
  const historicalYear = {
    startDate: '2024-11-01T00:00:00.000Z',
    endDate: '2025-08-31T00:00:00.000Z',
  };

  test('anchors a historical month to the selected year instead of today', () => {
    expect(
      getAttendanceSummaryDateRange(
        'month',
        new Date('2026-08-09T00:00:00.000Z'),
        historicalYear,
      ),
    ).toEqual({ startDate: '2025-08-01', endDate: '2025-08-31' });
  });

  test('clamps a semester range to the selected academic year', () => {
    expect(
      getAttendanceSummaryDateRange(
        'semester',
        new Date('2026-08-09T00:00:00.000Z'),
        historicalYear,
      ),
    ).toEqual({ startDate: '2025-03-01', endDate: '2025-08-31' });
  });

  test('keeps an explicit month inside the selected year boundary', () => {
    expect(
      getAttendanceSummaryDateRange(
        '2024-11',
        new Date('2026-08-09T00:00:00.000Z'),
        historicalYear,
      ),
    ).toEqual({ startDate: '2024-11-01', endDate: '2024-11-30' });
  });
});
