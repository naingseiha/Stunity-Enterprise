/**
 * Lightweight product-analytics client.
 *
 * `track(name, props)` queues an event; the queue auto-flushes on a short timer,
 * when it fills, and when the app backgrounds. Best-effort: failures are dropped
 * (analytics must never block or crash the app). Events power WAD/MAU + the §7
 * metrics via analytics-service `POST /events`.
 */
import { AppState } from 'react-native';
import { statsAPI } from '@/services/stats';

interface QueuedEvent {
  name: string;
  props?: Record<string, unknown>;
  ts: number;
}

const FLUSH_INTERVAL_MS = 15_000;
const MAX_BATCH = 20;

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateBound = false;

async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    await statsAPI.postEvents(batch);
  } catch {
    // Best-effort — drop on failure rather than growing memory unbounded.
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

function ensureAppStateListener(): void {
  if (appStateBound) return;
  appStateBound = true;
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') void flush(); // flush when leaving the foreground
  });
}

/** Queue an analytics event. Fire-and-forget. */
export function track(name: string, props?: Record<string, unknown>): void {
  ensureAppStateListener();
  queue.push({ name, props, ts: Date.now() });
  if (queue.length >= MAX_BATCH) {
    void flush();
  } else {
    scheduleFlush();
  }
}

/** Force-send any queued events (e.g. on logout). */
export function flushAnalytics(): Promise<void> {
  return flush();
}
