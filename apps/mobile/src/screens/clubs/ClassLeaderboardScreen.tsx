import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { classesApi } from '@/api';

const COLORS = {
  blue: '#2F8FF0',
  pink: '#FF5F93',
  white: '#FFFFFF',
  background: '#F8FBFF',
  textPrimary: '#111827',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  surfaceSoft: '#EFFFFB',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

type RouteParams = {
  classId: string;
  className?: string;
  selectedMonth?: string;
  myRole?: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | 'SCHOOL_ADMIN';
  linkedStudentId?: string;
};
type RankingStudent = NonNullable<classesApi.ClassGradesReport['students']>[number];
type RankingScope = 'CLASS' | 'GRADE' | 'SCHOOL';

const MONTHS = [
  'November', 'December', 'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August', 'September', 'October',
];
const MONTH_TO_NUMBER: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};
const CALENDAR_MONTHS_ENGLISH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const AVATAR_COLORS = ['#FFB703', '#2EC4B6', '#3B82F6', '#C084FC', '#FB7185', '#84CC16', '#14B8A6'];

const resolveAcademicYearForMonth = (monthNumber: number, now = new Date()): number => {
  const currentMonthNumber = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const academicStartYear = currentMonthNumber >= 11 ? currentYear : currentYear - 1;
  return monthNumber >= 11 ? academicStartYear : academicStartYear + 1;
};

const getMonthContext = (month: string) => {
  const monthNumber = MONTH_TO_NUMBER[month] || 1;
  const academicYear = resolveAcademicYearForMonth(monthNumber);
  return {
    month,
    monthNumber,
    academicYear,
    gradesReportOpts: {
      semester: 1,
      month,
      monthNumber,
      gradeYear: academicYear,
    },
  };
};

const metricValue = (value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '--';
  return Number(value).toFixed(Number.isInteger(value) ? 0 : 1);
};
const getInitials = (firstName?: string, lastName?: string) => {
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'ST';
};
const formatMoeysName = (student?: { firstName?: string; lastName?: string }) =>
  `${student?.lastName || ''} ${student?.firstName || ''}`.trim() || 'Student';
const getAvatarColor = (value?: string) => {
  const source = String(value || '');
  const index = source.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};
const getStudentUserId = (student?: { userId?: string | null; user?: { id?: string } | null }) =>
  student?.userId || student?.user?.id || null;
const getRankColor = (rank?: number) => {
  if (rank === 1) return '#FFC107';
  if (rank === 2) return '#B8C0C8';
  if (rank === 3) return '#B48A4A';
  return COLORS.blue;
};
const getScoreTone = (score: number) => {
  if (score >= 80) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
};

