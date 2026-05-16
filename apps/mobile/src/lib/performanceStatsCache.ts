import {
  statsAPI,
  type PerformanceStatsSummary,
  type UserStats as QuizUserStats,
  type Streak,
} from '@/services/stats';

export type PerformanceStatsListener = (
  userId: string,
  summary: PerformanceStatsSummary,
) => void;

const performanceStatsListeners = new Set<PerformanceStatsListener>();

export function subscribePerformanceStats(
  listener: PerformanceStatsListener,
): () => void {
  performanceStatsListeners.add(listener);
  return () => performanceStatsListeners.delete(listener);
}

function notifyPerformanceStats(userId: string, summary: PerformanceStatsSummary) {
  performanceStatsListeners.forEach((listener) => {
    try {
      listener(userId, summary);
    } catch {
      // Ignore listener errors
    }
  });
}

const SUMMARY_TTL_MS = 45_000;
const FULL_STATS_TTL_MS = 45_000;

export interface FeedPerformanceStats {
  currentStreak: number;
  xp: number;
  completedQuizzes: number;
  level: number;
  xpProgress: number;
  xpToNextLevel: number;
  avgScore: number;
}

const DEFAULT_STATS: FeedPerformanceStats = {
  currentStreak: 0,
  xp: 0,
  completedQuizzes: 0,
  level: 1,
  xpProgress: 0,
  xpToNextLevel: 250,
  avgScore: 0,
};

let summaryCache: { userId: string; fetchedAt: number; data: PerformanceStatsSummary } | null = null;
let summaryInflight: Promise<PerformanceStatsSummary> | null = null;

let fullStatsCache: { userId: string; fetchedAt: number; data: Awaited<ReturnType<typeof statsAPI.getUserStats>> } | null = null;
let fullStatsInflight: Promise<Awaited<ReturnType<typeof statsAPI.getUserStats>>> | null = null;

export const mapSummaryToFeedStats = (
  summary: PerformanceStatsSummary,
): FeedPerformanceStats => ({
  currentStreak: summary.currentStreak,
  xp: summary.xp,
  completedQuizzes: summary.totalQuizzes,
  level: summary.level,
  xpProgress: summary.xpProgress,
  xpToNextLevel: summary.xpToNextLevel,
  avgScore: summary.avgScore,
});

export function getCachedPerformanceSummary(
  userId: string,
): PerformanceStatsSummary | null {
  if (
    !summaryCache ||
    summaryCache.userId !== userId ||
    Date.now() - summaryCache.fetchedAt >= SUMMARY_TTL_MS
  ) {
    return null;
  }
  return summaryCache.data;
}

export function getCachedFeedPerformanceStats(userId: string): FeedPerformanceStats | null {
  const summary = getCachedPerformanceSummary(userId);
  return summary ? mapSummaryToFeedStats(summary) : null;
}

/** Map fast summary into the shape Profile PerformanceTab expects. */
export function mapSummaryToQuizUserStats(
  summary: PerformanceStatsSummary,
): QuizUserStats {
  return {
    id: '',
    userId: '',
    xp: summary.xp,
    level: summary.level,
    totalQuizzes: summary.totalQuizzes,
    totalPoints: summary.totalPoints,
    correctAnswers: summary.correctAnswers,
    totalAnswers: summary.totalAnswers,
    winStreak: summary.winStreak,
    bestStreak: summary.winStreak,
    liveQuizWins: 0,
    liveQuizTotal: 0,
    avgScore: summary.avgScore,
    winRate: summary.winRate,
    xpToNextLevel: summary.xpToNextLevel,
    xpProgress: summary.xpProgress,
    recentAttempts: summary.recentScores.map((score, index) => ({
      id: `summary-${index}`,
      userId: '',
      quizId: '',
      score,
      totalPoints: 100,
      accuracy: score,
      timeSpent: 0,
      xpEarned: 0,
      type: 'solo',
      createdAt: new Date().toISOString(),
    })),
  };
}

