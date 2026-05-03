import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Dimensions,
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
import { useAuthStore } from '@/stores';
import { Colors, Typography, Shadows } from '@/config';
import { useNavigation } from '@react-navigation/native';

import { Haptics } from '@/services/haptics';
import { attendanceService } from '@/services/attendance';

const { width } = Dimensions.get('window');

const BRAND_TEAL = '#09CFF7';
const BRAND_TEAL_DARK = '#00B8DB';
const BRAND_YELLOW = '#FFA600';
const BRAND_YELLOW_DARK = '#FF8C00';

const WeeklyStrip = () => {
    const { t } = useTranslation();
    const days = [t('attendance.days.mon'), t('attendance.days.tue'), t('attendance.days.wed'), t('attendance.days.thu'), t('attendance.days.fri'), t('attendance.days.sat'), t('attendance.days.sun')];
    const today = new Date().getDay();
    const currentDayIdx = today === 0 ? 6 : today - 1;

    return (
        <View style={styles.weeklyContainer}>
            {days.map((day, i) => {
                const isToday = i === currentDayIdx;
                const isPast = i < currentDayIdx;
                return (
                    <View
                        key={day}
                        style={[
                            styles.dayColPill,
                            isToday && styles.todayPill,
                            isPast && styles.pastPill
                        ]}
                    >
                        <Text style={[
                            styles.dayLabel,
                            isToday && styles.todayLabel,
                            isPast && styles.pastLabel
                        ]}>{day}</Text>
                        <View style={[
                            styles.dayDot,
                            isToday && styles.todayDotInner,
                            isPast && styles.pastDotInner
                        ]}>
                            {isPast && <Ionicons name="checkmark" size={12} color="#fff" />}
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
    availability
}: {
    session: 'MORNING' | 'AFTERNOON';
    data: any;
    onAction: (type: 'in' | 'out', session: 'MORNING' | 'AFTERNOON') => void;
    processing: boolean;
    isCurrent: boolean;
    availability: 'past' | 'current' | 'upcoming';
}) => {
    const { t } = useTranslation();
    const isPermission = data?.status === 'PERMISSION';
    const isCheckedIn = !!data?.timeIn;
    const isCheckedOut = !!data?.timeOut;
    const isOnDuty = isCheckedIn && !isCheckedOut && !isPermission;
    const isActionUnavailable = availability !== 'current' && !isCheckedIn;

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
                <View style={[styles.sessionIconBg, { backgroundColor: isCurrent ? '#F0FDFA' : '#F1F5F9' }]}>
                    <Ionicons
                        name={session === 'MORNING' ? "sunny" : "partly-sunny"}
                        size={22}
                        color={isCurrent ? BRAND_TEAL : '#6B7280'}
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
                            size={13}
                            color="#64748B"
                        />
                        <Text style={styles.timeLabel}>{isPermission ? t('attendance.requestedAt') : t('attendance.checkIn')}</Text>
                    </View>
                    <Text style={[styles.timeValue, isCheckedIn && styles.activeTimeValue]}>
                        {data?.timeIn ? new Date(data.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                </View>
                <View style={styles.timeSeparator} />
                <View style={styles.timeBox}>
                    <View style={styles.timeLabelRow}>
                        <Ionicons
                            name={isPermission ? 'globe-outline' : 'log-out-outline'}
                            size={13}
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

            {!isCheckedOut && !isPermission && isActionUnavailable ? (
                <View style={styles.sessionUnavailableBox}>
                    <Ionicons
                        name={availability === 'past' ? 'time-outline' : 'lock-closed-outline'}
                        size={18}
                        color="#94A3B8"
                    />
                    <Text style={styles.sessionUnavailableText}>
                        {availability === 'past' ? t('attendance.sessionEnded') : t('attendance.sessionUpcoming')}
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
                        colors={isOnDuty ? ['#F43F5E', '#E11D48'] : [BRAND_TEAL, BRAND_TEAL_DARK]}
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

    const fetchTodayStatus = useCallback(async () => {
        try {
            const result = await attendanceService.getTodayStatus();
            if (result.success) {
                setStatus(result.data);
            }
        } catch (error) {
            console.log('Error fetching status:', error);
        }
    }, []);

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

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            const wasInactive = appStateRef.current.match(/inactive|background/);
            appStateRef.current = nextAppState;

            if (wasInactive && nextAppState === 'active' && openedLocationSettingsRef.current) {
                openedLocationSettingsRef.current = false;
                void fetchLocationAsync(true);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

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

        try {
            setProcessingSession(session);
            setGpsCoords(null);
            setGpsStatus('verifying');

            const location = await getCurrentLocationWithTimeout();
            const payload = { latitude: location.coords.latitude, longitude: location.coords.longitude };
            setGpsCoords(payload);

            if (type === 'in') {
                await attendanceService.checkIn(payload, session);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    t('common.success'),
                    t('attendance.alerts.checkInSuccessMessage', { session: getSessionLabel(session) })
                );
            } else {
                await attendanceService.checkOut(payload, session);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    t('common.success'),
                    t('attendance.alerts.checkOutSuccessMessage', { session: getSessionLabel(session) })
                );
            }

            await fetchTodayStatus();
            setGpsStatus('verified');
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorMessage = error?.message === 'location_timeout'
                ? t('attendance.alerts.locationFetchFailedMessage')
                : error.message || t('attendance.alerts.attendanceFailedFallback');
            Alert.alert(
                t('attendance.alerts.attendanceFailedTitle'),
                errorMessage
            );
            setGpsStatus('failed');
        } finally {
            setProcessingSession(null);
        }
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

        try {
            setPermissionProcessingSession(permissionSession);
            await attendanceService.requestPermission(permissionSession, trimmedReason);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPermissionModalVisible(false);
            setPermissionReason('');
            Alert.alert(
                t('attendance.alerts.requestSubmittedTitle'),
                t('attendance.alerts.requestSubmittedMessage', { session: getSessionLabel(permissionSession) })
            );
            await fetchTodayStatus();
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('attendance.alerts.requestFailedTitle'),
                error.message || t('attendance.alerts.requestFailedFallback')
            );
        } finally {
            setPermissionProcessingSession(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC' }]} />
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text style={[styles.loadingText, { color: '#0EA5E9' }]}>{t('attendance.syncing')}</Text>
            </View>
        );
    }

    if (!isLinkedToSchool) {
        return (
            <View style={styles.container}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC' }]} />
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#F0FDFA', '#F8FAFC']}
                style={StyleSheet.absoluteFill}
            />

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
                            fetchTodayStatus();
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
                    <View style={styles.premiumHeaderCard}>
                        <LinearGradient
                            colors={['#D7F4EE', '#EAF7F1', '#FCEED1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.headerCardContent}>
                            <View style={styles.dateInfoContainer}>
                                <Text style={styles.welcomeText}>{t('attendance.hello')}, {user?.firstName || 'User'}</Text>
                                <View style={styles.modernDateWrapper}>
                                    <View style={styles.datePill}>
                                        <Text style={styles.datePillDay}>
                                            {new Date().toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-US', { day: '2-digit' })}
                                        </Text>
                                    </View>
                                    <View style={styles.dateTextGroup}>
                                        <Text style={styles.dateTextMonth}>
                                            {new Date().toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-US', { month: 'long', year: 'numeric' })}
                                        </Text>
                                        <Text style={styles.dateTextWeekday}>
                                            {new Date().toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-US', { weekday: 'long' })}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.headerSeparator} />

                            <TouchableOpacity
                                style={styles.modernGpsContainer}
                                onPress={() => {
                                    void fetchLocationAsync(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.gpsIconCircle}>
                                    <Ionicons name="navigate" size={16} color={BRAND_TEAL} />
                                </View>
                                <View style={styles.gpsContentWrap}>
                                    <Text style={styles.gpsLabel}>{t('attendance.gpsLocation')}</Text>
                                    <Text style={styles.gpsValue} numberOfLines={1}>{gpsText}</Text>
                                    {gpsStatus === 'ready' && gpsCoords && (
                                        <Text style={styles.gpsCoordsText} numberOfLines={1}>
                                            {`${gpsCoords.latitude.toFixed(4)}, ${gpsCoords.longitude.toFixed(4)}`}
                                        </Text>
                                    )}
                                </View>
                                <View style={[
                                    styles.gpsStatusDot,
                                    { backgroundColor: locationPermGranted ? '#10B981' : '#EF4444' }
                                ]} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Animated.View>
                        <WeeklyStrip />
                    </Animated.View>

                    <SessionCard
                        session="MORNING"
                        data={status?.MORNING}
                        onAction={handleAttendance}
                        processing={processingSession === 'MORNING'}
                        isCurrent={morningAvailability === 'current'}
                        availability={morningAvailability}
                    />

                    <SessionCard
                        session="AFTERNOON"
                        data={status?.AFTERNOON}
                        onAction={handleAttendance}
                        processing={processingSession === 'AFTERNOON'}
                        isCurrent={afternoonAvailability === 'current'}
                        availability={afternoonAvailability}
                    />

                    <Animated.View style={styles.permissionRequestCard}>
                        <LinearGradient
                            colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.permissionHero}
                        >
                            <View style={styles.permissionRequestHeader}>
                                <View style={styles.permissionRequestIconBg}>
                                    <Ionicons name="document-text-outline" size={22} color="#6D28D9" />
                                </View>
                                <View style={styles.permissionRequestTextWrap}>
                                    <Text style={styles.permissionRequestTitle}>{t('attendance.requestPermission.title')}</Text>
                                    <Text style={styles.permissionRequestSubtitle}>
                                        {t('attendance.requestPermission.subtitle')}
                                    </Text>
                                </View>
                                <View style={styles.permissionAnywhereBadge}>
                                    <Ionicons name="globe-outline" size={12} color="#C4B5FD" />
                                    <Text style={styles.permissionAnywhereBadgeText}>{t('attendance.requestPermission.anywhere')}</Text>
                                </View>
                            </View>

                            <View style={styles.permissionFeatureRow}>
                                <View style={styles.permissionFeaturePill}>
                                    <Ionicons name="locate-outline" size={13} color="#DDD6FE" />
                                    <Text style={styles.permissionFeatureText}>{t('attendance.requestPermission.noGps')}</Text>
                                </View>
                                <View style={styles.permissionFeaturePill}>
                                    <Ionicons name="flash-outline" size={13} color="#DDD6FE" />
                                    <Text style={styles.permissionFeatureText}>{t('attendance.requestPermission.instant')}</Text>
                                </View>
                            </View>
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
                                    <ActivityIndicator color="#6D28D9" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="sunny-outline" size={18} color="#6D28D9" />
                                        <View style={styles.permissionActionCopy}>
                                            <Text style={styles.permissionActionButtonText}>
                                                {status?.MORNING?.status === 'PERMISSION' ? 'Morning Requested' : 'Morning Permission'}
                                            </Text>
                                            <Text style={styles.permissionActionButtonHint}><AutoI18nText i18nKey="auto.mobile.screens_attendance_AttendanceCheckInScreen.k_ddc76378" /></Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
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
                                    <ActivityIndicator color="#6D28D9" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="partly-sunny-outline" size={18} color="#6D28D9" />
                                        <View style={styles.permissionActionCopy}>
                                            <Text style={styles.permissionActionButtonText}>
                                                {status?.AFTERNOON?.status === 'PERMISSION' ? 'Afternoon Requested' : 'Afternoon Permission'}
                                            </Text>
                                            <Text style={styles.permissionActionButtonHint}><AutoI18nText i18nKey="auto.mobile.screens_attendance_AttendanceCheckInScreen.k_1e6c27d0" /></Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View style={styles.reportActionCard}>
                        <View style={styles.reportIconBg}>
                            <Ionicons name="bar-chart" size={22} color={BRAND_YELLOW} />
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
                        <Ionicons name="shield-checkmark-outline" size={24} color={BRAND_TEAL} />
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
                        <LinearGradient
                            colors={['#EDE9FE', '#F5F3FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.permissionModalHeader}
                        >
                            <View style={styles.permissionModalHeaderIcon}>
                                <Ionicons name="document-text-outline" size={20} color="#6D28D9" />
                            </View>
                            <View style={styles.permissionModalHeaderTextWrap}>
                                <Text style={styles.permissionModalTitle}>{t('attendance.requestPermission.title')}</Text>
                                <Text style={styles.permissionModalSubtitle}>
                                    {t('attendance.requestPermission.subtitle')}
                                </Text>
                            </View>
                        </LinearGradient>

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
                                    colors={permissionProcessingSession !== null ? ['#C4B5FD', '#A78BFA'] : ['#8B5CF6', '#6D28D9']}
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
    container: { flex: 1, backgroundColor: '#F8FAFC' },
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
        borderRadius: 16,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: 0.2,
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
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    premiumHeaderCard: {
        marginTop: 10,
        marginBottom: 24,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#C9DBF1',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 22,
        elevation: 10,
    },
    headerCardContent: {
        padding: 22,
    },
    dateInfoContainer: {
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 15,
        color: '#475569',
        fontWeight: '600',
        marginBottom: 12,
        letterSpacing: 0.3,
    },
    modernDateWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    datePill: {
        backgroundColor: BRAND_TEAL,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        marginRight: 16,
        ...Shadows.md,
    },
    datePillDay: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
    },
    dateTextGroup: {
        justifyContent: 'center',
    },
    dateTextMonth: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
    },
    dateTextWeekday: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    headerSeparator: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 20,
    },
    modernGpsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    gpsIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    gpsLabel: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.2,
    },
    gpsValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginTop: 1,
    },
    gpsContentWrap: {
        flex: 1,
        marginLeft: 12,
    },
    gpsCoordsText: {
        marginTop: 2,
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    gpsStatusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 12,
    },

    weeklyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    dayColPill: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        minWidth: 44,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
        ...Shadows.sm,
    },
    todayPill: {
        backgroundColor: BRAND_TEAL,
        borderColor: BRAND_TEAL,
        ...Shadows.md,
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
        backgroundColor: '#fff',
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
        color: '#fff',
    },
    pastLabel: {
        color: '#94A3B8',
    },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    sessionCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadows.lg,
    },
    currentSessionCard: {
        borderColor: BRAND_TEAL,
        borderWidth: 1.5,
        ...Shadows.lg,
    },
    completedSessionCard: {
        opacity: 0.85,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sessionIconBg: {
        width: 54,
        height: 54,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    sessionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        textTransform: 'capitalize',
    },
    sessionTimeWindow: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '600',
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
        fontSize: 11,
        fontWeight: '800',
        color: '#059669',
        letterSpacing: 0.5,
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
        backgroundColor: '#F0FDFA',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
    },
    currentBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: BRAND_TEAL_DARK,
        letterSpacing: 0.5,
    },

    timeInfoRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    timeBox: {
        flex: 1,
        alignItems: 'flex-start',
        backgroundColor: '#F8FAFC',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
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
        letterSpacing: 0.2,
    },
    timeValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#CBD5E1',
        fontVariant: ['tabular-nums'],
    },
    activeTimeValue: {
        color: '#1E293B',
    },
    timeSeparator: {
        display: 'none',
    },
    permissionNote: {
        fontSize: 12,
        color: '#7C3AED',
        marginBottom: 16,
        fontWeight: '600',
    },

    sessionBtnContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Shadows.md,
    },
    sessionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        gap: 12,
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
        padding: 20,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginTop: 8,
        gap: 16,
        ...Shadows.sm,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 18,
        fontWeight: '500',
    },
    reportActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        backgroundColor: '#FFFBEB',
        ...Shadows.md,
    },
    reportIconBg: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FDE68A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#92400E',
    },
    reportSubtitle: {
        fontSize: 13,
        color: '#B45309',
        marginTop: 4,
        fontWeight: '500',
    },
    viewReportButton: {
        backgroundColor: BRAND_YELLOW_DARK,
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 20,
        ...Shadows.sm,
    },
    viewReportText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    permissionRequestCard: {
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#DDD6FE',
        backgroundColor: '#F5F3FF',
        overflow: 'hidden',
        ...Shadows.md,
    },
    permissionHero: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    permissionRequestHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    permissionRequestIconBg: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionRequestTextWrap: {
        flex: 1,
        marginLeft: 12,
    },
    permissionRequestTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    permissionRequestSubtitle: {
        fontSize: 13,
        color: '#EDE9FE',
        marginTop: 4,
        fontWeight: '600',
        lineHeight: 18,
    },
    permissionAnywhereBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    permissionAnywhereBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EDE9FE',
    },
    permissionFeatureRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    permissionFeaturePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    permissionFeatureText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#EDE9FE',
    },
    permissionActionRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 12,
        gap: 10,
    },
    permissionActionButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#DDD6FE',
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 62,
        gap: 10,
    },
    permissionActionButtonDisabled: {
        opacity: 0.55,
    },
    permissionActionCopy: {
        flex: 1,
    },
    permissionActionButtonText: {
        color: '#5B21B6',
        fontSize: 13.5,
        fontWeight: '800',
    },
    permissionActionButtonHint: {
        marginTop: 2,
        color: '#8B5CF6',
        fontSize: 11,
        fontWeight: '600',
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
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    permissionModalHeaderIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionModalHeaderTextWrap: {
        flex: 1,
        marginLeft: 12,
    },
    permissionModalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#4C1D95',
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
        color: '#7C3AED',
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
