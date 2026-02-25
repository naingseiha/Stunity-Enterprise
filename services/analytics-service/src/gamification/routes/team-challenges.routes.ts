import { Router, Request, Response } from 'express';
import { teamChallengeService } from '../team-challenges/team-challenge.service';
import { TeamChallengeStatus } from '@prisma/client';

const router = Router();

/**
 * POST /api/v1/gamification/team-challenges
 * Create a new team challenge (2-50 participants)
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const creatorId = req.user!.id;
        const { name, description, targetValue, deadline, participantIds, xpReward, coinReward } = req.body;

        // Basic validation
        if (!name || name.length < 3 || name.length > 100) {
            return res.status(400).json({ success: false, error: 'name must be 3-100 characters' });
        }
        if (!description || description.length < 10 || description.length > 500) {
            return res.status(400).json({ success: false, error: 'description must be 10-500 characters' });
        }
        if (!targetValue || targetValue < 1 || targetValue > 1_000_000) {
            return res.status(400).json({ success: false, error: 'targetValue must be 1-1,000,000' });
        }
        if (!Array.isArray(participantIds)) {
            return res.status(400).json({ success: false, error: 'participantIds must be an array' });
        }

        const challenge = await teamChallengeService.createTeamChallenge({
            creatorId,
            name,
            description,
            targetValue,
            deadline: new Date(deadline),
            participantIds,
            xpReward: xpReward ?? 0,
            coinReward: coinReward ?? 0,
        });

        res.status(201).json({ success: true, data: challenge });
    } catch (error: any) {
        const status = error.message.includes('participants') ? 400 : 500;
        res.status(status).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/gamification/team-challenges
 * Get the current user's team challenges (optional ?status=ACTIVE|COMPLETED|EXPIRED)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const status = req.query.status as TeamChallengeStatus | undefined;

        const challenges = await teamChallengeService.getUserTeamChallenges(userId, status);
        res.json({ success: true, data: challenges });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/gamification/team-challenges/:id
 * Get a specific team challenge with participant breakdown
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const challenge = await teamChallengeService.getTeamChallenge(id);
        res.json({ success: true, data: challenge });
    } catch (error: any) {
        const status = error.message === 'Team challenge not found' ? 404 : 500;
        res.status(status).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/gamification/team-challenges/:id/contribute
 * Add a contribution to a team challenge
 */
router.post('/:id/contribute', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { amount } = req.body;

        if (typeof amount !== 'number' || amount < 1) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const updated = await teamChallengeService.contribute(id, userId, amount);
        res.json({ success: true, data: updated });
    } catch (error: any) {
        const status =
            error.message === 'Not a participant in this challenge' ? 403 :
                error.message === 'Team challenge not found' ? 404 : 500;
        res.status(status).json({ success: false, error: error.message });
    }
});

export default router;
