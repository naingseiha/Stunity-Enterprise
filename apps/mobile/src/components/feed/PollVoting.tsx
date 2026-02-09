/**
 * PollVoting Component
 * 
 * X/Twitter-style poll design with:
 * - Fully rounded pill buttons
 * - Pastel colors (green for selected, purple/gray for others)
 * - Vote avatars and percentages
 * - Clean, minimal design
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

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
}

export const PollVoting: React.FC<PollVotingProps> = ({
  options,
  userVotedOptionId,
  onVote,
  disabled = false,
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
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  };

  const handleVote = (optionId: string) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalVote(optionId);
    onVote(optionId);
  };

  // Get background color based on selection and vote count
  const getBackgroundColor = (option: PollOption, isSelected: boolean) => {
    if (!hasVoted) return '#F7F9FC';
    if (isSelected) return '#D4F4DD'; // Light green for selected
    
    const percentage = getPercentage(option);
    if (percentage >= 30) return '#E5DEFF'; // Light purple for high votes
    if (percentage >= 15) return '#F0F0F0'; // Light gray for medium
    return '#FAFAFA'; // Very light gray for low votes
  };

  const renderOption = (option: PollOption, index: number) => {
    const votes = option.votes || option._count?.votes || 0;
    const percentage = getPercentage(option);
    const isSelected = localVote === option.id;
    const backgroundColor = getBackgroundColor(option, isSelected);
    
    // Animation
    const scale = useSharedValue(1);
    const animatedScale = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <TouchableOpacity
        key={option.id}
        activeOpacity={0.8}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={() => handleVote(option.id)}
        style={styles.optionWrapper}
      >
        <Animated.View style={[styles.option, { backgroundColor }, animatedScale]}>
          {/* Left side: Checkmark + Text */}
          <View style={styles.optionLeft}>
            {isSelected && hasVoted && (
              <Ionicons name="checkmark" size={20} color="#34C759" style={styles.checkmark} />
            )}
            <Text style={[styles.optionText, isSelected && hasVoted && styles.optionTextSelected]}>
              {option.text}
            </Text>
          </View>

          {/* Right side: Percentage (+ avatars placeholder) */}
          {hasVoted && (
            <View style={styles.optionRight}>
              <Text style={[styles.percentage, isSelected && styles.percentageSelected]}>
                {percentage}%
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Vote count and hint */}
      <View style={styles.header}>
        <Text style={styles.voteCount}>
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.hint}>
          {hasVoted ? 'Tap to change your vote' : 'Vote to see results'}
        </Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => renderOption(option, index))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="eye-outline" size={16} color="#8E8E93" />
          <Text style={styles.footerText}>Open Voting</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },

  // Header with vote count
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
  },
  dot: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 6,
  },
  hint: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
  },

  // Options Container
  optionsContainer: {
    gap: 12,
  },

  // Option Wrapper
  optionWrapper: {
    marginBottom: 0,
  },

  // Option - Fully Rounded Pill (like X/Twitter)
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 50, // Fully rounded!
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },

  // Left side - Checkmark + Text
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkmark: {
    marginRight: 4,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#000000',
  },

  // Right side - Percentage
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  percentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  percentageSelected: {
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 2,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
  },
});
