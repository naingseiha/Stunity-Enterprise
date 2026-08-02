import assert from 'node:assert/strict';
import test from 'node:test';
import { assertTransferDateIsValid, enrollmentOverlapsPeriod } from './enrollment-period';

test('an enrollment ending on the transfer boundary does not overlap the next period', () => {
  const boundary = new Date('2026-01-15T00:00:00.000Z');
  assert.equal(
    enrollmentOverlapsPeriod(
      { startedAt: new Date('2025-11-01T00:00:00.000Z'), endedAt: boundary },
      boundary,
      new Date('2026-01-31T23:59:59.999Z')
    ),
    false
  );
});

test('a mid-month enrollment overlaps that reporting month', () => {
  assert.equal(
    enrollmentOverlapsPeriod(
      { startedAt: new Date('2026-01-15T00:00:00.000Z'), endedAt: null },
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-31T23:59:59.999Z')
    ),
    true
  );
});

test('transfer date must not predate the source enrollment', () => {
  assert.throws(
    () => assertTransferDateIsValid(
      new Date('2025-12-01T00:00:00.000Z'),
      {
        startDate: new Date('2025-11-01T00:00:00.000Z'),
        endDate: new Date('2026-08-31T23:59:59.999Z'),
      },
      { startedAt: new Date('2026-01-01T00:00:00.000Z') }
    ),
    /before the current enrollment start date/
  );
});

test('transfer date inside the year and after enrollment start is accepted', () => {
  assert.doesNotThrow(() => assertTransferDateIsValid(
    new Date('2026-02-10T00:00:00.000Z'),
    {
      startDate: new Date('2025-11-01T00:00:00.000Z'),
      endDate: new Date('2026-08-31T23:59:59.999Z'),
    },
    { startedAt: new Date('2025-11-01T00:00:00.000Z') }
  ));
});
