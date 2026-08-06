/**
 * Reanimated press feedback — immediate scale + opacity on touch-down.
 * Runs on the UI thread so FlashList scroll stays smooth during taps.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Target scale while finger is down. Default 0.97 */
  pressScale?: number;
  /** Brief opacity dip on press. Default true */
  pressOpacity?: boolean;
  children: React.ReactNode;
}

export const ScalePressable = React.memo(function ScalePressable({
  style,
  pressScale = 0.97,
  pressOpacity = true,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: ScalePressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (disabled) return;
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withSpring(pressScale, { damping: 18, stiffness: 420 });
      if (pressOpacity) {
        opacity.value = withTiming(0.9, { duration: 70 });
      }
      onPressIn?.(event);
    },
    [disabled, onPressIn, opacity, pressOpacity, pressScale, scale],
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      if (pressOpacity) {
        opacity.value = withTiming(1, { duration: 110 });
      }
      onPressOut?.(event);
    },
    [onPressOut, opacity, pressOpacity, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});

ScalePressable.displayName = 'ScalePressable';
