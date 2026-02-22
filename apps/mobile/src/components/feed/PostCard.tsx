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

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Platform,
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

import { Avatar, ImageCarousel } from '@/components/common';
import {
  PollVoting,
} from '@/components/feed';
import { DeadlineBanner, ClubAnnouncement, QuizSection } from './PostCardSections';
import PostHeader from './PostHeader';
import PostContent from './PostContent';
import { Post, DifficultyLevel } from '@/types';
import { useAuthStore } from '@/stores';
import { formatRelativeTime, formatNumber } from '@/utils';
import { feedApi } from '@/api/client';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onRepost?: () => void;
  onBookmark?: () => void;
  onValue?: () => void;  // Educational value rating
  isValued?: boolean;     // Whether current user has already rated this post
  onUserPress?: () => void;
  onPress?: () => void;
  onVote?: (optionId: string) => void;
  onViewAnalytics?: () => void;
  currentUserId?: string; // Optional: for showing blue tick on current user
  navigate?: (screen: string, params?: any) => void; // Avoids useNavigation subscription per card
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
  ACHIEVEMENT: { icon: 'trophy', label: 'Achievement', color: '#0EA5E9', bgColor: '#E0F2FE', ctaLabel: 'Celebrate', gradient: ['#0EA5E9', '#0284C7'] },
  PROJECT: { icon: 'folder', label: 'Project', color: '#F97316', bgColor: '#FFEDD5', ctaLabel: 'View Project', gradient: ['#F97316', '#EA580C'] },
  COURSE: { icon: 'book', label: 'Course', color: '#3B82F6', bgColor: '#DBEAFE', ctaLabel: 'Enroll Now', gradient: ['#3B82F6', '#2563EB'] },
  EVENT: { icon: 'calendar', label: 'Event', color: '#EC4899', bgColor: '#FCE7F3', ctaLabel: 'Join Event', gradient: ['#EC4899', '#DB2777'] },
  QUIZ: { icon: 'bulb', label: 'Quiz', color: '#10B981', bgColor: '#D1FAE5', ctaLabel: 'Take Quiz', gradient: ['#10B981', '#059669'] },
  EXAM: { icon: 'clipboard', label: 'Exam', color: '#EF4444', bgColor: '#FEE2E2', ctaLabel: 'View Exam Details', gradient: ['#EF4444', '#DC2626'] },
  ASSIGNMENT: { icon: 'book-outline', label: 'Assignment', color: '#3B82F6', bgColor: '#DBEAFE', ctaLabel: 'Start Assignment', gradient: ['#3B82F6', '#2563EB'] },
  RESOURCE: { icon: 'folder-open', label: 'Resource', color: '#6366F1', bgColor: '#EEF2FF', ctaLabel: 'Download', gradient: ['#6366F1', '#4F46E5'] },
  TUTORIAL: { icon: 'play-circle', label: 'Tutorial', color: '#06B6D4', bgColor: '#CFFAFE', ctaLabel: 'Watch Tutorial', gradient: ['#06B6D4', '#0891B2'] },
  RESEARCH: { icon: 'flask', label: 'Research', color: '#8B5CF6', bgColor: '#EDE9FE', ctaLabel: 'View Research', gradient: ['#8B5CF6', '#7C3AED'] },
  CLUB_ANNOUNCEMENT: { icon: 'people', label: 'Study Club', color: '#6366F1', bgColor: '#EEF2FF', ctaLabel: 'View Club', gradient: ['#6366F1', '#4F46E5'] },
  REFLECTION: { icon: 'bulb', label: 'Reflection', color: '#84CC16', bgColor: '#ECFCCB', ctaLabel: 'Read More', gradient: ['#84CC16', '#65A30D'] },
  COLLABORATION: { icon: 'people', label: 'Collaboration', color: '#EC4899', bgColor: '#FCE7F3', ctaLabel: 'Join Team', gradient: ['#EC4899', '#DB2777'] },
};

// Difficulty level configurations
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; labelKh: string; color: string; bgColor: string; icon: string }> = {
  BEGINNER: { label: 'Beginner', labelKh: 'ចាប់ផ្តើម', color: '#10B981', bgColor: '#D1FAE5', icon: 'leaf' },
  INTERMEDIATE: { label: 'Intermediate', labelKh: 'មធ្យម', color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'flash' },
  ADVANCED: { label: 'Advanced', labelKh: 'កម្រិតខ្ពស់', color: '#EF4444', bgColor: '#FEE2E2', icon: 'rocket' },
};

