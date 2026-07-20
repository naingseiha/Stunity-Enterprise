import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelSchoolLinkRequest,
  submitSchoolLinkRequest,
  unlinkSchoolLinkRequest,
} from "./schoolLinkService";

test("submitting a claim creates only a pending request and grants no school authorization", async () => {
  let updateData: any;
  let requestData: any;
  let auditData: any;
  const prisma = {
    $transaction: async (callback: any) => callback(prisma),
    user: {
      findUnique: async (args: any) => {
        if (args.where.id === "user-1") {
          return {
            id: "user-1",
            schoolId: null,
            linkingStatus: "NONE",
            pendingLinkData: null,
          };
        }
        return null;
      },
      update: async (args: any) => {
        updateData = args.data;
        return { id: "user-1" };
      },
    },
    claimCode: {
      findUnique: async () => ({
        code: "STNT-ABCD-EFGH",
        type: "TEACHER",
        schoolId: "school-1",
        studentId: null,
        teacherId: "teacher-1",
        expiresAt: new Date(Date.now() + 60_000),
        claimedAt: null,
        claimedByUserId: null,
        revokedAt: null,
        isActive: true,
        verificationData: null,
        school: { id: "school-1", name: "Stunity School" },
        student: null,
        teacher: { id: "teacher-1" },
      }),
    },
    schoolLinkRequest: {
      findFirst: async () => null,
      create: async (args: any) => {
        requestData = args.data;
        return { id: "request-1", ...args.data };
      },
    },
    schoolLinkAuditEvent: {
      create: async (args: any) => {
        auditData = args.data;
        return { id: "audit-1", ...args.data };
      },
    },
  };

  const result = await submitSchoolLinkRequest(
    prisma as any,
    "user-1",
    "stnt-abcd-efgh",
  );

  assert.equal(result.linkingStatus, "PENDING");
  assert.equal(updateData.linkingStatus, "PENDING");
  assert.equal(updateData.pendingLinkData.type, "TEACHER");
  assert.equal(requestData.status, undefined);
  assert.equal(requestData.teacherId, "teacher-1");
  assert.equal(auditData.eventType, "SUBMITTED");
  assert.equal("schoolId" in updateData, false);
  assert.equal("role" in updateData, false);
  assert.equal("teacherId" in updateData, false);
  assert.equal("accountType" in updateData, false);
});

test("cancelling a pending request clears only the compatibility projection", async () => {
  let userUpdate: any;
  let requestUpdate: any;
  let event: any;
  const request = { id: "request-1", userId: "user-1", schoolId: "school-1", claimCodeId: "claim-1" };
  const prisma = {
    $transaction: async (callback: any) => callback(prisma),
    schoolLinkRequest: {
      findFirst: async () => request,
      updateMany: async (args: any) => { requestUpdate = args; return { count: 1 }; },
    },
    user: { update: async (args: any) => { userUpdate = args; return {}; } },
    schoolLinkAuditEvent: { create: async (args: any) => { event = args.data; return {}; } },
  };

  const result = await cancelSchoolLinkRequest(prisma as any, "user-1");
  assert.equal(result.linkingStatus, "NONE");
  assert.equal(requestUpdate.data.status, "CANCELLED");
  assert.equal(userUpdate.data.linkingStatus, "NONE");
  assert.equal(event.eventType, "CANCELLED");
});

test("unlink increments access version and preserves the roster pointers outside User", async () => {
  let userUpdate: any;
  let claimUpdate: any;
  const request = {
    id: "request-1",
    userId: "user-1",
    schoolId: "school-1",
    claimCodeId: "claim-1",
    studentId: "student-1",
    teacherId: null,
    status: "APPROVED",
    user: {
      id: "user-1",
      schoolId: "school-1",
      studentId: "student-1",
      teacherId: null,
      schoolAccessVersion: 4,
    },
    school: { id: "school-1", name: "School" },
    claimCode: { id: "claim-1", type: "STUDENT", verificationData: null },
  };
  const prisma = {
    $transaction: async (callback: any) => callback(prisma),
    schoolLinkRequest: { findUnique: async () => request, updateMany: async () => ({ count: 1 }) },
    user: { update: async (args: any) => { userUpdate = args; return {}; } },
    claimCode: { update: async (args: any) => { claimUpdate = args; return {}; }, create: async () => ({}) },
    schoolLinkAuditEvent: { create: async () => ({}) },
  };

  const result = await unlinkSchoolLinkRequest(prisma as any, "request-1", {
    userId: "admin-1",
    role: "ADMIN",
    schoolId: "school-1",
  }, {
    reason: "Wrong school selected",
    expectedUserId: "user-1",
    expectedStudentId: "student-1",
    reissueClaimCode: false,
  });

  assert.equal(result.replacementClaimCode, null);
  assert.equal(userUpdate.data.schoolId, null);
  assert.deepEqual(userUpdate.data.schoolAccessVersion, { increment: 1 });
  assert.equal(claimUpdate.data.isActive, false);
  assert.equal(claimUpdate.data.revokedBy, "admin-1");
});
