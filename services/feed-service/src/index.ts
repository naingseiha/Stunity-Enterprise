import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env FIRST before other imports
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from './utils/r2';
import { initRedis, EventPublisher } from './redis';
import sseRouter from './sse';
import dmRouter, { initDMRoutes } from './dm';
import clubsRouter, { initClubsRoutes } from './clubs';
import calendarRouter from './calendar';
import coursesRouter from './courses';
import storiesRouter from './stories';
import mediaRouter from './routes/media.routes';
import { authenticateToken, AuthRequest } from './middleware/auth';

const app = express();
const PORT = 3010; // Feed service always uses port 3010


// ✅ Prisma with Supabase PostgreSQL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Keep database connection warm
let isDbWarm = false;
const warmUpDb = async () => {
  if (isDbWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbWarm = true;
    console.log('✅ Feed Service - Database ready');
  } catch (error) {
    console.error('⚠️ Feed Service - Database warmup failed');
  }
};
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000);

// Initialize Redis for PubSub (optional, falls back to in-memory)
initRedis();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3010'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads (memory storage for R2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  },
});





// ========================================
// Health Check
// ========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'feed-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
    r2Configured: isR2Configured(),
  });
});

// ========================================
// MEDIA UPLOAD ENDPOINTS
// ========================================

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Media routes
app.use('/', mediaRouter);

// POST /upload - Upload media files to R2
app.post('/upload', authenticateToken, upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      // Fallback: Return data URLs for development without R2
      const results = files.map(file => ({
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        key: file.originalname,
        size: file.size,
        type: file.mimetype,
      }));

      return res.json({
        success: true,
        data: results,
        message: 'Files processed (R2 not configured - using data URLs)',
      });
    }

    // Upload to R2
    const uploadPromises = files.map(file => ({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    }));

    const results = await uploadMultipleToR2(uploadPromises, 'posts');

    res.json({
      success: true,
      data: results.map((r, i) => ({
        url: r.url,
        key: r.key,
        size: files[i].size,
        type: files[i].mimetype,
        originalName: files[i].originalname,
      })),
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload files', details: error.message });
  }
});

// DELETE /upload/:key - Delete a file from R2
app.delete('/upload/:key(*)', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    if (!isR2Configured()) {
      return res.json({ success: true, message: 'R2 not configured' });
    }

    await deleteFromR2(key);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete file', details: error.message });
  }
});

// GET /media/* - Proxy media files from R2 (for mobile app)
// This allows the mobile app to access R2 files even when R2_PUBLIC_URL is not set
app.get('/media/*', async (req: Request, res: Response) => {
  try {
    const key = req.params[0]; // Everything after /media/

    if (!key) {
      return res.status(400).json({ success: false, error: 'Missing media key' });
    }

    // If R2 is configured and has public URL, redirect
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    if (R2_PUBLIC_URL) {
      return res.redirect(`${R2_PUBLIC_URL}/${key}`);
    }

    // Otherwise return error - R2 not configured
    res.status(503).json({
      success: false,
      error: 'Media storage not configured',
      message: 'Please configure R2_PUBLIC_URL environment variable'
    });
  } catch (error: any) {
    console.error('Media proxy error:', error);
    res.status(500).json({ success: false, error: 'Failed to load media', details: error.message });
  }
});

// ========================================
// POSTS ENDPOINTS
// ========================================

// GET /posts - Get feed posts
app.get('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, subject } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

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

    console.log('📋 [GET /posts] Query filters:', {
      userId: req.user!.id,
      userSchoolId: req.user!.schoolId,
      type,
      subject,
    });

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
          quiz: {
            select: {
              id: true,
              questions: true,
              timeLimit: true,
              passingScore: true,
              totalPoints: true,
              resultsVisibility: true,
            },
          },
          _count: {
            select: { comments: true, likes: true },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: Number(limit),
      }),
      prisma.post.count({ where }),
    ]);

    console.log('📊 [GET /posts] Query results:', {
      postsFound: posts.length,
      totalCount: total,
      quizPosts: posts.filter(p => p.postType === 'QUIZ').length,
      postTypes: posts.map(p => p.postType),
    });

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

    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get posts', details: error.message });
  }
});

// POST /posts - Create new post
app.post('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
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
            timeLimit: quizData.timeLimit,
            passingScore: quizData.passingScore,
            totalPoints: quizData.totalPoints,
            resultsVisibility: quizData.resultsVisibility || 'AFTER_SUBMISSION',
            shuffleQuestions: quizData.shuffleQuestions || false,
            shuffleAnswers: quizData.shuffleAnswers || false,
            maxAttempts: quizData.maxAttempts,
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
app.get('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.post('/posts/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
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

      res.json({ success: true, liked: true, message: 'Post liked' });
    }
  } catch (error: any) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, error: 'Failed to like post' });
  }
});

// POST /posts/:id/value - Submit educational value rating for a post
app.post('/posts/:id/value', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.get('/posts/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.post('/posts/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    res.status(201).json({ success: true, data: newComment });
  } catch (error: any) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// DELETE /posts/:id - Delete post (only author)
app.delete('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.post('/posts/:id/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.put('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.post('/posts/:id/bookmark', authenticateToken, async (req: AuthRequest, res: Response) => {
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
      res.json({ success: true, bookmarked: true, message: 'Post bookmarked' });
    }
  } catch (error: any) {
    console.error('Bookmark error:', error);
    res.status(500).json({ success: false, error: 'Failed to bookmark post' });
  }
});

