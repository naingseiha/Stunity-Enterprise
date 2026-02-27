/**
 * Auth Store
 * 
 * Global authentication state management with Zustand
 * Handles login, logout, user profile, and session management
 * Uses backend auth-service API (not Supabase Auth directly)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthTokens, LoginCredentials, RegisterData } from '@/types';
import { authApi } from '@/api/client';
import { eventEmitter } from '@/utils/eventEmitter';
import { tokenService } from '@/services/token';

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
  linkClaimCode: (code: string) => Promise<{ success: boolean; error?: string }>;
}

// Helper to map backend API user response to app User type
const mapApiUserToUser = (apiUser: any): User => ({
  id: apiUser.id,
  email: apiUser.email || '',
  firstName: apiUser.firstName || '',
  lastName: apiUser.lastName || '',
  name: `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim() || 'User',
  username: apiUser.username || apiUser.email?.split('@')[0] || 'user',
  profilePictureUrl: apiUser.profilePictureUrl || apiUser.avatar || null,
  coverPhotoUrl: apiUser.coverPhotoUrl || null,
  role: apiUser.role || 'STUDENT',
  bio: apiUser.bio,
  headline: apiUser.headline,
  professionalTitle: apiUser.professionalTitle,
  location: apiUser.location,
  interests: apiUser.interests || [],
  languages: apiUser.languages || [],
  skills: apiUser.skills || [],
  socialLinks: apiUser.socialLinks || {},
  isVerified: apiUser.isVerified || false,
  isOnline: true,
  school: apiUser.school || null,
  level: apiUser.level ?? 1,
  totalPoints: apiUser.totalPoints ?? 0,
  totalLearningHours: apiUser.totalLearningHours ?? 0,
  currentStreak: apiUser.currentStreak ?? 0,
  createdAt: apiUser.createdAt || new Date().toISOString(),
  updatedAt: apiUser.updatedAt || new Date().toISOString(),
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

          // Check for stored tokens
          const hasTokens = await tokenService.initialize();

          if (!hasTokens) {
            console.log('Auth: No active session found');
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
            return;
          }

          // Verify token with backend (short timeout to avoid blocking app startup)
          try {
            const response = await authApi.get('/auth/verify', {
              timeout: 5000,
              headers: { 'X-No-Retry': 'true' },
            });

            if (response.data.success && response.data.data?.user) {
              const user = mapApiUserToUser(response.data.data.user);
              console.log('Auth: Session verified for', user.email);

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
              });
              return;
            }
          } catch (verifyError) {
            console.warn('Auth: Token verification failed, clearing session');
            await tokenService.clearTokens();
          }

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
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

          const response = await authApi.post('/auth/login', {
            email: credentials.email,
            password: credentials.password,
          });

          if (!response.data.success) {
            throw new Error(response.data.error || 'Login failed');
          }

          const { user: apiUser, tokens } = response.data.data;

          // Store tokens securely
          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);

          if (credentials.rememberMe) {
            await tokenService.setRememberMe(true);
          }

          const user = mapApiUserToUser(apiUser);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error: any) {
          console.error('Login error:', error);
          const message = error?.response?.data?.error || error?.message || 'Login failed';
          set({
            isLoading: false,
            error: message,
          });
          return false;
        }
      },

      // Register
      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authApi.post('/auth/register', {
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            role: data.role || 'STUDENT',
          });

          if (!response.data.success) {
            throw new Error(response.data.error || 'Registration failed');
          }

          const { user: apiUser, tokens } = response.data.data;

          // Store tokens securely
          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);

          const user = mapApiUserToUser(apiUser);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error: any) {
          console.error('Registration error:', error);
          const message = error?.response?.data?.error || error?.message || 'Registration failed';
          set({
            isLoading: false,
            error: message,
          });
          return false;
        }
      },

      // Logout
      logout: async () => {
        try {
          set({ isLoading: true });

          // Notify backend (best-effort)
          try {
            await authApi.post('/auth/logout');
          } catch (e) {
            // Ignore logout API errors
          }

          await tokenService.clearTokens();

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

      // Refresh user profile from backend
      refreshUser: async () => {
        try {
          const { user } = get();
          if (!user?.id) return;

          const response = await authApi.get('/auth/verify');

          if (response.data.success && response.data.data?.user) {
            const updatedUser = mapApiUserToUser(response.data.data.user);
            set({ user: updatedUser });
          }
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      // Link Claim Code
      linkClaimCode: async (code: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.post('/auth/claim-codes/link', { code });

          if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to link claim code');
          }

          const { token } = response.data.data;

          if (token) {
            // Update the stored token since the payload now contains the schoolId and role
            const currentTokens = await tokenService.getTokens();
            if (currentTokens) {
              await tokenService.setTokens({
                ...currentTokens,
                accessToken: token,
              });
            }
          }

          // Refresh the user profile to pull in the new school and role data
          await get().refreshUser();

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          console.error('Link claim code error:', error);
          const message = error?.response?.data?.error || error?.message || 'Failed to link claim code';
          set({
            isLoading: false,
            error: message,
          });
          return { success: false, error: message };
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
