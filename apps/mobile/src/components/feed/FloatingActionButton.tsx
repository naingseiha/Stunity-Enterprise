/**
 * FloatingActionButton (FAB) Component — V2 Premium Design
 * 
 * - Purple gradient background with indigo shadow glow
 * - Always visible, bottom-right position
 * - Premium shadow with color-matched glow
 */

import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
}

export default function FloatingActionButton({
  onPress,
  icon = 'add',
  size = 58,
}: FABProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <LinearGradient
        colors={['#818CF8', '#6366F1', '#4F46E5']}
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
    right: 20,
    bottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
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
