import { Router, Response } from 'express';
import { prisma } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /reels — Get all active focus reels
router.get('/reels', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const reels = await prisma.focusReel.findMany({
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
          },
        },
        attempts: {
          where: { userId },
          select: {
            id: true,
            completedAt: true,
            xpEarned: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format attempts to helper field
    const formatted = reels.map((reel) => {
      const attempt = reel.attempts[0] || null;
      return {
        id: reel.id,
        title: reel.title,
        description: reel.description,
        videoUrl: reel.videoUrl,
        thumbnailUrl: reel.thumbnailUrl,
        subject: reel.subject,
        duration: reel.duration,
        pausePoints: reel.pausePoints,
        creator: reel.creator,
        createdAt: reel.createdAt,
        userAttempt: attempt
          ? {
              completedAt: attempt.completedAt,
              xpEarned: attempt.xpEarned,
            }
          : null,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('[GET /reels] error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch focus reels' });
  }
});

// NOTE: pause-point answers are submitted via POST /reels/interactions
// (reels.routes.ts), which also drives combo/XP and spaced-repetition. The
// former POST /reels/:id/answer handler was unused by the client and has been
// removed to avoid two divergent answer paths.

export default router;
