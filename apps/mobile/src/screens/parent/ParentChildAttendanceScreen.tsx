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
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/config';
import { Config } from '@/config';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { tokenService } from '@/services/token';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK' | 'PERMISSION';

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  session?: string;
  remarks?: string;
}

export default function ParentChildAttendanceScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
  const dateLocale = i18n.language === 'km' ? 'km-KH' : 'en-US';

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
        if (__DEV__) { console.error('Failed to fetch attendance:', e); }
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
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return t('attendance.status.present');
      case 'ABSENT':
        return t('attendance.status.absent');
      case 'LATE':
        return t('attendance.status.late');
      case 'EXCUSED':
      case 'SICK':
        return t('attendance.status.excused');
      case 'PERMISSION':
        return t('attendance.status.permission');
      default:
        return t('attendance.status.na');
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(dateLocale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const monthYearLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(dateLocale, {
    month: 'long',
    year: 'numeric'
  });

  if (loading || !child) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  const displayName = child.khmerName || `${child.firstName} ${child.lastName}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('parent.attendance.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>{displayName}</Text>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goPrevMonth} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthYearLabel}</Text>
          <TouchableOpacity onPress={goNextMonth} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>{t('attendance.status.present')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>{t('attendance.status.absent')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>{t('attendance.status.late')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.excused}</Text>
              <Text style={styles.statLabel}>{t('attendance.status.excused')}</Text>
            </View>
          </View>
        )}

        {/* Records list */}
        {records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t('parent.attendance.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>
              {t('parent.attendance.emptyDescription', { monthYear: monthYearLabel })}
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
                      {getStatusLabel(r.status)}
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

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: { marginTop: 12, fontSize: 15, lineHeight: 22, fontWeight: '500', color: colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  subtitle: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textSecondary, marginBottom: Spacing.md },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: Spacing.md,
    shadowColor: isDark ? 'transparent' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  monthBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textSecondary, marginTop: 2 },
  empty: {
    padding: Spacing.xl * 2,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: isDark ? 'transparent' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text, marginTop: Spacing.md },
  emptyDesc: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  recordsList: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: isDark ? 'transparent' : '#000000',
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
    borderBottomColor: colors.border,
  },
  recordLeft: {},
  recordDate: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text },
  recordSession: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textSecondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
});
