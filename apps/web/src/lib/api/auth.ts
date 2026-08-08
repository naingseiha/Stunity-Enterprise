// API client for authentication service
import type { EducationModel } from '@/lib/educationModel';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  requires2FA?: boolean;
  challengeToken?: string;
  email?: string;
  accessScope?: 'FULL' | 'PENDING_REVIEW';
  reviewState?: {
    canUseHighRiskFeatures: boolean;
    isPendingReview: boolean;
  };
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    schoolId: number;
  };
  school?: {
    id: number;
    name: string;
    slug: string;
    subscriptionTier: string;
    isActive: boolean;
    educationModel?: EducationModel;
    registrationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    accessScope?: 'FULL' | 'PENDING_REVIEW';
    canUseHighRiskFeatures?: boolean;
    trialStartDate: string;
    trialEndDate: string;
    trialDaysRemaining: number;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface VerifyTokenResponse {
  success: boolean;
  accessScope?: 'FULL' | 'PENDING_REVIEW';
  reviewState?: {
    canUseHighRiskFeatures: boolean;
    isPendingReview: boolean;
  };
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    schoolId: number;
  };
  school?: {
    id: number;
    name: string;
    slug: string;
    subscriptionTier: string;
    isActive?: boolean;
    educationModel?: EducationModel;
    registrationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    accessScope?: 'FULL' | 'PENDING_REVIEW';
    canUseHighRiskFeatures?: boolean;
  };
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.error || error.message || 'Login failed');
  }

  const result = await response.json();

  // Backend returns data wrapped in { success, message, data: { user, school, tokens } }
  // Transform to match our interface
  if (result.data) {
    return {
      success: result.success,
      message: result.message,
      requires2FA: result.data.requires2FA,
      challengeToken: result.data.challengeToken,
      email: result.data.email,
      user: result.data.user,
      school: result.data.school,
      tokens: result.data.tokens,
    };
  }

  return result;
}

const WEB_AUTH_DEVICE_ID_KEY = 'stunityAuthDeviceId';

function getWebAuthDeviceId(): string {
  if (typeof window === 'undefined') return 'web_server_render';
  const existing = localStorage.getItem(WEB_AUTH_DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
  localStorage.setItem(WEB_AUTH_DEVICE_ID_KEY, created);
  return created;
}

async function passwordlessRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${AUTH_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, deviceId: getWebAuthDeviceId() }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Passwordless authentication failed');
  return result.data;
}

export function startPhoneOtp(phone: string, preferredChannel: 'AUTO' | 'TELEGRAM' | 'SMS' = 'AUTO') {
  return passwordlessRequest('/auth/otp/start', { phone, preferredChannel });
}

export function verifyPhoneOtp(challengeId: string, code: string) {
  return passwordlessRequest('/auth/otp/verify', { challengeId, code });
}

export function enrollPasswordless(input: {
  enrollmentToken: string;
  firstName: string;
  lastName: string;
  acceptedTermsVersion: string;
}) {
  return passwordlessRequest('/auth/enroll', input);
}

// Telegram OIDC is a browser redirect flow (Authorization Code + PKCE), not a
// token POST, so this just points the user agent at the auth service.
export function getTelegramOidcStartUrl(): string {
  return `${AUTH_SERVICE_URL}/auth/oidc/telegram/start`;
}

export async function exchangeTelegramOidcSession(code: string) {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/oidc/telegram/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'This sign-in link has expired.');
  return result.data;
}

export async function verifyToken(token: string): Promise<VerifyTokenResponse> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/verify`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Token verification failed');
  }

  return response.json();
}

// Token management utilities (Facebook-style: stay signed in until logout).
// Long-lived refresh credentials live in an httpOnly SameSite cookie via the
// Next.js auth BFF (`/api/auth/*`). Short-lived access tokens stay in memory
// (+ sessionStorage for same-tab hard refresh) so they are not persisted in
// localStorage. Mobile is unaffected (SecureStore).
let _refreshPromise: Promise<boolean> | null = null;
let _accessToken: string | null = null;
let _assumeLoggedOut = false;
const WEB_DEVICE_ID_KEY = 'stunity_auth_device_id';
const ACCESS_SESSION_KEY = 'accessToken';
const AUTH_BROADCAST = 'stunity-auth-access';

function getWebDeviceId(): string {
  if (typeof window === 'undefined') return 'web_ssr';
  const existing = localStorage.getItem(WEB_DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
  localStorage.setItem(WEB_DEVICE_ID_KEY, created);
  return created;
}

function deviceHeaders(): HeadersInit {
  return {
    'X-Device-Id': getWebDeviceId(),
    'X-Device-Name': typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : 'web',
  };
}

function broadcastAccessToken(token: string | null) {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST);
    channel.postMessage({ type: 'access', token });
    channel.close();
  } catch {
    // Ignore — multi-tab sync is best-effort.
  }
}

function writeAccessToken(token: string | null, { broadcast = true }: { broadcast?: boolean } = {}) {
  _accessToken = token;
  _assumeLoggedOut = false;
  if (typeof window === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(ACCESS_SESSION_KEY, token);
    else sessionStorage.removeItem(ACCESS_SESSION_KEY);
  } catch {
    // Private mode may block sessionStorage.
  }
  // Never keep access tokens in localStorage (XSS + disk persistence).
  localStorage.removeItem('accessToken');
  if (broadcast) broadcastAccessToken(token);
}

function readAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (_accessToken) return _accessToken;
  try {
    const fromSession = sessionStorage.getItem(ACCESS_SESSION_KEY);
    if (fromSession) {
      _accessToken = fromSession;
      return fromSession;
    }
  } catch {
    // ignore
  }
  // One-time migrate away from legacy localStorage access tokens.
  const legacy = localStorage.getItem('accessToken');
  if (legacy) {
    writeAccessToken(legacy, { broadcast: false });
    return legacy;
  }
  return null;
}

/** Listen for access-token updates from other tabs (cookie refresh elsewhere). */
export function subscribeAccessTokenSync(onChange?: (token: string | null) => void): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const channel = new BroadcastChannel(AUTH_BROADCAST);
  channel.onmessage = (event) => {
    if (event?.data?.type !== 'access') return;
    const token = typeof event.data.token === 'string' ? event.data.token : null;
    writeAccessToken(token, { broadcast: false });
    onChange?.(token);
  };
  return () => channel.close();
}

