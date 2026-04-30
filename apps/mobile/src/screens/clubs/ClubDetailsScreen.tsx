import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import StunityLogo from '../../../assets/Stunity.svg';
import { Avatar } from '@/components/common';
import { clubsApi } from '@/api';
import type { Club, ClubMember } from '@/api/clubs';
import type { ClubsStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores';
import { useThemeContext } from '@/contexts';
import { useTranslation } from 'react-i18next';

const HERO_GRADIENT: [string, string] = ['#FB7185', '#E11D8A'];

const MODE_META: Record<
  Club['mode'],
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PUBLIC: { label: 'Public', icon: 'globe-outline' },
  INVITE_ONLY: { label: 'Invite Only', icon: 'lock-closed-outline' },
  APPROVAL_REQUIRED: { label: 'Approval Required', icon: 'checkmark-circle-outline' },
};

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#0EA5E9',
  danger: '#EF4444',
} as const;

export default function ClubDetailsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { clubId, initialClub } = route.params as ClubsStackParamList['ClubDetails'];
  const { user } = useAuthStore();

  const cachedClub = useMemo(() => clubsApi.getCachedClubById(clubId), [clubId]);
  const cachedMembers = useMemo(() => clubsApi.getCachedClubMembers(clubId) || [], [clubId]);
  const initialVisibleClub = cachedClub || initialClub || null;

  const [club, setClub] = useState<Club | null>(initialVisibleClub as Club | null);
  const [members, setMembers] = useState<ClubMember[]>(cachedMembers);
  const [loading, setLoading] = useState(!initialVisibleClub);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const getRoleLabel = (role: string): string => {
    if (role === 'OWNER') return t('clubScreens.roles.owner');
    if (role === 'INSTRUCTOR') return t('clubScreens.roles.instructor');
    if (role === 'TEACHING_ASSISTANT' || role === 'ASSISTANT') return t('clubScreens.roles.assistant');
    if (role === 'STUDENT') return t('clubScreens.roles.student');
    if (role === 'OBSERVER') return t('clubScreens.roles.observer');
    return t('clubScreens.roles.member');
  };

  const activeMembers = useMemo(
    () => (members || []).filter((member) => member.isActive),
    [members]
  );
  const isJoined = activeMembers.some((member) => member.userId === user?.id);
  const isJoinedFromClub = Boolean(club?.isJoined);

  const fetchClubDetails = useCallback(async (force = false) => {
    try {
      const cachedDetail = !force ? clubsApi.getCachedClubById(clubId) : null;
      const cachedMemberList = !force ? clubsApi.getCachedClubMembers(clubId) : null;

      if (cachedDetail) {
        setClub(cachedDetail);
        setLoading(false);
      } else if (!initialVisibleClub) {
        setLoading(true);
      }

      if (cachedMemberList) {
        setMembers(cachedMemberList);
      }

      setError(null);
      const [clubData, membersData] = await Promise.allSettled([
        clubsApi.getClubById(clubId, force),
        clubsApi.getClubMembers(clubId, force),
      ]);

      if (clubData.status === 'fulfilled') {
        setClub(clubData.value);
      }
      if (membersData.status === 'fulfilled') {
        setMembers(membersData.value || []);
      }

      if (
        clubData.status === 'rejected' &&
        membersData.status === 'rejected' &&
        !cachedDetail &&
        !initialVisibleClub
      ) {
        throw clubData.reason || membersData.reason;
      }
    } catch (err: any) {
      console.error('Failed to fetch club details:', err);
      setError(err?.message || t('clubScreens.details.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId, initialVisibleClub, t]);

  useEffect(() => {
    fetchClubDetails();
  }, [fetchClubDetails]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClubDetails(true);
  }, [fetchClubDetails]);

  const handleJoin = useCallback(async () => {
    if (!club) return;

    try {
      setJoiningLoading(true);
      if (club.mode === 'APPROVAL_REQUIRED') {
        const result = await clubsApi.requestJoinClub(clubId);
        Alert.alert(t('clubScreens.details.joinRequestSent'), result.message || t('clubScreens.details.requestSentFor', { name: club.name }));
      } else if (club.mode === 'INVITE_ONLY') {
        const result = await clubsApi.acceptClubInvite(clubId);
        Alert.alert(t('clubScreens.details.invitationAccepted'), result.message || t('clubScreens.details.joinedName', { name: club.name }));
      } else {
        await clubsApi.joinClub(clubId);
        Alert.alert(t('common.success'), t('clubScreens.details.joinedName', { name: club.name }));
      }
      await fetchClubDetails();
    } catch (err: any) {
      console.error('Failed to join club:', err);
      if (club.mode === 'INVITE_ONLY') {
        Alert.alert(t('clubScreens.details.inviteRequired'), err?.message || t('clubScreens.details.inviteOnlyMessage'));
      } else if (club.mode === 'APPROVAL_REQUIRED') {
        Alert.alert(t('clubScreens.details.requestFailed'), err?.message || t('clubScreens.details.requestFailedMessage'));
      } else {
        Alert.alert(t('common.error'), err?.message || t('clubScreens.details.joinFailed'));
      }
    } finally {
      setJoiningLoading(false);
    }
  }, [club, clubId, fetchClubDetails, t]);

  const handleLeave = useCallback(async () => {
    if (!club) return;

    try {
      setJoiningLoading(true);
      await clubsApi.leaveClub(clubId);
      await fetchClubDetails();
    } catch (err: any) {
      console.error('Failed to leave club:', err);
      Alert.alert(t('common.error'), err?.message || t('clubScreens.details.leaveFailed'));
    } finally {
      setJoiningLoading(false);
    }
  }, [club, clubId, fetchClubDetails, t]);

  const handleToggleMembership = useCallback(() => {
    if (!club) return;

    if (isJoined || isJoinedFromClub) {
      Alert.alert(t('clubScreens.details.leaveClub'), t('clubScreens.details.leaveClubConfirm', { name: club.name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('clubScreens.details.leave'),
          style: 'destructive',
          onPress: () => {
            handleLeave();
          },
        },
      ]);
      return;
    }

    handleJoin();
  }, [club, isJoined, isJoinedFromClub, handleJoin, handleLeave, t]);

  const handleOpenClubAcademics = useCallback(() => {
    if (!club) return;
    navigation.navigate('ClubAcademics', {
      clubId: club.id,
      clubName: club.name,
    });
  }, [club, navigation]);

  const handleOpenAssignments = useCallback(() => {
    if (!club) return;
    navigation.navigate('AssignmentsList', { clubId: club.id });
  }, [club, navigation]);

  const handleOpenAnnouncements = useCallback(() => {
    if (!club) return;
    navigation.navigate('ClubAnnouncements', {
      clubId: club.id,
      clubName: club.name,
    });
  }, [club, navigation]);

  const handleOpenMaterials = useCallback(() => {
    if (!club) return;
    navigation.navigate('ClubMaterials', {
      clubId: club.id,
      clubName: club.name,
    });
  }, [club, navigation]);

  const handleOpenMembers = useCallback(() => {
    if (!club) return;
    navigation.navigate('ClubMembers', {
      clubId: club.id,
      clubName: club.name,
    });
  }, [club, navigation]);

  const modeMeta = club
    ? {
        ...(MODE_META[club.mode] || MODE_META.PUBLIC),
        label:
          club.mode === 'PUBLIC'
            ? t('clubScreens.details.mode.public')
            : club.mode === 'INVITE_ONLY'
            ? t('clubScreens.details.mode.inviteOnly')
            : t('clubScreens.details.mode.approvalRequired'),
      }
    : { ...MODE_META.PUBLIC, label: t('clubScreens.details.mode.public') };

  const visibleMemberCount = club?.memberCount || activeMembers.length;
  const myMembership = activeMembers.find((member) => member.userId === user?.id);
  const canManageAcademic = Boolean(
    myMembership && ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'].includes(myMembership.role)
  );
  const canOpenCommunityTools = Boolean(isJoined || isJoinedFromClub);
  const canOpenAcademicTools = Boolean((isJoined || isJoinedFromClub) && club?.type === 'STRUCTURED_CLASS');
  const heroRole = myMembership ? getRoleLabel(myMembership.role) : t('clubScreens.details.guest');

  const toolItems = useMemo(() => {
    const rows: Array<{
      key: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      iconColor: string;
      iconBg: string;
      onPress: () => void;
      disabled: boolean;
    }> = [];

    if (club?.type === 'STRUCTURED_CLASS') {
      rows.push({
        key: 'manage',
        label: canManageAcademic ? t('clubScreens.details.tools.manage') : t('clubScreens.details.tools.progress'),
        icon: 'analytics-outline',
        iconColor: '#2563EB',
        iconBg: '#EFF6FF',
        onPress: handleOpenClubAcademics,
        disabled: !canOpenAcademicTools,
      });

      rows.push({
        key: 'tasks',
        label: t('clubScreens.details.tools.tasks'),
        icon: 'document-text-outline',
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        onPress: handleOpenAssignments,
        disabled: !canOpenAcademicTools,
      });
    }

    rows.push({
      key: 'updates',
      label: t('clubScreens.details.tools.updates'),
      icon: 'megaphone-outline',
      iconColor: '#1D4ED8',
      iconBg: '#EFF6FF',
      onPress: handleOpenAnnouncements,
      disabled: !canOpenCommunityTools,
    });

    rows.push({
      key: 'materials',
      label: t('clubScreens.details.tools.materials'),
      icon: 'folder-open-outline',
      iconColor: '#16A34A',
      iconBg: '#F0FDF4',
      onPress: handleOpenMaterials,
      disabled: !canOpenCommunityTools,
    });

    rows.push({
      key: 'members',
      label: t('clubScreens.details.tools.members'),
      icon: 'people-outline',
      iconColor: '#EA580C',
      iconBg: '#FFF7ED',
      onPress: handleOpenMembers,
      disabled: !canOpenCommunityTools,
    });

    return rows;
  }, [
    canManageAcademic,
    canOpenAcademicTools,
    canOpenCommunityTools,
    club?.type,
    handleOpenAnnouncements,
    handleOpenAssignments,
    handleOpenClubAcademics,
    handleOpenMembers,
    handleOpenMaterials,
    t,
  ]);

  const renderTopBar = () => (
    <SafeAreaView edges={['top']} style={styles.headerSafe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <StunityLogo width={108} height={30} />

        <TouchableOpacity onPress={handleRefresh} style={styles.iconButton}>
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
          ) : (
            <Ionicons name="refresh-outline" size={22} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const renderLoading = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.detailsLoadingContent}
      showsVerticalScrollIndicator={false}
    >
      <BlurView
        intensity={isDark ? 42 : 72}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.detailsLoadingBlur,
          {
            backgroundColor: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(255,255,255,0.7)',
            borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)',
          },
        ]}
      >
        <View style={[styles.detailsHeroSkeleton, { backgroundColor: isDark ? 'rgba(148,163,184,0.22)' : '#E5F0EF' }]} />
        <View style={[styles.detailsSectionSkeleton, { backgroundColor: isDark ? 'rgba(148,163,184,0.2)' : '#E5F0EF' }]} />
        <View
          style={[
            styles.detailsSectionSkeleton,
            styles.detailsSectionSkeletonLarge,
            { backgroundColor: isDark ? 'rgba(148,163,184,0.18)' : '#E5F0EF' },
          ]}
        />
      </BlurView>
    </ScrollView>
  );

  const renderError = () => (
    <View style={styles.stateContainer}>
      <Ionicons name="alert-circle-outline" size={42} color={COLORS.danger} />
      <Text style={styles.errorText}>{error || t('clubScreens.details.notFound')}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => { fetchClubDetails(true); }} activeOpacity={0.85}>
        <Text style={styles.retryButtonText}>{t('classDetails.retry')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!club) return null;

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
        <View style={styles.heroCard}>
          <LinearGradient
            colors={HERO_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroSoftCircle} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroModePill}>
              <Ionicons name={modeMeta.icon} size={12} color="#FFFFFF" />
              <Text style={styles.heroModePillText}>{modeMeta.label}</Text>
            </View>
          </View>

          <View style={styles.heroMetricRow}>
            <View style={styles.heroMetricBlock}>
              <Text style={styles.heroMetric}>{visibleMemberCount}</Text>
              <Text style={styles.heroMetricLabel}>{t('clubScreens.details.totalMembers')}</Text>
            </View>
          </View>

          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitleText} numberOfLines={1}>
              {club.name}
            </Text>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaPillText}>{t('clubScreens.details.activeCount', { count: activeMembers.length })}</Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaPillText}>{heroRole}</Text>
            </View>
            <TouchableOpacity
              style={[styles.heroJoinButton, joiningLoading && styles.heroButtonDisabled]}
              onPress={handleToggleMembership}
              disabled={joiningLoading}
              activeOpacity={0.85}
            >
              {joiningLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={(isJoined || isJoinedFromClub) ? 'checkmark-circle' : 'add-circle-outline'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.heroJoinButtonText}>
                    {(isJoined || isJoinedFromClub) ? t('clubs.card.joined') : t('clubs.card.joinNow')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>{t('clubScreens.details.clubHubTools')}</Text>
          </View>

          <View style={styles.toolsGrid}>
            {toolItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.toolCard, item.disabled && styles.toolCardDisabled]}
                onPress={item.onPress}
                disabled={item.disabled}
                activeOpacity={0.8}
              >
                <View style={[styles.toolIconWrap, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <Text style={styles.toolLabel} numberOfLines={1}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!canOpenCommunityTools ? (
            <Text style={styles.sectionHint}>{t('clubScreens.details.unlockHint')}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('clubScreens.details.about')}</Text>
          </View>
          <Text style={styles.sectionBody}>{club.description || t('clubScreens.details.noDescription')}</Text>
        </View>

        {club.tags?.length ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="pricetags-outline" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>{t('clubScreens.details.topics')}</Text>
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
          <View style={styles.sectionHeaderRowCompact}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="people-outline" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>{t('clubScreens.details.tools.members')}</Text>
            </View>
            <Text style={styles.sectionMetaText}>{t('clubScreens.details.activeCount', { count: activeMembers.length })}</Text>
          </View>

          {activeMembers.length === 0 ? (
            <Text style={styles.emptyMembersText}>{t('clubScreens.details.noActiveMembers')}</Text>
          ) : (
            <View style={styles.membersList}>
              {activeMembers.slice(0, 6).map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <Avatar
                    uri={member.user.profilePictureUrl}
                    name={`${member.user.firstName} ${member.user.lastName}`}
                    size="md"
                    variant="post"
                  />
                  <View style={styles.memberTextWrap}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {`${member.user.firstName} ${member.user.lastName}`}
                    </Text>
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {renderTopBar()}
      {loading ? renderLoading() : error ? renderError() : renderContent()}
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 18,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  detailsLoadingContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  detailsLoadingBlur: {
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
  },
  detailsHeroSkeleton: {
    height: 260,
    borderRadius: 26,
    backgroundColor: '#E5F0EF',
  },
  detailsSectionSkeleton: {
    height: 120,
    borderRadius: 18,
    backgroundColor: '#E5F0EF',
  },
  detailsSectionSkeletonLarge: {
    height: 180,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
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
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  heroSoftCircle: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFFFFF',
    opacity: 0.12,
    top: -92,
    right: -44,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 14,
    zIndex: 2,
  },
  heroModePill: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroModePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: 14,
    zIndex: 2,
  },
  heroMetricBlock: {
    flex: 1,
  },
  heroMetric: {
    color: '#FFFFFF',
    fontSize: 58,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  heroMetricLabel: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  heroTitleRow: {
    marginTop: 2,
    marginBottom: 10,
    zIndex: 2,
  },
  heroTitleText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  heroMetaRow: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  heroMetaPill: {
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  heroMetaPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroJoinButton: {
    minWidth: 96,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    zIndex: 2,
  },
  heroButtonDisabled: {
    opacity: 0.82,
  },
  heroJoinButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  sectionWrap: {
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionHeader: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    width: '48%',
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  toolCardDisabled: {
    opacity: 0.45,
  },
  toolIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  sectionHeaderRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    backgroundColor: '#E0F2FE',
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
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  membersList: {
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  memberTextWrap: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  memberRole: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  emptyMembersText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
});
