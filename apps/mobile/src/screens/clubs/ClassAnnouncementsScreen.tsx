import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
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
  primaryDark: '#06A8CC',
};

export default function ClassAnnouncementsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const classId = route.params?.classId;

  const { announcements, loading, error, fetchAnnouncements } = useClassHubStore();
  const data = announcements[classId] || [];
  const isLoading = loading[`announcements_${classId}`];
  const errorMessage = error[`announcements_${classId}`];

  useEffect(() => {
    if (classId) {
      fetchAnnouncements(classId);
    }
  }, [classId, fetchAnnouncements]);

  const onRefresh = () => {
    if (classId) fetchAnnouncements(classId, true);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.author?.firstName?.[0] || 'A'}</Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author?.firstName} {item.author?.lastName}</Text>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        {item.isPinned && <Ionicons name="pin" size={16} color="#F59E0B" />}
      </View>
      <Text style={styles.content}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Announcements</Text>
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
          ListEmptyComponent={<Text style={styles.empty}>No announcements yet.</Text>}
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
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  loader: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  error: { color: 'red', textAlign: 'center' },
  list: { padding: 16, gap: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  dateText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  content: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary },
});
