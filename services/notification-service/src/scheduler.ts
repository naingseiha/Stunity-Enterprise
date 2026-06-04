import { runStreakAtRiskPushJob } from './jobs/streakAtRiskJob';
import { runWeeklyProgressDigestJob } from './jobs/weeklyProgressDigestJob';

/**
 * Lightweight dependency-free in-process scheduler.
 *
 * The notification jobs are also exposed as service-auth HTTP endpoints
 * (`POST /notifications/jobs/*`) for production scale-out via Cloud Scheduler.
 * This internal scheduler is for dev and single-instance deployments so the jobs
 * fire automatically without external wiring. All jobs are idempotent (they
 * de-dupe per user per day), so an occasional double-fire is harmless.
 *
 * Disable in multi-instance production (where Cloud Scheduler drives a single
 * trigger) by setting ENABLE_INTERNAL_CRON=false.
 */

const CHECK_INTERVAL_MS = 60 * 1000; // evaluate the clock once a minute

// Weekly digest: default Sunday (0) at 18:00 local.
const DIGEST_DAY = Number(process.env.INTERNAL_CRON_DIGEST_DAY ?? 0);
const DIGEST_HOUR = Number(process.env.INTERNAL_CRON_DIGEST_HOUR ?? 18);

let lastStreakRunHourKey = '';
let lastDigestRunDayKey = '';
let timer: NodeJS.Timeout | null = null;

function hourKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

async function tick(): Promise<void> {
  const now = new Date();

  // Streak-at-risk: run once at the top of each hour. Per-day de-dupe inside the
  // job means each user gets at most one reminder regardless of hourly cadence.
  const hKey = hourKey(now);
  if (hKey !== lastStreakRunHourKey) {
    lastStreakRunHourKey = hKey;
    try {
      const result = await runStreakAtRiskPushJob();
      console.log('[scheduler] streak-at-risk', result);
    } catch (err) {
      console.error('[scheduler] streak-at-risk failed:', err);
    }
  }

  // Weekly digest: once on the configured day, at/after the configured hour.
  const dKey = dayKey(now);
  if (
    now.getDay() === DIGEST_DAY &&
    now.getHours() >= DIGEST_HOUR &&
    dKey !== lastDigestRunDayKey
  ) {
    lastDigestRunDayKey = dKey;
    try {
      const result = await runWeeklyProgressDigestJob();
      console.log('[scheduler] weekly-digest', result);
    } catch (err) {
      console.error('[scheduler] weekly-digest failed:', err);
    }
  }
}

export function startInternalScheduler(): void {
  if (process.env.ENABLE_INTERNAL_CRON === 'false') {
    console.log('[scheduler] internal cron disabled (ENABLE_INTERNAL_CRON=false)');
    return;
  }
  if (timer) return;
  console.log(
    `[scheduler] internal cron enabled — streak-at-risk hourly, weekly digest day=${DIGEST_DAY} hour=${DIGEST_HOUR}`,
  );
  // Fire an immediate evaluation, then poll the clock every minute.
  void tick();
  timer = setInterval(() => void tick(), CHECK_INTERVAL_MS);
  timer.unref?.();
}
