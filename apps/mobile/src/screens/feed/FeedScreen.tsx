/**
 * Feed Screen — Enterprise E-Learning Social Feed
 * 
 * LinkedIn-Style Full-Screen Design:
 * - Performance card with streak + XP stats (full-bleed)
 * - E-learning focused create post card (full-bleed)
 * - Full-width borderless posts with hairline separators
 */

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
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
  Animated,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';


import StunityLogo from '../../../assets/Stunity.svg';

/** Avoid duplicate foreground + fallback polls when returning to the app often */
const FOREGROUND_FEED_POLL_MIN_MS = 45_000;
let lastForegroundFeedPollAt = 0;

import {
  PostAnalyticsModal,
  EducationalValueModal,
  type EducationalValue,
  SuggestedUsersCarousel,
  SuggestedCoursesCarousel,
  SuggestedQuizzesCarousel,
} from '@/components/feed';
import RecallCardItem from '@/components/feed/RecallCardItem';
import { getMockRecallCards, injectRecallCards } from '@/utils/mockRecallCards';
import { fetchDueCards, submitRecallReview, type RecallGrade } from '@/api/recall';
import { applyMockEdScores } from '@/utils/mockEdScores';
import BrainModeToggle from '@/components/feed/BrainModeToggle';
import FeynmanBountyItem from '@/components/feed/FeynmanBountyItem';
import { getMockFeynmanBounties, injectFeynmanBounties } from '@/utils/mockFeynmanBounties';
import { fetchActiveBounties } from '@/api/bounties';
import QuizWarBanner from '@/components/feed/QuizWarBanner';
import { getMockQuizWar, injectQuizWar } from '@/utils/mockQuizWars';
import { fetchActiveQuizWar } from '@/api/quizWars';
import { Avatar, PostSkeleton, NetworkStatus, EmptyState } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore, useNotificationStore } from '@/stores';
import { feedApi } from '@/api/client';
import { Post, FeedItem, RecallCard, FeynmanBounty, QuizWar } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { FeedStackScreenProps } from '@/navigation/types';
import { useNavigationContext, useThemeContext } from '@/contexts';
import RenderPostItem from './RenderPostItem';
import { useLearnerStats } from '@/hooks/useLearnerStats';
import type { FeedPerformanceStats } from '@/lib/performanceStatsCache';
import { getFeedMediaAspectRatio, getFeedMediaBucket } from '@/utils/feedMediaLayout';
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint';
import { TABLET_TAB_RAIL_WIDTH } from '@/utils/layout';
const INITIAL_FEED_NOTICE_MS = 2800;
const INITIAL_FEED_STILL_WORKING_MS = 9000;
// ProMotion / high-refresh: frame budget drops from 16.6ms to 8.3ms at 120Hz,
// so the recycler needs more headroom ahead of the user's scroll to avoid
// blank cells on fast flings. Conservative on Android (memory pressure).
const LIST_DRAW_DISTANCE = Platform.OS === 'android' ? 600 : 900;
const ESTIMATED_TEXT_POST_SIZE = 330;
const ESTIMATED_MEDIA_BASE_SIZE = 292;


// Time-based greeting
const getGreeting = (t: any): string => {
  const hour = new Date().getHours();
  if (hour < 12) return t('feed.greetingMorning');
  if (hour < 17) return t('feed.greetingAfternoon');
  return t('feed.greetingEvening');
};

type NavigationProp = FeedStackScreenProps<'Feed'>['navigation'];

interface PerformanceCardProps {
  stats: FeedPerformanceStats;
  user: { firstName: string; lastName: string; profilePictureUrl?: string } | null;
  avatarUri?: string | null;
  onPress: () => void;
}

