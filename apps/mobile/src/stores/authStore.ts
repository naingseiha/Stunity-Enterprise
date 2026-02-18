/**
 * Auth Store
 * 
 * Global authentication state management with Zustand
 * Handles login, logout, user profile, and session management
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthTokens, LoginCredentials, RegisterData } from '@/types';
import { authApi } from '@/api/client';
import { eventEmitter } from '@/utils/eventEmitter';
import { tokenService } from '@/services/token';
import { supabase } from '@/lib/supabase';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// Helper to map Supabase User + Profile to App User
// apiUser here will be the merged object of { ...auth.user, ...profile }
const mapSupabaseUserToUser = (authUser: any, profile: any): User => ({
  id: authUser.id,
  email: authUser.email || '',
  // Profile data
  firstName: profile?.first_name || '',
  lastName: profile?.last_name || '',
  name: profile?.username || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User',
  username: profile?.username || authUser.email?.split('@')[0] || 'user',
  profilePictureUrl: profile?.avatar_url || null,
  role: profile?.role || 'student',
  // Extended fields (if they exist in profile)
  bio: profile?.bio,
  headline: profile?.headline,
  location: profile?.location,
  interests: profile?.interests || [],
  isVerified: false,
  isOnline: true,
  createdAt: authUser.created_at,
  updatedAt: authUser.updated_at,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      error: null,

      // Initialize auth state on app start
      initialize: async () => {
        try {
          set({ isLoading: true });

          // Check for active session
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error || !session?.user) {
            console.log('Auth: No active session found');
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
            return;
          }

          console.log('Auth: Session found for', session.user.email);

          // Fetch Profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.warn('Auth: Failed to fetch profile', profileError);
          }

          // Map to User type
          const user = mapSupabaseUserToUser(session.user, profile || {});

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });

          // Setup listener for auth state changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!session) {
              set({ user: null, isAuthenticated: false });
            }
            // We could update state here for SIGNED_IN actions too
          });

        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            isLoading: false,
            isInitialized: true,
            error: 'Failed to initialize authentication',
          });
        }
      },

      // Login
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) throw error;
          if (!data.user) throw new Error('Login succeeded but no user returned');

          // Fetch Profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const user = mapSupabaseUserToUser(data.user, profile || {});

          // Token handling is automatic with supabase client

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error: any) {
          console.error('Login error:', error);
          set({
            isLoading: false,
            error: error.message || 'Login failed',
          });
          return false;
        }
      },

      // Register
      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });

          // Supabase SignUp
          const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                first_name: data.firstName,
                last_name: data.lastName,
                username: data.username || data.email.split('@')[0],
              },
            },
          });

          if (error) throw error;
          if (!authData.user) throw new Error('Registration succeeded but no user returned');

          // Profile is created automatically by Trigger (HandleNewUser)
          // But we might want to wait a split second or fetch it

          // Construct initial user object immediately for UI
          const user = mapSupabaseUserToUser(authData.user, {
            first_name: data.firstName,
            last_name: data.lastName,
            username: data.username,
          });

          set({
            user,
            isAuthenticated: true, // Assuming auto-confirm enabled, otherwise false
            isLoading: false,
          });

          return true;
        } catch (error: any) {
          console.error('Registration error:', error);
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          return false;
        }
      },

      // Logout
      logout: async () => {
        try {
          set({ isLoading: true });
          await supabase.auth.signOut();
          await tokenService.clearTokens(); // Cleanup legacy tokens just in case
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Logout error:', error);
          set({ isLoading: false });
        }
      },

      // Refresh user profile
      refreshUser: async () => {
        try {
          const { user } = get();
          if (!user?.id) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            // Merge existing auth user data (email) with new profile data
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const updatedUser = mapSupabaseUserToUser(authUser, profile);
              set({ user: updatedUser });
            }
          }
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      // Update user locally (optimistic update)
      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Set loading
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'stunity-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist user data, not loading/error states
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Listen for auth events from API client
eventEmitter.on('auth:logout', () => {
  useAuthStore.getState().logout();
});

export default useAuthStore;
