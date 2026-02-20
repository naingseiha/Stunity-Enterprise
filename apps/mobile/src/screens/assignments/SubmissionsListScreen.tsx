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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi } from '@/api';
import type { ClubAssignmentSubmission, AssignmentStatistics } from '@/api/assignments';
import type { ClubsStackScreenProps } from '@/navigation/types';

type FilterTab = 'all' | 'submitted' | 'graded' | 'pending';

export default function SubmissionsListScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClubsStackScreenProps<'SubmissionsList'>['route']>();
  const { assignmentId, clubId } = route.params;

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
      console.error('Failed to fetch submissions:', err);
      setError(err.message || 'Failed to load submissions');
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
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Submissions</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderStatistics = () => {
    if (!statistics) return null;

    const submissionRate = statistics.totalStudents > 0 
      ? ((statistics.submittedCount / statistics.totalStudents) * 100).toFixed(0)
      : 0;

    return (
      <Animated.View entering={FadeInDown.delay(100)} style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.submittedCount}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.gradedCount}</Text>
            <Text style={styles.statLabel}>Graded</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{submissionRate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {statistics.averageScore ? statistics.averageScore.toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFilterTabs = () => {
    const tabs: { key: FilterTab; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: submissions.length },
      { 
        key: 'pending', 
        label: 'Pending', 
        count: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE').length 
      },
      { 
        key: 'graded', 
        label: 'Graded', 
        count: submissions.filter(s => s.status === 'GRADED').length 
      },
      { 
        key: 'submitted', 
        label: 'Late', 
        count: submissions.filter(s => s.status === 'LATE').length 
      },
    ];

    return (
      <Animated.View entering={FadeInDown.delay(200)} style={styles.filterContainer}>
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

  const renderSubmissionCard = (submission: ClubAssignmentSubmission, index: number) => {
    const studentName = submission.member?.user 
      ? `${submission.member.user.firstName} ${submission.member.user.lastName}`
      : 'Unknown Student';

    const statusColor = getStatusColor(submission.status, submission.isLate);
    const statusText = getStatusText(submission.status, submission.isLate);

    return (
      <Animated.View
        key={submission.id}
        entering={FadeInDown.delay(300 + index * 50)}
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
                Submitted {format(new Date(submission.submittedAt), 'MMM d, h:mm a')}
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
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.gradeText}>Grade</Text>
              </View>
            )}
          </View>

          {/* Attempt Number */}
          {submission.attemptNumber > 1 && (
            <View style={styles.attemptBadge}>
              <Ionicons name="refresh-outline" size={12} color={Colors.gray[600]} />
              <Text style={styles.attemptText}>Attempt {submission.attemptNumber}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View entering={FadeIn} style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={Colors.gray[300]} />
      <Text style={styles.emptyTitle}>No submissions yet</Text>
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
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.gray[300]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
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
    backgroundColor: '#fff',
    
    
    margin: 16,
    padding: 20,
    borderRadius: 14,
    shadowColor: '#000',
    
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
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.gray[200],
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
    backgroundColor: '#fff',
    marginRight: 10,
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: Colors.gray[100],
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
    color: Colors.gray[600],
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  submissionCard: {
    backgroundColor: '#fff',
    
    
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    
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
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  submittedTime: {
    fontSize: 13,
    color: Colors.gray[600],
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
    color: Colors.primary,
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[400],
    marginLeft: 2,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  attemptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  attemptText: {
    fontSize: 12,
    color: Colors.gray[600],
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
    color: Colors.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.gray[600],
    textAlign: 'center',
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
