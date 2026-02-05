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
    r2Configured: isR2Configured(),
  });
});

// ========================================
// MEDIA UPLOAD ENDPOINTS
// ========================================

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
    const { content, postType = 'ARTICLE', visibility = 'SCHOOL', mediaUrls = [], mediaDisplayMode = 'AUTO', pollOptions } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const postData: any = {
      authorId: req.user!.id,
      content: content.trim(),
      postType,
      visibility,
      mediaUrls,
      mediaDisplayMode,
    };

    // Create post with poll options if it's a poll
    const post = await prisma.post.create({
      data: {
        ...postData,
        pollOptions: postType === 'POLL' && pollOptions?.length > 0 ? {
          create: pollOptions.map((text: string, index: number) => ({
            text,
            position: index,
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

// PUT /posts/:id - Update post (only author)
app.put('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content, visibility, mediaUrls, mediaDisplayMode } = req.body;
    const postId = req.params.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this post' });
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
        shares: post.sharesCount,
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
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   📱 Feed Service - Stunity Enterprise v3.0   ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
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
  console.log('📊 Analytics Endpoints:');
  console.log('   GET    /posts/:id/analytics  - Post analytics (author)');
  console.log('   GET    /analytics/my-insights - User insights');
  console.log('   GET    /analytics/trending    - Trending posts');
  console.log('   GET    /analytics/activity    - Activity dashboard');
  console.log('');
});
