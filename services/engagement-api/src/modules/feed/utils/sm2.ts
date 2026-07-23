/**
 * SM-2 spaced-repetition algorithm — pure, no I/O.
 *
 * Based on Piotr Wozniak's SuperMemo 2 (1985), the foundation of every
 * modern flashcard scheduler (Anki, Mochi, RemNote, FSRS predecessor).
 *
 * Stunity uses a 3-grade interface (Again / Got it / Easy) which maps onto
 * SuperMemo's 0–5 quality scale at the 3 most semantically meaningful
 * points: 1 (failed but recognized), 4 (recalled with effort), 5 (perfect).
 *
 *   Grade       Quality  Outcome
 *   ─────────   ───────  ──────────────────────────────────────────
 *   'again'     1        Reset repetitions to 0, interval to 1d,
 *                        ease drops sharply (-0.54).
 *   'good'      4        Advance interval per SM-2 (1d → 6d → ef·i),
 *                        ease unchanged.
 *   'easy'      5        Advance interval × 1.3 bonus, ease bumps +0.10.
 *
 * Ease factor is clamped to [1.3, 3.0] — the floor is Wozniak's, the
 * ceiling prevents runaway scheduling on a streak of Easies.
 */

export type RecallGrade = 'again' | 'good' | 'easy';

export interface RecallCardState {
  easeFactor: number;
  interval: number;          // days
  repetitions: number;
  recallStrength: number;    // 0..1 — UI-facing decay signal
}

export interface RecallReviewOutcome {
  easeFactor: number;
  interval: number;
  repetitions: number;
  recallStrength: number;
  nextReviewAt: Date;
  xpEarned: number;
}

const GRADE_TO_QUALITY: Record<RecallGrade, number> = {
  again: 1,
  good: 4,
  easy: 5,
};

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const PASS_THRESHOLD = 3; // SuperMemo: quality >= 3 counts as successful recall
const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Apply a review to a card's SM-2 state and return the new state +
 * next review date + XP earned for the grade.
 *
 * `now` is injectable for deterministic testing.
 */
export function applyReview(
  state: RecallCardState,
  grade: RecallGrade,
  cardXpReward: number,
  now: Date = new Date(),
): RecallReviewOutcome {
  const quality = GRADE_TO_QUALITY[grade];
  const passed = quality >= PASS_THRESHOLD;

  // ── Ease factor update (Wozniak's formula, always applied) ──
  // ef' = ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  //   q=5 → +0.10   q=4 → 0    q=1 → -0.54
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const easeFactor = clamp(state.easeFactor + easeDelta, MIN_EASE, MAX_EASE);

  // ── Repetitions + interval ──
  let repetitions: number;
  let interval: number;

  if (passed) {
    repetitions = state.repetitions + 1;
    if (state.repetitions === 0) {
      interval = 1;
    } else if (state.repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(state.interval * easeFactor);
    }
    if (grade === 'easy') {
      // Wozniak's optional "easy bonus" — pushes the card further out.
      interval = Math.round(interval * 1.3);
    }
  } else {
    // Failure resets: see the card again tomorrow, repetitions reset.
    repetitions = 0;
    interval = 1;
  }

  const nextReviewAt = new Date(now.getTime() + interval * DAY_MS);

  // ── Recall strength estimate (UI-facing, not SuperMemo-canonical) ──
  // Simple heuristic: deeper rep + higher ease → stronger memory.
  // On failure, decay sharply (memory just proved fragile).
  const recallStrength = passed
    ? clamp(0.4 + Math.min(0.55, repetitions * 0.12) + (easeFactor - 2.5) * 0.06, 0, 1)
    : clamp(state.recallStrength * 0.3, 0.1, 1);

  // ── XP — matches the mobile UI's "+N XP" chips on the grade buttons ──
  const xpEarned =
    grade === 'again' ? 1
    : grade === 'good' ? cardXpReward
    : Math.round(cardXpReward * 1.4);

  return {
    easeFactor,
    interval,
    repetitions,
    recallStrength,
    nextReviewAt,
    xpEarned,
  };
}

/**
 * Days elapsed since the card was last reviewed. Surfaced in the mobile
 * UI as the "Fading · 3d" decay caption.
 */
export function daysSinceReview(
  lastReviewedAt: Date | null,
  now: Date = new Date(),
): number {
  if (!lastReviewedAt) return 0;
  const ms = now.getTime() - lastReviewedAt.getTime();
  return Math.max(0, Math.floor(ms / DAY_MS));
}
