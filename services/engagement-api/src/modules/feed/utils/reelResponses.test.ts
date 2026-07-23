/**
 * WI4 — reel response persistence logic.
 * Covers the anti-farming reward gate, the latest-attempt reducer, and the
 * feed hydration that lets a card replay its prior answer.
 */
import {
  planReelReward,
  latestResponsesByItem,
  attachMyResponses,
  REEL_RESPONSE_TYPES,
  StoredResponseRow,
} from './reelResponses';

describe('planReelReward — only the first attempt earns', () => {
  it('first correct attempt advances combo and earns + reschedules SM-2', () => {
    expect(planReelReward(1, true)).toEqual({
      comboOutcome: 'correct',
      earnsReward: true,
      reschedulesSm2: true,
    });
  });

  it('first wrong attempt resets combo but still counts as the rewarded attempt', () => {
    expect(planReelReward(1, false)).toEqual({
      comboOutcome: 'wrong',
      earnsReward: true,
      reschedulesSm2: true,
    });
  });

  it('re-attempts are reward-neutral regardless of correctness (no XP farming)', () => {
    for (const correct of [true, false]) {
      expect(planReelReward(2, correct)).toEqual({
        comboOutcome: 'neutral',
        earnsReward: false,
        reschedulesSm2: false,
      });
      expect(planReelReward(7, correct)).toEqual({
        comboOutcome: 'neutral',
        earnsReward: false,
        reschedulesSm2: false,
      });
    }
  });

  it('treats attemptNumber <= 1 (defensive) as the first attempt', () => {
    expect(planReelReward(0, true).earnsReward).toBe(true);
  });
});

describe('latestResponsesByItem', () => {
  const rows: StoredResponseRow[] = [
    { itemId: 'q1', chosenIndex: 2, correct: true, attemptNumber: 3, createdAt: '2026-06-04T03:00:00Z' },
    { itemId: 'q1', chosenIndex: 0, correct: false, attemptNumber: 1, createdAt: '2026-06-04T01:00:00Z' },
    { itemId: 'q2', chosenIndex: 1, correct: false, attemptNumber: 1, createdAt: '2026-06-04T02:00:00Z' },
  ];

  it('keeps the highest-attempt response per item', () => {
    const map = latestResponsesByItem(rows);
    expect(map.get('q1')).toEqual({ chosenIndex: 2, correct: true, attemptNumber: 3 });
    expect(map.get('q2')).toEqual({ chosenIndex: 1, correct: false, attemptNumber: 1 });
  });

  it('is robust to unsorted input (does not assume DESC order)', () => {
    const map = latestResponsesByItem([...rows].reverse());
    expect(map.get('q1')?.attemptNumber).toBe(3);
  });

  it('returns an empty map for no rows', () => {
    expect(latestResponsesByItem([]).size).toBe(0);
  });
});

describe('attachMyResponses', () => {
  const items: { id: string; type: string; payload: any }[] = [
    { id: 'q1', type: 'QUIZ_QUESTION', payload: { question: 'A?' } },
    { id: 'tf1', type: 'TF_CARD', payload: { claim: 'B' } },
    { id: 'p1', type: 'POST', payload: { content: 'hi' } },
  ];

  it('attaches myResponse only to interactive cards that have a stored answer', () => {
    const map = latestResponsesByItem([
      { itemId: 'q1', chosenIndex: 2, correct: true, attemptNumber: 1 },
    ]);
    const out = attachMyResponses(items, map);
    expect(out[0].payload.myResponse).toEqual({ chosenIndex: 2, correct: true, attemptNumber: 1 });
    expect(out[1].payload.myResponse).toBeUndefined(); // no stored answer
    expect(out[2].payload.myResponse).toBeUndefined(); // POST is not interactive
  });

  it('preserves existing payload fields', () => {
    const map = latestResponsesByItem([
      { itemId: 'q1', chosenIndex: 0, correct: false, attemptNumber: 2 },
    ]);
    const out = attachMyResponses(items, map);
    expect(out[0].payload.question).toBe('A?');
  });

  it('is a no-op when there are no stored responses', () => {
    expect(attachMyResponses(items, new Map())).toBe(items);
  });
});

describe('REEL_RESPONSE_TYPES', () => {
  it('covers the three interactive card types and excludes polls', () => {
    expect(REEL_RESPONSE_TYPES.has('QUIZ_QUESTION')).toBe(true);
    expect(REEL_RESPONSE_TYPES.has('TF_CARD')).toBe(true);
    expect(REEL_RESPONSE_TYPES.has('CLOZE_CARD')).toBe(true);
    expect(REEL_RESPONSE_TYPES.has('POLL')).toBe(false);
    expect(REEL_RESPONSE_TYPES.has('POST')).toBe(false);
  });
});
