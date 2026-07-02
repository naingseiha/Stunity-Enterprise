/**
 * Learn path — Duolingo-style curriculum practice over the Topic taxonomy.
 *
 * Three read/write surfaces for the mobile Learn tab:
 *   GET  /learn/profile             onboarding state (grade + chosen subjects)
 *   PUT  /learn/profile             upsert onboarding choices
 *   GET  /learn/path?subjectId=…    units (top-level topics) + derived progress
 *   GET  /learn/practice?topicId=…  a practice batch of tagged questions
 *
 * Progress is DERIVED, not stored: a unit's "correct" count is the number of
 * distinct tagged questions (unit + its child skills) the user has ever
 * answered correctly via ReelResponse — which the practice screen writes by
 * reusing POST /reels/interactions (QUIZ_QUESTION), so XP/combo/SM-2 recall
 * all flow through the existing pipeline with zero new write paths.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { seededShuffleOptions } from '../utils/seededShuffle';
import { deriveUnitStates, UNIT_TARGET_CORRECT } from '../utils/learnPath';

const router = Router();

const VALID_GRADES = new Set(['7', '8', '9', '10', '11', '12']);

// GET /learn/profile — onboarding state; data:null means "not onboarded yet".
router.get('/learn/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prismaRead.learnerProfile.findUnique({
      where: { userId: req.user!.id },
      select: { grade: true, subjectIds: true, updatedAt: true },
    });
    if (!profile) return res.json({ success: true, data: null });

    const subjects = profile.subjectIds.length
      ? await prismaRead.subject.findMany({
          where: { id: { in: profile.subjectIds } },
          select: { id: true, code: true, name: true, nameEn: true, nameKh: true, grade: true },
        })
      : [];

    res.json({ success: true, data: { grade: profile.grade, subjects } });
  } catch (error: any) {
    console.error('Get learner profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to load learner profile' });
  }
});

// PUT /learn/profile — save onboarding choices { grade, subjectIds[] }.
router.put('/learn/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const grade = String(req.body?.grade ?? '').trim();
    const rawSubjectIds: unknown = req.body?.subjectIds;

    if (!VALID_GRADES.has(grade)) {
      return res.status(400).json({ success: false, error: 'grade must be 7–12' });
    }
    if (!Array.isArray(rawSubjectIds) || rawSubjectIds.length === 0 || rawSubjectIds.length > 10) {
      return res.status(400).json({ success: false, error: '1–10 subjectIds required' });
    }
    const requested = [...new Set(rawSubjectIds.map((s) => String(s)))];
    const found = await prismaRead.subject.findMany({
      where: { id: { in: requested }, isActive: true },
      select: { id: true },
    });
    if (found.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid subjects' });
    }
    const subjectIds = found.map((s) => s.id);

    await prisma.learnerProfile.upsert({
      where: { userId },
      create: { userId, grade, subjectIds },
      update: { grade, subjectIds },
    });

    res.json({ success: true, data: { grade, subjectIds } });
  } catch (error: any) {
    console.error('Save learner profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to save learner profile' });
  }
});

// GET /learn/path?subjectId=… — the subject's unit path with progress.
router.get('/learn/path', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId.trim() : '';
    if (!subjectId) return res.status(400).json({ success: false, error: 'subjectId is required' });

    const [subject, topics] = await Promise.all([
      prismaRead.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, code: true, name: true, nameEn: true, nameKh: true, grade: true },
      }),
      prismaRead.topic.findMany({
        where: { subjectId, isActive: true },
        select: { id: true, parentId: true, name: true, nameKh: true, order: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
    ]);
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });

    // Tagged questions across all of the subject's topics, then the user's
    // distinct correct answers over them (one query each — pilot scale).
    const topicIds = topics.map((t) => t.id);
    const questions = topicIds.length
      ? await prismaRead.quizQuestion.findMany({
          where: { topicId: { in: topicIds } },
          select: { id: true, topicId: true },
        })
      : [];
    const correctResponses = questions.length
      ? await prismaRead.reelResponse.findMany({
          where: { userId, correct: true, itemId: { in: questions.map((q) => q.id) } },
          distinct: ['itemId'],
          select: { itemId: true },
        })
      : [];

    const units = deriveUnitStates(topics, questions, new Set(correctResponses.map((r) => r.itemId)));

    res.json({ success: true, data: { subject, targetPerUnit: UNIT_TARGET_CORRECT, units } });
  } catch (error: any) {
    console.error('Get learn path error:', error);
    res.status(500).json({ success: false, error: 'Failed to load learn path' });
  }
});

// GET /learn/practice?topicId=…&limit=10 — a batch of tagged questions for a
// unit (its own tag + child-skill tags). Unanswered-correct questions first;
// options deterministically shuffled like reels so chosenIndex lines up.
router.get('/learn/practice', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const topicId = typeof req.query.topicId === 'string' ? req.query.topicId.trim() : '';
    if (!topicId) return res.status(400).json({ success: false, error: 'topicId is required' });
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '10', 10) || 10, 1), 20);

    const children = await prismaRead.topic.findMany({
      where: { parentId: topicId, isActive: true },
      select: { id: true },
    });
    const topicIds = [topicId, ...children.map((c) => c.id)];

    const questions = await prismaRead.quizQuestion.findMany({
      where: { topicId: { in: topicIds } },
      select: {
        id: true,
        question: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        points: true,
        topicId: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (questions.length === 0) return res.json({ success: true, data: { questions: [] } });

    const answeredCorrect = new Set(
      (
        await prismaRead.reelResponse.findMany({
          where: { userId, correct: true, itemId: { in: questions.map((q) => q.id) } },
          distinct: ['itemId'],
          select: { itemId: true },
        })
      ).map((r) => r.itemId),
    );

    // New material first, then review of previously-missed/mastered items.
    const ordered = [
      ...questions.filter((q) => !answeredCorrect.has(q.id)),
      ...questions.filter((q) => answeredCorrect.has(q.id)),
    ].slice(0, limit);

    const data = ordered.map((q) => {
      const { options, correctAnswer } = seededShuffleOptions(q.options, q.correctAnswer, q.id);
      return {
        id: q.id,
        text: q.question,
        options,
        correctIndex: correctAnswer,
        explanation: q.explanation,
        points: q.points,
        topicId: q.topicId,
        alreadyMastered: answeredCorrect.has(q.id),
      };
    });

    res.json({ success: true, data: { questions: data } });
  } catch (error: any) {
    console.error('Get learn practice error:', error);
    res.status(500).json({ success: false, error: 'Failed to load practice questions' });
  }
});

export default router;
