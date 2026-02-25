import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leaderboardApi, LeaderboardEntry, UserStanding } from '../api/leaderboard';

interface LeaderboardState {
    globalLeaderboard: LeaderboardEntry[];
    weeklyLeaderboard: any[];
    userGlobalStanding: UserStanding | null;
    userWeeklyStanding: any | null;
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;

    fetchGlobalLeaderboard: (isRefresh?: boolean) => Promise<void>;
    fetchWeeklyLeaderboard: (isRefresh?: boolean) => Promise<void>;
}

export const useLeaderboardStore = create<LeaderboardState>()(
    persist(
        (set, get) => ({
            globalLeaderboard: [],
            weeklyLeaderboard: [],
            userGlobalStanding: null,
            userWeeklyStanding: null,
            isLoading: false,
            isRefreshing: false,
            error: null,

            fetchGlobalLeaderboard: async (isRefresh = false) => {
                try {
                    if (isRefresh) {
                        set({ isRefreshing: true, error: null });
                    } else if (get().globalLeaderboard.length === 0) {
                        set({ isLoading: true, error: null });
                    }

                    const response = await leaderboardApi.getGlobalLeaderboard(1, 50);
                    set({
                        globalLeaderboard: response.leaderboard,
                        userGlobalStanding: response.userStanding,
                        isLoading: false,
                        isRefreshing: false,
                    });
                } catch (error: any) {
                    console.error('Fetch global leaderboard error:', error);
                    set({
                        error: error.message || 'Failed to fetch global leaderboard',
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchWeeklyLeaderboard: async (isRefresh = false) => {
                try {
                    if (isRefresh) {
                        set({ isRefreshing: true, error: null });
                    } else if (get().weeklyLeaderboard.length === 0) {
                        set({ isLoading: true, error: null });
                    }

                    const response = await leaderboardApi.getWeeklyLeaderboard();
                    set({
                        weeklyLeaderboard: response.leaderboard,
                        userWeeklyStanding: response.userStanding,
                        isLoading: false,
                        isRefreshing: false,
                    });
                } catch (error: any) {
                    console.error('Fetch weekly leaderboard error:', error);
                    set({
                        error: error.message || 'Failed to fetch weekly leaderboard',
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },
        }),
        {
            name: 'leaderboard-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                globalLeaderboard: state.globalLeaderboard,
                userGlobalStanding: state.userGlobalStanding,
            }), // only persist some state to allow offline viewing
        }
    )
);
