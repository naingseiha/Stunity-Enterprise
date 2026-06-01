/**
 * Module-level cache for the Learn Hub.
 *
 * Lives outside the React tree so it survives screen remounts AND can be
 * primed *before* the user ever taps the Learn tab (background prefetch
 * from MainNavigator). Same playbook as `reelsCache` — disk hydrate at
 * t≈0 (~5ms), network refresh deferred so it doesn't join the boot
 * waterfall.
 *
 * Lifecycle:
 *   - App boot / MainNavigator mount calls `hydrateLearnHubFromDisk(userId)`
 *     immediately and `prefetchLearnHub(userId)` after a 1.5s defer.
 *   - User taps Learn → LearnScreen reads `learnHubCache.data` directly,
 *     skips the skeleton, and only re-fetches if the cache is stale (> 30s).
 *
 * Per-user+locale scope: account switching and language switching both
 * invalidate the cached payload.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { learnApi as api } from '@/api/client';
import i18n from '@/lib/i18n';

// Locally typed as opaque records so this module has zero runtime or type
// dependency on `@/api/learn`. That file imports US, so any back-reference
// (even `import type`) trips Metro's require-cycle detector. The full
// strongly-typed shape lives in `@/api/learn` and is restored at the call
// site via `getLearnHub` / `getCachedLearnHub`.
type LearnHubData = {
  courses: any[];
  myCourses: any[];
  myCreated: any[];
  paths: any[];
  stats: any;
};
type LearnCourse = any;
type LearnEnrolledCourse = any;
type LearnPath = any;
type LearningStats = any;

interface LearnHubCache {
  data: LearnHubData | null;
  locale: string;
  ts: number;
  /** Set while a fetch is in flight so concurrent callers share the same request. */
  inFlight: Promise<LearnHubData | null> | null;
}

export const learnHubCache: LearnHubCache = {
  data: null,
  locale: '',
  ts: 0,
  inFlight: null,
};

export const LEARN_HUB_CACHE_FRESHNESS_MS = 30_000;

const getLocale = (): string => {
  const lang = i18n.language || 'en';
  return lang.startsWith('km') ? 'km' : 'en';
};

export const isLearnHubCacheFresh = (): boolean =>
  learnHubCache.data !== null &&
  learnHubCache.locale === getLocale() &&
  Date.now() - learnHubCache.ts < LEARN_HUB_CACHE_FRESHNESS_MS;

export const readLearnHubFromCache = (): LearnHubData | null => {
  if (learnHubCache.data && learnHubCache.locale === getLocale()) {
    return learnHubCache.data;
  }
  return null;
};

export const writeLearnHubToCache = (data: LearnHubData, locale = getLocale()): void => {
  learnHubCache.data = data;
  learnHubCache.locale = locale;
  learnHubCache.ts = Date.now();
};

export const invalidateLearnHubCache = (): void => {
  learnHubCache.data = null;
  learnHubCache.ts = 0;
};

// ── Disk persistence (AsyncStorage) ─────────────────────────────────
// Same shape as reelsCache: per-user-scoped key, 24h TTL, fire-and-forget
// writes. Locale lives inside the payload so a language switch invalidates
// in-memory without us racing the disk.

const DISK_KEY_PREFIX = 'learn:hub_data';
const DISK_TS_KEY_PREFIX = 'learn:hub_at';
const DISK_TTL_MS = 24 * 60 * 60 * 1000;

const diskKeysFor = (userId: string) => ({
  data: `${DISK_KEY_PREFIX}:${userId}`,
  ts: `${DISK_TS_KEY_PREFIX}:${userId}`,
});

export const persistLearnHubToDisk = async (userId: string): Promise<void> => {
  if (!userId || !learnHubCache.data) return;
  try {
    const { data, ts } = diskKeysFor(userId);
    await AsyncStorage.multiSet([
      [data, JSON.stringify({ data: learnHubCache.data, locale: learnHubCache.locale })],
      [ts, String(Date.now())],
    ]);
  } catch {
    // Non-fatal: cache still works in-memory.
  }
};

/**
 * Hydrate the in-memory cache from disk if it's empty for this locale.
 * Returns true if hydration produced data. Honors 24h TTL — silently drops
 * stale entries instead of showing day-old data.
 *
 * Sets `ts` to the disk write time, NOT now, so the next `isLearnHubCacheFresh()`
 * check returns false and we still kick off a background network refresh.
 */
export const hydrateLearnHubFromDisk = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  const locale = getLocale();
  if (learnHubCache.data && learnHubCache.locale === locale) return true;
  try {
    const { data: dataKey, ts: tsKey } = diskKeysFor(userId);
    const [[, rawData], [, rawTs]] = await AsyncStorage.multiGet([dataKey, tsKey]);
    if (!rawData || !rawTs) return false;
    const cachedAt = parseInt(rawTs, 10);
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > DISK_TTL_MS) {
      AsyncStorage.multiRemove([dataKey, tsKey]).catch(() => {});
      return false;
    }
    const parsed = JSON.parse(rawData) as { data: LearnHubData; locale: string };
    if (!parsed?.data || parsed.locale !== locale) return false;
    learnHubCache.data = parsed.data;
    learnHubCache.locale = parsed.locale;
    learnHubCache.ts = cachedAt;
    return true;
  } catch {
    return false;
  }
};

