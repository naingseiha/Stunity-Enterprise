import crypto from 'crypto';

/**
 * Server-side feature-flag definitions with deterministic percentage rollout.
 *
 * This is the single source of truth the mobile app reads via GET /feature-flags.
 * It works standalone today (flip `enabled` / `rollout` and redeploy — or later,
 * back it with a DB table / GrowthBook without changing the mobile contract).
 *
 * Rollout model matches GrowthBook/PostHog: a stable hash of `${userId}:${key}`
 * maps each user to a 0-99 bucket; the flag is on when bucket < rollout%. The
 * same user always gets the same answer, and buckets are independent per flag.
 */

export interface FlagDefinition {
  key: string;
  description: string;
  enabled: boolean; // master switch — false hard-disables regardless of rollout
  rollout: number; // 0-100, percentage of users the flag is enabled for
}

// All engagement features default to fully on (100%) — they're shipped. Lower a
// rollout to stage a change, or set enabled:false as an instant kill switch.
export const FLAG_DEFINITIONS: FlagDefinition[] = [
  { key: 'reactions', description: 'Reaction picker beyond like', enabled: true, rollout: 100 },
  { key: 'repost_quote', description: 'Repost with quote composer', enabled: true, rollout: 100 },
  { key: 'endorsements', description: 'Skill endorsements on profile', enabled: true, rollout: 100 },
  { key: 'mastery_tree', description: 'Subject mastery tree', enabled: true, rollout: 100 },
  { key: 'streak_leaderboard', description: 'Scoped streak leaderboards', enabled: true, rollout: 100 },
  { key: 'streak_ring', description: 'Streak chip in feed header', enabled: true, rollout: 100 },
  { key: 'profile_strength', description: 'Profile strength meter + nudge', enabled: true, rollout: 100 },
  { key: 'weekly_digest', description: 'Weekly progress digest', enabled: true, rollout: 100 },
  { key: 'public_profile', description: 'Public profile share', enabled: true, rollout: 100 },
];

/** Stable 0-99 bucket for a (user, flag) pair. */
export function bucketFor(userId: string, key: string): number {
  const hash = crypto.createHash('sha256').update(`${userId}:${key}`).digest();
  // First 4 bytes → unsigned int → mod 100.
  const n = hash.readUInt32BE(0);
  return n % 100;
}

export function isFlagEnabledForUser(def: FlagDefinition, userId: string): boolean {
  if (!def.enabled) return false;
  if (def.rollout >= 100) return true;
  if (def.rollout <= 0) return false;
  return bucketFor(userId, def.key) < def.rollout;
}

/** Resolve every flag for a given user into a simple map the client consumes. */
export function resolveFlagsForUser(userId: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of FLAG_DEFINITIONS) {
    out[def.key] = isFlagEnabledForUser(def, userId);
  }
  return out;
}