// GET /bookmarks - Get user's bookmarked posts
app.get('/bookmarks', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.get('/my-posts', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.post('/posts/:id/share', authenticateToken, async (req: AuthRequest, res: Response) => {
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
app.delete('/comments/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
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

// ========================================
// Quiz Endpoints
// ========================================

// POST /quizzes/:id/submit - Submit quiz answers
app.post('/quizzes/:id/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  console.log('🎯 [QUIZ SUBMIT] Endpoint hit!', {
    quizId: req.params.id,
    userId: req.user?.id,
    answersCount: req.body.answers?.length,
  });

  try {
    const quizId = req.params.id;
    const userId = req.user!.id;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      console.log('❌ [QUIZ SUBMIT] No answers provided');
      return res.status(400).json({ success: false, error: 'Answers array is required' });
    }

    console.log('🔍 [QUIZ SUBMIT] Looking up quiz:', quizId);

    // Fetch quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { post: true },
    });

    if (!quiz) {
      console.log('❌ [QUIZ SUBMIT] Quiz not found:', quizId);
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    console.log('✅ [QUIZ SUBMIT] Quiz found:', { id: quiz.id, postId: quiz.postId });

    // Parse questions from JSON
    const questions = quiz.questions as any[];

    // Calculate score
    let pointsEarned = 0;
    const answerResults = answers.map((userAnswer: any) => {
      const question = questions.find((q: any) => q.id === userAnswer.questionId);
      if (!question) {
        return { questionId: userAnswer.questionId, correct: false, pointsEarned: 0 };
      }

      let isCorrect = false;

      // Check answer based on question type
      if (question.type === 'MULTIPLE_CHOICE') {
        // Handle both string and number formats
        const userAnswerStr = String(userAnswer.answer);
        const correctAnswerStr = String(question.correctAnswer);
        isCorrect = userAnswerStr === correctAnswerStr;

        console.log('🔍 [QUIZ] MC Question:', {
          questionId: question.id,
          userAnswer: userAnswer.answer,
          userAnswerStr,
          correctAnswer: question.correctAnswer,
          correctAnswerStr,
          isCorrect
        });
      } else if (question.type === 'TRUE_FALSE') {
        // Handle both string and boolean formats
        const userAnswerStr = String(userAnswer.answer).toLowerCase();
        const correctAnswerStr = String(question.correctAnswer).toLowerCase();
        isCorrect = userAnswerStr === correctAnswerStr;
      } else if (question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK') {
        // Case-insensitive comparison, trimmed
        const userAns = String(userAnswer.answer || '').toLowerCase().trim();
        const correctAns = String(question.correctAnswer || '').toLowerCase().trim();
        isCorrect = userAns === correctAns;
      } else if (question.type === 'ORDERING') {
        try {
          // Parse user answer if string provided
          const userOrder = typeof userAnswer.answer === 'string' ? JSON.parse(userAnswer.answer) : userAnswer.answer;
          const correctOrder = question.options;

          if (Array.isArray(userOrder) && Array.isArray(correctOrder)) {
            isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
          } else {
            isCorrect = false;
          }
        } catch (e) {
          isCorrect = false;
        }
      } else if (question.type === 'MATCHING') {
        try {
          const userMatches = typeof userAnswer.answer === 'string' ? JSON.parse(userAnswer.answer) : userAnswer.answer;
          const correctMatches: Record<string, string> = {};
          if (Array.isArray(question.options)) {
            question.options.forEach((opt: string) => {
              const parts = opt.split(':::');
              if (parts.length === 2) {
                correctMatches[parts[0]] = parts[1];
              }
            });
          }

          if (userMatches && typeof userMatches === 'object') {
            const userKeys = Object.keys(userMatches);
            const correctKeys = Object.keys(correctMatches);

            if (userKeys.length !== correctKeys.length) {
              isCorrect = false;
            } else {
              isCorrect = userKeys.every(key => userMatches[key] === correctMatches[key]);
            }
          } else {
            isCorrect = false;
          }
        } catch (e) {
          isCorrect = false;
        }
      }

      const points = isCorrect ? (question.points || 10) : 0;
      pointsEarned += points;

      return {
        questionId: userAnswer.questionId,
        correct: isCorrect,
        pointsEarned: points,
        userAnswer: userAnswer.answer,
        correctAnswer: question.correctAnswer,
      };
    });

    // Calculate percentage score
    const score = quiz.totalPoints > 0 ? Math.round((pointsEarned / quiz.totalPoints) * 100) : 0;
    const passed = score >= quiz.passingScore;

    // Save quiz attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        answers: answers,
        score,
        pointsEarned,
        passed,
      },
    });

    // Return results based on visibility settings
    let resultsData: any = {
      attemptId: attempt.id,
      score,
      passed,
      pointsEarned,
      totalPoints: quiz.totalPoints,
      submittedAt: attempt.submittedAt,
    };

    // Include detailed results if visibility allows
    if (quiz.resultsVisibility === 'IMMEDIATE' || quiz.resultsVisibility === 'AFTER_SUBMISSION') {
      resultsData.results = answerResults;
      resultsData.questions = questions;
    }

    res.json({
      success: true,
      data: resultsData,
    });
  } catch (error: any) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit quiz', details: error.message });
  }
});

// GET /quizzes/:id/attempts - Get all attempts for a quiz (instructor only)
app.get('/quizzes/:id/attempts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;

    // Get quiz and check if user is the author
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { post: true },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    if (quiz.post.authorId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Only quiz author can view all attempts' });
    }

    // Fetch all attempts with user info
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            studentId: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Calculate statistics
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const avgScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
      : 0;

    res.json({
      success: true,
      data: {
        attempts,
        statistics: {
          totalAttempts,
          passedAttempts,
          failedAttempts: totalAttempts - passedAttempts,
          passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
          averageScore: Math.round(avgScore),
        },
      },
    });
  } catch (error: any) {
    console.error('Get attempts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get attempts' });
  }
});

// GET /quizzes/:id/attempts/my - Get current user's attempts for a quiz
app.get('/quizzes/:id/attempts/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const userId = req.user!.id;

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      success: true,
      data: attempts,
    });
  } catch (error: any) {
    console.error('Get my attempts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get attempts' });
  }
});

// GET /quizzes/:id/attempts/:attemptId - Get specific attempt details
app.get('/quizzes/:id/attempts/:attemptId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: quizId, attemptId } = req.params;
    const userId = req.user!.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { post: true },
        },
      },
    });

    if (!attempt || attempt.quizId !== quizId) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    // Only allow user to see their own attempt, or quiz author to see any attempt
    if (attempt.userId !== userId && attempt.quiz.post.authorId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this attempt' });
    }

    // Include questions for detailed review
    const questions = attempt.quiz.questions as any[];
    const answers = attempt.answers as any[];

    res.json({
      success: true,
      data: {
        ...attempt,
        questions,
        detailedAnswers: answers.map((userAnswer: any) => {
          const question = questions.find((q: any) => q.id === userAnswer.questionId);
          return {
            questionId: userAnswer.questionId,
            question: question?.text,
            type: question?.type,
            options: question?.options,
            userAnswer: userAnswer.answer,
            correctAnswer: question?.correctAnswer,
            points: question?.points,
          };
        }),
      },
    });
  } catch (error: any) {
    console.error('Get attempt details error:', error);
    res.status(500).json({ success: false, error: 'Failed to get attempt details' });
  }
});

// ========================================
// Analytics Endpoints
// ========================================

