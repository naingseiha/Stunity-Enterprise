/**
 * API Client
 * 
 * Enterprise-grade HTTP client with:
 * - Automatic token refresh
 * - Request/Response interceptors
 * - Retry logic with exponential backoff
 * - Request cancellation
 * - Offline queue with auto-retry on reconnect
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config, APP_CONFIG } from '@/config';
import { tokenService } from '@/services/token';
import { networkService } from '@/services/network';
import { eventEmitter } from '@/utils/eventEmitter';
import { finishApiTiming, startApiTiming } from '@/utils/apiTiming';
import { ApiResponse, ApiError } from '@/types';

// Create axios instance
export const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: APP_CONFIG.API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Version': APP_CONFIG.APP_VERSION,
      'X-Platform': 'mobile',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const isTokenRefreshRequest = config.url?.includes('/auth/refresh');

      // Add auth token (skip refresh endpoint to avoid refresh recursion/deadlock)
      if (!isTokenRefreshRequest) {
        const token = await tokenService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // Add request ID for tracing
      config.headers['X-Request-ID'] = generateRequestId();
      startApiTiming(config as InternalAxiosRequestConfig & { __perfStart?: number; __perfLabel?: string });

      // Log in development
      if (__DEV__) {
        console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url} -> ${config.baseURL || 'unknown-base-url'}`);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      finishApiTiming(
        response.config as InternalAxiosRequestConfig & { __perfStart?: number; __perfLabel?: string },
        String(response.status)
      );
      if (__DEV__) {
        console.log(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      }
      return response;
    },
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
        _retryCount?: number;
        _queuedForRetry?: boolean;
      };

      // Handle network errors - Queue for retry when network reconnects
      if (error.code === 'ERR_NETWORK' && !originalRequest._queuedForRetry) {
        const isOnline = networkService.getStatus();

        if (!isOnline) {
          // Queue this request for automatic retry when network reconnects
          originalRequest._queuedForRetry = true;

          networkService.queueRequest({
            id: `${Date.now()}-${Math.random()}`,
            url: originalRequest.url || '',
            method: originalRequest.method || 'GET',
            data: originalRequest.data,
            headers: originalRequest.headers,
            retry: () => client(originalRequest),
            timestamp: Date.now(),
          });

          if (__DEV__) {
            console.log(`📥 Queued for retry: ${originalRequest.method} ${originalRequest.url}`);
          }
        } else {
          // Network says we're online but request failed - try once more
          if (!originalRequest._retry) {
            finishApiTiming(originalRequest, 'ERR_NETWORK');
            originalRequest._retry = true;
            await new Promise(resolve => setTimeout(resolve, 1000));
            return client(originalRequest);
          }
        }
      }

      // Handle timeout errors with retry (skip if X-No-Retry header is set)
      if (error.code === 'ECONNABORTED' && !originalRequest.headers?.['X-No-Retry']) {
        const retryCount = (originalRequest._retryCount || 0) + 1;

        if (retryCount <= APP_CONFIG.RETRY_ATTEMPTS) {
          originalRequest._retryCount = retryCount;
          finishApiTiming(originalRequest, `TIMEOUT_RETRY_${retryCount}`);

          // Exponential backoff: 2s, 4s, 6s
          const delay = APP_CONFIG.RETRY_DELAY * retryCount;
          if (__DEV__) {
            console.log(`⏳ [API] Retrying ${originalRequest.url} (attempt ${retryCount}/${APP_CONFIG.RETRY_ATTEMPTS}) after ${delay}ms...`);
          }

          await new Promise(resolve => setTimeout(resolve, delay));

          // Keep full timeout for retries (AI calls need the full window)
          originalRequest.timeout = APP_CONFIG.API_TIMEOUT;

          return client(originalRequest);
        } else {
          // After all retries, give a helpful error message
          if (__DEV__) {
            console.log('💡 [API] Timeout after retries. If you changed WiFi, please reload the app.');
          }
        }
      }

      // Handle 401 - Token expired
      // Skip token refresh for auth endpoints (login, register, refresh)
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh');

      if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
        finishApiTiming(originalRequest, '401_RETRY');
        originalRequest._retry = true;

        try {
          const hasRefreshToken = await tokenService.hasRefreshToken();
          if (!hasRefreshToken) {
            return Promise.reject(error);
          }

          const newToken = await tokenService.refreshAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }
          // If newToken is null, refresh failed due to network/server error.
          // Don't logout, just fail this request.
          return Promise.reject(error);
        } catch (refreshError) {
          // Token refresh failed TERMINALLY (401/403 rejection from server).
          // Logout user.
          eventEmitter.emit('auth:logout');
          return Promise.reject(refreshError);
        }
      }

      // Handle other errors
      finishApiTiming(
        originalRequest,
        String(error.response?.status || error.code || 'ERROR')
      );
      if (__DEV__) {
        const status = error.response?.status;
        const message =
          `❌ [API] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${status || error.code} (Target: ${error.config?.baseURL || 'unknown-base-url'})`;

        // Avoid React Native red "Console Error" screens for expected client errors (4xx),
        // while still surfacing true server/network failures loudly.
        if (status && status < 500) {
          console.warn(message);
        } else {
          console.error(message);
        }
      }

      // Transform error to consistent format
      const apiError = transformError(error);
      return Promise.reject(apiError);
    }
  );

  return client;
};

// Create instances for different services
export const authApi = createApiClient(Config.authUrl);
export const feedApi = createApiClient(Config.feedUrl);
export const mediaApi = createApiClient(Config.mediaUrl);
export const clubsApi = createApiClient(Config.clubUrl);
export const classApi = createApiClient(Config.classUrl);
export const teacherApi = createApiClient(Config.teacherUrl);
export const studentApi = createApiClient(Config.studentUrl);
export const timetableApi = createApiClient(Config.timetableUrl);
export const gradeApi = createApiClient(Config.gradeUrl);
export const attendanceApi = createApiClient(Config.attendanceUrl);
export const quizApi = createApiClient(Config.quizUrl);
export const notificationApi = createApiClient(Config.notificationUrl);
export const analyticsApi = createApiClient(Config.analyticsUrl);
export const messagingApi = createApiClient(Config.messagingUrl);
export const learnApi = createApiClient(Config.learnUrl);

export const reconfigureApiClients = () => {
  authApi.defaults.baseURL = Config.authUrl;
  feedApi.defaults.baseURL = Config.feedUrl;
  mediaApi.defaults.baseURL = Config.mediaUrl;
  clubsApi.defaults.baseURL = Config.clubUrl;
  classApi.defaults.baseURL = Config.classUrl;
  teacherApi.defaults.baseURL = Config.teacherUrl;
  studentApi.defaults.baseURL = Config.studentUrl;
  timetableApi.defaults.baseURL = Config.timetableUrl;
  gradeApi.defaults.baseURL = Config.gradeUrl;
  attendanceApi.defaults.baseURL = Config.attendanceUrl;
  quizApi.defaults.baseURL = Config.quizUrl;
  notificationApi.defaults.baseURL = Config.notificationUrl;
  analyticsApi.defaults.baseURL = Config.analyticsUrl;
  messagingApi.defaults.baseURL = Config.messagingUrl;
  learnApi.defaults.baseURL = Config.learnUrl;

  if (__DEV__) {
    console.log('🔁 [API] Reconfigured service URLs at runtime', {
      auth: Config.authUrl,
      feed: Config.feedUrl,
      clubs: Config.clubUrl,
      notification: Config.notificationUrl,
      analytics: Config.analyticsUrl,
    });
  }
};

// Ensure defaults reflect the currently active Config (including runtime host overrides).
reconfigureApiClients();

// Helper functions
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const transformError = (error: AxiosError<ApiResponse<unknown>>): ApiError => {
  const response = error.response;

  if (!response) {
    const targetUrl = error.config?.url ? `${error.config.baseURL}${error.config.url}` : 'unknown';
    const diagnostics = `[Code: ${error.code}, Message: ${error.message}, Target: ${targetUrl}]`;

    // Network error - check if it's a timeout or connection issue
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: `Connection timeout ${diagnostics}. If you changed WiFi, the app will reconnect automatically.`,
      };
    }

    if (error.code === 'ERR_NETWORK') {
      return {
        code: 'NETWORK_ERROR',
        message: `Network unavailable ${diagnostics}. Checking connection...`,
      };
    }

    return {
      code: 'NETWORK_ERROR',
      message: `Connection issue ${diagnostics}. Retrying...`,
    };
  }

  const { status, data } = response;

  // Handle specific status codes
  switch (status) {
    case 400:
      return {
        code: 'BAD_REQUEST',
        message: data?.error || data?.message || 'Invalid request. Please check your input.',
      };
    case 401:
      return {
        code: 'UNAUTHORIZED',
        message: data?.message || 'Session expired. Please log in again.',
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        message: 'You don\'t have permission to perform this action.',
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      };
    case 409:
      return {
        code: 'CONFLICT',
        message: data?.message || 'A conflict occurred with the current state.',
      };
    case 422:
      return {
        code: 'VALIDATION_ERROR',
        message: data?.message || 'Validation failed. Please check your input.',
      };
    case 429:
      return {
        code: 'RATE_LIMITED',
        message: data?.error || data?.message || 'AI daily limit reached. The free quota resets every 24 hours — please try again tomorrow.',
      };
    case 500:
    case 502:
    case 503:
      const serverError = data?.error || data?.message || 'Something went wrong on our end.';
      return {
        code: 'SERVER_ERROR',
        message: `${serverError} (Target: ${error.config?.baseURL || 'unknown'})`,
      };
    default:
      return {
        code: 'UNKNOWN_ERROR',
        message: data?.message || 'An unexpected error occurred.',
      };
  }
};

// Request with retry logic
export const requestWithRetry = async <T>(
  requestFn: () => Promise<T>,
  retries: number = APP_CONFIG.RETRY_ATTEMPTS,
  delay: number = APP_CONFIG.RETRY_DELAY
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return requestWithRetry(requestFn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const isRetryableError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return !status || status >= 500 || status === 429;
  }
  return false;
};

export default {
  authApi,
  feedApi,
  mediaApi,
  clubsApi,
  classApi,
  teacherApi,
  studentApi,
  timetableApi,
  gradeApi,
  attendanceApi,
  quizApi,
  notificationApi,
  analyticsApi,
  messagingApi,
  learnApi,
};
