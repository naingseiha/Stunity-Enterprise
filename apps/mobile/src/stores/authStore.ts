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
import { authApi, eventEmitter } from '@/api/client';
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
}

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
          
          // Initialize token service (has its own timeout)
          const hasTokens = await tokenService.initialize();
          
          if (hasTokens) {
            // Validate token and get user profile - skip if backend not reachable
            try {
              // Timeout for API call
              const timeoutController = new AbortController();
              const timeoutId = setTimeout(() => timeoutController.abort(), 3000);
              
              const response = await authApi.get('/users/me', {
                signal: timeoutController.signal,
              });
              
              clearTimeout(timeoutId);
              
              if (response.data.success) {
                set({
                  user: response.data.user,
                  isAuthenticated: true,
                  isLoading: false,
                  isInitialized: true,
                });
                return;
              }
            } catch (error) {
              console.warn('Auth validation failed, clearing tokens');
              // Token invalid or network error, clear it
              await tokenService.clearTokens().catch(() => {});
            }
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
            user: null,
            isAuthenticated: false,
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

          const response = await authApi.post('/auth/login', credentials);

          if (response.data.success) {
            const { user, tokens } = response.data;

            // Save tokens
            await tokenService.setTokens(tokens);
            await tokenService.setUserId(user.id);

            // Set remember me preference
            if (credentials.rememberMe) {
              await tokenService.setRememberMe(true);
            }

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });

            return true;
          }

          set({
            isLoading: false,
            error: response.data.message || 'Login failed',
          });
          return false;
        } catch (error: any) {
          const message = error.message || 'An error occurred during login';
          set({
            isLoading: false,
            error: message,
          });
          return false;
        }
      },

      // Register
      register: async (data) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authApi.post('/auth/register', data);

          if (response.data.success) {
            const { user, tokens } = response.data;

            // Save tokens
            await tokenService.setTokens(tokens);
            await tokenService.setUserId(user.id);

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });

            return true;
          }

          set({
            isLoading: false,
            error: response.data.message || 'Registration failed',
          });
          return false;
        } catch (error: any) {
          const message = error.message || 'An error occurred during registration';
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

          // Call logout endpoint (invalidate refresh token on server)
          try {
            await authApi.post('/auth/logout');
          } catch {
            // Ignore errors, continue with local logout
          }

          // Clear tokens
          await tokenService.clearTokens();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          // Emit logout event
          eventEmitter.emit('auth:logout');
        } catch (error) {
          console.error('Logout error:', error);
          set({ isLoading: false });
        }
      },

      // Refresh user profile
      refreshUser: async () => {
        try {
          const response = await authApi.get('/users/me');
          if (response.data.success) {
            set({ user: response.data.user });
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
