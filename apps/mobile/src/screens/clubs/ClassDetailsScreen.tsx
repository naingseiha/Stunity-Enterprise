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
import { useAuthStore } from '@/stores';
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
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>
              {myRole === 'TEACHER' ? 'Teaching class details' : 'Study class details'}
            </Text>
            <Text style={styles.heroMeta}>
              {students.length} students • {timetableEntriesCount} timetable entries
            </Text>
          </View>

          <View style={styles.shortcutsRow}>
            <TouchableOpacity style={styles.shortcutCard} onPress={navigateToAttendance}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.shortcutTitle}>Attendance</Text>
              <Text style={styles.shortcutValue}>{Math.round(classRate)}%</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutCard} onPress={navigateToGrades}>
              <Ionicons name="bar-chart-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.shortcutTitle}>Grades</Text>
              <Text style={styles.shortcutValue}>{classAverage.toFixed(1)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Timetable</Text>
            <Text style={styles.sectionText}>
              Weekly entries: {timetableEntriesCount}
              {Array.isArray(timetable?.days) && timetable!.days!.length > 0 ? ` • Days: ${timetable!.days!.join(', ')}` : ''}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Class Report</Text>
            <Text style={styles.sectionText}>
              Attendance rate: {Math.round(classRate)}%{'\n'}
              Class average: {classAverage.toFixed(1)}{'\n'}
              Total students ranked: {classRankCount}
            </Text>
          </View>

          {myRole === 'STUDENT' ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>My Monthly Study Result</Text>
              <Text style={styles.sectionText}>
                Month: {getCurrentMonthLabel()}{'\n'}
                Score average: {studentAverage ? studentAverage.toFixed(1) : '-'}{'\n'}
                Rank: {studentRank || '-'}{'\n'}
                Grade level: {studentGradeLevel}
              </Text>
            </View>
          ) : null}

          {myRole === 'TEACHER' ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Import Scores</Text>
              <Text style={styles.sectionHint}>
                Assigned subjects: {teacherSubjects.map((s) => s.name).join(', ') || 'None'}
              </Text>

              <TextInput
                value={subjectSearch}
                onChangeText={setSubjectSearch}
                placeholder="Filter subject list..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
              />

              <Text style={styles.sectionHint}>
                Using subject: {teacherSubjects[0]?.name || 'No subject'}
              </Text>

              <View style={styles.scoreTable}>
                {students.slice(0, 12).map((student) => (
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
                style={[styles.submitBtn, (!canSubmitScores || uploading) && styles.submitBtnDisabled]}
                onPress={handleSubmitScores}
                disabled={!canSubmitScores || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Import Scores</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Student List</Text>
            {students.length === 0 ? (
              <Text style={styles.sectionText}>No students assigned to this class yet.</Text>
            ) : (
              students.map((student) => (
                <View key={student.id} style={styles.studentRow}>
                  <Ionicons name="person-circle-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.studentName}>
                    {formatName(student.firstName, student.lastName)}
                  </Text>
                </View>
              ))
            )}
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
    gap: 12,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
    gap: 6,
  },
  shortcutTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  shortcutValue: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
  },
  scoreTable: {
    gap: 8,
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
    width: 88,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontWeight: '700',
    backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    marginTop: 8,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  studentName: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
