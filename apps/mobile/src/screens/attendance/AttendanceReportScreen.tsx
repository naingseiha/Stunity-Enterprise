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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { attendanceService } from '@/services/attendance';
import { useAuthStore } from '@/stores';
import { Colors, Shadows, Spacing } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const StatCard = ({ label, value, color, icon, delay = 0 }: any) => (
    <Animated.View
        entering={FadeInDown.delay(delay).duration(600)}
        style={styles.statCard}
    >
        <View style={[styles.statIconBg, { backgroundColor: `${color}10` }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
);

export const AttendanceReportScreen = () => {
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

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    const isTeacher = user?.role === 'TEACHER';

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

    const attendedCount = isTeacher ? (summary?.stats?.staffTotals?.present || 0) : stats.attendedSessions;
    const totalCount = isTeacher ? (summary?.stats?.totalSchoolDays || 0) : stats.totalSessions;

    const labelMain = isTeacher ? 'Your Check-in Rate' : 'Overall Attendance';
    const labelAttended = isTeacher ? 'Present' : 'Attended';
    const labelTotal = isTeacher ? 'Total Days' : 'Total Sessions';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isTeacher ? 'Attendance Recording' : 'Attendance Report'}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0EA5E9']} />
                    }
                >
                    {/* Attendance Percentage Card */}
                    <Animated.View entering={FadeInUp.duration(800)} style={styles.overviewCard}>
                        <LinearGradient
                            colors={isTeacher ? ['#F59E0B', '#D97706'] : ['#0EA5E9', '#2563EB']}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.percentageContainer}>
                                <Text style={styles.percentageText}>{Math.round(attendancePercentage)}%</Text>
                                <Text style={styles.percentageLabel}>{labelMain}</Text>
                            </View>
                            <View style={styles.sessionsInfo}>
                                <View style={styles.sessionStat}>
                                    <Text style={styles.sessionStatValue}>{attendedCount}</Text>
                                    <Text style={styles.sessionStatLabel}>{labelAttended}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.sessionStat}>
                                    <Text style={styles.sessionStatValue}>{totalCount}</Text>
                                    <Text style={styles.sessionStatLabel}>{labelTotal}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard
                            label="Present"
                            value={totals.present}
                            color="#10B981"
                            icon="checkmark-circle"
                            delay={100}
                        />
                        <StatCard
                            label="Late"
                            value={totals.late}
                            color="#F59E0B"
                            icon="time"
                            delay={200}
                        />
                        <StatCard
                            label="Absent"
                            value={totals.absent}
                            color="#F43F5E"
                            icon="close-circle"
                            delay={300}
                        />
                    </View>

                    {/* Class Breakdown for Teacher */}
                    {isTeacher && summary?.classBreakdown?.length > 0 && (
                        <Animated.View entering={FadeInUp.delay(400)} style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Class Recording Breakdown</Text>
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
                                            Total: {item.total} | Present: {item.present} | Late: {item.late}
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
                        <Animated.View entering={FadeInUp.delay(500)} style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Recent Check-ins</Text>
                            {summary.checkInHistory.slice(0, 7).map((log: any, index: number) => (
                                <View key={log.id || index} style={[styles.infoCard, { marginBottom: 12 }]}>
                                    <View style={styles.checkInLogHeader}>
                                        <View style={styles.checkInLogDate}>
                                            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                            <Text style={styles.dateText}>
                                                {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: log.status === 'PRESENT' ? '#D1FAE5' : '#FEE2E2' }]}>
                                            <Text style={[styles.statusText, { color: log.status === 'PRESENT' ? '#059669' : '#DC2626' }]}>
                                                {log.status === 'PRESENT' ? 'Present' : 'Absent'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.timeLogsContainer}>
                                        <View style={styles.timeLogItem}>
                                            <View style={[styles.timeIconBg, { backgroundColor: '#E0F2FE' }]}>
                                                <Ionicons name="log-in-outline" size={18} color="#0284C7" />
                                            </View>
                                            <View>
                                                <Text style={styles.timeLogLabel}>Time In</Text>
                                                <Text style={styles.timeLogValue}>
                                                    {log.timeIn ? new Date(log.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.timeLogSeparator} />
                                        <View style={styles.timeLogItem}>
                                            <View style={[styles.timeIconBg, { backgroundColor: '#FFEDD5' }]}>
                                                <Ionicons name="log-out-outline" size={18} color="#C2410C" />
                                            </View>
                                            <View>
                                                <Text style={styles.timeLogLabel}>Time Out</Text>
                                                <Text style={styles.timeLogValue}>
                                                    {log.timeOut ? new Date(log.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </Animated.View>
                    )}

                    {/* Monthly Breakdown / Info */}
                    {!isTeacher && (
                        <Animated.View entering={FadeInUp.delay(400)} style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Performance Summary</Text>
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                                    <Text style={styles.infoText}>
                                        Your attendance is calculated based on morning and afternoon sessions since the beginning of the semester.
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
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#fff',
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
        ...Shadows.md,
        marginBottom: 24,
    },
    gradient: {
        padding: 32,
        alignItems: 'center',
    },
    percentageContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    percentageText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#fff',
    },
    percentageLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginTop: 4,
    },
    sessionsInfo: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 16,
    },
    sessionStat: {
        flex: 1,
        alignItems: 'center',
    },
    sessionStatValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    sessionStatLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        width: (width - 60) / 3,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
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
    dateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    timeLogsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeLogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    timeIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeLogLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeLogValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginTop: 2,
    },
    timeLogSeparator: {
        width: 1,
        height: 30,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
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
