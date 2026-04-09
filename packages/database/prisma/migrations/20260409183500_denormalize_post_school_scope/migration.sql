-- Denormalize school scope onto posts so SCHOOL visibility reads do not need
-- to join through users on the hot feed path.

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

UPDATE "posts" AS p
SET "schoolId" = u."schoolId"
FROM "users" AS u
WHERE p."authorId" = u."id"
  AND p."schoolId" IS NULL;

CREATE INDEX IF NOT EXISTS "posts_schoolId_visibility_isPinned_createdAt_id_idx"
  ON "posts"("schoolId", "visibility", "isPinned" DESC, "createdAt" DESC, "id" DESC);
