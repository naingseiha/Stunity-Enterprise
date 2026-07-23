/**
 * Reel combo + XP scoring tests.
 *
 * Guards the "no silent regression on combo/XP" invariant: streak increments,
 * the every-5th loot fill (+50), reset-on-wrong, neutral combo-forgiveness, and
 * the highest-combo ratchet. Pure logic extracted from applyCombo's DB txn.
 */
import {
  computeCombo,
  COMBO_FILL_EVERY,
  COMBO_FILL_BONUS,
  type ComboState,
} from './combo';

const at = (combo: number, highestCombo = combo, totalPoints = 0): ComboState => ({
  combo,
  highestCombo,
  totalPoints,
});

describe('computeCombo — correct answers', () => {
  it('increments the streak and awards baseXp (no fill mid-streak)', () => {
    const out = computeCombo(at(0), 'correct', 5);
    expect(out.combo).toBe(1);
    expect(out.xpEarned).toBe(5);
    expect(out.comboBonus).toBe(0);
    expect(out.isComboFill).toBe(false);
    expect(out.totalPoints).toBe(5);
  });

  it('pays the loot bonus on every COMBO_FILL_EVERY-th correct in a row', () => {
    const out = computeCombo(at(COMBO_FILL_EVERY - 1), 'correct', 5);
    expect(out.combo).toBe(COMBO_FILL_EVERY);
    expect(out.isComboFill).toBe(true);
    expect(out.comboBonus).toBe(COMBO_FILL_BONUS);
    expect(out.xpEarned).toBe(5 + COMBO_FILL_BONUS);
  });

  it('fills again on the next multiple (e.g. 10th), not in between', () => {
    expect(computeCombo(at(8), 'correct', 5).isComboFill).toBe(false); // → 9
    const tenth = computeCombo(at(9), 'correct', 5); // → 10
    expect(tenth.isComboFill).toBe(true);
    expect(tenth.comboBonus).toBe(COMBO_FILL_BONUS);
  });

  it('ratchets highestCombo up but never down', () => {
    expect(computeCombo(at(4, 4), 'correct', 5).highestCombo).toBe(5); // new high
    expect(computeCombo(at(2, 9), 'correct', 5).highestCombo).toBe(9); // below prior high → unchanged
  });
});

describe('computeCombo — wrong answers', () => {
  it('resets the streak to 0 and earns no XP', () => {
    const out = computeCombo(at(7, 7, 100), 'wrong', 5);
    expect(out.combo).toBe(0);
    expect(out.xpEarned).toBe(0);
    expect(out.comboBonus).toBe(0);
    expect(out.isComboFill).toBe(false);
    expect(out.totalPoints).toBe(100); // unchanged
  });

  it('does not lower highestCombo when the current streak breaks', () => {
    expect(computeCombo(at(7, 12), 'wrong', 5).highestCombo).toBe(12);
  });
});

describe('computeCombo — neutral (combo forgiveness)', () => {
  it('leaves the streak untouched but still awards baseXp', () => {
    const out = computeCombo(at(6, 6, 30), 'neutral', 5);
    expect(out.combo).toBe(6);
    expect(out.xpEarned).toBe(5);
    expect(out.comboBonus).toBe(0);
    expect(out.isComboFill).toBe(false);
    expect(out.totalPoints).toBe(35);
  });

  it('never triggers a fill even when the streak sits on a multiple', () => {
    const out = computeCombo(at(COMBO_FILL_EVERY, COMBO_FILL_EVERY), 'neutral', 5);
    expect(out.isComboFill).toBe(false);
    expect(out.comboBonus).toBe(0);
  });
});
