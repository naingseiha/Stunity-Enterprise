/**
 * Pure helpers for reel response persistence (WI4).
 *
 * Kept free of Prisma/Express so the reward-gating + hydrate-reduction logic is
 * unit-testable without a database. The route (reels.routes.ts) wires these to
 * the actual reads/writes.
 *
 * Policy: multiple attempts are allowed, but only the FIRST attempt earns XP /
 * moves the combo / reschedules SM-2 (anti-farming). Re-attempts are recorded
 * and replayed but are reward-neutral.
 */

/** Reel card types that persist a per-user answer record (QuizQuestions under
 * the hood). Polls are excluded — they persist via PollVote. */
export const REEL_RESPONSE_TYPES = new Set(['QUIZ_QUESTION', 'TF_CARD', 'CLOZE_CARD']);

export type ComboOutcome = 'correct' | 'wrong' | 'neutral';

export interface ReelRewardPlan {
  /** How the combo meter should treat this attempt. */
  comboOutcome: ComboOutcome;
  /** Whether this attempt may earn XP. */
  earnsReward: boolean;
  /** Whether this attempt should upsert/reschedule the SM-2 RecallCard. */
  reschedulesSm2: boolean;
}

/**
 * Decide how an answer affects rewards. First attempt advances/resets the combo
 * and earns; every later attempt is reward-neutral (recorded only).
 */
export function planReelReward(attemptNumber: number, correct: boolean): ReelRewardPlan {
  const isFirst = attemptNumber <= 1;
  if (!isFirst) {
    return { comboOutcome: 'neutral', earnsReward: false, reschedulesSm2: false };
  }
  return {
    comboOutcome: correct ? 'correct' : 'wrong',
    earnsReward: true,
    reschedulesSm2: true,
  };
}

export interface StoredResponseRow {
  itemId: string;
  chosenIndex: number;
  correct: boolean;
  attemptNumber: number;
  createdAt?: Date | string;
}

export interface MyResponse {
  chosenIndex: number;
  correct: boolean;
  attemptNumber: number;
}

/**
 * Reduce a DESC-by-createdAt list of stored responses to the latest one per
 * itemId. Robust if the caller forgets to sort — falls back to the highest
 * attemptNumber when createdAt is unavailable/equal.
 */
export function latestResponsesByItem(rows: StoredResponseRow[]): Map<string, MyResponse> {
  const out = new Map<string, MyResponse>();
  for (const r of rows) {
    const existing = out.get(r.itemId);
    if (!existing || r.attemptNumber > existing.attemptNumber) {
      out.set(r.itemId, { chosenIndex: r.chosenIndex, correct: r.correct, attemptNumber: r.attemptNumber });
    }
  }
  return out;
}

/**
 * Attach `payload.myResponse` to each interactive reel card that has a stored
 * answer for the viewer. Non-interactive cards (and those with no prior answer)
 * pass through unchanged.
 */
export function attachMyResponses<T extends { type: string; id: string; payload?: any }>(
  items: T[],
  latestByItem: Map<string, MyResponse>,
): T[] {
  if (latestByItem.size === 0) return items;
  return items.map((it) => {
    if (!REEL_RESPONSE_TYPES.has(it.type)) return it;
    const mine = latestByItem.get(it.id);
    return mine ? { ...it, payload: { ...(it.payload ?? {}), myResponse: mine } } : it;
  });
}
