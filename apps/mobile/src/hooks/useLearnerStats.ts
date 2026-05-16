import { useCallback, useEffect, useState } from 'react';

import { usePerformanceStats } from '@/hooks/usePerformanceStats';
import {
  getCachedPerformanceSummary,
  streakFromSummary,
  subscribePerformanceStats,
  type FeedPerformanceStats,
} from '@/lib/performanceStatsCache';
import type { Streak } from '@/services/stats';

/**
 * Single source of truth for feed + profile learner stats and streak.
 * All screens should use this instead of fetching streak separately.
 */
export function useLearnerStats(userId: string | undefined) {
  const { stats, isRefreshing, refresh } = usePerformanceStats(userId);

  const [streak, setStreak] = useState<Streak | null>(() => {
    if (!userId) return null;
    const summary = getCachedPerformanceSummary(userId);
    return summary ? streakFromSummary(summary, userId) : null;
  });

  const syncStreakFromCache = useCallback(
    (resolvedUserId: string) => {
      const summary = getCachedPerformanceSummary(resolvedUserId);
      if (summary) {
        setStreak(streakFromSummary(summary, resolvedUserId));
      }
    },
    [],
  );

  useEffect(() => {
    if (!userId) {
      setStreak(null);
      return;
    }
    syncStreakFromCache(userId);
  }, [userId, syncStreakFromCache]);

  useEffect(() => {
    if (!userId) return;
    return subscribePerformanceStats((updatedUserId, summary) => {
      if (updatedUserId !== userId) return;
      setStreak(streakFromSummary(summary, userId));
    });
  }, [userId]);

  return {
    stats: stats as FeedPerformanceStats,
    streak,
    isRefreshing,
    refresh,
    syncStreakFromCache,
  };
}
