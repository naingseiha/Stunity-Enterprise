/**
 * Parent Child Report Card Screen
 *
 * View report card for a child
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { Config } from '@/config';
import { tokenService } from '@/services/token';

interface GradeSummary {
  subjectId: string;
  subjectName: string;
  subjectNameKh?: string;
  category?: string;
  average: number;
}

export default function ParentChildReportCardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const studentId = route.params?.studentId;

  const [student, setStudent] = useState<any>(null);
  const [summary, setSummary] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const children = (user as any)?.children || [];
  const child = children.find((c: any) => c.id === studentId);
  const school = (user as any)?.school;

  useEffect(() => {
    if (!studentId) return;
    const token = tokenService.getAccessToken();
    if (!token) return;

    const fetchData = async () => {
      try {
        const [studentRes, reportRes] = await Promise.all([
          fetch(`${Config.studentUrl}/students/${studentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${Config.gradeUrl}/grades/report-card/${studentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const studentData = await studentRes.json();
        const reportData = await reportRes.json();

        setStudent(studentData.data || studentData);

        // Report card may return { data: { gradeSummary: [...] } } or { data: [...] }
        const raw = reportData.data;
        const arr = Array.isArray(raw) ? raw : raw?.gradeSummary || raw?.subjects || [];
        setSummary(arr);
      } catch (e) {
        console.error('Failed to fetch report:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  const overall =
    summary.length > 0
      ? (summary.reduce((s, x) => s + (x.average || 0), 0) / summary.length).toFixed(1)
      : 'N/A';

  const getGradeLetter = (pct: number) => {
    if (pct >= 90) return { letter: 'A', color: '#059669' };
    if (pct >= 80) return { letter: 'B', color: '#2563EB' };
    if (pct >= 70) return { letter: 'C', color: '#D97706' };
    if (pct >= 60) return { letter: 'D', color: '#EA580C' };
    if (pct >= 50) return { letter: 'E', color: '#DC2626' };
    return { letter: 'F', color: '#991B1B' };
  };

  const handleShare = async () => {
    const subText = summary
      .map(
        (s) =>
          `${s.subjectNameKh || s.subjectName}: ${(s.average || 0).toFixed(1)}% (${getGradeLetter(s.average || 0).letter})`
      )
      .join('\n');
    const message = `Report Card - ${child?.firstName} ${child?.lastName}\n${school?.name || ''}\n\n${subText}\n\nOverall: ${overall}%`;
    try {
      await Share.share({
        message,
        title: 'Student Report Card',
      });
    } catch (e) {
      // User cancelled
    }
  };

  if (loading || !child) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const displayName = child.khmerName || `${child.firstName} ${child.lastName}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Card</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.gray[700]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>{displayName}</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>STUDENT REPORT CARD</Text>
            <Text style={styles.cardSchool}>{school?.name || 'School'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Student</Text>
              <Text style={styles.infoValue}>
                {student?.firstName} {student?.lastName}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Khmer Name</Text>
              <Text style={styles.infoValue}>{student?.khmerName || displayName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Class</Text>
              <Text style={styles.infoValue}>{student?.class?.name || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overall}%</Text>
              <Text style={styles.statLabel}>Overall</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statCard}>
              <Text
                style={[
                  styles.statValue,
                  Number(overall) >= 50 ? { color: '#059669' } : { color: '#DC2626' },
                ]}
              >
                {Number(overall) >= 50 ? 'PASS' : 'FAIL'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>

          {summary.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyTitle}>No Grades Available</Text>
              <Text style={styles.emptyDesc}>Report cards will appear once grades are published.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              {summary.map((s, i) => {
                const gl = getGradeLetter(s.average || 0);
                const pass = (s.average || 0) >= 50;
                return (
                  <View key={s.subjectId || i} style={styles.tableRow}>
                    <Text style={styles.tableSubject}>
                      {s.subjectNameKh || s.subjectName}
                    </Text>
                    <Text style={styles.tableAvg}>
                      {(s.average || 0).toFixed(1)}%
                    </Text>
                    <View style={[styles.tableGrade, { backgroundColor: `${gl.color}20` }]}>
                      <Text style={[styles.tableGradeText, { color: gl.color }]}>{gl.letter}</Text>
                    </View>
                    <Text style={[styles.tableStatus, pass ? styles.pass : styles.fail]}>
                      {pass ? 'Pass' : 'Fail'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.footer}>
            Generated on {new Date().toLocaleDateString()} • Stunity Enterprise
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.gray[600] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.gray[900] },
  shareBtn: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  subtitle: { fontSize: 14, color: Colors.gray[600], marginBottom: Spacing.md },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    backgroundColor: '#059669',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cardSchool: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.lg,
    backgroundColor: Colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  infoItem: { width: '50%', marginBottom: Spacing.sm },
  infoLabel: { fontSize: 11, color: Colors.gray[500], textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.gray[900] },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.gray[900] },
  statLabel: { fontSize: 12, color: Colors.gray[500], marginTop: 2 },
  empty: {
    padding: Spacing.xl * 2,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.gray[900], marginTop: Spacing.md },
  emptyDesc: { fontSize: 14, color: Colors.gray[600], marginTop: 4, textAlign: 'center' },
  table: { padding: Spacing.md },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  tableSubject: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.gray[900] },
  tableAvg: { width: 56, fontSize: 14, fontWeight: '600', color: Colors.gray[900], textAlign: 'right' },
  tableGrade: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  tableGradeText: { fontSize: 14, fontWeight: '700' },
  tableStatus: {
    width: 44,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginLeft: Spacing.sm,
  },
  pass: { color: '#059669' },
  fail: { color: '#DC2626' },
  footer: {
    fontSize: 11,
    color: Colors.gray[500],
    padding: Spacing.lg,
    textAlign: 'center',
  },
});
