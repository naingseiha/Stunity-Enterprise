import {
  Prisma,
  type ClaimCodeType,
  type PrismaClient,
  type SchoolLinkRequestStatus,
  type UserRole,
} from "@prisma/client";
import ClaimCodeGenerator from "../utils/claimCodeGenerator";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class SchoolLinkError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = "SCHOOL_LINK_INVALID",
  ) {
    super(message);
  }
}

const requestInclude = {
  school: { select: { id: true, name: true, schoolType: true } },
  claimCode: { select: { id: true, code: true, type: true, isActive: true, expiresAt: true } },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePictureUrl: true,
      linkingStatus: true,
      pendingLinkData: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.SchoolLinkRequestInclude;

function requestedRoleForClaim(type: ClaimCodeType): UserRole {
  if (type === "STUDENT") return "STUDENT";
  if (type === "TEACHER") return "TEACHER";
  if (type === "STAFF") return "STAFF";
  return "PARENT";
}

function membershipWritesEnabled(): boolean {
  return process.env.AUTH_SCHOOL_MEMBERSHIP_WRITE_ENABLED === "true";
}

function normalizeReason(rawReason: unknown, fieldName: string): string {
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (reason.length < 3) {
    throw new SchoolLinkError(`${fieldName} must be at least 3 characters`, 400, "SCHOOL_LINK_REASON_REQUIRED");
  }
  if (reason.length > 500) {
    throw new SchoolLinkError(`${fieldName} must be 500 characters or fewer`, 400, "SCHOOL_LINK_REASON_TOO_LONG");
  }
  return reason;
}

async function audit(
  db: DbClient,
  input: {
    requestId?: string;
    userId: string;
    schoolId: string;
    claimCodeId?: string;
    actorUserId?: string;
    eventType: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "UNLINKED" | "REISSUED";
    reason?: string;
    beforeState?: Prisma.InputJsonValue;
    afterState?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
  },
) {
  await db.schoolLinkAuditEvent.create({ data: input });
}

function mapTransactionError(error: unknown): never {
  if (error instanceof SchoolLinkError) throw error;
  const code = (error as { code?: string })?.code;
  if (code === "P2002" || code === "P2034") {
    throw new SchoolLinkError(
      "The school-link request changed while it was being processed. Refresh and try again.",
      409,
      "SCHOOL_LINK_CONFLICT",
    );
  }
  throw error;
}

export async function submitSchoolLinkRequest(
  prisma: PrismaClient,
  userId: string,
  rawCode: string,
  verificationData?: Record<string, unknown>,
  context?: { ipAddress?: string },
) {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new SchoolLinkError("Claim code is required");

  try {
    return await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({ where: { id: userId } });
      if (!currentUser) throw new SchoolLinkError("User not found", 404, "USER_NOT_FOUND");
      if (currentUser.schoolId) {
        throw new SchoolLinkError("Your account is already linked to a school.", 409, "SCHOOL_ALREADY_LINKED");
      }

      const currentPending = await tx.schoolLinkRequest.findFirst({
        where: { userId, status: "PENDING" },
        include: requestInclude,
      });
      if (currentPending) {
        if (currentPending.claimCode.code === code) {
          return {
            requestId: currentPending.id,
            linkingStatus: "PENDING" as const,
            school: currentPending.school,
          };
        }
        throw new SchoolLinkError(
          "You already have a pending link request.",
          409,
          "SCHOOL_LINK_ALREADY_PENDING",
        );
      }

      const claim = await tx.claimCode.findUnique({
        where: { code },
        include: { school: true, student: true, teacher: true },
      });
      if (!claim) throw new SchoolLinkError("Claim code not found", 404, "CLAIM_NOT_FOUND");
      if (claim.expiresAt < new Date()) throw new SchoolLinkError("Claim code has expired", 400, "CLAIM_EXPIRED");
      if (claim.claimedAt || claim.claimedByUserId) {
        throw new SchoolLinkError("Claim code has already been used", 409, "CLAIM_USED");
      }
      if (claim.revokedAt || !claim.isActive) {
        throw new SchoolLinkError("Claim code is not valid", 400, "CLAIM_INACTIVE");
      }
      if (!claim.studentId && !claim.teacherId) {
        throw new SchoolLinkError(
          "This claim type is not yet supported by the approval workflow.",
          409,
          "CLAIM_TYPE_NOT_SUPPORTED",
        );
      }

      const linkedProfile = claim.studentId
        ? await tx.user.findUnique({ where: { studentId: claim.studentId }, select: { id: true } })
        : claim.teacherId
          ? await tx.user.findUnique({ where: { teacherId: claim.teacherId }, select: { id: true } })
          : null;
      if (linkedProfile) {
        throw new SchoolLinkError(
          "This school profile is already linked to an account.",
          409,
          "ROSTER_ALREADY_LINKED",
        );
      }

      const expected = claim.verificationData as Record<string, unknown> | null;
      for (const field of ["firstName", "lastName", "dateOfBirth"] as const) {
        const expectedValue = expected?.[field];
        const suppliedValue = verificationData?.[field];
        if (
          typeof expectedValue === "string" &&
          typeof suppliedValue === "string" &&
          expectedValue.trim().toLowerCase() !== suppliedValue.trim().toLowerCase()
        ) {
          throw new SchoolLinkError(
            `Verification failed: ${field} does not match school records`,
            400,
            "CLAIM_VERIFICATION_FAILED",
          );
        }
      }

      const submittedAt = new Date();
      const pendingLinkData = {
        code,
        schoolId: claim.school.id,
        schoolName: claim.school.name,
        type: claim.type,
        studentId: claim.studentId || null,
        teacherId: claim.teacherId || null,
        submittedAt: submittedAt.toISOString(),
        verificationData: verificationData || null,
      };
      const request = await tx.schoolLinkRequest.create({
        data: {
          userId,
          schoolId: claim.schoolId,
          claimCodeId: claim.id,
          studentId: claim.studentId,
          teacherId: claim.teacherId,
          requestedRole: requestedRoleForClaim(claim.type),
          submittedAt,
          metadata: {
            verificationData: verificationData || null,
            preLinkRole: currentUser.role,
            preLinkAccountType: currentUser.accountType,
          } as Prisma.InputJsonValue,
        },
      });

      // Compatibility projection for old clients during rollout.
      await tx.user.update({
        where: { id: userId },
        data: { linkingStatus: "PENDING", pendingLinkData: pendingLinkData as Prisma.InputJsonValue },
      });
      await audit(tx, {
        requestId: request.id,
        userId,
        schoolId: claim.schoolId,
        claimCodeId: claim.id,
        actorUserId: userId,
        eventType: "SUBMITTED",
        afterState: { status: "PENDING" },
        ipAddress: context?.ipAddress,
      });

      return {
        requestId: request.id,
        linkingStatus: "PENDING" as const,
        school: { id: claim.school.id, name: claim.school.name, schoolType: claim.school.schoolType },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    mapTransactionError(error);
  }
}

export async function getCurrentSchoolLink(prisma: PrismaClient, userId: string) {
  return prisma.schoolLinkRequest.findFirst({
    where: { userId },
    include: requestInclude,
    orderBy: { submittedAt: "desc" },
  });
}

export async function listSchoolLinkRequests(
  prisma: PrismaClient,
  schoolId: string,
  status: SchoolLinkRequestStatus = "PENDING",
) {
  return prisma.schoolLinkRequest.findMany({
    where: { schoolId, status },
    include: requestInclude,
    orderBy: { submittedAt: "desc" },
  });
}

export async function cancelSchoolLinkRequest(
  prisma: PrismaClient,
  userId: string,
  context?: { ipAddress?: string },
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.schoolLinkRequest.findFirst({ where: { userId, status: "PENDING" } });
      if (!request) throw new SchoolLinkError("No pending school-link request found", 404, "SCHOOL_LINK_NOT_FOUND");
      const changed = await tx.schoolLinkRequest.updateMany({
        where: { id: request.id, userId, status: "PENDING" },
        data: { status: "CANCELLED", reviewedAt: new Date(), reviewReason: "Cancelled by user" },
      });
      if (changed.count !== 1) throw new SchoolLinkError("Request is no longer pending", 409, "SCHOOL_LINK_CONFLICT");
      await tx.user.update({
        where: { id: userId },
        data: { linkingStatus: "NONE", pendingLinkData: Prisma.DbNull },
      });
      await audit(tx, {
        requestId: request.id,
        userId,
        schoolId: request.schoolId,
        claimCodeId: request.claimCodeId,
        actorUserId: userId,
        eventType: "CANCELLED",
        reason: "Cancelled by user",
        beforeState: { status: "PENDING" },
        afterState: { status: "CANCELLED" },
        ipAddress: context?.ipAddress,
      });
      return { requestId: request.id, linkingStatus: "NONE" as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    mapTransactionError(error);
  }
}

export async function approveSchoolLinkRequest(
  prisma: PrismaClient,
  requestId: string,
  actor: { userId: string; role: string; schoolId?: string | null; ipAddress?: string },
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.schoolLinkRequest.findUnique({
        where: { id: requestId },
        include: { user: true, school: true, claimCode: true },
      });
      if (!request || request.status !== "PENDING") {
        throw new SchoolLinkError("No pending school-link request found", 404, "SCHOOL_LINK_NOT_FOUND");
      }
      if (actor.role !== "SUPER_ADMIN" && request.schoolId !== actor.schoolId) {
        throw new SchoolLinkError("Cannot approve requests from another school", 403, "SCHOOL_LINK_WRONG_SCHOOL");
      }
      const now = new Date();
      const claim = request.claimCode;
      if (
        claim.schoolId !== request.schoolId ||
        claim.studentId !== request.studentId ||
        claim.teacherId !== request.teacherId ||
        !claim.isActive ||
        claim.revokedAt ||
        claim.expiresAt <= now ||
        claim.claimedAt ||
        claim.claimedByUserId
      ) {
        throw new SchoolLinkError("Claim code is no longer eligible for approval", 409, "CLAIM_APPROVAL_CONFLICT");
      }
      if (request.user.schoolId) {
        throw new SchoolLinkError("User is already linked to a school", 409, "SCHOOL_ALREADY_LINKED");
      }

      if (request.studentId) {
        const roster = await tx.student.findFirst({
          where: { id: request.studentId, schoolId: request.schoolId },
          select: { id: true, user: { select: { id: true } } },
        });
        if (!roster) throw new SchoolLinkError("Student record no longer exists", 404, "ROSTER_NOT_FOUND");
        if (roster.user && roster.user.id !== request.userId) {
          throw new SchoolLinkError("Student record is linked to another account", 409, "ROSTER_ALREADY_LINKED");
        }
      } else if (request.teacherId) {
        const roster = await tx.teacher.findFirst({
          where: { id: request.teacherId, schoolId: request.schoolId },
          select: { id: true, user: { select: { id: true } } },
        });
        if (!roster) throw new SchoolLinkError("Teacher record no longer exists", 404, "ROSTER_NOT_FOUND");
        if (roster.user && roster.user.id !== request.userId) {
          throw new SchoolLinkError("Teacher record is linked to another account", 409, "ROSTER_ALREADY_LINKED");
        }
      } else {
        throw new SchoolLinkError("Request has no supported roster target", 409, "ROSTER_NOT_FOUND");
      }

      const claimChanged = await tx.claimCode.updateMany({
        where: {
          id: claim.id,
          isActive: true,
          revokedAt: null,
          claimedAt: null,
          claimedByUserId: null,
          expiresAt: { gt: now },
        },
        data: { claimedAt: now, claimedByUserId: request.userId },
      });
      if (claimChanged.count !== 1) {
        throw new SchoolLinkError("Claim changed before approval", 409, "CLAIM_APPROVAL_CONFLICT");
      }

      const requestChanged = await tx.schoolLinkRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: "APPROVED", reviewedAt: now, reviewedByUserId: actor.userId },
      });
      if (requestChanged.count !== 1) throw new SchoolLinkError("Request changed before approval", 409, "SCHOOL_LINK_CONFLICT");

      if (membershipWritesEnabled()) {
        await tx.schoolMembership.upsert({
          where: { userId_schoolId: { userId: request.userId, schoolId: request.schoolId } },
          create: {
            userId: request.userId,
            schoolId: request.schoolId,
            studentId: request.studentId,
            teacherId: request.teacherId,
            role: request.requestedRole,
            status: "ACTIVE",
            linkedAt: now,
            linkRequestId: request.id,
          },
          update: {
            studentId: request.studentId,
            teacherId: request.teacherId,
            role: request.requestedRole,
            status: "ACTIVE",
            linkedAt: now,
            unlinkedAt: null,
            linkRequestId: request.id,
          },
        });
      }

      await tx.user.update({
        where: { id: request.userId },
        data: {
          role: request.requestedRole,
          schoolId: request.schoolId,
          accountType: "HYBRID",
          organizationCode: request.schoolId,
          organizationName: request.school.name,
          socialFeaturesEnabled: true,
          linkingStatus: "APPROVED",
          pendingLinkData: Prisma.DbNull,
          studentId: request.studentId,
          teacherId: request.teacherId,
        },
      });
      await audit(tx, {
        requestId: request.id,
        userId: request.userId,
        schoolId: request.schoolId,
        claimCodeId: request.claimCodeId,
        actorUserId: actor.userId,
        eventType: "APPROVED",
        beforeState: { status: "PENDING" },
        afterState: { status: "APPROVED", schoolId: request.schoolId, role: request.requestedRole },
        ipAddress: actor.ipAddress,
      });
      return { requestId: request.id, userId: request.userId, schoolName: request.school.name };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    mapTransactionError(error);
  }
}

