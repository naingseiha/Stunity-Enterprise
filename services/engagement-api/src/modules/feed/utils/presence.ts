const ONLINE_PRESENCE_THRESHOLD_MS = 5 * 60 * 1000;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getMobileApp = (privacySettings: unknown): Record<string, unknown> =>
  asRecord(asRecord(privacySettings).mobileApp);

const getLastActiveAt = (privacySettings: unknown): Date | null => {
  const raw = getMobileApp(privacySettings).lastActiveAt;
  if (typeof raw !== 'string') return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Public online status for other users.
 * Honors privacySettings.mobileApp.showOnlineStatus + recent heartbeat.
 */
export function resolvePublicIsOnline(
  privacySettings: unknown,
  now = new Date()
): boolean {
  const mobileApp = getMobileApp(privacySettings);
  if (mobileApp.showOnlineStatus === false) return false;

  const lastActiveAt = getLastActiveAt(privacySettings);
  if (!lastActiveAt) return false;

  return now.getTime() - lastActiveAt.getTime() <= ONLINE_PRESENCE_THRESHOLD_MS;
}
