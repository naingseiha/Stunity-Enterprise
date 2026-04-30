/**
 * Animated Button Component
 * Button with smooth press animation and haptic feedback
 */

import React, { useRef } from 'react';
import { useThemeContext } from '@/contexts';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Animated } from 'react-native';
import { haptics } from '../animations';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function AnimatedButton({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: AnimatedButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      haptics.light();
      Animated.spring(scale, { toValue: 0.95, friction: 5, tension: 150, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }).start();
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      haptics.medium();
      // Subtle pulse animation
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.95, friction: 5, tension: 150, useNativeDriver: true }), Animated.spring(scale, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true })
      ]).start();
      onPress();
    }
  };

  const getBackgroundColor = () => {
    if (disabled || loading) return '#E5E7EB';

    switch (variant) {
      case 'primary':
        return '#6366F1';
      case 'secondary':
        return '#F3F4F6';
      case 'danger':
        return '#EF4444';
      case 'success':
        return '#10B981';
      default:
        return '#6366F1';
    }
  };

  const getTextColor = () => {
    if (disabled || loading) return '#9CA3AF';
    return variant === 'secondary' ? '#374151' : '#FFFFFF';
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        style,
        { transform: [{ scale }] },
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 48,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
