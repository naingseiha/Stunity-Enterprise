// Centralized push-preference checks. Preferences live on
// `User.privacySettings.mobileApp` as flat booleans, matching the existing
// app-settings shape in auth-service:
//   { pushNotifications, pushStreakReminders, pushWeeklyDigest, pushFollows,
//     pushClubActivity, pushGrades, pushAssignments, ... }
//
// Model is opt-OUT: a channel is enabled unless explicitly set to false. This
// keeps more channels live while still letting users granularly silence one
// category without disabling push entirely (growth-plan §3.6 / §5.2).

export type PushCategory =
  | 'streakReminders'
  | 'weeklyDigest'
  | 'follows'
  | 'clubActivity'
  | 'grades'
  | 'assignments';

// Category -> flat settings key on privacySettings.mobileApp.
const CATEGORY_KEY: Record<PushCategory, string> = {
  streakReminders: 'pushStreakReminders',
  weeklyDigest: 'pushWeeklyDigest',
  follows: 'pushFollows',
  clubActivity: 'pushClubActivity',
  grades: 'pushGrades',
  assignments: 'pushAssignments',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mobileApp(privacySettings: unknown): Record<string, unknown> {
  return asRecord(asRecord(privacySettings).mobileApp);
}

/** Master switch: false only when the user explicitly disabled mobile push. */
export function isMobilePushEnabled(privacySettings: unknown): boolean {
  return mobileApp(privacySettings).pushNotifications !== false;
}

/** True when a specific category is enabled AND the master switch is on. */
export function isPushCategoryEnabled(privacySettings: unknown, category: PushCategory): boolean {
  if (!isMobilePushEnabled(privacySettings)) return false;
  return mobileApp(privacySettings)[CATEGORY_KEY[category]] !== false;
}
