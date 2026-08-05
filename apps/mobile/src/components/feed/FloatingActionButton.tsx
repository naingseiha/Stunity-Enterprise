/**
 * FloatingActionButton (FAB) — create shortcut with Reanimated press spring.
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptics } from '@/services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
  /** Extra offset above the home indicator / tab bar. */
  bottomOffset?: number;
}

export default function FloatingActionButton({
  onPress,
  icon = 'add',
  size = 58,
  bottomOffset = 16,
}: FABProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    cancelAnimation(scale);
    scale.value = withSpring(0.9, { damping: 14, stiffness: 320 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    cancelAnimation(scale);
    scale.value = withSpring(1, { damping: 10, stiffness: 220 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          bottom: Math.max(insets.bottom, 12) + bottomOffset,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel="Create post"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        <LinearGradient
          colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: size / 2 }]}
        >
          <Ionicons name={icon} size={28} color="#fff" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    zIndex: 20,
    ...(Platform.OS === 'android' && {
      elevation: 8,
    }),
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
