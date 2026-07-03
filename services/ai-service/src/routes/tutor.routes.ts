/**
 * AI Tutor Routes
 *
 * Exposes the Claude-powered Learn-path tutor. Protected by JWT auth
 * and the same per-user rate limiting as the Gemini generators.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { aiRateLimiter, aiMinuteLimiter } from '../middleware/rateLimiter';
import { askTutor } from '../generators/tutor.generator';
import { claudeService } from '../services/claude.service';

const router = Router();

router.use(authenticateToken as any);
router.use(aiMinuteLimiter);
router.use(aiRateLimiter);

router.use((_req: Request, res: Response, next: any) => {
    if (!claudeService.isReady()) {
        return res.status(503).json({
            success: false,
            error: 'AI tutor is not configured (missing ANTHROPIC_API_KEY)',
        });
    }
    next();
});

// ─── Tutor Ask ─────────────────────────────────────────────────────
router.post('/tutor/ask', async (req: Request, res: Response) => {
    try {
        const { question, locale, grade, subjectName, topicName, miniLesson, formulaSheet } = req.body;

        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({ success: false, error: 'question is required' });
        }
        if (question.length > 1000) {
            return res.status(400).json({ success: false, error: 'Question is too long (max 1000 characters)' });
        }
        if (!topicName) {
            return res.status(400).json({ success: false, error: 'topicName is required' });
        }

        const timeoutMs = 100_000; // 100s — leave room before client's 120s timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Tutor is busy — please try again in a moment.')), timeoutMs)
        );

        const answer = await Promise.race([
            askTutor({
                question: question.trim(),
                locale: locale === 'km' ? 'km' : 'en',
                grade,
                subjectName,
                topicName,
                miniLesson,
                formulaSheet,
            }),
            timeoutPromise,
        ]);

        res.json({ success: true, data: answer });
    } catch (error: any) {
        console.error('❌ Tutor ask error:', error);
        const status = error.status === 429 ? 429 : 500;
        res.status(status).json({ success: false, error: error.message || 'Failed to get tutor response' });
    }
});

export default router;
