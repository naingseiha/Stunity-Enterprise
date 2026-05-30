/**
 * Quiz War API client.
 *
 *   fetchActiveQuizWar()    GET /quiz-wars/active   (null if no war active)
 *   joinQuizWar(id, team)   POST /quiz-wars/:id/join
 *
 * Graceful degradation: FeedScreen catches errors and falls back to the
 * mock single war from utils/mockQuizWars so the banner keeps rendering
 * even before the backend deploys.
 */

import { feedApi } from './client';
import type { QuizWar } from '@/types';

export async function fetchActiveQuizWar(): Promise<QuizWar | null> {
  const response = await feedApi.get<{
    success: boolean;
    data: QuizWar | null;
  }>('/quiz-wars/active');

  if (!response.data?.success) return null;
  return response.data.data ?? null;
}

export interface JoinQuizWarResult {
  warId: string;
  team: string;
  joinedAt: string;
  isAlreadyJoined: boolean;
}

export async function joinQuizWar(
  warId: string,
  team: 'A' | 'B',
): Promise<JoinQuizWarResult> {
  const response = await feedApi.post<{
    success: boolean;
    data: JoinQuizWarResult;
  }>(`/quiz-wars/${warId}/join`, { team });

  if (!response.data?.success) {
    throw new Error('Failed to join quiz war');
  }
  return response.data.data;
}