// Vibrant gradients for Quiz cards to make them pop
const QUIZ_GRADIENTS: [string, string][] = [
  ['#F9A8D4', '#F472B6'], // Pink — soft
  ['#C4B5FD', '#A78BFA'], // Violet — soft
  ['#93C5FD', '#60A5FA'], // Blue — soft
  ['#6EE7B7', '#34D399'], // Emerald — soft
  ['#7DD3FC', '#38BDF8'], // Sky — soft
  ['#A5B4FC', '#818CF8'], // Indigo — soft
  ['#67E8F9', '#22D3EE'], // Cyan — soft
  ['#FDBA74', '#FB923C'], // Orange — soft
];

const getQuizGradient = (id: string): [string, string] => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % QUIZ_GRADIENTS.length;
  return QUIZ_GRADIENTS[index];
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

// Memoized action bar — isolates like/comment/share state from header/content re-renders
interface ActionBarProps {
  liked: boolean;
  likeCount: number;
  valued: boolean;
  commentCount: number;
  shareCount: number;
  onLike: () => void;
  onComment: () => void;
  onRepost: () => void;
  onShare: () => void;
  onValue: () => void;
  likeAnimatedStyle: any;
  btnAnimatedStyle: any;
  valueAnimatedStyle: any;
}

const ActionBar = React.memo<ActionBarProps>(({
  liked, likeCount, valued, commentCount, shareCount,
  onLike, onComment, onRepost, onShare, onValue,
  likeAnimatedStyle, btnAnimatedStyle, valueAnimatedStyle,
}) => (
  <View style={styles.actionBar}>
    <View style={styles.actionBarLeft}>
      <Animated.View style={[likeAnimatedStyle, styles.actionButton]}>
        <TouchableOpacity onPress={onLike} style={styles.actionButtonInner}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? '#EF4444' : '#262626'}
          />
          {likeCount > 0 && (
            <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
              {formatNumber(likeCount)}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[btnAnimatedStyle, styles.actionButton]}>
        <TouchableOpacity onPress={onComment} style={styles.actionButtonInner}>
          <Ionicons name="chatbubble-outline" size={24} color="#262626" />
          {commentCount > 0 && (
            <Text style={styles.actionText}>{formatNumber(commentCount)}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[btnAnimatedStyle, styles.actionButton]}>
        <TouchableOpacity onPress={onRepost} style={styles.actionButtonInner}>
          <Ionicons name="repeat-outline" size={26} color="#262626" />
          {shareCount > 0 && (
            <Text style={styles.actionText}>{formatNumber(shareCount)}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[btnAnimatedStyle, styles.actionButton]}>
        <TouchableOpacity onPress={onShare} style={styles.actionButtonInner}>
          <Ionicons name="paper-plane-outline" size={23} color="#262626" />
        </TouchableOpacity>
      </Animated.View>
    </View>
    <Animated.View style={[valueAnimatedStyle, styles.actionButton]}>
      <TouchableOpacity onPress={onValue} style={styles.actionButtonInner}>
        <Ionicons
          name={valued ? 'diamond' : 'diamond-outline'}
          size={24}
          color={valued ? '#8B5CF6' : '#262626'}
        />
      </TouchableOpacity>
    </Animated.View>
  </View>
));

// LIVE badge — isolated so animation only runs on LIVE posts
const LiveBadge = React.memo<{ viewers?: number }>(({ viewers }) => {
  const livePulse = useSharedValue(1);
  React.useEffect(() => {
    livePulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);
  const liveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livePulse.value }],
  }));
  return (
    <Animated.View style={[styles.liveBadge, liveAnimatedStyle]}>
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.liveBadgeGradient}
      >
        <View style={styles.liveDot} />
        <Text style={styles.liveBadgeText}>LIVE</Text>
        {viewers != null && (
          <Text style={styles.liveViewers}>{viewers}</Text>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

const PostCardInner: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onRepost,
  onBookmark,
  onValue,
  isValued: isValuedProp = false,
  onUserPress,
  onPress,
  onVote,
  onViewAnalytics,
  currentUserId,
  navigate,
}) => {

  // Narrow selector — only subscribe to user ID, not entire auth store
  const currentUserId2 = useAuthStore(s => s.user?.id);
  const isCurrentUser = currentUserId ? post.author?.id === currentUserId : post.author?.id === currentUserId2;

  // Derive directly from props — no useEffect sync needed
  // We use key={post.id} on the component itself (in the parent list) to force remounting
  // But FlashList recycles, so we DO need to handle prop updates.
  // Instead of state, we can use a "derived state" pattern or useLayoutEffect to sync.

  const [liked, setLiked] = useState(post.isLiked);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showMenu, setShowMenu] = useState(false);
  const [valued, setValued] = useState(isValuedProp);
  const [isFollowing, setIsFollowing] = useState(post.isFollowingAuthor || false);
  const [followLoading, setFollowLoading] = useState(false);

  // Keep valued in sync with prop when it changes from parent
  useEffect(() => {
    if (isValuedProp && !valued) setValued(true);
  }, [isValuedProp]);

  // Reset internal state when post identity changes (recycling)
  // Use layout effect to ensure state is reset before paint
  React.useLayoutEffect(() => {
    setLiked(post.isLiked);
    setBookmarked(post.isBookmarked);
    setLikeCount(post.likes);
    setIsFollowing(post.isFollowingAuthor || false);
    setValued(isValuedProp);
  }, [post.id, post.isLiked, post.isBookmarked, post.likes, post.isFollowingAuthor, isValuedProp]);

  // Only create shared values for commonly-used animations (like + value)
  // Other button animations use a single shared scale to reduce per-card overhead
  const likeScale = useSharedValue(1);
  const valueScale = useSharedValue(1);
  const btnScale = useSharedValue(1); // Shared for comment/repost/share

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const valueAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));

  // Single animated style shared by comment/repost/share buttons
  const btnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handleLike = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
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
  }, [liked, onLike]);

  const handleValue = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 0);
    valueScale.value = withSequence(
      withSpring(1.4, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    onValue?.();
  }, [onValue]);

  const handleBookmark = useCallback(() => {
    setTimeout(() => Haptics.selectionAsync(), 0);
    setBookmarked(!bookmarked);
    setShowMenu(false);
    onBookmark?.();
  }, [bookmarked, onBookmark]);

  const handleComment = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
    btnScale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    onComment?.();
  }, [onComment]);

  const handleRepost = useCallback(() => {
    if (isCurrentUser) {
      Alert.alert('Cannot Repost', 'You cannot repost your own post.');
      return;
    }
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 0);
    btnScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    // Show repost confirmation
    Alert.alert(
      'Repost',
      `Repost ${post.author.firstName}'s post to your feed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Repost',
          onPress: async () => {
            try {
              const res = await feedApi.post(`/posts/${post.id}/repost`, { comment: '' });
              if (res.data.success) {
                // Refresh feed so the repost appears
                const { fetchPosts } = require('@/stores').useFeedStore.getState();
                fetchPosts(true);
                onRepost?.();
                Alert.alert('Reposted!', 'This post has been shared to your feed.');
              } else {
                Alert.alert('Error', res.data.error || 'Failed to repost');
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Failed to repost';
              Alert.alert('Error', msg);
            }
          },
        },
        {
          text: 'Repost with Comment',
          onPress: () => {
            Alert.prompt(
              'Add a Comment',
              'Write something about this post (optional)',
              async (text: string) => {
                try {
                  const res = await feedApi.post(`/posts/${post.id}/repost`, { comment: text || '' });
                  if (res.data.success) {
                    // Refresh feed so the repost appears
                    const { fetchPosts } = require('@/stores').useFeedStore.getState();
                    fetchPosts(true);
                    onRepost?.();
                    Alert.alert('Reposted!', 'This post has been shared to your feed.');
                  } else {
                    Alert.alert('Error', res.data.error || 'Failed to repost');
                  }
                } catch (err: any) {
                  const msg = err?.response?.data?.error || 'Failed to repost';
                  Alert.alert('Error', msg);
                }
              },
              'plain-text',
              '',
              'Write a comment...',
            );
          },
        },
      ],
    );
  }, [isCurrentUser, post.author.firstName, post.id, onRepost]);

  const handleShare = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
    btnScale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    onShare?.();
  }, [onShare]);

  const handleMenuToggle = useCallback(() => {
    setTimeout(() => Haptics.selectionAsync(), 0);
    setShowMenu(prev => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
    setShowMenu(false);
    navigate?.('EditPost', { post });
  }, [navigate, post]);

  const handleViewAnalytics = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
    setShowMenu(false);
    if (onViewAnalytics) {
      onViewAnalytics();
    } else {
      navigate?.('PostDetail', { postId: post.id });
    }
  }, [onViewAnalytics, navigate, post.id]);

  const handleFollow = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const res = await feedApi.post(`/users/${post.author.id}/follow`);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, post.author.id]);

  // Vote handler wrapper
  const handleVote = useCallback((optionId: string) => {
    onVote?.(optionId);
  }, [onVote]);

  // Image/Content press handler wrapper
  const handleContentPress = useCallback(() => {
    onPress?.();
  }, [onPress]);


  const typeConfig = useMemo(() => POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE, [post.postType]);
  const authorName = useMemo(() => post.author.name || `${post.author.firstName} ${post.author.lastName}`, [post.author.name, post.author.firstName, post.author.lastName]);
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

  // Role-based badge — memoized to avoid object recreation on every render
  const roleBadge = useMemo(() => {
    const role = post.author.role;
    if (role === 'TEACHER') {
      return { icon: 'school', color: '#3B82F6', label: 'Teacher' };
    } else if (role === 'ADMIN' || role === 'SCHOOL_ADMIN') {
      return { icon: 'shield-checkmark', color: '#8B5CF6', label: 'Admin' };
    }
    return null;
  }, [post.author.role]);

  const quizGradient = useMemo(
    () => post.postType === 'QUIZ' ? getQuizGradient(post.id) : undefined,
    [post.postType, post.id]
  );

  // Prepare props for PostHeader
  const headerProps = useMemo(() => ({
    author: post.author,
    createdAt: post.createdAt,
    visibility: post.visibility,
    learningMeta: post.learningMeta,
    isCurrentUser,
    isFollowing,
    followLoading,
    onUserPress: onUserPress || (() => { }),
    onFollow: handleFollow,
    onMenuToggle: handleMenuToggle,
    showMenu,
    menuContent: (
      <View style={styles.dropdownMenu}>
        {isCurrentUser && (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Ionicons name="create-outline" size={18} color="#0EA5E9" />
              <Text style={[styles.menuItemText, { color: '#0EA5E9' }]}>
                Edit Post
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewAnalytics}>
              <Ionicons name="stats-chart-outline" size={18} color="#10B981" />
              <Text style={[styles.menuItemText, { color: '#10B981' }]}>
                View Analytics
              </Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.menuItem} onPress={handleBookmark}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={bookmarked ? '#0D9488' : '#374151'}
          />
          <Text style={[styles.menuItemText, bookmarked && styles.menuItemTextActive]}>
            {bookmarked ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => {
          setShowMenu(false);
          Alert.alert('Post Reported', 'Thanks for letting us know. We\'ll review this post.', [{ text: 'OK' }]);
        }}>
          <Ionicons name="flag-outline" size={18} color="#374151" />
          <Text style={styles.menuItemText}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => {
          setShowMenu(false);
          Alert.alert('Post Hidden', 'You won\'t see this post in your feed anymore.');
        }}>
          <Ionicons name="eye-off-outline" size={18} color="#374151" />
          <Text style={styles.menuItemText}>Hide</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={async () => {
          setShowMenu(false);
          const url = `https://stunity.com/posts/${post.id}`;
          try {
            await Share.share({ message: url, title: 'Post Link' });
          } catch {
            // Silent fail
          }
          Alert.alert('Link Copied', 'Post link has been copied to clipboard.');
        }}>
          <Ionicons name="link-outline" size={18} color="#374151" />
          <Text style={styles.menuItemText}>Copy Link</Text>
        </TouchableOpacity>
      </View>
    )
  }), [
    post.author, post.createdAt, post.visibility, post.learningMeta,
    isCurrentUser, isFollowing, followLoading, onUserPress, handleFollow,
    handleMenuToggle, showMenu, isCurrentUser, handleEdit, handleViewAnalytics,
    handleBookmark, bookmarked, post.id
  ]);

  return (
    <View style={styles.container}>

      {/* Repost Label */}
      {post.repostOfId && (
        <View style={styles.repostLabel}>
          <Ionicons name="repeat" size={14} color="#6B7280" />
          <Text style={styles.repostLabelText}>{authorName} reposted</Text>
        </View>
      )}

      {/* LIVE Badge - Top Corner */}
      {learningMeta?.isLive && (
        <LiveBadge viewers={learningMeta.liveViewers} />
      )}

      {/* Author Header */}
      <PostHeader {...headerProps} />

      {/* Content Section */}
      <PostContent
        post={post}
        onPress={handleContentPress}
        onImagePress={handleContentPress}
        onVote={handleVote}
        navigate={navigate}
        typeConfig={typeConfig}
        learningMeta={learningMeta}
        deadlineInfo={deadlineInfo}
        DIFFICULTY_CONFIG={DIFFICULTY_CONFIG}
      />


      <ActionBar
        liked={liked}
        likeCount={likeCount}
        valued={valued}
        commentCount={post.comments}
        shareCount={post.shares}
        onLike={handleLike}
        onComment={handleComment}
        onRepost={handleRepost}
        onShare={handleShare}
        onValue={handleValue}
        likeAnimatedStyle={likeAnimatedStyle}
        btnAnimatedStyle={btnAnimatedStyle}
        valueAnimatedStyle={valueAnimatedStyle}
      />
    </View>
  );
};

