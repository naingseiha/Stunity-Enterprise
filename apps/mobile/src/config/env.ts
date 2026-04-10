/**
 * Environment Configuration
 * 
 * Enterprise-grade environment configuration with type safety
 * Supports development, staging, and production environments
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiBaseUrl: string;
  authUrl: string;
  feedUrl: string;
  mediaUrl: string;
  clubUrl: string;
  classUrl: string;
  teacherUrl: string;
  timetableUrl: string;
  notificationUrl: string;
  quizUrl: string;
  analyticsUrl: string;
  aiUrl: string;
  wsUrl: string;
  messagingUrl: string;
  studentUrl: string;
  gradeUrl: string;
  attendanceUrl: string;
  sentryDsn: string;
  analyticsKey: string;
  enableDebugMode: boolean;
  enableCrashlytics: boolean;
  appStoreUrl: string;
  playStoreUrl: string;
}

/**
 * Smart API host detection that works across WiFi changes
 * 
 * Priority:
 * 1. Manual override via EXPO_PUBLIC_API_HOST env var
 * 2. Expo's debuggerHost (auto-detects dev machine IP) ⭐ RECOMMENDED
 * 3. Localhost fallback
 * 
 * NOTE: In development, Expo automatically detects your dev machine's IP
 * when you start the app. This means WiFi changes are handled automatically!
 * 
 * If you still get network errors after WiFi change:
 * 1. Wait 5-10 seconds for auto-retry
 * 2. Pull down to refresh the screen
 * 3. Restart the app with: npx expo start --clear
 */
const extractHost = (value?: string | null): string | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  try {
    if (raw.includes('://')) {
      return new URL(raw).hostname || null;
    }
  } catch {
    // Ignore URL parse errors and try plain host parsing below.
  }

  // Handles "192.168.1.10:8081", "192.168.1.10:8081/path", "[::1]:8081"
  const withoutPath = raw.split('/')[0];
  const normalized = withoutPath.replace(/^\[/, '').replace(/\]$/, '');
  if (!normalized) return null;

  const colonSegments = normalized.split(':');
  if (colonSegments.length >= 2) {
    const maybeHost = colonSegments[0];
    return maybeHost || null;
  }

  return normalized;
};

const detectExpoHost = (): string | null => {
  const manifest2 = Constants.manifest2 as {
    extra?: {
      expoClient?: { hostUri?: string };
      expoGo?: { debuggerHost?: string };
    };
  } | null;

  const candidates: Array<{ label: string; value?: string | null }> = [
    { label: 'expoConfig.hostUri', value: Constants.expoConfig?.hostUri },
    { label: 'expoGoConfig.debuggerHost', value: Constants.expoGoConfig?.debuggerHost },
    { label: 'manifest2.extra.expoClient.hostUri', value: manifest2?.extra?.expoClient?.hostUri },
    { label: 'manifest2.extra.expoGo.debuggerHost', value: manifest2?.extra?.expoGo?.debuggerHost },
    { label: 'experienceUrl', value: Constants.experienceUrl },
    { label: 'linkingUri', value: Constants.linkingUri },
    { label: 'intentUri', value: Constants.intentUri },
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate.value);
    if (host) {
      if (__DEV__) console.log(`📡 [ENV] Auto-detected API host from ${candidate.label}:`, host);
      return host;
    }
  }

  return null;
};

const getApiHost = (): string => {
  // 1. Manual override via .env
  const envHost = process.env.EXPO_PUBLIC_API_HOST;
  if (envHost) {
    if (__DEV__) console.log('📡 [ENV] Using manual API host:', envHost);
    return envHost;
  }

  // 2. Production/Staging check
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
  if (appEnv === 'production' || appEnv === 'staging') {
    return 'production'; // Host unused for prod/staging configs anyway
  }

  // 3. In development, try Expo runtime hosts (dev client / Expo Go / updates manifests)
  const autoHost = detectExpoHost();
  if (autoHost) {
    return autoHost;
  }

  // Android emulator uses 10.0.2.2 to reach host localhost.
  // For physical devices, prefer EXPO_PUBLIC_API_HOST or adb reverse.
  if (Platform.OS === 'android') {
    if (__DEV__) {
      console.warn('⚠️ [ENV] Could not auto-detect API host on Android. Falling back to 10.0.2.2.');
      console.warn('   For physical devices, set EXPO_PUBLIC_API_HOST or run Android with adb reverse.');
    }
    return '10.0.2.2';
  }

  // 4. Fallback: localhost
  if (__DEV__) {
    console.warn('⚠️ [ENV] Could not auto-detect API host. Using localhost fallback.');
    console.warn('   To fix: ensure you are using the same WiFi as your computer or set EXPO_PUBLIC_API_HOST');
  }
  return 'localhost';
};

const BUILD_TIME_API_HOST = getApiHost();

const buildDevelopmentConfig = (host: string): EnvironmentConfig => {
  const devAuthUrl = process.env.EXPO_PUBLIC_AUTH_URL || `http://${host}:3001`;
  return {
    apiBaseUrl: `http://${host}:3001`,
    authUrl: devAuthUrl,
    feedUrl: `http://${host}:3010`,
    mediaUrl: `http://${host}:3010`,
    clubUrl: `http://${host}:3012`,
    classUrl: `http://${host}:3005`,
    teacherUrl: `http://${host}:3004`,
    timetableUrl: `http://${host}:3009`,
    notificationUrl: `http://${host}:3013`,
    quizUrl: `http://${host}:3010`,
    analyticsUrl: `http://${host}:3014`,
    aiUrl: 'https://stunity-ai-service-936508661701.us-central1.run.app', // Failover to production for stable testing
    wsUrl: `ws://${host}:3011`,
    messagingUrl: `http://${host}:3011`,
    studentUrl: `http://${host}:3003`,
    gradeUrl: `http://${host}:3007`,
    attendanceUrl: `http://${host}:3008`,
    sentryDsn: '',
    analyticsKey: '',
    enableDebugMode: true,
    enableCrashlytics: false,
    appStoreUrl: '',
    playStoreUrl: '',
  };
};

