-- Enhanced Poll Features Migration
-- Add expiry, anonymous voting, and multiple choice support

-- Step 1: Add new columns to posts table for poll features
ALTER TABLE "posts" ADD COLUMN "pollExpiresAt" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN "pollAllowMultiple" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "posts" ADD COLUMN "pollMaxChoices" INTEGER;
ALTER TABLE "posts" ADD COLUMN "pollIsAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Add index for poll expiration queries
CREATE INDEX "posts_pollExpiresAt_idx" ON "posts"("pollExpiresAt");

-- Step 3: Drop old unique constraint on poll_votes
ALTER TABLE "poll_votes" DROP CONSTRAINT IF EXISTS "poll_votes_optionId_userId_key";

-- Step 4: Add postId column to poll_votes
ALTER TABLE "poll_votes" ADD COLUMN "postId" TEXT;

-- Step 5: Populate postId from poll_options
UPDATE "poll_votes"
SET "postId" = po."postId"
FROM "poll_options" po
WHERE "poll_votes"."optionId" = po."id";

-- Step 6: Make postId NOT NULL after populating
ALTER TABLE "poll_votes" ALTER COLUMN "postId" SET NOT NULL;

-- Step 7: Add new unique constraint to prevent duplicate votes on same option
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_postId_optionId_userId_key"
  UNIQUE ("postId", "optionId", "userId");

-- Step 8: Add index for finding user votes in a poll
CREATE INDEX "poll_votes_postId_userId_idx" ON "poll_votes"("postId", "userId");

-- Migration complete!
-- Now users can vote for multiple options in a poll (if enabled)
-- Polls can have expiration dates
-- Polls can be anonymous