// POST /posts/:id/view - Track post view
app.post('/posts/:id/view', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id;
    const { duration, source } = req.body;

    // Check if user already viewed this post in last hour (avoid duplicate counts)
    const recentView = await prisma.postView.findFirst({
      where: {
        postId,
        userId,
        viewedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (!recentView) {
      await prisma.postView.create({
        data: {
          postId,
          userId,
          duration: duration || null,
          source: source || 'feed',
        },
      });
    } else if (duration) {
      // Update duration if provided
      await prisma.postView.update({
        where: { id: recentView.id },
        data: { duration: (recentView.duration || 0) + duration },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('View tracking error:', error);
    res.status(500).json({ success: false, error: 'Failed to track view' });
  }
});

// GET /posts/:id/analytics - Get post analytics (author only)
app.get('/posts/:id/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        views: {
          select: { id: true, viewedAt: true, duration: true, source: true, userId: true },
        },
        likes: { select: { userId: true, createdAt: true } },
        comments: { select: { id: true, createdAt: true, authorId: true } },
        bookmarks: { select: { userId: true, createdAt: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Check if user is author or admin
    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate metrics
    const totalViews = post.views.length;
    const uniqueViewers = new Set(post.views.filter(v => v.userId).map(v => v.userId)).size;
    const avgDuration = post.views.filter(v => v.duration).reduce((sum, v) => sum + (v.duration || 0), 0) / (post.views.filter(v => v.duration).length || 1);

    const views24h = post.views.filter(v => new Date(v.viewedAt) >= last24h).length;
    const views7d = post.views.filter(v => new Date(v.viewedAt) >= last7d).length;
    const views30d = post.views.filter(v => new Date(v.viewedAt) >= last30d).length;

    const likes24h = post.likes.filter(l => new Date(l.createdAt) >= last24h).length;
    const comments24h = post.comments.filter(c => new Date(c.createdAt) >= last24h).length;

    // Engagement rate: (likes + comments + bookmarks) / views * 100
    const engagementRate = totalViews > 0
      ? ((post.likes.length + post.comments.length + post.bookmarks.length) / totalViews * 100).toFixed(2)
      : 0;

    // Views by source
    const viewsBySource: Record<string, number> = {};
    post.views.forEach(v => {
      const src = v.source || 'feed';
      viewsBySource[src] = (viewsBySource[src] || 0) + 1;
    });

    // Daily views for chart (last 7 days)
    const dailyViews: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayViews = post.views.filter(v => {
        const vDate = new Date(v.viewedAt).toISOString().split('T')[0];
        return vDate === dateStr;
      }).length;
      dailyViews.push({ date: dateStr, views: dayViews });
    }

    res.json({
      success: true,
      analytics: {
        totalViews,
        uniqueViewers,
        avgDuration: Math.round(avgDuration),
        views24h,
        views7d,
        views30d,
        likes: post.likes.length,
        likes24h,
        comments: post.comments.length,
        comments24h,
        shares: post.sharesCount || 0,
        bookmarks: post.bookmarks.length,
        engagementRate: parseFloat(engagementRate as string),
        viewsBySource,
        dailyViews,
        createdAt: post.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

// GET /analytics/my-insights - Get user's posts performance insights
app.get('/analytics/my-insights', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = '30d' } = req.query;

    let since: Date;
    switch (period) {
      case '7d': since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      include: {
        views: { where: { viewedAt: { gte: since } } },
        likes: { where: { createdAt: { gte: since } } },
        comments: { where: { createdAt: { gte: since } } },
        bookmarks: { where: { createdAt: { gte: since } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + p.views.length, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes.length, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.sharesCount, 0);
    const totalBookmarks = posts.reduce((sum, p) => sum + p.bookmarks.length, 0);

    // Top performing posts
    const topPosts = posts
      .map(p => ({
        id: p.id,
        content: p.content.substring(0, 100),
        postType: p.postType,
        views: p.views.length,
        likes: p.likes.length,
        comments: p.comments.length,
        engagement: p.views.length > 0
          ? ((p.likes.length + p.comments.length) / p.views.length * 100).toFixed(1)
          : 0,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Posts by type
    const postsByType: Record<string, number> = {};
    posts.forEach(p => {
      postsByType[p.postType] = (postsByType[p.postType] || 0) + 1;
    });

    // Average engagement rate
    const avgEngagement = totalViews > 0
      ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      insights: {
        period,
        totalPosts,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalBookmarks,
        avgEngagement: parseFloat(avgEngagement as string),
        topPosts,
        postsByType,
      },
    });
  } catch (error: any) {
    console.error('Get insights error:', error);
    res.status(500).json({ success: false, error: 'Failed to get insights' });
  }
});

// GET /analytics/trending - Get trending posts
app.get('/analytics/trending', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10, period = '7d' } = req.query;

    let since: Date;
    switch (period) {
      case '24h': since = new Date(Date.now() - 24 * 60 * 60 * 1000); break;
      case '7d': since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get posts with engagement data
    const posts = await prisma.post.findMany({
      where: {
        createdAt: { gte: since },
        visibility: { in: ['PUBLIC', 'SCHOOL'] },
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
        views: { where: { viewedAt: { gte: since } } },
        likes: true,
        comments: true,
        _count: { select: { views: true, likes: true, comments: true } },
      },
    });

    // Calculate trending score: views + (likes * 3) + (comments * 5) + (shares * 2)
    const trendingPosts = posts
      .map(p => ({
        id: p.id,
        content: p.content.substring(0, 150),
        postType: p.postType,
        author: p.author,
        views: p._count.views,
        likes: p._count.likes,
        comments: p._count.comments,
        shares: p.sharesCount,
        trendingScore: p._count.views + (p._count.likes * 3) + (p._count.comments * 5) + (p.sharesCount * 2),
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, Number(limit));

    res.json({
      success: true,
      trending: trendingPosts,
    });
  } catch (error: any) {
    console.error('Get trending error:', error);
    res.status(500).json({ success: false, error: 'Failed to get trending' });
  }
});

// GET /analytics/activity - Get activity dashboard data
app.get('/analytics/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get user's activity
    const [
      postsThisWeek,
      postsThisMonth,
      likesGiven,
      commentsGiven,
      likesReceived,
      commentsReceived,
      viewsReceived,
    ] = await Promise.all([
      prisma.post.count({ where: { authorId: userId, createdAt: { gte: last7d } } }),
      prisma.post.count({ where: { authorId: userId, createdAt: { gte: last30d } } }),
      prisma.like.count({ where: { userId, createdAt: { gte: last30d } } }),
      prisma.comment.count({ where: { authorId: userId, createdAt: { gte: last30d } } }),
      prisma.like.count({
        where: { post: { authorId: userId }, createdAt: { gte: last30d } },
      }),
      prisma.comment.count({
        where: { post: { authorId: userId }, createdAt: { gte: last30d } },
      }),
      prisma.postView.count({
        where: { post: { authorId: userId }, viewedAt: { gte: last30d } },
      }),
    ]);

    // Daily activity for chart (last 7 days)
    const dailyActivity: { date: string; posts: number; likes: number; comments: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayPosts, dayLikes, dayComments] = await Promise.all([
        prisma.post.count({ where: { authorId: userId, createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.like.count({ where: { post: { authorId: userId }, createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.comment.count({ where: { post: { authorId: userId }, createdAt: { gte: dayStart, lte: dayEnd } } }),
      ]);

      dailyActivity.push({
        date: dayStart.toISOString().split('T')[0],
        posts: dayPosts,
        likes: dayLikes,
        comments: dayComments,
      });
    }

    res.json({
      success: true,
      activity: {
        postsThisWeek,
        postsThisMonth,
        likesGiven,
        commentsGiven,
        likesReceived,
        commentsReceived,
        viewsReceived,
        dailyActivity,
      },
    });
  } catch (error: any) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to get activity' });
  }
});

// ========================================
// PROFILE ENDPOINTS
// ========================================

// GET /users/search - Search users for DM
app.get('/users/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    const currentUserId = req.user?.id;

    if (!q || typeof q !== 'string') {
      return res.json({ success: true, users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        headline: true,
        professionalTitle: true,
      },
      take: Number(limit),
    });

    res.json({ success: true, users });
  } catch (error: any) {
    console.error('User search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

// GET /users/:id/profile - Get user profile
app.get('/users/:id/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    // Handle 'me' alias
    const userId = id === 'me' ? currentUserId : id;
    const isOwnProfile = userId === currentUserId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
        coverPhotoUrl: true,
        bio: true,
        headline: true,
        professionalTitle: true,
        location: true,
        languages: true,
        interests: true,
        skills: true,
        careerGoals: true,
        socialLinks: true,
        profileCompleteness: true,
        profileVisibility: true,
        isVerified: true,
        verifiedAt: true,
        totalLearningHours: true,
        currentStreak: true,
        longestStreak: true,
        totalPoints: true,
        level: true,
        isOpenToOpportunities: true,
        resumeUrl: true,
        createdAt: true,
        school: {
          select: { id: true, name: true, logo: true },
        },
        teacher: {
          select: {
            id: true,
            position: true,
            degree: true,
            hireDate: true,
            major1: true,
            major2: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { id: true, name: true, grade: true } },
          },
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            userSkills: true,
            experiences: true,
            certifications: true,
            projects: true,
            achievements: true,
            recommendations: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check visibility
    if (!isOwnProfile && user.profileVisibility === 'PRIVATE') {
      return res.status(403).json({ success: false, error: 'This profile is private' });
    }

    // Get follower status
    let isFollowing = false;
    if (!isOwnProfile && currentUserId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId!,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Get recent activity stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [postsThisMonth, totalLikes, totalViews] = await Promise.all([
      prisma.post.count({
        where: { authorId: userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.like.count({
        where: { post: { authorId: userId } },
      }),
      prisma.postView.count({
        where: { post: { authorId: userId } },
      }),
    ]);

    res.json({
      success: true,
      profile: {
        ...user,
        isOwnProfile,
        isFollowing,
        stats: {
          posts: user._count.posts,
          followers: user._count.followers,
          following: user._count.following,
          skills: user._count.userSkills,
          experiences: user._count.experiences,
          certifications: user._count.certifications,
          projects: user._count.projects,
          achievements: user._count.achievements,
          recommendations: user._count.recommendations,
          postsThisMonth,
          totalLikes,
          totalViews,
        },
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// PUT /users/me/profile - Update own profile
app.put('/users/me/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      firstName,
      lastName,
      bio,
      headline,
      professionalTitle,
      location,
      languages,
      interests,
      careerGoals,
      socialLinks,
      profileVisibility,
      isOpenToOpportunities,
    } = req.body;

    // Build update data
    const updateData: any = { profileUpdatedAt: new Date() };
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (headline !== undefined) updateData.headline = headline;
    if (professionalTitle !== undefined) updateData.professionalTitle = professionalTitle;
    if (location !== undefined) updateData.location = location;
    if (languages !== undefined) updateData.languages = languages;
    if (interests !== undefined) updateData.interests = interests;
    if (careerGoals !== undefined) updateData.careerGoals = careerGoals;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
    if (profileVisibility !== undefined) updateData.profileVisibility = profileVisibility;
    if (isOpenToOpportunities !== undefined) updateData.isOpenToOpportunities = isOpenToOpportunities;

    // Calculate profile completeness
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const fields = [
      user?.firstName, user?.lastName, bio || user?.bio, headline || user?.headline,
      professionalTitle || user?.professionalTitle, location || user?.location,
      user?.profilePictureUrl, careerGoals || user?.careerGoals,
    ];
    const filledFields = fields.filter(f => f && String(f).trim().length > 0).length;
    updateData.profileCompleteness = Math.round((filledFields / fields.length) * 100);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bio: true,
        headline: true,
        professionalTitle: true,
        location: true,
        languages: true,
        interests: true,
        careerGoals: true,
        socialLinks: true,
        profileVisibility: true,
        profileCompleteness: true,
        isOpenToOpportunities: true,
      },
    });

    res.json({ success: true, profile: updatedUser });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /users/me/profile-photo - Upload profile photo
app.post('/users/me/profile-photo', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });

    // Get old key to delete
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePictureKey: true },
    });

    let photoUrl = '';
    let photoKey = '';

    if (isR2Configured()) {
      const result = await uploadMultipleToR2([{
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      }], 'profiles');
      photoUrl = result[0].url;
      photoKey = result[0].key;

      // Delete old photo from R2
      if (oldUser?.profilePictureKey) {
        await deleteFromR2(oldUser.profilePictureKey).catch(() => { });
      }
    } else {
      photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      photoKey = file.originalname;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePictureUrl: photoUrl,
        profilePictureKey: photoKey,
        profileUpdatedAt: new Date(),
      },
      select: { id: true, profilePictureUrl: true },
    });

    res.json({ success: true, profilePictureUrl: updated.profilePictureUrl });
  } catch (error: any) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload photo' });
  }
});

// POST /users/me/cover-photo - Upload cover photo
app.post('/users/me/cover-photo', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });

    // Get old key to delete
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverPhotoKey: true },
    });

    let coverUrl = '';
    let coverKey = '';

    if (isR2Configured()) {
      const result = await uploadMultipleToR2([{
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      }], 'covers');
      coverUrl = result[0].url;
      coverKey = result[0].key;

      // Delete old cover from R2
      if (oldUser?.coverPhotoKey) {
        await deleteFromR2(oldUser.coverPhotoKey).catch(() => { });
      }
    } else {
      coverUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      coverKey = file.originalname;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        coverPhotoUrl: coverUrl,
        coverPhotoKey: coverKey,
        profileUpdatedAt: new Date(),
      },
      select: { id: true, coverPhotoUrl: true },
    });

    res.json({ success: true, coverPhotoUrl: updated.coverPhotoUrl });
  } catch (error: any) {
    console.error('Upload cover photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload cover' });
  }
});

