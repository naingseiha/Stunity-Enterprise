/**
 * Feed Cache — Offline-first feed with stale-while-revalidate
 *
 * Caches the last 50 posts in AsyncStorage for instant cold-start,
 * and serves stale data while fresh data loads in the background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post } from '@/types';

const LEGACY_CACHE_KEY = 'feed:cached_posts';
const LEGACY_CACHE_TS_KEY = 'feed:cached_at';
const CACHE_KEY_PREFIX = 'feed:cached_posts';
const CACHE_TS_KEY_PREFIX = 'feed:cached_at';
const MAX_CACHED = 50; // Match in-memory limit
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

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
}
