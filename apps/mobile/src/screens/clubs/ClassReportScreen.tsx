import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
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
import { useTranslation } from 'react-i18next';

import { classesApi, gradeApi } from '@/api';

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

const MONTHS = [
  'November', 'December', 'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August', 'September', 'October'
];
const MONTH_TO_NUMBER: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

const getCurrentMonthLabel = (): string => {
  return new Date().toLocaleString('default', { month: 'long' });
};
const resolveAcademicYearForMonth = (monthNumber: number, now = new Date()): number => {
  const currentMonthNumber = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const academicStartYear = currentMonthNumber >= 11 ? currentYear : currentYear - 1;
  return monthNumber >= 11 ? academicStartYear : academicStartYear + 1;
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
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { classId, className, myRole, linkedStudentId } = (route.params || {}) as RouteParams;
  const monthLabel = useMemo(() => getCurrentMonthLabel(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthLabel);
  const selectedMonthNumber = useMemo(() => MONTH_TO_NUMBER[selectedMonth] || 1, [selectedMonth]);
  const selectedAcademicYear = useMemo(() => resolveAcademicYearForMonth(selectedMonthNumber), [selectedMonthNumber]);
  const currentRange = useMemo(() => getCurrentRange(), []);
  const initialCachedAttendance = useMemo(
    () => (
      classId
        ? classesApi.getCachedClassAttendanceSummary(classId, currentRange.startDate, currentRange.endDate)
        : null
    ),
    [classId, currentRange.endDate, currentRange.startDate]
  );
  const initialCachedGrades = useMemo(
    () => (classId ? classesApi.getCachedClassGradesReport(classId, { semester: 1 }) : null),
    [classId]
  );
  const initialCachedBundle = useMemo(
    () => (classId ? classesApi.getLatestCachedClassDetailBundle(classId, { allowStale: true }) : null),
    [classId]
  );

  const [loading, setLoading] = useState(
    !(initialCachedAttendance || initialCachedGrades || initialCachedBundle?.monthlySummary)
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<classesApi.ClassAttendanceSummary | null>(initialCachedAttendance || null);
  const [gradesReport, setGradesReport] = useState<classesApi.ClassGradesReport | null>(initialCachedGrades || null);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, unknown> | null>(initialCachedBundle?.monthlySummary || null);
  const [studentMonthlyGrades, setStudentMonthlyGrades] = useState<any[]>([]);

  const loadData = useCallback(async (force = false) => {
    if (!classId) {
      setError(t('classScreens.report.notFound'));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!force) {
        const cachedAttendance = classesApi.getCachedClassAttendanceSummary(classId, currentRange.startDate, currentRange.endDate);
        const cachedGrades = classesApi.getCachedClassGradesReport(classId, { semester: 1 });
        const cachedBundle = classesApi.getLatestCachedClassDetailBundle(classId, { allowStale: true });

        if (cachedAttendance) setAttendanceSummary(cachedAttendance);
        if (cachedGrades) setGradesReport(cachedGrades);
        if (cachedBundle?.monthlySummary) setMonthlySummary(cachedBundle.monthlySummary);

        if (cachedAttendance || cachedGrades || cachedBundle?.monthlySummary) {
          setLoading(false);
        } else if (!refreshing) {
          setLoading(true);
        }
      } else if (!refreshing) {
        setLoading(true);
      }

      setError(null);

      const [attendance, grades, monthly] = await Promise.all([
        classesApi.getClassAttendanceSummary(classId, currentRange.startDate, currentRange.endDate, force),
        classesApi.getClassGradesReport(classId, { semester: 1 }, force),
        (myRole === 'STUDENT' || myRole === 'PARENT') && linkedStudentId
          ? classesApi.getStudentMonthlySummary(linkedStudentId, selectedMonth)
          : Promise.resolve(null),
      ]);

      setAttendanceSummary(attendance || null);
      setGradesReport(grades || null);
      setMonthlySummary(monthly || null);
    } catch (err: any) {
      setError(err?.message || t('classScreens.report.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, currentRange.endDate, currentRange.startDate, linkedStudentId, myRole, refreshing, selectedMonth, t]);

  const loadStudentMonthlyGrades = useCallback(async () => {
    if (!linkedStudentId || (myRole !== 'STUDENT' && myRole !== 'PARENT')) {
      setStudentMonthlyGrades([]);
      return;
    }
    try {
      const response = await gradeApi.get(`/grades/student/${linkedStudentId}`, {
        params: {
          month: selectedMonth,
          year: selectedAcademicYear,
        },
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      const classRows = classId ? rows.filter((row: any) => row.classId === classId || row.class?.id === classId) : rows;
      classRows.sort((a: any, b: any) => String(a.subject?.name || '').localeCompare(String(b.subject?.name || '')));
      setStudentMonthlyGrades(classRows);
    } catch {
      setStudentMonthlyGrades([]);
    }
  }, [classId, linkedStudentId, myRole, selectedAcademicYear, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    loadStudentMonthlyGrades();
  }, [loadStudentMonthlyGrades]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const topStudents = useMemo(() => {
    return [...(gradesReport?.students || [])]
      .sort((a, b) => (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER))
      .slice(0, 5);
  }, [gradesReport?.students]);
  const atRiskStudents = useMemo(() => {
    return [...(gradesReport?.students || [])]
      .filter((student) => Number(student.average || 0) < 50)
      .sort((a, b) => Number(a.average || 0) - Number(b.average || 0))
      .slice(0, 6);
  }, [gradesReport?.students]);
  const gradeDistribution = useMemo(() => {
    const buckets = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    (gradesReport?.students || []).forEach((student) => {
      const level = String(student.gradeLevel || 'F').toUpperCase();
      if (level in buckets) {
        buckets[level as keyof typeof buckets] += 1;
      } else {
        buckets.F += 1;
      }
    });
    return buckets;
  }, [gradesReport?.students]);
  const studentSubjectAverage = useMemo(() => {
    if (studentMonthlyGrades.length === 0) return 0;
    return studentMonthlyGrades.reduce((sum, row) => sum + Number(row.score || 0), 0) / studentMonthlyGrades.length;
  }, [studentMonthlyGrades]);

  const attendanceRate = Number(attendanceSummary?.summary?.averageAttendanceRate || 0);
  const classAverage = Number(gradesReport?.statistics?.classAverage || 0);
  const passRate = Number(gradesReport?.statistics?.passRate || 0);
  const studentAverage = Number(monthlySummary?.average || 0);
  const studentRank = Number(monthlySummary?.classRank || 0);
  const studentGradeLevel = String(monthlySummary?.gradeLevel || '--');
  const reportTitle = className || gradesReport?.class?.name || attendanceSummary?.class?.name || t('classScreens.report.defaultTitle');

  const roleLabel = myRole === 'PARENT' ? t('classScreens.report.role.parent') : myRole === 'STUDENT' ? t('classScreens.report.role.student') : t('classScreens.report.role.default');

  const handleShareReport = useCallback(async () => {
    const lines = [
      `${t('classScreens.report.header')} - ${reportTitle}`,
      `${t('classScreens.grades.academicMonth')}: ${selectedMonth} ${selectedAcademicYear}`,
      `${t('classScreens.report.metrics.attendanceRate')}: ${metricValue(attendanceRate, '%')}`,
      `${t('classScreens.report.metrics.classAverage')}: ${metricValue(classAverage)}`,
      `${t('classScreens.report.metrics.passRate')}: ${metricValue(passRate, '%')}`,
    ];

    if (myRole === 'STUDENT' || myRole === 'PARENT') {
      lines.push(`${t('classScreens.report.average')}: ${metricValue(studentMonthlyGrades.length ? studentSubjectAverage : studentAverage)}`);
      lines.push(`${t('classScreens.report.classRank')}: ${studentRank || '--'}`);
    }

    try {
      await Share.share({
        title: t('classScreens.report.shareTitle'),
        message: lines.join('\n'),
      });
    } catch {
      // User cancelled share intent.
    }
  }, [
    attendanceRate,
    classAverage,
    myRole,
    passRate,
    reportTitle,
    selectedAcademicYear,
    selectedMonth,
    studentAverage,
    studentMonthlyGrades.length,
    studentRank,
    studentSubjectAverage,
    t,
  ]);

  const handleExportCsv = useCallback(async () => {
    try {
      const csvLines: string[] = [];
      csvLines.push('metric,value');
      csvLines.push(`month,${selectedMonth} ${selectedAcademicYear}`);
      csvLines.push(`attendance_rate,${metricValue(attendanceRate, '%')}`);
      csvLines.push(`class_average,${metricValue(classAverage)}`);
      csvLines.push(`pass_rate,${metricValue(passRate, '%')}`);
      csvLines.push('');

      if (myRole === 'STUDENT' || myRole === 'PARENT') {
        csvLines.push('subject,code,score,max_score,percent');
        if (studentMonthlyGrades.length === 0) {
          csvLines.push('N/A,N/A,0,0,0');
        } else {
          studentMonthlyGrades.forEach((row) => {
            const subjectName = String(row.subject?.name || 'N/A').replace(/,/g, ' ');
            const code = String(row.subject?.code || 'N/A').replace(/,/g, ' ');
            const max = Number(row.maxScore || row.subject?.maxScore || 100);
            const score = Number(row.score || 0);
            const percent = max > 0 ? Math.round((score / max) * 100) : 0;
            csvLines.push(`${subjectName},${code},${score.toFixed(1)},${max},${percent}`);
          });
        }
      } else {
        csvLines.push('student_id,student_name,rank,average,grade_level');
        (gradesReport?.students || []).forEach((student) => {
          const name = `${student.student.firstName || ''} ${student.student.lastName || ''}`.trim().replace(/,/g, ' ');
          csvLines.push(`${student.student.studentId || 'N/A'},${name},${student.rank || ''},${Number(student.average || 0).toFixed(1)},${student.gradeLevel || 'N/A'}`);
        });
      }

      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      const fileName = `class-report-${classId}-${selectedAcademicYear}-${selectedMonthNumber}.csv`;
      const fileUri = `${FileSystem.cacheDirectory || ''}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvLines.join('\n'), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: t('classScreens.report.exportTitle'),
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert(t('common.info'), t('classScreens.report.exportUnavailable'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('classScreens.report.exportFailed'));
    }
  }, [
    attendanceRate,
    classAverage,
    classId,
    gradesReport?.students,
    myRole,
    passRate,
    selectedAcademicYear,
    selectedMonth,
    selectedMonthNumber,
    studentMonthlyGrades,
    t,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('classScreens.report.header')}</Text>
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
          <Text style={styles.loadingText}>{t('classScreens.report.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{t('classScreens.report.retry')}</Text>
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
                <Text style={styles.heroPillText}>{t('classScreens.report.liveReport')}</Text>
              </View>
              <Text style={styles.heroPeriod}>{selectedMonth}</Text>
            </View>
            <Text style={styles.heroTitle}>{reportTitle}</Text>
            <Text style={styles.heroSubtitle}>{roleLabel}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareReport}>
              <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>{t('classScreens.report.actions.share')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleExportCsv}>
              <Ionicons name="download-outline" size={16} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>{t('classScreens.report.actions.exportCsv')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('classScreens.grades.academicMonth')}</Text>
              <Ionicons name="calendar-clear-outline" size={20} color={COLORS.textMuted} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
              {MONTHS.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.monthChip, selectedMonth === month && styles.monthChipActive]}
                  onPress={() => setSelectedMonth(month)}
                >
                  <Text style={[styles.monthChipText, selectedMonth === month && styles.monthChipTextActive]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="checkmark-done-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.metricValue}>{metricValue(attendanceRate, '%')}</Text>
              <Text style={styles.metricLabel}>{t('classScreens.report.metrics.attendanceRate')}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="bar-chart-outline" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.metricValue}>{metricValue(classAverage)}</Text>
              <Text style={styles.metricLabel}>{t('classScreens.report.metrics.classAverage')}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="ribbon-outline" size={18} color={COLORS.warning} />
              </View>
              <Text style={styles.metricValue}>{metricValue(passRate, '%')}</Text>
              <Text style={styles.metricLabel}>{t('classScreens.report.metrics.passRate')}</Text>
            </View>
          </View>

          {(myRole === 'STUDENT' || myRole === 'PARENT') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('classScreens.report.studentSnapshot')}</Text>
                <Ionicons name="person-circle-outline" size={20} color={COLORS.textMuted} />
              </View>
              <View style={styles.studentSnapshotRow}>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotValue}>{metricValue(studentMonthlyGrades.length ? studentSubjectAverage : studentAverage)}</Text>
                  <Text style={styles.snapshotLabel}>{t('classScreens.report.average')}</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotValue}>{studentRank || '--'}</Text>
                  <Text style={styles.snapshotLabel}>{t('classScreens.report.classRank')}</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotValue}>{studentMonthlyGrades.length || studentGradeLevel}</Text>
                  <Text style={styles.snapshotLabel}>{t('classScreens.report.level')}</Text>
                </View>
              </View>

              <View style={styles.listCard}>
                {studentMonthlyGrades.length === 0 ? (
                  <Text style={styles.emptyText}>{t('classScreens.report.noRankedResults')}</Text>
                ) : (
                  studentMonthlyGrades.map((row) => {
                    const max = Number(row.maxScore || row.subject?.maxScore || 100);
                    const score = Number(row.score || 0);
                    const percent = max > 0 ? Math.round((score / max) * 100) : 0;
                    return (
                      <View key={row.id} style={styles.rankRow}>
                        <View style={styles.rankBadge}>
                          <Ionicons name="book-outline" size={14} color={COLORS.primary} />
                        </View>
                        <View style={styles.rankInfo}>
                          <Text style={styles.rankName}>{row.subject?.name || t('classScreens.grades.na')}</Text>
                          <Text style={styles.rankMeta}>{row.subject?.code || t('classScreens.grades.na')}</Text>
                        </View>
                        <Text style={styles.rankScore}>{score.toFixed(1)} / {max}</Text>
                        <Text style={[styles.rankMeta, { minWidth: 42, textAlign: 'right' }]}>{percent}%</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('classScreens.report.attendanceBreakdown')}</Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
            </View>
            <View style={styles.listCard}>
              {[
                { label: t('classScreens.report.attendance.present'), value: attendanceSummary?.totals?.present, color: COLORS.success },
                { label: t('classScreens.report.attendance.absent'), value: attendanceSummary?.totals?.absent, color: COLORS.danger },
                { label: t('classScreens.report.attendance.late'), value: attendanceSummary?.totals?.late, color: COLORS.warning },
                { label: t('classScreens.report.attendance.excused'), value: attendanceSummary?.totals?.excused || attendanceSummary?.totals?.permission, color: COLORS.violet },
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
              <Text style={styles.sectionTitle}>{t('classScreens.report.topPerformance')}</Text>
              <Ionicons name="trophy-outline" size={20} color={COLORS.textMuted} />
            </View>
            <View style={styles.listCard}>
              {topStudents.length === 0 ? (
                <Text style={styles.emptyText}>{t('classScreens.report.noRankedResults')}</Text>
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
                        {student.student.studentId || t('classScreens.report.noId')} • {student.gradeLevel || t('classScreens.report.na')}
                      </Text>
                    </View>
                    <Text style={styles.rankScore}>{metricValue(student.average)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('classScreens.report.gradeDistribution')}</Text>
              <Ionicons name="stats-chart-outline" size={20} color={COLORS.textMuted} />
            </View>
            <View style={styles.listCard}>
              {Object.entries(gradeDistribution).map(([level, count]) => (
                <View key={level} style={styles.listRow}>
                  <View style={styles.listRowLeft}>
                    <View style={[styles.listDot, { backgroundColor: level === 'F' ? COLORS.danger : COLORS.success }]} />
                    <Text style={styles.listLabel}>{t('classScreens.report.gradeLabel', { level })}</Text>
                  </View>
                  <Text style={styles.listValue}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('classScreens.report.interventionQueue')}</Text>
              <Ionicons name="medkit-outline" size={20} color={COLORS.textMuted} />
            </View>
            <View style={styles.listCard}>
              {atRiskStudents.length === 0 ? (
                <Text style={styles.emptyText}>{t('classScreens.report.noHighRiskStudents')}</Text>
              ) : (
                atRiskStudents.map((student) => (
                  <View key={student.student.id} style={styles.rankRow}>
                    <View style={[styles.rankBadge, { backgroundColor: COLORS.dangerLight }]}>
                      <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
                    </View>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>
                        {student.student.firstName} {student.student.lastName}
                      </Text>
                      <Text style={styles.rankMeta}>{student.student.studentId || t('classScreens.report.noId')}</Text>
                    </View>
                    <Text style={[styles.rankScore, { color: COLORS.danger }]}>{metricValue(student.average)}</Text>
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
  monthScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  monthChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  monthChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
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
