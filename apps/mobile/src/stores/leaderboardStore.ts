import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leaderboardApi, LeaderboardEntry, UserStanding } from '../api/leaderboard';

interface LeaderboardState {
    globalLeaderboard: LeaderboardEntry[];
    weeklyLeaderboard: any[];
    userGlobalStanding: UserStanding | null;
    userWeeklyStanding: any | null;
    globalFetchedAt: number | null;
    weeklyFetchedAt: number | null;
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;

    fetchGlobalLeaderboard: (isRefresh?: boolean) => Promise<void>;
    fetchWeeklyLeaderboard: (isRefresh?: boolean) => Promise<void>;
}

const LEADERBOARD_CACHE_TTL = 60_000;
let globalLeaderboardInFlight: Promise<void> | null = null;
let weeklyLeaderboardInFlight: Promise<void> | null = null;

export const useLeaderboardStore = create<LeaderboardState>()(
    persist(
        (set, get) => ({
            globalLeaderboard: [],
            weeklyLeaderboard: [],
            userGlobalStanding: null,
            userWeeklyStanding: null,
            globalFetchedAt: null,
            weeklyFetchedAt: null,
            isLoading: false,
            isRefreshing: false,
            error: null,

            fetchGlobalLeaderboard: async (isRefresh = false) => {
                const state = get();
                const hasFreshCache =
                    !isRefresh &&
                    state.globalLeaderboard.length > 0 &&
                    state.globalFetchedAt !== null &&
                    Date.now() - state.globalFetchedAt < LEADERBOARD_CACHE_TTL;

                if (hasFreshCache) return;
                if (!isRefresh && globalLeaderboardInFlight) return globalLeaderboardInFlight;

                try {
                    if (isRefresh) {
                        set({ isRefreshing: true, error: null });
                    } else if (get().globalLeaderboard.length === 0) {
                        set({ isLoading: true, error: null });
                    }

                    globalLeaderboardInFlight = leaderboardApi.getGlobalLeaderboard(1, 50)
                        .then((response) => {
                            set({
                                globalLeaderboard: response.leaderboard,
                                userGlobalStanding: response.userStanding,
                                globalFetchedAt: Date.now(),
                                isLoading: false,
                                isRefreshing: false,
                            });
                        })
                        .finally(() => {
                            globalLeaderboardInFlight = null;
                        });

                    await globalLeaderboardInFlight;
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
                const state = get();
                const hasFreshCache =
                    !isRefresh &&
                    state.weeklyLeaderboard.length > 0 &&
                    state.weeklyFetchedAt !== null &&
                    Date.now() - state.weeklyFetchedAt < LEADERBOARD_CACHE_TTL;

                if (hasFreshCache) return;
                if (!isRefresh && weeklyLeaderboardInFlight) return weeklyLeaderboardInFlight;

                try {
                    if (isRefresh) {
                        set({ isRefreshing: true, error: null });
                    } else if (get().weeklyLeaderboard.length === 0) {
                        set({ isLoading: true, error: null });
                    }

                    weeklyLeaderboardInFlight = leaderboardApi.getWeeklyLeaderboard()
                        .then((response) => {
                            set({
                                weeklyLeaderboard: response.leaderboard,
                                userWeeklyStanding: response.userStanding,
                                weeklyFetchedAt: Date.now(),
                                isLoading: false,
                                isRefreshing: false,
                            });
                        })
                        .finally(() => {
                            weeklyLeaderboardInFlight = null;
                        });

                    await weeklyLeaderboardInFlight;
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
                globalFetchedAt: state.globalFetchedAt,
                weeklyLeaderboard: state.weeklyLeaderboard,
                userWeeklyStanding: state.userWeeklyStanding,
                weeklyFetchedAt: state.weeklyFetchedAt,
            }), // only persist some state to allow offline viewing
        }
    )
);
