import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { clubsApi } from '@/api';
import type { ClubInvite } from '@/api/clubs';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primaryDark: '#06A8CC',
  success: '#16A34A',
  danger: '#DC2626',
};

export default function ClubInvitesScreen() {
  const navigation = useNavigation<any>();
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyClubId, setBusyClubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(async (force = false) => {
    if (!force) setLoading(true);
    try {
      setError(null);
      const rows = await clubsApi.getMyClubInvites();
      setInvites(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load club invites');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setBusyClubId(null);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInvites(true);
  }, [loadInvites]);

  const handleAccept = useCallback(async (invite: ClubInvite) => {
    const clubId = invite.clubId;
    try {
      setBusyClubId(clubId);
      const result = await clubsApi.acceptClubInvite(clubId);
      Alert.alert('Joined Club', result.message || 'Invitation accepted successfully.');
      clubsApi.invalidateClubsCache();
      loadInvites(true);
    } catch (err: any) {
      setBusyClubId(null);
      Alert.alert('Accept failed', err?.message || 'Could not accept this invitation.');
    }
  }, [loadInvites]);

  const handleDecline = useCallback((invite: ClubInvite) => {
    const clubId = invite.clubId;
    Alert.alert('Decline invitation?', 'You can be invited again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyClubId(clubId);
            const result = await clubsApi.declineClubInvite(clubId);
            Alert.alert('Declined', result.message || 'Invitation declined.');
            loadInvites(true);
          } catch (err: any) {
            setBusyClubId(null);
            Alert.alert('Decline failed', err?.message || 'Could not decline this invitation.');
          }
        },
      },
    ]);
  }, [loadInvites]);

  const handleOpenClub = useCallback((invite: ClubInvite) => {
    navigation.navigate('ClubDetails', {
      clubId: invite.clubId,
      initialClub: invite.club
        ? {
            id: invite.club.id,
            name: invite.club.name,
            description: invite.club.description,
            type: invite.club.type,
            mode: invite.club.mode,
            memberCount: invite.club.memberCount,
            isJoined: false,
            isActive: invite.club.isActive,
            tags: invite.club.tags,
            coverImage: invite.club.coverImage,
            createdAt: invite.club.createdAt,
            updatedAt: invite.club.updatedAt,
          }
        : undefined,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Club Invites</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadInvites(true)}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {invites.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="mail-open-outline" size={38} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No pending invites</Text>
              <Text style={styles.emptySubtitle}>New club invitations will appear here.</Text>
            </View>
          ) : (
            invites.map((invite) => {
              const isBusy = busyClubId === invite.clubId;
              const clubName = invite.club?.name || 'Study Club';
              const clubDescription = invite.club?.description || 'You were invited to join this club.';

              return (
                <View key={invite.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="mail-unread-outline" size={18} color={COLORS.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clubName}>{clubName}</Text>
                      <Text style={styles.metaText}>Invite pending</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleOpenClub(invite)} style={styles.viewBtn}>
                      <Text style={styles.viewBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.clubDescription} numberOfLines={2}>
                    {clubDescription}
                  </Text>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.acceptBtn, isBusy && { opacity: 0.6 }]}
                      onPress={() => handleAccept(invite)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                          <Text style={styles.acceptText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.declineBtn, isBusy && { opacity: 0.6 }]}
                      onPress={() => handleDecline(invite)}
                      disabled={isBusy}
                    >
                      <Ionicons name="close" size={16} color={COLORS.danger} />
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
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
  retryText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 34,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F9FD',
  },
  clubName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  metaText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  clubDescription: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  viewBtn: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  acceptText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  declineText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },
});
