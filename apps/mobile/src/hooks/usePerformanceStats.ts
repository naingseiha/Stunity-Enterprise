import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  DEFAULT_FEED_PERFORMANCE_STATS,
  fetchPerformanceStatsSummary,
  getCachedFeedPerformanceStats,
  mapSummaryToFeedStats,
  subscribePerformanceStats,
  type FeedPerformanceStats,
} from '@/lib/performanceStatsCache';

export function usePerformanceStats(userId: string | undefined) {
  const [stats, setStats] = useState<FeedPerformanceStats>(() =>
    userId ? getCachedFeedPerformanceStats(userId) ?? DEFAULT_FEED_PERFORMANCE_STATS : DEFAULT_FEED_PERFORMANCE_STATS,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(
    async (force = false) => {
      if (!userId) return;
      const cached = !force ? getCachedFeedPerformanceStats(userId) : null;
      if (cached) {
        setStats(cached);
      } else if (!force) {
        setIsRefreshing(true);
      }
      try {
        const next = await fetchPerformanceStatsSummary(userId, { force });
        setStats(next);
      } catch {
        // Keep last known stats on failure
      } finally {
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  // When auth hydrates after mount, userId goes from undefined → id.
  useEffect(() => {
    if (!userId) return;
    const cached = getCachedFeedPerformanceStats(userId);
    if (cached) {
      setStats(cached);
    }
  }, [userId]);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh]),
  );

  useEffect(() => {
    if (!userId) return;
    return subscribePerformanceStats((updatedUserId, summary) => {
      if (updatedUserId !== userId) return;
      setStats(mapSummaryToFeedStats(summary));
    });
  }, [userId]);

  return { stats, isRefreshing, refresh };
}
