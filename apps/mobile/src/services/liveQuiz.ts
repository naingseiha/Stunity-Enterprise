/**
 * Live Quiz API Service
 * 
 * Handles all communication with analytics service for live quiz mode
 */

import axios from 'axios';
import { Config } from '@/config';

const analyticsApi = axios.create({
  baseURL: Config.analyticsUrl || `http://${Config.apiHost}:3014`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
analyticsApi.interceptors.request.use(async (config) => {
  const token = await import('@/services/token').then(m => m.tokenService.getAccessToken());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export interface LobbyStatus {
  sessionCode: string;
  status: 'lobby' | 'active' | 'completed';
  participantCount: number;
  participants: Participant[];
  quizTitle: string;
  questionCount: number;
  settings: LiveQuizSettings;
}

export interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[];
  points: number;
}

export interface QuestionData {
  status: string;
  currentQuestionIndex: number;
  question: Question;
  timeLimit: number;
}

export interface SubmitResult {
  correct: boolean;
  points: number;
  totalScore: number;
  timeSpent: number;
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

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalParticipants: number;
  currentQuestion: number;
  totalQuestions: number;
}

export interface FinalResults {
  sessionCode: string;
  quizTitle: string;
  status: string;
  leaderboard: Array<LeaderboardEntry & { accuracy: number }>;
  stats: {
    totalParticipants: number;
    totalAnswers: number;
    correctAnswers: number;
    averageAccuracy: number;
  };
  startedAt: string;
  completedAt: string;
}

class LiveQuizService {
  /**
   * Create a new live quiz session (Host)
   */
  async createSession(quizId: string, settings?: LiveQuizSettings): Promise<LiveQuizSession> {
    const response = await analyticsApi.post('/live/create', {
      quizId,
      settings,
    });
    return response.data.data;
  }

  /**
   * Join an existing live quiz session (Student)
   */
  async joinSession(sessionCode: string): Promise<any> {
    const response = await analyticsApi.post(`/live/${sessionCode}/join`);
    return response.data.data;
  }

  /**
   * Get lobby status
   */
  async getLobbyStatus(sessionCode: string): Promise<LobbyStatus> {
    const response = await analyticsApi.get(`/live/${sessionCode}/lobby`);
    return response.data.data;
  }

  /**
   * Get session status (includes current question, participants, state)
   */
  async getSessionStatus(sessionCode: string): Promise<any> {
    const response = await analyticsApi.get(`/live/${sessionCode}/status`);
    return response.data.data;
  }

  /**
   * Start the quiz (Host only)
   */
  async startSession(sessionCode: string): Promise<any> {
    const response = await analyticsApi.post(`/live/${sessionCode}/start`);
    return response.data.data;
  }

  /**
   * Submit answer for current question
   */
  async submitAnswer(sessionCode: string, participantId: string, data: { questionId: string; answer: string; timeSpent: number }): Promise<any> {
    const response = await analyticsApi.post(`/live/${sessionCode}/answer`, data);
    return response.data.data;
  }

  /**
   * Move to next question (Host only)
   */
  async nextQuestion(sessionCode: string): Promise<any> {
    const response = await analyticsApi.post(`/live/${sessionCode}/next`);
    return response.data.data;
  }

  /**
   * Get current leaderboard
   */
  async getLeaderboard(sessionCode: string): Promise<any[]> {
    const response = await analyticsApi.get(`/live/${sessionCode}/leaderboard`);
    return response.data.data;
  }

  /**
   * End session (Host only)
   */
  async endSession(sessionCode: string): Promise<any> {
    const response = await analyticsApi.post(`/live/${sessionCode}/end`);
    return response.data.data;
  }
}

export const liveQuizService = new LiveQuizService();
export const liveQuizAPI = liveQuizService; // Alias for convenience
