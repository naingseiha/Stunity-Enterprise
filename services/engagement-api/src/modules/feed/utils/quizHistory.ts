/**
 * WI5 — Quiz history aggregation (pure).
 *
 * Turns a user's raw attempts on one quiz into a progress summary: best/latest
 * score, pass trend, and per-question accuracy. Kept free of Prisma so it's
 * unit-testable; the route grades each stored attempt (via gradeQuizSubmission)
 * and feeds the per-question correctness in here.
 */

export interface AttemptSummary {
  id: string;
  score: number; // 0..100
  passed: boolean;
  pointsEarned: number;
  submittedAt: string | Date;
  /** Per-question correctness for this attempt (from gradeQuizSubmission). */
  perQuestion: { questionId: string; correct: boolean }[];
}

export interface PerQuestionAccuracy {
  questionId: string;
  correct: number;
  total: number;
  accuracy: number; // 0..100
}

export interface QuizHistoryAggregates {
  attemptCount: number;
  bestScore: number;
  latestScore: number;
  firstScore: number;
  averageScore: number; // rounded 0..100
  passCount: number;
  passRate: number; // rounded 0..100
  /** latest vs first score. 'flat' for a single attempt or no change. */
  trend: 'up' | 'down' | 'flat';
  perQuestionAccuracy: PerQuestionAccuracy[];
}

const toMs = (d: string | Date): number => (d instanceof Date ? d.getTime() : new Date(d).getTime());

/**
 * Aggregate a user's attempts on one quiz. Input order doesn't matter — sorted
 * internally by submittedAt ascending so "first" and "latest" are well-defined.
 */
export function buildQuizHistoryAggregates(attempts: AttemptSummary[]): QuizHistoryAggregates {
  if (attempts.length === 0) {
    return {
      attemptCount: 0,
      bestScore: 0,
      latestScore: 0,
      firstScore: 0,
      averageScore: 0,
      passCount: 0,
      passRate: 0,
      trend: 'flat',
      perQuestionAccuracy: [],
    };
  }

  const ordered = [...attempts].sort((a, b) => toMs(a.submittedAt) - toMs(b.submittedAt));
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  const attemptCount = ordered.length;
  const bestScore = ordered.reduce((max, a) => Math.max(max, a.score), 0);
  const averageScore = Math.round(ordered.reduce((sum, a) => sum + a.score, 0) / attemptCount);
  const passCount = ordered.filter((a) => a.passed).length;
  const passRate = Math.round((passCount / attemptCount) * 100);

  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (attemptCount > 1) {
    if (latest.score > first.score) trend = 'up';
    else if (latest.score < first.score) trend = 'down';
  }

  // Per-question accuracy across all attempts. Preserves first-seen question
  // order so the UI lists questions in a stable order.
  const order: string[] = [];
  const tally = new Map<string, { correct: number; total: number }>();
  for (const a of ordered) {
    for (const pq of a.perQuestion) {
      let t = tally.get(pq.questionId);
      if (!t) {
        t = { correct: 0, total: 0 };
        tally.set(pq.questionId, t);
        order.push(pq.questionId);
      }
      t.total += 1;
      if (pq.correct) t.correct += 1;
    }
  }
  const perQuestionAccuracy: PerQuestionAccuracy[] = order.map((questionId) => {
    const t = tally.get(questionId)!;
    return {
      questionId,
      correct: t.correct,
      total: t.total,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
    };
  });

  return {
    attemptCount,
    bestScore,
    latestScore: latest.score,
    firstScore: first.score,
    averageScore,
    passCount,
    passRate,
    trend,
    perQuestionAccuracy,
  };
}