// ─── PerformanceCard ──────────────────────────────────────────────────────────
const PerformanceCard = React.memo(function PerformanceCard({ stats, user, avatarUri, onPress }: PerformanceCardProps) {
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
    { r: 42, sw: 8, pct: Math.min(stats.completedQuizzes / Math.max(stats.completedQuizzes + 5, 10), 1), id: 'quiz', c1: '#34D399', c2: '#059669' },
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
              <Text style={perfCardStyles.statVal}>{stats.xp.toLocaleString()} <Text style={perfCardStyles.statLbl}>{t('feed.xp')}</Text></Text>
            </View>
            <View style={perfCardStyles.statRow}>
              <View style={[perfCardStyles.statIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
              </View>
              <Text style={perfCardStyles.statVal}>{stats.completedQuizzes} <Text style={perfCardStyles.statLbl}>{t('feed.quizzes')}</Text></Text>
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
              uri={avatarUri || user?.profilePictureUrl}
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
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'visible',
    backgroundColor: colors.card,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
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
  const layout = useLayoutBreakpoint();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { colors, isDark } = useThemeContext();
  const isWideTablet = layout.isTablet && windowWidth > windowHeight && windowWidth >= 1000;
  const isThreeColumnTablet = isWideTablet && windowWidth >= 1180;
  const threeColumnAvailableWidth = windowWidth - TABLET_TAB_RAIL_WIDTH;
  const threeColumnSideSpace = 270 + 270 + 20 + 20;
  const feedColumnWidth = layout.isTablet
    ? isThreeColumnTablet
      ? Math.max(760, threeColumnAvailableWidth - threeColumnSideSpace)
      : Math.min(layout.contentColumnWidth, isWideTablet ? 650 : layout.isLargeTablet ? 760 : 680)
    : windowWidth;
  const styles = React.useMemo(() => createStyles(colors, isDark, layout.isTablet, layout.isLargeTablet, isWideTablet, isThreeColumnTablet, feedColumnWidth), [colors, isDark, layout.isTablet, layout.isLargeTablet, isWideTablet, isThreeColumnTablet, feedColumnWidth]);
  const navigation = useNavigation<NavigationProp>();
  // Narrow selector — only resubscribes when the user object reference changes
  // (login/logout/profile update). Previously `useAuthStore()` re-rendered the
  // entire FeedScreen on every auth-store action, including transient ones.
  const user = useAuthStore(s => s.user);
  const { openSidebar } = useNavigationContext();

  // M1 FIX: Granular Zustand selectors — each selector only re-renders when its slice changes.
  // Previously, one big destructure caused the whole screen to re-render on any store change.
  const feedItems = useFeedStore(s => s.feedItems);
  const feedMode = useFeedStore(s => s.feedMode);
  const toggleFeedMode = useFeedStore(s => s.toggleFeedMode);
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
  const notInterestedPost = useFeedStore(s => s.notInterestedPost);
  const voteOnPoll = useFeedStore(s => s.voteOnPoll);
  const sharePost = useFeedStore(s => s.sharePost);
  const trackPostView = useFeedStore(s => s.trackPostView);
  const initializeRecommendations = useFeedStore(s => s.initializeRecommendations);
  const unreadNotifications = useNotificationStore(state => state.unreadCount);

  const [refreshing, setRefreshing] = useState(false);
  const [activeSubjectFilter] = useState('ALL');
  const [analyticsPostId, setAnalyticsPostId] = useState<string | null>(null);
  const [valuePostId, setValuePostId] = useState<string | null>(null);
  const [valuePostData, setValuePostData] = useState<{ postType: string; authorName: string } | null>(null);
  const [valuedPostIds, setValuedPostIds] = useState<Set<string>>(new Set());
  const [isValueSubmitting, setIsValueSubmitting] = useState(false);
  const [initialLoadNotice, setInitialLoadNotice] = useState<'hidden' | 'warming' | 'stillWorking'>('hidden');

  const { stats: learningStats, refresh: refreshPerformanceStats } = useLearnerStats(user?.id);

  // Refs for stable polling (avoid re-creating interval on every posts change)
  const flatListRef = React.useRef<FlashList<FeedItem> | null>(null);
  const scrollToTopRef = React.useRef({
    scrollToTop: () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
  });
  const postsRef = useRef(feedItems);
  const pendingPostsRef = useRef(pendingPosts);
  const lastProfilePictureUrlRef = useRef<string | null>(null);
  postsRef.current = feedItems;
  pendingPostsRef.current = pendingPosts;
  if (user?.profilePictureUrl) {
    lastProfilePictureUrlRef.current = user.profilePictureUrl;
  }
  const stableProfilePictureUrl = user?.profilePictureUrl || lastProfilePictureUrlRef.current;
  // Apply mocked Ed-Score + teacher-verified overlays to every POST.
  // Prototype: deterministic hash per post id. Production: a nightly job
  // denormalizes EducationalValueRating.averageRating → Post.edScore and
  // the new Post.verifiedByTeacherId field powers teacherVerified.
  const scoredFeedItems = useMemo(() => applyMockEdScores(feedItems), [feedItems]);

  // Brain Mode: when active, re-sort POST items by edScore desc so high-
  // quality posts surface first. Non-POST items (carousels, recall cards)
  // keep their relative position. Prototype: client-side sort. Production:
  // a /feed/brain endpoint that re-weights _scoreBreakdown.quality.
  const sortedFeedItems = useMemo(() => {
    if (feedMode !== 'BRAIN_MODE') return scoredFeedItems;
    // Stable sort: POST items by edScore desc; non-POST items hold position.
    return [...scoredFeedItems].sort((a, b) => {
      if (a.type !== 'POST' || b.type !== 'POST') return 0;
      const aScore = a.data?.edScore ?? 0;
      const bScore = b.data?.edScore ?? 0;
      return bScore - aScore;
    });
  }, [scoredFeedItems, feedMode]);

  // Recall Cards: prefer real backend data when available, fall back to
  // mocks when the API errors or returns empty (e.g. before the migration
  // runs, or when the user has no due cards). Refetched after every grade
  // so newly-scheduled cards appear and completed ones drop out.
  const [serverRecallCards, setServerRecallCards] = useState<RecallCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDueCards({ limit: 10 })
      .then((cards) => {
        if (!cancelled && cards.length > 0) {
          setServerRecallCards(cards);
        }
      })
      .catch((err) => {
        // Non-fatal: silent fallback to mocks (logged only in dev).
        if (__DEV__) {
          console.warn('[FeedScreen] fetchDueCards failed; using mock cards', err?.message);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const recallCards = useMemo(
    () => (serverRecallCards && serverRecallCards.length > 0
      ? serverRecallCards
      : getMockRecallCards()),
    [serverRecallCards],
  );

  // Grade handler — wires the RecallCardItem grade buttons to the backend.
  // Mock cards (id prefix "recall-") short-circuit to a no-op so the UI
  // demo still works without a live DB. Real card grades hit POST
  // /recall/:cardId/review, then refetch the due list so the feed updates.
  const handleRecallGrade = useCallback(async (cardId: string, grade: RecallGrade) => {
    if (cardId.startsWith('recall-')) return; // mock card → no API call
    try {
      await submitRecallReview(cardId, grade);
      const refreshed = await fetchDueCards({ limit: 10 });
      setServerRecallCards(refreshed);
    } catch (err: any) {
      if (__DEV__) {
        console.warn('[FeedScreen] submitRecallReview failed', err?.message);
      }
    }
  }, []);
  const withRecallCards = useMemo(
    () => injectRecallCards(sortedFeedItems, recallCards, 5),
    [sortedFeedItems, recallCards],
  );

  // Feynman Bounties: prefer real backend data when available, fall back
  // to mocks otherwise (same pattern as Recall Cards). The first
  // useEffect fires once on mount; the response shape matches the mobile
  // FeynmanBounty type exactly (see services/feed-service/src/routes/
  // bounty.routes.ts response shaping).
  const [serverBounties, setServerBounties] = useState<FeynmanBounty[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchActiveBounties({ limit: 10 })
      .then((bounties) => {
        if (!cancelled && bounties.length > 0) {
          setServerBounties(bounties);
        }
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[FeedScreen] fetchActiveBounties failed; using mocks', err?.message);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const feynmanBounties = useMemo(
    () => (serverBounties && serverBounties.length > 0
      ? serverBounties
      : getMockFeynmanBounties()),
    [serverBounties],
  );

  // Inject Feynman Bounties every 8 posts (less frequent than Recall — a
  // bounty is a higher-commitment interaction, would feel spammy at recall
  // cadence).
  const withBounties = useMemo(
    () => injectFeynmanBounties(withRecallCards, feynmanBounties, 8),
    [withRecallCards, feynmanBounties],
  );

  // Quiz War: prefer real backend (GET /quiz-wars/active returns the
  // user's school's active war or null) with graceful fallback to the
  // mock single war so the banner stays visible during dev / outage.
  // Real-time score sync (WebSocket) is deferred — for now the UI's
  // local countdown tick is the only "live" element.
  const [serverQuizWar, setServerQuizWar] = useState<QuizWar | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchActiveQuizWar()
      .then((war) => {
        if (!cancelled && war) setServerQuizWar(war);
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[FeedScreen] fetchActiveQuizWar failed; using mock', err?.message);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const quizWar = useMemo(
    () => serverQuizWar ?? getMockQuizWar(),
    [serverQuizWar],
  );

  // Inject the active Quiz War as a single banner near the top of the feed
  // (after the first POST). Single war at a time per school.
  const displayedFeedItems = useMemo(
    () => injectQuizWar(withBounties, quizWar),
    [withBounties, quizWar],
  );

  const handleToggleBrainMode = useCallback(() => {
    toggleFeedMode(feedMode === 'BRAIN_MODE' ? 'FOR_YOU' : 'BRAIN_MODE');
  }, [feedMode, toggleFeedMode]);
  const isInitialFeedLoading = isLoadingPosts && feedItems.length === 0 && !refreshing;

  useScrollToTop(scrollToTopRef);

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
    if (item?.type === 'RECALL_CARD') return item.data.id;
    if (item?.type === 'FEYNMAN_BOUNTY') return item.data.id;
    if (item?.type === 'QUIZ_WAR') return item.data.id;
    if (item?.type) return item.type;
    return `item-${index}`;
  }, []);

  useEffect(() => {
    fetchPosts();
    initializeRecommendations();
  }, []);

  // No useFocusEffect re-fetch for posts — polling + realtime handle freshness

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

        const now = Date.now();
        if (latestCreatedAt && now - lastForegroundFeedPollAt >= FOREGROUND_FEED_POLL_MIN_MS) {
          lastForegroundFeedPollAt = now;
          feedApi.get('/posts', {
            params: { limit: 5, page: 1, fields: 'minimal' },
            timeout: 5000,
            headers: { 'X-No-Retry': 'true' },
          }).then((response) => {
            if (response.data?.success && response.data.data) {
              const existingIds = new Set([
                ...currentFeedItems.filter(i => i.type === 'POST').map(p => (p.data as Post).id),
                ...currentPending.map(p => p.id),
              ]);

              const feedItemsFromApi: any[] = response.data.data;
              const rawNewPosts = feedItemsFromApi
                .map((item: any) => item?.type === 'POST' ? item.data : item)
                .filter(
                  (p: any) => p?.id && new Date(p.createdAt) > new Date(latestCreatedAt) &&
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
    await Promise.all([
      fetchPosts(true),
      refreshPerformanceStats(true),
    ]);
    setRefreshing(false);
  }, [fetchPosts, refreshPerformanceStats]);

  // The store dedups concurrent fetches internally (feedStore.ts:343), so call
  // through directly. The previous canTriggerEndReachedRef + onMomentumScrollBegin
  // pair caused a race where the gate was released mid-fetch while isLoadingPosts
  // was still true, dropping the call — symptom was blank space at the bottom
  // until the user scrolled up and back down to re-trigger the threshold.
  const handleLoadMore = useCallback(() => {
    if (hasMorePosts) {
      fetchPosts(false);
    }
  }, [hasMorePosts, fetchPosts]);

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
      if (__DEV__) { console.error('Share failed:', error); }
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
      if (__DEV__) { console.error('❌ Failed to submit value:', error); }
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


  const renderHeader = useCallback(() => (
    <View style={styles.headerSection}>
      {/* V1 Header - Profile left, Logo center, Actions right */}
      <View style={styles.headerSafe}>
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
      </View>

      {/* M3 FIX: PerformanceCard is memoized — SVG rings only re-render when stats change */}
      <PerformanceCard
        stats={learningStats}
        user={user}
        avatarUri={stableProfilePictureUrl}
        onPress={() =>
          navigation.getParent()?.navigate('QuizTab', { screen: 'MyJoinedQuizzes' })
        }
      />

      {/* Create Post Card — E-Learning Focused */}
      <View style={styles.createPostCard}>
        <TouchableOpacity onPress={handleCreatePost} activeOpacity={0.8} style={styles.createPostRow}>
          <Avatar uri={stableProfilePictureUrl} name={user ? `${user.lastName} ${user.firstName}` : (t('common.profile') || 'User')} size="md" variant="post" />
          <View style={styles.createPostInputFake}>
            <Text style={styles.createPostPlaceholder}>{t('feed.shareLearning')}</Text>
          </View>
          <TouchableOpacity onPress={handleCreatePost} style={styles.createPostMediaButton}>
            <Ionicons name="images-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.quickActionsInCard}>
          <TouchableOpacity onPress={handleAskQuestion} activeOpacity={0.7} style={styles.inCardAction}>
            <Ionicons name="help-circle" size={22} color="#3B82F6" />
            <Text style={styles.inCardActionText}>{t('feed.ask')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateQuiz} activeOpacity={0.7} style={styles.inCardAction}>
            <Ionicons name="bulb" size={22} color="#10B981" />
            <Text style={styles.inCardActionText}>{t('feed.quiz')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreatePoll} activeOpacity={0.7} style={styles.inCardAction}>
            <Ionicons name="bar-chart" size={22} color="#8B5CF6" />
            <Text style={styles.inCardActionText}>{t('feed.poll.label')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateResource} activeOpacity={0.7} style={styles.inCardAction}>
            <Ionicons name="book" size={22} color="#F59E0B" />
            <Text style={styles.inCardActionText}>{t('feed.resource')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Brain Mode toggle — re-rank feed by Ed-Score (Educational Value) */}
      <BrainModeToggle
        active={feedMode === 'BRAIN_MODE'}
        onToggle={handleToggleBrainMode}
      />
    </View>
  ), [handleCreatePost, user, stableProfilePictureUrl, learningStats, handleAskQuestion, handleCreateQuiz, handleCreatePoll, handleCreateResource, navigation, t, colors, openSidebar, unreadNotifications, feedMode, handleToggleBrainMode]);

  // Stable callback refs — avoids recreating closures in renderPost on every call
  const handlersRef = useRef({
    handleLikePost, handleSharePost, handleValuePost, handlePostPress,
    handleVoteOnPoll, bookmarkPost, notInterestedPost, navigation,
  });
  // Update ref on every render so callbacks are fresh but identity is stable
  useEffect(() => {
    handlersRef.current = {
      handleLikePost, handleSharePost, handleValuePost, handlePostPress,
      handleVoteOnPoll, bookmarkPost, notInterestedPost, navigation,
    };
  });

  // Note: renderPost is wrapped with handleRecallGrade in deps so the
  // closure stays fresh across re-renders.
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
    if (item.type === 'RECALL_CARD') {
      return <RecallCardItem card={item.data} onGrade={handleRecallGrade} />;
    }
    if (item.type === 'FEYNMAN_BOUNTY') {
      return <FeynmanBountyItem bounty={item.data} />;
    }
    if (item.type === 'QUIZ_WAR') {
      return <QuizWarBanner war={item.data} />;
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
  }, [valuedPostIds, handleRecallGrade]); // Re-create when valued set or recall handler changes

  const getItemType = useCallback((item: FeedItem) => {
    if (!item) return 'unknown';
    if (item.type === 'SUGGESTED_USERS') return 'suggested_users';
    if (item.type === 'SUGGESTED_COURSES') return 'suggested_courses';
    if (item.type === 'SUGGESTED_QUIZZES') return 'suggested_quizzes';
    if (item.type === 'RECALL_CARD') return 'recall_card';
    if (item.type === 'FEYNMAN_BOUNTY') return 'feynman_bounty';
    if (item.type === 'QUIZ_WAR') return 'quiz_war';
    const postData = (item as any).data || item;
    if (postData.postType === 'QUIZ') return 'quiz';
    if (postData.postType === 'POLL') return 'poll';
    if (postData.mediaUrls && postData.mediaUrls.length > 0) return `media-${getFeedMediaBucket(postData)}`;
    return 'text';
  }, []);

  const overrideItemLayout = useCallback((slot: { span?: number; size?: number }, item: FeedItem) => {
    if (!item) return;
    if (item.type === 'SUGGESTED_USERS') {
      slot.size = 230;
      return;
    }
    if (item.type === 'SUGGESTED_COURSES') {
      slot.size = 270;
      return;
    }
    if (item.type === 'SUGGESTED_QUIZZES') {
      slot.size = 270;
      return;
    }
    if (item.type === 'RECALL_CARD') {
      // v6 floating flat card: resting ~300, revealed ~360, completed ~365.
      // Beautiful contained card with soft shadow, 24px radius, generous padding.
      // Stands apart from the full-bleed posts above/below.
      slot.size = 380;
      return;
    }
    if (item.type === 'FEYNMAN_BOUNTY') {
      // Floating flat card with bounty hero (big +XP number), stats chips,
      // top tutor row, and 2 action buttons. Tallest of the new cards (~480).
      slot.size = 500;
      return;
    }
    if (item.type === 'QUIZ_WAR') {
      // Live battle banner: header + teams row (big scores) + tug-of-war
      // bar + countdown + presence + CTA + reward footer (~470).
      slot.size = 500;
      return;
    }

    const postData = (item as any).data || item;
    if (!postData?.mediaUrls?.length) {
      slot.size = postData?.postType === 'POLL' || postData?.postType === 'QUIZ' ? 430 : ESTIMATED_TEXT_POST_SIZE;
      return;
    }

    // Media is now inset with 12px margin each side — subtract 24px from width
    const mediaHeight = (feedColumnWidth - 24) * getFeedMediaAspectRatio(postData);
    slot.size = Math.round(ESTIMATED_MEDIA_BASE_SIZE + mediaHeight);
  }, [feedColumnWidth]);

  const renderFooter = useCallback(() => {
    // Initial load uses renderEmpty's skeleton stack. Footer is only for
    // load-more (page > 1), where the user is mid-scroll and needs a visible
    // "more coming" signal instead of blank space below the last post.
    if (!isLoadingPosts || feedItems.length === 0) return null;
    return (
      <View style={styles.footer}>
        <PostSkeleton />
        <PostSkeleton />
      </View>
    );
  }, [isLoadingPosts, feedItems.length]);

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
    if (isLoadingPosts) {
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
        actionLabel={t('auth.createAccount')}
        onAction={handleCreatePost}
      />
    );
  }, [isLoadingPosts, handleCreatePost, renderInitialLoadNotice, t]);

  const renderTabletSideRail = useCallback(() => {
    if (!isWideTablet) return null;

    const displayName = user
      ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || t('common.profile')
      : t('common.profile');

    return (
      <View style={styles.sideRail}>
        <View style={styles.sideRailCard}>
          <View style={styles.sideRailProfileRow}>
            <Avatar
              uri={stableProfilePictureUrl}
              name={displayName}
              size="lg"
              gradientBorder="blue"
              showBorder
            />
            <View style={styles.sideRailProfileText}>
              <Text style={styles.sideRailEyebrow}>{getGreeting(t)}</Text>
              <Text style={styles.sideRailName} numberOfLines={1}>{displayName}</Text>
            </View>
          </View>

          <View style={styles.sideRailStats}>
            <View style={styles.sideRailStat}>
              <Text style={styles.sideRailStatValue}>{learningStats.level}</Text>
              <Text style={styles.sideRailStatLabel}>{t('feed.level')}</Text>
            </View>
            <View style={styles.sideRailStat}>
              <Text style={styles.sideRailStatValue}>{learningStats.currentStreak}</Text>
              <Text style={styles.sideRailStatLabel}>{t('feed.dayStreak')}</Text>
            </View>
            <View style={styles.sideRailStat}>
              <Text style={styles.sideRailStatValue}>{learningStats.completedQuizzes}</Text>
              <Text style={styles.sideRailStatLabel}>{t('feed.quizzes')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sideRailCard}>
          <Text style={styles.sideRailTitle}>{t('feed.shareLearning')}</Text>
          <TouchableOpacity style={styles.sideRailAction} onPress={handleAskQuestion} activeOpacity={0.75}>
            <Ionicons name="help-circle-outline" size={20} color="#0EA5E9" />
            <Text style={styles.sideRailActionText}>{t('feed.ask')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideRailAction} onPress={handleCreateQuiz} activeOpacity={0.75}>
            <Ionicons name="bulb-outline" size={20} color="#10B981" />
            <Text style={styles.sideRailActionText}>{t('feed.quiz')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideRailAction} onPress={handleCreatePoll} activeOpacity={0.75}>
            <Ionicons name="bar-chart-outline" size={20} color="#8B5CF6" />
            <Text style={styles.sideRailActionText}>{t('feed.poll.label')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideRailAction} onPress={handleCreateResource} activeOpacity={0.75}>
            <Ionicons name="book-outline" size={20} color="#EC4899" />
            <Text style={styles.sideRailActionText}>{t('feed.resource')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    isWideTablet,
    user,
    t,
    styles,
    learningStats,
    handleAskQuestion,
    handleCreateQuiz,
    handleCreatePoll,
    handleCreateResource,
    stableProfilePictureUrl,
  ]);

  const renderTabletLeftRail = useCallback(() => {
    if (!isThreeColumnTablet) return null;

    const displayName = user
      ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || t('common.profile')
      : t('common.profile');
    const roleLabel = user?.role ? String(user.role).toLowerCase() : t('common.profile');

    return (
      <View style={styles.leftRail}>
        <View style={styles.leftProfileCard}>
          <LinearGradient
            colors={['#F7B733', '#F59E0B']}
            style={styles.leftProfileCover}
          />
          <View style={styles.leftProfileAvatar}>
            <Avatar
              uri={stableProfilePictureUrl}
              name={displayName}
              size="xl"
              gradientBorder="gold"
              showBorder
            />
          </View>
          <Text style={styles.leftProfileName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.leftProfileRole} numberOfLines={1}>{roleLabel}</Text>
          <TouchableOpacity
            style={styles.leftProfileLink}
            onPress={() => navigation.getParent()?.navigate('ProfileTab')}
            activeOpacity={0.75}
          >
            <Ionicons name="person-outline" size={15} color={colors.primary} />
            <Text style={styles.leftProfileLinkText}>{t('common.profile')}</Text>
          </TouchableOpacity>

          <View style={styles.leftMetricGrid}>
            <View style={styles.leftMetric}>
              <Ionicons name="flash-outline" size={16} color="#F59E0B" />
              <Text style={styles.leftMetricValue}>{learningStats.currentStreak}</Text>
              <Text style={styles.leftMetricLabel}>{t('feed.dayStreak')}</Text>
            </View>
            <View style={styles.leftMetric}>
              <Ionicons name="radio-button-on-outline" size={16} color="#3B82F6" />
              <Text style={styles.leftMetricValue}>{learningStats.xp}</Text>
              <Text style={styles.leftMetricLabel}>{t('feed.xp')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.leftMenuCard}>
          <View style={[styles.leftMenuItem, styles.leftMenuItemActive]}>
            <Ionicons name="trending-up-outline" size={20} color="#F59E0B" />
            <Text style={[styles.leftMenuText, styles.leftMenuTextActive]}>Feed</Text>
          </View>
          <TouchableOpacity style={styles.leftMenuItem} activeOpacity={0.75}>
            <Ionicons name="bookmark-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.leftMenuText}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.leftMenuItem} activeOpacity={0.75}>
            <Ionicons name="book-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.leftMenuText}>My Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.leftMenuItem} activeOpacity={0.75}>
            <Ionicons name="analytics-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.leftMenuText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isThreeColumnTablet, user, t, styles, colors.primary, colors.textSecondary, learningStats, navigation, stableProfilePictureUrl]);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Network Status Banner */}
      <NetworkStatus onRetry={handleRefresh} />



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
        {renderTabletLeftRail()}

        <View style={styles.feedListColumn}>
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
          // Aggressive prefetch — FB/Instagram trigger at ~0.5-0.8 of viewport.
          // The store already prefetches page 2 after page 1 paint, and this
          // ensures page 3+ start loading well before the user hits bottom.
          onEndReachedThreshold={0.6}
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
          estimatedListSize={{ height: windowHeight, width: feedColumnWidth }}
          drawDistance={LIST_DRAW_DISTANCE}
          getItemType={getItemType}
          overrideItemLayout={overrideItemLayout}
          // Keep native image layers attached during refresh/pagination. Detaching
          // clipped cells can make tiny avatar images visibly reconnect on Android.
          removeClippedSubviews={false}
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
        />
        </View>

        {renderTabletSideRail()}
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
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, isTablet: boolean, isLargeTablet: boolean, isWideTablet: boolean, isThreeColumnTablet: boolean, feedColumnWidth: number) => StyleSheet.create({
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
    paddingHorizontal: isTablet ? 24 : 16,
    paddingVertical: isTablet ? 12 : 10,
    width: '100%',
    maxWidth: isTablet ? 1100 : undefined,
    alignSelf: 'center',
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
    alignItems: isTablet ? 'center' : 'stretch',
    flexDirection: isWideTablet ? 'row' : 'column',
    justifyContent: isThreeColumnTablet ? 'flex-start' : isWideTablet ? 'center' : 'flex-start',
    gap: isThreeColumnTablet ? 10 : isWideTablet ? 20 : 0,
    paddingLeft: isThreeColumnTablet ? 4 : isWideTablet ? 24 : 0,
    paddingRight: isThreeColumnTablet ? 16 : isWideTablet ? 24 : 0,
  },
  feedListColumn: {
    flex: 1,
    width: '100%',
    maxWidth: isTablet ? feedColumnWidth : undefined,
    alignSelf: 'center',
  },
  leftRail: {
    width: 270,
    alignSelf: 'flex-start',
    paddingTop: 22,
    gap: 14,
  },
  leftProfileCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 18,
      },
      android: { elevation: 1 },
    }),
  },
  leftProfileCover: {
    height: 118,
    width: '100%',
  },
  leftProfileAvatar: {
    marginTop: -42,
    marginBottom: 10,
  },
  leftProfileName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    paddingHorizontal: 16,
  },
  leftProfileRole: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'capitalize',
  },
  leftProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  leftProfileLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  leftMetricGrid: {
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    gap: 10,
  },
  leftMetric: {
    flex: 1,
    minHeight: 76,
    borderRadius: 14,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  leftMetricValue: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
  },
  leftMetricLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  leftMenuCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  leftMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  leftMenuItemActive: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
  },
  leftMenuText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  leftMenuTextActive: {
    color: '#F59E0B',
  },
  sideRail: {
    width: isThreeColumnTablet ? 270 : 300,
    alignSelf: 'flex-start',
    paddingTop: 22,
    gap: 14,
  },
  sideRailCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 18,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sideRailProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sideRailProfileText: {
    flex: 1,
    minWidth: 0,
  },
  sideRailEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 2,
  },
  sideRailName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  sideRailStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  sideRailStat: {
    flex: 1,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sideRailStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  sideRailStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  sideRailTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  sideRailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    marginBottom: 8,
  },
  sideRailActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  listContent: {
    paddingBottom: isTablet ? 120 : 100,
    paddingTop: isTablet ? 10 : 0,
  },

  headerSection: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  postWrapper: {
    marginBottom: 0,
  },

  // ── (Subject filters removed — LinkedIn full-bleed style) ──
  categoriesSection: {
    display: 'none' as any,
  },
  categoriesSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  // ── Create Post Card — LinkedIn full-bleed style ──
  createPostCard: {
    backgroundColor: colors.card,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: isTablet ? 16 : 14,
    paddingBottom: isTablet ? 10 : 8,
    borderWidth: 0,
    borderRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  },
  createPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 18 : 16,
    gap: isTablet ? 14 : 12,
  },
  createPostInputFake: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  inCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  inCardActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 0,
  },
  skeletonContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
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
