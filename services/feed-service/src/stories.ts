import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId?: string;
  };
  params: any;
  query: any;
  body: any;
}

// Story expires after 24 hours
const STORY_DURATION_HOURS = 24;

/**
 * GET /stories - Get stories from followed users + own stories
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const now = new Date();

    // Get users the current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    // Include own stories + followed users' stories
    const userIds = [userId, ...followingIds];

    // Get active stories (not expired)
    const stories = await prisma.story.findMany({
      where: {
        authorId: { in: userIds },
        isActive: true,
        expiresAt: { gt: now },
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
        views: {
          where: { viewerId: userId },
          select: { id: true },
        },
        _count: {
          select: { views: true, reactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group stories by author
    const storyGroups = new Map<string, any>();

    stories.forEach(story => {
      const authorId = story.authorId;
      if (!storyGroups.has(authorId)) {
        storyGroups.set(authorId, {
          user: {
            id: story.author.id,
            name: `${story.author.firstName} ${story.author.lastName}`,
            avatar: story.author.profilePictureUrl,
          },
          stories: [],
          hasUnviewed: false,
          latestAt: story.createdAt,
        });
      }

      const group = storyGroups.get(authorId);
      const isViewed = story.views.length > 0;

      group.stories.push({
        id: story.id,
        type: story.type,
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        text: story.text,
        backgroundColor: story.backgroundColor,
        textColor: story.textColor,
        fontStyle: story.fontStyle,
        duration: story.duration,
        viewCount: story._count.views,
        reactionCount: story._count.reactions,
        isViewed,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
      });

      if (!isViewed) {
        group.hasUnviewed = true;
      }
    });

    // Convert to array and sort (own stories first, then by latest)
    const groupedStories = Array.from(storyGroups.values())
      .sort((a, b) => {
        // Own stories first
        if (a.user.id === userId) return -1;
        if (b.user.id === userId) return 1;
        // Unviewed stories next
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        // Then by latest
        return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
      });

    res.json({ stories: groupedStories });
  } catch (error: any) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: 'Error fetching stories', error: error.message });
  }
});

/**
 * GET /stories/my - Get current user's stories
 */
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const now = new Date();

    const stories = await prisma.story.findMany({
      where: {
        authorId: userId,
        isActive: true,
        expiresAt: { gt: now },
      },
      include: {
        views: {
          include: {
            // Get viewer info for story insights
          },
          orderBy: { viewedAt: 'desc' },
          take: 50,
        },
        reactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { views: true, reactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      stories: stories.map(story => ({
        id: story.id,
        type: story.type,
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        text: story.text,
        backgroundColor: story.backgroundColor,
        textColor: story.textColor,
        fontStyle: story.fontStyle,
        duration: story.duration,
        viewCount: story._count.views,
        reactionCount: story._count.reactions,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching my stories:', error);
    res.status(500).json({ message: 'Error fetching stories', error: error.message });
  }
});

/**
 * GET /stories/:id - Get single story with details
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        _count: {
          select: { views: true, reactions: true },
        },
      },
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if expired
    if (story.expiresAt < new Date() || !story.isActive) {
      return res.status(404).json({ message: 'Story has expired' });
    }

    res.json({
      story: {
        id: story.id,
        type: story.type,
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        text: story.text,
        backgroundColor: story.backgroundColor,
        textColor: story.textColor,
        fontStyle: story.fontStyle,
        duration: story.duration,
        viewCount: story._count.views,
        reactionCount: story._count.reactions,
        author: {
          id: story.author.id,
          name: `${story.author.firstName} ${story.author.lastName}`,
          avatar: story.author.profilePictureUrl,
        },
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching story:', error);
    res.status(500).json({ message: 'Error fetching story', error: error.message });
  }
});

/**
 * POST /stories - Create a new story
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      type = 'TEXT',
      mediaUrl,
      thumbnailUrl,
      text,
      backgroundColor = '#1a1a2e',
      textColor = '#ffffff',
      fontStyle = 'sans-serif',
      duration = 5,
    } = req.body;

    // Validate based on type
    if (type === 'TEXT' && !text) {
      return res.status(400).json({ message: 'Text is required for text stories' });
    }
    if ((type === 'IMAGE' || type === 'VIDEO') && !mediaUrl) {
      return res.status(400).json({ message: 'Media URL is required for image/video stories' });
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + STORY_DURATION_HOURS);

    const story = await prisma.story.create({
      data: {
        authorId: userId,
        type,
        mediaUrl,
        thumbnailUrl,
        text,
        backgroundColor,
        textColor,
        fontStyle,
        duration: Math.min(Math.max(duration, 3), 15), // 3-15 seconds
        expiresAt,
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

    res.status(201).json({
      message: 'Story created successfully',
      story: {
        id: story.id,
        type: story.type,
        mediaUrl: story.mediaUrl,
        text: story.text,
        backgroundColor: story.backgroundColor,
        textColor: story.textColor,
        duration: story.duration,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating story:', error);
    res.status(500).json({ message: 'Error creating story', error: error.message });
  }
});

/**
 * POST /stories/:id/view - Mark story as viewed
 */
router.post('/:id/view', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if story exists and is active
    const story = await prisma.story.findUnique({
      where: { id },
    });

    if (!story || story.expiresAt < new Date() || !story.isActive) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    // Don't count self-views
    if (story.authorId === userId) {
      return res.json({ message: 'Own story view not counted' });
    }

    // Create or update view
    await prisma.storyView.upsert({
      where: {
        storyId_viewerId: {
          storyId: id,
          viewerId: userId,
        },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        storyId: id,
        viewerId: userId,
      },
    });

    // Update view count
    await prisma.story.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ message: 'Story viewed' });
  } catch (error: any) {
    console.error('Error recording story view:', error);
    res.status(500).json({ message: 'Error recording view', error: error.message });
  }
});

