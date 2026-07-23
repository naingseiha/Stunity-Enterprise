/**
 * SM-2 spaced-repetition scheduler tests.
 *
 * Guards the recall scheduling integrity the app depends on (interval growth,
 * ease-factor floor/ceiling, lapse reset, grade→XP mapping). `applyReview` is
 * pure with an injectable `now`, so every assertion is deterministic.
 */
import { applyReview, daysSinceReview, type RecallCardState } from './sm2';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-05T12:00:00.000Z');

// A fresh, never-reviewed card at the SM-2 default ease (2.5).
const freshCard: RecallCardState = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  recallStrength: 0,
};

const daysFromNow = (n: number) => new Date(NOW.getTime() + n * DAY_MS);

describe('applyReview — interval & repetition schedule', () => {
  it('first successful review: rep 0→1, interval 1 day, ease unchanged on "good"', () => {
    const out = applyReview(freshCard, 'good', 10, NOW);
    expect(out.repetitions).toBe(1);
    expect(out.interval).toBe(1);
    expect(out.easeFactor).toBeCloseTo(2.5, 5); // q=4 → delta 0
    expect(out.nextReviewAt).toEqual(daysFromNow(1));
  });

  it('second successful review: rep 1→2, interval jumps to 6 days', () => {
    const afterFirst: RecallCardState = { ...freshCard, repetitions: 1, interval: 1 };
    const out = applyReview(afterFirst, 'good', 10, NOW);
    expect(out.repetitions).toBe(2);
    expect(out.interval).toBe(6);
    expect(out.nextReviewAt).toEqual(daysFromNow(6));
  });

  it('third+ review: interval = round(prevInterval * easeFactor)', () => {
    const mature: RecallCardState = { ...freshCard, repetitions: 2, interval: 6 };
    const out = applyReview(mature, 'good', 10, NOW);
    expect(out.repetitions).toBe(3);
    expect(out.interval).toBe(Math.round(6 * 2.5)); // 15
    expect(out.nextReviewAt).toEqual(daysFromNow(15));
  });

  it('"easy" applies the ×1.3 bonus on top of the interval and bumps ease +0.10', () => {
    const mature: RecallCardState = { ...freshCard, repetitions: 2, interval: 6 };
    const out = applyReview(mature, 'easy', 10, NOW);
    // ease 2.5 → 2.6; interval round(6 * 2.6)=16, then easy bonus round(16*1.3)=21
    expect(out.easeFactor).toBeCloseTo(2.6, 5);
    expect(out.interval).toBe(21);
  });
});

describe('applyReview — failure (lapse) resets', () => {
  it('"again" resets repetitions to 0 and interval to 1 day', () => {
    const mature: RecallCardState = { ...freshCard, repetitions: 5, interval: 60 };
    const out = applyReview(mature, 'again', 10, NOW);
    expect(out.repetitions).toBe(0);
    expect(out.interval).toBe(1);
    expect(out.nextReviewAt).toEqual(daysFromNow(1));
  });

  it('"again" drops ease by 0.54 from the failed card', () => {
    const out = applyReview({ ...freshCard, easeFactor: 2.5 }, 'again', 10, NOW);
    expect(out.easeFactor).toBeCloseTo(2.5 - 0.54, 5); // 1.96
  });

  it('failure decays recallStrength to 30% of prior (min 0.1)', () => {
    const out = applyReview({ ...freshCard, recallStrength: 0.8 }, 'again', 10, NOW);
    expect(out.recallStrength).toBeCloseTo(0.8 * 0.3, 5); // 0.24
    const floored = applyReview({ ...freshCard, recallStrength: 0.05 }, 'again', 10, NOW);
    expect(floored.recallStrength).toBe(0.1);
  });
});

describe('applyReview — ease factor clamping [1.3, 3.0]', () => {
  it('never falls below the 1.3 floor under repeated failures', () => {
    let state: RecallCardState = { ...freshCard, easeFactor: 1.5 };
    for (let i = 0; i < 5; i++) {
      const out = applyReview(state, 'again', 10, NOW);
      state = { ...state, easeFactor: out.easeFactor };
    }
    expect(state.easeFactor).toBe(1.3);
  });

  it('never exceeds the 3.0 ceiling under repeated easies', () => {
    let state: RecallCardState = { ...freshCard, easeFactor: 2.9, repetitions: 3, interval: 30 };
    for (let i = 0; i < 5; i++) {
      const out = applyReview(state, 'easy', 10, NOW);
      state = { ...state, easeFactor: out.easeFactor, repetitions: out.repetitions, interval: out.interval };
    }
    expect(state.easeFactor).toBe(3.0);
  });
});

describe('applyReview — recallStrength stays within [0, 1]', () => {
  it('clamps to at most 1 even for deep, high-ease cards', () => {
    const out = applyReview(
      { easeFactor: 3.0, interval: 200, repetitions: 20, recallStrength: 0.9 },
      'easy',
      10,
      NOW,
    );
    expect(out.recallStrength).toBeLessThanOrEqual(1);
    expect(out.recallStrength).toBeGreaterThanOrEqual(0);
  });
});

describe('applyReview — XP by grade', () => {
  it('again=1, good=cardXpReward, easy=round(reward*1.4)', () => {
    expect(applyReview(freshCard, 'again', 10, NOW).xpEarned).toBe(1);
    expect(applyReview(freshCard, 'good', 10, NOW).xpEarned).toBe(10);
    expect(applyReview(freshCard, 'easy', 10, NOW).xpEarned).toBe(14);
  });
});

describe('daysSinceReview', () => {
  it('returns 0 for a never-reviewed (null) card', () => {
    expect(daysSinceReview(null, NOW)).toBe(0);
  });

  it('floors elapsed time to whole days', () => {
    expect(daysSinceReview(new Date(NOW.getTime() - 3 * DAY_MS - 1000), NOW)).toBe(3);
    expect(daysSinceReview(new Date(NOW.getTime() - 12 * 60 * 60 * 1000), NOW)).toBe(0); // 12h → 0d
  });

  it('never returns negative for a future timestamp', () => {
    expect(daysSinceReview(daysFromNow(5), NOW)).toBe(0);
  });
});
