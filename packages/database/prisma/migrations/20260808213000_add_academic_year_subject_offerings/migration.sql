-- Additive curriculum scoping: the master subjects table and all historical
-- grade references remain unchanged.
CREATE TABLE "academic_year_subjects" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT,
    "nameKh" TEXT,
    "nameEn" TEXT,
    "nameKhShort" TEXT,
    "nameEnShort" TEXT,
    "code" TEXT,
    "description" TEXT,
    "grade" TEXT,
    "track" TEXT,
    "category" TEXT,
    "weeklyHours" DOUBLE PRECISION,
    "annualHours" INTEGER,
    "maxScore" INTEGER,
    "coefficient" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_year_subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academic_year_subjects_academicYearId_subjectId_key"
ON "academic_year_subjects"("academicYearId", "subjectId");
CREATE INDEX "academic_year_subjects_academicYearId_isActive_idx"
ON "academic_year_subjects"("academicYearId", "isActive");
CREATE INDEX "academic_year_subjects_subjectId_idx"
ON "academic_year_subjects"("subjectId");

ALTER TABLE "academic_year_subjects"
ADD CONSTRAINT "academic_year_subjects_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academic_year_subjects"
ADD CONSTRAINT "academic_year_subjects_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve today's behaviour for every existing school/year. After this
-- backfill, admins may remove an offering from one year without touching the
-- master subject or historical grades.
INSERT INTO "academic_year_subjects" (
    "id", "academicYearId", "subjectId", "isActive", "createdAt", "updatedAt"
)
SELECT
    'ays_' || md5(ay."id" || ':' || s."id"),
    ay."id",
    s."id",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "academic_years" ay
CROSS JOIN "subjects" s
WHERE s."isActive" = true
ON CONFLICT ("academicYearId", "subjectId") DO NOTHING;
