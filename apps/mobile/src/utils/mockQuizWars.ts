/**
 * Mock Quiz Wars — prototype data for the live inter-class battle feature.
 *
 * Single active war at a time per school (real-life cadence). Drops in near
 * the top of the feed (position 1) like an event banner. Replace with a
 * real /quiz-wars/active endpoint + WebSocket score-tick subscription once
 * the backend lands.
 */

import type { FeedItem, QuizWar } from '@/types';

const SAMPLE_WAR: QuizWar = {
  id: 'war-math-10a-10b-1',
  status: 'LIVE',
  subject: 'Mathematics · Algebra',
  round: 4,
  totalRounds: 6,
  timeRemainingSec: 587, // 09:47
  teamA: {
    id: 'class-10a',
    name: '10A',
    color: '#0EA5E9', // sky blue
    score: 418,
  },
  teamB: {
    id: 'class-10b',
    name: '10B',
    color: '#F97316', // orange
    score: 402,
  },
  classmatesFighting: 42,
  isUserParticipating: false,
  userTeamId: 'class-10a', // user's class, not yet joined
  rewardXp: 200,
  createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
};

export function getMockQuizWar(): QuizWar | null {
  return SAMPLE_WAR;
}

/**
 * Inject the active Quiz War as a single banner near the top of the feed
 * (after the first POST, so it follows the user's natural scroll rhythm
 * without crowding the create-post area). Only one war runs at a time —
 * idempotent insertion.
 */
export function injectQuizWar(
  items: FeedItem[],
  war: QuizWar | null,
): FeedItem[] {
  if (!war || !items.length) return items;
  // Skip if already present (e.g. on feed re-render).
  if (items.some((it) => it.type === 'QUIZ_WAR' && it.data.id === war.id)) {
    return items;
  }

  const result: FeedItem[] = [];
  let postsSeen = 0;
  let injected = false;

  for (const item of items) {
    result.push(item);
    if (!injected && item.type === 'POST') {
      postsSeen += 1;
      // Drop the war banner after the first POST — visible without being
      // the very first card the user sees on opening the feed.
      if (postsSeen >= 1) {
        result.push({ type: 'QUIZ_WAR', data: war });
        injected = true;
      }
    }
  }

  // Fallback: if the feed had no posts yet, still surface the war.
  if (!injected) {
    result.push({ type: 'QUIZ_WAR', data: war });
  }

  return result;
}
