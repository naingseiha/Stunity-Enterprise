import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { clubCommunityApi, clubsApi } from '@/api';
import type { ClubMember } from '@/api/clubs';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primaryDark: '#06A8CC',
  danger: '#DC2626',
};

export default function ClubAnnouncementsScreen() {
  const { t, i18n } = useTranslation();
  const isKhmer = i18n.language?.startsWith('km');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { clubId, clubName } = route.params || {};

  const [items, setItems] = useState<clubCommunityApi.ClubAnnouncement[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const myMembership = useMemo(
    () => members.find((member) => member.userId === user?.id),
    [members, user?.id]
  );
  const canManage = Boolean(
    myMembership && ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'].includes(myMembership.role)
  );

  const fetchData = useCallback(async (force = false) => {
    if (!clubId) return;
    if (!force) setLoading(true);
    try {
      setError(null);
      const [announcements, clubMembers] = await Promise.all([
        clubCommunityApi.getClubAnnouncements(clubId),
        clubsApi.getClubMembers(clubId, force),
      ]);
      setItems(Array.isArray(announcements) ? announcements : []);
      setMembers(Array.isArray(clubMembers) ? clubMembers : []);
    } catch (err: any) {
      setError(err?.message || t('announcements.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!clubId || !content.trim()) return;
    try {
      setPosting(true);
      const created = await clubCommunityApi.createClubAnnouncement(clubId, {
        content: content.trim(),
      });
      setItems((prev) => [created, ...prev]);
      setContent('');
      setShowModal(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('announcements.postFailed'));
    } finally {
      setPosting(false);
    }
  }, [clubId, content, t]);

  const handleDelete = useCallback(
    (item: clubCommunityApi.ClubAnnouncement) => {
      const canDelete = canManage || item.createdById === user?.id;
      if (!canDelete) return;

      Alert.alert(t('announcements.deleteTitle'), t('announcements.deleteMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clubCommunityApi.deleteClubAnnouncement(item.id);
              setItems((prev) => prev.filter((entry) => entry.id !== item.id));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || t('announcements.deleteFailed'));
            }
          },
        },
      ]);
    },
    [canManage, user?.id, t]
  );

  const renderItem = ({ item }: { item: clubCommunityApi.ClubAnnouncement }) => {
    const canDelete = canManage || item.createdById === user?.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.createdBy?.firstName?.[0] || 'A'}</Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {item.createdBy?.firstName || t('announcements.member')} {item.createdBy?.lastName || ''}
            </Text>
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
          {item.isPinned ? <Ionicons name="pin" size={16} color="#F59E0B" /> : null}
          {canDelete ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.content}>{item.content}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, isKhmer && styles.khmerInlineText]}>{t('announcements.clubTitle')}</Text>
            {clubName ? <Text style={styles.subtitle}>{clubName}</Text> : null}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData(true)}>
            <Text style={[styles.retryText, isKhmer && styles.khmerInlineText]}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={[styles.emptyText, isKhmer && styles.khmerInlineText]}>{t('announcements.empty')}</Text>}
          />
          {canManage ? (
            <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
              <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isKhmer && styles.khmerInlineText]}>{t('announcements.new')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('announcements.clubPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={[styles.postBtn, (!content.trim() || posting) && styles.postBtnDisabled]}
              onPress={handleCreate}
              disabled={!content.trim() || posting}
            >
              {posting ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.postText, isKhmer && styles.khmerInlineText]}>{t('announcements.post')}</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.danger, textAlign: 'center' },
  retryBtn: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.primaryDark },
  retryText: { color: '#FFF', fontWeight: '700' },
  khmerInlineText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  dateText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  deleteBtn: { marginLeft: 8, padding: 6 },
  content: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    minHeight: 280,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  input: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    padding: 12,
    textAlignVertical: 'top',
    color: COLORS.textPrimary,
  },
  postBtn: {
    marginTop: 14,
    borderRadius: 12,
    height: 46,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.6 },
  postText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
