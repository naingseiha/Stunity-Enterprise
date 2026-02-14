/**
 * Stats & Competition API Service
 * 
 * Handles all communication with analytics service for:
 * - User stats & leaderboards
 * - XP & leveling
 * - Challenges & competition
 */

import axios, { AxiosInstance } from 'axios';
import { Config } from '@/config';
import { tokenService } from '@/services/token';
import { networkService } from '@/services/network';
import { APP_CONFIG } from '@/config';

// Create axios instance with the same configuration as the main API client
const createAnalyticsApi = (): AxiosInstance => {
  const client = axios.create({
    baseURL: Config.analyticsUrl,
    timeout: APP_CONFIG.API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Version': APP_CONFIG.APP_VERSION,
      'X-Platform': 'mobile',
    },
  });

  // Request interceptor - Same as main API client
  client.interceptors.request.use(
    async (config) => {
      // Add auth token
      const token = await tokenService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request ID for tracing
      config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (__DEV__) {
        console.log(`🚀 [ANALYTICS] ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle 401 token expiry
  client.interceptors.response.use(
    (response) => {
      if (__DEV__) {
        console.log(`✅ [ANALYTICS] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 - Token expired, try refreshing
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await tokenService.refreshAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          console.error('❌ [ANALYTICS] Token refresh failed:', refreshError);
          return Promise.reject(refreshError);
        }
      }

      // Handle network errors - silently fail for analytics
      if (error.code === 'ERR_NETWORK') {
        if (__DEV__) {
          console.error(`❌ [ANALYTICS] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ERR_NETWORK`);
          console.warn('⚠️  [ANALYTICS] Service not available - features disabled');
        }
      }

      if (__DEV__) {
        console.error(`❌ [ANALYTICS] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || error.code}`);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

const analyticsApi = createAnalyticsApi();

export interface UserStats {
  id: string;
  userId: string;
  xp: number;
  level: number;
  totalQuizzes: number;
  totalPoints: number;
  correctAnswers: number;
  totalAnswers: number;
  winStreak: number;
  bestStreak: number;
  liveQuizWins: number;
  liveQuizTotal: number;
  avgScore: number;
  winRate: number;
  xpToNextLevel: number;
  xpProgress: number;
  recentAttempts: QuizAttempt[];
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalPoints: number;
  accuracy: number;
  timeSpent: number;
  rank?: number;
  xpEarned: number;
  type: string;
  sessionCode?: string;
  createdAt: string;
}

export interface Challenge {
  id: string;
  challengerId: string;
  opponentId: string;
  quizId: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  challengerScore?: number;
  opponentScore?: number;
  winnerId?: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

export interface LeaderboardEntry {
  userId: string;
  xp: number;
  level: number;
  totalQuizzes: number;
  totalPoints: number;
}

export interface Streak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastQuizDate: string | null;
  freezesAvailable: number;
  createdAt: string;
  updatedAt: string;
}

export interface StreakUpdateResult {
  success: boolean;
  streak: Streak;
  streakIncreased: boolean;
  achievementUnlocked: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'performance' | 'milestone' | 'competition';
  xpReward: number;
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  unlockedAt: string;
}

class StatsService {
  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const response = await analyticsApi.get(`/stats/${userId}`);
    return response.data.data;
  }

  /**
   * Record quiz attempt and award XP
   */
  async recordAttempt(data: {
    quizId: string;
    score: number;
    totalPoints: number;
    timeSpent: number;
    timeLimit?: number;
    type: 'solo' | 'live' | 'challenge';
    sessionCode?: string;
    rank?: number;
  }): Promise<{
    xpEarned: number;
    newXP: number;
    newLevel: number;
    leveledUp: boolean;
    stats: UserStats;
  }> {
    const response = await analyticsApi.post('/stats/record-attempt', data);
    return response.data.data;
  }

  /**
   * Get global leaderboard
   */
  async getGlobalLeaderboard(page: number = 1, limit: number = 50): Promise<{
    leaderboard: LeaderboardEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await analyticsApi.get('/leaderboard/global', {
      params: { page, limit },
    });
    return response.data.data;
  }

  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(): Promise<{
    weekStart: string;
    leaderboard: any[];
  }> {
    const response = await analyticsApi.get('/leaderboard/weekly');
    return response.data.data;
  }

  /**
   * Create a challenge
   */
  async createChallenge(opponentId: string, quizId: string): Promise<Challenge> {
    const response = await analyticsApi.post('/challenge/create', {
      opponentId,
      quizId,
    });
    return response.data.data;
  }

  /**
   * Accept a challenge
   */
  async acceptChallenge(challengeId: string): Promise<Challenge> {
    const response = await analyticsApi.post(`/challenge/${challengeId}/accept`);
    return response.data.data;
  }

  /**
   * Get my challenges
   */
  async getMyChallenges(): Promise<Challenge[]> {
    const response = await analyticsApi.get('/challenge/my-challenges');
    return response.data.data;
  }

  /**
   * Submit challenge result
   */
  async submitChallengeResult(challengeId: string, score: number): Promise<Challenge> {
    const response = await analyticsApi.post(`/challenge/${challengeId}/submit`, {
      score,
    });
    return response.data.data;
  }

  /**
   * Get user's streak
   */
  async getStreak(userId: string): Promise<Streak> {
    const response = await analyticsApi.get(`/streak/${userId}`);
    return response.data.streak;
  }

  /**
   * Update streak after quiz completion
   */
  async updateStreak(): Promise<StreakUpdateResult> {
    const response = await analyticsApi.post('/streak/update');
    return response.data;
  }

  /**
   * Use streak freeze
   */
  async useStreakFreeze(): Promise<Streak> {
    const response = await analyticsApi.post('/streak/freeze');
    return response.data.streak;
  }

  /**
   * Get all available achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    const response = await analyticsApi.get('/achievements');
    return response.data.achievements;
  }

  /**
   * Get user's unlocked achievements
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const response = await analyticsApi.get(`/achievements/${userId}`);
    return response.data.userAchievements;
  }

  /**
   * Unlock specific achievement
   */
  async unlockAchievement(achievementId: string): Promise<UserAchievement> {
    const response = await analyticsApi.post('/achievements/unlock', {
      achievementId,
    });
    return response.data.userAchievement;
  }

  /**
   * Check and auto-unlock achievements
   */
  async checkAchievements(): Promise<UserAchievement[]> {
    const response = await analyticsApi.post('/achievements/check');
    return response.data.newAchievements;
  }
}

export const statsService = new StatsService();
export const statsAPI = statsService; // Alias for convenience
