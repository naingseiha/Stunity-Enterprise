CREATE TABLE IF NOT EXISTS "timetable_conflict_exceptions" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "teacherId" TEXT,
  "periodId" TEXT,
  "dayOfWeek" "DayOfWeek",
  "subjectId" TEXT,
  "entryIds" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "approvedBy" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "revokeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "timetable_conflict_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "timetable_conflict_exceptions_schoolId_academicYearId_type_fingerprint_key"
  ON "timetable_conflict_exceptions"("schoolId", "academicYearId", "type", "fingerprint");

CREATE INDEX IF NOT EXISTS "timetable_conflict_exceptions_schoolId_idx"
  ON "timetable_conflict_exceptions"("schoolId");

CREATE INDEX IF NOT EXISTS "timetable_conflict_exceptions_academicYearId_idx"
  ON "timetable_conflict_exceptions"("academicYearId");

CREATE INDEX IF NOT EXISTS "timetable_conflict_exceptions_type_idx"
  ON "timetable_conflict_exceptions"("type");

CREATE INDEX IF NOT EXISTS "timetable_conflict_exceptions_teacherId_idx"
  ON "timetable_conflict_exceptions"("teacherId");

CREATE INDEX IF NOT EXISTS "timetable_conflict_exceptions_periodId_idx"
  ON "timetable_conflict_exceptions"("periodId");

CREATE INDEX IF NOT EXISTS "timetable_conflict_exceptions_isActive_idx"
  ON "timetable_conflict_exceptions"("isActive");
