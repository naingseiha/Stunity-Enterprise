import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLY_CONFIRMATION,
  buildDeterministicBackfillId,
  classifyRolloutReadiness,
  parseRolloutArgs,
  validateApplyAuthorization,
  validateRolloutScope,
} from "./student-lifecycle-rollout-lib.mjs";

test("dry-run scope can come from environment", () => {
  const options = parseRolloutArgs([], { SCHOOL_ID: "school-1", ACADEMIC_YEAR_ID: "year-1" });

  assert.equal(options.apply, false);
  assert.equal(options.schoolId, "school-1");
  assert.equal(options.academicYearId, "year-1");
  assert.deepEqual(validateRolloutScope(options), []);
  assert.deepEqual(validateApplyAuthorization(options, {}), []);
});

test("apply mode requires a targeted confirmation and environment gate", () => {
  const options = parseRolloutArgs(["--apply", "--school-id=school-1"], {});

  assert.deepEqual(validateApplyAuthorization(options, {}), [
    `--confirm=${APPLY_CONFIRMATION} is required with --apply`,
    "ALLOW_STUDENT_LIFECYCLE_BACKFILL=1 is required with --apply",
  ]);

  options.confirmation = APPLY_CONFIRMATION;
  assert.deepEqual(validateApplyAuthorization(options, { ALLOW_STUDENT_LIFECYCLE_BACKFILL: "1" }), []);
});

test("conflicts block rollout while duplicate effective rows are warnings", () => {
  const readiness = classifyRolloutReadiness({
    blockers: [],
    warnings: [],
    conflictingEnrollmentCount: 2,
    unrecognizedEnrollmentStatusCount: 1,
    duplicateEffectiveEnrollmentCount: 3,
    flaggedActiveUnclaimedClaimCodeCount: 51,
    usableUnclaimedClaimCodeCount: 0,
  });

  assert.equal(readiness.ok, false);
  assert.equal(readiness.blockers.length, 2);
  assert.equal(readiness.warnings.length, 2);
  assert.match(readiness.warnings[1], /51 claim code/);
});

test("backfill identity is stable for the same enrollment", () => {
  assert.equal(
    buildDeterministicBackfillId("student-1", "class-1", "year-1"),
    "student_class_backfill:student-1:class-1:year-1",
  );
});

test("active SIS records outside the selected year are visible but do not block rollout", () => {
  const readiness = classifyRolloutReadiness({
    blockers: [],
    warnings: [],
    outsideAcademicYearCount: 1,
  });

  assert.equal(readiness.ok, true);
  assert.deepEqual(readiness.blockers, []);
  assert.match(readiness.warnings[0], /1 active SIS record/);
});
