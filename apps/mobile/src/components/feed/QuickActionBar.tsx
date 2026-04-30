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
import { useThemeContext } from '@/contexts';

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
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const actions: QuickAction[] = [
    {
      id: 'ask',
      icon: 'help-circle',
      label: 'Ask Question',
      bgColor: isDark ? '#1D2B45' : '#EEF2FF',
      textColor: '#4F46E5', // Indigo
      iconColor: '#6366F1', // Vibrant indigo
      onPress: onAskQuestion,
    },
    {
      id: 'buddy',
      icon: 'people',
      label: 'Study Buddy',
      bgColor: isDark ? '#3A1830' : '#FCE7F3',
      textColor: '#BE185D', // Dark pink
      iconColor: '#EC4899', // Vibrant pink
      onPress: onFindStudyBuddy,
    },
    {
      id: 'challenge',
      icon: 'trophy',
      label: 'Daily Challenge',
      bgColor: isDark ? '#0F2F37' : '#E0F2FE',
      textColor: '#B45309', // Dark amber
      iconColor: '#0EA5E9', // Vibrant amber
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.card,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    ...Shadows.sm,
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
