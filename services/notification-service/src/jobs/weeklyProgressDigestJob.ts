import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendExpoPushNotifications, isExpoPushToken } from '../utils/expoPush';
import { hasNonUrgentBudget } from '../utils/pushQuota';
import { isPushCategoryEnabled } from '../utils/pushPreferences';

const DIGEST_TITLE = "Your Weekly Progress Digest";
const DIGEST_TYPE: NotificationType = 'SYSTEM';

function startOfLast7Days(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Collect users active in the last 7 days from real activity signals.
 * Does NOT rely on WeeklyLeaderboard being populated (it currently isn't), so the
 * digest reaches genuinely active users. WeeklyLeaderboard, when present, is used
 * only to enrich the message with a percentile brag.
 */
async function findActiveUserIds(since: Date): Promise<string[]> {
  const [streaks, lessons, attempts] = await Promise.all([
    prisma.learningStreak.findMany({
      where: { lastQuizDate: { gte: since } },
      select: { userId: true },
    }),
    prisma.lessonProgress.findMany({
      where: { updatedAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.quizAttempt.findMany({
      where: { submittedAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  const ids = new Set<string>();
  for (const row of streaks) ids.add(row.userId);
  for (const row of lessons) ids.add(row.userId);
  for (const row of attempts) ids.add(row.userId);
  return Array.from(ids);
}

export async function runWeeklyProgressDigestJob(): Promise<{
  candidates: number;
  pushed: number;
  skipped: number;
}> {
  const sevenDaysAgo = startOfLast7Days();
  const today = startOfToday();

  const activeUserIds = await findActiveUserIds(sevenDaysAgo);
  const candidates = activeUserIds.length;

  let pushed = 0;
  let skipped = 0;

  for (const userId of activeUserIds) {
    // Skip if a digest already went out today (idempotent re-runs).
    const alreadySent = await prisma.notification.findFirst({
      where: {
        recipientId: userId,
        type: DIGEST_TYPE,
        title: DIGEST_TITLE,
        createdAt: { gte: today },
      },
      select: { id: true },
    });
    if (alreadySent) {
      skipped += 1;
      continue;
    }

    // Gather this week's stats from primary tables.
    const [streakRecord, recentProgress, weeklyAttempts, newAchievementsCount, leaderboardEntry] =
      await Promise.all([
        prisma.learningStreak.findUnique({
          where: { userId },
          select: { currentStreak: true },
        }),
        prisma.lessonProgress.findMany({
          where: { userId, updatedAt: { gte: sevenDaysAgo } },
          select: { watchTime: true },
        }),
        prisma.quizAttempt.findMany({
          where: { userId, submittedAt: { gte: sevenDaysAgo } },
          select: { pointsEarned: true },
        }),
        prisma.userGameAchievement.count({
          where: { userId, unlockedAt: { gte: sevenDaysAgo } },
        }),
        prisma.weeklyLeaderboard.findFirst({
          where: { userId, weekStart: { gte: sevenDaysAgo } },
          orderBy: { weekStart: 'desc' },
          select: { rank: true, weekStart: true },
        }),
      ]);

    const currentStreak = streakRecord?.currentStreak ?? 0;
    const totalSeconds = recentProgress.reduce((sum, p) => sum + p.watchTime, 0);
    const hoursStudied = (totalSeconds / 3600).toFixed(1);
    const xpEarned = weeklyAttempts.reduce((sum, a) => sum + a.pointsEarned, 0);

    // Optional percentile brag — only if a populated leaderboard exists.
    let percentileText = '';
    if (leaderboardEntry && leaderboardEntry.rank > 0) {
      const totalRankedUsers = await prisma.weeklyLeaderboard.count({
        where: { weekStart: leaderboardEntry.weekStart },
      });
      if (totalRankedUsers > 10) {
        const percentile = Math.round((leaderboardEntry.rank / totalRankedUsers) * 100);
        if (percentile <= 50) {
          percentileText = ` You're in the top ${percentile === 0 ? 1 : percentile}% of your school!`;
        }
      }
    }

    const body = `This week: ${hoursStudied} hrs studied, ${newAchievementsCount} new achievements, +${xpEarned} XP, ${currentStreak}-day streak.${percentileText}`;

    // Respect per-user opt-out and the shared non-urgent push budget.
    const [tokens, user, withinBudget] = await Promise.all([
      prisma.deviceToken.findMany({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { privacySettings: true } }),
      hasNonUrgentBudget(userId),
    ]);

    const pushAllowed = isPushCategoryEnabled(user?.privacySettings, 'weeklyDigest') && withinBudget;
    const expoTokens = tokens.filter((row) => isExpoPushToken(row.token));

    if (pushAllowed && expoTokens.length > 0) {
      await sendExpoPushNotifications(
        expoTokens.map((row) => ({
          to: row.token,
          title: DIGEST_TITLE,
          body,
          data: { type: 'weekly_progress_digest', userId },
          sound: 'default' as const,
          priority: 'high' as const,
        })),
      );
    }

    // Always write the in-app card so the Sunday digest surfaces in the app even
    // when the push was suppressed by the budget or an opt-out.
    await prisma.notification.create({
      data: {
        recipientId: userId,
        type: DIGEST_TYPE,
        title: DIGEST_TITLE,
        message: body,
        link: '/profile?tab=performance',
      },
    });

    pushed += 1;
  }

  return { candidates, pushed, skipped };
}
