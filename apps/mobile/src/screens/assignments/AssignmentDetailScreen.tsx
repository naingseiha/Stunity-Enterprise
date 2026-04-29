import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Assignment Detail Screen
 * 
 * View full assignment information, instructions, and submit work
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert, Animated} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation, useRoute } from '@react-navigation/native';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi, clubsApi } from '@/api';
import type { ClubAssignment } from '@/api/assignments';
import type { ClubMember } from '@/api/clubs';
import type { ClubsStackScreenProps } from '@/navigation/types';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

const MANAGER_ROLES: ClubMember['role'][] = ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'];
const PUBLISHER_ROLES: ClubMember['role'][] = ['OWNER', 'INSTRUCTOR'];

export default function AssignmentDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ClubsStackScreenProps<'AssignmentDetail'>['navigation']>();
  const route = useRoute<ClubsStackScreenProps<'AssignmentDetail'>['route']>();
  const { assignmentId, clubId } = route.params;
  const { user } = useAuthStore();

  const [assignment, setAssignment] = useState<ClubAssignment | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignment = useCallback(async () => {
    try {
      setError(null);
      const [assignmentResult, membersResult] = await Promise.allSettled([
        assignmentsApi.getAssignmentById(assignmentId),
        clubsApi.getClubMembers(clubId),
      ]);

      if (assignmentResult.status === 'rejected') {
        throw assignmentResult.reason;
      }

      setAssignment(assignmentResult.value);
      if (membersResult.status === 'fulfilled') {
        setMembers(Array.isArray(membersResult.value) ? membersResult.value : []);
      }
    } catch (err: any) {
      console.error('Failed to fetch assignment:', err);
      setError(err.message || t('classScreens.assignmentDetail.alertTitle'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignmentId, clubId]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignment();
  }, [fetchAssignment]);

  const handleSubmit = useCallback(() => {
    if (!assignment) return;
    navigation.navigate('SubmissionForm', { assignmentId, clubId });
  }, [assignment, assignmentId, clubId, navigation]);

  const handleViewSubmissions = useCallback(() => {
    if (!assignment) return;
    navigation.navigate('SubmissionsList', { assignmentId, clubId });
  }, [assignment, assignmentId, clubId, navigation]);

  const myMembership = useMemo(
    () => members.find((member) => member.userId === user?.id),
    [members, user?.id]
  );

  const canManageAssignments = Boolean(myMembership && MANAGER_ROLES.includes(myMembership.role));
  const canPublishAssignment = Boolean(myMembership && PUBLISHER_ROLES.includes(myMembership.role));
  const canDeleteAssignment = canPublishAssignment;

  const handlePublish = useCallback(async () => {
    if (!assignment || !canPublishAssignment) return;

    try {
      const updated = await assignmentsApi.publishAssignment(assignment.id);
      setAssignment(updated);
      Alert.alert(t('common.success'), t('classScreens.assignments.posted'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('classScreens.assignments.postFailed'));
    }
  }, [assignment, canPublishAssignment, t]);

  const handleDelete = useCallback(() => {
    if (!assignment || !canDeleteAssignment) return;

    Alert.alert(
      t('common.delete'),
      t('classScreens.assignmentDetail.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await assignmentsApi.deleteAssignment(assignment.id);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || t('classScreens.assignments.postFailed'));
            }
          },
        },
      ]
    );
  }, [assignment, canDeleteAssignment, navigation, t]);

  const handleMoreActions = useCallback(() => {
    if (!assignment || !canManageAssignments) return;

    const actions: Array<{ label: string; onPress: () => void; destructive?: boolean }> = [];

    if (canPublishAssignment && assignment.status === 'DRAFT') {
      actions.push({
        label: t('classScreens.assignments.postAssignment'),
        onPress: handlePublish,
      });
    }

    if (canDeleteAssignment) {
      actions.push({
        label: t('common.delete'),
        onPress: handleDelete,
        destructive: true,
      });
    }

    if (actions.length === 0) return;

    Alert.alert(
      t('classScreens.assignmentDetail.alertTitle'),
      t('classScreens.assignmentDetail.chooseAction'),
      [
        ...actions.map((action) => ({
          text: action.label,
          style: action.destructive ? 'destructive' as const : 'default' as const,
          onPress: action.onPress,
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  }, [assignment, canDeleteAssignment, canManageAssignments, canPublishAssignment, handleDelete, handlePublish, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('classScreens.assignmentDetail.classAssignment')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !assignment) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('classScreens.assignmentDetail.classAssignment')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.gray[300]} />
          <Text style={styles.errorText}>{error || t('classScreens.assignmentDetail.alertTitle')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAssignment}>
            <Text style={styles.retryButtonText}>{t('classScreens.report.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dueDate = new Date(assignment.dueDate);
  const lateDueDate = assignment.lateDeadline ? new Date(assignment.lateDeadline) : null;
  const now = new Date();
  
  const isOverdue = isPast(dueDate);
  const isLateAllowed = assignment.allowLateSubmission && lateDueDate && isFuture(lateDueDate);
  const isSubmitted = assignment.userSubmission != null;
  const isGraded = assignment.userSubmission?.status === 'GRADED';
  const isLateSubmission = assignment.userSubmission?.isLate || false;
  const isManager = canManageAssignments;
  const assignmentIsDraft = assignment.status === 'DRAFT';
  
  const daysUntilDue = differenceInDays(dueDate, now);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HOMEWORK': return 'document-text';
      case 'QUIZ': return 'help-circle';
      case 'EXAM': return 'school';
      case 'PROJECT': return 'rocket';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HOMEWORK': return '#3B82F6';
      case 'QUIZ': return '#8B5CF6';
      case 'EXAM': return '#EF4444';
      case 'PROJECT': return '#10B981';
      default: return Colors.primary;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('classScreens.assignmentDetail.classAssignment')}</Text>
        {isManager ? (
          <TouchableOpacity style={styles.moreButton} onPress={handleMoreActions}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Section */}
        <Animated.View style={styles.titleSection}>
          <View style={styles.typeHeader}>
            <View style={[styles.typeIconLarge, { backgroundColor: `${getTypeColor(assignment.type)}15` }]}>
              <Ionicons name={getTypeIcon(assignment.type) as any} size={32} color={getTypeColor(assignment.type)} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.typeLabel}>{getTypeLabel(assignment.type)}</Text>
              <Text style={styles.title}>{assignment.title}</Text>
            </View>
          </View>

          {assignment.subject && (
            <View style={styles.subjectBadge}>
              <Ionicons name="bookmark" size={14} color={Colors.primary} />
              <Text style={styles.subjectText}>{assignment.subject.name}</Text>
            </View>
          )}

          {myMembership ? (
            <View style={styles.roleInfoPill}>
              <Ionicons
                name={isManager ? 'shield-checkmark-outline' : 'school-outline'}
                size={14}
                color={isManager ? '#0369A1' : '#475569'}
              />
              <Text style={styles.roleInfoText}>
                {isManager ? `Manager view (${myMembership.role})` : `Learner view (${myMembership.role})`}
              </Text>
            </View>
          ) : null}

          {isManager ? (
            <View style={[styles.publishStatePill, assignmentIsDraft ? styles.publishStateDraft : styles.publishStatePublished]}>
              <Ionicons
                name={assignmentIsDraft ? 'eye-off-outline' : 'globe-outline'}
                size={14}
                color={assignmentIsDraft ? '#C2410C' : '#0369A1'}
              />
              <Text style={[styles.publishStateText, assignmentIsDraft ? styles.publishStateTextDraft : styles.publishStateTextPublished]}>
                {assignmentIsDraft ? t('assignments.detail.draftOnlyManagers') : t('assignments.detail.publishedStudentsSubmit')}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Submission Status */}
        {isSubmitted && (
          <Animated.View style={styles.statusCard}>
            {isGraded ? (
              <>
                <View style={styles.statusHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.statusTitle}>{t('assignments.list.status.graded')}</Text>
                </View>
                <View style={styles.scoreDisplay}>
                  <Text style={styles.scoreValue}>
                    {assignment.userSubmission?.score}/{assignment.maxPoints}
                  </Text>
                  <Text style={styles.scoreLabel}>
                    {Math.round((assignment.userSubmission?.score! / assignment.maxPoints) * 100)}%
                  </Text>
                </View>
                {assignment.userSubmission?.feedback && (
                  <View style={styles.feedbackSection}>
                    <Text style={styles.feedbackLabel}>{t('assignments.detail.feedbackLabel')}</Text>
                    <Text style={styles.feedbackText}>{assignment.userSubmission.feedback}</Text>
                  </View>
                )}
                {isLateSubmission && (
                  <View style={styles.lateWarning}>
                    <Ionicons name="time" size={14} color="#0EA5E9" />
                    <Text style={styles.lateWarningText}>{t('assignments.grade.late')}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.statusHeader}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#3B82F6" />
                  <Text style={[styles.statusTitle, { color: '#3B82F6' }]}>{t('assignments.list.status.submitted')}</Text>
                </View>
                <Text style={styles.statusDescription}>
                  <AutoI18nText i18nKey="auto.mobile.screens_assignments_AssignmentDetailScreen.k_04f89330" /> {format(new Date(assignment.userSubmission!.submittedAt), 'MMM d, yyyy \'at\' h:mm a')}
                </Text>
                <Text style={styles.statusDescription}>{t('assignments.detail.waitingForGrade')}</Text>
              </>
            )}
          </Animated.View>
        )}

        {/* Due Date Warning */}
        {!isManager && !isSubmitted && (
          <Animated.View style={[
            styles.dueDateCard,
            isOverdue && styles.dueDateCardOverdue,
            !isOverdue && daysUntilDue <= 2 && styles.dueDateCardSoon,
          ]}>
            <Ionicons 
              name={isOverdue ? "alert-circle" : "time-outline"} 
              size={20} 
              color={isOverdue ? "#EF4444" : daysUntilDue <= 2 ? "#0EA5E9" : "#6B7280"} 
            />
            <View style={styles.dueDateContent}>
              <Text style={[
                styles.dueDateText,
                isOverdue && styles.dueDateTextOverdue,
                !isOverdue && daysUntilDue <= 2 && styles.dueDateTextSoon,
              ]}>
                {isOverdue 
                  ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`
                  : daysUntilDue === 0
                  ? `Due today at ${format(dueDate, 'h:mm a')}`
                  : daysUntilDue === 1
                  ? `Due tomorrow at ${format(dueDate, 'h:mm a')}`
                  : `Due ${format(dueDate, 'MMM d, yyyy \'at\' h:mm a')}`
                }
              </Text>
              {isOverdue && isLateAllowed && (
                <Text style={styles.lateAllowedText}>
                  <AutoI18nText i18nKey="auto.mobile.screens_assignments_AssignmentDetailScreen.k_53a668b6" /> {format(lateDueDate!, 'MMM d, h:mm a')}
                  {assignment.latePenalty && ` (${assignment.latePenalty}% penalty per day)`}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Assignment Info */}
        <Animated.View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{t('assignments.detail.assignmentDetails')}</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="trophy-outline" size={18} color={Colors.gray[500]} />
              <View>
                <Text style={styles.infoLabel}>{t('assignments.detail.points')}</Text>
                <Text style={styles.infoValue}>{assignment.maxPoints} <AutoI18nText i18nKey="auto.mobile.screens_assignments_AssignmentDetailScreen.k_1b30bf0a" /></Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="scale-outline" size={18} color={Colors.gray[500]} />
              <View>
                <Text style={styles.infoLabel}>{t('assignments.detail.weight')}</Text>
                <Text style={styles.infoValue}>{(assignment.weight * 100).toFixed(0)}%</Text>
              </View>
            </View>
            
            {assignment.requireFile && (
              <View style={styles.infoItem}>
                <Ionicons name="attach-outline" size={18} color={Colors.gray[500]} />
                <View>
                  <Text style={styles.infoLabel}>{t('assignments.detail.attachment')}</Text>
                  <Text style={styles.infoValue}>{t('assignments.detail.required')}</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Description */}
        {assignment.description && (
          <Animated.View style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>{t('learn.createCourse.description')}</Text>
            <Text style={styles.descriptionText}>{assignment.description}</Text>
          </Animated.View>
        )}

        {/* Instructions */}
        {assignment.instructions && (
          <Animated.View style={styles.instructionsCard}>
            <Text style={styles.sectionTitle}>{t('classScreens.assignments.instructions')}</Text>
            <Text style={styles.instructionsText}>{assignment.instructions}</Text>
          </Animated.View>
        )}

        {/* Attachments */}
        {assignment.attachments && assignment.attachments.length > 0 && (
          <Animated.View style={styles.attachmentsCard}>
            <Text style={styles.sectionTitle}>{t('learn.lessonViewer.attachments')}</Text>
            {assignment.attachments.map((attachment, index) => (
              <TouchableOpacity key={index} style={styles.attachmentItem}>
                <Ionicons name="document-attach" size={20} color={Colors.primary} />
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Ionicons name="download-outline" size={20} color={Colors.gray[400]} />
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {isManager ? (
          <View style={styles.managerActionGroup}>
            <TouchableOpacity
              style={styles.instructorButton}
              onPress={handleViewSubmissions}
            >
              <Ionicons name="documents-outline" size={20} color="white" />
              <Text style={styles.instructorButtonText}>
                <AutoI18nText i18nKey="auto.mobile.screens_assignments_AssignmentDetailScreen.k_212c6a9a" /> {assignment.submissionCount ? `(${assignment.submissionCount})` : ''}
              </Text>
            </TouchableOpacity>

            {canPublishAssignment && assignmentIsDraft ? (
              <TouchableOpacity style={styles.managerSecondaryButton} onPress={handlePublish}>
                <Ionicons name="megaphone-outline" size={18} color="#0EA5E9" />
                <Text style={styles.managerSecondaryButtonText}>{t('classScreens.assignments.postAssignment')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {!isManager && !isSubmitted && (isOverdue ? isLateAllowed : true) && (
          <TouchableOpacity
            style={[styles.submitButton, isOverdue && styles.submitButtonLate]}
            onPress={handleSubmit}
          >
            <Ionicons name="send" size={20} color="white" />
            <Text style={styles.submitButtonText}>
              {isOverdue ? t('assignments.detail.submitLate') : t('learn.lessonViewer.submitAssignment')}
            </Text>
          </TouchableOpacity>
        )}
        
        {!isManager && isSubmitted && !isGraded && (
          <TouchableOpacity style={styles.viewSubmissionButton} onPress={handleSubmit}>
            <Ionicons name="eye-outline" size={20} color={Colors.primary} />
            <Text style={styles.viewSubmissionButtonText}>{t('assignments.detail.viewMySubmission')}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  moreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  titleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  typeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    gap: 6,
  },
  subjectText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0EA5E9',
  },
  roleInfoPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleInfoText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  publishStatePill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  publishStateDraft: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  publishStatePublished: {
    backgroundColor: '#ECFEFF',
    borderColor: '#67E8F9',
  },
  publishStateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  publishStateTextDraft: {
    color: '#C2410C',
  },
  publishStateTextPublished: {
    color: '#0369A1',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  feedbackSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  lateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  lateWarningText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0EA5E9',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dueDateCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dueDateCardOverdue: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dueDateCardSoon: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  dueDateContent: {
    flex: 1,
  },
  dueDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dueDateTextOverdue: {
    color: '#EF4444',
  },
  dueDateTextSoon: {
    color: '#0EA5E9',
  },
  lateAllowedText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  attachmentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  managerActionGroup: {
    gap: 10,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonLate: {
    backgroundColor: '#0EA5E9',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  instructorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  managerSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#0EA5E9',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
  },
  managerSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  viewSubmissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0EA5E9',
    gap: 8,
  },
  viewSubmissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0EA5E9',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
