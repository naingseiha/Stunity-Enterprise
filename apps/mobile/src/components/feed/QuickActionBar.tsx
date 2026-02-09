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
  color: string;
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
      icon: 'help-circle-outline',
      label: 'Ask Question',
      color: '#6366F1', // Purple
      onPress: onAskQuestion,
    },
    {
      id: 'buddy',
      icon: 'people-outline',
      label: 'Study Buddy',
      color: '#8B5CF6', // Violet
      onPress: onFindStudyBuddy,
    },
    {
      id: 'challenge',
      icon: 'trophy-outline',
      label: 'Daily Challenge',
      color: '#EC4899', // Pink
      onPress: onDailyChallenge,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={action.id}
          onPress={action.onPress}
          activeOpacity={0.7}
          style={[
            styles.actionButton,
            index < actions.length - 1 && styles.actionButtonWithMargin,
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
            <Ionicons name={action.icon} size={24} color={action.color} />
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    ...Shadows.sm,
  },
  actionButtonWithMargin: {
    marginRight: 0, // gap handles spacing now
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: Typography.fontFamily.semibold,
  },
});
