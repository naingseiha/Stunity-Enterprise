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
    Modal,
    Pressable,
    TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

type SessionKey = 'morning' | 'afternoon';

interface StatusOption {
    label: string;
    value: string;
}

export default function ClassAttendanceScreen({ route, navigation }: any) {
    const {
        classId,
        className,
        isHomeroom: initialIsHomeroom,
        homeroomTeacherId,
    } = route.params || {};
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
    const [daySwitching, setDaySwitching] = useState(false);
    const [statusPicker, setStatusPicker] = useState<{
        visible: boolean;
        studentId: string;
        session: SessionKey;
        currentStatus?: string;
        currentRemarks?: string;
    }>({
        visible: false,
        studentId: '',
        session: 'morning',
        currentStatus: undefined,
        currentRemarks: undefined,
    });
    const [excusedDraft, setExcusedDraft] = useState('');
    const [isExcusedReasonStep, setIsExcusedReasonStep] = useState(false);
    const closeAllModals = useCallback(() => {
        setStatusPicker((prev) => ({ ...prev, visible: false }));
        setIsExcusedReasonStep(false);
        setExcusedDraft('');
    }, []);
    const isFutureDate = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const selected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return selected > today;
    }, [selectedDate]);

    const isRouteHomeroom = initialIsHomeroom === true;
    const teacherProfileId = user?.teacherId || user?.teacher?.id;
    const isMatchedHomeroomTeacher =
        Boolean(homeroomTeacherId) &&
        (teacherProfileId === homeroomTeacherId || user?.id === homeroomTeacherId);
    const isHomeroomFromServer = timetableContext?.isHomeroomTeacher === true;
    const teachesThisClassToday = timetableContext?.teacherTeachingThisClassToday === true;

    const canEdit = useMemo(() => {
        if (isFutureDate) return false;
        // Homeroom teacher can edit for any non-future date, regardless of timetable.
        // Timetable-linked teaching days: server sets teacherTeachingThisClassToday when this teacher has a period.
        return isRouteHomeroom || isMatchedHomeroomTeacher || isHomeroomFromServer || teachesThisClassToday;
    }, [isFutureDate, isMatchedHomeroomTeacher, isRouteHomeroom, isHomeroomFromServer, teachesThisClassToday]);

    const prefetchAdjacentDays = useCallback((date: Date) => {
        if (!classId) return;
        for (let offset = -3; offset <= 3; offset++) {
            if (offset === 0) continue;
            const prefetchDate = format(addDays(date, offset), 'yyyy-MM-dd');
            void classesApi.prefetchClassDailyAttendance(classId, prefetchDate);
        }
    }, [classId]);

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
            prefetchAdjacentDays(date);
        } catch (error) {
            if (__DEV__) console.warn('[attendance] class daily:', error);
            Alert.alert(t('common.error'), t('attendance.loadFailed'));
        } finally {
            setLoading(false);
            setDaySwitching(false);
        }
    }, [classId, t, prefetchAdjacentDays]);

    useEffect(() => {
        setDaySwitching(true);
        // Keep visible rows while loading new day to avoid jarring blank spinner.
        fetchAttendance(selectedDate, { preserveVisibleContent: true });
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

    const statusOptions = useMemo<StatusOption[]>(() => ([
        { label: t('attendance.status.present'), value: 'PRESENT' },
        { label: t('attendance.status.absent'), value: 'ABSENT' },
        { label: t('attendance.status.permission'), value: 'PERMISSION' },
        { label: t('attendance.status.late'), value: 'LATE' },
        { label: t('attendance.status.excused'), value: 'EXCUSED' },
    ]), [t]);

    const handleUpdateStatus = (
        studentId: string,
        session: SessionKey,
        currentStatus: string,
        currentRemarks?: string
    ) => {
        if (!canEdit) return;
        setIsExcusedReasonStep(false);
        setExcusedDraft('');
        setStatusPicker({
            visible: true,
            studentId,
            session,
            currentStatus,
            currentRemarks,
        });
    };

    const performUpdate = useCallback(async (studentId: string, sessionKey: SessionKey, status: string, remarks?: string) => {
        let beforeSlot: AttendanceEntry[SessionKey] | null = null;
        setAttendanceData((prev) => {
            const row = prev.find((item) => item.studentId === studentId);
            const raw = row?.[sessionKey];
            beforeSlot = raw ? { ...raw } : null;
            return prev.map((item) => {
                if (item.studentId !== studentId) return item;
                return {
                    ...item,
                    [sessionKey]: { ...(item[sessionKey] || {}), status, remarks },
                };
            });
        });

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        try {
            await classesApi.bulkMarkAttendance(
                classId,
                dateStr,
                sessionKey.toUpperCase() as 'MORNING' | 'AFTERNOON',
                [{ studentId, status, remarks }]
            );
        } catch (err: any) {
            setAttendanceData((prev) => prev.map((item) => {
                if (item.studentId !== studentId) return item;
                return { ...item, [sessionKey]: beforeSlot };
            }));
            Alert.alert(t('common.error'), err?.message || t('attendance.updateFailed'));
        }
    }, [classId, selectedDate, t]);

    const handleSelectStatus = useCallback((status: string) => {
        if (!statusPicker.studentId) return;
        const sid = statusPicker.studentId;
        const sess = statusPicker.session;
        if (status === 'EXCUSED') {
            setIsExcusedReasonStep(true);
            setExcusedDraft(statusPicker.currentRemarks || '');
            return;
        }
        setStatusPicker((prev) => ({ ...prev, visible: false }));
        void performUpdate(sid, sess, status);
    }, [statusPicker.studentId, statusPicker.session, statusPicker.currentRemarks, performUpdate]);

    const handleSubmitExcusedReason = useCallback(() => {
        const reason = excusedDraft.trim();
        if (!reason) {
            Alert.alert(t('attendance.alerts.reasonRequiredTitle'), t('attendance.alerts.reasonRequiredMessage'));
            return;
        }
        const studentId = statusPicker.studentId;
        const session = statusPicker.session;
        closeAllModals();
        void performUpdate(studentId, session, 'EXCUSED', reason);
    }, [excusedDraft, statusPicker.studentId, statusPicker.session, t, performUpdate, closeAllModals]);

    const statusLegend = useMemo(() => ([
        { code: '✓', label: t('attendance.status.present'), color: '#059669', bg: '#ECFDF5' },
        { code: 'A', label: t('attendance.status.absent'), color: '#EF4444', bg: '#FEF2F2' },
        { code: 'P', label: t('attendance.status.permission'), color: '#7C3AED', bg: '#F5F3FF' },
        { code: 'L', label: t('attendance.status.late'), color: '#F59E0B', bg: '#FFFBEB' },
        { code: 'E', label: t('attendance.status.excused'), color: '#0F766E', bg: '#ECFEFF' },
    ]), [t]);


    const StatusBadge = ({ status, onPress }: { status?: string; onPress?: () => void }) => {
        if (!status) {
            return (
                <TouchableOpacity 
                    style={[styles.miniBadge, { backgroundColor: '#ECFDF5' }]} 
                    onPress={onPress}
                    disabled={!onPress}
                >
                    <Ionicons name="checkmark" size={18} color="#059669" />
                </TouchableOpacity>
            );
        }
        
        let label = '✓';
        let color = '#10B981';
        let bg = '#ECFDF5';

        if (status === 'PRESENT') {
            label = '✓';
            color = '#059669';
            bg = '#ECFDF5';
        } else if (status === 'ABSENT') {
            label = 'A';
            color = '#EF4444';
            bg = '#FEF2F2';
        } else if (status === 'PERMISSION') {
            label = 'P'; // Permission leave
            color = '#7C3AED';
            bg = '#F5F3FF';
        } else if (status === 'LATE') {
            label = 'L'; // Late
            color = '#F59E0B';
            bg = '#FFFBEB';
        } else if (status === 'EXCUSED') {
            label = 'E';
            color = '#0F766E';
            bg = '#ECFEFF';
        }

        return (
            <TouchableOpacity 
                style={[styles.miniBadge, { backgroundColor: bg }]}
                onPress={onPress}
                disabled={!onPress}
            >
                <Text style={[styles.miniBadgeText, { color }]}>{label}</Text>
            </TouchableOpacity>
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
                    <StatusBadge 
                        status={item.morning?.status} 
                        onPress={canEdit ? () => handleUpdateStatus(
                            item.studentId,
                            'morning',
                            item.morning?.status || '',
                            item.morning?.remarks
                        ) : undefined}
                    />
                </View>
                <View style={styles.sessionDivider} />
                <View style={styles.sessionCol}>
                    <Text style={styles.sessionLabel}>{t('attendance.afternoon').substring(0, 3)}</Text>
                    <StatusBadge 
                        status={item.afternoon?.status} 
                        onPress={canEdit ? () => handleUpdateStatus(
                            item.studentId,
                            'afternoon',
                            item.afternoon?.status || '',
                            item.afternoon?.remarks
                        ) : undefined}
                    />
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
                        <Text style={styles.headerTitle} numberOfLines={1}>{className || t('attendance.title')}</Text>
                        <View style={styles.headerSubtitleRow}>
                            <MaterialCommunityIcons name="clipboard-check-outline" size={12} color={BRAND_TEAL} style={{ marginRight: 4 }} />
                            <Text style={styles.headerSubtitle}>{t('attendance.classDaily.title')}</Text>
                        </View>
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
                !canEdit &&
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
            {daySwitching && !loading ? (
                <View style={styles.daySwitchLoader}>
                    <ActivityIndicator size="small" color={BRAND_TEAL} />
                    <Text style={styles.daySwitchLoaderText}>{t('common.loading')}</Text>
                </View>
            ) : null}
            <View style={styles.legendRow}>
                {statusLegend.map((item) => (
                    <View key={item.code} style={styles.legendItem}>
                        <View style={[styles.legendCode, { backgroundColor: item.bg }]}>
                            <Text style={[styles.legendCodeText, { color: item.color }]}>{item.code}</Text>
                        </View>
                        <Text style={styles.legendLabel}>{item.label}</Text>
                    </View>
                ))}
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

            <Modal
                visible={statusPicker.visible}
                animationType="fade"
                transparent
                onRequestClose={closeAllModals}
            >
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={closeAllModals}
                >
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        {isExcusedReasonStep ? (
                            <>
                                <Text style={styles.modalTitle}>{t('attendance.status.excused')}</Text>
                                <Text style={styles.modalSubtitle}>{t('attendance.alerts.reasonRequiredMessage')}</Text>
                                <TextInput
                                    value={excusedDraft}
                                    onChangeText={setExcusedDraft}
                                    placeholder={t('attendance.requestPermission.reasonPlaceholder')}
                                    style={styles.reasonInput}
                                    multiline
                                    autoFocus
                                />
                                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSubmitExcusedReason}>
                                    <Text style={styles.modalPrimaryText}>{t('common.save')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setIsExcusedReasonStep(false)}
                                >
                                    <Text style={styles.modalCancelText}>{t('common.back')}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>{t('attendance.updateStatus')}</Text>
                                <Text style={styles.modalSubtitle}>
                                    {t('attendance.selectStatusFor', { session: t(`attendance.${statusPicker.session}`) })}
                                </Text>
                                {statusOptions.map((option) => {
                                    const active = option.value === statusPicker.currentStatus;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[styles.modalOption, active && styles.modalOptionActive]}
                                            onPress={() => handleSelectStatus(option.value)}
                                        >
                                            <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={closeAllModals}
                                >
                                    <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
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
    headerTitleWrap: { alignItems: 'center', flex: 1, marginHorizontal: 8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center' },
    headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    headerSubtitle: { fontSize: 14, fontWeight: '700', color: BRAND_TEAL },
    
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
        fontWeight: '700',
        color: '#92400E',
        lineHeight: 18,
    },
    homeroomBanner: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
    },
    homeroomBannerText: {
        color: '#065F46',
    },

    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginHorizontal: 20,
        marginTop: -10,
        marginBottom: 10,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
    legendCode: {
        minWidth: 24,
        height: 24,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    legendCodeText: { fontSize: 12, fontWeight: '900' },
    legendLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
    daySwitchLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: -6,
        marginBottom: 10,
    },
    daySwitchLoaderText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '700',
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
    nameWrap: { flex: 1, paddingRight: 4 },
    studentName: { fontSize: 15, fontWeight: '700', color: Colors.text },
    englishName: { fontSize: 10, fontWeight: '700', color: BRAND_TEAL, textTransform: 'uppercase', marginTop: 1, letterSpacing: 0.5 },
    studentId: { fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '500' },

    sessionWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sessionCol: { alignItems: 'center', minWidth: 32 },
    sessionLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase' },
    sessionDivider: { width: 1, height: 28, backgroundColor: '#F1F5F9' },
    
    miniBadge: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    miniBadgeText: { fontSize: 16, fontWeight: '900' },
    badgeEmpty: { backgroundColor: '#F1F5F9' },
    miniBadgeEmpty: { color: '#94A3B8', fontWeight: '800', fontSize: 16 },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.35)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 14, fontWeight: '600' },
    modalOption: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#F8FAFC',
    },
    modalOptionActive: {
        borderColor: BRAND_TEAL,
        backgroundColor: '#ECFEFF',
    },
    modalOptionText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    modalOptionTextActive: { color: '#0E7490' },
    modalCancelBtn: {
        marginTop: 4,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    modalCancelText: { fontSize: 15, fontWeight: '700', color: '#475569' },
    reasonInput: {
        minHeight: 88,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        padding: 10,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    modalPrimaryBtn: {
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND_TEAL,
        marginBottom: 8,
    },
    modalPrimaryText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -50 },
    loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 14 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
});
