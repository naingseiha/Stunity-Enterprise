import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    StatusBar,
    RefreshControl
    , Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import * as Haptics from 'expo-haptics';
import { attendanceService } from '@/services/attendance';
import { useAuthStore } from '@/stores';
import { Colors, Shadows, Spacing } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const BRAND_TEAL = '#09CFF7';
const BRAND_TEAL_DARK = '#00B8DB';
const BRAND_YELLOW = '#FFA600';

const StatCard = ({ label, value, color, icon, delay = 0 }: any) => (
    <Animated.View
        style={styles.statCard}
    >
        <View style={[styles.statIconBg, { backgroundColor: `${color}10` }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
);

const CircularProgress = ({
    size,
    strokeWidth,
    progress,
    startColor = BRAND_YELLOW,
    endColor = '#FF8C00',
    trackColor = 'rgba(255,255,255,0.2)',
    textColor = '#fff'
}: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    stroke="url(#grad)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </Svg>
            <View style={{ position: 'absolute' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: textColor }}>{Math.round(progress)}%</Text>
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

const getStatusStyle = (status: string, t: TranslateFn) => {
    switch (status) {
        case 'PERMISSION':
            return { label: t('attendance.status.permission'), bg: '#EDE9FE', fg: '#7C3AED' };
        case 'PRESENT':
            return { label: t('attendance.status.present'), bg: '#D1FAE5', fg: '#059669' };
        case 'LATE':
            return { label: t('attendance.status.late'), bg: '#FEF3C7', fg: '#B45309' };
        case 'EXCUSED':
            return { label: t('attendance.status.excused'), bg: '#E5E7EB', fg: '#4B5563' };
        case 'ABSENT':
            return { label: t('attendance.status.absent'), bg: '#FEE2E2', fg: '#DC2626' };
        default:
            return { label: t('attendance.status.na'), bg: '#F1F5F9', fg: '#64748B' };
    }
};

export const AttendanceReportScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    const fetchSummary = useCallback(async () => {
        if (!user?.id) return;
        try {
            let result;
            if (user.role === 'TEACHER') {
                result = await attendanceService.getTeacherSummary(user.id);
            } else {
                result = await attendanceService.getSummary(user.id);
            }

            if (result.success) {
                setSummary(result.data);
            }
        } catch (error) {
            console.log('Error fetching summary:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, user?.role]);

    useEffect(() => {
        setLoading(true);
        fetchSummary();
    }, [fetchSummary]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSummary();
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
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    const isTeacher = user?.role === 'TEACHER';
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
    const teacherPermissionCount = isTeacher ? (summary?.stats?.staffTotals?.permission || 0) : totals.permission;

    const attendedCount = isTeacher ? (summary?.stats?.staffTotals?.present || 0) : stats.attendedSessions;
    const totalCount = isTeacher ? (summary?.stats?.totalSchoolDays || 0) : stats.totalSessions;

    const labelMain = isTeacher ? t('attendance.report.metrics.teacherRate') : t('attendance.report.metrics.overallAttendance');
    const labelAttended = isTeacher ? t('attendance.report.metrics.present') : t('attendance.report.metrics.attended');
    const labelTotal = isTeacher ? t('attendance.report.metrics.totalDays') : t('attendance.report.metrics.totalSessions');
    const overviewTheme = isTeacher
        ? {
            gradientColors: ['#FFF4D6', '#ECFDF5', '#E0F2FE'] as [string, string, string],
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
            gradientColors: [BRAND_TEAL, BRAND_TEAL_DARK] as [string, string],
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
            <StatusBar barStyle="dark-content" />
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
                    {/* Attendance Percentage Card */}
                    <Animated.View style={[styles.overviewCard, { borderColor: overviewTheme.cardBorder }]}>
                        <LinearGradient
                            colors={overviewTheme.gradientColors}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.chartRow}>
                                <CircularProgress
                                    size={100}
                                    strokeWidth={12}
                                    progress={attendancePercentage}
                                    startColor={overviewTheme.ringStart}
                                    endColor={overviewTheme.ringEnd}
                                    trackColor={overviewTheme.ringTrack}
                                    textColor={overviewTheme.ringText}
                                />
                                <View style={styles.chartTextContainer}>
                                    <Text style={[styles.percentageLabel, { color: overviewTheme.textPrimary }]}>{labelMain}</Text>
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
                                            <Text style={[styles.miniStatValue, { color: overviewTheme.textPrimary }]}>{attendedCount}</Text>
                                            <Text style={[styles.miniStatLabel, { color: overviewTheme.textSecondary }]}>{labelAttended}</Text>
                                        </View>
                                        <View style={[styles.miniDivider, { backgroundColor: overviewTheme.miniDivider }]} />
                                        <View style={styles.miniStat}>
                                            <Text style={[styles.miniStatValue, { color: overviewTheme.textPrimary }]}>{totalCount}</Text>
                                            <Text style={[styles.miniStatLabel, { color: overviewTheme.textSecondary }]}>{labelTotal}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard
                            label={t('attendance.status.present')}
                            value={totals.present}
                            color="#10B981"
                            icon="checkmark-circle"
                            delay={100}
                        />
                        <StatCard
                            label={t('attendance.status.late')}
                            value={totals.late}
                            color="#F59E0B"
                            icon="time"
                            delay={200}
                        />
                        <StatCard
                            label={t('attendance.status.absent')}
                            value={totals.absent}
                            color="#F43F5E"
                            icon="close-circle"
                            delay={300}
                        />
                        <StatCard
                            label={t('attendance.status.permission')}
                            value={teacherPermissionCount}
                            color="#7C3AED"
                            icon="document-text"
                            delay={400}
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
                                        <Text style={[styles.classRate, { color: item.rate >= 90 ? '#10B981' : '#F59E0B' }]}>
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
                                                    backgroundColor: item.rate >= 90 ? '#10B981' : '#F59E0B'
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
                                const statusUi = getStatusStyle(dayStatus, t);
                                const morningStatusUi = getStatusStyle(day.morning?.status || 'UNKNOWN', t);
                                const afternoonStatusUi = getStatusStyle(day.afternoon?.status || 'UNKNOWN', t);

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
                                                        <Ionicons name="sunny-outline" size={14} color="#D97706" />
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
                                                        <Ionicons name="partly-sunny-outline" size={14} color="#4338CA" />
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
                                    <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                                    <Text style={styles.infoText}>
                                        {t('attendance.report.performanceSummaryDescription')}
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    safeArea: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    scrollContent: { padding: 20 },
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
        width: (width - 52) / 2,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadows.sm,
    },
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 4,
    },
    infoSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadows.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    checkInLogHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        marginBottom: 12,
    },
    checkInLogDate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    checkInDateIconBadge: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    dailySessionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    sessionBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
    },
    sessionBoxMorning: {
        borderColor: '#FDE68A',
    },
    sessionBoxAfternoon: {
        borderColor: '#C7D2FE',
    },
    sessionBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    sessionHeaderIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionHeaderIconMorning: {
        backgroundColor: '#FFFBEB',
    },
    sessionHeaderIconAfternoon: {
        backgroundColor: '#EEF2FF',
    },
    sessionBoxTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: 10,
        marginTop: 2,
    },
    timeLabelSmall: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    timeValueSmall: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E293B',
    },
    sessionStatusRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sessionStatusLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    sessionStatusValue: {
        fontSize: 11,
        fontWeight: '800',
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
        color: '#1F2937',
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
        color: '#6B7280',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
});

export default AttendanceReportScreen;
