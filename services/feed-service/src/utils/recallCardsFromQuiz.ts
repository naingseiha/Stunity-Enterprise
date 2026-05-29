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
