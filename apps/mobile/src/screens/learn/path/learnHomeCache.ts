/**
 * Module-level cache for LearnHomeScreen (the Learn tab landing screen).
 *
 * Same playbook as reelsCache / learnHubCache:
 *   - Disk hydrate at boot (~5ms) so cold reopen paints instantly
 *   - Deferred network prefetch from MainNavigator
 *   - Screen seeds React state from this cache and never blanks on revisit
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { learnPathService, LearnerProfile, LearnPath } from '@/services/learnPath.service';
import { statsAPI, PerformanceStatsSummary } from '@/services/stats';

export type LearnHomeCachePayload = {
  profile: LearnerProfile | null;
  path: LearnPath | null;
  activeSubjectId: string | null;
  stats: PerformanceStatsSummary | null;
};

interface LearnHomeCache extends LearnHomeCachePayload {
  ts: number;
  inFlight: Promise<LearnHomeCachePayload | null> | null;
}

export const learnHomeCache: LearnHomeCache = {
  profile: null,
  path: null,
  activeSubjectId: null,
  stats: null,
  ts: 0,
  inFlight: null,
};

export const LEARN_HOME_CACHE_FRESHNESS_MS = 60_000;

const DISK_KEY_PREFIX = 'learn:home_data';
const DISK_TS_KEY_PREFIX = 'learn:home_at';
const DISK_TTL_MS = 24 * 60 * 60 * 1000;

const diskKeysFor = (userId: string) => ({
  data: `${DISK_KEY_PREFIX}:${userId}`,
  ts: `${DISK_TS_KEY_PREFIX}:${userId}`,
});

export const isLearnHomeCacheFresh = (): boolean =>
  Boolean(learnHomeCache.profile || learnHomeCache.path) &&
  Date.now() - learnHomeCache.ts < LEARN_HOME_CACHE_FRESHNESS_MS;

export const readLearnHomeFromCache = (): LearnHomeCachePayload | null => {
  if (!learnHomeCache.profile && !learnHomeCache.path) return null;
  return {
    profile: learnHomeCache.profile,
    path: learnHomeCache.path,
    activeSubjectId: learnHomeCache.activeSubjectId,
    stats: learnHomeCache.stats,
  };
};

export const writeLearnHomeToCache = (payload: LearnHomeCachePayload): void => {
  learnHomeCache.profile = payload.profile;
  learnHomeCache.path = payload.path;
  learnHomeCache.activeSubjectId = payload.activeSubjectId;
  learnHomeCache.stats = payload.stats;
  learnHomeCache.ts = Date.now();
};

export const invalidateLearnHomeCache = (): void => {
  learnHomeCache.profile = null;
  learnHomeCache.path = null;
  learnHomeCache.activeSubjectId = null;
  learnHomeCache.stats = null;
  learnHomeCache.ts = 0;
};

export const persistLearnHomeToDisk = async (userId: string): Promise<void> => {
  if (!userId || (!learnHomeCache.profile && !learnHomeCache.path)) return;
  try {
    const { data, ts } = diskKeysFor(userId);
    await AsyncStorage.multiSet([
      [
        data,
        JSON.stringify({
          profile: learnHomeCache.profile,
          path: learnHomeCache.path,
          activeSubjectId: learnHomeCache.activeSubjectId,
          stats: learnHomeCache.stats,
        }),
      ],
      [ts, String(Date.now())],
    ]);
  } catch {
    // non-fatal
  }
};

export const hydrateLearnHomeFromDisk = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  if (learnHomeCache.profile || learnHomeCache.path) return true;
  try {
    const { data: dataKey, ts: tsKey } = diskKeysFor(userId);
    const [[, rawData], [, rawTs]] = await AsyncStorage.multiGet([dataKey, tsKey]);
    if (!rawData || !rawTs) return false;
    const cachedAt = parseInt(rawTs, 10);
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > DISK_TTL_MS) {
      AsyncStorage.multiRemove([dataKey, tsKey]).catch(() => {});
      return false;
    }
    const parsed = JSON.parse(rawData) as LearnHomeCachePayload;
    if (!parsed?.profile && !parsed?.path) return false;
    learnHomeCache.profile = parsed.profile ?? null;
    learnHomeCache.path = parsed.path ?? null;
    learnHomeCache.activeSubjectId = parsed.activeSubjectId ?? null;
    learnHomeCache.stats = parsed.stats ?? null;
    // Disk write time so freshness check still triggers background refresh.
    learnHomeCache.ts = cachedAt;
    return true;
  } catch {
    return false;
  }
};

/**
 * Fetch profile + active path (+ optional stats) into the module cache.
 * Never rejects — safe for `void prefetchLearnHome(userId)`.
 */
export const fetchLearnHome = async (
  options: { force?: boolean; userId?: string; subjectId?: string } = {},
): Promise<LearnHomeCachePayload | null> => {
  const { force = false, userId, subjectId } = options;

  if (userId) await hydrateLearnHomeFromDisk(userId);

  if (!force && isLearnHomeCacheFresh()) {
    return readLearnHomeFromCache();
  }
  if (learnHomeCache.inFlight) return learnHomeCache.inFlight;

  const task = (async (): Promise<LearnHomeCachePayload | null> => {
    try {
      const profile = await learnPathService.getProfile();
      let path: LearnPath | null = null;
      let activeSubjectId =
        subjectId ||
        learnHomeCache.activeSubjectId ||
        profile?.subjects?.[0]?.id ||
        null;

      if (activeSubjectId && profile?.subjects?.some((s) => s.id === activeSubjectId)) {
        path = await learnPathService.getPath(activeSubjectId);
      } else if (profile?.subjects?.length) {
        activeSubjectId = profile.subjects[0].id;
        path = await learnPathService.getPath(activeSubjectId);
      }

      let stats: PerformanceStatsSummary | null = learnHomeCache.stats;
      if (userId) {
        try {
          stats = await statsAPI.getUserStatsSummary(userId);
        } catch {
          // keep previous stats
        }
      }

      const payload: LearnHomeCachePayload = {
        profile,
        path,
        activeSubjectId,
        stats,
      };
      writeLearnHomeToCache(payload);
      if (userId) void persistLearnHomeToDisk(userId);
      return payload;
    } catch (err) {
      if (__DEV__) console.warn('[LearnHome] prefetch failed (non-fatal):', err);
      return readLearnHomeFromCache();
    } finally {
      learnHomeCache.inFlight = null;
    }
  })();

  learnHomeCache.inFlight = task;
  return task;
};

export const prefetchLearnHome = async (userId?: string): Promise<void> => {
  await fetchLearnHome({ userId });
};
