/**
 * Centralized API service URLs for Stunity Enterprise.
 * Uses environment variables with localhost fallbacks for development.
 */
export const SCHOOL_SERVICE_URL =
  process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002';
export const STUDENT_SERVICE_URL =
  process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';
export const CLASS_SERVICE_URL =
  process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';
export const MESSAGING_SERVICE_URL =
  process.env.NEXT_PUBLIC_MESSAGING_SERVICE_URL || 'http://localhost:3011';
export const FEED_SERVICE_URL =
  process.env.NEXT_PUBLIC_FEED_API_URL || process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';
export const ANALYTICS_SERVICE_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3014';
