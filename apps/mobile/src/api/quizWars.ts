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

export interface SubmitAnswerResult {
  participant: {
    id: string;
    correctAnswers: number;
    totalAnswers: number;
    xpEarned: number;
  };
  war: {
    teamAScore: number;
    teamBScore: number;
  };
}

export async function submitQuizWarAnswer(
  warId: string,
  isCorrect: boolean,
): Promise<SubmitAnswerResult> {
  const response = await feedApi.post<{
    success: boolean;
    data: SubmitAnswerResult;
  }>(`/quiz-wars/${warId}/answer`, { isCorrect });

  if (!response.data?.success) {
    throw new Error('Failed to submit quiz war answer');
  }
  return response.data.data;
}

export interface CreateQuizWarParams {
  subject: string;
  startsAt: string;
  endsAt: string;
  teamAName: string;
  teamAColor: string;
  teamBName: string;
  teamBColor: string;
  rewardXp?: number;
  totalRounds?: number;
}

export async function createQuizWar(
  params: CreateQuizWarParams,
): Promise<QuizWar> {
  const response = await feedApi.post<{
    success: boolean;
    data: QuizWar;
  }>('/quiz-wars', params);

  if (!response.data?.success) {
    throw new Error('Failed to create quiz war');
  }
  return response.data.data;
}

export async function startQuizWar(warId: string): Promise<QuizWar> {
  const response = await feedApi.post<{
    success: boolean;
    data: QuizWar;
  }>(`/quiz-wars/${warId}/start`);

  if (!response.data?.success) {
    throw new Error('Failed to start quiz war');
  }
  return response.data.data;
}

export interface EndQuizWarResult {
  war: QuizWar;
  winningTeam: string | null;
  rewardXp: number;
  totalParticipants: number;
  winningParticipantsCount: number;
  mvpCount: number;
}

export async function endQuizWar(warId: string): Promise<EndQuizWarResult> {
  const response = await feedApi.post<{
    success: boolean;
    data: EndQuizWarResult;
  }>(`/quiz-wars/${warId}/end`);

  if (!response.data?.success) {
    throw new Error('Failed to end quiz war');
  }
  return response.data.data;
}

