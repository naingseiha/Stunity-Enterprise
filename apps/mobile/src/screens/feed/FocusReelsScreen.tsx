import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Platform,
  ViewToken,
  Share,
  RefreshControl,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { feedApi } from '@/api/client';
import { Haptics } from '@/services/haptics';
import { Avatar } from '@/components/common/Avatar';
import {
  reelsCache,
  isReelsCacheFresh,
  patchEngagementInCache,
  persistReelsCacheToDisk,
  CACHE_FRESHNESS_MS,
} from './reelsCache';
import useAuthStore from '@/stores/authStore';
import { track } from '@/services/analytics';
import { useFeatureFlag } from '@/config/featureFlags';
import { useReducedMotion } from '@/hooks';
import { adjustReactionCounts } from '@/utils/reactionCounts';

const { width, height } = Dimensions.get('window');

// Reaction palette — Ionicons only (no emoji, which render as tofu on-device).
// Mirrors the feed's PostCard palette so reels and feed read identically.
const REEL_REACTIONS: { type: string; icon: keyof typeof Ionicons.glyphMap; color: string; label: string }[] = [
  { type: 'LIKE', icon: 'heart', color: '#FF4D6D', label: 'Like' },
  { type: 'INSIGHTFUL', icon: 'bulb', color: '#F59E0B', label: 'Insightful' },
  { type: 'CELEBRATE', icon: 'sparkles', color: '#8B5CF6', label: 'Celebrate' },
  { type: 'SMART_TAKE', icon: 'rocket', color: '#0EA5E9', label: 'Smart take' },
];

const REEL_REACTION_BY_TYPE = new Map(REEL_REACTIONS.map((r) => [r.type, r]));

// ─── Types ─────────────────────────────────────────────────────────────
// Re-exported from reelsCache.ts so prefetch + screen share the same shape.
import type { ReelType, ReelEngagement, ReelFeedItem } from './reelsCache';

// ─── Subject palette ───────────────────────────────────────────────────
// Each card backdrop picks a gradient from this map keyed off `subject`.
// Falls back to the brand purple ramp if the subject is unknown.

const SUBJECT_GRADIENTS: Record<string, [string, string, string]> = {
  physics: ['#0B1437', '#1E2A78', '#3B4CCA'],
  mathematics: ['#0A2540', '#0E5E7F', '#10A8B8'],
  math: ['#0A2540', '#0E5E7F', '#10A8B8'],
  biology: ['#06281E', '#0A6E51', '#10B981'],
  chemistry: ['#2B0F4A', '#5E1B8A', '#A855F7'],
  history: ['#3B1209', '#7C2D12', '#EA580C'],
  english: ['#1F1147', '#3F2C90', '#7C3AED'],
  literature: ['#1F1147', '#3F2C90', '#7C3AED'],
  geography: ['#022C22', '#065F46', '#34D399'],
  arts: ['#3D0A30', '#7E1373', '#EC4899'],
  general: ['#111827', '#1F2937', '#374151'],
};
const DEFAULT_GRADIENT: [string, string, string] = ['#1A0B3D', '#3D1B7A', '#7C3AED'];

const gradientFor = (subject?: string): [string, string, string] => {
  if (!subject) return DEFAULT_GRADIENT;
  const key = subject.toLowerCase().split(/[·\s/]/)[0].trim();
  return SUBJECT_GRADIENTS[key] ?? DEFAULT_GRADIENT;
};

const TYPE_LABELS: Record<ReelType, { label: string; color: string }> = {
  FOCUS_REEL: { label: 'FOCUS REEL', color: '#A855F7' },
  RECALL_CARD: { label: 'FLASHCARD', color: '#3B82F6' },
  QUIZ_QUESTION: { label: 'QUICK QUIZ', color: '#10B981' },
  TF_CARD: { label: 'TRUE OR FALSE', color: '#22D3EE' },
  CLOZE_CARD: { label: 'FILL THE BLANK', color: '#F472B6' },
  BOUNTY: { label: 'BOUNTY', color: '#F59E0B' },
  POST: { label: 'POST', color: '#EC4899' },
};

// ─── Fallback Data ─────────────────────────────────────────────────────

const fallbackReels: ReelFeedItem[] = [
  {
    id: 'reel-physics-1',
    type: 'FOCUS_REEL',
    subject: 'Physics',
    payload: {
      title: 'Quantum Wave-Particle Duality',
      description: 'Light behaves as both a wave and a particle.',
      // No placeholder media in production — the fallback reel renders as a
      // gradient focus card (the render path guards on item.videoUrl). Real
      // reel media comes from the reels API / reelsRanker.
      creator: { id: 't1', firstName: 'Albert', lastName: 'Einstein' },
      pausePoints: [
        {
          time: 5,
          question: 'What happens to a quantum wave function when it is measured?',
          options: ['Splits universes', 'Collapses', 'Speeds up', 'Disappears'],
          correctAnswer: 1,
          xp: 15,
        },
      ],
    },
  },
  {
    id: 'quiz-1',
    type: 'QUIZ_QUESTION',
    subject: 'Biology',
    payload: {
      question: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'],
      correctAnswer: 1,
      points: 10,
    },
  },
  {
    id: 'recall-1',
    type: 'RECALL_CARD',
    subject: 'Biology',
    payload: {
      subjectLabel: 'Biology · Cell Structure',
      recallStrength: 0.4,
      question: {
        question: 'What phase of mitosis do chromosomes align at the equator?',
        options: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'],
        correctAnswer: 1,
      },
    },
  },
  {
    id: 'bounty-1',
    type: 'BOUNTY',
    subject: 'Mathematics',
    payload: {
      questionText: 'Can someone explain the chain rule in calculus simply?',
      bountyXp: 500,
      asker: { firstName: 'Jane', lastName: 'Doe' },
    },
  },
];

// ─── Main Screen ───────────────────────────────────────────────────────

const COMBO_FILL_TARGET = 5;
const PREFETCH_THRESHOLD = 3;

// reelsCache, patchEngagementInCache, and CACHE_FRESHNESS_MS now live in
// ./reelsCache.ts so MainNavigator can prime the cache *before* this screen
// mounts (the same pattern Instagram/TikTok use for instant tab entry).

const AUTHORING_ROLES = ['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN'];

