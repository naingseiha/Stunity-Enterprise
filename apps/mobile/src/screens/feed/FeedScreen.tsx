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
  Animated,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';


import StunityLogo from '../../../assets/Stunity.svg';

import {
  PostAnalyticsModal,
  SubjectFilters,
  EducationalValueModal,
  type EducationalValue,
  SuggestedUsersCarousel,
  SuggestedCoursesCarousel,
  SuggestedQuizzesCarousel,
} from '@/components/feed';
import { Avatar, PostSkeleton, Skeleton, NetworkStatus, EmptyState } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore, useNotificationStore } from '@/stores';
import { feedApi, learnApi } from '@/api/client';
import { Post, FeedItem } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { FeedStackScreenProps } from '@/navigation/types';
import { useNavigationContext, useThemeContext } from '@/contexts';
import RenderPostItem from './RenderPostItem';
import { statsAPI } from '@/services/stats';
import { getFeedMediaAspectRatio, getFeedMediaBucket } from '@/utils/feedMediaLayout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const INITIAL_FEED_NOTICE_MS = 2800;
const INITIAL_FEED_STILL_WORKING_MS = 9000;
const LIST_DRAW_DISTANCE = Platform.OS === 'android' ? 520 : 720;
const ESTIMATED_TEXT_POST_SIZE = 330;
const ESTIMATED_MEDIA_BASE_SIZE = 292;

const normalizeSubjectToken = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const postMatchesSubject = (post: Post, subject: string) => {
  if (subject === 'ALL') return true;
  const target = normalizeSubjectToken(subject);
  const tags = [
    ...(post.topicTags || []),
    ...(post.tags || []),
    ...((post as any).subjects || []),
    (post as any).subject,
    (post.learningMeta as any)?.subject,
  ];

  return tags.some((tag) => normalizeSubjectToken(tag) === target);
};

const filterFeedItemsBySubject = (items: FeedItem[], subject: string): FeedItem[] => {
  if (subject === 'ALL') return items;
  return items.filter((item) => item.type === 'POST' && postMatchesSubject(item.data as Post, subject));
};

// Time-based greeting
const getGreeting = (t: any): string => {
  const hour = new Date().getHours();
  if (hour < 12) return t('feed.greetingMorning');
  if (hour < 17) return t('feed.greetingAfternoon');
  return t('feed.greetingEvening');
};

type NavigationProp = FeedStackScreenProps<'Feed'>['navigation'];

const FilterLoadingSkeleton = React.memo(function FilterLoadingSkeleton({
  styles,
}: {
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.filterSkeletonWrap}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.filterSkeletonCard}>
          <View style={styles.filterSkeletonHeader}>
            <Skeleton width={42} height={42} borderRadius={21} />
            <View style={styles.filterSkeletonHeaderText}>
              <Skeleton width="45%" height={12} borderRadius={6} />
              <Skeleton width="30%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
            </View>
          </View>
          <Skeleton width="92%" height={13} borderRadius={6} style={{ marginTop: 16 }} />
          <Skeleton width="65%" height={13} borderRadius={6} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={160} borderRadius={14} style={{ marginTop: 16 }} />
          <View style={styles.filterSkeletonActions}>
            <Skeleton width={48} height={14} borderRadius={7} />
            <Skeleton width={48} height={14} borderRadius={7} />
            <Skeleton width={48} height={14} borderRadius={7} />
            <Skeleton width={32} height={14} borderRadius={7} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      ))}
    </View>
  );
});

interface PerformanceCardProps {
  stats: { currentStreak: number; totalPoints: number; completedLessons: number; level: number; xpProgress: number; xpToNextLevel: number; avgScore: number; };
  user: { firstName: string; lastName: string; profilePictureUrl?: string } | null;
  onPress: () => void;
}

