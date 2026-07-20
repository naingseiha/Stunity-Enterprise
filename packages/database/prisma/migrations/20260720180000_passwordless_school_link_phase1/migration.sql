-- Phase 1: normalize school-link lifecycle state and make unlink/reissue auditable.

CREATE TYPE "SchoolLinkRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'UNLINKED');
CREATE TYPE "SchoolLinkAuditEventType" AS ENUM ('VIEWED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'UNLINKED', 'REISSUED');

ALTER TABLE "users"
ADD COLUMN "schoolAccessVersion" INTEGER NOT NULL DEFAULT 0;

-- A roster can have multiple retired claim codes over time. Active-use safety is
-- enforced by request state and transactional claim validation instead.
DROP INDEX IF EXISTS "claim_codes_studentId_key";
DROP INDEX IF EXISTS "claim_codes_teacherId_key";
DROP INDEX IF EXISTS "claim_codes_claimedByUserId_key";

CREATE TABLE "school_link_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "claimCodeId" TEXT NOT NULL,
    "studentId" TEXT,
    "teacherId" TEXT,
    "requestedRole" "UserRole" NOT NULL,
    "status" "SchoolLinkRequestStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewReason" TEXT,
    "unlinkedAt" TIMESTAMP(3),
    "unlinkedByUserId" TEXT,
    "unlinkReason" TEXT,
    "metadata" JSONB,
    CONSTRAINT "school_link_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "school_link_audit_events" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "claimCodeId" TEXT,
    "actorUserId" TEXT,
    "eventType" "SchoolLinkAuditEventType" NOT NULL,
    "reason" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "school_link_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "school_link_requests_userId_status_idx" ON "school_link_requests"("userId", "status");
CREATE INDEX "school_link_requests_schoolId_status_submittedAt_idx" ON "school_link_requests"("schoolId", "status", "submittedAt");
CREATE INDEX "school_link_requests_claimCodeId_status_idx" ON "school_link_requests"("claimCodeId", "status");
CREATE INDEX "school_link_requests_studentId_status_idx" ON "school_link_requests"("studentId", "status");
CREATE INDEX "school_link_requests_teacherId_status_idx" ON "school_link_requests"("teacherId", "status");

-- PostgreSQL partial indexes express lifecycle invariants Prisma cannot model.
CREATE UNIQUE INDEX "school_link_requests_one_pending_per_user"
ON "school_link_requests"("userId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "school_link_requests_one_pending_per_claim"
ON "school_link_requests"("claimCodeId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "school_link_requests_one_approved_student"
ON "school_link_requests"("studentId") WHERE "status" = 'APPROVED' AND "studentId" IS NOT NULL;
CREATE UNIQUE INDEX "school_link_requests_one_approved_teacher"
ON "school_link_requests"("teacherId") WHERE "status" = 'APPROVED' AND "teacherId" IS NOT NULL;

CREATE INDEX "school_link_audit_events_requestId_createdAt_idx" ON "school_link_audit_events"("requestId", "createdAt");
CREATE INDEX "school_link_audit_events_userId_createdAt_idx" ON "school_link_audit_events"("userId", "createdAt");
CREATE INDEX "school_link_audit_events_schoolId_createdAt_idx" ON "school_link_audit_events"("schoolId", "createdAt");
CREATE INDEX "school_link_audit_events_actorUserId_createdAt_idx" ON "school_link_audit_events"("actorUserId", "createdAt");

ALTER TABLE "school_link_requests" ADD CONSTRAINT "school_link_requests_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_link_requests" ADD CONSTRAINT "school_link_requests_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_link_requests" ADD CONSTRAINT "school_link_requests_claimCodeId_fkey"
FOREIGN KEY ("claimCodeId") REFERENCES "claim_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "school_link_requests" ADD CONSTRAINT "school_link_requests_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "school_link_requests" ADD CONSTRAINT "school_link_requests_unlinkedByUserId_fkey"
FOREIGN KEY ("unlinkedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill valid pending legacy JSON. If legacy data contains duplicate requests
-- for one claim, preserve the oldest as PENDING and record the remainder CANCELLED.
WITH legacy_pending AS (
    SELECT
        u."id" AS "userId",
        cc."id" AS "claimCodeId",
        cc."schoolId",
        cc."studentId",
        cc."teacherId",
        cc."type"::text::"UserRole" AS "requestedRole",
        u."updatedAt" AS "submittedAt",
        u."pendingLinkData" AS "metadata",
        ROW_NUMBER() OVER (PARTITION BY cc."id" ORDER BY u."updatedAt", u."id") AS claim_rank
    FROM "users" u
    JOIN "claim_codes" cc
      ON UPPER(TRIM(cc."code")) = UPPER(TRIM(u."pendingLinkData"->>'code'))
    WHERE u."linkingStatus" = 'PENDING'
      AND u."pendingLinkData" IS NOT NULL
      AND cc."schoolId" = u."pendingLinkData"->>'schoolId'
)
INSERT INTO "school_link_requests" (
    "id", "userId", "schoolId", "claimCodeId", "studentId", "teacherId",
    "requestedRole", "status", "submittedAt", "reviewReason", "metadata"
)
SELECT
    'slr_' || replace(gen_random_uuid()::text, '-', ''),
    "userId", "schoolId", "claimCodeId", "studentId", "teacherId",
    "requestedRole",
    CASE WHEN claim_rank = 1 THEN 'PENDING'::"SchoolLinkRequestStatus" ELSE 'CANCELLED'::"SchoolLinkRequestStatus" END,
    "submittedAt",
    CASE WHEN claim_rank = 1 THEN NULL ELSE 'Cancelled during normalization because another pending request already used this claim code.' END,
    jsonb_build_object('backfilled', true, 'legacyPendingLinkData', "metadata")
FROM legacy_pending;

-- Backfill approved links that have an attributable claimed code.
INSERT INTO "school_link_requests" (
    "id", "userId", "schoolId", "claimCodeId", "studentId", "teacherId",
    "requestedRole", "status", "submittedAt", "reviewedAt", "metadata"
)
SELECT
    'slr_' || replace(gen_random_uuid()::text, '-', ''),
    u."id", cc."schoolId", cc."id", cc."studentId", cc."teacherId",
    u."role", 'APPROVED', COALESCE(cc."createdAt", u."createdAt"), COALESCE(cc."claimedAt", u."updatedAt"),
    jsonb_build_object('backfilled', true)
FROM "users" u
JOIN "claim_codes" cc ON cc."claimedByUserId" = u."id"
WHERE u."schoolId" = cc."schoolId"
  AND u."linkingStatus" = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1 FROM "school_link_requests" r
      WHERE r."userId" = u."id" AND r."status" = 'APPROVED'
  );

INSERT INTO "school_link_audit_events" (
    "id", "requestId", "userId", "schoolId", "claimCodeId", "eventType", "afterState", "metadata", "createdAt"
)
SELECT
    'sla_' || replace(gen_random_uuid()::text, '-', ''), r."id", r."userId", r."schoolId", r."claimCodeId",
    CASE WHEN r."status" = 'APPROVED' THEN 'APPROVED'::"SchoolLinkAuditEventType"
         WHEN r."status" = 'CANCELLED' THEN 'CANCELLED'::"SchoolLinkAuditEventType"
         ELSE 'SUBMITTED'::"SchoolLinkAuditEventType" END,
    jsonb_build_object('status', r."status"), jsonb_build_object('backfilled', true), r."submittedAt"
FROM "school_link_requests" r;

-- Keep the compatibility projection coherent for migrated duplicate losers and
-- malformed pending JSON that could not be tied to a real claim code.
UPDATE "users" u
SET "linkingStatus" = 'NONE', "pendingLinkData" = NULL
WHERE u."linkingStatus" = 'PENDING'
  AND NOT EXISTS (
      SELECT 1 FROM "school_link_requests" r
      WHERE r."userId" = u."id" AND r."status" = 'PENDING'
  );
