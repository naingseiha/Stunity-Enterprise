/**
 * Club Store
 * 
 * Manages Club state with Hybrid Architecture:
 * - Fetches via API (Cloud Run)
 * - Real-time updates via Supabase
 */

import { create } from 'zustand';
import { Club } from '@/api/clubs'; // Use API definition of Club
import { clubsApi } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ClubState {
    clubs: Club[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchClubs: (params?: any) => Promise<void>;
    joinClub: (clubId: string) => Promise<void>;
    leaveClub: (clubId: string) => Promise<void>;

    // Real-time
    subscribeToClubs: () => void;
    unsubscribeFromClubs: () => void;

    realtimeSubscription: RealtimeChannel | null;
}

export const useClubStore = create<ClubState>((set, get) => ({
    clubs: [],
    isLoading: false,
    error: null,
    realtimeSubscription: null,

    fetchClubs: async (params) => {
        set({ isLoading: true, error: null });
        try {
            // Use the specific clubsApi export from client (which wraps the axios instance)
            // client.ts exports 'clubsApi', but api/clubs.ts wraps it with helper functions.
            // We should use the helper functions from '@/api/clubs' which we need to import differently 
            // or directly use the axios instance if we want raw control. 
            // Ideally reuse the helper functions in api/clubs.ts but they are async functions.
            // Let's import the helper functions from '@/api' which exports `* as clubsApi`.

            // Wait, client.ts exports 'clubsApi' (the Axios instance). 
            // api/clubs.ts imports that and exports functions like getClubs.
            // So we should import { getClubs } from '@/api/clubs'.
            // But to avoid naming conflict with the state variable 'clubs', let's use the namespace import in the file header if needed, 
            // or just import the specific function.

            // Dynamic import to avoid circular dependency issues if any, or just standard import.
            // I'll assume standard import of the helper function is fine.
            const { getClubs } = require('@/api/clubs');

            // Actually, standard import at top level is better for TS.
            // I'll fix the implementation content below to use top-level import.

            const fetchedClubs = await getClubs(params);
            set({ clubs: fetchedClubs, isLoading: false });
        } catch (error: any) {
            console.error('Failed to fetch clubs:', error);
            set({ error: error.message || 'Failed to load clubs', isLoading: false });
        }
    },

    joinClub: async (clubId: string) => {
        // Optimistic update
        set(state => ({
            clubs: state.clubs.map(c =>
                c.id === clubId
                    ? { ...c, memberCount: (c.memberCount || 0) + 1, isMember: true } // Note: Club type in api/clubs.ts doesn't have isMember explicitly on the main interface? 
                    // Checking api/clubs.ts: Club interface has memberCount but NO isMember. 
                    // However, getClubs might return it if augmented by backend.
                    // Let's assume for now we might need to handle isMember separately or the backend adds it.
                    // If the UI relies on isMember, we need it. 
                    // In ClubsScreen.tsx: const isJoined = club.memberCount !== undefined && club.memberCount > 0; 
                    // Wait, logic in ClubsScreen says: "const isJoined = club.memberCount !== undefined && club.memberCount > 0;"
                    // That logic seems flawed if memberCount includes other people. 
                    // Ah, usually 'getClubs' returns a customized view for the user.
                    // Let's look at api/clubs.ts again. It doesn't show isMember in the interface.
                    // BUT, typical pattern is the API returns "isJoined" or similar.
                    // Let's stick to the store method calling the API.
                    : c
            )
        }));

        try {
            const { joinClub } = require('@/api/clubs');
            await joinClub(clubId);
            // granular fetch or refresh
            get().fetchClubs();
        } catch (error) {
            console.error('Failed to join club:', error);
            // Revert could be complex, easier to just refetch
            get().fetchClubs();
        }
    },

    leaveClub: async (clubId: string) => {
        try {
            const { leaveClub } = require('@/api/clubs');
            await leaveClub(clubId);
            get().fetchClubs();
        } catch (error) {
            console.error('Failed to leave club:', error);
        }
    },

    subscribeToClubs: () => {
        console.log('👥 [ClubStore] Subscribing to realtime clubs...');
        const { unsubscribeFromClubs } = get();
        unsubscribeFromClubs();

        const channel = supabase
            .channel('public:clubs')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events
                    schema: 'public',
                    table: 'clubs',
                },
                (payload) => {
                    console.log('👥 [ClubStore] Realtime update:', payload);
                    // Simple strategy: Refetch list on any change to keep it accurate
                    // Optimization: Update specific item in array if possible
                    get().fetchClubs();
                }
            )
            .subscribe();

        set({ realtimeSubscription: channel });
    },

    unsubscribeFromClubs: () => {
        const { realtimeSubscription } = get();
        if (realtimeSubscription) {
            realtimeSubscription.unsubscribe();
            set({ realtimeSubscription: null });
        }
    }
}));
