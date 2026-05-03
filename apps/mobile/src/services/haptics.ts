import * as ExpoHaptics from 'expo-haptics';
import { getCachedAppPreferences } from './appPreferences';

export type ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export type NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

const shouldRunHaptics = () => getCachedAppPreferences().hapticFeedback;

export const Haptics = {
  ImpactFeedbackStyle: ExpoHaptics.ImpactFeedbackStyle,
  NotificationFeedbackType: ExpoHaptics.NotificationFeedbackType,
  impactAsync: async (...args: Parameters<typeof ExpoHaptics.impactAsync>) => {
    if (!shouldRunHaptics()) return;
    return ExpoHaptics.impactAsync(...args);
  },
  notificationAsync: async (...args: Parameters<typeof ExpoHaptics.notificationAsync>) => {
    if (!shouldRunHaptics()) return;
    return ExpoHaptics.notificationAsync(...args);
  },
  selectionAsync: async (...args: Parameters<typeof ExpoHaptics.selectionAsync>) => {
    if (!shouldRunHaptics()) return;
    return ExpoHaptics.selectionAsync(...args);
  },
};
