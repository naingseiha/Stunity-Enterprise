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
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as Passkeys from 'react-native-passkeys';
import { User, AuthTokens, LoginCredentials, OtpChallengeResponse, OtpVerifyResult, RegisterData } from '@/types';
import { authApi } from '@/api/client';
import * as passkeysApi from '@/api/passkeys';
import { Config } from '@/config';
import { eventEmitter } from '@/utils/eventEmitter';
import { tokenService } from '@/services/token';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: (options?: { skipBiometric?: boolean }) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  startPhoneOtp: (phone: string, preferredChannel?: 'AUTO' | 'TELEGRAM' | 'SMS') => Promise<{ success: boolean; data?: OtpChallengeResponse; error?: string }>;
  verifyPhoneOtp: (challengeId: string, code: string) => Promise<{ success: boolean; data?: OtpVerifyResult; error?: string }>;
  enrollPasswordless: (input: { enrollmentToken: string; firstName: string; lastName: string; acceptedTermsVersion: string }) => Promise<{ success: boolean; error?: string }>;
  startTelegramOidc: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  enrollPasskey: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  passkeySignIn: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  linkClaimCode: (code: string, verificationData?: any) => Promise<{ success: boolean; error?: string; data?: any }>;
  cancelSchoolLink: () => Promise<{ success: boolean; error?: string }>;
  validateClaimCode: (code: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  parentLogin: (credentials: { phone: string; password: string }) => Promise<boolean>;
  parentRegister: (data: { firstName: string; lastName: string; phone: string; password: string; claimCode?: string }) => Promise<boolean>;
}

// Helper to map backend API user response to app User type
const mapApiUserToUser = (apiUser: any): User => {
  const visibility = apiUser.profileVisibility;
  const profileVisibility =
    visibility === 'PUBLIC' || visibility === 'SCHOOL' || visibility === 'PRIVATE'
      ? visibility
      : 'PUBLIC';

  return {
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
    profileVisibility,
    isOpenToOpportunities: apiUser.isOpenToOpportunities ?? false,
    isVerified: apiUser.isVerified || false,
    isOnline: apiUser.isOnline ?? true,
    schoolId: apiUser.schoolId,
    school: apiUser.school,
    teacherId: apiUser.teacherId ?? null,
    studentId: apiUser.studentId ?? null,
    parentId: apiUser.parentId ?? null,
    linkingStatus: apiUser.linkingStatus || 'NONE',
    pendingLinkData: apiUser.pendingLinkData || null,
    teacher:
      apiUser.teacher ?? (apiUser.teacherId ? { id: apiUser.teacherId } : undefined),
    student: apiUser.student,
    level: apiUser.level ?? 1,
    totalPoints: apiUser.totalPoints ?? 0,
    totalLearningHours: apiUser.totalLearningHours ?? 0,
    currentStreak: apiUser.currentStreak ?? 0,
    children: apiUser.children || [],
    isDefaultPassword: apiUser.isDefaultPassword || false,
    createdAt: apiUser.createdAt || new Date().toISOString(),
    updatedAt: apiUser.updatedAt || new Date().toISOString(),
  };
};

const prewarmFeedAfterAuth = (role?: User['role']) => {
  if (role === 'PARENT') return;

  // Wake hot-path backend containers in parallel with the data fetch. /health
  // is unauthenticated and ~10ms warm, so the ping itself is cheap and the
  // sibling services (learn, notification) get warmed for free.
  void import('@/services/backendPrewarm')
    .then(({ prewarmHotServices }) => prewarmHotServices())
    .catch(() => { });

  setTimeout(() => {
    import('./feedStore')
      .then(({ useFeedStore }) => {
        const feedState = useFeedStore.getState();
        if (!feedState.isLoadingPosts && feedState.feedItems.length === 0) {
          feedState.fetchPosts(true).catch(() => { });
        }
      })
      .catch(() => { });
  }, 0);
};

const AUTH_DEVICE_ID_KEY = '@stunity/auth-device-id';

