// API client for authentication service

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
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
    throw new Error(error.message || 'Login failed');
  }

  const result = await response.json();
  
  // Backend returns data wrapped in { success, message, data: { user, school, tokens } }
  // Transform to match our interface
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

// Token management utilities (remember-me: long-lived tokens, refresh on 401)
let _refreshPromise: Promise<boolean> | null = null;

export const TokenManager = {
  setTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  getTokens(): { accessToken: string | null; refreshToken: string | null } | null {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      if (!accessToken) return null;
      return { accessToken, refreshToken };
    }
    return null;
  },

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  },

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  },

  /** Refresh tokens via /auth/refresh. Returns true if successful. */
  async refreshTokens(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = (async () => {
      try {
        const res = await fetch(`${AUTH_SERVICE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data?.accessToken && data.data?.refreshToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('school');
    }
    _refreshPromise = null;
  },

  /** Logout: revoke refresh token on server, then clear locally */
  async logout() {
    if (typeof window === 'undefined') return;
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${AUTH_SERVICE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore - clear locally anyway
      }
    }
    this.clearTokens();
  },

  setUserData(user: any, school: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('school', JSON.stringify(school));
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
  tempToken: string,
  code: string,
  isBackupCode = false
): Promise<LoginResponse> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, code, isBackupCode }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error || 'Invalid 2FA code');
  }
  return response.json();
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

export async function socialLogin(
  provider: 'google' | 'apple' | 'facebook' | 'linkedin',
  token: string,
  claimCode?: string
): Promise<LoginResponse> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/social/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, claimCode }),
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
