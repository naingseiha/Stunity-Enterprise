/**
 * Reanimated press feedback for feed action icons (like / comment / share / …).
 * Runs on the UI thread so rapid taps never hitch FlashList scroll.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { formatNumber } from '@/utils';

export interface AnimatedActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  count?: number;
  color: string;
  activeColor: string;
  onPress: () => void;
  onLongPress?: () => void;
  size?: number;
  hitSlop?: number;
  accessibilityLabel: string;
  /** Optional style overrides when used outside PostCard's StyleSheet. */
  pressableStyle?: ViewStyle;
  textStyle?: TextStyle;
  activeTextStyle?: TextStyle;
}

export const AnimatedActionButton = React.memo<AnimatedActionButtonProps>(({
  icon,
  activeIcon,
  active = false,
  count,
  color,
  activeColor,
  onPress,
  onLongPress,
  size = 20,
  hitSlop = 12,
  accessibilityLabel,
  pressableStyle,
  textStyle,
  activeTextStyle,
}) => {
  const scale = useSharedValue(1);
  const haloScale = useSharedValue(0.75);
  const haloOpacity = useSharedValue(0);
  const countY = useSharedValue(0);
  const countOpacity = useSharedValue(1);
  const prevCountRef = useRef(count);
  const displayColor = active ? activeColor : color;

  useEffect(() => {
    const prev = prevCountRef.current;
    if (prev === count) return;
    const prevN = prev ?? 0;
    const nextN = count ?? 0;
    if (prevN === nextN) {
      prevCountRef.current = count;
      return;
    }
    const goingUp = nextN > prevN;
    cancelAnimation(countY);
    cancelAnimation(countOpacity);
    countY.value = goingUp ? 7 : -7;
    countOpacity.value = 0;
    countY.value = withSpring(0, { damping: 14, stiffness: 220 });
    countOpacity.value = withTiming(1, { duration: 160 });
    prevCountRef.current = count;
  }, [count, countY, countOpacity]);

  const haloAnimatedStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const countAnimatedStyle = useAnimatedStyle(() => ({
    opacity: countOpacity.value,
    transform: [{ translateY: countY.value }],
  }));

  const animatePress = useCallback(() => {
    cancelAnimation(scale);
    cancelAnimation(haloScale);
    cancelAnimation(haloOpacity);

    scale.value = 0.92;
    haloScale.value = 0.7;
    haloOpacity.value = active ? 0.28 : 0.18;

    scale.value = withSpring(active ? 1.18 : 1.1, { damping: 4, stiffness: 180 }, (finished) => {
      if (finished) {
        scale.value = withSpring(1, { damping: 6, stiffness: 150 });
      }
    });
    haloScale.value = withTiming(1.85, { duration: 260 });
    haloOpacity.value = withTiming(0, { duration: 260 });
  }, [active, scale, haloScale, haloOpacity]);

  const handlePressIn = useCallback(() => {
    cancelAnimation(scale);
    scale.value = withTiming(0.86, { duration: 45 });
  }, [scale]);

  const handlePress = useCallback(() => {
    animatePress();
    onPress();
  }, [animatePress, onPress]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={220}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.pressable, pressableStyle]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { backgroundColor: activeColor }, haloAnimatedStyle]}
      />
      <Animated.View style={[styles.inner, buttonAnimatedStyle]}>
        <Ionicons
          name={active && activeIcon ? activeIcon : icon}
          size={size}
          color={displayColor}
        />
        {!!count && count > 0 && (
          <Animated.Text
            style={[
              styles.countText,
              textStyle,
              active && (activeTextStyle || { color: activeColor }),
              countAnimatedStyle,
            ]}
          >
            {formatNumber(count)}
          </Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

AnimatedActionButton.displayName = 'AnimatedActionButton';

const styles = StyleSheet.create({
  pressable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 3,
    paddingVertical: 5,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 16,
  },
});
