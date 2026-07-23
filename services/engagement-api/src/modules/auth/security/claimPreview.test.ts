import assert from "node:assert/strict";
import test from "node:test";
import { buildMaskedClaimPreview } from "./claimPreview";

test("claim preview returns only masked roster confirmation fields", () => {
  const preview = buildMaskedClaimPreview({
    type: "STUDENT",
    expiresAt: new Date("2026-08-01T00:00:00.000Z"),
    verificationData: { dateOfBirth: "2010-01-01" },
    school: { id: "school-1", name: "Stunity School" },
    student: {
      firstName: "Sokha",
      lastName: "Chan",
      studentClasses: [{ class: { name: "7A", grade: "7" } }],
    },
  });

  assert.equal(preview.student?.maskedName, "S•••• C•••");
  assert.equal(preview.student?.className, "7A");
  assert.deepEqual(preview.school, { name: "Stunity School" });
  assert.equal("firstName" in (preview.student || {}), false);
  assert.equal("dateOfBirth" in preview, false);
  assert.equal("gender" in preview, false);
  assert.equal("code" in preview, false);
});
