type OperationalPayload = {
  level: 'error';
  source: 'web-client';
  area: string;
  message: string;
  context: Record<string, unknown>;
  timestamp: string;
};

declare global {
  interface Window {
    /** Inject from layout: forward to Datadog/Sentry/console pipeline */
    __STUNITY_REPORT_OPERATIONAL_ERROR__?: (payload: OperationalPayload, originalError?: unknown) => void;
  }
}

function trySentryOperational(area: string, error: unknown, context: Record<string, unknown>): void {
  const capture = (globalThis as { Sentry?: { captureException?: (e: unknown, hint?: unknown) => void } }).Sentry
    ?.captureException;
  if (typeof capture !== 'function') return;

  const err = error instanceof Error ? error : new Error(String(error));
  try {
    capture(err, {
      tags: { area, source: 'web-client-operational' },
      extra: context,
    });
  } catch {
    /* Sentry unavailable or incompatible */
  }
}

function sendIngest(url: string, payload: OperationalPayload): void {
  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Structured client ops errors: console JSON in prod plus optional ingest, global hook, and Sentry when loaded. */
export function reportClientOperationalError(
  area: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const message = error instanceof Error ? error.message : String(error);
  const payload: OperationalPayload = {
    level: 'error',
    source: 'web-client',
    area,
    message,
    context: context ?? {},
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[operational]', payload, error);
    return;
  }

  if (typeof window !== 'undefined' && typeof window.__STUNITY_REPORT_OPERATIONAL_ERROR__ === 'function') {
    try {
      window.__STUNITY_REPORT_OPERATIONAL_ERROR__(payload, error);
    } catch {
      /* custom transport failed */
    }
  }

  trySentryOperational(area, error, payload.context);

  const ingestUrl = process.env.NEXT_PUBLIC_CLIENT_OPS_LOG_INGEST_URL;
  if (ingestUrl) {
    sendIngest(ingestUrl, payload);
  }

  try {
    console.error(JSON.stringify(payload));
  } catch {
    /* ignore serialization edge cases */
  }
}
