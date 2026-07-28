import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import StunityLogo from '../../../assets/Stunity.svg';
import { useAuthStore, useMessagingStore } from '@/stores';
import { classesApi, gradeApi } from '@/api';
import type { ClubsStackParamList } from '@/navigation/types';
import Svg, { Circle } from 'react-native-svg';
import { useClassHubStore } from '@/stores/classHubStore';
import { useThemeContext } from '@/contexts';
import { useTranslation } from 'react-i18next';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/config';

const SCHEDULE_DAY_THEMES: Record<string, { tint: string; border: string; text: string; soft: string; deep: string }> = {
  MONDAY: { tint: '#E3F2FD', border: '#90CAF9', text: '#1E88E5', soft: '#F5FAFF', deep: '#1976D2' },
  TUESDAY: { tint: '#FFF3E0', border: '#FFB74D', text: '#FB8C00', soft: '#FFF8F1', deep: '#F57C00' },
  WEDNESDAY: { tint: '#E8F5E9', border: '#81C784', text: '#43A047', soft: '#F4FBF4', deep: '#388E3C' },
  THURSDAY: { tint: '#EDE7F6', border: '#B39DDB', text: '#7E57C2', soft: '#F7F3FC', deep: '#5E35B1' },
  FRIDAY: { tint: '#FCE4EC', border: '#F48FB1', text: '#EC407A', soft: '#FFF4F8', deep: '#D81B60' },
  SATURDAY: { tint: '#FFEBEE', border: '#EF9A9A', text: '#EF5350', soft: '#FFF5F6', deep: '#E53935' },
  SUNDAY: { tint: '#E8EAF6', border: '#9FA8DA', text: '#5C6BC0', soft: '#F4F6FD', deep: '#3949AB' },
};

const SCHEDULE_SLOT_THEMES = [
  { tint: '#E3F2FD', border: '#BBDEFB', text: '#1976D2', soft: '#F5FAFF' },
  { tint: '#E8F5E9', border: '#C8E6C9', text: '#388E3C', soft: '#F4FBF4' },
  { tint: '#EDE7F6', border: '#D1C4E9', text: '#5E35B1', soft: '#F7F3FC' },
  { tint: '#FFF3E0', border: '#FFE0B2', text: '#F57C00', soft: '#FFF8F1' },
  { tint: '#FCE4EC', border: '#F8BBD0', text: '#D81B60', soft: '#FFF4F8' },
];

type RouteParams = {
  classId: string;
  className?: string;
  myRole?: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | 'SCHOOL_ADMIN';
  linkedStudentId?: string;
  linkedTeacherId?: string;
  homeroomTeacherId?: string;
  teacherClassAccess?: 'teaching' | 'other';
  initialSummary?: ClubsStackParamList['ClassDetails']['initialSummary'];
};

type TeacherSubject = {
  id: string;
  name: string;
  maxScore?: number;
};

const CALENDAR_MONTH_ENGLISH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const resolveAcademicYearForCalendarMonth = (monthNumber: number, now = new Date()): number => {
  const currentMonthNumber = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const academicStartYear = currentMonthNumber >= 11 ? currentYear : currentYear - 1;
  return monthNumber >= 11 ? academicStartYear : academicStartYear + 1;
};

const getCurrentMonthLabel = (): string => {
  return new Date().toLocaleString('default', { month: 'long' });
};

const getCurrentRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: format(start), endDate: format(end) };
};

const extractTeacherSubjects = (
  timetable: classesApi.TimetableResponse | null | undefined,
  linkedTeacherId?: string
): TeacherSubject[] => {
  if (!linkedTeacherId) return [];

  const map = new Map<string, TeacherSubject>();
  (timetable?.entries || []).forEach((entry: any) => {
    const teacherId = entry.teacherId || entry.teacher?.id;
    const subject = entry.subject;
    if (teacherId === linkedTeacherId && subject?.id) {
      map.set(subject.id, {
        id: subject.id,
        name: subject.name || subject.nameKh || 'Subject',
        maxScore: subject.maxScore,
      });
    }
  });

  return Array.from(map.values());
};

const formatName = (firstName?: string, lastName?: string) => `${lastName || ''} ${firstName || ''}`.trim();
const formatTeacherDisplayName = (teacher: any, preferEnglish = false) => {
  const nativeName = formatName(teacher?.firstName, teacher?.lastName);
  const englishName = formatName(teacher?.englishFirstName, teacher?.englishLastName);
  return (preferEnglish ? englishName || nativeName : nativeName || englishName) || 'Teacher';
};
const EMPTY_CLASS_DETAIL_BUNDLE: classesApi.ClassDetailBundle = {
  students: [],
  timetable: null,
  attendanceSummary: null,
  classGradesReport: null,
  monthlySummary: null,
  teacherInfo: null,
};

export type ClassHubViewProps = RouteParams & {
  hideBackButton?: boolean;
  hideTopSafe?: boolean;
  hideAppBar?: boolean;
  classSelector?: React.ReactNode;
};

