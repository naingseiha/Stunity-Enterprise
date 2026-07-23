import type { Prisma, PrismaClient } from '@prisma/client';

const LATEST_ATTEMPT_SUMMARY_SELECT = {
  id: true,
  quizId: true,
  score: true,
  passed: true,
  pointsEarned: true,
  submittedAt: true,
} satisfies Prisma.QuizAttemptSelect;

export const LATEST_ATTEMPT_DETAIL_SELECT = {
  ...LATEST_ATTEMPT_SUMMARY_SELECT,
  answers: true,
} satisfies Prisma.QuizAttemptSelect;

export type QuizAttemptSummary = Prisma.QuizAttemptGetPayload<{
  select: typeof LATEST_ATTEMPT_SUMMARY_SELECT;
}>;

export type QuizAttemptDetail = Prisma.QuizAttemptGetPayload<{
  select: typeof LATEST_ATTEMPT_DETAIL_SELECT;
}>;

/**
 * Latest attempt per quiz for a user (newest submittedAt wins).
 * Avoids Prisma `distinct` + `orderBy` pitfalls on PostgreSQL.
 */
export async function getLatestQuizAttemptsByQuizIds(
  db: PrismaClient,
  userId: string,
  quizIds: string[],
): Promise<Map<string, QuizAttemptSummary>> {
  if (quizIds.length === 0) return new Map();

  const attempts = await db.quizAttempt.findMany({
    where: { quizId: { in: quizIds }, userId },
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    select: LATEST_ATTEMPT_SUMMARY_SELECT,
  });

  const latestByQuizId = new Map<string, QuizAttemptSummary>();
  for (const attempt of attempts) {
    if (!latestByQuizId.has(attempt.quizId)) {
      latestByQuizId.set(attempt.quizId, attempt);
    }
  }

  return latestByQuizId;
}

/** Single quiz — newest attempt for the current user (read-after-write safe). */
export async function getLatestQuizAttemptForUser(
  db: PrismaClient,
  quizId: string,
  userId: string,
): Promise<QuizAttemptDetail | null> {
  return db.quizAttempt.findFirst({
    where: { quizId, userId },
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    select: LATEST_ATTEMPT_DETAIL_SELECT,
  });
}
