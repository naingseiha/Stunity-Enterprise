/**
 * PostDetail Screen
 * 
 * Beautiful post detail view matching the feed card design:
 * - Full post content with expanded media
 * - Author info with gradient avatar border
 * - Learning metadata (progress, difficulty, XP)
 * - Comments section with nested replies
 * - Action bar with animations
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
  FlatList,
  ActivityIndicator,
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
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { Avatar, ImageCarousel } from '@/components/common';
import { PollVoting } from '@/components/feed'; // Added PollVoting import
import { useAuthStore, useFeedStore } from '@/stores';
import { Post, Comment, DifficultyLevel } from '@/types';
import { formatRelativeTime, formatNumber } from '@/utils';
import { FeedStackParamList } from '@/navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PostDetailRouteProp = RouteProp<FeedStackParamList, 'PostDetail'>;

// Difficulty configurations
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string; bgColor: string; icon: string }> = {
  BEGINNER: { label: 'Beginner', color: '#10B981', bgColor: '#D1FAE5', icon: 'leaf' },
  INTERMEDIATE: { label: 'Intermediate', color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'flash' },
  ADVANCED: { label: 'Advanced', color: '#EF4444', bgColor: '#FEE2E2', icon: 'rocket' },
};

// Post type configurations - Enhanced with gradients
const POST_TYPE_CONFIG: Record<string, {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  ctaLabel?: string;
  gradient?: [string, string];
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
  EXAM: { icon: 'clipboard', label: 'Exam', color: '#EF4444', bgColor: '#FEE2E2', ctaLabel: 'View Exam', gradient: ['#EF4444', '#DC2626'] },
  ASSIGNMENT: { icon: 'book-outline', label: 'Assignment', color: '#3B82F6', bgColor: '#DBEAFE', ctaLabel: 'Start Assignment', gradient: ['#3B82F6', '#2563EB'] },
  RESOURCE: { icon: 'folder-open', label: 'Resource', color: '#6366F1', bgColor: '#EEF2FF', ctaLabel: 'Download', gradient: ['#6366F1', '#4F46E5'] },
  TUTORIAL: { icon: 'play-circle', label: 'Tutorial', color: '#06B6D4', bgColor: '#CFFAFE', ctaLabel: 'Watch', gradient: ['#06B6D4', '#0891B2'] },
  RESEARCH: { icon: 'flask', label: 'Research', color: '#8B5CF6', bgColor: '#EDE9FE', ctaLabel: 'View', gradient: ['#8B5CF6', '#7C3AED'] },
  CLUB_ANNOUNCEMENT: { icon: 'people', label: 'Study Club', color: '#6366F1', bgColor: '#EEF2FF', ctaLabel: 'View Club', gradient: ['#6366F1', '#4F46E5'] },
  REFLECTION: { icon: 'bulb', label: 'Reflection', color: '#84CC16', bgColor: '#ECFCCB', ctaLabel: 'Read', gradient: ['#84CC16', '#65A30D'] },
  COLLABORATION: { icon: 'people', label: 'Collaboration', color: '#EC4899', bgColor: '#FCE7F3', ctaLabel: 'Join', gradient: ['#EC4899', '#DB2777'] },
};

// Vibrant gradients for Quiz cards
const QUIZ_GRADIENTS: [string, string][] = [
  ['#EC4899', '#DB2777'], // Pink
  ['#8B5CF6', '#7C3AED'], // Violet
  ['#3B82F6', '#2563EB'], // Blue
  ['#10B981', '#059669'], // Emerald
  ['#0EA5E9', '#0284C7'], // Amber
  ['#6366F1', '#4F46E5'], // Indigo
];

const getQuizGradient = (id: string) => {
  if (!id) return QUIZ_GRADIENTS[0];
  const charCode = id.charCodeAt(id.length - 1);
  return QUIZ_GRADIENTS[charCode % QUIZ_GRADIENTS.length];
};

// Mock comments for demo
const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    content: 'This is really helpful! Thanks for sharing. I learned a lot from this post.',
    author: {
      id: 'u1',
      firstName: 'Sophea',
      lastName: 'Chan',
      email: '',
      role: 'STUDENT',
      isVerified: true,
      isOnline: true,
      languages: [],
      interests: [],
      createdAt: '',
      updatedAt: '',
    },
    postId: '1',
    likes: 12,
    isLiked: false,
    replies: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    content: 'Great explanation! Can you explain more about the second part?',
    author: {
      id: 'u2',
      firstName: 'Dara',
      lastName: 'Kim',
      email: '',
      role: 'TEACHER',
      isVerified: true,
      isOnline: false,
      languages: [],
      interests: [],
      createdAt: '',
      updatedAt: '',
    },
    postId: '1',
    likes: 5,
    isLiked: true,
    replies: [],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

// Comment Component
const CommentItem: React.FC<{ comment: Comment; onReply: (id: string) => void }> = ({ comment, onReply }) => {
  const [liked, setLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likes);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (liked) {
      setLikeCount(prev => prev - 1);
    } else {
      setLikeCount(prev => prev + 1);
    }
    setLiked(!liked);
  };

  const authorName = `${comment.author.firstName} ${comment.author.lastName}`;

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.commentItem}>
      <Avatar
        uri={comment.author.profilePictureUrl}
        name={authorName}
        size="sm"
        variant="post"
      />
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
              color={liked ? '#EF4444' : '#6B7280'}
            />
            {likeCount > 0 && (
              <Text style={[styles.commentActionText, liked && { color: '#EF4444' }]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onReply(comment.id)} style={styles.commentAction}>
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;

  const { user } = useAuthStore();
  const {
    posts,
    likePost,
    unlikePost,
    bookmarkPost,
    trackPostView,
    comments: storeComments,
    fetchComments,
    addComment,
    voteOnPoll,
    isSubmittingComment
  } = useFeedStore();

  // Find the post (in real app, fetch from API)
  const post = posts.find(p => p.id === postId) || posts[0];

  const postComments = storeComments[postId] || [];
  const isSubmitting = isSubmittingComment[postId] || false;

  // Track view and fetch comments when post detail opens
  useEffect(() => {
    if (post) {
      trackPostView(post.id);
    }
    fetchComments(postId);
  }, [post?.id, postId, trackPostView, fetchComments]);

  const [liked, setLiked] = useState(post?.isLiked || false);
  const [bookmarked, setBookmarked] = useState(post?.isBookmarked || false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [valued, setValued] = useState(false);
  const [commentText, setCommentText] = useState('');
  // Removed local comments state, using store data now
  const [showMenu, setShowMenu] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const likeScale = useSharedValue(1);
  const valueScale = useSharedValue(1);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const valueAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));

  const handleLike = () => {
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
    bookmarkPost(postId);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Use store action
    const success = await addComment(postId, commentText.trim());

    if (success) {
      setCommentText('');
    }
  };

  const handleReply = (commentId: string) => {
    // Handle reply logic
    Haptics.selectionAsync();
  };

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const authorName = post.author.name || `${post.author.firstName} ${post.author.lastName}`;
  const typeConfig = POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE;
  const learningMeta = post.learningMeta;
  const isCurrentUser = post.author.id === user?.id;

  // Deadline info
  const deadlineInfo = learningMeta?.deadline ? {
    text: formatRelativeTime(learningMeta.deadline),
    isUrgent: new Date(learningMeta.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000
  } : null;
  const quizThemeColor = typeConfig.color;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowMenu(!showMenu)}>
              <Ionicons name="ellipsis-vertical" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropdown Menu */}
        {showMenu && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleBookmark}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={bookmarked ? '#6366F1' : '#374151'}
              />
              <Text style={[styles.menuItemText, bookmarked && { color: '#6366F1' }]}>
                {bookmarked ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
              <Ionicons name="share-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
              <Ionicons name="flag-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Report</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Author Header - Above image like Instagram */}
          <Animated.View entering={FadeInDown.duration(300)} style={styles.authorHeaderCard}>
            <TouchableOpacity
              style={styles.authorInfo}
              onPress={() => navigation.navigate('UserProfile' as any, { userId: post.author.id })}
            >
              <Avatar
                uri={post.author.profilePictureUrl}
                name={authorName}
                size="lg"
                variant="post"
              />
              <View style={styles.authorDetails}>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{authorName}</Text>
                  {(post.author.isVerified || isCurrentUser) && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                  {post.author.role === 'TEACHER' && (
                    <View style={styles.roleBadge}>
                      <Ionicons name="school" size={10} color="#3B82F6" />
                      <Text style={styles.roleBadgeText}>Teacher</Text>
                    </View>
                  )}
                </View>
                <View style={styles.authorMeta}>
                  <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
                  {learningMeta?.studyGroupName && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <View style={styles.studyGroupBadge}>
                        <Ionicons name="people" size={10} color="#8B5CF6" />
                        <Text style={styles.studyGroupText}>{learningMeta.studyGroupName}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Deadline Alert Banner */}
          {deadlineInfo && (
            <View style={[styles.deadlineBanner, deadlineInfo.isUrgent && styles.deadlineBannerUrgent]}>
              <Ionicons
                name={deadlineInfo.isUrgent ? 'warning' : 'time-outline'}
                size={16}
                color={deadlineInfo.isUrgent ? '#EF4444' : '#0EA5E9'}
              />
              <Text style={[styles.deadlineText, deadlineInfo.isUrgent && styles.deadlineTextUrgent]}>
                {deadlineInfo.isUrgent ? '⚡ Due soon: ' : 'Due: '}{deadlineInfo.text}
              </Text>
            </View>
          )}

          {/* Club Announcement Banner */}
          {post.postType === 'CLUB_ANNOUNCEMENT' && (
            <LinearGradient
              colors={[typeConfig.bgColor, '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.clubBanner}
            >
              <View style={styles.clubBannerContent}>
                <View style={[styles.clubIconCircle, { backgroundColor: typeConfig.color + '20' }]}>
                  <Ionicons name="people" size={24} color={typeConfig.color} />
                </View>
                <View style={styles.clubBannerText}>
                  <View style={styles.clubBannerHeader}>
                    <Ionicons name="sparkles" size={14} color={typeConfig.color} />
                    <Text style={[styles.clubBannerTitle, { color: typeConfig.color }]}>
                      New Study Club Available
                    </Text>
                  </View>
                  <Text style={styles.clubBannerSubtitle}>
                    Join this community and start learning together!
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.clubJoinButton, { backgroundColor: typeConfig.color }]}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.clubJoinButtonText}>View Club</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}

          {/* Media - Full width hero image */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.mediaContainer}>
              <ImageCarousel
                images={post.mediaUrls}
                borderRadius={0}
                mode="auto"
              />
            </Animated.View>
          )}

          {/* Post Content Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.contentCard}>
            {/* Post Content */}
            <View style={styles.contentSection}>
              <Text style={styles.contentText}>{post.content}</Text>
            </View>

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
                  {/* Quiz Header */}
                  <View style={styles.quizHeader}>
                    <View style={styles.quizIconCircle}>
                      <Ionicons name="rocket" size={24} color={quizThemeColor} />
                    </View>
                    <View style={styles.quizHeaderText}>
                      <Text style={styles.quizHeaderTitle}>Test Your Knowledge</Text>
                      <Text style={styles.quizHeaderSubtitle}>Complete this quiz to earn points!</Text>
                    </View>
                  </View>

                  {/* Quiz Stats Grid */}
                  <View style={styles.quizStatsGrid}>
                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="document-text-outline" size={20} color={quizThemeColor} />
                      </View>
                      <Text style={styles.quizStatValue}>{post.quizData.questions?.length || 0}</Text>
                      <Text style={styles.quizStatLabel}>Questions</Text>
                    </View>

                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="time-outline" size={20} color={quizThemeColor} />
                      </View>
                      <Text style={styles.quizStatValue}>
                        {post.quizData.timeLimit ? `${post.quizData.timeLimit}m` : 'No limit'}
                      </Text>
                      <Text style={styles.quizStatLabel}>Time</Text>
                    </View>

                    <View style={styles.quizStatItem}>
                      <View style={styles.quizStatIconBg}>
                        <Ionicons name="star" size={20} color="#0EA5E9" />
                      </View>
                      <Text style={styles.quizStatValue}>{post.quizData.totalPoints || 100}</Text>
                      <Text style={styles.quizStatLabel}>Points</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.quizStartButton}>
                    <Text style={styles.quizStartButtonText}>Start Quiz</Text>
                    <Ionicons name="arrow-forward" size={20} color={quizThemeColor} />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}

            {/* Topic Tags */}
            {post.topicTags && post.topicTags.length > 0 && (
              <View style={styles.topicTags}>
                {post.topicTags.map((tag, index) => (
                  <TouchableOpacity key={index} style={styles.topicTag}>
                    <Text style={styles.topicTagText}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Learning Info Bar */}
            <View style={styles.learningBar}>
              <View style={[styles.typeChip, { backgroundColor: typeConfig.bgColor }]}>
                <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
                <Text style={[styles.typeChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
              </View>

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

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.metricText}>{learningMeta?.estimatedMinutes || 5} min</Text>
                </View>
                <View style={styles.metric}>
                  <Ionicons name="star" size={14} color="#0EA5E9" />
                  <Text style={styles.metricText}>+{learningMeta?.xpReward || 15} XP</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Progress Bar (if applicable) */}
          {learningMeta?.progress !== undefined && ['COURSE', 'QUIZ', 'TUTORIAL'].includes(post.postType) && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.progressCard}>
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

          {/* Engagement Stats & Actions Card */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.actionsCard}>
            {/* Engagement Stats */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={18} color="#EF4444" />
                <Text style={styles.statText}>{formatNumber(likeCount)} likes</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={18} color="#6B7280" />
                <Text style={styles.statText}>{postComments.length} comments</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="arrow-redo" size={18} color="#6B7280" />
                <Text style={styles.statText}>{formatNumber(post.shares)} shares</Text>
              </View>
            </View>

            {/* Action Bar */}
            <View style={styles.actionBar}>
              <Animated.View style={[likeAnimatedStyle, styles.actionButton]}>
                <TouchableOpacity onPress={handleLike} style={styles.actionButtonInner}>
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={26}
                    color={liked ? '#EF4444' : '#374151'}
                  />
                  <Text style={[styles.actionText, liked && styles.actionTextLiked]}>Like</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[valueAnimatedStyle, styles.actionButton]}>
                <TouchableOpacity onPress={handleValue} style={styles.actionButtonInner}>
                  <Ionicons
                    name={valued ? 'diamond' : 'diamond-outline'}
                    size={26}
                    color={valued ? '#8B5CF6' : '#374151'}
                  />
                  <Text style={[styles.actionText, valued && styles.actionTextValued]}>Value</Text>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.actionButtonInner}>
                  <Ionicons name="chatbubble-outline" size={26} color="#374151" />
                  <Text style={styles.actionText}>Comment</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.actionButtonInner}>
                  <Ionicons name="arrow-redo-outline" size={26} color="#374151" />
                  <Text style={styles.actionText}>Share</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({postComments.length})</Text>

            {postComments.map(comment => (
              <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
            ))}

            {postComments.length === 0 && (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={40} color="#D1D5DB" />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
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
            disabled={!commentText.trim()}
            style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
          >
            <Ionicons
              name="send"
              size={20}
              color={commentText.trim() ? '#6366F1' : '#D1D5DB'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7FC',
  },
  headerSafe: {
    backgroundColor: '#fff',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    // Flat design - border instead of shadow
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Card-based layout styles
  authorHeaderCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  mediaContainer: {
    width: '100%',
    backgroundColor: '#000',
    marginTop: 1,
  },
  contentCard: {
    backgroundColor: '#fff',
    marginTop: 1,
  },
  progressCard: {
    backgroundColor: '#fff',
    marginTop: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionsCard: {
    backgroundColor: '#fff',
    marginTop: 1,
  },
  postCard: {
    backgroundColor: '#fff',
  },
  authorSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorDetails: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1D9BF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  studyGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  studyGroupText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  contentText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  topicTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  topicTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  mediaSection: {
    paddingBottom: 0,
  },
  mediaImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  learningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonInner: {
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionTextLiked: {
    color: '#EF4444',
  },
  actionTextValued: {
    color: '#8B5CF6',
  },
  commentsSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  miniVerifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1D9BF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  teacherBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#3B82F6',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
    gap: 16,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noCommentsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noCommentsSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  commentInputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  commentInput: {
    fontSize: 14,
    color: '#1F2937',
    maxHeight: 80,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Deadline Banner
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    marginHorizontal: 16,
    marginBottom: 16,
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
  // Club announcement banner styles
  clubBanner: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2FF',
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
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  clubJoinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // Poll Section
  pollSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  // Quiz Section
  quizSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quizGradientCard: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quizIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizHeaderText: {
    flex: 1,
  },
  quizHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quizHeaderSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  quizStatsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  quizStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  quizStatIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quizStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  quizStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  quizStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  quizStartButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EC4899',
  },
});
