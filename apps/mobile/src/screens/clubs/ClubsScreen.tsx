import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import StunityLogo from '../../../assets/Stunity.svg';
import { clubsApi } from '@/api';
import type { Club } from '@/api/clubs';
import { useNavigationContext } from '@/contexts';

type ClubFilter = 'all' | 'joined' | 'discover';

const PRIMARY_FILTERS: Array<{
  id: ClubFilter;
  label: string;
}> = [
  { id: 'all', label: 'All Clubs' },
  { id: 'joined', label: 'My Clubs' },
  { id: 'discover', label: 'Discover' },
];

const PRIMARY_FILTER_ICONS: Record<ClubFilter, keyof typeof Ionicons.glyphMap> = {
  all: 'sparkles-outline',
  joined: 'heart-outline',
  discover: 'compass-outline',
};

const CLUB_TYPE_META: Record<
  Club['type'],
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    soft: string;
    cardGradient: [string, string];
  }
> = {
  CASUAL_STUDY_GROUP: {
    label: 'Study Group',
    icon: 'people-outline',
    accent: '#0B8B8A',
    soft: '#E3F6F4',
    cardGradient: ['#23B8B3', '#0E9D97'],
  },
  STRUCTURED_CLASS: {
    label: 'Class',
    icon: 'school-outline',
    accent: '#117A74',
    soft: '#E2F7F3',
    cardGradient: ['#31BFAF', '#169D90'],
  },
  PROJECT_GROUP: {
    label: 'Project',
    icon: 'rocket-outline',
    accent: '#B28513',
    soft: '#FFF4D7',
    cardGradient: ['#DEB43A', '#C49420'],
  },
  EXAM_PREP: {
    label: 'Exam Prep',
    icon: 'book-outline',
    accent: '#0F847F',
    soft: '#E5F9F6',
    cardGradient: ['#1BA59D', '#B98E1A'],
  },
};

const MODE_META: Record<
  Club['mode'],
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PUBLIC: { label: 'Public', icon: 'globe-outline' },
  INVITE_ONLY: { label: 'Invite', icon: 'lock-closed-outline' },
  APPROVAL_REQUIRED: { label: 'Approval', icon: 'checkmark-circle-outline' },
};

const COLORS = {
  background: '#F2F6F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FCFB',
  border: '#D7ECE9',
  borderStrong: '#BBDDD8',
  textPrimary: '#1E2F36',
  textSecondary: '#32505A',
  textMuted: '#55727C',
  textSubtle: '#7C99A3',
  primary: '#0EA5A4',
  primaryStrong: '#0B8B8A',
  primarySoft: '#E3F6F4',
  primarySoftBorder: '#9FD7D1',
  primaryTint: '#EAFBFA',
  primaryTintBorder: '#C2ECE7',
  secondary: '#E2B233',
  secondaryStrong: '#BF931F',
  secondarySoft: '#FFF6DB',
  cardBorder: '#8EC4BE',
  cardBorderJoined: '#0B8B8A',
} as const;

