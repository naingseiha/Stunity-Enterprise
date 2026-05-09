import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
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
  pink: '#F75C8F',
  coral: '#FF7A59',
  teal: '#14B8A6',
  ink: '#0F172A',
  white: '#FFFFFF',
  background: '#F7FAFC',
  textPrimary: '#111827',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  surfaceSoft: '#F0FDFA',
  border: '#E5E7EB',
  borderSoft: '#EEF2F7',
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
  if (rank === 1) return '#F7B801';
  if (rank === 2) return '#AEB8C4';
  if (rank === 3) return '#B8863B';
  return COLORS.blue;
};
const getScoreTone = (score: number) => {
  if (score >= 80) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
};

const RankingAvatar = React.memo(({
  student,
  size,
  textSize,
}: {
  student: RankingStudent['student'];
  size: number;
  textSize: number;
}) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(student.id) }]}>
    {student.photoUrl ? (
      <Image source={{ uri: student.photoUrl }} style={styles.avatarImage} />
    ) : (
      <Text style={[styles.avatarText, { fontSize: textSize }]}>{getInitials(student.firstName, student.lastName)}</Text>
    )}
  </View>
));

const LeaderboardRow = React.memo(({
  item,
  index,
  linkedStudentId,
  onOpenProfile,
}: {
  item: RankingStudent;
  index: number;
  linkedStudentId?: string;
  onOpenProfile: (userId?: string | null) => void;
}) => {
  const trendIcon = index % 3 === 0 ? 'triangle' : index % 3 === 1 ? 'triangle' : 'remove';
  const trendColor = index % 3 === 0 ? '#FFC107' : index % 3 === 1 ? '#FF7A59' : COLORS.textMuted;
  const average = Number(item.average || 0);
  const isActive = linkedStudentId === item.student.id;

  return (
    <TouchableOpacity
      style={[styles.leaderboardRow, isActive && styles.leaderboardRowActive]}
      activeOpacity={0.86}
      onPress={() => onOpenProfile(getStudentUserId(item.student))}
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
      <RankingAvatar student={item.student} size={50} textSize={16} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowName} numberOfLines={1}>
          {formatMoeysName(item.student)}
        </Text>
      </View>
      <View style={styles.scoreChip}>
        <Text style={styles.scoreChipText}>{metricValue(average)}</Text>
      </View>
    </TouchableOpacity>
  );
});

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
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
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
  const prefetchedScopeKeysRef = useRef(new Set<string>());
  const reportRef = useRef<classesApi.ClassGradesReport | null>(initialCachedReport);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

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
  const getScopeReportOpts = useCallback(
    (scope: RankingScope) => ({ ...monthContext.gradesReportOpts, scope }),
    [monthContext.gradesReportOpts]
  );
  const prefetchOtherScopes = useCallback((baseScope: RankingScope) => {
    if (!classId) return;

    (['CLASS', 'GRADE', 'SCHOOL'] as RankingScope[])
      .filter((scope) => scope !== baseScope)
      .forEach((scope) => {
        const key = `${classId}:${selectedMonth}:${monthContext.academicYear}:${scope}`;
        if (prefetchedScopeKeysRef.current.has(key)) return;

        prefetchedScopeKeysRef.current.add(key);
        setTimeout(() => {
          void classesApi.getClassGradesReport(classId, getScopeReportOpts(scope), false).catch(() => {});
        }, scope === 'GRADE' ? 80 : 180);
      });
  }, [classId, getScopeReportOpts, monthContext.academicYear, selectedMonth]);

  const handleSelectScope = useCallback((scope: RankingScope) => {
    if (scope === selectedScope) return;

    const cached = classesApi.getCachedClassGradesReport(classId, getScopeReportOpts(scope));
    if (cached) {
      setReport(cached);
      setPeriodLoading(false);
      setLoading(false);
    } else if (reportRef.current) {
      setPeriodLoading(true);
    }

    setSelectedScope(scope);
  }, [classId, getScopeReportOpts, selectedScope]);

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
      } else if (reportRef.current) {
        setPeriodLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const nextReport = await classesApi.getClassGradesReport(classId, gradesReportOpts, force);
      if (activeRequestRef.current !== requestId) return;
      setReport(nextReport || null);
      prefetchOtherScopes(selectedScope);
    } catch (err: any) {
      if (activeRequestRef.current === requestId && !reportRef.current) {
        setError(err?.message || t('classScreens.report.loadFailed'));
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
        setPeriodLoading(false);
      }
    }
  }, [classId, gradesReportOpts, prefetchOtherScopes, selectedScope, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    prefetchOtherScopes(selectedScope);
  }, [prefetchOtherScopes, selectedScope]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

  const handleSelectMonth = useCallback((month: string) => {
    if (month === selectedMonth) {
      setMonthPickerVisible(false);
      return;
    }

    const nextContext = getMonthContext(month);
    const cached = classesApi.getCachedClassGradesReport(classId, {
      ...nextContext.gradesReportOpts,
      scope: selectedScope,
    });

    if (cached) {
      setReport(cached);
      setLoading(false);
      setPeriodLoading(false);
    } else if (reportRef.current) {
      setPeriodLoading(true);
    }

    setSelectedMonth(month);
    setMonthPickerVisible(false);
  }, [classId, selectedMonth, selectedScope]);

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

  const listHeader = useMemo(() => (
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
              onPress={() => handleSelectScope(tab.key)}
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
                  <RankingAvatar student={row.student} size={isFirst ? 108 : 78} textSize={isFirst ? 30 : 23} />
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
          <RankingAvatar student={currentStudent.student} size={48} textSize={15} />
          <Text style={styles.currentRankText} numberOfLines={1}>
            {t('classScreens.report.youCurrentlyRank', { defaultValue: 'You Currently Rank' })}
          </Text>
          <View style={styles.scoreChip}>
            <Text style={styles.scoreChipText}>{metricValue(currentStudent.average)}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  ), [
    currentStudent,
    linkedStudentId,
    openProfile,
    orderedPodium,
    periodLoading,
    selectedScope,
    handleSelectScope,
    t,
    title,
  ]);

  const renderRow = useCallback(
    ({ item, index }: { item: RankingStudent; index: number }) => (
      <LeaderboardRow
        item={item}
        index={index}
        linkedStudentId={linkedStudentId}
        onOpenProfile={openProfile}
      />
    ),
    [linkedStudentId, openProfile, t]
  );

  const keyExtractor = useCallback((item: RankingStudent) => item.student.id, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.84}>
            <Ionicons name="chevron-back" size={25} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.titleButton}
            activeOpacity={0.82}
            onPress={() => setMonthPickerVisible(true)}
          >
            <Text style={styles.topTitle} numberOfLines={1}>{selectedMonth} {monthContext.academicYear}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
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
            keyExtractor={keyExtractor}
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

      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <Pressable style={styles.monthModalBackdrop} onPress={() => setMonthPickerVisible(false)}>
          <Pressable style={styles.monthModalCard} onPress={() => {}}>
            <View style={styles.monthModalHeader}>
              <Text style={styles.monthModalTitle}>{t('classScreens.grades.academicMonth')}</Text>
              <TouchableOpacity style={styles.monthModalClose} onPress={() => setMonthPickerVisible(false)}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((month) => {
                const active = month === selectedMonth;
                const context = getMonthContext(month);
                return (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthOption, active && styles.monthOptionActive]}
                    activeOpacity={0.86}
                    onPress={() => handleSelectMonth(month)}
                  >
                    <Text style={[styles.monthOptionText, active && styles.monthOptionTextActive]} numberOfLines={1}>
                      {month}
                    </Text>
                    <Text style={[styles.monthOptionYear, active && styles.monthOptionTextActive]}>
                      {context.academicYear}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    paddingHorizontal: 18,
    backgroundColor: COLORS.background,
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
  titleButton: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  contentPanel: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  headerContent: {
    gap: 12,
    marginBottom: 12,
  },
  scopeTabs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  scopeTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  scopeTabActive: {
    backgroundColor: COLORS.pink,
    borderColor: COLORS.pink,
    shadowColor: COLORS.pink,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  scopeTabText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.ink,
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
    minHeight: 198,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 2,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingTop: 28,
  },
  podiumItemFirst: {
    paddingTop: 0,
  },
  crownIcon: {
    marginBottom: 4,
  },
  podiumPhotoRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: COLORS.white,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  podiumPhotoRingFirst: {
    width: 124,
    height: 124,
    borderRadius: 62,
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  podiumRankBadge: {
    position: 'absolute',
    bottom: -11,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  podiumRankBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
  podiumName: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.ink,
    lineHeight: 22,
  },
  podiumScore: {
    marginTop: 2,
    fontSize: 13,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FBCFE8',
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
    color: COLORS.ink,
  },
  currentRankText: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  leaderboardRow: {
    minHeight: 78,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#CFF3EE',
    backgroundColor: '#EFFFFB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  leaderboardRowActive: {
    borderWidth: 1.5,
    borderColor: '#F75C8F',
    backgroundColor: '#FFF6FA',
  },
  rowRankGroup: {
    width: 28,
    alignItems: 'center',
    gap: 3,
  },
  rowRank: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
  },
  trendDown: {
    transform: [{ rotate: '180deg' }],
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.ink,
    lineHeight: 25,
  },
  scoreChip: {
    minWidth: 72,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D7E3E6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4EFF1',
    paddingHorizontal: 12,
  },
  scoreChipText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
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
  monthModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    justifyContent: 'flex-end',
  },
  monthModalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  monthModalHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  monthModalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
  },
  monthOption: {
    width: '30.8%',
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
  },
  monthOptionActive: {
    borderColor: COLORS.pink,
    backgroundColor: COLORS.pink,
  },
  monthOptionText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  monthOptionYear: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  monthOptionTextActive: {
    color: COLORS.white,
  },
});
