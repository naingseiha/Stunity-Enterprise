/**
 * adjustReactionCounts — pure optimistic reaction-count transitions.
 * Doubles as the harness smoke test: proves jest-expo + path aliases resolve.
 */
import { adjustReactionCounts } from '@/utils/reactionCounts';

describe('adjustReactionCounts', () => {
  it('adds a brand-new reaction (from=null)', () => {
    expect(adjustReactionCounts({}, null, 'like')).toEqual({ like: 1 });
    expect(adjustReactionCounts({ like: 2 }, null, 'love')).toEqual({ like: 2, love: 1 });
  });

  it('removes a reaction and drops the key when it hits zero (to=null)', () => {
    expect(adjustReactionCounts({ like: 1 }, 'like', null)).toEqual({});
    expect(adjustReactionCounts({ like: 3 }, 'like', null)).toEqual({ like: 2 });
  });

  it('switches one reaction type to another', () => {
    expect(adjustReactionCounts({ like: 2, love: 1 }, 'like', 'love')).toEqual({ like: 1, love: 2 });
  });

  it('is a no-op when from === to', () => {
    const counts = { like: 4 };
    expect(adjustReactionCounts(counts, 'like', 'like')).toBe(counts);
  });

  it('clamps at zero and never goes negative on an inconsistent decrement', () => {
    expect(adjustReactionCounts({}, 'like', null)).toEqual({});
    expect(adjustReactionCounts({ love: 1 }, 'like', null)).toEqual({ love: 1 });
  });

  it('does not mutate the input object', () => {
    const counts = { like: 1 };
    adjustReactionCounts(counts, null, 'love');
    expect(counts).toEqual({ like: 1 });
  });
});
