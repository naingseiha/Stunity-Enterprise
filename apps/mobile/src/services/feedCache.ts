/**
 * Feed Cache — Offline-first feed with stale-while-revalidate.
 *
 * Two-layer cache mirroring `reelsCache` and `learnHubCache`:
 *   - In-memory module cache (synchronous reads — used by feedStore for
 *     instant first paint on tab switch / cold reopen).
 *   - AsyncStorage persistence (survives app kill; hydrated at
 *     MainNavigator init before user lands on the feed tab).
 *
 * Caches the last 80 posts per user. Stale-while-revalidate: render the
 * cache immediately, refresh in the background. Network never blocks paint.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedApi } from '@/api/client';
import { Post } from '@/types';

const LEGACY_CACHE_KEY = 'feed:cached_posts';
const LEGACY_CACHE_TS_KEY = 'feed:cached_at';
const CACHE_KEY_PREFIX = 'feed:cached_posts';
const CACHE_TS_KEY_PREFIX = 'feed:cached_at';
const MAX_CACHED = 80; // Enough for instant cold-start without bloating AsyncStorage
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const PERSONALIZED_FEED_PAGE_SIZE = 18;

// ── In-memory layer ────────────────────────────────────────────────
// Reads here are synchronous (no AsyncStorage await), so feedStore can paint
// from cache before the React render even commits. `ts` tracks when the
// payload was written, used by isFeedCacheFresh().
interface FeedMemCache {
  posts: Post[];
  ts: number;
  userId: string | null;
  /** Set while a prefetch is in flight so concurrent callers reuse the same request. */
  inFlight: Promise<void> | null;
}

export const feedMemCache: FeedMemCache = {
  posts: [],
  ts: 0,
  userId: null,
  inFlight: null,
};

export const FEED_CACHE_FRESHNESS_MS = 60_000;

export const isFeedCacheFresh = (userId?: string): boolean =>
  feedMemCache.posts.length > 0 &&
  feedMemCache.userId === (userId ?? feedMemCache.userId) &&
  Date.now() - feedMemCache.ts < FEED_CACHE_FRESHNESS_MS;

/** Synchronous read of the in-memory cache. Returns null if empty / wrong user. */
export const readFeedFromMemory = (userId?: string): Post[] | null => {
  if (feedMemCache.posts.length === 0) return null;
  if (userId && feedMemCache.userId && feedMemCache.userId !== userId) return null;
  return feedMemCache.posts;
};

/** Update the in-memory cache. Called by feedStore after every successful fetch. */
export const writeFeedToMemory = (posts: Post[], userId: string): void => {
  feedMemCache.posts = posts.slice(0, MAX_CACHED);
  feedMemCache.userId = userId;
  feedMemCache.ts = Date.now();
};

function resolveScopedKeys(userId?: string) {
    const scope = userId || 'anonymous';
    return {
        cacheKey: `${CACHE_KEY_PREFIX}:${scope}`,
        cacheTsKey: `${CACHE_TS_KEY_PREFIX}:${scope}`,
    };
}

/**
 * Save posts to AsyncStorage cache.
 * Called after every successful fetch.
 */
export async function cacheFeedPosts(posts: Post[], userId?: string): Promise<void> {
    try {
        const toCache = posts.slice(0, MAX_CACHED);
        const { cacheKey, cacheTsKey } = resolveScopedKeys(userId);
        await AsyncStorage.multiSet([
            [cacheKey, JSON.stringify(toCache)],
            [cacheTsKey, String(Date.now())],
        ]);
    } catch {
        // Cache write failure is non-critical
    }
}

/**
 * Load cached posts from AsyncStorage.
 * Returns null if no cache exists.
 */
export async function loadCachedFeed(userId?: string): Promise<Post[] | null> {
    try {
        const { cacheKey } = resolveScopedKeys(userId);
        let cached = await AsyncStorage.getItem(cacheKey);
        if (!cached && userId) {
            cached = await AsyncStorage.getItem(LEGACY_CACHE_KEY);
        }
        if (!cached) return null;
        return JSON.parse(cached) as Post[];
    } catch {
        return null;
    }
}

/**
 * Check if the cache is stale (older than STALE_THRESHOLD_MS).
 */
export async function isCacheStale(userId?: string): Promise<boolean> {
    try {
        const { cacheTsKey } = resolveScopedKeys(userId);
        let ts = await AsyncStorage.getItem(cacheTsKey);
        if (!ts && userId) {
            ts = await AsyncStorage.getItem(LEGACY_CACHE_TS_KEY);
        }
        if (!ts) return true;
        return Date.now() - Number(ts) > STALE_THRESHOLD_MS;
    } catch {
        return true;
    }
}

/**
 * Prepend new posts to the cached feed without full replacement.
 * Used when applying pending posts to persist them for app reopen.
 */
