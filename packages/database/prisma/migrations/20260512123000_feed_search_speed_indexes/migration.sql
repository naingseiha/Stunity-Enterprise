CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "posts_title_trgm_idx"
  ON "posts"
  USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "posts_content_trgm_idx"
  ON "posts"
  USING GIN ("content" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "posts_type_pinned_created_id_idx"
  ON "posts"("postType", "isPinned" DESC, "createdAt" DESC, "id" DESC);
