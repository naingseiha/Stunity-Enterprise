/**
 * Assignment Detail Screen
 * 
 * View full assignment information, instructions, and submit work
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, isPast, isFuture, differenceInDays, differenceInHours } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi } from '@/api';
import type { ClubAssignment } from '@/api/assignments';
import type { ClubsStackScreenProps } from '@/navigation/types';
import { useAuthStore } from '@/stores/authStore';

export default function AssignmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClubsStackScreenProps<'AssignmentDetail'>['route']>();
  const { assignmentId, clubId } = route.params;
  const { user } = useAuthStore();

  const [assignment, setAssignment] = useState<ClubAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignment = useCallback(async () => {
    try {
      setError(null);
      const data = await assignmentsApi.getAssignmentById(assignmentId);
      setAssignment(data);
    } catch (err: any) {
      console.error('Failed to fetch assignment:', err);
      setError(err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignmentId]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignment</Text>
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
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.gray[300]} />
          <Text style={styles.errorText}>{error || 'Assignment not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAssignment}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
  const isInstructor = assignment.createdById === user?.id;
  
  const daysUntilDue = differenceInDays(dueDate, now);
  const hoursUntilDue = differenceInHours(dueDate, now);

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
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
        </TouchableOpacity>
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
        <Animated.View entering={FadeIn} style={styles.titleSection}>
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
        </Animated.View>

        {/* Submission Status */}
        {isSubmitted && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.statusCard}>
            {isGraded ? (
              <>
                <View style={styles.statusHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.statusTitle}>Graded</Text>
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
                    <Text style={styles.feedbackLabel}>Feedback:</Text>
                    <Text style={styles.feedbackText}>{assignment.userSubmission.feedback}</Text>
                  </View>
                )}
                {isLateSubmission && (
                  <View style={styles.lateWarning}>
                    <Ionicons name="time" size={14} color="#0EA5E9" />
                    <Text style={styles.lateWarningText}>Late submission</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.statusHeader}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#3B82F6" />
                  <Text style={[styles.statusTitle, { color: '#3B82F6' }]}>Submitted</Text>
                </View>
                <Text style={styles.statusDescription}>
                  Submitted on {format(new Date(assignment.userSubmission!.submittedAt), 'MMM d, yyyy \'at\' h:mm a')}
                </Text>
                <Text style={styles.statusDescription}>Waiting for grade...</Text>
              </>
            )}
          </Animated.View>
        )}

        {/* Due Date Warning */}
        {!isSubmitted && (
          <Animated.View entering={FadeInDown.delay(150)} style={[
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
                  Late submissions accepted until {format(lateDueDate!, 'MMM d, h:mm a')}
                  {assignment.latePenalty && ` (${assignment.latePenalty}% penalty per day)`}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Assignment Info */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Assignment Details</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="trophy-outline" size={18} color={Colors.gray[500]} />
              <View>
                <Text style={styles.infoLabel}>Points</Text>
                <Text style={styles.infoValue}>{assignment.maxPoints} pts</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="scale-outline" size={18} color={Colors.gray[500]} />
              <View>
                <Text style={styles.infoLabel}>Weight</Text>
                <Text style={styles.infoValue}>{(assignment.weight * 100).toFixed(0)}%</Text>
              </View>
            </View>
            
            {assignment.requireFile && (
              <View style={styles.infoItem}>
                <Ionicons name="attach-outline" size={18} color={Colors.gray[500]} />
                <View>
                  <Text style={styles.infoLabel}>Attachment</Text>
                  <Text style={styles.infoValue}>Required</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Description */}
        {assignment.description && (
          <Animated.View entering={FadeInDown.delay(250)} style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{assignment.description}</Text>
          </Animated.View>
        )}

        {/* Instructions */}
        {assignment.instructions && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.instructionsCard}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructionsText}>{assignment.instructions}</Text>
          </Animated.View>
        )}

        {/* Attachments */}
        {assignment.attachments && assignment.attachments.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350)} style={styles.attachmentsCard}>
            <Text style={styles.sectionTitle}>Attachments</Text>
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
        {/* Instructor View */}
        {isInstructor && (
          <TouchableOpacity
            style={styles.instructorButton}
            onPress={handleViewSubmissions}
          >
            <Ionicons name="documents-outline" size={20} color="white" />
            <Text style={styles.instructorButtonText}>
              View Submissions {assignment.submissionCount ? `(${assignment.submissionCount})` : ''}
            </Text>
          </TouchableOpacity>
        )}

        {/* Student View */}
        {!isInstructor && !isSubmitted && (isOverdue ? isLateAllowed : true) && (
          <TouchableOpacity
            style={[styles.submitButton, isOverdue && styles.submitButtonLate]}
            onPress={handleSubmit}
          >
            <Ionicons name="send" size={20} color="white" />
            <Text style={styles.submitButtonText}>
              {isOverdue ? 'Submit Late' : 'Submit Assignment'}
            </Text>
          </TouchableOpacity>
        )}
        
        {!isInstructor && isSubmitted && !isGraded && (
          <TouchableOpacity style={styles.viewSubmissionButton} onPress={handleSubmit}>
            <Ionicons name="eye-outline" size={20} color={Colors.primary} />
            <Text style={styles.viewSubmissionButtonText}>View My Submission</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
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
    backgroundColor: '#F0F9FF',
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
    backgroundColor: '#F9FAFB',
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
    shadowRadius: 8,
    elevation: 4,
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
