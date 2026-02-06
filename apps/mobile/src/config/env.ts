/**
 * Environment Configuration
 * 
 * Enterprise-grade environment configuration with type safety
 * Supports development, staging, and production environments
 */

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiBaseUrl: string;
  authUrl: string;
  feedUrl: string;
  mediaUrl: string;
  wsUrl: string;
  sentryDsn: string;
  analyticsKey: string;
  enableDebugMode: boolean;
  enableCrashlytics: boolean;
  appStoreUrl: string;
  playStoreUrl: string;
}

const development: EnvironmentConfig = {
  apiBaseUrl: 'http://localhost:3001',
  authUrl: 'http://localhost:3001',
  feedUrl: 'http://localhost:3010',
  mediaUrl: 'http://localhost:3010',
  wsUrl: 'ws://localhost:3011',
  sentryDsn: '',
  analyticsKey: '',
  enableDebugMode: true,
  enableCrashlytics: false,
  appStoreUrl: '',
  playStoreUrl: '',
};

const staging: EnvironmentConfig = {
  apiBaseUrl: 'https://staging-api.stunity.com',
  authUrl: 'https://staging-auth.stunity.com',
  feedUrl: 'https://staging-feed.stunity.com',
  mediaUrl: 'https://staging-media.stunity.com',
  wsUrl: 'wss://staging-ws.stunity.com',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY || '',
  enableDebugMode: true,
  enableCrashlytics: true,
  appStoreUrl: '',
  playStoreUrl: '',
};

const production: EnvironmentConfig = {
  apiBaseUrl: 'https://api.stunity.com',
  authUrl: 'https://auth.stunity.com',
  feedUrl: 'https://feed.stunity.com',
  mediaUrl: 'https://media.stunity.com',
  wsUrl: 'wss://ws.stunity.com',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY || '',
  enableDebugMode: false,
  enableCrashlytics: true,
  appStoreUrl: 'https://apps.apple.com/app/stunity/id123456789',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.stunity.mobile',
};

const environments: Record<Environment, EnvironmentConfig> = {
  development,
  staging,
  production,
};

// Determine current environment
const getEnvironment = (): Environment => {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  if (env === 'staging') return 'staging';
  if (env === 'production') return 'production';
  return 'development';
};

export const ENV = getEnvironment();
export const Config = environments[ENV];

// App-wide constants
export const APP_CONFIG = {
  APP_NAME: 'Stunity',
  APP_VERSION: '1.0.0',
  BUILD_NUMBER: '1',
  
  // API Settings
  API_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Cache Settings
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Media
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
  
  // Security
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  
  // Features
  ENABLE_BIOMETRICS: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
} as const;

export default Config;
