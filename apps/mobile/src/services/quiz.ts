/**
 * Quiz Service (Hybrid - Cloud Run API)
 * 
 * Handles quiz submission and results fetching via the Stunity Backend API.
 * Real-time score updates are handled via Supabase Realtime (managed in stores).
 */

import { quizApi } from '@/api/client';
import { supabase } from '@/lib/supabase';

export interface QuizAnswer {
  questionId: string;
  answer: string | number;
}

export interface QuizSubmissionResult {
  attemptId: string;
  score: number;
  passed: boolean;
  pointsEarned: number;
  totalPoints: number;
  submittedAt: string;
  results?: Array<{
    questionId: string;
    correct: boolean;
    pointsEarned: number;
    userAnswer: string | number;
    correctAnswer: string | number;
  }>;
  questions?: any[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  score: number;
  pointsEarned: number;
  passed: boolean;
  submittedAt: string;
}

export interface QuizStatistics {
  totalAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  passRate: number;
  averageScore: number;
}

/**
 * Submit quiz answers
 * POST /quizzes/:id/submit
 */
export const submitQuiz = async (
  quizId: string,
  answers: QuizAnswer[]
): Promise<QuizSubmissionResult> => {
  try {
    console.log('📤 [QUIZ API] Submitting quiz:', { quizId, answersCount: answers.length });

    const response = await quizApi.post(`/quizzes/${quizId}/submit`, {
      answers
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Submission failed');
    }

    return response.data.data;
  } catch (error: any) {
    console.error('❌ [QUIZ API] Submit error:', error);
    throw error;
  }
};

/**
 * Get user's attempts for a quiz
 * GET /quizzes/:id/attempts/me
 */
export const getMyQuizAttempts = async (quizId: string): Promise<QuizAttempt[]> => {
  try {
    const response = await quizApi.get(`/quizzes/${quizId}/attempts/me`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch attempts');
    }

    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ [QUIZ API] Get my attempts error:', error);
    // Fallback: Return empty array or throw based on app needs
    return [];
  }
};

/**
 * Get all attempts for a quiz (instructor only)
 * GET /quizzes/:id/attempts
 */
export const getQuizAttempts = async (
  quizId: string
): Promise<{ attempts: QuizAttempt[]; statistics: QuizStatistics }> => {
  try {
    const response = await quizApi.get(`/quizzes/${quizId}/attempts`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch attempts');
    }

    return {
      attempts: response.data.data?.attempts || [],
      statistics: response.data.data?.statistics || {
        totalAttempts: 0,
        passedAttempts: 0,
        failedAttempts: 0,
        passRate: 0,
        averageScore: 0
      }
    };
  } catch (error: any) {
    console.error('❌ [QUIZ API] Get quiz attempts error:', error);
    throw error;
  }
};

/**
 * Get specific attempt details
 * GET /attempts/:id
 */
export const getQuizAttemptDetails = async (
  quizId: string, // Kept for interface compatibility
  attemptId: string
): Promise<any> => {
  try {
    const response = await quizApi.get(`/attempts/${attemptId}`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch details');
    }

    return response.data.data;
  } catch (error: any) {
    console.error('❌ [QUIZ API] Get attempt details error:', error);
    throw error;
  }
};

export const quizService = {
  submitQuiz,
  getMyQuizAttempts,
  getQuizAttempts,
  getQuizAttemptDetails,
};
