-- Phase 5 foundation: membership projection for school authorization.
-- User school fields remain compatibility projections until all services migrate.

CREATE TYPE "SchoolMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'UNLINKED');

CREATE TABLE "school_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "teacherId" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "SchoolMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),
    "linkRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "school_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "school_memberships_studentId_key"
ON "school_memberships"("studentId");
CREATE UNIQUE INDEX "school_memberships_teacherId_key"
ON "school_memberships"("teacherId");
CREATE UNIQUE INDEX "school_memberships_linkRequestId_key"
ON "school_memberships"("linkRequestId");
CREATE UNIQUE INDEX "school_memberships_userId_schoolId_key"
ON "school_memberships"("userId", "schoolId");
CREATE INDEX "school_memberships_schoolId_role_status_idx"
ON "school_memberships"("schoolId", "role", "status");

ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_linkRequestId_fkey"
FOREIGN KEY ("linkRequestId") REFERENCES "school_link_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- First preserve normalized approved requests, retaining their audit linkage.
INSERT INTO "school_memberships" (
    "id", "userId", "schoolId", "studentId", "teacherId", "role",
    "status", "linkedAt", "linkRequestId", "createdAt", "updatedAt"
)
SELECT
    'sm_' || replace(gen_random_uuid()::text, '-', ''),
    r."userId", r."schoolId", r."studentId", r."teacherId", r."requestedRole",
    'ACTIVE'::"SchoolMembershipStatus", COALESCE(r."reviewedAt", r."submittedAt"),
    r."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "school_link_requests" r
WHERE r."status" = 'APPROVED'
ON CONFLICT DO NOTHING;

-- Then cover legacy approved users that had no attributable normalized request.
-- Conflicts are intentionally ignored: the preflight must report any duplicate
-- roster ownership before this migration is applied to staging.
INSERT INTO "school_memberships" (
    "id", "userId", "schoolId", "studentId", "teacherId", "role",
    "status", "linkedAt", "createdAt", "updatedAt"
)
SELECT
    'sm_' || replace(gen_random_uuid()::text, '-', ''),
    u."id", u."schoolId", u."studentId", u."teacherId", u."role",
    'ACTIVE'::"SchoolMembershipStatus", COALESCE(u."updatedAt", u."createdAt"),
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" u
WHERE u."schoolId" IS NOT NULL
  AND u."linkingStatus" = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1 FROM "school_memberships" m
      WHERE m."userId" = u."id" AND m."schoolId" = u."schoolId"
  )
ON CONFLICT DO NOTHING;
