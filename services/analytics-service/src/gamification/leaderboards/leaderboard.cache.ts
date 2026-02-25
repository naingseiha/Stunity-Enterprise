/**
 * Simple in-memory cache for leaderboard results.
 * In production this would be backed by Redis (the analytics-service already
 * has `redis` as a dependency). This implementation provides the same interface
 * so upgrading is a drop-in replacement.
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class LeaderboardCache {
    private store = new Map<string, CacheEntry<unknown>>();

    async get<T>(key: string): Promise<T | null> {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data as T;
    }

    async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    async invalidate(pattern: string): Promise<void> {
        for (const key of this.store.keys()) {
            if (key.startsWith(pattern)) {
                this.store.delete(key);
            }
        }
    }

    async flush(): Promise<void> {
        this.store.clear();
    }
}

export const leaderboardCache = new LeaderboardCache();
