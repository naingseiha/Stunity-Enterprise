import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import StunityLogo from '../../../assets/Stunity.svg';
import { Avatar } from '@/components/common';
import { clubsApi } from '@/api';
import type { Club, ClubMember } from '@/api/clubs';
import { useAuthStore } from '@/stores';

const { width } = Dimensions.get('window');

const CLUB_TYPE_CONFIG: Record<
  Club['type'],
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    gradient: [string, string];
    accent: string;
    soft: string;
  }
> = {
  CASUAL_STUDY_GROUP: {
    label: 'Study Group',
    icon: 'people-outline',
    gradient: ['#23B8B3', '#0E9D97'],
    accent: '#0B8B8A',
    soft: '#E3F6F4',
  },
  STRUCTURED_CLASS: {
    label: 'Class',
    icon: 'school-outline',
    gradient: ['#31BFAF', '#169D90'],
    accent: '#117A74',
    soft: '#E2F7F3',
  },
  PROJECT_GROUP: {
    label: 'Project',
    icon: 'rocket-outline',
    gradient: ['#DEB43A', '#C49420'],
    accent: '#B28513',
    soft: '#FFF4D7',
  },
  EXAM_PREP: {
    label: 'Exam Prep',
    icon: 'book-outline',
    gradient: ['#1BA59D', '#B98E1A'],
    accent: '#0F847F',
    soft: '#E5F9F6',
  },
};

const MODE_META: Record<
  Club['mode'],
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PUBLIC: { label: 'Public', icon: 'globe-outline' },
  INVITE_ONLY: { label: 'Invite Only', icon: 'lock-closed-outline' },
  APPROVAL_REQUIRED: { label: 'Approval', icon: 'checkmark-circle-outline' },
};

const COLORS = {
  background: '#F2F6F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FCFB',
  border: '#D7ECE9',
  textPrimary: '#1E2F36',
  textSecondary: '#32505A',
  textMuted: '#55727C',
  textSubtle: '#7C99A3',
  primary: '#0EA5A4',
  primaryStrong: '#0B8B8A',
  primarySoft: '#E3F6F4',
  secondary: '#E2B233',
  secondaryStrong: '#BF931F',
  secondarySoft: '#FFF6DB',
} as const;

const getRoleLabel = (role: string): string => {
  if (role === 'OWNER') return 'Owner';
  if (role === 'INSTRUCTOR') return 'Instructor';
  if (role === 'TEACHING_ASSISTANT' || role === 'ASSISTANT') return 'Assistant';
  if (role === 'STUDENT') return 'Student';
  if (role === 'OBSERVER') return 'Observer';
  return 'Member';
};