export async function appendToCachedFeed(newPosts: Post[], userId?: string): Promise<void> {
    try {
        const existing = await loadCachedFeed(userId);
        const existingIds = new Set((existing || []).map(p => p.id));
        const unique = newPosts.filter(p => !existingIds.has(p.id));
        const merged = [...unique, ...(existing || [])].slice(0, MAX_CACHED);
        const { cacheKey, cacheTsKey } = resolveScopedKeys(userId);
        await AsyncStorage.multiSet([
            [cacheKey, JSON.stringify(merged)],
            [cacheTsKey, String(Date.now())],
        ]);
    } catch {
        // Cache write failure is non-critical
    }
}

/**
 * Clear the feed cache entirely.
 */
export async function clearFeedCache(userId?: string): Promise<void> {
    try {
        if (userId) {
            const { cacheKey, cacheTsKey } = resolveScopedKeys(userId);
            await AsyncStorage.multiRemove([cacheKey, cacheTsKey]);
            return;
        }

        await AsyncStorage.multiRemove([LEGACY_CACHE_KEY, LEGACY_CACHE_TS_KEY]);
    } catch {
        // Ignore
    }
    // Also clear memory so the next read doesn't return stale items.
    feedMemCache.posts = [];
    feedMemCache.ts = 0;
    feedMemCache.userId = null;
}

// ── MainNavigator-callable hydrate + prefetch ──────────────────────
// Same pattern as `reelsCache` / `learnHubCache`. Disk hydrate fires at
// t≈0 (~5ms) so the cache is populated before the user lands on the feed
// tab; network prefetch is deferred 1.5s in MainNavigator so it doesn't
// pile onto the boot waterfall.

/**
 * Populate the in-memory cache from AsyncStorage if it's empty for this user.
 * Returns true if hydration produced any posts. Stale entries (older than
 * the 5-min threshold) still hydrate — the freshness check is separate, so
 * the user sees content immediately and the network refresh updates it.
 */
export async function hydrateFeedCacheFromDisk(userId: string): Promise<boolean> {
    if (!userId) return false;
    if (feedMemCache.posts.length > 0 && feedMemCache.userId === userId) return true;
    try {
        const { cacheKey, cacheTsKey } = resolveScopedKeys(userId);
        const [[, rawData], [, rawTs]] = await AsyncStorage.multiGet([cacheKey, cacheTsKey]);
        if (!rawData) return false;
        const posts = JSON.parse(rawData) as Post[];
        if (!posts?.length) return false;
        feedMemCache.posts = posts;
        feedMemCache.userId = userId;
        feedMemCache.ts = rawTs ? Number(rawTs) : 0;
        return true;
    } catch {
        return false;
    }
}

/**
 * Fetch /posts/feed and store it in the module cache. Safe to call eagerly
 * from MainNavigator — dedupes concurrent calls and short-circuits when the
 * cache is already fresh.
 *
 * Flow:
 *   1. Disk hydrate if memory is empty (~5ms).
 *   2. If memory cache is fresh (< 60s), skip network entirely.
 *   3. Otherwise fetch; on success, persist back to disk for next launch.
 *
 * Returns a Promise that resolves when the cache is populated (or the
 * call failed; never rejects, so callers can `void prefetchFeed(userId)`).
 */
export async function prefetchFeed(userId?: string): Promise<void> {
    if (!userId) return;
    await hydrateFeedCacheFromDisk(userId);
    if (isFeedCacheFresh(userId)) return;
    if (feedMemCache.inFlight) return feedMemCache.inFlight;

    const task = (async () => {
        try {
            const res = await feedApi.get<any>('/posts/feed', {
                params: {
                    page: 1,
                    limit: PERSONALIZED_FEED_PAGE_SIZE,
                    fields: 'minimal',
                },
                // 25s — longer than feedStore's 12s. feedStore's call will
                // abort at 12s and fall back to /posts (recent feed) for the
                // user's current view; we let the prefetch keep running so the
                // (typically ~14s) ranker work isn't wasted. When it lands,
                // it persists fresh data to disk so the NEXT cold reopen hits
                // an `isFeedCacheFresh` skip and never fires the network at all.
                timeout: 25_000,
                headers: { 'X-No-Retry': 'true' },
            });
            const data = res.data;
            // /posts/feed returns either { items: [...] } (new shape) or
            // { posts: [...] } depending on the route variant. Normalize.
            const rawItems = data?.items || data?.posts || [];
            const posts: Post[] = rawItems
                .map((it: any) => (it?.type === 'POST' ? it.data : it))
                .filter((p: any): p is Post => !!p && !!p.id);
            if (posts.length > 0) {
                writeFeedToMemory(posts, userId);
                void cacheFeedPosts(posts, userId);
            }
        } catch (err) {
            if (__DEV__) console.warn('[Feed] prefetch failed (non-fatal):', err);
        } finally {
            feedMemCache.inFlight = null;
        }
    })();

    feedMemCache.inFlight = task;
    return task;
}
