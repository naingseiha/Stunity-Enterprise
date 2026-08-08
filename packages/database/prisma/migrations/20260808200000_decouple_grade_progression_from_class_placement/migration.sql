-- Promotion decides the next academic year and grade level. Section/class
-- placement is intentionally a later scheduling operation.
ALTER TABLE "promotion_policies"
  ADD COLUMN "enforceMinimumAttendanceRate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxTotalAbsences" INTEGER NOT NULL DEFAULT 44;

ALTER TABLE "year_end_decisions"
  ADD COLUMN "targetGrade" TEXT;

ALTER TABLE "student_progressions"
  ADD COLUMN "toGrade" TEXT,
  ALTER COLUMN "toClassId" DROP NOT NULL;

-- Preserve the grade attached to historical placement rows.
UPDATE "student_progressions" progression
SET "toGrade" = target_class."grade"
FROM "classes" target_class
WHERE target_class."id" = progression."toClassId"
  AND progression."toGrade" IS NULL;

-- Backfill existing year-end drafts. Prefer the selected class grade; when no
-- class exists, derive the intended grade from the approved/recommended result.
UPDATE "year_end_decisions" decision
SET "targetGrade" = COALESCE(
  (SELECT target_class."grade" FROM "classes" target_class WHERE target_class."id" = decision."targetClassId"),
  CASE
    WHEN decision."finalOutcome" = 'REPEAT' THEN source_class."grade"
    WHEN decision."finalOutcome" IN ('PROMOTE', 'CONDITIONAL_PROMOTE')
      OR decision."recommendedOutcome" = 'PROMOTE'
    THEN (
      CASE
        WHEN regexp_replace(source_class."grade", '[^0-9]', '', 'g') <> ''
        THEN (regexp_replace(source_class."grade", '[^0-9]', '', 'g')::integer + 1)::text
        ELSE NULL
      END
    )
    ELSE NULL
  END
)
FROM "classes" source_class
WHERE source_class."id" = decision."fromClassId"
  AND decision."targetGrade" IS NULL;

CREATE INDEX "student_progressions_toAcademicYearId_toGrade_idx"
  ON "student_progressions"("toAcademicYearId", "toGrade");
