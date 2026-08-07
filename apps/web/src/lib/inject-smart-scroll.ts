/**
 * Client-side Smart Scroll injectors — same algorithms as native
 * mockRecallCards / mockFeynmanBounties / mockQuizWars.
 */

import type { FeedRow } from '@/lib/feed-normalize';
import type { FeynmanBounty, QuizWar, RecallCard } from '@/lib/feed-smart-scroll-types';

const isPost = (row: FeedRow): boolean => row.kind === 'post';

/** Interleave recall cards every `intervalPosts` real posts. */
export function injectRecallCards(
  rows: FeedRow[],
  cards: RecallCard[],
  intervalPosts = 5,
): FeedRow[] {
  if (!cards.length || !rows.length) return rows;

  const result: FeedRow[] = [];
  let cardIdx = 0;
  let postsSinceLastCard = 0;

  for (const row of rows) {
    result.push(row);
    if (!isPost(row)) continue;

    postsSinceLastCard += 1;
    if (postsSinceLastCard >= intervalPosts && cardIdx < cards.length) {
      const card = cards[cardIdx];
      result.push({ kind: 'recall_card', key: `recall:${card.id}`, card });
      cardIdx += 1;
      postsSinceLastCard = 0;
    }
  }

  return result;
}

/**
 * Interleave bounties every `intervalPosts` posts, with a 3-post gate so
 * they don't land next to the first recall slot.
 */
export function injectFeynmanBounties(
  rows: FeedRow[],
  bounties: FeynmanBounty[],
  intervalPosts = 8,
): FeedRow[] {
  if (!bounties.length || !rows.length) return rows;

  const result: FeedRow[] = [];
  let bountyIdx = 0;
  let postsSinceLast = 0;
  let postsSeen = 0;

  for (const row of rows) {
    result.push(row);
    if (!isPost(row)) continue;

    postsSeen += 1;
    postsSinceLast += 1;

    if (
      postsSeen >= 3 &&
      postsSinceLast >= intervalPosts &&
      bountyIdx < bounties.length
    ) {
      const bounty = bounties[bountyIdx];
      result.push({ kind: 'feynman_bounty', key: `bounty:${bounty.id}`, bounty });
      bountyIdx += 1;
      postsSinceLast = 0;
    }
  }

  return result;
}

/** Drop active Quiz War after the first post (once). */
export function injectQuizWar(rows: FeedRow[], war: QuizWar | null): FeedRow[] {
  if (!war || !rows.length) return rows;
  if (rows.some((r) => r.kind === 'quiz_war' && r.war.id === war.id)) {
    return rows;
  }

  const result: FeedRow[] = [];
  let postsSeen = 0;
  let injected = false;

  for (const row of rows) {
    result.push(row);
    if (!injected && isPost(row)) {
      postsSeen += 1;
      if (postsSeen >= 1) {
        result.push({ kind: 'quiz_war', key: `quiz_war:${war.id}`, war });
        injected = true;
      }
    }
  }

  if (!injected) {
    result.push({ kind: 'quiz_war', key: `quiz_war:${war.id}`, war });
  }

  return result;
}

/** Full pipeline matching native FeedScreen displayedFeedItems. */
export function applySmartScrollInjects(
  rows: FeedRow[],
  opts: {
    recallCards?: RecallCard[];
    bounties?: FeynmanBounty[];
    quizWar?: QuizWar | null;
    quizWarEnabled?: boolean;
  },
): FeedRow[] {
  const withRecall = injectRecallCards(rows, opts.recallCards ?? [], 5);
  const withBounties = injectFeynmanBounties(withRecall, opts.bounties ?? [], 8);
  if (!opts.quizWarEnabled) return withBounties;
  return injectQuizWar(withBounties, opts.quizWar ?? null);
}
