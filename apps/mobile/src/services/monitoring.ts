/**
 * Crash & error monitoring (Sentry).
 *
 * Config-driven and fail-safe: Sentry only initializes when a DSN is present
 * (Config.sentryDsn, sourced from EXPO_PUBLIC_SENTRY_DSN) AND crash reporting is
 * enabled for the active environment (Config.enableCrashlytics). Without a DSN
 * this module is inert — every export is a safe no-op — so local/dev builds and
 * forks without a Sentry project keep working unchanged. Errors are never sent
 * from __DEV__ regardless, to avoid polluting the project with developer noise.
 *
 * `Sentry.init` installs the global JS error handler and unhandled-promise
 * tracker automatically (ReactNativeErrorHandlers integration), so uncaught
 * errors outside React's render path are captured too — we don't override
 * ErrorUtils ourselves (that would fight Sentry's own handler). React render
 * errors are forwarded explicitly from ErrorBoundary via captureException().
 */
import * as Sentry from '@sentry/react-native';
import { Config, ENV } from '@/config/env';

let initialized = false;

/** True once Sentry has been successfully initialized with a real DSN. */
export const isMonitoringEnabled = (): boolean => initialized;

/**
 * Initialize crash reporting. Safe to call once at app startup; subsequent
 * calls are ignored. No-ops (and logs once in dev) when no DSN is configured.
 */
export function initMonitoring(): void {
  if (initialized) return;

  const dsn = Config.sentryDsn?.trim();
  if (!dsn || !Config.enableCrashlytics || __DEV__) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[monitoring] Sentry disabled — no DSN / crashlytics off / dev build. ' +
          'Set EXPO_PUBLIC_SENTRY_DSN to enable crash reporting.',
      );
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: ENV,
      // Crash-only for now: no performance tracing (keeps event quota for the
      // signal that matters most pre-launch). Bump tracesSampleRate later if we
      // want transaction performance data.
      tracesSampleRate: 0,
      attachStacktrace: true,
      // We strip console.log/info/debug in production (babel) but keep
      // error/warn; let Sentry breadcrumb those for crash context.
      enableNativeCrashHandling: true,
    });
    initialized = true;
  } catch (e) {
    // Never let monitoring setup crash the app.
    // eslint-disable-next-line no-console
    console.warn('[monitoring] Sentry init failed:', e);
  }
}

/**
 * Report a caught error. No-op until monitoring is initialized, so call sites
 * (ErrorBoundary, catch blocks) can use it unconditionally.
 *
 * @param error   The thrown error.
 * @param context Optional structured context attached under the "app" key
 *                (e.g. React componentStack, the operation that failed).
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;
  try {
    Sentry.captureException(error, context ? { contexts: { app: context } } : undefined);
  } catch {
    // swallow — reporting must never throw
  }
}

/** Re-export for callers that want to wrap the root component (App.tsx). */
export const wrapWithMonitoring = Sentry.wrap;
