import { AppState, type AppStateStatus } from 'react-native';

import { sendPresenceHeartbeat } from '@/api/presence';
import { getAppPreferences, subscribeAppPreferences } from '@/services/appPreferences';

const HEARTBEAT_INTERVAL_MS = 60_000;

export function bindPresenceSync(userId: string | undefined): () => void {
  if (!userId) {
    return () => {};
  }

  let interval: ReturnType<typeof setInterval> | null = null;
  let appStateSubscription: { remove: () => void } | null = null;
  let preferenceUnsubscribe: (() => void) | null = null;
  let stopped = false;

  const pulse = async () => {
    const preferences = await getAppPreferences();
    if (!preferences.showOnlineStatus) {
      return;
    }

    try {
      await sendPresenceHeartbeat();
    } catch (error) {
      if (__DEV__) {
        console.warn('[Presence] Heartbeat failed:', error);
      }
    }
  };

  const stop = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };

  const start = () => {
    void pulse();
    if (!interval) {
      interval = setInterval(() => {
        void pulse();
      }, HEARTBEAT_INTERVAL_MS);
    }
  };

  const syncFromPreferences = (showOnlineStatus: boolean) => {
    if (stopped) return;
    if (showOnlineStatus && AppState.currentState === 'active') {
      start();
      return;
    }
    stop();
  };

  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (stopped) return;

    if (nextState === 'active') {
      void getAppPreferences().then((preferences) => {
        syncFromPreferences(preferences.showOnlineStatus);
      });
      return;
    }

    stop();
  };

  preferenceUnsubscribe = subscribeAppPreferences((preferences) => {
    syncFromPreferences(preferences.showOnlineStatus);
  });

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  void getAppPreferences().then((preferences) => {
    syncFromPreferences(preferences.showOnlineStatus);
  });

  return () => {
    stopped = true;
    stop();
    preferenceUnsubscribe?.();
    appStateSubscription?.remove();
  };
}
