/**
 * Parent Register Screen
 * 
 * Bespoke registration for parents with teal branding and claim code support
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Animated,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';
import { authApi } from '@/api/client';

type NavigationProp = AuthStackScreenProps<'ParentRegister'>['navigation'];

const BRAND_TEAL = '#09CFF7';
const BRAND_TEAL_DARK = '#00B8DB';

export default function ParentRegisterScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { parentRegister, login, isLoading, error, clearError } = useAuthStore();

    const [step, setStep] = useState(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Claim code (optional for linking child)
    const [claimCode, setClaimCode] = useState('');
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const [isCodeValidated, setIsCodeValidated] = useState(false);
    const [claimData, setClaimData] = useState<any>(null);

    const lastNameRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, [step]);

    const handleValidateCode = async () => {
        if (!claimCode.trim()) {
            Alert.alert('Required', 'Please enter a child claim code');
            return;
        }

        setIsValidatingCode(true);
        try {
            const resp = await authApi.post(
                '/auth/claim-codes/validate',
                {
                    code: claimCode.trim().toUpperCase(),
                },
                {
                    timeout: 15000,
                    headers: { 'X-No-Retry': '1' },
                }
            );

            if (resp.data.success) {
                setClaimData(resp.data.data);
                setIsCodeValidated(true);
                Alert.alert('Success', `Successfully found student: ${resp.data.data.student.firstName} ${resp.data.data.student.lastName}`);
            } else {
                Alert.alert('Invalid', resp.data.error || 'Claim code not found');
            }
        } catch (err: any) {
            const timeout = err?.code === 'ECONNABORTED' || String(err?.message || '').toLowerCase().includes('timeout');
            Alert.alert(
                'Error',
                timeout
                    ? 'Validation timed out. Check device-to-server connection and try again.'
                    : 'Unable to validate code. Please try again.'
            );
        } finally {
            setIsValidatingCode(false);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
                Alert.alert('Required', 'Please fill in all personal information');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!password || password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Mismatch', 'Passwords do not match');
                return;
            }
            setStep(3);
        }
    };

    const handleRegister = async () => {
        clearError();
        const success = await parentRegister({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            password,
            claimCode: isCodeValidated ? claimCode.trim().toUpperCase() : undefined,
        });

        if (success) {
            Alert.alert('Success', 'Parent account created successfully!');
        } else if (error) {
            Alert.alert('Failed', error);
        }
    };

    const renderWave = (opacity: number, path: string) => (
        <Svg height="120" width="100%" viewBox="0 0 1440 320" style={styles.waveLayer}>
            <Path fill={BRAND_TEAL} fillOpacity={opacity} d={path} />
        </Svg>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header with Waves */}
            <View style={styles.header}>
                <LinearGradient
                    colors={['#FFFFFF', '#ECFEFF', BRAND_TEAL]}
                    locations={[0, 0.4, 1]}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={24} color={Colors.gray[800]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Parent Setup</Text>
                    <View style={styles.headerRight} />
                </SafeAreaView>

                {renderWave(0.3, "M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,165.3C960,181,1056,171,1152,144C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z")}
                {renderWave(0.5, "M0,128L60,117.3C120,107,240,85,360,112C480,139,600,213,720,218.7C840,224,960,160,1080,122.7C1200,85,1320,75,1380,69.3L1440,64L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z")}
                {renderWave(1, "M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,181.3C1120,160,1280,96,1360,64L1440,32L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z")}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim }}>
                    {step === 1 && (
                        <View>
                            <View style={styles.stepHeader}>
                                <Ionicons name="person-outline" size={32} color={BRAND_TEAL} />
                                <Text style={styles.stepTitle}>Personal Details</Text>
                                <Text style={styles.stepSubtitle}>Basic information to get started</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>First Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter first name"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    returnKeyType="next"
                                    onSubmitEditing={() => lastNameRef.current?.focus()}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Last Name</Text>
                                <TextInput
                                    ref={lastNameRef}
                                    style={styles.input}
                                    placeholder="Enter last name"
                                    value={lastName}
                                    onChangeText={setLastName}
                                    returnKeyType="next"
                                    onSubmitEditing={() => phoneRef.current?.focus()}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone Number</Text>
                                <TextInput
                                    ref={phoneRef}
                                    style={styles.input}
                                    placeholder="e.g., 012345678"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    returnKeyType="next"
                                    onSubmitEditing={handleNext}
                                />
                            </View>

                            <TouchableOpacity onPress={handleNext} style={styles.primaryButton}>
                                <LinearGradient colors={[BRAND_TEAL, BRAND_TEAL_DARK]} style={styles.buttonGradient}>
                                    <Text style={styles.buttonText}>Continue</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <View style={styles.stepHeader}>
                                <Ionicons name="lock-closed-outline" size={32} color={BRAND_TEAL} />
                                <Text style={styles.stepTitle}>Security</Text>
                                <Text style={styles.stepSubtitle}>Set up your account password</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <TextInput
                                    ref={passwordRef}
                                    style={styles.input}
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    returnKeyType="next"
                                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <TextInput
                                    ref={confirmPasswordRef}
                                    style={styles.input}
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    returnKeyType="done"
                                    onSubmitEditing={handleNext}
                                />
                            </View>

                            <TouchableOpacity onPress={handleNext} style={styles.primaryButton}>
                                <LinearGradient colors={[BRAND_TEAL, BRAND_TEAL_DARK]} style={styles.buttonGradient}>
                                    <Text style={styles.buttonText}>Continue</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 3 && (
                        <View>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconWrap}>
                                    <Ionicons name="link-outline" size={32} color={BRAND_TEAL} />
                                </View>
                                <Text style={styles.stepTitle}>Link Child</Text>
                                <Text style={styles.stepSubtitle}>Optional — enter your child's claim code</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Claim Code</Text>
                                <View style={styles.codeRow}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                        placeholder="STNT-1234-5678"
                                        value={claimCode}
                                        onChangeText={(t) => { setClaimCode(t.toUpperCase()); setIsCodeValidated(false); }}
                                        autoCapitalize="characters"
                                        editable={!isCodeValidated}
                                    />
                                    {!isCodeValidated && (
                                        <TouchableOpacity
                                            onPress={handleValidateCode}
                                            style={styles.validateButton}
                                            disabled={isValidatingCode}
                                        >
                                            {isValidatingCode ? (
                                                <Text style={styles.validateText}>...</Text>
                                            ) : (
                                                <Ionicons name="checkmark-circle" size={24} color={BRAND_TEAL} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {isCodeValidated && claimData && (
                                <View style={styles.studentCard}>
                                    <Ionicons name="school" size={20} color={BRAND_TEAL} />
                                    <View style={styles.studentInfo}>
                                        <Text style={styles.studentName}>{claimData.student.firstName} {claimData.student.lastName}</Text>
                                        <Text style={styles.schoolName}>{claimData.school.name}</Text>
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={handleRegister}
                                style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
                                disabled={isLoading}
                            >
                                <LinearGradient colors={[BRAND_TEAL, BRAND_TEAL_DARK]} style={styles.buttonGradient}>
                                    <Text style={styles.buttonText}>{isLoading ? 'Creating Account...' : 'Complete Registration'}</Text>
                                    {!isLoading && <Ionicons name="checkmark" size={20} color="#fff" />}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleRegister} disabled={isLoading} style={styles.skipButton}>
                                <Text style={styles.skipText}>Link child later</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>

                <TouchableOpacity
                    onPress={() => navigation.navigate('ParentLogin')}
                    style={styles.footer}
                >
                    <Text style={styles.footerText}>Ready to log in? <Text style={styles.footerLink}>Sign In</Text></Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        height: 180,
        backgroundColor: BRAND_TEAL,
        justifyContent: 'flex-start',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.gray[900],
    },
    headerRight: { width: 40 },
    waveLayer: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
    },
    scrollContent: {
        paddingHorizontal: 28,
        paddingTop: 0,
        paddingBottom: 40,
    },
    stepHeader: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10,
    },
    stepIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ECFEFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.gray[900],
        marginTop: 12,
    },
    stepSubtitle: {
        fontSize: 14,
        color: Colors.gray[500],
        marginTop: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.gray[700],
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        height: 52,
        backgroundColor: '#F8FAFC',
        borderRadius: 26,
        paddingHorizontal: 22,
        fontSize: 16,
        color: Colors.gray[900],
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    validateButton: {
        width: 52,
        height: 52,
        backgroundColor: '#ECFEFF',
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    validateText: {
        fontWeight: 'bold',
        color: BRAND_TEAL,
    },
    primaryButton: {
        marginTop: 12,
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: BRAND_TEAL,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonGradient: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFEFF',
        padding: 16,
        borderRadius: 24,
        marginBottom: 24,
        gap: 12,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.gray[900],
    },
    schoolName: {
        fontSize: 13,
        color: BRAND_TEAL,
        marginTop: 2,
    },
    skipButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 14,
        color: Colors.gray[500],
        fontWeight: '600',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: Colors.gray[600],
    },
    footerLink: {
        color: BRAND_TEAL,
        fontWeight: '700',
    },
});
