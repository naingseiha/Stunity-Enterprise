/**
 * Animation utilities for post creation
 * Smooth transitions, haptic feedback, and visual effects
 */

import { withSpring, withTiming, Easing } from 'react-native-reanimated';
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
export const animations = {
  // Fade in/out
  fadeIn: () => withTiming(1, ANIMATION_CONFIGS.medium),
  fadeOut: () => withTiming(0, ANIMATION_CONFIGS.medium),
  
  // Scale animations
  scaleIn: () => withSpring(1, ANIMATION_CONFIGS.spring),
  scaleOut: () => withSpring(0.95, ANIMATION_CONFIGS.spring),
  
  // Slide animations
  slideInRight: (value: number) => withTiming(value, ANIMATION_CONFIGS.medium),
  slideOutLeft: (value: number) => withTiming(value, ANIMATION_CONFIGS.medium),
  
  // Height animations
  expandHeight: (value: number) => withSpring(value, ANIMATION_CONFIGS.spring),
  collapseHeight: () => withSpring(0, ANIMATION_CONFIGS.spring),
};

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
export const layoutAnimations = {
  // Smooth height change
  smoothHeight: {
    duration: 300,
    create: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
    update: {
      type: 'spring' as const,
      springDamping: 0.7,
    },
    delete: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
  },
  
  // Quick fade
  quickFade: {
    duration: 200,
    create: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
    update: {
      type: 'easeInEaseOut' as const,
    },
    delete: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
  },
};

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
