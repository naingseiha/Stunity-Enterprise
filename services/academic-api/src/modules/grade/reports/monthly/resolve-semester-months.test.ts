import assert from "node:assert/strict";
import test from "node:test";
import {
  monthsClosedByCalendarEvents,
  resolveSemesterMonthPlan,
} from "./resolve-semester-months";

test("semester-2 plan excludes April holiday and keeps months before exam", () => {
  const plan = resolveSemesterMonthPlan(2, {
    startDate: "2026-03-01",
    endDate: "2026-08-31",
    examMonth: 7,
    excludedMonths: [4],
  });

  assert.deepEqual(plan.preMonths, [3, 5, 6]);
  assert.equal(plan.examMonth, 7);
  assert.ok(!plan.preMonths.includes(4));
  assert.ok(!plan.preMonths.includes(7));
});

test("semester-2 for grades 7/8/10/11 uses May-June when term starts in May", () => {
  const plan = resolveSemesterMonthPlan(2, {
    startDate: "2026-05-01",
    endDate: "2026-08-31",
    examMonth: 7,
    excludedMonths: [],
  });

  assert.deepEqual(plan.preMonths, [5, 6]);
  assert.equal(plan.examMonth, 7);
});

test("semester-1 for grades 9/12 uses months before February exam", () => {
  const plan = resolveSemesterMonthPlan(1, {
    startDate: "2025-11-01",
    endDate: "2026-02-28",
    examMonth: 2,
    excludedMonths: [],
  });

  assert.deepEqual(plan.preMonths, [11, 12, 1]);
  assert.equal(plan.examMonth, 2);
});

test("fallback semester-2 months never include April", () => {
  const plan = resolveSemesterMonthPlan(2, null);
  assert.deepEqual(plan.preMonths, [3, 5, 6]);
  assert.equal(plan.examMonth, 7);
  assert.ok(!plan.preMonths.includes(4));
});

test("calendar VACATION in April auto-excludes April even when excludedMonths is empty", () => {
  const breakMonths = monthsClosedByCalendarEvents([
    {
      type: "VACATION",
      isSchoolDay: false,
      startDate: "2026-04-13",
      endDate: "2026-04-16",
    },
  ]);
  assert.deepEqual(breakMonths, [4]);

  const plan = resolveSemesterMonthPlan(
    2,
    {
      startDate: "2026-03-01",
      endDate: "2026-08-31",
      examMonth: 7,
      excludedMonths: [],
    },
    { calendarBreakMonths: breakMonths },
  );

  assert.deepEqual(plan.preMonths, [3, 5, 6]);
  assert.ok(!plan.preMonths.includes(4));
});
