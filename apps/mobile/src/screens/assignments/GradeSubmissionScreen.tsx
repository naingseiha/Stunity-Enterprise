/**
 * Grade Submission Screen (Instructor)
 * 
 * Grade a student's assignment submission
 * Enter score, provide feedback, and save
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi } from '@/api';
import type { ClubAssignmentSubmission } from '@/api/assignments';
import type { ClubsStackScreenProps } from '@/navigation/types';

export default function GradeSubmissionScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClubsStackScreenProps<'GradeSubmission'>['route']>();
  const { submissionId, assignmentId, clubId } = route.params;

  const [submission, setSubmission] = useState<ClubAssignmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');

  const fetchSubmission = useCallback(async () => {
    try {
      setError(null);
      const data = await assignmentsApi.getSubmissionById(submissionId);
      setSubmission(data);
      
      // Pre-fill if already graded
      if (data.score !== undefined) {
        setScore(data.score.toString());
      }
      if (data.feedback) {
        setFeedback(data.feedback);
      }
    } catch (err: any) {
      console.error('Failed to fetch submission:', err);
      setError(err.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleSaveGrade = useCallback(async () => {
    if (!submission) return;

    // Validation
    const scoreValue = parseFloat(score);
    const maxPoints = submission.assignment?.maxPoints || 100;

    if (score.trim() === '') {
      Alert.alert('Missing Score', 'Please enter a score');
      return;
    }

    if (isNaN(scoreValue) || scoreValue < 0) {
      Alert.alert('Invalid Score', 'Score must be a positive number');
      return;
    }

    if (scoreValue > maxPoints) {
      Alert.alert(
        'Invalid Score', 
        `Score cannot exceed ${maxPoints} points`
      );
      return;
    }

    try {
      setSaving(true);
      
      await assignmentsApi.gradeSubmission(submissionId, {
        score: scoreValue,
        feedback: feedback.trim() || undefined,
      });

      Alert.alert(
        'Success',
        'Submission graded successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      console.error('Failed to save grade:', err);
      Alert.alert('Error', err.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  }, [submission, score, feedback, submissionId, navigation]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={styles.backButton}
        disabled={saving}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Grade Submission</Text>
      <TouchableOpacity 
        onPress={handleSaveGrade}
        style={styles.saveButton}
        disabled={saving || !score.trim()}
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={[
            styles.saveButtonText,
            (!score.trim()) && styles.saveButtonTextDisabled,
          ]}>
            Save
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const getStatusColor = (status: string, isLate: boolean) => {
    if (status === 'GRADED') return Colors.success;
    if (isLate) return Colors.error;
    return Colors.warning;
  };

  const getStatusText = (status: string, isLate: boolean) => {
    if (status === 'GRADED') return 'Graded';
    if (isLate) return 'Late';
    return 'Submitted';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !submission) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.gray[300]} />
          <Text style={styles.errorText}>{error || 'Submission not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSubmission}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const studentName = submission.member?.user 
    ? `${submission.member.user.firstName} ${submission.member.user.lastName}`
    : 'Unknown Student';

  const statusColor = getStatusColor(submission.status, submission.isLate);
  const statusText = getStatusText(submission.status, submission.isLate);
  const maxPoints = submission.assignment?.maxPoints || 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Student Info */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.studentCard}>
            <View style={styles.studentHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{studentName}</Text>
                <Text style={styles.submittedTime}>
                  Submitted {format(new Date(submission.submittedAt), 'MMM d, h:mm a')}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusText}
                </Text>
              </View>
            </View>

            {submission.attemptNumber > 1 && (
              <View style={styles.attemptBadge}>
                <Ionicons name="refresh-outline" size={14} color={Colors.gray[600]} />
                <Text style={styles.attemptText}>
                  Attempt {submission.attemptNumber}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Assignment Title */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.assignmentCard}>
            <Text style={styles.assignmentLabel}>Assignment</Text>
            <Text style={styles.assignmentTitle}>{submission.assignment?.title}</Text>
          </Animated.View>

          {/* Submission Content */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.submissionCard}>
            <Text style={styles.sectionTitle}>Student's Work</Text>
            
            {submission.content ? (
              <View style={styles.contentBox}>
                <Text style={styles.contentText}>{submission.content}</Text>
              </View>
            ) : (
              <View style={styles.emptyContent}>
                <Ionicons name="document-outline" size={32} color={Colors.gray[300]} />
                <Text style={styles.emptyContentText}>No text content</Text>
              </View>
            )}

            {/* Attachments */}
            {submission.attachments && submission.attachments.length > 0 && (
              <View style={styles.attachmentsSection}>
                <Text style={styles.attachmentsLabel}>
                  Attachments ({submission.attachments.length})
                </Text>
                {submission.attachments.map((attachment, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    <Ionicons name="document-attach" size={20} color={Colors.primary} />
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachment.name}
                      </Text>
                      <Text style={styles.attachmentSize}>
                        {(attachment.size / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.viewButton}>
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Grading Section */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.gradingCard}>
            <Text style={styles.sectionTitle}>Grading</Text>

            {/* Score Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Score</Text>
              <View style={styles.scoreInputRow}>
                <TextInput
                  style={styles.scoreInput}
                  value={score}
                  onChangeText={setScore}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  maxLength={6}
                  editable={!saving}
                />
                <Text style={styles.maxPointsText}>/ {maxPoints}</Text>
              </View>
              
              {/* Score percentage */}
              {score.trim() !== '' && !isNaN(parseFloat(score)) && (
                <Text style={styles.percentageText}>
                  {((parseFloat(score) / maxPoints) * 100).toFixed(1)}%
                </Text>
              )}
            </View>

            {/* Feedback Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Feedback (Optional)</Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Provide constructive feedback to help the student improve..."
                placeholderTextColor={Colors.gray[400]}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!saving}
              />
              <Text style={styles.characterCount}>
                {feedback.length} characters
              </Text>
            </View>
          </Animated.View>

          {/* Previously Graded Info */}
          {submission.status === 'GRADED' && submission.gradedBy && (
            <Animated.View entering={FadeInDown.delay(500)} style={styles.previousGradeCard}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
              <View style={styles.previousGradeInfo}>
                <Text style={styles.previousGradeText}>
                  Previously graded by{' '}
                  <Text style={styles.previousGraderName}>
                    {submission.gradedBy.firstName} {submission.gradedBy.lastName}
                  </Text>
                </Text>
                {submission.gradedAt && (
                  <Text style={styles.previousGradeTime}>
                    {format(new Date(submission.gradedAt), 'MMM d, yyyy \'at\' h:mm a')}
                  </Text>
                )}
              </View>
            </Animated.View>
          )}

          {/* Save Button (Mobile) */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButtonMobile,
                (!score.trim() || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveGrade}
              disabled={!score.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonMobileText}>
                    {submission.status === 'GRADED' ? 'Update Grade' : 'Save Grade'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButtonTextDisabled: {
    color: Colors.gray[400],
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  studentCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  submittedTime: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  attemptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  attemptText: {
    fontSize: 13,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  assignmentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  assignmentLabel: {
    fontSize: 12,
    color: Colors.gray[600],
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  submissionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  contentBox: {
    backgroundColor: Colors.gray[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.gray[900],
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyContentText: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 8,
  },
  attachmentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  attachmentsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    marginBottom: 8,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  gradingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreInput: {
    flex: 0,
    minWidth: 100,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    padding: 12,
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    textAlign: 'center',
  },
  maxPointsText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.gray[400],
    marginLeft: 8,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 8,
  },
  feedbackInput: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.gray[900],
    padding: 16,
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    minHeight: 140,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 6,
    textAlign: 'right',
  },
  previousGradeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '10',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  previousGradeInfo: {
    flex: 1,
  },
  previousGradeText: {
    fontSize: 14,
    color: Colors.gray[700],
    lineHeight: 20,
  },
  previousGraderName: {
    fontWeight: '600',
    color: Colors.info,
  },
  previousGradeTime: {
    fontSize: 12,
    color: Colors.gray[600],
    marginTop: 4,
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  saveButtonMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  saveButtonMobileText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
