CREATE TABLE IF NOT EXISTS "user_post_feedback" (
  "id" TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "feedbackType" TEXT NOT NULL,
  "reason" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_post_feedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_post_feedback_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_post_feedback_user_post_type_key"
  ON "user_post_feedback"("userId", "postId", "feedbackType");

CREATE INDEX IF NOT EXISTS "user_post_feedback_user_type_created_idx"
  ON "user_post_feedback"("userId", "feedbackType", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "user_post_feedback_post_idx"
  ON "user_post_feedback"("postId");