// ─── PerformanceCard ──────────────────────────────────────────────────────────
const PerformanceCard = React.memo(function PerformanceCard({ stats, user, onPress }: PerformanceCardProps) {
  const { colors, isDark } = useThemeContext();
  const perfCardStyles = React.useMemo(() => createPerfCardStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();
  const xpToNext = Math.max(1, stats.xpToNextLevel || 250);
  const xpProgress = Math.max(0, Math.min(stats.xpProgress || 0, xpToNext));
  const pct = xpToNext > 0 ? Math.min((xpProgress / xpToNext) * 100, 100) : 0;
  const nextLevel = stats.level + 1;
  const size = 128;
  const cx = size / 2;
  const cy = size / 2;

  const rings = [
    { r: 55, sw: 10, pct: xpToNext > 0 ? Math.min(xpProgress / xpToNext, 1) : 0, id: 'xp', c1: '#38BDF8', c2: '#0284C7' },
    { r: 42, sw: 8, pct: Math.min(stats.completedLessons / Math.max(stats.completedLessons + 5, 10), 1), id: 'lesson', c1: '#34D399', c2: '#059669' },
    { r: 31, sw: 7, pct: Math.min(stats.avgScore / 100, 1), id: 'streak', c1: '#FBBF24', c2: '#F97316' },
  ];

  // XP bar fill
  const barWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.timing(barWidth, {
        toValue: pct,
        duration: 1100,
        useNativeDriver: false,
      }).start();
    }, 300);
    return () => clearTimeout(timeout);
  }, [pct]);
  const barWidthInterpolated = barWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

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
              <Text style={perfCardStyles.ringLabel}>{t('feed.level')}</Text>
            </View>
          </View>

          {/* ── Stats ── */}
          <View style={perfCardStyles.stats}>
            <View style={perfCardStyles.statRow}>
              <View style={[perfCardStyles.statIcon, { backgroundColor: isDark ? 'rgba(29,155,240,0.16)' : '#DBEAFE' }]}>
                <Ionicons name="diamond" size={14} color="#2563EB" />
              </View>
              <Text style={perfCardStyles.statVal}>{stats.totalPoints.toLocaleString()} <Text style={perfCardStyles.statLbl}>{t('feed.xp')}</Text></Text>
            </View>
            <View style={perfCardStyles.statRow}>
              <View style={[perfCardStyles.statIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
              </View>
              <Text style={perfCardStyles.statVal}>{stats.completedLessons} <Text style={perfCardStyles.statLbl}>{t('feed.lessons')}</Text></Text>
            </View>
            <View style={perfCardStyles.statRow}>
              <View style={[perfCardStyles.statIcon, { backgroundColor: isDark ? 'rgba(249,115,22,0.16)' : '#FFEDD5' }]}>
                <Ionicons name="flame" size={14} color="#EA580C" />
              </View>
              <Text style={perfCardStyles.statVal}>{stats.currentStreak} <Text style={perfCardStyles.statLbl}>{t('feed.dayStreak')}</Text></Text>
            </View>
          </View>

          {/* ── Avatar ── */}
          <View style={perfCardStyles.avatarWrap}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={user ? `${user.lastName} ${user.firstName}` : (t('messages.you') || 'User')}
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
            <Text style={perfCardStyles.barRight}>{t('feed.level')} {nextLevel}</Text>
          </View>
          <View style={perfCardStyles.barBg}>
            <Animated.View style={[perfCardStyles.barFill, { width: barWidthInterpolated }]}>
              <LinearGradient colors={['#38BDF8', '#0EA5E9', '#0284C7'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const createPerfCardStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'visible',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inner: { padding: 14, borderRadius: 16, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ringGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.06)' },
  ringInner: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  ringLabel: { fontSize: 8, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.2 },
  stats: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 14, fontWeight: '700', color: colors.text },
  statLbl: { fontSize: 11, fontWeight: '400', color: colors.textSecondary },
  avatarWrap: { alignItems: 'center', position: 'relative' },
  // XP bar
  barSection: { gap: 5 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLeft: { fontSize: 11, fontWeight: '600', color: colors.primary },
  barRight: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
  barBg: { height: 8, backgroundColor: isDark ? colors.surfaceVariant : '#EFF6FF', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
});
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
  const [pendingSubjectFilter, setPendingSubjectFilter] = useState<string | null>(null);
  const [optimisticFilterItems, setOptimisticFilterItems] = useState<FeedItem[] | null>(null);
  const [analyticsPostId, setAnalyticsPostId] = useState<string | null>(null);
  const [valuePostId, setValuePostId] = useState<string | null>(null);
  const [valuePostData, setValuePostData] = useState<{ postType: string; authorName: string } | null>(null);
  const [valuedPostIds, setValuedPostIds] = useState<Set<string>>(new Set());
  const [isValueSubmitting, setIsValueSubmitting] = useState(false);
  const [initialLoadNotice, setInitialLoadNotice] = useState<'hidden' | 'warming' | 'stillWorking'>('hidden');

  // Learning stats for performance card
  const [learningStats, setLearningStats] = useState({
    currentStreak: 0,
    totalPoints: 0,
    completedLessons: 0,
    level: 1,
    xpProgress: 0,
    xpToNextLevel: 250,
    avgScore: 0,
  });

  // Refs for stable polling (avoid re-creating interval on every posts change)
  const flatListRef = React.useRef<FlashList<FeedItem> | null>(null);
  const canTriggerEndReachedRef = React.useRef(true);
  const postsRef = useRef(feedItems);
  const pendingPostsRef = useRef(pendingPosts);
  const subjectFeedCacheRef = useRef<Record<string, FeedItem[]>>({});
  const filterFetchInFlightRef = useRef(false);
  const queuedSubjectFilterRef = useRef<string | null>(null);
  const filterOverlayOpacity = useRef(new Animated.Value(0)).current;
  postsRef.current = feedItems;
  pendingPostsRef.current = pendingPosts;
  const displayedFeedItems = optimisticFilterItems || feedItems;
  const isInitialFeedLoading = isLoadingPosts && feedItems.length === 0 && !refreshing;
  const isFilterTransitioning = !!pendingSubjectFilter;

  useEffect(() => {
    if (!pendingSubjectFilter && feedItems.length > 0) {
      subjectFeedCacheRef.current[activeSubjectFilter] = feedItems;
    }
  }, [activeSubjectFilter, feedItems, pendingSubjectFilter]);

  useEffect(() => {
    Animated.timing(filterOverlayOpacity, {
      toValue: pendingSubjectFilter ? 1 : 0,
      duration: pendingSubjectFilter ? 140 : 180,
      useNativeDriver: true,
    }).start();
  }, [filterOverlayOpacity, pendingSubjectFilter]);

  useEffect(() => {
    if (!isInitialFeedLoading) {
      setInitialLoadNotice('hidden');
      return;
    }

    const warmingTimer = setTimeout(() => {
      setInitialLoadNotice('warming');
    }, INITIAL_FEED_NOTICE_MS);
    const stillWorkingTimer = setTimeout(() => {
      setInitialLoadNotice('stillWorking');
    }, INITIAL_FEED_STILL_WORKING_MS);

    return () => {
      clearTimeout(warmingTimer);
      clearTimeout(stillWorkingTimer);
    };
  }, [isInitialFeedLoading]);

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
    const fetchLearningStats = async () => {
      try {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        // Learning stats live in learn-service. Keep analytics fallback below for
        // older accounts or temporary learn-service failures.
        try {
          const res = await learnApi.get('/courses/stats/my-learning');
          if (res.data) {
            setLearningStats({
              currentStreak: res.data.currentStreak || 0,
              totalPoints: res.data.totalPoints || 0,
              completedLessons: res.data.completedLessons || 0,
              level: res.data.level || 1,
              xpProgress: res.data.xpProgress || 0,
              xpToNextLevel: res.data.xpToNextLevel || 250,
              avgScore: res.data.avgScore || 0,
            });
            return;
          }
        } catch (e) {
          // Fallback to real analytics api
        }

        // Fetch using statsAPI
        const [stats, streak] = await Promise.all([
          statsAPI.getUserStats(userId).catch(() => null),
          statsAPI.getStreak(userId).catch(() => null),
        ]);

        if (stats || streak) {
          setLearningStats({
            currentStreak: streak?.currentStreak || 0,
            totalPoints: stats?.totalPoints || 0,
            completedLessons: stats?.totalQuizzes || 0,
            level: stats?.level || 1,
            xpProgress: stats?.xpProgress || 0,
            xpToNextLevel: stats?.xpToNextLevel || 250,
            avgScore: stats?.avgScore || 0,
          });
        }
      } catch (err) {
        // Silent fail
      }
    };

    fetchLearningStats();
  }, []);

  // No useFocusEffect re-fetch — polling + realtime handle freshness

  // Real-time subscription & AppState lifecycle management
  useEffect(() => {
    // Initial subscription
    subscribeToFeed();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (__DEV__) console.log('🔌 [FeedScreen] App foregrounded — Re-subscribing to feed');
        subscribeToFeed();

        // Foreground refresh: check for new posts missed while backgrounded
        const { lastFeedTimestamp, feedItems: currentFeedItems, pendingPosts: currentPending } = useFeedStore.getState();
        const firstPost = currentFeedItems.find(i => i.type === 'POST');
        const latestCreatedAt = lastFeedTimestamp || (firstPost?.type === 'POST' ? firstPost.data.createdAt : undefined);

        if (latestCreatedAt) {
          feedApi.get('/posts/feed', {
            params: { mode: 'RECENT', limit: 5, page: 1 },
          }).then((response) => {
            if (response.data?.success && response.data.data) {
              const existingIds = new Set([
                ...currentFeedItems.filter(i => i.type === 'POST').map(p => (p.data as Post).id),
                ...currentPending.map(p => p.id),
              ]);

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
          }).catch(() => { });
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        if (__DEV__) console.log('🔌 [FeedScreen] App backgrounded — Unsubscribing from feed');
        unsubscribeFromFeed();
      }
    });

    return () => {
      subscription.remove();
      unsubscribeFromFeed();
    };
  }, [subscribeToFeed, unsubscribeFromFeed]);

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
        const post = item?.type === 'POST' ? item.data : item;
        const postId = post?.id;

        if (isViewable && postId) {
          if (!timers.has(postId)) {
            timers.set(postId, Date.now());
          }
        } else if (!isViewable && postId && timers.has(postId)) {
          // Post left viewport → send view with duration
          const startTime = timers.get(postId)!;
          const durationSec = Math.round((Date.now() - startTime) / 1000);
          timers.delete(postId);

          // Only count views of 2+ seconds AND only once per post per session
          if (durationSec >= 2 && !tracked.has(postId) && post.postType) {
            tracked.add(postId);
            trackPostView(postId);
          }
        }
      });
    }
  ).current;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(true, activeSubjectFilter);
    setRefreshing(false);
  }, [activeSubjectFilter, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!canTriggerEndReachedRef.current) return;
    if (!isLoadingPosts && !pendingSubjectFilter && hasMorePosts) {
      canTriggerEndReachedRef.current = false;
      fetchPosts(false, activeSubjectFilter).finally(() => {
        canTriggerEndReachedRef.current = true;
      });
    }
  }, [activeSubjectFilter, isLoadingPosts, pendingSubjectFilter, hasMorePosts, fetchPosts]);

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
      authorName: `${post.author.lastName || ''} ${post.author.firstName || ''}`.trim() || post.author.name || '',
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

      setValuedPostIds(prev => new Set(prev).add(valuePostId));
      setValuePostId(null);
      setValuePostData(null);
    } catch (error: any) {
      console.error('❌ Failed to submit value:', error);
      Alert.alert(t('common.error'), t('quiz.takeQuiz.errorSubmitting'));
    } finally {
      setIsValueSubmitting(false);
    }
  }, [valuePostId, t]);

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
    navigation.navigate('CreatePost' as any, { initialPostType: 'QUESTION' });
  }, [navigation]);

  const handleCreateQuiz = useCallback(() => {
    navigation.navigate('CreatePost' as any, { initialPostType: 'QUIZ' });
  }, [navigation]);

  const handleCreatePoll = useCallback(() => {
    navigation.navigate('CreatePost' as any, { initialPostType: 'POLL' });
  }, [navigation]);

  const handleCreateResource = useCallback(() => {
    navigation.navigate('CreatePost' as any, { initialPostType: 'RESOURCE' });
  }, [navigation]);

  const runSubjectFilterFetch = useCallback((filterKey: string) => {
    if (filterFetchInFlightRef.current) {
      queuedSubjectFilterRef.current = filterKey;
      return;
    }

    filterFetchInFlightRef.current = true;

    requestAnimationFrame(() => {
      fetchPosts(true, filterKey)
        .catch(() => { })
        .finally(() => {
          const latestItems = useFeedStore.getState().feedItems;
          subjectFeedCacheRef.current[filterKey] = latestItems;
          filterFetchInFlightRef.current = false;

          const queuedFilter = queuedSubjectFilterRef.current;
          queuedSubjectFilterRef.current = null;

          if (queuedFilter && queuedFilter !== filterKey) {
            runSubjectFilterFetch(queuedFilter);
            return;
          }

          setOptimisticFilterItems(null);
          setPendingSubjectFilter(null);
        });
    });
  }, [fetchPosts]);

  const handleSubjectFilterChange = useCallback((filterKey: string) => {
    if (filterKey === activeSubjectFilter && !pendingSubjectFilter) return;
    subjectFeedCacheRef.current[activeSubjectFilter] = feedItems;

    const cachedItems = subjectFeedCacheRef.current[filterKey];
    const locallyMatchedItems = filterFeedItemsBySubject(feedItems, filterKey);
    const instantItems = cachedItems?.length ? cachedItems : locallyMatchedItems;

    setActiveSubjectFilter(filterKey);
    setOptimisticFilterItems(instantItems.length > 0 ? instantItems : feedItems);
    setPendingSubjectFilter(filterKey);
    runSubjectFilterFetch(filterKey);
  }, [activeSubjectFilter, feedItems, pendingSubjectFilter, runSubjectFilterFetch]);

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
          pendingFilter={pendingSubjectFilter}
          onFilterChange={handleSubjectFilterChange}
        />
      </View>

      {/* Create Post Card — E-Learning Focused */}
      <View style={styles.createPostCard}>
        <TouchableOpacity onPress={handleCreatePost} activeOpacity={0.8} style={styles.createPostRow}>
          <Avatar uri={user?.profilePictureUrl} name={user ? `${user.lastName} ${user.firstName}` : (t('common.profile') || 'User')} size="md" variant="post" />
          <View style={styles.createPostInputFake}>
            <Text style={styles.createPostPlaceholder}>{t('feed.shareLearning')}</Text>
          </View>
          <TouchableOpacity onPress={handleCreatePost} style={styles.createPostMediaButton}>
            <Ionicons name="images-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        <LinearGradient colors={['transparent', colors.border, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.storyDivider} />

        <View style={styles.quickActionsInCard}>
          <TouchableOpacity onPress={handleAskQuestion} activeOpacity={0.7} style={styles.inCardAction}>
            <View style={[styles.quickActionIconShadow, { shadowColor: '#0EA5E9' }]}>
              <LinearGradient colors={['#7DD3FC', '#0EA5E9']} style={styles.quickActionIcon}><Ionicons name="help-circle" size={20} color="#FFFFFF" /></LinearGradient>
            </View>
            <Text style={[styles.inCardActionText, { color: '#0EA5E9' }]}>{t('feed.ask')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateQuiz} activeOpacity={0.7} style={styles.inCardAction}>
            <View style={[styles.quickActionIconShadow, { shadowColor: '#10B981' }]}>
              <LinearGradient colors={['#34D399', '#10B981']} style={styles.quickActionIcon}><Ionicons name="bulb" size={20} color="#FFFFFF" /></LinearGradient>
            </View>
            <Text style={[styles.inCardActionText, { color: '#10B981' }]}>{t('feed.quiz')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreatePoll} activeOpacity={0.7} style={styles.inCardAction}>
            <View style={[styles.quickActionIconShadow, { shadowColor: '#8B5CF6' }]}>
              <LinearGradient colors={['#A78BFA', '#8B5CF6']} style={styles.quickActionIcon}><Ionicons name="bar-chart" size={20} color="#FFFFFF" /></LinearGradient>
            </View>
            <Text style={[styles.inCardActionText, { color: '#8B5CF6' }]}>{t('feed.poll')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateResource} activeOpacity={0.7} style={styles.inCardAction}>
            <View style={[styles.quickActionIconShadow, { shadowColor: '#EC4899' }]}>
              <LinearGradient colors={['#F472B6', '#EC4899']} style={styles.quickActionIcon}><Ionicons name="book" size={20} color="#FFFFFF" /></LinearGradient>
            </View>
            <Text style={[styles.inCardActionText, { color: '#EC4899' }]}>{t('feed.resource')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [handleCreatePost, user, learningStats, handleAskQuestion, handleCreateQuiz, handleCreatePoll, handleCreateResource, activeSubjectFilter, pendingSubjectFilter, handleSubjectFilterChange, navigation, t, colors.border, colors.primary]);

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
    if (item.type === 'SUGGESTED_QUIZZES') {
      return <SuggestedQuizzesCarousel quizzes={item.data} />;
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

  const getItemType = useCallback((item: FeedItem) => {
    if (!item) return 'unknown';
    if (item.type === 'SUGGESTED_USERS') return 'suggested_users';
    if (item.type === 'SUGGESTED_COURSES') return 'suggested_courses';
    if (item.type === 'SUGGESTED_QUIZZES') return 'suggested_quizzes';
    const postData = (item as any).data || item;
    if (postData.postType === 'QUIZ') return 'quiz';
    if (postData.postType === 'POLL') return 'poll';
    if (postData.mediaUrls && postData.mediaUrls.length > 0) return `media-${getFeedMediaBucket(postData)}`;
    return 'text';
  }, []);

  const overrideItemLayout = useCallback((layout: { span?: number; size?: number }, item: FeedItem) => {
    if (!item) return;
    if (item.type === 'SUGGESTED_USERS') {
      layout.size = 230;
      return;
    }
    if (item.type === 'SUGGESTED_COURSES') {
      layout.size = 270;
      return;
    }
    if (item.type === 'SUGGESTED_QUIZZES') {
      layout.size = 250;
      return;
    }

    const postData = (item as any).data || item;
    if (!postData?.mediaUrls?.length) {
      layout.size = postData?.postType === 'POLL' || postData?.postType === 'QUIZ' ? 430 : ESTIMATED_TEXT_POST_SIZE;
      return;
    }

    const mediaHeight = (SCREEN_WIDTH - 28) * getFeedMediaAspectRatio(postData);
    layout.size = Math.round(ESTIMATED_MEDIA_BASE_SIZE + mediaHeight);
  }, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingPosts || pendingSubjectFilter) return null;
    return (
      <View style={styles.footer}>
        <PostSkeleton />
      </View>
    );
  }, [isLoadingPosts, pendingSubjectFilter]);

  const renderInitialLoadNotice = useCallback(() => {
    if (initialLoadNotice === 'hidden') return null;

    const isStillWorking = initialLoadNotice === 'stillWorking';

    return (
      <View style={styles.initialLoadNotice}>
        <View style={styles.initialLoadIconWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
        <View style={styles.initialLoadTextWrap}>
          <Text style={styles.initialLoadTitle}>
            {isStillWorking ? t('feed.loadingStillWorking') : t('feed.loadingPreparing')}
          </Text>
          <Text style={styles.initialLoadMessage}>
            {isStillWorking ? t('feed.loadingStillWorkingMessage') : t('feed.loadingPreparingMessage')}
          </Text>
        </View>
      </View>
    );
  }, [initialLoadNotice, t, colors.primary]);

  const renderEmpty = useCallback(() => {
    if (isLoadingPosts && !pendingSubjectFilter) {
      return (
        <View style={styles.skeletonContainer}>
          {renderInitialLoadNotice()}
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </View>
      );
    }

    return (
      <EmptyState
        type="posts"
        title={t('feed.noPosts')}
        message={t('feed.noPostsMessage')}
        actionLabel={t('auth.createAccount')} // re-using create post/account label
        onAction={handleCreatePost}
      />
    );
  }, [isLoadingPosts, pendingSubjectFilter, handleCreatePost, renderInitialLoadNotice, t]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Network Status Banner */}
      <NetworkStatus onRetry={handleRefresh} />

      {/* V1 Header - Profile left, Logo center, Actions right */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          {/* Menu Button - Left */}
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color={colors.text} />
          </TouchableOpacity>

          {/* Stunity Logo - Center */}
          <StunityLogo width={130} height={36} />

          {/* Actions - Right */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
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
              <Ionicons name="search-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Header Divider */}
        <View style={styles.headerDivider} />
      </SafeAreaView>

      {/* New Posts Pill */}
      {pendingPosts.length > 0 && (
        <Animated.View
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
                  try {
                    flatListRef.current?.scrollToIndex({
                      index: 0,
                      animated: true,
                      viewPosition: 0, // Align to top of viewport
                    });
                  } catch {
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }
                }, 100); // Small delay to let FlashList re-render with new data
              }
            }}
          >
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            <Text style={styles.newPostsText}>
              {pendingPosts.length === 1
                ? t('feed.newPost')
                : t('feed.newPosts', { count: pendingPosts.length })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.feedBody}>
        {/* FlashList — cell recycling for smooth 60fps scrolling */}
        <FlashList
          ref={flatListRef}
          data={displayedFeedItems}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.28}
          onMomentumScrollBegin={() => {
            canTriggerEndReachedRef.current = true;
          }}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          // ── FlashList performance props for 120Hz smooth scrolling ──
          // @ts-ignore - The types for FlashList in this version omit estimatedItemSize, but it is supported and critical for performance.
          estimatedItemSize={420}
          estimatedListSize={{ height: SCREEN_HEIGHT, width: SCREEN_WIDTH }}
          drawDistance={LIST_DRAW_DISTANCE}
          getItemType={getItemType}
          overrideItemLayout={overrideItemLayout}
          // iOS: removeClippedSubviews causes native layer hide/show jank — Android only
          removeClippedSubviews={Platform.OS === 'android'}
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
        />

        {isFilterTransitioning && (
          <Animated.View
            pointerEvents="none"
            style={[styles.filterLoadingOverlay, { opacity: filterOverlayOpacity }]}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 45 : 90}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.filterLoadingContent}>
              <FilterLoadingSkeleton styles={styles} />
            </View>
          </Animated.View>
        )}
      </View>

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
        authorName={valuePostData?.authorName || t('common.unknown') || 'Unknown'}
      />

    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSafe: {
    backgroundColor: colors.card,
  },
  headerDivider: {
    height: 1,
    backgroundColor: colors.border,
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
    backgroundColor: isDark ? colors.surfaceVariant : '#EFF6FF',
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
    backgroundColor: isDark ? colors.surfaceVariant : '#EFF6FF',
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
    borderColor: colors.border,
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
  feedBody: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    paddingBottom: 100,
  },
  filterLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)',
    paddingTop: 80,
    paddingHorizontal: 12,
    zIndex: 20,
    elevation: 0,
  },
  filterLoadingContent: {
    width: '100%',
    alignItems: 'center',
  },
  filterSkeletonWrap: {
    width: '100%',
    marginTop: 18,
    gap: 12,
  },
  filterSkeletonCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  filterSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterSkeletonHeaderText: {
    flex: 1,
  },
  filterSkeletonActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(226,232,240,0.6)',
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
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  // ── Create Post Card ──
  createPostCard: {
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  createPostInputFake: {
    flex: 1,
    backgroundColor: isDark ? colors.surfaceVariant : '#F0FDFA',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,

    borderColor: isDark ? colors.border : '#CCFBF1',
  },
  createPostPlaceholder: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  createPostMediaButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: isDark ? colors.surfaceVariant : '#F0FDFA',
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
  quickActionIconShadow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  initialLoadNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? colors.border : '#BAE6FD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  initialLoadIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? colors.surfaceVariant : '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialLoadTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  initialLoadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  initialLoadMessage: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 2,
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
    backgroundColor: isDark ? colors.surfaceVariant : '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    ...Platform.select({
      ios: {
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  newPostsText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