export default function ClassLeaderboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { classId, className, selectedMonth: routeMonth, linkedStudentId } = (route.params || {}) as RouteParams;
  const calendarMonthEnglish = CALENDAR_MONTHS_ENGLISH[new Date().getMonth()];
  const initialMonth = routeMonth && MONTHS.includes(routeMonth)
    ? routeMonth
    : MONTHS.includes(calendarMonthEnglish)
      ? calendarMonthEnglish
      : MONTHS[0];
  const selectedMonth = initialMonth;
  const [selectedScope, setSelectedScope] = useState<RankingScope>('CLASS');
  const monthContext = useMemo(() => getMonthContext(selectedMonth), [selectedMonth]);
  const gradesReportOpts = useMemo(
    () => ({ ...monthContext.gradesReportOpts, scope: selectedScope }),
    [monthContext.gradesReportOpts, selectedScope]
  );
  const initialCachedReport = useMemo(
    () => (classId ? classesApi.getCachedClassGradesReport(classId, gradesReportOpts) : null),
    [classId, gradesReportOpts]
  );
  const [report, setReport] = useState<classesApi.ClassGradesReport | null>(initialCachedReport);
  const [loading, setLoading] = useState(!initialCachedReport);
  const [refreshing, setRefreshing] = useState(false);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef(0);

  const rankingStudents = useMemo(() => {
    return [...(report?.students || [])]
      .sort((a, b) => (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER));
  }, [report?.students]);
  const podium = useMemo(() => rankingStudents.slice(0, 3), [rankingStudents]);
  const orderedPodium = useMemo(() => {
    const byRank = new Map(podium.map((row) => [row.rank, row]));
    return [byRank.get(2), byRank.get(1), byRank.get(3)].filter(Boolean) as RankingStudent[];
  }, [podium]);
  const listRows = useMemo(() => rankingStudents.slice(3), [rankingStudents]);
  const currentStudent = useMemo(
    () => rankingStudents.find((row) => row.student.id === linkedStudentId) || null,
    [linkedStudentId, rankingStudents]
  );
  const title = className || report?.class?.name || t('classScreens.report.defaultTitle');

  const loadData = useCallback(async (force = false) => {
    if (!classId) {
      setError(t('classScreens.report.notFound'));
      setLoading(false);
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    try {
      const cached = classesApi.getCachedClassGradesReport(classId, gradesReportOpts);
      if (!force && cached) {
        setReport(cached);
        setLoading(false);
      } else if (report) {
        setPeriodLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const nextReport = await classesApi.getClassGradesReport(classId, gradesReportOpts, force);
      if (activeRequestRef.current !== requestId) return;
      setReport(nextReport || null);
    } catch (err: any) {
      if (activeRequestRef.current === requestId && !report) {
        setError(err?.message || t('classScreens.report.loadFailed'));
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
        setPeriodLoading(false);
      }
    }
  }, [classId, gradesReportOpts, report, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

  const openProfile = useCallback((userId?: string | null) => {
    if (!userId) {
      Alert.alert(
        t('classScreens.report.profileUnavailableTitle'),
        t('classScreens.report.profileUnavailableBody')
      );
      return;
    }

    navigation.getParent()?.navigate('ProfileTab', {
      screen: 'Profile',
      params: { userId },
    });
  }, [navigation, t]);

  const renderAvatar = (
    student: RankingStudent['student'],
    size: number,
    textSize: number
  ) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(student.id) }]}>
      {student.photoUrl ? (
        <Image source={{ uri: student.photoUrl }} style={styles.avatarImage} />
      ) : (
        <Text style={[styles.avatarText, { fontSize: textSize }]}>{getInitials(student.firstName, student.lastName)}</Text>
      )}
    </View>
  );

  const listHeader = (
    <View style={styles.headerContent}>
      <View style={styles.scopeTabs}>
        {[
          { key: 'CLASS' as const, label: title },
          { key: 'GRADE' as const, label: t('classScreens.report.scope.grade', { defaultValue: 'Grade' }) },
          { key: 'SCHOOL' as const, label: t('classScreens.report.scope.school', { defaultValue: 'School' }) },
        ].map((tab) => {
          const active = selectedScope === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.scopeTab, active && styles.scopeTabActive]}
              activeOpacity={0.86}
              onPress={() => setSelectedScope(tab.key)}
            >
              <Text
                style={[styles.scopeTabText, active && styles.scopeTabTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {periodLoading && (
        <View style={styles.updatingRow}>
          <ActivityIndicator size="small" color={COLORS.pink} />
          <Text style={styles.updatingText}>{t('classScreens.report.updatingRanking', { defaultValue: 'Updating ranking...' })}</Text>
        </View>
      )}

      {podium.length > 0 && (
        <View style={styles.podiumWrap}>
          {orderedPodium.map((row) => {
            const rank = row.rank || 0;
            const isFirst = rank === 1;
            return (
              <TouchableOpacity
                key={row.student.id}
                style={[styles.podiumItem, isFirst && styles.podiumItemFirst]}
                activeOpacity={0.86}
                onPress={() => openProfile(getStudentUserId(row.student))}
              >
                {isFirst && <Ionicons name="trophy" size={30} color="#BEEA20" style={styles.crownIcon} />}
                <View style={[
                  styles.podiumPhotoRing,
                  isFirst && styles.podiumPhotoRingFirst,
                  { borderColor: getRankColor(rank) },
                ]}>
                  {renderAvatar(row.student, isFirst ? 112 : 82, isFirst ? 30 : 24)}
                  <View style={[styles.podiumRankBadge, { backgroundColor: getRankColor(rank) }]}>
                    <Text style={styles.podiumRankBadgeText}>{rank}</Text>
                  </View>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {formatMoeysName(row.student)}
                </Text>
                <Text style={styles.podiumScore}>{metricValue(row.average)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {currentStudent && (
        <TouchableOpacity
          style={styles.currentRankCard}
          activeOpacity={0.86}
          onPress={() => openProfile(getStudentUserId(currentStudent.student))}
        >
          <View style={styles.currentRankLeft}>
            <Text style={styles.currentRankNumber}>{currentStudent.rank}</Text>
            <Ionicons name="triangle" size={12} color="#FFC107" />
          </View>
          {renderAvatar(currentStudent.student, 48, 15)}
          <Text style={styles.currentRankText} numberOfLines={1}>
            {t('classScreens.report.youCurrentlyRank', { defaultValue: 'You Currently Rank' })}
          </Text>
          <View style={styles.scoreChip}>
            <Text style={styles.scoreChipText}>{metricValue(currentStudent.average)}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRow = ({ item, index }: { item: NonNullable<classesApi.ClassGradesReport['students']>[number]; index: number }) => {
    const trendIcon = index % 3 === 0 ? 'triangle' : index % 3 === 1 ? 'triangle' : 'remove';
    const trendColor = index % 3 === 0 ? '#FFC107' : index % 3 === 1 ? '#FF7A59' : COLORS.textMuted;
    const average = Number(item.average || 0);

    return (
      <TouchableOpacity
        style={[styles.leaderboardRow, linkedStudentId === item.student.id && styles.leaderboardRowActive]}
        activeOpacity={0.86}
        onPress={() => openProfile(getStudentUserId(item.student))}
      >
        <View style={styles.rowRankGroup}>
          <Text style={styles.rowRank}>{item.rank}</Text>
          <Ionicons
            name={trendIcon as any}
            size={12}
            color={trendColor}
            style={trendColor === '#FF7A59' ? styles.trendDown : undefined}
          />
        </View>
        {renderAvatar(item.student, 54, 17)}
        <View style={styles.rowCopy}>
          <Text style={styles.rowName} numberOfLines={1}>
            {formatMoeysName(item.student)}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.student.studentId || t('classScreens.report.noId')} • {item.gradeLevel || t('classScreens.report.na')}
          </Text>
        </View>
        <View style={[styles.scoreChip, { backgroundColor: `${getScoreTone(average)}14` }]}>
          <Text style={[styles.scoreChipText, { color: getScoreTone(average) }]}>{metricValue(average)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.84}>
            <Ionicons name="chevron-back" size={25} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>{selectedMonth} {monthContext.academicYear}</Text>
          <TouchableOpacity style={styles.backButton} onPress={onRefresh} activeOpacity={0.84}>
            {refreshing || periodLoading ? (
              <ActivityIndicator size="small" color={COLORS.blue} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={COLORS.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.contentPanel}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.pink} />
            <Text style={styles.centerText}>{t('classScreens.report.loading')}</Text>
          </View>
        ) : error && rankingStudents.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={44} color={COLORS.danger} />
            <Text style={styles.centerText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>{t('classScreens.report.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listRows}
            keyExtractor={(item) => item.student.id}
            renderItem={renderRow}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              rankingStudents.length === 0 ? (
                <Text style={styles.emptyText}>{t('classScreens.report.noRankedResults')}</Text>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.pink} colors={[COLORS.pink]} />
            }
            initialNumToRender={14}
            windowSize={8}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  safeArea: {
    paddingHorizontal: 18,
    backgroundColor: COLORS.white,
  },
  topBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  contentPanel: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 34,
  },
  headerContent: {
    gap: 10,
    marginBottom: 10,
  },
  scopeTabs: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  scopeTab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scopeTabActive: {
    backgroundColor: COLORS.pink,
    borderColor: COLORS.pink,
    shadowColor: COLORS.pink,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  scopeTabText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scopeTabTextActive: {
    color: COLORS.white,
  },
  updatingRow: {
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF1F6',
  },
  updatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.pink,
  },
  podiumWrap: {
    minHeight: 214,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingTop: 34,
  },
  podiumItemFirst: {
    paddingTop: 0,
  },
  crownIcon: {
    marginBottom: 6,
  },
  podiumPhotoRing: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  podiumPhotoRingFirst: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  podiumRankBadge: {
    position: 'absolute',
    bottom: -12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
  podiumName: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  podiumScore: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '900',
    color: COLORS.white,
  },
  currentRankCard: {
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  currentRankLeft: {
    width: 34,
    alignItems: 'center',
    gap: 2,
  },
  currentRankNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  currentRankText: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  leaderboardRow: {
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  leaderboardRowActive: {
    borderWidth: 1,
    borderColor: COLORS.pink,
    backgroundColor: '#FFF1F6',
  },
  rowRankGroup: {
    width: 28,
    alignItems: 'center',
    gap: 3,
  },
  rowRank: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  trendDown: {
    transform: [{ rotate: '180deg' }],
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  rowMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scoreChip: {
    minWidth: 72,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F0F0',
    paddingHorizontal: 12,
  },
  scoreChipText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  centerText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: COLORS.pink,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  emptyText: {
    padding: 18,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
