import {
  computeStreakTransition,
  MAX_FREEZES_AVAILABLE,
  streakAchievementForLength,
  StreakState,
} from './streakCalendar';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-01T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

const base = (overrides: Partial<StreakState> = {}): StreakState => ({
  currentStreak: 5,
  longestStreak: 5,
  lastQuizDate: daysAgo(1),
  freezesTotal: 0,
  freezesUsed: 0,
  ...overrides,
});

describe('computeStreakTransition', () => {
  it('first ever activity starts the streak at 1', () => {
    const t = computeStreakTransition(base({ currentStreak: 0, longestStreak: 0, lastQuizDate: null }), NOW);
    expect(t.currentStreak).toBe(1);
    expect(t.streakIncreased).toBe(true);
  });

  it('same-day activity does not advance the streak', () => {
    const t = computeStreakTransition(base({ lastQuizDate: daysAgo(0) }), NOW);
    expect(t.currentStreak).toBe(5);
    expect(t.streakIncreased).toBe(false);
  });

  it('next-day activity advances the streak by one', () => {
    const t = computeStreakTransition(base({ lastQuizDate: daysAgo(1) }), NOW);
    expect(t.currentStreak).toBe(6);
    expect(t.streakIncreased).toBe(true);
    expect(t.freezeSpent).toBe(false);
  });

  it('one missed day WITH a freeze: streak survives, freeze is spent', () => {
    const t = computeStreakTransition(
      base({ currentStreak: 10, lastQuizDate: daysAgo(2), freezesTotal: 1, freezesUsed: 0 }),
      NOW,
    );
    expect(t.freezeSpent).toBe(true);
    expect(t.currentStreak).toBe(11);
    expect(t.freezesTotal).toBe(0);
    expect(t.freezesUsed).toBe(1);
  });

  it('one missed day WITHOUT a freeze: streak resets to 1', () => {
    const t = computeStreakTransition(
      base({ currentStreak: 10, lastQuizDate: daysAgo(2), freezesTotal: 0 }),
      NOW,
    );
    expect(t.freezeSpent).toBe(false);
    expect(t.currentStreak).toBe(1);
  });

  it('two or more missed days: resets even with a freeze (cannot bridge >1 day)', () => {
    const t = computeStreakTransition(
      base({ currentStreak: 10, lastQuizDate: daysAgo(3), freezesTotal: 1 }),
      NOW,
    );
    expect(t.freezeSpent).toBe(false);
    expect(t.currentStreak).toBe(1);
    expect(t.freezesTotal).toBe(1); // untouched
  });

  it('earns a freeze on a 7-day milestone when none is held', () => {
    const t = computeStreakTransition(
      base({ currentStreak: 6, lastQuizDate: daysAgo(1), freezesTotal: 0 }),
      NOW,
    );
    expect(t.currentStreak).toBe(7);
    expect(t.freezeEarned).toBe(true);
    expect(t.freezesTotal).toBe(MAX_FREEZES_AVAILABLE);
  });

  it('does not exceed the freeze cap at a milestone when one is already held', () => {
    const t = computeStreakTransition(
      base({ currentStreak: 6, lastQuizDate: daysAgo(1), freezesTotal: 1 }),
      NOW,
    );
    expect(t.currentStreak).toBe(7);
    expect(t.freezeEarned).toBe(false);
    expect(t.freezesTotal).toBe(1);
  });

  it('unlocks the milestone achievement at exactly 7/30/100', () => {
    expect(streakAchievementForLength(7)).toBe('STREAK_7_DAYS');
    expect(streakAchievementForLength(30)).toBe('STREAK_30_DAYS');
    expect(streakAchievementForLength(100)).toBe('STREAK_100_DAYS');
    expect(streakAchievementForLength(8)).toBeNull();
  });

  it('longestStreak never decreases', () => {
    const t = computeStreakTransition(
      base({ currentStreak: 10, longestStreak: 42, lastQuizDate: daysAgo(5) }),
      NOW,
    );
    expect(t.currentStreak).toBe(1);
    expect(t.longestStreak).toBe(42);
  });
});
