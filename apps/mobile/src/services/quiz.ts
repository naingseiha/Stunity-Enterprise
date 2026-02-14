/**
 * Quiz Service
 * 
 * Handles quiz submission and results fetching
 */

import { feedApi } from '@/api/client';

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
 */
export const submitQuiz = async (
  quizId: string,
  answers: QuizAnswer[]
): Promise<QuizSubmissionResult> => {
  try {
    console.log('📤 [QUIZ] Submitting quiz:', { quizId, answersCount: answers.length, answers });
    
    const response = await feedApi.post(`/quizzes/${quizId}/submit`, {
      answers,
    });

    console.log('📥 [QUIZ] Response received:', response.data);

    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to submit quiz');
  } catch (error: any) {
    console.error('❌ [QUIZ] Submit quiz error:', error);
    console.error('❌ [QUIZ] Error details:', error.response?.data);
    throw error;
  }
};

/**
 * Get user's attempts for a quiz
 */
export const getMyQuizAttempts = async (quizId: string): Promise<QuizAttempt[]> => {
  try {
    const response = await feedApi.get(`/quizzes/${quizId}/attempts/my`);
    
    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get attempts');
  } catch (error: any) {
    console.error('Get my attempts error:', error);
    throw error;
  }
};

/**
 * Get all attempts for a quiz (instructor only)
 */
export const getQuizAttempts = async (
  quizId: string
): Promise<{ attempts: QuizAttempt[]; statistics: QuizStatistics }> => {
  try {
    const response = await feedApi.get(`/quizzes/${quizId}/attempts`);
    
    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get attempts');
  } catch (error: any) {
    console.error('Get quiz attempts error:', error);
    throw error;
  }
};

/**
 * Get specific attempt details
 */
export const getQuizAttemptDetails = async (
  quizId: string,
  attemptId: string
): Promise<any> => {
  try {
    const response = await feedApi.get(`/quizzes/${quizId}/attempts/${attemptId}`);
    
    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get attempt details');
  } catch (error: any) {
    console.error('Get attempt details error:', error);
    throw error;
  }
};

export const quizService = {
  submitQuiz,
  getMyQuizAttempts,
  getQuizAttempts,
  getQuizAttemptDetails,
};
