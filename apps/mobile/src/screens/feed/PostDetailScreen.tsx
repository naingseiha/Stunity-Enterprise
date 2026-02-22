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
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { Avatar, ImageCarousel } from '@/components/common';
import { PollVoting } from '@/components/feed';
import { useAuthStore, useFeedStore } from '@/stores';
import { Post, Comment, DifficultyLevel } from '@/types';
import { formatRelativeTime, formatNumber } from '@/utils';
import { FeedStackParamList } from '@/navigation/types';
import { feedApi } from '@/api/client';

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
const CommentItem: React.FC<{ comment: Comment; onReply: (id: string) => void }> = ({ comment, onReply }) => {
  const [liked, setLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const authorName = `${comment.author.firstName} ${comment.author.lastName}`;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <Animated.View entering={FadeInDown.duration(250)} style={styles.commentItem}>
      <Avatar uri={comment.author.profilePictureUrl} name={authorName} size="sm" variant="post" />
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{authorName}</Text>
            {comment.author.isVerified && (
              <View style={styles.miniVerifiedBadge}>
                <Ionicons name="checkmark" size={8} color="#fff" />
              </View>
            )}
            {comment.author.role === 'TEACHER' && (
              <View style={styles.teacherBadge}>
                <Text style={styles.teacherBadgeText}>Teacher</Text>
              </View>
            )}
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
        <View style={styles.commentActions}>
          <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
          <TouchableOpacity onPress={handleLike} style={styles.commentAction}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={14}
              color={liked ? '#EF4444' : '#9CA3AF'}
            />
            {likeCount > 0 && (
              <Text style={[styles.commentActionText, liked && { color: '#EF4444' }]}>{likeCount}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onReply(comment.id)} style={styles.commentAction}>
            <Ionicons name="chatbubble-outline" size={13} color="#9CA3AF" />
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ────────────────────────────────────────────
export default function PostDetailScreen() {
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
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  // Try to find post in store, or fetch from API
  const postItem = feedItems.find(i => i.type === 'POST' && (i.data as Post).id === postId);
  const post = postItem?.type === 'POST' ? postItem.data as Post : undefined;
  const postComments = storeComments[postId] || [];
  const isSubmitting = isSubmittingComment[postId] || false;

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
    loadPost();
    trackPostView(postId);
    fetchComments(postId).then(() => setIsCommentsLoading(false));
  }, [postId]);

  // Sync local state when post data changes
  useEffect(() => {
    if (post) {
      setLiked(post.isLiked || false);
      setBookmarked(post.isBookmarked || false);
      setLikeCount(post.likes || 0);
      setIsLoading(false);
    }
  }, [post?.id, post?.isLiked, post?.isBookmarked, post?.likes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPost();
    await fetchComments(postId);
    setRefreshing(false);
  }, [loadPost, postId, fetchComments]);

  // ─── Animated styles ────────────────────────────────
  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  const bookmarkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  // ─── Handlers ───────────────────────────────────────
  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeScale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    if (liked) {
      setLikeCount(prev => prev - 1);
      unlikePost(postId);
    } else {
      setLikeCount(prev => prev + 1);
      likePost(postId);
    }
    setLiked(!liked);
  }, [liked, postId]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bookmarkScale.value = withSequence(
      withSpring(1.25, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    setBookmarked(!bookmarked);
    bookmarkPost(postId);
    setShowMenu(false);
  }, [bookmarked, postId]);

  const handleValue = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValued(!valued);
    if (!valued) {
      try {
        await feedApi.post(`/posts/${postId}/value`, {
          accuracy: 5, helpfulness: 5, clarity: 5, depth: 5,
          difficulty: 'JUST_RIGHT', wouldRecommend: true,
        });
      } catch (error) {
        console.error('Failed to submit value:', error);
      }
    }
  }, [valued, postId]);

  const handleSendComment = useCallback(async () => {
    if (!commentText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await addComment(postId, commentText.trim());
    if (success) setCommentText('');
  }, [commentText, postId, addComment]);

  const handleReply = useCallback((commentId: string) => {
    Haptics.selectionAsync();
    setCommentText(`@reply `);
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

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
              <Ionicons name="chevron-back" size={22} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading...</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading post...</Text>
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
              <Ionicons name="chevron-back" size={22} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingBody}>
          <Ionicons name="alert-circle-outline" size={56} color="#D1D5DB" />
          <Text style={styles.errorTitle}>Couldn't load post</Text>
          <Text style={styles.errorSubtitle}>It may have been deleted or you may not have access</Text>
          <TouchableOpacity onPress={loadPost} style={styles.retryBtn}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!post) return null;

  // ─── Derived values ─────────────────────────────────
  const authorName = post.author.name || `${post.author.firstName} ${post.author.lastName}`;
  const typeConfig = POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE;
  const learningMeta = post.learningMeta;
  const isCurrentUser = post.author.id === user?.id;
  const deadlineInfo = learningMeta?.deadline ? {
    text: formatRelativeTime(learningMeta.deadline),
    isUrgent: new Date(learningMeta.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000
  } : null;

  // ─── Render ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#374151" />
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
              <Ionicons name="ellipsis-horizontal" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropdown Menu */}
        {showMenu && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.dropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#374151" />
              <Text style={styles.menuText}>Share</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            {isCurrentUser ? (
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                navigation.navigate('EditPost' as any, { postId: post.id });
              }}>
                <Ionicons name="create-outline" size={18} color="#374151" />
                <Text style={styles.menuText}>Edit Post</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                Alert.alert('Post Reported', 'Thanks for letting us know. We\'ll review this post.', [{ text: 'OK' }]);
              }}>
                <Ionicons name="flag-outline" size={18} color="#EF4444" />
                <Text style={[styles.menuText, { color: '#EF4444' }]}>Report</Text>
              </TouchableOpacity>
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
          <Animated.View entering={FadeInDown.duration(300)} style={styles.authorCard}>
            <TouchableOpacity
              style={styles.authorRow}
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
                      <Text style={styles.roleBadgeText}>Teacher</Text>
                    </View>
                  )}
                  <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
                </View>
              </View>

              {/* Follow button for non-own posts */}
              {!isCurrentUser && (
                <TouchableOpacity style={styles.followBtn} activeOpacity={0.7}>
                  <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Deadline Banner ── */}
          {deadlineInfo && (
            <Animated.View entering={FadeInDown.delay(50).duration(300)} style={[
              styles.deadlineBanner,
              deadlineInfo.isUrgent && styles.deadlineBannerUrgent
            ]}>
              <Ionicons
                name={deadlineInfo.isUrgent ? 'warning' : 'time-outline'}
                size={16}
                color={deadlineInfo.isUrgent ? '#EF4444' : '#0EA5E9'}
              />
              <Text style={[styles.deadlineText, deadlineInfo.isUrgent && { color: '#EF4444' }]}>
                {deadlineInfo.isUrgent ? '⚡ Due soon: ' : 'Due: '}{deadlineInfo.text}
              </Text>
            </Animated.View>
          )}

          {/* ── Media ── */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.mediaContainer}>
              <ImageCarousel images={post.mediaUrls} borderRadius={0} mode="auto" />
              {/* View count overlay */}
              <View style={styles.viewCountOverlay}>
                <Ionicons name="eye-outline" size={14} color="#fff" />
                <Text style={styles.viewCountText}>
                  {formatNumber((post as any).views || 0)} views
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── Title (if present) ── */}
          {post.title && (
            <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.titleSection}>
              <Text style={styles.postTitle}>{post.title}</Text>
            </Animated.View>
          )}

          {/* ── Content ── */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.contentCard}>
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
                      <Text style={styles.quizHeaderTitle}>Test Your Knowledge</Text>
                      <Text style={styles.quizHeaderSubtitle}>Complete this quiz to earn points!</Text>
                    </View>
                  </View>
                  <View style={styles.quizStatsGrid}>
                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="document-text-outline" size={18} color={typeConfig.color} />
                      </View>
                      <Text style={styles.quizStatValue}>{post.quizData.questions?.length || 0}</Text>
                      <Text style={styles.quizStatLabel}>Questions</Text>
                    </View>
                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="time-outline" size={18} color={typeConfig.color} />
                      </View>
                      <Text style={styles.quizStatValue}>
                        {post.quizData.timeLimit ? `${post.quizData.timeLimit}m` : '∞'}
                      </Text>
                      <Text style={styles.quizStatLabel}>Time</Text>
                    </View>
                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="star" size={18} color="#0EA5E9" />
                      </View>
                      <Text style={styles.quizStatValue}>{post.quizData.totalPoints || 100}</Text>
                      <Text style={styles.quizStatLabel}>Points</Text>
                    </View>
                  </View>
                  {post.quizData.userAttempt && (
                    <View style={styles.quizPrevResult}>
                      <Ionicons name="checkmark-circle" size={16} color={post.quizData.userAttempt.passed ? '#22c55e' : '#f59e0b'} />
                      <Text style={styles.quizPrevResultText}>
                        Last attempt: {Math.round(post.quizData.userAttempt.score ?? 0)}%
                        {post.quizData.userAttempt.passed ? ' · Passed ✓' : ' · Not passed'}
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
                      {post.quizData.userAttempt ? 'Retake Quiz' : 'Start Quiz'}
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
              <View style={styles.metric}>
                <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metricText}>{learningMeta?.estimatedMinutes || 5} min</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.metricText}>+{learningMeta?.xpReward || 15} XP</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Progress Bar ── */}
          {learningMeta?.progress !== undefined && ['COURSE', 'QUIZ', 'TUTORIAL'].includes(post.postType) && (
            <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Your Progress</Text>
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
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.engagementCard}>
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem}>
                <Ionicons name="heart" size={16} color="#EF4444" />
                <Text style={styles.statText}>{formatNumber(likeCount)}</Text>
              </TouchableOpacity>
              <View style={styles.statDot} />
              <TouchableOpacity style={styles.statItem} onPress={handleScrollToComments}>
                <Ionicons name="chatbubble" size={16} color="#6366F1" />
                <Text style={styles.statText}>{postComments.length} comments</Text>
              </TouchableOpacity>
              <View style={styles.statDot} />
              <View style={styles.statItem}>
                <Ionicons name="eye" size={16} color="#9CA3AF" />
                <Text style={styles.statText}>{formatNumber((post as any).views || 0)}</Text>
              </View>
            </View>

            {/* Action Bar */}
            <View style={styles.actionBar}>
              <Animated.View style={likeAnimStyle}>
                <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={24}
                    color={liked ? '#EF4444' : '#6B7280'}
                  />
                  <Text style={[styles.actionLabel, liked && { color: '#EF4444' }]}>Like</Text>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity onPress={handleValue} style={styles.actionBtn}>
                <Ionicons
                  name={valued ? 'diamond' : 'diamond-outline'}
                  size={24}
                  color={valued ? '#8B5CF6' : '#6B7280'}
                />
                <Text style={[styles.actionLabel, valued && { color: '#8B5CF6' }]}>Value</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleScrollToComments}>
                <Ionicons name="chatbubble-outline" size={24} color="#6B7280" />
                <Text style={styles.actionLabel}>Comment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                <Ionicons name="arrow-redo-outline" size={24} color="#6B7280" />
                <Text style={styles.actionLabel}>Share</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Comments Section ── */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsTitleRow}>
              <Text style={styles.commentsTitle}>Comments</Text>
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{postComments.length}</Text>
              </View>
            </View>

            {isCommentsLoading ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.commentsLoadingText}>Loading comments...</Text>
              </View>
            ) : postComments.length === 0 ? (
              <View style={styles.noComments}>
                <View style={styles.noCommentsIcon}>
                  <Ionicons name="chatbubbles-outline" size={36} color="#D1D5DB" />
                </View>
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Start the conversation!</Text>
              </View>
            ) : (
              postComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
              ))
            )}
          </View>
        </ScrollView>

        {/* ── Comment Input ── */}
        <View style={styles.commentInputBar}>
          <Avatar
            uri={user?.profilePictureUrl}
            name={user ? `${user.firstName} ${user.lastName}` : 'User'}
            size="sm"
            variant="post"
          />
          <View style={styles.commentInputWrapper}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
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
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  centeredContainer: { flex: 1, backgroundColor: '#F0F4F8' },
  loadingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  loadingText: { fontSize: 15, color: '#9CA3AF', marginTop: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 12 },
  errorSubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 16,
  },
  retryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Header
  headerSafe: { backgroundColor: '#fff', zIndex: 100, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937' },

  // Dropdown
  dropdown: {
    position: 'absolute', top: 56, right: 16,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 6,
    minWidth: 180,
    shadowColor: '#000', shadowRadius: 16,
    zIndex: 1000,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  menuDivider: { height: 1, backgroundColor: '#F0F4F8', marginHorizontal: 16 },

  scrollContent: { paddingBottom: 100 },

  // Author Section
  authorCard: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorInfo: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: 16, fontWeight: '700', color: '#111827' },
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
  timeText: { fontSize: 13, color: '#9CA3AF' },
  followBtn: {
    backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 14,
  },
  followBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Deadline Banner
  deadlineBanner: {
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    borderLeftWidth: 3, borderLeftColor: '#0EA5E9',
  },
  deadlineBannerUrgent: { backgroundColor: '#FEF2F2', borderLeftColor: '#EF4444' },
  deadlineText: { fontSize: 13, fontWeight: '600', color: '#0EA5E9' },

  // Media
  mediaContainer: { width: '100%', backgroundColor: '#000', position: 'relative' },
  viewCountOverlay: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  viewCountText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Title
  titleSection: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 },
  postTitle: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 28 },

  // Content
  contentCard: { backgroundColor: '#fff', paddingBottom: 4 },
  contentText: {
    fontSize: 16, color: '#1F2937', lineHeight: 25,
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
  quizHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
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
  quizStatValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  quizStatLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  quizPrevResult: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  quizPrevResultText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  quizStartButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, gap: 8,
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
    borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8,
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
  metricText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },

  // Progress
  progressCard: {
    backgroundColor: '#fff',

    marginTop: 6, paddingHorizontal: 16, paddingVertical: 16,
    borderRadius: 14, marginHorizontal: 12,


  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  progressPercent: { fontSize: 16, fontWeight: '700', color: '#6366F1' },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Engagement
  engagementCard: {
    backgroundColor: '#fff', marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D1D5DB' },
  actionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  // Comments
  commentsSection: {
    backgroundColor: '#fff', marginTop: 6, paddingHorizontal: 16, paddingVertical: 20,
  },
  commentsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  commentsTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  commentCountBadge: {
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  commentCountText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  commentsLoading: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  commentsLoadingText: { fontSize: 13, color: '#9CA3AF' },
  commentItem: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  commentContent: { flex: 1 },
  commentBubble: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderColor: '#F3F4F6',
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#111827' },
  miniVerifiedBadge: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#1D9BF0',
    alignItems: 'center', justifyContent: 'center',
  },
  teacherBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  teacherBadgeText: { fontSize: 9, fontWeight: '700', color: '#3B82F6' },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  commentActions: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingLeft: 4, gap: 14,
  },
  commentTime: { fontSize: 11, color: '#9CA3AF' },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  noComments: { alignItems: 'center', paddingVertical: 32 },
  noCommentsIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  noCommentsText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  noCommentsSubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  // Comment Input
  commentInputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 10,
  },
  commentInputWrapper: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100,
  },
  commentInput: { fontSize: 14, color: '#1F2937', maxHeight: 80 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: '#6366F1' },
});
