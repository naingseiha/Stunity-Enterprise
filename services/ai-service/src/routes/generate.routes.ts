/**
 * AI Generation Routes
 * 
 * Exposes all Gemini-powered generators via REST endpoints.
 * Protected by JWT auth and per-user rate limiting.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { aiRateLimiter, aiMinuteLimiter } from '../middleware/rateLimiter';
import { generateQuiz } from '../generators/quiz.generator';
import { generateLesson } from '../generators/lesson.generator';
import { generatePollOptions } from '../generators/poll.generator';
import { generateCourseOutline } from '../generators/course.generator';
import { enhanceContent, generateAnnouncement, generateMilestones } from '../generators/enhance.generator';
import { suggestTags } from '../generators/tags.generator';
import { geminiService } from '../services/gemini.service';

const router = Router();

// Apply auth and rate limits to all generation routes
router.use(authenticateToken as any);
router.use(aiMinuteLimiter);
router.use(aiRateLimiter);

// Make sure AI service is ready
router.use((_req: Request, res: Response, next: any) => {
    if (!geminiService.isReady()) {
        return res.status(503).json({
            success: false,
            error: 'AI service is not configured (missing GEMINI_API_KEY)',
        });
    }
    next();
});

// ─── Quiz Generator ───────────────────────────────────────────────
router.post('/generate/quiz', async (req: Request, res: Response) => {
    try {
        const { topic, gradeLevel, questionCount, difficulty, subject } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        const quiz = await generateQuiz({ topic, gradeLevel, questionCount, difficulty, subject });
        res.json({ success: true, data: quiz });
    } catch (error: any) {
        console.error('❌ Quiz generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate quiz' });
    }
});

// ─── Lesson Generator ─────────────────────────────────────────────
router.post('/generate/lesson', async (req: Request, res: Response) => {
    try {
        const { topic, gradeLevel, length, subject, tone } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        const lesson = await generateLesson({ topic, gradeLevel, length, subject, tone });
        res.json({ success: true, data: lesson });
    } catch (error: any) {
        console.error('❌ Lesson generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate lesson' });
    }
});

// ─── Poll Options Generator ───────────────────────────────────────
router.post('/generate/poll-options', async (req: Request, res: Response) => {
    try {
        const { topic, optionCount, context } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        const poll = await generatePollOptions({ topic, optionCount, context });
        res.json({ success: true, data: poll });
    } catch (error: any) {
        console.error('❌ Poll generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate poll options' });
    }
});

// ─── Course Outline Generator ─────────────────────────────────────
router.post('/generate/course', async (req: Request, res: Response) => {
    try {
        const { topic, gradeLevel, weekCount, subject } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        const course = await generateCourseOutline({ topic, gradeLevel, weekCount, subject });
        res.json({ success: true, data: course });
    } catch (error: any) {
        console.error('❌ Course generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate course outline' });
    }
});

// ─── Content Enhancer ─────────────────────────────────────────────
router.post('/enhance/content', async (req: Request, res: Response) => {
    try {
        const { content, tone, type } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const enhanced = await enhanceContent({ content, tone, type });
        res.json({ success: true, data: enhanced });
    } catch (error: any) {
        console.error('❌ Content enhance error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to enhance content' });
    }
});

// ─── Announcement Generator ───────────────────────────────────────
router.post('/generate/announcement', async (req: Request, res: Response) => {
    try {
        const { notes, schoolName, urgency } = req.body;

        if (!notes) {
            return res.status(400).json({ success: false, error: 'Notes are required' });
        }

        const announcement = await generateAnnouncement({ notes, schoolName, urgency });
        res.json({ success: true, data: announcement });
    } catch (error: any) {
        console.error('❌ Announcement generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate announcement' });
    }
});

// ─── Milestones Generator ─────────────────────────────────────────
router.post('/generate/milestones', async (req: Request, res: Response) => {
    try {
        const { projectTitle, description, durationWeeks } = req.body;

        if (!projectTitle || !description) {
            return res.status(400).json({ success: false, error: 'Project title and description are required' });
        }

        const milestones = await generateMilestones({ projectTitle, description, durationWeeks });
        res.json({ success: true, data: milestones });
    } catch (error: any) {
        console.error('❌ Milestones generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate milestones' });
    }
});

// ─── Tag Suggester ────────────────────────────────────────────────
router.post('/suggest/tags', async (req: Request, res: Response) => {
    try {
        const { content, existingTags, maxTags } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const tags = await suggestTags({ content, existingTags, maxTags });
        res.json({ success: true, data: tags });
    } catch (error: any) {
        console.error('❌ Tag suggestion error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to suggest tags' });
    }
});

export default router;
