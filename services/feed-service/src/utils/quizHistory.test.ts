/**
 * WI5 — quiz history aggregation.
 */
import { buildQuizHistoryAggregates, AttemptSummary } from './quizHistory';

const attempt = (over: Partial<AttemptSummary> & { id: string }): AttemptSummary => ({
  score: 0,
  passed: false,
  pointsEarned: 0,
  submittedAt: '2026-06-01T00:00:00Z',
  perQuestion: [],
  ...over,
});

describe('buildQuizHistoryAggregates', () => {
  it('returns zeroed aggregates for no attempts', () => {
    const agg = buildQuizHistoryAggregates([]);
    expect(agg.attemptCount).toBe(0);
    expect(agg.trend).toBe('flat');
    expect(agg.perQuestionAccuracy).toEqual([]);
  });

  it('computes best/latest/first/average and pass rate', () => {
    const agg = buildQuizHistoryAggregates([
      attempt({ id: 'a', score: 40, passed: false, submittedAt: '2026-06-01T00:00:00Z' }),
      attempt({ id: 'b', score: 90, passed: true, submittedAt: '2026-06-03T00:00:00Z' }),
      attempt({ id: 'c', score: 70, passed: true, submittedAt: '2026-06-02T00:00:00Z' }),
    ]);
    expect(agg.attemptCount).toBe(3);
    expect(agg.bestScore).toBe(90);
    expect(agg.firstScore).toBe(40); // earliest submittedAt
    expect(agg.latestScore).toBe(90); // latest submittedAt
    expect(agg.averageScore).toBe(67); // (40+90+70)/3 = 66.67 → 67
    expect(agg.passCount).toBe(2);
    expect(agg.passRate).toBe(67);
  });

  it('detects an upward trend (latest > first)', () => {
    expect(
      buildQuizHistoryAggregates([
        attempt({ id: 'a', score: 30, submittedAt: '2026-06-01T00:00:00Z' }),
        attempt({ id: 'b', score: 80, submittedAt: '2026-06-02T00:00:00Z' }),
      ]).trend,
    ).toBe('up');
  });

  it('detects a downward trend and flat for a single attempt', () => {
    expect(
      buildQuizHistoryAggregates([
        attempt({ id: 'a', score: 80, submittedAt: '2026-06-01T00:00:00Z' }),
        attempt({ id: 'b', score: 30, submittedAt: '2026-06-02T00:00:00Z' }),
      ]).trend,
    ).toBe('down');
    expect(buildQuizHistoryAggregates([attempt({ id: 'a', score: 50 })]).trend).toBe('flat');
  });

  it('aggregates per-question accuracy across attempts in stable order', () => {
    const agg = buildQuizHistoryAggregates([
      attempt({
        id: 'a',
        submittedAt: '2026-06-01T00:00:00Z',
        perQuestion: [
          { questionId: 'q1', correct: true },
          { questionId: 'q2', correct: false },
        ],
      }),
      attempt({
        id: 'b',
        submittedAt: '2026-06-02T00:00:00Z',
        perQuestion: [
          { questionId: 'q1', correct: false },
          { questionId: 'q2', correct: false },
        ],
      }),
    ]);
    expect(agg.perQuestionAccuracy).toEqual([
      { questionId: 'q1', correct: 1, total: 2, accuracy: 50 },
      { questionId: 'q2', correct: 0, total: 2, accuracy: 0 },
    ]);
  });
});
