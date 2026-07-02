/**
 * Recall Routes — backend for the mobile "Smart Scroll" Recall Cards.
 *
 *   GET  /recall/due                fetch cards due for review now
 *   POST /recall/:cardId/review     grade a card, advance SM-2 state, award XP
 *
 * Production wiring TODO (next sessions):
 *   - Hook quiz.routes.ts:469 (quiz submit) to auto-create RecallCards for
 *     each incorrect answer — so the spaced-repetition queue fills
 *     organically. Stub: createRecallCardsForFailedQuestions() below.
 *   - Pull "classmatesReviewing" count from a peer-signals join.
 *   - Background job: nudge user via push when high-priority cards go overdue.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { applyReview, daysSinceReview, type RecallGrade } from '../utils/sm2';
import {
  reviewCardBodySchema,
  dueCardsQuerySchema,
} from '../validators/recall.validator';

const router = Router();

const DEFAULT_DUE_LIMIT = 20;

// ─────────────────────────────────────────────────────────
// GET /recall/mastery — subject → topic mastery tree (Progress hook §3.5)
// Derived from each card's SM-2 recallStrength blended with review accuracy.
// ─────────────────────────────────────────────────────────

/** Per-card mastery 0..100. New/unpracticed cards are capped low to avoid overstating. */
function cardMasteryPct(c: { recallStrength: number; reviewCount: number; incorrectCount: number }): number {
  if (!c.reviewCount || c.reviewCount <= 0) {
    return Math.round(Math.max(0, Math.min(1, c.recallStrength)) * 40);
  }
  const accuracy = Math.max(0, (c.reviewCount - c.incorrectCount) / c.reviewCount);
  return Math.round((0.6 * c.recallStrength + 0.4 * accuracy) * 100);
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

router.get('/recall/mastery', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const cards = await prismaRead.recallCard.findMany({
      where: { userId },
      select: {
        subject: true,
        subjectLabel: true,
        recallStrength: true,
        reviewCount: true,
        incorrectCount: true,
        nextReviewAt: true,
        topicId: true,
        // Canonical taxonomy (when the origin question is tagged) — preferred
        // over the string heuristics below.
        topic: {
          select: {
            id: true,
            name: true,
            nameKh: true,
            subject: { select: { id: true, name: true, nameEn: true, nameKh: true } },
          },
        },
      },
    });

    // subject -> { label, topic -> { masterySum, count, due } }
    type TopicAgg = { label: string; topicId: string | null; sum: number; count: number; due: number };
    type SubjectAgg = { label: string; sum: number; count: number; due: number; topics: Map<string, TopicAgg> };
    const subjects = new Map<string, SubjectAgg>();

    for (const c of cards) {
      const mastery = cardMasteryPct(c);
      const isDue = c.nextReviewAt <= now;

      let subjectKey: string;
      let subjectLabel: string;
      let topicKey: string;
      let topicLabel: string;
      let topicId: string | null = null;

      if (c.topic) {
        // Tagged card → canonical Subject/Topic names. Group key is the
        // Subject row id so bilingual name variants can't split a subject.
        subjectKey = `subject:${c.topic.subject.id}`;
        subjectLabel = c.topic.subject.nameEn || c.topic.subject.name;
        topicKey = c.topic.id;
        topicLabel = c.topic.name;
        topicId = c.topic.id;
      } else {
        // Legacy/untagged → parse "Biology · Cell Structure" as before.
        const [rawName, ...rest] = (c.subjectLabel || '').split('·').map((p) => p.trim());
        subjectKey = c.subject;
        subjectLabel = rawName || capitalize(c.subject);
        topicLabel = rest.join(' · ') || subjectLabel;
        topicKey = topicLabel;
      }

      let subj = subjects.get(subjectKey);
      if (!subj) {
        subj = { label: subjectLabel, sum: 0, count: 0, due: 0, topics: new Map() };
        subjects.set(subjectKey, subj);
      }
      subj.sum += mastery;
      subj.count += 1;
      if (isDue) subj.due += 1;

      let topic = subj.topics.get(topicKey);
      if (!topic) {
        topic = { label: topicLabel, topicId, sum: 0, count: 0, due: 0 };
        subj.topics.set(topicKey, topic);
      }
      topic.sum += mastery;
      topic.count += 1;
      if (isDue) topic.due += 1;
    }

    const tree = Array.from(subjects.entries())
      .map(([subject, s]) => ({
        subject,
        label: s.label,
        mastery: s.count ? Math.round(s.sum / s.count) : 0,
        cardCount: s.count,
        dueCount: s.due,
        topics: Array.from(s.topics.values())
          .map((tp) => ({
            label: tp.label,
            topicId: tp.topicId,
            mastery: tp.count ? Math.round(tp.sum / tp.count) : 0,
            cardCount: tp.count,
            dueCount: tp.due,
          }))
          // Weakest topics first — that's where the user should focus.
          .sort((a, b) => a.mastery - b.mastery),
      }))
      .sort((a, b) => b.cardCount - a.cardCount);

    res.json({ success: true, subjects: tree });
  } catch (error: any) {
    console.error('Get mastery tree error:', error);
    res.status(500).json({ success: false, error: 'Failed to get mastery' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /recall/due — cards due for review now
// ─────────────────────────────────────────────────────────
router.get(
  '/recall/due',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const parsed = dueCardsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query',
          details: parsed.error.flatten(),
        });
      }
      const { limit, subject } = parsed.data;

      const cards = await prisma.recallCard.findMany({
        where: {
          userId,
          nextReviewAt: { lte: new Date() },
          ...(subject ? { subject } : {}),
        },
        orderBy: { nextReviewAt: 'asc' },
        take: limit ?? DEFAULT_DUE_LIMIT,
        include: {
          question: {
            select: {
              id: true,
              question: true,
              options: true,
              correctAnswer: true,
              explanation: true,
            },
          },
        },
      });

      // Count classmates who also have each question due now.
      // Single grouped query instead of N round-trips.
      const questionIds = cards.map((c) => c.questionId);
      const classmatesCounts =
        questionIds.length > 0
          ? await prisma.recallCard.groupBy({
              by: ['questionId'],
              where: {
                questionId: { in: questionIds },
                userId: { not: userId },
                nextReviewAt: { lte: new Date() },
              },
              _count: { userId: true },
            })
          : [];
      const countByQuestion = new Map(
        classmatesCounts.map((g) => [g.questionId, g._count.userId]),
      );

      // Shape response so it matches the mobile `RecallCard` type
      // (apps/mobile/src/types/index.ts:RecallCard).
      const responseCards = cards.map((card) => ({
        id: card.id,
        questionId: card.questionId,
        subject: card.subject,
        subjectLabel: card.subjectLabel,
        courseTitle: card.courseTitle ?? undefined,
        questionText: card.question.question,
        // Correct option text = the right answer to reveal.
        answerText:
          card.question.options[card.question.correctAnswer] ??
          String(card.question.correctAnswer),
        hint: card.question.explanation ?? undefined,
        daysSinceLastSeen: daysSinceReview(card.lastReviewedAt),
        recallStrength: card.recallStrength,
        classmatesReviewingCount: countByQuestion.get(card.questionId) ?? 0,
        xpReward: card.xpReward,
        protectsStreak: card.protectsStreak,
      }));

      res.json({ success: true, data: responseCards });
    } catch (error: any) {
      console.error('[GET /recall/due]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch due cards',
        details: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /recall/:cardId/review — grade a card, advance SM-2 state, award XP
// ─────────────────────────────────────────────────────────
router.post(
  '/recall/:cardId/review',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const cardId = req.params.cardId;

      const parsed = reviewCardBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }
      const grade = parsed.data.grade as RecallGrade;

      const card = await prisma.recallCard.findUnique({ where: { id: cardId } });
      if (!card || card.userId !== userId) {
        return res.status(404).json({ success: false, error: 'Card not found' });
      }

      const before = {
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        recallStrength: card.recallStrength,
      };

      const outcome = applyReview(before, grade, card.xpReward);

      // Single transaction: update card state, log the review, award XP.
      // If any step fails, no half-state lands.
      const [updatedCard] = await prisma.$transaction([
        prisma.recallCard.update({
          where: { id: cardId },
          data: {
            easeFactor: outcome.easeFactor,
            interval: outcome.interval,
            repetitions: outcome.repetitions,
            recallStrength: outcome.recallStrength,
            nextReviewAt: outcome.nextReviewAt,
            lastReviewedAt: new Date(),
            reviewCount: { increment: 1 },
            ...(grade === 'again' ? { incorrectCount: { increment: 1 } } : {}),
          },
        }),
        prisma.recallReview.create({
          data: {
            recallCardId: cardId,
            userId,
            grade,
            xpEarned: outcome.xpEarned,
            easeBefore: before.easeFactor,
            intervalBefore: before.interval,
            recallStrengthBefore: before.recallStrength,
          },
        }),
        // XP award — mirrors existing pattern (QuizAttemptRecord increments
        // UserStats.xp). Upsert so a brand-new user's first recall still works.
        prisma.userStats.upsert({
          where: { userId },
          create: { userId, xp: outcome.xpEarned },
          update: { xp: { increment: outcome.xpEarned } },
        }),
      ]);

      res.json({
        success: true,
        data: {
          cardId: updatedCard.id,
          grade,
          xpEarned: outcome.xpEarned,
          nextReviewAt: outcome.nextReviewAt,
          recallStrength: outcome.recallStrength,
          interval: outcome.interval,
        },
      });
    } catch (error: any) {
      console.error('[POST /recall/:cardId/review]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit review',
        details: error.message,
      });
    }
  },
);

export default router;
