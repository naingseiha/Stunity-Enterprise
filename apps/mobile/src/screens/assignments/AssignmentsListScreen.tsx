/**
 * Assignments List Screen
 *
 * Display all assignments for a club with role-aware tabs and actions.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation, useRoute } from '@react-navigation/native';
import { format, isFuture, isPast } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi, clubsApi } from '@/api';
import type { ClubAssignment } from '@/api/assignments';
import type { ClubMember } from '@/api/clubs';
import type { ClubsStackScreenProps } from '@/navigation/types';
import { useAuthStore } from '@/stores/authStore';

type Tab = 'all' | 'active' | 'submitted' | 'graded' | 'published' | 'draft' | 'review';

const MANAGER_ROLES: ClubMember['role'][] = ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'];

const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'HOMEWORK': return 'document-text';
    case 'QUIZ': return 'help-circle';
    case 'EXAM': return 'school';
    case 'PROJECT': return 'rocket';
    default: return 'document';
  }
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'HOMEWORK': return '#3B82F6';
    case 'QUIZ': return '#8B5CF6';
    case 'EXAM': return '#EF4444';
    case 'PROJECT': return '#10B981';
    default: return Colors.primary;
  }
};

const getRoleLabel = (role?: ClubMember['role']): string => {
  if (role === 'OWNER') return 'Owner';
  if (role === 'INSTRUCTOR') return 'Instructor';
  if (role === 'TEACHING_ASSISTANT') return 'Assistant';
  if (role === 'STUDENT') return 'Student';
  if (role === 'OBSERVER') return 'Observer';
  return 'Member';
};

interface AssignmentCardProps {
  item: ClubAssignment;
  clubId: string;
  isManager: boolean;
  onPress: (assignmentId: string, clubId: string) => void;
}

const AssignmentCard = React.memo(function AssignmentCard({ item, clubId, isManager, onPress }: AssignmentCardProps) {
  const dueDate = new Date(item.dueDate);
  const isOverdue = isPast(dueDate) && !item.userSubmission;
  const isSubmitted = item.userSubmission != null;
  const isGraded = item.userSubmission?.status === 'GRADED';
  const typeColor = getTypeColor(item.type);

  return (
    <Animated.View style={styles.assignmentCard}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(item.id, clubId)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: `${typeColor}15` }]}> 
            <Ionicons name={getTypeIcon(item.type)} size={20} color={typeColor} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.subject && (
              <Text style={styles.subjectLabel}>{item.subject.name}</Text>
            )}
          </View>

          {isManager ? (
            <View style={[styles.managerStatusPill, item.status === 'DRAFT' ? styles.managerStatusDraft : styles.managerStatusPublished]}>
              <Text style={[styles.managerStatusPillText, item.status === 'DRAFT' ? styles.managerStatusDraftText : styles.managerStatusPublishedText]}>
                {item.status === 'DRAFT' ? 'Draft' : 'Published'}
              </Text>
            </View>
          ) : null}

          {!isManager && isGraded && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>
                {item.userSubmission?.score}/{item.maxPoints}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          )}

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.gray[500]} />
              <Text style={[styles.metaText, isOverdue && !isManager && styles.overdueText]}>
                {format(dueDate, 'MMM d, h:mm a')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="trophy-outline" size={14} color={Colors.gray[500]} />
              <Text style={styles.metaText}>{item.maxPoints} pts</Text>
            </View>
            {isManager ? (
              <View style={styles.metaItem}>
                <Ionicons name="documents-outline" size={14} color={Colors.gray[500]} />
                <Text style={styles.metaText}>{item.submissionCount || 0} submissions</Text>
              </View>
            ) : null}
          </View>

          {isManager ? (
            <View style={styles.statusBar}>
              {item.status === 'DRAFT' ? (
                <View style={[styles.statusBadge, styles.draftBadge]}>
                  <Ionicons name="eye-off-outline" size={16} color="#D97706" />
                  <Text style={styles.draftText}>Hidden from students</Text>
                </View>
              ) : null}
              {(item.submissionCount || 0) > 0 ? (
                <View style={[styles.statusBadge, styles.submittedBadge]}>
                  <Ionicons name="checkmark-done-outline" size={16} color="#3B82F6" />
                  <Text style={styles.submittedText}>Has submissions</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {!isManager && (isSubmitted || isOverdue) ? (
            <View style={styles.statusBar}>
              {isGraded && (
                <View style={[styles.statusBadge, styles.gradedBadge]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.gradedText}>Graded</Text>
                </View>
              )}
              {isSubmitted && !isGraded && (
                <View style={[styles.statusBadge, styles.submittedBadge]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                  <Text style={styles.submittedText}>Submitted</Text>
                </View>
              )}
              {isOverdue && !isSubmitted && (
                <View style={[styles.statusBadge, styles.overdueBadge]}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.overdueText}>Overdue</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function AssignmentsListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ClubsStackScreenProps<'AssignmentsList'>['navigation']>();
  const route = useRoute<ClubsStackScreenProps<'AssignmentsList'>['route']>();
  const { clubId } = route.params;
  const { user } = useAuthStore();

  const [selectedTab, setSelectedTab] = useState<Tab>('all');
  const [assignments, setAssignments] = useState<ClubAssignment[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newType, setNewType] = useState<'HOMEWORK' | 'QUIZ' | 'EXAM' | 'PROJECT'>('HOMEWORK');
  const [newMaxPoints, setNewMaxPoints] = useState('100');
  const [newDueDateText, setNewDueDateText] = useState(format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm'));
  const [publishNow, setPublishNow] = useState(false);

  const myMembership = useMemo(
    () => members.find((member) => member.userId === user?.id),
    [members, user?.id]
  );

  const canManageAssignments = Boolean(
    myMembership && MANAGER_ROLES.includes(myMembership.role)
  );

  const tabs = useMemo(() => {
    if (canManageAssignments) {
      return [
        { id: 'all' as const, label: 'All' },
        { id: 'published' as const, label: 'Published' },
        { id: 'draft' as const, label: 'Draft' },
        { id: 'review' as const, label: 'Review' },
      ];
    }

    return [
      { id: 'all' as const, label: t('assignments.list.tabs.all') },
      { id: 'active' as const, label: t('assignments.list.tabs.active') },
      { id: 'submitted' as const, label: t('assignments.list.tabs.submitted') },
      { id: 'graded' as const, label: t('assignments.list.tabs.graded') },
    ];
  }, [canManageAssignments, t]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === selectedTab)) {
      setSelectedTab('all');
    }
  }, [tabs, selectedTab]);

  const fetchAssignments = useCallback(async (forceMembers = false) => {
    try {
      setError(null);
      const [assignmentRows, memberRows] = await Promise.all([
        assignmentsApi.getClubAssignments(clubId),
        clubsApi.getClubMembers(clubId, forceMembers),
      ]);
      setAssignments(Array.isArray(assignmentRows) ? assignmentRows : []);
      setMembers(Array.isArray(memberRows) ? memberRows : []);
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignments(true);
  }, [fetchAssignments]);

  const filteredAssignments = useMemo(() => assignments.filter((assignment) => {
    if (selectedTab === 'all') return true;

    if (canManageAssignments) {
      switch (selectedTab) {
        case 'published':
          return assignment.status === 'PUBLISHED';
        case 'draft':
          return assignment.status === 'DRAFT';
        case 'review':
          return (assignment.submissionCount || 0) > 0;
        default:
          return true;
      }
    }

    const dueDate = new Date(assignment.dueDate);
    const hasSubmission = assignment.userSubmission != null;
    const isGraded = assignment.userSubmission?.status === 'GRADED';

    switch (selectedTab) {
      case 'active':
        return !hasSubmission && isFuture(dueDate);
      case 'submitted':
        return hasSubmission && !isGraded;
      case 'graded':
        return isGraded;
      default:
        return true;
    }
  }), [assignments, canManageAssignments, selectedTab]);

  const handleCardPress = useCallback(
    (assignmentId: string, cId: string) =>
      navigation.navigate('AssignmentDetail', { assignmentId, clubId: cId }),
    [navigation]
  );

  const renderAssignmentCard = useCallback(
    ({ item }: { item: ClubAssignment }) => (
      <AssignmentCard item={item} clubId={clubId} isManager={canManageAssignments} onPress={handleCardPress} />
    ),
    [clubId, canManageAssignments, handleCardPress]
  );

  const keyExtractor = useCallback((item: ClubAssignment) => item.id, []);

  const resetCreateForm = useCallback(() => {
    setNewTitle('');
    setNewDescription('');
    setNewInstructions('');
    setNewType('HOMEWORK');
    setNewMaxPoints('100');
    setNewDueDateText(format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm'));
    setPublishNow(false);
  }, []);

  const handleCreateAssignment = useCallback(async () => {
    if (!newTitle.trim()) {
      Alert.alert('Missing title', 'Please add an assignment title.');
      return;
    }

    const parsedDue = new Date(newDueDateText.replace(' ', 'T'));
    if (Number.isNaN(parsedDue.getTime())) {
      Alert.alert('Invalid due date', 'Use format YYYY-MM-DD HH:mm, for example 2026-04-20 17:30.');
      return;
    }

    const numericPoints = Number(newMaxPoints);
    if (!Number.isFinite(numericPoints) || numericPoints <= 0) {
      Alert.alert('Invalid points', 'Max points must be a number greater than 0.');
      return;
    }

    try {
      setCreating(true);
      await assignmentsApi.createAssignment({
        clubId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        instructions: newInstructions.trim() || undefined,
        type: newType,
        maxPoints: numericPoints,
        dueDate: parsedDue.toISOString(),
        status: publishNow ? 'PUBLISHED' : 'DRAFT',
      });

      setShowCreateModal(false);
      resetCreateForm();
      await fetchAssignments(true);
      Alert.alert('Assignment created', publishNow ? 'Assignment is published for students.' : 'Assignment saved as draft.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create assignment.');
    } finally {
      setCreating(false);
    }
  }, [clubId, fetchAssignments, newDescription, newDueDateText, newInstructions, newMaxPoints, newTitle, newType, publishNow, resetCreateForm]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('assignments.list.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('assignments.list.title')}</Text>
        {canManageAssignments ? (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <View style={styles.roleStrip}>
        <Ionicons name={canManageAssignments ? 'shield-checkmark-outline' : 'school-outline'} size={14} color={canManageAssignments ? '#0369A1' : '#6B7280'} />
        <Text style={styles.roleStripText}>
          You are viewing as {getRoleLabel(myMembership?.role)}
          {canManageAssignments ? ' · manager tools enabled' : ' · learner view'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorInline}>
          <Text style={styles.errorInlineText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAssignments}
        renderItem={renderAssignmentCard}
        keyExtractor={keyExtractor}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>{t('assignments.list.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>
              {canManageAssignments
                ? 'Create your first assignment draft or publish one for students.'
                : selectedTab === 'all'
                  ? t('assignments.list.empty.noCreated')
                  : t('assignments.list.empty.noSelected', { status: tabs.find((tab) => tab.id === selectedTab)?.label.toLowerCase() || '' })}
            </Text>
          </View>
        }
      />

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Assignment</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetCreateForm(); }}>
                <Ionicons name="close" size={24} color={Colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Assignment title"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {(['HOMEWORK', 'QUIZ', 'EXAM', 'PROJECT'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, newType === type && styles.typeBtnActive]}
                  onPress={() => setNewType(type)}
                >
                  <Text style={[styles.typeBtnText, newType === type && styles.typeBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional summary"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional instructions"
              value={newInstructions}
              onChangeText={setNewInstructions}
              multiline
            />

            <View style={styles.row}>
              <View style={styles.rowCol}>
                <Text style={styles.label}>Max points</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  value={newMaxPoints}
                  onChangeText={setNewMaxPoints}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.rowColWide}>
                <Text style={styles.label}>Due (YYYY-MM-DD HH:mm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-04-20 17:30"
                  value={newDueDateText}
                  onChangeText={setNewDueDateText}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setPublishNow((prev) => !prev)}
            >
              <Ionicons name={publishNow ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={publishNow ? '#10B981' : '#64748B'} />
              <Text style={styles.switchLabel}>Publish now (otherwise save as draft)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.postBtn, (!newTitle.trim() || creating) && styles.postBtnDisabled]}
              onPress={handleCreateAssignment}
              disabled={!newTitle.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.postBtnText}>{publishNow ? 'Create & Publish' : 'Create Draft'}</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  roleStripText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  errorInline: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  errorInlineText: {
    color: '#DC2626',
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#E0F2FE',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  subjectLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  managerStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  managerStatusDraft: {
    backgroundColor: '#FFF7ED',
  },
  managerStatusPublished: {
    backgroundColor: '#ECFEFF',
  },
  managerStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  managerStatusDraftText: {
    color: '#C2410C',
  },
  managerStatusPublishedText: {
    color: '#0369A1',
  },
  scoreContainer: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  cardBody: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  statusBar: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradedBadge: {},
  submittedBadge: {},
  overdueBadge: {},
  draftBadge: {},
  gradedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },
  submittedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  draftText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D97706',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  typeBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  typeBtnActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowCol: {
    flex: 1,
  },
  rowColWide: {
    flex: 2,
  },
  switchRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  postBtn: {
    marginTop: 14,
    backgroundColor: '#06A8CC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
  },
  postBtnDisabled: {
    opacity: 0.6,
  },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
