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
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, ColorScale, Typography, Shadows } from '@/config';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores';

const { width } = Dimensions.get('window');

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
                    <View key={day} style={styles.dayCol}>
                        <View style={[
                            styles.dayDot,
                            isToday && styles.todayDot,
                            isPast && styles.pastDot
                        ]}>
                            {isPast && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>{day}</Text>
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
    const isCheckedIn = !!data?.timeIn;
    const isCheckedOut = !!data?.timeOut;
    const isOnDuty = isCheckedIn && !isCheckedOut;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAction(isOnDuty ? 'out' : 'in', session);
    };

    return (
        <Animated.View
            entering={FadeInUp.delay(session === 'MORNING' ? 100 : 200).duration(600)}
            style={[
                styles.sessionCard,
                isCurrent && styles.currentSessionCard,
                isCheckedOut && styles.completedSessionCard
            ]}
        >
            <View style={styles.sessionHeader}>
                <View style={[styles.sessionIconBg, { backgroundColor: isCurrent ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
                    <Ionicons
                        name={session === 'MORNING' ? "sunny" : "partly-sunny"}
                        size={22}
                        color={isCurrent ? '#38BDF8' : 'rgba(255,255,255,0.4)'}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.sessionTitle, isCurrent && { color: '#38BDF8' }]}>{session}</Text>
                    <Text style={styles.sessionTimeWindow}>
                        {session === 'MORNING' ? '07:00 AM - 12:00 PM' : '12:00 PM - 06:00 PM'}
                    </Text>
                </View>
                {isCheckedOut ? (
                    <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#34D399" />
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
                    <Text style={styles.timeLabel}>CHECK IN</Text>
                    <Text style={[styles.timeValue, isCheckedIn && styles.activeTimeValue]}>
                        {data?.timeIn ? new Date(data.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                </View>
                <View style={styles.timeSeparator} />
                <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>CHECK OUT</Text>
                    <Text style={[styles.timeValue, isCheckedOut && styles.activeTimeValue]}>
                        {data?.timeOut ? new Date(data.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                </View>
            </View>

            {!isCheckedOut && (
                <TouchableOpacity
                    style={[
                        styles.sessionBtn,
                        isOnDuty ? styles.sessionBtnOut : styles.sessionBtnIn,
                        processing && styles.btnDisabled,
                        !isCurrent && !isCheckedIn && styles.btnInactive
                    ]}
                    onPress={handlePress}
                    disabled={processing}
                    activeOpacity={0.8}
                >
                    {processing ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name={isOnDuty ? "log-out-outline" : "finger-print"} size={20} color="#fff" />
                            <Text style={styles.sessionBtnText}>
                                {isOnDuty ? 'Finish Session' : `Start ${session}`}
                            </Text>
                        </>
                    )}
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
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            if (locStatus !== 'granted') {
                return false;
            }
            setLocationPermGranted(true);
            return true;
        } catch (e) {
            return false;
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const hasPerm = await checkPermissions();
            if (hasPerm) {
                await fetchTodayStatus();
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setGpsText(`Ready (${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)})`);
                } catch (e) {
                    setGpsText('GPS Limited');
                }
            } else {
                setGpsText('Location Access Denied');
            }
            setLoading(false);
        };
        init();
    }, [fetchTodayStatus]);

    const handleAttendance = async (type: 'in' | 'out', session: 'MORNING' | 'AFTERNOON') => {
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

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <LinearGradient colors={['#0f172a', '#1e293b']} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={[styles.loadingText, { color: '#38BDF8' }]}>Syncing with enterprise server...</Text>
            </View>
        );
    }

    if (!isLinkedToSchool) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#4c1d95', '#1e1b4b', '#0f172a']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.navHeader}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>ATTENDANCE</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <View style={[styles.centerContainer, { paddingHorizontal: 30 }]}>
                        <View style={styles.sessionIconBg}>
                            <Ionicons name="business-outline" size={64} color="rgba(255,255,255,0.4)" />
                        </View>
                        <Text style={[styles.dateDisplay, { marginTop: 20, textAlign: 'center' }]}>Not Linked to a School</Text>
                        <Text style={[styles.infoText, { textAlign: 'center', marginTop: 12, fontSize: 14 }]}>
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
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#4c1d95', '#1e1b4b', '#0f172a']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.navHeader}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.goBack();
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>ATTENDANCE</Text>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            fetchTodayStatus();
                        }}
                    >
                        <Ionicons name="refresh" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View entering={FadeInDown.duration(800)} style={styles.headerContent}>
                        <Text style={styles.dateDisplay}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                        <View style={styles.gpsRow}>
                            <View style={[styles.gpsDot, { backgroundColor: locationPermGranted ? '#34D399' : '#F87171' }]} />
                            <Text style={styles.gpsStatusText}>{gpsText}</Text>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).duration(800)}>
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

                    <Animated.View entering={FadeInUp.delay(400)} style={styles.infoCard}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                        />
                        <Ionicons name="shield-checkmark-outline" size={20} color="rgba(56, 189, 248, 0.6)" />
                        <Text style={styles.infoText}>
                            Enterprise Geofencing Active. Your location is only recorded during check-in/out for verification.
                        </Text>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 32,
    },
    dateDisplay: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    gpsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    gpsDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    gpsStatusText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    weeklyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        paddingHorizontal: 4,
    },
    dayCol: {
        alignItems: 'center',
        gap: 8,
    },
    dayDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    todayDot: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderColor: '#38BDF8',
        borderWidth: 2,
    },
    pastDot: {
        backgroundColor: '#34D399',
        borderColor: '#34D399',
    },
    dayLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '700',
    },
    todayLabel: {
        color: '#38BDF8',
    },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    sessionCard: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    currentSessionCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderWidth: 1.5,
    },
    completedSessionCard: {
        opacity: 0.8,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    sessionIconBg: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    sessionTimeWindow: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
        fontWeight: '600',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 211, 153, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 4,
    },
    completedBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#34D399',
    },
    currentBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    currentBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#38BDF8',
    },

    timeInfoRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 18,
        padding: 18,
        marginBottom: 24,
    },
    timeBox: {
        flex: 1,
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '800',
        marginBottom: 6,
        letterSpacing: 1,
    },
    timeValue: {
        fontSize: 20,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.15)',
    },
    activeTimeValue: {
        color: '#fff',
    },
    timeSeparator: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 12,
    },

    sessionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 18,
        gap: 12,
        ...Shadows.md,
    },
    btnInactive: {
        opacity: 0.5,
    },
    sessionBtnIn: {
        backgroundColor: '#38BDF8',
    },
    sessionBtnOut: {
        backgroundColor: '#F43F5E',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    sessionBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },

    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginTop: 8,
        gap: 16,
        overflow: 'hidden',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 18,
        fontWeight: '500',
    },
});

export default AttendanceCheckInScreen;
