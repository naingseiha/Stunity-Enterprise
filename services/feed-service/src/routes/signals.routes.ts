/**
 * User Feed Signal Tracking
 * 
 * Helper function for building per-topic interest profiles
 * used by FeedRanker for personalization.
 */

import { prisma } from '../context';

// Score weights per action type
const SIGNAL_WEIGHTS: Record<string, { score: number; field: string }> = {
  view: { score: 1, field: 'viewCount' },
  like: { score: 3, field: 'likeCount' },
  comment: { score: 5, field: 'commentCount' },
  share: { score: 7, field: 'shareCount' },
  bookmark: { score: 4, field: 'bookmarkCount' },
};

/**
 * Update user feed signals based on engagement actions.
 * This builds a per-topic interest profile that FeedRanker uses for personalization.
 */
export async function updateUserFeedSignals(
  userId: string,
  postId: string,
  action: 'view' | 'like' | 'comment' | 'share' | 'bookmark',
  duration?: number
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { topicTags: true, postType: true },
    });

    if (!post) return;

    const topics = [
      ...post.topicTags.map(t => t.toLowerCase()),
      post.postType.toLowerCase(),
    ].filter(Boolean);

    if (topics.length === 0) return;

    const weight = SIGNAL_WEIGHTS[action];
    if (!weight) return;

    // Batch upserts into a single transaction (eliminates N+1)
    await prisma.$transaction(
      topics.map(topic =>
        prisma.userFeedSignal.upsert({
          where: {
            userId_topicId: { userId, topicId: topic },
          },
          create: {
            userId,
            topicId: topic,
            score: weight.score,
            [weight.field]: 1,
            avgViewDuration: action === 'view' && duration ? duration : 0,
            lastInteraction: new Date(),
          },
          update: {
            score: { increment: weight.score },
            [weight.field]: { increment: 1 },
            ...(action === 'view' && duration ? {
              avgViewDuration: duration,
            } : {}),
            lastInteraction: new Date(),
          },
        })
      )
    );
  } catch (error) {
    // Non-critical: log but don't break the main action
    console.error('Failed to update feed signals:', error);
  }
}
