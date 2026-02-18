/**
 * PollVoting Component
 * 
 * Premium poll design with:
 * - Fully rounded pill buttons
 * - Beautiful gradient fill for voted progress
 * - Each option has a unique vibrant color
 * - Clean, attractive design with smooth animations
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PollOption {
  id: string;
  text: string;
  votes?: number;
  _count?: { votes: number };
}

interface PollVotingProps {
  options: PollOption[];
  userVotedOptionId?: string;
  onVote: (optionId: string) => void;
  disabled?: boolean;
  endsAt?: string; // ISO Date string
}

// Beautiful color palette for poll options
const OPTION_COLORS = [
  { border: '#6366F1', bg: '#EEF2FF', fill: ['#818CF8', '#6366F1'] as [string, string], text: '#4338CA' },
  { border: '#EC4899', bg: '#FCE7F3', fill: ['#F472B6', '#EC4899'] as [string, string], text: '#BE185D' },
  { border: '#10B981', bg: '#D1FAE5', fill: ['#34D399', '#10B981'] as [string, string], text: '#047857' },
  { border: '#F59E0B', bg: '#FEF3C7', fill: ['#FBBF24', '#F59E0B'] as [string, string], text: '#B45309' },
  { border: '#3B82F6', bg: '#DBEAFE', fill: ['#60A5FA', '#3B82F6'] as [string, string], text: '#1D4ED8' },
  { border: '#8B5CF6', bg: '#EDE9FE', fill: ['#A78BFA', '#8B5CF6'] as [string, string], text: '#6D28D9' },
];

export const PollVoting: React.FC<PollVotingProps> = ({
  options,
  userVotedOptionId,
  onVote,
  disabled = false,
  endsAt,
}) => {
  const [localVote, setLocalVote] = useState(userVotedOptionId);
  const hasVoted = !!localVote;

  // Update local vote when prop changes
  useEffect(() => {
    setLocalVote(userVotedOptionId);
  }, [userVotedOptionId]);

  // Calculate total votes and percentages
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || opt._count?.votes || 0), 0);

  const getPercentage = (option: PollOption) => {
    const votes = option.votes || option._count?.votes || 0;
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  // Find the winning option (most votes)
  const winningOptionId = options.reduce((prev, current) => {
    const prevVotes = prev.votes || prev._count?.votes || 0;
    const currentVotes = current.votes || current._count?.votes || 0;
    return (prevVotes > currentVotes) ? prev : current;
  }, options[0]).id;

  const handleVote = (optionId: string) => {
    if (disabled || hasVoted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLocalVote(optionId);
    onVote(optionId);
  };

  // Calculate time remaining string
  const getTimeRemaining = () => {
    if (!endsAt) return 'Open voting';
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Final results';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} left`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;

    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
  };

  const timeText = getTimeRemaining();
  const isFinal = timeText === 'Final results';

  const renderOption = (option: PollOption, index: number) => {
    const percentage = getPercentage(option);
    const isSelected = localVote === option.id;
    const isWinner = isFinal && option.id === winningOptionId;
    const isHighlighted = isSelected || isWinner;
    const colorSet = OPTION_COLORS[index % OPTION_COLORS.length];

    if (!hasVoted && !isFinal) {
      // Unvoted state — beautiful rounded pill buttons with colored borders
      return (
        <TouchableOpacity
          key={option.id}
          activeOpacity={0.75}
          disabled={disabled}
          onPress={() => handleVote(option.id)}
          style={[styles.optionPill, { borderColor: colorSet.border, backgroundColor: colorSet.bg }]}
        >
          <View style={[styles.optionDot, { backgroundColor: colorSet.border }]} />
          <Text style={[styles.optionText, { color: colorSet.text }]}>
            {option.text}
          </Text>
        </TouchableOpacity>
      );
    }

    // Voted state — show progress with gradient fill
    return (
      <Animated.View
        key={option.id}
        entering={FadeIn.duration(300)}
        style={styles.resultContainer}
      >
        <View style={[styles.resultPill, isHighlighted && { borderColor: colorSet.border, borderWidth: 2 }]}>
          {/* Progress fill */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[styles.progressFill, { width: `${Math.max(percentage, 2)}%` }]}
          >
            <LinearGradient
              colors={isHighlighted ? colorSet.fill : ['#F3F4F6', '#E5E7EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressGradient}
            />
          </Animated.View>

          {/* Content */}
          <View style={styles.resultContent}>
            <View style={styles.resultLeft}>
              {isHighlighted && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colorSet.border}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text style={[
                styles.resultText,
                isHighlighted && { fontWeight: '700', color: colorSet.text },
              ]}>
                {option.text}
              </Text>
            </View>
            <Text style={[
              styles.percentText,
              isHighlighted && { fontWeight: '800', color: colorSet.text },
            ]}>
              {percentage}%
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Options List */}
      <View style={styles.optionsList}>
        {options.map((option, index) => renderOption(option, index))}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.voteCount}>
          {totalVotes.toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'}
        </Text>
        <Text style={styles.dot}>•</Text>
        <Text style={[styles.timeRemaining, isFinal && styles.finalText]}>
          {timeText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  optionsList: {
    gap: 10,
  },

  // ── Unvoted pill buttons ──
  optionPill: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Voted result pills ──
  resultContainer: {
    height: 48,
  },
  resultPill: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 24,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    opacity: 0.25,
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    zIndex: 1,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  percentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  voteCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  dot: {
    fontSize: 13,
    color: '#9CA3AF',
    marginHorizontal: 6,
  },
  timeRemaining: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  finalText: {
    fontWeight: '600',
    color: '#1F2937',
  },
});
