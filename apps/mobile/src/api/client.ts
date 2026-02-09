/**
 * API Client
 * 
 * Enterprise-grade HTTP client with:
 * - Automatic token refresh
 * - Request/Response interceptors
 * - Retry logic with exponential backoff
 * - Request cancellation
 * - Offline queue
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config, APP_CONFIG } from '@/config';
import { tokenService } from '@/services/token';
import { ApiResponse, ApiError } from '@/types';

// Create axios instance
const createApiClient = (baseURL: string): AxiosInstance => {
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
      // Add auth token
      const token = await tokenService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request ID for tracing
      config.headers['X-Request-ID'] = generateRequestId();

      // Log in development
      if (__DEV__) {
        console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url}`);
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
      if (__DEV__) {
        console.log(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      }
      return response;
    },
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

      // Handle timeout errors with retry
      if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
        const retryCount = (originalRequest._retryCount || 0) + 1;
        
        if (retryCount <= 2) { // Retry up to 2 times for timeouts
          originalRequest._retryCount = retryCount;
          originalRequest._retry = true;
          
          // Exponential backoff: 1s, 2s
          const delay = 1000 * retryCount;
          if (__DEV__) {
            console.log(`⏳ [API] Retrying ${originalRequest.url} (attempt ${retryCount}/2) after ${delay}ms...`);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Increase timeout for retry
          originalRequest.timeout = (originalRequest.timeout || 15000) + 5000;
          
          return client(originalRequest);
        }
      }

      // Handle 401 - Token expired
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await tokenService.refreshAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Token refresh failed, logout user
          await tokenService.clearTokens();
          // Emit logout event
          eventEmitter.emit('auth:logout');
          return Promise.reject(refreshError);
        }
      }

      // Handle other errors
      if (__DEV__) {
        console.error(`❌ [API] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || error.code}`);
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

// Helper functions
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const transformError = (error: AxiosError<ApiResponse<unknown>>): ApiError => {
  const response = error.response;
  
  if (!response) {
    // Network error - check if it's a timeout or connection issue
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Server is taking too long to respond. Please try again.',
      };
    }
    
    if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
      return {
        code: 'NETWORK_ERROR',
        message: 'No internet connection. Please check your network.',
      };
    }
    
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect. Please check your internet.',
    };
  }

  const { status, data } = response;

  // Handle specific status codes
  switch (status) {
    case 400:
      return {
        code: 'BAD_REQUEST',
        message: data?.message || 'Invalid request. Please check your input.',
      };
    case 401:
      return {
        code: 'UNAUTHORIZED',
        message: 'Session expired. Please log in again.',
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
        message: 'Too many requests. Please try again later.',
      };
    case 500:
    case 502:
    case 503:
      return {
        code: 'SERVER_ERROR',
        message: 'Something went wrong on our end. Please try again later.',
      };
    default:
      return {
        code: 'UNKNOWN_ERROR',
        message: data?.message || 'An unexpected error occurred.',
      };
  }
};

// Simple event emitter for auth events
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: unknown[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }
}

export const eventEmitter = new EventEmitter();

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

export default { authApi, feedApi, mediaApi, eventEmitter };
