/**
 * Token Service
 *
 * Secure token management using Expo SecureStore.
 * Session model (Facebook-style persistence):
 * - Access tokens are short-lived and refreshed silently
 * - Refresh credentials stay until explicit logout, remote revoke,
 *   password/school-access invalidation, or refresh-token reuse/theft
 * - Transient network/refresh conflicts never clear the local session
 */

import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '@/types';
import { APP_CONFIG } from '@/config';

const KEYS = {
  ACCESS_TOKEN: 'stunity_access_token',
  REFRESH_TOKEN: 'stunity_refresh_token',
  TOKEN_EXPIRY: 'stunity_token_expiry',
  USER_ID: 'stunity_user_id',
  BIOMETRIC_ENABLED: 'stunity_biometric_enabled',
  REMEMBER_ME: 'stunity_remember_me',
} as const;

// Prevent iCloud/iTunes migration of credentials to another device. Android
// credentials remain protected by the app-scoped Keystore implementation.
const DEVICE_ONLY_SECURE_STORE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const TERMINAL_REFRESH_CODES = new Set([
  'SESSION_INVALID',
  'SESSION_EXPIRED',
  'SESSION_REUSE_DETECTED',
  'LEGACY_REFRESH_DISABLED',
  'SCHOOL_ACCESS_CHANGED',
]);