// DELETE /users/me/cover-photo - Remove cover photo
app.delete('/users/me/cover-photo', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverPhotoKey: true },
    });

    if (user?.coverPhotoKey && isR2Configured()) {
      await deleteFromR2(user.coverPhotoKey).catch(() => { });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { coverPhotoUrl: null, coverPhotoKey: null },
    });

    res.json({ success: true, message: 'Cover photo removed' });
  } catch (error: any) {
    console.error('Delete cover photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cover' });
  }
});

// ========================================
// SKILLS ENDPOINTS
// ========================================

// GET /users/:id/skills - Get user skills
app.get('/users/:id/skills', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const skills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        endorsements: {
          include: {
            endorser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                headline: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { endorsements: true } },
      },
      orderBy: [
        { level: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      skills: skills.map(skill => ({
        ...skill,
        endorsementCount: skill._count.endorsements,
      })),
    });
  } catch (error: any) {
    console.error('Get skills error:', error);
    res.status(500).json({ success: false, error: 'Failed to get skills' });
  }
});

// POST /users/me/skills - Add skill
app.post('/users/me/skills', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { skillName, category, level, yearsOfExp, description } = req.body;

    if (!skillName || !category) {
      return res.status(400).json({ success: false, error: 'Skill name and category required' });
    }

    const skill = await prisma.userSkill.create({
      data: {
        userId,
        skillName,
        category,
        level: level || 'BEGINNER',
        yearsOfExp: yearsOfExp || null,
        description: description || null,
      },
    });

    res.json({ success: true, skill });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'You already have this skill' });
    }
    console.error('Add skill error:', error);
    res.status(500).json({ success: false, error: 'Failed to add skill' });
  }
});

