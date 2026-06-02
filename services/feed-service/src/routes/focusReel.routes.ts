import { Router, Response } from 'express';
import { prisma } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createFocusReelSchema } from '../validators/focusReel.validator';

const router = Router();

// Roles allowed to author FocusReels. Mirrors the educator set used elsewhere
// (postActions.routes). Students consume but don't author (for now).
const AUTHORING_ROLES = new Set(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);

// POST /reels — create a FocusReel (video + optional pause-points). Educator-gated.
router.post('/reels', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role || '';
    if (!AUTHORING_ROLES.has(role)) {
      return res.status(403).json({ success: false, error: 'Only educators can create focus reels' });
    }

    const parsed = createFocusReelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid focus reel',
        details: parsed.error.flatten(),
      });
    }
    const { title, description, subject, videoUrl, thumbnailUrl, duration, pausePoints } = parsed.data;

    const reel = await prisma.focusReel.create({
      data: {
        title,
        description: description ?? null,
        subject,
        videoUrl,
        thumbnailUrl: thumbnailUrl ?? null,
        duration,
        pausePoints: pausePoints as any, // validated above; stored as Json
        creatorId: userId,
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true },
        },
      },
    });

    // The new reel enters the DISCOVERY pool on the next feed cache miss
    // (≤ REELS_FEED_TTL), so no explicit invalidation needed here.
    return res.status(201).json({ success: true, data: reel });
  } catch (error: any) {
    console.error('[POST /reels] error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create focus reel' });
  }
});

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
