/**
 * Parent Child Grades Screen
 *
 * Fetches and displays grades for a student with month filter and stats
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/config';
import { Config } from '@/config';
import { useAuthStore } from '@/stores';
import { tokenService } from '@/services/token';

interface Grade {
  id: string;
  subjectId: string;
  subject?: { name: string; nameKh?: string; code?: string; category?: string };
  score: number;
  maxScore: number;
  percentage?: number;
  month?: string;
  monthNumber?: number;
  year?: number;
}

export default function ParentChildGradesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { studentId: string } }, 'params'>>();
  const { user } = useAuthStore();
  const studentId = (route.params as any)?.studentId;

  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const children = (user as any)?.children || [];
  const child = children.find((c: any) => c.id === studentId);

  useEffect(() => {
    if (!studentId) return;

    const fetchGrades = async () => {
      try {
        const token = await tokenService.getAccessToken();
        if (!token) return;

        const res = await fetch(`${Config.gradeUrl}/grades/student/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.data || [];
        setGrades(Array.isArray(arr) ? arr : []);
      } catch (e) {
        console.error('Failed to fetch grades:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [studentId]);

  const months = [...new Set(grades.map((g) => g.month).filter(Boolean))].sort(
    (a, b) => {
      const order = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return order.indexOf(a as string) - order.indexOf(b as string);
    }
  );

  const filteredGrades =
    selectedMonth === 'all'
      ? grades
      : grades.filter((g) => g.month === selectedMonth);

  const getGradeLetter = (pct: number) => {
    if (pct >= 90) return { letter: 'A', color: '#059669' };
    if (pct >= 80) return { letter: 'B', color: '#2563EB' };
    if (pct >= 70) return { letter: 'C', color: '#D97706' };
    if (pct >= 60) return { letter: 'D', color: '#EA580C' };
    if (pct >= 50) return { letter: 'E', color: '#DC2626' };
    return { letter: 'F', color: '#991B1B' };
  };

  const percentages = filteredGrades.map(
    (g) => g.percentage ?? (g.maxScore ? (g.score / g.maxScore) * 100 : 0)
  );
  const stats =
    percentages.length > 0
      ? {
          average: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1),
          highest: Math.max(...percentages).toFixed(1),
          passRate: (
            (percentages.filter((p) => p >= 50).length / percentages.length) *
            100
          ).toFixed(0),
        }
      : null;

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grades</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>{displayName}</Text>

        {/* Month filter */}
        {months.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthScroll}
            contentContainerStyle={styles.monthScrollContent}
          >
            <TouchableOpacity
              style={[styles.monthChip, selectedMonth === 'all' && styles.monthChipActive]}
              onPress={() => setSelectedMonth('all')}
            >
              <Text style={[styles.monthChipText, selectedMonth === 'all' && styles.monthChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {months.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                onPress={() => setSelectedMonth(m as string)}
              >
                <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.average}%</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.highest}%</Text>
              <Text style={styles.statLabel}>Highest</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.passRate}%</Text>
              <Text style={styles.statLabel}>Pass Rate</Text>
            </View>
          </View>
        )}

        {/* Grades list */}
        {filteredGrades.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>No Grades Available</Text>
            <Text style={styles.emptyDesc}>Grades will appear once they are published.</Text>
          </View>
        ) : (
          <View style={styles.gradesList}>
            {filteredGrades.map((g, i) => {
              const pct = g.percentage ?? (g.maxScore ? (g.score / g.maxScore) * 100 : 0);
              const gl = getGradeLetter(pct);
              const subjectName = g.subject?.nameKh || g.subject?.name || 'Subject';
              return (
                <View key={g.id || i} style={styles.gradeRow}>
                  <Text style={styles.subjectName}>{subjectName}</Text>
                  <Text style={styles.score}>
                    {g.score}/{g.maxScore}
                  </Text>
                  <Text style={styles.percentage}>{pct.toFixed(0)}%</Text>
                  <View style={[styles.gradeBadge, { backgroundColor: `${gl.color}20` }]}>
                    <Text style={[styles.gradeLetter, { color: gl.color }]}>{gl.letter}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  subtitle: { fontSize: 14, color: Colors.gray[600], marginBottom: Spacing.md },
  monthScroll: { marginBottom: Spacing.lg, maxHeight: 44 },
  monthScrollContent: { flexDirection: 'row', gap: 8, paddingRight: Spacing.lg },
  monthChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  monthChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  monthChipText: { fontSize: 14, fontWeight: '600', color: Colors.gray[700] },
  monthChipTextActive: { color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.gray[900] },
  statLabel: { fontSize: 12, color: Colors.gray[500], marginTop: 2 },
  empty: {
    padding: Spacing.xl * 2,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.gray[900], marginTop: Spacing.md },
  emptyDesc: { fontSize: 14, color: Colors.gray[600], marginTop: 4, textAlign: 'center' },
  gradesList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.gray[900] },
  score: { width: 60, fontSize: 14, color: Colors.gray[700], textAlign: 'right' },
  percentage: { width: 48, fontSize: 14, fontWeight: '600', color: Colors.gray[900], textAlign: 'right', marginLeft: Spacing.sm },
  gradeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  gradeLetter: { fontSize: 14, fontWeight: '700' },
});