// PUT /users/me/skills/:skillId - Update skill
app.put('/users/me/skills/:skillId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { skillId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const skill = await prisma.userSkill.findUnique({ where: { id: skillId } });
    if (!skill || skill.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    const { skillName, category, level, yearsOfExp, description } = req.body;

    const updated = await prisma.userSkill.update({
      where: { id: skillId },
      data: {
        ...(skillName && { skillName }),
        ...(category && { category }),
        ...(level && { level }),
        ...(yearsOfExp !== undefined && { yearsOfExp }),
        ...(description !== undefined && { description }),
      },
    });

    res.json({ success: true, skill: updated });
  } catch (error: any) {
    console.error('Update skill error:', error);
    res.status(500).json({ success: false, error: 'Failed to update skill' });
  }
});

// DELETE /users/me/skills/:skillId - Delete skill
app.delete('/users/me/skills/:skillId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { skillId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const skill = await prisma.userSkill.findUnique({ where: { id: skillId } });
    if (!skill || skill.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    await prisma.userSkill.delete({ where: { id: skillId } });

    res.json({ success: true, message: 'Skill deleted' });
  } catch (error: any) {
    console.error('Delete skill error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete skill' });
  }
});

// POST /skills/:skillId/endorse - Endorse a skill
app.post('/skills/:skillId/endorse', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const endorserId = req.user?.id;
    const { skillId } = req.params;
    const { comment } = req.body;
    if (!endorserId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const skill = await prisma.userSkill.findUnique({ where: { id: skillId } });
    if (!skill) return res.status(404).json({ success: false, error: 'Skill not found' });
    if (skill.userId === endorserId) {
      return res.status(400).json({ success: false, error: 'Cannot endorse your own skill' });
    }

    const endorsement = await prisma.skillEndorsement.create({
      data: {
        skillId,
        endorserId,
        recipientId: skill.userId,
        comment: comment || null,
      },
      include: {
        endorser: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true },
        },
      },
    });

    res.json({ success: true, endorsement });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Already endorsed' });
    }
    console.error('Endorse skill error:', error);
    res.status(500).json({ success: false, error: 'Failed to endorse skill' });
  }
});

// DELETE /skills/:skillId/endorse - Remove endorsement
app.delete('/skills/:skillId/endorse', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const endorserId = req.user?.id;
    const { skillId } = req.params;
    if (!endorserId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await prisma.skillEndorsement.deleteMany({
      where: { skillId, endorserId },
    });

    res.json({ success: true, message: 'Endorsement removed' });
  } catch (error: any) {
    console.error('Remove endorsement error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove endorsement' });
  }
});

// ========================================
// EXPERIENCE ENDPOINTS
// ========================================

// GET /users/:id/experiences - Get user experiences
app.get('/users/:id/experiences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const experiences = await prisma.experience.findMany({
      where: { userId },
      orderBy: [
        { isCurrent: 'desc' },
        { startDate: 'desc' },
      ],
    });

    res.json({ success: true, experiences });
  } catch (error: any) {
    console.error('Get experiences error:', error);
    res.status(500).json({ success: false, error: 'Failed to get experiences' });
  }
});

// POST /users/me/experiences - Add experience
app.post('/users/me/experiences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { type, title, organization, location, startDate, endDate, isCurrent, description, achievements, skills } = req.body;

    if (!type || !title || !organization || !startDate) {
      return res.status(400).json({ success: false, error: 'Type, title, organization, and start date required' });
    }

    const experience = await prisma.experience.create({
      data: {
        userId,
        type,
        title,
        organization,
        location: location || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        description: description || null,
        achievements: achievements || [],
        skills: skills || [],
      },
    });

    res.json({ success: true, experience });
  } catch (error: any) {
    console.error('Add experience error:', error);
    res.status(500).json({ success: false, error: 'Failed to add experience' });
  }
});

