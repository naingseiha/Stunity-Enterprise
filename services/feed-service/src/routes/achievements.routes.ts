/**
 * Achievements Routes
 * 
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead, feedRanker, upload } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from '../utils/r2';
import { feedCache, EventPublisher } from '../redis';

const router = Router();

// ========================================
// ACHIEVEMENT ENDPOINTS
// ========================================

// GET /users/:id/achievements - Get user achievements
router.get('/users/:id/achievements', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.get('/users/:id/recommendations', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/users/:userId/recommend', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.put('/recommendations/:recId/accept', authenticateToken, async (req: AuthRequest, res: Response) => {
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


export default router;
