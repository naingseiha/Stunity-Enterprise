-- CreateEnum
CREATE TYPE "BountyStatus" AS ENUM ('ACTIVE', 'AWARDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BountyReplyFormat" AS ENUM ('TEXT', 'VIDEO', 'SKETCH');

-- CreateTable
CREATE TABLE "bounties" (
    "id" TEXT NOT NULL,
    "askerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subjectColor" TEXT,
    "questionText" TEXT NOT NULL,
    "attachmentName" TEXT,
    "bountyXp" INTEGER NOT NULL,
    "status" "BountyStatus" NOT NULL DEFAULT 'ACTIVE',
    "winnerReplyId" TEXT,
    "awardedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bounties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounty_replies" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "format" "BountyReplyFormat" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "ahaCount" INTEGER NOT NULL DEFAULT 0,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bounty_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounty_ahas" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bounty_ahas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bounties_winnerReplyId_key" ON "bounties"("winnerReplyId");

-- CreateIndex
CREATE INDEX "bounties_status_expiresAt_idx" ON "bounties"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "bounties_askerId_createdAt_idx" ON "bounties"("askerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bounty_replies_bountyId_ahaCount_createdAt_idx" ON "bounty_replies"("bountyId", "ahaCount" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bounty_replies_tutorId_createdAt_idx" ON "bounty_replies"("tutorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bounty_ahas_userId_createdAt_idx" ON "bounty_ahas"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "bounty_ahas_replyId_userId_key" ON "bounty_ahas"("replyId", "userId");

-- AddForeignKey
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_winnerReplyId_fkey" FOREIGN KEY ("winnerReplyId") REFERENCES "bounty_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_replies" ADD CONSTRAINT "bounty_replies_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "bounties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_replies" ADD CONSTRAINT "bounty_replies_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_ahas" ADD CONSTRAINT "bounty_ahas_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "bounty_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_ahas" ADD CONSTRAINT "bounty_ahas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

