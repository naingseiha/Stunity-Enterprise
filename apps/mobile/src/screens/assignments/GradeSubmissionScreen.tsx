import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Grade Submission Screen (Instructor)
 * 
 * Grade a student's assignment submission
 * Enter score, provide feedback, and save
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Platform, Animated} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi } from '@/api';
import type { ClubAssignmentSubmission } from '@/api/assignments';
import type { ClubsStackScreenProps } from '@/navigation/types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';

export default function GradeSubmissionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ClubsStackScreenProps<'GradeSubmission'>['navigation']>();
  const route = useRoute<ClubsStackScreenProps<'GradeSubmission'>['route']>();
  const { submissionId, assignmentId, clubId } = route.params;
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
      if (__DEV__) { console.error('Failed to fetch submission:', err); }
      setError(err.message || t('assignments.grade.loadFailed'));
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
      Alert.alert(t('assignments.grade.missingScoreTitle'), t('assignments.grade.missingScoreBody'));
      return;
    }

    if (isNaN(scoreValue) || scoreValue < 0) {
      Alert.alert(t('assignments.grade.invalidScoreTitle'), t('assignments.grade.invalidScoreBody'));
      return;
    }

    if (scoreValue > maxPoints) {
      Alert.alert(
        t('assignments.grade.invalidScoreTitle'),
        t('assignments.grade.scoreExceedMax', { max: maxPoints })
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
        t('common.success'),
        t('assignments.grade.gradedSuccessfully'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      if (__DEV__) { console.error('Failed to save grade:', err); }
      Alert.alert(t('common.error'), err.message || t('assignments.grade.saveFailed'));
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
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('assignments.grade.header')}</Text>
      <TouchableOpacity 
        onPress={handleSaveGrade}
        style={styles.saveButton}
        disabled={saving || !score.trim()}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[
            styles.saveButtonText,
            (!score.trim()) && styles.saveButtonTextDisabled,
          ]}>
            {t('common.save')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const getStatusColor = (status: string, isLate: boolean): string => {
    if (status === 'GRADED') return colors.success;
    if (isLate) return colors.error;
    return colors.warning;
  };

  const getStatusText = (status: string, isLate: boolean) => {
    if (status === 'GRADED') return t('assignments.list.status.graded');
    if (isLate) return t('assignments.grade.late');
    return t('assignments.list.status.submitted');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !submission) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error || t('assignments.grade.submissionNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSubmission}>
            <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const studentName = submission.member?.user 
    ? `${submission.member.user.firstName} ${submission.member.user.lastName}`
    : t('assignments.grade.unknownStudent');

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
          <Animated.View style={styles.studentCard}>
            <View style={styles.studentHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{studentName}</Text>
                <Text style={styles.submittedTime}>
                  {t('assignments.grade.submittedAt', { date: format(new Date(submission.submittedAt), 'MMM d, h:mm a') })}
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
                <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.attemptText}>
                  {t('assignments.grade.attemptNumber', { count: submission.attemptNumber })}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Assignment Title */}
          <Animated.View style={styles.assignmentCard}>
            <Text style={styles.assignmentLabel}>{t('assignments.grade.assignment')}</Text>
            <Text style={styles.assignmentTitle}>{submission.assignment?.title}</Text>
          </Animated.View>

          {/* Submission Content */}
          <Animated.View style={styles.submissionCard}>
            <Text style={styles.sectionTitle}>{t('assignments.grade.studentsWork')}</Text>
            
            {submission.content ? (
              <View style={styles.contentBox}>
                <Text style={styles.contentText}>{submission.content}</Text>
              </View>
            ) : (
              <View style={styles.emptyContent}>
                <Ionicons name="document-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyContentText}>{t('assignments.grade.noTextContent')}</Text>
              </View>
            )}

            {/* Attachments */}
            {submission.attachments && submission.attachments.length > 0 && (
              <View style={styles.attachmentsSection}>
                <Text style={styles.attachmentsLabel}>
                  {t('learn.lessonViewer.attachments')} ({submission.attachments.length})
                </Text>
                {submission.attachments.map((attachment, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    <Ionicons name="document-attach" size={20} color={colors.primary} />
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachment.name}
                      </Text>
                      <Text style={styles.attachmentSize}>
                        {(attachment.size / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.viewButton}>
                      <Text style={styles.viewButtonText}>{t('common.view')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Grading Section */}
          <Animated.View style={styles.gradingCard}>
            <Text style={styles.sectionTitle}>{t('assignments.grade.grading')}</Text>

            {/* Score Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('classScreens.assignmentDetail.score')}</Text>
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
              <Text style={styles.inputLabel}>{t('assignments.grade.feedbackOptional')}</Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedback}
                onChangeText={setFeedback}
                placeholder={t('assignments.grade.feedbackPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!saving}
              />
              <Text style={styles.characterCount}>
                {feedback.length} <AutoI18nText i18nKey="auto.mobile.screens_assignments_GradeSubmissionScreen.k_35e031fc" />
              </Text>
            </View>
          </Animated.View>

          {/* Previously Graded Info */}
          {submission.status === 'GRADED' && submission.gradedBy && (
            <Animated.View style={styles.previousGradeCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.info} />
              <View style={styles.previousGradeInfo}>
                <Text style={styles.previousGradeText}>
                  <AutoI18nText i18nKey="auto.mobile.screens_assignments_GradeSubmissionScreen.k_abc8ee41" />{' '}
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
          <Animated.View style={styles.saveButtonContainer}>
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
                    {submission.status === 'GRADED' ? t('assignments.grade.updateGrade') : t('assignments.grade.saveGrade')}
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

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButtonTextDisabled: {
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    
    
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    shadowColor: isDark ? 'transparent' : '#000',
    
    shadowOpacity: 0.05,
    
    
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  submittedTime: {
    fontSize: 13,
    color: colors.textSecondary,
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
    borderTopColor: colors.border,
  },
  attemptText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  assignmentCard: {
    backgroundColor: colors.card,
    
    
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    shadowColor: isDark ? 'transparent' : '#000',
    
    shadowOpacity: 0.05,
    
    
  },
  assignmentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  submissionCard: {
    backgroundColor: colors.card,
    
    
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    shadowColor: isDark ? 'transparent' : '#000',
    
    shadowOpacity: 0.05,
    
    
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  contentBox: {
    backgroundColor: colors.surfaceVariant,
    padding: 16,
    borderRadius: 12,
    
    borderColor: colors.border,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyContentText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  attachmentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachmentsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surfaceVariant,
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
    color: colors.text,
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  gradingCard: {
    backgroundColor: colors.card,
    
    
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    shadowColor: isDark ? 'transparent' : '#000',
    
    shadowOpacity: 0.05,
    
    
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.primary,
    padding: 12,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: `${colors.primary}30`,
    textAlign: 'center',
  },
  maxPointsText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginTop: 8,
  },
  feedbackInput: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    padding: 16,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    
    borderColor: colors.border,
    minHeight: 140,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'right',
  },
  previousGradeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}10`,
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
    color: colors.text,
    lineHeight: 20,
  },
  previousGraderName: {
    fontWeight: '600',
    color: colors.info,
  },
  previousGradeTime: {
    fontSize: 12,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  saveButtonMobileText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
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