// PUT /users/me/experiences/:expId - Update experience
app.put('/users/me/experiences/:expId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { expId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const exp = await prisma.experience.findUnique({ where: { id: expId } });
    if (!exp || exp.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Experience not found' });
    }

    const { type, title, organization, location, startDate, endDate, isCurrent, description, achievements, skills } = req.body;

    const updated = await prisma.experience.update({
      where: { id: expId },
      data: {
        ...(type && { type }),
        ...(title && { title }),
        ...(organization && { organization }),
        ...(location !== undefined && { location }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isCurrent !== undefined && { isCurrent }),
        ...(description !== undefined && { description }),
        ...(achievements && { achievements }),
        ...(skills && { skills }),
      },
    });

    res.json({ success: true, experience: updated });
  } catch (error: any) {
    console.error('Update experience error:', error);
    res.status(500).json({ success: false, error: 'Failed to update experience' });
  }
});

// DELETE /users/me/experiences/:expId - Delete experience
app.delete('/users/me/experiences/:expId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { expId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const exp = await prisma.experience.findUnique({ where: { id: expId } });
    if (!exp || exp.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Experience not found' });
    }

    await prisma.experience.delete({ where: { id: expId } });

    res.json({ success: true, message: 'Experience deleted' });
  } catch (error: any) {
    console.error('Delete experience error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete experience' });
  }
});

// ========================================
// EDUCATION ENDPOINTS
// ========================================

// GET /users/:id/education - Get user education
app.get('/users/:id/education', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const education = await prisma.education.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    res.json({ success: true, education });
  } catch (error: any) {
    console.error('Get education error:', error);
    res.status(500).json({ success: false, error: 'Failed to get education' });
  }
});

// POST /users/me/education - Add education
app.post('/users/me/education', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { school, degree, fieldOfStudy, grade, startDate, endDate, isCurrent, description, activities, skills } = req.body;

    if (!school || !startDate) {
      return res.status(400).json({ success: false, error: 'School and start date are required' });
    }

    const education = await prisma.education.create({
      data: {
        userId,
        school,
        degree: degree || null,
        fieldOfStudy: fieldOfStudy || null,
        grade: grade || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        description: description || null,
        activities: activities || [],
        skills: skills || [],
        mediaUrls: [],
        mediaKeys: [],
      },
    });

    res.json({ success: true, education });
  } catch (error: any) {
    console.error('Add education error:', error);
    res.status(500).json({ success: false, error: 'Failed to add education' });
  }
});

// PUT /users/me/education/:eduId - Update education
app.put('/users/me/education/:eduId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { eduId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const edu = await prisma.education.findUnique({ where: { id: eduId } });
    if (!edu || edu.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Education not found' });
    }

    const { school, degree, fieldOfStudy, grade, startDate, endDate, isCurrent, description, activities, skills } = req.body;

    const updated = await prisma.education.update({
      where: { id: eduId },
      data: {
        ...(school && { school }),
        ...(degree !== undefined && { degree }),
        ...(fieldOfStudy !== undefined && { fieldOfStudy }),
        ...(grade !== undefined && { grade }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isCurrent !== undefined && { isCurrent }),
        ...(description !== undefined && { description }),
        ...(activities && { activities }),
        ...(skills && { skills }),
      },
    });

    res.json({ success: true, education: updated });
  } catch (error: any) {
    console.error('Update education error:', error);
    res.status(500).json({ success: false, error: 'Failed to update education' });
  }
});

// DELETE /users/me/education/:eduId - Delete education
app.delete('/users/me/education/:eduId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { eduId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const edu = await prisma.education.findUnique({ where: { id: eduId } });
    if (!edu || edu.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Education not found' });
    }

    await prisma.education.delete({ where: { id: eduId } });

    res.json({ success: true, message: 'Education deleted' });
  } catch (error: any) {
    console.error('Delete education error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete education' });
  }
});

// ========================================
// CERTIFICATION ENDPOINTS
// ========================================

// GET /users/:id/certifications - Get user certifications
app.get('/users/:id/certifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const certifications = await prisma.certification.findMany({
      where: { userId },
      orderBy: { issueDate: 'desc' },
    });

    res.json({ success: true, certifications });
  } catch (error: any) {
    console.error('Get certifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to get certifications' });
  }
});

// POST /users/me/certifications - Add certification
app.post('/users/me/certifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { name, issuingOrg, issueDate, expiryDate, credentialId, credentialUrl, description, skills } = req.body;

    if (!name || !issuingOrg || !issueDate) {
      return res.status(400).json({ success: false, error: 'Name, issuing organization, and issue date required' });
    }

    const certification = await prisma.certification.create({
      data: {
        userId,
        name,
        issuingOrg,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        credentialId: credentialId || null,
        credentialUrl: credentialUrl || null,
        description: description || null,
        skills: skills || [],
      },
    });

    res.json({ success: true, certification });
  } catch (error: any) {
    console.error('Add certification error:', error);
    res.status(500).json({ success: false, error: 'Failed to add certification' });
  }
});

// PUT /users/me/certifications/:certId - Update certification
app.put('/users/me/certifications/:certId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { certId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const cert = await prisma.certification.findUnique({ where: { id: certId } });
    if (!cert || cert.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Certification not found' });
    }

    const { name, issuingOrg, issueDate, expiryDate, credentialId, credentialUrl, description, skills } = req.body;

    const updated = await prisma.certification.update({
      where: { id: certId },
      data: {
        ...(name && { name }),
        ...(issuingOrg && { issuingOrg }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(credentialId !== undefined && { credentialId }),
        ...(credentialUrl !== undefined && { credentialUrl }),
        ...(description !== undefined && { description }),
        ...(skills && { skills }),
      },
    });

    res.json({ success: true, certification: updated });
  } catch (error: any) {
    console.error('Update certification error:', error);
    res.status(500).json({ success: false, error: 'Failed to update certification' });
  }
});

// DELETE /users/me/certifications/:certId - Delete certification
app.delete('/users/me/certifications/:certId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { certId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const cert = await prisma.certification.findUnique({ where: { id: certId } });
    if (!cert || cert.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Certification not found' });
    }

    await prisma.certification.delete({ where: { id: certId } });

    res.json({ success: true, message: 'Certification deleted' });
  } catch (error: any) {
    console.error('Delete certification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete certification' });
  }
});

// ========================================
// PROJECT ENDPOINTS
// ========================================

