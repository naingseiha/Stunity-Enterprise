-- CreateEnum
CREATE TYPE "QuizWarStatus" AS ENUM ('PRE_MATCH', 'LIVE', 'POST_MATCH');

-- CreateTable
CREATE TABLE "quiz_wars" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "QuizWarStatus" NOT NULL DEFAULT 'PRE_MATCH',
    "round" INTEGER NOT NULL DEFAULT 1,
    "totalRounds" INTEGER NOT NULL DEFAULT 6,
    "teamAName" TEXT NOT NULL,
    "teamAColor" TEXT NOT NULL,
    "teamAScore" INTEGER NOT NULL DEFAULT 0,
    "teamBName" TEXT NOT NULL,
    "teamBColor" TEXT NOT NULL,
    "teamBScore" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "awardedAt" TIMESTAMP(3),
    "rewardXp" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_wars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_war_participants" (
    "id" TEXT NOT NULL,
    "warId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "isMvp" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_war_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_wars_schoolId_status_endsAt_idx" ON "quiz_wars"("schoolId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "quiz_war_participants_warId_team_idx" ON "quiz_war_participants"("warId", "team");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_war_participants_warId_userId_key" ON "quiz_war_participants"("warId", "userId");

-- AddForeignKey
ALTER TABLE "quiz_wars" ADD CONSTRAINT "quiz_wars_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_war_participants" ADD CONSTRAINT "quiz_war_participants_warId_fkey" FOREIGN KEY ("warId") REFERENCES "quiz_wars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_war_participants" ADD CONSTRAINT "quiz_war_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

