/**
 * Parent Child Attendance Screen
 *
 * Fetches and displays attendance for a student with month navigation and stats
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

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK';

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  session?: string;
  remarks?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ParentChildAttendanceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { studentId: string } }, 'params'>>();
  const { user } = useAuthStore();
  const studentId = (route.params as any)?.studentId;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const children = (user as any)?.children || [];
  const child = children.find((c: any) => c.id === studentId);

  useEffect(() => {
    if (!studentId) return;

    const fetchAttendance = async () => {
      try {
        const token = await tokenService.getAccessToken();
        if (!token) return;

        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0);

        const res = await fetch(
          `${Config.attendanceUrl}/attendance/student/${studentId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const arr = data?.data ?? data;
        setRecords(Array.isArray(arr) ? arr : []);
      } catch (e) {
        console.error('Failed to fetch attendance:', e);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [studentId, currentMonth, currentYear]);

  const stats =
    records.length > 0
      ? {
          present: records.filter((r) => r.status === 'PRESENT').length,
          absent: records.filter((r) => r.status === 'ABSENT').length,
          late: records.filter((r) => r.status === 'LATE').length,
          excused: records.filter((r) => r.status === 'EXCUSED' || r.status === 'SICK').length,
        }
      : null;

  const goPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT': return '#059669';
      case 'ABSENT': return '#DC2626';
      case 'LATE': return '#D97706';
      case 'EXCUSED':
      case 'SICK': return '#6B7280';
      default: return Colors.gray[600];
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>{displayName}</Text>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goPrevMonth} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTHS[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={goNextMonth} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={24} color={Colors.gray[700]} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.excused}</Text>
              <Text style={styles.statLabel}>Excused</Text>
            </View>
          </View>
        )}

        {/* Records list */}
        {records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>No Attendance Records</Text>
            <Text style={styles.emptyDesc}>
              No attendance records for {MONTHS[currentMonth]} {currentYear}.
            </Text>
          </View>
        ) : (
          <View style={styles.recordsList}>
            {records
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <View key={r.id} style={styles.recordRow}>
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordDate}>{formatDate(r.date)}</Text>
                    {r.session && (
                      <Text style={styles.recordSession}>{r.session}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(r.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(r.status) }]}>
                      {r.status}
                    </Text>
                  </View>
                </View>
              ))}
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 17, fontWeight: '600', color: Colors.gray[900] },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: Colors.gray[600], marginTop: 2 },
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
  recordsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  recordLeft: {},
  recordDate: { fontSize: 15, fontWeight: '600', color: Colors.gray[900] },
  recordSession: { fontSize: 12, color: Colors.gray[500], marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
});
