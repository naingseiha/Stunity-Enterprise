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
import { clearFeedCache } from '@/services/feedCache';
import { clearUserScopedSessionCache } from '@/services/sessionCache';
import { getAuthDeviceId } from '@/services/authDeviceId';

export interface PasswordLoginResult {
  success: boolean;
  error?: string;
  requires2FA?: boolean;
  challengeToken?: string;
  email?: string;
}

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
  login: (credentials: LoginCredentials) => Promise<PasswordLoginResult>;
  register: (data: RegisterData) => Promise<boolean>;
  startPhoneOtp: (phone: string, preferredChannel?: 'AUTO' | 'TELEGRAM' | 'SMS') => Promise<{ success: boolean; data?: OtpChallengeResponse; error?: string }>;
  verifyPhoneOtp: (challengeId: string, code: string) => Promise<{ success: boolean; data?: OtpVerifyResult; error?: string }>;
  enrollPasswordless: (input: { enrollmentToken: string; firstName: string; lastName: string; acceptedTermsVersion: string }) => Promise<{ success: boolean; error?: string }>;
  startTelegramOidc: () => Promise<{
    success: boolean;
    error?: string;
    cancelled?: boolean;
    requires2FA?: boolean;
    challengeToken?: string;
    email?: string;
  }>;
  socialLogin: (
    provider: 'google' | 'facebook',
    artifact: { idToken?: string; accessToken?: string },
    claimCode?: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    cancelled?: boolean;
    requires2FA?: boolean;
    challengeToken?: string;
    email?: string;
  }>;
  completeTwoFactor: (input: {
    challengeToken: string;
    code: string;
    isBackupCode?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
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
  parentLogin: (credentials: { phone: string; password: string }) => Promise<PasswordLoginResult>;
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

          const restorePersistedSession = (hasSecureCredential: boolean) => {
            const state = get();
            if (!hasSecureCredential || !state.user) return false;

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

          // Biometric unlock is a local gate only. Credentials stay in SecureStore
          // so a cancelled/failed prompt never becomes an auto-logout.
          if (hasTokens && !options?.skipBiometric) {
            const biometricEnabled = await tokenService.isBiometricEnabled();
            if (biometricEnabled) {
              const { authenticateBiometric } = await import('@/services/biometrics');
              const authResult = await authenticateBiometric('Unlock Stunity');
              if (!authResult.success) {
                set({
                  isAuthenticated: false,
                  isLoggingOut: false,
                  isLoading: false,
                  isInitialized: true,
                  error: null,
                });
                return;
              }
            }
          }

          if (!hasTokens) {
            console.warn('Auth: No secure tokens loaded on init');
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

                if (restorePersistedSession(hasTokens)) {
                  console.warn('Auth: Refresh temporarily unavailable, keeping persisted session');
                  return;
                }
              } catch (refreshError: any) {
                const refreshStatus = refreshError?.response?.status;
                if (refreshStatus === 401 || refreshStatus === 403) {
                  console.warn('Auth: Refresh token rejected by server, clearing session');
                  await tokenService.clearTokens();
                } else if (restorePersistedSession(hasTokens)) {
                  console.warn('Auth: Refresh failed due to network/server issue, keeping persisted session');
                  return;
                }
              }
            } else {
              console.warn('Auth: Network/Server error during verification, keeping session active');
              if (restorePersistedSession(hasTokens)) {
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

          const responseData = response.data.data;
          if (responseData?.requires2FA && responseData?.challengeToken) {
            set({ isLoading: false, error: null });
            return {
              success: false,
              requires2FA: true,
              challengeToken: responseData.challengeToken,
              email: responseData.email || credentials.email || '',
            };
          }

          const { user: apiUser, tokens } = responseData;

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

          return { success: true };
        } catch (error: any) {
          console.error('Login error:', error);
          const message = error?.response?.data?.error || error?.message || 'Login failed';
          set({
            isLoading: false,
            error: message,
          });
          return { success: false, error: message };
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
          if (data.status === 'TWO_FACTOR_REQUIRED' && data.challengeToken) {
            set({ isLoading: false, error: null });
            return {
              success: true,
              data: {
                status: 'TWO_FACTOR_REQUIRED',
                challengeToken: data.challengeToken,
                email: data.email || '',
              } as OtpVerifyResult,
            };
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
            set({ isLoading: false, error: null });
            return {
              success: false,
              requires2FA: true,
              challengeToken: data.challengeToken,
              email: data.user?.email || data.email || '',
            };
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

      socialLogin: async (provider, artifact, claimCode) => {
        try {
          set({ isLoading: true, error: null });

          const path = provider === 'google' ? '/auth/social/google' : '/auth/social/facebook';
          const body =
            provider === 'google'
              ? { idToken: artifact.idToken, claimCode }
              : { accessToken: artifact.accessToken, claimCode };

          if (provider === 'google' && !artifact.idToken) {
            set({ isLoading: false, error: 'Missing Google ID token' });
            return { success: false, error: 'Missing Google ID token' };
          }
          if (provider === 'facebook' && !artifact.accessToken) {
            set({ isLoading: false, error: 'Missing Facebook access token' });
            return { success: false, error: 'Missing Facebook access token' };
          }

          const response = await authApi.post(path, body);
          const data = response.data?.data ?? response.data;

          if (data?.requires2FA && data?.challengeToken) {
            set({ isLoading: false, error: null });
            return {
              success: false,
              requires2FA: true,
              challengeToken: data.challengeToken,
              email: data.user?.email || data.email || '',
            };
          }

          if (!response.data?.success && !data?.tokens) {
            const message = response.data?.error || 'Social sign-in failed';
            set({ isLoading: false, error: message });
            return { success: false, error: message };
          }

          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();
          await tokenService.setTokens(data.tokens as AuthTokens);
          await tokenService.setUserId(data.user.id);
          const user = mapAuthResponseUser(data.user, data);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          prewarmFeedAfterAuth(user.role);
          return { success: true };
        } catch (error: any) {
          const code = error?.response?.data?.code;
          const message =
            error?.response?.data?.error ||
            error?.message ||
            (provider === 'google' ? 'Unable to complete Google sign-in' : 'Unable to complete Facebook sign-in');

          if (code === 'ACCOUNT_LINK_REQUIRED') {
            const linkMessage =
              'An account with this email already exists. Sign in with your password or phone, then link Google/Facebook from settings.';
            set({ isLoading: false, error: linkMessage });
            return { success: false, error: linkMessage };
          }

          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      completeTwoFactor: async ({ challengeToken, code, isBackupCode }) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.post('/auth/2fa/verify', {
            challengeToken,
            code,
            isBackupCode: !!isBackupCode,
          });

          if (!response.data?.success) {
            throw new Error(response.data?.error || '2FA verification failed');
          }

          const data = response.data.data;
          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();
          await tokenService.setTokens(data.tokens as AuthTokens);
          await tokenService.setUserId(data.user.id);
          const user = mapAuthResponseUser(data.user, data);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          prewarmFeedAfterAuth(user.role);
          return { success: true };
        } catch (error: any) {
          const message = error?.response?.data?.error || error?.message || '2FA verification failed';
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

          const responseData = response.data.data;
          if (responseData?.requires2FA && responseData?.challengeToken) {
            set({ isLoading: false, error: null });
            return {
              success: false,
              requires2FA: true,
              challengeToken: responseData.challengeToken,
              email: responseData.email || '',
            };
          }

          const { user: apiUser, tokens } = responseData;

          await tokenService.setTokens(tokens as AuthTokens);
          await tokenService.setUserId(apiUser.id);

          const user = mapAuthResponseUser(apiUser, response.data.data);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          prewarmFeedAfterAuth(user.role);

          return { success: true };
        } catch (error: any) {
          console.error('Parent login error:', error);
          const message = error?.response?.data?.error || error?.message || 'Login failed';
          set({
            isLoading: false,
            error: message,
          });
          return { success: false, error: message };
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
          const userId = get().user?.id || await tokenService.getUserId();

          // Revoke refresh token on server (best-effort)
          try {
            const tokens = await tokenService.getTokens();
            const refreshToken = tokens?.refreshToken;
            await authApi.post('/auth/logout', { refreshToken: refreshToken || undefined });
          } catch (e) {
            // Ignore logout API errors
          }

          await tokenService.clearTokens();

          await Promise.allSettled([
            clearFeedCache(userId || undefined),
            clearUserScopedSessionCache(userId),
          ]);

          // Reset feed store state
          const { useFeedStore } = await import('./feedStore');
          useFeedStore.getState().reset();
          const classesApi = await import('@/api/classes');
          classesApi.invalidateMyClassesCache();
          classesApi.invalidateClassDetailBundleCache();

          set({
            user: null,
            isAuthenticated: false,
            isLoggingOut: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Logout error:', error);
          // Local authorization state must still fail closed if cleanup fails.
          await tokenService.clearTokens().catch(() => undefined);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isLoggingOut: false,
            error: null,
          });
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
        // Authentication is always re-derived from SecureStore credentials.
        user: state.user,
      }),
      version: 2,
      migrate: (persistedState: any) => ({
        ...persistedState,
        isAuthenticated: false,
      }),
    }
  )
);

// Listen for auth events from API client
eventEmitter.on('auth:logout', () => {
  useAuthStore.getState().logout();
});

export default useAuthStore;
