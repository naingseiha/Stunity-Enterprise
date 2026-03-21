import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClassHubStore } from '@/stores/classHubStore';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primaryDark: '#06A8CC',
};

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
  const classId = route.params?.classId;

  const { materials, loading, error, fetchMaterials } = useClassHubStore();
  const data = materials[classId] || [];
  const isLoading = loading[`materials_${classId}`];
  const errorMessage = error[`materials_${classId}`];

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

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openLink(item.fileUrl || item.linkUrl)}>
      <View style={styles.iconWrap}>
        <Ionicons name={getIconForType(item.type)} size={24} color={COLORS.primaryDark} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={styles.meta}>Added by {item.uploader?.lastName} • {new Date(item.createdAt).toLocaleDateString()}</Text>
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
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No materials available.</Text>}
        />
      )}
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
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  desc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary },
});
