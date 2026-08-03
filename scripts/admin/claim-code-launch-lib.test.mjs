import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  APPLY_CONFIRMATION,
  classifyLaunchReadiness,
  csvEscape,
  parseLaunchArgs,
  plannedCredentialCount,
  validateApplyAuthorization,
} from "./claim-code-launch-lib.mjs";

test("launch workflow defaults to a read-only 30-day plan", () => {
  const options = parseLaunchArgs([], { SCHOOL_ID: "school-1" });
  assert.equal(options.apply, false);
  assert.equal(options.expiresInDays, 30);
  assert.equal(validateApplyAuthorization(options, {}, path).length, 0);
});

test("apply requires environment, confirmation, and absolute output gates", () => {
  const options = parseLaunchArgs(["--apply", "--output=relative.csv"], { SCHOOL_ID: "school-1" });
  assert.equal(validateApplyAuthorization(options, {}, path).length, 3);
  options.confirmation = APPLY_CONFIRMATION;
  options.output = "/tmp/launch.csv";
  assert.deepEqual(validateApplyAuthorization(options, { ALLOW_CLAIM_CODE_LAUNCH: "1" }, path), []);
});

test("pending links warn while duplicate active codes block launch", () => {
  const readiness = classifyLaunchReadiness({
    currentYearStudentCount: 1726,
    protectedPendingStudentCount: 9,
    duplicateActiveCodeStudentCount: 1,
    blockers: [],
    warnings: [],
  });
  assert.equal(readiness.ok, false);
  assert.match(readiness.blockers[0], /multiple active unclaimed/);
  assert.match(readiness.warnings[0], /9 student/);
});

test("planned credentials include expired rotations and missing creations", () => {
  assert.equal(plannedCredentialCount({ expiredCodeStudentCount: 42, missingCodeStudentCount: 1675 }), 1717);
});

test("CSV escaping protects commas, quotes, and newlines", () => {
  assert.equal(csvEscape('សិស្ស, "ក"'), '"សិស្ស, ""ក"""');
  assert.equal(csvEscape("plain"), "plain");
});
