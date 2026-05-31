-- Backfill: CREATE TABLE for course_assignments.
--
-- This table is referenced by migrations 20260415143000 (ALTER passingScore)
-- and 20260416114500 (ALTER localization columns), but was never created via
-- a migration — it was applied to the live DB manually/via Prisma push.
-- This migration closes the gap so `prisma migrate dev` on a fresh database
-- succeeds without drift errors.

CREATE TABLE IF NOT EXISTS "course_assignments" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "rubric" TEXT,
    "instructionsTranslations" JSONB,
    "rubricTranslations" JSONB,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "course_assignments_lessonId_key"
ON "course_assignments"("lessonId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'course_assignments_lessonId_fkey'
      AND table_name = 'course_assignments'
  ) THEN
    ALTER TABLE "course_assignments"
      ADD CONSTRAINT "course_assignments_lessonId_fkey"
      FOREIGN KEY ("lessonId") REFERENCES "lessons"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
