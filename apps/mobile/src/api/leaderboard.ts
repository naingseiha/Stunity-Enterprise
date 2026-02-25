import { analyticsApi } from './client';

export interface UserStats {
    id: string;
    userId: string;
    xp: number;
    level: number;
    totalQuizzes: number;
    totalPoints: number;
    correctAnswers: number;
    totalAnswers: number;
    liveQuizWins: number;
    liveQuizTotal: number;
    createdAt: string;
    updatedAt: string;
}

export interface UserStanding extends UserStats {
    rank: number | null;
}

export interface LeaderboardUser {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    email: string;
}

export interface LeaderboardEntry extends UserStats {
    user: LeaderboardUser;
    rank: number;
}

export interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[];
    userStanding: UserStanding | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export const leaderboardApi = {
    /**
     * Fetch the global XP leaderboard
     */
    getGlobalLeaderboard: async (page = 1, limit = 50): Promise<LeaderboardResponse> => {
        const response = await analyticsApi.get('/leaderboard/global', {
            params: { page, limit },
        });
        return response.data.data;
    },

    /**
     * Fetch the weekly rolling XP leaderboard
     */
    getWeeklyLeaderboard: async (): Promise<{ weekStart: string; leaderboard: any[]; userStanding: any | null }> => {
        const response = await analyticsApi.get('/leaderboard/weekly');
        return response.data.data;
    }
};
