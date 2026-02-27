import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Typography, Shadows } from '@/config';
import { attendanceService } from '@/services/attendance';
import { useNavigation } from '@react-navigation/native';

export const AttendanceCheckInScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState<any>(null);
    const [locationPermGranted, setLocationPermGranted] = useState(false);
    const [currentLocationText, setCurrentLocationText] = useState('Fetching location...');

    useEffect(() => {
        checkPermissionsAndFetchStatus();
    }, []);

    const checkPermissionsAndFetchStatus = async () => {
        try {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please enable location services to use check-in.');
                setLocationPermGranted(false);
                setLoading(false);
                return;
            }

            setLocationPermGranted(true);

            // Attempt to get a quick location reading
            try {
                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setCurrentLocationText(`Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`);
            } catch (locErr) {
                setCurrentLocationText('Location available (accuracy may be low)');
            }

            await fetchTodayStatus();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to initialize.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayStatus = async () => {
        try {
            const result = await attendanceService.getTodayStatus();
            if (result.success && result.data) {
                setStatus(result.data);
            } else {
                setStatus(null);
            }
        } catch (error: any) {
            // Don't alert if they just haven't checked in yet, this might return 404 or empty data
            console.log('No status found or error:', error.message);
            setStatus(null);
        }
    };

    const handleAction = async (actionType: 'in' | 'out') => {
        try {
            setProcessing(true);

            // Get precise location for check-in
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });

            const payload = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            if (actionType === 'in') {
                await attendanceService.checkIn(payload);
                Alert.alert('Success', 'Successfully checked in! Have a great day.');
            } else {
                await attendanceService.checkOut(payload);
                Alert.alert('Success', 'Successfully checked out! See you tomorrow.');
            }

            await fetchTodayStatus();
        } catch (error: any) {
            const errorMessage = error.message || `Failed to check ${actionType}`;
            Alert.alert('Attendance Failed', errorMessage);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary.main} />
                <Text style={styles.loadingText}>Loading attendance data...</Text>
            </View>
        );
    }

    const isCheckedIn = !!status;
    const isCheckedOut = status && status.timeOut;
    const timeInLabel = status?.timeIn ? new Date(status.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const timeOutLabel = status?.timeOut ? new Date(status.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Attendance</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.dateCard}>
                    <Text style={styles.dateText}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <View style={styles.locationBadge}>
                        <Ionicons name="location" size={12} color={Colors.white} />
                        <Text style={styles.locationText}>Geofence Active</Text>
                    </View>
                </View>

                <View style={styles.statusContainer}>
                    <View style={styles.statusBox}>
                        <Ionicons name="enter-outline" size={28} color={isCheckedIn ? Colors.success.main : Colors.gray[400]} />
                        <Text style={styles.statusLabel}>Time In</Text>
                        <Text style={[styles.statusTime, isCheckedIn && { color: Colors.success.main }]}>{timeInLabel}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statusBox}>
                        <Ionicons name="exit-outline" size={28} color={isCheckedOut ? Colors.secondary.main : Colors.gray[400]} />
                        <Text style={styles.statusLabel}>Time Out</Text>
                        <Text style={[styles.statusTime, isCheckedOut && { color: Colors.secondary.main }]}>{timeOutLabel}</Text>
                    </View>
                </View>

                {!locationPermGranted ? (
                    <View style={styles.warningContainer}>
                        <Ionicons name="warning" size={24} color={Colors.warning.main} />
                        <Text style={styles.warningText}>Location permission is required to mark attendance.</Text>
                        <TouchableOpacity style={styles.permissionBtn} onPress={checkPermissionsAndFetchStatus}>
                            <Text style={styles.permissionBtnText}>Grant Permission</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionContainer}>
                        <Text style={styles.gpsText}>GPS Signal: {currentLocationText}</Text>

                        {isCheckedOut ? (
                            <View style={styles.completedContainer}>
                                <Ionicons name="checkmark-circle" size={60} color={Colors.success.main} />
                                <Text style={styles.completedTitle}>You're all done for today!</Text>
                                <Text style={styles.completedSub}>Enjoy the rest of your day.</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    isCheckedIn ? styles.buttonOut : styles.buttonIn,
                                    processing && styles.buttonDisabled
                                ]}
                                disabled={processing}
                                onPress={() => handleAction(isCheckedIn ? 'out' : 'in')}
                                activeOpacity={0.8}
                            >
                                {processing ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={isCheckedIn ? "exit" : "finger-print"}
                                            size={24}
                                            color={Colors.white}
                                            style={styles.btnIcon}
                                        />
                                        <Text style={styles.actionButtonText}>
                                            {isCheckedIn ? 'MARK TIME OUT' : 'MARK TIME IN'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.gray[50],
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.gray[50],
    },
    loadingText: {
        marginTop: 12,
        color: Colors.gray[600],
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[200],
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray[900],
    },
    scrollContent: {
        padding: 20,
    },
    dateCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
        ...Shadows.sm,
    },
    dateText: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray[900],
        marginBottom: 12,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    locationText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    statusContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 24,
        marginBottom: 32,
        ...Shadows.sm,
    },
    statusBox: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        backgroundColor: Colors.gray[200],
        marginHorizontal: 10,
    },
    statusLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.gray[500],
        marginTop: 8,
        marginBottom: 4,
    },
    statusTime: {
        fontSize: Typography.fontSize['2xl'],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray[900],
    },
    actionContainer: {
        alignItems: 'center',
    },
    gpsText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray[500],
        marginBottom: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        ...Shadows.md,
    },
    buttonIn: {
        backgroundColor: Colors.primary,
    },
    buttonOut: {
        backgroundColor: '#8B5CF6',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    btnIcon: {
        marginRight: 10,
    },
    actionButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        letterSpacing: 1,
    },
    warningContainer: {
        backgroundColor: Colors.warning.light,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    warningText: {
        color: Colors.warning.dark,
        textAlign: 'center',
        marginVertical: 12,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
    },
    permissionBtn: {
        backgroundColor: Colors.warning.main,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    permissionBtnText: {
        color: Colors.white,
        fontWeight: 'bold',
    },
    completedContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: Colors.gray[50],
        borderRadius: 16,
        width: '100%',
    },
    completedTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.success.main,
        marginTop: 12,
        marginBottom: 4,
    },
    completedSub: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.gray[600],
    },
});

export default AttendanceCheckInScreen;
