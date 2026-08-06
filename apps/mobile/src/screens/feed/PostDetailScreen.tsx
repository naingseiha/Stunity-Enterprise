import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * PostDetail Screen — Premium Redesign
 * 
 * - Fetches post from API if not in store
 * - Premium gradient header with post type indicator
 * - Enhanced author section with level badges
 * - Polished action bar, comments, and engagement stats
 * - All interactions wired to real API endpoints
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptics } from '@/services/haptics';
import { useTranslation } from 'react-i18next';
import { feedBodyPreferKhmer, feedTextStyle, textContainsKhmer } from '@/config/feedTypography';


import { Avatar, ImageCarousel, ScalePressable } from '@/components/common';
import { EducationalValueModal, type EducationalValue, PollVoting } from '@/components/feed';
import PostDetailAppBar from '@/components/feed/PostDetailAppBar';
import PostDetailQuizHero from '@/components/feed/PostDetailQuizHero';
import PostOptionsSheet, { PostOptionAction } from '@/components/feed/PostOptionsSheet';
import { RepostComposer } from '@/components/feed/RepostComposer';
import { useFeatureFlag } from '@/config/featureFlags';
import { useAuthStore, useFeedStore } from '@/stores';
import { Post, Comment, DifficultyLevel } from '@/types';
import { formatRelativeTime, formatNumber } from '@/utils';
import { FeedStackParamList } from '@/navigation/types';
import { feedApi } from '@/api/client';
import { useThemeContext } from '@/contexts';
import { getPostDetailMediaAspectRatio, getPostDetailMediaBucket } from '@/utils/feedMediaLayout';
import { postMediaTransitionTag } from '@/utils/postMediaTransition';
import { renderPostBodyText, renderPostTitleText } from '@/utils/renderEmojiText';
import { shareContent, buildPostShareContent } from '@/utils/sharePost';
import { AnimatedActionButton } from '@/components/feed/AnimatedActionButton';

type PostDetailRouteProp = RouteProp<FeedStackParamList, 'PostDetail'>;

// Difficulty configurations
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { labelKey: string; color: string; bgColor: string; icon: string }> = {
  BEGINNER: { labelKey: 'feed.difficulty.beginner', color: '#10B981', bgColor: '#D1FAE5', icon: 'leaf' },
  INTERMEDIATE: { labelKey: 'feed.difficulty.intermediate', color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'flash' },
  ADVANCED: { labelKey: 'feed.difficulty.advanced', color: '#EF4444', bgColor: '#FEE2E2', icon: 'rocket' },
};

// Post type configurations
const POST_TYPE_CONFIG: Record<string, {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  gradient: [string, string];
}> = {
  ARTICLE: { icon: 'document-text', label: 'Article', color: '#10B981', bgColor: '#D1FAE5', gradient: ['#10B981', '#059669'] },
  QUESTION: { icon: 'help-circle', label: 'Question', color: '#14B8A6', bgColor: '#CCFBF1', gradient: ['#14B8A6', '#0D9488'] },
  ANNOUNCEMENT: { icon: 'megaphone', label: 'Announcement', color: '#F97316', bgColor: '#FFEDD5', gradient: ['#F97316', '#EA580C'] },
  POLL: { icon: 'stats-chart', label: 'Poll', color: '#8B5CF6', bgColor: '#EDE9FE', gradient: ['#8B5CF6', '#7C3AED'] },
  ACHIEVEMENT: { icon: 'trophy', label: 'Achievement', color: '#0EA5E9', bgColor: '#E0F2FE', gradient: ['#0EA5E9', '#0284C7'] },
  PROJECT: { icon: 'folder', label: 'Project', color: '#F97316', bgColor: '#FFEDD5', gradient: ['#F97316', '#EA580C'] },
  COURSE: { icon: 'book', label: 'Course', color: '#3B82F6', bgColor: '#DBEAFE', gradient: ['#3B82F6', '#2563EB'] },
  EVENT: { icon: 'calendar', label: 'Event', color: '#EC4899', bgColor: '#FCE7F3', gradient: ['#EC4899', '#DB2777'] },
  QUIZ: { icon: 'bulb', label: 'Quiz', color: '#10B981', bgColor: '#D1FAE5', gradient: ['#10B981', '#059669'] },
  EXAM: { icon: 'clipboard', label: 'Exam', color: '#EF4444', bgColor: '#FEE2E2', gradient: ['#EF4444', '#DC2626'] },
  ASSIGNMENT: { icon: 'book-outline', label: 'Assignment', color: '#3B82F6', bgColor: '#DBEAFE', gradient: ['#3B82F6', '#2563EB'] },
  RESOURCE: { icon: 'folder-open', label: 'Resource', color: '#6366F1', bgColor: '#EEF2FF', gradient: ['#6366F1', '#4F46E5'] },
  TUTORIAL: { icon: 'play-circle', label: 'Tutorial', color: '#06B6D4', bgColor: '#CFFAFE', gradient: ['#06B6D4', '#0891B2'] },
  RESEARCH: { icon: 'flask', label: 'Research', color: '#8B5CF6', bgColor: '#EDE9FE', gradient: ['#8B5CF6', '#7C3AED'] },
  CLUB_ANNOUNCEMENT: { icon: 'people', label: 'Study Club', color: '#6366F1', bgColor: '#EEF2FF', gradient: ['#6366F1', '#4F46E5'] },
  REFLECTION: { icon: 'bulb', label: 'Reflection', color: '#84CC16', bgColor: '#ECFCCB', gradient: ['#84CC16', '#65A30D'] },
  COLLABORATION: { icon: 'people', label: 'Collaboration', color: '#EC4899', bgColor: '#FCE7F3', gradient: ['#EC4899', '#DB2777'] },
  EVENT_CREATED: { icon: 'calendar', label: 'New Event', color: '#EC4899', bgColor: '#FCE7F3', gradient: ['#EC4899', '#DB2777'] },
  CLUB_CREATED: { icon: 'people', label: 'New Club', color: '#6366F1', bgColor: '#EEF2FF', gradient: ['#6366F1', '#4F46E5'] },
};

