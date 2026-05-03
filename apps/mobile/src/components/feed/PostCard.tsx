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

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useThemeContext } from '@/contexts';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Share,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Haptics } from '@/services/haptics';

import { Avatar, ImageCarousel } from '@/components/common';
import {
  PollVoting,
} from '@/components/feed';
import { DeadlineBanner, ClubAnnouncement, QuizSection } from './PostCardSections';
import PostHeader from './PostHeader';
import PostContent from './PostContent';
import PostOptionsSheet, { PostOptionAction } from './PostOptionsSheet';
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
  EVENT_CREATED: { icon: 'calendar', label: 'New Event', color: '#EC4899', bgColor: '#FCE7F3', ctaLabel: 'Join Event', gradient: ['#EC4899', '#DB2777'] },
  CLUB_CREATED: { icon: 'people', label: 'New Club', color: '#6366F1', bgColor: '#EEF2FF', ctaLabel: 'View Club', gradient: ['#6366F1', '#4F46E5'] },
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
const getTimeRemaining = (deadline: string, t: any): { text: string; isUrgent: boolean } => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) return { text: t('feed.time.expired'), isUrgent: true };

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) {
    return { text: `${diffHours}${t('feed.time.h')} ${t('feed.time.left')}`, isUrgent: true };
  } else if (diffDays < 7) {
    return { text: `${diffDays}${t('feed.time.d')} ${t('feed.time.left')}`, isUrgent: diffDays <= 2 };
  } else {
    return { text: `${diffDays}${t('feed.time.d')} ${t('feed.time.left')}`, isUrgent: false };
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
  styles: any;
  colors: any;
  isDark: boolean;
}

interface AnimatedActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  count?: number;
  color: string;
  activeColor: string;
  onPress: () => void;
  size?: number;
  styles: any;
  accessibilityLabel: string;
}

