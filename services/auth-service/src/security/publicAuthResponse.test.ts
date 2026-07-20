import assert from "node:assert/strict";
import test from "node:test";
import { publicPendingLinkData } from "./publicAuthResponse";

test("public pending-link metadata excludes claim and roster secrets", () => {
  const result = publicPendingLinkData({
    code: "SECRET-CLAIM-CODE",
    schoolId: "school-1",
    schoolName: "Example School",
    type: "STUDENT",
    studentId: "student-1",
    teacherId: "teacher-1",
    verificationData: { dateOfBirth: "2010-01-01" },
    submittedAt: "2026-07-20T00:00:00.000Z",
  });
  assert.deepEqual(result, {
    schoolId: "school-1",
    schoolName: "Example School",
    type: "STUDENT",
    submittedAt: "2026-07-20T00:00:00.000Z",
  });
  assert.ok(!JSON.stringify(result).includes("SECRET-CLAIM-CODE"));
  assert.ok(!JSON.stringify(result).includes("2010-01-01"));
});

test("missing pending-link state remains null", () => {
  assert.equal(publicPendingLinkData(null), null);
  assert.equal(publicPendingLinkData("invalid"), null);
});
