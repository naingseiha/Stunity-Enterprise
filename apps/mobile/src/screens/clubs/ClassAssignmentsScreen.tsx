import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Linking } from 'react-native';
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
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export default function ClassAssignmentsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const classId = route.params?.classId;
  const studentId = (user as any)?.studentId || (user as any)?.student?.id; // Fallback to either shape

  const { assignments, loading, error, fetchAssignments } = useClassHubStore();
  const data = assignments[classId] || [];
  const isLoading = loading[`assignments_${classId}`];
  const errorMessage = error[`assignments_${classId}`];

  useEffect(() => {
    if (classId) {
      fetchAssignments(classId);
    }
  }, [classId, fetchAssignments]);

  const onRefresh = () => {
    if (classId) fetchAssignments(classId, true);
  };

  const openAssignment = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const renderItem = ({ item }: { item: any }) => {
    // Determine student status if applicable
    let statusText = 'Pending';
    let statusColor = COLORS.warning;

    if (studentId) {
      const mySubmission = item.submissions?.find((s: any) => s.studentId === studentId);
      if (mySubmission) {
        if (mySubmission.status === 'GRADED') {
          statusText = `Graded: ${mySubmission.score}/${item.maxPoints}`;
          statusColor = COLORS.success;
        } else if (mySubmission.status === 'SUBMITTED') {
          statusText = 'Submitted';
          statusColor = COLORS.primaryDark;
        } else if (item.dueDate && new Date(item.dueDate) < new Date()) {
          statusText = 'Missing';
          statusColor = COLORS.danger;
        }
      }
    }

    return (
      <TouchableOpacity style={styles.card} onPress={() => openAssignment(item.deepLinkUrl)}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="clipboard" size={20} color={COLORS.primaryDark} style={{ marginRight: 8 }} />
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No Due Date'}</Text>
          <Text style={styles.meta}>Pts: {item.maxPoints || '-'}</Text>
        </View>
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
          <Text style={styles.headerTitle}>Assignments</Text>
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
          ListEmptyComponent={<Text style={styles.empty}>No assignments found.</Text>}
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
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  desc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary },
});