export async function rejectSchoolLinkRequest(
  prisma: PrismaClient,
  requestId: string,
  actor: { userId: string; role: string; schoolId?: string | null; ipAddress?: string },
  rawReason?: unknown,
) {
  const reason = normalizeReason(rawReason, "Rejection reason");
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.schoolLinkRequest.findUnique({ where: { id: requestId } });
      if (!request || request.status !== "PENDING") {
        throw new SchoolLinkError("No pending school-link request found", 404, "SCHOOL_LINK_NOT_FOUND");
      }
      if (actor.role !== "SUPER_ADMIN" && request.schoolId !== actor.schoolId) {
        throw new SchoolLinkError("Cannot reject requests from another school", 403, "SCHOOL_LINK_WRONG_SCHOOL");
      }
      const changed = await tx.schoolLinkRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: "REJECTED", reviewedAt: new Date(), reviewedByUserId: actor.userId, reviewReason: reason },
      });
      if (changed.count !== 1) throw new SchoolLinkError("Request changed before rejection", 409, "SCHOOL_LINK_CONFLICT");
      await tx.user.update({
        where: { id: request.userId },
        data: { linkingStatus: "REJECTED", pendingLinkData: Prisma.DbNull },
      });
      await audit(tx, {
        requestId: request.id,
        userId: request.userId,
        schoolId: request.schoolId,
        claimCodeId: request.claimCodeId,
        actorUserId: actor.userId,
        eventType: "REJECTED",
        reason,
        beforeState: { status: "PENDING" },
        afterState: { status: "REJECTED" },
        ipAddress: actor.ipAddress,
      });
      return { requestId: request.id, userId: request.userId, reason };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    mapTransactionError(error);
  }
}

