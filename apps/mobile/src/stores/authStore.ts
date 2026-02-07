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

// Helper to map API response to User type
const mapApiUserToUser = (apiUser: any): User => ({
  id: apiUser.id,
  firstName: apiUser.firstName || '',
  lastName: apiUser.lastName || '',
  name: apiUser.name || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
  email: apiUser.email,
  phone: apiUser.phone,
  role: apiUser.role,
  profilePictureUrl: apiUser.profilePictureUrl || apiUser.avatar,
  coverPhotoUrl: apiUser.coverPhotoUrl,
  bio: apiUser.bio,
  headline: apiUser.headline,
  professionalTitle: apiUser.professionalTitle,
  location: apiUser.location,
  languages: apiUser.languages || [],
  interests: apiUser.interests || [],
  isVerified: apiUser.isVerified || false,
  isOnline: apiUser.isOnline || false,
  lastActiveAt: apiUser.lastActiveAt,
  createdAt: apiUser.createdAt,
  updatedAt: apiUser.updatedAt,
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
          
          // First check if we have persisted auth state from Zustand
          const currentState = get();
          if (currentState.isAuthenticated && currentState.user) {
            // Already have persisted state, just mark as initialized
            console.log('Auth: Restoring persisted session for', currentState.user.email);
            set({ isLoading: false, isInitialized: true });
            
            // Optionally refresh user in background (don't block)
            tokenService.initialize().then(hasTokens => {
              if (hasTokens) {
                authApi.get('/users/me').then(response => {
                  if (response.data.success) {
                    const apiUser = response.data.user || response.data.data;
                    set({ user: mapApiUserToUser(apiUser) });
                  }
                }).catch(() => {
                  // Ignore - we still have cached user data
                });
              }
            });
            return;
          }
          
          // No persisted state - check for tokens
          const hasTokens = await tokenService.initialize();
          
          if (hasTokens) {
            // Validate token and get user profile
            try {
              const timeoutController = new AbortController();
              const timeoutId = setTimeout(() => timeoutController.abort(), 5000);
              
              const response = await authApi.get('/users/me', {
                signal: timeoutController.signal,
              });
              
              clearTimeout(timeoutId);
              
              if (response.data.success) {
                const apiUser = response.data.user || response.data.data;
                set({
                  user: mapApiUserToUser(apiUser),
                  isAuthenticated: true,
                  isLoading: false,
                  isInitialized: true,
                });
                return;
              }
            } catch (error: any) {
              // Only clear tokens on 401 (unauthorized), not on network errors
              if (error?.response?.status === 401) {
                console.warn('Token expired, clearing');
                await tokenService.clearTokens().catch(() => {});
              } else {
                console.warn('Network error during auth check, keeping tokens');
                // Keep tokens for retry later
              }
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
          console.log('Login response:', JSON.stringify(response.data, null, 2));

          if (response.data.success) {
            // Backend returns { success, message, data: { user, tokens, ... } }
            const { user: apiUser, tokens } = response.data.data || response.data;

            if (!tokens) {
              throw new Error('No tokens in response');
            }

            // Save tokens
            await tokenService.setTokens(tokens);
            await tokenService.setUserId(apiUser.id);

            // Set remember me preference
            if (credentials.rememberMe) {
              await tokenService.setRememberMe(true);
            }

            set({
              user: mapApiUserToUser(apiUser),
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
          console.error('Login error:', error);
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
            const apiUser = response.data.user || response.data.data;
            set({ user: mapApiUserToUser(apiUser) });
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
