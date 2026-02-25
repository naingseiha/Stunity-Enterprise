import { Router, Request, Response } from 'express';
import { achievementService } from '../achievements/achievement.service';
import { AchievementCategory } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/gamification/achievements
 * Get user's achievements with progress
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const category = req.query.category as AchievementCategory;

        const achievements = await achievementService.getUserAchievements(userId, category);

        res.json({
            success: true,
            data: achievements
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/gamification/achievements/:id
 * Get details for a specific achievement
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        // This would typically join with progress in the service
        const achievements = await achievementService.getUserAchievements(userId);
        const achievement = achievements.find(a => a.id === id);

        if (!achievement) {
            return res.status(404).json({ success: false, error: 'Achievement not found' });
        }

        res.json({
            success: true,
            data: achievement
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
