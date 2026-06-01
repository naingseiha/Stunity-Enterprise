/**
 * Module-level cache for the Clubs tab landing page.
 *
 * Mirrors `reelsCache` / `learnHubCache` / `feedCache`:
 *   - In-memory layer (synchronous reads — used by ClubsScreen for instant
 *     first paint on tab switch / cold reopen).
 *   - AsyncStorage persistence (survives app kill; hydrated at MainNavigator
 *     init before the user lands on the Clubs tab).
 *
 * The existing `api/clubs.ts` already maintains a per-param 30s memory map +
 * in-flight dedupe. This module sits in front of it for the *cold-start
 * landing view only* (the default empty-params call that fires on boot) —
 * we don't try to disk-cache every filter combination, just the one the user
 * sees first.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clubsApi as api } from '@/api/client';

// Locally typed as opaque records so this module has zero runtime / type
// dependency on `@/api/clubs`. The strongly-typed shape is reapplied at the
// call site via the existing normalizers.
type Club = any;
type ClubPagination = {
  page: number;
  limit: number;
  hasMore: boolean;
  nextPage: number | null;
  returned: number;
};
type ClubsLandingPayload = {
  clubs: Club[];
  pagination: ClubPagination;
};

interface ClubsCache {
  data: ClubsLandingPayload | null;
  ts: number;
  userId: string | null;
  /** Set while a fetch is in flight so concurrent callers share the same request. */
  inFlight: Promise<ClubsLandingPayload | null> | null;
}

export const clubsCache: ClubsCache = {
  data: null,
  ts: 0,
  userId: null,
  inFlight: null,
};

export const CLUBS_CACHE_FRESHNESS_MS = 30_000;

export const isClubsCacheFresh = (userId?: string): boolean =>
  clubsCache.data !== null &&
  (!userId || clubsCache.userId === userId) &&
  Date.now() - clubsCache.ts < CLUBS_CACHE_FRESHNESS_MS;

/** Synchronous read for the landing-page render. */
export const readClubsFromCache = (userId?: string): ClubsLandingPayload | null => {
  if (!clubsCache.data) return null;
  if (userId && clubsCache.userId && clubsCache.userId !== userId) return null;
  return clubsCache.data;
};

/** Write to the in-memory cache. Called by ClubsScreen after a successful fetch. */
export const writeClubsToCache = (data: ClubsLandingPayload, userId: string): void => {
  clubsCache.data = data;
  clubsCache.userId = userId;
  clubsCache.ts = Date.now();
};

export const invalidateClubsCache = (): void => {
  clubsCache.data = null;
  clubsCache.ts = 0;
};

// ── Disk persistence ───────────────────────────────────────────────
const DISK_KEY_PREFIX = 'clubs:landing_data';
const DISK_TS_KEY_PREFIX = 'clubs:landing_at';
const DISK_TTL_MS = 24 * 60 * 60 * 1000;
const DISK_MAX_CLUBS = 20; // landing page fits comfortably

const diskKeysFor = (userId: string) => ({
  data: `${DISK_KEY_PREFIX}:${userId}`,
  ts: `${DISK_TS_KEY_PREFIX}:${userId}`,
});

export const persistClubsToDisk = async (userId: string): Promise<void> => {
  if (!userId || !clubsCache.data) return;
  try {
    const { data: dataKey, ts: tsKey } = diskKeysFor(userId);
    const trimmed: ClubsLandingPayload = {
      clubs: clubsCache.data.clubs.slice(0, DISK_MAX_CLUBS),
      pagination: clubsCache.data.pagination,
    };
    await AsyncStorage.multiSet([
      [dataKey, JSON.stringify(trimmed)],
      [tsKey, String(Date.now())],
    ]);
  } catch {
    // Non-fatal — memory cache still works.
  }
};

/**
 * Populate the in-memory cache from disk if it's empty for this user. Sets
 * `ts` to the disk write time so `isClubsCacheFresh` still returns false and
 * we trigger a background refresh on the next prefetch.
 */
