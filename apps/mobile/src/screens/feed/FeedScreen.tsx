/**
 * Feed Screen — Enterprise E-Learning Social Feed
 * 
 * V2 Premium Design:
 * - Performance card with streak + XP stats
 * - Featured categories with icon grid
 * - E-learning focused create post card
 * - Subject filter chips with clear active states
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  AppState,
  Dimensions,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import StunityLogo from '../../../assets/Stunity.svg';

import {
  PostAnalyticsModal,
  SubjectFilters,
  EducationalValueModal,
  type EducationalValue,
  SuggestedUsersCarousel,
  SuggestedCoursesCarousel,
} from '@/components/feed';
import { Avatar, PostSkeleton, NetworkStatus, EmptyState } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore, useNotificationStore } from '@/stores';
import { feedApi } from '@/api/client';
import { Post, FeedItem } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { FeedStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';
import RenderPostItem from './RenderPostItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

type NavigationProp = FeedStackScreenProps<'Feed'>['navigation'];

interface PerformanceCardProps {
  stats: { currentStreak: number; totalPoints: number; completedLessons: number; level: number };
  user: { firstName: string; lastName: string; profilePictureUrl?: string } | null;
  onPress: () => void;
}

// ─── PerformanceCard ──────────────────────────────────────────────────────────
const PerformanceCard = React.memo(function PerformanceCard({ stats, user, onPress }: PerformanceCardProps) {
  const xpToNext = 250;
  const xpProgress = stats.totalPoints % xpToNext;
  const pct = Math.min((xpProgress / xpToNext) * 100, 100);
  const nextLevel = stats.level + 1;
  const size = 128;
  const cx = size / 2;
  const cy = size / 2;

  const rings = [
    { r: 55, sw: 10, pct: Math.min(xpProgress / xpToNext, 1), id: 'xp', c1: '#38BDF8', c2: '#0284C7' },
    { r: 42, sw: 8, pct: Math.min(stats.completedLessons / Math.max(stats.completedLessons + 5, 10), 1), id: 'lesson', c1: '#34D399', c2: '#059669' },
    { r: 31, sw: 7, pct: Math.min(stats.currentStreak / 7, 1), id: 'streak', c1: '#FBBF24', c2: '#F97316' },
  ];

  // XP bar fill
  const barWidth = useSharedValue(0);
  useEffect(() => {
    barWidth.value = withDelay(300, withTiming(pct, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` as any }));

  return (
    <TouchableOpacity activeOpacity={0.9} style={perfCardStyles.card} onPress={onPress}>
      <View style={perfCardStyles.inner}>
        <View style={perfCardStyles.topRow}>

          {/* ── Activity Rings (matches Profile screen style) ── */}
          <View style={[perfCardStyles.ringWrap, { width: size, height: size }]}>
            <View style={perfCardStyles.ringGlow} />
            <Svg width={size} height={size}>
              <Defs>
                {rings.map(ring => (
                  <SvgLinearGradient key={ring.id} id={`g_${ring.id}`} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={ring.c1} />
                    <Stop offset="1" stopColor={ring.c2} />
                  </SvgLinearGradient>
                ))}
              </Defs>
              {rings.map(ring => {
                const circ = 2 * Math.PI * ring.r;
                return (
                  <React.Fragment key={ring.id}>
                    <SvgCircle cx={cx} cy={cy} r={ring.r}
                      stroke={`${ring.c1}18`} strokeWidth={ring.sw} fill="none" />
                    <SvgCircle cx={cx} cy={cy} r={ring.r}
                      stroke={`url(#g_${ring.id})`}
                      strokeWidth={ring.sw} fill="none"
                      strokeDasharray={`${circ}`}
                      strokeDashoffset={circ * (1 - ring.pct)}
                      strokeLinecap="round"
                      transform={`rotate(-90, ${cx}, ${cy})`}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>
            <View style={perfCardStyles.ringInner}>
              <Text style={perfCardStyles.ringValue}>{stats.level}</Text>
              <Text style={perfCardStyles.ringLabel}>LEVEL</Text>
            </View>
          </View>

          {/* ── Stats ── */}
          <View style={perfCardStyles.stats}>
            <View style={perfCardStyles.statRow}>
              <View style={[perfCardStyles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="diamond" size={14} color="#2563EB" />
              </View>
              <Text style={perfCardStyles.statVal}>{stats.totalPoints.toLocaleString()} <Text style={perfCardStyles.statLbl}>XP</Text></Text>
            </View>
            <View style={perfCardStyles.statRow}>
              <View style={[perfCardStyles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
              </View>
              <Text style={perfCardStyles.statVal}>{stats.completedLessons} <Text style={perfCardStyles.statLbl}>Lessons</Text></Text>
            </View>
            <View style={perfCardStyles.statRow}>
              <View style={[perfCardStyles.statIcon, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="flame" size={14} color="#EA580C" />
              </View>
              <Text style={perfCardStyles.statVal}>{stats.currentStreak} <Text style={perfCardStyles.statLbl}>Day Streak</Text></Text>
            </View>
          </View>

          {/* ── Avatar ── */}
          <View style={perfCardStyles.avatarWrap}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={user ? `${user.firstName} ${user.lastName}` : 'User'}
              size="xl"
              gradientBorder="blue"
              showBorder
            />
          </View>

        </View>

        {/* ── XP Bar ── */}
        <View style={perfCardStyles.barSection}>
          <View style={perfCardStyles.barLabels}>
            <Text style={perfCardStyles.barLeft}>{xpProgress} / {xpToNext} XP</Text>
            <Text style={perfCardStyles.barRight}>Level {nextLevel}</Text>
          </View>
          <View style={perfCardStyles.barBg}>
            <Animated.View style={[perfCardStyles.barFill, barStyle]}>
              <LinearGradient colors={['#38BDF8', '#0EA5E9', '#0284C7'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const perfCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'visible',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inner: { padding: 14, borderRadius: 16, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ringGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(14,165,233,0.06)' },
  ringInner: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: 30, fontWeight: '900', color: '#1F2937', letterSpacing: -1 },
  ringLabel: { fontSize: 8, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.2 },
  stats: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  statLbl: { fontSize: 11, fontWeight: '400', color: '#64748B' },
  avatarWrap: { alignItems: 'center', position: 'relative' },
  // XP bar
  barSection: { gap: 5 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLeft: { fontSize: 11, fontWeight: '600', color: '#0284C7' },
  barRight: { fontSize: 11, fontWeight: '500', color: '#64748B' },
  barBg: { height: 8, backgroundColor: '#EFF6FF', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
});
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  // M1 FIX: Granular Zustand selectors — each selector only re-renders when its slice changes.
  // Previously, one big destructure caused the whole screen to re-render on any store change.
  const feedItems = useFeedStore(s => s.feedItems);
  const isLoadingPosts = useFeedStore(s => s.isLoadingPosts);
  const hasMorePosts = useFeedStore(s => s.hasMorePosts);
  const fetchPosts = useFeedStore(s => s.fetchPosts);
  const subscribeToFeed = useFeedStore(s => s.subscribeToFeed);
  const unsubscribeFromFeed = useFeedStore(s => s.unsubscribeFromFeed);
  const pendingPosts = useFeedStore(s => s.pendingPosts);
  const applyPendingPosts = useFeedStore(s => s.applyPendingPosts);
  const likePost = useFeedStore(s => s.likePost);
  const unlikePost = useFeedStore(s => s.unlikePost);
  const bookmarkPost = useFeedStore(s => s.bookmarkPost);
  const voteOnPoll = useFeedStore(s => s.voteOnPoll);
  const sharePost = useFeedStore(s => s.sharePost);
  const trackPostView = useFeedStore(s => s.trackPostView);
  const initializeRecommendations = useFeedStore(s => s.initializeRecommendations);
  const unreadNotifications = useNotificationStore(state => state.unreadCount);

  const [refreshing, setRefreshing] = useState(false);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('ALL');
  const [analyticsPostId, setAnalyticsPostId] = useState<string | null>(null);
  const [valuePostId, setValuePostId] = useState<string | null>(null);
  const [valuePostData, setValuePostData] = useState<{ postType: string; authorName: string } | null>(null);
  const [valuedPostIds, setValuedPostIds] = useState<Set<string>>(new Set());
  const [isValueSubmitting, setIsValueSubmitting] = useState(false);

  // Learning stats for performance card
  const [learningStats, setLearningStats] = useState({
    currentStreak: 0,
    totalPoints: 0,
    completedLessons: 0,
    level: 1,
  });

  // Refs for stable polling (avoid re-creating interval on every posts change)
  const flatListRef = React.useRef<FlashListRef<FeedItem>>(null);
  const postsRef = useRef(feedItems);
  const pendingPostsRef = useRef(pendingPosts);
  postsRef.current = feedItems;
  pendingPostsRef.current = pendingPosts;

  // Stable key extractor for FlatList
  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    if (item?.type === 'POST') return item.data?.id || `post-${index}`;
    if (item?.type) return `${item.type}-${index}`;
    return `item-${index}`;
  }, []);

  useEffect(() => {
    fetchPosts();
    initializeRecommendations();

    // Fetch learning stats for performance card
    feedApi.get('/courses/stats/my-learning').then(res => {
      if (res.data) {
        setLearningStats({
          currentStreak: res.data.currentStreak || 0,
          totalPoints: res.data.totalPoints || 0,
          completedLessons: res.data.completedLessons || 0,
          level: res.data.level || 1,
        });
      }
    }).catch(() => { /* Silent — card shows 0s on failure */ });
  }, []);

  // No useFocusEffect re-fetch — polling + realtime handle freshness

  // Real-time subscription
  useEffect(() => {
    subscribeToFeed();
    return () => unsubscribeFromFeed();
  }, []);

  // Foreground refresh: check for new posts when app returns from background
  // Replaces the old 30s polling — at scale, polling wastes 333+ req/s
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // App came to foreground — check for new posts
        const { lastFeedTimestamp, feedItems: currentFeedItems, pendingPosts: currentPending } = useFeedStore.getState();
        const firstPost = currentFeedItems.find(i => i.type === 'POST');
        const latestCreatedAt = lastFeedTimestamp || (firstPost?.type === 'POST' ? firstPost.data.createdAt : undefined);
        if (!latestCreatedAt) return;

        feedApi.get('/posts/feed', {
          params: { mode: 'RECENT', limit: 5, page: 1 },
        }).then((response) => {
          if (response.data?.success && response.data.data) {
            const existingIds = new Set([
              ...currentFeedItems.filter(i => i.type === 'POST').map(p => (p.data as Post).id),
              ...currentPending.map(p => p.id),
            ]);

            // /posts/feed returns FeedItem[] — extract only POST items and unwrap data
            const feedItemsFromApi: any[] = response.data.data;
            const rawNewPosts = feedItemsFromApi
              .filter((p: any) => p.type === 'POST' && p.data)
              .map((p: any) => p.data)
              .filter(
                (p: any) => new Date(p.createdAt) > new Date(latestCreatedAt) &&
                  !existingIds.has(p.id)
              );

            if (rawNewPosts.length > 0) {
              const transformed = transformPosts(rawNewPosts);
              useFeedStore.setState(state => ({
                pendingPosts: [...transformed, ...state.pendingPosts],
              }));
            }
          }
        }).catch(() => {
          // Silent fail — foreground refresh is a convenience, not critical
        });
      }
    });

    return () => subscription.remove();
  }, []);

  // Memory pressure: reduce in-memory posts when iOS warns about low memory
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const memSub = AppState.addEventListener('memoryWarning', () => {
      const currentPosts = postsRef.current;
      if (currentPosts.length > 20) {
        useFeedStore.setState({ feedItems: currentPosts.slice(0, 20) });
        if (__DEV__) {
          console.log('⚠️ [FeedScreen] Memory pressure — trimmed posts to 20');
        }
      }
    });

    return () => memSub.remove();
  }, []);

  // ── Viewport-based view tracking ──
  // Track which posts are visible and for how long
  const visiblePostTimers = React.useRef<Map<string, number>>(new Map());
  const trackedViews = React.useRef<Set<string>>(new Set()); // Dedup: track each post only once

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50, // post must be 50% visible
    minimumViewTime: 1000,           // must be visible for 1+ second
  }).current;

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems, changed }: { viewableItems: any[]; changed: any[] }) => {
      const timers = visiblePostTimers.current;
      const tracked = trackedViews.current;

      // Posts that became visible → start timer
      changed.forEach(({ item, isViewable }) => {
        if (isViewable && item?.id) {
          if (!timers.has(item.id)) {
            timers.set(item.id, Date.now());
          }
        } else if (!isViewable && item?.id && timers.has(item.id)) {
          // Post left viewport → send view with duration
          const startTime = timers.get(item.id)!;
          const durationSec = Math.round((Date.now() - startTime) / 1000);
          timers.delete(item.id);

          // Only count views of 2+ seconds AND only once per post per session
          if (durationSec >= 2 && !tracked.has(item.id) && item.postType) {
            tracked.add(item.id);
            trackPostView(item.id);
          }
        }
      });
    }
  ).current;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(true);
    setRefreshing(false);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingPosts && hasMorePosts) {
      fetchPosts();
    }
  }, [isLoadingPosts, hasMorePosts, fetchPosts]);

  const handleLikePost = useCallback((post: Post) => {
    if (post.isLiked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
    }
  }, [likePost, unlikePost]);

  const handleSharePost = useCallback(async (post: Post) => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { Share } = await import('react-native');
        await Share.share({
          message: `Check out this ${post.postType.toLowerCase()} on Stunity:\n\n${post.content}\n\n#Stunity #Education`,
          title: `${post.author.firstName}'s ${post.postType}`,
          url: `https://stunity.com/posts/${post.id}`,
        });
      }
      await sharePost(post.id);
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [sharePost]);

  const handleValuePost = useCallback((post: Post) => {
    setValuePostId(post.id);
    setValuePostData({
      postType: post.postType,
      authorName: post.author.name || `${post.author.firstName} ${post.author.lastName}`,
    });
  }, []);

  const handleSubmitValue = useCallback(async (value: EducationalValue) => {
    if (!valuePostId) return;

    setIsValueSubmitting(true);
    try {
      // Send to backend — map 'recommend' → 'wouldRecommend' to match API
      await feedApi.post(`/posts/${valuePostId}/value`, {
        accuracy: value.accuracy,
        helpfulness: value.helpfulness,
        clarity: value.clarity,
        depth: value.depth,
        difficulty: value.difficulty,
        wouldRecommend: value.recommend,
      });

      // Mark post as valued
      setValuedPostIds(prev => new Set(prev).add(valuePostId));

      // Close modal
      setValuePostId(null);
      setValuePostData(null);
    } catch (error: any) {
      console.error('❌ Failed to submit value:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsValueSubmitting(false);
    }
  }, [valuePostId]);

  const handleVoteOnPoll = useCallback((postId: string, optionId: string) => {
    voteOnPoll(postId, optionId);
  }, [voteOnPoll]);

  const handlePostPress = useCallback((post: Post) => {
    // Track view when post detail is opened
    trackPostView(post.id);
    navigation.navigate('PostDetail', { postId: post.id });
  }, [trackPostView, navigation]);



  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost' as any);
  }, [navigation]);

  // Quick action handlers
  const handleAskQuestion = useCallback(() => {
    // Navigate to CreatePost with question type pre-selected
    navigation.navigate('CreatePost' as any, { postType: 'QUESTION' });
  }, [navigation]);

  const handleCreateQuiz = useCallback(() => {
    navigation.navigate('CreatePost' as any, { postType: 'QUIZ' });
  }, [navigation]);

  const handleCreatePoll = useCallback(() => {
    navigation.navigate('CreatePost' as any, { postType: 'POLL' });
  }, [navigation]);

  const handleCreateResource = useCallback(() => {
    navigation.navigate('CreatePost' as any, { postType: 'RESOURCE' });
  }, [navigation]);

  const handleSubjectFilterChange = useCallback(async (filterKey: string) => {
    setActiveSubjectFilter(filterKey);

    // Refresh feed with subject filter
    await fetchPosts(true, filterKey);
  }, [fetchPosts]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerSection}>
      {/* M3 FIX: PerformanceCard is memoized — SVG rings only re-render when stats change */}
      <PerformanceCard
        stats={learningStats}
        user={user}
        onPress={() => navigation.getParent()?.navigate('ProfileTab')}
      />

      {/* Featured Categories */}
      <View style={styles.categoriesSection}>
        <SubjectFilters
          activeFilter={activeSubjectFilter}
          onFilterChange={handleSubjectFilterChange}
        />
      </View>

      {/* Create Post Card — E-Learning Focused */}
      <View style={styles.createPostCard}>
        <TouchableOpacity onPress={handleCreatePost} activeOpacity={0.8} style={styles.createPostRow}>
          <Avatar uri={user?.profilePictureUrl} name={user ? `${user.firstName} ${user.lastName}` : 'User'} size="md" variant="post" />
          <View style={styles.createPostInputFake}>
            <Text style={styles.createPostPlaceholder}>Share your learning...</Text>
          </View>
          <TouchableOpacity onPress={handleCreatePost} style={styles.createPostMediaButton}>
            <Ionicons name="images-outline" size={20} color="#0284C7" />
          </TouchableOpacity>
        </TouchableOpacity>

        <LinearGradient colors={['transparent', '#E5E7EB', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.storyDivider} />

        <View style={styles.quickActionsInCard}>
          <TouchableOpacity onPress={handleAskQuestion} activeOpacity={0.7} style={styles.inCardAction}>
            <LinearGradient colors={['#7DD3FC', '#0EA5E9']} style={[styles.quickActionIcon, { shadowColor: '#0EA5E9' }]}><Ionicons name="help-circle" size={20} color="#fff" /></LinearGradient>
            <Text style={[styles.inCardActionText, { color: '#0EA5E9' }]}>Ask</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateQuiz} activeOpacity={0.7} style={styles.inCardAction}>
            <LinearGradient colors={['#34D399', '#10B981']} style={[styles.quickActionIcon, { shadowColor: '#10B981' }]}><Ionicons name="bulb" size={20} color="#fff" /></LinearGradient>
            <Text style={[styles.inCardActionText, { color: '#10B981' }]}>Quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreatePoll} activeOpacity={0.7} style={styles.inCardAction}>
            <LinearGradient colors={['#A78BFA', '#8B5CF6']} style={[styles.quickActionIcon, { shadowColor: '#8B5CF6' }]}><Ionicons name="bar-chart" size={20} color="#fff" /></LinearGradient>
            <Text style={[styles.inCardActionText, { color: '#8B5CF6' }]}>Poll</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateResource} activeOpacity={0.7} style={styles.inCardAction}>
            <LinearGradient colors={['#F472B6', '#EC4899']} style={[styles.quickActionIcon, { shadowColor: '#EC4899' }]}><Ionicons name="book" size={20} color="#fff" /></LinearGradient>
            <Text style={[styles.inCardActionText, { color: '#EC4899' }]}>Resource</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [handleCreatePost, user, learningStats, handleAskQuestion, handleCreateQuiz, handleCreatePoll, handleCreateResource, activeSubjectFilter, handleSubjectFilterChange, navigation]);

  // Stable callback refs — avoids recreating closures in renderPost on every call
  const handlersRef = useRef({
    handleLikePost, handleSharePost, handleValuePost, handlePostPress,
    handleVoteOnPoll, bookmarkPost, navigation,
  });
  // Update ref on every render so callbacks are fresh but identity is stable
  useEffect(() => {
    handlersRef.current = {
      handleLikePost, handleSharePost, handleValuePost, handlePostPress,
      handleVoteOnPoll, bookmarkPost, navigation,
    };
  });

  const renderPost = useCallback(({ item }: { item: FeedItem }) => {
    if (!item) return null;

    if (item.type === 'SUGGESTED_USERS') {
      return <SuggestedUsersCarousel users={item.data} />;
    }
    if (item.type === 'SUGGESTED_COURSES') {
      return <SuggestedCoursesCarousel courses={item.data} />;
    }

    if (item.type === 'POST' && !item.data) return null;

    // Fallback to regular POST render
    return (
      <RenderPostItem
        item={item.data}
        handlersRef={handlersRef}
        isValued={item.data?.id ? valuedPostIds.has(item.data.id) : false}
        setAnalyticsPostId={setAnalyticsPostId}
      />
    );
  }, [valuedPostIds]); // Only re-create if valued set changes

  const renderFooter = useCallback(() => {
    if (!isLoadingPosts) return null;
    return (
      <View style={styles.footer}>
        <PostSkeleton />
      </View>
    );
  }, [isLoadingPosts]);

  const renderEmpty = useCallback(() => {
    if (isLoadingPosts) {
      return (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </View>
      );
    }

    return (
      <EmptyState
        type="posts"
        title="No Posts Yet"
        message="Be the first to share something with the community!"
        actionLabel="Create Post"
        onAction={handleCreatePost}
      />
    );
  }, [isLoadingPosts, handleCreatePost]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Network Status Banner */}
      <NetworkStatus onRetry={handleRefresh} />

      {/* V1 Header - Profile left, Logo center, Actions right */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          {/* Menu Button - Left */}
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#374151" />
          </TouchableOpacity>

          {/* Stunity Logo - Center */}
          <StunityLogo width={130} height={36} />

          {/* Actions - Right */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Leaderboard' as any)}
            >
              <Ionicons name="trophy-outline" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Search' as any)}
            >
              <Ionicons name="search-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Header Divider */}
        <View style={styles.headerDivider} />
      </SafeAreaView>

      {/* New Posts Pill */}
      {pendingPosts.length > 0 && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutUp}
          style={styles.newPostsPillContainer}
        >
          <TouchableOpacity
            style={[styles.newPostsPill, Shadows.md]}
            onPress={() => {
              const newCount = applyPendingPosts();
              if (newCount > 0) {
                // Scroll to first data item (index 0) — this is the first new post,
                // positioned right after the ListHeaderComponent
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: 0,
                    animated: true,
                    viewPosition: 0, // Align to top of viewport
                  });
                }, 100); // Small delay to let FlashList re-render with new data
              }
            }}
          >
            <Ionicons name="arrow-up" size={16} color="#fff" />
            <Text style={styles.newPostsText}>
              {pendingPosts.length === 1
                ? '1 New Post'
                : `${pendingPosts.length} New Posts`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FlashList — cell recycling for smooth 60fps scrolling */}
      <FlashList
        ref={flatListRef}
        data={feedItems}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.45}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // ── FlashList performance props for 120Hz smooth scrolling ──
        // @ts-ignore - The types for FlashList in this version omit estimatedItemSize, but it is supported and critical for performance.
        estimatedItemSize={350}
        drawDistance={800}        // Pre-render 2 screens off-screen — eliminates blank cells on fast scroll
        getItemType={(item) => {
          if (item.type === 'SUGGESTED_USERS') return 'suggested_users';
          if (item.type === 'SUGGESTED_COURSES') return 'suggested_courses';
          // Type-bucketed recycling — cells of similar height are reused together
          const postData = (item as any).data || item;
          if (postData.postType === 'QUIZ') return 'quiz';
          if (postData.postType === 'POLL') return 'poll';
          if (postData.mediaUrls && postData.mediaUrls.length > 0) return 'media';
          return 'text';
        }}
        // iOS: removeClippedSubviews causes native layer hide/show jank — Android only
        removeClippedSubviews={Platform.OS === 'android'}
        decelerationRate="normal"         // Smooth iOS momentum
      />

      {/* Post Analytics Modal */}
      <PostAnalyticsModal
        isOpen={!!analyticsPostId}
        onClose={() => setAnalyticsPostId(null)}
        postId={analyticsPostId || ''}
      />

      {/* Educational Value Modal */}
      <EducationalValueModal
        visible={!!valuePostId}
        onClose={() => {
          setValuePostId(null);
          setValuePostData(null);
        }}
        onSubmit={handleSubmitValue}
        isSubmitting={isValueSubmitting}
        postType={valuePostData?.postType || 'POST'}
        authorName={valuePostData?.authorName || 'Unknown'}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#DBEAFE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLogo: {
    height: 30,
    width: 110,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  postWrapper: {
    marginBottom: 0,
  },

  // ── Featured Categories Section ──
  categoriesSection: {
    marginTop: 8,
  },
  categoriesSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  // ── Create Post Card ──
  createPostCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  createPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  createPostInputFake: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,

    borderColor: '#CCFBF1',
  },
  createPostPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  createPostMediaButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyDivider: {
    height: 1,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  quickActionsInCard: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  inCardAction: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 7,
    borderRadius: 12,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  inCardActionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  footer: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ── New Posts Pill ──
  newPostsPillContainer: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  newPostsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,

    elevation: 6,
  },
  newPostsText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
