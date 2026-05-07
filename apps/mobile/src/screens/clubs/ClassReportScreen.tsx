import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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

/** English month names (calendar order) — must match MONTHS labeling for API payloads. */
const CALENDAR_MONTHS_ENGLISH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const resolveAcademicYearForMonth = (monthNumber: number, now = new Date()): number => {
  const currentMonthNumber = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const academicStartYear = currentMonthNumber >= 11 ? currentYear : currentYear - 1;
  return monthNumber >= 11 ? academicStartYear : academicStartYear + 1;
};

const formatLocalDateYmd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Gregorian bounds for attendance summary; `calendarYear` is the Grade.year / academic alignment year for that month. */
const attendanceRangeForMonth = (monthNumber: number, calendarYear: number) => {
  const start = new Date(calendarYear, monthNumber - 1, 1);
  const end = new Date(calendarYear, monthNumber, 0);
  return { startDate: formatLocalDateYmd(start), endDate: formatLocalDateYmd(end) };
};

const metricValue = (value?: number | null, suffix = ''): string => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '--';
  return `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}${suffix}`;
};

type ReportMonthContext = {
  month: string;
  monthNumber: number;
  academicYear: number;
  attendanceRange: { startDate: string; endDate: string };
  gradesReportOpts: { semester: 1; month: string; monthNumber: number; gradeYear: number };
  cacheKey: string;
};

const getReportMonthContext = (month: string): ReportMonthContext => {
  const monthNumber = MONTH_TO_NUMBER[month] || 1;
  const academicYear = resolveAcademicYearForMonth(monthNumber);

  return {
    month,
    monthNumber,
    academicYear,
    attendanceRange: attendanceRangeForMonth(monthNumber, academicYear),
    gradesReportOpts: {
      semester: 1,
      month,
      monthNumber,
      gradeYear: academicYear,
    },
    cacheKey: `${academicYear}:${monthNumber}:${month}`,
  };
};

const STUDENT_MONTHLY_GRADES_CACHE_TTL = 60_000;
const studentMonthlyGradesCache = new Map<string, { data: any[]; ts: number }>();
const studentMonthlyGradesInFlight = new Map<string, Promise<any[]>>();

const getStudentMonthlyGradesCacheKey = (
  classId: string,
  studentId: string,
  month: string,
  monthNumber: number,
  academicYear: number
) => `${classId}:${studentId}:${academicYear}:${monthNumber}:${month}`;

const getCachedStudentMonthlyGrades = (
  classId: string,
  studentId: string,
  month: string,
  monthNumber: number,
  academicYear: number
) => {
  const cached = studentMonthlyGradesCache.get(
    getStudentMonthlyGradesCacheKey(classId, studentId, month, monthNumber, academicYear)
  );

  if (!cached) return null;
  if (Date.now() - cached.ts >= STUDENT_MONTHLY_GRADES_CACHE_TTL) {
    studentMonthlyGradesCache.delete(
      getStudentMonthlyGradesCacheKey(classId, studentId, month, monthNumber, academicYear)
    );
    return null;
  }

  return cached.data;
};

