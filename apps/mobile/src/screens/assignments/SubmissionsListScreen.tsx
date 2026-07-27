import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Submissions List Screen (Instructor View)
 * 
 * View all student submissions for an assignment
 * Filter by status (All, Submitted, Graded, Pending)
 * Grade submissions directly
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
  Alert, Animated} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi } from '@/api';
import type { ClubAssignmentSubmission, AssignmentStatistics } from '@/api/assignments';
import type { ClubsStackScreenProps } from '@/navigation/types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';

type FilterTab = 'all' | 'submitted' | 'graded' | 'pending';

export default function SubmissionsListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ClubsStackScreenProps<'SubmissionsList'>['navigation']>();
  const route = useRoute<ClubsStackScreenProps<'SubmissionsList'>['route']>();
  const { assignmentId, clubId } = route.params;
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [submissions, setSubmissions] = useState<ClubAssignmentSubmission[]>([]);
  const [statistics, setStatistics] = useState<AssignmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [submissionsData, statsData] = await Promise.all([
        assignmentsApi.getAssignmentSubmissions(assignmentId),
        assignmentsApi.getAssignmentStatistics(assignmentId),
      ]);
      setSubmissions(submissionsData);
      setStatistics(statsData);
    } catch (err: any) {
      if (__DEV__) { console.error('Failed to fetch submissions:', err); }
      setError(err.message || t('assignments.submissions.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleGradeSubmission = useCallback((submissionId: string) => {
    navigation.navigate('GradeSubmission', { 
      submissionId, 
      assignmentId, 
      clubId 
    });
  }, [assignmentId, clubId, navigation]);

  // Filter submissions based on active tab
  const filteredSubmissions = submissions.filter((submission) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'submitted') return submission.status === 'SUBMITTED' || submission.status === 'LATE';
    if (activeTab === 'graded') return submission.status === 'GRADED';
    if (activeTab === 'pending') return submission.status === 'SUBMITTED' || submission.status === 'LATE';
    return true;
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('assignments.submissions.header')}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderStatistics = () => {
    if (!statistics) return null;

    const submissionRate = statistics.totalStudents > 0 
      ? ((statistics.submittedCount / statistics.totalStudents) * 100).toFixed(0)
      : 0;

    return (
      <Animated.View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.submittedCount}</Text>
            <Text style={styles.statLabel}>{t('assignments.list.status.submitted')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.gradedCount}</Text>
            <Text style={styles.statLabel}>{t('assignments.list.status.graded')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{submissionRate}%</Text>
            <Text style={styles.statLabel}>{t('assignments.submissions.rate')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {statistics.averageScore ? statistics.averageScore.toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>{t('assignments.submissions.avgScore')}</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFilterTabs = () => {
    const tabs: { key: FilterTab; label: string; count: number }[] = [
      { key: 'all', label: t('assignments.list.tabs.all'), count: submissions.length },
      { 
        key: 'pending', 
        label: t('classScreens.assignments.pending'),
        count: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE').length 
      },
      { 
        key: 'graded', 
        label: t('assignments.list.tabs.graded'),
        count: submissions.filter(s => s.status === 'GRADED').length 
      },
      { 
        key: 'submitted', 
        label: t('assignments.grade.late'),
        count: submissions.filter(s => s.status === 'LATE').length 
      },
    ];

    return (
      <Animated.View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                activeTab === tab.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.filterTabText,
                activeTab === tab.key && styles.filterTabTextActive,
              ]}>
                {tab.label}
              </Text>
              <View style={[
                styles.filterBadge,
                activeTab === tab.key && styles.filterBadgeActive,
              ]}>
                <Text style={[
                  styles.filterBadgeText,
                  activeTab === tab.key && styles.filterBadgeTextActive,
                ]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

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

  const renderSubmissionCard = (submission: ClubAssignmentSubmission, index: number) => {
    const studentName = submission.member?.user 
      ? `${submission.member.user.firstName} ${submission.member.user.lastName}`
    : t('assignments.grade.unknownStudent');

    const statusColor = getStatusColor(submission.status, submission.isLate);
    const statusText = getStatusText(submission.status, submission.isLate);

    return (
      <Animated.View
        key={submission.id}
      >
        <TouchableOpacity
          style={styles.submissionCard}
          onPress={() => handleGradeSubmission(submission.id)}
          activeOpacity={0.7}
        >
          {/* Student Info */}
          <View style={styles.studentInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{studentName}</Text>
              <Text style={styles.submittedTime}>
                {t('assignments.grade.submittedAt', { date: format(new Date(submission.submittedAt), 'MMM d, h:mm a') })}
              </Text>
            </View>
          </View>

          {/* Status and Score */}
          <View style={styles.submissionMeta}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>

            {submission.status === 'GRADED' && submission.score !== undefined && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{submission.score}</Text>
                <Text style={styles.scoreMax}>/{submission.assignment?.maxPoints || 100}</Text>
              </View>
            )}

            {submission.status !== 'GRADED' && (
              <View style={styles.gradeBadge}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={styles.gradeText}>{t('assignments.submissions.grade')}</Text>
              </View>
            )}
          </View>

          {/* Attempt Number */}
          {submission.attemptNumber > 1 && (
            <View style={styles.attemptBadge}>
              <Ionicons name="refresh-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.attemptText}><AutoI18nText i18nKey="auto.mobile.screens_assignments_SubmissionsListScreen.k_a72973d6" /> {submission.attemptNumber}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>{t('assignments.submissions.empty')}</Text>
      <Text style={styles.emptyMessage}>
        {activeTab === 'all' 
          ? 'Students haven\'t submitted this assignment yet'
          : `No ${activeTab} submissions`}
      </Text>
    </Animated.View>
  );

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

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderStatistics()}
        {renderFilterTabs()}

        <View style={styles.listContainer}>
          {filteredSubmissions.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredSubmissions.map((submission, index) => 
              renderSubmissionCard(submission, index)
            )
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statsCard: {
    backgroundColor: colors.card,
    
    
    margin: 16,
    padding: 20,
    borderRadius: 14,
    shadowColor: isDark ? 'transparent' : '#000',
    
    shadowOpacity: 0.05,
    
    
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.card,
    marginRight: 10,
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  submissionCard: {
    backgroundColor: colors.card,
    
    
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: isDark ? 'transparent' : '#000',
    
    shadowOpacity: 0.05,
    
    
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  submittedTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  submissionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 2,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  attemptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attemptText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