// ── Network normalization ───────────────────────────────────────────
// Mirrors the helpers that previously lived inline in `learn.ts`. Kept here
// so the cache module owns the full read path.

const normalizeStats = (data: any): LearningStats => ({
  enrolledCourses: Number(data?.enrolledCourses ?? 0),
  completedCourses: Number(data?.completedCourses ?? 0),
  completedLessons: Number(data?.completedLessons ?? 0),
  hoursLearned: Number(data?.hoursLearned ?? 0),
  currentStreak: Number(data?.currentStreak ?? 0),
  totalPoints: Number(data?.totalPoints ?? 0),
  level: Number(data?.level ?? 1),
});

const normalizePath = (path: any): LearnPath => ({
  id: String(path?.id ?? ''),
  title: String(path?.title ?? ''),
  description: String(path?.description ?? ''),
  thumbnail: path?.thumbnail || undefined,
  level: String(path?.level ?? 'BEGINNER'),
  isFeatured: Boolean(path?.isFeatured),
  totalDuration: Number(path?.totalDuration ?? 0),
  coursesCount: Number(path?.coursesCount ?? 0),
  enrolledCount: Number(path?.enrolledCount ?? 0),
  isEnrolled: Boolean(path?.isEnrolled),
  courses: Array.isArray(path?.courses)
    ? path.courses.map((c: any) => ({
        id: String(c?.id ?? ''),
        title: String(c?.title ?? ''),
        thumbnail: c?.thumbnail || undefined,
        duration: Number(c?.duration ?? 0),
        order: Number(c?.order ?? 0),
      }))
    : [],
});

/**
 * Fetch /courses/learn-hub and store it in the module cache. Safe to call
 * eagerly from MainNavigator — dedupes concurrent calls and short-circuits
 * when the cache is already fresh.
 *
 * Accepts a `normalizeCourse` injector so we don't duplicate the (large)
 * course normalizer that lives in learn.ts. learn.ts wires this on import.
 */
let _normalizeCourse: ((c: any) => LearnCourse) | null = null;
let _normalizeEnrolled: ((c: any) => LearnEnrolledCourse) | null = null;
export const _setLearnHubNormalizers = (
  normalizeCourse: (c: any) => LearnCourse,
  normalizeEnrolled: (c: any) => LearnEnrolledCourse,
): void => {
  _normalizeCourse = normalizeCourse;
  _normalizeEnrolled = normalizeEnrolled;
};

/**
 * Fetch the learn hub. Performs disk hydrate first when `userId` is given.
 *
 * Flow:
 *   1. Disk hydrate (~5ms) if memory empty — lets the screen render instantly.
 *   2. If memory cache is fresh and `force=false`, return cached data.
 *   3. Otherwise fetch; on success, persist back to disk.
 *
 * Returns the cached data (or null if cold install + network failed).
 * Never rejects, so callers can `void prefetchLearnHub(userId)`.
 */
export const fetchLearnHub = async (
  options: { force?: boolean; userId?: string } = {},
): Promise<LearnHubData | null> => {
  const { force = false, userId } = options;

  if (userId) await hydrateLearnHubFromDisk(userId);

  if (!force && isLearnHubCacheFresh()) {
    return learnHubCache.data;
  }
  if (learnHubCache.inFlight) return learnHubCache.inFlight;

  const locale = getLocale();
  const task = (async () => {
    try {
      const response = await api.get('/courses/learn-hub', {
        params: { limit: 30, pathLimit: 20, locale },
      });
      const d = response.data;
      if (!_normalizeCourse || !_normalizeEnrolled) {
        throw new Error('learnHubCache normalizers not registered');
      }
      const data: LearnHubData = {
        courses: Array.isArray(d?.courses) ? d.courses.map(_normalizeCourse) : [],
        myCourses: Array.isArray(d?.myCourses) ? d.myCourses.map(_normalizeEnrolled) : [],
        myCreated: Array.isArray(d?.myCreated) ? d.myCreated.map(_normalizeCourse) : [],
        paths: Array.isArray(d?.paths) ? d.paths.map(normalizePath) : [],
        stats: normalizeStats(d?.stats),
      };
      writeLearnHubToCache(data, locale);
      if (userId) void persistLearnHubToDisk(userId);
      return data;
    } catch (err) {
      if (__DEV__) console.warn('[Learn] prefetch failed (non-fatal):', err);
      return learnHubCache.data;
    } finally {
      learnHubCache.inFlight = null;
    }
  })();

  learnHubCache.inFlight = task;
  return task;
};

/** Fire-and-forget wrapper for background prefetch. */
export const prefetchLearnHub = async (userId?: string): Promise<void> => {
  await fetchLearnHub({ userId });
};
