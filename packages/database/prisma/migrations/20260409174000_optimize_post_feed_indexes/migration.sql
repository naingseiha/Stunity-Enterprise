-- Align post indexes with stable feed pagination order:
-- isPinned DESC, createdAt DESC, id DESC

DROP INDEX IF EXISTS "posts_isPinned_createdAt_idx";
DROP INDEX IF EXISTS "posts_createdAt_idx";
DROP INDEX IF EXISTS "posts_visibility_isPinned_createdAt_idx";

CREATE INDEX IF NOT EXISTS "posts_isPinned_createdAt_id_idx"
  ON "posts"("isPinned" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "posts_createdAt_id_idx"
  ON "posts"("createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "posts_visibility_isPinned_createdAt_id_idx"
  ON "posts"("visibility", "isPinned" DESC, "createdAt" DESC, "id" DESC);
