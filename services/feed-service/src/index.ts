import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = 3010; // Feed service always uses port 3010
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// ✅ Prisma with Neon-optimized settings
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

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3010'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Types
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId: string;
  };
}

// Auth Middleware
const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

// ========================================
// Health Check
// ========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'feed-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// POSTS ENDPOINTS
// ========================================

// GET /posts - Get feed posts
app.get('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      // For now, show all posts from user's school + public posts
      OR: [
        { author: { schoolId: req.user!.schoolId } },
        { visibility: 'PUBLIC' },
      ],
    };

    if (type) {
      where.postType = type;
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
            },
          },
          pollOptions: {
            include: {
              _count: { select: { votes: true } },
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

    const formattedPosts = posts.map(post => ({
      ...post,
      isLikedByMe: likedPostIds.has(post.id),
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
    const { content, postType = 'ARTICLE', visibility = 'SCHOOL', mediaUrls = [], pollOptions } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const postData: any = {
      authorId: req.user!.id,
      content: content.trim(),
      postType,
      visibility,
      mediaUrls,
    };

    // Create post with poll options if it's a poll
    const post = await prisma.post.create({
      data: {
        ...postData,
        pollOptions: postType === 'POLL' && pollOptions?.length > 0 ? {
          create: pollOptions.map((text: string, index: number) => ({
            text,
            order: index,
          })),
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
        _count: { select: { comments: true, likes: true } },
      },
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
  } catch (error: any) {
    console.error('Create post error:', error);
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

    res.json({
      success: true,
      data: {
        ...post,
        isLikedByMe: !!isLiked,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
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
      await prisma.$transaction([
        prisma.like.create({
          data: { postId, userId },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      res.json({ success: true, liked: true, message: 'Post liked' });
    }
  } catch (error: any) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, error: 'Failed to like post' });
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

    // Update post comment count (fire and forget)
    prisma.post.update({
      where: { id: req.params.id },
      data: { commentsCount: { increment: 1 } },
    }).catch(console.error);

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

// POST /posts/:id/vote - Vote on poll
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

    // Check if already voted
    const existingVote = await prisma.pollVote.findFirst({
      where: { optionId: { in: post.pollOptions.map(o => o.id) }, userId },
    });

    if (existingVote && !post.pollAllowMultiple) {
      return res.status(400).json({ success: false, error: 'Already voted' });
    }

    await prisma.pollVote.create({
      data: { postId, optionId, userId },
    });

    res.json({ success: true, message: 'Vote recorded' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to vote' });
  }
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   📱 Feed Service - Stunity Enterprise v1.0   ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Feed Endpoints:');
  console.log('   GET  /posts              - Get feed posts');
  console.log('   POST /posts              - Create post');
  console.log('   GET  /posts/:id          - Get single post');
  console.log('   POST /posts/:id/like     - Like/unlike');
  console.log('   GET  /posts/:id/comments - Get comments');
  console.log('   POST /posts/:id/comments - Add comment');
  console.log('   POST /posts/:id/vote     - Vote on poll');
  console.log('   DELETE /posts/:id        - Delete post');
  console.log('');
});
