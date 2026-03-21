import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClassHubStore } from '@/stores/classHubStore';
import { useAuthStore } from '@/stores';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primaryDark: '#06A8CC',
};

const MATERIAL_TYPES = [
  { label: 'Link', value: 'LINK', icon: 'link' },
  { label: 'PDF', value: 'PDF', icon: 'document' },
  { label: 'Syllabus', value: 'SYLLABUS', icon: 'document-text' },
  { label: 'Other', value: 'OTHER', icon: 'folder' },
];

const getIconForType = (type: string) => {
  switch (type) {
    case 'LINK': return 'link';
    case 'SYLLABUS': return 'document-text';
    case 'PDF': return 'document';
    default: return 'folder';
  }
};

export default function ClassMaterialsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const classId = route.params?.classId;
  const isTeacher = user?.role === 'TEACHER';

  const { materials, loading, error, fetchMaterials, createMaterial } = useClassHubStore();
  const data = materials[classId] || [];
  const isLoading = loading[`materials_${classId}`];
  const errorMessage = error[`materials_${classId}`];

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('LINK');
  const [posting, setPosting] = useState(false);

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
      Alert.alert('Error', 'Title and URL/Link are required');
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
      Alert.alert('Success', 'Material shared successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to share material');
    } finally {
      setPosting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openLink(item.fileUrl || item.linkUrl)}>
      <View style={styles.iconWrap}>
        <Ionicons name={getIconForType(item.type)} size={24} color={COLORS.primaryDark} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={styles.meta}>Added by {item.uploader?.lastName || 'Teacher'} • {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="download-outline" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Class Materials</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {isLoading && data.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primaryDark} />
      ) : errorMessage && data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>{errorMessage}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={styles.empty}>No materials available.</Text>}
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
              <Text style={styles.modalTitle}>Share Material</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Chapter 1 Notes, Syllabus, etc."
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeContainer}>
                {MATERIAL_TYPES.map((t) => (
                  <TouchableOpacity 
                    key={t.value}
                    style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Ionicons 
                      name={t.icon as any} 
                      size={20} 
                      color={type === t.value ? '#FFF' : COLORS.textSecondary} 
                    />
                    <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{type === 'LINK' ? 'Link URL' : 'File Link/URL'}</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/file.pdf"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Brief summary of this resource..."
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
                  <Text style={styles.postBtnText}>Share Resource</Text>
                )}
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  loader: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  error: { color: 'red', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  desc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary },
  
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryDark,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primaryDark,
  },
  typeBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  typeBtnTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  postBtn: {
    backgroundColor: COLORS.primaryDark,
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
