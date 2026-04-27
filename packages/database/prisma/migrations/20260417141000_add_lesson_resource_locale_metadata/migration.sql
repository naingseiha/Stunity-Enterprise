ALTER TABLE "lesson_resources"
ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "lesson_resources_locale_idx" ON "lesson_resources"("locale");
