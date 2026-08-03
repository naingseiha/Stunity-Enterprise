-- Separate the SIS record lifecycle from authentication/social-account state.
CREATE TYPE "StudentRecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

ALTER TABLE "students"
  ADD COLUMN "recordStatus" "StudentRecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- Only records archived explicitly by Stunity's directory archive action are
-- migrated as archived. Imported V1 values such as "បិទបណ្តោះអាសន្ន" remain
-- active SIS records and are not treated as account or enrollment state.
UPDATE "students"
SET "recordStatus" = 'ARCHIVED'
WHERE "deactivationReason" = 'Archived from student directory';

CREATE INDEX "students_schoolId_recordStatus_idx"
  ON "students"("schoolId", "recordStatus");
