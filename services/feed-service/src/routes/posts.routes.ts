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
import { buildPostAccessWhere, resolveFeedVisibilityWhere } from '../utils/visibilityScope';
import { buildFeedCursorWhere, decodeFeedCursor, encodeFeedCursor } from '../utils/feedCursor';

const router = Router();
const inFlightFeedResponses = new Map<string, Promise<{ payload: any; etag: string }>>();

// Resolve relative media URLs (e.g. /uploads/...) to absolute URLs using request host
function resolveMediaUrls(urls: string[], req: AuthRequest): string[] {
  if (!urls || urls.length === 0) return [];
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return urls.map(url => {
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    return url;
  });
}

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
    mediaUrls: post.mediaUrls || [],  // Keep ALL URLs — needed for image carousel
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

function normalizeFeedExcludeIds(value: unknown): string[] {
  if (!value) return [];
  return [...new Set(String(value).split(',').map((id) => id.trim()).filter(Boolean))].sort();
}

function hashFeedKeyPart(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

// GET /posts - Get feed posts
router.get('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, subject, cursor, fields, search } = req.query;
    const minimal = fields === 'minimal';
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const rawCursor = typeof cursor === 'string' ? cursor : null;
    const useCursor = Boolean(rawCursor);

    const visibilityWhere = await resolveFeedVisibilityWhere(prismaRead, {
      userId: req.user!.id,
      schoolId: req.user!.schoolId,
    });

    const where: any = {
      AND: [visibilityWhere],
    };

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
      const validPostTypes = ['ARTICLE', 'QUESTION', 'ANNOUNCEMENT', 'POLL', 'ACHIEVEMENT', 'PROJECT', 'COURSE', 'EVENT_CREATED', 'QUIZ', 'EXAM', 'ASSIGNMENT', 'RESOURCE', 'TUTORIAL', 'RESEARCH', 'CLUB_CREATED', 'REFLECTION', 'COLLABORATION'];
      if (validPostTypes.includes(upperSearch)) {
        searchOR.push({ postType: upperSearch });
      }
      where.AND.push({ OR: searchOR });
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
      where.AND.push({ postType: type });
    }

    // Subject filter support
    if (subject && subject !== 'ALL') {
      where.AND.push({
        topicTags: {
          hasSome: [String(subject).toLowerCase()],
        },
      });
    }

    if (rawCursor) {
      let cursorState = decodeFeedCursor(rawCursor);

      if (!cursorState) {
        const cursorPost = await prisma.post.findUnique({
          where: { id: rawCursor },
          select: {
            id: true,
            createdAt: true,
            isPinned: true,
          },
        });

        if (cursorPost) {
          cursorState = {
            id: cursorPost.id,
            createdAt: cursorPost.createdAt.toISOString(),
            isPinned: cursorPost.isPinned,
          };
        }
      }

      const cursorWhere = cursorState ? buildFeedCursorWhere(cursorState) : null;
      if (cursorWhere) {
        where.AND.push(cursorWhere);
      }
    }

    // Phase 1: page through a lightweight row set so the sort can stay index-friendly.
    const postPageRows = await prisma.post.findMany({
      where,
      select: {
        id: true,
        authorId: true,
        postType: true,
        createdAt: true,
        isPinned: true,
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      ...(!useCursor ? {
        skip: (normalizedPage - 1) * normalizedLimit,
      } : {}),
      take: normalizedLimit + 1,
    });

    const hasMore = postPageRows.length > normalizedLimit;
    const pagePostRows = hasMore ? postPageRows.slice(0, normalizedLimit) : postPageRows;
    const postIds = pagePostRows.map((post) => post.id);

    // Phase 2: hydrate only the visible posts for the response payload.
    const hydratedPosts = postIds.length > 0 ? await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: {
        id: true,
        authorId: true,
        content: true,
        mediaUrls: true,
        mediaKeys: true,
        mediaMetadata: true,
        mediaAspectRatio: true,
        postType: true,
        visibility: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        isEdited: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        pollExpiresAt: true,
        pollAllowMultiple: true,
        pollMaxChoices: true,
        pollIsAnonymous: true,
        assignmentDueDate: true,
        assignmentPoints: true,
        assignmentSubmissionType: true,
        courseCode: true,
        courseLevel: true,
        courseDuration: true,
        announcementUrgency: true,
        announcementExpiryDate: true,
        tutorialDifficulty: true,
        tutorialEstimatedTime: true,
        tutorialPrerequisites: true,
        examDate: true,
        examDuration: true,
        examTotalPoints: true,
        examPassingScore: true,
        resourceType: true,
        resourceUrl: true,
        researchField: true,
        researchCollaborators: true,
        projectStatus: true,
        projectDeadline: true,
        projectTeamSize: true,
        mediaDisplayMode: true,
        studyClubId: true,
        difficultyLevel: true,
        questionBounty: true,
        repostComment: true,
        repostOfId: true,
        title: true,
        topicTags: true,
        trendingScore: true,
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
          },
        },
        pollOptions: {
          select: { id: true, text: true, position: true, votesCount: true, createdAt: true },
        },
        quiz: {
          select: {
            id: true,
            timeLimit: true,
            passingScore: true,
            totalPoints: true,
            resultsVisibility: true,
          },
        },
        repostOf: {
          select: {
            id: true,
            authorId: true,
            content: true,
            title: true,
            postType: true,
            mediaUrls: true,
            mediaMetadata: true,
            mediaAspectRatio: true,
            createdAt: true,
            likesCount: true,
            commentsCount: true,
            sharesCount: true,
            isPinned: true,
            repostOfId: true,
            repostComment: true,
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
    }) : [];
    const postsById = new Map(hydratedPosts.map((post) => [post.id, post]));
    const pagePosts = pagePostRows
      .map((post) => postsById.get(post.id))
      .filter((post): post is NonNullable<typeof post> => Boolean(post));

    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 [GET /posts] Query results:', {
        postsFound: pagePosts.length,
        quizPosts: pagePosts.filter(p => p.postType === 'QUIZ').length,
        postTypes: pagePosts.map(p => p.postType),
      });
    }

    // B1 FIX: All 4 user-state lookups run in PARALLEL (was sequential)
    const authorIds = [...new Set(pagePostRows.map(p => p.authorId).filter(id => id !== req.user!.id))];
    const pollPostIds = pagePostRows.filter(p => p.postType === 'POLL').map(p => p.id);
    const quizPostIds = pagePosts.filter(p => p.postType === 'QUIZ' && p.quiz).map(p => p.quiz?.id).filter(Boolean) as string[];

    const [userLikes, userFollows, userVotes, userQuizAttempts] = await Promise.all([
      prismaRead.like.findMany({ where: { postId: { in: postIds }, userId: req.user!.id }, select: { postId: true } }),
      authorIds.length > 0
        ? prismaRead.follow.findMany({ where: { followerId: req.user!.id, followingId: { in: authorIds } }, select: { followingId: true } })
        : Promise.resolve([]),
      pollPostIds.length > 0
        ? prismaRead.pollVote.findMany({ where: { postId: { in: pollPostIds }, userId: req.user!.id }, select: { postId: true, optionId: true } })
        : Promise.resolve([]),
      quizPostIds.length > 0
        ? prismaRead.quizAttempt.findMany({
          where: { quizId: { in: quizPostIds }, userId: req.user!.id },
          orderBy: { submittedAt: 'desc' },
          distinct: ['quizId'],
          select: { id: true, quizId: true, score: true, passed: true, pointsEarned: true, submittedAt: true },
        })
        : Promise.resolve([]),
    ]);

    const likedPostIds = new Set(userLikes.map(l => l.postId));
    const followingSet = new Set(userFollows.map(f => f.followingId));
    const votedOptions = new Map(userVotes.map(v => [v.postId, v.optionId]));
    const quizAttempts = new Map(userQuizAttempts.map(a => [a.quizId, a]));

    const formattedPosts = pagePosts.map(post => ({
      ...post,
      isLikedByMe: likedPostIds.has(post.id),
      isFollowingAuthor: followingSet.has(post.authorId),
      likesCount: post.likesCount ?? 0,
      commentsCount: post.commentsCount ?? 0,
      ...(post.postType === 'POLL' && {
        userVotedOptionId: votedOptions.get(post.id) || null,
      }),
      ...(post.postType === 'QUIZ' && post.quiz && {
        quiz: {
          ...post.quiz,
          userAttempt: quizAttempts.get(post.quiz.id) || null,
        },
      }),
    }));

    const outputPosts = minimal ? formattedPosts.map(stripToMinimal) : formattedPosts;

    // Resolve relative media URLs to absolute
    outputPosts.forEach((p: any) => {
      if (p.mediaUrls) p.mediaUrls = resolveMediaUrls(p.mediaUrls, req as AuthRequest);
    });
    const lastVisiblePost = pagePostRows[pagePostRows.length - 1];
    const nextCursor = hasMore && lastVisiblePost
      ? encodeFeedCursor({
        id: lastVisiblePost.id,
        createdAt: lastVisiblePost.createdAt.toISOString(),
        isPinned: lastVisiblePost.isPinned,
      })
      : null;

    // ETag for 304 Not Modified
    const etag = createETag(outputPosts);
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json({
      success: true,
      data: outputPosts,
      ...(nextCursor ? { nextCursor } : {}),
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        hasMore,
        ...(nextCursor ? { nextCursor } : {}),
      },
    });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get posts', details: error.message });
  }
});

