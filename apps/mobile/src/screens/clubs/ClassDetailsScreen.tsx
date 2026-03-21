import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import StunityLogo from '../../../assets/Stunity.svg';
import { useAuthStore, useMessagingStore } from '@/stores';
import { classesApi, gradeApi } from '@/api';

const Colors = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  primary: '#09CFF7',
  primaryDark: '#0EA5E9',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

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
};

type TeacherSubject = {
  id: string;
  name: string;
};

type TeacherInfo = {
  data?: {
    subjects?: TeacherSubject[];
    subjectTeachers?: Array<{ subject: TeacherSubject }>;
  };
  subjects?: TeacherSubject[];
};

const getCurrentMonthLabel = (): string => {
  const now = new Date();
  return `Month ${now.getMonth() + 1}`;
};

const getCurrentRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: format(start), endDate: format(end) };
};

const extractTeacherSubjects = (teacherPayload: TeacherInfo | null): TeacherSubject[] => {
  if (!teacherPayload) return [];

  const direct = Array.isArray(teacherPayload.subjects) ? teacherPayload.subjects : [];
  const nestedDirect = Array.isArray(teacherPayload.data?.subjects) ? teacherPayload.data!.subjects! : [];
  const fromAssignments = Array.isArray(teacherPayload.data?.subjectTeachers)
    ? teacherPayload.data!.subjectTeachers!
        .map((st) => st.subject)
        .filter(Boolean)
    : [];

  const merged = [...direct, ...nestedDirect, ...fromAssignments];
  const map = new Map<string, TeacherSubject>();
  merged.forEach((subject) => {
    if (subject?.id) map.set(subject.id, subject);
  });

  return Array.from(map.values());
};

const formatName = (firstName?: string, lastName?: string) => `${firstName || ''} ${lastName || ''}`.trim();

