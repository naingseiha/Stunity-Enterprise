import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    Platform,
    Modal,
    TextInput,
    Linking,
    Animated,
    AppState,
    AppStateStatus
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores';
import { Shadows } from '@/config';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Haptics } from '@/services/haptics';
import { attendanceService, NOT_ON_TIMETABLE_CODE, REQUEST_TIMEOUT_CODE } from '@/services/attendance';

/** Enterprise-friendly palette: teal accent, slate neutrals (avoids neon cyan). */
const BRAND_TEAL = '#0F766E';
const BRAND_TEAL_DARK = '#0D9488';
const BRAND_TEAL_SOFT = '#F0FDFA';
const BRAND_TEAL_MUTED = '#99F6E4';
const PAGE_BG = '#F1F5F9';
const SURFACE = '#FFFFFF';
const BORDER_DEFAULT = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_MUTED = '#64748B';
const INDIGO_SURFACE = '#EEF2FF';
const INDIGO_TEXT = '#3730A3';

const WEEKLY_ENUM_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

const WeeklyStrip = ({
    weeklyPattern,
}: {
    weeklyPattern?: Record<
        string,
        { morning: boolean; afternoon: boolean } | undefined
    >;
}) => {
    const { t } = useTranslation();
    const days = [
        t('attendance.days.mon'),
        t('attendance.days.tue'),
        t('attendance.days.wed'),
        t('attendance.days.thu'),
        t('attendance.days.fri'),
        t('attendance.days.sat'),
        t('attendance.days.sun'),
    ];
    const today = new Date().getDay();
    const currentDayIdx = today === 0 ? 6 : today - 1;

    return (
        <View style={styles.weeklyContainer}>
            {days.map((day, i) => {
                const isToday = i === currentDayIdx;
                const isPast = i < currentDayIdx;
                const enumKey = WEEKLY_ENUM_ORDER[i];
                const pat = weeklyPattern?.[enumKey];
                const isTeachingDay =
                    !!(pat?.morning || pat?.afternoon) &&
                    !!(weeklyPattern && Object.keys(weeklyPattern).length);
                return (
                    <View
                        key={day}
                        style={[
                            styles.dayColPill,
                            isToday && styles.todayPill,
                            isPast && styles.pastPill,
                            isTeachingDay && styles.teachingDayPill,
                        ]}
                    >
                        <Text
                            style={[
                                styles.dayLabel,
                                isToday && styles.todayLabel,
                                isPast && styles.pastLabel,
                                isTeachingDay && styles.teachingDayLabel,
                            ]}
                        >
                            {day}
                        </Text>
                        <View
                            style={[
                                styles.dayDot,
                                isToday && styles.todayDotInner,
                                isPast && styles.pastDotInner,
                                isTeachingDay && styles.teachingDayDot,
                            ]}
                        >
                            {isTeachingDay ? (
                                <Ionicons name="school-outline" size={11} color="#fff" />
                            ) : isPast ? (
                                <Ionicons name="checkmark" size={12} color="#fff" />
                            ) : null}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const SessionCard = ({
    session,
    data,
    onAction,
    processing,
    isCurrent,
    availability,
    timetableBlocked,
    timetableBlockedHint,
}: {
    session: 'MORNING' | 'AFTERNOON';
    data: any;
    onAction: (type: 'in' | 'out', session: 'MORNING' | 'AFTERNOON') => void;
    processing: boolean;
    isCurrent: boolean;
    availability: 'past' | 'current' | 'upcoming';
    timetableBlocked?: boolean;
    timetableBlockedHint?: string;
}) => {
    const { t } = useTranslation();
    const isPermission = data?.status === 'PERMISSION';
    const isCheckedIn = !!data?.timeIn;
    const isCheckedOut = !!data?.timeOut;
    const isOnDuty = isCheckedIn && !isCheckedOut && !isPermission;
    const isActionUnavailable = (availability !== 'current' || timetableBlocked) && !isCheckedIn;
    const showTimetableHint =
        Boolean(timetableBlocked) && !isPermission && !isCheckedIn;

    const handlePress = () => {
        if (isActionUnavailable) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAction(isOnDuty ? 'out' : 'in', session);
    };

    return (
        <Animated.View
            style={[
                styles.sessionCard,
                isCurrent && styles.currentSessionCard,
                isCheckedOut && styles.completedSessionCard
            ]}
        >
            <View style={styles.sessionHeader}>
                <View style={[styles.sessionIconBg, { backgroundColor: isCurrent ? BRAND_TEAL_SOFT : '#F1F5F9' }]}>
                    <Ionicons
                        name={session === 'MORNING' ? "sunny" : "partly-sunny"}
                        size={22}
                        color={isCurrent ? BRAND_TEAL : TEXT_MUTED}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.sessionTitle, isCurrent && { color: BRAND_TEAL }]}>
                        {session === 'MORNING' ? t('attendance.morning') : t('attendance.afternoon')}
                    </Text>
                    <Text style={styles.sessionTimeWindow}>
                        {session === 'MORNING' ? '07:00 AM - 12:00 PM' : '12:00 PM - 06:00 PM'}
                    </Text>
                </View>
                {isPermission ? (
                    <View style={styles.permissionBadge}>
                        <Ionicons name="document-text-outline" size={14} color="#7C3AED" />
                        <Text style={styles.permissionBadgeText}>{t('attendance.permission')}</Text>
                    </View>
                ) : isCheckedOut ? (
                    <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.completedBadgeText}>{t('attendance.done')}</Text>
                    </View>
                ) : isCurrent && (
                    <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>{t('attendance.active')}</Text>
                    </View>
                )}
            </View>

            <View style={styles.timeInfoRow}>
                <View style={styles.timeBox}>
                    <View style={styles.timeLabelRow}>
                        <Ionicons
                            name={isPermission ? 'time-outline' : 'log-in-outline'}
                            size={14}
                            color="#64748B"
                        />
                        <Text style={styles.timeLabel}>{isPermission ? t('attendance.requestedAt') : t('attendance.checkIn')}</Text>
                    </View>
                    <Text style={[styles.timeValue, isCheckedIn && styles.activeTimeValue]}>
                        {data?.timeIn ? new Date(data.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                </View>
                <View style={styles.timeSeparatorWrapper}>
                    <Ionicons name="arrow-forward" size={16} color="#CBD5E1" />
                </View>
                <View style={styles.timeBox}>
                    <View style={styles.timeLabelRow}>
                        <Ionicons
                            name={isPermission ? 'globe-outline' : 'log-out-outline'}
                            size={14}
                            color="#64748B"
                        />
                        <Text style={styles.timeLabel}>{isPermission ? t('attendance.mode') : t('attendance.checkOut')}</Text>
                    </View>
                    <Text style={[styles.timeValue, (isCheckedOut || isPermission) && styles.activeTimeValue]}>
                        {isPermission ? t('attendance.online') : (data?.timeOut ? new Date(data.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--')}
                    </Text>
                </View>
            </View>

            {isPermission && (
                <Text style={styles.permissionNote}>
                    {t('attendance.permissionNote')}
                </Text>
            )}

            {showTimetableHint && (
                <View style={styles.timetableSessionHint}>
                    <Ionicons name="calendar-outline" size={16} color="#B45309" />
                    <Text style={styles.timetableSessionHintText}>
                        {timetableBlockedHint ||
                            t('attendance.timetable.sessionNotOnYourSchedule')}
                    </Text>
                </View>
            )}

            {!isCheckedOut && !isPermission && isActionUnavailable ? (
                <View style={styles.sessionUnavailableBox}>
                    <Ionicons
                        name={availability === 'past' && !timetableBlocked ? 'time-outline' : 'lock-closed-outline'}
                        size={18}
                        color="#94A3B8"
                    />
                    <Text style={styles.sessionUnavailableText}>
                        {timetableBlocked
                            ? t('attendance.timetable.offScheduleTitle', 'Off Schedule')
                            : availability === 'past'
                                ? t('attendance.sessionEnded')
                                : t('attendance.sessionUpcoming')}
                    </Text>
                </View>
            ) : !isCheckedOut && !isPermission && (
                <TouchableOpacity
                    style={[
                        styles.sessionBtnContainer,
                        processing && styles.btnDisabled
                    ]}
                    onPress={handlePress}
                    disabled={processing || isActionUnavailable}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={isOnDuty ? ['#BE123C', '#9F1239'] : [BRAND_TEAL, BRAND_TEAL_DARK]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.sessionBtn}
                    >
                        {processing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name={isOnDuty ? "log-out-outline" : "finger-print"} size={22} color="#fff" />
                                <Text style={styles.sessionBtnText}>
                                    {isOnDuty ? t('attendance.finishSession') : (session === 'MORNING' ? t('attendance.startMorning') : t('attendance.startAfternoon'))}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

export const AttendanceCheckInScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const isLinkedToSchool = !!user?.schoolId;

    const [loading, setLoading] = useState(true);
    const [statusFetchError, setStatusFetchError] = useState<string | null>(null);
    const [processingSession, setProcessingSession] = useState<'MORNING' | 'AFTERNOON' | null>(null);
    const [status, setStatus] = useState<any>(null);
    const [locationPermGranted, setLocationPermGranted] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'initializing' | 'locating' | 'ready' | 'limited' | 'denied' | 'updating' | 'verifying' | 'verified' | 'failed'>('initializing');
    const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [permissionModalVisible, setPermissionModalVisible] = useState(false);
    const [permissionSession, setPermissionSession] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
    const [permissionReason, setPermissionReason] = useState('');
    const [permissionProcessingSession, setPermissionProcessingSession] = useState<'MORNING' | 'AFTERNOON' | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const openedLocationSettingsRef = useRef(false);
    const skipFirstFocusFetchRef = useRef(true);

    const gpsText = useMemo(() => {
        if (gpsStatus === 'ready') {
            return t('attendance.gps.ready');
        }
        return t(`attendance.gps.${gpsStatus}`);
    }, [gpsStatus, t]);

    const headerDateText = useMemo(
        () =>
            new Date().toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            }),
        [i18n.language]
    );

    const getSessionLabel = useCallback((session: 'MORNING' | 'AFTERNOON') => {
        return session === 'MORNING' ? t('attendance.morning') : t('attendance.afternoon');
    }, [t]);

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

    const fetchTodayStatus = useCallback(async (opts?: { bustCache?: boolean }) => {
        try {
            setStatusFetchError(null);
            const localDay = format(new Date(), 'yyyy-MM-dd');
            const result = await attendanceService.getTodayStatus(localDay, {
                bustCache: opts?.bustCache ?? false,
            });
            if (result?.success && result.data) {
                setStatus(result.data);
            } else {
                const msg =
                    (typeof (result as { message?: string })?.message === 'string' &&
                        (result as { message?: string }).message) ||
                    t('attendance.alerts.todayStatusFailed');
                setStatusFetchError(msg);
            }
        } catch (error: unknown) {
            if (__DEV__) console.warn('[attendance] fetchTodayStatus:', error);
            const timeout =
                typeof error === 'object' &&
                error !== null &&
                (error as { code?: string }).code === REQUEST_TIMEOUT_CODE;
            const msg = timeout
                ? t('attendance.alerts.networkTimeout')
                : error instanceof Error
                  ? error.message
                  : t('attendance.alerts.todayStatusFailed');
            setStatusFetchError(msg);
        }
    }, [t]);

    const openLocationSettings = useCallback(async () => {
        try {
            openedLocationSettingsRef.current = true;
            await Linking.openSettings();
        } catch (error) {
            openedLocationSettingsRef.current = false;
            Alert.alert(t('common.error'), t('attendance.alerts.enableLocationMessage'));
        }
    }, [t]);

    const promptEnableLocation = useCallback((message?: string) => {
        Alert.alert(
            t('common.error'),
            message || t('attendance.alerts.enableLocationMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.settings'),
                    onPress: () => {
                        void openLocationSettings();
                    }
                }
            ]
        );
    }, [openLocationSettings, t]);

    type PermissionCheckResult = {
        granted: boolean;
        canAskAgain: boolean;
    };

    const checkPermissions = async (): Promise<PermissionCheckResult> => {
        try {
            let permission = await Location.getForegroundPermissionsAsync();
            if (permission.status !== 'granted' && permission.canAskAgain) {
                permission = await Location.requestForegroundPermissionsAsync();
            }
            const granted = permission.status === 'granted';
            setLocationPermGranted(granted);
            return {
                granted,
                canAskAgain: permission.canAskAgain ?? false
            };
        } catch (e) {
            setLocationPermGranted(false);
            return {
                granted: false,
                canAskAgain: false
            };
        }
    };

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const getPositionWithTimeout = async (
        accuracy: Location.Accuracy,
        timeoutMs: number
    ): Promise<Location.LocationObject | null> => {
        try {
            const locationPromise = Location.getCurrentPositionAsync({ accuracy });
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('location_timeout')), timeoutMs)
            );

            return await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
        } catch (e) {
            return null;
        }
    };

    const resolveLocationAsync = useCallback(async (isManualRefresh = false) => {
        let loc: Location.LocationObject | null = null;

        try {
            loc = await Promise.race([
                Location.getLastKnownPositionAsync({
                    maxAge: 5 * 60 * 1000,
                    requiredAccuracy: 1000
                }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
            ]) as Location.LocationObject | null;
        } catch (e) {
            loc = null;
        }

        if (loc) return loc;

        const attempts = isManualRefresh
            ? [
                { accuracy: Location.Accuracy.High, timeoutMs: 12000 },
                { accuracy: Location.Accuracy.Balanced, timeoutMs: 8000 }
            ]
            : Platform.OS === 'ios'
                ? [
                    { accuracy: Location.Accuracy.Balanced, timeoutMs: 8000 },
                    { accuracy: Location.Accuracy.Low, timeoutMs: 5000 }
                ]
                : [
                    { accuracy: Location.Accuracy.Balanced, timeoutMs: 4000 },
                    { accuracy: Location.Accuracy.Low, timeoutMs: 4000 }
                ];

        for (let i = 0; i < attempts.length; i += 1) {
            const attempt = attempts[i];
            loc = await getPositionWithTimeout(attempt.accuracy, attempt.timeoutMs);
            if (loc) return loc;

            if (Platform.OS === 'ios' && i < attempts.length - 1) {
                await wait(750);
            }
        }

        return null;
    }, []);

    const fetchLocationAsync = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setGpsStatus('updating');
            } else {
                setGpsStatus('locating');
            }
            setGpsCoords(null);

            const { granted, canAskAgain } = await checkPermissions();
            if (granted) {
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                if (!servicesEnabled) {
                    setGpsCoords(null);
                    setGpsStatus('limited');
                    if (isManualRefresh) {
                        promptEnableLocation();
                    }
                    return;
                }

                const loc = await resolveLocationAsync(isManualRefresh);

                if (loc) {
                    setGpsCoords({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    });
                    setGpsStatus('ready');
                } else {
                    setGpsCoords(null);
                    setGpsStatus('limited');
                }
            } else {
                setGpsCoords(null);
                setGpsStatus('denied');
                if (isManualRefresh) {
                    promptEnableLocation(
                        canAskAgain
                            ? t('attendance.alerts.permissionRequiredMessage')
                            : t('attendance.alerts.enableLocationMessage')
                    );
                }
            }
        } catch (e: any) {
            setGpsCoords(null);
            setGpsStatus('limited');
            if (isManualRefresh) {
                Alert.alert(
                    t('common.error'),
                    t('attendance.alerts.locationFetchFailedMessage'),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('common.settings'),
                            onPress: () => {
                                void openLocationSettings();
                            }
                        }
                    ]
                );
            }
        }
    };

    const getCurrentLocationWithTimeout = useCallback(async () => {
        const loc = await resolveLocationAsync(true);

        if (!loc) {
            throw new Error('location_timeout');
        }

        return loc;
    }, [resolveLocationAsync]);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            setLoading(true);
            try {
                // 1. Fetch data immediately
                await fetchTodayStatus();
            } finally {
                // 2. Unblock UI immediately
                if (mounted) setLoading(false);
            }

            // 3. Handle GPS independently in background
            if (mounted) {
                await fetchLocationAsync(false);
            }
        };

        init();
        return () => { mounted = false; };
    }, [fetchTodayStatus]);

    /** Mount effect already loads today; skip duplicate bust on first focus, then bust when returning */
    useFocusEffect(
        useCallback(() => {
            if (skipFirstFocusFetchRef.current) {
                skipFirstFocusFetchRef.current = false;
                return;
            }
            void fetchTodayStatus({ bustCache: true });
        }, [fetchTodayStatus])
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            const wasInactive = appStateRef.current.match(/inactive|background/);
            appStateRef.current = nextAppState;

            if (wasInactive && nextAppState === 'active') {
                void fetchTodayStatus({ bustCache: true });
                if (openedLocationSettingsRef.current) {
                    openedLocationSettingsRef.current = false;
                    void fetchLocationAsync(true);
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [fetchTodayStatus]);

    const mutateAttendance = async (
        type: 'in' | 'out',
        session: 'MORNING' | 'AFTERNOON',
        payload: { latitude: number; longitude: number },
        acknowledgeOffSchedule: boolean
    ) => {
        const localDate = format(new Date(), 'yyyy-MM-dd');
        const opts = { localDate, acknowledgeOffSchedule };

        if (type === 'in') {
            await attendanceService.checkIn(payload, session, opts);
        } else {
            await attendanceService.checkOut(payload, session, opts);
        }
    };

    const handleAttendance = async (type: 'in' | 'out', session: 'MORNING' | 'AFTERNOON') => {
        const { granted } = await checkPermissions();
        if (!granted) {
            promptEnableLocation(t('attendance.alerts.permissionRequiredMessage'));
            return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
            setGpsStatus('limited');
            promptEnableLocation(t('attendance.alerts.enableLocationMessage'));
            return;
        }

        const run = async (acknowledgeOffSchedule: boolean) => {
            setProcessingSession(session);
            setGpsCoords(null);
            setGpsStatus('verifying');

            try {
                const location = await getCurrentLocationWithTimeout();
                const payload = { latitude: location.coords.latitude, longitude: location.coords.longitude };
                setGpsCoords(payload);

                await mutateAttendance(type, session, payload, acknowledgeOffSchedule);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setProcessingSession(null);
                if (type === 'in') {
                    Alert.alert(
                        t('common.success'),
                        t('attendance.alerts.checkInSuccessMessage', { session: getSessionLabel(session) })
                    );
                } else {
                    Alert.alert(
                        t('common.success'),
                        t('attendance.alerts.checkOutSuccessMessage', { session: getSessionLabel(session) })
                    );
                }

                await fetchTodayStatus();
                setGpsStatus('verified');
            } catch (error: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                if (
                    error?.code === NOT_ON_TIMETABLE_CODE &&
                    type === 'in'
                ) {
                    setProcessingSession(null);
                    setGpsStatus('failed');
                    Alert.alert(
                        t('attendance.timetable.offScheduleTitle'),
                        error?.message ||
                            t('attendance.timetable.offScheduleBody'),
                        [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('attendance.timetable.offScheduleConfirm'),
                                onPress: () => void run(true),
                            },
                        ]
                    );
                    return;
                }

                setProcessingSession(null);
                const errorMessage =
                    error?.code === REQUEST_TIMEOUT_CODE
                        ? t('attendance.alerts.networkTimeout')
                        : error?.message === 'location_timeout'
                          ? t('attendance.alerts.locationFetchFailedMessage')
                          : error.message || t('attendance.alerts.attendanceFailedFallback');
                Alert.alert(
                    t('attendance.alerts.attendanceFailedTitle'),
                    errorMessage
                );
                setGpsStatus('failed');
            }
        };

        await run(false);
    };

    const openPermissionRequest = (session: 'MORNING' | 'AFTERNOON') => {
        if (status?.[session]) {
            Alert.alert(
                t('attendance.alerts.alreadyRecordedTitle'),
                t('attendance.alerts.alreadyRecordedMessage', { session: getSessionLabel(session) })
            );
            return;
        }

        setPermissionSession(session);
        setPermissionReason('');
        setPermissionModalVisible(true);
    };

    const submitPermissionRequest = async () => {
        const trimmedReason = permissionReason.trim();
        if (!trimmedReason) {
            Alert.alert(
                t('attendance.alerts.reasonRequiredTitle'),
                t('attendance.alerts.reasonRequiredMessage')
            );
            return;
        }

        const submit = async (acknowledgeOffSchedule: boolean) => {
            setPermissionProcessingSession(permissionSession);
            try {
                await attendanceService.requestPermission(permissionSession, trimmedReason, {
                    localDate: format(new Date(), 'yyyy-MM-dd'),
                    acknowledgeOffSchedule,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setPermissionProcessingSession(null);
                setPermissionModalVisible(false);
                setPermissionReason('');
                Alert.alert(
                    t('attendance.alerts.requestSubmittedTitle'),
                    t('attendance.alerts.requestSubmittedMessage', { session: getSessionLabel(permissionSession) })
                );
                await fetchTodayStatus();
            } catch (error: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                if (error?.code === NOT_ON_TIMETABLE_CODE) {
                    setPermissionProcessingSession(null);
                    Alert.alert(
                        t('attendance.timetable.offScheduleTitle'),
                        error?.message || t('attendance.timetable.offScheduleBody'),
                        [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('attendance.timetable.offScheduleConfirm'),
                                onPress: () => void submit(true),
                            },
                        ]
                    );
                    return;
                }
                setPermissionProcessingSession(null);
                Alert.alert(
                    t('attendance.alerts.requestFailedTitle'),
                    error?.code === REQUEST_TIMEOUT_CODE
                        ? t('attendance.alerts.networkTimeout')
                        : error.message || t('attendance.alerts.requestFailedFallback')
                );
            }
        };

        await submit(false);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: PAGE_BG }]} />
                <ActivityIndicator size="large" color={BRAND_TEAL} />
                <Text style={[styles.loadingText, { color: BRAND_TEAL }]}>{t('attendance.syncing')}</Text>
            </View>
        );
    }

    if (!isLinkedToSchool) {
        return (
            <View style={styles.container}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: PAGE_BG }]} />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.navHeader}>
                        <TouchableOpacity style={styles.navIconButton} onPress={navigateToFeedTab}>
                            <Ionicons name="chevron-back" size={22} color={BRAND_TEAL} />
                        </TouchableOpacity>
                        <View style={styles.navTitleWrap}>
                            <Text style={styles.headerTitle}>{i18n.language === 'km' ? 'វត្តមាន' : t('attendance.title')}</Text>
                            <Text style={styles.headerSubtitle}>{headerDateText}</Text>
                        </View>
                        <View style={{ width: 48 }} />
                    </View>
                    <View style={[styles.centerContainer, { paddingHorizontal: 30 }]}>
                        <View style={styles.sessionIconBg}>
                            <Ionicons name="business-outline" size={64} color="#9CA3AF" />
                        </View>
                        <Text style={[{ fontSize: 24, fontWeight: '900' }, { marginTop: 20, textAlign: 'center', color: '#1F2937' }]}>{t('attendance.notLinked')}</Text>
                        <Text style={[styles.infoText, { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#6B7280' }]}>
                            {t('attendance.notLinkedMsg')}
                        </Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const currentHour = new Date().getHours();
    const getSessionAvailability = (session: 'MORNING' | 'AFTERNOON') => {
        if (session === 'MORNING') {
            return currentHour < 12 ? 'current' : 'past';
        }

        return currentHour < 12 ? 'upcoming' : 'current';
    };
    const morningAvailability = getSessionAvailability('MORNING');
    const afternoonAvailability = getSessionAvailability('AFTERNOON');

    const sch = status?.scheduleContext;
    const enforceTimetable = Boolean(sch?.timetableEnforcement);
    const morningBlockedBySchedule =
        enforceTimetable &&
        sch?.timetableSource === 'timetable' &&
        sch?.expectsMorning === false;
    const afternoonBlockedBySchedule =
        enforceTimetable &&
        sch?.timetableSource === 'timetable' &&
        sch?.expectsAfternoon === false;
    const bannerNoTeachingDay =
        sch?.timetableSource === 'timetable' &&
        enforceTimetable &&
        sch?.isScheduledTeachingDay === false;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.navHeader}>
                    <TouchableOpacity
                        style={styles.navIconButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigateToFeedTab();
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color={BRAND_TEAL} />
                    </TouchableOpacity>
                    <View style={styles.navTitleWrap}>
                        <Text style={styles.headerTitle}>{i18n.language === 'km' ? 'វត្តមាន' : t('attendance.title')}</Text>
                        <Text style={styles.headerSubtitle}>{headerDateText}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.navIconButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            void fetchTodayStatus({ bustCache: true });
                        }}
                    >
                        <Ionicons name="refresh" size={24} color={BRAND_TEAL} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            void fetchLocationAsync(true);
                        }}
                        style={styles.locationHeroCard}
                    >
                        <View style={styles.locationHeroContent}>
                            <View style={styles.locationHeroTopRow}>
                                <View style={styles.locationIconPulseWrapper}>
                                    <Ionicons name="navigate" size={24} color={BRAND_TEAL} />
                                    <View style={[
                                        styles.locationStatusPulse, 
                                        { backgroundColor: locationPermGranted ? '#10B981' : '#EF4444' }
                                    ]} />
                                </View>
                                <View style={styles.locationHeroTextWrap}>
                                    <Text style={styles.locationHeroTitle}>{t('attendance.gpsLocation')}</Text>
                                    <Text style={styles.locationHeroSubtitle}>{gpsText}</Text>
                                </View>
                                <View style={styles.locationRefreshIconBg}>
                                    <Ionicons name="refresh" size={20} color={TEXT_MUTED} />
                                </View>
                            </View>
                            
                            {gpsStatus === 'ready' && gpsCoords && (
                                <View style={styles.locationCoordsRow}>
                                    <Ionicons name="location-outline" size={14} color={BRAND_TEAL} />
                                    <Text style={styles.locationCoordsText} numberOfLines={1}>
                                        {`${gpsCoords.latitude.toFixed(5)}, ${gpsCoords.longitude.toFixed(5)}`}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    {statusFetchError ? (
                        <View style={styles.syncErrorBanner}>
                            <Ionicons name="cloud-offline-outline" size={20} color="#B91C1C" />
                            <Text style={styles.syncErrorBannerText}>{statusFetchError}</Text>
                            <TouchableOpacity
                                style={styles.syncErrorRetryBtn}
                                onPress={() => void fetchTodayStatus({ bustCache: true })}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.syncErrorRetryText}>{t('common.tryAgain')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {bannerNoTeachingDay && (
                        <View style={styles.timetableBanner}>
                            <Ionicons name="calendar-outline" size={18} color="#B45309" />
                            <Text style={styles.timetableBannerText}>
                                {t('attendance.timetable.nonTeachingDay')}
                            </Text>
                        </View>
                    )}

                    <Animated.View>
                        <WeeklyStrip weeklyPattern={sch?.weeklyPattern} />
                    </Animated.View>

                    <SessionCard
                        session="MORNING"
                        data={status?.MORNING}
                        onAction={handleAttendance}
                        processing={processingSession === 'MORNING'}
                        isCurrent={morningAvailability === 'current'}
                        availability={morningAvailability}
                        timetableBlocked={morningBlockedBySchedule}
                        timetableBlockedHint={t('attendance.timetable.sessionNotScheduledHint', {
                            session: t('attendance.morning'),
                        })}
                    />

                    <SessionCard
                        session="AFTERNOON"
                        data={status?.AFTERNOON}
                        onAction={handleAttendance}
                        processing={processingSession === 'AFTERNOON'}
                        isCurrent={afternoonAvailability === 'current'}
                        availability={afternoonAvailability}
                        timetableBlocked={afternoonBlockedBySchedule}
                        timetableBlockedHint={t('attendance.timetable.sessionNotScheduledHint', {
                            session: t('attendance.afternoon'),
                        })}
                    />

                    <Animated.View style={styles.permissionRequestCard}>
                        <LinearGradient
                            colors={['#F8FAFC', '#FFFFFF']}
                            style={styles.permissionHero}
                        >
                            <View style={styles.permissionRequestHeader}>
                                <View style={styles.permissionRequestIconBg}>
                                    <Ionicons name="document-text" size={24} color="#6366F1" />
                                </View>
                                <View style={styles.permissionRequestTextWrap}>
                                    <Text style={styles.permissionRequestTitle}>{t('attendance.requestPermission.title')}</Text>
                                    <Text style={styles.permissionRequestSubtitle}>
                                        {t('attendance.requestPermission.subtitle')}
                                    </Text>
                                </View>
                            </View>

                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.permissionFeatureRow}
                            >
                                <View style={styles.permissionFeaturePill}>
                                    <Ionicons name="globe-outline" size={14} color="#6366F1" />
                                    <Text style={styles.permissionFeatureText}>{t('attendance.requestPermission.anywhere')}</Text>
                                </View>
                                <View style={styles.permissionFeaturePill}>
                                    <Ionicons name="location-outline" size={14} color="#6366F1" />
                                    <Text style={styles.permissionFeatureText}>{t('attendance.requestPermission.noGps')}</Text>
                                </View>
                                <View style={styles.permissionFeaturePill}>
                                    <Ionicons name="flash-outline" size={14} color="#6366F1" />
                                    <Text style={styles.permissionFeatureText}>{t('attendance.requestPermission.instant')}</Text>
                                </View>
                            </ScrollView>
                        </LinearGradient>

                        <View style={styles.permissionActionRow}>
                            <TouchableOpacity
                                style={[
                                    styles.permissionActionButton,
                                    (status?.MORNING || permissionProcessingSession !== null) && styles.permissionActionButtonDisabled
                                ]}
                                onPress={() => openPermissionRequest('MORNING')}
                                disabled={!!status?.MORNING || permissionProcessingSession !== null}
                            >
                                {permissionProcessingSession === 'MORNING' ? (
                                    <ActivityIndicator color={BRAND_TEAL} size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="sunny-outline" size={18} color={BRAND_TEAL} />
                                        <View style={styles.permissionActionCopy}>
                                            <Text style={styles.permissionActionButtonText}>
                                                {status?.MORNING?.status === 'PERMISSION'
                                                    ? t('attendance.requestPermission.morningSubmitted')
                                                    : t('attendance.requestPermission.morningAction')}
                                            </Text>
                                            <Text style={styles.permissionActionButtonHint}>
                                                {t('attendance.requestPermission.sessionHintTap')}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.permissionActionButton,
                                    (status?.AFTERNOON || permissionProcessingSession !== null) && styles.permissionActionButtonDisabled
                                ]}
                                onPress={() => openPermissionRequest('AFTERNOON')}
                                disabled={!!status?.AFTERNOON || permissionProcessingSession !== null}
                            >
                                {permissionProcessingSession === 'AFTERNOON' ? (
                                    <ActivityIndicator color={BRAND_TEAL} size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="partly-sunny-outline" size={18} color={BRAND_TEAL} />
                                        <View style={styles.permissionActionCopy}>
                                            <Text style={styles.permissionActionButtonText}>
                                                {status?.AFTERNOON?.status === 'PERMISSION'
                                                    ? t('attendance.requestPermission.afternoonSubmitted')
                                                    : t('attendance.requestPermission.afternoonAction')}
                                            </Text>
                                            <Text style={styles.permissionActionButtonHint}>
                                                {t('attendance.requestPermission.sessionHintTap')}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View style={styles.reportActionCard}>
                        <View style={styles.reportIconBg}>
                            <Ionicons name="bar-chart" size={22} color={BRAND_TEAL} />
                        </View>
                        <View style={styles.reportTextContainer}>
                            <Text style={styles.reportTitle}>{t('attendance.reports.summary')}</Text>
                            <Text style={styles.reportSubtitle}>{t('attendance.reports.subtitle')}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.viewReportButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                navigation.navigate('AttendanceReport' as never);
                            }}
                        >
                            <Text style={styles.viewReportText}>{t('common.view')}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={styles.infoCard}>
                        <Ionicons name="shield-checkmark-outline" size={22} color={BRAND_TEAL} />
                        <Text style={styles.infoText}>
                            {t('attendance.geofencingActive')}
                        </Text>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>

            <Modal
                visible={permissionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPermissionModalVisible(false)}
            >
                <View style={styles.permissionModalBackdrop}>
                    <View style={styles.permissionModalCard}>
                        <View style={styles.permissionModalHeader}>
                            <View style={styles.permissionModalHeaderIcon}>
                                <Ionicons name="document-text-outline" size={20} color={INDIGO_TEXT} />
                            </View>
                            <View style={styles.permissionModalHeaderTextWrap}>
                                <Text style={styles.permissionModalTitle}>{t('attendance.requestPermission.title')}</Text>
                                <Text style={styles.permissionModalSubtitle}>
                                    {t('attendance.requestPermission.subtitle')}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.permissionSessionLabel}>{t('attendance.requestPermission.selectSession')}</Text>
                        <View style={styles.permissionSessionSelector}>
                            {(['MORNING', 'AFTERNOON'] as const).map((sessionOption) => (
                                <TouchableOpacity
                                    key={sessionOption}
                                    style={[
                                        styles.permissionSessionChip,
                                        permissionSession === sessionOption && styles.permissionSessionChipActive
                                    ]}
                                    onPress={() => setPermissionSession(sessionOption)}
                                    disabled={permissionProcessingSession !== null}
                                >
                                    <Ionicons
                                        name={sessionOption === 'MORNING' ? 'sunny-outline' : 'partly-sunny-outline'}
                                        size={14}
                                        color={permissionSession === sessionOption ? '#6D28D9' : '#64748B'}
                                    />
                                    <Text
                                        style={[
                                            styles.permissionSessionChipText,
                                            permissionSession === sessionOption && styles.permissionSessionChipTextActive
                                        ]}
                                    >
                                        {sessionOption === 'MORNING' ? t('attendance.morning') : t('attendance.afternoon')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.permissionModalHintRow}>
                            <Ionicons name="shield-checkmark-outline" size={14} color="#7C3AED" />
                            <Text style={styles.permissionModalHintText}>{t('attendance.requestPermission.noGps')}</Text>
                        </View>

                        <TextInput
                            value={permissionReason}
                            onChangeText={setPermissionReason}
                            placeholder={t('attendance.requestPermission.reasonPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            style={styles.permissionReasonInput}
                            textAlignVertical="top"
                            editable={permissionProcessingSession === null}
                        />
                        <View style={styles.permissionInputFooter}>
                            <Text style={styles.permissionInputHelper}>{t('attendance.requestPermission.clearProfessional')}</Text>
                            <Text style={styles.permissionReasonCount}>{permissionReason.trim().length}/500</Text>
                        </View>

                        <View style={styles.permissionModalActions}>
                            <TouchableOpacity
                                style={styles.permissionModalCancelButton}
                                onPress={() => setPermissionModalVisible(false)}
                                disabled={permissionProcessingSession !== null}
                            >
                                <Text style={styles.permissionModalCancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.permissionModalSubmitButton,
                                    permissionProcessingSession !== null && styles.permissionModalSubmitButtonDisabled
                                ]}
                                onPress={submitPermissionRequest}
                                disabled={permissionProcessingSession !== null}
                            >
                                <LinearGradient
                                    colors={
                                        permissionProcessingSession !== null
                                            ? ['#94A3B8', '#64748B']
                                            : [BRAND_TEAL, BRAND_TEAL_DARK]
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.permissionModalSubmitGradient}
                                >
                                    {permissionProcessingSession !== null ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                                            <Text style={styles.permissionModalSubmitText}>{t('attendance.requestPermission.submit')}</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PAGE_BG },
    safeArea: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    navIconButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: SURFACE,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: TEXT_PRIMARY,
        letterSpacing: 0.15,
        textAlign: 'center',
    },
    navTitleWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    locationHeroCard: {
        marginTop: 4,
        marginBottom: 20,
        borderRadius: 20,
        backgroundColor: SURFACE,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 4,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
    },
    locationHeroContent: {
        padding: 20,
    },
    locationHeroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationIconPulseWrapper: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: BRAND_TEAL_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: BRAND_TEAL_MUTED,
    },
    locationStatusPulse: {
        position: 'absolute',
        top: -3,
        right: -3,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: SURFACE,
    },
    locationHeroTextWrap: {
        flex: 1,
        marginLeft: 16,
    },
    locationHeroTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_MUTED,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    locationHeroSubtitle: {
        fontSize: 17,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        marginTop: 2,
    },
    locationRefreshIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
    },
    locationCoordsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 6,
    },
    locationCoordsText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 0.5,
    },

    weeklyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 22,
        paddingHorizontal: 2,
    },
    dayColPill: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
        minWidth: 42,
        borderRadius: 14,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
        gap: 6,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    todayPill: {
        backgroundColor: SURFACE,
        borderWidth: 2,
        borderColor: BRAND_TEAL,
        shadowOpacity: 0,
        elevation: 0,
    },
    pastPill: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
        elevation: 0,
        shadowOpacity: 0,
    },
    dayDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayDotInner: {
        backgroundColor: BRAND_TEAL_SOFT,
        borderWidth: 1,
        borderColor: BRAND_TEAL_MUTED,
    },
    pastDotInner: {
        backgroundColor: '#10B981',
    },
    dayLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '700',
    },
    todayLabel: {
        color: BRAND_TEAL,
    },
    pastLabel: {
        color: '#94A3B8',
    },
    teachingDayPill: {
        borderColor: '#86EFAC',
        backgroundColor: '#F0FDF4',
    },
    teachingDayLabel: {
        color: '#065F46',
    },
    teachingDayDot: {
        backgroundColor: '#10B981',
    },
    syncErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    syncErrorBannerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#991B1B',
        lineHeight: 18,
    },
    syncErrorRetryBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    syncErrorRetryText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#B91C1C',
    },
    timetableBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    timetableBannerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#92400E',
        lineHeight: 24,
    },
    timetableSessionHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 8,
        marginBottom: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    timetableSessionHintText: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: '600',
        color: '#92400E',
        lineHeight: 22,
    },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    sessionCard: {
        backgroundColor: SURFACE,
        borderRadius: 22,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
    },
    currentSessionCard: {
        borderWidth: 1.5,
        borderColor: BRAND_TEAL_MUTED,
        shadowColor: BRAND_TEAL,
        shadowOpacity: 0.08,
    },
    completedSessionCard: {
        opacity: 0.85,
        backgroundColor: '#F8FAFC',
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sessionIconBg: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sessionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        letterSpacing: 0.2,
        textTransform: 'capitalize',
    },
    sessionTimeWindow: {
        fontSize: 12.5,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 6,
    },
    completedBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#047857',
        letterSpacing: 0.4,
    },
    permissionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 6,
    },
    permissionBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6D28D9',
        letterSpacing: 0.5,
    },
    currentBadge: {
        backgroundColor: BRAND_TEAL_SOFT,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BRAND_TEAL_MUTED,
    },
    currentBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: BRAND_TEAL,
        letterSpacing: 0.6,
    },

    timeInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
        backgroundColor: '#F8FAFC',
        padding: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    timeBox: {
        flex: 1,
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    timeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    timeLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    timeValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#CBD5E1',
        fontVariant: ['tabular-nums'],
    },
    activeTimeValue: {
        color: '#1E293B',
    },
    timeSeparatorWrapper: {
        paddingHorizontal: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionNote: {
        fontSize: 12,
        color: '#7C3AED',
        marginBottom: 16,
        fontWeight: '600',
    },

    sessionBtnContainer: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: BRAND_TEAL,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    sessionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    btnInactive: {
        opacity: 0.5,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    sessionUnavailableBox: {
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    sessionUnavailableText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    sessionBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },

    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        backgroundColor: SURFACE,
        marginTop: 4,
        gap: 14,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: TEXT_MUTED,
        lineHeight: 17,
        fontWeight: '500',
    },
    reportActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
        backgroundColor: SURFACE,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    reportIconBg: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: BRAND_TEAL_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    reportTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    reportSubtitle: {
        fontSize: 13,
        color: TEXT_MUTED,
        marginTop: 4,
        fontWeight: '500',
    },
    viewReportButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: BRAND_TEAL,
    },
    viewReportText: {
        color: BRAND_TEAL,
        fontSize: 13,
        fontWeight: '700',
    },
    permissionRequestCard: {
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.15)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 3,
    },
    permissionHero: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(226, 232, 240, 0.6)',
    },
    permissionRequestHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    permissionRequestIconBg: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    permissionRequestTextWrap: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    permissionRequestTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.3,
        lineHeight: 22,
    },
    permissionRequestSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 6,
        fontWeight: '500',
        lineHeight: 20,
    },
    permissionFeatureRow: {
        paddingTop: 18,
        gap: 10,
        paddingRight: 20,
    },
    permissionFeaturePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    permissionFeatureText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5',
    },
    permissionActionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 20,
        gap: 12,
        backgroundColor: '#FFFFFF',
    },
    permissionActionButton: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 64,
        gap: 12,
    },
    permissionActionButtonDisabled: {
        opacity: 0.55,
    },
    permissionActionCopy: {
        flex: 1,
    },
    permissionActionButtonText: {
        color: '#1E293B',
        fontSize: 14,
        fontWeight: '700',
    },
    permissionActionButtonHint: {
        marginTop: 2,
        color: '#64748B',
        fontSize: 11,
        fontWeight: '500',
    },
    permissionModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    permissionModalCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadows.lg,
    },
    permissionModalHeader: {
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: INDIGO_SURFACE,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
        marginBottom: 4,
    },
    permissionModalHeaderIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: SURFACE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
    },
    permissionModalHeaderTextWrap: {
        flex: 1,
        marginLeft: 12,
    },
    permissionModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    permissionModalSubtitle: {
        marginTop: 4,
        fontSize: 12.5,
        color: '#64748B',
        lineHeight: 17,
    },
    permissionSessionLabel: {
        marginTop: 14,
        marginBottom: 8,
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    permissionSessionSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    permissionSessionChip: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#F8FAFC',
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    permissionSessionChipActive: {
        borderColor: '#C4B5FD',
        backgroundColor: '#F3E8FF',
    },
    permissionSessionChipText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '700',
    },
    permissionSessionChipTextActive: {
        color: '#6D28D9',
    },
    permissionModalHintRow: {
        marginTop: 10,
        borderRadius: 10,
        backgroundColor: '#F5F3FF',
        borderWidth: 1,
        borderColor: '#DDD6FE',
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    permissionModalHintText: {
        flex: 1,
        fontSize: 11.5,
        color: '#6D28D9',
        fontWeight: '600',
    },
    permissionReasonInput: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 108,
        fontSize: 14,
        color: '#0F172A',
        backgroundColor: '#F8FAFC',
    },
    permissionInputFooter: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    permissionInputHelper: {
        flex: 1,
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
    },
    permissionReasonCount: {
        fontSize: 11.5,
        color: BRAND_TEAL,
        fontWeight: '700',
    },
    permissionModalActions: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 10,
    },
    permissionModalCancelButton: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionModalCancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    permissionModalSubmitButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 46,
    },
    permissionModalSubmitButtonDisabled: {
        opacity: 0.6,
    },
    permissionModalSubmitGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    permissionModalSubmitText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
});

export default AttendanceCheckInScreen;
