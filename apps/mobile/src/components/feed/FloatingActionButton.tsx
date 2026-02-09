/**
 * FloatingActionButton (FAB) Component
 * 
 * Material Design FAB for quick post creation:
 * - Fixed position bottom-right
 * - Purple gradient background
 * - Always visible (no auto-hide)
 * - Elevation/shadow for prominence
 */

import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Shadows } from '@/config';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
}

export default function FloatingActionButton({
  onPress,
  icon = 'add',
  size = 56,
}: FABProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, { width: size, height: size }]}
    >
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: size / 2 }]}
      >
        <Ionicons name={icon} size={28} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    ...Shadows.lg,
    // Additional elevation for Android
    ...(Platform.OS === 'android' && {
      elevation: 6,
    }),
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
