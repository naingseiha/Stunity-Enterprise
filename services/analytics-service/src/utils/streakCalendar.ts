/** Monday 00:00:00 local — start of the current calendar week */
export function getWeekStartMonday(reference = new Date()): Date {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  const weekday = d.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Mon=0 … Sun=6 — true when user had quiz activity that calendar day this week */
export function buildWeekActivityFromDates(activityDates: Date[]): boolean[] {
  const week = [false, false, false, false, false, false, false];
  const weekStart = getWeekStartMonday();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  for (const raw of activityDates) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    if (d < weekStart || d >= weekEnd) continue;
    const index = d.getDay() === 0 ? 6 : d.getDay() - 1;
    week[index] = true;
  }

  return week;
}

// Streak freeze policy: at most one freeze may be held at a time (growth-plan §3.2).
// `freezesTotal` is the count currently available; `freezesUsed` is lifetime consumed.
export const MAX_FREEZES_AVAILABLE = 1;

/** Streak milestone achievements, keyed by the streak length reached. */
export function streakAchievementForLength(streakLength: number): string | null {
  if (streakLength === 7) return 'STREAK_7_DAYS';
  if (streakLength === 30) return 'STREAK_30_DAYS';
  if (streakLength === 100) return 'STREAK_100_DAYS';
  return null;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastQuizDate: Date | string | null;
  freezesTotal: number;
  freezesUsed: number;
}

export interface StreakTransition {
  currentStreak: number;
  longestStreak: number;
  freezesTotal: number;
  freezesUsed: number;
  streakIncreased: boolean;
  achievementUnlocked: string | null;
  freezeEarned: boolean;
  freezeSpent: boolean;
}

/**
 * Pure streak-transition calculation applied when a user completes an activity.
 * - same day: no change
 * - next day: +1
 * - exactly one missed day with a freeze available: freeze is spent, streak still +1
 * - otherwise (2+ missed days, or one missed day without a freeze): reset to 1
 * A freeze is earned on each 7-day milestone, capped at MAX_FREEZES_AVAILABLE.
 */
export function computeStreakTransition(streak: StreakState, now = new Date()): StreakTransition {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const lastQuiz = streak.lastQuizDate ? new Date(streak.lastQuizDate) : null;
  if (lastQuiz) lastQuiz.setHours(0, 0, 0, 0);

  let newCurrentStreak = streak.currentStreak;
  let streakIncreased = false;
  let achievementUnlocked: string | null = null;
  let freezeEarned = false;
  let freezeSpent = false;

  if (!lastQuiz) {
    newCurrentStreak = 1;
    streakIncreased = true;
  } else {
    const daysDiff = Math.floor((today.getTime() - lastQuiz.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      if (newCurrentStreak < 1) {
        newCurrentStreak = 1;
        streakIncreased = true;
      }
    } else if (daysDiff === 1) {
      newCurrentStreak = streak.currentStreak + 1;
      streakIncreased = true;
      achievementUnlocked = streakAchievementForLength(newCurrentStreak);
    } else if (daysDiff === 2 && streak.freezesTotal > 0) {
      freezeSpent = true;
      newCurrentStreak = streak.currentStreak + 1;
      streakIncreased = true;
      achievementUnlocked = streakAchievementForLength(newCurrentStreak);
    } else {
      newCurrentStreak = 1;
    }

    // Earn a freeze on every 7-day milestone, capped. A freeze just spent this
    // turn frees up room to re-earn at the milestone.
    const freezesAfterSpend = streak.freezesTotal - (freezeSpent ? 1 : 0);
    if (streakIncreased && newCurrentStreak % 7 === 0 && freezesAfterSpend < MAX_FREEZES_AVAILABLE) {
      freezeEarned = true;
    }
  }

  let freezesTotal = streak.freezesTotal;
  let freezesUsed = streak.freezesUsed;
  if (freezeSpent) {
    freezesTotal = Math.max(0, freezesTotal - 1);
    freezesUsed += 1;
  }
  if (freezeEarned) {
    freezesTotal = Math.min(MAX_FREEZES_AVAILABLE, freezesTotal + 1);
  }

  return {
    currentStreak: newCurrentStreak,
    longestStreak: Math.max(streak.longestStreak, newCurrentStreak),
    freezesTotal,
    freezesUsed,
    streakIncreased,
    achievementUnlocked,
    freezeEarned,
    freezeSpent,
  };
}

export function computeStreakStatus(streak: {
  currentStreak: number;
  lastQuizDate: Date | string | null;
}): { studiedToday: boolean; streakAtRisk: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!streak.lastQuizDate || streak.currentStreak <= 0) {
    return { studiedToday: false, streakAtRisk: false };
  }

  const last = new Date(streak.lastQuizDate);
  last.setHours(0, 0, 0, 0);

  const studiedToday = last.getTime() === today.getTime();
  const streakAtRisk = !studiedToday;

  return { studiedToday, streakAtRisk };
}

export async function loadWeekActivityForUser(
  prisma: { quizAttempt: { findMany: (args: object) => Promise<Array<{ submittedAt: Date }>> } },
  userId: string,
): Promise<boolean[]> {
  const weekStart = getWeekStartMonday();
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      submittedAt: { gte: weekStart },
    },
    select: { submittedAt: true },
  });

  return buildWeekActivityFromDates(attempts.map((row) => row.submittedAt));
}
