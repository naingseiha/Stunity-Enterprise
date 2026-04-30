import { useTranslation } from 'react-i18next';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores';
import { ScannerModal } from './ScannerModal';
import { useThemeContext } from '@/contexts';

export function LinkSchoolCard() {
    const { t: autoT } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isScannerVisible, setIsScannerVisible] = useState(false);

    const { linkClaimCode, validateClaimCode, user } = useAuthStore();

    // If request is already pending, show status UI
    if (user?.linkingStatus === 'PENDING') {
        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.header, { marginBottom: 15 }]}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? '#3B2B09' : '#FEF3C7' }]}>
                        <Ionicons name="time" size={20} color="#D97706" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}><AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_bbef113c" /></Text>
                </View>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    <AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_114338a8" /> <Text style={{ fontWeight: '700', color: colors.text }}>{user.pendingLinkData?.schoolName || 'your school'}</Text> <AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_6bf8464c" />
                </Text>
                <View style={[styles.pendingBadge, { backgroundColor: isDark ? '#3B2B09' : '#FFFBEB', borderColor: isDark ? '#854D0E' : '#FEF3C7' }]}>
                    <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 8 }} />
                    <Text style={styles.pendingText}><AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_5eebc90e" /></Text>
                </View>
            </View>
        );
    }

    const handleVerifyAndLink = async (overrideCode?: string) => {
        const targetCode = overrideCode || code;

        if (!targetCode.trim()) {
            setErrorMsg('Please enter a claim code');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        // Step 1: Validate (Preview)
        const valResult = await validateClaimCode(targetCode.trim().toUpperCase());

        if (!valResult.success) {
            setErrorMsg(valResult.error || 'Invalid claim code');
            setIsSubmitting(false);
            return;
        }

        const data = valResult.data;
        const schoolName = data.school?.name || 'Unknown School';
        const type = data.type; // STUDENT or TEACHER
        
        let confirmMessage = `Link to ${schoolName} as a ${type.toLowerCase()}?`;
        
        if (type === 'STUDENT' && data.student) {
            const student = data.student;
            confirmMessage = `Link to ${schoolName}?\n\nStudent: ${student.firstName} ${student.lastName}\nClass: ${student.className || 'N/A'}\nGrade: ${student.gradeLevel || 'N/A'}`;
        } else if (type === 'TEACHER' && data.teacher) {
            const teacher = data.teacher;
            confirmMessage = `Link to ${schoolName}?\n\nTeacher: ${teacher.firstName} ${teacher.lastName}`;
        }

        setIsSubmitting(false);

        // Step 2: Show Confirmation Alert
        Alert.alert(
            "Verify Identity",
            confirmMessage,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm & Link", 
                    onPress: async () => {
                        setIsSubmitting(true);
                        const linkResult = await linkClaimCode(targetCode.trim().toUpperCase());
                        if (linkResult.success) {
                            setSuccessMsg('Request submitted! Awaiting admin approval.');
                            setCode('');
                        } else {
                            setErrorMsg(linkResult.error || 'Failed to submit request');
                        }
                        setIsSubmitting(false);
                    }
                }
            ]
        );
    };

    const handleManualVerify = () => {
        void handleVerifyAndLink();
    };

    return (
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#0F2F37' : '#F0F9FF' }]}>
                    <Ionicons name="school" size={20} color="#0EA5E9" />
                </View>
                <Text style={[styles.title, { color: colors.text }]}><AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_5d357615" /></Text>
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
                <AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_bc0f5a7a" />
            </Text>

            <View style={[styles.inputContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={autoT("auto.mobile.screens_profile_components_LinkSchoolCard.k_94c974e3")}
                    placeholderTextColor={colors.textTertiary}
                    value={code}
                    onChangeText={(text) => {
                        setCode(text);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isSubmitting}
                />

                <TouchableOpacity
                    style={[styles.submitButton, (!code.trim() || isSubmitting) && styles.submitButtonDisabled]}
                    onPress={handleManualVerify}
                    disabled={!code.trim() || isSubmitting}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" style={{ marginHorizontal: 20 }} />
                    ) : (
                        <LinearGradient
                            colors={['#0EA5E9', '#0284C7']}
                            style={styles.gradientButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.submitButtonText}><AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_ef72f402" /></Text>
                            <Ionicons name="shield-checkmark" size={16} color="#fff" />
                        </LinearGradient>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.orContainer}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.orText, { color: colors.textTertiary }]}>OR</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: isDark ? '#0F2F37' : '#F0F9FF', borderColor: isDark ? '#155E75' : '#E0F2FE' }]}
                activeOpacity={0.8}
                onPress={() => setIsScannerVisible(true)}
            >
                <Ionicons name="qr-code-outline" size={20} color="#0EA5E9" />
                <Text style={styles.scanButtonText}><AutoI18nText i18nKey="auto.mobile.screens_profile_components_LinkSchoolCard.k_6696e9d1" /></Text>
            </TouchableOpacity>

            {errorMsg ? (
                <Text style={styles.errorText}>
                    {errorMsg}
                </Text>
            ) : null}

            {successMsg ? (
                <Text style={styles.successText}>
                    {successMsg}
                </Text>
            ) : null}

            <ScannerModal
                isVisible={isScannerVisible}
                onClose={() => setIsScannerVisible(false)}
                onScan={(scannedCode) => {
                    setIsScannerVisible(false);
                    setCode(scannedCode);
                    // Slight delay to ensure modal close animation finishes before showing alert
                    setTimeout(() => {
                        void handleVerifyAndLink(scannedCode);
                    }, 500);
                }}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: '#111827',
        fontWeight: '600',
    },
    submitButton: {
        borderRadius: 8,
        overflow: 'hidden',
        marginLeft: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    orText: {
        marginHorizontal: 12,
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        borderWidth: 1,
        borderColor: '#E0F2FE',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 8,
    },
    scanButtonText: {
        color: '#0EA5E9',
        fontSize: 15,
        fontWeight: '600',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        marginTop: 10,
        fontWeight: '500',
    },
    successText: {
        color: '#10B981',
        fontSize: 13,
        marginTop: 10,
        fontWeight: '500',
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    pendingText: {
        color: '#D97706',
        fontSize: 14,
        fontWeight: '600',
    },
});
