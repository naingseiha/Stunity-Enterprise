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

type RouteParams = {
  classId: string;
  className?: string;
  myRole?: 'STUDENT' | 'TEACHER';
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
  const myRole = params.myRole || (user?.role === 'TEACHER' ? 'TEACHER' : 'STUDENT');
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
    monthLabel: myRole === 'STUDENT' ? monthLabel : undefined,
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
          {/* DYNAMIC PREMIUM HERO CARD */}
          <View style={styles.heroCard}>
            {/* Abstract Background Shapes */}
            <View style={styles.heroDecoCircle1} />
            <View style={styles.heroDecoCircle2} />

            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>Grade {timetable?.class?.grade || '-'}</Text>
                </View>
                <View style={styles.heroIconBadge}>
                  <Ionicons name="star" size={16} color="#FFF" />
                </View>
              </View>
              
              <View style={styles.heroBottom}>
                <Text style={styles.heroSubtitle}>
                  {myRole === 'TEACHER' ? 'Teaching Class' : 'Study Class'}
                </Text>
                <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
                {timetable?.class?.track ? (
                  <View style={styles.trackBadge}>
                    <Text style={styles.trackBadgeText}>{timetable.class.track}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            
            {/* Frosted Stats Bar */}
            <View style={styles.heroStatsBox}>
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatVal}>{studentStats.total}</Text>
                <Text style={styles.heroStatLabel}>Total</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatVal}>{studentStats.male}</Text>
                <Text style={styles.heroStatLabel}>Male</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatVal}>{studentStats.female}</Text>
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
              onPress={() => navigation.navigate('ClassAnnouncements')}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="megaphone" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.bentoLabel}>Announce</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassAssignments')}
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
              onPress={() => navigation.navigate('ClassQuizzes')}
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
                  <TouchableOpacity 
                    key={ix} 
                    style={[styles.dayCircle, selectedDayIndex === ix && styles.dayCircleActive]} 
                    onPress={() => setSelectedDayIndex(ix)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayTextShort, selectedDayIndex === ix && styles.dayTextActive]}>
                      {day.substring(0,3).toUpperCase()}
                    </Text>
                    {selectedDayIndex === ix && <View style={styles.dayDot} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Timeline List */}
              <View style={styles.timelineWrapper}>
                <View style={styles.timelineVerticalLine} />
                {selectedEntries.length > 0 ? (
                  selectedEntries.map((entry: any, i) => (
                    <View key={i} style={styles.timelineRow}>
                      <View style={styles.timePillContainer}>
                        <View style={styles.timePill}>
                          <Text style={styles.timePillText}>{entry.period?.startTime || `0${(i+7)%12 || 12}:00`}</Text>
                        </View>
                      </View>

                      <View style={styles.timelineCard}>
                        <View style={styles.cardLeft}>
                          {entry.teacher?.photoUrl || entry.teacher?.profilePictureUrl ? (
                            <Image source={{ uri: entry.teacher?.photoUrl || entry.teacher?.profilePictureUrl }} style={styles.cardAvatar} />
                          ) : (
                            <View style={styles.cardAvatarFallback}>
                              <Text style={styles.cardAvatarText}>{entry.teacher?.firstName?.[0] || 'T'}</Text>
                            </View>
                          )}
                          <View style={styles.cardInfo}>
                            <Text style={styles.cardTeacherName} numberOfLines={1}>
                              {entry.teacher ? `Teacher ${formatName(entry.teacher.firstName, entry.teacher.lastName)}` : 'Class Session'}
                            </Text>
                            <View style={styles.cardMetaRow}>
                               <Ionicons name="book" size={12} color="#94A3B8" />
                               <Text style={styles.cardSubjectName} numberOfLines={1}>
                                 {entry.subject?.name || 'Subject'} • {entry.period?.name || `Period ${i+1}`}
                               </Text>
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
                        <Ionicons name="chevron-forward" size={20} color="#E2E8F0" />
                      </View>
                    </View>
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
  
  // -- BEAUTIFUL PREMIUM HERO CARD --
  heroCard: {
    backgroundColor: '#E0F7FA', // Material Light Teal / Cyan 50
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    marginTop: 4,
  },
  heroDecoCircle1: {
    position: 'absolute',
    width: 240, height: 240,
    borderRadius: 120,
    backgroundColor: '#FFCA28', // Material Amber 400 (Yellow)
    opacity: 0.25,
    top: -60, right: -40,
  },
  heroDecoCircle2: {
    position: 'absolute',
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: '#00BCD4', // Material Cyan 500
    opacity: 0.1,
    bottom: -60, left: -40,
  },
  heroContent: {
    padding: 24,
    paddingTop: 28,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  heroBadgeText: {
    color: '#006064',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroIconBadge: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#FFCA28',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FFCA28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  heroBottom: {
    marginTop: 24,
  },
  heroSubtitle: {
    color: '#0097A7', // Cyan 700
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#006064', // Deep Teal / Cyan 900
    letterSpacing: -0.5,
    marginTop: 2,
    paddingTop: 4,
  },
  trackBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  trackBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  heroStatsBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // White bar at the bottom
    borderTopWidth: 1,
    borderTopColor: '#B2EBF2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  heroStatCol: {
    alignItems: 'center',
    gap: 2,
  },
  heroStatVal: {
    color: '#00838F', // Cyan 800
    fontSize: 18,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: '#00ACC1', // Cyan 600
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#B2EBF2',
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    borderColor: Colors.primaryDark,
    borderWidth: 2,
    backgroundColor: '#F0FBFF',
  },
  dayTextShort: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dayTextActive: {
    color: Colors.primaryDark,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primaryDark,
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginLeft: 8,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#F8FAFC',
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
    backgroundColor: '#E0F2FE',
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
