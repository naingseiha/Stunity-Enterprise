/**
 * Module-level cache for the EduReels feed.
 *
 * Lives outside the React tree so it survives screen remounts AND can be
 * primed *before* the user ever taps the Reels tab (background prefetch
 * from MainNavigator). Instagram / TikTok feel instant because their first
 * page is already fetched by the time the user lands on the tab — this
 * module is how we do the same.
 *
 * Lifecycle:
 *   - App boot / MainNavigator mount calls `prefetchReelsFeed()` once.
 *   - User taps Reels → FocusReelsScreen reads `reelsCache.items` directly,
 *     skips the skeleton, and only re-fetches if the cache is stale (> 60s).
 *   - Cleared on full app kill, which is fine — server cache covers cold boot.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedApi } from '@/api/client';

export type ReelType = 'FOCUS_REEL' | 'RECALL_CARD' | 'QUIZ_QUESTION' | 'TF_CARD' | 'BOUNTY' | 'POST';

export interface ReelEngagement {
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  /** Viewer's reaction type (LIKE/INSIGHTFUL/CELEBRATE/SMART_TAKE) or null. */
  myReaction?: string | null;
}

export interface ReelFeedItem {
  id: string;
  type: ReelType;
  subject?: string;
  createdAt?: string;
  postId?: string;
  engagement?: ReelEngagement;
  payload: any;
}

interface ReelsCache {
  items: ReelFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  ts: number;
  /** Set while a prefetch is in flight so concurrent callers reuse the same request. */
  inFlight: Promise<void> | null;
}

export const reelsCache: ReelsCache = {
  items: [],
  nextCursor: null,
  hasMore: true,
  ts: 0,
  inFlight: null,
};

export const CACHE_FRESHNESS_MS = 60_000;

export const isReelsCacheFresh = (): boolean =>
  reelsCache.items.length > 0 && Date.now() - reelsCache.ts < CACHE_FRESHNESS_MS;

/**
 * Force the next Reels view to refetch from the network. Call after an action
 * that changes what the feed should contain — e.g. publishing a new reel — so
 * the author sees their content without waiting for the freshness window.
 * Stamps the cache stale (keeps current items on screen until the refresh
 * lands, avoiding a blank flash).
 */
export const invalidateReelsCache = (): void => {
  reelsCache.ts = 0;
};

/**
 * Patch the cached engagement for a single postId so the next remount shows
 * the user's most recent like/comment state without waiting for the server.
 */
export const patchEngagementInCache = (postId: string, patch: Partial<ReelEngagement>): void => {
  reelsCache.items = reelsCache.items.map((it) =>
    it.postId === postId
      ? {
          ...it,
          engagement: {
            likesCount: patch.likesCount ?? it.engagement?.likesCount ?? 0,
            commentsCount: patch.commentsCount ?? it.engagement?.commentsCount ?? 0,
            isLikedByMe: patch.isLikedByMe ?? it.engagement?.isLikedByMe ?? false,
            myReaction: patch.myReaction !== undefined ? patch.myReaction : (it.engagement?.myReaction ?? null),
          },
        }
      : it,
  );
};

// ── Disk persistence (AsyncStorage) ─────────────────────────────────
// Survives full app kill, OS process eviction, and reboot. On true cold
// install the disk is empty too — but after the very first session, every
// subsequent launch can show last-session's reels in <50ms while the network
// refresh runs in the background.
//
// Per-user scoping prevents one account's reels from leaking into another
// after a fast-user-switch. TTL caps how stale we'll show — 24h is the
// sweet spot: long enough to cover daily reopens, short enough that the
// SM-2 recall pool isn't comically out of date.

const DISK_KEY_PREFIX = 'reels:cached_feed';
const DISK_TS_KEY_PREFIX = 'reels:cached_at';
const DISK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DISK_MAX_ITEMS = 30; // first three pages — bound storage footprint

const diskKeysFor = (userId: string) => ({
  data: `${DISK_KEY_PREFIX}:${userId}`,
  ts: `${DISK_TS_KEY_PREFIX}:${userId}`,
});

