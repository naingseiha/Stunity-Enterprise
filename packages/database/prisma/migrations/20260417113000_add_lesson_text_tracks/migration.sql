DO $$ BEGIN
  CREATE TYPE "LessonTextTrackKind" AS ENUM ('SUBTITLE', 'CAPTION', 'TRANSCRIPT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "lesson_text_tracks" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "kind" "LessonTextTrackKind" NOT NULL DEFAULT 'SUBTITLE',
  "locale" TEXT NOT NULL DEFAULT 'en',
  "label" TEXT,
  "url" TEXT,
  "content" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lesson_text_tracks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lesson_text_tracks_lessonId_idx" ON "lesson_text_tracks"("lessonId");
CREATE INDEX IF NOT EXISTS "lesson_text_tracks_locale_idx" ON "lesson_text_tracks"("locale");

ALTER TABLE "lesson_text_tracks"
  ADD CONSTRAINT "lesson_text_tracks_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
