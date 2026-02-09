/**
 * EmptyState Component
 * 
 * Beautiful empty state designs for various scenarios:
 * - No posts in feed
 * - No search results
 * - No notifications
 * - First-time user experience
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface EmptyStateProps {
  type?: 'posts' | 'search' | 'notifications' | 'comments' | 'generic';
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const EMPTY_STATES = {
  posts: {
    icon: 'document-text-outline' as const,
    title: 'No Posts Yet',
    message: 'Be the first to share something with the community!',
    actionLabel: 'Create Post' as string | undefined,
    gradient: ['#EEF2FF', '#E0E7FF'],
    iconColor: '#6366F1',
  },
  search: {
    icon: 'search-outline' as const,
    title: 'No Results Found',
    message: 'Try adjusting your search or filters to find what you\'re looking for.',
    actionLabel: 'Clear Filters' as string | undefined,
    gradient: ['#FEF3C7', '#FDE68A'],
    iconColor: '#F59E0B',
  },
  notifications: {
    icon: 'notifications-outline' as const,
    title: 'No Notifications',
    message: 'You\'re all caught up! Check back later for updates.',
    actionLabel: undefined as string | undefined,
    gradient: ['#D1FAE5', '#A7F3D0'],
    iconColor: '#10B981',
  },
  comments: {
    icon: 'chatbubbles-outline' as const,
    title: 'No Comments Yet',
    message: 'Be the first to share your thoughts on this post.',
    actionLabel: 'Add Comment' as string | undefined,
    gradient: ['#FCE7F3', '#FBCFE8'],
    iconColor: '#EC4899',
  },
  generic: {
    icon: 'file-tray-outline' as const,
    title: 'Nothing Here',
    message: 'There\'s no content available at the moment.',
    actionLabel: undefined as string | undefined,
    gradient: ['#F3F4F6', '#E5E7EB'],
    iconColor: '#6B7280',
  },
};

export default function EmptyState({
  type = 'generic',
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  const config = EMPTY_STATES[type];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayIcon = icon || config.icon;
  const displayActionLabel = actionLabel || config.actionLabel;

  return (
    <Animated.View 
      entering={FadeInDown.duration(500)}
      style={styles.container}
    >
      {/* Icon Container with Gradient Background */}
      <LinearGradient
        colors={config.gradient as [string, string, ...string[]]}
        style={styles.iconContainer}
      >
        <Ionicons 
          name={displayIcon} 
          size={64} 
          color={config.iconColor}
        />
      </LinearGradient>

      {/* Title */}
      <Text style={styles.title}>{displayTitle}</Text>

      {/* Message */}
      <Text style={styles.message}>{displayMessage}</Text>

      {/* Action Button */}
      {displayActionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionText}>{displayActionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
