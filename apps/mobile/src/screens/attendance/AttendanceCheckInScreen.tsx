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
import { Colors, ColorScale, Typography, Spacing, BorderRadius, Shadows } from '@/config';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Haptics } from '@/services/haptics';
import { attendanceService, NOT_ON_TIMETABLE_CODE, REQUEST_TIMEOUT_CODE } from '@/services/attendance';
import { useThemeContext } from '@/contexts';

/** Enterprise-friendly palette: teal accent (brand). Neutral surfaces come from theme tokens. */
const BRAND_TEAL = Colors.brand;
const BRAND_TEAL_DARK = '#00B8DB';
const BRAND_TEAL_SOFT = '#E0FFFE';
// Duplicates ColorScale.teal[200] exactly — reuse the real token instead of a redundant local hex.
const BRAND_TEAL_MUTED = ColorScale.teal[200];

const WEEKLY_ENUM_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

const WeeklyStrip = ({
    weeklyPattern,
    styles,
}: {
    weeklyPattern?: Record<
        string,
        { morning: boolean; afternoon: boolean } | undefined
    >;
    styles: ReturnType<typeof createStyles>;
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
                                <Ionicons name="school-outline" size={11} color={Colors.white} />
                            ) : isPast ? (
                                <Ionicons name="checkmark" size={12} color={Colors.white} />
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
    styles,
    colors,
    isDark,
}: {
    session: 'MORNING' | 'AFTERNOON';
    data: any;
    onAction: (type: 'in' | 'out', session: 'MORNING' | 'AFTERNOON') => void;
    processing: boolean;
    isCurrent: boolean;
    availability: 'past' | 'current' | 'upcoming';
    timetableBlocked?: boolean;
    timetableBlockedHint?: string;
    styles: ReturnType<typeof createStyles>;
    colors: ReturnType<typeof useThemeContext>['colors'];
    isDark: boolean;
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
                <View style={[styles.sessionIconBg, { backgroundColor: isCurrent ? (isDark ? 'rgba(15,118,110,0.22)' : BRAND_TEAL_SOFT) : colors.surfaceVariant }]}>
                    <Ionicons
                        name={session === 'MORNING' ? "sunny" : "partly-sunny"}
                        size={22}
                        color={isCurrent ? BRAND_TEAL : colors.textSecondary}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
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
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
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
                            color={colors.textSecondary}
                        />
                        <Text style={styles.timeLabel}>{isPermission ? t('attendance.requestedAt') : t('attendance.checkIn')}</Text>
                    </View>
                    <Text style={[styles.timeValue, isCheckedIn && styles.activeTimeValue]}>
                        {data?.timeIn ? new Date(data.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                </View>
                <View style={styles.timeSeparatorWrapper}>
                    <Ionicons name="arrow-forward" size={16} color={colors.border} />
                </View>
                <View style={styles.timeBox}>
                    <View style={styles.timeLabelRow}>
                        <Ionicons
                            name={isPermission ? 'globe-outline' : 'log-out-outline'}
                            size={14}
                            color={colors.textSecondary}
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
                    <Ionicons name="calendar-outline" size={16} color={isDark ? "#FBBF24" : "#B45309"} />
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
                        color={colors.textSecondary}
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
                            <ActivityIndicator color={Colors.white} size="small" />
                        ) : (
                            <>
                                <Ionicons name={isOnDuty ? "log-out-outline" : "finger-print"} size={22} color={Colors.white} />
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
    const user = useAuthStore(s => s.user);
    const { colors, isDark } = useThemeContext();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
                <ActivityIndicator size="large" color={BRAND_TEAL} />
                <Text style={[styles.loadingText, { color: BRAND_TEAL }]}>{t('attendance.syncing')}</Text>
            </View>
        );
    }

    if (!isLinkedToSchool) {
        return (
            <View style={styles.container}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
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
                    <View style={[styles.centerContainer, { paddingHorizontal: Spacing.xl }]}>
                        <View style={styles.sessionIconBg}>
                            <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
                        </View>
                        <Text style={[{ fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold }, { marginTop: Spacing[5], textAlign: 'center', color: colors.text }]}>{t('attendance.notLinked')}</Text>
                        <Text style={[styles.infoText, { textAlign: 'center', marginTop: Spacing[3], fontSize: Typography.fontSize.sm, color: colors.textSecondary }]}>
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
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
                                        { backgroundColor: locationPermGranted ? colors.success : colors.error }
                                    ]} />
                                </View>
                                <View style={styles.locationHeroTextWrap}>
                                    <Text style={styles.locationHeroTitle}>{t('attendance.gpsLocation')}</Text>
                                    <Text style={styles.locationHeroSubtitle}>{gpsText}</Text>
                                </View>
                                <View style={styles.locationRefreshIconBg}>
                                    <Ionicons name="refresh" size={20} color={colors.textSecondary} />
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
                            <Ionicons name="cloud-offline-outline" size={20} color={isDark ? colors.error : "#B91C1C"} />
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
                            <Ionicons name="calendar-outline" size={18} color={isDark ? "#FBBF24" : "#B45309"} />
                            <Text style={styles.timetableBannerText}>
                                {t('attendance.timetable.nonTeachingDay')}
                            </Text>
                        </View>
                    )}

                    <Animated.View>
                        <WeeklyStrip weeklyPattern={sch?.weeklyPattern} styles={styles} />
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
                        styles={styles}
                        colors={colors}
                        isDark={isDark}
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
                        styles={styles}
                        colors={colors}
                        isDark={isDark}
                    />

                    <Animated.View style={styles.permissionRequestCard}>
                        <LinearGradient
                            colors={isDark ? ['#16181C', '#0B0D0F'] : ['#F8FAFC', '#FFFFFF']}
                            style={styles.permissionHero}
                        >
                            <View style={styles.permissionRequestHeader}>
                                <View style={styles.permissionRequestIconBg}>
                                    <Ionicons name="document-text" size={24} color={isDark ? "#A5B4FC" : Colors.secondary} />
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
                                    <Ionicons name="globe-outline" size={14} color={isDark ? "#A5B4FC" : Colors.secondary} />
                                    <Text style={styles.permissionFeatureText}>{t('attendance.requestPermission.anywhere')}</Text>
                                </View>
                                <View style={styles.permissionFeaturePill}>
                                    <Ionicons name="location-outline" size={14} color={isDark ? "#A5B4FC" : Colors.secondary} />
                                    <Text style={styles.permissionFeatureText}>{t('attendance.requestPermission.noGps')}</Text>
                                </View>
                                <View style={styles.permissionFeaturePill}>
                                    <Ionicons name="flash-outline" size={14} color={isDark ? "#A5B4FC" : Colors.secondary} />
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
                                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
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
                                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
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
                                <Ionicons name="document-text-outline" size={20} color={isDark ? '#A5B4FC' : '#3730A3'} />
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
                                        color={permissionSession === sessionOption ? '#6D28D9' : colors.textSecondary}
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
                            placeholderTextColor={colors.textSecondary}
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
                                            ? [colors.buttonDisabled, colors.buttonDisabled]
                                            : [BRAND_TEAL, BRAND_TEAL_DARK]
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.permissionModalSubmitGradient}
                                >
                                    {permissionProcessingSession !== null ? (
                                        <ActivityIndicator color={Colors.white} size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
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

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: Spacing.md, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, letterSpacing: 0.5 },

    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing[5],
        paddingVertical: Spacing.md,
    },
    navIconButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.xl,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
        shadowColor: isDark ? 'transparent' : '#0F172A',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        fontSize: Typography.fontSize[17],
        fontWeight: Typography.fontWeight.bold,
        color: colors.text,
        letterSpacing: 0.15,
        textAlign: 'center',
    },
    navTitleWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.sm,
    },
    headerSubtitle: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.xs,
        color: colors.textSecondary,
        fontWeight: Typography.fontWeight.medium,
        letterSpacing: 0.1,
    },
    locationHeroCard: {
        marginTop: Spacing.xs,
        marginBottom: Spacing[5],
        borderRadius: BorderRadius[20],
        backgroundColor: colors.card,
        ...Shadows.xl,
        shadowColor: isDark ? 'transparent' : '#0F172A',
        borderWidth: 1,
        borderColor: colors.border,
    },
    locationHeroContent: {
        padding: Spacing[5],
    },
    locationHeroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationIconPulseWrapper: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.xl,
        backgroundColor: isDark ? 'rgba(15,118,110,0.2)' : BRAND_TEAL_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(153,246,228,0.35)' : BRAND_TEAL_MUTED,
    },
    locationStatusPulse: {
        position: 'absolute',
        top: -3,
        right: -3,
        width: 14,
        height: 14,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderColor: colors.card,
    },
    locationHeroTextWrap: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    locationHeroTitle: {
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.bold,
        color: colors.textSecondary,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    locationHeroSubtitle: {
        fontSize: Typography.fontSize[17],
        fontWeight: Typography.fontWeight.extrabold,
        color: colors.text,
        marginTop: Spacing.xs,
    },
    locationRefreshIconBg: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.lg,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    locationCoordsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: Spacing.sm,
    },
    locationCoordsText: {
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.semibold,
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },

    weeklyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.xs,
    },
    dayColPill: {
        alignItems: 'center',
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing.sm,
        minWidth: 42,
        borderRadius: BorderRadius.xl,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        gap: Spacing.sm,
        ...Shadows.sm,
        shadowColor: isDark ? 'transparent' : '#0F172A',
    },
    todayPill: {
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: BRAND_TEAL,
        shadowOpacity: 0,
        elevation: 0,
    },
    pastPill: {
        backgroundColor: colors.surfaceVariant,
        borderColor: colors.border,
        elevation: 0,
        shadowOpacity: 0,
    },
    dayDot: {
        width: 24,
        height: 24,
        borderRadius: BorderRadius.lg,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayDotInner: {
        backgroundColor: isDark ? 'rgba(15,118,110,0.2)' : BRAND_TEAL_SOFT,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(153,246,228,0.35)' : BRAND_TEAL_MUTED,
    },
    pastDotInner: {
        backgroundColor: colors.success,
    },
    dayLabel: {
        fontSize: Typography.fontSize[11],
        color: colors.textSecondary,
        fontWeight: Typography.fontWeight.bold,
    },
    todayLabel: {
        color: BRAND_TEAL,
    },
    pastLabel: {
        color: colors.textSecondary,
    },
    teachingDayPill: {
        borderColor: isDark ? 'rgba(134,239,172,0.35)' : '#86EFAC',
        backgroundColor: isDark ? 'rgba(5,150,105,0.16)' : '#F0FDF4',
    },
    teachingDayLabel: {
        color: isDark ? '#6EE7B7' : '#065F46',
    },
    teachingDayDot: {
        backgroundColor: colors.success,
    },
    syncErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[3],
        marginBottom: Spacing.md,
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.xl,
        backgroundColor: isDark ? 'rgba(220,38,38,0.14)' : '#FEF2F2',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(220,38,38,0.32)' : '#FECACA',
    },
    syncErrorBannerText: {
        flex: 1,
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.semibold,
        color: isDark ? colors.error : '#991B1B',
        lineHeight: 18,
    },
    syncErrorRetryBtn: {
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(220,38,38,0.4)' : '#FCA5A5',
    },
    syncErrorRetryText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        color: isDark ? colors.error : '#B91C1C',
    },
    timetableBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[3],
        marginBottom: Spacing.md,
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.xl,
        backgroundColor: isDark ? 'rgba(180,83,9,0.18)' : '#FFFBEB',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(253,230,138,0.3)' : '#FDE68A',
    },
    timetableBannerText: {
        flex: 1,
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.semibold,
        color: isDark ? '#FBBF24' : '#92400E',
        lineHeight: 24,
    },
    timetableSessionHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing[3],
        borderRadius: BorderRadius.xl,
        backgroundColor: isDark ? 'rgba(180,83,9,0.18)' : '#FFFBEB',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(253,230,138,0.3)' : '#FDE68A',
    },
    timetableSessionHintText: {
        flex: 1,
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.semibold,
        color: isDark ? '#FBBF24' : '#92400E',
        lineHeight: 22,
    },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing[5], paddingBottom: Spacing[10] },

    sessionCard: {
        backgroundColor: colors.card,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing[5],
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...Shadows.lg,
        shadowColor: isDark ? 'transparent' : '#0F172A',
    },
    currentSessionCard: {
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(153,246,228,0.35)' : BRAND_TEAL_MUTED,
        shadowColor: BRAND_TEAL,
        shadowOpacity: 0.08,
    },
    completedSessionCard: {
        opacity: 0.85,
        backgroundColor: colors.surfaceVariant,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing[5],
    },
    sessionIconBg: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sessionTitle: {
        fontSize: Typography.fontSize[16],
        fontWeight: Typography.fontWeight.extrabold,
        color: colors.text,
        letterSpacing: 0.2,
        textTransform: 'capitalize',
    },
    sessionTimeWindow: {
        fontSize: Typography.fontSize[13],
        color: colors.textSecondary,
        marginTop: Spacing.xs,
        fontWeight: Typography.fontWeight.semibold,
        letterSpacing: 0.3,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(5,150,105,0.18)' : '#ECFDF5',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.xl,
        gap: Spacing.sm,
    },
    completedBadgeText: {
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.extrabold,
        color: isDark ? '#34D399' : '#047857',
        letterSpacing: 0.4,
    },
    permissionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#F3E8FF',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.xl,
        gap: Spacing.sm,
    },
    permissionBadgeText: {
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.extrabold,
        color: isDark ? '#C4B5FD' : '#6D28D9',
        letterSpacing: 0.5,
    },
    currentBadge: {
        backgroundColor: isDark ? 'rgba(15,118,110,0.2)' : BRAND_TEAL_SOFT,
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(153,246,228,0.35)' : BRAND_TEAL_MUTED,
    },
    currentBadgeText: {
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.extrabold,
        color: BRAND_TEAL,
        letterSpacing: 0.6,
    },

    timeInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing[5],
        backgroundColor: colors.surfaceVariant,
        padding: Spacing.sm,
        borderRadius: BorderRadius[20],
        borderWidth: 1,
        borderColor: colors.border,
    },
    timeBox: {
        flex: 1,
        alignItems: 'flex-start',
        backgroundColor: colors.card,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
        shadowColor: isDark ? 'transparent' : '#0F172A',
    },
    timeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    timeLabel: {
        fontSize: Typography.fontSize[11],
        color: colors.textSecondary,
        fontWeight: Typography.fontWeight.bold,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    timeValue: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: colors.border,
        fontVariant: ['tabular-nums'],
    },
    activeTimeValue: {
        color: colors.text,
    },
    timeSeparatorWrapper: {
        paddingHorizontal: Spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionNote: {
        fontSize: Typography.fontSize.xs,
        color: '#7C3AED',
        marginBottom: Spacing.md,
        fontWeight: Typography.fontWeight.semibold,
    },

    sessionBtnContainer: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.lg,
        shadowColor: BRAND_TEAL,
        shadowOpacity: 0.12,
    },
    sessionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing[3],
    },
    btnInactive: {
        opacity: 0.5,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    sessionUnavailableBox: {
        minHeight: 52,
        borderRadius: BorderRadius.xl,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing[3],
    },
    sessionUnavailableText: {
        color: colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.2,
    },
    sessionBtnText: {
        color: Colors.white,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.3,
    },

    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
        backgroundColor: colors.card,
        marginTop: Spacing.xs,
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...Shadows.sm,
        shadowColor: isDark ? 'transparent' : '#0F172A',
    },
    infoText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: colors.textSecondary,
        lineHeight: 17,
        fontWeight: Typography.fontWeight.medium,
    },
    reportActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        ...Shadows.lg,
        shadowColor: isDark ? 'transparent' : '#0F172A',
    },
    reportIconBg: {
        width: 46,
        height: 46,
        borderRadius: BorderRadius.lg,
        backgroundColor: isDark ? 'rgba(15,118,110,0.2)' : BRAND_TEAL_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportTextContainer: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    reportTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: colors.text,
    },
    reportSubtitle: {
        fontSize: Typography.fontSize[13],
        color: colors.textSecondary,
        marginTop: Spacing.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    viewReportButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing[3],
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: BRAND_TEAL,
    },
    viewReportText: {
        color: BRAND_TEAL,
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.bold,
    },
    permissionRequestCard: {
        borderRadius: BorderRadius['2xl'],
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.15)',
        backgroundColor: colors.card,
        overflow: 'hidden',
        ...Shadows.xl,
        shadowColor: '#4F46E5',
        shadowOpacity: 0.06,
    },
    permissionHero: {
        paddingHorizontal: Spacing[5],
        paddingTop: Spacing[5],
        paddingBottom: Spacing[5],
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
        borderRadius: BorderRadius.xl,
        backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(224,231,255,0.25)' : '#E0E7FF',
    },
    permissionRequestTextWrap: {
        flex: 1,
        marginLeft: Spacing.md,
        justifyContent: 'center',
    },
    permissionRequestTitle: {
        fontSize: Typography.fontSize[17],
        fontWeight: Typography.fontWeight.extrabold,
        color: colors.text,
        letterSpacing: -0.3,
        lineHeight: 22,
    },
    permissionRequestSubtitle: {
        fontSize: Typography.fontSize[13],
        color: colors.textSecondary,
        marginTop: Spacing.sm,
        fontWeight: Typography.fontWeight.medium,
        lineHeight: 20,
    },
    permissionFeatureRow: {
        paddingTop: Spacing[5],
        gap: Spacing[3],
        paddingRight: Spacing[5],
    },
    permissionFeaturePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: colors.card,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        ...Shadows.sm,
    },
    permissionFeatureText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: isDark ? '#A5B4FC' : '#4F46E5',
    },
    permissionActionRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing[5],
        paddingBottom: Spacing[5],
        paddingTop: Spacing[5],
        gap: Spacing[3],
        backgroundColor: colors.card,
    },
    permissionActionButton: {
        flex: 1,
        backgroundColor: colors.surfaceVariant,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 64,
        gap: Spacing[3],
    },
    permissionActionButtonDisabled: {
        opacity: 0.55,
    },
    permissionActionCopy: {
        flex: 1,
    },
    permissionActionButtonText: {
        color: colors.text,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    permissionActionButtonHint: {
        marginTop: Spacing.xs,
        color: colors.textSecondary,
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.medium,
    },
    permissionModalBackdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        paddingHorizontal: Spacing[5],
    },
    permissionModalCard: {
        backgroundColor: colors.card,
        borderRadius: BorderRadius[20],
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...Shadows.lg,
    },
    permissionModalHeader: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(99,102,241,0.16)' : '#EEF2FF',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: Spacing.xs,
    },
    permissionModalHeaderIcon: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.lg,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    permissionModalHeaderTextWrap: {
        flex: 1,
        marginLeft: Spacing[3],
    },
    permissionModalTitle: {
        fontSize: Typography.fontSize[16],
        fontWeight: Typography.fontWeight.bold,
        color: colors.text,
    },
    permissionModalSubtitle: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize[13],
        color: colors.textSecondary,
        lineHeight: 17,
    },
    permissionSessionLabel: {
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    permissionSessionSelector: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    permissionSessionChip: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceVariant,
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    permissionSessionChipActive: {
        borderColor: isDark ? 'rgba(196,181,253,0.4)' : '#C4B5FD',
        backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#F3E8FF',
    },
    permissionSessionChipText: {
        fontSize: Typography.fontSize[13],
        color: colors.textSecondary,
        fontWeight: Typography.fontWeight.bold,
    },
    permissionSessionChipTextActive: {
        color: isDark ? '#C4B5FD' : '#6D28D9',
    },
    permissionModalHintRow: {
        marginTop: Spacing[3],
        borderRadius: BorderRadius.lg,
        backgroundColor: isDark ? 'rgba(124,58,237,0.16)' : '#F5F3FF',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(221,214,254,0.25)' : '#DDD6FE',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    permissionModalHintText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: isDark ? '#C4B5FD' : '#6D28D9',
        fontWeight: Typography.fontWeight.semibold,
    },
    permissionReasonInput: {
        marginTop: Spacing[3],
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[3],
        minHeight: 108,
        fontSize: Typography.fontSize.sm,
        color: colors.text,
        backgroundColor: colors.surfaceVariant,
    },
    permissionInputFooter: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    permissionInputHelper: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: colors.textSecondary,
        fontWeight: Typography.fontWeight.medium,
    },
    permissionReasonCount: {
        fontSize: Typography.fontSize.xs,
        color: BRAND_TEAL,
        fontWeight: Typography.fontWeight.bold,
    },
    permissionModalActions: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        gap: Spacing[3],
    },
    permissionModalCancelButton: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: Spacing[3],
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionModalCancelText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: colors.textSecondary,
    },
    permissionModalSubmitButton: {
        flex: 1,
        borderRadius: BorderRadius.lg,
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
        gap: Spacing.sm,
    },
    permissionModalSubmitText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
});

export default AttendanceCheckInScreen;
