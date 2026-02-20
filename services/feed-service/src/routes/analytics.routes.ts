/**
 * Analytics Routes
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

// ========================================
// Analytics Endpoints
// ========================================

// POST /posts/:id/view - Track post view
router.post('/posts/:id/view', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    // Update feed signals for personalization
    if (userId) {
      updateUserFeedSignals(userId, postId, 'view', duration);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('View tracking error:', error);
    res.status(500).json({ success: false, error: 'Failed to track view' });
  }
});

// GET /posts/:id/analytics - Get post analytics (author only)
router.get('/posts/:id/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Verify post exists and user is authorized — fetch only scalar fields
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, sharesCount: true, createdAt: true, _count: { select: { likes: true, comments: true, bookmarks: true, views: true } } },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Run all DB-level aggregations in parallel (no full row fetches)
    const [
      uniqueViewers,
      avgDurationResult,
      views24h, views7d, views30d,
      likes24h, comments24h,
      viewsBySourceRaw,
      dailyViewsRaw,
    ] = await Promise.all([
      // Distinct viewers count
      prisma.postView.findMany({ where: { postId, userId: { not: null } }, select: { userId: true }, distinct: ['userId'] })
        .then(r => r.length),
      // Average watch duration
      prisma.postView.aggregate({ where: { postId, duration: { not: null } }, _avg: { duration: true } }),
      // Period view counts
      prisma.postView.count({ where: { postId, viewedAt: { gte: last24h } } }),
      prisma.postView.count({ where: { postId, viewedAt: { gte: last7d } } }),
      prisma.postView.count({ where: { postId, viewedAt: { gte: last30d } } }),
      // Period engagement counts
      prisma.like.count({ where: { postId, createdAt: { gte: last24h } } }),
      prisma.comment.count({ where: { postId, createdAt: { gte: last24h } } }),
      // Views by source
      prisma.$queryRaw<{ source: string; count: bigint }[]>`
        SELECT COALESCE(source, 'feed') as source, COUNT(*)::int as count
        FROM post_views WHERE "postId" = ${postId}
        GROUP BY COALESCE(source, 'feed')
      `,
      // Daily views last 7 days
      prisma.$queryRaw<{ date: string; views: bigint }[]>`
        SELECT TO_CHAR("viewedAt"::date, 'YYYY-MM-DD') as date, COUNT(*)::int as views
        FROM post_views WHERE "postId" = ${postId} AND "viewedAt" >= ${last7d}
        GROUP BY "viewedAt"::date ORDER BY "viewedAt"::date ASC
      `,
    ]);

    const totalViews = post._count.views;
    const avgDuration = Math.round(avgDurationResult._avg.duration || 0);
    const engagementRate = totalViews > 0
      ? parseFloat(((post._count.likes + post._count.comments + post._count.bookmarks) / totalViews * 100).toFixed(2))
      : 0;

    // Build viewsBySource map
    const viewsBySource: Record<string, number> = {};
    viewsBySourceRaw.forEach(r => { viewsBySource[r.source] = Number(r.count); });

    // Build full 7-day chart (fill gaps with 0)
    const dailyMap: Record<string, number> = {};
    dailyViewsRaw.forEach(r => { dailyMap[r.date] = Number(r.views); });
    const dailyViews = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      return { date: dateStr, views: dailyMap[dateStr] || 0 };
    });

    res.json({
      success: true,
      analytics: {
        totalViews,
        uniqueViewers,
        avgDuration,
        views24h,
        views7d,
        views30d,
        likes: post._count.likes,
        likes24h,
        comments: post._count.comments,
        comments24h,
        shares: post.sharesCount || 0,
        bookmarks: post._count.bookmarks,
        engagementRate,
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
router.get('/analytics/my-insights', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.get('/analytics/trending', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.get('/analytics/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
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

export default router;
