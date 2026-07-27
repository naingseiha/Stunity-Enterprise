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
import { ClassAssignment } from '@/api/classHub';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';

import { Colors } from '@/config';
const BRAND_ACCENT = Colors.brand;

export default function ClassAssignmentsScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const classId = route.params?.classId;
  const viewerRole = route.params?.myRole || user?.role;
  const isTeacher = viewerRole === 'TEACHER';
  const linkedStudentId = route.params?.linkedStudentId;
  const studentId = linkedStudentId || (user as any)?.studentId || (user as any)?.student?.id;

  // Granular Zustand selectors — each only re-renders when its slice changes.
  const assignments = useClassHubStore(s => s.assignments);
  const loading = useClassHubStore(s => s.loading);
  const error = useClassHubStore(s => s.error);
  const fetchAssignments = useClassHubStore(s => s.fetchAssignments);
  const createAssignment = useClassHubStore(s => s.createAssignment);
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
      Alert.alert(t('common.error'), t('classScreens.assignments.titleRequired'));
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
      Alert.alert(t('common.success'), t('classScreens.assignments.posted'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('classScreens.assignments.postFailed'));
    } finally {
      setPosting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    let statusText = isTeacher ? t('classScreens.assignments.active') : t('classScreens.assignments.pending');
    let statusColor: string = isTeacher ? BRAND_ACCENT : colors.warning;

    if (!isTeacher && studentId) {
      const mySubmission = item.submissions?.find((s: any) => s.studentId === studentId);
      if (mySubmission) {
        if (mySubmission.status === 'GRADED') {
          statusText = t('classScreens.assignments.gradedScore', { score: mySubmission.score, max: item.maxPoints });
          statusColor = colors.success;
        } else if (mySubmission.status === 'SUBMITTED') {
          statusText = t('classScreens.assignments.submitted');
          statusColor = BRAND_ACCENT;
        } else if (item.dueDate && new Date(item.dueDate) < new Date()) {
          statusText = t('classScreens.assignments.missing');
          statusColor = colors.error;
        }
      }
    } else if (isTeacher) {
      const submissionCount = item.submissions?.length || 0;
      statusText = t('classScreens.assignments.submissionsCount', { count: submissionCount });
    }

    return (
      <TouchableOpacity style={styles.card} onPress={() => openAssignment(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="clipboard" size={20} color={BRAND_ACCENT} style={{ marginRight: 8 }} />
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        
        <View style={styles.metaRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.meta}>{t('classScreens.assignments.dueLabel')} {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : t('classScreens.assignments.noDueDate')}</Text>
            {item.deepLinkUrl ? (
              <View style={styles.linkedBadge}>
                <Ionicons name="link" size={12} color={colors.primary} />
                <Text style={styles.linkedText}>{t('classScreens.assignments.linkedContent')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>{t('classScreens.assignments.ptsLabel')} {item.maxPoints || '-'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('classScreens.assignments.header')}</Text>
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
            estimatedItemSize={140}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={styles.empty}>{t('classScreens.assignments.empty')}</Text>}
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
              <Text style={styles.modalTitle}>{t('classScreens.assignments.newAssignment')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>{t('classScreens.assignments.assignmentTitle')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('classScreens.assignments.titlePlaceholder')}
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.label}>{t('classScreens.assignments.maxPoints')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('classScreens.assignments.maxPointsDefault')}
                    keyboardType="numeric"
                    value={maxPoints}
                    onChangeText={setMaxPoints}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('classScreens.assignments.dueDate')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('classScreens.assignments.dueDateExample')}
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </View>
              </View>

              <Text style={styles.label}>{t('classScreens.assignments.instructions')}</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder={t('classScreens.assignments.instructionsPlaceholder')}
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>{t('classScreens.assignments.deepLink')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('classScreens.assignments.deepLinkPlaceholder')}
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
                  <Text style={styles.postBtnText}>{t('classScreens.assignments.postAssignment')}</Text>
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
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  desc: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(14,165,233,0.16)' : '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  linkedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
