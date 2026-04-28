/**
 * Post Actions Routes
 * 
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma, prismaRead, feedRanker, upload } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from '../utils/r2';
import { feedCache, EventPublisher } from '../redis';
import { updateUserFeedSignals } from './signals.routes';
import { createPostSchema, createCommentSchema } from '../validators/post.validator';
import { resolveFeedVisibilityWhere } from '../utils/visibilityScope';

const router = Router();
const EDUCATIONAL_VALUE_DIFFICULTIES = new Set(['too_easy', 'just_right', 'too_hard']);

const normalizeRating = (value: unknown): number | null => {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
};

const normalizeDifficulty = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return EDUCATIONAL_VALUE_DIFFICULTIES.has(value) ? value : null;
};

const runAfterResponse = (label: string, task: () => Promise<void> | void): void => {
  setImmediate(() => {
    Promise.resolve(task()).catch((error) => {
      console.error(`[post-actions] ${label} failed:`, error);
    });
  });
};

const resolveRequestVisibilityWhere = (req: AuthRequest): Promise<Prisma.PostWhereInput> =>
  resolveFeedVisibilityWhere(prismaRead, {
    userId: req.user!.id,
    schoolId: req.user!.schoolId,
  });

const buildResolvedPostAccessWhere = async (
  postId: string,
  req: AuthRequest
): Promise<Prisma.PostWhereInput> => ({
  AND: [
    { id: postId },
    await resolveRequestVisibilityWhere(req),
  ],
});

const hasFastPostAccess = (
  post: { authorId: string; visibility: string; schoolId: string | null },
  req: AuthRequest
): boolean => (
  post.authorId === req.user!.id ||
  post.visibility === 'PUBLIC' ||
  (post.visibility === 'SCHOOL' && !!post.schoolId && post.schoolId === req.user!.schoolId)
);

const findAccessiblePost = async (
  postId: string,
  req: AuthRequest,
  select: Prisma.PostSelect,
  client: typeof prisma = prisma
) => {
  const baseSelect: Prisma.PostSelect = {
    ...select,
    id: true,
    authorId: true,
    visibility: true,
    schoolId: true,
  };

  const post = await client.post.findUnique({
    where: { id: postId },
    select: baseSelect,
  });

  if (!post) return null;
  if (hasFastPostAccess(post as { authorId: string; visibility: string; schoolId: string | null }, req)) {
    return post;
  }

  const accessWhere = await buildResolvedPostAccessWhere(postId, req);
  return client.post.findFirst({
    where: accessWhere,
    select: baseSelect,
  });
};

// POST /posts - Create new post
router.post('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(e => e.message).join('; ') || 'Validation failed';
      return res.status(400).json({ success: false, error: msg });
    }
    const { content, title, postType, visibility, mediaUrls, mediaDisplayMode, pollOptions, quizData, topicTags, deadline, pollSettings } = parsed.data;

    console.log('📝 Creating post:', {
      postType,
      visibility,
      authorId: req.user!.id,
      authorSchoolId: req.user!.schoolId,
      hasQuizData: !!quizData,
      topicTags,
      quizDataKeys: quizData ? Object.keys(quizData) : []
    });

    // Calculate deadline from poll duration if needed
    let resolvedDeadline = deadline;
    if (!resolvedDeadline && postType === 'POLL' && pollSettings?.duration) {
      const now = new Date();
      now.setHours(now.getHours() + pollSettings.duration);
      resolvedDeadline = now.toISOString();
    }

    // Map deadline to the correct schema field based on post type
    const deadlineFields: Record<string, any> = {};
    if (resolvedDeadline) {
      const deadlineDate = new Date(resolvedDeadline);
      if (postType === 'POLL') deadlineFields.pollExpiresAt = deadlineDate;
      else if (postType === 'PROJECT') deadlineFields.projectDeadline = deadlineDate;
      else if (postType === 'ANNOUNCEMENT') deadlineFields.announcementExpiryDate = deadlineDate;
      else if (postType === 'ASSIGNMENT') deadlineFields.assignmentDueDate = deadlineDate;
    }

    // Handle Question Bounties
    let resolvedBounty = 0;
    const requestedBounty = req.body.questionBounty ? parseInt(req.body.questionBounty, 10) : 0;

    if (postType === 'QUESTION' && requestedBounty > 0) {
      // Fetch user to check balance
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { totalPoints: true }
      });

      if (!user || user.totalPoints < requestedBounty) {
        return res.status(400).json({ success: false, error: 'Insufficient Diamonds for this bounty' });
      }

      resolvedBounty = requestedBounty;
    }

    const postData: any = {
      authorId: req.user!.id,
      schoolId: req.user!.schoolId || null,
      content: content,
      title: title ?? undefined,
      postType,
      visibility,
      mediaUrls,
      mediaDisplayMode,
      topicTags: topicTags ?? [],
      questionBounty: resolvedBounty,
      ...deadlineFields,
    };

    // Use transaction if deducting bounties, otherwise create directly
    let post;
    const postCreateArgs = {
      data: {
        ...postData,
        pollOptions: postType === 'POLL' && pollOptions?.length > 0 ? {
          create: pollOptions.map((text: string, index: number) => ({
            text,
            position: index,
          })),
        } : undefined,
        quiz: postType === 'QUIZ' && quizData ? {
          create: {
            questions: quizData.questions || [],
            timeLimit: quizData.timeLimit ?? 0,
            passingScore: quizData.passingScore ?? 70,
            totalPoints: quizData.totalPoints ?? 0,
            resultsVisibility: quizData.resultsVisibility || 'AFTER_SUBMISSION',
            shuffleQuestions: quizData.shuffleQuestions || false,
            shuffleAnswers: quizData.shuffleAnswers || false,
            maxAttempts: quizData.maxAttempts ?? null,
            showReview: quizData.showReview !== undefined ? quizData.showReview : true,
            showExplanations: quizData.showExplanations !== undefined ? quizData.showExplanations : true,
          },
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
          },
        },
        pollOptions: true,
        quiz: true,
        _count: { select: { comments: true, likes: true } },
      },
    };

    if (resolvedBounty > 0) {
      const [deductedUser, createdPost] = await prisma.$transaction([
        prisma.user.update({
          where: { id: req.user!.id },
          data: { totalPoints: { decrement: resolvedBounty } }
        }),
        prisma.post.create(postCreateArgs)
      ]);
      post = createdPost;
    } else {
      post = await prisma.post.create(postCreateArgs);
    }

    console.log('✅ Post created:', {
      id: post.id,
      postType: post.postType,
      visibility: post.visibility,
      authorId: post.authorId,
      hasQuiz: !!post.quiz,
      quizId: post.quiz?.id,
    });

    res.status(201).json({
      success: true,
      data: {
        ...post,
        isLikedByMe: false,
        likesCount: 0,
        commentsCount: 0,
      },
    });

    runAfterResponse('new post fanout', async () => {
      const followers = await prismaRead.follow.findMany({
        where: { followingId: req.user!.id },
        select: { followerId: true }
      });
      const followerIds = followers.map(f => f.followerId);
      if (followerIds.length > 0) {
        await EventPublisher.newPost(
          req.user!.id,
          followerIds,
          post.id,
          content.slice(0, 100)
        );
      }
      await Promise.all([
        feedCache.invalidateUser(req.user!.id),
        ...followerIds.map(id => feedCache.invalidateUser(id)),
      ]);
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ success: false, error: 'Failed to create post', details: error.message });
  }
});

// GET /posts/:id - Get single post
router.get('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const timings: Record<string, number> = {};
  const routeStartedAt = Date.now();
  const timeStep = async <T>(label: string, task: () => Promise<T>): Promise<T> => {
    const startedAt = Date.now();
    try {
      return await task();
    } finally {
      timings[label] = Date.now() - startedAt;
    }
  };

  try {
    const post = await timeStep('post', () => findAccessiblePost(req.params.id, req, {
      id: true,
      authorId: true,
      content: true,
      title: true,
      postType: true,
      visibility: true,
      mediaUrls: true,
      mediaDisplayMode: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      isPinned: true,
      isEdited: true,
      createdAt: true,
      updatedAt: true,
      topicTags: true,
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
      repostOf: {
        select: {
          id: true,
          authorId: true,
          content: true,
          title: true,
          postType: true,
          mediaUrls: true,
          createdAt: true,
          likesCount: true,
          commentsCount: true,
          sharesCount: true,
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
    }, prismaRead));

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const [userStateRows, pollRows, quiz] = await Promise.all([
      timeStep('userState', () => prismaRead.$queryRaw<Array<{ isLiked: boolean; isBookmarked: boolean }>>`
        SELECT
          EXISTS(SELECT 1 FROM likes WHERE "postId" = ${post.id} AND "userId" = ${req.user!.id}) AS "isLiked",
          EXISTS(SELECT 1 FROM bookmarks WHERE "postId" = ${post.id} AND "userId" = ${req.user!.id}) AS "isBookmarked"
      `),
      post.postType === 'POLL'
        ? timeStep('pollOptions', () => prismaRead.$queryRaw<Array<{
          id: string;
          text: string;
          position: number;
          createdAt: Date;
          votes: number;
          userVotedOptionId: string | null;
        }>>`
          SELECT
            po.id,
            po.text,
            po.position,
            po."createdAt",
            COUNT(pv.id)::int AS votes,
            MAX(CASE WHEN pv."userId" = ${req.user!.id} THEN po.id ELSE NULL END) AS "userVotedOptionId"
          FROM poll_options po
          LEFT JOIN poll_votes pv ON pv."optionId" = po.id
          WHERE po."postId" = ${post.id}
          GROUP BY po.id, po.text, po.position, po."createdAt"
          ORDER BY po.position ASC
        `)
        : Promise.resolve([]),
      post.postType === 'QUIZ'
        ? timeStep('quiz', () => prismaRead.quiz.findUnique({
          where: { postId: post.id },
          select: {
            id: true,
            questions: true,
            timeLimit: true,
            passingScore: true,
            totalPoints: true,
            resultsVisibility: true,
            shuffleQuestions: true,
            shuffleAnswers: true,
            maxAttempts: true,
            showReview: true,
            showExplanations: true,
            attempts: {
              where: { userId: req.user!.id },
              orderBy: { submittedAt: 'desc' },
              take: 1,
              select: { id: true, quizId: true, score: true, passed: true, pointsEarned: true, submittedAt: true },
            },
          },
        }))
        : Promise.resolve(null),
    ]);
    const userState = userStateRows[0] || { isLiked: false, isBookmarked: false };
    const userVotedOptionId = pollRows.find((option) => option.userVotedOptionId)?.userVotedOptionId || null;
    const pollOptions = pollRows.map(({ userVotedOptionId: _userVotedOptionId, ...option }) => option);

    const totalDuration = Date.now() - routeStartedAt;
    if (totalDuration > 2000 || process.env.LOG_LEVEL === 'debug') {
      console.warn('[POST DETAIL TIMING]', JSON.stringify({
        postId: req.params.id,
        postType: post.postType,
        totalDuration,
        timings,
      }));
    }

    res.json({
      success: true,
      data: {
        ...post,
        pollOptions,
        quiz: quiz ? {
          ...quiz,
          userAttempt: quiz.attempts?.[0] || null,
          attempts: undefined,
        } : undefined,
        isLikedByMe: userState.isLiked,
        isBookmarked: userState.isBookmarked,
        likesCount: post.likesCount ?? 0,
        commentsCount: post.commentsCount ?? 0,
        ...(post.postType === 'POLL' && { userVotedOptionId }),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get post' });
  }
});

// POST /posts/:id/like - Like/unlike a post
router.post('/posts/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user!.id;
    const targetPost = await findAccessiblePost(postId, req, { id: true, authorId: true });

    if (!targetPost) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: targetPost.id,
          userId,
        },
      },
      select: { id: true },
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.like.delete({
          where: {
            postId_userId: {
              postId: targetPost.id,
              userId,
            },
          },
        }),
        prisma.post.update({
          where: { id: targetPost.id },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      res.json({ success: true, liked: false, message: 'Post unliked' });
      runAfterResponse('unlike cache invalidation', async () => {
        await Promise.all([
          feedCache.invalidateUser(userId),
          feedCache.invalidateUser(targetPost.authorId),
        ]);
      });
    } else {
      // Like
      await prisma.$transaction([
        prisma.like.create({
          data: { postId: targetPost.id, userId },
        }),
        prisma.post.update({
          where: { id: targetPost.id },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      res.json({ success: true, liked: true, message: 'Post liked' });
      runAfterResponse('like side effects', async () => {
        await Promise.all([
          feedCache.invalidateUser(userId),
          feedCache.invalidateUser(targetPost.authorId),
          updateUserFeedSignals(userId, targetPost.id, 'like'),
        ]);

        if (targetPost.authorId === userId) return;

        const liker = await prismaRead.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        if (!liker) return;

        const likerName = `${liker.firstName} ${liker.lastName}`;
        await prisma.notification.create({
          data: {
            recipientId: targetPost.authorId,
            actorId: userId,
            type: 'LIKE',
            title: 'New Like',
            message: `${likerName} liked your post`,
            postId: targetPost.id,
            link: `/posts/${targetPost.id}`,
          },
        });

        await EventPublisher.newLike(targetPost.authorId, userId, likerName, targetPost.id);
      });
    }
  } catch (error: any) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, error: 'Failed to like post' });
  }
});

// POST /posts/:id/value - Submit educational value rating for a post
router.post('/posts/:id/value', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user!.id;
    const accuracy = normalizeRating(req.body.accuracy);
    const helpfulness = normalizeRating(req.body.helpfulness);
    const clarity = normalizeRating(req.body.clarity);
    const depth = normalizeRating(req.body.depth);
    const difficulty = normalizeDifficulty(req.body.difficulty);
    const wouldRecommend = Boolean(req.body.wouldRecommend);

    // Validate ratings
    if (!accuracy || !helpfulness || !clarity || !depth) {
      return res.status(400).json({
        success: false,
        error: 'All rating dimensions must be whole numbers from 1 to 5'
      });
    }

    // Verify post exists
    const post = await findAccessiblePost(postId, req, { id: true, authorId: true });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Calculate average rating
    const averageRating = Math.round(((accuracy + helpfulness + clarity + depth) / 4) * 100) / 100;

    const result = await prisma.$transaction(async (tx) => {
      const rating = await tx.educationalValueRating.upsert({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        create: {
          postId,
          userId,
          accuracy,
          helpfulness,
          clarity,
          depth,
          difficulty,
          wouldRecommend,
          averageRating,
        },
        update: {
          accuracy,
          helpfulness,
          clarity,
          depth,
          difficulty,
          wouldRecommend,
          averageRating,
        },
      });

      const aggregate = await tx.educationalValueRating.aggregate({
        where: { postId },
        _avg: { averageRating: true },
        _count: { _all: true },
      });

      return {
        rating,
        ratingCount: aggregate._count._all,
        postAverageRating: Math.round((aggregate._avg.averageRating || averageRating) * 100) / 100,
      };
    });

    Promise.all([
      feedCache.invalidateUser(userId),
      feedCache.invalidateUser(post.authorId),
    ]).catch(() => { });

    res.json({
      success: true,
      message: 'Educational value rating submitted',
      data: {
        ratingId: result.rating.id,
        averageRating: result.rating.averageRating,
        postAverageRating: result.postAverageRating,
        ratingCount: result.ratingCount,
      },
    });
  } catch (error: any) {
    console.error('Submit value error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit value rating' });
  }
});

// GET /posts/:id/comments - Get post comments
router.get('/posts/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = (pageNumber - 1) * limitNumber;
    const includeTotal = req.query.includeTotal !== 'false';
    const take = includeTotal ? limitNumber : limitNumber + 1;
    const targetPost = await findAccessiblePost(req.params.id, req, { id: true }, prismaRead);

    if (!targetPost) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const [rawComments, totalResult] = await Promise.all([
      prismaRead.comment.findMany({
        where: { postId: targetPost.id, parentId: null },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePictureUrl: true,
                },
              },
            },
            take: 3,
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      includeTotal
        ? prismaRead.comment.count({ where: { postId: targetPost.id, parentId: null } })
        : Promise.resolve(null),
    ]);
    const comments = rawComments.slice(0, limitNumber);
    const hasMore = includeTotal
      ? pageNumber * limitNumber < (totalResult ?? 0)
      : rawComments.length > limitNumber;
    const total = totalResult ?? skip + comments.length + (hasMore ? 1 : 0);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: includeTotal ? Math.ceil(total / limitNumber) : pageNumber + (hasMore ? 1 : 0),
        hasMore,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get comments' });
  }
});

// POST /posts/:id/comments - Add comment
router.post('/posts/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(e => e.message).join('; ') || 'Validation failed';
      return res.status(400).json({ success: false, error: msg });
    }
    const { content, parentId } = parsed.data;
    const targetPost = await findAccessiblePost(req.params.id, req, { id: true, authorId: true });

    if (!targetPost) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const [newComment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId: targetPost.id,
          authorId: req.user!.id,
          content,
          parentId: parentId ?? null,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            },
          },
        },
      }),
      prisma.post.update({
        where: { id: targetPost.id },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ success: true, data: newComment });
    runAfterResponse('comment side effects', async () => {
      await Promise.all([
        feedCache.invalidateUser(req.user!.id),
        feedCache.invalidateUser(targetPost.authorId),
        updateUserFeedSignals(req.user!.id, targetPost.id, 'comment'),
      ]);

      if (!newComment.author || targetPost.authorId === req.user!.id) return;

      const commenterName = `${newComment.author.firstName} ${newComment.author.lastName}`;
      const preview = content.trim().slice(0, 80);
      await prisma.notification.create({
        data: {
          recipientId: targetPost.authorId,
          actorId: req.user!.id,
          type: 'COMMENT',
          title: 'New Comment',
          message: `${commenterName} commented: "${preview}"`,
          postId: targetPost.id,
          commentId: newComment.id,
          link: `/posts/${targetPost.id}`,
        },
      });

      await EventPublisher.newComment(
        targetPost.authorId, req.user!.id, commenterName,
        targetPost.id, newComment.id, content.trim()
      );
    });
  } catch (error: any) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// POST /posts/:postId/comments/:commentId/verify - Verify answer and release bounty
router.post('/posts/:postId/comments/:commentId/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user!.id;

    // 1. Get post and verify authorization / state
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, postType: true, questionBounty: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.postType !== 'QUESTION') {
      return res.status(400).json({ success: false, error: 'Only questions can have verified answers' });
    }

    if (post.authorId !== userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Only the author can verify an answer' });
    }

    // 2. Get comment and verify it belongs to this post
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { postId: true, authorId: true, isVerifiedAnswer: true },
    });

    if (!comment || comment.postId !== postId) {
      return res.status(400).json({ success: false, error: 'Invalid comment' });
    }

    if (comment.isVerifiedAnswer) {
      return res.status(400).json({ success: false, error: 'Comment is already verified' });
    }

    // Prevent author from verifying their own comment to farm diamonds
    if (comment.authorId === post.authorId) {
      return res.status(400).json({ success: false, error: 'You cannot verify your own answer' });
    }

    // 3. Prevent verifying multiple answers
    const existingVerified = await prisma.comment.findFirst({
      where: { postId: postId, isVerifiedAnswer: true }
    });

    if (existingVerified) {
      return res.status(400).json({ success: false, error: 'This question already has a verified answer' });
    }

    // 4. Mark comment as verified and transfer bounty (transaction)
    const transaction = [
      prisma.comment.update({
        where: { id: commentId },
        data: { isVerifiedAnswer: true },
      })
    ];

    if (post.questionBounty && post.questionBounty > 0) {
      transaction.push(
        prisma.user.update({
          where: { id: comment.authorId },
          data: { totalPoints: { increment: post.questionBounty } }
        }) as any
      );
    }

    await prisma.$transaction(transaction);

    // 5. Send notification to the comment author
    const postAuthor = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    const authorName = postAuthor ? `${postAuthor.firstName} ${postAuthor.lastName}` : 'Someone';
    const message = post.questionBounty && post.questionBounty > 0
      ? `${authorName} verified your answer and awarded you ${post.questionBounty} Diamonds! 💎`
      : `${authorName} marked your answer as verified! ✅`;

    await prisma.notification.create({
      data: {
        recipientId: comment.authorId,
        actorId: userId,
        type: 'ACHIEVEMENT_EARNED', // Reusing ACHIEVEMENT_EARNED type for positive gamification events
        title: 'Answer Verified!',
        message: message,
        postId: postId,
        commentId: commentId,
        link: `/posts/${postId}`,
      }
    }).catch(err => console.error('Failed to create verification notification:', err));

    res.json({ success: true, message: 'Answer verified successfully' });
  } catch (error: any) {
    console.error('Verify answer error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify answer' });
  }
});

// DELETE /posts/:id - Delete post (only author)
router.delete('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await prisma.post.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Post deleted' });
    runAfterResponse('delete post cache invalidation', async () => {
      await feedCache.invalidateUser(post.authorId);
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// POST /posts/:id/vote - Vote on poll (allows changing vote)
router.post('/posts/:id/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { optionId } = req.body;
    const postId = req.params.id;
    const userId = req.user!.id;

    // Check if post is a poll
    const post = await findAccessiblePost(postId, req, {
      id: true,
      authorId: true,
      postType: true,
      pollAllowMultiple: true,
      pollOptions: {
        select: { id: true },
      },
    });

    if (!post || post.postType !== 'POLL') {
      return res.status(400).json({ success: false, error: 'Not a poll' });
    }

    // Verify optionId belongs to this post
    const validOption = post.pollOptions.find(o => o.id === optionId);
    if (!validOption) {
      return res.status(400).json({ success: false, error: 'Invalid option' });
    }

    const existingVote = await prisma.pollVote.findFirst({
      where: { postId: post.id, userId },
      select: { id: true, optionId: true },
    });

    if (existingVote) {
      if (existingVote.optionId === optionId) {
        // Same option - no change needed
        return res.json({ success: true, message: 'Already voted for this option', userVotedOptionId: optionId });
      }

      if (!post.pollAllowMultiple) {
        // Change vote - delete old vote and create new one
        await prisma.pollVote.delete({
          where: { id: existingVote.id },
        });
      }
    }

    // Create new vote
    await prisma.pollVote.create({
      data: { postId: post.id, optionId, userId },
    });

    res.json({ success: true, message: 'Vote recorded', userVotedOptionId: optionId });
    runAfterResponse('poll vote cache invalidation', async () => {
      await Promise.all([
        feedCache.invalidateUser(userId),
        feedCache.invalidateUser(post.authorId),
      ]);
    });
  } catch (error: any) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, error: 'Failed to vote' });
  }
});

// PUT /posts/:id - Update post (only author)
router.put('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content, visibility, mediaUrls, mediaDisplayMode, pollOptions } = req.body;
    const postId = req.params.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        postType: true,
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this post' });
    }

    if (post.postType === 'POLL' && pollOptions && Array.isArray(pollOptions)) {
      const existingVotes = await prisma.pollVote.count({
        where: { postId },
      });

      if (existingVotes === 0) {
        await prisma.pollOption.deleteMany({
          where: { postId },
        });

        const validOptions = pollOptions.filter((opt: string) => opt && opt.trim());
        if (validOptions.length >= 2) {
          await prisma.pollOption.createMany({
            data: validOptions.map((text: string, index: number) => ({
              postId,
              text: text.trim(),
              position: index,
            })),
          });
        }
      }
    }

    const { quizData } = req.body;

    if (post.postType === 'QUIZ' && quizData) {
      const existingQuiz = await prisma.quiz.findUnique({
        where: { postId },
        select: { id: true },
      });

      if (existingQuiz) {
        await prisma.quiz.update({
          where: { id: existingQuiz.id },
          data: {
            questions: quizData.questions || [],
            timeLimit: quizData.timeLimit,
            passingScore: quizData.passingScore,
            totalPoints: quizData.totalPoints,
            resultsVisibility: quizData.resultsVisibility,
            shuffleQuestions: quizData.shuffleQuestions,
            shuffleAnswers: quizData.shuffleAnswers,
            maxAttempts: quizData.maxAttempts,
            showReview: quizData.showReview,
            showExplanations: quizData.showExplanations,
          }
        });
      }
    }

    const postUpdateData: any = { updatedAt: new Date() };
    if (typeof content === 'string' && content.trim()) postUpdateData.content = content.trim();
    if (visibility) postUpdateData.visibility = visibility;
    if (mediaUrls !== undefined) postUpdateData.mediaUrls = mediaUrls;
    if (mediaDisplayMode) postUpdateData.mediaDisplayMode = mediaDisplayMode;

    const updated = await prisma.post.update({
      where: { id: postId },
      data: postUpdateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
          },
        },
        ...(post.postType === 'POLL' ? { pollOptions: {
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { votes: true } },
          },
        } } : {}),
        ...(post.postType === 'QUIZ' ? { quiz: true } : {}),
      },
    });

    res.json({ success: true, data: updated });
    runAfterResponse('update post cache invalidation', async () => {
      await feedCache.invalidateUser(post.authorId);
    });
  } catch (error: any) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// POST /posts/:id/bookmark - Bookmark/unbookmark a post
router.post('/posts/:id/bookmark', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user!.id;
    const targetPost = await findAccessiblePost(postId, req, { id: true, authorId: true });

    if (!targetPost) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        postId_userId: {
          postId: targetPost.id,
          userId,
        },
      },
      select: { id: true },
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: {
          postId_userId: {
            postId: targetPost.id,
            userId,
          },
        },
      });
      res.json({ success: true, bookmarked: false, message: 'Bookmark removed' });
      runAfterResponse('bookmark removal cache invalidation', async () => {
        await feedCache.invalidateUser(userId);
      });
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: { postId: targetPost.id, userId },
      });

      res.json({ success: true, bookmarked: true, message: 'Post bookmarked' });
      runAfterResponse('bookmark side effects', async () => {
        await Promise.all([
          feedCache.invalidateUser(userId),
          updateUserFeedSignals(userId, targetPost.id, 'bookmark'),
        ]);
      });
    }
  } catch (error: any) {
    console.error('Bookmark error:', error);
    res.status(500).json({ success: false, error: 'Failed to bookmark post' });
  }
});

// GET /bookmarks - Get user's bookmarked posts
router.get('/bookmarks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = (pageNumber - 1) * limitNumber;
    const includeTotal = req.query.includeTotal !== 'false';
    const take = includeTotal ? limitNumber : limitNumber + 1;
    const visibilityWhere = await resolveRequestVisibilityWhere(req);

    const [rawBookmarks, totalResult] = await Promise.all([
      prisma.bookmark.findMany({
        where: {
          userId: req.user!.id,
          post: visibilityWhere,
        },
        select: {
          post: {
            select: {
              id: true,
              authorId: true,
              content: true,
              title: true,
              postType: true,
              visibility: true,
              mediaUrls: true,
              mediaDisplayMode: true,
              likesCount: true,
              commentsCount: true,
              sharesCount: true,
              isPinned: true,
              isEdited: true,
              createdAt: true,
              updatedAt: true,
              topicTags: true,
              repostOfId: true,
              repostComment: true,
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePictureUrl: true,
                  role: true,
                },
              },
              pollOptions: {
                orderBy: { position: 'asc' },
                include: {
                  _count: { select: { votes: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      includeTotal
        ? prisma.bookmark.count({
            where: {
              userId: req.user!.id,
              post: visibilityWhere,
            },
          })
        : Promise.resolve(null),
    ]);

    const bookmarks = rawBookmarks.slice(0, limitNumber);
    const posts = bookmarks.map(b => ({
      ...b.post,
      isBookmarked: true,
      likesCount: b.post.likesCount,
      commentsCount: b.post.commentsCount,
      pollOptions: b.post.pollOptions.map((option) => ({
        ...option,
        votes: option._count.votes,
      })),
    }));
    const hasMore = includeTotal
      ? pageNumber * limitNumber < (totalResult ?? 0)
      : rawBookmarks.length > limitNumber;
    const total = totalResult ?? skip + posts.length + (hasMore ? 1 : 0);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: includeTotal ? Math.ceil(total / limitNumber) : pageNumber + (hasMore ? 1 : 0),
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ success: false, error: 'Failed to get bookmarks' });
  }
});

// GET /my-posts - Get current user's posts
router.get('/my-posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: req.user!.id },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
            },
          },
          pollOptions: {
            include: {
              _count: { select: { votes: true } },
            },
          },
          _count: { select: { comments: true, likes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.post.count({ where: { authorId: req.user!.id } }),
    ]);

    const formattedPosts = posts.map(post => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
    }));

    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get my posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get posts' });
  }
});

// POST /posts/:id/share - Record share action
router.post('/posts/:id/share', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const targetPost = await findAccessiblePost(postId, req, { id: true, authorId: true });

    if (!targetPost) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await prisma.post.update({
      where: { id: targetPost.id },
      data: { sharesCount: { increment: 1 } },
    });

    res.json({ success: true, message: 'Share recorded' });
    runAfterResponse('share side effects', async () => {
      await Promise.all([
        feedCache.invalidateUser(req.user!.id),
        feedCache.invalidateUser(targetPost.authorId),
        updateUserFeedSignals(req.user!.id, targetPost.id, 'share'),
      ]);
    });
  } catch (error: any) {
    console.error('Share error:', error);
    res.status(500).json({ success: false, error: 'Failed to record share' });
  }
});

// DELETE /comments/:id - Delete comment (only author)
router.delete('/comments/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        authorId: true,
        postId: true,
        post: {
          select: { authorId: true },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (comment.authorId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await prisma.$transaction([
      prisma.comment.delete({ where: { id: req.params.id } }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true, message: 'Comment deleted' });
    runAfterResponse('delete comment cache invalidation', async () => {
      await Promise.all([
        feedCache.invalidateUser(comment.authorId),
        feedCache.invalidateUser(comment.post.authorId),
      ]);
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
});

// POST /posts/:id/repost - Repost a post to your feed
router.post('/posts/:id/repost', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const originalPostId = req.params.id;
    const userId = req.user!.id;
    const { comment } = req.body; // Optional repost comment

    // Check original post exists
    const originalPost = await findAccessiblePost(originalPostId, req, {
      id: true,
      authorId: true,
      content: true,
      postType: true,
    });
    if (!originalPost) {
      return res.status(404).json({ success: false, error: 'Original post not found' });
    }

    // Don't allow reposting your own post
    if (originalPost.authorId === userId) {
      return res.status(400).json({ success: false, error: 'Cannot repost your own post' });
    }

    // Check if already reposted
    const existing = await prisma.post.findFirst({
      where: { authorId: userId, repostOfId: originalPostId },
      select: { id: true },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You already reposted this' });
    }

    const [repost] = await prisma.$transaction([
      prisma.post.create({
        data: {
          authorId: userId,
          schoolId: req.user!.schoolId || null,
          content: comment || '',
          postType: originalPost.postType,
          repostOfId: originalPostId,
          repostComment: comment || null,
          visibility: 'SCHOOL',
        },
      }),
      prisma.post.update({
        where: { id: originalPostId },
        data: { sharesCount: { increment: 1 } },
      }),
    ]);

    res.json({ success: true, data: repost });
    runAfterResponse('repost side effects', async () => {
      await Promise.all([
        feedCache.invalidateUser(userId),
        feedCache.invalidateUser(originalPost.authorId),
        updateUserFeedSignals(userId, originalPostId, 'share'),
      ]);

      if (originalPost.authorId === userId) return;

      const reposter = await prismaRead.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (!reposter) return;
      const reposterName = `${reposter.firstName} ${reposter.lastName}`;
      await prisma.notification.create({
        data: {
          recipientId: originalPost.authorId,
          actorId: userId,
          type: 'SHARE',
          title: 'Post Reposted',
          message: comment
            ? `${reposterName} reposted your post: "${comment.trim().slice(0, 80)}"`
            : `${reposterName} reposted your post`,
          postId: originalPostId,
          link: `/posts/${originalPostId}`,
        },
      });

      await EventPublisher.newLike(
        originalPost.authorId, userId, reposterName, originalPostId
      );
    });
  } catch (error: any) {
    console.error('Repost error:', error);
    res.status(500).json({ success: false, error: 'Failed to repost' });
  }
});

export default router;
