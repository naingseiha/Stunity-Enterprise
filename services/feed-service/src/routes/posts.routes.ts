/**
 * Posts & Feed Routes
 * 
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead, feedRanker, upload } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from '../utils/r2';
import { feedCache, EventPublisher } from '../redis';

const router = Router();

// ========================================
// POSTS ENDPOINTS
// ========================================

// Helper: strip posts to minimal fields for feed cards (76% smaller payload)
function stripToMinimal(post: any): any {
  return {
    id: post.id,
    title: post.title,
    content: post.content?.slice(0, 300) || '',
    postType: post.postType,
    mediaUrls: post.mediaUrls?.slice(0, 1) || [],
    createdAt: post.createdAt,
    isPinned: post.isPinned,
    likesCount: post.likesCount ?? post._count?.likes ?? 0,
    commentsCount: post.commentsCount ?? post._count?.comments ?? 0,
    sharesCount: post.sharesCount ?? 0,
    isLikedByMe: post.isLikedByMe,
    isFollowingAuthor: post.isFollowingAuthor || false,
    author: post.author ? {
      id: post.author.id,
      firstName: post.author.firstName,
      lastName: post.author.lastName,
      profilePictureUrl: post.author.profilePictureUrl,
      role: post.author.role,
      isVerified: post.author.isVerified,
    } : undefined,
    // Keep type-specific data compact
    ...(post.postType === 'POLL' && { pollOptions: post.pollOptions, userVotedOptionId: post.userVotedOptionId }),
    ...(post.postType === 'QUIZ' && post.quiz && { quiz: post.quiz }),
    ...(post.postType === 'QUIZ' && post.quizData && { quizData: post.quizData }),
    // Repost data
    ...(post.repostOfId && {
      repostOfId: post.repostOfId,
      repostComment: post.repostComment,
      repostOf: post.repostOf,
    }),
  };
}

// Helper: generate ETag from post IDs for 304 Not Modified
function createETag(posts: any[]): string {
  const hash = posts.map(p => p.id).join(',');
  // Simple but effective: hash of IDs + count
  let h = 0;
  for (let i = 0; i < hash.length; i++) {
    h = ((h << 5) - h + hash.charCodeAt(i)) | 0;
  }
  return `"feed-${Math.abs(h).toString(36)}"`;
}

// GET /posts - Get feed posts
router.get('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, subject, cursor, fields, search } = req.query;
    const minimal = fields === 'minimal';
    // Cursor-based pagination: use cursor (last post ID) when available
    const useCursor = cursor && typeof cursor === 'string';

    const where: any = {};

    // Visibility filtering
    if (req.user!.schoolId) {
      // User has a school - show school posts + public posts
      where.OR = [
        { author: { schoolId: req.user!.schoolId } },
        { visibility: 'PUBLIC' },
      ];
    } else {
      // User has no school - show their own posts + public posts
      where.OR = [
        { authorId: req.user!.id },
        { visibility: 'PUBLIC' },
      ];
    }

    // Search filter — search in content, title, tags, and post type
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      const searchOR: any[] = [
        { content: { contains: searchTerm, mode: 'insensitive' } },
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { topicTags: { hasSome: [searchTerm.toLowerCase()] } },
      ];
      // Also match post type (e.g. searching "Quiz" finds QUIZ posts)
      const upperSearch = searchTerm.toUpperCase().replace(/\s+/g, '_');
      const validPostTypes = ['ARTICLE', 'QUESTION', 'ANNOUNCEMENT', 'POLL', 'ACHIEVEMENT', 'PROJECT', 'COURSE', 'EVENT', 'QUIZ', 'EXAM', 'ASSIGNMENT', 'RESOURCE', 'TUTORIAL', 'RESEARCH', 'CLUB_ANNOUNCEMENT', 'REFLECTION', 'COLLABORATION'];
      if (validPostTypes.includes(upperSearch)) {
        searchOR.push({ postType: upperSearch });
      }
      where.AND = [{ OR: searchOR }];
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [GET /posts] Query filters:', {
        userId: req.user!.id,
        userSchoolId: req.user!.schoolId,
        type,
        subject,
        search,
      });
    }

    if (type) {
      where.postType = type;
    }

    // Subject filter support
    if (subject && subject !== 'ALL') {
      where.topicTags = {
        hasSome: [String(subject).toLowerCase()],
      };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
              isVerified: true,
              professionalTitle: true,
              level: true,
              // Note: achievements removed from feed list for performance
              // Fetch them on profile/detail pages only
            },
          },
          pollOptions: {
            include: {
              _count: { select: { votes: true } },
            },
          },
          quiz: {
            select: {
              id: true,
              // questions omitted from feed list — load on post detail
              timeLimit: true,
              passingScore: true,
              totalPoints: true,
              resultsVisibility: true,
            },
          },
          _count: {
            select: { comments: true, likes: true },
          },
          repostOf: {
            select: {
              id: true,
              content: true,
              title: true,
              postType: true,
              mediaUrls: true,
              createdAt: true,
              likesCount: true,
              commentsCount: true,
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePictureUrl: true,
                  role: true,
                  isVerified: true,
                },
              },
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        // Cursor-based pagination (O(1) vs O(N) for offset)
        ...(useCursor ? {
          cursor: { id: cursor as string },
          skip: 1, // Skip the cursor item itself
        } : {
          skip: (Number(page) - 1) * Number(limit),
        }),
        take: Number(limit),
      }),
      prisma.post.count({ where }),
    ]);

    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 [GET /posts] Query results:', {
        postsFound: posts.length,
        totalCount: total,
        quizPosts: posts.filter(p => p.postType === 'QUIZ').length,
        postTypes: posts.map(p => p.postType),
      });
    }

    // Check if current user liked each post
    const postIds = posts.map(p => p.id);
    const userLikes = await prisma.like.findMany({
      where: {
        postId: { in: postIds },
        userId: req.user!.id,
      },
      select: { postId: true },
    });
    const likedPostIds = new Set(userLikes.map(l => l.postId));

    // Check which post authors the current user follows
    const authorIds = [...new Set(posts.map(p => p.authorId).filter(id => id !== req.user!.id))];
    const userFollows = authorIds.length > 0 ? await prisma.follow.findMany({
      where: { followerId: req.user!.id, followingId: { in: authorIds } },
      select: { followingId: true },
    }) : [];
    const followingSet = new Set(userFollows.map(f => f.followingId));

    // Check if current user voted on any polls
    const pollPostIds = posts.filter(p => p.postType === 'POLL').map(p => p.id);
    const userVotes = pollPostIds.length > 0 ? await prisma.pollVote.findMany({
      where: {
        postId: { in: pollPostIds },
        userId: req.user!.id,
      },
      select: { postId: true, optionId: true },
    }) : [];
    const votedOptions = new Map(userVotes.map(v => [v.postId, v.optionId]));

    // Check if current user has taken any quizzes
    const quizPostIds = posts.filter(p => p.postType === 'QUIZ' && p.quiz).map(p => p.quiz?.id).filter(Boolean);
    const userQuizAttempts = quizPostIds.length > 0 ? await prisma.quizAttempt.findMany({
      where: {
        quizId: { in: quizPostIds as string[] },
        userId: req.user!.id,
      },
      orderBy: { submittedAt: 'desc' },
      distinct: ['quizId'],
      select: {
        id: true,
        quizId: true,
        score: true,
        passed: true,
        pointsEarned: true,
        submittedAt: true,
      },
    }) : [];
    const quizAttempts = new Map(userQuizAttempts.map(a => [a.quizId, a]));

    const formattedPosts = posts.map(post => ({
      ...post,
      isLikedByMe: likedPostIds.has(post.id),
      isFollowingAuthor: followingSet.has(post.authorId),
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      // Add userVotedOptionId for polls
      ...(post.postType === 'POLL' && {
        userVotedOptionId: votedOptions.get(post.id) || null,
      }),
      // Add userAttempt for quizzes
      ...(post.postType === 'QUIZ' && post.quiz && {
        quiz: {
          ...post.quiz,
          userAttempt: quizAttempts.get(post.quiz.id) || null,
        },
      }),
    }));

    const outputPosts = minimal ? formattedPosts.map(stripToMinimal) : formattedPosts;

    // ETag for 304 Not Modified
    const etag = createETag(outputPosts);
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json({
      success: true,
      data: outputPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: posts.length === Number(limit),
        // Include last post ID for cursor-based pagination
        ...(posts.length > 0 && { nextCursor: posts[posts.length - 1].id }),
      },
    });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get posts', details: error.message });
  }
});

// ========================================
// PERSONALIZED FEED (ranked)
// ========================================

// GET /posts/feed - Personalized ranked feed
router.get('/posts/feed', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      mode = 'FOR_YOU',
      page = 1,
      limit = 20,
      subject,
      excludeIds,
      fields,
    } = req.query;
    const minimal = fields === 'minimal';

    const userId = req.user!.id;

    if (process.env.NODE_ENV !== 'production') {
      console.log('🧠 [Feed] Personalized feed request:', {
        userId,
        mode,
        page,
        subject,
      });
    }

    // Check Redis cache first (30s TTL)
    const cacheKey = `${userId}:${mode}:${page}:${subject || 'ALL'}`;
    const cached = await feedCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await feedRanker.generateFeed(userId, {
      mode: String(mode) as 'FOR_YOU' | 'FOLLOWING' | 'RECENT',
      page: Number(page),
      limit: Number(limit),
      subject: subject ? String(subject) : undefined,
      excludeIds: excludeIds ? String(excludeIds).split(',') : [],
    });

    // Check which posts the user has liked/bookmarked
    const postIds = result.posts.map(sp => sp.post.id);
    const [userLikes, userBookmarks] = await Promise.all([
      prisma.like.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      prisma.bookmark.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);
    const likedSet = new Set(userLikes.map(l => l.postId));
    const bookmarkedSet = new Set(userBookmarks.map(b => b.postId));

    // Check which post authors the current user follows
    const feedAuthorIds = [...new Set(result.posts.map(sp => sp.post.authorId).filter(id => id !== userId))];
    const feedFollows = feedAuthorIds.length > 0 ? await prisma.follow.findMany({
      where: { followerId: userId, followingId: { in: feedAuthorIds } },
      select: { followingId: true },
    }) : [];
    const feedFollowingSet = new Set(feedFollows.map(f => f.followingId));

    // Check if current user voted on any polls
    const pollPostIds = result.posts.filter(sp => sp.post.postType === 'POLL').map(sp => sp.post.id);
    const userVotes = pollPostIds.length > 0 ? await prisma.pollVote.findMany({
      where: {
        postId: { in: pollPostIds },
        userId,
      },
      select: { postId: true, optionId: true },
    }) : [];
    const votedOptions = new Map(userVotes.map(v => [v.postId, v.optionId]));

    // Check if current user has taken any quizzes
    const quizPostIds = result.posts
      .filter(sp => sp.post.postType === 'QUIZ' && (sp.post as any).quiz)
      .map(sp => (sp.post as any).quiz?.id)
      .filter(Boolean);
    const userQuizAttempts = quizPostIds.length > 0 ? await prisma.quizAttempt.findMany({
      where: {
        quizId: { in: quizPostIds as string[] },
        userId,
      },
      orderBy: { submittedAt: 'desc' },
      distinct: ['quizId'],
      select: {
        id: true,
        quizId: true,
        score: true,
        passed: true,
        pointsEarned: true,
        submittedAt: true,
      },
    }) : [];
    const quizAttempts = new Map(userQuizAttempts.map(a => [a.quizId, a]));

    // Format response to match existing mobile expectations
    const formattedPosts = result.posts.map(sp => ({
      id: sp.post.id,
      content: sp.post.content,
      title: sp.post.title,
      postType: sp.post.postType,
      visibility: sp.post.visibility,
      mediaUrls: sp.post.mediaUrls,
      mediaKeys: sp.post.mediaKeys,
      mediaDisplayMode: sp.post.mediaDisplayMode,
      likesCount: sp.post.likesCount,
      commentsCount: sp.post.commentsCount,
      sharesCount: sp.post.sharesCount,
      isPinned: sp.post.isPinned,
      isEdited: sp.post.isEdited,
      createdAt: sp.post.createdAt,
      updatedAt: sp.post.updatedAt,
      topicTags: (sp.post as any).topicTags || [],
      repostOfId: (sp.post as any).repostOfId,
      repostComment: (sp.post as any).repostComment,
      repostOf: (sp.post as any).repostOf,
      author: sp.post.author,
      _count: sp.post._count,
      isLikedByMe: likedSet.has(sp.post.id),
      isBookmarked: bookmarkedSet.has(sp.post.id),
      isFollowingAuthor: feedFollowingSet.has(sp.post.authorId),
      // Poll data
      pollOptions: (sp.post as any).pollOptions,
      ...(sp.post.postType === 'POLL' && {
        userVotedOptionId: votedOptions.get(sp.post.id) || null,
      }),
      // Quiz data
      ...((sp.post.postType === 'QUIZ' && (sp.post as any).quiz) && {
        quiz: {
          ...(sp.post as any).quiz,
          userAttempt: quizAttempts.get((sp.post as any).quiz.id) || null,
        },
      }),
      // Score metadata (useful for debugging / transparency)
      _score: sp.score,
      _scoreBreakdown: sp.breakdown,
    }));

    const outputPosts = minimal ? formattedPosts.map(stripToMinimal) : formattedPosts;

    // ETag for 304 Not Modified
    const etag = createETag(outputPosts);
    res.setHeader('ETag', etag);
    
    // Cache-Control: Personalized feed caches for 15 minutes
    res.setHeader('Cache-Control', 'private, max-age=900, stale-while-revalidate=1800');
    
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json({
      success: true,
      data: outputPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
        hasMore: result.hasMore,
      },
      meta: {
        mode: String(mode),
        algorithm: 'v1',
      },
    });

    // Cache response in background (don't block response)
    const responseData = {
      success: true,
      data: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
        hasMore: result.hasMore,
      },
      meta: { mode: String(mode), algorithm: 'v1' },
    };
    feedCache.set(cacheKey, responseData).catch(() => { });
  } catch (error: any) {
    console.error('Get personalized feed error:', error);
    res.status(500).json({ success: false, error: 'Failed to get personalized feed', details: error.message });
  }
});

// POST /feed/track-action - Track user engagement signal
router.post('/feed/track-action', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { action, postId, duration, source } = req.body;
    const userId = req.user!.id;

    if (!action || !postId) {
      return res.status(400).json({ success: false, error: 'action and postId are required' });
    }

    const validActions = ['VIEW', 'LIKE', 'COMMENT', 'SHARE', 'BOOKMARK'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    await feedRanker.trackAction(userId, postId, action, duration, source);

    res.json({ success: true, message: 'Action tracked' });
  } catch (error: any) {
    console.error('Track action error:', error);
    res.status(500).json({ success: false, error: 'Failed to track action' });
  }
});

// POST /feed/track-views - Bulk view tracking (batched from mobile client)
// Replaces per-post individual view requests. At 10K users × 20 posts = 400K → ~40K batched requests.
router.post('/feed/track-views', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { views } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(views) || views.length === 0) {
      return res.status(400).json({ success: false, error: 'views array is required' });
    }

    // Cap batch size to prevent abuse
    const batch = views.slice(0, 50);

    // Process all views in parallel — fire-and-forget DB writes + feed ranker signals
    await Promise.allSettled(
      batch.map(async (view: { postId: string; duration?: number; source?: string }) => {
        if (!view.postId) return;

        // Record view in DB (upsert to avoid duplicates within session)
        await prisma.postView.create({
          data: {
            postId: view.postId,
            userId,
            duration: view.duration || 3,
            source: view.source || 'feed',
          },
        }).catch(() => { }); // Ignore duplicates

        // Update view count on post
        await prisma.post.update({
          where: { id: view.postId },
          data: { likesCount: { increment: 0 } }, // Touch updatedAt without real change
        }).catch(() => { });

        // Track for feed algorithm
        await feedRanker.trackAction(userId, view.postId, 'VIEW', view.duration || 3, view.source || 'feed');
      })
    );

    res.json({ success: true, message: `${batch.length} views tracked` });
  } catch (error: any) {
    console.error('Bulk view tracking error:', error);
    res.status(500).json({ success: false, error: 'Failed to track views' });
  }
});

export default router;
