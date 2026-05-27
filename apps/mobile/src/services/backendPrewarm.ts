/**
 * Backend pre-warm — fires lightweight /health pings to hot-path services so
 * their containers/connection pools are warm by the time the first real
 * request lands. Solves Cloud Run cold-starts (and the same symptom in dev
 * when ts-node-dev has just restarted).
 *
 * Uses raw axios — no auth, no interceptors, no retry. Fire-and-forget.
 */

import axios from 'axios';
import { Config } from '@/config';

const PREWARM_TIMEOUT_MS = 3_000;
const PREWARM_COOLDOWN_MS = 60_000;

let lastPrewarmAt = 0;

const ping = (baseUrl: string | undefined) => {
  if (!baseUrl) return Promise.resolve();
  return axios
    .get(`${baseUrl}/health`, {
      timeout: PREWARM_TIMEOUT_MS,
      // Don't send cookies/credentials — /health is unauthenticated.
      headers: { 'X-Client-Source': 'mobile-prewarm' },
    })
    .then(() => undefined)
    .catch(() => undefined);
};

/**
 * Fire-and-forget health pings to the services the feed depends on. Returns
 * immediately; callers should not await this.
 *
 * Cooldown: subsequent calls within 60s are no-ops to avoid hammering during
 * rapid auth state changes (login → token refresh → verify).
 */
export const prewarmHotServices = (): void => {
  const now = Date.now();
  if (now - lastPrewarmAt < PREWARM_COOLDOWN_MS) return;
  lastPrewarmAt = now;

  if (__DEV__) {
    console.log('🔥 [Prewarm] Pinging feed/learn/notification /health…');
  }

  // No await — race in parallel with whatever the caller is doing next.
  void Promise.all([
    ping(Config.feedUrl),
    ping(Config.learnUrl),
    ping(Config.notificationUrl),
  ]);
};