// React.memo with custom comparator — only re-render when meaningful post data changes
function arePostCardPropsEqual(prev: PostCardProps, next: PostCardProps): boolean {
  // Guard: FlashList cell recycling can pass undefined during transitions
  if (!prev.post || !next.post) return prev.post === next.post;
  return (
    prev.post.id === next.post.id &&
    prev.post.isLiked === next.post.isLiked &&
    prev.post.likes === next.post.likes &&
    prev.post.comments === next.post.comments &&
    prev.post.isBookmarked === next.post.isBookmarked &&
    prev.post.shares === next.post.shares &&
    prev.post.userVotedOptionId === next.post.userVotedOptionId &&
    prev.post.updatedAt === next.post.updatedAt &&
    prev.post.content === next.post.content &&
    prev.isValued === next.isValued
  );
}

export const PostCard = React.memo(PostCardInner, arePostCardPropsEqual);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    paddingTop: 14,
    overflow: 'hidden',      // Required: clips images and media to card's borderRadius
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
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  visibilityIndicator: {
    marginLeft: 2,
  },
  // Study Group Tag
  studyGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studyGroupText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0D9488',
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
    color: '#0D9488',
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
    backgroundColor: '#E0F2FE',
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
    color: '#0C4A6E',
  },
  deadlineTextUrgent: {
    color: '#DC2626',
  },
  mediaWrapper: {
    marginHorizontal: 0,        // Full-width, edge-to-edge
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 0,
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
    paddingHorizontal: 16, // Consistent 16px padding
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
    paddingHorizontal: 16, // Consistent 16px padding
    paddingBottom: 10,
    gap: 8,
  },
  topicTag: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
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
    backgroundColor: '#E0F2FE',
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
    color: '#0C4A6E',
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
    borderRadius: 20,
    gap: 5,
    overflow: 'hidden',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  valueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueStatText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // Consistent 16px padding
    paddingVertical: 12,
    paddingBottom: 16, // Add bottom padding for breathing room
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
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
  pollSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  // Quiz styles now live in PostCardSections.tsx
  // Club announcement banner styles
  clubBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,

    borderColor: '#CCFBF1',
  },
  clubBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  clubIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBannerText: {
    flex: 1,
  },
  clubBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  clubBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  clubBannerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  clubJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,


    shadowOpacity: 0.15,
    shadowRadius: 4,

  },
  clubJoinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // Follow Button — plain text, no border/background
  followBtnWrap: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginRight: 2,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  followBtnTextFollowing: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  // Repost Label
  repostLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  repostLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Repost Embed Card
  repostEmbed: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 14,


    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  repostEmbedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  repostEmbedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  repostEmbedAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  repostEmbedTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  repostEmbedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  repostEmbedContent: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  repostEmbedMedia: {
    width: '100%',
    height: 140,
  },
  repostEmbedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  repostEmbedStatText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});

export default React.memo(PostCard, (prevProps, nextProps) => {
  return (
    // Re-render if the post object itself changes deeply. We specifically check
    // properties that update during interactions:
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.comments === nextProps.post.comments &&
    prevProps.post.shares === nextProps.post.shares &&
    prevProps.post.isLiked === nextProps.post.isLiked &&
    prevProps.post.isBookmarked === nextProps.post.isBookmarked &&
    prevProps.post.content === nextProps.post.content && // for edits
    // Check if the user has valued it changes
    prevProps.isValued === nextProps.isValued &&
    // Check if poll votes updated
    prevProps.post.userVotedOptionId === nextProps.post.userVotedOptionId
    // Handlers (like onLike, onComment) are assumed stable from the parent (FeedScreen uses useRef for them)
  );
});
