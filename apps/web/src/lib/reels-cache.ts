/**
 * EduReels feed cache — native reelsCache parity for web/PWA.
 * Memory → localStorage (24h) → network with inFlight dedupe.
 */

import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

export type ReelType =
  | 'FOCUS_REEL'
  | 'RECALL_CARD'
  | 'QUIZ_QUESTION'
  | 'TF_CARD'
  | 'CLOZE_CARD'
  | 'BOUNTY'
  | 'POST';

export interface ReelEngagement {
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  bookmarked?: boolean;
  isLikedByMe?: boolean;
  myReaction?: string | null;
  reactionCounts?: Record<string, number>;
}

export interface ReelFeedItem {
  id: string;
  type: ReelType;
  subject?: string;
  createdAt?: string;
  postId?: string;
  engagement?: ReelEngagement;
  payload: Record<string, any>;
}

export type ReelsCacheSnapshot = {
  items: ReelFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  cachedAt: number;
};

type CacheEntry = ReelsCacheSnapshot;

const MEMORY = new Map<string, CacheEntry>();
const IN_FLIGHT = new Map<string, Promise<ReelsCacheSnapshot | null>>();

const FRESH_MS = 60_000;
const STALE_MS = 24 * 60 * 60 * 1000;
const DISK_MAX_ITEMS = 30;
const STORAGE_PREFIX = 'stunity:reels-feed:v1:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readDisk(userId: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.items?.length || typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > STALE_MS) {
      localStorage.removeItem(storageKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDisk(userId: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify({
        ...entry,
        items: entry.items.slice(0, DISK_MAX_ITEMS),
      }),
    );
  } catch {
    /* quota */
  }
}

export function readReelsCache(userId: string): ReelsCacheSnapshot | null {
  if (!userId) return null;
  const mem = MEMORY.get(userId);
  if (mem?.items?.length) return mem;

  const disk = readDisk(userId);
  if (disk?.items?.length) {
    MEMORY.set(userId, disk);
    return disk;
  }
  return null;
}

export function isReelsCacheFresh(userId: string, now = Date.now()): boolean {
  const snap = readReelsCache(userId);
  if (!snap?.items?.length) return false;
  return now - snap.cachedAt < FRESH_MS;
}

export function writeReelsCache(userId: string, data: Omit<ReelsCacheSnapshot, 'cachedAt'>): void {
  if (!userId) return;
  const entry: CacheEntry = { ...data, cachedAt: Date.now() };
  MEMORY.set(userId, entry);
  writeDisk(userId, entry);
}

export function invalidateReelsCache(userId?: string): void {
  if (userId) {
    const entry = MEMORY.get(userId);
    if (entry) MEMORY.set(userId, { ...entry, cachedAt: 0 });
    IN_FLIGHT.delete(userId);
    return;
  }
  for (const [key, entry] of MEMORY.entries()) {
    MEMORY.set(key, { ...entry, cachedAt: 0 });
  }
  IN_FLIGHT.clear();
}

export function patchReelsEngagementInCache(
  userId: string,
  postId: string,
  patch: Partial<ReelEngagement>,
): void {
  const snap = readReelsCache(userId);
  if (!snap) return;
  writeReelsCache(userId, {
    items: snap.items.map((it) =>
      it.postId === postId
        ? {
            ...it,
            engagement: {
              likesCount: patch.likesCount ?? it.engagement?.likesCount ?? 0,
              commentsCount: patch.commentsCount ?? it.engagement?.commentsCount ?? 0,
              sharesCount: patch.sharesCount ?? it.engagement?.sharesCount ?? 0,
              bookmarked: patch.bookmarked ?? it.engagement?.bookmarked ?? false,
              isLikedByMe: patch.isLikedByMe ?? it.engagement?.isLikedByMe ?? false,
              myReaction:
                patch.myReaction !== undefined
                  ? patch.myReaction
                  : (it.engagement?.myReaction ?? null),
              reactionCounts: patch.reactionCounts ?? it.engagement?.reactionCounts ?? {},
            },
          }
        : it,
    ),
    nextCursor: snap.nextCursor,
    hasMore: snap.hasMore,
  });
}

async function fetchReelsNetwork(
  userId: string,
  cursor?: string | null,
): Promise<ReelsCacheSnapshot | null> {
  const token = TokenManager.getAccessToken();
  if (!token) return null;

  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`${FEED_SERVICE_URL}/reels/feed?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    items?: ReelFeedItem[];
    nextCursor?: string | null;
    hasMore?: boolean;
  };

  if (!data?.items?.length) {
    return cursor
      ? { items: [], nextCursor: null, hasMore: false, cachedAt: Date.now() }
      : null;
  }

  return {
    items: data.items,
    nextCursor: data.nextCursor ?? null,
    hasMore: !!data.hasMore,
    cachedAt: Date.now(),
  };
}

export async function fetchReelsFeed(options: {
  userId: string;
  force?: boolean;
  cursor?: string | null;
}): Promise<ReelsCacheSnapshot | null> {
  const { userId, force, cursor } = options;
  if (!userId) return null;

  // Cursor pages always hit the network (append path)
  if (cursor) {
    return fetchReelsNetwork(userId, cursor);
  }

  if (!force && isReelsCacheFresh(userId)) {
    return readReelsCache(userId);
  }

  const existing = IN_FLIGHT.get(userId);
  if (existing && !force) return existing;

  const cached = readReelsCache(userId);
  const request = fetchReelsNetwork(userId)
    .then((payload) => {
      if (payload?.items?.length) {
        writeReelsCache(userId, payload);
        return payload;
      }
      return cached;
    })
    .catch(() => cached ?? null)
    .finally(() => {
      IN_FLIGHT.delete(userId);
    });

  IN_FLIGHT.set(userId, request);
  return request;
}

/** Append next page into cache + return merged snapshot. */
export async function fetchMoreReelsFeed(userId: string): Promise<ReelsCacheSnapshot | null> {
  if (!userId) return null;
  const current = readReelsCache(userId);
  if (!current?.hasMore || !current.nextCursor) return current;

  const page = await fetchReelsNetwork(userId, current.nextCursor);
  if (!page) return current;

  const seen = new Set(current.items.map((i) => i.id));
  const appended = page.items.filter((i) => !seen.has(i.id));
  const merged: ReelsCacheSnapshot = {
    items: [...current.items, ...appended],
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    cachedAt: Date.now(),
  };
  writeReelsCache(userId, merged);
  return merged;
}

/** Fire-and-forget warm — boot / nav hover. */
export function prefetchReelsFeed(userId: string): void {
  if (!userId || typeof window === 'undefined') return;
  if (isReelsCacheFresh(userId)) return;
  void fetchReelsFeed({ userId });
}
