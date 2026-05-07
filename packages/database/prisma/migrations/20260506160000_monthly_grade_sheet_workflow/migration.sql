-- Monthly grade sheet workflow (draft / submitted / locked)

CREATE TYPE "MonthlyGradeSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

ALTER TABLE "grade_confirmations"
  ADD COLUMN "monthNumber" INTEGER,
  ADD COLUMN "status" "MonthlyGradeSheetStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "lockedBy" TEXT,
  ADD COLUMN "lockedAt" TIMESTAMP(3);

ALTER TABLE "grade_confirmations"
  ALTER COLUMN "confirmedBy" DROP NOT NULL,
  ALTER COLUMN "confirmedAt" DROP NOT NULL;

UPDATE "grade_confirmations"
SET
  "status" = 'SUBMITTED',
  "submittedAt" = COALESCE("confirmedAt", NOW()),
  "isConfirmed" = true
WHERE "isConfirmed" = true;

CREATE INDEX "grade_confirmations_status_idx" ON "grade_confirmations" ("status");

