import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { clubsApi } from '@/api';
import type { ClubJoinRequest, ClubMember } from '@/api/clubs';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#09CFF7',
  primaryDark: '#06A8CC',
  danger: '#DC2626',
  success: '#16A34A',
};

const MANAGER_ROLES: ClubMember['role'][] = ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'];
const ROLE_OPTIONS: ClubMember['role'][] = ['INSTRUCTOR', 'TEACHING_ASSISTANT', 'STUDENT', 'OBSERVER'];

export default function ClubMembersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { clubId, clubName } = route.params || {};

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [requests, setRequests] = useState<ClubJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const getRoleLabel = (role: ClubMember['role']): string => {
    if (role === 'OWNER') return t('clubScreens.roles.owner');
    if (role === 'INSTRUCTOR') return t('clubScreens.roles.instructor');
    if (role === 'TEACHING_ASSISTANT') return t('clubScreens.roles.assistant');
    if (role === 'STUDENT') return t('clubScreens.roles.student');
    return t('clubScreens.roles.observer');
  };

  const myMembership = useMemo(
    () => members.find((member) => member.userId === user?.id),
    [members, user?.id]
  );

  const canManage = Boolean(myMembership && MANAGER_ROLES.includes(myMembership.role));
  const canManageRoles = myMembership?.role === 'OWNER';

  const loadData = useCallback(async (force = false) => {
    if (!clubId) return;
    if (!force) setLoading(true);

    try {
      setError(null);
      const memberRows = await clubsApi.getClubMembers(clubId, force);
      setMembers(Array.isArray(memberRows) ? memberRows : []);

      const nextMyMembership = (memberRows || []).find((member) => member.userId === user?.id);
      const canLoadRequests = Boolean(nextMyMembership && MANAGER_ROLES.includes(nextMyMembership.role));
      if (canLoadRequests) {
        const joinRequests = await clubsApi.getClubJoinRequests(clubId);
        setRequests(Array.isArray(joinRequests) ? joinRequests : []);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      setError(err?.message || t('clubScreens.members.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setBusyUserId(null);
    }
  }, [clubId, user?.id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const handleInvite = useCallback(async () => {
    if (!clubId || !inviteEmail.trim()) {
      Alert.alert(t('clubScreens.members.missingEmail'), t('clubScreens.members.enterEmail'));
      return;
    }
    try {
      setInviting(true);
      const result = await clubsApi.inviteMemberToClub(clubId, { email: inviteEmail.trim() });
      Alert.alert(t('clubScreens.members.invitationSent'), result.message || t('clubScreens.members.invitationSentMessage'));
      setInviteEmail('');
      loadData(true);
    } catch (err: any) {
      Alert.alert(t('clubScreens.members.inviteFailed'), err?.message || t('clubScreens.members.inviteFailedMessage'));
    } finally {
      setInviting(false);
    }
  }, [clubId, inviteEmail, loadData]);

  const handleApprove = useCallback((request: ClubJoinRequest) => {
    if (!clubId) return;
    setBusyUserId(request.userId);
    clubsApi.approveClubJoinRequest(clubId, request.userId)
      .then(() => loadData(true))
      .catch((err: any) => {
        setBusyUserId(null);
        Alert.alert(t('clubScreens.members.approvalFailed'), err?.message || t('clubScreens.members.approvalFailedMessage'));
      });
  }, [clubId, loadData]);

  const handleReject = useCallback((request: ClubJoinRequest) => {
    if (!clubId) return;
    Alert.alert(t('clubScreens.members.rejectRequestTitle'), t('clubScreens.members.rejectRequestMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('clubScreens.members.reject'),
        style: 'destructive',
        onPress: () => {
          setBusyUserId(request.userId);
          clubsApi.rejectClubJoinRequest(clubId, request.userId)
            .then(() => loadData(true))
            .catch((err: any) => {
              setBusyUserId(null);
              Alert.alert(t('clubScreens.members.rejectFailed'), err?.message || t('clubScreens.members.rejectFailedMessage'));
            });
        },
      },
    ]);
  }, [clubId, loadData]);

  const handleRemoveMember = useCallback((member: ClubMember) => {
    if (!clubId) return;
    Alert.alert(t('clubScreens.members.removeMemberTitle'), t('clubScreens.members.removeMemberMessage', { name: `${member.user.firstName} ${member.user.lastName}` }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          setBusyUserId(member.userId);
          clubsApi.removeMember(clubId, member.userId)
            .then(() => loadData(true))
            .catch((err: any) => {
              setBusyUserId(null);
              Alert.alert(t('clubScreens.members.removeFailed'), err?.message || t('clubScreens.members.removeFailedMessage'));
            });
        },
      },
    ]);
  }, [clubId, loadData]);

  const handleRoleChange = useCallback((member: ClubMember) => {
    if (!clubId || !canManageRoles) return;

    Alert.alert(
      t('clubScreens.members.changeRole'),
      t('clubScreens.members.chooseRole', { name: `${member.user.firstName} ${member.user.lastName}` }),
      [
        ...ROLE_OPTIONS.map((role) => ({
          text: getRoleLabel(role),
          onPress: () => {
            setBusyUserId(member.userId);
            clubsApi.updateMemberRole(clubId, member.userId, role)
              .then(() => loadData(true))
              .catch((err: any) => {
                setBusyUserId(null);
                Alert.alert(t('clubScreens.members.roleUpdateFailed'), err?.message || t('clubScreens.members.roleUpdateFailedMessage'));
              });
          },
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  }, [canManageRoles, clubId, loadData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('clubScreens.members.header')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{t('clubScreens.members.header')}</Text>
            {clubName ? <Text style={styles.subtitle}>{clubName}</Text> : null}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(true)}>
              <Text style={styles.retryText}>{t('classDetails.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canManage ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('clubScreens.members.inviteByEmail')}</Text>
            <View style={styles.inviteRow}>
              <TextInput
                style={styles.inviteInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder={t('clubScreens.members.emailPlaceholder')}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[styles.inviteBtn, (inviting || !inviteEmail.trim()) && styles.inviteBtnDisabled]}
                onPress={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.inviteBtnText}>{t('clubScreens.members.invite')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {canManage ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('clubScreens.members.joinRequestsCount', { count: requests.length })}</Text>
            {requests.length === 0 ? (
              <Text style={styles.emptyText}>{t('clubScreens.members.noPendingRequests')}</Text>
            ) : (
              requests.map((request) => (
                <View key={request.id} style={styles.requestRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {request.user.firstName} {request.user.lastName}
                    </Text>
                    <Text style={styles.memberMeta}>{request.user.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.approveBtn, busyUserId === request.userId && { opacity: 0.6 }]}
                    onPress={() => handleApprove(request)}
                    disabled={busyUserId === request.userId}
                  >
                    <Text style={styles.approveBtnText}>{t('clubScreens.members.approve')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, busyUserId === request.userId && { opacity: 0.6 }]}
                    onPress={() => handleReject(request)}
                    disabled={busyUserId === request.userId}
                  >
                    <Text style={styles.rejectBtnText}>{t('clubScreens.members.reject')}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('clubScreens.members.activeMembersCount', { count: members.length })}</Text>
          {members.length === 0 ? (
            <Text style={styles.emptyText}>{t('clubScreens.members.noActiveMembers')}</Text>
          ) : (
            members.map((member) => {
              const isSelf = member.userId === user?.id;
              const canRemove = canManage && !isSelf && member.role !== 'OWNER';
              const canChangeRole = canManageRoles && !isSelf && member.role !== 'OWNER';
              const memberBusy = busyUserId === member.userId;

              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {member.user.firstName} {member.user.lastName}
                    </Text>
                    <Text style={styles.memberMeta}>{member.user.email}</Text>
                    <View style={styles.rolePill}>
                      <Text style={styles.rolePillText}>{getRoleLabel(member.role)}</Text>
                    </View>
                  </View>

                  <View style={styles.memberActions}>
                    {canChangeRole ? (
                      <TouchableOpacity
                        style={[styles.roleBtn, memberBusy && { opacity: 0.6 }]}
                        onPress={() => handleRoleChange(member)}
                        disabled={memberBusy}
                      >
                        <Text style={styles.roleBtnText}>{t('clubScreens.members.role')}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {canRemove ? (
                      <TouchableOpacity
                        style={[styles.removeBtn, memberBusy && { opacity: 0.6 }]}
                        onPress={() => handleRemoveMember(member)}
                        disabled={memberBusy}
                      >
                        {memberBusy ? (
                          <ActivityIndicator size="small" color={COLORS.danger} />
                        ) : (
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { color: COLORS.textSecondary, fontSize: 13 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 13 },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
  },
  inviteBtn: {
    height: 42,
    minWidth: 78,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 14,
  },
  inviteBtnDisabled: { opacity: 0.6 },
  inviteBtnText: { color: '#FFF', fontWeight: '700' },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
  },
  approveBtn: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  approveBtnText: { color: COLORS.success, fontWeight: '700', fontSize: 12 },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rejectBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
  },
  memberName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  memberMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rolePillText: { fontSize: 11, color: '#1D4ED8', fontWeight: '700' },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roleBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
});
