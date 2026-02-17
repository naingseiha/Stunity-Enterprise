/**
 * PollVoting Component
 * 
 * X/Twitter-style poll design with:
 * - Fully rounded pill buttons
 * - Progress bars behind text
 * - Sky Blue for selected/winning option
 * - Clean, minimal design
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
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

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

  const renderOption = (option: PollOption) => {
    const percentage = getPercentage(option);
    const isSelected = localVote === option.id;
    const isWinner = isFinal && option.id === winningOptionId;

    // Check if this option should be highlighted (selected or winner)
    const isHighlighted = isSelected || isWinner;

    // Progress Bar Style
    const progressBarStyle = {
      width: `${percentage}%`,
      backgroundColor: isHighlighted ? 'rgba(14, 165, 233, 0.2)' : 'rgba(243, 244, 246, 1)', // Sky blue tint or Gray
    } as any;

    // Text & Checkmark Color
    const textColor = '#1F2937'; // Dark gray
    const iconColor = isHighlighted ? '#0EA5E9' : '#1F2937';
    const fontWeight = isSelected ? '700' : '500';

    return (
      <TouchableOpacity
        key={option.id}
        activeOpacity={0.9} // Less fade on press
        disabled={disabled || hasVoted || isFinal}
        onPress={() => handleVote(option.id)}
        style={styles.optionContainer}
      >
        <View style={[styles.optionContent, !hasVoted && styles.optionContentOutline]}>
          {/* Progress Bar Background (Only show if voted) */}
          {hasVoted && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[
                styles.progressBar,
                progressBarStyle,
                // If 100%, round right corners too
                percentage === 100 && { borderTopRightRadius: 12, borderBottomRightRadius: 12 }
              ]}
            />
          )}

          {/* Text Content */}
          <View style={styles.textContent}>
            <View style={styles.leftGroup}>
              {/* Checkmark for winner or selected */}
              {hasVoted && isHighlighted && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#0EA5E9"
                  style={{ marginRight: 6 }}
                />
              )}
              <Text style={[styles.optionText, { color: textColor, fontWeight }]}>
                {option.text}
              </Text>
            </View>

            {/* Percentage (Only show if voted) */}
            {hasVoted && (
              <Text style={[styles.percentageText, { fontWeight: isHighlighted ? '700' : '500' }]}>
                {percentage}%
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Options List */}
      <View style={styles.optionsList}>
        {options.map((option) => renderOption(option))}
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
    gap: 8,
  },
  optionContainer: {
    height: 44, // Clean height
    borderRadius: 12, // Rounded corners (not full pill for progress bar look)
    overflow: 'hidden',
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 12,
  },
  optionContentOutline: {
    borderWidth: 1.5, // Thicker border for better visibility
    borderColor: '#0EA5E9', // Sky Blue border to indicate interactivity
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  textContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1, // Ensure text is above progress bar
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    color: '#1F2937',
  },
  percentageText: {
    fontSize: 15,
    color: '#1F2937',
  },
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
