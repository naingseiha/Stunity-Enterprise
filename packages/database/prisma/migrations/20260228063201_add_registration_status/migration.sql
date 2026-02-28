-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('GOOGLE', 'APPLE', 'FACEBOOK', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('ACADEMIC', 'SOCIAL', 'CHALLENGE', 'ATTENDANCE', 'COMPOSITE');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('DAILY', 'WEEKLY', 'SPECIAL', 'TEAM');

-- CreateEnum
CREATE TYPE "ChallengeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "UnlockableType" AS ENUM ('AVATAR', 'THEME', 'BADGE_FRAME', 'PROFILE_EFFECT');

-- CreateEnum
CREATE TYPE "TeamChallengeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeaderboardCategory" AS ENUM ('TOTAL_XP', 'ACADEMIC_PERFORMANCE', 'SOCIAL_ENGAGEMENT', 'ATTENDANCE_RATE', 'CHALLENGE_COMPLETION');

-- CreateEnum
CREATE TYPE "LeaderboardScope" AS ENUM ('SCHOOL_WIDE', 'GRADE_LEVEL', 'CLASS_SPECIFIC');

-- CreateEnum
CREATE TYPE "LeaderboardPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('LEVEL_UP', 'ACHIEVEMENT_UNLOCK', 'STREAK_MILESTONE', 'CHALLENGE_COMPLETION', 'LEADERBOARD_TOP_10');

-- CreateEnum
CREATE TYPE "PlatformAnnouncementPriority" AS ENUM ('INFO', 'WARNING', 'URGENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SHARE';

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "isVerifiedAnswer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "difficultyLevel" DECIMAL(3,2) DEFAULT 2.5,
ADD COLUMN     "questionBounty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repostComment" TEXT,
ADD COLUMN     "repostOfId" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "topicTags" TEXT[],
ADD COLUMN     "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "passingScore" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "resultsVisibility" TEXT NOT NULL DEFAULT 'AFTER_SUBMISSION',
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleAnswers" BOOLEAN NOT NULL DEFAULT false,
    "maxAttempts" INTEGER,
    "showReview" BOOLEAN NOT NULL DEFAULT true,
    "showExplanations" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feed_signals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
    "avgViewDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feed_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_scores" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "decayFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalQuizzes" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "winStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "liveQuizWins" INTEGER NOT NULL DEFAULT 0,
    "liveQuizTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttemptRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "rank" INTEGER,
    "xpEarned" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "sessionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userStatsId" TEXT,

    CONSTRAINT "QuizAttemptRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizChallenge" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "challengerScore" INTEGER,
    "opponentScore" INTEGER,
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAchievement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGameAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userStatsId" TEXT,

    CONSTRAINT "UserGameAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastQuizDate" TIMESTAMP(3),
    "freezesUsed" INTEGER NOT NULL DEFAULT 0,
    "freezesTotal" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userStatsId" TEXT,

    CONSTRAINT "LearningStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyLeaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "rawProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_secrets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "two_factor_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_academic_profiles" (
    "userId" TEXT NOT NULL,
    "currentLevel" DECIMAL(3,2) NOT NULL DEFAULT 2.5,
    "weakTopics" TEXT[],
    "strongTopics" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_academic_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "gamification_achievements" (
    "id" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "tier" "AchievementTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "coinReward" INTEGER NOT NULL,
    "requiredId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievement_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievement_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_templates" (
    "id" TEXT NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "difficulty" "ChallengeDifficulty" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "coinReward" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_currency" (
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_currency_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "virtual_currency_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_currency_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unlockables" (
    "id" TEXT NOT NULL,
    "type" "UnlockableType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "metadata" JSONB,
    "requiredAchievementId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unlockables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_unlockables" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unlockableId" TEXT NOT NULL,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_unlockables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_challenges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "status" "TeamChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "deadline" TIMESTAMP(3) NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "coinReward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "team_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_challenge_participants" (
    "id" TEXT NOT NULL,
    "teamChallengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contribution" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" TEXT NOT NULL,
    "category" "LeaderboardCategory" NOT NULL,
    "scope" "LeaderboardScope" NOT NULL,
    "period" "LeaderboardPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "entries" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_streaks" (
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPresentAt" TIMESTAMP(3),
    "graceActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_streaks_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "milestone_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_deadlines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "relatedTopics" TEXT[],
    "courseId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_locations" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_attendance" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeIn" TIMESTAMP(3) NOT NULL,
    "timeOut" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "PlatformAnnouncementPriority" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_postId_key" ON "quizzes"("postId");

-- CreateIndex
CREATE INDEX "quizzes_postId_idx" ON "quizzes"("postId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_idx" ON "quiz_attempts"("quizId");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_idx" ON "quiz_attempts"("userId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_userId_idx" ON "quiz_attempts"("quizId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");

-- CreateIndex
CREATE INDEX "user_feed_signals_userId_idx" ON "user_feed_signals"("userId");

-- CreateIndex
CREATE INDEX "user_feed_signals_score_idx" ON "user_feed_signals"("score" DESC);

-- CreateIndex
CREATE INDEX "user_feed_signals_userId_score_idx" ON "user_feed_signals"("userId", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_feed_signals_userId_topicId_key" ON "user_feed_signals"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "post_scores_postId_key" ON "post_scores"("postId");

-- CreateIndex
CREATE INDEX "post_scores_engagementScore_idx" ON "post_scores"("engagementScore" DESC);

-- CreateIndex
CREATE INDEX "post_scores_trendingScore_idx" ON "post_scores"("trendingScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

-- CreateIndex
CREATE INDEX "UserStats_xp_idx" ON "UserStats"("xp");

-- CreateIndex
CREATE INDEX "UserStats_level_idx" ON "UserStats"("level");

-- CreateIndex
CREATE INDEX "UserStats_userId_idx" ON "UserStats"("userId");

-- CreateIndex
CREATE INDEX "QuizAttemptRecord_userId_idx" ON "QuizAttemptRecord"("userId");

-- CreateIndex
CREATE INDEX "QuizAttemptRecord_quizId_idx" ON "QuizAttemptRecord"("quizId");

-- CreateIndex
CREATE INDEX "QuizAttemptRecord_userStatsId_idx" ON "QuizAttemptRecord"("userStatsId");

-- CreateIndex
CREATE INDEX "QuizAttemptRecord_createdAt_idx" ON "QuizAttemptRecord"("createdAt");

-- CreateIndex
CREATE INDEX "QuizChallenge_challengerId_idx" ON "QuizChallenge"("challengerId");

-- CreateIndex
CREATE INDEX "QuizChallenge_opponentId_idx" ON "QuizChallenge"("opponentId");

-- CreateIndex
CREATE INDEX "QuizChallenge_status_idx" ON "QuizChallenge"("status");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_userId_idx" ON "ChallengeParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_challengeId_userId_key" ON "ChallengeParticipant"("challengeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameAchievement_key_key" ON "GameAchievement"("key");

-- CreateIndex
CREATE INDEX "UserGameAchievement_userId_idx" ON "UserGameAchievement"("userId");

-- CreateIndex
CREATE INDEX "UserGameAchievement_completed_idx" ON "UserGameAchievement"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "UserGameAchievement_userId_achievementId_key" ON "UserGameAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningStreak_userId_key" ON "LearningStreak"("userId");

-- CreateIndex
CREATE INDEX "LearningStreak_userId_idx" ON "LearningStreak"("userId");

-- CreateIndex
CREATE INDEX "LearningStreak_currentStreak_idx" ON "LearningStreak"("currentStreak");

-- CreateIndex
CREATE INDEX "WeeklyLeaderboard_weekStart_idx" ON "WeeklyLeaderboard"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklyLeaderboard_rank_idx" ON "WeeklyLeaderboard"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLeaderboard_userId_weekStart_key" ON "WeeklyLeaderboard"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_providerUserId_key" ON "social_accounts"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_userId_key" ON "social_accounts"("provider", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_secrets_userId_key" ON "two_factor_secrets"("userId");

-- CreateIndex
CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_ipAddress_createdAt_idx" ON "login_attempts"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "user_academic_profiles_userId_idx" ON "user_academic_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_achievement_progress_userId_idx" ON "user_achievement_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievement_progress_userId_achievementId_key" ON "user_achievement_progress"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "challenges_userId_status_idx" ON "challenges"("userId", "status");

-- CreateIndex
CREATE INDEX "virtual_currency_transactions_userId_idx" ON "virtual_currency_transactions"("userId");

-- CreateIndex
CREATE INDEX "user_unlockables_userId_idx" ON "user_unlockables"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_unlockables_userId_unlockableId_key" ON "user_unlockables"("userId", "unlockableId");

-- CreateIndex
CREATE INDEX "team_challenge_participants_userId_idx" ON "team_challenge_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_challenge_participants_teamChallengeId_userId_key" ON "team_challenge_participants"("teamChallengeId", "userId");

-- CreateIndex
CREATE INDEX "leaderboards_category_scope_period_idx" ON "leaderboards"("category", "scope", "period");

-- CreateIndex
CREATE INDEX "milestone_events_userId_isViewed_idx" ON "milestone_events"("userId", "isViewed");

-- CreateIndex
CREATE INDEX "user_deadlines_userId_idx" ON "user_deadlines"("userId");

-- CreateIndex
CREATE INDEX "user_deadlines_deadlineDate_idx" ON "user_deadlines"("deadlineDate");

-- CreateIndex
CREATE INDEX "school_locations_schoolId_isActive_idx" ON "school_locations"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "teacher_attendance_teacherId_date_idx" ON "teacher_attendance"("teacherId", "date");

-- CreateIndex
CREATE INDEX "teacher_attendance_locationId_date_idx" ON "teacher_attendance"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendance_teacherId_date_key" ON "teacher_attendance"("teacherId", "date");

-- CreateIndex
CREATE INDEX "platform_audit_logs_actorId_idx" ON "platform_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_resourceType_resourceId_idx" ON "platform_audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_schoolId_idx" ON "feature_flags"("schoolId");

-- CreateIndex
CREATE INDEX "platform_announcements_isActive_startAt_endAt_idx" ON "platform_announcements"("isActive", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "likes_postId_idx" ON "likes"("postId");

-- CreateIndex
CREATE INDEX "post_views_postId_userId_idx" ON "post_views"("postId", "userId");

-- CreateIndex
CREATE INDEX "post_views_postId_viewedAt_idx" ON "post_views"("postId", "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_trendingScore_idx" ON "posts"("trendingScore" DESC);

-- CreateIndex
CREATE INDEX "posts_isPinned_createdAt_idx" ON "posts"("isPinned", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_visibility_isPinned_createdAt_idx" ON "posts"("visibility", "isPinned" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_authorId_postType_createdAt_idx" ON "posts"("authorId", "postType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_authorId_visibility_createdAt_idx" ON "posts"("authorId", "visibility", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_studyClubId_createdAt_idx" ON "posts"("studyClubId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_repostOfId_fkey" FOREIGN KEY ("repostOfId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feed_signals" ADD CONSTRAINT "user_feed_signals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_scores" ADD CONSTRAINT "post_scores_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttemptRecord" ADD CONSTRAINT "QuizAttemptRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttemptRecord" ADD CONSTRAINT "QuizAttemptRecord_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttemptRecord" ADD CONSTRAINT "QuizAttemptRecord_userStatsId_fkey" FOREIGN KEY ("userStatsId") REFERENCES "UserStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizChallenge" ADD CONSTRAINT "QuizChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizChallenge" ADD CONSTRAINT "QuizChallenge_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizChallenge" ADD CONSTRAINT "QuizChallenge_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "QuizChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameAchievement" ADD CONSTRAINT "UserGameAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameAchievement" ADD CONSTRAINT "UserGameAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "GameAchievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameAchievement" ADD CONSTRAINT "UserGameAchievement_userStatsId_fkey" FOREIGN KEY ("userStatsId") REFERENCES "UserStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningStreak" ADD CONSTRAINT "LearningStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningStreak" ADD CONSTRAINT "LearningStreak_userStatsId_fkey" FOREIGN KEY ("userStatsId") REFERENCES "UserStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLeaderboard" ADD CONSTRAINT "WeeklyLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_secrets" ADD CONSTRAINT "two_factor_secrets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_academic_profiles" ADD CONSTRAINT "user_academic_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievement_progress" ADD CONSTRAINT "user_achievement_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievement_progress" ADD CONSTRAINT "user_achievement_progress_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "gamification_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "challenge_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_currency" ADD CONSTRAINT "virtual_currency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_currency_transactions" ADD CONSTRAINT "virtual_currency_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_unlockables" ADD CONSTRAINT "user_unlockables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_unlockables" ADD CONSTRAINT "user_unlockables_unlockableId_fkey" FOREIGN KEY ("unlockableId") REFERENCES "unlockables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_challenge_participants" ADD CONSTRAINT "team_challenge_participants_teamChallengeId_fkey" FOREIGN KEY ("teamChallengeId") REFERENCES "team_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_challenge_participants" ADD CONSTRAINT "team_challenge_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_streaks" ADD CONSTRAINT "attendance_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_events" ADD CONSTRAINT "milestone_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_deadlines" ADD CONSTRAINT "user_deadlines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_deadlines" ADD CONSTRAINT "user_deadlines_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_locations" ADD CONSTRAINT "school_locations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "school_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