/**
 * POST /stories/:id/react - React to a story
 */
router.post('/:id/react', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { emoji } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    // Valid emojis
    const validEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏', '🎉'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji' });
    }

    // Check if story exists and is active
    const story = await prisma.story.findUnique({
      where: { id },
    });

    if (!story || story.expiresAt < new Date() || !story.isActive) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    // Create or update reaction
    const reaction = await prisma.storyReaction.upsert({
      where: {
        storyId_userId: {
          storyId: id,
          userId,
        },
      },
      update: { emoji },
      create: {
        storyId: id,
        userId,
        emoji,
      },
    });

    res.json({ message: 'Reaction added', reaction });
  } catch (error: any) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Error adding reaction', error: error.message });
  }
});

/**
 * DELETE /stories/:id - Delete a story
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find story and verify ownership
    const story = await prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.authorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    // Soft delete by setting isActive to false
    await prisma.story.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Story deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    res.status(500).json({ message: 'Error deleting story', error: error.message });
  }
});

/**
 * GET /stories/:id/viewers - Get story viewers (for story owner)
 */
router.get('/:id/viewers', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find story and verify ownership
    const story = await prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.authorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view story insights' });
    }

    // Get viewers with user info
    const views = await prisma.storyView.findMany({
      where: { storyId: id },
      orderBy: { viewedAt: 'desc' },
      take: 100,
    });

    // Get user info for viewers
    const viewerIds = views.map(v => v.viewerId);
    const viewers = await prisma.user.findMany({
      where: { id: { in: viewerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
      },
    });

    const viewerMap = new Map(viewers.map(v => [v.id, v]));

    res.json({
      totalViews: views.length,
      viewers: views.map(view => {
        const viewer = viewerMap.get(view.viewerId);
        return {
          id: view.viewerId,
          name: viewer ? `${viewer.firstName} ${viewer.lastName}` : 'Unknown',
          avatar: viewer?.profilePictureUrl,
          viewedAt: view.viewedAt,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching story viewers:', error);
    res.status(500).json({ message: 'Error fetching viewers', error: error.message });
  }
});

export default router;