export const hydrateClubsCacheFromDisk = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  if (clubsCache.data && clubsCache.userId === userId) return true;
  try {
    const { data: dataKey, ts: tsKey } = diskKeysFor(userId);
    const [[, rawData], [, rawTs]] = await AsyncStorage.multiGet([dataKey, tsKey]);
    if (!rawData || !rawTs) return false;
    const cachedAt = parseInt(rawTs, 10);
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > DISK_TTL_MS) {
      AsyncStorage.multiRemove([dataKey, tsKey]).catch(() => {});
      return false;
    }
    const parsed = JSON.parse(rawData) as ClubsLandingPayload;
    if (!parsed?.clubs?.length) return false;
    clubsCache.data = parsed;
    clubsCache.userId = userId;
    clubsCache.ts = cachedAt;
    return true;
  } catch {
    return false;
  }
};

// ── Network normalization ──────────────────────────────────────────
// Lightweight copies of the helpers in `api/clubs.ts` — kept here so this
// module has no runtime import of `@/api/clubs` (would create a cycle once
// api/clubs delegates landing-page reads to us).

const DEFAULT_CLUB_TYPE = 'CASUAL_STUDY_GROUP';
const DEFAULT_CLUB_MODE = 'PUBLIC';

const extractRows = (payload: any, keys: string[]): any[] => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const normalizeClub = (payload: any): Club => {
  const source = payload?.club || payload?.data || payload || {};
  const membership = payload?.membership || source?.membership || null;
  const type = source.type || source.clubType || DEFAULT_CLUB_TYPE;
  const mode = source.mode || DEFAULT_CLUB_MODE;
  const memberCountFromPayload =
    source.memberCount ??
    source._count?.members ??
    (Array.isArray(source.members) ? source.members.length : undefined);
  return {
    ...source,
    type,
    mode,
    isJoined: typeof source.isJoined === 'boolean' ? source.isJoined : Boolean(membership?.isActive),
    membershipStatus:
      source.membershipStatus ||
      (membership ? (membership.isActive ? 'JOINED' : membership.withdrawalReason || 'PENDING') : null),
    memberCount:
      memberCountFromPayload !== undefined && memberCountFromPayload !== null
        ? Number(memberCountFromPayload)
        : undefined,
  };
};

/**
 * Fetch the default landing-page clubs list and store it in the module
 * cache. Safe to call eagerly from MainNavigator. Dedupes concurrent calls
 * and short-circuits when the cache is already fresh.
 *
 * Returns the cached payload (or null on cold-install + network failure).
 * Never rejects.
 */
export const fetchClubsLanding = async (
  options: { force?: boolean; userId?: string } = {},
): Promise<ClubsLandingPayload | null> => {
  const { force = false, userId } = options;

  if (userId) await hydrateClubsCacheFromDisk(userId);

  if (!force && isClubsCacheFresh(userId)) {
    return clubsCache.data;
  }
  if (clubsCache.inFlight) return clubsCache.inFlight;

  const task = (async () => {
    try {
      // 20s — clubs is heavier than reels/learn (per-club membership lookup),
      // and we want this prefetch to survive even if a parallel mobile call
      // times out at the default 12s.
      // Match ClubsScreen's request params (page=1, limit=20) so server-side
      // caching and our cache key align with what the user will fetch.
      const res = await api.get<any>('/clubs', {
        params: { page: 1, limit: 20 },
        timeout: 20_000,
      });
      const clubs = extractRows(res.data, ['clubs', 'data']).map(normalizeClub);
      const pagination: ClubPagination = res.data?.pagination || {
        page: 1,
        limit: clubs.length,
        hasMore: false,
        nextPage: null,
        returned: clubs.length,
      };
      const data: ClubsLandingPayload = { clubs, pagination };
      if (userId) writeClubsToCache(data, userId);
      else {
        clubsCache.data = data;
        clubsCache.ts = Date.now();
      }
      if (userId) void persistClubsToDisk(userId);
      return data;
    } catch (err) {
      if (__DEV__) console.warn('[Clubs] prefetch failed (non-fatal):', err);
      return clubsCache.data;
    } finally {
      clubsCache.inFlight = null;
    }
  })();

  clubsCache.inFlight = task;
  return task;
};

/** Fire-and-forget wrapper for background prefetch from MainNavigator. */
export const prefetchClubs = async (userId?: string): Promise<void> => {
  await fetchClubsLanding({ userId });
};
