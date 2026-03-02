/**
 * Live Quiz API client - analytics-service live quiz endpoints
 */

import { ANALYTICS_SERVICE_URL } from './config';

export interface LiveQuizSettings {
  questionTime?: number;
  showLeaderboard?: boolean;
  pointsPerQuestion?: number;
  speedBonusMultiplier?: number;
}

export interface LiveQuizSession {
  sessionCode: string;
  sessionId: string;
  quizTitle: string;
  questionCount: number;
}

export interface Participant {
  userId: string;
  username: string;
  avatar?: string;
  connected: boolean;
}

export interface LobbyData {
  sessionCode: string;
  status: 'lobby' | 'active' | 'completed';
  hostId?: string;
  participantCount: number;
  participants: Participant[];
  quizTitle?: string;
  questionCount?: number;
  settings?: LiveQuizSettings;
}

export interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[];
  points: number;
}

export interface CurrentQuestionData {
  status: 'lobby' | 'active' | 'completed';
  hostId?: string;
  currentQuestionIndex: number;
  question?: Question;
  timeLimit?: number;
  questionCount?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
}

export interface ResultsData {
  sessionCode: string;
  quizTitle?: string;
  status: string;
  leaderboard: Array<LeaderboardEntry & { accuracy?: number }>;
  stats: {
    totalParticipants: number;
    totalAnswers: number;
    correctAnswers: number;
    averageAccuracy?: number;
  };
  startedAt?: string;
  completedAt?: string;
}

async function fetchApi(path: string, options: RequestInit & { token: string }) {
  const { token, ...rest } = options;
  const res = await fetch(`${ANALYTICS_SERVICE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...rest.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data.data;
}

export async function createSession(quizId: string, token: string, settings?: LiveQuizSettings): Promise<LiveQuizSession> {
  return fetchApi('/live/create', {
    method: 'POST',
    body: JSON.stringify({ quizId, settings }),
    token,
  });
}

export async function joinSession(code: string, token: string): Promise<{ sessionId: string; quizTitle?: string; questionCount?: number; hostId?: string }> {
  return fetchApi(`/live/${code}/join`, { method: 'POST', token });
}

export async function getLobbyStatus(code: string, token: string): Promise<LobbyData> {
  return fetchApi(`/live/${code}/lobby`, { method: 'GET', token });
}

export async function getCurrentQuestion(code: string, token: string): Promise<CurrentQuestionData> {
  return fetchApi(`/live/${code}/current`, { method: 'GET', token });
}

export async function startSession(code: string, token: string): Promise<{ status: string; question?: Question; timeLimit?: number }> {
  return fetchApi(`/live/${code}/start`, { method: 'POST', token });
}

export async function submitAnswer(code: string, answer: string, token: string): Promise<{ correct: boolean; points: number; totalScore: number }> {
  return fetchApi(`/live/${code}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
    token,
  });
}

export async function nextQuestion(code: string, token: string): Promise<{ status?: string; question?: Question; timeLimit?: number; currentQuestionIndex?: number }> {
  return fetchApi(`/live/${code}/next`, { method: 'POST', token });
}

export async function getLeaderboard(code: string, token: string): Promise<{ leaderboard: LeaderboardEntry[]; currentQuestion?: number; totalPoints?: number }> {
  return fetchApi(`/live/${code}/leaderboard`, { method: 'GET', token });
}

export async function getResults(code: string, token: string): Promise<ResultsData> {
  return fetchApi(`/live/${code}/results`, { method: 'GET', token });
}
