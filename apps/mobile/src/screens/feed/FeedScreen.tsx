/**
 * Feed Screen — Enterprise E-Learning Social Feed
 * 
 * V2 Premium Design:
 * - Performance card with streak + XP stats
 * - Featured categories with icon grid
 * - E-learning focused create post card
 * - Subject filter chips with clear active states
 */

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Image,
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
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import StunityLogo from '../../../assets/Stunity.svg';

import {
  PostCard,
  PostAnalyticsModal,
  SubjectFilters,
  FloatingActionButton,
  EducationalValueModal,
  type EducationalValue,
} from '@/components/feed';
import { Avatar, PostSkeleton, NetworkStatus, EmptyState } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore, useNotificationStore } from '@/stores';
import { feedApi } from '@/api/client';
import { Post } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { FeedStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

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
  const size = 112;
  const cx = size / 2;
  const cy = size / 2;

  const rings = [
    { r: 48, sw: 8,  pct: Math.min(xpProgress / xpToNext, 1),                                          id: 'xp',     c1: '#38BDF8', c2: '#0284C7', cometDur: 2800, cometDelay: 0   },
    { r: 37, sw: 7,  pct: Math.min(stats.completedLessons / Math.max(stats.completedLessons + 5, 10), 1), id: 'lesson', c1: '#34D399', c2: '#059669', cometDur: 3400, cometDelay: 400 },
    { r: 26, sw: 6,  pct: Math.min(stats.currentStreak / 7, 1),                                         id: 'streak', c1: '#FB923C', c2: '#EF4444', cometDur: 4200, cometDelay: 800 },
  ];


  // XP bar fill
  const barWidth = useSharedValue(0);
  useEffect(() => {
    barWidth.value = withDelay(300, withTiming(pct, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` as any }));

  return (
    <TouchableOpacity activeOpacity={0.9} style={perfCardStyles.card} onPress={onPress}>
      <LinearGradient colors={['#FDE68A', '#BAE6FD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={perfCardStyles.inner}>
        <View style={perfCardStyles.topRow}>

          {/* ── Activity Rings ── */}
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
                    <SvgCircle cx={cx} cy={cy} r={ring.r} stroke="rgba(0,0,0,0.08)" strokeWidth={ring.sw} fill="none" />
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
            <LinearGradient colors={['#38BDF8', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={perfCardStyles.ringInner}>
              <Text style={perfCardStyles.ringValue}>{stats.level}</Text>
            </LinearGradient>
          </View>

          {/* ── Stats ── */}
          <View style={perfCardStyles.stats}>
            <View style={perfCardStyles.statRow}>
              <LinearGradient colors={['#60A5FA', '#3B82F6']} style={perfCardStyles.statIcon}>
                <Ionicons name="diamond" size={12} color="#fff" />
              </LinearGradient>
              <Text style={perfCardStyles.statVal}>{stats.totalPoints.toLocaleString()} <Text style={perfCardStyles.statLbl}>XP</Text></Text>
            </View>
            <View style={perfCardStyles.statRow}>
              <LinearGradient colors={['#34D399', '#10B981']} style={perfCardStyles.statIcon}>
                <Ionicons name="checkmark-circle" size={12} color="#fff" />
              </LinearGradient>
              <Text style={perfCardStyles.statVal}>{stats.completedLessons} <Text style={perfCardStyles.statLbl}>Lessons</Text></Text>
            </View>
            <View style={perfCardStyles.statRow}>
              <LinearGradient colors={['#FB923C', '#EF4444']} style={perfCardStyles.statIcon}>
                <Ionicons name="flame" size={12} color="#fff" />
              </LinearGradient>
              <Text style={perfCardStyles.statVal}>{stats.currentStreak} <Text style={perfCardStyles.statLbl}>Day Streak</Text></Text>
            </View>
          </View>

          {/* ── Avatar ── */}
          <View style={perfCardStyles.avatarWrap}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={user ? `${user.firstName} ${user.lastName}` : 'User'}
              size="xl"
              gradientBorder="orange"
              showBorder
            />
            <LinearGradient colors={['#A855F7', '#0EA5E9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={perfCardStyles.avatarBadge}>
              <Text style={perfCardStyles.avatarBadgeText}>{stats.level}</Text>
            </LinearGradient>
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
      </LinearGradient>
    </TouchableOpacity>
  );
});

const perfCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'visible',
    backgroundColor: '#FFFFFF',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  inner:       { padding: 16, borderRadius: 14, overflow: 'hidden' },
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  ringWrap:    { alignItems: 'center', justifyContent: 'center' },
  ringGlow:    { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(14,165,233,0.1)' },
  ringInner:   { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 21 },
  ringValue:   { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  ringLabel:   { fontSize: 10, fontWeight: '700', color: '#0284C7', letterSpacing: 1.5, marginTop: 5 },
  stats:       { flex: 1, gap: 8 },
  statRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statVal:     { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  statLbl:     { fontSize: 11, fontWeight: '400', color: '#64748B' },
  // Avatar
  avatarWrap:  { alignItems: 'center', position: 'relative' },
  avatarBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  avatarBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  // XP bar
  barSection:  { gap: 5 },
  barLabels:   { flexDirection: 'row', justifyContent: 'space-between' },
  barLeft:     { fontSize: 11, fontWeight: '600', color: '#0284C7' },
  barRight:    { fontSize: 11, fontWeight: '500', color: '#64748B' },
  barBg:       { height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 4, overflow: 'hidden' },
});
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  // Animated tab indicator
  const tabIndicatorX = useSharedValue(0);
  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  // M1 FIX: Granular Zustand selectors — each selector only re-renders when its slice changes.
  // Previously, one big destructure caused the whole screen to re-render on any store change.
  const feedMode = useFeedStore(s => s.feedMode);
  const toggleFeedMode = useFeedStore(s => s.toggleFeedMode);
  const posts = useFeedStore(s => s.posts);
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
  const flatListRef = React.useRef<FlashListRef<Post>>(null);
  const postsRef = useRef(posts);
  const pendingPostsRef = useRef(pendingPosts);
  postsRef.current = posts;
  pendingPostsRef.current = pendingPosts;

  // Track whether initial load animation has played
  const hasAnimatedRef = useRef(false);

  // Stable key extractor for FlatList
  const keyExtractor = useCallback((item: Post) => item.id, []);

  // Tab mode uses direct toggle instead of horizontal ScrollView pager
  const TAB_WIDTH = (SCREEN_WIDTH - 32) / 2; // Each tab half of container minus padding
  const handleTabPress = useCallback((mode: 'FOR_YOU' | 'FOLLOWING') => {
    if (feedMode !== mode) {
      toggleFeedMode(mode);
      fetchPosts(true);
    }
    tabIndicatorX.value = withTiming(
      mode === 'FOR_YOU' ? 0 : TAB_WIDTH,
      { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) }
    );
  }, [feedMode, toggleFeedMode, fetchPosts, tabIndicatorX]);

  // Set initial indicator position based on current feedMode
  useEffect(() => {
    tabIndicatorX.value = feedMode === 'FOR_YOU' ? 0 : TAB_WIDTH;
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
        const { lastFeedTimestamp, posts: currentPosts, pendingPosts: currentPending } = useFeedStore.getState();
        const latestCreatedAt = lastFeedTimestamp || currentPosts[0]?.createdAt;
        if (!latestCreatedAt) return;

        feedApi.get('/posts/feed', {
          params: { mode: 'RECENT', limit: 5, page: 1 },
        }).then((response) => {
          if (response.data?.success && response.data.data) {
            const existingIds = new Set([
              ...currentPosts.map(p => p.id),
              ...currentPending.map(p => p.id),
            ]);

            const newPosts = response.data.data.filter(
              (p: any) => new Date(p.createdAt) > new Date(latestCreatedAt) &&
                !existingIds.has(p.id)
            );

            if (newPosts.length > 0) {
              const transformed = transformPosts(newPosts);
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
        useFeedStore.setState({ posts: currentPosts.slice(0, 20) });
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
          if (durationSec >= 2 && !tracked.has(item.id)) {
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

  // Prefetch tracking — useRef instead of useState: no re-render during scroll
  const hasPrefetchedRef = useRef(false);
  const lastScrollCheck = React.useRef(0);

  const handleScroll = useCallback((event: any) => {
    const now = Date.now();
    if (now - lastScrollCheck.current < 500) return; // Throttle to 2 checks/sec
    lastScrollCheck.current = now;

    if (hasPrefetchedRef.current || isLoadingPosts || !hasMorePosts) return;

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;

    if (scrollPercentage >= 50) {
      hasPrefetchedRef.current = true;
      fetchPosts();
    }
  }, [isLoadingPosts, hasMorePosts, fetchPosts]);

  // Reset prefetch flag when new data loads (ref — no re-render)
  useEffect(() => {
    if (!isLoadingPosts) {
      hasPrefetchedRef.current = false;
    }
  }, [isLoadingPosts]);


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

  const renderPost = useCallback(({ item, index }: { item: Post; index: number }) => {
    // Only animate the first 3 posts on initial load, never on subsequent scrolls
    const shouldAnimate = !hasAnimatedRef.current && index < 3;
    if (index === 2) hasAnimatedRef.current = true;

    const card = (
      <PostCard
        post={item}
        onLike={() => handleLikePost(item)}
        onComment={() => navigation.navigate('Comments', { postId: item.id })}
        onRepost={() => handleSharePost(item)}
        onShare={() => handleSharePost(item)}
        onBookmark={() => bookmarkPost(item.id)}
        onValue={() => handleValuePost(item)}
        isValued={valuedPostIds.has(item.id)}
        onUserPress={() => navigation.navigate('UserProfile', { userId: item.author.id })}
        onPress={() => handlePostPress(item)}
        onVote={(optionId) => handleVoteOnPoll(item.id, optionId)}
        onViewAnalytics={() => setAnalyticsPostId(item.id)}
      />
    );

    if (shouldAnimate) {
      return (
        <Animated.View
          entering={FadeInDown.delay(50 * index).duration(300)}
          style={styles.postWrapper}
        >
          {card}
        </Animated.View>
      );
    }

    return <View style={styles.postWrapper}>{card}</View>;
  }, [handleLikePost, handleSharePost, handleValuePost, handlePostPress, handleVoteOnPoll, bookmarkPost, navigation, valuedPostIds]);

  const renderFooter = () => {
    if (!isLoadingPosts) return null;
    return (
      <View style={styles.footer}>
        <PostSkeleton />
      </View>
    );
  };

  const renderEmpty = () => {
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
  };

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
          <StunityLogo width={110} height={30} />

          {/* Actions - Right */}
          <View style={styles.headerActions}>
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
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        onScroll={handleScroll} // Phase 1 Day 5: Prefetch at 50% scroll
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
        drawDistance={600}        // Pre-render 1.5 screens off-screen — eliminates blank cells on fast scroll
        estimatedItemSize={400}   // Critical: Reduces layout thrashing
        overrideItemLayout={(layout, item) => {
          // Pre-calculate heights to eliminate layout jumps (massive perf boost)
          let height = 250; // Base height (header + footer + padding)
          if (item.mediaUrls?.length > 0) height += 300; // Image carousel
          if (item.postType === 'POLL') height += 150; // Poll options
          if (item.postType === 'QUIZ') height += 100; // Quiz preview
          if (item.content && item.content.length > 200) height += 50; // Long text
          layout.size = height;
        }}
        getItemType={(item) => {
          // Type-bucketed recycling — cells of similar height are reused together
          if (item.postType === 'QUIZ') return 'quiz';
          if (item.postType === 'POLL') return 'poll';
          if (item.mediaUrls && item.mediaUrls.length > 0) return 'media';
          return 'text';
        }}
        // iOS: removeClippedSubviews causes native layer hide/show jank — Android only
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={8}           // Render more per batch for smoother catch-up
        updateCellsBatchingPeriod={30}    // ~30fps batch flush (was 50ms=20fps)
        initialNumToRender={8}
        windowSize={7}                    // 3 screens above + below (was 5 = 2.5)
        scrollEventThrottle={16}          // 60fps — allows 120Hz on capable devices
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

      {/* Floating Action Button */}
      <FloatingActionButton onPress={handleCreatePost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
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
    paddingTop: 12,
    paddingBottom: 0,
  },
  postWrapper: {
    marginBottom: 0,
  },

  // ── Featured Categories Section ──
  categoriesSection: {
    marginTop: 16,
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
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 8,
    borderRadius: 14,
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
