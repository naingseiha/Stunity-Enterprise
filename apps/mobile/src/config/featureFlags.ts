/**
 * Feature flags for gradual rollout and archived modules.
 *
 * Messaging is archived until Enterprise (dedicated messaging + Supabase Realtime budget).
 * Re-enable by setting MESSAGING_ENABLED to true and restoring navigation entry points.
 */
export const FEATURE_FLAGS = {
  MESSAGING_ENABLED: false,
} as const;
