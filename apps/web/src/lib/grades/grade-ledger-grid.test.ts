import {
  parseScoreValue,
  parseTabularClipboard,
  resolveAcademicCalendarYear,
} from './grade-ledger-grid';

describe('grade ledger grid helpers', () => {
  test('resolves a cross-year academic month to its calendar year', () => {
    expect(resolveAcademicCalendarYear('2025-11-01', '2026-08-31', 12)).toBe(2025);
    expect(resolveAcademicCalendarYear('2025-11-01', '2026-08-31', 1)).toBe(2026);
    expect(resolveAcademicCalendarYear('2025-11-01', '2026-08-31', 7)).toBe(2026);
  });

  test('validates blank, valid, and out-of-range scores', () => {
    expect(parseScoreValue('', 50)).toEqual({ score: null, error: null });
    expect(parseScoreValue('42.5', 50)).toEqual({ score: 42.5, error: null });
    expect(parseScoreValue('51', 50).error).toContain('0–50');
    expect(parseScoreValue('abc', 50).error).toBeTruthy();
  });

  test('parses spreadsheet clipboard rows and columns', () => {
    expect(parseTabularClipboard('10\t20\n30\t40')).toEqual([
      ['10', '20'],
      ['30', '40'],
    ]);
  });
});
