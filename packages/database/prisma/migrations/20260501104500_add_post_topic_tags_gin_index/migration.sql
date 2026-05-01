-- Speed up subject/category filters that use Post.topicTags array operators
-- in feed, ranked-feed pools, search, and quiz browse queries.
CREATE INDEX IF NOT EXISTS "posts_topicTags_gin_idx"
  ON "posts"
  USING GIN ("topicTags");
