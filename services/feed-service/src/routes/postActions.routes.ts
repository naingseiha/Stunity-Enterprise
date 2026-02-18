/**
 * Post Actions Routes
 * 
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead, feedRanker, upload } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from '../utils/r2';
import { feedCache, EventPublisher } from '../redis';
import { updateUserFeedSignals } from './signals.routes';

const router = Router();

// POST /posts - Create new post
router.post('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content, title, postType = 'ARTICLE', visibility = 'SCHOOL', mediaUrls = [], mediaDisplayMode = 'AUTO', pollOptions, quizData } = req.body;

    console.log('📝 Creating post:', {
      postType,
      visibility,
      authorId: req.user!.id,
      authorSchoolId: req.user!.schoolId,
      hasQuizData: !!quizData,
      quizDataKeys: quizData ? Object.keys(quizData) : []
    });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const postData: any = {
      authorId: req.user!.id,
      content: content.trim(),
      title: title?.trim(),
      postType,
      visibility,
      mediaUrls,
      mediaDisplayMode,
    };

    // Create post with poll options if it's a poll, OR quiz if it's a quiz
    const post = await prisma.post.create({
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
    });

    console.log('✅ Post created:', {
      id: post.id,
      postType: post.postType,
      visibility: post.visibility,
      authorId: post.authorId,
      hasQuiz: !!post.quiz,
      quizId: post.quiz?.id,
    });

    // Publish SSE event to followers for real-time feed updates
    try {
      const followers = await prisma.follow.findMany({
        where: { followingId: req.user!.id },
        select: { followerId: true }
      });
      const followerIds = followers.map(f => f.followerId);
      if (followerIds.length > 0) {
        EventPublisher.newPost(
          req.user!.id,
          followerIds,
          post.id,
          content.slice(0, 100)
        );
        // Invalidate feed cache for followers + author
        Promise.all([
          feedCache.invalidateUser(req.user!.id),
          ...followerIds.map(id => feedCache.invalidateUser(id)),
        ]).catch(() => { });
      }
    } catch (sseError) {
      console.error('SSE publish error (non-blocking):', sseError);
    }

    res.status(201).json({
      success: true,
      data: {
        ...post,
        isLikedByMe: false,
        likesCount: 0,
        commentsCount: 0,
      },
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
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
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
            achievements: {
              where: { isPublic: true },
              orderBy: [
                { rarity: 'desc' },
                { issuedDate: 'desc' },
              ],
              take: 3,
              select: {
                id: true,
                type: true,
                title: true,
                rarity: true,
                badgeUrl: true,
              },
            },
          },
        },
        pollOptions: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { comments: true, likes: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const isLiked = await prisma.like.findFirst({
      where: { postId: post.id, userId: req.user!.id },
    });

    // Check if user voted on this poll
    let userVotedOptionId = null;
    if (post.postType === 'POLL') {
      const userVote = await prisma.pollVote.findFirst({
        where: {
          postId: post.id,
          userId: req.user!.id,
        },
        select: { optionId: true },
      });
      userVotedOptionId = userVote?.optionId || null;
    }

    res.json({
      success: true,
      data: {
        ...post,
        isLikedByMe: !!isLiked,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
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

    // Check if already liked
    const existingLike = await prisma.like.findFirst({
      where: { postId, userId },
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existingLike.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      res.json({ success: true, liked: false, message: 'Post unliked' });
    } else {
      // Like
      const [_, post, liker] = await prisma.$transaction([
        prisma.like.create({
          data: { postId, userId },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
          select: { authorId: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        }),
      ]);

      // 🔔 Create in-app notification + publish SSE event
      if (post && liker && post.authorId !== userId) {
        const likerName = `${liker.firstName} ${liker.lastName}`;

        // Create DB notification (triggers Supabase Realtime → bell badge)
        await prisma.notification.create({
          data: {
            recipientId: post.authorId,
            actorId: userId,
            type: 'LIKE',
            title: 'New Like',
            message: `${likerName} liked your post`,
            postId: postId,
            link: `/posts/${postId}`,
          },
        }).catch(err => console.error('Failed to create like notification:', err));

        // SSE event (legacy)
        EventPublisher.newLike(post.authorId, userId, likerName, postId);
      }

      // Update feed signals for personalization
      updateUserFeedSignals(userId, postId, 'like');

      res.json({ success: true, liked: true, message: 'Post liked' });
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
    const { accuracy, helpfulness, clarity, depth, difficulty, wouldRecommend } = req.body;

    // Validate ratings
    if (!accuracy || !helpfulness || !clarity || !depth) {
      return res.status(400).json({
        success: false,
        error: 'All rating dimensions required (accuracy, helpfulness, clarity, depth)'
      });
    }

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Calculate average rating
    const averageRating = (accuracy + helpfulness + clarity + depth) / 4;

    // For now, log for analytics (will add to database schema later)
    console.log('📊 Educational Value Submitted:', {
      postId,
      userId,
      ratings: { accuracy, helpfulness, clarity, depth },
      difficulty,
      wouldRecommend,
      averageRating: averageRating.toFixed(2),
      timestamp: new Date().toISOString(),
    });

    // TODO: Store in EducationalValue table when schema is updated
    // For now, we just acknowledge the submission

    res.json({
      success: true,
      message: 'Educational value rating submitted',
      averageRating: averageRating.toFixed(2),
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
    const skip = (Number(page) - 1) * Number(limit);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId: req.params.id, parentId: null },
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
        take: Number(limit),
      }),
      prisma.comment.count({ where: { postId: req.params.id, parentId: null } }),
    ]);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get comments' });
  }
});

// POST /posts/:id/comments - Add comment
router.post('/posts/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Create comment
    const newComment = await prisma.comment.create({
      data: {
        postId: req.params.id,
        authorId: req.user!.id,
        content: content.trim(),
        parentId: parentId || null,
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
    });

    // Update post comment count and get author
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { commentsCount: { increment: 1 } },
      select: { authorId: true },
    });

    // 🔔 Create in-app notification + publish SSE event
    if (post && newComment.author && post.authorId !== req.user!.id) {
      const commenterName = `${newComment.author.firstName} ${newComment.author.lastName}`;
      const preview = content.trim().slice(0, 80);

      // Create DB notification (triggers Supabase Realtime → bell badge)
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: req.user!.id,
          type: 'COMMENT',
          title: 'New Comment',
          message: `${commenterName} commented: "${preview}"`,
          postId: req.params.id,
          commentId: newComment.id,
          link: `/posts/${req.params.id}`,
        },
      }).catch(err => console.error('Failed to create comment notification:', err));

      // SSE event (legacy)
      EventPublisher.newComment(
        post.authorId, req.user!.id, commenterName,
        req.params.id, newComment.id, content.trim()
      );
    }

    // Update feed signals for personalization
    updateUserFeedSignals(req.user!.id, req.params.id, 'comment');

    res.status(201).json({ success: true, data: newComment });
  } catch (error: any) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// DELETE /posts/:id - Delete post (only author)
router.delete('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await prisma.post.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Post deleted' });
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
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { pollOptions: true },
    });

    if (!post || post.postType !== 'POLL') {
      return res.status(400).json({ success: false, error: 'Not a poll' });
    }

    // Verify optionId belongs to this post
    const validOption = post.pollOptions.find(o => o.id === optionId);
    if (!validOption) {
      return res.status(400).json({ success: false, error: 'Invalid option' });
    }

    // Check if already voted
    const existingVote = await prisma.pollVote.findFirst({
      where: { optionId: { in: post.pollOptions.map(o => o.id) }, userId },
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
      data: { postId, optionId, userId },
    });

    res.json({ success: true, message: 'Vote recorded', userVotedOptionId: optionId });
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
      include: { pollOptions: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this post' });
    }

    // Update poll options if it's a POLL post and pollOptions are provided
    if (post.postType === 'POLL' && pollOptions && Array.isArray(pollOptions)) {
      // Check if any votes exist - if so, don't allow editing poll options
      const existingVotes = await prisma.pollVote.count({
        where: { postId },
      });

      if (existingVotes === 0) {
        // No votes yet, we can update poll options
        // Delete existing options and create new ones
        await prisma.pollOption.deleteMany({
          where: { postId },
        });

        // Create new poll options
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
      // If votes exist, silently ignore poll option changes
    }

    // Update quiz data if it's a QUIZ post and quizData is provided
    // Update quiz data if it's a QUIZ post and quizData is provided
    const { quizData } = req.body;
    console.log('📝 [PUT /posts/:id] Post ID:', postId);
    console.log('📝 [PUT /posts/:id] PostType:', post.postType);
    console.log('📝 [PUT /posts/:id] Has quizData:', !!quizData);
    if (quizData) {
      console.log('📝 [PUT /posts/:id] quizData questions count:', quizData.questions?.length);
    }

    if (post.postType === 'QUIZ' && quizData) {
      // Check if quiz exists for this post
      const existingQuiz = await prisma.quiz.findUnique({
        where: { postId },
        include: { _count: { select: { attempts: true } } } // Check for attempts
      });
      console.log('📝 [PUT /posts/:id] Existing quiz found:', !!existingQuiz);

      if (existingQuiz) {
        console.log('📝 [PUT /posts/:id] Quiz ID:', existingQuiz.id);
        console.log('📝 [PUT /posts/:id] Attempts count:', existingQuiz._count.attempts);

        // Allow updating questions even if attempts exist
        // Note: This might cause inconsistencies with old attempts, but is required for full editing capability

        // Update quiz settings and questions (stored as JSON)
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

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        content: content?.trim() || post.content,
        visibility: visibility || post.visibility,
        mediaUrls: mediaUrls !== undefined ? mediaUrls : post.mediaUrls,
        mediaDisplayMode: mediaDisplayMode || post.mediaDisplayMode,
        updatedAt: new Date(),
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
        pollOptions: {
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { votes: true } },
          },
        },
        // Include updated quiz data in response
        quiz: true
      },
    });

    res.json({ success: true, data: updated });
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

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findFirst({
      where: { postId, userId },
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
      res.json({ success: true, bookmarked: false, message: 'Bookmark removed' });
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: { postId, userId },
      });

      // Update feed signals for personalization
      updateUserFeedSignals(userId, postId, 'bookmark');

      res.json({ success: true, bookmarked: true, message: 'Post bookmarked' });
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
    const skip = (Number(page) - 1) * Number(limit);

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: req.user!.id },
        include: {
          post: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.bookmark.count({ where: { userId: req.user!.id } }),
    ]);

    const posts = bookmarks.map(b => ({
      ...b.post,
      isBookmarked: true,
      likesCount: b.post._count.likes,
      commentsCount: b.post._count.comments,
    }));

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
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

    await prisma.post.update({
      where: { id: postId },
      data: { sharesCount: { increment: 1 } },
    });

    res.json({ success: true, message: 'Share recorded' });
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
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (comment.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await prisma.comment.delete({ where: { id: req.params.id } });

    // Update post comment count
    await prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
});

export default router;
