/**
 * Centralized API service URLs for Stunity Enterprise.
 * Uses environment variables with localhost fallbacks for development.
 */
export const SCHOOL_SERVICE_URL =
  process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002';
export const AUTH_SERVICE_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
export const STUDENT_SERVICE_URL =
  process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';
export const CLASS_SERVICE_URL =
  process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';
export const TEACHER_SERVICE_URL =
  process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004';
export const SUBJECT_SERVICE_URL =
  process.env.NEXT_PUBLIC_SUBJECT_SERVICE_URL || 'http://localhost:3006';
export const MESSAGING_SERVICE_URL =
  process.env.NEXT_PUBLIC_MESSAGING_SERVICE_URL || 'http://localhost:3011';
export const FEED_SERVICE_URL =
  process.env.NEXT_PUBLIC_FEED_API_URL || process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';
export const ANALYTICS_SERVICE_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3014';
export const ATTENDANCE_SERVICE_URL =
  process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008';
export const GRADE_SERVICE_URL =
  process.env.NEXT_PUBLIC_GRADE_SERVICE_URL || 'http://localhost:3007';
export const LEARN_SERVICE_URL =
  process.env.NEXT_PUBLIC_LEARN_SERVICE_URL || 'http://localhost:3018';

// Production builds should set NEXT_PUBLIC_* at build time; unset vars fall back to localhost.
if (
  process.env.NODE_ENV === 'production' &&
  !(process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || '').trim()
) {
  console.warn(
    '[api/config] NEXT_PUBLIC_ATTENDANCE_SERVICE_URL is not set; attendance API calls will use http://localhost:3008 (incorrect for production).'
  );
}
