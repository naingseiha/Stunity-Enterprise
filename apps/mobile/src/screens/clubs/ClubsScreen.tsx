/**
 * ClubsScreen — Optimized for performance
 *
 * Perf changes (mirrors FeedScreen patterns):
 * - FlatList → FlashList (cell recycling, 120fps capable)
 * - estimatedItemSize for immediate layout
 * - drawDistance pre-renders off-screen cells
 * - getItemType bucketed recycling by club type
 * - ClubCard extracted as React.memo — stable between renders
 * - All callbacks wrapped in useCallback with correct deps
 * - renderHeader wrapped in useCallback
 * - removeClippedSubviews on Android only
 * - Skeleton loading on initial load instead of full-page spinner
 * - Incremental paginated loading with FlashList onEndReached
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { clubsApi } from '@/api';
import type { Club } from '@/api/clubs';
import { useNavigationContext } from '@/contexts';
import StunityLogo from '../../../assets/Stunity.svg';
import { Skeleton } from '@/components/common/Loading';

type ClubFilter = 'all' | 'joined' | 'discover';

const CLUB_TYPE_META: Record<
  Club['type'],
  { label: string; icon: keyof typeof Ionicons.glyphMap; accent: string; soft: string }
> = {
  CASUAL_STUDY_GROUP: { label: 'Study Group', icon: 'people',  accent: '#8B5CF6', soft: '#F3E8FF' }, // Purple
  STRUCTURED_CLASS:   { label: 'Class',       icon: 'school',  accent: '#06A8CC', soft: '#E0F9FD' }, // Brand Teal
  PROJECT_GROUP:      { label: 'Project',     icon: 'rocket',  accent: '#F59E0B', soft: '#FEF3C7' }, // Amber
  EXAM_PREP:          { label: 'Exam Prep',   icon: 'book',    accent: '#6366F1', soft: '#E0E7FF' }, // Indigo
};

const COLORS = {
  background:    '#F8FBFF',
  surface:       '#FFFFFF',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  primary:       '#09CFF7', // Bright Cyan
  primaryDark:   '#06A8CC', // Deep Cyan
  primaryLight:  '#E0F9FD', // Light Cyan
  border:        '#E2E8F0',
};

const CLUBS_PAGE_SIZE = 20;

// ─── Header Skeleton ─────────────────────────────────────────────────────────
const ClubsHeaderSkeleton = React.memo(function ClubsHeaderSkeleton() {
  return (
    <View>
      {/* Shortcuts row: 4 circles */}
      <View style={skeletonStyles.shortcutsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={skeletonStyles.shortcutItem}>
            <Skeleton width={68} height={68} borderRadius={34} />
            <Skeleton width={52} height={12} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Banner placeholder */}
      <View style={skeletonStyles.bannerWrap}>
        <Skeleton width="100%" height={120} borderRadius={24} />
        <View style={skeletonStyles.paginationRow}>
          <Skeleton width={16} height={6} borderRadius={3} />
          <Skeleton width={6} height={6} borderRadius={3} style={{ marginLeft: 6 }} />
          <Skeleton width={6} height={6} borderRadius={3} style={{ marginLeft: 6 }} />
        </View>
      </View>

      {/* Section title + View all */}
      <View style={skeletonStyles.sectionHeaderRow}>
        <Skeleton width={140} height={20} borderRadius={10} />
        <Skeleton width={60} height={16} borderRadius={8} />
      </View>

      {/* Search bar */}
      <Skeleton width="100%" height={52} borderRadius={16} style={skeletonStyles.searchSkeleton} />
    </View>
  );
});

const ClubCardSkeleton = React.memo(function ClubCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.icon} />
        <View style={skeletonStyles.titleLine} />
        <View style={skeletonStyles.viewBtn} />
      </View>
      <View style={skeletonStyles.line1} />
      <View style={skeletonStyles.line2} />
      <View style={skeletonStyles.footer}>
        <View style={skeletonStyles.avatars} />
        <View style={skeletonStyles.pill} />
      </View>
      <View style={skeletonStyles.progressBar} />
    </View>
  );
});

