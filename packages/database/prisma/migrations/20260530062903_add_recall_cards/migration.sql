-- Surgical migration: adds recall_cards + recall_reviews only.
--
-- Hand-written because `prisma migrate dev` is blocked by pre-existing
-- schema drift on school_profiles + production indexes that aren't
-- reflected in schema.prisma. Once that broader drift is reconciled in
-- a dedicated session, this migration will be a no-op (tables already
-- exist) and the normal migration flow can resume.
--
-- Applied via:  cd packages/database && npx prisma db execute \
--                 --file prisma/migrations/<name>/migration.sql \
--                 --schema prisma/schema.prisma
-- Marked done:  npx prisma migrate resolve --applied <name> \
--                 --schema prisma/schema.prisma

-- CreateTable
CREATE TABLE "recall_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "subject" TEXT NOT NULL,
    "subjectLabel" TEXT NOT NULL,
    "courseTitle" TEXT,
    "recallStrength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "xpReward" INTEGER NOT NULL DEFAULT 5,
    "protectsStreak" BOOLEAN NOT NULL DEFAULT true,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recall_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recall_reviews" (
    "id" TEXT NOT NULL,
    "recallCardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "easeBefore" DOUBLE PRECISION NOT NULL,
    "intervalBefore" INTEGER NOT NULL,
    "recallStrengthBefore" DOUBLE PRECISION NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recall_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recall_cards_userId_questionId_key" ON "recall_cards"("userId", "questionId");

-- CreateIndex
CREATE INDEX "recall_cards_userId_nextReviewAt_idx" ON "recall_cards"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "recall_cards_userId_subject_idx" ON "recall_cards"("userId", "subject");

-- CreateIndex
CREATE INDEX "recall_reviews_userId_reviewedAt_idx" ON "recall_reviews"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "recall_reviews_recallCardId_reviewedAt_idx" ON "recall_reviews"("recallCardId", "reviewedAt");

-- AddForeignKey
ALTER TABLE "recall_cards" ADD CONSTRAINT "recall_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_cards" ADD CONSTRAINT "recall_cards_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_reviews" ADD CONSTRAINT "recall_reviews_recallCardId_fkey" FOREIGN KEY ("recallCardId") REFERENCES "recall_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_reviews" ADD CONSTRAINT "recall_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
