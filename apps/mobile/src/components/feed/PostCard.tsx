/**
 * PostCard Component
 * 
 * V1 App Design - Enhanced for E-Learning Social Media:
 * - White cards with floating shadow
 * - Author header with role-based verification badges (Teacher/Student)
 * - Learning progress bars for courses/quizzes
 * - Difficulty level badges
 * - LIVE indicators for ongoing sessions
 * - Deadline alerts for assignments/exams
 * - Topic tags/hashtags
 * - Q&A threading with answer counts
 * - Rich content indicators (PDF, Code, Formula)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Post, DifficultyLevel } from '@/types';
import { useAuthStore } from '@/stores';
import { formatRelativeTime, formatNumber } from '@/utils';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  onUserPress?: () => void;
  onPress?: () => void;
  currentUserId?: string; // Optional: for showing blue tick on current user
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

// Difficulty level configurations
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; labelKh: string; color: string; bgColor: string; icon: string }> = {
  BEGINNER: { label: 'Beginner', labelKh: 'ចាប់ផ្តើម', color: '#10B981', bgColor: '#D1FAE5', icon: 'leaf' },
  INTERMEDIATE: { label: 'Intermediate', labelKh: 'មធ្យម', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'flash' },
  ADVANCED: { label: 'Advanced', labelKh: 'កម្រិតខ្ពស់', color: '#EF4444', bgColor: '#FEE2E2', icon: 'rocket' },
};

// Helper to calculate time remaining
const getTimeRemaining = (deadline: string): { text: string; isUrgent: boolean } => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return { text: 'Expired', isUrgent: true };
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 24) {
    return { text: `${diffHours}h left`, isUrgent: true };
  } else if (diffDays < 7) {
    return { text: `${diffDays}d left`, isUrgent: diffDays <= 2 };
  } else {
    return { text: `${diffDays}d left`, isUrgent: false };
  }
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onUserPress,
  onPress,
  currentUserId,
}) => {
  // Get current user from auth store for blue tick experiment
  const { user: currentUser } = useAuthStore();
  const isCurrentUser = currentUserId ? post.author.id === currentUserId : post.author.id === currentUser?.id;
  
  const [liked, setLiked] = useState(post.isLiked);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showMenu, setShowMenu] = useState(false);
  const [valued, setValued] = useState(false);

  const likeScale = useSharedValue(1);
  const valueScale = useSharedValue(1);
  const livePulse = useSharedValue(1);

  // Animate live indicator
  React.useEffect(() => {
    if (post.learningMeta?.isLive) {
      livePulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [post.learningMeta?.isLive]);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const valueAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));

  const liveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livePulse.value }],
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

  const handleValue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    valueScale.value = withSequence(
      withSpring(1.4, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    setValued(!valued);
  };

  const handleBookmark = () => {
    Haptics.selectionAsync();
    setBookmarked(!bookmarked);
    setShowMenu(false);
    onBookmark?.();
  };

  const handleMenuToggle = () => {
    Haptics.selectionAsync();
    setShowMenu(!showMenu);
  };

  const typeConfig = POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE;
  const authorName = post.author.name || `${post.author.firstName} ${post.author.lastName}`;
  const learningMeta = post.learningMeta;
  
  // Calculate deadline info if present
  const deadlineInfo = useMemo(() => {
    if (learningMeta?.deadline) {
      return getTimeRemaining(learningMeta.deadline);
    }
    return null;
  }, [learningMeta?.deadline]);

  // Check if post shows progress (courses, quizzes, assignments)
  const showProgress = ['COURSE', 'QUIZ', 'ASSIGNMENT', 'TUTORIAL'].includes(post.postType) && 
    learningMeta?.progress !== undefined;

  // Check if this is a Q&A post
  const isQuestion = post.postType === 'QUESTION';

  // Role-based badge
  const getRoleBadge = () => {
    const role = post.author.role;
    if (role === 'TEACHER') {
      return { icon: 'school', color: '#3B82F6', label: 'Teacher' };
    } else if (role === 'ADMIN' || role === 'SCHOOL_ADMIN') {
      return { icon: 'shield-checkmark', color: '#8B5CF6', label: 'Admin' };
    }
    return null;
  };
  
  const roleBadge = getRoleBadge();

  return (
    <View style={styles.container}>
      {/* LIVE Badge - Top Corner */}
      {learningMeta?.isLive && (
        <Animated.View style={[styles.liveBadge, liveAnimatedStyle]}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.liveBadgeGradient}
          >
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
            {learningMeta.liveViewers && (
              <Text style={styles.liveViewers}>{learningMeta.liveViewers}</Text>
            )}
          </LinearGradient>
        </Animated.View>
      )}

      {/* Author Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onUserPress} style={styles.authorSection}>
          <Avatar
            uri={post.author.profilePictureUrl}
            name={authorName}
            size="md"
            gradientBorder="purple"
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorRow}>
              <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
              {/* Twitter-style Verified Badge - Show for verified users OR current user (experiment) */}
              {(post.author.isVerified || isCurrentUser) && (
                <View style={styles.verifiedBadge}>
                  <View style={styles.twitterBlueTick}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                </View>
              )}
              {/* Role Badge (Teacher/Admin) */}
              {roleBadge && (
                <View style={[styles.roleBadge, { backgroundColor: roleBadge.color + '20' }]}>
                  <Ionicons name={roleBadge.icon as any} size={12} color={roleBadge.color} />
                  <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
              {/* Study Group Tag */}
              {learningMeta?.studyGroupName && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.studyGroupTag}>
                    <Ionicons name="people" size={10} color="#8B5CF6" />
                    <Text style={styles.studyGroupText}>{learningMeta.studyGroupName}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Vertical More Menu */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.moreButton} onPress={handleMenuToggle}>
            <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
          </TouchableOpacity>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.menuItem} onPress={handleBookmark}>
                <Ionicons 
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'} 
                  size={18} 
                  color={bookmarked ? '#6366F1' : '#374151'} 
                />
                <Text style={[styles.menuItemText, bookmarked && styles.menuItemTextActive]}>
                  {bookmarked ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                <Ionicons name="flag-outline" size={18} color="#374151" />
                <Text style={styles.menuItemText}>Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                <Ionicons name="eye-off-outline" size={18} color="#374151" />
                <Text style={styles.menuItemText}>Hide</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                <Ionicons name="link-outline" size={18} color="#374151" />
                <Text style={styles.menuItemText}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Deadline Alert Banner */}
      {deadlineInfo && (
        <View style={[styles.deadlineBanner, deadlineInfo.isUrgent && styles.deadlineBannerUrgent]}>
          <Ionicons 
            name={deadlineInfo.isUrgent ? 'warning' : 'time-outline'} 
            size={16} 
            color={deadlineInfo.isUrgent ? '#EF4444' : '#F59E0B'} 
          />
          <Text style={[styles.deadlineText, deadlineInfo.isUrgent && styles.deadlineTextUrgent]}>
            {deadlineInfo.isUrgent ? '⚡ Due soon: ' : 'Due: '}{deadlineInfo.text}
          </Text>
        </View>
      )}

      {/* Media - Rounded corners */}
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
          {/* Rich content indicators on media */}
          {(learningMeta?.hasCode || learningMeta?.hasPdf || learningMeta?.hasFormula) && (
            <View style={styles.richContentIndicators}>
              {learningMeta.hasCode && (
                <View style={styles.richContentBadge}>
                  <Ionicons name="code-slash" size={12} color="#fff" />
                </View>
              )}
              {learningMeta.hasPdf && (
                <View style={styles.richContentBadge}>
                  <Ionicons name="document-text" size={12} color="#fff" />
                </View>
              )}
              {learningMeta.hasFormula && (
                <View style={styles.richContentBadge}>
                  <Text style={styles.formulaIcon}>∑</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Content - Below image */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.contentSection}>
        <Text style={styles.contentText} numberOfLines={4}>
          {post.content}
        </Text>
      </TouchableOpacity>

      {/* Topic Tags */}
      {post.topicTags && post.topicTags.length > 0 && (
        <View style={styles.topicTagsContainer}>
          {post.topicTags.slice(0, 4).map((tag, index) => (
            <TouchableOpacity key={index} style={styles.topicTag}>
              <Text style={styles.topicTagText}>#{tag}</Text>
            </TouchableOpacity>
          ))}
          {post.topicTags.length > 4 && (
            <Text style={styles.moreTagsText}>+{post.topicTags.length - 4}</Text>
          )}
        </View>
      )}

      {/* Q&A Section - For Question posts */}
      {isQuestion && (
        <View style={styles.qaSection}>
          <View style={[styles.qaBadge, learningMeta?.isAnswered && styles.qaBadgeAnswered]}>
            <Ionicons 
              name={learningMeta?.isAnswered ? 'checkmark-circle' : 'help-circle'} 
              size={16} 
              color={learningMeta?.isAnswered ? '#10B981' : '#F59E0B'} 
            />
            <Text style={[styles.qaBadgeText, learningMeta?.isAnswered && styles.qaBadgeTextAnswered]}>
              {learningMeta?.isAnswered ? 'Answered' : 'Awaiting Answer'}
            </Text>
          </View>
          <View style={styles.answerCount}>
            <Ionicons name="chatbubbles-outline" size={14} color="#6B7280" />
            <Text style={styles.answerCountText}>
              {learningMeta?.answerCount || 0} {(learningMeta?.answerCount || 0) === 1 ? 'answer' : 'answers'}
            </Text>
          </View>
        </View>
      )}

      {/* Progress Bar - For Courses/Quizzes */}
      {showProgress && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{learningMeta?.progress || 0}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={typeConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${learningMeta?.progress || 0}%` }]}
            />
          </View>
          {learningMeta?.completedSteps !== undefined && learningMeta?.totalSteps && (
            <Text style={styles.progressSteps}>
              {learningMeta.completedSteps}/{learningMeta.totalSteps} steps completed
            </Text>
          )}
        </View>
      )}

      {/* Clean Learning Info Bar */}
      <View style={styles.learningBar}>
        {/* Post Type */}
        <View style={[styles.typeChip, { backgroundColor: typeConfig.bgColor }]}>
          <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
          <Text style={[styles.typeChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
        </View>

        {/* Difficulty Badge */}
        {learningMeta?.difficulty && (
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_CONFIG[learningMeta.difficulty].bgColor }]}>
            <Ionicons 
              name={DIFFICULTY_CONFIG[learningMeta.difficulty].icon as any} 
              size={12} 
              color={DIFFICULTY_CONFIG[learningMeta.difficulty].color} 
            />
            <Text style={[styles.difficultyText, { color: DIFFICULTY_CONFIG[learningMeta.difficulty].color }]}>
              {DIFFICULTY_CONFIG[learningMeta.difficulty].label}
            </Text>
          </View>
        )}

        {/* Metrics - Inline */}
        <View style={styles.inlineMetrics}>
          <View style={styles.inlineMetric}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.inlineMetricText}>{learningMeta?.estimatedMinutes || Math.floor(Math.random() * 8) + 3} min</Text>
          </View>
          <View style={styles.inlineMetric}>
            <Ionicons name="people-outline" size={14} color="#6B7280" />
            <Text style={styles.inlineMetricText}>{learningMeta?.participantCount || Math.floor(Math.random() * 200) + 50}</Text>
          </View>
          <View style={styles.inlineMetric}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.inlineMetricText}>+{learningMeta?.xpReward || Math.floor(Math.random() * 30) + 10} XP</Text>
          </View>
        </View>
      </View>

      {/* Action Bar - Like, Value, Comment, Share */}
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

        {/* Value - Diamond/Gem icon for valuable learning content */}
        <Animated.View style={[valueAnimatedStyle, styles.actionButton]}>
          <TouchableOpacity onPress={handleValue} style={styles.actionButtonInner}>
            <Ionicons 
              name={valued ? 'diamond' : 'diamond-outline'} 
              size={22} 
              color={valued ? '#8B5CF6' : '#6B7280'} 
            />
          </TouchableOpacity>
        </Animated.View>

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
            <Ionicons name="arrow-redo-outline" size={22} color="#6B7280" />
            {post.shares > 0 && (
              <Text style={styles.actionText}>{formatNumber(post.shares)}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'visible',
    position: 'relative',
    // Soft neutral shadow - clean floating effect
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  // LIVE Badge styles
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 10,
  },
  liveBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  liveViewers: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 14,
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
    flexWrap: 'wrap',
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flexShrink: 1,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  // Role Badge (Teacher/Admin)
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginLeft: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  metaDot: {
    fontSize: 13,
    color: '#9CA3AF',
    marginHorizontal: 6,
  },
  // Study Group Tag
  studyGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studyGroupText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  // Menu Container for dropdown
  menuContainer: {
    position: 'relative',
    zIndex: 100,
  },
  moreButton: {
    padding: 6,
    marginRight: -6,
  },
  // Dropdown Menu
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  menuItemTextActive: {
    color: '#6366F1',
  },
  // Twitter-style Blue Tick
  twitterBlueTick: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1D9BF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Deadline Banner
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  deadlineBannerUrgent: {
    backgroundColor: '#FEE2E2',
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  deadlineTextUrgent: {
    color: '#DC2626',
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
  // Rich Content Indicators
  richContentIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  richContentBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formulaIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  contentSection: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  contentText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    fontWeight: '400',
  },
  // Topic Tags
  topicTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  topicTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  moreTagsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  // Q&A Section
  qaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  qaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  qaBadgeAnswered: {
    backgroundColor: '#D1FAE5',
  },
  qaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  qaBadgeTextAnswered: {
    color: '#065F46',
  },
  answerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  answerCountText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  // Progress Section
  progressSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressSteps: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Clean Learning Bar
  learningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Difficulty Badge
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inlineMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  inlineMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineMetricText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
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
