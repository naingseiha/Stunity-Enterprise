/**
 * Auto-create RecallCards from incorrect quiz answers.
 *
 * Called from quiz.routes.ts:`POST /quizzes/:id/submit` immediately after
 * the QuizAttempt is saved. For each wrong answer in the attempt:
 *   - If no card exists yet for (userId, questionId) → create one due
 *     tomorrow with a weak recallStrength.
 *   - If a card already exists → reset its scheduling state (the user just
 *     proved the memory's gone again).
 *
 * Non-fatal: any single upsert failure is logged but doesn't block the
 * quiz submission response. Bulk failure is awaited though, so the feed
 * sees the new cards immediately when the user scrolls.
 *
 * Subject derivation: takes the post's first topicTag (hashtag) if
 * present, otherwise falls back to 'general'. SubjectLabel is the post's
 * title (or the tag) so the UI eyebrow reads naturally.
 */

import type { PrismaClient } from '@prisma/client';

interface QuizPostContext {
  id: string;
  title?: string | null;
  topicTags?: string[];
}

interface GradedAnswerResult {
  questionId: string;
  correct: boolean;
}

interface DeriveSubjectResult {
  subject: string;
  subjectLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEAK_STRENGTH_ON_FAIL = 0.15;
const DEFAULT_XP_REWARD = 5;

const deriveSubjectFromPost = (post: QuizPostContext): DeriveSubjectResult => {
  const firstTag = post.topicTags?.[0];
  if (firstTag) {
    const cleaned = firstTag.replace(/^#/, '').trim();
    const subject = cleaned.toLowerCase();
    // Show "Tag · Quiz Title" if both present; otherwise just the tag.
    const subjectLabel = post.title
      ? `${cleaned} · ${post.title}`
      : cleaned;
    return { subject, subjectLabel };
  }
  return {
    subject: 'general',
    subjectLabel: post.title?.trim() || 'Quiz Review',
  };
};

export async function createRecallCardsForFailedAnswers(
  prisma: PrismaClient,
  userId: string,
  quizPost: QuizPostContext,
  answerResults: GradedAnswerResult[],
  defaultXpReward: number = DEFAULT_XP_REWARD,
): Promise<number> {
  const failed = answerResults.filter((r) => !r.correct);
  if (failed.length === 0) return 0;

  const { subject, subjectLabel } = deriveSubjectFromPost(quizPost);
  const tomorrow = new Date(Date.now() + DAY_MS);

  let createdOrReset = 0;

  await Promise.all(
    failed.map(async (result) => {
      try {
        await prisma.recallCard.upsert({
          where: {
            userId_questionId: { userId, questionId: result.questionId },
          },
          create: {
            userId,
            questionId: result.questionId,
            subject,
            subjectLabel,
            xpReward: defaultXpReward,
            // First failure → due tomorrow, weak memory state
            interval: 1,
            nextReviewAt: tomorrow,
            recallStrength: WEAK_STRENGTH_ON_FAIL,
            incorrectCount: 1,
          },
          update: {
            // Re-failure → reset SM-2 state (the memory's gone again)
            interval: 1,
            repetitions: 0,
            nextReviewAt: tomorrow,
            recallStrength: WEAK_STRENGTH_ON_FAIL,
            incorrectCount: { increment: 1 },
          },
        });
        createdOrReset += 1;
      } catch (err) {
        // Don't block quiz submission on a single card failure
        console.error('[recall.autoCreate] upsert failed', {
          userId,
          questionId: result.questionId,
          err,
        });
      }
    }),
  );

  return createdOrReset;
}

// ── Reels: single-answer → spaced repetition ─────────────────────────────
//
// A QUIZ_QUESTION reel is answered one tap at a time (not a whole quiz
// submission), so it can't reuse the batch helper above. This closes the
// EduReels learning loop: every quiz-reel answer becomes a RecallCard so it
// feeds SM-2 scheduling AND the subject-mastery aggregation (which reads
// RecallCards), not just the local combo/XP HUD.
//
// Semantics mirror the quiz-submit path for misses, and add a "learned"
// seed for first-time correct answers so the loop is self-feeding even for
// learners who rarely miss:
//   - wrong            → due tomorrow, weak memory; reset SM-2 on re-fail
//   - correct (new)    → scheduled a few days out, healthy memory, 1 rep
//   - correct (exists) → left untouched (don't disturb live SM-2 state)
//
// Best-effort: a missing/non-DB question id (e.g. a fallback reel) or any
// failure resolves to `false` and never throws, so it can't break the
// interaction response.

const LEARNED_INTERVAL_DAYS = 3;
const LEARNED_STRENGTH = 0.6;

export async function upsertRecallCardFromReelAnswer(
  prisma: PrismaClient,
  userId: string,
  questionId: string,
  correct: boolean,
): Promise<boolean> {
  if (!questionId) return false;
  try {
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        points: true,
        post: { select: { id: true, title: true, topicTags: true } },
      },
    });
    // Fallback reels (id like 'quiz-1') have no backing row — nothing to card.
    if (!question?.post) return false;