async function getAuthDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(AUTH_DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `mobile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
  await AsyncStorage.setItem(AUTH_DEVICE_ID_KEY, created);
  return created;
}

const mapAuthResponseUser = (apiUser: any, responseData: any): User => {
  return mapApiUserToUser({
    ...apiUser,
    school: apiUser?.school || responseData?.school || null,
    schoolId: apiUser?.schoolId || responseData?.school?.id || null,
  });
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoggingOut: false,
      isLoading: true,
      isInitialized: false,
      error: null,

      // Initialize auth state on app start
      initialize: async (options) => {
        try {
          set({ isLoading: true });

          const restorePersistedSession = () => {
            const state = get();
            if (!state.user) return false;

            set({
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
            prewarmFeedAfterAuth(state.user.role);
            return true;
          };

          // Check for stored tokens
          const hasTokens = await tokenService.initialize();

          if (hasTokens && !options?.skipBiometric) {
            const biometricEnabled = await tokenService.isBiometricEnabled();
            if (biometricEnabled) {
              const { authenticateBiometric } = await import('@/services/biometrics');
              const authResult = await authenticateBiometric('Unlock Stunity');
              if (!authResult.success) {
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoggingOut: false,
                  isLoading: false,
                  isInitialized: true,
                });
                return;
              }
            }
          }

          if (!hasTokens) {
            console.warn('Auth: No secure tokens loaded on init');
            if (restorePersistedSession()) {
              console.warn('Auth: Keeping persisted session until explicit logout');
              return;
            }

            set({
              user: null,
              isAuthenticated: false,
              isLoggingOut: false,
              isLoading: false,
              isInitialized: true,
            });
            return;
          }

          // Verify token with backend (longer timeout, resilient to network blips)
          try {
            const response = await authApi.get('/auth/verify', {
              timeout: 15000, // 15 seconds
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
              prewarmFeedAfterAuth(user.role);
              return;
            }
          } catch (verifyError: any) {
            const status = verifyError?.response?.status;
            if (status === 401 || status === 403) {
              console.warn('Auth: Verify rejected current access token, attempting refresh recovery');
              try {
                const refreshedToken = await tokenService.refreshAccessToken();
                if (refreshedToken) {
                  const retryResponse = await authApi.get('/auth/verify', {
                    timeout: 15000,
                    headers: {
                      'X-No-Retry': 'true',
                      Authorization: `Bearer ${refreshedToken}`,
                    },
                  });

                  if (retryResponse.data.success && retryResponse.data.data?.user) {
                    const user = mapApiUserToUser(retryResponse.data.data.user);
                    console.log('Auth: Session restored via refresh for', user.email);
                    set({
                      user,
                      isAuthenticated: true,
                      isLoading: false,
                      isInitialized: true,
                    });
                    prewarmFeedAfterAuth(user.role);
                    return;
                  }
                }

                if (restorePersistedSession()) {
                  console.warn('Auth: Refresh temporarily unavailable, keeping persisted session');
                  return;
                }
              } catch (refreshError: any) {
                const refreshStatus = refreshError?.response?.status;
                if (refreshStatus === 401 || refreshStatus === 403) {
                  console.warn('Auth: Refresh token rejected by server, clearing session');
                  await tokenService.clearTokens();
                } else if (restorePersistedSession()) {
                  console.warn('Auth: Refresh failed due to network/server issue, keeping persisted session');
                  return;
                }
              }
            } else {
              console.warn('Auth: Network/Server error during verification, keeping session active');
              if (restorePersistedSession()) {
                return;
              }
            }
          }

          set({
            user: null,
            isAuthenticated: false,
            isLoggingOut: false,
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

          const payload: { email?: string; phone?: string; password: string } = {
            password: credentials.password,
          };
          if (credentials.email?.trim()) {
            payload.email = credentials.email.trim();
          } else if (credentials.phone?.trim()) {
            payload.phone = credentials.phone.trim();
          }
          const response = await authApi.post('/auth/login', payload);

          if (!response.data.success) {
            throw new Error(response.data.error || 'Login failed');
          }

          const { user: apiUser, tokens } = response.data.data;

          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();

          // Store tokens securely
          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);

          if (credentials.rememberMe) {
            await tokenService.setRememberMe(true);
          }

          const user = mapAuthResponseUser(apiUser, response.data.data);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          prewarmFeedAfterAuth(user.role);

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
          });

          if (!response.data.success) {
            throw new Error(response.data.error || 'Registration failed');
          }

          const { user: apiUser, tokens } = response.data.data;

          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();

          // Store tokens securely
          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);

          const user = mapAuthResponseUser(apiUser, response.data.data);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          prewarmFeedAfterAuth(user.role);

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

      startPhoneOtp: async (phone, preferredChannel = 'AUTO') => {
        try {
          set({ isLoading: true, error: null });
          const deviceId = await getAuthDeviceId();
          const response = await authApi.post('/auth/otp/start', { phone, preferredChannel, deviceId });
          set({ isLoading: false });
          return { success: true, data: response.data.data as OtpChallengeResponse };
        } catch (error: any) {
          const message = error.response?.data?.error || 'Unable to send verification code';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      verifyPhoneOtp: async (challengeId, code) => {
        try {
          set({ isLoading: true, error: null });
          const deviceId = await getAuthDeviceId();
          const response = await authApi.post('/auth/otp/verify', { challengeId, code, deviceId });
          const data = response.data.data;
          if (data.status === 'AUTHENTICATED') {
            const { useFeedStore } = await import('./feedStore');
            useFeedStore.getState().reset();
            await tokenService.setTokens(data.tokens as AuthTokens);
            await tokenService.setUserId(data.user.id);
            const user = mapAuthResponseUser(data.user, data);
            set({ user, isAuthenticated: true, isLoading: false });
            prewarmFeedAfterAuth(user.role);
            return { success: true, data: { status: 'AUTHENTICATED' } as OtpVerifyResult };
          }
          set({ isLoading: false });
          return {
            success: true,
            data: { status: 'ENROLLMENT_REQUIRED', enrollmentToken: data.enrollmentToken } as OtpVerifyResult,
          };
        } catch (error: any) {
          const message = error.response?.data?.error || 'Invalid or expired verification code';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      enrollPasswordless: async (input) => {
        try {
          set({ isLoading: true, error: null });
          const deviceId = await getAuthDeviceId();
          const response = await authApi.post('/auth/enroll', { ...input, deviceId });
          const { user: apiUser, tokens } = response.data.data;
          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();
          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);
          const user = mapAuthResponseUser(apiUser, response.data.data);
          set({ user, isAuthenticated: true, isLoading: false });
          prewarmFeedAfterAuth(user.role);
          return { success: true };
        } catch (error: any) {
          const message = error.response?.data?.error || 'Unable to finish account setup';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      startTelegramOidc: async () => {
        try {
          set({ isLoading: true, error: null });
          const redirectUrl = 'stunity://auth/oidc/complete';
          const authUrl = `${Config.authUrl}/auth/oidc/telegram/start?client=mobile`;
          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
          if (result.type !== 'success' || !result.url) {
            set({ isLoading: false });
            return { success: false, cancelled: true };
          }
          const callback = new URL(result.url);
          const status = callback.searchParams.get('status');
          const sessionCode = callback.searchParams.get('code');
          if (status !== 'ok' || !sessionCode) {
            const message = callback.searchParams.get('code') || 'Telegram sign-in did not complete';
            set({ isLoading: false, error: message });
            return { success: false, error: message };
          }

          const response = await authApi.post('/auth/oidc/telegram/session', { code: sessionCode });
          const data = response.data.data;
          if (data.requires2FA) {
            // Mobile two-factor challenge UI for federated sign-in is not
            // built yet; surface a clear error instead of stalling here.
            set({ isLoading: false, error: 'Two-factor sign-in is not yet supported for Telegram.' });
            return { success: false, error: 'Two-factor sign-in is not yet supported for Telegram.' };
          }
          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();
          await tokenService.setTokens(data.tokens as AuthTokens);
          await tokenService.setUserId(data.user.id);
          const user = mapAuthResponseUser(data.user, data);
          set({ user, isAuthenticated: true, isLoading: false });
          prewarmFeedAfterAuth(user.role);
          return { success: true };
        } catch (error: any) {
          const message = error.response?.data?.error || 'Unable to complete Telegram sign-in';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      enrollPasskey: async () => {
        try {
          set({ isLoading: true, error: null });
          const options = await passkeysApi.getRegistrationOptions();
          const response = await Passkeys.create(options as any);
          if (!response) {
            set({ isLoading: false });
            return { success: false, cancelled: true };
          }
          const deviceLabel = Device.deviceName || `${Platform.OS} device`;
          await passkeysApi.verifyRegistration(response, deviceLabel);
          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          // Enrollment is optional — a cancelled/unsupported ceremony should
          // not block the user from reaching the app.
          set({ isLoading: false });
          if (error?.name === 'NotAllowedError' || error?.name === 'NotSupportedError') {
            return { success: false, cancelled: true };
          }
          const message = error.response?.data?.error || 'Unable to set up a passkey';
          return { success: false, error: message };
        }
      },

      passkeySignIn: async () => {
        try {
          set({ isLoading: true, error: null });
          const { challengeId, options } = await passkeysApi.getAuthenticationOptions();
          const response = await Passkeys.get(options as any);
          if (!response) {
            set({ isLoading: false });
            return { success: false, cancelled: true };
          }
          const data = await passkeysApi.verifyAuthentication(challengeId, response);
          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();
          await tokenService.setTokens(data.tokens as AuthTokens);
          await tokenService.setUserId(data.user.id);
          const user = mapAuthResponseUser(data.user, data);
          set({ user, isAuthenticated: true, isLoading: false });
          prewarmFeedAfterAuth(user.role);
          return { success: true };
        } catch (error: any) {
          if (error?.name === 'NotAllowedError' || error?.name === 'NotSupportedError') {
            set({ isLoading: false });
            return { success: false, cancelled: true };
          }
          const message = error.response?.data?.error || 'Could not sign in with a passkey';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Parent login (phone + password)
      parentLogin: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authApi.post('/auth/parent/login', {
            phone: credentials.phone.trim(),
            password: credentials.password,
          });

          if (!response.data.success) {
            throw new Error(response.data.error || 'Login failed');
          }

          const { user: apiUser, tokens } = response.data.data;

          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);

          const user = mapAuthResponseUser(apiUser, response.data.data);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          prewarmFeedAfterAuth(user.role);

          return true;
        } catch (error: any) {
          console.error('Parent login error:', error);
          const message = error?.response?.data?.error || error?.message || 'Login failed';
          set({
            isLoading: false,
            error: message,
          });
          return false;
        }
      },

      // Parent register
      parentRegister: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.post('/auth/parent/register', {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone.trim(),
            password: data.password,
            claimCode: data.claimCode,
          });

          if (!response.data.success) {
            throw new Error(response.data.error || 'Registration failed');
          }

          const { user: apiUser, tokens } = response.data.data;

          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);

          const user = mapAuthResponseUser(apiUser, response.data.data);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          prewarmFeedAfterAuth(user.role);

          return true;
        } catch (error: any) {
          console.error('Parent registration error:', error);
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
          set({ isLoading: true, isLoggingOut: true });

          // Revoke refresh token on server (best-effort)
          try {
            const tokens = await tokenService.getTokens();
            const refreshToken = tokens?.refreshToken;
            await authApi.post('/auth/logout', { refreshToken: refreshToken || undefined });
          } catch (e) {
            // Ignore logout API errors
          }

          await tokenService.clearTokens();

          // Reset feed store state
          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();

          set({
            user: null,
            isAuthenticated: false,
            isLoggingOut: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Logout error:', error);
          set({ isLoading: false, isLoggingOut: false });
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
      linkClaimCode: async (code: string, verificationData?: any) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.post('/auth/school-links', { code, verificationData });

          if (response.data.success) {
            // If it was immediate (legacy/admin approve), we might get a token
            if (response.data.data?.token) {
              const currentTokens = await tokenService.getTokens();
              if (currentTokens) {
                await tokenService.setTokens({
                  ...currentTokens,
                  accessToken: response.data.data.token,
                });
              }
              await get().refreshUser();
            } else if (response.data.data?.linkingStatus === 'PENDING') {
              // New two-step flow: just update local user status
              const currentUser = get().user;
              if (currentUser) {
                get().updateUser({
                  linkingStatus: 'PENDING',
                  pendingLinkData: {
                    code,
                    schoolId: response.data.data.school?.id,
                    schoolName: response.data.data.school?.name,
                    submittedAt: new Date().toISOString()
                  }
                });
              }
            }

            set({ isLoading: false });
            return { success: true, data: response.data.data };
          } else {
            set({ isLoading: false, error: response.data.error });
            return { success: false, error: response.data.error };
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Failed to link claim code';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      cancelSchoolLink: async () => {
        try {
          set({ isLoading: true, error: null });
          await authApi.post('/auth/school-links/current/cancel');
          const currentUser = get().user;
          if (currentUser) {
            get().updateUser({ linkingStatus: 'NONE', pendingLinkData: null });
          }
          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Failed to cancel school link request';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      validateClaimCode: async (code: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.post(
            '/auth/claim-codes/preview',
            { code },
            {
              timeout: 15000,
              headers: { 'X-No-Retry': '1' },
            }
          );

          set({ isLoading: false });
          if (response.data.success) {
            return { success: true, data: response.data.data };
          } else {
            return { success: false, error: response.data.error };
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Failed to validate claim code';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
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
