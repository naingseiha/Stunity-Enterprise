import assert from "node:assert/strict";
import test from "node:test";
import { compareSchoolAuthorizationProjection } from "./schoolAuthorizationProjection";

const legacy = {
  schoolId: "school-1",
  studentId: "student-1",
  teacherId: null,
  role: "STUDENT",
};

const membership = {
  schoolId: "school-1",
  studentId: "student-1",
  teacherId: null,
  role: "STUDENT",
  status: "ACTIVE" as const,
};

test("matching active membership is safe to migrate", () => {
  assert.deepEqual(compareSchoolAuthorizationProjection(legacy, membership), {
    legacyAllowed: true,
    membershipAllowed: true,
    comparisonCode: "MATCH",
    migrationSafe: true,
  });
});

test("unlinked projections agree without granting school access", () => {
  const unlinkedLegacy = { schoolId: null, studentId: null, teacherId: null, role: "STUDENT" };
  assert.equal(compareSchoolAuthorizationProjection(unlinkedLegacy, null).comparisonCode, "MATCH_UNLINKED");
  assert.deepEqual(
    compareSchoolAuthorizationProjection(unlinkedLegacy, { ...membership, status: "UNLINKED" }),
    {
      legacyAllowed: false,
      membershipAllowed: false,
      comparisonCode: "MATCH_INACTIVE",
      migrationSafe: true,
    },
  );
});

test("dual-read reports bounded mismatch codes without choosing a broader permission", () => {
  const cases = [
    [legacy, null, "MISSING_MEMBERSHIP"],
    [{ ...legacy, schoolId: null }, membership, "MISSING_LEGACY_PROJECTION"],
    [legacy, { ...membership, status: "SUSPENDED" }, "STALE_LEGACY_LINK"],
    [legacy, { ...membership, schoolId: "school-2" }, "SCHOOL_MISMATCH"],
    [legacy, { ...membership, role: "TEACHER" }, "ROLE_MISMATCH"],
    [legacy, { ...membership, studentId: "student-2" }, "ROSTER_MISMATCH"],
  ] as const;

  for (const [legacyProjection, membershipProjection, code] of cases) {
    const result = compareSchoolAuthorizationProjection(legacyProjection, membershipProjection);
    assert.equal(result.comparisonCode, code);
    assert.equal(result.migrationSafe, false);
  }
});