async function createReplacementClaimCode(tx: Prisma.TransactionClient, request: {
  schoolId: string;
  studentId: string | null;
  teacherId: string | null;
  claimCode: { type: ClaimCodeType; verificationData: Prisma.JsonValue };
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = ClaimCodeGenerator.generateCode(request.claimCode.type);
    try {
      return await tx.claimCode.create({
        data: {
          code,
          type: request.claimCode.type,
          schoolId: request.schoolId,
          studentId: request.studentId,
          teacherId: request.teacherId,
          expiresAt: ClaimCodeGenerator.generateExpirationDate(30),
          verificationData: request.claimCode.verificationData ?? Prisma.DbNull,
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== "P2002" || attempt === 4) throw error;
    }
  }
  throw new SchoolLinkError("Could not generate a replacement claim code", 500, "CLAIM_REISSUE_FAILED");
}

export async function unlinkSchoolLinkRequest(
  prisma: PrismaClient,
  requestId: string,
  actor: { userId: string; role: string; schoolId?: string | null; ipAddress?: string },
  input: {
    reason?: unknown;
    expectedUserId?: unknown;
    expectedStudentId?: unknown;
    expectedTeacherId?: unknown;
    reissueClaimCode?: boolean;
  },
) {
  const reason = normalizeReason(input.reason, "Unlink reason");
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.schoolLinkRequest.findUnique({
        where: { id: requestId },
        include: { user: true, school: true, claimCode: true },
      });
      if (!request || request.status !== "APPROVED") {
        throw new SchoolLinkError("No approved school link found", 404, "SCHOOL_LINK_NOT_FOUND");
      }
      if (actor.role !== "SUPER_ADMIN" && request.schoolId !== actor.schoolId) {
        throw new SchoolLinkError("Cannot unlink accounts from another school", 403, "SCHOOL_LINK_WRONG_SCHOOL");
      }
      if (input.expectedUserId !== request.userId) {
        throw new SchoolLinkError("User confirmation does not match", 409, "UNLINK_CONFIRMATION_MISMATCH");
      }
      if (request.studentId && input.expectedStudentId !== request.studentId) {
        throw new SchoolLinkError("Student confirmation does not match", 409, "UNLINK_CONFIRMATION_MISMATCH");
      }
      if (request.teacherId && input.expectedTeacherId !== request.teacherId) {
        throw new SchoolLinkError("Teacher confirmation does not match", 409, "UNLINK_CONFIRMATION_MISMATCH");
      }
      if (
        request.user.schoolId !== request.schoolId ||
        request.user.studentId !== request.studentId ||
        request.user.teacherId !== request.teacherId
      ) {
        throw new SchoolLinkError("Current user link no longer matches this request", 409, "UNLINK_STATE_MISMATCH");
      }

      const now = new Date();
      const changed = await tx.schoolLinkRequest.updateMany({
        where: { id: request.id, status: "APPROVED" },
        data: {
          status: "UNLINKED",
          unlinkedAt: now,
          unlinkedByUserId: actor.userId,
          unlinkReason: reason,
        },
      });
      if (changed.count !== 1) throw new SchoolLinkError("Link changed before unlink", 409, "SCHOOL_LINK_CONFLICT");

      if (membershipWritesEnabled()) {
        const membershipChanged = await tx.schoolMembership.updateMany({
          where: {
            userId: request.userId,
            schoolId: request.schoolId,
            status: "ACTIVE",
          },
          data: { status: "UNLINKED", unlinkedAt: now },
        });
        if (membershipChanged.count !== 1) {
          throw new SchoolLinkError(
            "Active school membership is missing or changed",
            409,
            "SCHOOL_MEMBERSHIP_CONFLICT",
          );
        }
      }

      // Clear only the account pointers. Student/teacher rows and academic records
      // remain untouched and can be safely claimed by a corrected General Account.
      await tx.user.update({
        where: { id: request.userId },
        data: {
          schoolId: null,
          studentId: null,
          teacherId: null,
          role: "STUDENT",
          organizationCode: null,
          organizationName: null,
          organizationType: null,
          permissions: {
            canEnterGrades: false,
            canViewReports: false,
            canMarkAttendance: false,
          },
          linkingStatus: "NONE",
          pendingLinkData: Prisma.DbNull,
          schoolAccessVersion: { increment: 1 },
        },
      });
      await tx.claimCode.update({
        where: { id: request.claimCodeId },
        data: {
          isActive: false,
          revokedAt: now,
          revokedBy: actor.userId,
          revokedReason: `School link removed: ${reason}`,
        },
      });
      await audit(tx, {
        requestId: request.id,
        userId: request.userId,
        schoolId: request.schoolId,
        claimCodeId: request.claimCodeId,
        actorUserId: actor.userId,
        eventType: "UNLINKED",
        reason,
        beforeState: {
          status: "APPROVED",
          schoolId: request.schoolId,
          studentId: request.studentId,
          teacherId: request.teacherId,
          schoolAccessVersion: request.user.schoolAccessVersion,
        },
        afterState: {
          status: "UNLINKED",
          schoolId: null,
          studentId: null,
          teacherId: null,
          schoolAccessVersion: request.user.schoolAccessVersion + 1,
        },
        ipAddress: actor.ipAddress,
      });

      let replacementClaimCode = null;
      if (input.reissueClaimCode) {
        replacementClaimCode = await createReplacementClaimCode(tx, request);
        await audit(tx, {
          requestId: request.id,
          userId: request.userId,
          schoolId: request.schoolId,
          claimCodeId: replacementClaimCode.id,
          actorUserId: actor.userId,
          eventType: "REISSUED",
          reason,
          metadata: { replacesClaimCodeId: request.claimCodeId },
          ipAddress: actor.ipAddress,
        });
      }

      return {
        requestId: request.id,
        userId: request.userId,
        schoolName: request.school.name,
        replacementClaimCode: replacementClaimCode
          ? { id: replacementClaimCode.id, code: replacementClaimCode.code, expiresAt: replacementClaimCode.expiresAt }
          : null,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    mapTransactionError(error);
  }
}
