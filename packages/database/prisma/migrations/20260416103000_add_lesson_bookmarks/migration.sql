CREATE TABLE IF NOT EXISTS "lesson_bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lesson_bookmarks_userId_lessonId_key"
ON "lesson_bookmarks"("userId", "lessonId");

CREATE INDEX IF NOT EXISTS "lesson_bookmarks_userId_idx"
ON "lesson_bookmarks"("userId");

CREATE INDEX IF NOT EXISTS "lesson_bookmarks_lessonId_idx"
ON "lesson_bookmarks"("lessonId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'lesson_bookmarks_lessonId_fkey'
      AND table_name = 'lesson_bookmarks'
  ) THEN
    ALTER TABLE "lesson_bookmarks"
      ADD CONSTRAINT "lesson_bookmarks_lessonId_fkey"
      FOREIGN KEY ("lessonId")
      REFERENCES "lessons"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;
