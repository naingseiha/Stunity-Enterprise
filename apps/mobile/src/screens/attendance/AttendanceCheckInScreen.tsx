import React, { useState, useEffect, useCallback } from 'react';
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
    TextInput
    , Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores';
import { Colors, Typography, Shadows } from '@/config';
import { useNavigation } from '@react-navigation/native';

import * as Haptics from 'expo-haptics';
import { attendanceService } from '@/services/attendance';

const { width } = Dimensions.get('window');

const BRAND_TEAL = '#09CFF7';
const BRAND_TEAL_DARK = '#00B8DB';
const BRAND_YELLOW = '#FFA600';
const BRAND_YELLOW_DARK = '#FF8C00';

const WeeklyStrip = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
    isCurrent
}: {
    session: 'MORNING' | 'AFTERNOON';
    data: any;
    onAction: (type: 'in' | 'out', session: 'MORNING' | 'AFTERNOON') => void;
    processing: boolean;
    isCurrent: boolean;
}) => {
    const isPermission = data?.status === 'PERMISSION';
    const isCheckedIn = !!data?.timeIn;
    const isCheckedOut = !!data?.timeOut;
    const isOnDuty = isCheckedIn && !isCheckedOut && !isPermission;

    const handlePress = () => {
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
                    <Text style={[styles.sessionTitle, isCurrent && { color: BRAND_TEAL }]}>{session}</Text>
                    <Text style={styles.sessionTimeWindow}>
                        {session === 'MORNING' ? '07:00 AM - 12:00 PM' : '12:00 PM - 06:00 PM'}
                    </Text>
                </View>
                {isPermission ? (
                    <View style={styles.permissionBadge}>
                        <Ionicons name="document-text-outline" size={14} color="#7C3AED" />
                        <Text style={styles.permissionBadgeText}>PERMISSION</Text>
                    </View>
                ) : isCheckedOut ? (
                    <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.completedBadgeText}>DONE</Text>
                    </View>
                ) : isCurrent && (
                    <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>ACTIVE</Text>
                    </View>
                )}
            </View>

            <View style={styles.timeInfoRow}>
                <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>{isPermission ? 'REQUESTED AT' : 'CHECK IN'}</Text>
                    <Text style={[styles.timeValue, isCheckedIn && styles.activeTimeValue]}>
                        {data?.timeIn ? new Date(data.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                </View>
                <View style={styles.timeSeparator} />
                <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>{isPermission ? 'MODE' : 'CHECK OUT'}</Text>
                    <Text style={[styles.timeValue, (isCheckedOut || isPermission) && styles.activeTimeValue]}>
                        {isPermission ? 'ONLINE' : (data?.timeOut ? new Date(data.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--')}
                    </Text>
                </View>
            </View>

            {isPermission && (
                <Text style={styles.permissionNote}>
                    Permission requested online. GPS verification is not required for this session.
                </Text>
            )}

            {!isCheckedOut && !isPermission && (
                <TouchableOpacity
                    style={[
                        styles.sessionBtnContainer,
                        !isCurrent && !isCheckedIn && styles.btnInactive,
                        processing && styles.btnDisabled
                    ]}
                    onPress={handlePress}
                    disabled={processing}
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
                                    {isOnDuty ? 'Finish Session' : `Start ${session}`}
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
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const isLinkedToSchool = !!user?.schoolId;

    const [loading, setLoading] = useState(true);
    const [processingSession, setProcessingSession] = useState<'MORNING' | 'AFTERNOON' | null>(null);
    const [status, setStatus] = useState<any>(null);
    const [locationPermGranted, setLocationPermGranted] = useState(false);
    const [gpsText, setGpsText] = useState('Initializing GPS...');
    const [permissionModalVisible, setPermissionModalVisible] = useState(false);
    const [permissionSession, setPermissionSession] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
    const [permissionReason, setPermissionReason] = useState('');
    const [permissionProcessingSession, setPermissionProcessingSession] = useState<'MORNING' | 'AFTERNOON' | null>(null);

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

    const checkPermissions = async () => {
        try {
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const req = await Promise.race([
                    Location.requestForegroundPermissionsAsync(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('perm_timeout')), 3000))
                ]) as any;
                status = req.status;
            }
            if (status !== 'granted') {
                return false;
            }
            setLocationPermGranted(true);
            return true;
        } catch (e) {
            return false;
        }
    };

    const fetchLocationAsync = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setGpsText('Updating GPS...');
            } else {
                setGpsText('Locating...');
            }

            const hasPerm = await checkPermissions();
            if (hasPerm) {
                let loc = null;

                // Fast resolve: check last known position first (with timeout)
                if (!isManualRefresh) {
                    try {
                        loc = await Promise.race([
                            Location.getLastKnownPositionAsync(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
                        ]) as Location.LocationObject | null;
                    } catch (e) {
                        loc = null;
                    }
                }

                // Fallback: try getting current position with a 4000ms timeout
                if (!loc) {
                    try {
                        const locationPromise = Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced
                        });

                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Location timeout')), 4000)
                        );

                        loc = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
                    } catch (e) {
                        loc = null;
                    }
                }

                if (loc) {
                    setGpsText(`Ready (${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)})`);
                } else {
                    setGpsText('GPS Limited');
                }
            } else {
                setGpsText('Location Access Denied');
                if (isManualRefresh) {
                    Alert.alert(
                        'Permission Required',
                        'Please enable location services in your device settings to check in.',
                        [{ text: 'OK' }]
                    );
                }
            }
        } catch (e: any) {
            setGpsText('GPS Limited');
            if (isManualRefresh) {
                Alert.alert('GPS Error', 'Could not fetch your current location. Please check your signal and try again.');
            }
        }
    };

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

    const handleAttendance = async (type: 'in' | 'out', session: 'MORNING' | 'AFTERNOON') => {
        if (!locationPermGranted) {
            Alert.alert(
                'Permission Required',
                'Your location is required to verify attendance. Please tap the GPS banner or go to your settings to enable it.'
            );
            return;
        }

        try {
            setProcessingSession(session);
            setGpsText('Verifying location...');

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const payload = { latitude: location.coords.latitude, longitude: location.coords.longitude };

            if (type === 'in') {
                await attendanceService.checkIn(payload, session);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', `Successfully checked in for ${session} session.`);
            } else {
                await attendanceService.checkOut(payload, session);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', `Successfully checked out of ${session} session.`);
            }

            await fetchTodayStatus();
            setGpsText('Location verified');
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Attendance Failed', error.message || 'An error occurred during verification.');
            setGpsText('Verification failed');
        } finally {
            setProcessingSession(null);
        }
    };

    const openPermissionRequest = (session: 'MORNING' | 'AFTERNOON') => {
        if (status?.[session]) {
            Alert.alert('Already Recorded', `${session} session already has attendance recorded today.`);
            return;
        }

        setPermissionSession(session);
        setPermissionReason('');
        setPermissionModalVisible(true);
    };

    const submitPermissionRequest = async () => {
        const trimmedReason = permissionReason.trim();
        if (!trimmedReason) {
            Alert.alert('Reason Required', 'Please enter a short reason for your permission request.');
            return;
        }

        try {
            setPermissionProcessingSession(permissionSession);
            await attendanceService.requestPermission(permissionSession, trimmedReason);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPermissionModalVisible(false);
            setPermissionReason('');
            Alert.alert('Request Submitted', `${permissionSession} permission request was submitted successfully.`);
            await fetchTodayStatus();
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Request Failed', error.message || 'Could not submit permission request.');
        } finally {
            setPermissionProcessingSession(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC' }]} />
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text style={[styles.loadingText, { color: '#0EA5E9' }]}>Syncing with enterprise server...</Text>
            </View>
        );
    }

    if (!isLinkedToSchool) {
        return (
            <View style={styles.container}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC' }]} />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.navHeader}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={20} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>ATTENDANCE</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <View style={[styles.centerContainer, { paddingHorizontal: 30 }]}>
                        <View style={styles.sessionIconBg}>
                            <Ionicons name="business-outline" size={64} color="#9CA3AF" />
                        </View>
                        <Text style={[styles.dateDisplay, { marginTop: 20, textAlign: 'center', color: '#1F2937' }]}>Not Linked to a School</Text>
                        <Text style={[styles.infoText, { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#6B7280' }]}>
                            You must be linked to a school to use the attendance feature. Please ask your administrator to invite you or provide a claim code.
                        </Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const currentHour = new Date().getHours();
    const isMorningActual = currentHour < 12;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#CCFBF1', '#F8FAFC', '#F8FAFC']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.navHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.goBack();
                        }}
                    >
                        <Ionicons name="chevron-back" size={20} color={BRAND_TEAL} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>ATTENDANCE</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            fetchTodayStatus();
                        }}
                    >
                        <Ionicons name="refresh" size={20} color={BRAND_TEAL} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={styles.headerContent}>
                        <Text style={styles.dateDisplay}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                        <TouchableOpacity
                            style={styles.gpsRow}
                            onPress={() => fetchLocationAsync(true)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.gpsDot,
                                { backgroundColor: locationPermGranted ? '#10B981' : '#EF4444' }
                            ]} />
                            <Text style={styles.gpsStatusText}>{gpsText}</Text>
                            <Ionicons name="refresh" size={12} color="#475569" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View>
                        <WeeklyStrip />
                    </Animated.View>

                    <SessionCard
                        session="MORNING"
                        data={status?.MORNING}
                        onAction={handleAttendance}
                        processing={processingSession === 'MORNING'}
                        isCurrent={isMorningActual}
                    />

                    <SessionCard
                        session="AFTERNOON"
                        data={status?.AFTERNOON}
                        onAction={handleAttendance}
                        processing={processingSession === 'AFTERNOON'}
                        isCurrent={!isMorningActual}
                    />

                    <Animated.View style={styles.permissionRequestCard}>
                        <View style={styles.permissionRequestHeader}>
                            <View style={styles.permissionRequestIconBg}>
                                <Ionicons name="document-text-outline" size={22} color="#7C3AED" />
                            </View>
                            <View style={styles.permissionRequestTextWrap}>
                                <Text style={styles.permissionRequestTitle}>Request Permission Online</Text>
                                <Text style={styles.permissionRequestSubtitle}>
                                    Submit a permission request from anywhere without GPS check-in.
                                </Text>
                            </View>
                        </View>

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
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.permissionActionButtonText}>
                                        {status?.MORNING?.status === 'PERMISSION' ? 'Morning Requested' : 'Morning Permission'}
                                    </Text>
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
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.permissionActionButtonText}>
                                        {status?.AFTERNOON?.status === 'PERMISSION' ? 'Afternoon Requested' : 'Afternoon Permission'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View style={styles.reportActionCard}>
                        <View style={styles.reportIconBg}>
                            <Ionicons name="bar-chart" size={22} color={BRAND_YELLOW} />
                        </View>
                        <View style={styles.reportTextContainer}>
                            <Text style={styles.reportTitle}>Summary Reports</Text>
                            <Text style={styles.reportSubtitle}>View your attendance performance</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.viewReportButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                navigation.navigate('AttendanceReport' as never);
                            }}
                        >
                            <Text style={styles.viewReportText}>View</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={styles.infoCard}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={BRAND_TEAL} />
                        <Text style={styles.infoText}>
                            Enterprise Geofencing Active. Your location is only recorded during check-in/out for verification.
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
                        <Text style={styles.permissionModalTitle}>Online Permission Request</Text>
                        <Text style={styles.permissionModalSubtitle}>
                            Session: {permissionSession}. Enter the reason for your request.
                        </Text>

                        <TextInput
                            value={permissionReason}
                            onChangeText={setPermissionReason}
                            placeholder="Example: Medical appointment, traffic delay, urgent family matter..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            style={styles.permissionReasonInput}
                            textAlignVertical="top"
                            editable={permissionProcessingSession === null}
                        />

                        <View style={styles.permissionModalActions}>
                            <TouchableOpacity
                                style={styles.permissionModalCancelButton}
                                onPress={() => setPermissionModalVisible(false)}
                                disabled={permissionProcessingSession !== null}
                            >
                                <Text style={styles.permissionModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.permissionModalSubmitButton,
                                    permissionProcessingSession !== null && styles.permissionModalSubmitButtonDisabled
                                ]}
                                onPress={submitPermissionRequest}
                                disabled={permissionProcessingSession !== null}
                            >
                                {permissionProcessingSession !== null ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.permissionModalSubmitText}>Submit</Text>
                                )}
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
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1F2937',
        letterSpacing: 2,
    },
    headerContent: {
        marginTop: 20,
        marginBottom: 28,
    },
    dateDisplay: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.8,
    },
    gpsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadows.sm,
    },
    gpsDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    gpsStatusText: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    weeklyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        paddingHorizontal: 4,
    },
    dayColPill: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
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
        fontSize: 10,
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
        borderRadius: 28,
        padding: 24,
        marginBottom: 24,
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
        marginBottom: 28,
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
        fontSize: 19,
        fontWeight: '800',
        color: '#1E293B',
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
        gap: 12,
        marginBottom: 28,
    },
    timeBox: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingVertical: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    timeLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    timeValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#CBD5E1',
    },
    activeTimeValue: {
        color: '#0F172A',
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
        borderRadius: 20,
        overflow: 'hidden',
        ...Shadows.md,
    },
    sessionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    btnInactive: {
        opacity: 0.5,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    sessionBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
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
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        backgroundColor: '#FAF5FF',
        ...Shadows.md,
    },
    permissionRequestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    permissionRequestIconBg: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionRequestTextWrap: {
        flex: 1,
        marginLeft: 16,
    },
    permissionRequestTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#5B21B6',
    },
    permissionRequestSubtitle: {
        fontSize: 13,
        color: '#7C3AED',
        marginTop: 4,
        fontWeight: '500',
    },
    permissionActionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    permissionActionButton: {
        flex: 1,
        backgroundColor: '#7C3AED',
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    permissionActionButtonDisabled: {
        opacity: 0.45,
    },
    permissionActionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
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
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadows.lg,
    },
    permissionModalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    permissionModalSubtitle: {
        marginTop: 8,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    permissionReasonInput: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 100,
        fontSize: 14,
        color: '#0F172A',
        backgroundColor: '#F8FAFC',
    },
    permissionModalActions: {
        marginTop: 16,
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
        backgroundColor: '#7C3AED',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    permissionModalSubmitButtonDisabled: {
        opacity: 0.6,
    },
    permissionModalSubmitText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
});

export default AttendanceCheckInScreen;