export const FocusReelsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const canAuthor = useAuthStore((s) => AUTHORING_ROLES.includes(s.user?.role ?? ''));

  // Authoring chooser: a quick question card is the primary (high-supply) path;
  // a video reel is the secondary, heavier option.
  const openCreateChooser = useCallback(() => {
    Alert.alert(
      t('reels.create.chooserTitle', { defaultValue: 'Add to the learning feed' }),
      t('reels.create.chooserBody', { defaultValue: 'What do you want to create?' }),
      [
        {
          text: t('reels.createCard.title', { defaultValue: 'Quick question' }),
          onPress: () => navigation.navigate('CreateQuestionCard'),
        },
        {
          text: t('reels.create.title', { defaultValue: 'Video reel' }),
          onPress: () => navigation.navigate('CreateFocusReel'),
        },
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      ],
    );
  }, [navigation, t]);
  // The bottom tab bar now stays visible on Reels (TikTok/IG/FB style). Size
  // each reel page to sit *above* the bar so captions / action buttons / the
  // progress bar aren't hidden behind it. (Reels is always inside the bottom
  // tab navigator, so this hook is always in context.)
  const tabBarHeight = useBottomTabBarHeight();
  const pageHeight = Math.max(0, height - tabBarHeight);
  // Hydrate from module cache when available so navigating back is instant.
  const [items, setItems] = useState<ReelFeedItem[]>(reelsCache.items);
  const [loading, setLoading] = useState(reelsCache.items.length === 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(reelsCache.nextCursor);
  const [hasMore, setHasMore] = useState(reelsCache.hasMore);
  const fetchingMore = useRef(false);

  const [combo, setCombo] = useState(0);
  const [showComboFill, setShowComboFill] = useState(false);
  const [xpBurst, setXpBurst] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dueRecallCount, setDueRecallCount] = useState(0);
  // End-of-session celebration: track reviews cleared + XP earned since the
  // last celebration, and how many cards are coming up in the next 24h.
  const [upcomingRecallCount, setUpcomingRecallCount] = useState(0);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  // Mirror of dueRecallCount for synchronous "did this review clear the pile?"
  // detection inside handleInteraction (state would be stale in the closure).
  const dueCountRef = useRef(0);

  // HUD warmup — combo / due recall counts persist across sessions.
  const fetchState = useCallback(async () => {
    try {
      const res = await feedApi.get<{ combo: number; highestCombo: number; dueRecallCount: number; upcomingRecallCount?: number }>('/reels/state');
      if (res.data) {
        setCombo(res.data.combo ?? 0);
        setDueRecallCount(res.data.dueRecallCount ?? 0);
        dueCountRef.current = res.data.dueRecallCount ?? 0;
        setUpcomingRecallCount(res.data.upcomingRecallCount ?? 0);
      }
    } catch { /* non-fatal — HUD just starts at 0 */ }
  }, []);

  // useFocusEffect fires on the very first focus too, so it covers both the
  // initial mount AND every return from Comments / BountyDetail. The earlier
  // bare useEffect was a duplicate that caused two /reels/state calls during
  // the boot waterfall — both racing for the same connection pool slot.
  useFocusEffect(useCallback(() => { fetchState(); }, [fetchState]));

  const fetchFeed = useCallback(async (cursor: string | null = null) => {
    // TTI instrumentation: only meaningful for the first page on a cold cache.
    // Stamped here so disk-hydrate / in-flight-await fast paths get reported
    // separately in their own effect below.
    const ttiStart = !cursor && reelsCache.items.length === 0 ? Date.now() : null;
    try {
      // Only show the skeleton on the very first cold load — keep the prior
      // frame on-screen during background refreshes.
      const isCold = !cursor && reelsCache.items.length === 0;
      if (isCold) setLoading(true);
      const res = await feedApi.get<{ items: ReelFeedItem[]; nextCursor: string | null; hasMore: boolean }>(
        `/reels/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      const data = res.data;
      if (!data?.items?.length) {
        if (!cursor && reelsCache.items.length === 0) setItems(fallbackReels);
        setHasMore(false);
        return;
      }
      setItems((prev) => {
        const next = cursor ? [...prev, ...data.items] : data.items;
        reelsCache.items = next;
        reelsCache.ts = Date.now();
        return next;
      });
      setNextCursor(data.nextCursor ?? null);
      reelsCache.nextCursor = data.nextCursor ?? null;
      setHasMore(!!data.hasMore);
      reelsCache.hasMore = !!data.hasMore;
      // Persist to disk so the next cold launch shows real reels in <50ms.
      // Fire-and-forget; failures are silent and non-critical.
      const persistUserId = useAuthStore.getState().user?.id;
      if (persistUserId) void persistReelsCacheToDisk(persistUserId);
      if (ttiStart != null) {
        const ms = Date.now() - ttiStart;
        track('reels_tti', { ms, source: 'network' });
        if (__DEV__) console.log(`[Reels TTI] network cold-first-paint=${ms}ms`);
      }
    } catch (err) {
      console.warn('Failed to fetch reels feed:', err);
      if (!cursor && reelsCache.items.length === 0) setItems(fallbackReels);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setActiveIndex(0);
    setNextCursor(null);
    setHasMore(true);
    await Promise.all([fetchFeed(null), fetchState()]);
    setRefreshing(false);
  }, [fetchFeed, fetchState]);

  useEffect(() => {
    const mountTs = Date.now();
    // Fast path 1: memory cache fresh (< 60s) — render instantly, zero I/O.
    if (isReelsCacheFresh()) {
      const ms = Date.now() - mountTs;
      track('reels_tti', { ms, source: 'memory-cache' });
      if (__DEV__) console.log(`[Reels TTI] memory-cache hit=${ms}ms`);
      return;
    }
    // Fast path 2: MainNavigator's prefetch is still in flight (or finishing).
    // Hydrate from it instead of firing a duplicate request.
    if (reelsCache.inFlight) {
      reelsCache.inFlight.then(() => {
        if (reelsCache.items.length > 0) {
          setItems(reelsCache.items);
          setNextCursor(reelsCache.nextCursor);
          setHasMore(reelsCache.hasMore);
          setLoading(false);
          const ms = Date.now() - mountTs;
          track('reels_tti', { ms, source: 'prefetch-await' });
          if (__DEV__) {
            console.log(`[Reels TTI] prefetch-await first-paint=${ms}ms`);
          }
        } else {
          fetchFeed();
        }
      });
      return;
    }
    // Slow path: nothing in memory, no prefetch in flight — fetch ourselves.
    fetchFeed();
  }, [fetchFeed]);

  // Prefetch next page as the user nears the end
  useEffect(() => {
    if (!hasMore || fetchingMore.current) return;
    if (items.length === 0) return;
    if (activeIndex < items.length - PREFETCH_THRESHOLD) return;
    fetchingMore.current = true;
    fetchFeed(nextCursor).finally(() => {
      fetchingMore.current = false;
    });
  }, [activeIndex, items.length, hasMore, nextCursor, fetchFeed]);

  const handleInteraction = useCallback(async (
    itemId: string,
    itemType: ReelType,
    payload: { correct?: boolean; xpEarned?: number; grade?: 'again' | 'good' | 'easy' },
  ) => {
    // RECALL_CARD uses SM-2 grade; everything else uses correct boolean.
    const passed = itemType === 'RECALL_CARD' ? payload.grade !== 'again' : !!payload.correct;
    // Instrument the core learning event so accuracy/completion is measurable
    // (answer accuracy, per-type engagement). Fire before the network call so a
    // dropped request still records that the learner attempted retrieval.
    track('reel_answer', {
      type: itemType,
      passed,
      ...(payload.grade ? { grade: payload.grade } : { correct: !!payload.correct }),
      xp: payload.xpEarned ?? 0,
    });
    try {
      const res = await feedApi.post('/reels/interactions', { itemId, itemType, ...payload });
      const { combo: newCombo, isComboFill, xpEarned: actualXp } = res.data;
      if (typeof newCombo === 'number') setCombo(newCombo);
      if (actualXp > 0) {
        setXpBurst(actualXp);
        setSessionXp((x) => x + actualXp);
        setTimeout(() => setXpBurst(null), 1200);
      }
      if (isComboFill) {
        setShowComboFill(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowComboFill(false), 2400);
      } else if (passed) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // After a recall review, decrement the due-count for the HUD and detect
      // when the learner has just cleared their entire due pile → celebrate.
      if (itemType === 'RECALL_CARD') {
        setSessionReviewed((n) => n + 1);
        const prevDue = dueCountRef.current;
        const nextDue = Math.max(0, prevDue - 1);
        dueCountRef.current = nextDue;
        setDueRecallCount(nextDue);
        if (prevDue > 0 && nextDue === 0) {
          // Refresh upcoming count, then show the session-complete celebration.
          void fetchState();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowSessionComplete(true);
        }
      }
    } catch (err) {
      console.warn('Interaction API failed (local-only update):', err);
      if (passed) {
        setCombo((prev) => prev + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setCombo(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [fetchState]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  // Note: no early `loading` return any more. Instagram/TikTok never blank the
  // screen on tab entry — they render the first card "frame" immediately and
  // stream content in. We do the same: the FlashList branch below renders an
  // empty-state placeholder when items are still loading, sharing the same
  // gradient + chrome the real card uses so the transition is seamless.

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ComboBar combo={combo} dueRecallCount={dueRecallCount} />

      <View style={styles.globalHeader}>
        {/* Hide the back button when entered as a tab root (nowhere to go back to).
            canGoBack() is unreliable here: FocusReelsScreen is registered both
            inside FeedStack (push, back works) AND as ReelsTab (tab root, no
            back) — and the parent root stack always reports canGoBack=true.
            Check the nearest navigator: only a stack with index > 0 truly has
            a back target. */}
        {(() => {
          const state = navigation.getState();
          const canActuallyGoBack = state?.type === 'stack' && state.index > 0;
          if (!canActuallyGoBack) return null;
          return (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel={t('common.back', { defaultValue: 'Go back' })}
            >
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </TouchableOpacity>
          );
        })()}
        <TouchableOpacity
          style={styles.muteBtn}
          onPress={() => setMuted((m) => !m)}
          accessibilityRole="button"
          accessibilityState={{ selected: muted }}
          accessibilityLabel={muted
            ? t('reels.a11y.unmute', { defaultValue: 'Unmute' })
            : t('reels.a11y.mute', { defaultValue: 'Mute' })}
        >
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#FFF" />
        </TouchableOpacity>
        {canAuthor && (
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={openCreateChooser}
            accessibilityRole="button"
            accessibilityLabel={t('reels.create.chooserTitle', { defaultValue: 'Add to the learning feed' })}
          >
            <Ionicons name="add" size={26} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {showComboFill && <ComboFillBurst />}
      {xpBurst != null && <XpBurst amount={xpBurst} />}
      {showSessionComplete && (
        <SessionCompleteOverlay
          reviewed={sessionReviewed}
          xp={sessionXp}
          upcoming={upcomingRecallCount}
          onDismiss={() => {
            setShowSessionComplete(false);
            setSessionReviewed(0);
            setSessionXp(0);
          }}
        />
      )}

      {items.length === 0 && loading ? (
        // Cold first load — render an empty card-shaped placeholder using the
        // default gradient. No shimmer skeleton, no blank screen: the chrome
        // (combo bar, mute, header) is already mounted above and content
        // streams into the slot below as soon as it arrives. Mirrors the
        // pre-render frame TikTok/Instagram show before the first reel paints.
        <ReelLoadingPlaceholder />
      ) : items.length === 0 ? (
        <EmptyState onRetry={onRefresh} />
      ) : (
        <FlashList
          data={items}
          estimatedItemSize={pageHeight}
          renderItem={({ item, index }) => (
            <ReelCard
              item={item}
              isActive={index === activeIndex}
              shouldMountVideo={Math.abs(index - activeIndex) <= 1}
              muted={muted}
              onInteract={(payload) => handleInteraction(item.id, item.type, payload)}
              pageHeight={pageHeight}
            />
          )}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          decelerationRate="fast"
          snapToInterval={pageHeight}
          snapToAlignment="start"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFF"
              colors={['#A855F7']}
              progressBackgroundColor="rgba(0,0,0,0.5)"
            />
          }
        />
      )}
    </View>
  );
};

// ─── Loading placeholder ───────────────────────────────────────────────
// Shown for the brief window between mount and first item arrival when the
// module cache was empty. NOT a skeleton: just the same gradient the real
// card uses, with a small spinner top-right so the user knows we're working.
// The combo bar + mute button above stay mounted, so the screen never blanks.

const ReelLoadingPlaceholder: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return; // no perpetual spin under reduce-motion; static ring
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin, reduceMotion]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={DEFAULT_GRADIENT} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={{
          position: 'absolute',
          top: 110,
          right: 20,
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.25)',
          borderTopColor: '#FFF',
          transform: [{ rotate }],
        }}
        pointerEvents="none"
      />
    </View>
  );
};

// ─── Empty / error state ───────────────────────────────────────────────

const EmptyState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <View style={styles.emptyContainer}>
    <LinearGradient colors={DEFAULT_GRADIENT} style={StyleSheet.absoluteFill} />
    <Ionicons name="sparkles-outline" size={56} color="rgba(255,255,255,0.6)" />
    <Text style={styles.emptyTitle}>No reels yet</Text>
    <Text style={styles.emptyBody}>
      We couldn't find any learning reels for you right now. Pull down to refresh or come back soon.
    </Text>
    <TouchableOpacity style={styles.emptyRetryBtn} onPress={onRetry} activeOpacity={0.85}>
      <LinearGradient
        colors={['#A855F7', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.submitBtnGradient}
      >
        <Ionicons name="refresh" size={18} color="#FFF" />
        <Text style={styles.submitBtnText}>Try again</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ─── Combo Bar (top HUD) ───────────────────────────────────────────────

const ComboBar: React.FC<{ combo: number; dueRecallCount: number }> = ({ combo, dueRecallCount }) => {
  const filledSegments = combo % COMBO_FILL_TARGET;
  const totalCycles = Math.floor(combo / COMBO_FILL_TARGET);
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(filledSegments); // jump straight to the filled state
      return;
    }
    Animated.spring(progress, {
      toValue: filledSegments,
      tension: 80,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [filledSegments, progress, reduceMotion]);

  return (
    <View style={styles.comboBar}>
      <View style={styles.comboBarInner}>
        <View style={styles.comboSegments}>
          {Array.from({ length: COMBO_FILL_TARGET }).map((_, i) => {
            const opacity = progress.interpolate({
              inputRange: [i, i + 0.5, i + 1],
              outputRange: [0.15, 0.6, 1],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={i} style={[styles.comboSegment, { opacity }]}>
                <LinearGradient
                  colors={['#FDE047', '#F59E0B', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            );
          })}
        </View>
        <View style={styles.comboLabelWrap}>
          <Ionicons name="flame" size={14} color="#F59E0B" />
          <Text style={styles.comboLabel}>
            {combo}
            {totalCycles > 0 && <Text style={styles.comboLabelMuted}>  ·  {totalCycles}× loot</Text>}
          </Text>
        </View>
        {dueRecallCount > 0 && (
          <View style={styles.dueRecallChip}>
            <Ionicons name="albums" size={11} color="#3B82F6" />
            <Text style={styles.dueRecallText}>{dueRecallCount}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ComboFillBurst: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      // Show it statically (no scale-pop / fade); the parent unmounts it on a timer.
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [scale, opacity, reduceMotion]);

  return (
    <Animated.View style={[styles.comboFillCelebration, { opacity, transform: [{ scale }] }]} pointerEvents="none">
      <LinearGradient
        colors={['#FDE047', '#F59E0B', '#EA580C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.comboFillPill}
      >
        <Ionicons name="gift" size={28} color="#FFF" />
        <Text style={styles.comboFillTitle}>LOOT BOX UNLOCKED</Text>
        <Text style={styles.comboFillSub}>+50 XP bonus</Text>
      </LinearGradient>
    </Animated.View>
  );
};

const XpBurst: React.FC<{ amount: number }> = ({ amount }) => {
  const reduceMotion = useReducedMotion();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      // No upward drift; just show the tally (parent unmounts it on a timer).
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [translateY, opacity, reduceMotion]);

  return (
    <Animated.View style={[styles.xpBurst, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={styles.xpBurstText}>+{amount} XP</Text>
    </Animated.View>
  );
};

// ─── End-of-session celebration ────────────────────────────────────────
// Fires when the learner clears their entire due-recall pile in a sitting —
// the moment that earns a "come back tomorrow" pull. Summarizes the session
// (cards reviewed + XP) and surfaces how many cards return tomorrow.

const SessionCompleteOverlay: React.FC<{
  reviewed: number;
  xp: number;
  upcoming: number;
  onDismiss: () => void;
}> = ({ reviewed, xp, upcoming, onDismiss }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity, reduceMotion]);

  return (
    <Animated.View style={[styles.sessionOverlay, { opacity }]}>
      <Animated.View style={[styles.sessionCard, { transform: [{ scale }] }]}>
        <View style={styles.sessionIconWrap}>
          <LinearGradient
            colors={['#A855F7', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="checkmark-done" size={40} color="#FFF" />
        </View>
        <Text style={styles.sessionTitle}>
          {t('reels.session.title', { defaultValue: 'Reviews cleared!' })}
        </Text>
        <Text style={styles.sessionSubtitle}>
          {t('reels.session.subtitle', { defaultValue: "You've reviewed every card due today." })}
        </Text>

        <View style={styles.sessionStatsRow}>
          <View style={styles.sessionStat}>
            <Text style={styles.sessionStatValue}>{reviewed}</Text>
            <Text style={styles.sessionStatLabel}>
              {t('reels.session.reviewed', { defaultValue: 'Reviewed' })}
            </Text>
          </View>
          <View style={styles.sessionStatDivider} />
          <View style={styles.sessionStat}>
            <Text style={styles.sessionStatValue}>+{xp}</Text>
            <Text style={styles.sessionStatLabel}>
              {t('reels.session.xp', { defaultValue: 'XP earned' })}
            </Text>
          </View>
        </View>

        <View style={styles.sessionTomorrow}>
          <Ionicons name="alarm-outline" size={16} color="#FDE047" />
          <Text style={styles.sessionTomorrowText}>
            {upcoming > 0
              ? t('reels.session.upcoming', {
                  count: upcoming,
                  defaultValue: '{{count}} more coming up tomorrow',
                })
              : t('reels.session.allCaughtUp', {
                  defaultValue: "You're all caught up — see you tomorrow!",
                })}
          </Text>
        </View>

        <TouchableOpacity style={styles.sessionBtn} onPress={onDismiss} activeOpacity={0.85}>
          <LinearGradient
            colors={['#A855F7', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionBtnGradient}
          >
            <Text style={styles.sessionBtnText}>
              {t('reels.session.keepGoing', { defaultValue: 'Keep scrolling' })}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Skeleton loader ───────────────────────────────────────────────────

const SkeletonScreen: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      shimmer.setValue(0.5); // hold a mid, non-pulsing opacity
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer, reduceMotion]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <View style={styles.skeletonContainer}>
      <LinearGradient colors={DEFAULT_GRADIENT} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.skeletonBadge, { opacity }]} />
      <View style={{ height: 24 }} />
      <Animated.View style={[styles.skeletonTitle, { opacity }]} />
      <Animated.View style={[styles.skeletonTitleShort, { opacity }]} />
      <View style={{ height: 48 }} />
      {[0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={[styles.skeletonOption, { opacity }]} />
      ))}
      <View style={{ position: 'absolute', bottom: 100 }}>
        <Text style={styles.skeletonHint}>Crafting your next learning loop…</Text>
      </View>
    </View>
  );
};

// ─── Card Router (memoized) ────────────────────────────────────────────

type InteractionPayload = { correct?: boolean; xpEarned?: number; grade?: 'again' | 'good' | 'easy' };

interface CardProps {
  item: ReelFeedItem;
  isActive: boolean;
  shouldMountVideo: boolean;
  muted: boolean;
  onInteract: (payload: InteractionPayload) => void;
  pageHeight: number;
}

const ReelCard = React.memo(({ item, isActive, shouldMountVideo, muted, onInteract, pageHeight }: CardProps) => {
  const gradient = useMemo(() => gradientFor(item.subject), [item.subject]);
  const common = { item: item.payload, isActive, postId: item.postId, engagement: item.engagement, onInteract, gradient, muted, pageHeight };

  switch (item.type) {
    case 'FOCUS_REEL':
      return <FocusReelItem {...common} shouldMountVideo={shouldMountVideo} />;
    case 'QUIZ_QUESTION':
      return <QuizCardItem {...common} />;
    case 'TF_CARD':
      return <TrueFalseCardItem {...common} />;
    case 'CLOZE_CARD':
      return <ClozeCardItem {...common} />;
    case 'RECALL_CARD':
      return <RecallCardItem {...common} bountyId={item.id} />;
    case 'BOUNTY':
      return <BountyCardItem {...common} bountyId={item.id} subject={item.subject} />;
    case 'POST':
      return <PostReelItem {...common} shouldMountVideo={shouldMountVideo} />;
    default:
      return null;
  }
}, (prev, next) => (
  prev.item === next.item &&
  prev.isActive === next.isActive &&
  prev.shouldMountVideo === next.shouldMountVideo &&
  prev.muted === next.muted &&
  prev.pageHeight === next.pageHeight
));

// ─── Sidebar (right rail) ──────────────────────────────────────────────

interface SidebarProps {
  item: any;
  layout?: 'vertical' | 'horizontal';
  postId?: string;
  engagement?: ReelEngagement;
  accent?: string;
}

const buildShareText = (item: any, postId?: string): { message: string; url?: string } => {
  const title =
    item?.title ??
    item?.question?.question ??
    item?.question ??
    item?.questionText ??
    item?.content ??
    'Check out this Stunity reel';
  const trimmed = String(title).slice(0, 140);
  const url = postId ? `https://stunity.app/posts/${postId}` : undefined;
  return { message: url ? `${trimmed}\n\n${url}` : trimmed, url };
};

const ReelSidebar: React.FC<SidebarProps> = React.memo(({ item, layout = 'vertical', postId, engagement, accent }) => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const reactionsEnabled = useFeatureFlag('reactions');
  const [liked, setLiked] = useState<boolean>(!!engagement?.isLikedByMe);
  const [likesCount, setLikesCount] = useState<number>(engagement?.likesCount ?? 0);
  const [myReaction, setMyReaction] = useState<string | null>(engagement?.myReaction ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const commentsCount = engagement?.commentsCount ?? 0;
  const heartScale = useRef(new Animated.Value(1)).current;

  // Stay in sync if engagement re-resolves from a paginated fetch.
  useEffect(() => {
    setLiked(!!engagement?.isLikedByMe);
    setLikesCount(engagement?.likesCount ?? 0);
    setMyReaction(engagement?.myReaction ?? null);
  }, [engagement?.isLikedByMe, engagement?.likesCount, engagement?.myReaction]);

  const reactionMeta = myReaction ? REEL_REACTIONS.find((r) => r.type === myReaction) : null;

  // Social-proof breakdown: the authoritative server counts with the viewer's
  // own reaction folded onto them (same pure derivation as the feed's PostCard).
  // `reactionCountsFor` also feeds the cache patch so a remount reflects it.
  const baseServerReaction = engagement?.myReaction ?? (engagement?.isLikedByMe ? 'LIKE' : null);
  const reactionCountsFor = (to: string | null): Record<string, number> =>
    adjustReactionCounts(engagement?.reactionCounts ?? {}, baseServerReaction, to);
  const summaryTypes = useMemo(() => {
    const localReaction = myReaction ?? (liked ? 'LIKE' : null);
    const counts = reactionCountsFor(localReaction);
    return Object.entries(counts)
      .filter(([type, n]) => n > 0 && REEL_REACTION_BY_TYPE.has(type))
      .sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement?.reactionCounts, engagement?.myReaction, engagement?.isLikedByMe, myReaction, liked]);
  const showReactionSummary = layout !== 'horizontal' && (summaryTypes.length > 1 || (summaryTypes.length === 1 && summaryTypes[0][0] !== 'LIKE'));

  const onShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share(buildShareText(item, postId));
    } catch { /* user dismissed the sheet */ }
  };

  const supportsSocial = !!postId;

  const animateHeart = () => {
    if (reduceMotion) return; // skip the scale-pop; the icon/colour change still conveys the state
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, tension: 200, friction: 5, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const onLike = async () => {
    if (!postId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const wasLiked = liked;
    const optimisticLiked = !wasLiked;
    const optimisticCount = Math.max(0, likesCount + (optimisticLiked ? 1 : -1));

    const prevReaction = myReaction;

    // Optimistic UI — a plain tap toggles a LIKE reaction.
    setLiked(optimisticLiked);
    setLikesCount(optimisticCount);
    setMyReaction(optimisticLiked ? 'LIKE' : null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateHeart();

    try {
      const res = await feedApi.post<{ success: boolean; liked: boolean }>(`/posts/${postId}/like`);
      // Server returns the authoritative liked state (it toggles based on
      // existing state, not the request body). Reconcile if we guessed wrong.
      if (res.data && typeof res.data.liked === 'boolean' && res.data.liked !== optimisticLiked) {
        const corrected = res.data.liked;
        const correctedCount = corrected ? optimisticCount : Math.max(0, optimisticCount - 1);
        setLiked(corrected);
        setMyReaction(corrected ? 'LIKE' : null);
        setLikesCount((c) => Math.max(0, c + (corrected === optimisticLiked ? 0 : (corrected ? 2 : -2))));
        patchEngagementInCache(postId, { isLikedByMe: corrected, likesCount: correctedCount, myReaction: corrected ? 'LIKE' : null, reactionCounts: reactionCountsFor(corrected ? 'LIKE' : null) });
      } else {
        patchEngagementInCache(postId, { isLikedByMe: optimisticLiked, likesCount: optimisticCount, myReaction: optimisticLiked ? 'LIKE' : null, reactionCounts: reactionCountsFor(optimisticLiked ? 'LIKE' : null) });
      }
    } catch (err) {
      // Roll back optimistic update
      setLiked(wasLiked);
      setLikesCount(likesCount);
      setMyReaction(prevReaction);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.warn('Like API failed:', err);
    }
  };

  // Pick a specific reaction (long-press). Reuses the feed's /react endpoint.
  // Toggles off if the same reaction is chosen again.
  const reactToReel = async (type: string) => {
    setPickerOpen(false);
    if (!postId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const prevReaction = myReaction;
    const prevLiked = liked;
    const prevCount = likesCount;

    const isToggleOff = prevReaction === type;
    const optimisticReaction = isToggleOff ? null : type;
    // Count moves only when going none→reaction or reaction→none, not on a swap.
    const optimisticCount = Math.max(
      0,
      likesCount + (!prevReaction && optimisticReaction ? 1 : prevReaction && !optimisticReaction ? -1 : 0),
    );

    setMyReaction(optimisticReaction);
    setLiked(!!optimisticReaction);
    setLikesCount(optimisticCount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateHeart();

    try {
      const res = await feedApi.post<{ success: boolean; myReaction: string | null }>(
        `/posts/${postId}/react`,
        { type },
      );
      const serverReaction = res.data?.myReaction ?? null;
      // Reconcile against the authoritative reaction the server stored.
      setMyReaction(serverReaction);
      setLiked(!!serverReaction);
      patchEngagementInCache(postId, {
        isLikedByMe: !!serverReaction,
        likesCount: optimisticCount,
        myReaction: serverReaction,
        reactionCounts: reactionCountsFor(serverReaction),
      });
      if (serverReaction) track('post_reaction', { surface: 'reels', type: serverReaction });
    } catch (err) {
      setMyReaction(prevReaction);
      setLiked(prevLiked);
      setLikesCount(prevCount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.warn('React API failed:', err);
    }
  };

  const onComment = () => {
    if (!postId) return;
    navigation.navigate('Comments', { postId });
  };

  const horizontal = layout === 'horizontal';
  const avatarName =
    item.creator ? `${item.creator.lastName} ${item.creator.firstName}` :
    item.asker ? `${item.asker.lastName} ${item.asker.firstName}` :
    item.author ? `${item.author.lastName} ${item.author.firstName}` :
    'Stunity';
  const avatarUri = item.creator?.profilePictureUrl || item.asker?.profilePictureUrl || item.author?.profilePictureUrl;

  return (
    <View style={horizontal ? styles.horizontalActionBar : styles.rightSidebar}>
      <View style={horizontal ? styles.horizontalAuthorWrap : { alignItems: 'center', gap: 6 }}>
        <View style={[styles.avatarWrap, { borderColor: accent ?? '#A855F7' }]}>
          <Avatar uri={avatarUri} name={avatarName} size={horizontal ? 'sm' : 'md'} />
        </View>
        {horizontal && (
          <Text style={styles.horizontalAuthorName} numberOfLines={1}>
            @{item.creator?.lastName || item.asker?.lastName || item.author?.lastName || 'stunity'}
          </Text>
        )}
      </View>

      <View style={horizontal ? styles.horizontalIconsWrap : { alignItems: 'center', gap: 22 }}>
        <View>
          {/* Long-press reaction picker (flag-gated, only on post-backed reels) */}
          {pickerOpen && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setPickerOpen(false)}
                style={styles.reactionPickerBackdrop}
              />
              <View style={[styles.reactionPicker, horizontal ? styles.reactionPickerHorizontal : styles.reactionPickerVertical]}>
                {REEL_REACTIONS.map((r) => (
                  <TouchableOpacity
                    key={r.type}
                    onPress={() => reactToReel(r.type)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={r.label}
                    style={styles.reactionPickerOption}
                  >
                    <Ionicons name={r.icon} size={26} color={r.color} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <TouchableOpacity
            style={horizontal ? styles.horizontalIconBtn : styles.sidebarIconBtn}
            onPress={onLike}
            onLongPress={supportsSocial && reactionsEnabled ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPickerOpen(true); } : undefined}
            delayLongPress={220}
            disabled={!supportsSocial}
            activeOpacity={supportsSocial ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityState={{ selected: liked, disabled: !supportsSocial }}
            accessibilityLabel={liked
              ? t('reels.a11y.unlike', { defaultValue: 'Unlike' })
              : t('reels.a11y.like', { defaultValue: 'Like' })}
            accessibilityHint={supportsSocial && reactionsEnabled
              ? t('reels.a11y.reactHint', { defaultValue: 'Double tap to like, or long press to pick a reaction' })
              : undefined}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={reactionMeta ? reactionMeta.icon : liked ? 'heart' : 'heart-outline'}
                size={horizontal ? 26 : 32}
                color={reactionMeta ? reactionMeta.color : liked ? '#FF4D6D' : supportsSocial ? '#FFF' : 'rgba(255,255,255,0.3)'}
              />
            </Animated.View>
            <Text style={styles.sidebarText}>{formatCount(likesCount)}</Text>
          </TouchableOpacity>
          {showReactionSummary && (
            <View
              style={styles.reelReactionSummary}
              pointerEvents="none"
              accessibilityLabel={summaryTypes
                .map(([type, n]) => `${n} ${REEL_REACTION_BY_TYPE.get(type)!.label}`)
                .join(', ')}
            >
              {summaryTypes.slice(0, 3).map(([type], i) => {
                const meta = REEL_REACTION_BY_TYPE.get(type)!;
                return (
                  <View key={type} style={[styles.reelReactionDot, { marginLeft: i === 0 ? 0 : -4, zIndex: 3 - i }]}>
                    <Ionicons name={meta.icon} size={9} color={meta.color} />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={horizontal ? styles.horizontalIconBtn : styles.sidebarIconBtn}
          onPress={onComment}
          disabled={!supportsSocial}
          activeOpacity={supportsSocial ? 0.7 : 1}
          accessibilityRole="button"
          accessibilityState={{ disabled: !supportsSocial }}
          accessibilityLabel={t('reels.a11y.comments', { count: commentsCount, defaultValue: 'Comments, {{count}}' })}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={horizontal ? 26 : 30}
            color={supportsSocial ? '#FFF' : 'rgba(255,255,255,0.3)'}
          />
          <Text style={styles.sidebarText}>{formatCount(commentsCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={horizontal ? styles.horizontalIconBtn : styles.sidebarIconBtn}
          activeOpacity={0.7}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel={t('reels.a11y.share', { defaultValue: 'Share' })}
        >
          <Ionicons name="paper-plane-outline" size={horizontal ? 26 : 28} color="#FFF" />
          {!horizontal && <Text style={styles.sidebarText}>Share</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const formatCount = (n: number): string => {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
};

// ─── Card variants ─────────────────────────────────────────────────────

interface VariantProps {
  item: any;
  isActive: boolean;
  postId?: string;
  engagement?: ReelEngagement;
  onInteract?: (payload: InteractionPayload) => void;
  gradient: [string, string, string];
  muted?: boolean;
  /** Height of one reel page = window height − bottom tab bar height. */
  pageHeight: number;
}

const TypePill: React.FC<{ type: ReelType; extra?: string }> = ({ type, extra }) => {
  const { label, color } = TYPE_LABELS[type];
  return (
    <View style={[styles.typePill, { backgroundColor: color }]}>
      <Ionicons name="sparkles" size={10} color="#FFF" />
      <Text style={styles.typePillText}>{label}{extra ? ` · ${extra}` : ''}</Text>
    </View>
  );
};

/**
 * Pre-buffer the next reel's video so the swipe-to-next transition shows the
 * first frame in <50ms instead of waiting 200–500ms for decoder warmup.
 *
 * Trick: when the card is mounted (±1 of active) but NOT currently active,
 * briefly play() the player muted, then pause() after ~400ms. That single
 * play() call is enough to make AVPlayer / ExoPlayer fetch the initial
 * segment, decode the first keyframe, and seed the buffer. When the user
 * swipes to this card and the existing isActive effect calls play(), it
 * resumes from the seeded buffer instead of starting from scratch.
 *
 * Mute is *forced* during warmup regardless of the user's preference so the
 * off-screen card never bleeds audio. The user's mute preference is restored
 * once warmup completes — the main mute-sync effect will reassert it too.
 *
 * One-shot per player instance: warmedRef prevents re-triggering when isActive
 * cycles. When shouldMount drops to false the player unmounts and warmedRef
 * resets, so re-entering the ±1 window re-warms naturally.
 */
const useReelVideoPreload = (
  player: any,
  shouldMount: boolean,
  isActive: boolean,
  mutedPref: boolean,
) => {
  const warmedRef = useRef(false);
  useEffect(() => {
    if (!shouldMount) {
      warmedRef.current = false;
      return;
    }
    if (isActive || warmedRef.current) return;
    warmedRef.current = true;
    try {
      player.muted = true;
      player.play();
    } catch {
      // expo-video may throw briefly during source swap — non-fatal.
    }
    const t = setTimeout(() => {
      try {
        player.pause();
        player.currentTime = 0;
        player.muted = !!mutedPref;
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(t);
  }, [shouldMount, isActive, player, mutedPref]);
};

const FocusReelItem: React.FC<VariantProps & { shouldMountVideo: boolean }> = ({
  item, isActive, postId, engagement, onInteract, gradient, shouldMountVideo, muted, pageHeight,
}) => {
  const [questionPoint, setQuestionPoint] = useState<any | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [answeredTimes, setAnsweredTimes] = useState<Set<number>>(new Set());
  const [tapPaused, setTapPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const slideAnim = useRef(new Animated.Value(height)).current;

  const player = useVideoPlayer(shouldMountVideo ? item.videoUrl : null, (p) => {
    p.loop = true;
    p.muted = !!muted;
  });

  // Pre-buffer the first frame while this card is in the ±1 window but
  // not yet active, so swipe-to-here paints instantly.
  useReelVideoPreload(player, shouldMountVideo, isActive, !!muted);

  useEffect(() => {
    if (shouldMountVideo) player.muted = !!muted;
  }, [muted, player, shouldMountVideo]);

  useEffect(() => {
    if (!shouldMountVideo) return;
    if (isActive && !questionPoint && !tapPaused) player.play();
    else player.pause();
  }, [isActive, questionPoint, player, shouldMountVideo, tapPaused]);

  useEffect(() => {
    if (!isActive || !item.pausePoints || !shouldMountVideo) return;
    const interval = setInterval(() => {
      const currentTime = player.currentTime;
      const targetPoint = item.pausePoints.find((p: any) => Math.abs(p.time - currentTime) < 0.8);
      if (targetPoint && !answeredTimes.has(targetPoint.time) && !questionPoint) {
        player.pause();
        setQuestionPoint(targetPoint);
        if (reduceMotion) slideAnim.setValue(0);
        else Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isActive, player, item.pausePoints, answeredTimes, questionPoint, slideAnim, shouldMountVideo, reduceMotion]);

  const handleSubmit = () => {
    if (selectedOption === null || !questionPoint) return;
    const isCorrect = selectedOption === questionPoint.correctAnswer;
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');
    if (onInteract) onInteract({ correct: isCorrect, xpEarned: questionPoint.xp || 15 });
    setAnsweredTimes((prev) => new Set(prev).add(questionPoint.time));
    setTimeout(() => {
      if (isCorrect) {
        const onDone = () => {
          setQuestionPoint(null);
          setSelectedOption(null);
          setAnswerStatus('idle');
          if (shouldMountVideo && !tapPaused) player.play();
        };
        if (reduceMotion) {
          slideAnim.setValue(height);
          onDone();
        } else {
          Animated.timing(slideAnim, { toValue: height, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(onDone);
        }
      } else {
        setSelectedOption(null);
        setAnswerStatus('idle');
      }
    }, isCorrect ? 1400 : 1100);
  };

  return (
    <View style={[styles.reelContainer, { height: pageHeight }]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      {shouldMountVideo && item.videoUrl && (
        <VideoView player={player} style={[styles.fullScreenAbsolute, { height: pageHeight }]} contentFit="cover" nativeControls={false} pointerEvents="none" />
      )}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Tap-to-pause background layer — sits below all interactive UI (zIndex 1)
          so the sidebar (zIndex 5) and overlays receive touches first. */}
      <TouchableOpacity
        style={styles.tapLayer}
        activeOpacity={1}
        onPress={() => !questionPoint && setTapPaused((p) => !p)}
      />
      {tapPaused && !questionPoint && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <Ionicons name="play" size={64} color="rgba(255,255,255,0.85)" />
        </View>
      )}

      <ReelSidebar item={item} postId={postId} engagement={engagement} accent={TYPE_LABELS.FOCUS_REEL.color} />

      <View style={styles.bottomDetails}>
        <TypePill type="FOCUS_REEL" />
        <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
        {!!item.description && <Text style={styles.reelSubtitle} numberOfLines={2}>{item.description}</Text>}
        <Text style={styles.creatorName}>@{item.creator?.lastName} {item.creator?.firstName}</Text>
      </View>

      {questionPoint && (
        <Animated.View style={[styles.questionOverlay, { transform: [{ translateY: slideAnim }] }]}>
          <BlurView intensity={95} tint="dark" style={styles.blurCard}>
            <View style={styles.questionPill}>
              <Ionicons name="bulb" size={14} color="#FDE047" />
              <Text style={styles.questionPillText}>PAUSE & ANSWER · +{questionPoint.xp || 15} XP</Text>
            </View>
            <Text style={styles.questionText}>{questionPoint.question}</Text>
            <View style={styles.optionsList}>
              {questionPoint.options.map((opt: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const optStyle = [
                  styles.optionBtn,
                  isSelected && answerStatus === 'correct' && styles.optionCorrect,
                  isSelected && answerStatus === 'incorrect' && styles.optionIncorrect,
                  isSelected && answerStatus === 'idle' && styles.optionSelected,
                ];
                return (
                  <TouchableOpacity
                    key={idx}
                    style={optStyle}
                    onPress={() => answerStatus === 'idle' && setSelectedOption(idx)}
                    activeOpacity={0.85}
                    disabled={answerStatus !== 'idle'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: answerStatus !== 'idle' }}
                    accessibilityLabel={`${String.fromCharCode(65 + idx)}. ${opt}`}
                  >
                    <View style={styles.optionLetter}>
                      <Text style={styles.optionLetterText}>{String.fromCharCode(65 + idx)}</Text>
                    </View>
                    <Text style={styles.optionText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}
              accessibilityRole="button" accessibilityLabel="Submit answer">
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtnGradient}
              >
                <Text style={styles.submitBtnText}>Submit Answer</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
};

const QuizCardItem: React.FC<VariantProps> = ({ item, postId, engagement, onInteract, gradient, pageHeight }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Select-then-submit: tapping an option only highlights it. The answer isn't
  // committed (and the combo isn't risked) until "Submit" — so a mistap can't
  // nuke a streak, and the deliberate commit is better for retention.
  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (isAnswered || selectedOption === null) return;
    setIsAnswered(true);
    const correct = selectedOption === item.correctAnswer;
    if (onInteract) onInteract({ correct, xpEarned: item.points || 10 });
  };

  const wasCorrect = isAnswered && selectedOption === item.correctAnswer;

  return (
    <View style={[styles.reelContainer, { height: pageHeight }]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.cardCenterContent}>
        <TypePill type="QUIZ_QUESTION" extra={`+${item.points || 10} XP`} />
        <Text style={styles.bigQuestionText}>{item.question}</Text>
        <View style={{ width: '100%', gap: 12 }}>
          {(item.options ?? []).map((opt: string, idx: number) => {
            const isCorrect = idx === item.correctAnswer;
            const isPicked = idx === selectedOption;
            let bg: string = 'rgba(255,255,255,0.08)';
            let border: string = 'rgba(255,255,255,0.15)';
            if (isAnswered) {
              if (isCorrect) { bg = 'rgba(16,185,129,0.92)'; border = '#10B981'; }
              else if (isPicked) { bg = 'rgba(239,68,68,0.85)'; border = '#EF4444'; }
            } else if (isPicked) {
              bg = 'rgba(255,255,255,0.15)';
              border = '#FFF';
            }
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.quizOptionBtn, { backgroundColor: bg, borderColor: border }]}
                onPress={() => handleSelect(idx)}
                activeOpacity={0.85}
                disabled={isAnswered}
                accessibilityRole="button"
                accessibilityState={{ selected: isPicked, disabled: isAnswered }}
                accessibilityLabel={`${String.fromCharCode(65 + idx)}. ${opt}`}
              >
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>{String.fromCharCode(65 + idx)}</Text>
                </View>
                <Text style={styles.quizOptionText}>{opt}</Text>
                {isAnswered && isCorrect && <Ionicons name="checkmark-circle" size={22} color="#FFF" />}
                {isAnswered && isPicked && !isCorrect && <Ionicons name="close-circle" size={22} color="#FFF" />}
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedOption !== null && !isAnswered && (
          <TouchableOpacity style={[styles.submitBtn, styles.quizSubmitBtn]} onPress={handleSubmit} activeOpacity={0.85}
            accessibilityRole="button" accessibilityLabel="Submit answer">
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtnGradient}
            >
              <Text style={styles.submitBtnText}>Submit Answer</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
      {isAnswered && !!item.explanation && (
        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Ionicons
              name={wasCorrect ? 'checkmark-circle' : 'information-circle'}
              size={18}
              color={wasCorrect ? '#10B981' : '#FDE047'}
            />
            <Text style={[styles.explanationTitle, { color: wasCorrect ? '#10B981' : '#FDE047' }]}>
              {wasCorrect ? 'Nailed it!' : 'Here’s the why'}
            </Text>
          </View>
          <Text style={styles.explanationBody}>{item.explanation}</Text>
        </View>
      )}
      <View style={styles.bottomHorizontalBarContainer}>
        <ReelSidebar item={item} layout="horizontal" postId={postId} engagement={engagement} accent={TYPE_LABELS.QUIZ_QUESTION.color} />
      </View>
    </View>
  );
};

// True/False — the fast, one-tap game-feel rep. Unlike the quiz card there's no
// select-then-Submit step: a tap IS the answer (the whole point is instant
// feedback + a quick combo). Backed by a QuizQuestion with the ['TRUE','FALSE']
// sentinel, so the answer feeds the same SM-2 recall loop + mastery.
const TrueFalseCardItem: React.FC<VariantProps> = ({ item, postId, engagement, onInteract, gradient, pageHeight }) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const isAnswered = picked !== null;

  // 0 = True, 1 = False (index into the TF sentinel).
  const choices = [
    { idx: 0, label: t('reels.tf.true', { defaultValue: 'True' }), icon: 'checkmark-circle' as const, tint: '#10B981' },
    { idx: 1, label: t('reels.tf.false', { defaultValue: 'False' }), icon: 'close-circle' as const, tint: '#EF4444' },
  ];

  const handleTap = (idx: number) => {
    if (isAnswered) return;
    setPicked(idx);
    const correct = idx === item.correctAnswer;
    if (onInteract) onInteract({ correct, xpEarned: item.points || 10 });
  };

  const wasCorrect = isAnswered && picked === item.correctAnswer;

  return (
    <View style={[styles.reelContainer, { height: pageHeight }]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.cardCenterContent}>
        <TypePill type="TF_CARD" extra={`+${item.points || 10} XP`} />
        <Text style={styles.tfPrompt}>{t('reels.tf.prompt', { defaultValue: 'True or false?' })}</Text>
        <Text style={styles.bigQuestionText}>{item.claim}</Text>
        <View style={styles.tfRow}>
          {choices.map((c) => {
            const isCorrectChoice = c.idx === item.correctAnswer;
            const isPicked = c.idx === picked;
            let bg: string = 'rgba(255,255,255,0.10)';
            let border: string = 'rgba(255,255,255,0.18)';
            if (isAnswered) {
              if (isCorrectChoice) { bg = 'rgba(16,185,129,0.92)'; border = '#10B981'; }
              else if (isPicked) { bg = 'rgba(239,68,68,0.85)'; border = '#EF4444'; }
            }
            return (
              <TouchableOpacity
                key={c.idx}
                style={[styles.tfBtn, { backgroundColor: bg, borderColor: border }]}
                onPress={() => handleTap(c.idx)}
                activeOpacity={0.85}
                disabled={isAnswered}
                accessibilityRole="button"
                accessibilityState={{ selected: isPicked, disabled: isAnswered }}
                accessibilityLabel={c.label}
              >
                <Ionicons name={c.icon} size={40} color="#FFF" />
                <Text style={styles.tfBtnText}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {isAnswered && !!item.explanation && (
        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Ionicons
              name={wasCorrect ? 'checkmark-circle' : 'information-circle'}
              size={18}
              color={wasCorrect ? '#10B981' : '#FDE047'}
            />
            <Text style={[styles.explanationTitle, { color: wasCorrect ? '#10B981' : '#FDE047' }]}>
              {wasCorrect
                ? t('reels.tf.correct', { defaultValue: 'Correct!' })
                : t('reels.tf.incorrect', { defaultValue: 'Not quite' })}
            </Text>
          </View>
          <Text style={styles.explanationBody}>{item.explanation}</Text>
        </View>
      )}
      <View style={styles.bottomHorizontalBarContainer}>
        <ReelSidebar item={item} layout="horizontal" postId={postId} engagement={engagement} accent={TYPE_LABELS.TF_CARD.color} />
      </View>
    </View>
  );
};

// Cloze (fill-in-the-blank) — adds the generation effect to the mix. The
// sentence shows a gap; tapping a word from the bank fills it (one tap commits,
// like the TF card). Backed by a QuizQuestion whose question holds the blank, so
// it feeds the same SM-2 recall loop + mastery.
const ClozeCardItem: React.FC<VariantProps> = ({ item, postId, engagement, onInteract, gradient, pageHeight }) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const isAnswered = picked !== null;
  const wasCorrect = isAnswered && picked === item.correctAnswer;

  const [before, ...rest] = String(item.sentence ?? '').split(/_{3,}/);
  const after = rest.join(' ');
  const blankWord = isAnswered ? (item.options?.[picked!] ?? '') : '______';

  const handleTap = (idx: number) => {
    if (isAnswered) return;
    setPicked(idx);
    const correct = idx === item.correctAnswer;
    if (onInteract) onInteract({ correct, xpEarned: item.points || 10 });
  };

  return (
    <View style={[styles.reelContainer, { height: pageHeight }]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.cardCenterContent}>
        <TypePill type="CLOZE_CARD" extra={`+${item.points || 10} XP`} />
        <Text style={styles.tfPrompt}>{t('reels.cloze.prompt', { defaultValue: 'Fill in the blank' })}</Text>
        <Text style={styles.bigQuestionText}>
          {before}
          <Text style={[
            styles.clozeBlank,
            isAnswered && { color: wasCorrect ? '#10B981' : '#EF4444' },
          ]}>
            {blankWord}
          </Text>
          {after}
        </Text>
        <View style={styles.clozeOptionsWrap}>
          {(item.options ?? []).map((opt: string, idx: number) => {
            const isCorrect = idx === item.correctAnswer;
            const isPicked = idx === picked;
            let bg: string = 'rgba(255,255,255,0.10)';
            let border: string = 'rgba(255,255,255,0.18)';
            if (isAnswered) {
              if (isCorrect) { bg = 'rgba(16,185,129,0.92)'; border = '#10B981'; }
              else if (isPicked) { bg = 'rgba(239,68,68,0.85)'; border = '#EF4444'; }
            }
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.clozeOptionChip, { backgroundColor: bg, borderColor: border }]}
                onPress={() => handleTap(idx)}
                activeOpacity={0.85}
                disabled={isAnswered}
                accessibilityRole="button"
                accessibilityState={{ selected: isPicked, disabled: isAnswered }}
                accessibilityLabel={opt}
              >
                <Text style={styles.clozeOptionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {isAnswered && !!item.explanation && (
        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Ionicons
              name={wasCorrect ? 'checkmark-circle' : 'information-circle'}
              size={18}
              color={wasCorrect ? '#10B981' : '#FDE047'}
            />
            <Text style={[styles.explanationTitle, { color: wasCorrect ? '#10B981' : '#FDE047' }]}>
              {wasCorrect
                ? t('reels.cloze.correct', { defaultValue: 'Correct!' })
                : t('reels.cloze.incorrect', { defaultValue: 'Not quite' })}
            </Text>
          </View>
          <Text style={styles.explanationBody}>{item.explanation}</Text>
        </View>
      )}
      <View style={styles.bottomHorizontalBarContainer}>
        <ReelSidebar item={item} layout="horizontal" postId={postId} engagement={engagement} accent={TYPE_LABELS.CLOZE_CARD.color} />
      </View>
    </View>
  );
};

// Spaced-repetition recall. ACTIVE-RETRIEVAL FIRST: when the card has answer
// options (the common case — recall cards are seeded from quiz questions), the
// learner must pick an answer *before* anything is revealed — no passive
// flip-to-peek. A wrong pick auto-grades 'again' (forgiven by the combo); a
// correct pick then asks the metacognitive Good/Easy for SM-2. Genuine
// free-recall cards (no options) fall back to the flip + self-grade.
const RecallCardItem: React.FC<VariantProps & { bountyId?: string }> = ({ item, isActive, postId, engagement, onInteract, gradient, pageHeight }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const options: string[] | undefined = item.question?.options;
  const hasOptions = Array.isArray(options) && options.length >= 2;
  const correctIdx: number = item.question?.correctAnswer ?? 0;
  const explanation: string | undefined = item.question?.explanation;
  const strengthPct = Math.round((item.recallStrength ?? 0.4) * 100);
  const xpGood = item.xpReward ?? 5;
  const xpEasy = Math.round(xpGood * 1.4);

  // MCQ path state
  const [selected, setSelected] = useState<number | null>(null);
  // flip path state (free-recall fallback)
  const [isFlipped, setIsFlipped] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  // shared
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setSelected(null);
      setIsFlipped(false);
      setGraded(false);
      flip.setValue(0);
    }
  }, [isActive, flip]);

  const isAnswered = selected !== null;
  const wasCorrect = isAnswered && selected === correctIdx;

  // Active MCQ: pick first, reveal after. Wrong → auto 'again'; correct waits
  // for the Good/Easy metacognitive grade.
  const answer = (idx: number) => {
    if (isAnswered) return;
    setSelected(idx);
    if (idx !== correctIdx) {
      setGraded(true);
      if (onInteract) onInteract({ grade: 'again' });
    }
  };
  const gradeCorrect = (grade: 'good' | 'easy') => {
    setGraded(true);
    if (onInteract) onInteract({ grade });
  };

  // Free-recall flip path
  const toggleFlip = () => {
    if (graded) return;
    const next = !isFlipped;
    setIsFlipped(next);
    if (reduceMotion) { flip.setValue(next ? 1 : 0); return; }
    Animated.spring(flip, { toValue: next ? 1 : 0, tension: 70, friction: 12, useNativeDriver: true }).start();
  };
  const handleGrade = (grade: 'again' | 'good' | 'easy') => {
    setGraded(true);
    if (onInteract) onInteract({ grade });
  };
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.5, 0.5], outputRange: [1, 1, 0] });
  const backOpacity = flip.interpolate({ inputRange: [0.5, 0.5, 1], outputRange: [0, 1, 1] });

  return (
    <View style={[styles.reelContainer, { height: pageHeight }]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.cardCenterContent}>
        <TypePill type="RECALL_CARD" />
        <Text style={styles.recallSubject}>{item.subjectLabel ?? 'Spaced Repetition'}</Text>

        <View style={styles.strengthBar}>
          <View style={[styles.strengthFill, { width: `${strengthPct}%` }]} />
        </View>
        <Text style={styles.strengthLabel}>Memory · {strengthPct}%</Text>

        {hasOptions ? (
          <>
            <Text style={styles.tfPrompt}>{t('reels.recall.prompt', { defaultValue: 'Do you remember?' })}</Text>
            <Text style={styles.bigQuestionText}>{item.question?.question ?? '—'}</Text>
            <View style={{ width: '100%', gap: 12 }}>
              {options!.map((opt: string, idx: number) => {
                const isCorrect = idx === correctIdx;
                const isPicked = idx === selected;
                let bg: string = 'rgba(255,255,255,0.08)';
                let border: string = 'rgba(255,255,255,0.15)';
                if (isAnswered) {
                  if (isCorrect) { bg = 'rgba(16,185,129,0.92)'; border = '#10B981'; }
                  else if (isPicked) { bg = 'rgba(239,68,68,0.85)'; border = '#EF4444'; }
                }
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.quizOptionBtn, { backgroundColor: bg, borderColor: border }]}
                    onPress={() => answer(idx)}
                    activeOpacity={0.85}
                    disabled={isAnswered}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isPicked, disabled: isAnswered }}
                    accessibilityLabel={`${String.fromCharCode(65 + idx)}. ${opt}`}
                  >
                    <View style={styles.optionLetter}>
                      <Text style={styles.optionLetterText}>{String.fromCharCode(65 + idx)}</Text>
                    </View>
                    <Text style={styles.quizOptionText}>{opt}</Text>
                    {isAnswered && isCorrect && <Ionicons name="checkmark-circle" size={22} color="#FFF" />}
                    {isAnswered && isPicked && !isCorrect && <Ionicons name="close-circle" size={22} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {isAnswered && wasCorrect && !graded && (
              <>
                <Text style={styles.recallGradePrompt}>{t('reels.recall.gradePrompt', { defaultValue: 'How well did you know it?' })}</Text>
                <View style={styles.recallActions}>
                  <TouchableOpacity style={[styles.recallBtn, styles.recallBtnGood]} onPress={() => gradeCorrect('good')} activeOpacity={0.85}
                    accessibilityRole="button" accessibilityLabel={`Good, plus ${xpGood} XP`}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.recallBtnText}>{t('reels.recall.good', { defaultValue: 'Good' })}</Text>
                    <Text style={styles.recallBtnXp}>+{xpGood}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.recallBtn, styles.recallBtnEasy]} onPress={() => gradeCorrect('easy')} activeOpacity={0.85}
                    accessibilityRole="button" accessibilityLabel={`Easy, plus ${xpEasy} XP`}>
                    <Ionicons name="flash" size={16} color="#FFF" />
                    <Text style={styles.recallBtnText}>{t('reels.recall.easy', { defaultValue: 'Easy' })}</Text>
                    <Text style={styles.recallBtnXp}>+{xpEasy}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={toggleFlip}
              activeOpacity={0.95}
              style={styles.flashcardOuter}
              accessibilityRole="button"
              accessibilityState={{ expanded: isFlipped }}
              accessibilityLabel={isFlipped ? 'Show question' : 'Reveal answer'}
            >
              <Animated.View style={[styles.flashcardFace, { opacity: frontOpacity, transform: [{ rotateY: frontRotate }] }]}>
                <Ionicons name="help-circle-outline" size={28} color="rgba(255,255,255,0.6)" />
                <Text style={styles.bigQuestionText}>{item.question?.question ?? '—'}</Text>
                <Text style={styles.tapHint}>Tap to reveal answer</Text>
              </Animated.View>
              <Animated.View style={[styles.flashcardFace, styles.flashcardBack, { opacity: backOpacity, transform: [{ rotateY: backRotate }] }]}>
                <Ionicons name="checkmark-done-circle" size={28} color="#10B981" />
                <Text style={styles.flashcardAnswerHeader}>Answer</Text>
                <Text style={styles.flashcardAnswerText}>{item.question?.options?.[correctIdx] ?? '—'}</Text>
              </Animated.View>
            </TouchableOpacity>

            {isFlipped && !graded && (
              <View style={styles.recallActions}>
                <TouchableOpacity style={[styles.recallBtn, styles.recallBtnForgot]} onPress={() => handleGrade('again')} activeOpacity={0.85}
                  accessibilityRole="button" accessibilityLabel="Again, plus 1 XP">
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.recallBtnText}>Again</Text>
                  <Text style={styles.recallBtnXp}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.recallBtn, styles.recallBtnGood]} onPress={() => handleGrade('good')} activeOpacity={0.85}
                  accessibilityRole="button" accessibilityLabel={`Good, plus ${xpGood} XP`}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={styles.recallBtnText}>Good</Text>
                  <Text style={styles.recallBtnXp}>+{xpGood}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.recallBtn, styles.recallBtnEasy]} onPress={() => handleGrade('easy')} activeOpacity={0.85}
                  accessibilityRole="button" accessibilityLabel={`Easy, plus ${xpEasy} XP`}>
                  <Ionicons name="flash" size={16} color="#FFF" />
                  <Text style={styles.recallBtnText}>Easy</Text>
                  <Text style={styles.recallBtnXp}>+{xpEasy}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {graded && (
          <View style={styles.gradedBanner}>
            <Ionicons name="arrow-down-circle" size={18} color="#FDE047" />
            <Text style={styles.gradedText}>Scroll for the next reel</Text>
          </View>
        )}
      </View>
      {/* Absolute-positioned — sits above the sidebar, so it must be a direct
          child of the card root (not nested in cardCenterContent). */}
      {isAnswered && !!explanation && (
        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Ionicons name={wasCorrect ? 'checkmark-circle' : 'information-circle'} size={18} color={wasCorrect ? '#10B981' : '#FDE047'} />
            <Text style={[styles.explanationTitle, { color: wasCorrect ? '#10B981' : '#FDE047' }]}>
              {wasCorrect ? t('reels.recall.correct', { defaultValue: 'Nailed it!' }) : t('reels.recall.incorrect', { defaultValue: 'Review again soon' })}
            </Text>
          </View>
          <Text style={styles.explanationBody}>{explanation}</Text>
        </View>
      )}
      <View style={styles.bottomHorizontalBarContainer}>
        <ReelSidebar item={item} layout="horizontal" postId={postId} engagement={engagement} accent={TYPE_LABELS.RECALL_CARD.color} />
      </View>
    </View>
  );
};

const BountyCardItem: React.FC<VariantProps & { bountyId?: string; subject?: string }> = ({
  item, postId, engagement, gradient, bountyId, subject, pageHeight,
}) => {
  const navigation = useNavigation<any>();
  const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 36e5)) : null;

  const openBounty = () => {
    if (!bountyId) return;
    navigation.navigate('BountyDetail', {
      bountyId,
      bountySubject: subject ?? item.subject ?? 'general',
      bountyXp: item.bountyXp,
    });
  };

  return (
    <View style={[styles.reelContainer, { height: pageHeight }]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.cardCenterContent}>
        <TypePill type="BOUNTY" extra={`${item.bountyXp} XP`} />
        <View style={styles.bountyMetaRow}>
          <Text style={styles.recallSubject}>Asked by @{item.asker?.lastName}</Text>
          {hoursLeft != null && (
            <View style={styles.bountyExpiryChip}>
              <Ionicons name="time-outline" size={12} color="#FDE047" />
              <Text style={styles.bountyExpiryText}>{hoursLeft}h left</Text>
            </View>
          )}
        </View>
        <View style={styles.bountyBox}>
          <Ionicons name="trophy" size={28} color="#FDE047" style={{ marginBottom: 12 }} />
          <Text style={styles.bigQuestionText}>{item.questionText}</Text>
          {!!item.replyCount && (
            <Text style={styles.bountyReplyCount}>{item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'} so far</Text>
          )}
        </View>
        <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={openBounty}>
          <LinearGradient
            colors={['#F59E0B', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitBtnGradient}
          >
            <Ionicons name="trophy" size={16} color="#FFF" />
            <Text style={styles.submitBtnText}>Answer & claim bounty</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomHorizontalBarContainer}>
        <ReelSidebar item={item} layout="horizontal" postId={postId} engagement={engagement} accent={TYPE_LABELS.BOUNTY.color} />
      </View>
    </View>
  );
};

// Inline, votable poll for POLL reels — so a poll isn't a dead-end caption.
// One tap votes; results (percentage bars + your pick) reveal after voting.
const ReelPoll: React.FC<{
  postId?: string;
  options: { id: string; text: string; votesCount: number }[];
  votedOptionId?: string | null;
  accent: string;
}> = ({ postId, options, votedOptionId, accent }) => {
  const [voted, setVoted] = useState<string | null>(votedOptionId ?? null);
  const [counts, setCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(options.map((o) => [o.id, o.votesCount ?? 0])),
  );
  const hasVoted = voted !== null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const vote = async (optionId: string) => {
    if (hasVoted || !postId) return;
    setVoted(optionId);
    setCounts((c) => ({ ...c, [optionId]: (c[optionId] ?? 0) + 1 }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await feedApi.post(`/posts/${postId}/vote`, { optionId });
      track('reel_poll_vote', { postId });
    } catch {
      // best-effort: leave the optimistic state; a refetch will reconcile
    }
  };

  return (
    <View style={styles.reelPoll}>
      {options.map((o) => {
        const c = counts[o.id] ?? 0;
        const pct = total > 0 ? Math.round((c / total) * 100) : 0;
        const isMine = voted === o.id;
        return (
          <TouchableOpacity
            key={o.id}
            style={styles.reelPollOption}
            onPress={() => vote(o.id)}
            disabled={hasVoted}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: isMine, disabled: hasVoted }}
            accessibilityLabel={hasVoted ? `${o.text}, ${pct}%` : o.text}
          >
            {hasVoted && (
              <View style={[styles.reelPollFill, { width: `${pct}%`, backgroundColor: isMine ? accent : 'rgba(255,255,255,0.16)' }]} />
            )}
            <View style={styles.reelPollRow}>
              <Text style={styles.reelPollText} numberOfLines={1}>{o.text}</Text>
              {hasVoted && <Text style={styles.reelPollPct}>{pct}%</Text>}
              {isMine && <Ionicons name="checkmark-circle" size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>
        );
      })}
      {hasVoted && (
        <Text style={styles.reelPollTotal}>{total} {total === 1 ? 'vote' : 'votes'}</Text>
      )}
    </View>
  );
};

const PostReelItem: React.FC<VariantProps & { shouldMountVideo: boolean }> = ({
  item, isActive, postId, engagement, gradient, shouldMountVideo, muted, pageHeight,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const isPoll = item.postType === 'POLL' && Array.isArray(item.pollOptions) && item.pollOptions.length > 0;
  const isQuestion = item.postType === 'QUESTION';
  const [tapPaused, setTapPaused] = useState(false);
  const player = useVideoPlayer(item.isVideo && shouldMountVideo ? item.coverUrl : null, (p) => {
    p.loop = true;
    p.muted = !!muted;
  });

  // Pre-buffer only when this post actually has a video. Text-only posts
  // gate `item.isVideo === false` so the hook becomes a no-op.
  useReelVideoPreload(player, !!item.isVideo && shouldMountVideo, isActive, !!muted);

  useEffect(() => {
    if (item.isVideo && shouldMountVideo) player.muted = !!muted;
  }, [muted, item.isVideo, player, shouldMountVideo]);

  useEffect(() => {
    if (!item.isVideo || !shouldMountVideo) return;
    if (isActive && !tapPaused) player.play();
    else player.pause();
  }, [isActive, item.isVideo, player, shouldMountVideo, tapPaused]);

  return (
    <View style={[styles.reelContainer, { height: pageHeight }]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      {item.isVideo && shouldMountVideo && item.coverUrl && (
        <VideoView player={player} style={[styles.fullScreenAbsolute, { height: pageHeight }]} contentFit="cover" nativeControls={false} pointerEvents="none" />
      )}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Only video posts get the tap-to-pause layer — text-only posts skip it
          so the user can simply scroll without consuming taps. */}
      {item.isVideo && (
        <TouchableOpacity
          style={styles.tapLayer}
          activeOpacity={1}
          onPress={() => setTapPaused((p) => !p)}
        />
      )}
      {tapPaused && item.isVideo && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <Ionicons name="play" size={64} color="rgba(255,255,255,0.85)" />
        </View>
      )}

      <ReelSidebar item={item} postId={postId} engagement={engagement} accent={TYPE_LABELS.POST.color} />

      <View style={styles.bottomDetails}>
        <TypePill type="POST" extra={item.postType} />
        <Text style={styles.reelTitle} numberOfLines={isPoll ? 3 : 4}>{item.content}</Text>

        {isPoll ? (
          <ReelPoll
            postId={postId}
            options={item.pollOptions}
            votedOptionId={item.userVotedOptionId}
            accent={TYPE_LABELS.POST.color}
          />
        ) : postId ? (
          <TouchableOpacity
            style={styles.reelAnswerCta}
            onPress={() => navigation.navigate('Comments', { postId })}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isQuestion
              ? t('reels.post.answer', { defaultValue: 'Answer this' })
              : t('reels.post.discuss', { defaultValue: 'Join the discussion' })}
          >
            <Ionicons name={isQuestion ? 'chatbubble-ellipses' : 'arrow-forward-circle'} size={16} color="#FFF" />
            <Text style={styles.reelAnswerCtaText}>
              {isQuestion
                ? t('reels.post.answer', { defaultValue: 'Answer this' })
                : t('reels.post.discuss', { defaultValue: 'Join the discussion' })}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.creatorName}>@{item.author?.lastName} {item.author?.firstName}</Text>
      </View>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  reelContainer: { width, height, position: 'relative', justifyContent: 'center', overflow: 'hidden' },
  fullScreenAbsolute: { position: 'absolute', width, height },

  // Header / combo
  globalHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, left: 12, zIndex: 100, flexDirection: 'row', gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  muteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  pauseOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  // Sits at z-index 1 — below the sidebar (5) / details (5) / bottom action bar (10) / overlays.
  tapLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },

  comboBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    right: 12,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  comboBarInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comboSegments: { flexDirection: 'row', gap: 3 },
  comboSegment: { width: 14, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)' },
  comboLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  comboLabel: { color: '#FDE047', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  comboLabelMuted: { color: 'rgba(253,224,71,0.55)', fontSize: 11, fontWeight: '700' },
  dueRecallChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(59,130,246,0.18)',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, marginLeft: 4,
  },
  dueRecallText: { color: '#93C5FD', fontSize: 11, fontWeight: '800' },

  // Combo fill burst
  comboFillCelebration: { position: 'absolute', top: height / 2 - 80, left: 0, right: 0, alignItems: 'center', zIndex: 200 },
  comboFillPill: { paddingHorizontal: 28, paddingVertical: 18, borderRadius: 28, alignItems: 'center', gap: 4 },
  comboFillTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.2 },
  comboFillSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },

  // End-of-session celebration
  sessionOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 300,
  },
  sessionCard: {
    width: '100%',
    backgroundColor: '#16161D',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sessionIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  sessionTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.3, textAlign: 'center' },
  sessionSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  sessionStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 22, marginBottom: 6, width: '100%',
  },
  sessionStat: { flex: 1, alignItems: 'center', gap: 4 },
  sessionStatValue: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  sessionStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  sessionStatDivider: { width: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.12)' },
  sessionTomorrow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(253,224,71,0.12)',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
    marginTop: 18,
  },
  sessionTomorrowText: { color: '#FDE047', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  sessionBtn: { borderRadius: 24, overflow: 'hidden', marginTop: 22, width: '100%' },
  sessionBtnGradient: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  sessionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },

  // XP burst
  xpBurst: {
    position: 'absolute',
    top: height / 2 + 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(16,185,129,0.95)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    zIndex: 150,
  },
  xpBurstText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.6 },

  // Bottom details
  bottomDetails: { position: 'absolute', bottom: 56, left: 16, right: 86, zIndex: 5, elevation: 5, gap: 8 },
  creatorName: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  reelTitle: { color: '#FFF', fontSize: 19, fontWeight: '800', lineHeight: 25 },

  // Inline poll
  reelPoll: { width: '100%', gap: 8, marginTop: 4, marginBottom: 2 },
  reelPollOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    minHeight: 42,
    justifyContent: 'center',
  },
  reelPollFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  reelPollRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  reelPollText: { color: '#FFF', fontSize: 15, fontWeight: '700', flex: 1 },
  reelPollPct: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  reelPollTotal: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Answer / discuss CTA (question + other post types)
  reelAnswerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },
  reelAnswerCtaText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  reelSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500', lineHeight: 20 },

  // Type pills
  typePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  typePillText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

  // Question overlay
  questionOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', zIndex: 20 },
  blurCard: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28 },
  questionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(253,224,71,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 14,
  },
  questionPillText: { color: '#FDE047', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  questionText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 18, lineHeight: 25 },

  optionsList: { gap: 10, marginBottom: 20 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  optionSelected: { backgroundColor: 'rgba(168,85,247,0.25)', borderColor: '#A855F7' },
  optionCorrect: { backgroundColor: 'rgba(16,185,129,0.92)', borderColor: '#10B981' },
  optionIncorrect: { backgroundColor: 'rgba(239,68,68,0.92)', borderColor: '#EF4444' },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  optionText: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },

  // Submit
  submitBtn: { borderRadius: 24, overflow: 'hidden' },
  quizSubmitBtn: { width: '100%', marginTop: 4 },
  submitBtnGradient: { padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },

  // Centered card layout
  cardCenterContent: { padding: 24, alignItems: 'center', gap: 14, width: '100%' },
  bigQuestionText: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 30 },

  // True/False
  tfPrompt: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  tfRow: { flexDirection: 'row', gap: 14, width: '100%', marginTop: 8 },
  tfBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  tfBtnText: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },

  // Cloze (fill-in-the-blank)
  clozeBlank: { color: '#FDE047', fontWeight: '900', textDecorationLine: 'underline' },
  clozeOptionsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 12 },
  clozeOptionChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  clozeOptionText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  // Quiz
  quizOptionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  quizOptionText: { color: '#FFF', fontSize: 16, fontWeight: '700', flex: 1 },

  // Recall
  recallSubject: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  strengthBar: { width: '70%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 4 },
  strengthFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
  strengthLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  flashcardOuter: {
    width: '100%',
    minHeight: 280,
    marginTop: 18,
    perspective: 1000 as any,
  },
  flashcardFace: {
    position: 'absolute',
    width: '100%',
    minHeight: 280,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backfaceVisibility: 'hidden',
  },
  flashcardBack: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.4)' },
  tapHint: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  flashcardAnswerHeader: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  flashcardAnswerText: { color: '#10B981', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  recallGradePrompt: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  recallActions: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  recallBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16 },
  recallBtnForgot: { backgroundColor: 'rgba(239,68,68,0.85)' },
  recallBtnGood: { backgroundColor: 'rgba(59,130,246,0.85)' },
  recallBtnEasy: { backgroundColor: 'rgba(16,185,129,0.85)' },
  recallBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  recallBtnXp: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  gradedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  gradedText: { color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontSize: 13 },

  // Bounty
  bountyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bountyExpiryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(253,224,71,0.15)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  bountyExpiryText: { color: '#FDE047', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  bountyReplyCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginTop: 10 },
  bountyBox: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 22,
    borderRadius: 22,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.25)',
  },

  // Quiz explanation
  explanationCard: {
    position: 'absolute',
    left: 16, right: 16, bottom: 110,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 6,
  },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  explanationTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  explanationBody: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '500', lineHeight: 19 },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 8 },
  emptyBody: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyRetryBtn: { borderRadius: 24, overflow: 'hidden', marginTop: 12 },

  // Sidebar — elevation set so Android respects the z-index above the tap layer.
  rightSidebar: { position: 'absolute', right: 12, bottom: 130, alignItems: 'center', gap: 22, zIndex: 5, elevation: 5 },
  avatarWrap: { position: 'relative', borderWidth: 2, borderRadius: 32, padding: 2 },
  sidebarIconBtn: { alignItems: 'center', justifyContent: 'center' },
  // Reaction picker — floats over the dark reel; large backdrop dismisses on tap-away.
  reactionPickerBackdrop: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 30 },
  reactionPicker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,24,0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 16,
    zIndex: 40,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  // Vertical layout: heart sits at the right edge → open the bar to its left, above.
  reactionPickerVertical: { bottom: 44, right: 0 },
  // Horizontal layout: action bar at the bottom → open the bar above the heart.
  reactionPickerHorizontal: { bottom: 40, left: -10 },
  reactionPickerOption: { paddingHorizontal: 2, paddingVertical: 2 },
  sidebarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  reelReactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  reelReactionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  // Horizontal action bar (for quiz/recall/bounty cards)
  bottomHorizontalBarContainer: { position: 'absolute', bottom: 32, left: 0, right: 0, paddingHorizontal: 20, zIndex: 10, elevation: 10 },
  horizontalActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  horizontalAuthorWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  horizontalAuthorName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  horizontalIconsWrap: { flexDirection: 'row', gap: 22, alignItems: 'center' },
  horizontalIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Skeleton
  skeletonContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 120, alignItems: 'center' },
  skeletonBadge: { width: 110, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.18)' },
  skeletonTitle: { width: '90%', height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 10 },
  skeletonTitleShort: { width: '60%', height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' },
  skeletonOption: { width: '100%', height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 12 },
  skeletonHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
});
