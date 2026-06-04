/**
 * Reels engagement merge — the heart-vs-count consistency invariant.
 *
 * Regression guard for the bug where non-POST cards (Quiz / Cloze / TF / Recall
 * / FocusReel) rendered a filled heart driven by a real like while the count
 * stayed hardcoded at 0, because only `isLikedByMe` was patched and the live
 * Post counts were never hydrated.
 */
import { mergeEngagement, PostCounts } from './reelEngagement';

const counts = (m: Record<string, PostCounts>) => new Map(Object.entries(m));
const reactions = (m: Record<string, Record<string, number>>) => new Map(Object.entries(m));

describe('mergeEngagement — uniform hydration across card types', () => {
  it('hydrates a full engagement block on a non-POST card from the backing post', () => {
    const items = [{ id: 'q1', type: 'CLOZE_CARD', postId: 'pA' }];
    const out = mergeEngagement(
      items,
      counts({ pA: { likesCount: 12, commentsCount: 3 } }),
      new Map([['pA', 'LIKE']]),
      reactions({ pA: { LIKE: 12 } }),
    );
    expect(out[0].engagement).toEqual({
      likesCount: 12,
      commentsCount: 3,
      isLikedByMe: true,
      myReaction: 'LIKE',
      reactionCounts: { LIKE: 12 },
    });
  });

  it('never produces a liked heart with a zero count (the original desync)', () => {
    // Viewer liked the backing post; the live count must come along, not stay 0.
    const items = [{ id: 'q2', type: 'QUIZ_QUESTION', postId: 'pB' }];
    const [out] = mergeEngagement(
      items,
      counts({ pB: { likesCount: 5, commentsCount: 0 } }),
      new Map([['pB', 'INSIGHTFUL']]),
      reactions({ pB: { INSIGHTFUL: 5 } }),
    );
    expect(out.engagement.isLikedByMe).toBe(true);
    expect(out.engagement.likesCount).toBeGreaterThan(0);
    expect(out.engagement.myReaction).toBe('INSIGHTFUL');
  });

  it('not-liked card reflects the real total with isLikedByMe false', () => {
    const items = [{ id: 'r1', type: 'RECALL_CARD', postId: 'pC' }];
    const [out] = mergeEngagement(
      items,
      counts({ pC: { likesCount: 8, commentsCount: 2 } }),
      new Map(), // viewer has not liked
      reactions({ pC: { LIKE: 8 } }),
    );
    expect(out.engagement.isLikedByMe).toBe(false);
    expect(out.engagement.myReaction).toBeNull();
    expect(out.engagement.likesCount).toBe(8);
    expect(out.engagement.commentsCount).toBe(2);
  });

  it('leaves items without a postId untouched (no misleading affordance)', () => {
    const items = [{ id: 'b1', type: 'BOUNTY' }];
    const [out] = mergeEngagement(items, new Map(), new Map(), new Map());
    expect(out.engagement).toBeUndefined();
  });

  it('defaults to zero counts when the post row is missing', () => {
    const items = [{ id: 'q3', type: 'TF_CARD', postId: 'gone' }];
    const [out] = mergeEngagement(items, new Map(), new Map(), new Map());
    expect(out.engagement).toEqual({
      likesCount: 0,
      commentsCount: 0,
      isLikedByMe: false,
      myReaction: null,
      reactionCounts: {},
    });
  });

  it('keeps sibling cards sharing a postId in sync (same source of truth)', () => {
    const items = [
      { id: 'q4', type: 'QUIZ_QUESTION', postId: 'shared' },
      { id: 'q5', type: 'CLOZE_CARD', postId: 'shared' },
    ];
    const out = mergeEngagement(
      items,
      counts({ shared: { likesCount: 7, commentsCount: 1 } }),
      new Map([['shared', 'LIKE']]),
      reactions({ shared: { LIKE: 7 } }),
    );
    expect(out[0].engagement).toEqual(out[1].engagement);
  });
});