function refreshErrorCode(error: any): string | undefined {
  const code = error?.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

class TokenService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string | null) => void)[] = [];

  /**
   * Initialize tokens from secure storage
   * Has a timeout to prevent hanging on Expo Go
   */
  async initialize(): Promise<boolean> {
    try {
      // Add timeout to prevent hanging
      const timeout = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('SecureStore timeout')), 15000)
      );

      const loadTokens = async (): Promise<boolean> => {
        const [accessToken, refreshToken, expiry] = await Promise.all([
          SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
          SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
          SecureStore.getItemAsync(KEYS.TOKEN_EXPIRY),
        ]);

        if (accessToken && refreshToken) {
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;
          this.tokenExpiry = expiry ? parseInt(expiry, 10) : null;
          return true;
        }

        return false;
      };

      return await Promise.race([loadTokens(), timeout]);
    } catch (error) {
      console.warn('Token initialization failed/timed out:', error);
      return false;
    }
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    // Check if token needs refresh
    if (this.shouldRefreshToken()) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return newToken;
      }

      // Preserve login state on transient refresh failures by reusing
      // the last known access token when available.
      if (this.accessToken) {
        return this.accessToken;
      }
    }

    if (this.accessToken) {
      return this.accessToken;
    }

    const storedAccessToken = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
    if (storedAccessToken) {
      this.accessToken = storedAccessToken;
    }
    return storedAccessToken;
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokenExpiry) return false;
    const now = Date.now();
    return now >= this.tokenExpiry - APP_CONFIG.TOKEN_REFRESH_THRESHOLD;
  }

  private notifyRefreshSubscribers(token: string | null): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  private async persistRotatedPair(data: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: string | number;
  }): Promise<string> {
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn ?? '15m',
    };
    await this.setTokens(tokens);
    return tokens.accessToken;
  }

  private async attemptRefresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn?: string | number;
  } | null> {
    const { authApi } = await import('@/api/client');
    const response = await authApi.post('/auth/refresh', { refreshToken });
    const data = response.data?.data || response.data?.tokens || response.data;
    if (response.data?.success && data?.accessToken && data?.refreshToken) {
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      };
    }
    throw Object.assign(new Error('Token refresh failed'), {
      response: { status: 401, data: { code: 'SESSION_INVALID' } },
    });
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<string | null> {
    // Prevent concurrent refresh requests
    if (this.isRefreshing) {
      return new Promise<string | null>((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      let refreshToken = this.refreshToken || await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        this.notifyRefreshSubscribers(null);
        return null;
      }

      try {
        const rotated = await this.attemptRefresh(refreshToken);
        if (!rotated) {
          this.notifyRefreshSubscribers(null);
          return null;
        }
        const accessToken = await this.persistRotatedPair(rotated);
        this.notifyRefreshSubscribers(accessToken);
        return accessToken;
      } catch (error: any) {
        const status = error?.response?.status;
        const code = refreshErrorCode(error);

        // Another in-flight client won rotation. Prefer any newer credential
        // already written to SecureStore; otherwise keep local session and
        // let the next request retry (never force logout on conflict).
        if (status === 409 || code === 'SESSION_CONFLICT') {
          const latest = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
          if (latest && latest !== refreshToken) {
            try {
              const rotated = await this.attemptRefresh(latest);
              if (rotated) {
                const accessToken = await this.persistRotatedPair(rotated);
                this.notifyRefreshSubscribers(accessToken);
                return accessToken;
              }
            } catch {
              // fall through to preserve session
            }
          }
          console.warn('Token: Refresh conflict — keeping local session for retry');
          this.notifyRefreshSubscribers(null);
          return null;
        }

        // Definitive rejection (revoked, expired, reuse/theft, school access).
        // This is the only refresh path that ends a persistent login.
        if (
          (status === 401 || status === 403)
          && (!code || TERMINAL_REFRESH_CODES.has(code))
        ) {
          console.warn('Token: Refresh token rejected by server, clearing session', code || status);
          await this.clearTokens();
          this.notifyRefreshSubscribers(null);
          throw error;
        }

        console.warn('Token: Refresh failed due to network/server error, tokens preserved');
        this.notifyRefreshSubscribers(null);
        return null;
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  async hasRefreshToken(): Promise<boolean> {
    if (this.refreshToken) return true;
    const storedRefreshToken = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
    if (storedRefreshToken) {
      this.refreshToken = storedRefreshToken;
      return true;
    }
    return false;
  }

  /**
   * Get all tokens
   */
  async getTokens(): Promise<AuthTokens | null> {
    const accessToken = await this.getAccessToken();
    const refreshToken = this.refreshToken || await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);

    if (accessToken && refreshToken) {
      return {
        accessToken,
        refreshToken,
        expiresIn: this.tokenExpiry ? Math.floor((this.tokenExpiry - Date.now()) / 1000) : 0,
      };
    }
    return null;
  }

  /**
   * Save tokens to secure storage
   */
  async setTokens(tokens: AuthTokens): Promise<void> {
    // Handle expiresIn as either number (seconds) or string (e.g., "7d")
    let expiresInSeconds: number;

    if (typeof tokens.expiresIn === 'string') {
      // Parse string like "7d" -> 7 * 24 * 60 * 60 seconds
      const match = tokens.expiresIn.match(/^(\d+)([smhd])$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const multipliers: Record<string, number> = {
          's': 1,
          'm': 60,
          'h': 3600,
          'd': 86400,
        };
        expiresInSeconds = value * (multipliers[unit] || 86400); // Default to days
      } else {
        expiresInSeconds = 15 * 60; // Default to 15 minutes (access token)
      }
    } else {
      expiresInSeconds = tokens.expiresIn;
    }

    const expiryTime = Date.now() + expiresInSeconds * 1000;

    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, tokens.accessToken, DEVICE_ONLY_SECURE_STORE_OPTIONS),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, tokens.refreshToken, DEVICE_ONLY_SECURE_STORE_OPTIONS),
      SecureStore.setItemAsync(KEYS.TOKEN_EXPIRY, expiryTime.toString(), DEVICE_ONLY_SECURE_STORE_OPTIONS),
    ]);

    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiry = expiryTime;
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.TOKEN_EXPIRY),
      SecureStore.deleteItemAsync(KEYS.USER_ID),
    ]);

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Set user ID
   */
  async setUserId(userId: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER_ID, userId, DEVICE_ONLY_SECURE_STORE_OPTIONS);
  }

  /**
   * Get user ID
   */
  async getUserId(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.USER_ID);
  }

  /**
   * Check if biometric auth is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
    return value === 'true';
  }

  /**
   * Set biometric auth preference
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, enabled.toString(), DEVICE_ONLY_SECURE_STORE_OPTIONS);
  }

  /**
   * Check if user chose remember me
   */
  async isRememberMeEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(KEYS.REMEMBER_ME);
    return value === 'true';
  }

  /**
   * Set remember me preference
   */
  async setRememberMe(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(KEYS.REMEMBER_ME, enabled.toString(), DEVICE_ONLY_SECURE_STORE_OPTIONS);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Decode JWT token (for getting user info without API call)
   */
  decodeToken(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch {
      return null;
    }
  }
}

export const tokenService = new TokenService();
export default tokenService;
