-- Store peer educational value ratings for feed content.
CREATE TABLE "educational_value_ratings" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "helpfulness" INTEGER NOT NULL,
    "clarity" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "difficulty" TEXT,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_value_ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "educational_value_ratings_postId_userId_key" ON "educational_value_ratings"("postId", "userId");
CREATE INDEX "educational_value_ratings_postId_idx" ON "educational_value_ratings"("postId");
CREATE INDEX "educational_value_ratings_userId_idx" ON "educational_value_ratings"("userId");
CREATE INDEX "educational_value_ratings_averageRating_idx" ON "educational_value_ratings"("averageRating");

ALTER TABLE "educational_value_ratings"
    ADD CONSTRAINT "educational_value_ratings_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "educational_value_ratings"
    ADD CONSTRAINT "educational_value_ratings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
