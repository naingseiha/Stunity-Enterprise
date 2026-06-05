/**
 * dedupeFeedItems — feed pagination dedup guard.
 *
 * Overlapping pages / refreshes can redeliver a post already on screen;
 * duplicate keys make FlashList blank or thrash. This keeps the first
 * occurrence per POST id, drops idless POSTs, and never touches non-POST cells.
 */
import { dedupeFeedItems } from '@/utils/dedupeFeedItems';
import type { FeedItem } from '@/types';

const post = (id: string): FeedItem => ({ type: 'POST', data: { id } as any });

describe('dedupeFeedItems', () => {
  it('collapses a post that repeats across pages, keeping the first occurrence and order', () => {
    const page1 = [post('a'), post('b')];
    const page2 = [post('b'), post('c')]; // 'b' overlaps
    const out = dedupeFeedItems([...page1, ...page2]);
    expect(out.map((i) => (i as any).data.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops POST items with no id (corrupted) but keeps valid ones', () => {
    const items: FeedItem[] = [post('a'), { type: 'POST', data: {} as any }, post('b')];
    const out = dedupeFeedItems(items);
    expect(out.map((i) => (i as any).data.id)).toEqual(['a', 'b']);
  });

  it('keeps non-POST cells untouched, even when they repeat', () => {
    const items: FeedItem[] = [
      { type: 'SUGGESTED_USERS', data: [] },
      post('a'),
      { type: 'SUGGESTED_USERS', data: [] },
      { type: 'SUGGESTED_QUIZZES', data: [] },
    ];
    const out = dedupeFeedItems(items);
    expect(out).toHaveLength(4);
    expect(out.map((i) => i.type)).toEqual([
      'SUGGESTED_USERS',
      'POST',
      'SUGGESTED_USERS',
      'SUGGESTED_QUIZZES',
    ]);
  });

  it('does not mutate the input array', () => {
    const items = [post('a'), post('a')];
    const copy = [...items];
    dedupeFeedItems(items);
    expect(items).toEqual(copy);
    expect(items).toHaveLength(2);
  });

  it('returns an empty array unchanged', () => {
    expect(dedupeFeedItems([])).toEqual([]);
  });
});
