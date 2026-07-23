/**
 * Per-type reaction breakdown for a batch of posts.
 *
 * The Like table stores one row per (user, post) with a `reactionType`
 * (LIKE / INSIGHTFUL / CELEBRATE / SMART_TAKE). A single grouped query turns
 * that into a `{ type: count }` map per post — the social-proof signal the
 * feed/reels render as a stacked-icon summary. Cheap (one indexed groupBy on
 * postId) and safe to run on the feed hot path behind the existing soft-timeout.
 */

import type { PrismaClient } from '@prisma/client';

export type ReactionCounts = Record<string, number>;

export async function fetchReactionCounts(
  prismaRead: PrismaClient,
  postIds: string[],
): Promise<Map<string, ReactionCounts>> {
  const map = new Map<string, ReactionCounts>();
  if (postIds.length === 0) return map;

  const grouped = await prismaRead.like.groupBy({
    by: ['postId', 'reactionType'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });

  for (const row of grouped as any[]) {
    const type: string = row.reactionType ?? 'LIKE';
    const counts = map.get(row.postId) ?? {};
    counts[type] = row._count._all;
    map.set(row.postId, counts);
  }
  return map;
}
