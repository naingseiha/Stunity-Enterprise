/**
 * IG/X-style tab bar button — press-down spring + selection haptic on pressIn
 * (before navigation), so the tap feels instant even if the screen is heavy.
 */

import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { Haptics } from '@/services/haptics';
import { useReducedMotion } from '@/hooks';

const PRESS_SPRING = { damping: 16, stiffness: 420, mass: 0.55 };
const RELEASE_SPRING = { damping: 14, stiffness: 280, mass: 0.7 };

export function PressableTabBarButton({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: BottomTabBarButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      Haptics.selectionAsync();
      if (!reduceMotion) {
        cancelAnimation(scale);
        scale.value = withSpring(0.88, PRESS_SPRING);
      }
      onPressIn?.(e);
    },
    [onPressIn, reduceMotion, scale],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      if (!reduceMotion) {
        cancelAnimation(scale);
        scale.value = withSpring(1, RELEASE_SPRING);
      }
      onPressOut?.(e);
    },
    [onPressOut, reduceMotion, scale],
  );

  return (
    <PlatformPressable
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.pressable, style]}
      android_ripple={{ borderless: true, radius: 28 }}
    >
      <Animated.View style={[styles.inner, animatedStyle]}>{children}</Animated.View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