    const { subject, subjectLabel } = deriveSubjectFromPost(question.post);
    const xpReward = question.points && question.points > 0 ? question.points : DEFAULT_XP_REWARD;

    if (!correct) {
      const tomorrow = new Date(Date.now() + DAY_MS);
      await prisma.recallCard.upsert({
        where: { userId_questionId: { userId, questionId } },
        create: {
          userId,
          questionId,
          subject,
          subjectLabel,
          xpReward,
          interval: 1,
          nextReviewAt: tomorrow,
          recallStrength: WEAK_STRENGTH_ON_FAIL,
          incorrectCount: 1,
        },
        update: {
          interval: 1,
          repetitions: 0,
          nextReviewAt: tomorrow,
          recallStrength: WEAK_STRENGTH_ON_FAIL,
          incorrectCount: { increment: 1 },
        },
      });
      return true;
    }

    // Correct: seed a forward-scheduled card if absent; never disturb an
    // existing card's live schedule (it may be mid-SM-2-cycle).
    const existing = await prisma.recallCard.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { id: true },
    });
    if (existing) return false;

    await prisma.recallCard.create({
      data: {
        userId,
        questionId,
        subject,
        subjectLabel,
        xpReward,
        interval: LEARNED_INTERVAL_DAYS,
        repetitions: 1,
        nextReviewAt: new Date(Date.now() + LEARNED_INTERVAL_DAYS * DAY_MS),
        recallStrength: LEARNED_STRENGTH,
      },
    });
    return true;
  } catch (err) {
    console.error('[recall.reelAnswer] upsert failed', { userId, questionId, err });
    return false;
  }
}

// ── Reels: seed the recall pool from existing quiz content ───────────────
//
// The RECALL_CARD reel pool is empty until the learner generates cards by
// answering quizzes — so a brand-new user never sees the one surface that is
// genuine spaced repetition. This bootstraps native reel content: when the
// user's due pool is thin, it creates a small batch of RecallCards from real
// QuizQuestion rows they haven't carded yet, due now so they surface as recall
// reels (first-exposure flashcards — the card UI reveals the answer, then the
// user self-grades, which advances normal SM-2 from there).
//
// Idempotent (@@unique[userId,questionId] + skip-on-conflict), bounded, and
// best-effort. Self-feeding: once seeded cards are reviewed they reschedule
// via SM-2 and new quiz answers keep adding cards, so the seeder quiesces.

const SEED_MIN_DUE_THRESHOLD = 3; // only seed when fewer than this are due
const SEED_BATCH = 5; // cards created per trigger
const SEED_FIRST_EXPOSURE_STRENGTH = 0.2; // honest: not learned yet

export async function seedRecallCardsFromQuizPool(
  prisma: PrismaClient,
  userId: string,
  opts: { minDue?: number; batch?: number } = {},
): Promise<number> {
  const minDue = opts.minDue ?? SEED_MIN_DUE_THRESHOLD;
  const batch = opts.batch ?? SEED_BATCH;
  try {
    const now = new Date();
    const dueCount = await prisma.recallCard.count({
      where: { userId, nextReviewAt: { lte: now } },
    });
    if (dueCount >= minDue) return 0;

    // Exclude questions the user has already carded so we never duplicate.
    const existing = await prisma.recallCard.findMany({
      where: { userId },
      select: { questionId: true },
    });
    const cardedIds = existing.map((c) => c.questionId);

    const candidates = await prisma.quizQuestion.findMany({
      where: cardedIds.length ? { id: { notIn: cardedIds } } : {},
      orderBy: { createdAt: 'desc' },
      take: batch,
      select: {
        id: true,
        points: true,
        post: { select: { id: true, title: true, topicTags: true } },
      },
    });
    if (candidates.length === 0) return 0;

    let seeded = 0;
    for (const q of candidates) {
      if (!q.post) continue;
      const { subject, subjectLabel } = deriveSubjectFromPost(q.post);
      try {
        await prisma.recallCard.create({
          data: {
            userId,
            questionId: q.id,
            subject,
            subjectLabel,
            xpReward: q.points && q.points > 0 ? q.points : DEFAULT_XP_REWARD,
            interval: 0,
            repetitions: 0,
            nextReviewAt: now, // due now → surfaces as a recall reel immediately
            recallStrength: SEED_FIRST_EXPOSURE_STRENGTH,
          },
        });
        seeded += 1;
      } catch {
        // Unique-constraint race or FK miss — skip this one, keep going.
      }
    }
    return seeded;
  } catch (err) {
    console.error('[recall.seed] failed', { userId, err });
    return 0;
  }
}
