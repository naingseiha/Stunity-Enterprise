import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppPreferences {
  pushNotifications: boolean;
  emailNotifications: boolean;
  autoPlayVideos: boolean;
  hapticFeedback: boolean;
  showOnlineStatus: boolean;
}

export type AppPreferenceKey = keyof AppPreferences;

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  pushNotifications: true,
  emailNotifications: true,
  autoPlayVideos: true,
  hapticFeedback: true,
  showOnlineStatus: true,
};

const APP_PREFERENCES_KEY = 'stunity_app_preferences_v1';
const listeners = new Set<(preferences: AppPreferences) => void>();
let cachedPreferences: AppPreferences = DEFAULT_APP_PREFERENCES;
let hasHydratedPreferences = false;

const normalizePreferences = (value: unknown): AppPreferences => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Record<AppPreferenceKey, unknown>>
    : {};

  return {
    pushNotifications: typeof source.pushNotifications === 'boolean'
      ? source.pushNotifications
      : DEFAULT_APP_PREFERENCES.pushNotifications,
    emailNotifications: typeof source.emailNotifications === 'boolean'
      ? source.emailNotifications
      : DEFAULT_APP_PREFERENCES.emailNotifications,
    autoPlayVideos: typeof source.autoPlayVideos === 'boolean'
      ? source.autoPlayVideos
      : DEFAULT_APP_PREFERENCES.autoPlayVideos,
    hapticFeedback: typeof source.hapticFeedback === 'boolean'
      ? source.hapticFeedback
      : DEFAULT_APP_PREFERENCES.hapticFeedback,
    showOnlineStatus: typeof source.showOnlineStatus === 'boolean'
      ? source.showOnlineStatus
      : DEFAULT_APP_PREFERENCES.showOnlineStatus,
  };
};

const notifyListeners = (preferences: AppPreferences) => {
  listeners.forEach((listener) => {
    try {
      listener(preferences);
    } catch (error) {
      console.warn('App preference listener failed:', error);
    }
  });
};

const persistPreferences = async (preferences: AppPreferences) => {
  cachedPreferences = preferences;
  hasHydratedPreferences = true;
  await AsyncStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(preferences));
  notifyListeners(preferences);
  return preferences;
};

export const hydrateAppPreferences = async (): Promise<AppPreferences> => {
  if (hasHydratedPreferences) {
    return cachedPreferences;
  }

  try {
    const raw = await AsyncStorage.getItem(APP_PREFERENCES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cachedPreferences = normalizePreferences(parsed);
  } catch (error) {
    console.warn('Failed to load app preferences:', error);
    cachedPreferences = DEFAULT_APP_PREFERENCES;
  } finally {
    hasHydratedPreferences = true;
    notifyListeners(cachedPreferences);
  }

  return cachedPreferences;
};

export const getAppPreferences = async (): Promise<AppPreferences> => {
  return hydrateAppPreferences();
};

export const getCachedAppPreferences = (): AppPreferences => cachedPreferences;

export const saveAppPreferences = async (preferences: Partial<AppPreferences>): Promise<AppPreferences> => {
  const current = await hydrateAppPreferences();
  return persistPreferences(normalizePreferences({ ...current, ...preferences }));
};

export const setAppPreference = async <K extends AppPreferenceKey>(
  key: K,
  value: AppPreferences[K]
): Promise<AppPreferences> => {
  return saveAppPreferences({ [key]: value } as Partial<AppPreferences>);
};

export const subscribeAppPreferences = (
  listener: (preferences: AppPreferences) => void
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
