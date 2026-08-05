/**
 * Browser feed cache — stale-while-revalidate for fast first paint.
 * Mirrors mobile feedCache memory (60s fresh) + disk (sessionStorage) layers.
 */

import type { FeedRow } from '@/lib/feed-normalize';

const MEMORY = new Map<string, { rows: FeedRow[]; cachedAt: number; mode: 'ranked' | 'chrono'; cursor: string | null }>();
const FRESH_MS = 60_000;
const MAX_CACHED_ROWS = 80;
const storageKey = (userId: string) => `stunity:feed-cache:v1:${userId}`;

export type FeedCacheSnapshot = {
  rows: FeedRow[];
  cachedAt: number;
  mode: 'ranked' | 'chrono';
  cursor: string | null;
};

function trimRows(rows: FeedRow[]): FeedRow[] {
  let postCount = 0;
  const out: FeedRow[] = [];
  for (const row of rows) {
    out.push(row);
    if (row.kind === 'post') postCount += 1;
    if (postCount >= MAX_CACHED_ROWS) break;
  }
  return out;
}

export function readFeedCache(userId: string): FeedCacheSnapshot | null {
  const mem = MEMORY.get(userId);
  if (mem?.rows?.length) return mem;

  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedCacheSnapshot;
    if (!parsed?.rows?.length || typeof parsed.cachedAt !== 'number') return null;
    MEMORY.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function isFeedCacheFresh(userId: string, now = Date.now()): boolean {
  const snap = readFeedCache(userId);
  if (!snap) return false;
  return now - snap.cachedAt < FRESH_MS;
}

export function writeFeedCache(
  userId: string,
  rows: FeedRow[],
  meta: { mode: 'ranked' | 'chrono'; cursor?: string | null },
): void {
  const snap: FeedCacheSnapshot = {
    rows: trimRows(rows),
    cachedAt: Date.now(),
    mode: meta.mode,
    cursor: meta.cursor ?? null,
  };
  MEMORY.set(userId, snap);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(snap));
  } catch {
    // Quota / private mode — memory cache still helps within the session.
  }
}

export function clearFeedCache(userId: string): void {
  MEMORY.delete(userId);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}