// GET /users/:id/projects - Get user projects
app.get('/users/:id/projects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;
    const isOwnProfile = userId === currentUserId;

    const projects = await prisma.project.findMany({
      where: {
        userId,
        ...(isOwnProfile ? {} : { visibility: 'PUBLIC' }),
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ success: true, projects });
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to get projects' });
  }
});

// POST /users/me/projects - Add project
app.post('/users/me/projects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const {
      title, description, category, status, startDate, endDate, role, teamSize,
      technologies, skills, projectUrl, githubUrl, demoUrl, achievements, visibility, isFeatured,
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ success: false, error: 'Title, description, and category required' });
    }

    const project = await prisma.project.create({
      data: {
        userId,
        title,
        description,
        category,
        status: status || 'COMPLETED',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        role: role || null,
        teamSize: teamSize || null,
        technologies: technologies || [],
        skills: skills || [],
        projectUrl: projectUrl || null,
        githubUrl: githubUrl || null,
        demoUrl: demoUrl || null,
        achievements: achievements || [],
        visibility: visibility || 'PUBLIC',
        isFeatured: isFeatured || false,
      },
    });

    res.json({ success: true, project });
  } catch (error: any) {
    console.error('Add project error:', error);
    res.status(500).json({ success: false, error: 'Failed to add project' });
  }
});

// PUT /users/me/projects/:projectId - Update project
app.put('/users/me/projects/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const {
      title, description, category, status, startDate, endDate, role, teamSize,
      technologies, skills, projectUrl, githubUrl, demoUrl, achievements, visibility, isFeatured,
    } = req.body;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        ...(status && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(role !== undefined && { role }),
        ...(teamSize !== undefined && { teamSize }),
        ...(technologies && { technologies }),
        ...(skills && { skills }),
        ...(projectUrl !== undefined && { projectUrl }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(demoUrl !== undefined && { demoUrl }),
        ...(achievements && { achievements }),
        ...(visibility && { visibility }),
        ...(isFeatured !== undefined && { isFeatured }),
      },
    });

    res.json({ success: true, project: updated });
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// DELETE /users/me/projects/:projectId - Delete project
app.delete('/users/me/projects/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Delete media from R2 if exists
    if (project.mediaKeys && project.mediaKeys.length > 0 && isR2Configured()) {
      await Promise.all(project.mediaKeys.map(key => deleteFromR2(key).catch(() => { })));
    }

    await prisma.project.delete({ where: { id: projectId } });

    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

// ========================================
// ACHIEVEMENT ENDPOINTS
// ========================================

// GET /users/:id/achievements - Get user achievements
app.get('/users/:id/achievements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;
    const isOwnProfile = userId === currentUserId;

    const achievements = await prisma.achievement.findMany({
      where: {
        userId,
        ...(isOwnProfile ? {} : { isPublic: true }),
      },
      orderBy: [
        { rarity: 'desc' },
        { issuedDate: 'desc' },
      ],
    });

    res.json({ success: true, achievements });
  } catch (error: any) {
    console.error('Get achievements error:', error);
    res.status(500).json({ success: false, error: 'Failed to get achievements' });
  }
});

// ========================================
// RECOMMENDATION ENDPOINTS
// ========================================

// GET /users/:id/recommendations - Get user recommendations
app.get('/users/:id/recommendations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;
    const isOwnProfile = userId === currentUserId;

    const recommendations = await prisma.recommendation.findMany({
      where: {
        recipientId: userId,
        ...(isOwnProfile ? {} : { isPublic: true, isAccepted: true }),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
            professionalTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, recommendations });
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

// POST /users/:userId/recommend - Write recommendation
app.post('/users/:userId/recommend', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const authorId = req.user?.id;
    const { userId: recipientId } = req.params;
    const { relationship, content, skills, rating } = req.body;

    if (!authorId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (authorId === recipientId) {
      return res.status(400).json({ success: false, error: 'Cannot recommend yourself' });
    }
    if (!relationship || !content) {
      return res.status(400).json({ success: false, error: 'Relationship and content required' });
    }

    const recommendation = await prisma.recommendation.create({
      data: {
        recipientId,
        authorId,
        relationship,
        content,
        skills: skills || [],
        rating: rating || null,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true },
        },
      },
    });

    res.json({ success: true, recommendation });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Already recommended this user' });
    }
    console.error('Create recommendation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create recommendation' });
  }
});

// PUT /recommendations/:recId/accept - Accept/Reject recommendation
app.put('/recommendations/:recId/accept', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { recId } = req.params;
    const { accept } = req.body;

    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const rec = await prisma.recommendation.findUnique({ where: { id: recId } });
    if (!rec || rec.recipientId !== userId) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }

    const updated = await prisma.recommendation.update({
      where: { id: recId },
      data: {
        isAccepted: accept,
        acceptedAt: accept ? new Date() : null,
      },
    });

    res.json({ success: true, recommendation: updated });
  } catch (error: any) {
    console.error('Accept recommendation error:', error);
    res.status(500).json({ success: false, error: 'Failed to update recommendation' });
  }
});

// ========================================
// FOLLOW ENDPOINTS
// ========================================

// POST /users/:userId/follow - Follow/Unfollow user
app.post('/users/:userId/follow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user?.id;
    const { userId: followingId } = req.params;

    if (!followerId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (followerId === followingId) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      // Unfollow
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      res.json({ success: true, action: 'unfollowed' });
    } else {
      // Follow
      await prisma.follow.create({
        data: { followerId, followingId },
      });

      // 🔔 Create in-app notification + publish SSE event
      const follower = await prisma.user.findUnique({
        where: { id: followerId },
        select: { firstName: true, lastName: true, profilePictureUrl: true },
      });
      if (follower) {
        const followerName = `${follower.firstName} ${follower.lastName}`;

        // Create DB notification (triggers Supabase Realtime → bell badge)
        await prisma.notification.create({
          data: {
            recipientId: followingId,
            actorId: followerId,
            type: 'FOLLOW',
            title: 'New Follower',
            message: `${followerName} started following you`,
            link: `/profile/${followerId}`,
          },
        }).catch(err => console.error('Failed to create follow notification:', err));

        // SSE event (legacy)
        EventPublisher.newFollower(
          followingId, followerId, followerName,
          follower.profilePictureUrl || undefined
        );
      }

      res.json({ success: true, action: 'followed' });
    }
  } catch (error: any) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, error: 'Failed to follow/unfollow' });
  }
});

// GET /users/:id/followers - Get followers
app.get('/users/:id/followers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
            professionalTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      followers: followers.map(f => f.follower),
      count: followers.length,
    });
  } catch (error: any) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get followers' });
  }
});

