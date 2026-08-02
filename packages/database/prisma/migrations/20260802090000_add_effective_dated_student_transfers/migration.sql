-- Preserve every class-membership period and make transfers auditable.
CREATE TYPE "EnrollmentEntryReason" AS ENUM (
  'NEW_ADMISSION',
  'YEAR_PROMOTION',
  'CLASS_TRANSFER',
  'SCHOOL_TRANSFER_IN',
  'RE_ENROLLMENT',
  'ADMIN_PLACEMENT'
);

CREATE TYPE "EnrollmentExitReason" AS ENUM (
  'CLASS_TRANSFER',
  'SCHOOL_TRANSFER_OUT',
  'PROMOTED',
  'REPEATED',
  'WITHDRAWN',
  'GRADUATED',
  'CORRECTION'
);

CREATE TYPE "StudentTransferType" AS ENUM ('INTRA_SCHOOL', 'INTER_SCHOOL');
CREATE TYPE "StudentTransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED');

ALTER TABLE "student_classes"
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "endedAt" TIMESTAMP(3),
  ADD COLUMN "entryReason" "EnrollmentEntryReason" NOT NULL DEFAULT 'NEW_ADMISSION',
  ADD COLUMN "exitReason" "EnrollmentExitReason",
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "endedById" TEXT;

-- Existing enrolledAt values are the best available historical start date.
UPDATE "student_classes"
SET "startedAt" = "enrolledAt"
WHERE "startedAt" IS NULL;

ALTER TABLE "student_classes"
  ALTER COLUMN "startedAt" SET NOT NULL,
  ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "student_classes"
  DROP CONSTRAINT IF EXISTS "student_classes_studentId_classId_academicYearId_key";

CREATE INDEX "student_classes_studentId_classId_academicYearId_startedAt_idx"
  ON "student_classes"("studentId", "classId", "academicYearId", "startedAt");

CREATE INDEX "student_classes_studentId_academicYearId_startedAt_endedAt_idx"
  ON "student_classes"("studentId", "academicYearId", "startedAt", "endedAt");

CREATE INDEX "student_classes_classId_startedAt_endedAt_idx"
  ON "student_classes"("classId", "startedAt", "endedAt");

CREATE TABLE "student_transfers" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "fromClassId" TEXT,
  "toClassId" TEXT NOT NULL,
  "sourceEnrollmentId" TEXT,
  "destinationEnrollmentId" TEXT NOT NULL,
  "type" "StudentTransferType" NOT NULL DEFAULT 'INTRA_SCHOOL',
  "status" "StudentTransferStatus" NOT NULL DEFAULT 'COMPLETED',
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "initiatedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_transfers_schoolId_academicYearId_effectiveAt_idx"
  ON "student_transfers"("schoolId", "academicYearId", "effectiveAt");
CREATE INDEX "student_transfers_studentId_effectiveAt_idx"
  ON "student_transfers"("studentId", "effectiveAt");
CREATE INDEX "student_transfers_fromClassId_effectiveAt_idx"
  ON "student_transfers"("fromClassId", "effectiveAt");
CREATE INDEX "student_transfers_toClassId_effectiveAt_idx"
  ON "student_transfers"("toClassId", "effectiveAt");
CREATE INDEX "student_transfers_status_effectiveAt_idx"
  ON "student_transfers"("status", "effectiveAt");

ALTER TABLE "student_transfers"
  ADD CONSTRAINT "student_transfers_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "student_transfers_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "student_transfers_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "student_transfers_fromClassId_fkey"
  FOREIGN KEY ("fromClassId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "student_transfers_toClassId_fkey"
  FOREIGN KEY ("toClassId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "student_transfers_sourceEnrollmentId_fkey"
  FOREIGN KEY ("sourceEnrollmentId") REFERENCES "student_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "student_transfers_destinationEnrollmentId_fkey"
  FOREIGN KEY ("destinationEnrollmentId") REFERENCES "student_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Academic facts must block class deletion instead of disappearing by cascade.
ALTER TABLE "grades" DROP CONSTRAINT IF EXISTS "grades_classId_fkey";
ALTER TABLE "grades"
  ADD CONSTRAINT "grades_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_monthly_summaries"
  DROP CONSTRAINT IF EXISTS "student_monthly_summaries_classId_fkey";
ALTER TABLE "student_monthly_summaries"
  ADD CONSTRAINT "student_monthly_summaries_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_classes" DROP CONSTRAINT IF EXISTS "student_classes_classId_fkey";
ALTER TABLE "student_classes"
  ADD CONSTRAINT "student_classes_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
