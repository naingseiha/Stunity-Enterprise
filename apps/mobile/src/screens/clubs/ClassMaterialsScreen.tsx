import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClassHubStore } from '@/stores/classHubStore';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';

import { Colors } from '@/config';
const BRAND_ACCENT = Colors.brand;

const getIconForType = (type: string) => {
  switch (type) {
    case 'LINK': return 'link';
    case 'SYLLABUS': return 'document-text';
    case 'PDF': return 'document';
    default: return 'folder';
  }
};

export default function ClassMaterialsScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const classId = route.params?.classId;
  const isTeacher = user?.role === 'TEACHER';
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Granular Zustand selectors — each only re-renders when its slice changes.
  const materials = useClassHubStore(s => s.materials);
  const loading = useClassHubStore(s => s.loading);
  const error = useClassHubStore(s => s.error);
  const fetchMaterials = useClassHubStore(s => s.fetchMaterials);
  const createMaterial = useClassHubStore(s => s.createMaterial);
  const data = materials[classId] || [];
  const isLoading = loading[`materials_${classId}`];
  const errorMessage = error[`materials_${classId}`];

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('LINK');
  const [posting, setPosting] = useState(false);
  const materialTypes = [
    { label: t('classScreens.materials.types.link'), value: 'LINK', icon: 'link' },
    { label: t('classScreens.materials.types.pdf'), value: 'PDF', icon: 'document' },
    { label: t('classScreens.materials.types.syllabus'), value: 'SYLLABUS', icon: 'document-text' },
    { label: t('classScreens.materials.types.other'), value: 'OTHER', icon: 'folder' },
  ];

  useEffect(() => {
    if (classId) {
      fetchMaterials(classId);
    }
  }, [classId, fetchMaterials]);

  const onRefresh = () => {
    if (classId) fetchMaterials(classId, true);
  };

  const openLink = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleCreate = async () => {
    if (!title.trim() || !url.trim()) {
      Alert.alert(t('common.error'), t('classScreens.materials.requiredFields'));
      return;
    }

    try {
      setPosting(true);
      await createMaterial(classId, {
        title,
        description,
        linkUrl: type === 'LINK' ? url : undefined,
        fileUrl: type !== 'LINK' ? url : undefined,
        type,
      });
      setTitle('');
      setDescription('');
      setUrl('');
      setType('LINK');
      setShowModal(false);
      Alert.alert(t('common.success'), t('classScreens.materials.shared'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('classScreens.materials.shareFailed'));
    } finally {
      setPosting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openLink(item.fileUrl || item.linkUrl)}>
      <View style={styles.iconWrap}>
        <Ionicons name={getIconForType(item.type)} size={24} color={BRAND_ACCENT} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={styles.meta}>{t('classScreens.materials.addedBy', { name: item.uploader?.lastName || t('classScreens.materials.teacher') })} • {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('classScreens.materials.header')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {isLoading && data.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" color={BRAND_ACCENT} />
      ) : errorMessage && data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>{errorMessage}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* @ts-ignore FlashList types omit estimatedItemSize but it is supported and critical for perf */}
          <FlashList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            estimatedItemSize={96}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={styles.empty}>{t('classScreens.materials.empty')}</Text>}
          />
          
          {isTeacher && (
            <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
              <Ionicons name="cloud-upload" size={28} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* CREATE MODAL */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('classScreens.materials.shareMaterial')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>{t('common.title')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('classScreens.materials.titlePlaceholder')}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>{t('classScreens.materials.type')}</Text>
              <View style={styles.typeContainer}>
                {materialTypes.map((t) => (
                  <TouchableOpacity 
                    key={t.value}
                    style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Ionicons 
                      name={t.icon as any} 
                      size={20} 
                      color={type === t.value ? '#FFF' : colors.textSecondary} 
                    />
                    <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{type === 'LINK' ? t('classScreens.materials.linkUrl') : t('classScreens.materials.fileUrl')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('classScreens.materials.urlPlaceholder')}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
              />

              <Text style={styles.label}>{t('classScreens.materials.descriptionOptional')}</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder={t('classScreens.materials.descriptionPlaceholder')}
                multiline
                value={description}
                onChangeText={setDescription}
              />
              
              <TouchableOpacity 
                style={[styles.postBtn, (!title.trim() || !url.trim() || posting) && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={!title.trim() || !url.trim() || posting}
              >
                {posting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.postBtnText}>{t('classScreens.materials.shareResource')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  loader: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  error: { color: colors.error, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: isDark ? 'rgba(14,165,233,0.18)' : '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textSecondary },
  
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND_ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 20,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: BRAND_ACCENT,
  },
  typeBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  typeBtnTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  postBtn: {
    backgroundColor: BRAND_ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  postBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
