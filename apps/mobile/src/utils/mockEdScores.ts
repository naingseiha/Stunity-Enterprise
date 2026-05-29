/**
 * Mock Ed-Score injection — prototype data for the Educational Value badge
 * system. Replace with a real backend service once Post.edScore and
 * Post.teacherVerified are denormalized from EducationalValueRating.
 *
 * Deterministic per post id (so the same post always shows the same score
 * across re-renders, not random per render).
 */

import type { FeedItem, Post } from '@/types';

// Simple deterministic hash — same string always produces the same number.
const hashString = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/**
 * Adds mocked edScore + teacherVerified to a single post.
 * Idempotent: posts that already have an edScore are left alone.
 */
const applyMockEdScoreToPost = (post: Post): Post => {
  if (typeof post.edScore === 'number') return post;

  const h = hashString(post.id);
  // Skew toward higher scores so most posts get a badge — feels realistic
  // for a curated educational network. Range: 2.8 → 4.9.
  const raw = 2.8 + (h % 22) / 10;
  const edScore = Math.min(5, Math.max(0, raw));
  const edScoreCount = (h % 80) + 8;
  // ~14% of posts are teacher-verified — rare enough to feel prestigious.
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
 * Walks the feed and adds mocked Ed-Score / verification to every POST item.
 * Non-POST items (carousels, recall cards, etc.) pass through untouched.
 */
export function applyMockEdScores(items: FeedItem[]): FeedItem[] {
  if (!items.length) return items;
  return items.map((item) => {
    if (item.type !== 'POST' || !item.data) return item;
    return { ...item, data: applyMockEdScoreToPost(item.data) };
  });
}
