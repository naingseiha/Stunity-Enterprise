import assert from "node:assert/strict";
import test from "node:test";
import {
  approveSchoolLinkRequest,
  cancelSchoolLinkRequest,
  rejectSchoolLinkRequest,
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

test("school-scoped admins cannot approve a request from another school", async () => {
  let userUpdateCalls = 0;
  const prisma = {
    $transaction: async (callback: any) => callback(prisma),
    schoolLinkRequest: {
      findUnique: async () => ({ id: "request-1", status: "PENDING", schoolId: "school-1" }),
    },
    user: { update: async () => { userUpdateCalls += 1; return {}; } },
  };

  await assert.rejects(
    () => approveSchoolLinkRequest(prisma as any, "request-1", {
      userId: "admin-2",
      role: "ADMIN",
      schoolId: "school-2",
    }),
    (error: any) => error.code === "SCHOOL_LINK_WRONG_SCHOOL" && error.statusCode === 403,
  );
  assert.equal(userUpdateCalls, 0);
});

test("unlink requires an explicit user confirmation before mutating state", async () => {
  let requestUpdateCalls = 0;
  let userUpdateCalls = 0;
  let claimUpdateCalls = 0;
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
      schoolAccessVersion: 2,
    },
    school: { id: "school-1", name: "School" },
    claimCode: { id: "claim-1", type: "STUDENT", verificationData: null },
  };
  const prisma = {
    $transaction: async (callback: any) => callback(prisma),
    schoolLinkRequest: {
      findUnique: async () => request,
      updateMany: async () => { requestUpdateCalls += 1; return { count: 1 }; },
    },
    user: { update: async () => { userUpdateCalls += 1; return {}; } },
    claimCode: { update: async () => { claimUpdateCalls += 1; return {}; } },
  };

  await assert.rejects(
    () => unlinkSchoolLinkRequest(prisma as any, "request-1", {
      userId: "admin-1",
      role: "ADMIN",
      schoolId: "school-1",
    }, {
      reason: "Wrong school selected",
      expectedUserId: "another-user",
      expectedStudentId: "student-1",
      reissueClaimCode: false,
    }),
    (error: any) => error.code === "UNLINK_CONFIRMATION_MISMATCH" && error.statusCode === 409,
  );
  assert.equal(requestUpdateCalls, 0);
  assert.equal(userUpdateCalls, 0);
  assert.equal(claimUpdateCalls, 0);
});

test("rejecting a school-link request requires a non-empty audit reason", async () => {
  let transactionCalls = 0;
  const prisma = {
    $transaction: async (callback: any) => {
      transactionCalls += 1;
      return callback(prisma);
    },
  };

  await assert.rejects(
    () => rejectSchoolLinkRequest(prisma as any, "request-1", {
      userId: "admin-1",
      role: "ADMIN",
      schoolId: "school-1",
    }, "  "),
    (error: any) => error.code === "SCHOOL_LINK_REASON_REQUIRED" && error.statusCode === 400,
  );
  assert.equal(transactionCalls, 0);
});

test("approval dual-writes an active membership when the rollout flag is enabled", async (t) => {
  const previousFlag = process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED;
  process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED = "true";
  t.after(() => {
    if (previousFlag === undefined) delete process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED;
    else process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED = previousFlag;
  });

  let membershipUpsert: any;
  const request = {
    id: "request-1",
    userId: "user-1",
    schoolId: "school-1",
    claimCodeId: "claim-1",
    studentId: "student-1",
    teacherId: null,
    requestedRole: "STUDENT",
    status: "PENDING",
    user: { id: "user-1", schoolId: null },
    school: { id: "school-1", name: "School" },
    claimCode: {
      id: "claim-1",
      schoolId: "school-1",
      studentId: "student-1",
      teacherId: null,
      isActive: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      claimedAt: null,
      claimedByUserId: null,
    },
  };
  const prisma = {
    $transaction: async (callback: any) => callback(prisma),
    schoolLinkRequest: {
      findUnique: async () => request,
      updateMany: async () => ({ count: 1 }),
    },
    student: { findFirst: async () => ({ id: "student-1", user: null }) },
    claimCode: { updateMany: async () => ({ count: 1 }) },
    schoolMembership: {
      upsert: async (args: any) => { membershipUpsert = args; return {}; },
    },
    user: { update: async () => ({}) },
    schoolLinkAuditEvent: { create: async () => ({}) },
  };

  await approveSchoolLinkRequest(prisma as any, "request-1", {
    userId: "admin-1",
    role: "ADMIN",
    schoolId: "school-1",
  });

  assert.deepEqual(membershipUpsert.where, {
    userId_schoolId: { userId: "user-1", schoolId: "school-1" },
  });
  assert.equal(membershipUpsert.create.status, "ACTIVE");
  assert.equal(membershipUpsert.create.linkRequestId, "request-1");
  assert.equal(membershipUpsert.update.unlinkedAt, null);
});

test("unlink refuses to drift legacy state when the active membership is missing", async (t) => {
  const previousFlag = process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED;
  process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED = "true";
  t.after(() => {
    if (previousFlag === undefined) delete process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED;
    else process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED = previousFlag;
  });

  let userUpdateCalls = 0;
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
      schoolAccessVersion: 1,
    },
    school: { id: "school-1", name: "School" },
    claimCode: { id: "claim-1", type: "STUDENT", verificationData: null },
  };
  const prisma = {
    $transaction: async (callback: any) => callback(prisma),
    schoolLinkRequest: {
      findUnique: async () => request,
      updateMany: async () => ({ count: 1 }),
    },
    schoolMembership: { updateMany: async () => ({ count: 0 }) },
    user: { update: async () => { userUpdateCalls += 1; return {}; } },
  };

  await assert.rejects(
    () => unlinkSchoolLinkRequest(prisma as any, "request-1", {
      userId: "admin-1",
      role: "ADMIN",
      schoolId: "school-1",
    }, {
      reason: "Wrong school selected",
      expectedUserId: "user-1",
      expectedStudentId: "student-1",
      reissueClaimCode: false,
    }),
    (error: any) => error.code === "SCHOOL_MEMBERSHIP_CONFLICT" && error.statusCode === 409,
  );
  assert.equal(userUpdateCalls, 0);
});
