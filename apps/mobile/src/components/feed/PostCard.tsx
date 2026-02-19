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

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
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
import { Post, DifficultyLevel } from '@/types';
import { useAuthStore } from '@/stores';
import { formatRelativeTime, formatNumber } from '@/utils';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onRepost?: () => void;
  onBookmark?: () => void;
  onValue?: () => void;  // NEW: Educational value rating
  onUserPress?: () => void;
  onPress?: () => void;
  onVote?: (optionId: string) => void;
  onViewAnalytics?: () => void;
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
  ['#EC4899', '#DB2777'], // Pink (Default)
  ['#8B5CF6', '#7C3AED'], // Violet
  ['#3B82F6', '#2563EB'], // Blue
  ['#10B981', '#059669'], // Emerald
  ['#0EA5E9', '#0284C7'], // Amber
  ['#6366F1', '#4F46E5'], // Indigo
  ['#06B6D4', '#0891B2'], // Cyan
  ['#F97316', '#EA580C'], // Orange
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

const PostCardInner: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onRepost,
  onBookmark,
  onValue,
  onUserPress,
  onPress,
  onVote,
  onViewAnalytics,
  currentUserId,
}) => {
  const navigation = useNavigation<any>();

  // Narrow selector — only subscribe to user ID, not entire auth store
  const currentUserId2 = useAuthStore(s => s.user?.id);
  const isCurrentUser = currentUserId ? post.author.id === currentUserId : post.author.id === currentUserId2;

  // Derive directly from props — no useEffect sync needed
  const [liked, setLiked] = useState(post.isLiked);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showMenu, setShowMenu] = useState(false);
  const [valued, setValued] = useState(false);

  // Reset internal state when post identity or key fields change
  // Using a ref to track previous values avoids redundant re-renders
  const prevPostRef = React.useRef({ id: post.id, isLiked: post.isLiked, isBookmarked: post.isBookmarked, likes: post.likes });
  if (prevPostRef.current.id !== post.id ||
    prevPostRef.current.isLiked !== post.isLiked ||
    prevPostRef.current.isBookmarked !== post.isBookmarked ||
    prevPostRef.current.likes !== post.likes) {
    prevPostRef.current = { id: post.id, isLiked: post.isLiked, isBookmarked: post.isBookmarked, likes: post.likes };
    if (liked !== post.isLiked) setLiked(post.isLiked);
    if (bookmarked !== post.isBookmarked) setBookmarked(post.isBookmarked);
    if (likeCount !== post.likes) setLikeCount(post.likes);
  }

  const likeScale = useSharedValue(1);
  const valueScale = useSharedValue(1);
  const commentScale = useSharedValue(1);
  const repostScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
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

  const commentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));

  const repostAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: repostScale.value }],
  }));

  const shareAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  const liveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livePulse.value }],
  }));

  const handleLike = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
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
    InteractionManager.runAfterInteractions(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });
    valueScale.value = withSequence(
      withSpring(1.4, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    onValue?.(); // Open educational value modal
  };

  const handleBookmark = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.selectionAsync();
    });
    setBookmarked(!bookmarked);
    setShowMenu(false);
    onBookmark?.();
  };

  const handleComment = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    commentScale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    onComment?.();
  };

  const handleRepost = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });
    repostScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    onRepost?.();
  };

  const handleShare = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    shareScale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    onShare?.();
  };

  const handleMenuToggle = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.selectionAsync();
    });
    setShowMenu(!showMenu);
  };

  const handleEdit = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    setShowMenu(false);
    navigation.navigate('EditPost', { post });
  };

  const handleViewAnalytics = () => {
    InteractionManager.runAfterInteractions(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    setShowMenu(false);
    onViewAnalytics?.();
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
  const quizThemeColor = post.postType === 'QUIZ' ? getQuizGradient(post.id)[0] : '#EC4899';

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
            variant="post"
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

              {/* Visibility Icon */}
              <Text style={styles.metaDot}>•</Text>
              <View style={styles.visibilityIndicator}>
                <Ionicons
                  name={
                    post.visibility === 'PUBLIC' ? 'earth' :
                      post.visibility === 'SCHOOL' ? 'school' :
                        post.visibility === 'CLASS' ? 'people' :
                          'lock-closed'
                  }
                  size={10}
                  color={
                    post.visibility === 'PUBLIC' ? '#10B981' :
                      post.visibility === 'SCHOOL' ? '#3B82F6' :
                        post.visibility === 'CLASS' ? '#8B5CF6' :
                          '#6B7280'
                  }
                />
              </View>

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
              {isCurrentUser && (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                    <Ionicons name="create-outline" size={18} color="#0066FF" />
                    <Text style={[styles.menuItemText, { color: '#0066FF' }]}>
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
        <DeadlineBanner deadlineInfo={deadlineInfo} />
      )}

      {/* Club Announcement Banner */}
      {post.postType === 'CLUB_ANNOUNCEMENT' && (
        <ClubAnnouncement typeConfig={typeConfig} onPress={onPress} />
      )}

      {/* Media - Full Width (Instagram-style) */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <View style={styles.mediaWrapper}>
          <ImageCarousel
            images={post.mediaUrls}
            onImagePress={onPress}
            borderRadius={0}
            mode="auto"
          />
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
        </View>
      )}

      {/* Content - Below image */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.contentSection}>
        <Text style={styles.contentText} numberOfLines={4}>
          {post.content}
        </Text>
      </TouchableOpacity>

      {/* Poll Voting */}
      {post.postType === 'POLL' && post.pollOptions && post.pollOptions.length > 0 && (
        <View style={styles.pollSection}>
          <PollVoting
            options={post.pollOptions}
            userVotedOptionId={post.userVotedOptionId}
            onVote={onVote || (() => { })}
            endsAt={post.learningMeta?.deadline}
          />
        </View>
      )}

      {/* Quiz Card - Extracted memoized section */}
      {post.postType === 'QUIZ' && post.quizData && (
        <QuizSection
          quizData={post.quizData}
          postTitle={post.title}
          postContent={post.content}
          postId={post.id}
          quizThemeColor={quizThemeColor}
          quizGradient={getQuizGradient(post.id)}
        />
      )}

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
              color={learningMeta?.isAnswered ? '#10B981' : '#0EA5E9'}
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

        {/* Metrics — Analytics-style stats */}
        <View style={styles.inlineMetrics}>
          {learningMeta?.xpReward != null && (
            <View style={styles.inlineMetric}>
              <Ionicons name="flash" size={13} color="#0EA5E9" />
              <Text style={styles.inlineMetricText}>+{learningMeta.xpReward} XP</Text>
            </View>
          )}
          <View style={styles.inlineMetric}>
            <Ionicons name="stats-chart" size={13} color="#6366F1" />
            <Text style={styles.inlineMetricText}>{formatNumber(post.likes + post.comments)}</Text>
          </View>
        </View>
      </View>

      {/* Action Bar - Instagram-style: Left (Like, Comment, Repost, Send) | Right (Value) */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarLeft}>
          {/* Like */}
          <Animated.View style={[likeAnimatedStyle, styles.actionButton]}>
            <TouchableOpacity onPress={handleLike} style={styles.actionButtonInner}>
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

          {/* Comment */}
          <Animated.View style={[commentAnimatedStyle, styles.actionButton]}>
            <TouchableOpacity onPress={handleComment} style={styles.actionButtonInner}>
              <Ionicons name="chatbubble-outline" size={24} color="#262626" />
              {post.comments > 0 && (
                <Text style={styles.actionText}>{formatNumber(post.comments)}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Repost */}
          <Animated.View style={[repostAnimatedStyle, styles.actionButton]}>
            <TouchableOpacity onPress={handleRepost} style={styles.actionButtonInner}>
              <Ionicons name="repeat-outline" size={26} color="#262626" />
              {post.shares > 0 && (
                <Text style={styles.actionText}>{formatNumber(post.shares)}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Send (Instagram-style) */}
          <Animated.View style={[shareAnimatedStyle, styles.actionButton]}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButtonInner}>
              <Ionicons name="paper-plane-outline" size={23} color="#262626" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Value - Right side (like Instagram bookmark) */}
        <Animated.View style={[valueAnimatedStyle, styles.actionButton]}>
          <TouchableOpacity onPress={handleValue} style={styles.actionButtonInner}>
            <Ionicons
              name={valued ? 'diamond' : 'diamond-outline'}
              size={24}
              color={valued ? '#8B5CF6' : '#262626'}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

// React.memo with custom comparator — only re-render when meaningful post data changes
function arePostCardPropsEqual(prev: PostCardProps, next: PostCardProps): boolean {
  return (
    prev.post.id === next.post.id &&
    prev.post.isLiked === next.post.isLiked &&
    prev.post.likes === next.post.likes &&
    prev.post.comments === next.post.comments &&
    prev.post.isBookmarked === next.post.isBookmarked &&
    prev.post.shares === next.post.shares &&
    prev.post.userVotedOptionId === next.post.userVotedOptionId &&
    prev.post.updatedAt === next.post.updatedAt &&
    prev.post.content === next.post.content
  );
}

export const PostCard = React.memo(PostCardInner, arePostCardPropsEqual);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    paddingTop: 14,
    // Premium card shadow with indigo tint
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    marginTop: 12,              // Breathing room from content above
    marginBottom: 12,           // Breathing room from content below
    borderRadius: 0,            // No rounded corners for modern look
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
  // Quiz Section - Beautiful Quiz Card
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
  takeQuizButton: {
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
  takeQuizButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EC4899',
  },
  previousAttempt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  attemptIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attemptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  attemptBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  passedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  failedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  attemptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quizActionButtons: {
    gap: 10,
  },
  attemptInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewResultsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
  retakeQuizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#EC4899',
  },
  retakeQuizButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EC4899',
  },
  // Club announcement banner styles
  clubBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
});

export default PostCard;

