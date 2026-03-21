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
import { ClassAssignment } from '@/api/classHub';
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
  const viewerRole = route.params?.myRole || user?.role;
  const isTeacher = viewerRole === 'TEACHER';
  const linkedStudentId = route.params?.linkedStudentId;
  const studentId = linkedStudentId || (user as any)?.studentId || (user as any)?.student?.id;

  const { assignments, loading, error, fetchAssignments, createAssignment } = useClassHubStore();
  const data = assignments[classId] || [];
  const isLoading = loading[`assignments_${classId}`];
  const errorMessage = error[`assignments_${classId}`];

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxPoints, setMaxPoints] = useState('100');
  const [deepLinkUrl, setDeepLinkUrl] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchAssignments(classId);
    }
  }, [classId, fetchAssignments]);

  const onRefresh = () => {
    if (classId) fetchAssignments(classId, true);
  };

  const openAssignment = (item: ClassAssignment) => {
    if (item.deepLinkUrl) {
      Linking.openURL(item.deepLinkUrl).catch(() => {});
    } else {
      navigation.navigate('ClassAssignmentDetail', {
        assignment: item,
        myRole: viewerRole,
        linkedStudentId: studentId,
      });
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    try {
      setPosting(true);
      await createAssignment(classId, {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        maxPoints: Number(maxPoints) || 100,
        deepLinkUrl: deepLinkUrl.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setMaxPoints('100');
      setDeepLinkUrl('');
      setShowModal(false);
      Alert.alert('Success', 'Assignment posted successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to post assignment');
    } finally {
      setPosting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    let statusText = isTeacher ? 'Active' : 'Pending';
    let statusColor = isTeacher ? COLORS.primaryDark : COLORS.warning;

    if (!isTeacher && studentId) {
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
    } else if (isTeacher) {
      const submissionCount = item.submissions?.length || 0;
      statusText = `${submissionCount} Submissions`;
    }

    return (
      <TouchableOpacity style={styles.card} onPress={() => openAssignment(item)}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.meta}>Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No Due Date'}</Text>
            {item.deepLinkUrl ? (
              <View style={styles.linkedBadge}>
                <Ionicons name="link" size={12} color="#0EA5E9" />
                <Text style={styles.linkedText}>Linked Content</Text>
              </View>
            ) : null}
          </View>
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
        <View style={{ flex: 1 }}>
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={styles.empty}>No assignments found.</Text>}
          />
          
          {isTeacher && (
            <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
              <Ionicons name="add-circle" size={30} color="#FFF" />
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
              <Text style={styles.modalTitle}>New Assignment</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Assignment Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Mathematics Quiz, English Essay"
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.label}>Max Points</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="100"
                    keyboardType="numeric"
                    value={maxPoints}
                    onChangeText={setMaxPoints}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-04-01"
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </View>
              </View>

              <Text style={styles.label}>Instructions</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Describe what needs to be done..."
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>Deep Link URL (Optional - Logic/Quiz/Course)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., stunity://quiz/123"
                value={deepLinkUrl}
                onChangeText={setDeepLinkUrl}
                autoCapitalize="none"
              />
              
              <TouchableOpacity 
                style={[styles.postBtn, (!title.trim() || posting) && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={!title.trim() || posting}
              >
                {posting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.postBtnText}>Post Assignment</Text>
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
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  desc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  linkedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0EA5E9',
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
