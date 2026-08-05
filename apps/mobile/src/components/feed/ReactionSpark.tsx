/**
 * Tiny reaction spark — pops the picked reaction icon above the like button.
 * Used for CELEBRATE / INSIGHTFUL / SMART_TAKE delight (kept light).
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface ReactionSparkProps {
  token: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onFinished?: () => void;
}

export function ReactionSpark({ token, icon, color, onFinished }: ReactionSparkProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!token) return;

    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(opacity);

    translateY.value = 8;
    scale.value = 0.4;
    opacity.value = 1;

    translateY.value = withSequence(
      withSpring(-28, { damping: 12, stiffness: 180 }),
      withDelay(120, withTiming(-42, { duration: 220 })),
    );
    scale.value = withSpring(1.15, { damping: 10, stiffness: 200 });
    opacity.value = withDelay(
      280,
      withTiming(0, { duration: 200 }, (finished) => {
        if (finished && onFinished) runOnJS(onFinished)();
      }),
    );
  }, [token, translateY, scale, opacity, onFinished]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!token) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.spark, style]}>
      <Ionicons name={icon} size={22} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spark: {
    position: 'absolute',
    bottom: 36,
    left: 6,
    zIndex: 30,
  },
});
