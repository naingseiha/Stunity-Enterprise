/**
 * Client feature flags — mirror mobile EXPO_PUBLIC_* / backend env gates.
 * Only flags that gate UI surfaces belong here; prefer backend 404 for
 * unavailable endpoints as a second line of defense.
 */

/** Quiz War feed banner + /quiz-wars/* calls. Off unless explicitly enabled. */
export const QUIZ_WAR_ENABLED =
  process.env.NEXT_PUBLIC_QUIZ_WAR_ENABLED === 'true';

/** Subject mastery tree on Profile Performance (own profile). Default on. */
export const MASTERY_TREE_ENABLED =
  process.env.NEXT_PUBLIC_MASTERY_TREE_ENABLED !== 'false';

/** Scoped streak leaderboard on Profile Performance. Default on. */
export const STREAK_LEADERBOARD_ENABLED =
  process.env.NEXT_PUBLIC_STREAK_LEADERBOARD_ENABLED !== 'false';
