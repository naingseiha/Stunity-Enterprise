import { Router, Response } from 'express';
import { prisma } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { feedCache } from '../redis';

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

// POST /reels/:id/answer — submit pause-point answer and earn XP
router.post('/reels/:id/answer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const reelId = req.params.id;
    const { pausePointIndex, answerIndex } = req.body;

    if (typeof pausePointIndex !== 'number' || typeof answerIndex !== 'number') {
      return res.status(400).json({ success: false, error: 'pausePointIndex and answerIndex are required' });
    }

    const reel = await prisma.focusReel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      return res.status(404).json({ success: false, error: 'Focus reel not found' });
    }

    const pausePoints = reel.pausePoints as any[];
    if (pausePointIndex < 0 || pausePointIndex >= pausePoints.length) {
      return res.status(400).json({ success: false, error: 'Invalid pausePointIndex' });
    }

    const pausePoint = pausePoints[pausePointIndex];
    const isCorrect = pausePoint.correctAnswer === answerIndex;
    const xpAwarded = isCorrect ? (pausePoint.xp ?? 15) : 0;

    if (isCorrect && xpAwarded > 0) {
      // Award XP atomically
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            totalPoints: { increment: xpAwarded },
          },
        }),
        prisma.focusReelAttempt.upsert({
          where: { reelId_userId: { reelId, userId } },
          create: {
            reelId,
            userId,
            xpEarned: xpAwarded,
          },
          update: {
            xpEarned: { increment: xpAwarded },
            completedAt: new Date(),
          },
        }),
      ]);

      // Invalidate feed cache to show updated points
      await feedCache.invalidateUser(userId);
    }

    res.json({
      success: true,
      data: {
        isCorrect,
        xpAwarded,
      },
    });
  } catch (error: any) {
    console.error('[POST /reels/:id/answer] error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit answer' });
  }
});

export default router;
