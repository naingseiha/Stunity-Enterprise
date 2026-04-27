ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "titleTranslations" JSONB,
  ADD COLUMN IF NOT EXISTS "descriptionTranslations" JSONB;

ALTER TABLE "course_sections"
  ADD COLUMN IF NOT EXISTS "titleTranslations" JSONB,
  ADD COLUMN IF NOT EXISTS "descriptionTranslations" JSONB;

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "titleTranslations" JSONB,
  ADD COLUMN IF NOT EXISTS "descriptionTranslations" JSONB,
  ADD COLUMN IF NOT EXISTS "contentTranslations" JSONB;

ALTER TABLE "course_assignments"
  ADD COLUMN IF NOT EXISTS "instructionsTranslations" JSONB,
  ADD COLUMN IF NOT EXISTS "rubricTranslations" JSONB;
