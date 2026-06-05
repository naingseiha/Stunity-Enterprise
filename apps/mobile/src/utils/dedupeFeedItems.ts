import { FeedItem } from '@/types';

/**
 * Deduplicate a merged feed list by POST id, preserving order.
 *
 * Paginated/refreshed feeds can re-deliver a post that's already on screen
 * (overlapping pages, a refresh that overlaps the previous head, real-time
 * inserts). Duplicate keys make FlashList thrash/blank, so we keep only the
 * FIRST occurrence of each POST id. POST items with no id are corrupted and
 * dropped. Non-POST items (suggested users/courses/quizzes, recall cards,
 * bounties, quiz wars) are always kept — they carry no post id and may legitimately
 * repeat across the list.
 *
 * Pure: returns a new array, never mutates the input.
 */
export function dedupeFeedItems(items: FeedItem[]): FeedItem[] {
  const seenIds = new Set<string>();
  return items.filter((item) => {
    if (item?.type === 'POST') {
      const postId = item.data?.id;
      if (!postId) return false; // drop corrupted POST items with no id
      if (seenIds.has(postId)) return false; // drop duplicate posts
      seenIds.add(postId);
    }
    return true;
  });
}
