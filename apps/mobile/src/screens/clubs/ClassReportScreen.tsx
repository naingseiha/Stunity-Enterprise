import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { classesApi } from '@/api';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#06A8CC',
  primaryLight: '#E0F7FF',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  violet: '#8B5CF6',
  violetLight: '#F5F3FF',
};

type RouteParams = {
  classId: string;
  className?: string;
  myRole?: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | 'SCHOOL_ADMIN';
  linkedStudentId?: string;
};

const getCurrentMonthLabel = (): string => {
  const now = new Date();
  return `Month ${now.getMonth() + 1}`;
};

const getCurrentRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().split('T')[0];
  return { startDate: format(start), endDate: format(end) };
};

const metricValue = (value?: number | null, suffix = ''): string => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '--';
  return `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}${suffix}`;
};

export default function ClassReportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { classId, className, myRole, linkedStudentId } = (route.params || {}) as RouteParams;
  const monthLabel = useMemo(() => getCurrentMonthLabel(), []);
  const currentRange = useMemo(() => getCurrentRange(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<classesApi.ClassAttendanceSummary | null>(null);
  const [gradesReport, setGradesReport] = useState<classesApi.ClassGradesReport | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, unknown> | null>(null);

  const loadData = useCallback(async (force = false) => {
    if (!classId) {
      setError('Class not found');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const [attendance, grades, monthly] = await Promise.all([
        classesApi.getClassAttendanceSummary(classId, currentRange.startDate, currentRange.endDate),
        classesApi.getClassGradesReport(classId, { semester: 1 }),
        (myRole === 'STUDENT' || myRole === 'PARENT') && linkedStudentId
          ? classesApi.getStudentMonthlySummary(linkedStudentId, monthLabel)
          : Promise.resolve(null),
      ]);

      if (force) {
        classesApi.invalidateClassDetailBundleCache(classId);
      }

      setAttendanceSummary(attendance || null);
      setGradesReport(grades || null);
      setMonthlySummary(monthly || null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load class report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, currentRange.endDate, currentRange.startDate, linkedStudentId, monthLabel, myRole, refreshing]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const topStudents = useMemo(() => {
    return [...(gradesReport?.students || [])]
      .sort((a, b) => (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER))
      .slice(0, 5);
  }, [gradesReport?.students]);

  const attendanceRate = Number(attendanceSummary?.summary?.averageAttendanceRate || 0);
  const classAverage = Number(gradesReport?.statistics?.classAverage || 0);
  const passRate = Number(gradesReport?.statistics?.passRate || 0);
  const studentAverage = Number(monthlySummary?.average || 0);
  const studentRank = Number(monthlySummary?.classRank || 0);
  const studentGradeLevel = String(monthlySummary?.gradeLevel || '--');
  const reportTitle = className || gradesReport?.class?.name || attendanceSummary?.class?.name || 'Class Report';

  const roleLabel = myRole === 'PARENT' ? 'Child progress report' : myRole === 'STUDENT' ? 'Your performance snapshot' : 'Class performance overview';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={COLORS.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#0EA5E9', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <View style={styles.heroPill}>
                <Ionicons name="analytics-outline" size={12} color="#FFF" />
                <Text style={styles.heroPillText}>Live report</Text>
              </View>
              <Text style={styles.heroPeriod}>This month</Text>
            </View>
            <Text style={styles.heroTitle}>{reportTitle}</Text>
            <Text style={styles.heroSubtitle}>{roleLabel}</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="checkmark-done-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.metricValue}>{metricValue(attendanceRate, '%')}</Text>
              <Text style={styles.metricLabel}>Attendance Rate</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="bar-chart-outline" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.metricValue}>{metricValue(classAverage)}</Text>
              <Text style={styles.metricLabel}>Class Average</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="ribbon-outline" size={18} color={COLORS.warning} />
              </View>
              <Text style={styles.metricValue}>{metricValue(passRate, '%')}</Text>
              <Text style={styles.metricLabel}>Pass Rate</Text>
            </View>
          </View>

          {(myRole === 'STUDENT' || myRole === 'PARENT') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Student Snapshot</Text>
                <Ionicons name="person-circle-outline" size={20} color={COLORS.textMuted} />
              </View>
              <View style={styles.studentSnapshotRow}>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotValue}>{metricValue(studentAverage)}</Text>
                  <Text style={styles.snapshotLabel}>Average</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotValue}>{studentRank || '--'}</Text>
                  <Text style={styles.snapshotLabel}>Class Rank</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotValue}>{studentGradeLevel}</Text>
                  <Text style={styles.snapshotLabel}>Level</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Attendance Breakdown</Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
            </View>
            <View style={styles.listCard}>
              {[
                { label: 'Present', value: attendanceSummary?.totals?.present, color: COLORS.success },
                { label: 'Absent', value: attendanceSummary?.totals?.absent, color: COLORS.danger },
                { label: 'Late', value: attendanceSummary?.totals?.late, color: COLORS.warning },
                { label: 'Excused', value: attendanceSummary?.totals?.excused || attendanceSummary?.totals?.permission, color: COLORS.violet },
              ].map((item) => (
                <View key={item.label} style={styles.listRow}>
                  <View style={styles.listRowLeft}>
                    <View style={[styles.listDot, { backgroundColor: item.color }]} />
                    <Text style={styles.listLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.listValue}>{item.value ?? 0}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Performance</Text>
              <Ionicons name="trophy-outline" size={20} color={COLORS.textMuted} />
            </View>
            <View style={styles.listCard}>
              {topStudents.length === 0 ? (
                <Text style={styles.emptyText}>No ranked results are available yet.</Text>
              ) : (
                topStudents.map((student) => (
                  <View key={student.student.id} style={styles.rankRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>#{student.rank}</Text>
                    </View>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>
                        {student.student.firstName} {student.student.lastName}
                      </Text>
                      <Text style={styles.rankMeta}>
                        {student.student.studentId || 'No ID'} • {student.gradeLevel || 'N/A'}
                      </Text>
                    </View>
                    <Text style={styles.rankScore}>{metricValue(student.average)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSafe: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 18,
  },
  heroCard: {
    minHeight: 172,
    borderRadius: 28,
    overflow: 'hidden',
    padding: 22,
    justifyContent: 'space-between',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroPeriod: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 24,
  },
  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  studentSnapshotRow: {
    flexDirection: 'row',
    gap: 12,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  snapshotValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  snapshotLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  listLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rankBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rankMeta: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rankScore: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
