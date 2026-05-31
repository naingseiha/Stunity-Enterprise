-- CreateTable
CREATE TABLE "focus_reels" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "subject" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "pausePoints" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "focus_reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_reel_attempts" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "focus_reel_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "focus_reel_attempts_reelId_userId_key" ON "focus_reel_attempts"("reelId", "userId");

-- AddForeignKey
ALTER TABLE "focus_reels" ADD CONSTRAINT "focus_reels_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_reel_attempts" ADD CONSTRAINT "focus_reel_attempts_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "focus_reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_reel_attempts" ADD CONSTRAINT "focus_reel_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
