/**
 * Standard back control — matches Comments, Bookmarks, MyPosts headers.
 */

import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Haptics } from '@/services/haptics';
import { ScalePressable } from './ScalePressable';

export interface ScreenBackButtonProps {
  onPress: () => void;
  color: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ScreenBackButton({
  onPress,
  color,
  backgroundColor = 'transparent',
  style,
  accessibilityLabel = 'Back',
}: ScreenBackButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <ScalePressable
      pressScale={0.9}
      onPress={handlePress}
      style={[styles.backButton, { backgroundColor }, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="chevron-back" size={22} color={color} />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
});

export default ScreenBackButton;
