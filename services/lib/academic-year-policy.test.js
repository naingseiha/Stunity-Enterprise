const test = require('node:test');
const assert = require('node:assert/strict');
const { getAcademicYearWriteBlock } = require('./academic-year-policy');

const activeYear = {
  id: 'year-active',
  name: '2025-2026',
  status: 'ACTIVE',
  isCurrent: true,
  startDate: new Date('2025-11-01T00:00:00.000Z'),
  endDate: new Date('2026-08-31T00:00:00.000Z'),
};

test('allows an operational record inside the current academic year', () => {
  assert.equal(
    getAcademicYearWriteBlock(activeYear, new Date('2026-02-10T00:00:00.000Z')),
    null,
  );
});

test('blocks historical and planning academic-year mutations', () => {
  assert.equal(
    getAcademicYearWriteBlock({ ...activeYear, status: 'ENDED', isCurrent: false }).code,
    'ACADEMIC_YEAR_READ_ONLY',
  );
  assert.equal(
    getAcademicYearWriteBlock({ ...activeYear, status: 'PLANNING', isCurrent: false }).code,
    'ACADEMIC_YEAR_READ_ONLY',
  );
});

test('blocks dates that do not belong to the active academic year', () => {
  assert.equal(
    getAcademicYearWriteBlock(activeYear, new Date('2025-10-31T00:00:00.000Z')).code,
    'ACADEMIC_YEAR_DATE_OUT_OF_RANGE',
  );
});
