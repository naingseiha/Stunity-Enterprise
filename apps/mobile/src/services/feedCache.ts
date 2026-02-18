/**
 * Feed Cache — Offline-first feed with stale-while-revalidate
 *
 * Caches the last 20 posts in AsyncStorage for instant cold-start,
 * and serves stale data while fresh data loads in the background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post } from '@/types';

const CACHE_KEY = 'feed:cached_posts';
const CACHE_TS_KEY = 'feed:cached_at';
const MAX_CACHED = 20;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Save posts to AsyncStorage cache.
 * Called after every successful fetch.
 */
export async function cacheFeedPosts(posts: Post[]): Promise<void> {
    try {
        const toCache = posts.slice(0, MAX_CACHED);
        await AsyncStorage.multiSet([
            [CACHE_KEY, JSON.stringify(toCache)],
            [CACHE_TS_KEY, String(Date.now())],
        ]);
    } catch {
        // Cache write failure is non-critical
    }
}

/**
 * Load cached posts from AsyncStorage.
 * Returns null if no cache exists.
 */
export async function loadCachedFeed(): Promise<Post[] | null> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        return JSON.parse(cached) as Post[];
    } catch {
        return null;
    }
}

/**
 * Check if the cache is stale (older than STALE_THRESHOLD_MS).
 */
export async function isCacheStale(): Promise<boolean> {
    try {
        const ts = await AsyncStorage.getItem(CACHE_TS_KEY);
        if (!ts) return true;
        return Date.now() - Number(ts) > STALE_THRESHOLD_MS;
    } catch {
        return true;
    }
}

/**
 * Clear the feed cache entirely.
 */
export async function clearFeedCache(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([CACHE_KEY, CACHE_TS_KEY]);
    } catch {
        // Ignore
    }
}
