-- Surgical migration: adds reel_responses only (additive, backward-compatible).
--
-- Hand-written to match the existing migration flow in this repo (see
-- 20260530062903_add_recall_cards). Purely additive — one new table; no
-- existing data is touched, so this is safe to apply against a live DB.
--
-- Applied via:  cd packages/database && npx prisma db execute \
--                 --file prisma/migrations/20260604000000_add_reel_responses/migration.sql \
--                 --schema prisma/schema.prisma
-- Marked done:  npx prisma migrate resolve --applied 20260604000000_add_reel_responses \
--                 --schema prisma/schema.prisma

-- CreateTable
CREATE TABLE IF NOT EXISTS "reel_responses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "chosenIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reel_responses_userId_itemId_idx" ON "reel_responses"("userId", "itemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reel_responses_userId_itemId_createdAt_idx" ON "reel_responses"("userId", "itemId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "reel_responses" ADD CONSTRAINT "reel_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
