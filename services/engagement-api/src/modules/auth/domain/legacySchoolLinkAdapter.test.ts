import assert from "node:assert/strict";
import test from "node:test";
import { requireNormalizedSchoolLinkRequestId } from "./legacySchoolLinkAdapter";

test("legacy adapter resolves only a normalized request", async () => {
  const db = {
    schoolLinkRequest: { findFirst: async () => ({ id: "request-1" }) },
    user: {
      findUnique: async () => {
        throw new Error("legacy lookup should not run");
      },
    },
  };
  assert.equal(
    await requireNormalizedSchoolLinkRequestId(db as any, "user-1", "PENDING"),
    "request-1",
  );
});

test("legacy JSON cannot bypass normalized school-link approval", async () => {
  const db = {
    schoolLinkRequest: { findFirst: async () => null },
    user: { findUnique: async () => ({ linkingStatus: "PENDING" }) },
  };
  await assert.rejects(
    () => requireNormalizedSchoolLinkRequestId(db as any, "user-1", "PENDING"),
    (error: any) =>
      error.code === "SCHOOL_LINK_NORMALIZATION_REQUIRED" &&
      error.statusCode === 409,
  );
});

test("legacy adapter reports not found without a matching state", async () => {
  const db = {
    schoolLinkRequest: { findFirst: async () => null },
    user: { findUnique: async () => ({ linkingStatus: "NONE" }) },
  };
  await assert.rejects(
    () => requireNormalizedSchoolLinkRequestId(db as any, "user-1", "PENDING"),
    (error: any) =>
      error.code === "SCHOOL_LINK_NOT_FOUND" && error.statusCode === 404,
  );
});