/**
 * Persist the current in-memory cache to disk for the given user.
 * Fire-and-forget — failures are non-fatal and silently swallowed.
 */
export const persistReelsCacheToDisk = async (userId: string): Promise<void> => {
  if (!userId || reelsCache.items.length === 0) return;
  try {
    const { data, ts } = diskKeysFor(userId);
    const trimmed = reelsCache.items.slice(0, DISK_MAX_ITEMS);
    await AsyncStorage.multiSet([
      [data, JSON.stringify({
        items: trimmed,
        nextCursor: reelsCache.nextCursor,
        hasMore: reelsCache.hasMore,
      })],
      [ts, String(Date.now())],
    ]);
  } catch {
    // Disk write failure is non-critical — cache still works in-memory.
  }
};

/**
 * Hydrate the in-memory cache from disk if it's empty.
 * Returns true if hydration produced any items. Honors TTL: silently drops
 * cache entries older than 24h instead of showing ancient reels.
 *
 * Safe to call before the network prefetch — it short-circuits when memory
 * already has items, so a second tab visit in the same session is a no-op.
 */
export const hydrateReelsCacheFromDisk = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  if (reelsCache.items.length > 0) return true; // memory wins
  try {
    const { data, ts } = diskKeysFor(userId);
    const [[, rawData], [, rawTs]] = await AsyncStorage.multiGet([data, ts]);
    if (!rawData || !rawTs) return false;
    const cachedAt = parseInt(rawTs, 10);
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > DISK_TTL_MS) {
      // Expired — best-effort delete so we don't keep retrying.
      AsyncStorage.multiRemove([data, ts]).catch(() => {});
      return false;
    }
    const parsed = JSON.parse(rawData) as {
      items: ReelFeedItem[];
      nextCursor: string | null;
      hasMore: boolean;
    };
    if (!parsed?.items?.length) return false;
    reelsCache.items = parsed.items;
    reelsCache.nextCursor = parsed.nextCursor ?? null;
    reelsCache.hasMore = !!parsed.hasMore;
    // Mark ts as the disk write time, NOT now — so isReelsCacheFresh() still
    // returns false and we trigger a background refresh on prefetch.
    reelsCache.ts = cachedAt;
    return true;
  } catch {
    return false;
  }
};

/**
 * Fetch the first page of /reels/feed and store it in the module cache.
 * Safe to call eagerly from MainNavigator — it dedupes concurrent calls and
 * is a no-op if the cache is already fresh.
 *
 * Flow:
 *   1. If userId provided, hydrate from disk first (~5ms, populates cache so
 *      the screen can render instantly while the network call runs).
 *   2. If memory cache is now fresh (< 60s), skip the network entirely.
 *   3. Otherwise fetch; on success, persist back to disk for next launch.
 *
 * Returns a Promise that resolves when the cache is populated (or the call
 * failed; never rejects, so callers can `void prefetchReelsFeed(userId)`).
 */
export const prefetchReelsFeed = async (userId?: string): Promise<void> => {
  // Disk hydrate is cheap and synchronous-feeling — do it before the freshness
  // check so a same-session re-entry still benefits from the memory cache,
  // but a cold-from-kill session benefits from disk.
  if (userId) await hydrateReelsCacheFromDisk(userId);

  if (isReelsCacheFresh()) return;
  if (reelsCache.inFlight) return reelsCache.inFlight;

  const task = (async () => {
    try {
      const res = await feedApi.get<{
        items: ReelFeedItem[];
        nextCursor: string | null;
        hasMore: boolean;
      }>('/reels/feed');
      const data = res.data;
      if (data?.items?.length) {
        reelsCache.items = data.items;
        reelsCache.nextCursor = data.nextCursor ?? null;
        reelsCache.hasMore = !!data.hasMore;
        reelsCache.ts = Date.now();
        if (userId) void persistReelsCacheToDisk(userId);
      }
    } catch (err) {
      if (__DEV__) console.warn('[Reels] prefetch failed (non-fatal):', err);
    } finally {
      reelsCache.inFlight = null;
    }
  })();

  reelsCache.inFlight = task;
  return task;
};
