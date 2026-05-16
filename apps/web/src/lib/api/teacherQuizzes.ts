import { TokenManager } from './auth';
import { FEED_SERVICE_URL } from './config';

export type TeacherQuizAnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export interface TeacherQuizAnalyticsOverview {
  totalQuizzes: number;
  totalAttempts: number;
  uniqueStudents: number;
  passRate: number;
  averageScore: number;
}

export interface TeacherQuizSummary {
  id: string;
  postId: string;
  title: string;
  description: string | null;
  questionCount: number;
  passingScore: number;
  totalPoints: number;
  timeLimit: number | null;
  createdAt: string;
  attemptCount: number;
  uniqueStudents: number;
  passRate: number;
  averageScore: number;
}

export interface TeacherQuestionInsight {
  quizId: string;
  quizTitle: string;
  questionId: string;
  questionText: string;
  total: number;
  wrong: number;
  wrongRate: number;
}

export interface TeacherRecentAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  userName: string;
  profilePictureUrl: string | null;
  score: number;
  passed: boolean;
  pointsEarned: number;
  submittedAt: string;
}

export interface TeacherClassOption {
  id: string;
  name: string;
}

export interface TeacherQuizAnalyticsData {
  period: TeacherQuizAnalyticsPeriod;
  classId: string | null;
  classes: TeacherClassOption[];
  overview: TeacherQuizAnalyticsOverview;
  attemptsOverTime: Array<{ date: string; attempts: number; passed: number }>;
  quizzes: TeacherQuizSummary[];
  questionInsights: TeacherQuestionInsight[];
  recentAttempts: TeacherRecentAttempt[];
}

async function authFetch(path: string, init?: RequestInit) {
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${FEED_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload.data;
}

export const teacherQuizAPI = {
  getAnalytics: (period: TeacherQuizAnalyticsPeriod = '30d', classId?: string | null) => {
    const params = new URLSearchParams({ period });
    if (classId) params.set('classId', classId);
    return authFetch(`/quizzes/teacher/analytics?${params.toString()}`) as Promise<TeacherQuizAnalyticsData>;
  },

  getQuizAttempts: (quizId: string) =>
    authFetch(`/quizzes/${quizId}/attempts`) as Promise<{
      attempts: Array<{
        id: string;
        userId: string;
        score: number;
        passed: boolean;
        pointsEarned: number;
        submittedAt: string;
        user: {
          id: string;
          firstName: string;
          lastName: string;
          profilePictureUrl: string | null;
        };
      }>;
      statistics: {
        totalAttempts: number;
        passedAttempts: number;
        failedAttempts: number;
        passRate: number;
        averageScore: number;
      };
    }>,
};
