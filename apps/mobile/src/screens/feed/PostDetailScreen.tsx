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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Share,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';


import { Avatar, ImageCarousel } from '@/components/common';
import { EducationalValueModal, type EducationalValue, PollVoting } from '@/components/feed';
import { useAuthStore, useFeedStore } from '@/stores';
import { Post, Comment, DifficultyLevel } from '@/types';
import { formatRelativeTime, formatNumber } from '@/utils';
import { FeedStackParamList } from '@/navigation/types';
import { feedApi } from '@/api/client';
import { useThemeContext } from '@/contexts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PostDetailRouteProp = RouteProp<FeedStackParamList, 'PostDetail'>;

// Difficulty configurations
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string; bgColor: string; icon: string }> = {
  BEGINNER: { label: 'Beginner', color: '#10B981', bgColor: '#D1FAE5', icon: 'leaf' },
  INTERMEDIATE: { label: 'Intermediate', color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'flash' },
  ADVANCED: { label: 'Advanced', color: '#EF4444', bgColor: '#FEE2E2', icon: 'rocket' },
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
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
        <View style={styles.commentActions}>
          <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
          <TouchableOpacity onPress={handleLike} style={styles.commentAction}>
            <Ionicons
              name={comment.isLiked ? 'heart' : 'heart-outline'}
              size={14}
              color={comment.isLiked ? '#EF4444' : '#9CA3AF'}
            />
            {comment.likes > 0 && (
              <Text style={[styles.commentActionText, comment.isLiked && { color: '#EF4444' }]}>{comment.likes}</Text>
            )}
          </TouchableOpacity>
          {depth === 0 && (
          <TouchableOpacity onPress={() => onReply(comment)} style={styles.commentAction}>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.commentActionText}>{t('common.reply')}</Text>
          </TouchableOpacity>
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
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;

  const { user } = useAuthStore();
  const {
    feedItems,
    fetchPostById,
    likePost,
    unlikePost,
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
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const likeScale = useRef(new Animated.Value(1)).current;
  const valueScale = useRef(new Animated.Value(1)).current;
  const actionScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  // Try to find post in store, or fetch from API
  const postItem = feedItems.find(i => i.type === 'POST' && (i.data as Post).id === postId);
  const post = postItem?.type === 'POST' ? postItem.data as Post : undefined;
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

  useEffect(() => {
    setDetailViewBump(0);
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
  const likeAnimStyle = {
    transform: [{ scale: likeScale }],
  };
  const bookmarkAnimStyle = {
    transform: [{ scale: bookmarkScale }],
  };
  const valueAnimStyle = {
    transform: [{ scale: valueScale }],
  };
  const actionAnimStyle = {
    transform: [{ scale: actionScale }],
  };

  // ─── Handlers ───────────────────────────────────────
  const handleLike = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.3, friction: 3, tension: 40, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true })
    ]).start();
    const previousLiked = liked;
    const previousCount = likeCount;

    if (liked) {
      setLikeCount(prev => prev - 1);
      setLiked(false);
      try {
        await unlikePost(postId);
      } catch {
        setLiked(previousLiked);
        setLikeCount(previousCount);
      }
    } else {
      setLikeCount(prev => prev + 1);
      setLiked(true);
      try {
        await likePost(postId);
      } catch {
        setLiked(previousLiked);
        setLikeCount(previousCount);
      }
    }
  }, [liked, likeCount, postId, likePost, unlikePost, likeScale]);

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
      console.error('Follow error:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  }, [post, followLoading]);

  const handleValue = useCallback(async () => {
    if (valued) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(valueScale, { toValue: 1.35, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.spring(valueScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true })
    ]).start();
    setIsValueModalVisible(true);
  }, [valued, valueScale]);

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
      console.error('Failed to submit value:', error);
      Alert.alert('Error', 'Failed to submit educational value. Please try again.');
    } finally {
      setIsValueSubmitting(false);
    }
  }, [postId]);

  const handleSendComment = useCallback(async () => {
    if (!commentText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await addComment(postId, commentText.trim(), replyingTo?.id);
    if (success) {
      setCommentText('');
      setReplyingTo(null);
    }
  }, [commentText, postId, addComment, replyingTo]);

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
    try {
      await Share.share({
        message: `Check out this ${post.postType.toLowerCase()} on Stunity:\n\n${post.content}\n\n#Stunity #Education`,
        title: `${post.author.firstName}'s ${post.postType}`,
        url: `https://stunity.com/posts/${post.id}`,
      });
      useFeedStore.getState().sharePost(post.id);
    } catch { }
  }, [post]);

  const handleRepost = useCallback(() => {
    if (!post) return;
    if (currentUserOwnsPost) {
      Alert.alert('Error', 'You cannot repost your own post.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(actionScale, { toValue: 1.25, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.spring(actionScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true })
    ]).start();
    Alert.alert(
      'Repost',
      `Repost ${post.author.firstName || 'this author'}'s post to your feed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Repost',
          onPress: async () => {
            try {
              const res = await feedApi.post(`/posts/${post.id}/repost`, { comment: '' });
              if (res.data.success) {
                await useFeedStore.getState().fetchPosts(true);
                setShareCount((prev) => prev + 1);
                Alert.alert('Success', 'Post reposted to your feed.');
              } else {
                Alert.alert('Error', res.data.error || 'Failed to repost.');
              }
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to repost.');
            }
          },
        },
      ]
    );
  }, [post, currentUserOwnsPost, actionScale]);

  const handleScrollToComments = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  // ─── Loading / Error states ─────────────────────────
  if (isLoading && !post) {
    return (
      <View style={styles.centeredContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_aea974ec" /></Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_a376a749" /></Text>
        </View>
      </View>
    );
  }

  if (loadError && !post) {
    return (
      <View style={styles.centeredContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('common.post')}</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingBody}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.errorTitle}>{t('feed.detail.loadError')}</Text>
          <Text style={styles.errorSubtitle}>{t('feed.detail.loadErrorSubtitle')}</Text>
          <TouchableOpacity onPress={loadPost} style={styles.retryBtn}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
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

  // ─── Render ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>

          {/* Post type badge in header */}
          <View style={styles.headerCenter}>
            <View style={[styles.headerTypeBadge, { backgroundColor: typeConfig.bgColor }]}>
              <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
              <Text style={[styles.headerTypeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Bookmark always visible in header */}
            <Animated.View style={bookmarkAnimStyle}>
              <TouchableOpacity onPress={handleBookmark} style={styles.headerIconBtn}>
                <Ionicons
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={bookmarked ? '#6366F1' : '#6B7280'}
                />
              </TouchableOpacity>
            </Animated.View>
            {/* Menu */}
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMenu(!showMenu)}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropdown Menu */}
        {showMenu && (
          <Animated.View style={styles.dropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <Text style={styles.menuText}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_84b83bdb" /></Text>
            </TouchableOpacity>
            {isCurrentUser && (
              <>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                navigation.navigate('EditPost' as any, { post });
              }}>
                <Ionicons name="create-outline" size={18} color={colors.text} />
                <Text style={styles.menuText}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_b71cbb7b" /></Text>
              </TouchableOpacity>
              </>
            )}
          </Animated.View>
        )}
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
        >
          {/* ── Author Section ── */}
          <Animated.View style={styles.authorCard}>
            <View style={styles.authorRow}>
              <TouchableOpacity
                style={styles.authorProfileBtn}
                onPress={() => navigation.navigate('UserProfile' as any, { userId: post.author.id })}
                activeOpacity={0.7}
              >
                <Avatar uri={post.author.profilePictureUrl} name={authorName} size="lg" variant="post" />
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
              </TouchableOpacity>

              {/* Follow button for non-own posts */}
              {!isCurrentUser && (
                <TouchableOpacity
                  style={[styles.followBtn, isFollowingAuthor && styles.followingBtn]}
                  activeOpacity={0.7}
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
                </TouchableOpacity>
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
            <Animated.View style={styles.mediaContainer}>
              <ImageCarousel images={post.mediaUrls} borderRadius={0} mode="auto" />
              {/* View count overlay */}
              <View style={styles.viewCountOverlay}>
                <Ionicons name="eye-outline" size={14} color="#fff" />
                <Text style={styles.viewCountText}>
                  {t('feed.detail.viewsFormatted', { views: formatNumber(viewCount) })}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── Title (if present) ── */}
          {post.title && (
            <Animated.View style={styles.titleSection}>
              <Text style={styles.postTitle}>{post.title}</Text>
            </Animated.View>
          )}

          {/* ── Content ── */}
          <Animated.View style={styles.contentCard}>
            <Text style={styles.contentText}>{post.content}</Text>

            {/* Poll Voting */}
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

            {/* Quiz Card */}
            {post.postType === 'QUIZ' && post.quizData && (
              <View style={styles.quizSection}>
                <LinearGradient
                  colors={getQuizGradient(post.id)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quizGradientCard}
                >
                  <View style={styles.quizHeader}>
                    <View style={styles.quizIconCircle}>
                      <Ionicons name="rocket" size={24} color={typeConfig.color} />
                    </View>
                    <View style={styles.quizHeaderText}>
                      <Text style={styles.quizHeaderTitle}>{t('feed.sections.testKnowledge')}</Text>
                      <Text style={styles.quizHeaderSubtitle}>{t('feed.sections.completeQuiz')}</Text>
                    </View>
                  </View>
                  <View style={styles.quizStatsGrid}>
                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="document-text-outline" size={18} color={typeConfig.color} />
                      </View>
                      <Text style={styles.quizStatValue}>{post.quizData.questions?.length || 0}</Text>
                      <Text style={styles.quizStatLabel}>{t('feed.sections.questions')}</Text>
                    </View>
                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="time-outline" size={18} color={typeConfig.color} />
                      </View>
                      <Text style={styles.quizStatValue}>
                        {post.quizData.timeLimit ? t('feed.sections.minutesShort', { count: post.quizData.timeLimit }) : '∞'}
                      </Text>
                      <Text style={styles.quizStatLabel}>{t('feed.sections.time')}</Text>
                    </View>
                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="star" size={18} color="#0EA5E9" />
                      </View>
                      <Text style={styles.quizStatValue}>{post.quizData.totalPoints || 100}</Text>
                      <Text style={styles.quizStatLabel}>{t('feed.sections.points')}</Text>
                    </View>
                  </View>
                  {post.quizData.userAttempt && (
                    <View style={styles.quizPrevResult}>
                      <Ionicons name="checkmark-circle" size={16} color={post.quizData.userAttempt.passed ? '#22c55e' : '#f59e0b'} />
                      <Text style={styles.quizPrevResultText}>
                        {t('feed.detail.lastAttempt', { score: Math.round(post.quizData.userAttempt.score ?? 0) })}
                        {post.quizData.userAttempt.passed ? t('feed.detail.passedSuffix') : t('feed.detail.notPassedSuffix')}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.quizStartButton}
                    onPress={() => navigation.navigate('TakeQuiz' as any, {
                      quiz: { ...post.quizData, title: post.title },
                    })}
                  >
                    <Text style={styles.quizStartButtonText}>
                      {post.quizData.userAttempt ? t('feed.detail.retakeQuiz') : t('feed.detail.startQuiz')}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={typeConfig.color} />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}

            {/* ── Topic Tags ── */}
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
              <View style={[styles.typeChip, { backgroundColor: typeConfig.bgColor }]}>
                <Ionicons name={typeConfig.icon as any} size={13} color={typeConfig.color} />
                <Text style={[styles.typeChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
              </View>
              {learningMeta?.difficulty && (
                <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_CONFIG[learningMeta.difficulty].bgColor }]}>
                  <Ionicons
                    name={DIFFICULTY_CONFIG[learningMeta.difficulty].icon as any}
                    size={11}
                    color={DIFFICULTY_CONFIG[learningMeta.difficulty].color}
                  />
                  <Text style={[styles.difficultyText, { color: DIFFICULTY_CONFIG[learningMeta.difficulty].color }]}>
                    {DIFFICULTY_CONFIG[learningMeta.difficulty].label}
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

          {/* ── Progress Bar ── */}
          {learningMeta?.progress !== undefined && ['COURSE', 'QUIZ', 'TUTORIAL'].includes(post.postType) && (
            <Animated.View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_ce178b15" /></Text>
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

          {/* ── Engagement Stats ── */}
          <Animated.View style={styles.engagementCard}>
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem}>
                <Ionicons name="heart" size={16} color="#EF4444" />
                <Text style={styles.statText}>{formatNumber(likeCount)}</Text>
              </TouchableOpacity>
              <View style={styles.statDot} />
              <TouchableOpacity style={styles.statItem} onPress={handleScrollToComments}>
                <Ionicons name="chatbubble" size={16} color="#6366F1" />
                <Text style={styles.statText}>{commentCount} <AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_b030aabd" /></Text>
              </TouchableOpacity>
              <View style={styles.statDot} />
              <View style={styles.statItem}>
                <Ionicons name="eye" size={16} color="#9CA3AF" />
                <Text style={styles.statText}>{formatNumber(viewCount)}</Text>
              </View>
            </View>

            {/* Action Bar */}
            <View style={styles.feedActionBar}>
              <View style={styles.feedActionLeft}>
                <Animated.View style={[likeAnimStyle, styles.feedActionButton]}>
                  <TouchableOpacity onPress={handleLike} style={styles.feedActionButtonInner}>
                    <Ionicons
                      name={liked ? 'heart' : 'heart-outline'}
                      size={24}
                      color={liked ? '#EF4444' : '#262626'}
                    />
                    {likeCount > 0 && (
                      <Text style={[styles.feedActionText, liked && styles.feedActionTextLiked]}>{formatNumber(likeCount)}</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={[actionAnimStyle, styles.feedActionButton]}>
                  <TouchableOpacity style={styles.feedActionButtonInner} onPress={handleScrollToComments}>
                    <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
                    {commentCount > 0 && <Text style={styles.feedActionText}>{formatNumber(commentCount)}</Text>}
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={[actionAnimStyle, styles.feedActionButton]}>
                  <TouchableOpacity style={styles.feedActionButtonInner} onPress={handleRepost}>
                    <Ionicons name="repeat-outline" size={26} color={colors.text} />
                    {shareCount > 0 && <Text style={styles.feedActionText}>{formatNumber(shareCount)}</Text>}
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={[actionAnimStyle, styles.feedActionButton]}>
                  <TouchableOpacity style={styles.feedActionButtonInner} onPress={handleShare}>
                    <Ionicons name="paper-plane-outline" size={23} color={colors.text} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <Animated.View style={[valueAnimStyle, styles.feedActionButton]}>
                <TouchableOpacity onPress={handleValue} style={styles.feedActionButtonInner}>
                  <Ionicons
                    name={valued ? 'diamond' : 'diamond-outline'}
                    size={24}
                    color={valued ? '#8B5CF6' : '#262626'}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

          {/* ── Comments Section ── */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsTitleRow}>
              <Text style={styles.commentsTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_4639e67a" /></Text>
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{commentCount}</Text>
              </View>
            </View>

            {isCommentsLoading ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.commentsLoadingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_9f51e798" /></Text>
              </View>
            ) : postComments.length === 0 ? (
              <View style={styles.noComments}>
                <View style={styles.noCommentsIcon}>
                  <Ionicons name="chatbubbles-outline" size={36} color={colors.textTertiary} />
                </View>
                <Text style={styles.noCommentsText}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_55737be9" /></Text>
                <Text style={styles.noCommentsSubtext}><AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_4d0733b3" /></Text>
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
        </ScrollView>

        {/* ── Comment Input ── */}
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
                    <AutoI18nText i18nKey="auto.mobile.screens_feed_PostDetailScreen.k_11aaaf87" /> {`${replyingTo.author.firstName || ''} ${replyingTo.author.lastName || ''}`.trim() || 'comment'}
                  </Text>
                  <Text style={styles.replyBannerText} numberOfLines={1}>{replyingTo.content}</Text>
                </View>
                <TouchableOpacity onPress={handleCancelReply} style={styles.replyBannerClose}>
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={styles.commentInput}
              placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
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
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <EducationalValueModal
        visible={isValueModalVisible}
        onClose={() => setIsValueModalVisible(false)}
        onSubmit={handleSubmitValue}
        isSubmitting={isValueSubmitting}
        postType={post.postType}
        authorName={authorName || 'Unknown'}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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

  // Header
  headerSafe: { backgroundColor: colors.card, zIndex: 100, borderBottomWidth: 1, borderBottomColor: colors.border },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
  },
  headerTypeText: { fontSize: 13, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerIconBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },

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

  // Author Section
  authorCard: {
    backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 16,
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
    backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, gap: 3,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#3B82F6' },
  timeText: { fontSize: 13, color: colors.textTertiary },
  followBtn: {
    minWidth: 82,
    backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 14, alignItems: 'center',
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
  titleSection: { backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 16 },
  postTitle: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 28 },

  // Content
  contentCard: { backgroundColor: colors.card, paddingBottom: 4 },
  contentText: {
    fontSize: 16, color: colors.text, lineHeight: 25,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },

  // Poll
  pollSection: { paddingHorizontal: 16, paddingBottom: 12 },

  // Quiz
  quizSection: { paddingHorizontal: 16, paddingBottom: 12 },
  quizGradientCard: { borderRadius: 14, padding: 20 },
  quizHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  quizIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  quizHeaderText: { flex: 1 },
  quizHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  quizHeaderSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  quizStatsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quizStatItem: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 6,
  },
  quizStatIconBg: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  quizStatValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  quizStatLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  quizPrevResult: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  quizPrevResultText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
  quizStartButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderRadius: 14, paddingVertical: 14, gap: 8,
  },
  quizStartButtonText: { fontSize: 16, fontWeight: '700' },

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
    backgroundColor: colors.card, marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border },
  feedActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    backgroundColor: colors.card, marginTop: 6, paddingHorizontal: 16, paddingVertical: 20,
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
  commentText: { fontSize: 14, color: colors.text, lineHeight: 20 },
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
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: '#6366F1' },
});
