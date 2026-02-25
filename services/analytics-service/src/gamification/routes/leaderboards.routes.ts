import { Router, Request, Response } from 'express';
import {
    leaderboardService,
    LeaderboardCategory,
    LeaderboardScope,
    LeaderboardPeriod,
} from '../leaderboards/leaderboard.service';
import { leaderboardCache } from '../leaderboards/leaderboard.cache';

const router = Router();

/**
 * GET /api/v1/gamification/leaderboards/:category
 * Get ranked list for a category with optional scope, timePeriod, cursor, limit.
 * Also returns the requesting user's own rank highlighted.
 */
router.get('/:category', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { category } = req.params;
        const scope = (req.query.scope as LeaderboardScope) || 'SCHOOL_WIDE';
        const period = (req.query.timePeriod as LeaderboardPeriod) || 'ALL_TIME';
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const cursor = req.query.cursor as string | undefined;

        // Try cache first
        const cacheKey = `leaderboard:${category}:${scope}:${period}`;
        const cached = await leaderboardCache.get(cacheKey);
        if (cached && !cursor) {
            return res.json({ success: true, data: cached, cached: true });
        }

        const data = await leaderboardService.getLeaderboardEntries(
            category as LeaderboardCategory,
            scope,
            period,
            limit,
            cursor,
            userId
        );

        // Cache the first page
        if (!cursor) {
            await leaderboardCache.set(cacheKey, data, 60); // 60s TTL
        }

        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/gamification/leaderboards/user/:userId
 * Get a user's rank across all categories for a given scope/period.
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const scope = (req.query.scope as LeaderboardScope) || 'SCHOOL_WIDE';
        const period = (req.query.timePeriod as LeaderboardPeriod) || 'ALL_TIME';

        const ranks = await leaderboardService.getUserAllCategoryRanks(userId, scope, period);
        res.json({ success: true, data: ranks });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
