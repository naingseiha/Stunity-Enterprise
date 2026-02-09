/**
 * QuickActionBar Component
 * 
 * Provides quick access to key e-learning actions:
 * - Ask Question
 * - Find Study Buddy
 * - Daily Challenge
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Shadows } from '@/config';

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  onPress: () => void;
}

interface QuickActionBarProps {
  onAskQuestion: () => void;
  onFindStudyBuddy: () => void;
  onDailyChallenge: () => void;
}

export default function QuickActionBar({
  onAskQuestion,
  onFindStudyBuddy,
  onDailyChallenge,
}: QuickActionBarProps) {
  const actions: QuickAction[] = [
    {
      id: 'ask',
      icon: 'help-circle',
      label: 'Ask Question',
      bgColor: '#EEF2FF', // Light indigo
      textColor: '#4F46E5', // Indigo
      iconColor: '#6366F1', // Vibrant indigo
      onPress: onAskQuestion,
    },
    {
      id: 'buddy',
      icon: 'people',
      label: 'Study Buddy',
      bgColor: '#FCE7F3', // Light pink
      textColor: '#BE185D', // Dark pink
      iconColor: '#EC4899', // Vibrant pink
      onPress: onFindStudyBuddy,
    },
    {
      id: 'challenge',
      icon: 'trophy',
      label: 'Daily Challenge',
      bgColor: '#FEF3C7', // Light amber
      textColor: '#B45309', // Dark amber
      iconColor: '#F59E0B', // Vibrant amber
      onPress: onDailyChallenge,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          onPress={action.onPress}
          activeOpacity={0.7}
          style={[
            styles.actionButton,
            { backgroundColor: action.bgColor },
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={action.icon} size={22} color={action.iconColor} />
          </View>
          <Text style={[styles.actionLabel, { color: action.textColor }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...Shadows.sm,
  },
  iconContainer: {
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.semibold,
    textAlign: 'center',
  },
});