export default function ClassDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const params = (route.params || {}) as RouteParams;

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
  const currentRange = useMemo(() => getCurrentRange(), []);
  const bundleOptions = useMemo<classesApi.GetClassDetailBundleOptions>(() => ({
    classId,
    myRole,
    linkedStudentId: params.linkedStudentId,
    linkedTeacherId: params.linkedTeacherId,
    startDate: currentRange.startDate,
    endDate: currentRange.endDate,
    semester: 1,
    monthLabel: myRole === 'STUDENT' || myRole === 'PARENT' ? monthLabel : undefined,
  }), [
    classId,
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

  const [loading, setLoading] = useState(!initialCachedBundle);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [students, setStudents] = useState<classesApi.ClassStudent[]>(initialCachedBundle?.students || []);
  const [timetable, setTimetable] = useState<classesApi.TimetableResponse | null>(initialCachedBundle?.timetable || null);
  const [attendanceSummary, setAttendanceSummary] = useState<classesApi.ClassAttendanceSummary | null>(initialCachedBundle?.attendanceSummary || null);
  const [classGradesReport, setClassGradesReport] = useState<classesApi.ClassGradesReport | null>(initialCachedBundle?.classGradesReport || null);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, unknown> | null>(initialCachedBundle?.monthlySummary || null);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>((initialCachedBundle?.teacherInfo as TeacherInfo | null) || null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [scoreByStudent, setScoreByStudent] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const hasVisibleDataRef = useRef(Boolean(initialCachedBundle));

  const applyBundle = useCallback((bundle: classesApi.ClassDetailBundle) => {
    setStudents(Array.isArray(bundle.students) ? bundle.students : []);
    setTimetable(bundle.timetable || null);
    setAttendanceSummary(bundle.attendanceSummary || null);
    setClassGradesReport(bundle.classGradesReport || null);
    setMonthlySummary(bundle.monthlySummary || null);
    setTeacherInfo((bundle.teacherInfo as TeacherInfo | null) || null);
    hasVisibleDataRef.current = true;
  }, []);

  const loadData = useCallback(
    async (options?: { force?: boolean; preserveVisibleContent?: boolean }) => {
      const force = options?.force ?? false;
      const preserveVisibleContent = options?.preserveVisibleContent ?? false;

      if (!classId) {
        setError('Class not found');
        setLoading(false);
        setRefreshing(false);
        setBackgroundRefreshing(false);
        return;
      }

      try {
        if (preserveVisibleContent && hasVisibleDataRef.current) {
          setBackgroundRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        if (force) {
          classesApi.invalidateMyClassesCache();
          classesApi.invalidateClassDetailBundleCache(classId);
        }

        const bundle = await classesApi.getClassDetailBundle(bundleOptions, force);
        applyBundle(bundle);
      } catch (err: any) {
        if (!hasVisibleDataRef.current || force) {
          setError(err?.message || 'Failed to load class details');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setBackgroundRefreshing(false);
      }
    },
    [applyBundle, bundleOptions, classId]
  );

  useEffect(() => {
    hasVisibleDataRef.current = Boolean(initialCachedBundle);
    if (initialCachedBundle) {
      applyBundle(initialCachedBundle);
      loadData({ preserveVisibleContent: true });
      return;
    }

    loadData();
  }, [applyBundle, initialCachedBundle, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData({ force: true, preserveVisibleContent: true });
  }, [loadData]);

  const title = params.className || timetable?.class?.name || 'Class';
  
  const studentAverage = Number(monthlySummary?.average || 0);
  const studentRank = Number(monthlySummary?.classRank || 0);
  const studentGradeLevel = String(monthlySummary?.gradeLevel || '-');

  const studentStats = useMemo(() => {
    let male = 0;
    let female = 0;
    students.forEach(s => {
      const g = (s.gender || '').toUpperCase();
      if (g === 'MALE' || g === 'M') male++;
      else if (g === 'FEMALE' || g === 'F') female++;
    });
    return { total: students.length, male, female };
  }, [students]);

  const uniqueTeachers = useMemo(() => {
    if (!timetable?.entries) return [];
    const map = new Map();
    timetable.entries.forEach((e: any) => {
      if (e.teacher && e.teacher.id) {
        map.set(e.teacher.id, { ...e.teacher, subject: e.subject });
      }
    });
    return Array.from(map.values());
  }, [timetable]);

  const scheduleDays = useMemo(() => {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }, []);

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const idx = scheduleDays.indexOf(today);
    setSelectedDayIndex(idx !== -1 ? idx : 0);
  }, [scheduleDays]);

  const selectedEntries = useMemo(() => {
     if (!timetable?.entries) return [];
     const activeDay = (scheduleDays[selectedDayIndex] || '').toLowerCase();
     return timetable.entries.filter((e: any) => {
       const d = (e.day || '').toLowerCase();
       const dw = (e.dayOfWeek || '').toLowerCase();
       return d === activeDay || dw === activeDay;
     });
  }, [timetable, scheduleDays, selectedDayIndex]);
  const activeScheduleDayKey = useMemo(
    () => (scheduleDays[selectedDayIndex] || 'Monday').toUpperCase(),
    [scheduleDays, selectedDayIndex]
  );
  const activeScheduleDayTheme = SCHEDULE_DAY_THEMES[activeScheduleDayKey] || SCHEDULE_DAY_THEMES.MONDAY;

  const teacherSubjects = useMemo(() => {
    const subjects = extractTeacherSubjects(teacherInfo);
    if (!subjectSearch.trim()) return subjects;
    const query = subjectSearch.trim().toLowerCase();
    return subjects.filter((s) => (s.name || '').toLowerCase().includes(query));
  }, [teacherInfo, subjectSearch]);

  const canSubmitScores = myRole === 'TEACHER' && Boolean(params.linkedTeacherId) && teacherSubjects.length > 0;

  const handleScoreChange = useCallback((studentId: string, value: string) => {
    setScoreByStudent((prev) => ({ ...prev, [studentId]: value }));
  }, []);

  const handleSubmitScores = useCallback(async () => {
    if (!canSubmitScores) {
      Alert.alert('Scores', 'No assigned subjects found for this teacher.');
      return false;
    }

    const selectedSubject = teacherSubjects[0];
    const payload = students
      .map((student) => ({
        student,
        raw: scoreByStudent[student.id],
      }))
      .filter((row) => row.raw !== undefined && row.raw !== '')
      .map((row) => {
        const score = Number(row.raw);
        return {
          studentId: row.student.id,
          subjectId: selectedSubject.id,
          classId,
          score,
          maxScore: 100,
          month: getCurrentMonthLabel(),
          monthNumber: new Date().getMonth() + 1,
        };
      })
      .filter((row) => Number.isFinite(row.score) && row.score >= 0 && row.score <= 100);

    if (payload.length === 0) {
      Alert.alert('Scores', 'Enter at least one valid score between 0 and 100.');
      return false;
    }

    try {
      setUploading(true);
      await gradeApi.post('/grades/batch', { grades: payload });
      Alert.alert('Success', `Imported ${payload.length} score(s).`);
      setScoreByStudent({});
      await loadData({ force: true, preserveVisibleContent: true });
      return true;
    } catch (err: any) {
      Alert.alert('Scores', err?.message || 'Failed to import scores');
      return false;
    } finally {
      setUploading(false);
    }
  }, [canSubmitScores, classId, loadData, scoreByStudent, students, teacherSubjects]);

  const hasUnsavedQuickScores = Object.values(scoreByStudent).some(score => score !== '');
  const canMessageTeacher = user?.role === 'PARENT' && Boolean(params.homeroomTeacherId);
  const rolePresentation = useMemo(() => {
    switch (myRole) {
      case 'TEACHER':
        return { icon: 'school-outline' as const, label: 'Teaching' };
      case 'PARENT':
        return { icon: 'people-outline' as const, label: 'Monitoring' };
      case 'ADMIN':
      case 'STAFF':
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return { icon: 'shield-checkmark-outline' as const, label: 'Reviewing' };
      default:
        return { icon: 'book-outline' as const, label: 'Studying' };
    }
  }, [myRole]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedQuickScores || uploading) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Unsaved Changes',
        'You have unsaved quick scores. If you leave now, they will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: 'Save Scores',
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
  }, [navigation, hasUnsavedQuickScores, uploading, handleSubmitScores]);

  const navigateToAttendance = useCallback(() => {
    navigation.navigate('ClassAttendance', { classId, className: title });
  }, [navigation, classId, title]);

  const handleStartConversation = useCallback(async (participantId: string, displayName: string) => {
    try {
      const conversation = await startConversation([participantId]);
      if (conversation) {
        navigation.navigate('MessagesStack', {
          screen: 'Chat',
          params: {
            conversationId: conversation.id,
            displayName: displayName || conversation.displayName,
          }
        });
      }
    } catch (err: any) {
      Alert.alert('Messaging', err?.message || 'Failed to start conversation');
    }
  }, [navigation, startConversation]);

  const handleMessageTeacher = useCallback(async () => {
    const homeroomTeacherId = params.homeroomTeacherId;
    if (!homeroomTeacherId) {
      Alert.alert('Messaging', 'No homeroom teacher assigned to this class.');
      return;
    }
    handleStartConversation(homeroomTeacherId, 'Homeroom Teacher');
  }, [params.homeroomTeacherId, handleStartConversation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <StunityLogo width={108} height={30} />

          <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
            {refreshing || backgroundRefreshing ? (
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.loadingText}>Loading class details...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData({ force: true })}>
            <Text style={styles.retryText}>Retry</Text>
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
              tintColor={Colors.primaryDark}
              colors={[Colors.primaryDark]}
            />
          }
        >
          {/* PREMIUM HERO CARD */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#0891B2', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroGlowBlob} />

            {/* Top row: label pill + grade pill */}
            <View style={styles.heroHeader}>
              <View style={styles.heroRolePill}>
                <Ionicons
                  name={rolePresentation.icon}
                  size={11}
                  color="#fff"
                />
                <Text style={styles.heroRoleText}>
                  {rolePresentation.label}
                </Text>
              </View>
              <View style={styles.heroGradePill}>
                <Text style={styles.heroGradePillText}>
                  Grade {timetable?.class?.grade || '—'}
                </Text>
              </View>
            </View>

            {/* Main title */}
            <View style={styles.heroBody}>
              <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
              {timetable?.class?.track ? (
                <Text style={styles.heroTrack}>{timetable.class.track}</Text>
              ) : null}
            </View>

            {/* Stats row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{studentStats.total}</Text>
                <Text style={styles.heroStatLabel}>Students</Text>
              </View>
              <View style={styles.heroStatSep} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{studentStats.male}</Text>
                <Text style={styles.heroStatLabel}>Male</Text>
              </View>
              <View style={styles.heroStatSep} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{studentStats.female}</Text>
                <Text style={styles.heroStatLabel}>Female</Text>
              </View>
            </View>
          </View>

          {/* BENTO-BOX SHORTCUT GRID */}
          <View style={styles.sectionHeaderRow}>
             <Text style={styles.sectionHeader}>Class Hub Tools</Text>
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
              <Text style={styles.bentoLabel}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassAnnouncements', { classId })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="megaphone" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.bentoLabel}>Announce</Text>
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
              <Text style={styles.bentoLabel}>Assign</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassMaterials', { classId })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="folder-open" size={24} color="#22C55E" />
              </View>
              <Text style={styles.bentoLabel}>Materials</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={navigateToAttendance}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.bentoLabel}>Attend</Text>
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
              <Text style={styles.bentoLabel}>Scores</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassQuizzes', { classId })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#ECFEFF' }]}>
                <Ionicons name="extension-puzzle" size={24} color="#06B6D4" />
              </View>
              <Text style={styles.bentoLabel}>Quizzes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassMembers', { 
                classId, 
                homeroomTeacherId: params.homeroomTeacherId 
              })}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FDE4CF' }]}>
                <Ionicons name="people" size={24} color="#F97316" />
              </View>
              <Text style={styles.bentoLabel}>Members</Text>
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
                <Text style={styles.bentoLabel}>Message</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* TIMETABLE PREVIEW - HYPER-CLEAN CALENDAR VIEW */}
          {(timetable?.entries && timetable.entries.length > 0) ? (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                 <Text style={styles.sectionHeader}>Class Schedule</Text>
                 <Ionicons name="calendar-outline" size={24} color={Colors.textPrimary} />
              </View>

              {/* Day Selector */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.daySelectorScroll}
              >
                {scheduleDays.map((day, ix) => (
                  (() => {
                    const dayKey = day.toUpperCase();
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
                    <Text style={[styles.dayTextShort, { color: isActive ? '#FFF' : dayTheme.text }, isActive && styles.dayTextActive]}>
                      {day.substring(0,3).toUpperCase()}
                    </Text>
                    {isActive && <View style={[styles.dayDot, { backgroundColor: '#FFF' }]} />}
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
                            <Image source={{ uri: entry.teacher?.photoUrl || entry.teacher?.profilePictureUrl }} style={styles.cardAvatar} />
                          ) : (
                            <View style={[styles.cardAvatarFallback, { backgroundColor: slotTheme.tint }]}>
                              <Text style={[styles.cardAvatarText, { color: slotTheme.text }]}>{entry.teacher?.firstName?.[0] || 'T'}</Text>
                            </View>
                          )}
                          <View style={styles.cardInfo}>
                            <Text style={styles.cardTeacherName} numberOfLines={1}>
                              {entry.teacher ? `Teacher ${formatName(entry.teacher.firstName, entry.teacher.lastName)}` : 'Class Session'}
                            </Text>
                            <View style={styles.cardMetaRow}>
                               <View style={[styles.cardMetaPill, { backgroundColor: '#FFFFFF' }]}>
                                 <Ionicons name="book" size={12} color={slotTheme.text} />
                                 <Text style={styles.cardSubjectName} numberOfLines={1}>
                                   {entry.subject?.name || 'Subject'} • {entry.period?.name || `Period ${i+1}`}
                                 </Text>
                               </View>
                            </View>
                            {user?.role === 'PARENT' && entry.teacher?.id && (
                               <TouchableOpacity 
                                  style={styles.actionLink}
                                  onPress={() => {
                                    handleStartConversation(entry.teacher.id, `Teacher ${entry.teacher.firstName}`);
                                  }}
                                  activeOpacity={0.7}
                               >
                                 <Ionicons name="chatbubble-ellipses" size={14} color="#0EA5E9" />
                                 <Text style={styles.actionLinkText}>Message</Text>
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
                     <Text style={styles.emptyDayText}>No classes scheduled for {scheduleDays[selectedDayIndex]}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* TEACHERS LIST - BEAUTIFUL CARDS */}
          {uniqueTeachers.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                 <Text style={styles.sectionHeader}>Class Teachers</Text>
                 <Ionicons name="school-outline" size={20} color={Colors.textMuted} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {uniqueTeachers.map((teacher: any, idx) => (
                  <View key={teacher.id || idx} style={styles.teacherCard}>
                    {teacher.photoUrl || teacher.profilePictureUrl ? (
                      <Image source={{ uri: teacher.photoUrl || teacher.profilePictureUrl }} style={styles.teacherAvatarFallback} />
                    ) : (
                      <View style={styles.teacherAvatarFallback}>
                        <Text style={styles.teacherAvatarText}>{teacher.firstName?.[0] || 'T'}</Text>
                      </View>
                    )}
                    <Text style={styles.teacherName} numberOfLines={1}>{formatName(teacher.firstName, teacher.lastName)}</Text>
                    <Text style={styles.teacherSubject} numberOfLines={1}>{teacher.subject?.name || 'Teacher'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* TEACHER QUICK IMPORTER */}
          {myRole === 'TEACHER' && teacherSubjects.length > 0 && (
            <View style={[styles.sectionWrap, { paddingHorizontal: 4 }]}>
               <View style={styles.sectionCard}>
                 <Text style={styles.sectionTitle}>Quick Score Import</Text>
                 <Text style={styles.sectionHint}>
                   Filter student list and quickly input scores for {teacherSubjects[0]?.name}.
                 </Text>
                 <TextInput
                   value={subjectSearch}
                   onChangeText={setSubjectSearch}
                   placeholder="Search students..."
                   placeholderTextColor={Colors.textMuted}
                   style={styles.input}
                 />
                 <View style={styles.scoreTable}>
                   {students.slice(0, 5).map((student) => (
                     <View key={student.id} style={styles.scoreRow}>
                       <Text style={styles.scoreName} numberOfLines={1}>
                         {formatName(student.firstName, student.lastName)}
                       </Text>
                       <TextInput
                         value={scoreByStudent[student.id] || ''}
                         onChangeText={(val) => handleScoreChange(student.id, val)}
                         placeholder="0-100"
                         keyboardType="numeric"
                         placeholderTextColor={Colors.textMuted}
                         style={styles.scoreInput}
                       />
                     </View>
                   ))}
                 </View>
                 <TouchableOpacity
                   style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
                   onPress={handleSubmitScores}
                   disabled={uploading}
                 >
                   {uploading ? (
                     <ActivityIndicator size="small" color="#FFF" />
                   ) : (
                     <Text style={styles.submitText}>Save Scores</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafe: {
    backgroundColor: Colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  
  // ─── PREMIUM HERO CARD ───────────────────────────────────────
  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroGlowBlob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FFFFFF',
    opacity: 0.08,
    top: -80,
    right: -60,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 20,
  },
  heroRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  heroRoleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroGradePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  heroGradePillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  heroBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 42,   // Generous line-height so top of Khmer chars never clips
  },
  heroTrack: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  heroStatSep: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  sectionWrap: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },

  // -- BENTO GRID --
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 4,
  },
  bentoItem: {
    width: '22.5%', 
    aspectRatio: 0.85,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // -- HYPER-CLEAN CALENDAR SCHEDULE --
  daySelectorScroll: {
    paddingHorizontal: 4,
    paddingBottom: 16,
    gap: 12,
  },
  dayCircle: {
    width: 52,
    height: 64,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  dayTextShort: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dayTextActive: {
    color: '#FFF',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 12,
  },
  timelineWrapper: {
    position: 'relative',
    marginTop: 8,
    paddingBottom: 16,
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 35, // Centered for the 70px wide time pill container
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'stretch',
    minHeight: 80,
  },
  timePillContainer: {
    width: 70,
    alignItems: 'center',
    zIndex: 1,
    paddingTop: 16, // Push the pill down slightly
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 2,
    marginLeft: 8,
    marginRight: 4,
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
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  cardAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  cardInfo: {
    flex: 1,
  },
  cardTeacherName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  cardMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cardSubjectName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  actionLink: {
    marginTop: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.success,
  },
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingLeft: 40, // offset the timeline
  },
  emptyDayText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  // -- BEAUTIFUL TEACHERS LIST --
  horizontalScroll: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 16,
  },
  teacherCard: {
    backgroundColor: Colors.surface,
    width: 130,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  teacherAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  teacherAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  teacherSubject: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // -- QUICK INPUT --
  sectionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: '#F8FAFC',
  },
  scoreTable: {
    gap: 12,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  scoreInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
    backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