export function ClassHubView(props: ClassHubViewProps) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const isKhmer = i18n.language?.startsWith('km');
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const params = props;

  const classId = params.classId;
  const myRole = params.myRole || (
    user?.role === 'TEACHER' ||
    user?.role === 'PARENT' ||
    user?.role === 'ADMIN' ||
    user?.role === 'STAFF' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN'
      ? user.role
      : 'STUDENT'
  );
  const startConversation = useMessagingStore((state) => state.startConversation);
  const monthLabel = useMemo(() => getCurrentMonthLabel(), []);
  const currentMonthNumber = useMemo(() => new Date().getMonth() + 1, []);
  const currentAcademicYear = useMemo(
    () => resolveAcademicYearForCalendarMonth(currentMonthNumber),
    [currentMonthNumber]
  );
  const currentRange = useMemo(() => getCurrentRange(), []);
  const bundleOptions = useMemo<classesApi.GetClassDetailBundleOptions>(() => ({
    classId,
    myRole,
    linkedStudentId: params.linkedStudentId,
    linkedTeacherId: params.linkedTeacherId,
    startDate: currentRange.startDate,
    endDate: currentRange.endDate,
    semester: 1,
    year: currentAcademicYear,
    monthLabel: myRole === 'STUDENT' || myRole === 'PARENT' ? monthLabel : undefined,
    monthNumber: myRole === 'STUDENT' || myRole === 'PARENT' ? currentMonthNumber : undefined,
  }), [
    classId,
    currentAcademicYear,
    currentMonthNumber,
    currentRange.endDate,
    currentRange.startDate,
    monthLabel,
    myRole,
    params.linkedStudentId,
    params.linkedTeacherId,
  ]);
  const initialCachedBundle = useMemo(
    () => (classId ? classesApi.getCachedClassDetailBundle(bundleOptions) : null),
    [bundleOptions, classId]
  );
  const initialFallbackBundle = useMemo(
    () => (classId ? classesApi.getLatestCachedClassDetailBundle(classId, { allowStale: true }) : null),
    [classId]
  );
  const initialVisibleBundle = initialCachedBundle || initialFallbackBundle;
  const hasImmediateShell = Boolean(
    initialVisibleBundle ||
    params.className ||
    params.initialSummary?.name ||
    params.initialSummary?.studentCount
  );

  const [loading, setLoading] = useState(!hasImmediateShell);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [students, setStudents] = useState<classesApi.ClassStudent[]>(initialVisibleBundle?.students || []);
  const [timetable, setTimetable] = useState<classesApi.TimetableResponse | null>(initialVisibleBundle?.timetable || null);
  const [attendanceSummary, setAttendanceSummary] = useState<classesApi.ClassAttendanceSummary | null>(initialVisibleBundle?.attendanceSummary || null);
  const [classGradesReport, setClassGradesReport] = useState<classesApi.ClassGradesReport | null>(initialVisibleBundle?.classGradesReport || null);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, unknown> | null>(initialVisibleBundle?.monthlySummary || null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedQuickSubjectId, setSelectedQuickSubjectId] = useState<string | null>(null);
  const [scoreByStudent, setScoreByStudent] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const hasVisibleDataRef = useRef(Boolean(initialVisibleBundle || params.className || params.initialSummary));
  const activeRequestRef = useRef(0);
  const currentBundleRef = useRef<classesApi.ClassDetailBundle>(initialVisibleBundle || EMPTY_CLASS_DETAIL_BUNDLE);

  const applyBundle = useCallback((bundle: classesApi.ClassDetailBundle) => {
    const normalizedBundle = classesApi.primeClassDetailBundleCache(bundleOptions, bundle);
    currentBundleRef.current = normalizedBundle;
    setStudents(Array.isArray(normalizedBundle.students) ? normalizedBundle.students : []);
    setTimetable(normalizedBundle.timetable || null);
    setAttendanceSummary(normalizedBundle.attendanceSummary || null);
    setClassGradesReport(normalizedBundle.classGradesReport || null);
    setMonthlySummary(normalizedBundle.monthlySummary || null);
    hasVisibleDataRef.current = true;
  }, [bundleOptions]);

  const resetVisibleClassData = useCallback(() => {
    currentBundleRef.current = EMPTY_CLASS_DETAIL_BUNDLE;
    setStudents([]);
    setTimetable(null);
    setAttendanceSummary(null);
    setClassGradesReport(null);
    setMonthlySummary(null);
    setScoreByStudent({});
    setStudentSearch('');
    setSelectedQuickSubjectId(null);
  }, []);

  const mergeBundlePatch = useCallback((patch: Partial<classesApi.ClassDetailBundle>) => {
    applyBundle({
      ...currentBundleRef.current,
      ...patch,
    });
  }, [applyBundle]);

  const loadData = useCallback(
    async (options?: { force?: boolean; preserveVisibleContent?: boolean }) => {
      const force = options?.force ?? false;
      const preserveVisibleContent = options?.preserveVisibleContent ?? false;
      const requestId = activeRequestRef.current + 1;
      activeRequestRef.current = requestId;

      if (!classId) {
        setError(t('classDetails.notFound'));
        setLoading(false);
        setRefreshing(false);
        setBackgroundRefreshing(false);
        return;
      }

      try {
        const canRenderWithoutBlocking = hasVisibleDataRef.current || Boolean(params.className || params.initialSummary);
        if (preserveVisibleContent && canRenderWithoutBlocking) {
          setBackgroundRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        if (force) {
          classesApi.invalidateMyClassesCache();
          classesApi.invalidateClassDetailBundleCache(classId);
        }

        const studentsPromise = classesApi.getClassStudents(classId);
        const timetablePromise = classesApi.getClassTimetable(classId);
        const attendancePromise = classesApi.getClassAttendanceSummary(classId, currentRange.startDate, currentRange.endDate);
        const gradesPromise = classesApi.getClassGradesReport(classId, {
          semester: bundleOptions.semester,
          year: bundleOptions.year,
        });
        const monthlySummaryPromise =
          (myRole === 'STUDENT' || myRole === 'PARENT') && params.linkedStudentId && monthLabel
            ? classesApi.getStudentMonthlySummary(
                params.linkedStudentId,
                monthLabel,
                currentAcademicYear,
                currentMonthNumber,
                classId
              )
            : Promise.resolve(null);
        const [studentsResult, timetableResult] = await Promise.allSettled([
          studentsPromise,
          timetablePromise,
        ]);

        if (activeRequestRef.current !== requestId) return;

        let hasCoreUpdate = false;
        if (studentsResult.status === 'fulfilled') {
          mergeBundlePatch({ students: Array.isArray(studentsResult.value) ? studentsResult.value : [] });
          hasCoreUpdate = true;
        }
        if (timetableResult.status === 'fulfilled') {
          mergeBundlePatch({ timetable: timetableResult.value || null });
          hasCoreUpdate = true;
        }

        if (hasCoreUpdate || canRenderWithoutBlocking) {
          setLoading(false);
        }

        const [attendanceResult, gradesResult, monthlyResult] = await Promise.allSettled([
          attendancePromise,
          gradesPromise,
          monthlySummaryPromise,
        ]);

        if (activeRequestRef.current !== requestId) return;

        const finalPatch: Partial<classesApi.ClassDetailBundle> = {};

        if (attendanceResult.status === 'fulfilled') {
          finalPatch.attendanceSummary = attendanceResult.value || null;
        }
        if (gradesResult.status === 'fulfilled') {
          finalPatch.classGradesReport = gradesResult.value || null;
        }
        if (monthlyResult.status === 'fulfilled') {
          finalPatch.monthlySummary = monthlyResult.value || null;
        }

        if (Object.keys(finalPatch).length > 0) {
          mergeBundlePatch(finalPatch);
        }

        const requiredRequestsFailed =
          studentsResult.status === 'rejected' &&
          timetableResult.status === 'rejected' &&
          attendanceResult.status === 'rejected' &&
          gradesResult.status === 'rejected';

        if (requiredRequestsFailed && !canRenderWithoutBlocking && !hasCoreUpdate) {
          const firstError = [
            studentsResult,
            timetableResult,
            attendanceResult,
            gradesResult,
            monthlyResult,
          ].find((result): result is PromiseRejectedResult => result.status === 'rejected');
          setError(firstError?.reason?.message || t('classDetails.loadFailed'));
        }
      } catch (err: any) {
        if (!hasVisibleDataRef.current && !params.className && !params.initialSummary) {
          setError(err?.message || t('classDetails.loadFailed'));
        }
      } finally {
        if (activeRequestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          setBackgroundRefreshing(false);
        }
      }
    },
    [
      bundleOptions,
      classId,
      currentRange.endDate,
      currentRange.startDate,
      currentAcademicYear,
      currentMonthNumber,
      mergeBundlePatch,
      monthLabel,
      myRole,
      params.className,
      params.initialSummary,
      params.linkedStudentId,
      params.linkedTeacherId,
      t,
    ]
  );

  useEffect(() => {
    hasVisibleDataRef.current = Boolean(initialVisibleBundle || params.className || params.initialSummary);

    if (initialVisibleBundle) {
      applyBundle(initialVisibleBundle);
    } else {
      resetVisibleClassData();
    }

    loadData({ preserveVisibleContent: Boolean(initialVisibleBundle || params.className || params.initialSummary) });
  }, [applyBundle, classId, initialVisibleBundle, loadData, params.className, params.initialSummary, resetVisibleClassData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData({ force: true, preserveVisibleContent: true });
  }, [loadData]);

  const title = params.className || params.initialSummary?.name || timetable?.class?.name || t('classDetails.defaultTitle');
  
  const studentAverage = Number(monthlySummary?.average || 0);
  const studentRank = Number(monthlySummary?.classRank || 0);
  const studentGradeLevel = String(monthlySummary?.gradeLevel || '-');
  const displayedGrade = timetable?.class?.grade || params.initialSummary?.grade || '—';
  const displayedTrack = timetable?.class?.track || params.initialSummary?.track || null;

  const studentStats = useMemo(() => {
    let male = 0;
    let female = 0;
    students.forEach(s => {
      const g = (s.gender || '').toUpperCase();
      if (g === 'MALE' || g === 'M') male++;
      else if (g === 'FEMALE' || g === 'F') female++;
    });
    const fallbackTotal = Number(params.initialSummary?.studentCount || 0);
    return { total: students.length || fallbackTotal, male, female };
  }, [params.initialSummary?.studentCount, students]);

  const uniqueTeachers = useMemo(() => {
    const map = new Map();
    const homeroomTeacher = params.initialSummary?.homeroomTeacher;

    if (homeroomTeacher?.id) {
      map.set(homeroomTeacher.id, {
        ...homeroomTeacher,
        subjectNames: [t('classDetails.homeroomTeacher')],
        isHomeroom: true,
      });
    }

    if (!timetable?.entries) return Array.from(map.values());
    timetable.entries.forEach((e: any) => {
      if (e.teacher && e.teacher.id) {
        const existing = map.get(e.teacher.id);
        const subjectName = e.subject?.name || e.subject?.nameKh;
        if (existing) {
          if (subjectName && !existing.subjectNames.includes(subjectName)) {
            existing.subjectNames.push(subjectName);
          }
          return;
        }

        map.set(e.teacher.id, {
          ...e.teacher,
          subject: e.subject,
          subjectNames: subjectName ? [subjectName] : [],
        });
      }
    });
    return Array.from(map.values());
  }, [params.initialSummary?.homeroomTeacher, t, timetable]);

  const scheduleDayApiMap = useMemo(() => {
    const baseDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hasSunday = (timetable?.entries || []).some((entry: any) => {
      const day = String(entry.day || entry.dayOfWeek || '').toLowerCase();
      return day === 'sunday';
    });

    return hasSunday ? [...baseDays, 'sunday'] : baseDays;
  }, [timetable]);
  const scheduleDays = useMemo(
    () => scheduleDayApiMap.map((day) => t(`classDetails.days.${day}`)),
    [scheduleDayApiMap, t]
  );

  useEffect(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const idx = scheduleDayApiMap.indexOf(today);
    setSelectedDayIndex(idx !== -1 ? idx : 0);
  }, [scheduleDayApiMap]);

  const selectedEntries = useMemo(() => {
     if (!timetable?.entries) return [];
     const activeDay = (scheduleDayApiMap[selectedDayIndex] || '').toLowerCase();
     return timetable.entries.filter((e: any) => {
       const d = (e.day || '').toLowerCase();
       const dw = (e.dayOfWeek || '').toLowerCase();
       return d === activeDay || dw === activeDay;
     });
  }, [timetable, scheduleDayApiMap, selectedDayIndex]);
  const activeScheduleDayKey = useMemo(
    () => (scheduleDayApiMap[selectedDayIndex] || 'monday').toUpperCase(),
    [scheduleDayApiMap, selectedDayIndex]
  );
  const activeScheduleDayTheme = SCHEDULE_DAY_THEMES[activeScheduleDayKey] || SCHEDULE_DAY_THEMES.MONDAY;

  const teacherSubjects = useMemo(() => {
    return extractTeacherSubjects(timetable, params.linkedTeacherId);
  }, [params.linkedTeacherId, timetable]);

  const selectedQuickSubject = useMemo(
    () => teacherSubjects.find((subject) => subject.id === selectedQuickSubjectId) || null,
    [selectedQuickSubjectId, teacherSubjects]
  );

  useEffect(() => {
    if (!selectedQuickSubjectId) return;
    if (!teacherSubjects.some((subject) => subject.id === selectedQuickSubjectId)) {
      setSelectedQuickSubjectId(null);
    }
  }, [selectedQuickSubjectId, teacherSubjects]);

  const quickImportStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students.slice(0, 5);

    return students
      .filter((student) => {
        const name = formatName(student.firstName, student.lastName).toLowerCase();
        const studentId = (student.studentId || '').toLowerCase();
        return name.includes(query) || studentId.includes(query);
      })
      .slice(0, 5);
  }, [studentSearch, students]);

  const canSubmitScores =
    Boolean(params.linkedTeacherId && selectedQuickSubject) &&
    (myRole === 'TEACHER' ||
      Boolean(
        (user?.teacherId || user?.teacher?.id) &&
          params.linkedTeacherId &&
          (user?.teacherId || user?.teacher?.id) === params.linkedTeacherId
      ));

  const handleScoreChange = useCallback((studentId: string, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    const maxScore = selectedQuickSubject?.maxScore || 100;
    if (value !== '' && Number(value) > maxScore) return;

    setScoreByStudent((prev) => ({ ...prev, [studentId]: value }));
  }, [selectedQuickSubject]);

  const handleSubmitScores = useCallback(async () => {
    if (!canSubmitScores) {
      Alert.alert(t('classDetails.alerts.scoresTitle'), t('classDetails.alerts.noAssignedSubjects'));
      return false;
    }

    const payload = students
      .map((student) => ({
        student,
        raw: scoreByStudent[student.id],
      }))
      .filter((row) => row.raw !== undefined && row.raw !== '')
      .map((row) => {
        const score = Number(row.raw);
        const calendarMonthNum = new Date().getMonth() + 1;
        const monthEnglish = CALENDAR_MONTH_ENGLISH[calendarMonthNum - 1] ?? 'January';
        const academicYear = resolveAcademicYearForCalendarMonth(calendarMonthNum);
        return {
          studentId: row.student.id,
          subjectId: selectedQuickSubject!.id,
          classId,
          score,
          maxScore: selectedQuickSubject!.maxScore || 100,
          month: monthEnglish,
          monthNumber: calendarMonthNum,
          year: academicYear,
        };
      })
      .filter((row) => {
        const maxScore = selectedQuickSubject!.maxScore || 100;
        return Number.isFinite(row.score) && row.score >= 0 && row.score <= maxScore;
      });

    if (payload.length === 0) {
      Alert.alert(t('classDetails.alerts.scoresTitle'), t('classDetails.alerts.enterValidScore'));
      return false;
    }

    try {
      setUploading(true);
      await gradeApi.post('/grades/batch', { grades: payload });
      classesApi.invalidateClassGradeCaches(classId);
      Alert.alert(t('common.success'), t('classDetails.alerts.importedScores', { count: payload.length }));
      setScoreByStudent({});
      await loadData({ force: true, preserveVisibleContent: true });
      return true;
    } catch (err: any) {
      const payloadMessage = err?.response?.data?.message;
      const statusCode = err?.response?.status;
      const message =
        payloadMessage ||
        err?.message ||
        (statusCode === 423 ? t('classScreens.grades.sheet.lockedSheetSave') : t('classDetails.alerts.importFailed'));
      Alert.alert(t('classDetails.alerts.scoresTitle'), message);
      return false;
    } finally {
      setUploading(false);
    }
  }, [canSubmitScores, classId, loadData, scoreByStudent, selectedQuickSubject, students, t]);

  const hasUnsavedQuickScores = Object.values(scoreByStudent).some(score => score !== '');
  const canMessageTeacher =
    FEATURE_FLAGS.MESSAGING_ENABLED &&
    user?.role === 'PARENT' &&
    Boolean(params.homeroomTeacherId);
  const canManageRecords =
    myRole === 'ADMIN' || myRole === 'STAFF' || myRole === 'SUPER_ADMIN' || myRole === 'SCHOOL_ADMIN';
  const rolePresentation = useMemo(() => {
    switch (myRole) {
      case 'TEACHER':
        return { icon: 'school-outline' as const, label: t('classDetails.roles.teaching') };
      case 'PARENT':
        return { icon: 'people-outline' as const, label: t('classDetails.roles.monitoring') };
      case 'ADMIN':
      case 'STAFF':
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return { icon: 'shield-checkmark-outline' as const, label: t('classDetails.roles.reviewing') };
      default:
        return { icon: 'book-outline' as const, label: t('classDetails.roles.studying') };
    }
  }, [myRole, t]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedQuickScores || uploading) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        t('classDetails.alerts.unsavedChangesTitle'),
        t('classDetails.alerts.unsavedChangesMessage'),
        [
          { text: t('classDetails.alerts.keepEditing'), style: 'cancel', onPress: () => {} },
          {
            text: t('classDetails.alerts.discard'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: t('classDetails.quickImport.saveScores'),
            onPress: () => {
              handleSubmitScores().then((success) => {
                if (success) {
                  setTimeout(() => navigation.dispatch(e.data.action), 300);
                }
              });
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedQuickScores, uploading, handleSubmitScores, t]);

  const navigateToAttendance = useCallback(() => {
    const teacherProfileId = user?.teacherId || user?.teacher?.id;
    const isTeacherHomeroom = Boolean(
      teacherProfileId &&
        (teacherProfileId === params.homeroomTeacherId ||
          teacherProfileId === params.initialSummary?.homeroomTeacher?.id)
    );
    const isUserHomeroom = user?.id && (user.id === params.homeroomTeacherId || user.id === params.initialSummary?.homeroomTeacher?.id);
    
    navigation.navigate('ClassAttendance', {
      classId,
      className: title,
      isHomeroom: params.initialSummary?.isHomeroom || isTeacherHomeroom || isUserHomeroom,
      homeroomTeacherId: params.homeroomTeacherId || params.initialSummary?.homeroomTeacher?.id
    });
  }, [navigation, classId, title, params.initialSummary, user?.id, user?.teacher?.id, user?.teacherId, params.homeroomTeacherId]);

  const handleStartConversation = useCallback(async (participantId: string, displayName: string) => {
    try {
      const conversation = await startConversation([participantId]);
      if (conversation) {
        navigation.navigate('Messages', {
          screen: 'Chat',
          params: {
            conversationId: conversation.id,
            displayName: displayName || conversation.displayName,
          }
        });
      }
    } catch (err: any) {
      Alert.alert(t('classDetails.alerts.messagingTitle'), err?.message || t('classDetails.alerts.startConversationFailed'));
    }
  }, [navigation, startConversation, t]);

  const handleMessageTeacher = useCallback(async () => {
    const homeroomTeacherId = params.homeroomTeacherId;
    if (!homeroomTeacherId) {
      Alert.alert(t('classDetails.alerts.messagingTitle'), t('classDetails.alerts.noHomeroomTeacher'));
      return;
    }
    handleStartConversation(homeroomTeacherId, t('classDetails.homeroomTeacher'));
  }, [params.homeroomTeacherId, handleStartConversation, t]);

  const handleEditTeacher = useCallback((teacherId: string) => {
    if (!canManageRecords) return;
    navigation.navigate('EditTeacher', {
      teacherId,
      classId,
    });
  }, [canManageRecords, classId, navigation]);

  useEffect(() => {
    if (!classId) return;

    const today = new Date().toISOString().split('T')[0];
    const task = InteractionManager.runAfterInteractions(() => {
      classesApi.prefetchClassDailyAttendance(classId, today);
      useClassHubStore.getState().fetchAssignments(classId).catch(() => {});
      useClassHubStore.getState().fetchMaterials(classId).catch(() => {});
      useClassHubStore.getState().fetchAnnouncements(classId).catch(() => {});
    });

    return () => {
      task.cancel?.();
    };
  }, [classId]);

  const attendanceRate = attendanceSummary?.summary?.averageAttendanceRate ?? 100;
  const pct = attendanceRate > 1 ? attendanceRate / 100 : attendanceRate;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#020617' : '#FFFFFF' }]}>

      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {props.hideTopSafe ? (
        <View style={styles.headerSafe}>
          {!props.hideAppBar && (
            <View style={styles.topBar}>
              {!props.hideBackButton ? (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                  <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 44, height: 44 }} />
              )}
              <View style={styles.centerLogo}>
                <StunityLogo width={108} height={30} />
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                {refreshing || backgroundRefreshing ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          {!props.hideAppBar && (
            <View style={styles.topBar}>
              {!props.hideBackButton ? (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                  <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 44, height: 44 }} />
              )}
              <View style={styles.centerLogo}>
                <StunityLogo width={108} height={30} />
              </View>
              <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
                {refreshing || backgroundRefreshing ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <BlurView
            intensity={isDark ? 42 : 72}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.loadingBlurCard,
              {
                backgroundColor: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)',
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>{t('classDetails.loading')}</Text>
          </BlurView>
        </View>
      ) : error ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData({ force: true })}>
            <Text style={styles.retryText}>{t('classDetails.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* PREMIUM HERO CARD */}
          <LinearGradient
            colors={isDark ? ['#115E59', '#0F766E'] : ['#0CA2C4', '#0CA2C4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Abstract Background Orbs — same illustration technique as LearnHomeScreen's hero */}
            <View style={styles.bgOrbPrimary} />
            <View style={styles.bgOrbSecondary} />
            <View style={styles.heroFloatIcon}>
              <Ionicons name="sparkles" size={12} color={Colors.white} />
            </View>

            <View style={styles.heroCardContent}>
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.heroKickerPill}>
                    <Ionicons name={rolePresentation.icon} size={13} color="#FFFFFF" />
                    <Text style={styles.heroKickerText}>{rolePresentation.label}</Text>
                  </View>
                  <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
                  <Text style={[styles.heroMeta, isKhmer && styles.khmerInlineText]}>
                    {t('classDetails.hero.grade', { grade: displayedGrade })}
                    {displayedTrack ? ` · ${displayedTrack}` : ''}
                  </Text>
                </View>

                {/* Attendance-rate ring — mirrors LearnHomeScreen's unit-completion ring */}
                <View style={styles.heroRingWrap}>
                  <Svg width={52} height={52}>
                    <Circle cx={26} cy={26} r={22} stroke="rgba(255,255,255,0.3)" strokeWidth={5} fill="none" />
                    <Circle
                      cx={26} cy={26} r={22}
                      stroke="#FFFFFF"
                      strokeWidth={5}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 22 * pct} ${2 * Math.PI * 22}`}
                      transform="rotate(-90 26 26)"
                    />
                  </Svg>
                  <Text style={styles.heroRingText}>{Math.round(pct * 100)}%</Text>
                </View>
              </View>
            </View>

            {/* Stats Row (Darker Background at the bottom) */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{studentStats.total}</Text>
                <Text style={[styles.heroStatLabel, isKhmer && styles.khmerInlineText]}>{t('classDetails.hero.students')}</Text>
              </View>
              <View style={styles.heroStatSep} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{studentStats.male}</Text>
                <Text style={[styles.heroStatLabel, isKhmer && styles.khmerInlineText]}>{t('classDetails.hero.male')}</Text>
              </View>
              <View style={styles.heroStatSep} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{studentStats.female}</Text>
                <Text style={[styles.heroStatLabel, isKhmer && styles.khmerInlineText]}>{t('classDetails.hero.female')}</Text>
              </View>
            </View>
          </LinearGradient>

          {props.classSelector}
          {params.teacherClassAccess === 'other' &&
            (myRole === 'TEACHER' ||
              Boolean(
                (user?.teacherId || user?.teacher?.id) &&
                  params.linkedTeacherId &&
                  (user?.teacherId || user?.teacher?.id) === params.linkedTeacherId
              )) && (
            <View style={styles.viewOnlyHint}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: Spacing[3] }} />
              <Text style={[styles.viewOnlyHintText, isKhmer && styles.khmerInlineText]}>
                {t('classDetails.teacherLinkedClassHint')}
              </Text>
            </View>
          )}

          {/* BENTO-BOX SHORTCUT GRID */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
               <View>
                 <Text style={styles.sectionHeader}>{t('classDetails.classHubTools')}</Text>
                 <Text style={styles.sectionSubheader}>{t('classDetails.classHubSubtitle')}</Text>
               </View>
            </View>
            <View style={styles.bentoGrid}>
            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassReport', {
                classId,
                className: title,
                myRole,
                linkedStudentId: params.linkedStudentId,
              })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="analytics-outline" size={24} color="#2563EB" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.report')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassAnnouncements', { classId })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="megaphone" size={24} color="#3B82F6" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.announce')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassAssignments', {
                classId,
                myRole,
                linkedStudentId: params.linkedStudentId,
              })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="document-text" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.assign')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassMaterials', { classId })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="folder-open" size={24} color="#22C55E" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.materials')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={navigateToAttendance}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.attend')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassGrades', { 
                classId, 
                className: title,
                myRole,
                linkedStudentId: params.linkedStudentId,
                linkedTeacherId: params.linkedTeacherId
              })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="bar-chart" size={24} color="#A855F7" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.scores')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassQuizzes', { classId })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#ECFEFF' }]}>
                <Ionicons name="extension-puzzle" size={24} color="#06B6D4" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.quizzes')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassMembers', { 
                classId, 
                homeroomTeacherId: params.homeroomTeacherId,
                myRole,
              })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FDE4CF' }]}>
                <Ionicons name="people" size={24} color="#F97316" />
              </View>
              <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.members')}</Text>
            </TouchableOpacity>

            {canMessageTeacher && (
              <TouchableOpacity 
                style={styles.bentoItem} 
                onPress={handleMessageTeacher}
                activeOpacity={0.8}
              >
                <View style={[styles.bentoIconWrap, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="#64748B" />
                </View>
                <Text style={[styles.bentoLabel, isKhmer && styles.khmerButtonText]}>{t('classDetails.tools.message')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

          {/* TIMETABLE PREVIEW - HYPER-CLEAN CALENDAR VIEW */}
          {(timetable?.entries && timetable.entries.length > 0) ? (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                 <Text style={styles.sectionHeader}>{t('classDetails.classSchedule')}</Text>
                 <Ionicons name="calendar-outline" size={24} color={colors.text} />
              </View>

              {/* Day Selector */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.daySelectorScroll}
              >
                {scheduleDays.map((day, ix) => (
                  (() => {
                    const dayKey = (scheduleDayApiMap[ix] || 'monday').toUpperCase();
                    const dayTheme = SCHEDULE_DAY_THEMES[dayKey] || SCHEDULE_DAY_THEMES.MONDAY;
                    const isActive = selectedDayIndex === ix;
                    return (
                  <TouchableOpacity 
                    key={ix} 
                    style={[
                      styles.dayCircle,
                      {
                        borderColor: isActive ? dayTheme.deep : dayTheme.border,
                        backgroundColor: isActive ? dayTheme.deep : 'transparent',
                        shadowColor: isActive ? dayTheme.deep : 'transparent',
                      },
                      isActive && styles.dayCircleActive
                    ]} 
                    onPress={() => setSelectedDayIndex(ix)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayTextShort, isKhmer && styles.khmerInlineText, { color: isActive ? Colors.white : dayTheme.text }, isActive && styles.dayTextActive]}>
                      {t(`classDetails.daysShort.${scheduleDayApiMap[ix] || 'monday'}`)}
                    </Text>
                    {isActive && <View style={[styles.dayDot, { backgroundColor: Colors.white }]} />}
                  </TouchableOpacity>
                    );
                  })()
                ))}
              </ScrollView>

              {/* Timeline List */}
              <View style={styles.timelineWrapper}>
                <View style={[styles.timelineVerticalLine, { backgroundColor: activeScheduleDayTheme.border }]} />
                {selectedEntries.length > 0 ? (
                  selectedEntries.map((entry: any, i) => (
                    (() => {
                      const slotTheme = SCHEDULE_SLOT_THEMES[i % SCHEDULE_SLOT_THEMES.length];
                      return (
                    <View key={i} style={styles.timelineRow}>
                      <View style={styles.timePillContainer}>
                        <View style={[styles.timePill, { backgroundColor: slotTheme.tint, borderColor: slotTheme.border }]}>
                          <Text style={[styles.timePillText, { color: slotTheme.text }]}>{entry.period?.startTime || `0${(i+7)%12 || 12}:00`}</Text>
                        </View>
                      </View>

                      <View style={[styles.timelineCard, { borderColor: slotTheme.border, backgroundColor: slotTheme.soft }]}>
                        <View style={styles.cardLeft}>
                          {entry.teacher?.photoUrl || entry.teacher?.profilePictureUrl ? (
                            <Image
                              source={{ uri: entry.teacher?.photoUrl || entry.teacher?.profilePictureUrl }}
                              style={styles.cardAvatar}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={150}
                              recyclingKey={entry.teacher?.photoUrl || entry.teacher?.profilePictureUrl}
                            />
                          ) : (
                            <View style={[styles.cardAvatarFallback, { backgroundColor: slotTheme.tint }]}>
                              <Text style={[styles.cardAvatarText, { color: slotTheme.text }]}>{entry.teacher?.firstName?.[0] || 'T'}</Text>
                            </View>
                          )}
                          <View style={styles.cardInfo}>
                            <Text style={styles.cardTeacherName} numberOfLines={1}>
                              {entry.teacher
                                ? t('classDetails.teacherName', { name: formatName(entry.teacher.firstName, entry.teacher.lastName) })
                                : t('classDetails.classSession')}
                            </Text>
                            <View style={styles.cardMetaRow}>
                               <View style={[styles.cardMetaPill, { backgroundColor: Colors.white }]}>
                                 <Ionicons name="book" size={12} color={slotTheme.text} />
                                 <Text style={styles.cardSubjectName} numberOfLines={1}>
                                   {entry.subject?.name || t('classDetails.subject')} • {entry.period?.name || t('classDetails.period', { index: i + 1 })}
                                 </Text>
                               </View>
                            </View>
                            {user?.role === 'PARENT' && entry.teacher?.id && (
                               <TouchableOpacity 
                                  style={styles.actionLink}
                                  onPress={() => {
                                    handleStartConversation(entry.teacher.id, t('classDetails.teacherName', { name: entry.teacher.firstName || '' }));
                                  }}
                                  activeOpacity={0.7}
                               >
                                 <Ionicons name="chatbubble-ellipses" size={14} color="#0EA5E9" />
                                 <Text style={[styles.actionLinkText, isKhmer && styles.khmerInlineText]}>{t('classDetails.tools.message')}</Text>
                               </TouchableOpacity>
                             )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={slotTheme.border} />
                      </View>
                    </View>
                      );
                    })()
                  ))
                ) : (
                  <View style={styles.emptyDayContainer}>
                     <Text style={styles.emptyDayText}>{t('classDetails.noClassesScheduled', { day: scheduleDays[selectedDayIndex] })}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* TEACHERS LIST - BEAUTIFUL CARDS */}
          {uniqueTeachers.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                 <Text style={styles.sectionHeader}>{t('classDetails.classTeachers')}</Text>
                 <Ionicons name="school-outline" size={20} color={colors.textTertiary} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {uniqueTeachers.map((teacher: any, idx) => (
                  <TouchableOpacity
                    key={teacher.id || idx}
                    style={styles.teacherCard}
                    disabled={!canManageRecords || !teacher.id}
                    onPress={() => teacher.id && handleEditTeacher(teacher.id)}
                    activeOpacity={0.85}
                  >
                    {teacher.photoUrl || teacher.profilePictureUrl ? (
                      <Image
                        source={{ uri: teacher.photoUrl || teacher.profilePictureUrl }}
                        style={styles.teacherAvatarFallback}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                        recyclingKey={teacher.photoUrl || teacher.profilePictureUrl}
                      />
                    ) : (
                      <View style={styles.teacherAvatarFallback}>
                        <Text style={styles.teacherAvatarText}>{teacher.firstName?.[0] || 'T'}</Text>
                      </View>
                    )}
                    <Text style={styles.teacherName} numberOfLines={1}>{formatTeacherDisplayName(teacher, !isKhmer)}</Text>
                    <Text style={styles.teacherSubject} numberOfLines={1}>
                      {teacher.subjectNames?.length > 0 ? teacher.subjectNames.join(', ') : teacher.subject?.name || t('classDetails.teacher')}
                    </Text>
                    {canManageRecords && teacher.id ? (
                      <View style={styles.teacherEditPill}>
                        <Ionicons name="create-outline" size={12} color={colors.primary} />
                        <Text style={[styles.teacherEditText, isKhmer && styles.khmerInlineText]}>{t('common.edit')}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* TEACHER QUICK IMPORTER */}
          {myRole === 'TEACHER' && teacherSubjects.length > 0 && (
            <View style={[styles.sectionWrap, { paddingHorizontal: Spacing.xs }]}>
               <View style={styles.sectionCard}>
                 <Text style={styles.sectionTitle}>{t('classDetails.quickImport.title')}</Text>
                 <Text style={styles.sectionHint}>
                   {t('classDetails.quickImport.hint', { subject: selectedQuickSubject?.name || t('classDetails.subject') })}
                 </Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickSubjectScroll}>
                   {teacherSubjects.map((subject) => {
                     const active = selectedQuickSubjectId === subject.id;
                     return (
                       <TouchableOpacity
                         key={subject.id}
                         style={[styles.quickSubjectChip, active && styles.quickSubjectChipActive]}
                         onPress={() => setSelectedQuickSubjectId(subject.id)}
                         activeOpacity={0.8}
                       >
                         <Ionicons
                           name={active ? 'book' : 'book-outline'}
                           size={14}
                           color={active ? Colors.white : colors.textSecondary}
                         />
                         <Text style={[styles.quickSubjectChipText, active && styles.quickSubjectChipTextActive]}>
                           {subject.name}
                         </Text>
                       </TouchableOpacity>
                     );
                   })}
                 </ScrollView>
                 <TextInput
                   value={studentSearch}
                   onChangeText={setStudentSearch}
                   placeholder={t('classDetails.quickImport.searchStudents')}
                   placeholderTextColor={colors.textTertiary}
                   style={styles.input}
                 />
                 <View style={styles.scoreTable}>
                   {quickImportStudents.map((student) => (
                     <View key={student.id} style={styles.scoreRow}>
                       <Text style={styles.scoreName} numberOfLines={1}>
                         {formatName(student.firstName, student.lastName)}
                       </Text>
                       <TextInput
                         value={scoreByStudent[student.id] || ''}
                         onChangeText={(val) => handleScoreChange(student.id, val)}
                        placeholder={`0-${selectedQuickSubject?.maxScore || 100}`}
                         keyboardType="numeric"
                         placeholderTextColor={colors.textTertiary}
                         style={styles.scoreInput}
                       />
                     </View>
                   ))}
                 </View>
                 <TouchableOpacity
                   style={[styles.submitBtn, (uploading || !selectedQuickSubject) && styles.submitBtnDisabled]}
                   onPress={handleSubmitScores}
                   disabled={uploading || !selectedQuickSubject}
                 >
                   {uploading ? (
                     <ActivityIndicator size="small" color="#FFF" />
                   ) : (
                     <Text style={styles.submitText}>{t('classDetails.quickImport.saveScores')}</Text>
                   )}
                 </TouchableOpacity>
               </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgOrbPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: -60,
    right: -60,
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    bottom: -50,
    left: -30,
  },
  headerSafe: {
    backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  centerLogo: {
    flex: 1,
    alignItems: 'center',
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226,232,240,0.75)',
    backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(226,232,240,0.8)',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing.lg,
  },
  loadingBlurCard: {
    minWidth: 220,
    borderRadius: BorderRadius[20],
    borderWidth: 1,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    overflow: 'hidden',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  errorText: {
    color: colors.error,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing[12],
  },
  viewOnlyHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: isDark ? 'rgba(234,179,8,0.14)' : '#FFF7ED',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(234,179,8,0.35)' : '#FDE68A',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  viewOnlyHintText: {
    flex: 1,
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  
  // ─── PREMIUM HERO CARD (mirrors LearnHomeScreen's subjectCard treatment) ──
  heroCard: {
    marginHorizontal: 4,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 0,
  },
  heroFloatIcon: {
    position: 'absolute',
    top: 14,
    right: 64,
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    zIndex: 2,
  },
  heroCardContent: {
    padding: Spacing[5],
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroKickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroKickerText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontFamily: 'Koulen-Regular',
    fontSize: Typography.fontSize['2xl'],
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 38,
    marginTop: 8,
    paddingTop: Spacing.sm,
  },
  heroMeta: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingText: {
    position: 'absolute',
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.black,
    color: '#FFFFFF',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.8,
  },
  heroStatSep: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  sectionWrap: {
    marginTop: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  sectionSubheader: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textTertiary,
  },

  // -- BENTO GRID --
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    paddingHorizontal: Spacing.xs,
  },
  bentoItem: {
    width: '22.25%',
    aspectRatio: 0.88,
    backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.96)',
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'rgba(226,232,240,0.75)',
    ...Shadows.lg,
    shadowColor: isDark ? 'transparent' : Shadows.lg.shadowColor,
  },
  bentoIconWrap: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius[20],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  bentoLabel: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },

  // -- HYPER-CLEAN CALENDAR SCHEDULE --
  daySelectorScroll: {
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing[3],
  },
  dayCircle: {
    width: 52,
    height: 64,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    // shadowColor intentionally omitted — overridden per-day via SCHEDULE_DAY_THEMES inline style
    shadowOffset: Shadows.lg.shadowOffset,
    shadowOpacity: Shadows.lg.shadowOpacity,
    shadowRadius: Shadows.lg.shadowRadius,
    elevation: Shadows.lg.elevation,
  },
  dayTextShort: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: Colors.white,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: BorderRadius.full,
    position: 'absolute',
    bottom: 12,
  },
  timelineWrapper: {
    position: 'relative',
    marginTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 35, // Centered for the 70px wide time pill container
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'stretch',
    minHeight: 80,
  },
  timePillContainer: {
    width: 70,
    alignItems: 'center',
    zIndex: 1,
    paddingTop: Spacing.md, // Push the pill down slightly
  },
  timePill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius[20],
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.lg,
    shadowColor: isDark ? 'transparent' : Shadows.lg.shadowColor,
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
    borderWidth: 1,
    zIndex: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surfaceVariant,
    marginRight: Spacing[3],
  },
  cardAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  cardAvatarText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardTeacherName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  cardMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  cardSubjectName: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  actionLink: {
    marginTop: Spacing.xs,
  },
  actionLinkText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.success,
  },
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[10],
    paddingLeft: Spacing[10], // offset the timeline
  },
  emptyDayText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textTertiary,
    fontWeight: Typography.fontWeight.semibold,
  },

  // -- BEAUTIFUL TEACHERS LIST --
  horizontalScroll: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.md,
  },
  teacherCard: {
    backgroundColor: colors.surface,
    width: 130,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[5],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadows.lg,
    shadowColor: isDark ? 'transparent' : Shadows.lg.shadowColor,
  },
  teacherAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: isDark ? 'rgba(6,168,204,0.14)' : '#F0FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    borderWidth: 2,
    borderColor: isDark ? 'rgba(6,168,204,0.3)' : '#E0F2FE',
  },
  teacherAvatarText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.primary,
  },
  teacherName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: Spacing.xs,
  },
  teacherSubject: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  teacherEditPill: {
    marginTop: Spacing[3],
    paddingHorizontal: Spacing.sm,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(6,168,204,0.35)' : '#BAE6FD',
    backgroundColor: isDark ? 'rgba(6,168,204,0.16)' : '#E0F2FE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  teacherEditText: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    color: colors.primary,
  },

  // -- QUICK INPUT --
  sectionCard: {
    backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'rgba(226,232,240,0.9)',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.lg,
    shadowColor: isDark ? 'transparent' : Shadows.lg.shadowColor,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionHint: {
    fontSize: Typography.fontSize[13],
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: Typography.fontWeight.medium,
  },
  quickSubjectScroll: {
    gap: Spacing[3],
    paddingRight: Spacing.xs,
  },
  quickSubjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSubjectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickSubjectChipText: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.bold,
  },
  quickSubjectChipTextActive: {
    color: Colors.white,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.xl,
    height: 48,
    paddingHorizontal: Spacing.md,
    color: colors.text,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
  },
  scoreTable: {
    gap: Spacing[3],
    marginTop: Spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: 52,
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.xl,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
  },
  scoreName: {
    flex: 1,
    color: colors.text,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  scoreInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: isDark ? colors.border : '#DCEAF3',
    borderRadius: BorderRadius.xl,
    textAlign: 'center',
    color: colors.text,
    fontWeight: Typography.fontWeight.extrabold,
    fontSize: Typography.fontSize.base,
    backgroundColor: colors.surface,
  },
  submitBtn: {
    marginTop: Spacing.sm,
    height: 54,
    borderRadius: BorderRadius[20],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...Shadows.xl,
    shadowColor: colors.primary,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.white,
    fontSize: Typography.fontSize[16],
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: 0.5,
  },
  khmerInlineText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  khmerButtonText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
});

export default function ClassDetailsScreen() {
  const route = useRoute<any>();
  const params = (route.params || {}) as RouteParams;
  return <ClassHubView {...params} />;
}
