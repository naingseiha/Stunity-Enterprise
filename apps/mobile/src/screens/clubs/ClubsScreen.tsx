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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { clubsApi } from '@/api';
import type { Club } from '@/api/clubs';
import { useNavigationContext } from '@/contexts';

type ClubFilter = 'all' | 'joined' | 'discover';

const CLUB_TYPE_META: Record<
  Club['type'],
  { label: string; icon: keyof typeof Ionicons.glyphMap; accent: string; soft: string; cardBg: string }
> = {
  CASUAL_STUDY_GROUP: { label: 'Study Group', icon: 'people', accent: '#4B7BEC', soft: '#EBF0FF', cardBg: '#E8EEFB' },
  STRUCTURED_CLASS:   { label: 'Class',       icon: 'school',  accent: '#0D9488', soft: '#CCFBF1', cardBg: '#D9F4F0' },
  PROJECT_GROUP:      { label: 'Project',     icon: 'rocket',  accent: '#F59E0B', soft: '#FEF3C7', cardBg: '#FDF2DB' },
  EXAM_PREP:          { label: 'Exam Prep',   icon: 'book',    accent: '#0D9488', soft: '#CCFBF1', cardBg: '#D9F4F0' },
};

const COLORS = {
  background: '#F6F8FB',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#0D9488', // Brand Teal
  primaryDark: '#0F766E',
  primaryLight: '#CCFBF1',
  border: '#E2E8F0',
};

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

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadClubs({ silent: true });
  }, [loadClubs]);

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

  const filteredClubs = useMemo(() => {
    let data = clubs;
    if (selectedFilter === 'joined') {
      data = data.filter((club) => joinedClubSet.has(club.id));
    } else if (selectedFilter === 'discover') {
      data = data.filter((club) => !joinedClubSet.has(club.id));
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

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <View style={styles.greetingContainer}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={24} color={COLORS.surface} />
        </View>
        <View>
          <Text style={styles.greetingRole}>Hey student,</Text>
          <Text style={styles.greetingName}>Welcome back</Text>
        </View>
      </View>
      <View style={styles.topActions}>
        <TouchableOpacity style={styles.actionButtonLight} onPress={() => loadClubs()} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonDark} onPress={openSidebar} activeOpacity={0.8}>
          <Ionicons name="menu" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderShortcuts = () => {
    const shortcuts = [
      { id: 'all', label: 'All clubs', icon: 'sparkles', color: '#FF7A95', bgOuter: '#FFF', bgInner: '#FFE5EC' },
      { id: 'joined', label: 'My clubs', icon: 'heart', color: '#4DA2FF', bgOuter: '#FFF', bgInner: '#E0F0FF' },
      { id: 'discover', label: 'Discover', icon: 'compass', color: '#FFB84D', bgOuter: '#FFF', bgInner: '#FFF0E0' },
      { id: 'create', label: 'Create', icon: 'add-circle', color: '#4CAF50', bgOuter: '#FFF', bgInner: '#E5F9DF' },
    ];

    return (
      <View style={styles.shortcutsRow}>
        {shortcuts.map((s) => {
          const isActive = selectedFilter === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={styles.shortcutItem}
              activeOpacity={0.8}
              onPress={() => s.id === 'create' ? navigation.navigate('CreateClub') : setSelectedFilter(s.id as ClubFilter)}
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
    );
  };

  const renderBanner = () => (
    <View style={styles.bannerContainer}>
      <LinearGradient
        colors={['#14B8A6', '#0F766E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerDecorCircle1} />
        <View style={styles.bannerDecorCircle2} />
        
        <View style={styles.bannerLeft}>
          <MaterialCommunityIcons name="star-shooting" size={48} color="#FFD700" style={styles.bannerIcon} />
        </View>
        <View style={styles.bannerRight}>
          <Text style={styles.bannerEyebrow}>WEEKLY LEADERBOARD</Text>
          <Text style={styles.bannerText}>Check your ranking</Text>
          <Text style={styles.bannerText}>and climb the charts!</Text>
        </View>
        
        <TouchableOpacity style={styles.bannerAction} activeOpacity={0.8}>
           <Ionicons name="chevron-forward" size={20} color={COLORS.primaryDark} />
        </TouchableOpacity>
      </LinearGradient>
      <View style={styles.paginationRow}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {renderTopBar()}
      {renderShortcuts()}
      {renderBanner()}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Clubs</Text>
        <TouchableOpacity activeOpacity={0.8}>
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search" size={48} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>
        {selectedFilter === 'joined' && !searchQuery ? 'No clubs joined yet' : 'No clubs found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try another keyword.' : 'Explore more clubs to join.'}
      </Text>
    </View>
  );

  const renderClubCard = ({ item }: { item: Club }) => {
    const typeMeta = CLUB_TYPE_META[item.type] || CLUB_TYPE_META.CASUAL_STUDY_GROUP;
    const isJoined = joinedClubSet.has(item.id);
    const memberCount = item.memberCount || 0;
    const avatarColors = ['#0D9488', '#4B7BEC', '#F59E0B', '#F43F5E'];
    const visibleAvatars = avatarColors.slice(0, Math.min(4, memberCount > 0 ? memberCount : 4));

    return (
      <TouchableOpacity
        style={styles.clubCard}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('ClubDetails', { clubId: item.id })}
      >
        {/* Card Header: icon chip + title + view button */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardHeaderIcon, { backgroundColor: typeMeta.soft }]}>
            <Ionicons name={typeMeta.icon} size={18} color={typeMeta.accent} />
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => navigation.navigate('ClubDetails', { clubId: item.id })}
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

          {/* Join / Joined status */}
          <TouchableOpacity
            style={[styles.joinPill, isJoined && styles.joinPillJoined]}
            onPress={() => handleToggleMembership(item.id)}
            disabled={busyClubId === item.id}
            activeOpacity={0.85}
          >
            {busyClubId === item.id ? (
              <ActivityIndicator size="small" color={isJoined ? COLORS.primaryDark : '#FFF'} />
            ) : isJoined ? (
              <>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryDark} />
                <Text style={styles.joinPillTextJoined}>Joined</Text>
              </>
            ) : (
              <Text style={styles.joinPillText}>Join Now →</Text>
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
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
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
      </SafeAreaView>
    </View>
  );
}

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
  
  // Header Greeting
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingRole: {
    fontSize: 14,
    color: Object.assign(Object.create(String.prototype), COLORS).textSecondary || '#475569',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonLight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  actionButtonDark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 24,
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
    height: 110,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bannerDecorCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -40,
    right: -20,
  },
  bannerDecorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    bottom: -20,
    left: 40,
  },
  bannerLeft: {
    marginRight: 16,
    zIndex: 1,
  },
  bannerIcon: {
    opacity: 0.95,
  },
  bannerRight: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CCFBF1',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  bannerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    marginHorizontal: 12,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  // Cards — Performance card style (white, flat border)
  clubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },

  // Card header row
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Card body
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
  },

  // Member row + actions
  cardMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 8,
  },
  joinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  joinPillJoined: {
    backgroundColor: COLORS.primaryLight,
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
    fontWeight: '700',
    color: COLORS.primaryDark,
  },

  // Progress bar
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
