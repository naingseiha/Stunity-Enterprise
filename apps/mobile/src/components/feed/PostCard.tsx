/**
 * PostCard Component
 * 
 * V1 App Design:
 * - White cards with floating shadow
 * - Author header with verification badge and type badge
 * - Large rounded images
 * - Stats row with star/flame/user icons
 * - Info section showing post type details
 * - Clean action bar (like, comment, analytics, share, bookmark)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Post } from '@/types';
import { formatRelativeTime, formatNumber } from '@/utils';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  onUserPress?: () => void;
  onPress?: () => void;
}

// Post type configurations - V1 style with gradients
const POST_TYPE_CONFIG: Record<string, { 
  icon: string; 
  label: string; 
  color: string; 
  bgColor: string;
  ctaLabel: string;
  gradient: [string, string];
}> = {
  ARTICLE: { icon: 'document-text', label: 'Article', color: '#10B981', bgColor: '#D1FAE5', ctaLabel: 'Read Article', gradient: ['#10B981', '#059669'] },
  QUESTION: { icon: 'help-circle', label: 'Question', color: '#14B8A6', bgColor: '#CCFBF1', ctaLabel: 'Answer', gradient: ['#14B8A6', '#0D9488'] },
  ANNOUNCEMENT: { icon: 'megaphone', label: 'Announcement', color: '#F97316', bgColor: '#FFEDD5', ctaLabel: 'View Details', gradient: ['#F97316', '#EA580C'] },
  POLL: { icon: 'stats-chart', label: 'Poll', color: '#8B5CF6', bgColor: '#EDE9FE', ctaLabel: 'Vote Now', gradient: ['#8B5CF6', '#7C3AED'] },
  ACHIEVEMENT: { icon: 'trophy', label: 'Achievement', color: '#F59E0B', bgColor: '#FEF3C7', ctaLabel: 'Celebrate', gradient: ['#F59E0B', '#D97706'] },
  PROJECT: { icon: 'folder', label: 'Project', color: '#F97316', bgColor: '#FFEDD5', ctaLabel: 'View Project', gradient: ['#F97316', '#EA580C'] },
  COURSE: { icon: 'book', label: 'Course', color: '#3B82F6', bgColor: '#DBEAFE', ctaLabel: 'Enroll Now', gradient: ['#3B82F6', '#2563EB'] },
  EVENT: { icon: 'calendar', label: 'Event', color: '#EC4899', bgColor: '#FCE7F3', ctaLabel: 'Join Event', gradient: ['#EC4899', '#DB2777'] },
  QUIZ: { icon: 'bulb', label: 'Quiz', color: '#10B981', bgColor: '#D1FAE5', ctaLabel: 'Take Quiz', gradient: ['#10B981', '#059669'] },
  EXAM: { icon: 'clipboard', label: 'Exam', color: '#EF4444', bgColor: '#FEE2E2', ctaLabel: 'View Exam Details', gradient: ['#EF4444', '#DC2626'] },
  ASSIGNMENT: { icon: 'book-outline', label: 'Assignment', color: '#3B82F6', bgColor: '#DBEAFE', ctaLabel: 'Start Assignment', gradient: ['#3B82F6', '#2563EB'] },
  RESOURCE: { icon: 'folder-open', label: 'Resource', color: '#6366F1', bgColor: '#EEF2FF', ctaLabel: 'Download', gradient: ['#6366F1', '#4F46E5'] },
  TUTORIAL: { icon: 'play-circle', label: 'Tutorial', color: '#06B6D4', bgColor: '#CFFAFE', ctaLabel: 'Watch Tutorial', gradient: ['#06B6D4', '#0891B2'] },
  RESEARCH: { icon: 'flask', label: 'Research', color: '#8B5CF6', bgColor: '#EDE9FE', ctaLabel: 'View Research', gradient: ['#8B5CF6', '#7C3AED'] },
  REFLECTION: { icon: 'bulb', label: 'Reflection', color: '#84CC16', bgColor: '#ECFCCB', ctaLabel: 'Read More', gradient: ['#84CC16', '#65A30D'] },
  COLLABORATION: { icon: 'people', label: 'Collaboration', color: '#EC4899', bgColor: '#FCE7F3', ctaLabel: 'Join Team', gradient: ['#EC4899', '#DB2777'] },
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onUserPress,
  onPress,
}) => {
  const [liked, setLiked] = useState(post.isLiked);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);
  const [likeCount, setLikeCount] = useState(post.likes);

  const likeScale = useSharedValue(1);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeScale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );

    if (liked) {
      setLikeCount((prev) => prev - 1);
    } else {
      setLikeCount((prev) => prev + 1);
    }
    setLiked(!liked);
    onLike?.();
  };

  const handleBookmark = () => {
    Haptics.selectionAsync();
    setBookmarked(!bookmarked);
    onBookmark?.();
  };

  const typeConfig = POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE;
  const authorName = post.author.name || `${post.author.firstName} ${post.author.lastName}`;

  return (
    <View style={styles.container}>
      {/* Author Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onUserPress} style={styles.authorSection}>
          <Avatar
            uri={post.author.profilePictureUrl}
            name={authorName}
            size="md"
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorRow}>
              <Text style={styles.authorName}>{authorName}</Text>
              {post.author.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
            <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        
        {/* XP Badge - Performance reward */}
        <View style={styles.xpBadge}>
          <Ionicons name="sparkles" size={14} color="#F59E0B" />
          <Text style={styles.xpBadgeText}>+{Math.floor(Math.random() * 20) + 5} XP</Text>
        </View>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Media - Rounded corners matching V1 */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.mediaWrapper}>
          <Image
            source={{ uri: post.mediaUrls[0] }}
            style={styles.mediaImage}
            contentFit="cover"
            transition={200}
          />
          {post.mediaUrls.length > 1 && (
            <View style={styles.mediaCounter}>
              <Text style={styles.mediaCounterText}>1/{post.mediaUrls.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Content */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.contentSection}>
        <Text style={styles.contentText} numberOfLines={3}>
          {post.content}
        </Text>

        {/* Stats Row - Clean simple style */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="star" size={15} color="#F59E0B" />
            <Text style={styles.statText}>+{Math.floor(Math.random() * 50) + 10}</Text>
          </View>
          <Text style={styles.statDot}>•</Text>
          <View style={styles.stat}>
            <Ionicons name="flame" size={15} color="#F97316" />
            <Text style={styles.statText}>{Math.floor(Math.random() * 7) + 1}d</Text>
          </View>
          <Text style={styles.statDot}>•</Text>
          <Ionicons name="people-outline" size={15} color="#9CA3AF" />
        </View>
      </TouchableOpacity>

      {/* Info Section - V1 style (shows type info, field, collaborators) */}
      <View style={styles.infoSection}>
        <View style={[styles.infoIcon, { backgroundColor: typeConfig.bgColor }]}>
          <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{typeConfig.label}</Text>
          <Text style={styles.infoSubtitle}>Field: សិក្សា</Text>
          <Text style={styles.infoCollaborators}>Collaborators: {authorName}</Text>
        </View>
      </View>

      {/* Action Bar - Like, Value, Comment, Share, Bookmark */}
      <View style={styles.actionBar}>
        {/* Like */}
        <Animated.View style={[likeAnimatedStyle, styles.actionButton]}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButtonInner}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#EF4444' : '#6B7280'}
            />
            {likeCount > 0 && (
              <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
                {formatNumber(likeCount)}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Value */}
        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.actionButtonInner}>
            <Ionicons name="star-outline" size={22} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity onPress={onComment} style={styles.actionButton}>
          <View style={styles.actionButtonInner}>
            <Ionicons name="chatbubble-outline" size={22} color="#6B7280" />
            {post.comments > 0 && (
              <Text style={styles.actionText}>{formatNumber(post.comments)}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity onPress={onShare} style={styles.actionButton}>
          <View style={styles.actionButtonInner}>
            <Ionicons name="share-outline" size={22} color="#6B7280" />
            {post.shares > 0 && (
              <Text style={styles.actionText}>{formatNumber(post.shares)}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity onPress={handleBookmark} style={styles.actionButton}>
          <View style={styles.actionButtonInner}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={bookmarked ? '#F59E0B' : '#6B7280'}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'visible',
    // Soft neutral shadow - clean floating effect
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  authorSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    gap: 4,
    marginRight: 4,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  moreButton: {
    padding: 6,
  },
  mediaWrapper: {
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F3F4F6',
  },
  mediaCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mediaCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  contentText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  statDot: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  infoSection: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 2,
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#F8F7FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoCollaborators: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionTextLiked: {
    color: '#EF4444',
  },
});

export default PostCard;
