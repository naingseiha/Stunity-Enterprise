import { Router, Request, Response } from 'express';
import { challengeService } from '../challenges/challenge.service';
import { ChallengeType, ChallengeStatus } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/gamification/challenges
 * Get user's challenges with optional filters: type, status
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { type, status } = req.query;

        const challenges = await challengeService.getUserChallenges(
            userId,
            type as ChallengeType | undefined,
            status as ChallengeStatus | undefined
        );

        res.json({ success: true, data: challenges });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/gamification/challenges/:id/progress
 * Update progress for a challenge (increment: 1–1000)
 */
router.post('/:id/progress', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { increment } = req.body;

        if (typeof increment !== 'number' || increment < 1 || increment > 1000) {
            return res.status(400).json({
                success: false,
                error: 'increment must be a number between 1 and 1000',
            });
        }

        const updated = await challengeService.updateProgress(id, userId, increment);
        res.json({ success: true, data: updated });
    } catch (error: any) {
        const status = error.message === 'Active challenge not found' ? 404 : 500;
        res.status(status).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/gamification/challenges/generate/daily
 * Trigger daily challenge generation for current user
 */
router.post('/generate/daily', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const created = await challengeService.generateDailyChallenges(userId);
        res.json({ success: true, data: created });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/gamification/challenges/generate/weekly
 * Trigger weekly challenge generation for current user
 */
router.post('/generate/weekly', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const created = await challengeService.generateWeeklyChallenges(userId);
        res.json({ success: true, data: created });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
