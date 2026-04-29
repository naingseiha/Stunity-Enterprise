import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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

const MATERIAL_TYPES: Array<{ value: clubCommunityApi.ClubMaterial['type']; labelKey: string; icon: string }> = [
  { value: 'DOCUMENT', labelKey: 'clubScreens.materials.types.document', icon: 'document-text-outline' },
  { value: 'LINK', labelKey: 'clubScreens.materials.types.link', icon: 'link-outline' },
  { value: 'VIDEO', labelKey: 'clubScreens.materials.types.video', icon: 'videocam-outline' },
  { value: 'IMAGE', labelKey: 'clubScreens.materials.types.image', icon: 'image-outline' },
];

const getIconForType = (type: string) => {
  const found = MATERIAL_TYPES.find((entry) => entry.value === type);
  return found?.icon || 'folder-outline';
};

export default function ClubMaterialsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { clubId, clubName } = route.params || {};

  const [items, setItems] = useState<clubCommunityApi.ClubMaterial[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<clubCommunityApi.ClubMaterial['type']>('DOCUMENT');

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
      const [materials, clubMembers] = await Promise.all([
        clubCommunityApi.getClubMaterials(clubId),
        clubsApi.getClubMembers(clubId, force),
      ]);
      setItems(Array.isArray(materials) ? materials : []);
      setMembers(Array.isArray(clubMembers) ? clubMembers : []);
    } catch (err: any) {
      setError(err?.message || t('clubScreens.materials.loadFailed'));
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

  const openLink = useCallback(async (targetUrl: string) => {
    try {
      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert(t('clubScreens.materials.unableToOpen'), t('clubScreens.materials.unableToOpenMessage'));
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!clubId) return;
    if (!title.trim() || !url.trim()) {
      Alert.alert(t('clubScreens.materials.missingFields'), t('clubScreens.materials.enterTitleUrl'));
      return;
    }

    try {
      setPosting(true);
      const created = await clubCommunityApi.createClubMaterial(clubId, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        url: url.trim(),
      });
      setItems((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setUrl('');
      setType('DOCUMENT');
      setShowModal(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('clubScreens.materials.shareFailed'));
    } finally {
      setPosting(false);
    }
  }, [clubId, description, title, type, url]);

  const handleDelete = useCallback(
    (item: clubCommunityApi.ClubMaterial) => {
      const canDelete = canManage || item.uploadedById === user?.id;
      if (!canDelete) return;

      Alert.alert(t('clubScreens.materials.deleteTitle'), t('clubScreens.materials.deleteMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clubCommunityApi.deleteClubMaterial(item.id);
              setItems((prev) => prev.filter((entry) => entry.id !== item.id));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || t('clubScreens.materials.deleteFailed'));
            }
          },
        },
      ]);
    },
    [canManage, user?.id]
  );

  const renderItem = ({ item }: { item: clubCommunityApi.ClubMaterial }) => {
    const canDelete = canManage || item.uploadedById === user?.id;
    return (
      <TouchableOpacity style={styles.card} onPress={() => openLink(item.url)} activeOpacity={0.8}>
        <View style={styles.iconWrap}>
          <Ionicons name={getIconForType(item.type) as any} size={22} color={COLORS.primaryDark} />
        </View>
        <View style={styles.info}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
          <Text style={styles.meta}>
            {item.uploadedBy?.firstName || t('clubScreens.materials.member')} {item.uploadedBy?.lastName || ''} • {new Date(item.uploadedAt).toLocaleDateString()}
          </Text>
        </View>
        {canDelete ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
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
            <Text style={styles.title}>{t('clubScreens.materials.header')}</Text>
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
            <Text style={styles.retryText}>{t('classDetails.retry')}</Text>
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
            ListEmptyComponent={<Text style={styles.emptyText}>{t('clubScreens.materials.empty')}</Text>}
          />
          {canManage ? (
            <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
              <Ionicons name="cloud-upload-outline" size={28} color="#FFF" />
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
              <Text style={styles.modalTitle}>{t('clubScreens.materials.shareMaterial')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>{t('common.title')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('clubScreens.materials.titlePlaceholder')}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>{t('clubScreens.materials.type')}</Text>
              <View style={styles.typeRow}>
                {MATERIAL_TYPES.map((entry) => (
                  <TouchableOpacity
                    key={entry.value}
                    style={[styles.typeBtn, type === entry.value && styles.typeBtnActive]}
                    onPress={() => setType(entry.value)}
                  >
                    <Ionicons
                      name={entry.icon as any}
                      size={16}
                      color={type === entry.value ? '#FFF' : COLORS.textSecondary}
                    />
                    <Text style={[styles.typeText, type === entry.value && styles.typeTextActive]}>
                      {t(entry.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('clubScreens.materials.url')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('clubScreens.materials.urlPlaceholder')}
                autoCapitalize="none"
                value={url}
                onChangeText={setUrl}
              />

              <Text style={styles.label}>{t('clubScreens.materials.descriptionOptional')}</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder={t('clubScreens.materials.descriptionPlaceholder')}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <TouchableOpacity
                style={[styles.postBtn, (!title.trim() || !url.trim() || posting) && styles.postBtnDisabled]}
                onPress={handleCreate}
                disabled={!title.trim() || !url.trim() || posting}
              >
                {posting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.postText}>{t('clubScreens.materials.shareResource')}</Text>}
              </TouchableOpacity>
            </ScrollView>
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
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  desc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  deleteBtn: { padding: 6 },
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
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginBottom: 14,
    color: COLORS.textPrimary,
  },
  descriptionInput: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  typeBtnActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark },
  typeText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  typeTextActive: { color: '#FFF' },
  postBtn: {
    marginTop: 6,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  postBtnDisabled: { opacity: 0.6 },
  postText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
