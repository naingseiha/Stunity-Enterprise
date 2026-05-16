import { NotificationType } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { sendExpoPushNotifications, isExpoPushToken } from '../utils/expoPush';

const STREAK_REMINDER_TITLE = "Don't lose your streak!";
const STREAK_REMINDER_TYPE: NotificationType = 'SYSTEM';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isMobilePushEnabled(privacySettings: unknown): boolean {
  const settings =
    privacySettings && typeof privacySettings === 'object' && !Array.isArray(privacySettings)
      ? (privacySettings as Record<string, unknown>)
      : {};
  const mobileApp =
    settings.mobileApp && typeof settings.mobileApp === 'object' && !Array.isArray(settings.mobileApp)
      ? (settings.mobileApp as Record<string, unknown>)
      : {};
  return mobileApp.pushNotifications !== false;
}

export async function runStreakAtRiskPushJob(): Promise<{
  candidates: number;
  pushed: number;
  skipped: number;
}> {
  const today = startOfToday();

  const atRiskStreaks = await prisma.learningStreak.findMany({
    where: {
      currentStreak: { gt: 0 },
      OR: [{ lastQuizDate: null }, { lastQuizDate: { lt: today } }],
    },
    select: {
      userId: true,
      currentStreak: true,
    },
    take: 500,
  });

  let pushed = 0;
  let skipped = 0;

  for (const streak of atRiskStreaks) {
    const alreadySent = await prisma.notification.findFirst({
      where: {
        recipientId: streak.userId,
        type: STREAK_REMINDER_TYPE,
        createdAt: { gte: today },
        title: STREAK_REMINDER_TITLE,
      },
      select: { id: true },
    });

    if (alreadySent) {
      skipped += 1;
      continue;
    }

    const [tokens, user] = await Promise.all([
      prisma.deviceToken.findMany({ where: { userId: streak.userId } }),
      prisma.user.findUnique({
        where: { id: streak.userId },
        select: { privacySettings: true },
      }),
    ]);

    const body = `Complete a quiz today to keep your ${streak.currentStreak}-day learning streak.`;
    const pushAllowed = isMobilePushEnabled(user?.privacySettings);
    const expoTokens = tokens.filter((row) => isExpoPushToken(row.token));

    if (pushAllowed && expoTokens.length > 0) {
      await sendExpoPushNotifications(
        expoTokens.map((row) => ({
          to: row.token,
          title: STREAK_REMINDER_TITLE,
          body,
          data: { type: 'streak_at_risk', userId: streak.userId },
          sound: 'default' as const,
          priority: 'high' as const,
        })),
      );
    }

    await prisma.notification.create({
      data: {
        recipientId: streak.userId,
        type: STREAK_REMINDER_TYPE,
        title: STREAK_REMINDER_TITLE,
        message: body,
        link: '/profile?tab=performance',
      },
    });

    pushed += 1;
  }

  return {
    candidates: atRiskStreaks.length,
    pushed,
    skipped,
  };
}
