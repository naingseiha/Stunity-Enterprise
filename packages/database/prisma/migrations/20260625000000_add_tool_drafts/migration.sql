-- Surgical migration: adds tool_drafts only (additive, backward-compatible).
--
-- Hand-written to match the existing migration flow in this repo (see
-- 20260604000000_add_reel_responses). Purely additive — one new table; no
-- existing data is touched, so this is safe to apply against a live DB.
--
-- Applied via:  cd packages/database && npx prisma db execute \
--                 --file prisma/migrations/20260625000000_add_tool_drafts/migration.sql \
--                 --schema prisma/schema.prisma
-- Marked done:  npx prisma migrate resolve --applied 20260625000000_add_tool_drafts \
--                 --schema prisma/schema.prisma

-- CreateTable
CREATE TABLE IF NOT EXISTS "tool_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "grade" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_drafts_userId_idx" ON "tool_drafts"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_drafts_userId_tool_idx" ON "tool_drafts"("userId", "tool");
