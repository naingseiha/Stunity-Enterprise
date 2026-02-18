/**
 * Skills Routes
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
// SKILLS ENDPOINTS
// ========================================

// GET /users/:id/skills - Get user skills
router.get('/users/:id/skills', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/users/me/skills', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.put('/users/me/skills/:skillId', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.delete('/users/me/skills/:skillId', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/skills/:skillId/endorse', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.delete('/skills/:skillId/endorse', authenticateToken, async (req: AuthRequest, res: Response) => {
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

export default router;
