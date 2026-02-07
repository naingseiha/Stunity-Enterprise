/**
 * PostCard Component
 * 
 * Matching v1 app design:
 * - Clean white cards with rounded-2xl
 * - Subtle shadow-card shadows
 * - Author info with avatar
 * - Post type badge (minimal)
 * - Engagement buttons with gradient hover states
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

// Post type configurations - minimal style matching v1
const POST_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  ARTICLE: { icon: 'document-text', label: 'Article', color: '#F59E0B', bgColor: '#FEF3C7' },
  QUESTION: { icon: 'help-circle', label: 'Question', color: '#3B82F6', bgColor: '#DBEAFE' },
  ANNOUNCEMENT: { icon: 'megaphone', label: 'Announcement', color: '#EF4444', bgColor: '#FEE2E2' },
  POLL: { icon: 'stats-chart', label: 'Poll', color: '#8B5CF6', bgColor: '#EDE9FE' },
  ACHIEVEMENT: { icon: 'trophy', label: 'Achievement', color: '#F59E0B', bgColor: '#FEF3C7' },
  PROJECT: { icon: 'folder', label: 'Project', color: '#F97316', bgColor: '#FFEDD5' },
  COURSE: { icon: 'book', label: 'Course', color: '#10B981', bgColor: '#D1FAE5' },
  EVENT: { icon: 'calendar', label: 'Event', color: '#EC4899', bgColor: '#FCE7F3' },
  QUIZ: { icon: 'bulb', label: 'Quiz', color: '#10B981', bgColor: '#D1FAE5' },
  EXAM: { icon: 'clipboard', label: 'Exam', color: '#EF4444', bgColor: '#FEE2E2' },
  ASSIGNMENT: { icon: 'book-outline', label: 'Assignment', color: '#F97316', bgColor: '#FFEDD5' },
  RESOURCE: { icon: 'folder-open', label: 'Resource', color: '#6366F1', bgColor: '#EEF2FF' },
  TUTORIAL: { icon: 'play-circle', label: 'Tutorial', color: '#14B8A6', bgColor: '#CCFBF1' },
  RESEARCH: { icon: 'flask', label: 'Research', color: '#8B5CF6', bgColor: '#EDE9FE' },
  REFLECTION: { icon: 'bulb', label: 'Reflection', color: '#F59E0B', bgColor: '#FEF3C7' },
  COLLABORATION: { icon: 'people', label: 'Collaboration', color: '#06B6D4', bgColor: '#CFFAFE' },
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

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
    }
  };

  const typeConfig = POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE;
  const authorName = post.author.name || `${post.author.firstName} ${post.author.lastName}`;

  return (
    <View style={styles.container}>
      {/* Header - Instagram style */}
      <TouchableOpacity onPress={onUserPress} style={styles.header} activeOpacity={0.7}>
        <Avatar
          uri={post.author.profilePictureUrl}
          name={authorName}
          size="md"
          showOnline
          isOnline={post.author.isOnline}
        />
        <View style={styles.headerText}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>{authorName}</Text>
            {post.author.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {formatRelativeTime(post.createdAt)}
            </Text>
          </View>
        </View>
        
        {/* Post Type Badge - minimal v1 style */}
        <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
          <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
          <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
            {typeConfig.label}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Media Gallery - YouTube thumbnail style (16:9) */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: post.mediaUrls[0] }}
            style={styles.singleImage}
            contentFit="cover"
            transition={200}
          />
          {post.mediaUrls.length > 1 && (
            <View style={styles.mediaCounter}>
              <Text style={styles.mediaCounterText}>
                1/{post.mediaUrls.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content Section - Clickable */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.contentSection}>
        {/* Title */}
        <Text style={styles.contentTitle} numberOfLines={2}>
          {post.content.split('\n')[0]}
        </Text>
        
        {/* Description */}
        {post.content.split('\n').length > 1 && (
          <Text style={styles.contentDescription} numberOfLines={3}>
            {post.content.split('\n').slice(1).join('\n')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {post.tags.slice(0, 3).map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Engagement Section - v1 style with gradient hover */}
      <View style={styles.engagementSection}>
        <View style={styles.engagementRow}>
          {/* Like Button */}
          <Animated.View style={likeAnimatedStyle}>
            <TouchableOpacity
              onPress={handleLike}
              style={[
                styles.engagementButton,
                liked && styles.engagementButtonActive,
              ]}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? '#EF4444' : '#6B7280'}
              />
              <Text style={[styles.engagementText, liked && styles.engagementTextActive]}>
                {formatNumber(likeCount)}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Comment Button */}
          <TouchableOpacity onPress={onComment} style={styles.engagementButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
            <Text style={styles.engagementText}>{formatNumber(post.comments)}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity onPress={onShare} style={styles.engagementButton}>
            <Ionicons name="share-social-outline" size={20} color="#6B7280" />
            <Text style={styles.engagementText}>{formatNumber(post.shares)}</Text>
          </TouchableOpacity>

          {/* Bookmark Button - Right aligned */}
          <TouchableOpacity
            onPress={handleBookmark}
            style={[
              styles.bookmarkButton,
              bookmarked && styles.bookmarkButtonActive,
            ]}
          >
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={bookmarked ? '#F59E0B' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    // Clean shadow like v1 shadow-card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreButton: {
    padding: 4,
  },
  mediaContainer: {
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  mediaCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mediaCounterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  contentSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  contentDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '500',
  },
  engagementSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  engagementButtonActive: {
    backgroundColor: '#FEF2F2',
  },
  engagementText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  engagementTextActive: {
    color: '#EF4444',
  },
  bookmarkButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookmarkButtonActive: {
    backgroundColor: '#FFFBEB',
  },
});

export default PostCard;
