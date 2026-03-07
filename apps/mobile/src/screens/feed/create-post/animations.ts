/**
 * Animation utilities for post creation
 * Smooth transitions, haptic feedback, and visual effects
 */

import { Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

// Animation configurations
export const ANIMATION_CONFIGS = {
  // Fast snappy animations for buttons
  quick: {
    duration: 200,
    easing: Easing.out(Easing.quad),
  },

  // Medium animations for transitions
  medium: {
    duration: 300,
    easing: Easing.inOut(Easing.ease),
  },

  // Smooth spring animations for natural feel
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 0.5,
  },

  // Bounce effect for success states
  bounce: {
    damping: 10,
    stiffness: 100,
    mass: 0.8,
  },
};

// Preset animations
export const animations = {};

// Haptic feedback helpers
export const haptics = {
  // Light tap feedback
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium impact
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy impact
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Selection feedback (for switches, pickers)
  selection: () => Haptics.selectionAsync(),

  // Success notification
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Error notification
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  // Warning notification
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

// Layout animation presets
export const layoutAnimations = {};

// Success animation sequence
export const successSequence = async (onComplete?: () => void) => {
  await haptics.success();
  setTimeout(() => {
    onComplete?.();
  }, 300);
};

// Error animation sequence
export const errorSequence = async () => {
  await haptics.error();
};