export function streakFromSummary(
  summary: PerformanceStatsSummary,
  userId = '',
): Streak {
  return {
    id: '',
    userId,
    currentStreak: summary.currentStreak,
    longestStreak: summary.longestStreak ?? summary.currentStreak,
    lastQuizDate: summary.lastQuizDate ?? null,
    freezesAvailable: summary.freezesAvailable ?? 0,
    weekActivity: summary.weekActivity,
    studiedToday: summary.studiedToday,
    streakAtRisk: summary.streakAtRisk,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function streakMetaPatch(
  streak: Streak,
): Partial<PerformanceStatsSummary> {
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastQuizDate: streak.lastQuizDate,
    freezesAvailable: streak.freezesAvailable,
    weekActivity: streak.weekActivity,
    studiedToday: streak.studiedToday,
    streakAtRisk: streak.streakAtRisk,
  };
}

/** Apply streak from POST /streak/update so profile/feed update without a full refetch. */
export function applyStreakToPerformanceCache(userId: string, streak: Streak) {
  const patch = streakMetaPatch(streak);

  if (summaryCache && summaryCache.userId === userId) {
    summaryCache = {
      ...summaryCache,
      data: { ...summaryCache.data, ...patch },
    };
    notifyPerformanceStats(userId, summaryCache.data);
    return;
  }

  const summary: PerformanceStatsSummary = {
    xp: 0,
    level: 1,
    xpProgress: 0,
    xpToNextLevel: 250,
    totalQuizzes: 0,
    totalPoints: 0,
    avgScore: 0,
    winRate: 0,
    winStreak: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    ...patch,
    recentScores: [],
  };
  summaryCache = { userId, fetchedAt: Date.now(), data: summary };
  notifyPerformanceStats(userId, summary);
}

export function invalidatePerformanceStatsCache(userId?: string) {
  if (!userId || summaryCache?.userId === userId) {
    summaryCache = null;
    summaryInflight = null;
  }
  if (!userId || fullStatsCache?.userId === userId) {
    fullStatsCache = null;
    fullStatsInflight = null;
  }
}

export async function fetchPerformanceStatsSummary(
  userId: string,
  options: { force?: boolean } = {},
): Promise<FeedPerformanceStats> {
  if (
    !options.force &&
    summaryCache &&
    summaryCache.userId === userId &&
    Date.now() - summaryCache.fetchedAt < SUMMARY_TTL_MS
  ) {
    return mapSummaryToFeedStats(summaryCache.data);
  }

  if (!summaryInflight) {
    summaryInflight = statsAPI
      .getUserStatsSummary(userId)
      .then((data) => {
        summaryCache = { userId, fetchedAt: Date.now(), data };
        notifyPerformanceStats(userId, data);
        return data;
      })
      .finally(() => {
        summaryInflight = null;
      });
  }

  const summary = await summaryInflight;
  return mapSummaryToFeedStats(summary);
}

export async function fetchUserStatsCached(
  userId: string,
  options: { force?: boolean } = {},
) {
  if (
    !options.force &&
    fullStatsCache &&
    fullStatsCache.userId === userId &&
    Date.now() - fullStatsCache.fetchedAt < FULL_STATS_TTL_MS
  ) {
    return fullStatsCache.data;
  }

  if (!fullStatsInflight) {
    fullStatsInflight = statsAPI
      .getUserStats(userId)
      .then((data) => {
        fullStatsCache = { userId, fetchedAt: Date.now(), data };
        return data;
      })
      .finally(() => {
        fullStatsInflight = null;
      });
  }

  return fullStatsInflight;
}

/**
 * Record XP + streak after quiz, patch cache immediately, then refresh summary in background.
 */
export async function recordQuizCompletionStats(
  userId: string,
  attempt: Parameters<typeof statsAPI.recordAttempt>[0],
): Promise<{ streakIncreased: boolean; currentStreak: number } | null> {
  const [attemptResult, streakResult] = await Promise.all([
    statsAPI.recordAttempt(attempt).catch((err) => {
      if (__DEV__) {
        console.warn('⚠️ [QUIZ] recordAttempt failed:', err);
      }
      return null;
    }),
    statsAPI.updateStreak().catch((err) => {
      if (__DEV__) {
        console.warn('⚠️ [QUIZ] updateStreak failed:', err);
      }
      return null;
    }),
  ]);

  if (streakResult?.streak) {
    applyStreakToPerformanceCache(userId, {
      ...streakResult.streak,
      weekActivity: streakResult.weekActivity ?? streakResult.streak.weekActivity,
      studiedToday: streakResult.studiedToday ?? streakResult.streak.studiedToday,
      streakAtRisk: streakResult.streakAtRisk ?? streakResult.streak.streakAtRisk,
    });
  }

  if (summaryCache && summaryCache.userId === userId && attemptResult?.stats) {
    const s = attemptResult.stats;
    const xpToNextLevel = s.xpToNextLevel ?? summaryCache.data.xpToNextLevel;
    summaryCache = {
      ...summaryCache,
      data: {
        ...summaryCache.data,
        xp: s.xp,
        level: s.level,
        xpProgress: s.xpProgress,
        xpToNextLevel,
        totalQuizzes: Math.max(summaryCache.data.totalQuizzes, s.totalQuizzes),
        avgScore: s.avgScore ?? summaryCache.data.avgScore,
      },
    };
    notifyPerformanceStats(userId, summaryCache.data);
  }

  void fetchPerformanceStatsSummary(userId, { force: true }).catch(() => {});

  if (!streakResult?.streak) {
    return null;
  }

  return {
    streakIncreased: streakResult.streakIncreased,
    currentStreak: streakResult.streak.currentStreak,
  };
}

/** Use a streak freeze and sync the shared learner stats cache. */
export async function applyStreakFreeze(userId: string): Promise<Streak | null> {
  const result = await statsAPI.useStreakFreeze();
  if (!result?.streak) return null;

  applyStreakToPerformanceCache(userId, {
    ...result.streak,
    weekActivity: result.weekActivity ?? result.streak.weekActivity,
    studiedToday: result.studiedToday ?? result.streak.studiedToday,
    streakAtRisk: result.streakAtRisk ?? result.streak.streakAtRisk,
  });

  void fetchPerformanceStatsSummary(userId, { force: true }).catch(() => {});
  return result.streak;
}

export { DEFAULT_STATS as DEFAULT_FEED_PERFORMANCE_STATS };
