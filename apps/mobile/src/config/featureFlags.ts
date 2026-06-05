/**
 * Feature flags — static build flags + remote (server-resolved) rollout flags.
 *
 * Remote flags come from analytics-service `GET /feature-flags`, which resolves
 * each flag per-user with deterministic %-rollout. We fetch them on launch,
 * cache to AsyncStorage (so launch is instant + offline-safe), and expose
 * `isFeatureEnabled` / `useFeatureFlag`. Swapping the server resolver for
 * GrowthBook/PostHog later requires no client change.
 *
 * Engagement flags default to ON so a failed/absent fetch never hides shipped
 * features — the server is the authority for turning something OFF.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { statsAPI } from '@/services/stats';

// Static build flags (not user-rolled).
export const FEATURE_FLAGS = {
  MESSAGING_ENABLED: false,
} as const;

// Remote flags that actually gate client UI. Each key below has a verified
// consumer (useFeatureFlag/isFeatureEnabled) AND a working backend endpoint:
//   reactions          → POST /posts/:id/react            (feed-service)
//   repost_quote       → repost/quote composer + POST /posts/:id/repost (feed-service)
//   endorsements       → /users/:id/skills, /skills/:id/endorse (feed-service)
//   mastery_tree       → GET /recall/mastery              (feed-service)
//   streak_leaderboard → GET /streak/leaderboard          (analytics-service)
//   streak_ring        → feed-header streak chip (data from analytics-service)
//   profile_strength   → strength meter; backend exists (GET profile strength,
//                        feed-service) but client UI is not wired yet — kept so
//                        the flag is ready when the meter ships. Audit: 2026-06.
// Removed (were default-ON but gated nothing): `weekly_digest` is a backend-only
// notification cron now gated by WEEKLY_DIGEST_ENABLED in notification-service;
// `public_profile` had no implementation on either side.
export type RemoteFlagKey =
  | 'reactions'
  | 'repost_quote'
  | 'endorsements'
  | 'mastery_tree'
  | 'streak_leaderboard'
  | 'streak_ring'
  | 'profile_strength';

const DEFAULT_REMOTE_FLAGS: Record<RemoteFlagKey, boolean> = {
  reactions: true,
  repost_quote: true,
  endorsements: true,
  mastery_tree: true,
  streak_leaderboard: true,
  streak_ring: true,
  profile_strength: true,
};

const STORAGE_KEY = 'stunity_feature_flags_v1';

let remoteFlags: Record<string, boolean> = { ...DEFAULT_REMOTE_FLAGS };
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => {
    try { l(); } catch { /* ignore */ }
  });
}

/** Synchronous flag check. Falls back to the default-on value when unknown. */
export function isFeatureEnabled(key: RemoteFlagKey): boolean {
  if (key in remoteFlags) return remoteFlags[key];
  return DEFAULT_REMOTE_FLAGS[key] ?? true;
}

/** Hydrate from cache (fast) then refresh from the server (authoritative). */
export async function loadFeatureFlags(): Promise<void> {
  if (!hydrated) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        remoteFlags = { ...DEFAULT_REMOTE_FLAGS, ...JSON.parse(raw) };
        notify();
      }
    } catch { /* ignore */ }
    hydrated = true;
  }

  try {
    const fresh = await statsAPI.getFeatureFlags();
    if (fresh && typeof fresh === 'object') {
      remoteFlags = { ...DEFAULT_REMOTE_FLAGS, ...fresh };
      notify();
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
    }
  } catch {
    // Keep cached/default values when the service is unreachable.
  }
}

/** React hook — re-renders when flags load/refresh. */
export function useFeatureFlag(key: RemoteFlagKey): boolean {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(key));
  useEffect(() => {
    const update = () => setEnabled(isFeatureEnabled(key));
    update();
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, [key]);
  return enabled;
}
