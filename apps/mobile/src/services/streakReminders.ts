import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import i18n from 'i18next';

import {
  fetchPerformanceStatsSummary,
  getCachedPerformanceSummary,
  subscribePerformanceStats,
} from '@/lib/performanceStatsCache';
import { getAppPreferences } from '@/services/appPreferences';

const REMINDER_ID = 'streak-at-risk-evening';
const STORAGE_KEY = '@stunity/streak_reminder_day';
const DEFAULT_HOUR = 19;

async function ensureStreakChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('streak-reminders', {
      name: 'Learning streak',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
  } catch {
    // Channel may already exist
  }
}

function eveningTrigger(hour = DEFAULT_HOUR): Date | null {
  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(hour, 0, 0, 0);
  if (trigger.getTime() <= now.getTime()) {
    return null;
  }
  return trigger;
}

export async function cancelStreakAtRiskReminder() {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export async function syncStreakAtRiskReminder(userId: string) {
  const preferences = await getAppPreferences();
  if (!preferences.pushNotifications) {
    await cancelStreakAtRiskReminder();
    return;
  }

  let summary = getCachedPerformanceSummary(userId);
  if (!summary) {
    try {
      await fetchPerformanceStatsSummary(userId);
      summary = getCachedPerformanceSummary(userId);
    } catch {
      return;
    }
  }

  if (!summary?.streakAtRisk || summary.currentStreak < 1) {
    await cancelStreakAtRiskReminder();
    return;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const scheduledDay = await AsyncStorage.getItem(STORAGE_KEY);
  if (scheduledDay === todayKey) {
    return;
  }

  const trigger = eveningTrigger();
  if (!trigger) {
    return;
  }

  await ensureStreakChannel();
  await cancelStreakAtRiskReminder();

  const days = summary.currentStreak;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: i18n.t('notifications.streakAtRisk.title'),
        body: i18n.t('notifications.streakAtRisk.body', { count: days }),
        data: { type: 'streak_at_risk', userId },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        channelId: Platform.OS === 'android' ? 'streak-reminders' : undefined,
      },
    });
    await AsyncStorage.setItem(STORAGE_KEY, todayKey);
  } catch (error) {
    if (__DEV__) {
      console.warn('[StreakReminder] schedule failed:', error);
    }
  }
}

let reminderListenerAttached = false;
let activeUserId: string | null = null;

export function bindStreakReminderSync(userId: string | undefined) {
  activeUserId = userId ?? null;

  if (!userId) {
    void cancelStreakAtRiskReminder();
    return () => {};
  }

  void syncStreakAtRiskReminder(userId);

  if (!reminderListenerAttached) {
    reminderListenerAttached = true;
    subscribePerformanceStats((updatedUserId) => {
      if (activeUserId && updatedUserId === activeUserId) {
        void syncStreakAtRiskReminder(updatedUserId);
      }
    });
  }

  const appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && activeUserId) {
      void syncStreakAtRiskReminder(activeUserId);
    }
  });

  return () => {
    appStateSub.remove();
  };
}