export default function ClubsScreen() {
  const navigation = useNavigation<any>();
  const { openSidebar } = useNavigationContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ClubFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [busyClubId, setBusyClubId] = useState<string | null>(null);

  const joinedClubSet = useMemo(() => new Set(joinedClubIds), [joinedClubIds]);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const loadClubs = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }

    try {
      setError(null);
      const [allClubs, myClubs] = await Promise.all([
        clubsApi.getClubs(),
        clubsApi.getClubs({ myClubs: true }),
      ]);
      setClubs(allClubs);
      setJoinedClubIds(myClubs.map(club => club.id));
    } catch (err: any) {
      console.error('Failed to load clubs:', err);
      setError(err?.message || 'Unable to load clubs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadClubs({ silent: true });
  }, [loadClubs]);

  const handleToggleMembership = useCallback(async (clubId: string) => {
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
  }, [joinedClubSet, loadClubs]);

  const filteredClubs = useMemo(() => {
    let data = clubs;

    if (selectedFilter === 'joined') {
      data = data.filter(club => joinedClubSet.has(club.id));
    } else if (selectedFilter === 'discover') {
      data = data.filter(club => !joinedClubSet.has(club.id));
    }

    if (normalizedQuery) {
      data = data.filter((club) => {
        const tags = (club.tags || []).join(' ').toLowerCase();
        return (
          club.name.toLowerCase().includes(normalizedQuery) ||
          club.description.toLowerCase().includes(normalizedQuery) ||
          tags.includes(normalizedQuery)
        );
      });
    }

    return data;
  }, [clubs, joinedClubSet, selectedFilter, normalizedQuery]);

  const cyclePrimaryFilter = useCallback(() => {
    setSelectedFilter((prev) => {
      if (prev === 'all') return 'joined';
      if (prev === 'joined') return 'discover';
      return 'all';
    });
  }, []);

  const renderPrimaryFilterBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.primaryFilterRow}
    >
      {PRIMARY_FILTERS.map((filter) => {
        const isActive = selectedFilter === filter.id;
        const icon = PRIMARY_FILTER_ICONS[filter.id];

        return (
          <TouchableOpacity
            key={filter.id}
            onPress={() => setSelectedFilter(filter.id)}
            activeOpacity={0.88}
            style={styles.primaryChipWrapper}
          >
            {isActive ? (
              <LinearGradient
                colors={['#0EA5A4', '#B98E1A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.primaryChip, styles.primaryChipActive]}
              >
                <Ionicons name={icon} size={14} color="#FFFFFF" />
                <Text style={[styles.primaryChipText, styles.primaryChipTextActive]}>{filter.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.primaryChip}>
                <Ionicons name={icon} size={14} color={COLORS.textMuted} />
                <Text style={styles.primaryChipText}>{filter.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={22} color={COLORS.textSubtle} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={COLORS.textSubtle}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSubtle} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={cyclePrimaryFilter}
          onLongPress={openSidebar}
          activeOpacity={0.88}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {renderPrimaryFilterBar()}

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        <Text style={styles.sectionActionText}>See all</Text>
      </View>

      <View style={styles.resultCountRow}>
        <Ionicons name="sparkles-outline" size={14} color={COLORS.secondaryStrong} />
        <Text style={styles.resultCount}>
          Curated communities for your learning goals
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sparkles-outline" size={38} color={COLORS.textSubtle} />
      <Text style={styles.emptyTitle}>
        {selectedFilter === 'joined' && !searchQuery ? 'No clubs joined yet' : 'No clubs found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try another keyword.'
          : selectedFilter === 'joined'
            ? 'Join clubs to build your personalized list.'
            : 'Try a different filter.'}
      </Text>
      {selectedFilter === 'joined' && !searchQuery && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={() => setSelectedFilter('discover')}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyActionButtonText}>Discover clubs</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderClubCard = ({ item }: { item: Club }) => {
    const typeMeta = CLUB_TYPE_META[item.type] || CLUB_TYPE_META.CASUAL_STUDY_GROUP;
    const modeMeta = MODE_META[item.mode] || MODE_META.PUBLIC;
    const isJoined = joinedClubSet.has(item.id);

    return (
      <View style={[styles.clubCard, isJoined && styles.clubCardJoined]}>
        <LinearGradient
          colors={typeMeta.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.clubCardGradient}
        >
          <View style={styles.cardDecorCirclePrimary} />
          <View style={styles.cardDecorCircleSecondary} />

          <TouchableOpacity
            style={styles.clubBodyPressable}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ClubDetails', { clubId: item.id })}
          >
            <View style={styles.clubBody}>
              <View style={styles.offerTopRow}>
                <Text style={styles.offerEyebrow}>{typeMeta.label}</Text>
                {isJoined && (
                  <View style={styles.memberStatusBadge}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={COLORS.primaryStrong} />
                    <Text style={styles.memberStatusText}>Joined</Text>
                  </View>
                )}
              </View>

              <Text style={styles.clubName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.offerSubline} numberOfLines={1}>
                {modeMeta.label} • {item.memberCount || 0} members
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.offerPrimaryButton}
              onPress={() => navigation.navigate('ClubDetails', { clubId: item.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.offerPrimaryButtonText}>Get Offer Now</Text>
              <View style={styles.offerPrimaryIconWrap}>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primaryStrong} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.offerJoinButton,
                isJoined && styles.offerJoinButtonActive,
                busyClubId === item.id && styles.offerJoinButtonBusy,
              ]}
              onPress={() => handleToggleMembership(item.id)}
              activeOpacity={0.85}
              disabled={busyClubId === item.id}
            >
              {busyClubId === item.id ? (
                <ActivityIndicator size="small" color={isJoined ? COLORS.primaryStrong : '#FFFFFF'} />
              ) : (
                <Ionicons
                  name={isJoined ? 'checkmark' : 'add'}
                  size={18}
                  color={isJoined ? COLORS.primaryStrong : '#FFFFFF'}
                />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <View style={styles.loadingTopBar}>
          <View style={styles.loadingIconSkeleton} />
          <View style={styles.loadingLogoSkeleton} />
          <View style={styles.loadingActionsRow}>
            <View style={styles.loadingIconSkeleton} />
            <View style={styles.loadingIconSkeleton} />
          </View>
        </View>

        <View style={styles.loadingBody}>
          <View style={styles.loadingSearchSkeleton} />

          <View style={styles.loadingChipRow}>
            <View style={[styles.loadingChipSkeleton, styles.loadingChipWide]} />
            <View style={[styles.loadingChipSkeleton, styles.loadingChipMedium]} />
            <View style={[styles.loadingChipSkeleton, styles.loadingChipNarrow]} />
          </View>

          <View style={styles.loadingCardSkeleton} />
          <View style={styles.loadingCardSkeleton} />
        </View>

        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading clubs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconButton}>
            <Ionicons name="menu-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <StunityLogo width={108} height={30} />
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={() => loadClubs()} style={styles.iconButton}>
              <Ionicons name="refresh-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('CreateClub')} style={styles.iconButton}>
              <Ionicons name="add-circle-outline" size={22} color={COLORS.primaryStrong} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadClubs()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconButton}>
            <Ionicons name="menu-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <StunityLogo width={108} height={30} />
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={() => loadClubs()} style={styles.iconButton}>
              <Ionicons name="refresh-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('CreateClub')} style={styles.iconButton}>
              <Ionicons name="add-circle-outline" size={22} color={COLORS.primaryStrong} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredClubs}
        keyExtractor={(item) => item.id}
        renderItem={renderClubCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateClub')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#19B0A9', '#0D8E89', '#B98D1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSafe: {
    backgroundColor: COLORS.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 96,
  },
  primaryFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  primaryChipWrapper: {
    borderRadius: 999,
  },
  primaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryChipActive: {
    borderColor: 'transparent',
  },
  primaryChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  primaryChipTextActive: {
    color: '#FFFFFF',
  },
  listHeader: {
    paddingTop: 6,
    paddingBottom: 14,
    gap: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 54,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.secondaryStrong,
  },
  resultCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  clubCard: {
    borderRadius: 16,
    borderWidth: 1.25,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  clubCardJoined: {
    borderWidth: 1.5,
    borderColor: COLORS.cardBorderJoined,
  },
  clubCardGradient: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
  },
  cardDecorCirclePrimary: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.34)',
    top: -62,
    right: -50,
  },
  cardDecorCircleSecondary: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.28)',
    bottom: 34,
    right: -24,
  },
  clubBodyPressable: {
    overflow: 'hidden',
  },
  clubBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    zIndex: 1,
  },
  offerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  offerEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cardMetaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  offerTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 11,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
  },
  offerTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardRightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  memberStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryStrong,
  },
  cardModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  cardModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  clubName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 27,
  },
  offerSubline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  creatorFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  creatorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    zIndex: 1,
  },
  offerPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  offerPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  offerPrimaryIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondarySoft,
  },
  offerJoinButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  offerJoinButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  offerJoinButtonBusy: {
    opacity: 0.78,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyActionButton: {
    marginTop: 8,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  emptyActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingTopBar: {
    height: 58,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingIconSkeleton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E5F0EF',
  },
  loadingLogoSkeleton: {
    width: 108,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#E5F0EF',
  },
  loadingBody: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 12,
  },
  loadingSearchSkeleton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E5F0EF',
  },
  loadingChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingChipSkeleton: {
    height: 38,
    borderRadius: 999,
    backgroundColor: '#E5F0EF',
  },
  loadingChipWide: {
    width: 112,
  },
  loadingChipMedium: {
    width: 94,
  },
  loadingChipNarrow: {
    width: 88,
  },
  loadingCardSkeleton: {
    height: 196,
    borderRadius: 18,
    backgroundColor: '#E5F0EF',
  },
  loadingFooter: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    color: '#EF4444',
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    borderRadius: 30,
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
