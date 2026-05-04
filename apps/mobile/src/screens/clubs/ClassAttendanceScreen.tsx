import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { format, addDays, subDays, isToday } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores';
import { Colors, Shadows } from '@/config';
import * as classesApi from '@/api/classes';

const BRAND_TEAL = '#09CFF7';
const BRAND_YELLOW = '#FFA600';

const formatName = (first?: string, last?: string) => {
    if (!first && !last) return '';
    return `${first || ''} ${last || ''}`.trim();
};

const avatarLetter = (first?: string, last?: string) => {
    const c = (first || last || '?').trim();
    return c ? c.charAt(0).toUpperCase() : '?';
};

interface AttendanceEntry {
    studentId: string;
    studentNumber?: string;
    firstName: string;
    lastName: string;
    englishFirstName?: string;
    englishLastName?: string;
    photo?: string | null;
    morning: { id: string; status: string; remarks?: string } | null;
    afternoon: { id: string; status: string; remarks?: string } | null;
}

export default function ClassAttendanceScreen({ route, navigation }: any) {
    const { classId, className } = route.params || {};
    const { t, i18n } = useTranslation();
    const { user } = useAuthStore();
    const initialDate = useMemo(() => new Date(), []);
    const initialDateKey = useMemo(() => format(initialDate, 'yyyy-MM-dd'), [initialDate]);
    const initialCachedAttendance = useMemo(
        () => (classId ? classesApi.getCachedClassDailyAttendance(classId, initialDateKey) : null),
        [classId, initialDateKey]
    );
    
    const [loading, setLoading] = useState(!initialCachedAttendance);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [attendanceData, setAttendanceData] = useState<AttendanceEntry[]>(initialCachedAttendance?.students || []);
    const [timetableContext, setTimetableContext] = useState<classesApi.ClassDailyTimetableContext | null>(
        initialCachedAttendance?.timetableContext || null
    );
    const [filter, setFilter] = useState<'ALL' | 'ABSENT' | 'PERMISSION'>('ALL');

    const fetchAttendance = useCallback(async (date: Date, options?: { force?: boolean; preserveVisibleContent?: boolean }) => {
        if (!classId) return;

        const force = options?.force ?? false;
        const preserveVisibleContent = options?.preserveVisibleContent ?? false;
        const dateStr = format(date, 'yyyy-MM-dd');
        const cached = !force ? classesApi.getCachedClassDailyAttendance(classId, dateStr) : null;

        if (cached) {
            setAttendanceData(cached.students || []);
            setLoading(false);
        } else if (!preserveVisibleContent) {
            setLoading(true);
        }

        try {
            const result = await classesApi.getClassDailyAttendance(classId, dateStr, force);
            setAttendanceData(result.students || []);
            setTimetableContext(result.timetableContext ?? null);
        } catch (error) {
            if (__DEV__) console.warn('[attendance] class daily:', error);
            Alert.alert(t('common.error'), t('attendance.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [classId, t]);

    useEffect(() => {
        const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
        const hasCachedForSelectedDate = Boolean(
            classId && classesApi.getCachedClassDailyAttendance(classId, selectedDateKey)
        );

        fetchAttendance(selectedDate, { preserveVisibleContent: hasCachedForSelectedDate });
    }, [classId, fetchAttendance, selectedDate]);

    /** Skip duplicate network call on mount (useEffect already loads); refresh when returning after timetable edits */
    const skipFirstFocusFetchRef = useRef(true);
    useFocusEffect(
        useCallback(() => {
            if (!classId) return;
            if (skipFirstFocusFetchRef.current) {
                skipFirstFocusFetchRef.current = false;
                return;
            }
            void fetchAttendance(selectedDate, { force: true, preserveVisibleContent: true });
        }, [classId, selectedDate, fetchAttendance])
    );

    const filteredData = useMemo(() => {
        // If user is a student or parent, they should only see themselves
        let baseData = attendanceData;
        
        if (user?.role === 'STUDENT' && user.student?.id) {
            baseData = attendanceData.filter(s => s.studentId === user.student?.id);
        } else if (user?.role === 'PARENT' && user.children?.length) {
            const childIds = user.children.map(c => c.studentId || c.id);
            baseData = attendanceData.filter(s => childIds.includes(s.studentId));
        }

        if (filter === 'ALL') return baseData;
        return baseData.filter(item => {
            const statuses = [item.morning?.status, item.afternoon?.status];
            return statuses.includes(filter);
        });
    }, [attendanceData, filter, user]);

    const stats = useMemo(() => {
        const total = attendanceData.length;
        const absent = attendanceData.filter(s => s.morning?.status === 'ABSENT' || s.afternoon?.status === 'ABSENT').length;
        const permission = attendanceData.filter(s => s.morning?.status === 'PERMISSION' || s.afternoon?.status === 'PERMISSION').length;
        return { total, absent, permission };
    }, [attendanceData]);

    const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
    const handleNextDay = () => {
        if (!isToday(selectedDate)) {
            setSelectedDate(prev => addDays(prev, 1));
        }
    };

    const StatusBadge = ({ status }: { status?: string }) => {
        if (!status) return <View style={[styles.miniBadge, styles.badgeEmpty]}><Text style={styles.miniBadgeEmpty}>-</Text></View>;
        
        let label = 'P';
        let color = '#10B981';
        let bg = '#ECFDF5';

        if (status === 'PRESENT' || status === 'EXCUSED') {
            label = status === 'EXCUSED' ? 'E' : 'P';
            color = '#059669';
            bg = '#ECFDF5';
        } else if (status === 'ABSENT') {
            label = 'A';
            color = '#EF4444';
            bg = '#FEF2F2';
        } else if (status === 'PERMISSION') {
            label = 'L'; // Leave/Permission
            color = '#7C3AED';
            bg = '#F5F3FF';
        } else if (status === 'LATE') {
            label = 'T'; // Tardy
            color = '#F59E0B';
            bg = '#FFFBEB';
        }

        return (
            <View style={[styles.miniBadge, { backgroundColor: bg }]}>
                <Text style={[styles.miniBadgeText, { color }]}>{label}</Text>
            </View>
        );
    };

    const renderStudentCard = ({ item }: { item: AttendanceEntry }) => (
        <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
                <View style={styles.avatarWrap}>
                    {item.photo ? (
                        <View style={styles.avatarImgWrap}>
                            <Text style={styles.avatarInitialOnTeal}>{avatarLetter(item.firstName, item.lastName)}</Text>
                        </View>
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Text style={styles.avatarInitial}>{avatarLetter(item.firstName, item.lastName)}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.nameWrap}>
                    <Text style={styles.studentName} numberOfLines={1}>
                        {formatName(item.firstName, item.lastName)}
                    </Text>
                    {item.englishFirstName || item.englishLastName ? (
                        <Text style={styles.englishName} numberOfLines={1}>
                            {[item.englishLastName, item.englishFirstName].filter(Boolean).join(' ')}
                        </Text>
                    ) : null}
                    {item.studentNumber && <Text style={styles.studentId}>{t('classScreens.members.idValue', { id: item.studentNumber })}</Text>}
                </View>
            </View>

            <View style={styles.sessionWrap}>
                <View style={styles.sessionCol}>
                    <Text style={styles.sessionLabel}>{t('attendance.morning').substring(0, 3)}</Text>
                    <StatusBadge status={item.morning?.status} />
                </View>
                <View style={styles.sessionDivider} />
                <View style={styles.sessionCol}>
                    <Text style={styles.sessionLabel}>{t('attendance.afternoon').substring(0, 3)}</Text>
                    <StatusBadge status={item.afternoon?.status} />
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F0FDFA', '#F8FAFC', '#F1F5F9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <StatusBar barStyle="dark-content" />
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.headerTitle}>{className || t('attendance.title')}</Text>
                        <Text style={styles.headerSubtitle}>{t('attendance.report.classDaily')}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Date Selector */}
                <View style={styles.dateSelector}>
                    <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavBtn}>
                        <Ionicons name="chevron-back" size={20} color={BRAND_TEAL} />
                    </TouchableOpacity>
                    <View style={styles.dateDisplay}>
                        <Ionicons name="calendar-outline" size={18} color={BRAND_TEAL} style={{ marginRight: 8 }} />
                        <Text style={styles.dateText}>
                        {selectedDate.toLocaleDateString(i18n.language?.startsWith('km') ? 'km-KH' : 'en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                        })}
                        </Text>
                        {isToday(selectedDate) && (
                            <View style={styles.todayPill}>
                                <Text style={styles.todayPillText}>{t('common.today')}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity 
                        onPress={handleNextDay} 
                        style={[styles.dateNavBtn, isToday(selectedDate) && { opacity: 0.3 }]}
                        disabled={isToday(selectedDate)}
                    >
                        <Ionicons name="chevron-forward" size={20} color={BRAND_TEAL} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {user?.role === 'TEACHER' &&
                timetableContext?.patternSource === 'timetable' &&
                timetableContext.teacherTeachingThisClassToday === false && (
                    <View style={styles.timetableInfoBanner}>
                        <Ionicons name="information-circle-outline" size={18} color="#B45309" />
                        <Text style={styles.timetableInfoBannerText}>
                            {t('attendance.classDaily.notYourClassSlot')}
                        </Text>
                    </View>
                )}

            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <TouchableOpacity 
                    style={[styles.statItem, filter === 'ALL' && styles.statItemActive]}
                    onPress={() => setFilter('ALL')}
                >
                    <Text style={[styles.statVal, { color: BRAND_TEAL }]}>{stats.total}</Text>
                    <Text style={styles.statLab}>{t('common.all')}</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity 
                    style={[styles.statItem, filter === 'ABSENT' && styles.statItemActive]}
                    onPress={() => setFilter('ABSENT')}
                >
                    <Text style={[styles.statVal, { color: '#EF4444' }]}>{stats.absent}</Text>
                    <Text style={styles.statLab}>{t('attendance.status.absent')}</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity 
                    style={[styles.statItem, filter === 'PERMISSION' && styles.statItemActive]}
                    onPress={() => setFilter('PERMISSION')}
                >
                    <Text style={[styles.statVal, { color: '#7C3AED' }]}>{stats.permission}</Text>
                    <Text style={styles.statLab}>{t('attendance.status.permission')}</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={BRAND_TEAL} />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
            ) : (
                <FlashList
                    data={filteredData}
                    renderItem={renderStudentCard}
                    estimatedItemSize={80}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="documents-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>{t('common.noData')}</Text>
                            <Text style={styles.emptySubtitle}>{t('attendance.noRecordsForDate')}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    headerSafe: { 
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...Shadows.sm,
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    headerTitleWrap: { alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
    headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 8,
    },
    dateNavBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#F0FDFA',
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dateText: { fontSize: 14, fontWeight: '700', color: Colors.text },
    todayPill: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: BRAND_TEAL,
        borderRadius: 6,
    },
    todayPillText: { fontSize: 9, fontWeight: '800', color: '#FFF', textTransform: 'uppercase' },

    statsBar: {
        flexDirection: 'row',
        margin: 20,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 12,
        ...Shadows.sm,
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 12 },
    statItemActive: { backgroundColor: '#F8FAFC' },
    statVal: { fontSize: 18, fontWeight: '800' },
    statLab: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600' },
    statDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0', alignSelf: 'center' },

    timetableInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 4,
        marginBottom: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    timetableInfoBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#92400E',
        lineHeight: 17,
    },

    listContent: { padding: 20, paddingTop: 0 },
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadows.sm,
    },
    studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarWrap: { marginRight: 12 },
    avatarImgWrap: { width: 44, height: 44, borderRadius: 15, backgroundColor: BRAND_TEAL, alignItems: 'center', justifyContent: 'center' },
    avatarFallback: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: '#64748B' },
    avatarInitialOnTeal: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    nameWrap: { flex: 1 },
    studentName: { fontSize: 16, fontWeight: '700', color: Colors.text },
    englishName: { fontSize: 11, fontWeight: '600', color: BRAND_TEAL, textTransform: 'uppercase', marginTop: 1 },
    studentId: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    sessionWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sessionCol: { alignItems: 'center' },
    sessionLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase' },
    sessionDivider: { width: 1, height: 30, backgroundColor: '#F1F5F9' },
    
    miniBadge: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    miniBadgeText: { fontSize: 14, fontWeight: '900' },
    badgeEmpty: { backgroundColor: '#F1F5F9' },
    miniBadgeEmpty: { color: '#CBD5E1', fontWeight: '700' },

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -50 },
    loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 14 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
});
