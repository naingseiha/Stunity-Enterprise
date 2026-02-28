/**
 * Token Service
 * 
 * Secure token management using Expo SecureStore
 * Handles access token, refresh token, and biometric auth
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
        setTimeout(() => reject(new Error('SecureStore timeout')), 3000)
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
      return newToken;
    }

    if (this.accessToken) {
      return this.accessToken;
    }

    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
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
      const refreshToken = this.refreshToken || await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Import dynamically to avoid circular dependency
      const { authApi } = await import('@/api/client');

      const response = await authApi.post('/auth/refresh', {
        refreshToken,
      });

      // Auth service returns { success, data: { accessToken, refreshToken, expiresIn } }
      const data = response.data?.data || response.data?.tokens || response.data;
      if (response.data?.success && data?.accessToken && data?.refreshToken) {
        const tokens: AuthTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn ?? '24h',
        };
        await this.setTokens(tokens);

        // Notify all subscribers
        this.notifyRefreshSubscribers(tokens.accessToken);

        return tokens.accessToken;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.notifyRefreshSubscribers(null);
      await this.clearTokens();
      return null;
    } finally {
      this.isRefreshing = false;
    }
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
        expiresInSeconds = 7 * 24 * 60 * 60; // Default to 7 days
      }
    } else {
      expiresInSeconds = tokens.expiresIn;
    }

    const expiryTime = Date.now() + expiresInSeconds * 1000;

    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, tokens.refreshToken),
      SecureStore.setItemAsync(KEYS.TOKEN_EXPIRY, expiryTime.toString()),
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
    await SecureStore.setItemAsync(KEYS.USER_ID, userId);
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
    await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, enabled.toString());
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
    await SecureStore.setItemAsync(KEYS.REMEMBER_ME, enabled.toString());
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
