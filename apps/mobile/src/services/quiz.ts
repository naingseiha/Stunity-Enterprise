/**
 * Quiz Service — Enterprise API Layer
 *
 * Handles all quiz-related API calls:
 * - Quiz discovery (browse, recommended, daily, single)
 * - Quiz submission and attempt history
 * - Post-quiz XP and streak recording via statsAPI
 */

import { quizApi } from '@/api/client';
import { invalidateJoinedQuizzesCache } from '@/lib/joinedQuizzesCache';
import { recordQuizCompletionStats } from '@/lib/performanceStatsCache';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
}

export interface QuizUserAttempt {
  id: string;
  score: number;
  passed: boolean;
  pointsEarned: number;
  answers?: Array<{ questionId: string; answer: unknown }>;
  results?: Array<{
    questionId: string;
    correct: boolean;
    pointsEarned: number;
    userAnswer?: unknown;
    correctAnswer?: unknown;
  }>;
  submittedAt?: string;
}

/** A quiz object as returned by all discovery endpoints */
export interface QuizItem {
  id: string;
  postId: string;
  title: string;
  description: string;
  subject?: string | null;
  topicTags?: string[];
  author: QuizAuthor;
  questions: QuizQuestion[];
  /** Set on list endpoints when full questions are omitted for performance */
  questionCount?: number;
  timeLimit?: number | null;
  passingScore: number;
  totalPoints: number;
  userAttempt: QuizUserAttempt | null;
  attemptCount?: number;
  lastAttemptAt?: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';
  options?: string[];
  correctAnswer?: string | number;
  points?: number;
  explanation?: string;
}

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

export interface BrowseQuizzesParams {
  category?: string;
  search?: string;
  classId?: string;
  page?: number;
  limit?: number;
}

export interface MyJoinedQuizzesParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: 'all' | 'passed' | 'failed';
}

