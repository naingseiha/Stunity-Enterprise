import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#09CFF7',
  primaryDark: '#06A8CC',
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<classesApi.ClassStudent[]>([]);
  const [timetable, setTimetable] = useState<classesApi.TimetableResponse | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<classesApi.ClassAttendanceSummary | null>(null);
  const [classGradesReport, setClassGradesReport] = useState<classesApi.ClassGradesReport | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, unknown> | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [subjectSearch, setSubjectSearch] = useState('');
  const [scoreByStudent, setScoreByStudent] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(
    async (force?: boolean) => {
      if (!classId) {
        setError('Class not found');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (!force) setLoading(true);
        setError(null);

        if (force) {
          classesApi.invalidateMyClassesCache();
        }

        const { startDate, endDate } = getCurrentRange();

        const requests: Promise<any>[] = [
          classesApi.getClassStudents(classId),
          classesApi.getClassTimetable(classId),
          classesApi.getClassAttendanceSummary(classId, startDate, endDate),
          classesApi.getClassGradesReport(classId, { semester: 1 }),
        ];

        if (myRole === 'STUDENT' && params.linkedStudentId) {
          requests.push(classesApi.getStudentMonthlySummary(params.linkedStudentId, getCurrentMonthLabel()));
        }

        if (myRole === 'TEACHER' && params.linkedTeacherId) {
          requests.push(classesApi.getTeacherById(params.linkedTeacherId));
        }

        const result = await Promise.all(requests);
        let idx = 0;
        const roster = (result[idx++] || []) as classesApi.ClassStudent[];
        const table = (result[idx++] || {}) as classesApi.TimetableResponse;
        const attendance = (result[idx++] || {}) as classesApi.ClassAttendanceSummary;
        const gradesReport = (result[idx++] || {}) as classesApi.ClassGradesReport;

        setStudents(Array.isArray(roster) ? roster : []);
        setTimetable(table || null);
        setAttendanceSummary(attendance || null);
        setClassGradesReport(gradesReport || null);

        if (myRole === 'STUDENT' && params.linkedStudentId) {
          const month = (result[idx++] || null) as Record<string, unknown> | null;
          setMonthlySummary(month);
        } else {
          setMonthlySummary(null);
        }

        if (myRole === 'TEACHER' && params.linkedTeacherId) {
          const teacher = (result[idx++] || null) as TeacherInfo | null;
          setTeacherInfo(teacher);
        } else {
          setTeacherInfo(null);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load class details');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [classId, myRole, params.linkedStudentId, params.linkedTeacherId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const title = params.className || timetable?.class?.name || 'Class';
  const timetableEntriesCount = Array.isArray(timetable?.entries) ? timetable!.entries!.length : 0;

  const classRate = attendanceSummary?.summary?.averageAttendanceRate || 0;
  const classAverage = classGradesReport?.statistics?.classAverage || 0;
  const classRankCount = classGradesReport?.totalStudents || students.length;

  const studentAverage = Number(monthlySummary?.average || 0);
  const studentRank = Number(monthlySummary?.classRank || 0);
  const studentGradeLevel = String(monthlySummary?.gradeLevel || '-');

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
      return;
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
      return;
    }

    try {
      setUploading(true);
      await gradeApi.post('/grades/batch', { grades: payload });
      Alert.alert('Success', `Imported ${payload.length} score(s).`);
      setScoreByStudent({});
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Scores', err?.message || 'Failed to import scores');
    } finally {
      setUploading(false);
    }
  }, [canSubmitScores, classId, loadData, scoreByStudent, students, teacherSubjects]);

  const navigateToAttendance = useCallback(() => {
    navigation.navigate('MainTabs', {
      screen: 'ProfileTab',
      params: { screen: 'AttendanceReport' },
    });
  }, [navigation]);

  const navigateToGrades = useCallback(() => {
    navigation.navigate('MainTabs', {
      screen: 'ProfileTab',
      params: { screen: 'AcademicProfile' },
    });
  }, [navigation]);

  const handleMessageTeacher = useCallback(async () => {
    const homeroomTeacherId = params.homeroomTeacherId;
    if (!homeroomTeacherId) {
      Alert.alert('Messaging', 'No homeroom teacher assigned to this class.');
      return;
    }

    try {
      setLoading(true);
      const conversation = await startConversation([homeroomTeacherId]);
      if (conversation) {
        navigation.navigate('MessagesStack', {
          screen: 'Chat',
          params: {
            conversationId: conversation.id,
            displayName: conversation.displayName,
          }
        });
      }
    } catch (err: any) {
      Alert.alert('Messaging', err?.message || 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  }, [navigation, startConversation, params.homeroomTeacherId]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <StunityLogo width={108} height={30} />

          <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Loading class details...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(true)}>
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
              tintColor={COLORS.primaryDark}
              colors={[COLORS.primaryDark]}
            />
          }
        >
          {/* DYNAMIC HERO CARD */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Grade {timetable?.class?.grade || '-'}</Text>
              </View>
              <Ionicons name="school" size={24} color="#FFF" />
            </View>
            <View style={styles.heroBottom}>
              <Text style={styles.heroSubtitle}>
                {myRole === 'TEACHER' ? 'Teaching Class' : 'Study Class'}
              </Text>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroMeta}>
                {students.length} Students • {timetableEntriesCount} Timetable Entries
              </Text>
            </View>
          </View>

          {/* BENTO-BOX SHORTCUT GRID */}
          <Text style={styles.sectionHeader}>Class Hub Tools</Text>
          <View style={styles.bentoGrid}>
            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassAnnouncements')}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="megaphone" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.bentoLabel}>Announce</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassAssignments')}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="document-text" size={24} color="#EF4444" />
              </View>
              <Text style={styles.bentoLabel}>Assign</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassMaterials', { classId })}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="folder-open" size={24} color="#22C55E" />
              </View>
              <Text style={styles.bentoLabel}>Materials</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={navigateToAttendance}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="calendar" size={24} color="#F59E0B" />
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
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="bar-chart" size={24} color="#A855F7" />
              </View>
              <Text style={styles.bentoLabel}>Scores</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassQuizzes')}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#ECFEFF' }]}>
                <Ionicons name="help-circle" size={24} color="#06B6D4" />
              </View>
              <Text style={styles.bentoLabel}>Quizzes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={() => navigation.navigate('ClassMembers', { 
                classId, 
                homeroomTeacherId: params.homeroomTeacherId 
              })}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#FDE4CF' }]}>
                <Ionicons name="people" size={24} color="#F97316" />
              </View>
              <Text style={styles.bentoLabel}>Members</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bentoItem} 
              onPress={handleMessageTeacher}
            >
              <View style={[styles.bentoIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#64748B" />
              </View>
              <Text style={styles.bentoLabel}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* TEACHER QUICK IMPORTER (Collapsible or bottom section) */}
          {myRole === 'TEACHER' && teacherSubjects.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quick Score Import</Text>
              <Text style={styles.sectionHint}>
                Filter student list and quickly input scores for {teacherSubjects[0]?.name}.
              </Text>
              <TextInput
                value={subjectSearch}
                onChangeText={setSubjectSearch}
                placeholder="Search students..."
                placeholderTextColor={COLORS.textMuted}
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
                      placeholderTextColor={COLORS.textMuted}
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
          )}
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
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
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
    gap: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0EA5E9',
    borderRadius: 24,
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroBottom: {
    marginTop: 20,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bentoItem: {
    width: '22.5%', // Slightly under 25% to account for gaps
    aspectRatio: 0.85,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
  },
  scoreTable: {
    gap: 10,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  scoreInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontWeight: '700',
    backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    marginTop: 8,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
