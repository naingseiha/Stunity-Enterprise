-- Academic terms can vary by grade group inside the same academic year.
-- An empty gradeLevels array means the term applies to every grade.
ALTER TABLE "academic_terms"
  ADD COLUMN "nameKh" TEXT,
  ADD COLUMN "gradeLevels" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "examMonth" INTEGER,
  ADD COLUMN "excludedMonths" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

DROP INDEX IF EXISTS "academic_terms_academicYearId_termNumber_key";

CREATE INDEX "academic_terms_academicYearId_termNumber_idx"
  ON "academic_terms"("academicYearId", "termNumber");

ALTER TABLE "academic_terms"
  ADD CONSTRAINT "academic_terms_examMonth_check"
  CHECK ("examMonth" IS NULL OR ("examMonth" BETWEEN 1 AND 12));