/** Move a refresh credential into the httpOnly cookie, then drop XSS-readable copy. */
async function migrateRefreshToHttpOnlyCookie(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    // Always drop localStorage refresh after cookie is set (including rotated credentials).
    localStorage.removeItem('refreshToken');
    return true;
  } catch {
    return false;
  }
}

async function refreshViaHttpOnlyCookie(): Promise<boolean> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...deviceHeaders(),
    },
  });
  const data = await res.json().catch(() => ({} as any));
  if (res.ok && data.success && data.data?.accessToken) {
    writeAccessToken(data.data.accessToken);
    localStorage.removeItem('refreshToken');
    return true;
  }
  // Another tab may have rotated the cookie while we waited.
  if (res.status === 409 || data?.code === 'SESSION_CONFLICT') {
    return false;
  }
  if (data?.code === 'REFRESH_COOKIE_MISSING') {
    _assumeLoggedOut = !localStorage.getItem('refreshToken');
  }
  return false;
}

async function refreshViaLegacyLocalStorage(credential: string): Promise<boolean> {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...deviceHeaders(),
      },
      body: JSON.stringify({ refreshToken: credential }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (res.ok && data.success && data.data?.accessToken && data.data?.refreshToken) {
      writeAccessToken(data.data.accessToken);
      // Prefer cookie storage immediately after a successful legacy refresh.
      const migrated = await migrateRefreshToHttpOnlyCookie(data.data.refreshToken);
      if (!migrated) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      return true;
    }
    if (res.status === 409 || data?.code === 'SESSION_CONFLICT') {
      const latest = localStorage.getItem('refreshToken');
      if (latest && latest !== credential) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const TokenManager = {
  setTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      writeAccessToken(accessToken);
      // Brief dual-write so a reload before the cookie POST finishes still works.
      localStorage.setItem('refreshToken', refreshToken);
      void migrateRefreshToHttpOnlyCookie(refreshToken);
    }
  },

  getTokens(): { accessToken: string | null; refreshToken: string | null } | null {
    if (typeof window !== 'undefined') {
      const accessToken = readAccessToken();
      const refreshToken = localStorage.getItem('refreshToken');
      if (!accessToken && !refreshToken) return null;
      return { accessToken, refreshToken };
    }
    return null;
  },

  getAccessToken(): string | null {
    return readAccessToken();
  },

  getRefreshToken(): string | null {
    // Refresh credentials are httpOnly; only a legacy localStorage copy may remain.
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  },

  /** True after a cookie/legacy refresh failed with no usable session. */
  isAssumedLoggedOut(): boolean {
    return _assumeLoggedOut;
  },

  accessTokenExpiresWithin(seconds: number): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    try {
      const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
      return typeof payload.exp !== 'number' || payload.exp * 1000 - Date.now() <= seconds * 1000;
    } catch {
      return true;
    }
  },

  /**
   * Refresh via httpOnly cookie BFF first; fall back to legacy localStorage
   * refresh once, then migrate into the cookie.
   */
  async refreshTokens(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = (async () => {
      try {
        const lockManager = (navigator as Navigator & {
          locks?: { request<T>(name: string, callback: () => Promise<T>): Promise<T> };
        }).locks;

        const run = async () => {
          if (await refreshViaHttpOnlyCookie()) return true;

          // Bridge for sessions created before the cookie BFF: rotate via body,
          // then migrate the new opaque credential into the httpOnly cookie.
          const legacy = localStorage.getItem('refreshToken');
          if (!legacy) return false;
          return refreshViaLegacyLocalStorage(legacy);
        };

        if (lockManager) {
          return lockManager.request('stunity-auth-refresh', run);
        }
        return run();
      } finally {
        _refreshPromise = null;
      }
    })();

    return _refreshPromise;
  },

  /** Fetch with auth - on 401, refresh tokens and retry once. */
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const tokens = this.getTokens();
    const headers = new Headers(options.headers);
    if (tokens?.accessToken) {
      headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        const newToken = this.getAccessToken();
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
          res = await fetch(url, { ...options, headers });
        }
      }
    }
    return res;
  },

  clearTokens() {
    writeAccessToken(null);
    _assumeLoggedOut = true;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('school');
      window.dispatchEvent(new Event('stunity:school-context-changed'));
    }
    _refreshPromise = null;
  },

  /** Logout: revoke via BFF cookie (and legacy body path), then clear locally */
  async logout() {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...deviceHeaders() },
      });
    } catch {
      // Ignore - clear locally anyway
    }

    const legacyRefresh = localStorage.getItem('refreshToken');
    if (legacyRefresh) {
      try {
        await fetch(`${AUTH_SERVICE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: legacyRefresh }),
        });
      } catch {
        // Ignore
      }
    }

    this.clearTokens();
  },

  setUserData(user: any, school: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('school', JSON.stringify(school));
      window.dispatchEvent(new Event('stunity:school-context-changed'));
    }
  },

  getUserData() {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      const school = localStorage.getItem('school');
      return {
        user: user ? JSON.parse(user) : null,
        school: school ? JSON.parse(school) : null,
      };
    }
    return { user: null, school: null };
  },
};

// ─── Password Reset ──────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
}

/**
 * Reset a user's password as an administrator.
 * Requires ADMIN or SUPER_ADMIN role.
 */
export async function adminResetPassword(
  userId: string | number,
  newPassword: string,
  token: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, newPassword, activateAccount: true }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Admin reset failed' }));
    throw new Error(err.error || 'Admin reset failed');
  }

  return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Reset failed' }));
    throw new Error(err.error || 'Reset failed');
  }
  return response.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  token: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Change failed' }));
    throw new Error(err.error || 'Failed to change password');
  }
  return response.json();
}

// ─── Two-Factor Authentication ───────────────────────────────────────

export async function verify2FA(
  challengeToken: string,
  code: string,
  isBackupCode = false
): Promise<LoginResponse> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken, code, isBackupCode }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error || 'Invalid 2FA code');
  }
  const result = await response.json();
  if (result.data) {
    return {
      success: result.success,
      message: result.message,
      user: result.data.user,
      school: result.data.school,
      tokens: result.data.tokens,
    };
  }
  return result;
}

export async function setup2FA(token: string): Promise<{ success: boolean; qrCode: string; secret: string }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/2fa/setup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to setup 2FA');
  return response.json();
}

export async function verifySetup2FA(token: string, code: string): Promise<{ success: boolean; backupCodes: string[] }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/2fa/verify-setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error('Invalid code');
  return response.json();
}

export async function disable2FA(token: string, code: string): Promise<{ success: boolean }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error('Failed to disable 2FA');
  return response.json();
}

// ─── Social Authentication ───────────────────────────────────────────

export type SocialLoginArtifact =
  | { provider: 'google'; idToken: string }
  | { provider: 'apple'; identityToken: string; fullName?: { givenName?: string; familyName?: string } }
  | { provider: 'facebook'; accessToken: string }
  | { provider: 'linkedin'; authorizationCode: string; redirectUri: string };

export async function socialLogin(
  artifact: SocialLoginArtifact,
  claimCode?: string
): Promise<LoginResponse> {
  const { provider, ...providerPayload } = artifact;
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/social/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...providerPayload, claimCode }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Social login failed' }));
    throw new Error(err.error || 'Social login failed');
  }
  const result = await response.json();
  if (result.data) {
    return {
      success: result.success,
      message: result.message,
      user: result.data.user,
      school: result.data.school,
      tokens: result.data.tokens,
    };
  }
  return result;
}

// ─── Profile Change Requests ──────────────────────────────────────────

export interface ProfileChangeRequest {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  requestedData?: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    email?: string;
    student?: {
      studentId?: string;
      firstName: string;
      lastName: string;
    };
    teacher?: {
      employeeId?: string;
      firstName: string;
      lastName: string;
    };
  };
}

export async function getProfileChangeRequests(token: string): Promise<ProfileChangeRequest[]> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/profile-change-requests`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch profile change requests');
  }
  const json = await response.json();
  return json.data || [];
}

export async function approveProfileChangeRequest(token: string, requestId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/profile-change-requests/${requestId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to approve request');
  }
  return response.json();
}

export async function rejectProfileChangeRequest(
  token: string,
  requestId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/profile-change-requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to reject request');
  }
  return response.json();
}
