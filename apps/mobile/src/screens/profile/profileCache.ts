/**
 * Module-level cache for the user's own Profile tab landing view.
 *
 * Mirrors `reelsCache` / `learnHubCache` / `clubsCache` / `feedCache`:
 *   - In-memory layer (synchronous reads for ProfileScreen first paint).
 *   - AsyncStorage persistence (hydrated by MainNavigator at boot).
 *
 * Scope: ONLY the current user's own profile (`/users/me/profile`). Other
 * users' profiles aren't worth disk-caching here — they're viewed
 * transiently and the in-memory layer of `profileApi` is enough.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedApi } from '@/api/client';

// Locally typed as opaque so this module has no runtime cycle with `@/api/profileApi`.
type ProfileData = any;

interface ProfileCache {
  data: ProfileData | null;
  ts: number;
  userId: string | null;
  inFlight: Promise<ProfileData | null> | null;
}

export const profileCache: ProfileCache = {
  data: null,
  ts: 0,
  userId: null,
  inFlight: null,
};

export const PROFILE_CACHE_FRESHNESS_MS = 60_000;

export const isProfileCacheFresh = (userId?: string): boolean =>
  profileCache.data !== null &&
  (!userId || profileCache.userId === userId) &&
  Date.now() - profileCache.ts < PROFILE_CACHE_FRESHNESS_MS;

export const readProfileFromCache = (userId?: string): ProfileData | null => {
  if (!profileCache.data) return null;
  if (userId && profileCache.userId && profileCache.userId !== userId) return null;
  return profileCache.data;
};

export const writeProfileToCache = (data: ProfileData, userId: string): void => {
  profileCache.data = data;
  profileCache.userId = userId;
  profileCache.ts = Date.now();
};

export const invalidateProfileCache = (): void => {
  profileCache.data = null;
  profileCache.ts = 0;
};

// ── Disk persistence ───────────────────────────────────────────────
const DISK_KEY_PREFIX = 'profile:data';
const DISK_TS_KEY_PREFIX = 'profile:at';
const DISK_TTL_MS = 24 * 60 * 60 * 1000;

const diskKeysFor = (userId: string) => ({
  data: `${DISK_KEY_PREFIX}:${userId}`,
  ts: `${DISK_TS_KEY_PREFIX}:${userId}`,
});

export const persistProfileToDisk = async (userId: string): Promise<void> => {
  if (!userId || !profileCache.data) return;
  try {
    const { data: dataKey, ts: tsKey } = diskKeysFor(userId);
    await AsyncStorage.multiSet([
      [dataKey, JSON.stringify(profileCache.data)],
      [tsKey, String(Date.now())],
    ]);
  } catch {
    // non-fatal
  }
};

export const hydrateProfileCacheFromDisk = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  if (profileCache.data && profileCache.userId === userId) return true;
  try {
    const { data: dataKey, ts: tsKey } = diskKeysFor(userId);
    const [[, rawData], [, rawTs]] = await AsyncStorage.multiGet([dataKey, tsKey]);
    if (!rawData || !rawTs) return false;
    const cachedAt = parseInt(rawTs, 10);
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > DISK_TTL_MS) {
      AsyncStorage.multiRemove([dataKey, tsKey]).catch(() => {});
      return false;
    }
    const parsed = JSON.parse(rawData);
    if (!parsed) return false;
    profileCache.data = parsed;
    profileCache.userId = userId;
    profileCache.ts = cachedAt;
    return true;
  } catch {
    return false;
  }
};

/**
 * Fetch `/users/me/profile` and store in module cache. Safe to call eagerly
 * from MainNavigator. Dedupes concurrent calls; short-circuits on fresh cache.
 */
export const prefetchProfile = async (userId?: string): Promise<void> => {
  if (!userId) return;
  await hydrateProfileCacheFromDisk(userId);
  if (isProfileCacheFresh(userId)) return;
  if (profileCache.inFlight) {
    await profileCache.inFlight;
    return;
  }

  const task = (async () => {
    try {
      const res = await feedApi.get<{ profile: ProfileData }>(
        '/users/me/profile',
        { timeout: 20_000 },
      );
      const data = res.data?.profile;
      if (data) writeProfileToCache(data, userId);
      if (data) void persistProfileToDisk(userId);
      return data ?? null;
    } catch (err) {
      if (__DEV__) console.warn('[Profile] prefetch failed (non-fatal):', err);
      return profileCache.data;
    } finally {
      profileCache.inFlight = null;
    }
  })();

  profileCache.inFlight = task;
  await task;
};