// GET /users/:id/following - Get following
app.get('/users/:id/following', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
            professionalTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      following: following.map(f => f.following),
      count: following.length,
    });
  } catch (error: any) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, error: 'Failed to get following' });
  }
});

// GET /users/:id/activity - Get user's recent activity (posts)
app.get('/users/:id/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;
    const limit = parseInt(req.query.limit as string) || 10;

    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, posts });
  } catch (error: any) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to get activity' });
  }
});

// ========================================
// SSE Real-Time Events Router
// ========================================

app.use('/api/events', sseRouter);

// ========================================
// Direct Messages (DM) Router
// ========================================

app.use('/dm', authenticateToken as any, initDMRoutes(prisma));

// ========================================
// Study Clubs Router
// ========================================

initClubsRoutes(prisma);
app.use('/clubs', authenticateToken as any, clubsRouter);

// ========================================
// PHASE 19: Events & Calendar Routes
// ========================================

app.use('/calendar', authenticateToken as any, calendarRouter);

// ========================================
// PHASE 21: Course & Learning Routes
// ========================================

app.use('/courses', authenticateToken as any, coursesRouter);
app.use('/learning-paths', authenticateToken as any, coursesRouter);

// ========================================
// PHASE 24: Stories Routes
// ========================================

app.use('/stories', authenticateToken as any, storiesRouter);

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   📱 Feed Service - Stunity Enterprise v6.0   ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📡 Real-Time (SSE):');
  console.log('   GET    /api/events/stream   - SSE event stream');
  console.log('   GET    /api/events/stats    - Connection stats');
  console.log('');
  console.log('💬 Direct Messages:');
  console.log('   GET    /dm/conversations         - List conversations');
  console.log('   POST   /dm/conversations         - Start conversation');
  console.log('   GET    /dm/conversations/:id     - Get conversation');
  console.log('   DELETE /dm/conversations/:id     - Leave conversation');
  console.log('   POST   /dm/conversations/:id/messages - Send message');
  console.log('   PUT    /dm/messages/:id          - Edit message');
  console.log('   DELETE /dm/messages/:id          - Delete message');
  console.log('   POST   /dm/conversations/:id/typing  - Typing indicator');
  console.log('   GET    /dm/unread-count          - Get unread count');
  console.log('');
  console.log('📋 Feed Endpoints:');
  console.log('   GET    /posts              - Get feed posts');
  console.log('   POST   /posts              - Create post');
  console.log('   GET    /posts/:id          - Get single post');
  console.log('   PUT    /posts/:id          - Update post');
  console.log('   DELETE /posts/:id          - Delete post');
  console.log('   POST   /posts/:id/like     - Like/unlike');
  console.log('   POST   /posts/:id/bookmark - Bookmark/unbookmark');
  console.log('   POST   /posts/:id/share    - Record share');
  console.log('   POST   /posts/:id/vote     - Vote on poll');
  console.log('   POST   /posts/:id/view     - Track view');
  console.log('   GET    /posts/:id/comments - Get comments');
  console.log('   POST   /posts/:id/comments - Add comment');
  console.log('   DELETE /comments/:id       - Delete comment');
  console.log('   GET    /my-posts           - Get my posts');
  console.log('   GET    /bookmarks          - Get bookmarked posts');
  console.log('');
  console.log('👤 Profile Endpoints:');
  console.log('   GET    /users/:id/profile       - Get user profile');
  console.log('   PUT    /users/me/profile        - Update profile');
  console.log('   POST   /users/me/profile-photo  - Upload profile photo');
  console.log('   POST   /users/me/cover-photo    - Upload cover photo');
  console.log('   DELETE /users/me/cover-photo    - Remove cover photo');
  console.log('   POST   /users/:id/follow        - Follow/unfollow user');
  console.log('   GET    /users/:id/followers     - Get followers');
  console.log('   GET    /users/:id/following     - Get following');
  console.log('   GET    /users/:id/activity      - Get user activity');
  console.log('');
  console.log('🎯 Skills Endpoints:');
  console.log('   GET    /users/:id/skills        - Get user skills');
  console.log('   POST   /users/me/skills         - Add skill');
  console.log('   PUT    /users/me/skills/:id     - Update skill');
  console.log('   DELETE /users/me/skills/:id     - Delete skill');
  console.log('   POST   /skills/:id/endorse      - Endorse skill');
  console.log('   DELETE /skills/:id/endorse      - Remove endorsement');
  console.log('');
  console.log('💼 Experience/Certification/Project Endpoints:');
  console.log('   CRUD   /users/me/experiences    - Manage experiences');
  console.log('   CRUD   /users/me/certifications - Manage certifications');
  console.log('   CRUD   /users/me/projects       - Manage projects');
  console.log('   GET    /users/:id/achievements  - Get achievements');
  console.log('   GET    /users/:id/recommendations - Get recommendations');
  console.log('   POST   /users/:id/recommend     - Write recommendation');
  console.log('');
  console.log('🎯 Quiz Endpoints:');
  console.log('   POST   /quizzes/:id/submit            - Submit quiz answers');
  console.log('   GET    /quizzes/:id/attempts          - Get all attempts (instructor)');
  console.log('   GET    /quizzes/:id/attempts/my       - Get my attempts');
  console.log('   GET    /quizzes/:id/attempts/:attemptId - Get attempt details');
  console.log('');
  console.log('📊 Analytics Endpoints:');
  console.log('   GET    /posts/:id/analytics  - Post analytics (author)');
  console.log('   GET    /analytics/my-insights - User insights');
  console.log('   GET    /analytics/trending    - Trending posts');
  console.log('   GET    /analytics/activity    - Activity dashboard');
  console.log('');
  console.log('📚 Course & Learning Endpoints:');
  console.log('   GET    /courses               - List courses');
  console.log('   GET    /courses/my-courses    - My enrolled courses');
  console.log('   GET    /courses/featured      - Featured courses');
  console.log('   GET    /courses/categories    - Course categories');
  console.log('   GET    /courses/:id           - Course details');
  console.log('   POST   /courses/:id/enroll    - Enroll in course');
  console.log('   POST   /courses               - Create course (instructor)');
  console.log('   GET    /courses/:id/lessons   - Course lessons');
  console.log('   POST   /courses/:id/lessons/:id/progress - Update progress');
  console.log('   GET    /learning-paths/paths  - Learning paths');
  console.log('   POST   /learning-paths/paths/:id/enroll - Enroll in path');
  console.log('   GET    /courses/stats/my-learning - Learning stats');
  console.log('');
});