const development: EnvironmentConfig = buildDevelopmentConfig(BUILD_TIME_API_HOST);
const staging: EnvironmentConfig = {
  apiBaseUrl: 'https://staging-api.stunity.com',
  authUrl: 'https://staging-auth.stunity.com',
  feedUrl: 'https://staging-feed.stunity.com',
  mediaUrl: 'https://staging-media.stunity.com',
  clubUrl: 'https://staging-clubs.stunity.com',
  classUrl: 'https://staging-classes.stunity.com',
  teacherUrl: 'https://staging-teachers.stunity.com',
  timetableUrl: 'https://staging-timetable.stunity.com',
  notificationUrl: 'https://staging-notifications.stunity.com',
  quizUrl: 'https://staging-quiz.stunity.com',
  analyticsUrl: 'https://staging-analytics.stunity.com',
  aiUrl: 'https://staging-ai.stunity.com',
  wsUrl: 'wss://staging-ws.stunity.com',
  messagingUrl: 'https://staging-messaging.stunity.com',
  studentUrl: 'https://staging-students.stunity.com',
  gradeUrl: 'https://staging-grades.stunity.com',
  attendanceUrl: 'https://staging-attendance.stunity.com',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY || '',
  enableDebugMode: true,
  enableCrashlytics: true,
  appStoreUrl: '',
  playStoreUrl: '',
};
const production: EnvironmentConfig = {
  apiBaseUrl: 'https://stunity-auth-service-936508661701.us-central1.run.app',
  authUrl: 'https://stunity-auth-service-936508661701.us-central1.run.app',
  feedUrl: 'https://stunity-feed-service-936508661701.us-central1.run.app',
  mediaUrl: 'https://stunity-feed-service-936508661701.us-central1.run.app',
  clubUrl: 'https://stunity-club-service-936508661701.us-central1.run.app',
  classUrl: 'https://stunity-class-service-936508661701.us-central1.run.app',
  teacherUrl: 'https://stunity-teacher-service-936508661701.us-central1.run.app',
  timetableUrl: 'https://stunity-timetable-service-936508661701.us-central1.run.app',
  notificationUrl: 'https://stunity-notification-service-936508661701.us-central1.run.app',
  quizUrl: 'https://stunity-feed-service-936508661701.us-central1.run.app',
  analyticsUrl: 'https://stunity-analytics-service-936508661701.us-central1.run.app',
  aiUrl: 'https://stunity-ai-service-936508661701.us-central1.run.app',
  wsUrl: 'wss://stunity-messaging-service-936508661701.us-central1.run.app',
  messagingUrl: 'https://stunity-messaging-service-936508661701.us-central1.run.app',
  studentUrl: 'https://stunity-student-service-936508661701.us-central1.run.app',
  gradeUrl: 'https://stunity-grade-service-936508661701.us-central1.run.app',
  attendanceUrl: 'https://stunity-attendance-service-936508661701.us-central1.run.app',
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
  // Allow forcing production API targeting in development mode
  if (process.env.EXPO_PUBLIC_USE_PROD_API === 'true') {
    if (__DEV__) console.log('🌐 [ENV] Forcing PRODUCTION environment via EXPO_PUBLIC_USE_PROD_API');
    return 'production';
  }
  return 'development';
};

export const ENV = getEnvironment();
export const Config = environments[ENV];
let runtimeApiHostOverride: string | null = null;

export const normalizeApiHostInput = (value: string): string | null => {
  const host = extractHost(value);
  return host && host.trim() ? host.trim() : null;
};

export const getBuildTimeApiHost = (): string => BUILD_TIME_API_HOST;

export const getRuntimeApiHostOverride = (): string | null => runtimeApiHostOverride;

export const getEffectiveApiHost = (): string | null => {
  if (ENV !== 'development') return null;
  return runtimeApiHostOverride || BUILD_TIME_API_HOST;
};

export const applyRuntimeApiHostOverride = (nextHost: string | null): boolean => {
  if (ENV !== 'development') return false;

  const normalizedHost = nextHost ? normalizeApiHostInput(nextHost) : null;
  if (nextHost && !normalizedHost) return false;

  runtimeApiHostOverride = normalizedHost;
  const effectiveHost = normalizedHost || BUILD_TIME_API_HOST;
  Object.assign(Config, buildDevelopmentConfig(effectiveHost));

  if (__DEV__) {
    console.log('📡 [ENV] Runtime API host applied:', {
      override: runtimeApiHostOverride,
      effectiveHost,
      authUrl: Config.authUrl,
      feedUrl: Config.feedUrl,
    });
  }

  return true;
};

// App-wide constants
export const APP_CONFIG = {
  APP_NAME: 'Stunity',
  APP_VERSION: '1.0.0',
  BUILD_NUMBER: '1',

  // API Settings
  API_TIMEOUT: 120000, // 120 seconds (increased for AI backoff-retries)
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 seconds between retries

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
