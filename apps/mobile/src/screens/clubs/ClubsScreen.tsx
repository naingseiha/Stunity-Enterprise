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
} from 'react-native';
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
  primary:       '#09CFF7', // Stunity Brand Teal
  primaryDark:   '#06A8CC',
  primaryLight:  '#E0F9FD',
  border:        '#E2E8F0',
};

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

  return (
    <TouchableOpacity
      style={styles.clubCard}
      activeOpacity={0.92}
      onPress={() => onPress(item.id)}
    >
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
    </TouchableOpacity>
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
  const [clubs, setClubs]                       = useState<Club[]>([]);
  const [joinedClubIds, setJoinedClubIds]       = useState<string[]>([]);
  const [busyClubId, setBusyClubId]             = useState<string | null>(null);

  // Ref for stable busyClubId inside renderItem without dep churn
  const busyClubIdRef = useRef(busyClubId);
  busyClubIdRef.current = busyClubId;

  const joinedClubSet     = useMemo(() => new Set(joinedClubIds), [joinedClubIds]);
  const normalizedQuery   = searchQuery.trim().toLowerCase();

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadClubs = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);

    try {
      setError(null);
      const [allClubs, myClubs] = await Promise.all([
        clubsApi.getClubs(),
        clubsApi.getClubs({ myClubs: true }),
      ]);
      setClubs(allClubs);
      setJoinedClubIds(myClubs.map((club) => club.id));
    } catch (err: any) {
      setError(err?.message || 'Unable to load clubs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadClubs({ silent: true });
  }, [loadClubs]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggleMembership = useCallback(
    async (clubId: string) => {
      const isJoined = joinedClubSet.has(clubId);
      try {
        setBusyClubId(clubId);
        if (isJoined) {
          await clubsApi.leaveClub(clubId);
        } else {
          await clubsApi.joinClub(clubId);
        }
        await loadClubs({ silent: true });
      } catch (err: any) {
        Alert.alert('Clubs', err?.message || 'Failed to update membership');
      } finally {
        setBusyClubId(null);
      }
    },
    [joinedClubSet, loadClubs]
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
    if (selectedFilter === 'joined')   data = data.filter((c) => joinedClubSet.has(c.id));
    if (selectedFilter === 'discover') data = data.filter((c) => !joinedClubSet.has(c.id));
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
              <TouchableOpacity
                key={s.id}
                style={styles.shortcutItem}
                activeOpacity={0.8}
                onPress={() => s.id === 'create' ? handleCreateClub() : handleFilterChange(s.id as ClubFilter)}
              >
                <View style={[styles.shortcutOuter, isActive && styles.shortcutOuterActive]}>
                  <View style={[styles.shortcutInner, { backgroundColor: s.bgInner }]}>
                    <Ionicons name={s.icon as any} size={28} color={s.color} />
                  </View>
                </View>
                <Text style={[styles.shortcutLabel, isActive && styles.shortcutLabelActive]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#09CFF7', '#06A8CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerDecorCircle1} />
            <View style={styles.bannerDecorCircle2} />
            <View style={styles.bannerDecorCircle3} />
            <View style={styles.bannerLeft}>
              <View style={styles.bannerIconWrapper}>
                <MaterialCommunityIcons name="star-shooting" size={42} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.bannerRight}>
              <Text style={styles.bannerEyebrow}>WEEKLY LEADERBOARD</Text>
              <Text style={styles.bannerTitle}>Check your ranking</Text>
              <Text style={styles.bannerSubtitle}>and climb the charts!</Text>
            </View>
            <TouchableOpacity style={styles.bannerAction} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-forward" size={18} color="#06A8CC" />
            </TouchableOpacity>
          </LinearGradient>
          <View style={styles.paginationRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

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
  }, [selectedFilter, searchQuery, openSidebar, handleFilterChange, handleCreateClub, loadClubs]);

  // ── Render item (memoized card) ───────────────────────────────────────────
  const renderClubCard = useCallback(
    ({ item }: { item: Club }) => (
      <ClubCard
        item={item}
        isJoined={joinedClubSet.has(item.id)}
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    borderRadius: 34,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  shortcutOuterActive: {
    borderColor: COLORS.primaryDark,
  },
  shortcutInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    paddingHorizontal: 12,
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
    shadowColor: '#06A8CC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
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
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
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
  clubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
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
});
