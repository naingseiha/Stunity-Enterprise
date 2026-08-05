/**
 * IG-style heart burst — scales in over media on double-tap like.
 * Runs entirely on the UI thread via Reanimated.
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

interface HeartBurstOverlayProps {
  /** Bump this key/token to (re)trigger the burst. 0 = hidden. */
  burstToken: number;
  color?: string;
  size?: number;
  onFinished?: () => void;
}

export function HeartBurstOverlay({
  burstToken,
  color = '#EF4444',
  size = 88,
  onFinished,
}: HeartBurstOverlayProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!burstToken) return;

    cancelAnimation(scale);
    cancelAnimation(opacity);
    scale.value = 0.2;
    opacity.value = 1;

    scale.value = withSequence(
      withSpring(1.2, { damping: 7, stiffness: 220 }),
      withTiming(1, { duration: 90 }),
      withDelay(160, withTiming(1.35, { duration: 220 })),
    );
    opacity.value = withDelay(
      380,
      withTiming(0, { duration: 220 }, (finished) => {
        if (finished && onFinished) {
          runOnJS(onFinished)();
        }
      }),
    );
  }, [burstToken, scale, opacity, onFinished]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!burstToken) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, animatedStyle]}>
      <Ionicons name="heart" size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});
