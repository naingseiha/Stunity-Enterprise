/**
 * Card Component
 * 
 * Flexible card container with shadows and press animation
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
  PressableProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Shadows } from '@/config';

interface CardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: keyof typeof Spacing | 'none';
  style?: ViewStyle;
  pressable?: boolean;
  animated?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (animated && pressable) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (animated && pressable) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  const cardStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    padding !== 'none' && { padding: Spacing[padding] },
    style,
  ];

  if (pressable) {
    return (
      <AnimatedPressable
        style={[cardStyles, animated && animatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        {...rest}
      >
        {children}
      </AnimatedPressable>
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
    ...Shadows.md,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  filled: {
    backgroundColor: Colors.gray[100],
  },
});

export default Card;