export interface PaginatedQuizzes {
  data: QuizItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface QuizStatistics {
  totalAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  passRate: number;
  averageScore: number;
}

// ─── Discovery ────────────────────────────────────────────────────────────────

/**
 * GET /quizzes — Browse all published quizzes
 * Supports category filter, search, and pagination.
 */
/**
 * GET /quizzes/my-joined — Quizzes the user has attempted (latest attempt each)
 */
export const fetchMyJoinedQuizzes = async (
  params: MyJoinedQuizzesParams = {},
): Promise<PaginatedQuizzes> => {
  try {
    const response = await quizApi.get('/quizzes/my-joined', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
    };
  } catch (error: any) {
    console.error('❌ [QUIZ API] My joined quizzes error:', error);
    return { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  }
};

export const browseQuizzes = async (params: BrowseQuizzesParams = {}): Promise<PaginatedQuizzes> => {
  try {
    const response = await quizApi.get('/quizzes', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
    };
  } catch (error: any) {
    console.error('❌ [QUIZ API] Browse error:', error);
    return { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  }
};

/**
 * GET /quizzes/recommended — Personalised quiz recommendations
 * Returns up to `limit` quizzes the user hasn't taken yet, ranked by popularity.
 */
export const fetchRecommendedQuizzes = async (limit = 10): Promise<QuizItem[]> => {
  try {
    const response = await quizApi.get('/quizzes/recommended', { params: { limit } });
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ [QUIZ API] Recommended error:', error);
    return [];
  }
};

/**
 * GET /quizzes/daily — Today's featured daily quiz
 * Returns null if no quiz is available.
 */
export const fetchDailyQuiz = async (): Promise<QuizItem | null> => {
  try {
    const response = await quizApi.get('/quizzes/daily');
    return response.data.data || null;
  } catch (error: any) {
    console.error('❌ [QUIZ API] Daily quiz error:', error);
    return null;
  }
};

/**
 * GET /quizzes/:id — Single quiz detail with user attempt status
 */
export const fetchQuizById = async (quizId: string): Promise<QuizItem | null> => {
  try {
    const response = await quizApi.get(`/quizzes/${quizId}`);
    if (!response.data.success) return null;
    return response.data.data;
  } catch (error: any) {
    console.error('❌ [QUIZ API] Fetch quiz error:', error);
    return null;
  }
};

// ─── Submission ───────────────────────────────────────────────────────────────

/**
 * POST /quizzes/:id/submit — Submit quiz answers and optionally record XP + update streak
 */
export const submitQuiz = async (
  quizId: string,
  answers: QuizAnswer[],
  options: {
    /** If true, records XP in the analytics service and updates the daily streak */
    recordStats?: boolean;
    timeSpent?: number;
    type?: 'solo' | 'live' | 'challenge';
  } = {}
): Promise<QuizSubmissionResult> => {
  console.log('📤 [QUIZ API] Submitting quiz:', { quizId, answersCount: answers.length });

  const response = await quizApi.post(`/quizzes/${quizId}/submit`, { answers });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Submission failed');
  }

  const result: QuizSubmissionResult = response.data.data;

  // Record XP + streak (awaited so profile/feed can update the same session)
  if (options.recordStats !== false) {
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      const timeSpent = options.timeSpent ?? 0;
      const type = options.type ?? 'solo';

      await recordQuizCompletionStats(userId, {
        quizId,
        pointsEarned: result.pointsEarned,
        totalPoints: result.totalPoints,
        scorePercent: result.score,
        passed: result.passed,
        questionCount: answers.length,
        timeSpent,
        type,
      });
      invalidateJoinedQuizzesCache();
    }
  }

  return result;
};

// ─── My Quizzes ───────────────────────────────────────────────────────────────

/**
 * GET /quizzes/my-created — Get current user's authored quizzes (Quiz Studio)
 */
export const getMyCreatedQuizzes = async (): Promise<QuizItem[]> => {
  try {
    const response = await quizApi.get('/quizzes/my-created');
    if (!response.data.success) {
      return [];
    }
    return response.data.data;
  } catch (error: any) {
    console.error('❌ [QUIZ API] Get my created quizzes error:', error);
    return [];
  }
};

// ─── My Attempts ──────────────────────────────────────────────────────────────

/**
 * GET /quizzes/:id/attempts/latest — Most recent attempt for the current user
 */
export const getLatestQuizAttempt = async (quizId: string): Promise<QuizUserAttempt | null> => {
  try {
    const response = await quizApi.get(`/quizzes/${quizId}/attempts/latest`);
    if (!response.data.success || !response.data.data) return null;
    const attempt = response.data.data;
    return {
      id: attempt.id,
      score: attempt.score,
      passed: attempt.passed,
      pointsEarned: attempt.pointsEarned,
      answers: attempt.answers,
      results: attempt.results,
      submittedAt: attempt.submittedAt,
    };
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    console.error('❌ [QUIZ API] Latest attempt error:', error);
    throw error;
  }
};

/**
 * GET /quizzes/:id/attempts/my — Get current user's attempts for a quiz
 */
export const getMyQuizAttempts = async (quizId: string): Promise<any[]> => {
  try {
    // Note: backend route uses /attempts/my (not /attempts/me)
    const response = await quizApi.get(`/quizzes/${quizId}/attempts/my`);
    if (!response.data.success) return [];
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ [QUIZ API] My attempts error:', error);
    return [];
  }
};

/**
 * GET /quizzes/:id/attempts — All attempts for a quiz (instructor only)
 */
export const getQuizAttempts = async (
  quizId: string
): Promise<{ attempts: any[]; statistics: QuizStatistics }> => {
  try {
    const response = await quizApi.get(`/quizzes/${quizId}/attempts`);
    if (!response.data.success) throw new Error('Failed to fetch attempts');
    return {
      attempts: response.data.data?.attempts || [],
      statistics: response.data.data?.statistics || {
        totalAttempts: 0, passedAttempts: 0, failedAttempts: 0, passRate: 0, averageScore: 0,
      },
    };
  } catch (error: any) {
    console.error('❌ [QUIZ API] Get quiz attempts error:', error);
    throw error;
  }
};

/**
 * GET /attempts/:id — Get specific attempt details
 */
export const getQuizAttemptDetails = async (_quizId: string, attemptId: string): Promise<any> => {
  try {
    const response = await quizApi.get(`/attempts/${attemptId}`);
    if (!response.data.success) throw new Error('Failed to fetch details');
    return response.data.data;
  } catch (error: any) {
    console.error('❌ [QUIZ API] Get attempt details error:', error);
    throw error;
  }
};

// ─── Service object (for backward compat) ────────────────────────────────────

export const quizService = {
  browseQuizzes,
  fetchRecommendedQuizzes,
  fetchDailyQuiz,
  fetchQuizById,
  getMyCreatedQuizzes,
  submitQuiz,
  getLatestQuizAttempt,
  getMyQuizAttempts,
  getQuizAttempts,
  getQuizAttemptDetails,
};

export const quizAPI = quizService; // Alias
