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

import { clubAcademicsApi, clubsApi } from '@/api';
import type { ClubMember } from '@/api/clubs';
import type { ClubsStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores';

const COLORS = {
  bg: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#09CFF7',
  primaryDark: '#06A8CC',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
};

const ATTENDANCE_STATUS_META: Record<
  clubAcademicsApi.ClubAttendanceStatus,
  { label: string; color: string; bg: string }
> = {
  PRESENT: { label: 'Present', color: '#166534', bg: '#DCFCE7' },
  ABSENT: { label: 'Absent', color: '#991B1B', bg: '#FEE2E2' },
  LATE: { label: 'Late', color: '#9A3412', bg: '#FFEDD5' },
  EXCUSED: { label: 'Excused', color: '#5B21B6', bg: '#EDE9FE' },
};

const ASSESSMENT_TYPES = ['QUIZ', 'ASSIGNMENT', 'EXAM', 'PROJECT'] as const;

type RankedMember = {
  memberId: string;
  name: string;
  average: number;
  gradeCount: number;
};

const getMemberDisplayName = (member: ClubMember | undefined): string => {
  if (!member?.user) return 'Unknown';
  return `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || 'Member';
};

const normalizeTerm = (value?: string | null): string => {
  const trimmed = String(value || '').trim();
  return trimmed.length > 0 ? trimmed : 'Unspecified';
};

const buildRankings = (
  grades: clubAcademicsApi.ClubGrade[],
  members: ClubMember[]
): RankedMember[] => {
  const byMember = new Map<string, { total: number; count: number }>();

  grades.forEach((grade) => {
    const current = byMember.get(grade.memberId) || { total: 0, count: 0 };
    current.total += Number(grade.percentage || 0);
    current.count += 1;
    byMember.set(grade.memberId, current);
  });

  return Array.from(byMember.entries())
    .map(([memberId, agg]) => {
      const member = members.find((m) => m.id === memberId);
      return {
        memberId,
        name: getMemberDisplayName(member),
        average: agg.count > 0 ? agg.total / agg.count : 0,
        gradeCount: agg.count,
      };
    })
    .sort((a, b) => b.average - a.average);
};

const computeGradeStats = (
  grades: clubAcademicsApi.ClubGrade[]
): clubAcademicsApi.ClubGradeStatistics => {
  if (grades.length === 0) {
    return {
      totalGrades: 0,
      averagePercentage: 0,
      highestPercentage: 0,
      lowestPercentage: 0,
      passingRate: 0,
      byAssessmentType: {},
    };
  }

  const percentages = grades.map((g) => Number(g.percentage || 0));
  const total = percentages.reduce((sum, p) => sum + p, 0);
  const averagePercentage = total / percentages.length;
  const highestPercentage = Math.max(...percentages);
  const lowestPercentage = Math.min(...percentages);
  const passingRate = (percentages.filter((p) => p >= 60).length / percentages.length) * 100;

  const byAssessmentType = grades.reduce<Record<string, { count: number; total: number; averagePercentage: number }>>(
    (acc, grade) => {
      const key = grade.assessmentType || 'OTHER';
      if (!acc[key]) {
        acc[key] = { count: 0, total: 0, averagePercentage: 0 };
      }
      acc[key].count += 1;
      acc[key].total += Number(grade.percentage || 0);
      return acc;
    },
    {}
  );

  Object.keys(byAssessmentType).forEach((type) => {
    const item = byAssessmentType[type];
    item.averagePercentage = item.count > 0 ? item.total / item.count : 0;
    delete (item as any).total;
  });

  return {
    totalGrades: grades.length,
    averagePercentage,
    highestPercentage,
    lowestPercentage,
    passingRate,
    byAssessmentType: byAssessmentType as Record<string, { count: number; averagePercentage: number }>,
  };
};

const getSubjectLabel = (subject: clubAcademicsApi.ClubSubject): string => {
  if (subject.code) return `${subject.name} (${subject.code})`;
  return subject.name;
};

const getReportList = (source: any, keys: string[]): string[] => {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }
  }
  return [];
};

const isPermissionError = (reason: any): boolean => {
  const code = String(reason?.code || '').toUpperCase();
  const status = Number(reason?.status || reason?.response?.status || 0);
  const message = String(reason?.message || '').toLowerCase();

  return (
    code === 'FORBIDDEN' ||
    status === 403 ||
    message.includes('permission') ||
    message.includes('forbidden')
  );
};

export default function ClubAcademicsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { clubId, clubName } = route.params as ClubsStackParamList['ClubAcademics'];
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [subjects, setSubjects] = useState<clubAcademicsApi.ClubSubject[]>([]);
  const [grades, setGrades] = useState<clubAcademicsApi.ClubGrade[]>([]);
  const [sessions, setSessions] = useState<clubAcademicsApi.ClubSession[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<clubAcademicsApi.ClubAttendanceStatistics | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<clubAcademicsApi.ClubAttendanceRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [clubReport, setClubReport] = useState<any | null>(null);

  const [selectedTerm, setSelectedTerm] = useState<string>('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [assessmentType, setAssessmentType] = useState<(typeof ASSESSMENT_TYPES)[number]>('QUIZ');

  const [scoreInput, setScoreInput] = useState('');
  const [maxScoreInput, setMaxScoreInput] = useState('100');
  const [assessmentName, setAssessmentName] = useState('');
  const [termInput, setTermInput] = useState('Term 1');

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectWeight, setNewSubjectWeight] = useState('1');

  const studentMembers = useMemo(
    () => members.filter((m) => m.role === 'STUDENT' && m.isActive),
    [members]
  );

  const myMembership = useMemo(
    () => members.find((member) => member.userId === user?.id),
    [members, user?.id]
  );

  const canManageAcademic = useMemo(() => {
    return Boolean(
      myMembership && ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'].includes(myMembership.role)
    );
  }, [myMembership]);

  const canCreateSubjects = useMemo(() => {
    return Boolean(myMembership && ['OWNER', 'INSTRUCTOR'].includes(myMembership.role));
  }, [myMembership]);

  const availableTerms = useMemo(() => {
    const unique = new Set<string>();
    grades.forEach((grade) => {
      unique.add(normalizeTerm(grade.term));
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [grades]);

  const filteredGrades = useMemo(() => {
    if (selectedTerm === 'ALL') return grades;
    return grades.filter((grade) => normalizeTerm(grade.term) === selectedTerm);
  }, [grades, selectedTerm]);

  const gradeStats = useMemo(() => computeGradeStats(filteredGrades), [filteredGrades]);

  const rankings = useMemo(() => buildRankings(filteredGrades, members), [filteredGrades, members]);

  const subjectUsage = useMemo(() => {
    const counts = new Map<string, number>();
    grades.forEach((grade) => {
      counts.set(grade.subjectId, (counts.get(grade.subjectId) || 0) + 1);
    });
    return counts;
  }, [grades]);

  const assessmentBreakdown = useMemo(() => {
    const entries = Object.entries(gradeStats.byAssessmentType || {});
    return entries.sort((a, b) => b[1].count - a[1].count);
  }, [gradeStats.byAssessmentType]);

  const reportStrengths = useMemo(
    () => getReportList(clubReport?.summary || {}, ['strengths', 'strongPoints']),
    [clubReport]
  );
  const reportImprovements = useMemo(
    () => getReportList(clubReport?.summary || {}, ['areasForImprovement', 'improvements']),
    [clubReport]
  );
  const reportRecommendations = useMemo(
    () => getReportList(clubReport?.summary || {}, ['recommendations']),
    [clubReport]
  );

  const sessionAttendanceSummary = useMemo(() => {
    const summary: Record<clubAcademicsApi.ClubAttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    attendanceRecords.forEach((record) => {
      if (summary[record.status] !== undefined) {
        summary[record.status] += 1;
      }
    });
    return summary;
  }, [attendanceRecords]);

  const fetchAttendanceForSession = useCallback(async (sessionId: string) => {
    try {
      const records = await clubAcademicsApi.getSessionAttendance(sessionId);
      setAttendanceRecords(records);
    } catch (err: any) {
      setAttendanceRecords([]);
      setError(err?.message || 'Failed to load attendance records');
    }
  }, []);

  const fetchAll = useCallback(
    async (force = false) => {
      if (!force) setLoading(true);

      try {
        setError(null);
        const coreResults = await Promise.allSettled([
          clubsApi.getClubMembers(clubId, force),
          clubAcademicsApi.getClubSubjects(clubId),
          clubAcademicsApi.getClubGrades(clubId),
          clubAcademicsApi.getClubSessions(clubId),
          clubAcademicsApi.getClubAttendanceStatistics(clubId),
        ]);

        const membersResult = coreResults[0];
        const fetchedMembers = membersResult.status === 'fulfilled' ? membersResult.value || [] : [];

        if (membersResult.status === 'fulfilled') setMembers(fetchedMembers);
        if (coreResults[1].status === 'fulfilled') setSubjects(coreResults[1].value || []);
        if (coreResults[2].status === 'fulfilled') setGrades(coreResults[2].value || []);
        if (coreResults[3].status === 'fulfilled') setSessions(coreResults[3].value || []);
        if (coreResults[4].status === 'fulfilled') setAttendanceStats(coreResults[4].value || null);

        const firstCoreError = coreResults.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;

        if (firstCoreError?.reason) {
          setError(firstCoreError.reason?.message || 'Some academic data could not be loaded');
          return;
        }

        const currentMembership = fetchedMembers.find((member) => member.userId === user?.id);
        const canViewReport = Boolean(
          currentMembership && ['OWNER', 'INSTRUCTOR'].includes(currentMembership.role)
        );

        if (!canViewReport) {
          setClubReport(null);
          return;
        }

        try {
          const report = await clubAcademicsApi.getClubReport(clubId);
          setClubReport(report || null);
        } catch (reportError: any) {
          setClubReport(null);
          if (!isPermissionError(reportError)) {
            setError(reportError?.message || 'Some academic data could not be loaded');
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clubId, user?.id]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedMemberId && studentMembers.length > 0) {
      setSelectedMemberId(studentMembers[0].id);
    }
  }, [selectedMemberId, studentMembers]);

  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [selectedSubjectId, subjects]);

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchAttendanceForSession(selectedSessionId);
    } else {
      setAttendanceRecords([]);
    }
  }, [fetchAttendanceForSession, selectedSessionId]);

  useEffect(() => {
    if (selectedTerm !== 'ALL' && !availableTerms.includes(selectedTerm)) {
      setSelectedTerm('ALL');
    }
  }, [availableTerms, selectedTerm]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll(true);
  }, [fetchAll]);

  const handleCreateSubject = useCallback(async () => {
    if (!canCreateSubjects) return;
    if (!newSubjectName.trim()) {
      Alert.alert('Subject required', 'Please enter a subject name.');
      return;
    }

    const code = newSubjectCode.trim().toUpperCase() || `SUBJ${Date.now().toString().slice(-4)}`;
    const weight = Number(newSubjectWeight || '1');

    if (!Number.isFinite(weight) || weight <= 0) {
      Alert.alert('Invalid weight', 'Subject weight must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      await clubAcademicsApi.createClubSubject(clubId, {
        name: newSubjectName.trim(),
        code,
        weight,
        maxScore: 100,
      });
      setNewSubjectName('');
      setNewSubjectCode('');
      setNewSubjectWeight('1');
      await fetchAll(true);
    } catch (err: any) {
      Alert.alert('Failed to create subject', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canCreateSubjects, clubId, fetchAll, newSubjectCode, newSubjectName, newSubjectWeight]);

  const handleCreateGrade = useCallback(async () => {
    if (!canManageAcademic) return;
    if (!selectedMemberId || !selectedSubjectId) {
      Alert.alert('Missing data', 'Select both student and subject.');
      return;
    }

    const score = Number(scoreInput);
    const maxScore = Number(maxScoreInput) || 100;

    if (!Number.isFinite(score) || score < 0) {
      Alert.alert('Invalid score', 'Please enter a valid score.');
      return;
    }

    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      Alert.alert('Invalid max score', 'Max score must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      await clubAcademicsApi.createClubGrade(clubId, {
        memberId: selectedMemberId,
        subjectId: selectedSubjectId,
        score,
        maxScore,
        assessmentType,
        assessmentName: assessmentName.trim() || assessmentType,
        term: termInput.trim() || undefined,
      });
      setScoreInput('');
      setAssessmentName('');
      if (termInput.trim().length > 0) {
        setSelectedTerm(normalizeTerm(termInput));
      }
      await fetchAll(true);
    } catch (err: any) {
      Alert.alert('Failed to save grade', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    assessmentName,
    assessmentType,
    canManageAcademic,
    clubId,
    fetchAll,
    maxScoreInput,
    scoreInput,
    selectedMemberId,
    selectedSubjectId,
    termInput,
  ]);

  const handleCreateSession = useCallback(async () => {
    if (!canManageAcademic) return;

    const now = new Date();
    const isoDate = now.toISOString();
    const title = `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    try {
      setSubmitting(true);
      const session = await clubAcademicsApi.createClubSession(clubId, {
        title,
        sessionDate: isoDate,
      });
      await fetchAll(true);
      if (session?.id) setSelectedSessionId(session.id);
    } catch (err: any) {
      Alert.alert('Failed to create session', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canManageAcademic, clubId, fetchAll]);

  const handleMarkAttendance = useCallback(
    async (memberId: string, status: clubAcademicsApi.ClubAttendanceStatus) => {
      if (!canManageAcademic || !selectedSessionId) return;
      try {
        await clubAcademicsApi.markSessionAttendance(selectedSessionId, { memberId, status });
        await Promise.all([
          fetchAttendanceForSession(selectedSessionId),
          (async () => {
            const nextStats = await clubAcademicsApi.getClubAttendanceStatistics(clubId);
            setAttendanceStats(nextStats);
          })(),
        ]);
      } catch (err: any) {
        Alert.alert('Attendance failed', err?.message || 'Please try again.');
      }
    },
    [canManageAcademic, clubId, fetchAttendanceForSession, selectedSessionId]
  );

  const getCurrentAttendanceStatus = useCallback(
    (memberId: string): clubAcademicsApi.ClubAttendanceStatus | null => {
      const record = attendanceRecords.find((entry) => entry.memberId === memberId);
      return record?.status || null;
    },
    [attendanceRecords]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.topSafe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Club Academics</Text>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Loading academic tools...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.topSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.topTitleWrap}>
            <Text style={styles.topTitle}>Club Academics</Text>
            <Text style={styles.topSub} numberOfLines={1}>{clubName || 'Structured Class'}</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.backBtn}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Term Filter</Text>
            <Text style={styles.mutedSmall}>{selectedTerm === 'ALL' ? 'All terms' : selectedTerm}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <TouchableOpacity
              onPress={() => setSelectedTerm('ALL')}
              style={[styles.chip, selectedTerm === 'ALL' && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedTerm === 'ALL' && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {availableTerms.map((term) => (
              <TouchableOpacity
                key={term}
                onPress={() => setSelectedTerm(term)}
                style={[styles.chip, selectedTerm === term && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedTerm === term && styles.chipTextActive]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{gradeStats.averagePercentage.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Average Grade</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{gradeStats.passingRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Pass Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{attendanceStats?.attendanceRate?.toFixed?.(1) ?? '0.0'}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Subject Management</Text>
            <Text style={styles.mutedSmall}>{subjects.length} subjects</Text>
          </View>

          {canCreateSubjects ? (
            <>
              <View style={styles.inlineForm}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="Subject name"
                  value={newSubjectName}
                  onChangeText={setNewSubjectName}
                />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="Code"
                  autoCapitalize="characters"
                  value={newSubjectCode}
                  onChangeText={setNewSubjectCode}
                />
                <TextInput
                  style={[styles.input, styles.weightInput]}
                  placeholder="W"
                  keyboardType="numeric"
                  value={newSubjectWeight}
                  onChangeText={setNewSubjectWeight}
                />
                <TouchableOpacity style={styles.actionBtn} onPress={handleCreateSubject} disabled={submitting}>
                  <Text style={styles.actionBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>W = grading weight (default 1)</Text>
            </>
          ) : (
            <Text style={styles.cardBody}>Only owners or instructors can create subjects.</Text>
          )}

          {subjects.length > 0 ? (
            <View style={styles.subjectList}>
              {subjects.map((subject) => (
                <View key={subject.id} style={styles.subjectRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{getSubjectLabel(subject)}</Text>
                    <Text style={styles.subjectMeta}>
                      Weight {subject.weight} • {subjectUsage.get(subject.id) || 0} grade entries
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {clubReport?.summary || clubReport?.overview ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Performance Insights</Text>
            {reportStrengths.length > 0 ? (
              <View style={styles.reportBlock}>
                <Text style={styles.reportTitle}>Strengths</Text>
                {reportStrengths.map((item, idx) => (
                  <Text key={`s-${idx}`} style={styles.reportItem}>• {item}</Text>
                ))}
              </View>
            ) : null}
            {reportImprovements.length > 0 ? (
              <View style={styles.reportBlock}>
                <Text style={styles.reportTitle}>Needs Improvement</Text>
                {reportImprovements.map((item, idx) => (
                  <Text key={`i-${idx}`} style={styles.reportItem}>• {item}</Text>
                ))}
              </View>
            ) : null}
            {reportRecommendations.length > 0 ? (
              <View style={styles.reportBlock}>
                <Text style={styles.reportTitle}>Recommendations</Text>
                {reportRecommendations.map((item, idx) => (
                  <Text key={`r-${idx}`} style={styles.reportItem}>• {item}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Gradebook</Text>
            <Text style={styles.mutedSmall}>{filteredGrades.length} entries</Text>
          </View>

          {canManageAcademic ? (
            <>
              <Text style={styles.fieldLabel}>Student</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {studentMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    onPress={() => setSelectedMemberId(member.id)}
                    style={[styles.chip, selectedMemberId === member.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedMemberId === member.id && styles.chipTextActive]}>
                      {getMemberDisplayName(member)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    onPress={() => setSelectedSubjectId(subject.id)}
                    style={[styles.chip, selectedSubjectId === subject.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedSubjectId === subject.id && styles.chipTextActive]}>
                      {subject.code || subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Assessment Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {ASSESSMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setAssessmentType(type)}
                    style={[styles.chip, assessmentType === type && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, assessmentType === type && styles.chipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.inlineForm}>
                <TextInput
                  style={[styles.input, styles.scoreInput]}
                  placeholder="Score"
                  keyboardType="numeric"
                  value={scoreInput}
                  onChangeText={setScoreInput}
                />
                <TextInput
                  style={[styles.input, styles.scoreInput]}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={maxScoreInput}
                  onChangeText={setMaxScoreInput}
                />
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="Assessment name"
                  value={assessmentName}
                  onChangeText={setAssessmentName}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Term (e.g., Term 1)"
                value={termInput}
                onChangeText={setTermInput}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.disabledBtn]}
                onPress={handleCreateGrade}
                disabled={submitting}
              >
                <Text style={styles.primaryBtnText}>Save Grade</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.cardBody}>You can view rankings and attendance. Instructors can input grades.</Text>
          )}

          {filteredGrades.length > 0 ? (
            <View style={styles.gradeList}>
              {filteredGrades.slice(0, 8).map((grade) => {
                const member = members.find((m) => m.id === grade.memberId);
                const subject = subjects.find((s) => s.id === grade.subjectId);
                return (
                  <View key={grade.id} style={styles.gradeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gradeTitle}>
                        {getMemberDisplayName(member)} • {subject?.code || subject?.name || 'Subject'}
                      </Text>
                      <Text style={styles.gradeMeta}>
                        {grade.assessmentType} • {normalizeTerm(grade.term)}
                      </Text>
                    </View>
                    <Text style={styles.gradeScore}>{Number(grade.percentage || 0).toFixed(1)}%</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {assessmentBreakdown.length > 0 ? (
            <View style={styles.reportBlock}>
              <Text style={styles.reportTitle}>Assessment Breakdown</Text>
              {assessmentBreakdown.map(([type, data]) => (
                <View key={type} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{type}</Text>
                  <Text style={styles.breakdownValue}>
                    {data.count} items • {Number(data.averagePercentage || 0).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Ranking</Text>
            <Text style={styles.mutedSmall}>{selectedTerm === 'ALL' ? 'All terms' : selectedTerm}</Text>
          </View>
          {rankings.length === 0 ? (
            <Text style={styles.cardBody}>No ranking data yet. Add grades to generate class ranking.</Text>
          ) : (
            rankings.slice(0, 10).map((entry, index) => (
              <View key={entry.memberId} style={styles.rankRow}>
                <Text style={styles.rankIndex}>#{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName}>{entry.name}</Text>
                  <Text style={styles.rankMeta}>{entry.gradeCount} graded items</Text>
                </View>
                <Text style={styles.rankScore}>{entry.average.toFixed(1)}%</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Attendance</Text>
            {canManageAcademic ? (
              <TouchableOpacity onPress={handleCreateSession} disabled={submitting}>
                <Text style={styles.linkText}>+ New Session</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {sessions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => setSelectedSessionId(session.id)}
                  style={[styles.chip, selectedSessionId === session.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedSessionId === session.id && styles.chipTextActive]}>
                    {new Date(session.sessionDate).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.cardBody}>No sessions yet. Create a session to start attendance tracking.</Text>
          )}

          {selectedSessionId ? (
            <View style={styles.sessionSummaryRow}>
              {(Object.keys(ATTENDANCE_STATUS_META) as clubAcademicsApi.ClubAttendanceStatus[]).map((status) => {
                const meta = ATTENDANCE_STATUS_META[status];
                const count = sessionAttendanceSummary[status] || 0;
                return (
                  <View key={status} style={[styles.sessionSummaryChip, { backgroundColor: meta.bg, borderColor: meta.color + '55' }]}> 
                    <Text style={[styles.sessionSummaryText, { color: meta.color }]}>{meta.label}: {count}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {selectedSessionId && studentMembers.length > 0 ? (
            <View style={styles.attendanceList}>
              {studentMembers.map((member) => {
                const currentStatus = getCurrentAttendanceStatus(member.id);
                return (
                  <View key={member.id} style={styles.attendanceRow}>
                    <Text style={styles.attendanceName} numberOfLines={1}>
                      {getMemberDisplayName(member)}
                    </Text>
                    <View style={styles.statusActions}>
                      {(Object.keys(ATTENDANCE_STATUS_META) as clubAcademicsApi.ClubAttendanceStatus[]).map((status) => {
                        const selected = currentStatus === status;
                        const meta = ATTENDANCE_STATUS_META[status];
                        return (
                          <TouchableOpacity
                            key={status}
                            onPress={() => handleMarkAttendance(member.id, status)}
                            style={[
                              styles.statusBtn,
                              {
                                backgroundColor: selected ? meta.bg : '#F8FAFC',
                                borderColor: selected ? meta.color : COLORS.border,
                              },
                            ]}
                            disabled={!canManageAcademic}
                          >
                            <Text style={[styles.statusBtnText, { color: selected ? meta.color : COLORS.muted }]}>
                              {meta.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topSafe: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitleWrap: { flex: 1 },
  topTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  topSub: { fontSize: 12, color: COLORS.muted },
  scrollContent: { padding: 14, gap: 12, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: COLORS.muted, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: COLORS.danger, flex: 1, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primaryDark },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  mutedSmall: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  cardBody: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  helperText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  reportBlock: { gap: 4 },
  reportTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  reportItem: { fontSize: 12, color: COLORS.muted, lineHeight: 17 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginTop: 2 },
  chipsRow: { gap: 8, paddingRight: 6 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
  },
  chipActive: { borderColor: COLORS.primaryDark, backgroundColor: '#E0F9FD' },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  chipTextActive: { color: COLORS.primaryDark },
  inlineForm: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  flexInput: { flex: 1 },
  codeInput: { width: 90 },
  weightInput: { width: 64 },
  scoreInput: { width: 80 },
  actionBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 13 },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '800' },
  disabledBtn: { opacity: 0.55 },
  subjectList: { gap: 8 },
  subjectRow: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FAFCFF',
  },
  subjectName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  subjectMeta: { marginTop: 2, fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  gradeList: { gap: 8, marginTop: 4 },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
  },
  gradeTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  gradeMeta: { marginTop: 2, fontSize: 11, fontWeight: '600', color: COLORS.muted },
  gradeScore: { fontSize: 13, fontWeight: '800', color: COLORS.success },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 12, color: COLORS.text, fontWeight: '700' },
  breakdownValue: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  rankIndex: { width: 36, fontSize: 13, fontWeight: '800', color: COLORS.primaryDark },
  rankName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  rankMeta: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  rankScore: { fontSize: 13, fontWeight: '800', color: COLORS.success },
  linkText: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 12 },
  sessionSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sessionSummaryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sessionSummaryText: { fontSize: 11, fontWeight: '700' },
  attendanceList: { gap: 8 },
  attendanceRow: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 10,
    padding: 8,
    gap: 8,
  },
  attendanceName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBtnText: { fontSize: 11, fontWeight: '700' },
});