// GET /posts/:postId/difficulty - Get post difficulty score (Gamification Phase 4 API)
router.get('/posts/:postId/difficulty', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await prisma.post.findFirst({
      where: buildPostAccessWhere(postId, {
        userId: req.user!.id,
        schoolId: req.user!.schoolId,
      }),
      select: { difficultyLevel: true, postType: true }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({
      success: true,
      difficultyLevel: post.difficultyLevel ?? 2.5,
      postType: post.postType
    });
  } catch (error: any) {
    console.error('Get post difficulty error:', error);
    res.status(500).json({ success: false, error: 'Failed to get post difficulty' });
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
      cursor,
    } = req.query;
    const normalizedFields = fields === 'minimal' ? 'minimal' : 'full';
    const minimal = normalizedFields === 'minimal';
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const rawCursor = typeof cursor === 'string' ? cursor : null;
    const normalizedExcludeIds = normalizeFeedExcludeIds(excludeIds);
    const excludeKey = normalizedExcludeIds.length > 0
      ? hashFeedKeyPart(normalizedExcludeIds.join(','))
      : 'NONE';
    const cursorKey = rawCursor ? hashFeedKeyPart(rawCursor) : 'NONE';

    const userId = req.user!.id;

    if (process.env.NODE_ENV !== 'production') {
      console.log('🧠 [Feed] Personalized feed request:', {
        userId,
        mode,
        page,
        subject,
      });
    }

    // Check feed response cache first
    const cacheKey = `${userId}:${mode}:${normalizedPage}:${normalizedLimit}:${subject || 'ALL'}:${normalizedFields}:${excludeKey}:${cursorKey}`;
    const cached = await feedCache.get(cacheKey);
    if (cached) {
      const cachedPayload = cached.payload || cached;
      const cachedEtag = cached.etag;
      if (cachedEtag) {
        res.setHeader('ETag', cachedEtag);
      }
      res.setHeader('Cache-Control', 'private, max-age=900, stale-while-revalidate=1800');
      if (cachedEtag && req.headers['if-none-match'] === cachedEtag) {
        return res.status(304).end();
      }
      return res.json(cachedPayload);
    }

    const buildResponse = async (): Promise<{ payload: any; etag: string }> => {
      const result = await feedRanker.generateFeed(userId, {
        mode: String(mode) as 'FOR_YOU' | 'FOLLOWING' | 'RECENT',
        page: normalizedPage,
        limit: normalizedLimit,
        subject: subject ? String(subject) : undefined,
        excludeIds: normalizedExcludeIds,
        cursor: rawCursor || undefined,
      });

      const feedPosts = result.items.filter(i => i.type === 'POST').map(i => i.data as any);
      const postIds = feedPosts.map((sp: any) => sp.post.id);
      const feedAuthorIds = [...new Set(feedPosts.map((sp: any) => sp.post.authorId).filter((id: string) => id !== userId))];
      const pollPostIds = feedPosts.filter((sp: any) => sp.post.postType === 'POLL').map((sp: any) => sp.post.id);
      const quizPostIds = feedPosts
        .filter((sp: any) => sp.post.postType === 'QUIZ' && sp.post.quiz)
        .map((sp: any) => sp.post.quiz?.id)
        .filter(Boolean) as string[];

      const [userLikes, userBookmarks, feedFollows, userVotes, userQuizAttempts] = await Promise.all([
        postIds.length > 0 ? prismaRead.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }) : Promise.resolve([]),
        postIds.length > 0 ? prismaRead.bookmark.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }) : Promise.resolve([]),
        feedAuthorIds.length > 0
          ? prismaRead.follow.findMany({ where: { followerId: userId, followingId: { in: feedAuthorIds } }, select: { followingId: true } })
          : Promise.resolve([]),
        pollPostIds.length > 0
          ? prismaRead.pollVote.findMany({ where: { postId: { in: pollPostIds }, userId }, select: { postId: true, optionId: true } })
          : Promise.resolve([]),
        quizPostIds.length > 0
          ? prismaRead.quizAttempt.findMany({
            where: { quizId: { in: quizPostIds }, userId },
            orderBy: { submittedAt: 'desc' },
            distinct: ['quizId'],
            select: { id: true, quizId: true, score: true, passed: true, pointsEarned: true, submittedAt: true },
          })
          : Promise.resolve([]),
      ]);

      const likedSet = new Set(userLikes.map(l => l.postId));
      const bookmarkedSet = new Set(userBookmarks.map(b => b.postId));
      const feedFollowingSet = new Set(feedFollows.map(f => f.followingId));
      const votedOptions = new Map(userVotes.map(v => [v.postId, v.optionId]));
      const quizAttempts = new Map(userQuizAttempts.map(a => [a.quizId, a]));

      const formattedFeed = result.items.map(item => {
        if (item.type !== 'POST') return item;

        const sp = item.data as any;
        return {
          type: 'POST',
          data: {
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
            topicTags: sp.post.topicTags || [],
            repostOfId: sp.post.repostOfId,
            repostComment: sp.post.repostComment,
            repostOf: sp.post.repostOf,
            author: sp.post.author,
            _count: sp.post._count,
            isLikedByMe: likedSet.has(sp.post.id),
            isBookmarked: bookmarkedSet.has(sp.post.id),
            isFollowingAuthor: feedFollowingSet.has(sp.post.authorId),
            pollOptions: sp.post.pollOptions,
            ...(sp.post.postType === 'POLL' && {
              userVotedOptionId: votedOptions.get(sp.post.id) || null,
            }),
            ...(sp.post.postType === 'QUIZ' && sp.post.quiz && {
              quiz: {
                ...sp.post.quiz,
                userAttempt: quizAttempts.get(sp.post.quiz.id) || null,
              },
            }),
            _score: sp.score,
            _scoreBreakdown: sp.breakdown,
          }
        };
      });

      const outputPosts = minimal ? formattedFeed.map(f => f.type === 'POST' ? { type: 'POST', data: stripToMinimal(f.data) } : f) : formattedFeed;

      outputPosts.forEach((p: any) => {
        if (p.type === 'POST' && p.data.mediaUrls) p.data.mediaUrls = resolveMediaUrls(p.data.mediaUrls, req as AuthRequest);
        if (p.type === 'SUGGESTED_USERS' && p.data) {
          p.data.forEach((u: any) => {
            if (u.profilePictureUrl) {
              const resolved = resolveMediaUrls([u.profilePictureUrl], req as AuthRequest);
              u.profilePictureUrl = resolved.length > 0 ? resolved[0] : u.profilePictureUrl;
            }
          });
        }
        if (p.type === 'SUGGESTED_COURSES' && p.data) {
          p.data.forEach((c: any) => {
            if (c.thumbnailUrl) {
              const resolved = resolveMediaUrls([c.thumbnailUrl], req as AuthRequest);
              c.thumbnailUrl = resolved.length > 0 ? resolved[0] : c.thumbnailUrl;
            }
          });
        }
      });

      // @ts-ignore
      const etag = createETag(outputPosts.filter(p => p.type === 'POST').map(p => p.data));
      const payload = {
        success: true,
        data: outputPosts,
        ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        pagination: {
          page: normalizedPage,
          limit: normalizedLimit,
          hasMore: result.hasMore,
          ...(typeof result.total === 'number'
            ? {
              total: result.total,
              totalPages: Math.ceil(result.total / normalizedLimit),
            }
            : {}),
          ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        },
        meta: {
          mode: String(mode),
          algorithm: 'v1',
        },
      };

      feedCache.set(cacheKey, { payload, etag }).catch(() => { });
      return { payload, etag };
    };

    let responsePromise = inFlightFeedResponses.get(cacheKey);
    if (!responsePromise) {
      responsePromise = buildResponse().finally(() => {
        inFlightFeedResponses.delete(cacheKey);
      });
      inFlightFeedResponses.set(cacheKey, responsePromise);
    }

    const { payload, etag } = await responsePromise;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=900, stale-while-revalidate=1800');

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json(payload);
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

    const batch = (views.slice(0, 50) as { postId: string; duration?: number; source?: string }[])
      .filter(v => v.postId);

    const existingPosts = await prisma.post.findMany({
      where: { id: { in: Array.from(new Set(batch.map(v => v.postId))) } },
      select: { id: true },
    });
    const existingPostIds = new Set(existingPosts.map(post => post.id));
    const validBatch = batch.filter(v => existingPostIds.has(v.postId));

    // Bulk insert all views in one query — skipDuplicates handles re-views within the same session
    await prisma.postView.createMany({
      data: validBatch
        .map(v => ({
          postId: v.postId,
          userId,
          duration: v.duration || 3,
          source: v.source || 'feed',
        })),
      skipDuplicates: true,
    }).catch(() => { }); // Non-critical — analytics, not user-facing

    // Track feed ranker signals in parallel (fire-and-forget)
    Promise.allSettled(
      validBatch
        .map(v => feedRanker.trackAction(userId, v.postId, 'VIEW', v.duration || 3, v.source || 'feed'))
    );

    res.json({ success: true, message: `${batch.length} views tracked` });
  } catch (error: any) {
    console.error('Bulk view tracking error:', error);
    res.status(500).json({ success: false, error: 'Failed to track views' });
  }
});

export default router;
