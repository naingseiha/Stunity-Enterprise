import React, { useState, useEffect, useCallback, useRef, useId, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    RefreshControl
    , Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { Haptics } from '@/services/haptics';
import { attendanceService, REQUEST_TIMEOUT_CODE } from '@/services/attendance';
import { useAuthStore } from '@/stores';
import { Colors, Shadows } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';
import { canUseTeacherAttendance, getTeacherAttendanceLookupId } from '@/utils/attendanceAccess';
import { useThemeContext } from '@/contexts';

const BRAND_TEAL = Colors.brand;
const BRAND_TEAL_DARK = '#00B8DB';
const BRAND_YELLOW = '#FFA600';

const StatCard = ({ label, value, color, icon, helper, styles, colors }: any) => {
    const gradientColors = [`${color}08`, `${color}15`] as const;
    return (
        <Animated.View style={[styles.statCard, { borderColor: `${color}25` }]}>
            <LinearGradient
                colors={gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={styles.statCardInner}>
                <View style={[styles.statIconBg, { backgroundColor: `${color}1A`, shadowColor: color }]}>
                    <Ionicons name={icon} size={22} color={color} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
                {!!helper && <Text style={styles.statHelper} numberOfLines={2}>{helper}</Text>}
            </View>
        </Animated.View>
    );
};

const CircularProgress = ({
    size,
    strokeWidth,
    progress,
    startColor = BRAND_YELLOW,
    endColor = '#FF8C00',
    trackColor = 'rgba(255,255,255,0.2)',
    textColor = '#fff',
    gradientId = 'progressGrad',
}: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={startColor} />
                        <Stop offset="100%" stopColor={endColor} />
                    </SvgGradient>
                </Defs>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </Svg>
            <View style={{ position: 'absolute' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: textColor }}>
                    {Math.round(Number(progress) || 0)}%
                </Text>
            </View>
        </View>
    );
};

const getLogEventDate = (log: any) => {
    const candidates = [log?.timeIn, log?.timeOut, log?.updatedAt, log?.createdAt, log?.date];
    for (const candidate of candidates) {
        if (!candidate) continue;
        const parsed = new Date(candidate);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return new Date();
};

const groupLogsByDate = (logs: any[]) => {
    const groups: { [key: string]: any } = {};
    logs.forEach(log => {
        const eventDate = getLogEventDate(log);
        const dateKey = eventDate.toDateString();

        if (!groups[dateKey]) {
            groups[dateKey] = {
                date: eventDate.toISOString(),
                morning: null,
                afternoon: null,
                status: log.status
            };
        }

        if (log.session === 'MORNING') groups[dateKey].morning = log;
        else if (log.session === 'AFTERNOON') groups[dateKey].afternoon = log;
        else groups[dateKey].morning = log; // Fallback for old data

        if (new Date(groups[dateKey].date).getTime() < eventDate.getTime()) {
            groups[dateKey].date = eventDate.toISOString();
        }
    });

    return Object.values(groups).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const getDayStatus = (day: any) => {
    const statuses = [day?.morning?.status, day?.afternoon?.status].filter(Boolean);
    if (statuses.includes('PERMISSION')) return 'PERMISSION';
    if (statuses.includes('PRESENT')) return 'PRESENT';
    if (statuses.includes('LATE')) return 'LATE';
    if (statuses.includes('EXCUSED')) return 'EXCUSED';
    if (statuses.includes('ABSENT')) return 'ABSENT';
    return 'UNKNOWN';
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const getStatusStyle = (status: string, t: TranslateFn, isDark: boolean) => {
    switch (status) {
        case 'PERMISSION':
            return { label: t('attendance.status.permission'), bg: isDark ? 'rgba(124,58,237,0.22)' : '#EDE9FE', fg: isDark ? '#A78BFA' : '#7C3AED' };
        case 'PRESENT':
            return { label: t('attendance.status.present'), bg: isDark ? 'rgba(5,150,105,0.22)' : '#D1FAE5', fg: isDark ? '#34D399' : '#059669' };
        case 'LATE':
            return { label: t('attendance.status.late'), bg: isDark ? 'rgba(180,83,9,0.24)' : '#FEF3C7', fg: isDark ? '#FBBF24' : '#B45309' };
        case 'EXCUSED':
            return { label: t('attendance.status.excused'), bg: isDark ? 'rgba(75,85,99,0.32)' : '#E5E7EB', fg: isDark ? '#D1D5DB' : '#4B5563' };
        case 'ABSENT':
            return { label: t('attendance.status.absent'), bg: isDark ? 'rgba(220,38,38,0.22)' : '#FEE2E2', fg: isDark ? '#F87171' : '#DC2626' };
        default:
            return { label: t('attendance.status.na'), bg: isDark ? 'rgba(100,116,139,0.24)' : '#F1F5F9', fg: isDark ? '#94A3B8' : '#64748B' };
    }
};

export const AttendanceReportScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const user = useAuthStore(s => s.user);
    const { colors, isDark } = useThemeContext();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const chartGradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '_');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const skipFirstFocusBustRef = useRef(true);
    const useTeacherSummary = canUseTeacherAttendance(user);
    const teacherSummaryLookupId = getTeacherAttendanceLookupId(user);

    const fetchSummary = useCallback(async (opts?: { bustCache?: boolean }) => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            setSummaryError(null);
            let result;
            const bust = { bustCache: opts?.bustCache ?? false };
            if (!user.schoolId) {
                setSummary(null);
                setSummaryError(t('attendance.notLinkedMsg'));
                return;
            }
            if (useTeacherSummary && teacherSummaryLookupId) {
                result = await attendanceService.getTeacherSummary(teacherSummaryLookupId, undefined, undefined, bust);
            } else {
                const studentRecordId =
                    user.role === 'STUDENT'
                        ? user.student?.id
                        : user.role === 'PARENT' && Array.isArray(user.children) && user.children.length === 1
                          ? user.children[0]?.id
                          : user.student?.id;
                if (!studentRecordId) {
                    setSummary(null);
                    setSummaryError(t('attendance.alerts.studentRecordRequired'));
                    return;
                }
                result = await attendanceService.getSummary(studentRecordId, undefined, undefined, bust);
            }

            if (result?.success && result.data) {
                setSummary(result.data);
            } else {
                const msg =
                    (typeof (result as { message?: string })?.message === 'string' &&
                        (result as { message?: string }).message) ||
                    t('attendance.alerts.summaryFailed');
                setSummary(null);
                setSummaryError(msg);
            }
        } catch (error: unknown) {
            if (__DEV__) console.warn('[attendance] fetchSummary:', error);
            setSummary(null);
            const timeout =
                typeof error === 'object' &&
                error !== null &&
                (error as { code?: string }).code === REQUEST_TIMEOUT_CODE;
            setSummaryError(
                timeout
                    ? t('attendance.alerts.networkTimeout')
                    : error instanceof Error
                      ? error.message
                      : t('attendance.alerts.summaryFailed')
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teacherSummaryLookupId, t, useTeacherSummary, user]);

    useEffect(() => {
        setLoading(true);
        fetchSummary();
    }, [fetchSummary]);

    useFocusEffect(
        useCallback(() => {
            if (skipFirstFocusBustRef.current) {
                skipFirstFocusBustRef.current = false;
                return;
            }
            void fetchSummary({ bustCache: true });
        }, [fetchSummary])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSummary({ bustCache: true });
    };

    const navigateToFeedTab = useCallback(() => {
        const nav = navigation as any;
        const currentState = nav.getState?.();
        const hasStackHistory =
            typeof currentState?.index === 'number' && currentState.index > 0;

        if (hasStackHistory && typeof nav.popToTop === 'function') {
            nav.popToTop();
        }

        const tabNavigator = nav.getParent?.();
        const tabRouteNames: string[] = tabNavigator?.getState?.()?.routeNames || [];
        if (tabRouteNames.includes('FeedTab')) {
            tabNavigator.navigate('FeedTab', { screen: 'Feed' });
            return;
        }

        const currentRouteNames: string[] = currentState?.routeNames || [];
        if (currentRouteNames.includes('Feed')) {
            nav.navigate('Feed');
            return;
        }

        nav.navigate?.('MainTabs', {
            screen: 'FeedTab',
            params: { screen: 'Feed' },
        });
    }, [navigation]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const isTeacher = useTeacherSummary;
    const dateLocale = i18n.language === 'km' ? 'km-KH' : 'en-US';

    const totals = (summary?.stats?.totals || summary?.totals) || {
        present: 0, absent: 0, late: 0, excused: 0, permission: 0
    };

    const stats = (summary?.summary || summary?.stats) || {
        attendancePercentage: 0,
        attendedSessions: 0,
        totalSessions: 0,
        totalRecords: 0,
        attendanceRate: 0
    };

    const attendancePercentage = isTeacher ? (summary?.stats?.personalAttendanceRate || 0) : stats.attendancePercentage;
    const recordRate = isTeacher ? stats.attendanceRate : 0;
    const teacherTotals = summary?.stats?.staffTotals || {};
    const teacherRecordedSessions = summary?.stats?.recordedSessions || summary?.checkInHistory?.length || 0;
    const ttStats = summary?.stats?.timetable;
    const usesTimetableStats =
        isTeacher &&
        ttStats?.source === 'timetable' &&
        (ttStats?.expectedSessionsInRange ?? 0) > 0;

    const teacherExpectedSessions = isTeacher
        ? usesTimetableStats
            ? ttStats.expectedSessionsInRange || 0
            : Math.max((summary?.stats?.totalSchoolDays || 0) * 2, 0)
        : 0;
    const teacherMissingDays = Math.max((summary?.stats?.totalSchoolDays || 0) - (teacherTotals.present || 0), 0);
    const timetableMissed = usesTimetableStats ? ttStats.missedScheduledSessions || 0 : teacherMissingDays;
    const visibleTotals = isTeacher
        ? {
            present: teacherTotals.present || 0,
            late: teacherRecordedSessions,
            absent: timetableMissed,
            permission: teacherTotals.permission || 0,
        }
        : totals;

    const attendedCount = isTeacher ? (teacherTotals.present || 0) : stats.attendedSessions;
    const totalCount = isTeacher ? (summary?.stats?.totalSchoolDays || 0) : stats.totalSessions;

    const labelMain = isTeacher ? t('attendance.report.metrics.workdayCoverage') : t('attendance.report.metrics.overallAttendance');
    const labelAttended = isTeacher ? t('attendance.report.metrics.recordedDays') : t('attendance.report.metrics.attended');
    const labelTotal = isTeacher
        ? usesTimetableStats
            ? t('attendance.report.metrics.scheduledTeachingDays')
            : t('attendance.report.metrics.schoolDays')
        : t('attendance.report.metrics.totalSessions');

    const overviewTheme = isTeacher
        ? isDark
            ? {
                  gradientColors: ['#2A2410', '#0F2A22', '#0C2233'] as const,
                  cardBorder: 'rgba(253,230,138,0.28)',
                  textPrimary: 'rgba(255,255,255,0.92)',
                  textSecondary: 'rgba(255,255,255,0.68)',
                  miniBg: 'rgba(255,255,255,0.08)',
                  miniBorder: 'rgba(253,230,138,0.22)',
                  miniDivider: 'rgba(255,255,255,0.18)',
                  ringStart: '#F59E0B',
                  ringEnd: '#14B8A6',
                  ringTrack: 'rgba(245, 158, 11, 0.22)',
                  ringText: '#FDE68A',
              }
            : {
              gradientColors: ['#FFF4D6', '#ECFDF5', '#E0F2FE'] as const,
              cardBorder: '#FDE68A',
              textPrimary: '#1F2937',
              textSecondary: '#64748B',
              miniBg: 'rgba(255,255,255,0.78)',
              miniBorder: '#FDE68A',
              miniDivider: '#D1D5DB',
              ringStart: '#F59E0B',
              ringEnd: '#14B8A6',
              ringTrack: 'rgba(245, 158, 11, 0.22)',
              ringText: '#B45309',
          }
        : {
              gradientColors: ['#00B8DB', '#004A8F'] as const,
              cardBorder: 'rgba(255,255,255,0.24)',
              textPrimary: 'rgba(255,255,255,0.92)',
              textSecondary: 'rgba(255,255,255,0.72)',
              miniBg: 'rgba(255,255,255,0.15)',
              miniBorder: 'rgba(255,255,255,0.22)',
              miniDivider: 'rgba(255,255,255,0.2)',
              ringStart: '#FDE68A',
              ringEnd: '#F59E0B',
              ringTrack: 'rgba(255,255,255,0.2)',
              ringText: '#FFFFFF',
          };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigateToFeedTab();
                        }}
                    >
                        <Ionicons name="chevron-back" size={20} color={BRAND_TEAL} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isTeacher ? t('attendance.report.teacherTitle') : t('attendance.report.title')}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND_TEAL]} />
                    }
                >
                    {summaryError ? (
                        <View style={styles.summaryErrorBanner}>
                            <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
                            <Text style={styles.summaryErrorText}>{summaryError}</Text>
                        </View>
                    ) : null}

                    {summaryError && !summary ? null : (
                        <>
                    <Animated.View style={[styles.overviewCard, { borderColor: overviewTheme.cardBorder }]}>
                        <LinearGradient
                            colors={[...overviewTheme.gradientColors]}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {isTeacher && (
                                <View style={styles.teacherOverviewEyebrow}>
                                    <Ionicons name="finger-print-outline" size={14} color={overviewTheme.ringText} />
                                    <Text style={[styles.teacherOverviewEyebrowText, { color: overviewTheme.ringText }]}>
                                        {t('attendance.report.teacherOverviewLabel')}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.chartRow}>
                                <CircularProgress
                                    size={100}
                                    strokeWidth={12}
                                    progress={attendancePercentage}
                                    startColor={overviewTheme.ringStart}
                                    endColor={overviewTheme.ringEnd}
                                    trackColor={overviewTheme.ringTrack}
                                    textColor={overviewTheme.ringText}
                                    gradientId={chartGradientId}
                                />
                                <View style={styles.chartTextContainer}>
                                    <Text style={[styles.percentageLabel, { color: overviewTheme.textPrimary }]}>
                                        {labelMain}
                                    </Text>
                                    {isTeacher && (
                                        <Text style={[styles.percentageDescription, { color: overviewTheme.textSecondary }]}>
                                            {usesTimetableStats
                                                ? t('attendance.report.metrics.timetableCoverageHint')
                                                : t('attendance.report.metrics.workdayCoverageHint')}
                                        </Text>
                                    )}
                                    <View
                                        style={[
                                            styles.sessionsMiniInfo,
                                            {
                                                backgroundColor: overviewTheme.miniBg,
                                                borderColor: overviewTheme.miniBorder,
                                            },
                                        ]}
                                    >
                                        <View style={styles.miniStat}>
                                            <Text style={[styles.miniStatValue, { color: overviewTheme.textPrimary }]}>
                                                {attendedCount}
                                            </Text>
                                            <Text style={[styles.miniStatLabel, { color: overviewTheme.textSecondary }]}>
                                                {labelAttended}
                                            </Text>
                                        </View>
                                        <View style={[styles.miniDivider, { backgroundColor: overviewTheme.miniDivider }]} />
                                        <View style={styles.miniStat}>
                                            <Text style={[styles.miniStatValue, { color: overviewTheme.textPrimary }]}>
                                                {totalCount}
                                            </Text>
                                            <Text style={[styles.miniStatLabel, { color: overviewTheme.textSecondary }]}>
                                                {labelTotal}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard
                            label={isTeacher ? t('attendance.report.metrics.recordedDays') : t('attendance.status.present')}
                            value={visibleTotals.present}
                            color="#10B981"
                            icon="checkmark-circle"
                            helper={isTeacher ? t('attendance.report.metrics.daysWithCheckIn') : undefined}
                            styles={styles}
                            colors={colors}
                        />
                        <StatCard
                            label={isTeacher ? t('attendance.report.metrics.recordedSessions') : t('attendance.status.late')}
                            value={visibleTotals.late}
                            color="#F59E0B"
                            icon="reader"
                            helper={isTeacher ? t('attendance.report.metrics.outOfSessions', { total: teacherExpectedSessions }) : undefined}
                            styles={styles}
                            colors={colors}
                        />
                        <StatCard
                            label={isTeacher
                                ? usesTimetableStats
                                    ? t('attendance.report.metrics.missedScheduled')
                                    : t('attendance.report.metrics.unrecordedDays')
                                : t('attendance.status.absent')}
                            value={visibleTotals.absent}
                            color="#F43F5E"
                            icon="calendar-clear"
                            helper={isTeacher ? t('attendance.report.metrics.noCheckInYet') : undefined}
                            styles={styles}
                            colors={colors}
                        />
                        <StatCard
                            label={t('attendance.status.permission')}
                            value={visibleTotals.permission}
                            color="#7C3AED"
                            icon="document-text"
                            helper={isTeacher ? t('attendance.report.metrics.onlineRequests') : undefined}
                            styles={styles}
                            colors={colors}
                        />
                    </View>

                    {/* Class Breakdown for Teacher */}
                    {isTeacher && summary?.classBreakdown?.length > 0 && (
                        <Animated.View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>{t('attendance.report.classBreakdown.title')}</Text>
                            {summary.classBreakdown.map((item: any, index: number) => (
                                <View key={item.id} style={[styles.infoCard, { marginBottom: 12 }]}>
                                    <View style={styles.breakdownHeader}>
                                        <Text style={styles.className}>{item.name}</Text>
                                        <Text style={[styles.classRate, { color: item.rate >= 90 ? colors.success : colors.warning }]}>
                                            {Math.round(item.rate)}%
                                        </Text>
                                    </View>
                                    <View style={styles.breakdownStats}>
                                        <Text style={styles.breakdownText}>
                                            {t('attendance.report.classBreakdown.totalsLine', {
                                                total: item.total,
                                                present: item.present,
                                                late: item.late
                                            })}
                                        </Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${item.rate}%`,
                                                    backgroundColor: item.rate >= 90 ? colors.success : colors.warning
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>
                            ))}
                        </Animated.View>
                    )}

                    {/* Teacher Check-in History */}
                    {isTeacher && summary?.checkInHistory?.length > 0 && (
                        <Animated.View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>{t('attendance.report.recentCheckIns')}</Text>
                            {groupLogsByDate(summary.checkInHistory).slice(0, 7).map((day: any, index: number) => {
                                const dayStatus = getDayStatus(day);
                                const statusUi = getStatusStyle(dayStatus, t, isDark);
                                const morningStatusUi = getStatusStyle(day.morning?.status || 'UNKNOWN', t, isDark);
                                const afternoonStatusUi = getStatusStyle(day.afternoon?.status || 'UNKNOWN', t, isDark);

                                return (
                                    <View key={day.date || index} style={[styles.infoCard, { marginBottom: 12 }]}>
                                        <View style={styles.checkInLogHeader}>
                                            <View style={styles.checkInLogDate}>
                                                <View style={[styles.checkInDateIconBadge, { backgroundColor: statusUi.bg }]}>
                                                    <Ionicons name="calendar-outline" size={14} color={statusUi.fg} />
                                                </View>
                                                <Text style={styles.dateText}>
                                                    {new Date(day.date).toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: statusUi.bg, borderColor: `${statusUi.fg}33` }]}>
                                                <Text style={[styles.statusText, { color: statusUi.fg }]}>
                                                    {statusUi.label}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.dailySessionsRow}>
                                            {/* Morning Session */}
                                            <View style={[styles.sessionBox, styles.sessionBoxMorning]}>
                                                <View style={styles.sessionBoxHeader}>
                                                    <View style={[styles.sessionHeaderIconBadge, styles.sessionHeaderIconMorning]}>
                                                        <Ionicons name="sunny-outline" size={14} color={isDark ? '#FBBF24' : '#D97706'} />
                                                    </View>
                                                    <Text style={styles.sessionBoxTitle}>{t('attendance.morning')}</Text>
                                                </View>
                                                <View style={styles.timeRow}>
                                                    <Text style={styles.timeLabelSmall}>{t('attendance.report.session.timeIn')}:</Text>
                                                    <Text style={styles.timeValueSmall}>
                                                        {day.morning?.timeIn ? new Date(day.morning.timeIn).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </Text>
                                                </View>
                                                <View style={styles.timeRow}>
                                                    <Text style={styles.timeLabelSmall}>{t('attendance.report.session.timeOut')}:</Text>
                                                    <Text style={styles.timeValueSmall}>
                                                        {day.morning?.timeOut ? new Date(day.morning.timeOut).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </Text>
                                                </View>
                                                <View style={styles.sessionStatusRow}>
                                                    <Text style={styles.sessionStatusLabel}>{t('attendance.report.session.status')}:</Text>
                                                    <Text style={[styles.sessionStatusValue, { color: morningStatusUi.fg }]}>
                                                        {morningStatusUi.label.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Afternoon Session */}
                                            <View style={[styles.sessionBox, styles.sessionBoxAfternoon]}>
                                                <View style={styles.sessionBoxHeader}>
                                                    <View style={[styles.sessionHeaderIconBadge, styles.sessionHeaderIconAfternoon]}>
                                                        <Ionicons name="partly-sunny-outline" size={14} color={isDark ? '#818CF8' : '#4338CA'} />
                                                    </View>
                                                    <Text style={styles.sessionBoxTitle}>{t('attendance.afternoon')}</Text>
                                                </View>
                                                <View style={styles.timeRow}>
                                                    <Text style={styles.timeLabelSmall}>{t('attendance.report.session.timeIn')}:</Text>
                                                    <Text style={styles.timeValueSmall}>
                                                        {day.afternoon?.timeIn ? new Date(day.afternoon.timeIn).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </Text>
                                                </View>
                                                <View style={styles.timeRow}>
                                                    <Text style={styles.timeLabelSmall}>{t('attendance.report.session.timeOut')}:</Text>
                                                    <Text style={styles.timeValueSmall}>
                                                        {day.afternoon?.timeOut ? new Date(day.afternoon.timeOut).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </Text>
                                                </View>
                                                <View style={styles.sessionStatusRow}>
                                                    <Text style={styles.sessionStatusLabel}>{t('attendance.report.session.status')}:</Text>
                                                    <Text style={[styles.sessionStatusValue, { color: afternoonStatusUi.fg }]}>
                                                        {afternoonStatusUi.label.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </Animated.View>
                    )}

                    {/* Monthly Breakdown / Info */}
                    {!isTeacher && (
                        <Animated.View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>{t('attendance.report.performanceSummaryTitle')}</Text>
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                                    <Text style={styles.infoText}>
                                        {t('attendance.report.performanceSummaryDescription')}
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: isDark ? 'rgba(9,207,247,0.16)' : '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        ...(isDark ? {} : Shadows.sm),
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    scrollContent: { padding: 20 },
    summaryErrorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(220,38,38,0.14)' : '#FEF2F2',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(220,38,38,0.32)' : '#FECACA',
    },
    summaryErrorText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: isDark ? '#F87171' : '#991B1B',
        lineHeight: 20,
    },
    overviewCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        ...Shadows.md,
        marginBottom: 24,
    },
    gradient: {
        padding: 24,
    },
    teacherOverviewEyebrow: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.72)',
        marginBottom: 18,
    },
    teacherOverviewEyebrowText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    chartTextContainer: {
        flex: 1,
    },
    percentageLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '700',
        marginBottom: 6,
    },
    percentageDescription: {
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 16,
        marginBottom: 12,
    },
    sessionsMiniInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        gap: 12,
    },
    miniStat: {
        flex: 1,
        alignItems: 'center',
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    miniStatLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    miniDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
        rowGap: 12,
    },
    statCard: {
        width: '48%',
        backgroundColor: colors.card,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: isDark ? 'transparent' : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
    },
    statCardInner: {
        padding: 20,
        alignItems: 'center',
    },
    statIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '700',
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 18,
    },
    statHelper: {
        marginTop: 4,
        fontSize: 11,
        lineHeight: 15,
        color: colors.textSecondary,
        fontWeight: '600',
        textAlign: 'center',
    },
    infoSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    infoCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: isDark ? 'transparent' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    checkInLogHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        marginBottom: 16,
    },
    checkInLogDate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkInDateIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '800',
    },
    dailySessionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        padding: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sessionBox: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        shadowColor: isDark ? 'transparent' : '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    sessionBoxMorning: {
        borderColor: isDark ? 'rgba(217,119,6,0.3)' : '#FEF3C7',
    },
    sessionBoxAfternoon: {
        borderColor: isDark ? 'rgba(67,56,202,0.32)' : '#E0E7FF',
    },
    sessionBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    sessionHeaderIconBadge: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionHeaderIconMorning: {
        backgroundColor: isDark ? 'rgba(217,119,6,0.18)' : '#FFFBEB',
    },
    sessionHeaderIconAfternoon: {
        backgroundColor: isDark ? 'rgba(67,56,202,0.2)' : '#EEF2FF',
    },
    sessionBoxTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.3,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timeLabelSmall: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    timeValueSmall: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    sessionStatusRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
    },
    sessionStatusLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    sessionStatusValue: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    className: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    classRate: {
        fontSize: 14,
        fontWeight: '800',
    },
    breakdownStats: {
        marginBottom: 12,
    },
    breakdownText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
});

export default AttendanceReportScreen;