export default function ClubDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { clubId } = route.params as { clubId: string };
  const { user } = useAuthStore();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const activeMembers = useMemo(
    () => (members || []).filter((member) => member.isActive),
    [members],
  );
  const isJoined = activeMembers.some((member) => member.userId === user?.id);

  const fetchClubDetails = useCallback(async () => {
    try {
      setError(null);
      const [clubData, membersData] = await Promise.all([
        clubsApi.getClubById(clubId),
        clubsApi.getClubMembers(clubId),
      ]);

      setClub(clubData);
      setMembers(membersData || []);
    } catch (err: any) {
      console.error('Failed to fetch club details:', err);
      setError(err?.message || 'Failed to load club details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubDetails();
  }, [fetchClubDetails]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClubDetails();
  }, [fetchClubDetails]);

  const handleJoin = useCallback(async () => {
    if (!club) return;

    try {
      setJoiningLoading(true);
      await clubsApi.joinClub(clubId);
      await fetchClubDetails();
      Alert.alert('Success', `You've joined ${club.name}!`);
    } catch (err: any) {
      console.error('Failed to join club:', err);
      Alert.alert('Error', err?.message || 'Failed to join club');
    } finally {
      setJoiningLoading(false);
    }
  }, [club, clubId, fetchClubDetails]);

  const handleLeave = useCallback(async () => {
    if (!club) return;

    try {
      setJoiningLoading(true);
      await clubsApi.leaveClub(clubId);
      await fetchClubDetails();
    } catch (err: any) {
      console.error('Failed to leave club:', err);
      Alert.alert('Error', err?.message || 'Failed to leave club');
    } finally {
      setJoiningLoading(false);
    }
  }, [club, clubId, fetchClubDetails]);

  const handleToggleMembership = useCallback(() => {
    if (!club) return;

    if (isJoined) {
      Alert.alert(
        'Leave Club',
        `Are you sure you want to leave ${club.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              handleLeave();
            },
          },
        ],
      );
      return;
    }

    handleJoin();
  }, [club, isJoined, handleJoin, handleLeave]);

  const typeConfig = club
    ? CLUB_TYPE_CONFIG[club.type] || CLUB_TYPE_CONFIG.CASUAL_STUDY_GROUP
    : CLUB_TYPE_CONFIG.CASUAL_STUDY_GROUP;
  const modeMeta = club
    ? MODE_META[club.mode] || MODE_META.PUBLIC
    : MODE_META.PUBLIC;
  const visibleMemberCount = club?.memberCount || activeMembers.length;

  const renderTopBar = () => (
    <SafeAreaView edges={['top']} style={styles.headerSafe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <StunityLogo width={108} height={30} />

        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={fetchClubDetails} style={styles.iconButton}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderState = () => {
    if (loading) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.detailsLoadingContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailsHeroSkeleton} />

          <View style={styles.detailsStatsRowSkeleton}>
            <View style={styles.detailsStatSkeleton} />
            <View style={styles.detailsStatSkeleton} />
            <View style={styles.detailsStatSkeleton} />
          </View>

          <View style={styles.detailsSectionSkeleton} />
          <View style={[styles.detailsSectionSkeleton, styles.detailsSectionSkeletonLarge]} />

          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading club details...</Text>
          </View>
        </ScrollView>
      );
    }

    if (error || !club) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={42} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Club not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchClubDetails} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <LinearGradient
          colors={typeConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroDecorPrimary} />
          <View style={styles.heroDecorSecondary} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroTypeBadge}>
              <Ionicons name={typeConfig.icon} size={14} color="#FFFFFF" />
              <Text style={styles.heroTypeText}>{typeConfig.label}</Text>
            </View>

            <View style={styles.heroModeBadge}>
              <Ionicons name={modeMeta.icon} size={12} color={COLORS.textSecondary} />
              <Text style={styles.heroModeText}>{modeMeta.label}</Text>
            </View>
          </View>

          <Text style={styles.clubTitle} numberOfLines={2}>{club.name}</Text>

          <Text style={styles.heroSubtitle} numberOfLines={2}>{club.description}</Text>

          <Text style={styles.heroMetaText}>Community • {visibleMemberCount} members</Text>

          <TouchableOpacity
            style={[
              styles.ctaButton,
              isJoined && styles.ctaButtonJoined,
              joiningLoading && styles.ctaButtonDisabled,
            ]}
            onPress={handleToggleMembership}
            disabled={joiningLoading}
            activeOpacity={0.85}
          >
            {joiningLoading ? (
              <ActivityIndicator size="small" color={isJoined ? COLORS.primaryStrong : COLORS.textSecondary} />
            ) : (
              <>
                <Text style={[styles.ctaButtonText, isJoined && styles.ctaButtonTextJoined]}>
                  {isJoined ? 'Joined' : 'Join Club'}
                </Text>
                <View style={[styles.ctaButtonIconWrap, isJoined && styles.ctaButtonIconWrapJoined]}>
                  <Ionicons
                    name={isJoined ? 'checkmark' : 'arrow-forward'}
                    size={14}
                    color={isJoined ? COLORS.primaryStrong : COLORS.textSecondary}
                  />
                </View>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <Ionicons name="people-outline" size={16} color={typeConfig.accent} />
            <Text style={[styles.quickStatValue, { color: typeConfig.accent }]}>
              {visibleMemberCount}
            </Text>
            <Text style={styles.quickStatLabel}>Total members</Text>
          </View>

          <View style={styles.quickStatCard}>
            <Ionicons name="sparkles-outline" size={16} color={COLORS.primaryStrong} />
            <Text style={[styles.quickStatValue, { color: COLORS.primaryStrong }]}>
              {activeMembers.length}
            </Text>
            <Text style={styles.quickStatLabel}>Active now</Text>
          </View>

          <View style={styles.quickStatCard}>
            <Ionicons name={modeMeta.icon} size={16} color={COLORS.secondaryStrong} />
            <Text style={[styles.quickStatValueSmall, { color: COLORS.secondaryStrong }]} numberOfLines={1}>
              {modeMeta.label}
            </Text>
            <Text style={styles.quickStatLabel}>Access</Text>
          </View>
        </View>

        {club.tags?.length ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="pricetags-outline" size={14} color={COLORS.primaryStrong} />
              </View>
              <Text style={styles.sectionTitle}>Topics</Text>
            </View>
            <View style={styles.tagsRow}>
              {club.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.primaryStrong} />
            </View>
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <Text style={styles.sectionBody}>{club.description}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="people-outline" size={14} color={COLORS.primaryStrong} />
              </View>
              <Text style={styles.sectionTitle}>Members</Text>
            </View>
            <Text style={styles.sectionMetaText}>{activeMembers.length} active</Text>
          </View>

          {activeMembers.length === 0 ? (
            <Text style={styles.emptyMembersText}>No active members yet.</Text>
          ) : (
            <View style={styles.membersGrid}>
              {activeMembers.slice(0, 9).map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <Avatar
                    uri={member.user.profilePictureUrl}
                    name={`${member.user.firstName} ${member.user.lastName}`}
                    size="lg"
                    variant="post"
                  />
                  <Text style={styles.memberName} numberOfLines={1}>
                    {`${member.user.firstName} ${member.user.lastName}`}
                  </Text>
                  <View style={styles.memberRolePill}>
                    <Text style={styles.memberRole}>{getRoleLabel(member.role)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderTopBar()}
      {renderState()}
    </View>
  );
}

const memberCardWidth = (width - 32 - 20) / 3;

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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  topBarActions: {
    width: 38,
    alignItems: 'flex-end',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 14,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  detailsLoadingContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  detailsHeroSkeleton: {
    height: 228,
    borderRadius: 24,
    backgroundColor: '#E5F0EF',
  },
  detailsStatsRowSkeleton: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsStatSkeleton: {
    flex: 1,
    height: 92,
    borderRadius: 16,
    backgroundColor: '#E5F0EF',
  },
  detailsSectionSkeleton: {
    height: 112,
    borderRadius: 18,
    backgroundColor: '#E5F0EF',
  },
  detailsSectionSkeletonLarge: {
    height: 164,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    maxWidth: 260,
  },
  retryButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#1D4B4B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  heroDecorPrimary: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: -58,
    right: -52,
  },
  heroDecorSecondary: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.16)',
    bottom: -44,
    right: -24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 1,
  },
  heroTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
  },
  heroTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  heroModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  clubTitle: {
    marginTop: 12,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    zIndex: 1,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
    zIndex: 1,
  },
  heroMetaText: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    zIndex: 1,
  },
  ctaButton: {
    marginTop: 14,
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  ctaButtonJoined: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  ctaButtonDisabled: {
    opacity: 0.82,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  ctaButtonTextJoined: {
    color: COLORS.primaryStrong,
  },
  ctaButtonIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  ctaButtonIconWrapJoined: {
    backgroundColor: COLORS.secondarySoft,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  quickStatValue: {
    marginTop: 6,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '800',
  },
  quickStatValueSmall: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickStatLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSubtle,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: '#BFE2DD',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryStrong,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSubtle,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  memberCard: {
    width: memberCardWidth,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#F7FCFB',
    borderWidth: 1,
    borderColor: '#D9EBE8',
  },
  memberName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: memberCardWidth - 14,
  },
  memberRolePill: {
    marginTop: 4,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  memberRole: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryStrong,
  },
  emptyMembersText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSubtle,
  },
});