const skeletonStyles = StyleSheet.create({
  // Header skeleton
  shortcutsRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  shortcutItem:    { alignItems: 'center' },
  bannerWrap:      { paddingHorizontal: 12, paddingBottom: 24, alignItems: 'center' },
  paginationRow:   { flexDirection: 'row', marginTop: 16 },
  sectionHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 16 },
  searchSkeleton:  { marginHorizontal: 16, marginBottom: 16 },
  // Card skeleton
  card:        { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginHorizontal: 12, marginBottom: 16, overflow: 'hidden' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  icon:        { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9' },
  titleLine:   { flex: 1, height: 14, borderRadius: 7, backgroundColor: '#F1F5F9' },
  viewBtn:     { width: 44, height: 14, borderRadius: 7, backgroundColor: '#F1F5F9' },
  line1:       { marginHorizontal: 12, marginTop: 14, height: 12, borderRadius: 6, backgroundColor: '#F1F5F9' },
  line2:       { marginHorizontal: 12, marginTop: 8, marginBottom: 16, height: 12, borderRadius: 6, backgroundColor: '#F1F5F9', width: '60%' },
  footer:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 16 },
  avatars:     { width: 80, height: 26, borderRadius: 13, backgroundColor: '#F1F5F9' },
  pill:        { width: 88, height: 34, borderRadius: 20, backgroundColor: '#F1F5F9' },
  progressBar: { height: 8, backgroundColor: '#F1F5F9', marginHorizontal: 12, marginBottom: 20, borderRadius: 4 },
});

// ─── Club Card (memoized) ─────────────────────────────────────────────────────
interface ClubCardProps {
  item: Club;
  isJoined: boolean;
  isBusy: boolean;
  onPress: (clubId: string) => void;
  onToggleMembership: (clubId: string) => void;
}