const fetchStudentMonthlyGrades = async (
  classId: string,
  studentId: string,
  month: string,
  monthNumber: number,
  academicYear: number,
  force = false
): Promise<any[]> => {
  const cacheKey = getStudentMonthlyGradesCacheKey(classId, studentId, month, monthNumber, academicYear);

  if (!force) {
    const cached = getCachedStudentMonthlyGrades(classId, studentId, month, monthNumber, academicYear);
    if (cached) return cached;

    const inFlight = studentMonthlyGradesInFlight.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const request = gradeApi.get(`/grades/student/${studentId}`, {
    params: {
      classId,
      month,
      monthNumber,
      year: academicYear,
    },
  }).then((response) => {
    const rows = Array.isArray(response.data) ? response.data : [];
    const classRows = rows
      .filter((row: any) => row.classId === classId || row.class?.id === classId)
      .sort((a: any, b: any) => String(a.subject?.name || '').localeCompare(String(b.subject?.name || '')));

    studentMonthlyGradesCache.set(cacheKey, {
      data: classRows,
      ts: Date.now(),
    });

    return classRows;
  }).finally(() => {
    studentMonthlyGradesInFlight.delete(cacheKey);
  });

  studentMonthlyGradesInFlight.set(cacheKey, request);
  return request;
};

export default function ClassReportScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { classId, className, myRole, linkedStudentId } = (route.params || {}) as RouteParams;
  const calendarMonthEnglish = CALENDAR_MONTHS_ENGLISH[new Date().getMonth()];
  const initialMonthChip = MONTHS.includes(calendarMonthEnglish) ? calendarMonthEnglish : MONTHS[0];
  const [selectedMonth, setSelectedMonth] = useState(initialMonthChip);
  const selectedMonthContext = useMemo(() => getReportMonthContext(selectedMonth), [selectedMonth]);
  const selectedMonthNumber = selectedMonthContext.monthNumber;
  const selectedAcademicYear = selectedMonthContext.academicYear;
  const gradesReportOpts = selectedMonthContext.gradesReportOpts;
  const selectedAttendanceRange = selectedMonthContext.attendanceRange;
  const initialCachedAttendance = useMemo(
    () => (
      classId
        ? classesApi.getCachedClassAttendanceSummary(
            classId,
            selectedAttendanceRange.startDate,
            selectedAttendanceRange.endDate
          )
        : null
    ),
    [classId, selectedAttendanceRange.endDate, selectedAttendanceRange.startDate]
  );
  const initialCachedGrades = useMemo(
    () => (classId ? classesApi.getCachedClassGradesReport(classId, gradesReportOpts) : null),
    [classId, gradesReportOpts]
  );
  const initialCachedBundle = useMemo(
    () => (classId ? classesApi.getLatestCachedClassDetailBundle(classId, { allowStale: true }) : null),
    [classId]
  );

  const [loading, setLoading] = useState(
    !(initialCachedAttendance || initialCachedGrades || initialCachedBundle?.monthlySummary)
  );
  const [refreshing, setRefreshing] = useState(false);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [studentGradesLoading, setStudentGradesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<classesApi.ClassAttendanceSummary | null>(initialCachedAttendance || null);
  const [gradesReport, setGradesReport] = useState<classesApi.ClassGradesReport | null>(initialCachedGrades || null);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, unknown> | null>(initialCachedBundle?.monthlySummary || null);
  const [studentMonthlyGrades, setStudentMonthlyGrades] = useState<any[]>([]);
  const activeReportRequestRef = useRef(0);
  const activeStudentGradesRequestRef = useRef(0);
  const prefetchedMonthKeysRef = useRef(new Set<string>());
  const hasVisibleReportRef = useRef(
    Boolean(initialCachedAttendance || initialCachedGrades || initialCachedBundle?.monthlySummary)
  );

  const prefetchNearbyMonths = useCallback((baseMonth: string) => {
    if (!classId) return;

    const baseIndex = MONTHS.indexOf(baseMonth);
    if (baseIndex === -1) return;

    const candidateMonths = [
      MONTHS[baseIndex - 1],
      MONTHS[baseIndex + 1],
    ].filter(Boolean);

    candidateMonths.forEach((month) => {
      const context = getReportMonthContext(month);
      const prefetchKey = `${classId}:${context.cacheKey}:${linkedStudentId || 'class'}`;
      if (prefetchedMonthKeysRef.current.has(prefetchKey)) return;

      prefetchedMonthKeysRef.current.add(prefetchKey);

      setTimeout(() => {
        const tasks: Promise<unknown>[] = [
          classesApi.getClassAttendanceSummary(
            classId,
            context.attendanceRange.startDate,
            context.attendanceRange.endDate,
            false
          ),
          classesApi.getClassGradesReport(classId, context.gradesReportOpts, false),
        ];

        if ((myRole === 'STUDENT' || myRole === 'PARENT') && linkedStudentId) {
          tasks.push(
            classesApi.getStudentMonthlySummary(
              linkedStudentId,
              context.month,
              context.academicYear,
              context.monthNumber,
              classId
            ),
            fetchStudentMonthlyGrades(
              classId,
              linkedStudentId,
              context.month,
              context.monthNumber,
              context.academicYear,
              false
            )
          );
        }

        void Promise.allSettled(tasks);
      }, 250);
    });
  }, [classId, linkedStudentId, myRole]);

  const loadData = useCallback(async (force = false) => {
    if (!classId) {
      setError(t('classScreens.report.notFound'));
      setLoading(false);
      setRefreshing(false);
      setPeriodLoading(false);
      return;
    }

    const requestId = activeReportRequestRef.current + 1;
    activeReportRequestRef.current = requestId;

    try {
      const canRenderStaleReport = hasVisibleReportRef.current;

      if (!force) {
        const cachedAttendance = classesApi.getCachedClassAttendanceSummary(
          classId,
          selectedAttendanceRange.startDate,
          selectedAttendanceRange.endDate
        );
        const cachedGrades = classesApi.getCachedClassGradesReport(classId, gradesReportOpts);
        const hasCompleteCachedPeriodData = Boolean(cachedAttendance && cachedGrades);

        if (!cachedGrades && !canRenderStaleReport) {
          setGradesReport(null);
        }
        if (cachedAttendance) setAttendanceSummary(cachedAttendance);
        if (cachedGrades) setGradesReport(cachedGrades);

        if (hasCompleteCachedPeriodData) {
          hasVisibleReportRef.current = true;
          setLoading(false);
          setPeriodLoading(false);
        } else if (canRenderStaleReport) {
          setLoading(false);
          setPeriodLoading(true);
        } else {
          setLoading(true);
          setPeriodLoading(false);
        }
      } else if (canRenderStaleReport) {
        setLoading(false);
        setPeriodLoading(true);
      } else {
        setLoading(true);
        setPeriodLoading(false);
      }

      setError(null);

      const [attendance, grades, monthly] = await Promise.all([
        classesApi.getClassAttendanceSummary(
          classId,
          selectedAttendanceRange.startDate,
          selectedAttendanceRange.endDate,
          force
        ),
        classesApi.getClassGradesReport(classId, gradesReportOpts, force),
        (myRole === 'STUDENT' || myRole === 'PARENT') && linkedStudentId
          ? classesApi.getStudentMonthlySummary(
              linkedStudentId,
              selectedMonth,
              selectedAcademicYear,
              selectedMonthNumber,
              classId,
              force
            )
          : Promise.resolve(null),
      ]);

      if (activeReportRequestRef.current !== requestId) return;

      setAttendanceSummary(attendance || null);
      setGradesReport(grades || null);
      setMonthlySummary(monthly || null);
      hasVisibleReportRef.current = true;
      prefetchNearbyMonths(selectedMonth);
    } catch (err: any) {
      if (activeReportRequestRef.current === requestId && !hasVisibleReportRef.current) {
        setError(err?.message || t('classScreens.report.loadFailed'));
      }
    } finally {
      if (activeReportRequestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
        setPeriodLoading(false);
      }
    }
  }, [
    classId,
    gradesReportOpts,
    linkedStudentId,
    myRole,
    prefetchNearbyMonths,
    selectedAcademicYear,
    selectedAttendanceRange.endDate,
    selectedAttendanceRange.startDate,
    selectedMonth,
    selectedMonthNumber,
    t,
  ]);

  const loadStudentMonthlyGrades = useCallback(async (force = false) => {
    if (!linkedStudentId || (myRole !== 'STUDENT' && myRole !== 'PARENT')) {
      setStudentMonthlyGrades([]);
      setStudentGradesLoading(false);
      return;
    }

    const requestId = activeStudentGradesRequestRef.current + 1;
    activeStudentGradesRequestRef.current = requestId;

    try {
      const cachedRows = getCachedStudentMonthlyGrades(
        classId,
        linkedStudentId,
        selectedMonth,
        selectedMonthNumber,
        selectedAcademicYear
      );

      if (cachedRows) {
        setStudentMonthlyGrades(cachedRows);
        setStudentGradesLoading(false);
      } else if (hasVisibleReportRef.current) {
        setStudentGradesLoading(true);
      }

      const classRows = await fetchStudentMonthlyGrades(
        classId,
        linkedStudentId,
        selectedMonth,
        selectedMonthNumber,
        selectedAcademicYear,
        force
      );

      if (activeStudentGradesRequestRef.current !== requestId) return;

      setStudentMonthlyGrades(classRows);
      hasVisibleReportRef.current = true;
    } catch {
      if (activeStudentGradesRequestRef.current === requestId && !hasVisibleReportRef.current) {
        setStudentMonthlyGrades([]);
      }
    } finally {
      if (activeStudentGradesRequestRef.current === requestId) {
        setStudentGradesLoading(false);
      }
    }
  }, [classId, linkedStudentId, myRole, selectedAcademicYear, selectedMonth, selectedMonthNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    loadStudentMonthlyGrades();
  }, [loadStudentMonthlyGrades]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.allSettled([
      loadData(true),
      loadStudentMonthlyGrades(true),
    ]).finally(() => setRefreshing(false));
  }, [loadData, loadStudentMonthlyGrades]);

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
  const passingStudentCount = Math.max(0, Number(gradesReport?.statistics?.passingCount ?? 0));
  const failingStudentCount = Math.max(0, Number(gradesReport?.statistics?.failingCount ?? 0));
  const gradedHeadcount = passingStudentCount + failingStudentCount;
  const rankingBasis =
    typeof gradesReport?.totalStudents === 'number' && gradesReport.totalStudents > 0
      ? gradesReport.totalStudents
      : gradedHeadcount;
  const failureRatePct = rankingBasis > 0 ? Math.round((failingStudentCount / rankingBasis) * 100) : null;
  const passRatePct = rankingBasis > 0 ? Math.round((passingStudentCount / rankingBasis) * 100) : null;
  const studentAverage = Number(monthlySummary?.average || 0);
  const studentRank = Number(monthlySummary?.classRank || 0);
  const studentGradeLevel = String(monthlySummary?.gradeLevel || '--');
  const reportTitle = className || gradesReport?.class?.name || attendanceSummary?.class?.name || t('classScreens.report.defaultTitle');
  const hasRenderableReport = Boolean(attendanceSummary || gradesReport || monthlySummary || studentMonthlyGrades.length > 0);
  const isPeriodUpdating = periodLoading || studentGradesLoading;

  const roleLabel = myRole === 'PARENT' ? t('classScreens.report.role.parent') : myRole === 'STUDENT' ? t('classScreens.report.role.student') : t('classScreens.report.role.default');

  const handleShareReport = useCallback(async () => {
    const lines = [
      `${t('classScreens.report.header')} - ${reportTitle}`,
      `${t('classScreens.grades.academicMonth')}: ${selectedMonth} ${selectedAcademicYear}`,
      `${t('classScreens.report.metrics.attendanceRate')}: ${metricValue(attendanceRate, '%')}`,
      `${t('classScreens.report.metrics.failureRate')}: ${metricValue(failingStudentCount)}${
        failureRatePct !== null ? ` (${failureRatePct}%)` : ''
      }`,
      `${t('classScreens.report.metrics.passRate')}: ${metricValue(passingStudentCount)}${
        passRatePct !== null ? ` (${passRatePct}%)` : ''
      }`,
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
    failureRatePct,
    failingStudentCount,
    myRole,
    passRatePct,
    passingStudentCount,
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
      csvLines.push(`failed_student_count,${metricValue(failingStudentCount)}`);
      csvLines.push(`failure_rate_percent,${failureRatePct !== null ? String(failureRatePct) : ''}`);
      csvLines.push(`passing_student_count,${metricValue(passingStudentCount)}`);
      csvLines.push(`pass_rate_percent,${passRatePct !== null ? String(passRatePct) : ''}`);
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
    failingStudentCount,
    failureRatePct,
    classId,
    gradesReport?.students,
    myRole,
    passRatePct,
    passingStudentCount,
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
            {refreshing || isPeriodUpdating ? (
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
      ) : error && !hasRenderableReport ? (
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
          <View style={styles.heroCardWrap}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={['#172554', '#0c4c6f', '#0d9488']}
                locations={[0, 0.48, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.02)', 'rgba(15,23,42,0.25)']}
                locations={[0, 0.35, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.heroOrbLayer} pointerEvents="none">
                <LinearGradient
                  colors={['rgba(56,189,248,0.45)', 'rgba(56,189,248,0)']}
                  style={styles.heroOrbTop}
                />
                <LinearGradient
                  colors={['rgba(167,139,250,0.35)', 'rgba(167,139,250,0)']}
                  style={styles.heroOrbBottom}
                />
              </View>

              <View style={styles.heroContent}>
                <View style={styles.heroTop}>
                  <View style={styles.heroPill}>
                    <Ionicons name="sparkles-outline" size={14} color="#E0F2FE" />
                    <Text style={styles.heroPillText}>{t('classScreens.report.liveReport')}</Text>
                  </View>
                  <View style={styles.heroMonthChip}>
                    {isPeriodUpdating ? (
                      <ActivityIndicator size="small" color="rgba(255,255,255,0.95)" />
                    ) : (
                      <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.95)" />
                    )}
                    <Text style={styles.heroPeriod}>{selectedMonth}</Text>
                  </View>
                </View>
                <Text
                  style={styles.heroTitle}
                  {...(Platform.OS === 'android'
                    ? { includeFontPadding: false, textBreakStrategy: 'simple' }
                    : {})}
                >
                  {reportTitle}
                </Text>
                <Text
                  style={styles.heroSubtitle}
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {roleLabel}
                </Text>
              </View>
            </View>
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
              {isPeriodUpdating ? (
                <View style={styles.updatingBadge}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <Ionicons name="calendar-clear-outline" size={20} color={COLORS.textMuted} />
              )}
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
            <View style={[styles.metricCard, styles.metricCardAttendance]}>
              <View style={[styles.metricIconCompact, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="checkmark-done-outline" size={15} color={COLORS.primary} />
              </View>
              <View style={styles.metricCardCopy}>
                <Text style={styles.metricValueCompact}>{metricValue(attendanceRate, '%')}</Text>
                <Text style={styles.metricLabelCompact}>{t('classScreens.report.metrics.attendanceRate')}</Text>
              </View>
            </View>

            <View style={[styles.metricCard, styles.metricCardDanger]}>
              <View style={[styles.metricIconCompact, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="person-remove-outline" size={15} color={COLORS.danger} />
              </View>
              <View style={styles.metricCardCopy}>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValueCompact}>{metricValue(failingStudentCount)}</Text>
                  {failureRatePct !== null ? (
                    <Text style={styles.metricPctCompact}> · {failureRatePct}%</Text>
                  ) : (
                    <Text style={styles.metricPctCompactMuted}> · --</Text>
                  )}
                </View>
                <Text style={styles.metricLabelCompact}>{t('classScreens.report.metrics.failureRate')}</Text>
              </View>
            </View>

            <View style={[styles.metricCard, styles.metricCardSuccess]}>
              <View style={[styles.metricIconCompact, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="ribbon-outline" size={15} color={COLORS.success} />
              </View>
              <View style={styles.metricCardCopy}>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValueCompact}>{metricValue(passingStudentCount)}</Text>
                  {passRatePct !== null ? (
                    <Text style={styles.metricPctCompact}> · {passRatePct}%</Text>
                  ) : (
                    <Text style={styles.metricPctCompactMuted}> · --</Text>
                  )}
                </View>
                <Text style={styles.metricLabelCompact}>{t('classScreens.report.metrics.passRate')}</Text>
              </View>
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
  heroCardWrap: {
    borderRadius: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroOrbLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOrbTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -90,
    right: -70,
  },
  heroOrbBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -100,
    left: -80,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    zIndex: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.38)',
    flexShrink: 1,
  },
  heroPillText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.15,
    flexShrink: 1,
  },
  heroMonthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    flexShrink: 0,
  },
  heroPeriod: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroTitle: {
    fontSize: 24,
    // Khmer / complex scripts need extra line-box height so ascenders are not clipped when the card uses overflow:hidden
    lineHeight: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
    paddingBottom: 2,
    textShadowColor: 'rgba(15,23,42,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    marginTop: 6,
    color: 'rgba(241,245,249,0.92)',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: 0.05,
    paddingTop: Platform.OS === 'ios' ? 1 : 0,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 0,
  },
  metricCardAttendance: {
    backgroundColor: '#F8FCFF',
  },
  metricCardDanger: {
    backgroundColor: '#FFFBFB',
  },
  metricCardSuccess: {
    backgroundColor: '#FAFFFC',
  },
  metricIconCompact: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  metricCardCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  metricValueCompact: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  metricPctCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: -0.2,
  },
  metricPctCompactMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  metricLabelCompact: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 14,
    letterSpacing: 0.15,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updatingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
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
