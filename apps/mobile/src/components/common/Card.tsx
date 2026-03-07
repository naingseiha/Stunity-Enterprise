/**
 * Card Component
 *
 * Flexible card container with shadows and press animation
 * Uses built-in Animated API (no Reanimated) to prevent worklet crash on Android
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
  PressableProps,
  Animated,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/config';

interface CardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: keyof typeof Spacing | 'none';
  style?: ViewStyle;
  pressable?: boolean;
  animated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 4,
  style,
  pressable = false,
  animated = true,
  onPress,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (animated && pressable) {
      Animated.spring(scale, {
        toValue: 0.98,
        useNativeDriver: true,
        damping: 15,
        stiffness: 400,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && pressable) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 400,
      }).start();
    }
  };

  const cardStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    padding !== 'none' ? { padding: Spacing[padding] } : {},
    style || {},
  ].filter(Boolean) as ViewStyle[];

  if (pressable) {
    return (
      <Animated.View style={[{ transform: [{ scale }] }]}>
        <Pressable
          style={cardStyles}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          {...rest}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: Colors.white,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderColor: Colors.gray[200],
  },
  filled: {
    backgroundColor: Colors.gray[100],
  },
});

export default Card;