const AnimatedActionButton = React.memo<AnimatedActionButtonProps>(({
  icon,
  activeIcon,
  active = false,
  count,
  color,
  activeColor,
  onPress,
  size = 24,
  styles,
  accessibilityLabel,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const haloScale = useRef(new Animated.Value(0.75)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const displayColor = active ? activeColor : color;

  const animatePress = useCallback(() => {
    scale.stopAnimation();
    haloScale.stopAnimation();
    haloOpacity.stopAnimation();
    scale.setValue(0.92);
    haloScale.setValue(0.7);
    haloOpacity.setValue(active ? 0.28 : 0.18);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1.18 : 1.1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 1.85,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [active, haloOpacity, haloScale, scale]);

  const handlePress = useCallback(() => {
    animatePress();
    onPress();
  }, [animatePress, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.actionPressable}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.actionHalo,
          {
            backgroundColor: activeColor,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View style={[styles.actionButtonInner, { transform: [{ scale }] }]}>
        <Ionicons
          name={active && activeIcon ? activeIcon : icon}
          size={size}
          color={displayColor}
        />
        {!!count && count > 0 && (
          <Text style={[styles.actionText, active && { color: activeColor }]}>
            {formatNumber(count)}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

const ActionBar = React.memo<ActionBarProps>(({
  liked, likeCount, valued, commentCount, shareCount,
  onLike, onComment, onRepost, onShare, onValue,
  styles, colors,
}) => (
  <View style={styles.actionBar}>
    <View style={styles.actionBarLeft}>
      <AnimatedActionButton
        icon="heart-outline"
        activeIcon="heart"
        active={liked}
        count={likeCount}
        color={colors.text}
        activeColor="#EF4444"
        onPress={onLike}
        styles={styles}
        accessibilityLabel="Like post"
      />
      <AnimatedActionButton
        icon="chatbubble-outline"
        count={commentCount}
        color={colors.text}
        activeColor="#1D9BF0"
        onPress={onComment}
        styles={styles}
        accessibilityLabel="Comment on post"
      />
      <AnimatedActionButton
        icon="repeat-outline"
        count={shareCount}
        color={colors.text}
        activeColor="#00BA7C"
        onPress={onRepost}
        size={26}
        styles={styles}
        accessibilityLabel="Repost"
      />
      <AnimatedActionButton
        icon="paper-plane-outline"
        color={colors.text}
        activeColor="#1D9BF0"
        onPress={onShare}
        size={23}
        styles={styles}
        accessibilityLabel="Share post"
      />
    </View>
    <AnimatedActionButton
      icon="diamond-outline"
      activeIcon="diamond"
      active={valued}
      color={colors.text}
      activeColor="#8B5CF6"
      onPress={onValue}
      styles={styles}
      accessibilityLabel="Rate educational value"
    />
  </View>
));

// LIVE badge — isolated so animation only runs on LIVE posts
const LiveBadge = React.memo<{ viewers?: number; t: any; styles: any }>(({ viewers, t, styles }) => {
  const livePulse = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 500, useNativeDriver: true })
      ])
    ).start();
  }, [livePulse]);
  const liveAnimatedStyle = {
    transform: [{ scale: livePulse }],
  };
  return (
    <Animated.View style={[styles.liveBadge, liveAnimatedStyle]}>
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.liveBadgeGradient}
      >
        <View style={styles.liveDot} />
        <Text style={styles.liveBadgeText}>{t('feed.live')}</Text>
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
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

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

  const handleLike = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);

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
    onComment?.();
  }, [onComment]);

  const handleRepost = useCallback(() => {
    if (isCurrentUser) {
      Alert.alert(t('common.error'), t('feed.repostOwnError'));
      return;
    }
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 0);
    // Show repost confirmation
    Alert.alert(
      t('feed.repost'),
      t('feed.repostConfirm', { name: post.author.firstName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('feed.repost'),
          onPress: async () => {
            try {
              const res = await feedApi.post(`/posts/${post.id}/repost`, { comment: '' });
              if (res.data.success) {
                // Refresh feed so the repost appears
                const { fetchPosts } = require('@/stores').useFeedStore.getState();
                fetchPosts(true);
                onRepost?.();
                Alert.alert(t('common.success'), t('feed.repostSuccess'));
              } else {
                Alert.alert(t('common.error'), res.data.error || 'Failed to repost');
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Failed to repost';
              Alert.alert(t('common.error'), msg);
            }
          },
        },
      ],
    );
  }, [isCurrentUser, post.author.firstName, post.id, onRepost, t]);

  const handleShare = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 0);
    onShare?.();
  }, [onShare]);

  const handleMenuToggle = useCallback(() => {
    setTimeout(() => Haptics.selectionAsync(), 0);
    setShowMenu(true);
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


  const typeConfig = useMemo(() => {
    const config = POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE;
    const typeKey = post.postType.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    return {
      ...config,
      label: t(`feed.postTypes.${typeKey}`),
      ctaLabel: t(`feed.actions.${config.ctaLabel.charAt(0).toLowerCase() + config.ctaLabel.slice(1).replace(/\s/g, '')}`),
    };
  }, [post.postType, t]);
  const authorName = useMemo(
    () => `${post.author.lastName || ''} ${post.author.firstName || ''}`.trim() || post.author.name || '',
    [post.author.name, post.author.firstName, post.author.lastName]
  );
  const learningMeta = post.learningMeta;

  // Calculate deadline info if present
  const deadlineInfo = useMemo(() => {
    if (learningMeta?.deadline) {
      return getTimeRemaining(learningMeta.deadline, t);
    }
    return null;
  }, [learningMeta?.deadline, t]);

  // Check if post shows progress (courses, quizzes, assignments)
  const showProgress = ['COURSE', 'QUIZ', 'ASSIGNMENT', 'TUTORIAL'].includes(post.postType) &&
    learningMeta?.progress !== undefined;

  // Check if this is a Q&A post
  const isQuestion = post.postType === 'QUESTION';

  // Role-based badge — memoized to avoid object recreation on every render
  const roleBadge = useMemo(() => {
    const role = post.author.role;
    if (role === 'TEACHER') {
      return { icon: 'school', color: '#3B82F6', label: t('common.teacher') };
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') {
      return { icon: 'shield-checkmark', color: '#8B5CF6', label: t('common.admin') };
    }
    return null;
  }, [post.author.role, t]);

  const quizGradient = useMemo(
    () => post.postType === 'QUIZ' ? getQuizGradient(post.id) : undefined,
    [post.postType, post.id]
  );

  const menuActions = useMemo<PostOptionAction[]>(() => {
    const actions: PostOptionAction[] = [];

    if (isCurrentUser) {
      actions.push(
        {
          key: 'edit',
          icon: 'create-outline',
          color: '#0EA5E9',
          label: t('common.edit'),
          onPress: handleEdit,
        },
        {
          key: 'analytics',
          icon: 'stats-chart-outline',
          color: '#10B981',
          label: t('feed.actions.viewDetails'),
          onPress: handleViewAnalytics,
        },
      );
    }

    actions.push(
      {
        key: 'bookmark',
        icon: bookmarked ? 'bookmark' : 'bookmark-outline',
        color: bookmarked ? '#0D9488' : colors.text,
        label: bookmarked ? t('settings.bookmarks') : t('common.save'),
        onPress: handleBookmark,
      },
      {
        key: 'report',
        icon: 'flag-outline',
        color: colors.text,
        label: t('common.report'),
        onPress: () => {
          Alert.alert(t('common.success'), t('common.thanksForReporting'), [{ text: t('common.ok') }]);
        },
      },
      {
        key: 'copy-link',
        icon: 'link-outline',
        color: colors.text,
        label: t('common.copyLink'),
        onPress: async () => {
          const url = `https://stunity.com/posts/${post.id}`;
          try {
            await Share.share({ message: url, title: t('common.postLink') });
          } catch {
            // Silent fail
          }
        },
      },
    );

    return actions;
  }, [
    isCurrentUser,
    t,
    handleEdit,
    handleViewAnalytics,
    bookmarked,
    colors.text,
    handleBookmark,
    post.id,
  ]);

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
    showMenu: false,
    menuContent: null,
  }), [
    post.author, post.createdAt, post.visibility, post.learningMeta,
    isCurrentUser, isFollowing, followLoading, onUserPress, handleFollow,
    handleMenuToggle,
  ]);

  return (
    <View style={styles.container}>

      {/* Repost Label */}
      {!!post.repostOfId && (
        <View style={styles.repostLabel}>
          <Ionicons name="repeat" size={14} color="#6B7280" />
          <Text style={styles.repostLabelText}>{authorName} {t('common.reposted')}</Text>
        </View>
      )}

      {/* LIVE Badge - Top Corner */}
      {learningMeta?.isLive && (
        <LiveBadge viewers={learningMeta.liveViewers} t={t} styles={styles} />
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
        styles={styles}
        colors={colors}
        isDark={isDark}
      />

      <PostOptionsSheet
        visible={showMenu}
        title={t('common.post')}
        actions={menuActions}
        onClose={() => setShowMenu(false)}
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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.card,
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
    color: colors.text,
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
    color: colors.textTertiary,
  },
  metaDot: {
    fontSize: 13,
    color: colors.textTertiary,
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
    backgroundColor: isDark ? colors.surfaceVariant : '#F0FDFA',
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
    backgroundColor: colors.card,
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
    color: colors.text,
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
    backgroundColor: isDark ? colors.surfaceVariant : '#F3F4F6',
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
    color: colors.text,
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
    backgroundColor: isDark ? colors.surfaceVariant : '#F0FDFA',
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
    color: colors.textTertiary,
    alignSelf: 'center',
  },
  // Q&A Section
  qaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: isDark ? colors.surfaceVariant : '#F9FAFB',
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
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
    color: colors.textTertiary,
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
    borderTopColor: colors.border,
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
    color: colors.textSecondary,
  },
  valueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueStatText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // Consistent 16px padding
    paddingVertical: 12,
    paddingBottom: 16, // Add bottom padding for breathing room
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionPressable: {
    minWidth: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  actionHalo: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 3,
    paddingVertical: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    color: colors.textTertiary,
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
    color: colors.textSecondary,
  },
  // Repost Embed Card
  repostEmbed: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 14,


    backgroundColor: colors.surfaceVariant,
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
    color: colors.text,
  },
  repostEmbedTime: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  repostEmbedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  repostEmbedContent: {
    fontSize: 13,
    color: colors.textSecondary,
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
    borderTopColor: colors.border,
  },
  repostEmbedStatText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textTertiary,
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
