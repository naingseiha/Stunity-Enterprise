/**
 * Pure merge step for reels engagement hydration.
 *
 * The reels feed route batch-loads, for every post-backed card, the live Post
 * counts, this viewer's Like row, and the grouped reaction counts. This helper
 * folds those three lookups onto each item as a single authoritative
 * `engagement` block — for ALL card types, not just POST.
 *
 * Keeping it pure (no Prisma) means the heart-vs-count consistency invariant
 * is unit-testable without a database: the heart (`isLikedByMe`) and the count
 * (`likesCount`) are always derived from the same source, so they can never
 * disagree the way the old `isLikedByMe`-only patch allowed.
 */

export interface PostCounts {
  likesCount: number;
  commentsCount: number;
}

export interface ReelEngagementBlock {
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  myReaction: string | null;
  reactionCounts: Record<string, number>;
}

/**
 * Returns a new array with a complete `engagement` block on every item that has
 * a `postId`. Items without a `postId` (e.g. BOUNTY) are returned untouched so
 * the client keeps gating their social affordance off (`supportsSocial`).
 */
export function mergeEngagement(
  items: any[],
  countsByPost: Map<string, PostCounts>,
  myReactionByPost: Map<string, string>,
  reactionCountsMap: Map<string, Record<string, number>>,
): any[] {
  return items.map((it) => {
    if (!it.postId) return it;
    const counts = countsByPost.get(it.postId);
    return {
      ...it,
      engagement: {
        likesCount: counts?.likesCount ?? 0,
        commentsCount: counts?.commentsCount ?? 0,
        isLikedByMe: myReactionByPost.has(it.postId),
        myReaction: myReactionByPost.get(it.postId) ?? null,
        reactionCounts: reactionCountsMap.get(it.postId) ?? {},
      } as ReelEngagementBlock,
    };
  });
}
