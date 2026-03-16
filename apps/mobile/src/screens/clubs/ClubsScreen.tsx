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
import { Avatar } from '@/components/common';
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

const CLUB_TYPE_META: Record<
  Club['type'],
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    soft: string;
    gradient: [string, string];
  }
> = {
  CASUAL_STUDY_GROUP: {
    label: 'Study Group',
    icon: 'people-outline',
    accent: '#2563EB',
    soft: '#DBEAFE',
    gradient: ['#EEF4FF', '#DBEAFE'],
  },
  STRUCTURED_CLASS: {
    label: 'Class',
    icon: 'school-outline',
    accent: '#059669',
    soft: '#D1FAE5',
    gradient: ['#ECFDF5', '#D1FAE5'],
  },
  PROJECT_GROUP: {
    label: 'Project',
    icon: 'rocket-outline',
    accent: '#EA580C',
    soft: '#FFEDD5',
    gradient: ['#FFF7ED', '#FFEDD5'],
  },
  EXAM_PREP: {
    label: 'Exam Prep',
    icon: 'book-outline',
    accent: '#7C3AED',
    soft: '#EDE9FE',
    gradient: ['#F5F3FF', '#EDE9FE'],
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

export default function ClubsScreen() {
  const navigation = useNavigation<any>();
  const { openSidebar } = useNavigationContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ClubFilter>('all');
  const [selectedType, setSelectedType] = useState<'all' | Club['type']>('all');
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

    if (selectedType !== 'all') {
      data = data.filter(club => club.type === selectedType);
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
  }, [clubs, joinedClubSet, selectedFilter, selectedType, normalizedQuery]);

  const discoverCount = Math.max(clubs.length - joinedClubIds.length, 0);

  const renderPrimaryFilterBar = () => (
    <View style={styles.primaryFilterBar}>
      <View style={styles.primaryTabsRow}>
        {PRIMARY_FILTERS.map((filter) => {
          const isActive = selectedFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={styles.primaryTab}
              onPress={() => setSelectedFilter(filter.id)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.primaryTabText,
                  isActive && styles.primaryTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
              <View style={[styles.primaryTabIndicator, isActive && styles.primaryTabIndicatorActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search clubs, topics, tags..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.introBlock}>
        <Text style={styles.introTitle}>Find your learning community</Text>
        <Text style={styles.introSubtitle}>Join clubs, collaborate with classmates, and grow together.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <TouchableOpacity
          style={[styles.typeChip, selectedType === 'all' && styles.typeChipActive]}
          onPress={() => setSelectedType('all')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={selectedType === 'all' ? '#0284C7' : '#64748B'}
          />
          <Text style={[styles.typeChipText, selectedType === 'all' && styles.typeChipTextActive]}>
            All Types
          </Text>
        </TouchableOpacity>

        {Object.entries(CLUB_TYPE_META).map(([type, meta]) => {
          const isActive = selectedType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                isActive && {
                  backgroundColor: meta.soft,
                  borderColor: meta.accent,
                },
              ]}
              onPress={() => setSelectedType(isActive ? 'all' : (type as Club['type']))}
              activeOpacity={0.85}
            >
              <Ionicons
                name={meta.icon}
                size={14}
                color={isActive ? meta.accent : '#64748B'}
              />
              <Text
                style={[
                  styles.typeChipText,
                  isActive && { color: meta.accent },
                ]}
              >
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Text style={styles.summaryValue}>{clubs.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FDF2F8', borderColor: '#FBCFE8' }]}>
          <Text style={styles.summaryValue}>{joinedClubIds.length}</Text>
          <Text style={styles.summaryLabel}>Joined</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
          <Text style={styles.summaryValue}>{discoverCount}</Text>
          <Text style={styles.summaryLabel}>Discover</Text>
        </View>
      </View>

      <Text style={styles.resultCount}>
        {filteredClubs.length} {filteredClubs.length === 1 ? 'club' : 'clubs'}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sparkles-outline" size={38} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No clubs found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try a different keyword.'
          : selectedFilter === 'joined'
            ? 'Join some clubs to see them here.'
            : 'Try a different filter.'}
      </Text>
    </View>
  );

  const renderClubCard = ({ item }: { item: Club }) => {
    const typeMeta = CLUB_TYPE_META[item.type] || CLUB_TYPE_META.CASUAL_STUDY_GROUP;
    const modeMeta = MODE_META[item.mode] || MODE_META.PUBLIC;
    const isJoined = joinedClubSet.has(item.id);

    return (
      <View style={styles.clubCard}>
        <TouchableOpacity
          style={styles.clubBodyPressable}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ClubDetails', { clubId: item.id })}
        >
          <LinearGradient
            colors={typeMeta.gradient}
            style={styles.clubHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.heroTypeBadge, { backgroundColor: 'rgba(255,255,255,0.8)' }]}>
                <Ionicons name={typeMeta.icon} size={13} color={typeMeta.accent} />
                <Text style={[styles.heroTypeText, { color: typeMeta.accent }]}>{typeMeta.label}</Text>
              </View>
              <View style={styles.heroModeBadge}>
                <Ionicons name={modeMeta.icon} size={12} color="#475569" />
                <Text style={styles.heroModeText}>{modeMeta.label}</Text>
              </View>
            </View>

            <Text style={styles.clubName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.clubDescription} numberOfLines={2}>{item.description}</Text>
          </LinearGradient>

          <View style={styles.clubBody}>
            {!!item.tags?.length && (
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: typeMeta.soft }]}>
                    <Text style={[styles.tagText, { color: typeMeta.accent }]}>#{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 3 && (
                  <Text style={styles.moreTagText}>+{item.tags.length - 3}</Text>
                )}
              </View>
            )}

            <View style={styles.metaRow}>
              <View style={styles.creatorRow}>
                {item.creator ? (
                  <Avatar
                    uri={item.creator.profilePictureUrl}
                    name={`${item.creator.firstName} ${item.creator.lastName}`}
                    size="xs"
                    variant="post"
                  />
                ) : (
                  <View style={styles.creatorFallback}>
                    <Ionicons name="person-outline" size={12} color="#64748B" />
                  </View>
                )}
                <Text style={styles.creatorName} numberOfLines={1}>
                  {item.creator ? `${item.creator.firstName} ${item.creator.lastName}` : 'Club Team'}
                </Text>
              </View>
              <View style={[styles.memberPill, { backgroundColor: typeMeta.soft }]}>
                <Ionicons name="people-outline" size={13} color={typeMeta.accent} />
                <Text style={[styles.memberCount, { color: typeMeta.accent }]}>{item.memberCount || 0}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => navigation.navigate('ClubDetails', { clubId: item.id })}
            activeOpacity={0.85}
          >
            <Ionicons name="eye-outline" size={14} color="#475569" />
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.joinButton,
              isJoined
                ? styles.joinedButton
                : { backgroundColor: typeMeta.accent, borderColor: typeMeta.accent },
            ]}
            onPress={() => handleToggleMembership(item.id)}
            activeOpacity={0.85}
            disabled={busyClubId === item.id}
          >
            {busyClubId === item.id ? (
              <ActivityIndicator size="small" color={isJoined ? typeMeta.accent : '#fff'} />
            ) : (
              <>
                <Ionicons
                  name={isJoined ? 'checkmark-circle-outline' : 'add-circle-outline'}
                  size={16}
                  color={isJoined ? typeMeta.accent : '#fff'}
                />
                <Text
                  style={[
                    styles.joinButtonText,
                    isJoined && { color: typeMeta.accent },
                  ]}
                >
                  {isJoined ? 'Joined' : 'Join'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Loading clubs...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconButton}>
            <Ionicons name="menu-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <StunityLogo width={108} height={30} />
          <View style={{ width: 38 }} />
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
            <Ionicons name="menu-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <StunityLogo width={108} height={30} />
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={() => loadClubs()} style={styles.iconButton}>
              <Ionicons name="refresh-outline" size={22} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('CreateClub')} style={styles.iconButton}>
              <Ionicons name="add-circle-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {renderPrimaryFilterBar()}

      <FlatList
        data={filteredClubs}
        keyExtractor={(item) => item.id}
        renderItem={renderClubCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateClub')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#38BDF8', '#0EA5E9', '#0284C7']}
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
    backgroundColor: '#F8FAFC',
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  primaryFilterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  primaryTabsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  primaryTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  primaryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  primaryTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  primaryTabIndicator: {
    marginTop: 7,
    height: 2,
    width: '58%',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  primaryTabIndicatorActive: {
    backgroundColor: '#BFDBFE',
  },
  listHeader: {
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  introBlock: {
    gap: 4,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  introSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  typeChipTextActive: {
    color: '#0284C7',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  clubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  clubBodyPressable: {
    overflow: 'hidden',
  },
  clubHero: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.2)',
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
  },
  heroTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 999,
  },
  heroModeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  clubName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 32,
    marginTop: 2,
  },
  clubDescription: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  clubBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreTagText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    backgroundColor: '#E2E8F0',
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  detailsButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  joinButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  joinedButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
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
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
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
    backgroundColor: '#0284C7',
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
    shadowColor: '#0284C7',
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