// Quiz gradient palette
const QUIZ_GRADIENTS: [string, string][] = [
  ['#EC4899', '#DB2777'],
  ['#8B5CF6', '#7C3AED'],
  ['#3B82F6', '#2563EB'],
  ['#10B981', '#059669'],
  ['#0EA5E9', '#0284C7'],
  ['#6366F1', '#4F46E5'],
];
const getQuizGradient = (id: string) => {
  if (!id) return QUIZ_GRADIENTS[0];
  return QUIZ_GRADIENTS[id.charCodeAt(id.length - 1) % QUIZ_GRADIENTS.length];
};

// ─── Comment Component ─────────────────────────────────────
const CommentItem: React.FC<{
  comment: Comment;
  onReply: (comment: Comment) => void;
  onToggleLike: (commentId: string) => Promise<void>;
  depth?: number;
}> = ({ comment, onReply, onToggleLike, depth = 0 }) => {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const preferKhmer = feedBodyPreferKhmer(comment.content, i18n.resolvedLanguage || i18n.language);
  const styles = React.useMemo(
    () => createStyles(colors, isDark, preferKhmer),
    [colors, isDark, preferKhmer],
  );
  const [isLiking, setIsLiking] = useState(false);
  const authorName = `${comment.author.lastName || ''} ${comment.author.firstName || ''}`.trim();

  const handleLike = async () => {
    if (isLiking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLiking(true);
    await onToggleLike(comment.id);
    setIsLiking(false);
  };

  return (
    <Animated.View style={[styles.commentItem, depth > 0 && styles.replyItem]}>
      <Avatar uri={comment.author.profilePictureUrl} name={authorName} size="sm" variant="post" />
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{authorName}</Text>
            {comment.author.isVerified && (
              <View style={styles.miniVerifiedBadge}>
                <Ionicons name="checkmark" size={8} color="#FFFFFF" />
              </View>
            )}
            {comment.author.role === 'TEACHER' && (
              <View style={styles.teacherBadge}>
                <Text style={styles.teacherBadgeText}>{t('common.teacher')}</Text>
              </View>
            )}
          </View>
          {renderPostBodyText(comment.content, styles.commentText)}
        </View>
        <View style={styles.commentActions}>
          <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
          <ScalePressable onPress={handleLike} pressScale={0.94} style={styles.commentAction}>
            <Ionicons
              name={comment.isLiked ? 'heart' : 'heart-outline'}
              size={14}
              color={comment.isLiked ? '#EF4444' : '#9CA3AF'}
            />
            {comment.likes > 0 && (
              <Text style={[styles.commentActionText, comment.isLiked && { color: '#EF4444' }]}>{comment.likes}</Text>
            )}
          </ScalePressable>
          {depth === 0 && (
          <ScalePressable onPress={() => onReply(comment)} pressScale={0.94} style={styles.commentAction}>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.commentActionText}>{t('common.reply')}</Text>
          </ScalePressable>
          )}
        </View>
        {comment.replies?.map(reply => (
          <CommentItem
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onToggleLike={onToggleLike}
            depth={depth + 1}
          />
        ))}
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ────────────────────────────────────────────
export default function PostDetailScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const repostEnabled = useFeatureFlag('repost_quote');
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;

  const { user } = useAuthStore();
  const {
    feedItems,
    fetchPostById,
    toggleLike,
    bookmarkPost,
    trackPostView,
    comments: storeComments,
    fetchComments,
    addComment,
    toggleCommentLike,
    voteOnPoll,
    isSubmittingComment,
  } = useFeedStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [valued, setValued] = useState(false);
  const [isValueModalVisible, setIsValueModalVisible] = useState(false);
  const [isValueSubmitting, setIsValueSubmitting] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [detailViewBump, setDetailViewBump] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showRepostComposer, setShowRepostComposer] = useState(false);
  const [detailMediaContentWidth, setDetailMediaContentWidth] = useState<number | undefined>(undefined);
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(18)).current;

  // Try to find post in store, or fetch from API
  const postItem = feedItems.find(i => i.type === 'POST' && (i.data as Post).id === postId);
  const post = postItem?.type === 'POST' ? postItem.data as Post : undefined;
  const preferKhmer = feedBodyPreferKhmer(
    `${post?.title || ''} ${post?.content || ''}`,
    i18n.resolvedLanguage || i18n.language,
  );
  const titlePreferKhmer = feedBodyPreferKhmer(
    post?.title,
    i18n.resolvedLanguage || i18n.language,
  );
  const titleHasKhmer = textContainsKhmer(post?.title);
  const styles = React.useMemo(
    () => createStyles(colors, isDark, preferKhmer, titlePreferKhmer, titleHasKhmer),
    [colors, isDark, preferKhmer, titlePreferKhmer, titleHasKhmer],
  );
  const postComments = storeComments[postId] || [];
  const isSubmitting = isSubmittingComment[postId] || false;
  const currentUserOwnsPost = post?.author.id === user?.id;

  // Load post from API
  const loadPost = useCallback(async () => {
    setLoadError(false);
    if (!post) setIsLoading(true);
    try {
      const fetched = await fetchPostById(postId);
      if (!fetched) setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [postId, fetchPostById, post]);

  const onDetailMediaLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setDetailMediaContentWidth(w);
  }, []);

  useEffect(() => {
    setDetailMediaContentWidth(undefined);
    setDetailViewBump(0);
    screenOpacity.setValue(0);
    screenTranslateY.setValue(18);
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(screenTranslateY, {
        toValue: 0,
        damping: 24,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
    loadPost();
    trackPostView(postId);
    feedApi.post(`/posts/${postId}/view`, { source: 'post_detail', duration: 3 })
      .then(() => setDetailViewBump(1))
      .catch(() => { });
    fetchComments(postId).then(() => setIsCommentsLoading(false));
  }, [postId]);

  // Sync local state when post data changes
  useEffect(() => {
    if (post) {
      setLiked(post.isLiked || false);
      setBookmarked(post.isBookmarked || false);
      setLikeCount(post.likes || 0);
      setValued(post.isValued || false);
      setShareCount(post.shares || 0);
      setViewCount((post.views || 0) + detailViewBump);
      setIsFollowingAuthor(post.isFollowingAuthor || false);
      setIsLoading(false);
    }
  }, [post?.id, post?.isLiked, post?.isBookmarked, post?.isValued, post?.likes, post?.shares, post?.views, post?.isFollowingAuthor, detailViewBump]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPost();
    await fetchComments(postId);
    setRefreshing(false);
  }, [loadPost, postId, fetchComments]);

  // ─── Animated styles ────────────────────────────────
  const bookmarkAnimStyle = {
    transform: [{ scale: bookmarkScale }],
  };
  const detailEntranceStyle = {
    opacity: screenOpacity,
    transform: [{ translateY: screenTranslateY }],
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Handlers ───────────────────────────────────────
  const handleLike = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Store owns optimistic like state; local liked/likeCount sync from post props.
    await toggleLike(postId);
  }, [postId, toggleLike]);

  const handleBookmark = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(bookmarkScale, { toValue: 1.25, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.spring(bookmarkScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true })
    ]).start();
    const previousBookmarked = bookmarked;
    setBookmarked(!bookmarked);
    setShowMenu(false);
    try {
      await bookmarkPost(postId);
    } catch {
      setBookmarked(previousBookmarked);
      Alert.alert('Error', 'Failed to update saved post. Please try again.');
    }
  }, [bookmarked, postId, bookmarkPost, bookmarkScale]);

  const handleFollow = useCallback(async () => {
    if (!post || followLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowLoading(true);
    try {
      const res = await feedApi.post(`/users/${post.author.id}/follow`);
      if (res.data.success) {
        setIsFollowingAuthor(res.data.isFollowing);
      }
    } catch (error) {
      if (__DEV__) { console.error('Follow error:', error); }
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  }, [post, followLoading]);

  const handleValue = useCallback(async () => {
    if (valued) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsValueModalVisible(true);
  }, [valued]);

  const handleSubmitValue = useCallback(async (value: EducationalValue) => {
    setIsValueSubmitting(true);
    try {
      await feedApi.post(`/posts/${postId}/value`, {
        accuracy: value.accuracy,
        helpfulness: value.helpfulness,
        clarity: value.clarity,
        depth: value.depth,
        difficulty: value.difficulty,
        wouldRecommend: value.recommend,
      });
      setValued(true);
      setIsValueModalVisible(false);
    } catch (error) {
      if (__DEV__) { console.error('Failed to submit value:', error); }
      Alert.alert('Error', 'Failed to submit educational value. Please try again.');
    } finally {
      setIsValueSubmitting(false);
    }
  }, [postId]);

  const handleSendComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const replyParentId = replyingTo?.id;
    // Clear immediately — addComment inserts an optimistic bubble.
    setCommentText('');
    setReplyingTo(null);
    const success = await addComment(postId, text, replyParentId);
    if (!success) {
      setCommentText(text);
      if (replyParentId) {
        // Best-effort restore reply target if still in the list
        const parent = (storeComments[postId] || []).find((c) => c.id === replyParentId);
        if (parent) setReplyingTo(parent);
      }
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    }
  }, [commentText, postId, addComment, replyingTo, storeComments]);

  const handleReply = useCallback((comment: Comment) => {
    Haptics.selectionAsync();
    setReplyingTo(comment);
    setCommentText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setCommentText('');
  }, []);

  const handleCommentLike = useCallback(async (commentId: string) => {
    const success = await toggleCommentLike(postId, commentId);
    if (!success) {
      Alert.alert('Error', 'Failed to update comment like. Please try again.');
    }
  }, [postId, toggleCommentLike]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    const shared = await shareContent(buildPostShareContent(post));
    if (shared) {
      useFeedStore.getState().sharePost(post.id);
    }
  }, [post]);

  const handleMenuToggle = useCallback(() => {
    Haptics.selectionAsync();
    setShowMenu(true);
  }, []);

  const handleRepost = useCallback(() => {
    if (!repostEnabled) return; // repost_quote kill switch (button is also hidden)
    if (!post) return;
    if (currentUserOwnsPost) {
      Alert.alert(t('common.error'), t('feed.repostOwnError'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Open the quote composer (parity with the feed) so the user can add
    // commentary or repost as-is — instead of the old bare confirm Alert.
    setShowRepostComposer(true);
  }, [repostEnabled, post, currentUserOwnsPost, t]);

  const handleScrollToComments = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const detailMenuActions = useMemo<PostOptionAction[]>(() => {
    if (!post) return [];

    const actions: PostOptionAction[] = [
      {
        key: 'share',
        icon: 'share-outline',
        color: colors.text,
        label: t('common.share', 'Share'),
        onPress: handleShare,
      },
    ];

    if (currentUserOwnsPost) {
      actions.push({
        key: 'edit',
        icon: 'create-outline',
        color: '#0EA5E9',
        label: t('common.edit'),
        onPress: () => navigation.navigate('EditPost' as any, { post }),
      });
    }

    return actions;
  }, [colors.text, currentUserOwnsPost, handleShare, navigation, post, t]);

  // ─── Loading / Error states ─────────────────────────
  if (isLoading && !post) {
    return (
      <View style={styles.centeredContainer}>
        <PostDetailAppBar
          title={t('feed.detail.title')}
          onBack={handleGoBack}
          showActions={false}
          colors={colors}
          isDark={isDark}
        />
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{t('feed.detail.fetching')}</Text>
        </View>
      </View>
    );
  }

  if (loadError && !post) {
    return (
      <View style={styles.centeredContainer}>
        <PostDetailAppBar
          title={t('common.post')}
          onBack={handleGoBack}
          showActions={false}
          colors={colors}
          isDark={isDark}
        />
        <View style={styles.loadingBody}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.errorTitle}>{t('feed.detail.loadError')}</Text>
          <Text style={styles.errorSubtitle}>{t('feed.detail.loadErrorSubtitle')}</Text>
          <ScalePressable pressScale={0.96} onPress={loadPost} style={styles.retryBtn}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>{t('common.tryAgain')}</Text>
          </ScalePressable>
        </View>
      </View>
    );
  }

  if (!post) return null;

  // ─── Derived values ─────────────────────────────────
  const authorName = `${post.author.lastName || ''} ${post.author.firstName || ''}`.trim() || post.author.name || '';
  const rawTypeConfig = POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE;
  const typeKey = post.postType.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  const typeConfig = { ...rawTypeConfig, label: t(`feed.postTypes.${typeKey}`) };
  const detailMediaDisplayMode = String(post.mediaDisplayMode || 'AUTO').toUpperCase();
  const detailMediaAspectRatio = getPostDetailMediaAspectRatio(post);
  const detailMediaBucket = getPostDetailMediaBucket(post);
  const detailMediaMode = detailMediaBucket === 'standard' ? 'auto' : detailMediaBucket;
  const shouldUseFixedDetailMedia = detailMediaDisplayMode !== 'AUTO' && detailMediaDisplayMode !== 'CAROUSEL';
  const learningMeta = post.learningMeta;
  const isCurrentUser = currentUserOwnsPost;
  const deadlineInfo = learningMeta?.deadline ? {
    text: formatRelativeTime(learningMeta.deadline),
    isUrgent: new Date(learningMeta.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000
  } : null;
  const infoMetrics = [
    learningMeta?.estimatedMinutes ? {
      key: 'time',
      icon: 'time-outline',
      color: '#9CA3AF',
      text: `${learningMeta.estimatedMinutes} min`,
    } : null,
    learningMeta?.xpReward ? {
      key: 'xp',
      icon: 'star',
      color: '#F59E0B',
      text: `+${learningMeta.xpReward} XP`,
    } : null,
  ].filter(Boolean) as Array<{ key: string; icon: string; color: string; text: string }>;
  const commentCount = post.comments ?? postComments.length;
  const isQuizPost = post.postType === 'QUIZ' && !!post.quizData;

  // ─── Render ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      <PostDetailAppBar
        title={t('common.post')}
        onBack={handleGoBack}
        scrollY={scrollY}
        authorName={authorName}
        authorAvatarUri={post.author.profilePictureUrl}
        onAuthorPress={() => navigation.navigate('UserProfile' as any, { userId: post.author.id })}
        bookmarked={bookmarked}
        onBookmark={handleBookmark}
        onMenu={handleMenuToggle}
        bookmarkAnimStyle={bookmarkAnimStyle}
        colors={colors}
        isDark={isDark}
      />

      <Animated.View style={[styles.detailBody, detailEntranceStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
        <Animated.ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled={Platform.OS === 'android'}
          scrollEventThrottle={16}
          onScroll={onScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
        >
          {/* ── Author Section ── */}
          <Animated.View style={styles.authorCard}>
            <View style={styles.authorRow}>
              <ScalePressable
                pressScale={0.98}
                pressOpacity={false}
                style={styles.authorProfileBtn}
                onPress={() => navigation.navigate('UserProfile' as any, { userId: post.author.id })}
              >
                <Avatar uri={post.author.profilePictureUrl} name={authorName} size="md" variant="post" />
                <View style={styles.authorInfo}>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{authorName}</Text>
                    {(post.author.isVerified || isCurrentUser) && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={styles.authorMeta}>
                    {post.author.role === 'TEACHER' && (
                      <View style={styles.roleBadge}>
                        <Ionicons name="school" size={10} color="#3B82F6" />
                        <Text style={styles.roleBadgeText}>{t('common.teacher')}</Text>
                      </View>
                    )}
                    <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
                  </View>
                </View>
              </ScalePressable>

              {!isCurrentUser && (
                <ScalePressable
                  pressScale={0.94}
                  style={[styles.followBtn, isFollowingAuthor && styles.followingBtn]}
                  disabled={followLoading}
                  onPress={handleFollow}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowingAuthor ? '#6366F1' : '#fff'} />
                  ) : (
                    <Text style={[styles.followBtnText, isFollowingAuthor && styles.followingBtnText]}>
                      {isFollowingAuthor ? t('common.following') : t('common.follow')}
                    </Text>
                  )}
                </ScalePressable>
              )}
            </View>
          </Animated.View>

          {/* ── Deadline Banner ── */}
          {deadlineInfo && (
            <Animated.View style={[
              styles.deadlineBanner,
              deadlineInfo.isUrgent && styles.deadlineBannerUrgent
            ]}>
              <Ionicons
                name={deadlineInfo.isUrgent ? 'warning' : 'time-outline'}
                size={16}
                color={deadlineInfo.isUrgent ? '#EF4444' : '#0EA5E9'}
              />
              <Text style={[styles.deadlineText, deadlineInfo.isUrgent && { color: '#EF4444' }]}>
                {deadlineInfo.isUrgent ? t('feed.sections.dueSoon') : t('feed.sections.due')}{deadlineInfo.text}
              </Text>
            </Animated.View>
          )}

          {/* ── Media ── */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <Animated.View style={styles.mediaContainer} onLayout={onDetailMediaLayout}>
              <ImageCarousel
                images={post.mediaUrls}
                mediaMetadata={post.mediaMetadata || []}
                borderRadius={0}
                aspectRatio={shouldUseFixedDetailMedia ? detailMediaAspectRatio : undefined}
                mode={shouldUseFixedDetailMedia ? detailMediaMode : 'auto'}
                fullBleed
                contentWidth={detailMediaContentWidth}
                sharedTransitionTag={postMediaTransitionTag(post.id)}
              />
              {/* View count overlay */}
              <View style={styles.viewCountOverlay}>
                <Ionicons name="eye-outline" size={14} color="#fff" />
                <Text style={styles.viewCountText}>
                  {t('feed.detail.viewsFormatted', { views: formatNumber(viewCount) })}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── Title ── */}
          {post.title && (
            <Animated.View style={styles.titleSection}>
              {isQuizPost && (
                <Text style={styles.quizSectionLabel}>{typeConfig.label}</Text>
              )}
              {renderPostTitleText(post.title, styles.postTitle)}
            </Animated.View>
          )}

          {/* ── Body text ── */}
          {!!post.content?.trim() && (
            <Animated.View style={styles.contentCard}>
              {renderPostBodyText(post.content, styles.contentText)}
            </Animated.View>
          )}

          {/* Poll */}
          {post.postType === 'POLL' && post.pollOptions && post.pollOptions.length > 0 && (
            <View style={styles.pollSection}>
              <PollVoting
                options={post.pollOptions}
                userVotedOptionId={post.userVotedOptionId}
                onVote={(optionId) => voteOnPoll(post.id, optionId)}
                endsAt={post.learningMeta?.deadline}
              />
            </View>
          )}

          {/* Quiz hero — featured block */}
          {isQuizPost && post.quizData && (
            <PostDetailQuizHero
              quizData={post.quizData}
              postTitle={post.title}
              postContent={post.content}
              gradient={getQuizGradient(post.id)}
              accentColor={typeConfig.color}
            />
          )}

          {/* Non-quiz extras inside content flow */}
          {!isQuizPost && (
          <Animated.View style={styles.contentCard}>
            {post.topicTags && post.topicTags.length > 0 && (
              <View style={styles.tagsRow}>
                {post.topicTags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Learning Info Bar ── */}
            <View style={styles.infoBar}>
              <View style={[styles.typeChip, { backgroundColor: isDark ? `${typeConfig.color}26` : typeConfig.bgColor }]}>
                <Ionicons name={typeConfig.icon as any} size={13} color={typeConfig.color} />
                <Text style={[styles.typeChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
              </View>
              {learningMeta?.difficulty && (
                <View style={[styles.difficultyBadge, { backgroundColor: isDark ? `${DIFFICULTY_CONFIG[learningMeta.difficulty].color}26` : DIFFICULTY_CONFIG[learningMeta.difficulty].bgColor }]}>
                  <Ionicons
                    name={DIFFICULTY_CONFIG[learningMeta.difficulty].icon as any}
                    size={11}
                    color={DIFFICULTY_CONFIG[learningMeta.difficulty].color}
                  />
                  <Text style={[styles.difficultyText, { color: DIFFICULTY_CONFIG[learningMeta.difficulty].color }]}>
                    {t(DIFFICULTY_CONFIG[learningMeta.difficulty].labelKey)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              {infoMetrics.map((metric) => (
                <View key={metric.key} style={styles.metric}>
                  <Ionicons name={metric.icon as any} size={13} color={metric.color} />
                  <Text style={styles.metricText}>{metric.text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
          )}

          {isQuizPost && post.topicTags && post.topicTags.length > 0 && (
            <View style={styles.tagsRow}>
              {post.topicTags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Progress Bar ── */}
          {learningMeta?.progress !== undefined && ['COURSE', 'QUIZ', 'TUTORIAL'].includes(post.postType) && (
            <Animated.View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{t('feed.sections.progress')}</Text>
                <Text style={styles.progressPercent}>{learningMeta.progress}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${learningMeta.progress}%` }]}
                />
              </View>
            </Animated.View>
          )}

          {/* ── Engagement ── */}
          <Animated.View style={styles.engagementCard}>
            {/* Action Bar — matches feed PostCard */}
            <View style={styles.feedActionBar}>
              <View style={styles.feedActionLeft}>
                <AnimatedActionButton
                  icon="heart-outline"
                  activeIcon="heart"
                  active={liked}
                  count={likeCount}
                  color={colors.text}
                  activeColor="#EF4444"
                  onPress={handleLike}
                  size={24}
                  accessibilityLabel={t('feed.actions.like')}
                  textStyle={styles.feedActionText}
                  activeTextStyle={styles.feedActionTextLiked}
                />
                <AnimatedActionButton
                  icon="chatbubble-outline"
                  count={commentCount}
                  color={colors.text}
                  activeColor="#1D9BF0"
                  onPress={handleScrollToComments}
                  size={24}
                  accessibilityLabel={t('feed.actions.comment')}
                  textStyle={styles.feedActionText}
                />
                {repostEnabled && (
                  <AnimatedActionButton
                    icon="repeat-outline"
                    count={shareCount}
                    color={colors.text}
                    activeColor="#00BA7C"
                    onPress={handleRepost}
                    size={26}
                    accessibilityLabel={t('feed.repost')}
                    textStyle={styles.feedActionText}
                  />
                )}
                <AnimatedActionButton
                  icon="paper-plane-outline"
                  color={colors.text}
                  activeColor="#1D9BF0"
                  onPress={handleShare}
                  size={23}
                  accessibilityLabel={t('common.share')}
                />
              </View>
              <AnimatedActionButton
                icon="diamond-outline"
                activeIcon="diamond"
                active={valued}
                color={colors.text}
                activeColor="#8B5CF6"
                onPress={handleValue}
                size={24}
                accessibilityLabel={t('feed.actions.rateValue')}
              />
            </View>
          </Animated.View>

          {/* ── Comments Section ── */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsTitleRow}>
              <Text style={styles.commentsTitle}>{t('feed.sections.comments')}</Text>
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{commentCount}</Text>
              </View>
            </View>

            {isCommentsLoading ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.commentsLoadingText}>{t('feed.sections.loadingComments')}</Text>
              </View>
            ) : postComments.length === 0 ? (
              <View style={styles.noComments}>
                <View style={styles.noCommentsIcon}>
                  <Ionicons name="chatbubbles-outline" size={36} color={colors.textTertiary} />
                </View>
                <Text style={styles.noCommentsText}>{t('feed.sections.noComments')}</Text>
                <Text style={styles.noCommentsSubtext}>{t('feed.sections.beFirst')}</Text>
              </View>
            ) : (
              postComments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onToggleLike={handleCommentLike}
                />
              ))
            )}
          </View>
        </Animated.ScrollView>

        {/* ── Comment Input ── */}
        <SafeAreaView edges={['bottom']} style={styles.commentInputSafe}>
        <View style={styles.commentInputBar}>
          <Avatar
            uri={user?.profilePictureUrl}
            name={user ? `${user.lastName} ${user.firstName}` : 'User'}
            size="sm"
            variant="post"
          />
          <View style={styles.commentInputWrapper}>
            {replyingTo && (
              <View style={styles.replyBanner}>
                <View style={styles.replyBannerTextWrap}>
                  <Text style={styles.replyBannerTitle}>
                    {t('feed.sections.replyingTo')} {`${replyingTo.author.firstName || ''} ${replyingTo.author.lastName || ''}`.trim() || 'comment'}
                  </Text>
                  <Text style={styles.replyBannerText} numberOfLines={1}>{replyingTo.content}</Text>
                </View>
                <ScalePressable pressScale={0.9} onPress={handleCancelReply} style={styles.replyBannerClose}>
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </ScalePressable>
              </View>
            )}
            <TextInput
              style={styles.commentInput}
              placeholder={replyingTo ? t('feed.sections.writeReply') : t('feed.sections.writeComment')}
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
          </View>
          <ScalePressable
            pressScale={0.9}
            onPress={handleSendComment}
            disabled={!commentText.trim() || isSubmitting}
            style={[styles.sendBtn, commentText.trim() && !isSubmitting && styles.sendBtnActive]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={commentText.trim() ? '#fff' : '#D1D5DB'}
              />
            )}
          </ScalePressable>
        </View>
        </SafeAreaView>
        </KeyboardAvoidingView>
      </Animated.View>
      <EducationalValueModal
        visible={isValueModalVisible}
        onClose={() => setIsValueModalVisible(false)}
        onSubmit={handleSubmitValue}
        isSubmitting={isValueSubmitting}
        postType={post.postType}
        authorName={authorName || 'Unknown'}
      />
      <PostOptionsSheet
        visible={showMenu}
        title={t('common.post')}
        actions={detailMenuActions}
        onClose={() => setShowMenu(false)}
      />

      {showRepostComposer && post && (
        <RepostComposer
          visible={showRepostComposer}
          post={post}
          onClose={() => setShowRepostComposer(false)}
          onReposted={() => setShareCount((prev) => prev + 1)}
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const createStyles = (
  colors: any,
  isDark: boolean,
  preferKhmer = false,
  titlePreferKhmer = false,
  titleHasKhmer = false,
) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centeredContainer: { flex: 1, backgroundColor: colors.background },
  loadingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  loadingText: { fontSize: 15, color: colors.textTertiary, marginTop: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
  errorSubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 16,
  },
  retryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  detailBody: { flex: 1 },

  // Dropdown
  dropdown: {
    position: 'absolute', top: 56, right: 16,
    backgroundColor: colors.card, borderRadius: 14, paddingVertical: 6,
    minWidth: 180,
    shadowColor: '#000', shadowRadius: 16,
    zIndex: 1000,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '500', color: colors.text },
  menuDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  scrollContent: { paddingBottom: 100 },

  // Author Section — compact, feed-aligned
  authorCard: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorProfileBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorInfo: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: 16, fontWeight: '700', color: colors.text },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#1D9BF0',
    alignItems: 'center', justifyContent: 'center',
  },
  authorMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, gap: 3,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: isDark ? '#93C5FD' : '#3B82F6' },
  timeText: { fontSize: 13, color: colors.textTertiary },
  followBtn: {
    minWidth: 82,
    backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, alignItems: 'center',
  },
  followBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  followingBtn: { backgroundColor: isDark ? colors.surfaceVariant : '#EEF2FF', borderWidth: 1, borderColor: isDark ? colors.border : '#C7D2FE' },
  followingBtnText: { color: '#4F46E5' },

  // Deadline Banner
  deadlineBanner: {
    backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    borderLeftWidth: 3, borderLeftColor: '#0EA5E9',
  },
  deadlineBannerUrgent: { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', borderLeftColor: '#EF4444' },
  deadlineText: { fontSize: 13, fontWeight: '600', color: '#0EA5E9' },

  // Media
  mediaContainer: { width: '100%', backgroundColor: '#000', position: 'relative' },
  viewCountOverlay: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  viewCountText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  // Title
  titleSection: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingTop: titleHasKhmer ? 12 : 14,
    paddingBottom: 6,
    overflow: 'visible',
    gap: 8,
  },
  quizSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: -0.08,
    textTransform: 'uppercase',
  },
  postTitle: {
    ...feedTextStyle('titleDetail', { preferKhmer: titlePreferKhmer, color: colors.text }),
    ...(titleHasKhmer && Platform.OS === 'android' ? { includeFontPadding: true } : null),
  },

  // Content
  contentCard: { backgroundColor: colors.card },
  contentText: {
    ...feedTextStyle('bodyDetail', { preferKhmer, color: colors.textSecondary }),
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },

  // Poll
  pollSection: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.card },

  // Tags
  tagsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingBottom: 12, gap: 6,
  },
  tag: {
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: '#6366F1' },

  // Info Bar
  infoBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5,
  },
  typeChipText: { fontSize: 12, fontWeight: '700' },
  difficultyBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4,
  },
  difficultyText: { fontSize: 11, fontWeight: '600' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { fontSize: 12, fontWeight: '500', color: colors.textTertiary },

  // Progress
  progressCard: {
    backgroundColor: colors.card,

    marginTop: 6, paddingHorizontal: 16, paddingVertical: 16,
    borderRadius: 14, marginHorizontal: 12,


  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  progressPercent: { fontSize: 16, fontWeight: '700', color: '#6366F1' },
  progressBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Engagement
  engagementCard: {
    backgroundColor: colors.card,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  feedActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  feedActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  feedActionButton: {
    minWidth: 36,
  },
  feedActionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  feedActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  feedActionTextLiked: {
    color: '#EF4444',
  },

  // Comments
  commentsSection: {
    backgroundColor: colors.card,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  commentsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  commentsTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  commentCountBadge: {
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  commentCountText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  commentsLoading: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  commentsLoadingText: { fontSize: 13, color: colors.textTertiary },
  commentItem: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  replyItem: { marginTop: 10, marginBottom: 0 },
  commentContent: { flex: 1 },
  commentBubble: {
    backgroundColor: isDark ? colors.surfaceVariant : '#FFFFFF', borderRadius: 16, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderColor: colors.border,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: colors.text },
  miniVerifiedBadge: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#1D9BF0',
    alignItems: 'center', justifyContent: 'center',
  },
  teacherBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  teacherBadgeText: { fontSize: 9, fontWeight: '700', color: '#3B82F6' },
  commentText: {
    ...feedTextStyle('body', { preferKhmer, color: colors.text }),
    fontSize: 14,
    lineHeight: preferKhmer ? 22 : 20,
  },
  commentActions: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingLeft: 4, gap: 14,
  },
  commentTime: { fontSize: 11, color: colors.textTertiary },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 12, fontWeight: '500', color: colors.textTertiary },
  noComments: { alignItems: 'center', paddingVertical: 32 },
  noCommentsIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: isDark ? colors.surfaceVariant : '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  noCommentsText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  noCommentsSubtext: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },

  // Comment Input
  commentInputSafe: {
    backgroundColor: colors.card,
  },
  commentInputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 10,
  },
  commentInputWrapper: {
    flex: 1, backgroundColor: isDark ? colors.surfaceVariant : '#FFFFFF', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100,
  },
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderLeftWidth: 3, borderLeftColor: '#6366F1',
    paddingLeft: 8, paddingBottom: 8, marginBottom: 8,
  },
  replyBannerTextWrap: { flex: 1 },
  replyBannerTitle: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  replyBannerText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  replyBannerClose: { padding: 4 },
  commentInput: { fontSize: 14, color: colors.text, maxHeight: 80 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: '#6366F1' },
});
