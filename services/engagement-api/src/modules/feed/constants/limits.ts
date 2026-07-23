/**
 * Canonical content limits for polls and quizzes (WI1 + WI2).
 *
 * SINGLE SOURCE OF TRUTH on the server side. The mobile app mirrors these exact
 * values in apps/mobile/src/constants/index.ts (POLL_LIMITS / QUIZ_LIMITS) —
 * keep the two in sync. The server is authoritative: it must reject any payload
 * that exceeds these regardless of what the client sent.
 *
 * Why max 6 options: above ~6, the percentage bars + tap targets stop fitting a
 * phone screen and choice-overload depresses response rate. 6 covers virtually
 * all real polls/quiz questions while keeping every surface legible.
 */

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_OPTION_MAX_LEN = 80;

export const QUIZ_MIN_OPTIONS = 2;
export const QUIZ_MAX_OPTIONS = 6;
export const QUIZ_OPTION_MAX_LEN = 120;
export const QUIZ_QUESTION_MAX_LEN = 500;