const ClubCard = React.memo(function ClubCard({
  item,
  isJoined,
  isBusy,
  onPress,
  onToggleMembership,
}: ClubCardProps) {
  const typeMeta = CLUB_TYPE_META[item.type] || CLUB_TYPE_META.CASUAL_STUDY_GROUP;
  const memberCount = item.memberCount || 0;
  const avatarColors = ['#0D9488', '#4B7BEC', '#F59E0B', '#F43F5E'];
  const visibleAvatars = avatarColors.slice(0, Math.min(4, memberCount > 0 ? memberCount : 4));

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.96, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  return (
    <AnimatedPressable
      style={[styles.clubCard, animatedStyle]}
      onPress={() => onPress(item.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <LinearGradient
        colors={[`${typeMeta.accent}15`, `${typeMeta.accent}00`]}
        style={styles.abstractShape}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Card Header: icon chip + title + view button */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardHeaderIcon, { backgroundColor: typeMeta.soft }]}>
          <Ionicons name={typeMeta.icon} size={18} color={typeMeta.accent} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => onPress(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.viewAllText}>View</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description || `${typeMeta.label} · Join to explore topics and connect with peers.`}
      </Text>

      {/* Member avatars row + member count */}
      <View style={styles.cardMembersRow}>
        <View style={styles.avatarStack}>
          {visibleAvatars.map((c, i) => (
            <View
              key={i}
              style={[styles.avatarCircle, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }]}
            >
              <Ionicons name="person" size={10} color="#FFF" />
            </View>
          ))}
          <Text style={styles.memberCountText}>
            {memberCount > 0 ? `+${memberCount}` : 'Be first!'}
          </Text>
        </View>

        {/* Join / Joined */}
        <TouchableOpacity
          onPress={() => onToggleMembership(item.id)}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          {isJoined ? (
            <View style={[styles.joinPill, styles.joinPillJoined]}>
              {isBusy ? (
                <ActivityIndicator size="small" color={COLORS.primaryDark} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryDark} />
                  <Text style={styles.joinPillTextJoined}>Joined</Text>
                </>
              )}
            </View>
          ) : (
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinPill}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.joinPillText}>Join Now →</Text>
              )}
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.cardProgressTrack}>
        <View
          style={[
            styles.cardProgressFill,
            { width: `${Math.min(100, Math.max(5, memberCount * 2))}%`, backgroundColor: typeMeta.accent },
          ]}
        />
      </View>
    </AnimatedPressable>
  );
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BannerCarousel = React.memo(({ navigation }: any) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const banners = [
    { id: '1', title: 'Check your ranking', subtitle: 'and climb the charts!', eyebrow: 'WEEKLY LEADERBOARD', icon: 'star-shooting', colors: ['#09CFF7', '#06A8CC'], route: 'Leaderboard' },
    { id: '2', title: 'Join Study Groups', subtitle: 'Connect with peers now', eyebrow: 'NEW CLUBS', icon: 'account-group', colors: ['#10B981', '#059669'], route: 'All' },
    { id: '3', title: 'Ace your Exams', subtitle: 'Explore exam prep clubs', eyebrow: 'EXAM PREP', icon: 'school', colors: ['#A78BFA', '#8B5CF6'], route: 'Discover' },
  ];

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if(index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.bannerContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToAlignment="center"
      >
        {banners.map((b) => (
          <AnimatedPressable 
             key={b.id} 
             onPress={() => {
               if(b.route === 'Leaderboard') navigation.navigate('Leaderboard');
             }} 
             style={{ width: SCREEN_WIDTH, paddingHorizontal: 12 }}
          >
            <LinearGradient
              colors={b.colors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerDecorCircle1} />
              <View style={styles.bannerDecorCircle2} />
              <View style={styles.bannerDecorCircle3} />
              <View style={styles.bannerLeft}>
                <View style={styles.bannerIconWrapper}>
                  <MaterialCommunityIcons name={b.icon as any} size={42} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.bannerRight}>
                <Text style={styles.bannerEyebrow}>{b.eyebrow}</Text>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              </View>
              <View style={styles.bannerAction}>
                <Ionicons name="arrow-forward" size={18} color={b.colors[1]} />
              </View>
            </LinearGradient>
          </AnimatedPressable>
        ))}
      </ScrollView>
      <View style={styles.paginationRow}>
        {banners.map((_, i) => (
          <View key={i} style={[styles.dot, activeIndex === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
});

const ShortcutItem = React.memo(({ s, isActive, onPress }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.92, { damping: 12 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12 }); };

  return (
    <AnimatedPressable
      style={[styles.shortcutItem, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={[styles.shortcutOuter, isActive && styles.shortcutOuterActive]}>
        <View style={[styles.shortcutInner, { backgroundColor: s.bgInner }]}>
          <Ionicons name={s.icon as any} size={28} color={s.color} />
        </View>
      </View>
      <Text style={[styles.shortcutLabel, isActive && styles.shortcutLabelActive]}>{s.label}</Text>
    </AnimatedPressable>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ClubsScreen() {
  const navigation = useNavigation<any>();
  const { openSidebar } = useNavigationContext();

  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter]     = useState<ClubFilter>('all');
  const [searchQuery, setSearchQuery]           = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [clubs, setClubs]                       = useState<Club[]>([]);
  const [joinedClubIds, setJoinedClubIds]       = useState<string[]>([]);
  const [busyClubId, setBusyClubId]             = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore]       = useState(false);
  const [hasMoreClubs, setHasMoreClubs]         = useState(true);
  const [page, setPage]                         = useState(1);

  const pageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  const hasMoreClubsRef = useRef(true);
  const selectedFilterRef = useRef<ClubFilter>(selectedFilter);
  const debouncedQueryRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    hasMoreClubsRef.current = hasMoreClubs;
  }, [hasMoreClubs]);

  useEffect(() => {
    selectedFilterRef.current = selectedFilter;
  }, [selectedFilter]);

  useEffect(() => {
    debouncedQueryRef.current = debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  const joinedClubSet     = useMemo(() => new Set(joinedClubIds), [joinedClubIds]);
  const normalizedQuery   = searchQuery.trim().toLowerCase();

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadClubs = useCallback(async (options?: { silent?: boolean; reset?: boolean; page?: number; filter?: ClubFilter; query?: string }) => {
    const silent = options?.silent ?? false;
    const reset = options?.reset ?? true;
    const targetPage = options?.page ?? 1;
    const targetFilter = options?.filter ?? selectedFilterRef.current;
    const targetQuery = options?.query ?? debouncedQueryRef.current;

    if (!silent) setLoading(true);
    if (!reset) {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    }

    try {
      setError(null);
      const params: { page: number; limit: number; myClubs?: boolean; discover?: boolean; search?: string } = {
        page: targetPage,
        limit: CLUBS_PAGE_SIZE,
      };

      if (targetFilter === 'joined') params.myClubs = true;
      if (targetFilter === 'discover') params.discover = true;
      if (targetQuery.length > 0) params.search = targetQuery;

      const { clubs: pageClubs, pagination } = await clubsApi.getClubsPaginated(params);
      const joinedIdsFromPage = pageClubs.filter((club) => club.isJoined).map((club) => club.id);
      setJoinedClubIds((prev) => {
        const uniqueJoinedIds = new Set(reset ? joinedIdsFromPage : [...prev, ...joinedIdsFromPage]);
        return Array.from(uniqueJoinedIds);
      });
      setClubs((prev) => {
        if (reset) return pageClubs;
        const merged = new Map(prev.map((club) => [club.id, club]));
        pageClubs.forEach((club) => merged.set(club.id, club));
        return Array.from(merged.values());
      });
      setPage(pagination.page);
      pageRef.current = pagination.page;
      setHasMoreClubs(Boolean(pagination.hasMore));
      hasMoreClubsRef.current = Boolean(pagination.hasMore);
    } catch (err: any) {
      setError(err?.message || 'Unable to load clubs');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMoreClubs(true);
    loadClubs({ reset: true, page: 1, filter: selectedFilter, query: debouncedSearchQuery });
  }, [loadClubs, selectedFilter, debouncedSearchQuery]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMoreClubs(true);
    setRefreshing(true);
    loadClubs({ silent: true, reset: true, page: 1, filter: selectedFilterRef.current, query: debouncedQueryRef.current });
  }, [loadClubs]);

  const loadMoreClubs = useCallback(() => {
    if (
      loading ||
      refreshing ||
      isLoadingMoreRef.current ||
      !hasMoreClubsRef.current
    ) {
      return;
    }
    const nextPage = pageRef.current + 1;
    loadClubs({
      silent: true,
      reset: false,
      page: nextPage,
      filter: selectedFilterRef.current,
      query: debouncedQueryRef.current,
    });
  }, [loadClubs, loading, refreshing]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggleMembership = useCallback(
    async (clubId: string) => {
      const targetClub = clubs.find((club) => club.id === clubId);
      const isJoined = Boolean(targetClub?.isJoined || joinedClubSet.has(clubId));
      try {
        setBusyClubId(clubId);
        if (isJoined) {
          await clubsApi.leaveClub(clubId);
        } else {
          await clubsApi.joinClub(clubId);
        }
        await loadClubs({
          silent: true,
          reset: true,
          page: 1,
          filter: selectedFilterRef.current,
          query: debouncedQueryRef.current,
        });
      } catch (err: any) {
        Alert.alert('Clubs', err?.message || 'Failed to update membership');
      } finally {
        setBusyClubId(null);
      }
    },
    [clubs, joinedClubSet, loadClubs]
  );

  const handleClubPress = useCallback(
    (clubId: string) => navigation.navigate('ClubDetails', { clubId }),
    [navigation]
  );

  const handleCreateClub = useCallback(
    () => navigation.navigate('CreateClub'),
    [navigation]
  );

  const handleFilterChange = useCallback(
    (filter: ClubFilter) => setSelectedFilter(filter),
    []
  );

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredClubs = useMemo(() => {
    let data = clubs;
    if (selectedFilter === 'joined')   data = data.filter((c) => c.isJoined || joinedClubSet.has(c.id));
    if (selectedFilter === 'discover') data = data.filter((c) => !c.isJoined && !joinedClubSet.has(c.id));
    if (normalizedQuery) {
      data = data.filter((c) => {
        const tags = (c.tags || []).join(' ').toLowerCase();
        return (
          c.name.toLowerCase().includes(normalizedQuery) ||
          c.description.toLowerCase().includes(normalizedQuery) ||
          tags.includes(normalizedQuery)
        );
      });
    }
    return data;
  }, [clubs, joinedClubSet, selectedFilter, normalizedQuery]);

  // ── Header ────────────────────────────────────────────────────────────────
  const renderHeader = useCallback(() => {
    const shortcuts = [
      { id: 'all',      label: 'All clubs', icon: 'sparkles',    color: COLORS.primary,     bgInner: COLORS.primaryLight },
      { id: 'joined',   label: 'My clubs',  icon: 'heart',       color: '#FB7185',          bgInner: '#FFF1F2' },
      { id: 'discover', label: 'Discover',  icon: 'compass',     color: '#F59E0B',          bgInner: '#FEF3C7' },
      { id: 'create',   label: 'Create',    icon: 'add-circle',  color: COLORS.primaryDark, bgInner: COLORS.primaryLight },
    ];

    return (
      <View style={styles.listHeader}>
        {/* Shortcuts */}
        <View style={styles.shortcutsRow}>
          {shortcuts.map((s) => {
            const isActive = selectedFilter === s.id;
            return (
              <ShortcutItem
                key={s.id}
                s={s}
                isActive={isActive}
                onPress={() => s.id === 'create' ? handleCreateClub() : handleFilterChange(s.id as ClubFilter)}
              />
            );
          })}
        </View>

        {/* Banner Carousel */}
        <BannerCarousel navigation={navigation} />

        {/* Section heading + search */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Clubs</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleFilterChange('all')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search lessons & clubs..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [selectedFilter, searchQuery, handleFilterChange, handleCreateClub]);

  // ── Render item (memoized card) ───────────────────────────────────────────
  const renderClubCard = useCallback(
    ({ item }: { item: Club }) => (
      <ClubCard
        item={item}
        isJoined={Boolean(item.isJoined || joinedClubSet.has(item.id))}
        isBusy={busyClubId === item.id}
        onPress={handleClubPress}
        onToggleMembership={handleToggleMembership}
      />
    ),
    [joinedClubSet, busyClubId, handleClubPress, handleToggleMembership]
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={48} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>
          {selectedFilter === 'joined' && !searchQuery ? 'No clubs joined yet' : 'No clubs found'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? 'Try another keyword.' : 'Explore more clubs to join.'}
        </Text>
      </View>
    ),
    [selectedFilter, searchQuery]
  );

  const renderFooter = useCallback(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={COLORS.primaryDark} />
          <Text style={styles.footerLoadingText}>Loading more clubs...</Text>
        </View>
      ) : null,
    [isLoadingMore]
  );

  // ── getItemType — bucket by club type for recycling ───────────────────────
  const getItemType = useCallback(
    (item: Club) => item.type ?? 'CASUAL_STUDY_GROUP',
    []
  );

  const keyExtractor = useCallback((item: Club) => item.id, []);

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={openSidebar} style={styles.iconButton}>
              <Ionicons name="menu-outline" size={24} color="#374151" />
            </TouchableOpacity>
            <StunityLogo width={108} height={30} />
            <View style={styles.topBarActions}>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="add-circle-outline" size={22} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="refresh-outline" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.safeArea}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ClubsHeaderSkeleton />
            {[1, 2, 3].map((i) => <ClubCardSkeleton key={i} />)}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconButton}>
            <Ionicons name="menu-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <StunityLogo width={108} height={30} />
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={handleCreateClub} style={styles.iconButton}>
              <Ionicons name="add-circle-outline" size={22} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
              <Ionicons name="refresh-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      <View style={styles.safeArea}>
        {/* @ts-ignore FlashList types omit some valid props */}
        <FlashList
          data={filteredClubs}
          keyExtractor={keyExtractor}
          renderItem={renderClubCard}
          estimatedItemSize={180}
          drawDistance={600}
          getItemType={getItemType}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreClubs}
          onEndReachedThreshold={0.4}
          // iOS: removeClippedSubviews causes native layer hide/show jank — Android only
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  listHeader: {
    paddingBottom: 16,
  },

  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  shortcutItem: {
    alignItems: 'center',
    gap: 8,
  },
  shortcutOuter: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  shortcutOuterActive: {
    borderColor: COLORS.primaryDark,
  },
  shortcutInner: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  shortcutLabelActive: {
    color: COLORS.primaryDark,
  },

  // Banner
  bannerContainer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  bannerGradient: {
    width: '100%',
    height: 120,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerDecorCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -50,
    right: -30,
  },
  bannerDecorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -30,
    left: 40,
  },
  bannerDecorCircle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: 20,
    left: -20,
  },
  bannerLeft: {
    marginRight: 12,
    zIndex: 1,
  },
  bannerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerRight: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E0F9FD',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  bannerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 16,
    backgroundColor: COLORS.primary,
  },

  // Section & Search
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // Cards
  abstractShape: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  clubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  cardDescription: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  joinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  joinPillJoined: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  joinPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  joinPillTextJoined: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  cardProgressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
    marginBottom: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
