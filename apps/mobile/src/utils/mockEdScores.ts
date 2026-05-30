/**
 * Ed-Score visual fallback — only active in __DEV__ mode.
 *
 * In production, Post.edScore and Post.teacherVerified arrive from the
 * backend (posts.routes.ts:stripToMinimal now includes them explicitly).
 * Posts without real ratings arrive with edScore = null → no badge renders.
 * That is correct production behaviour: only genuinely-rated posts show
 * the badge; unrated posts are silently un-badged.
 *
 * In __DEV__, the hash fallback makes the badge visible for testing so
 * developers can see it without needing real ratings in the local DB.
 *
 * Rule: NEVER call this in production (applyMockEdScores is a no-op
 * pass-through when __DEV__ is false).
 */

import type { FeedItem, Post } from '@/types';

const hashString = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const applyDevFallback = (post: Post): Post => {
  // Never overwrite real data from the backend.
  if (typeof post.edScore === 'number') return post;

  const h = hashString(post.id);
  const raw = 2.8 + (h % 22) / 10;
  const edScore = Math.min(5, Math.max(0, raw));
  const edScoreCount = (h % 80) + 8;
  const teacherVerified = h % 7 === 0;

  return {
    ...post,
    edScore,
    edScoreCount,
    teacherVerified,
    teacherVerifiedBy: teacherVerified
      ? { id: 'mock-teacher', name: 'Ms. Sopheap', role: 'TEACHER' }
      : undefined,
  };
};

/**
 * In production: pure pass-through (no mock data injected).
 * In __DEV__: fills in hash-based fallback for posts without real ratings
 *            so developers can see the badge UI without needing DB ratings.
 */
export function applyMockEdScores(items: FeedItem[]): FeedItem[] {
  if (!items.length) return items;
  // Production: return as-is. Real badges come from the backend.
  if (!__DEV__) return items;
  // Dev only: apply hash fallback for posts missing real scores.
  return items.map((item) => {
    if (item.type !== 'POST' || !item.data) return item;
    return { ...item, data: applyDevFallback(item.data) };
  });
}
