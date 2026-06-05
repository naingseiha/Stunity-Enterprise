/**
 * Reel combo + XP scoring — pure, no I/O.
 *
 * Extracted from the DB transaction in reels.routes.ts (applyCombo) so the
 * combo/XP rules can be unit-tested in isolation. applyCombo now just loads the
 * user's current combo state, calls computeCombo, and persists the result.
 */
import type { ComboOutcome } from './reelResponses';

export const COMBO_FILL_EVERY = 5; // a "loot fill" lands every Nth correct in a row
export const COMBO_FILL_BONUS = 50; // bonus XP granted on each fill

export interface ComboState {
  combo: number;
  highestCombo: number;
  totalPoints: number;
}

export interface ComboComputation {
  combo: number;
  highestCombo: number;
  totalPoints: number;
  xpEarned: number;
  comboBonus: number;
  isComboFill: boolean;
}

/**
 * Compute the next combo state for an answer outcome.
 *
 *   'correct' → +1 to the streak; every COMBO_FILL_EVERY-th in a row pays a
 *               COMBO_FILL_BONUS on top of baseXp.
 *   'wrong'   → streak resets to 0 and the answer earns 0 XP.
 *   'neutral' → streak untouched; still earns baseXp (combo forgiveness, e.g. a
 *               recall "again" grade).
 *
 * highestCombo only ever ratchets up. totalPoints accumulates xpEarned.
 */
export function computeCombo(
  prev: ComboState,
  result: ComboOutcome,
  baseXp: number,
): ComboComputation {
  let combo = prev.combo;
  let highestCombo = prev.highestCombo;
  let comboBonus = 0;
  let isComboFill = false;

  if (result === 'correct') {
    combo += 1;
    if (combo > highestCombo) highestCombo = combo;
    if (combo > 0 && combo % COMBO_FILL_EVERY === 0) {
      comboBonus = COMBO_FILL_BONUS;
      isComboFill = true;
    }
  } else if (result === 'wrong') {
    combo = 0;
  }
  // 'neutral' leaves combo as-is.

  const xpEarned = result === 'wrong' ? 0 : baseXp + comboBonus;
  const totalPoints = prev.totalPoints + xpEarned;

  return { combo, highestCombo, totalPoints, xpEarned, comboBonus, isComboFill };
}
