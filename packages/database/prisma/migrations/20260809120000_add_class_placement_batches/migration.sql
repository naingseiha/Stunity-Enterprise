-- Additive placement governance. Existing enrollments and progression history
-- are not rewritten or backfilled.
CREATE TYPE "ClassPlacementBatchStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'APPLIED',
  'REVERSED',
  'CANCELLED'
);

CREATE TABLE "class_placement_batches" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "status" "ClassPlacementBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "submittedBy" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "appliedBy" TEXT,
  "appliedAt" TIMESTAMP(3),
  "reversedBy" TEXT,
  "reversedAt" TIMESTAMP(3),
  "appliedSnapshot" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_placement_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_placement_batch_versions" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "strategy" TEXT NOT NULL,
  "seed" TEXT NOT NULL,
  "classIds" JSONB NOT NULL,
  "assignments" JSONB NOT NULL,
  "summary" JSONB,
  "sourceFingerprint" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_placement_batch_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_placement_batches_schoolId_academicYearId_grade_idx"
ON "class_placement_batches"("schoolId", "academicYearId", "grade");
CREATE INDEX "class_placement_batches_schoolId_status_idx"
ON "class_placement_batches"("schoolId", "status");
CREATE UNIQUE INDEX "class_placement_batch_versions_batchId_version_key"
ON "class_placement_batch_versions"("batchId", "version");
CREATE INDEX "class_placement_batch_versions_batchId_createdAt_idx"
ON "class_placement_batch_versions"("batchId", "createdAt");

ALTER TABLE "class_placement_batches"
ADD CONSTRAINT "class_placement_batches_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_placement_batches"
ADD CONSTRAINT "class_placement_batches_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_placement_batch_versions"
ADD CONSTRAINT "class_placement_batch_versions_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "class_placement_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
