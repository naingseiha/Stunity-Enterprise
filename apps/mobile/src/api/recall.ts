/**
 * Recall API Client — talks to /recall/* on the feed-service.
 *
 *   fetchDueCards(opts)        → cards where nextReviewAt <= now
 *   submitRecallReview(id, g)  → grade a card; backend advances SM-2 state,
 *                                 awards XP, returns the new state
 *
 * Graceful degradation: callers (FeedScreen) catch errors and fall back to
 * mock cards from utils/mockRecallCards. This means the recall feature
 * still works visually even before the DB migration runs.
 */

import { feedApi } from './client';
import type { RecallCard } from '@/types';

export type RecallGrade = 'again' | 'good' | 'easy';

export interface RecallReviewResult {
  cardId: string;
  grade: RecallGrade;
  xpEarned: number;
  nextReviewAt: string;
  recallStrength: number;
  interval: number;
}

export interface FetchDueCardsOptions {
  limit?: number;
  subject?: string;
}

/**
 * Fetch the cards that are due for review now, ordered by nextReviewAt asc.
 * Returns an empty array if the user has no due cards or if the request
 * fails (caller logs and falls back to mocks).
 */
export async function fetchDueCards(
  options: FetchDueCardsOptions = {},
): Promise<RecallCard[]> {
  const params: Record<string, string | number> = {};
  if (options.limit) params.limit = options.limit;
  if (options.subject) params.subject = options.subject;

  const response = await feedApi.get<{
    success: boolean;
    data: RecallCard[];
  }>('/recall/due', { params });

  if (!response.data?.success) return [];
  return response.data.data ?? [];
}

/**
 * Submit a grade for a card. The backend advances SM-2 state, logs the
 * review, awards XP, and returns the new state so the client can update
 * stats (level, XP progress) without a full refetch.
 */
export async function submitRecallReview(
  cardId: string,
  grade: RecallGrade,
): Promise<RecallReviewResult> {
  const response = await feedApi.post<{
    success: boolean;
    data: RecallReviewResult;
  }>(`/recall/${cardId}/review`, { grade });

  if (!response.data?.success) {
    throw new Error('Recall review submission failed');
  }
  return response.data.data;
}
