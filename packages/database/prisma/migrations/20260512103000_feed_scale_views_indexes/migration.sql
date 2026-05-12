ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "viewsCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "posts" p
SET "viewsCount" = vc.count
FROM (
  SELECT "postId", COUNT(*)::int AS count
  FROM "post_views"
  GROUP BY "postId"
) vc
WHERE p.id = vc."postId"
  AND p."viewsCount" = 0;

CREATE INDEX IF NOT EXISTS "posts_trending_created_id_idx"
  ON "posts"("trendingScore" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "posts_school_visibility_trending_created_id_idx"
  ON "posts"("schoolId", "visibility", "trendingScore" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "posts_visibility_trending_created_id_idx"
  ON "posts"("visibility", "trendingScore" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "posts_author_pinned_trending_created_id_idx"
  ON "posts"("authorId", "isPinned" DESC, "trendingScore" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "likes_user_post_idx"
  ON "likes"("userId", "postId");

CREATE INDEX IF NOT EXISTS "bookmarks_user_post_idx"
  ON "bookmarks"("userId", "postId");

CREATE INDEX IF NOT EXISTS "poll_votes_user_post_idx"
  ON "poll_votes"("userId", "postId");

CREATE INDEX IF NOT EXISTS "post_views_user_post_viewed_idx"
  ON "post_views"("userId", "postId", "viewedAt" DESC);
