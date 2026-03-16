import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/navigation/types';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PasswordSecurity'>;

const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain a number.';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character.';
    return null;
};

export const PasswordSecurityScreen = ({ navigation }: Props) => {
    const { t } = useTranslation();
    const { logout } = useAuthStore();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert(t('common.error'), 'Please fill in all password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(t('common.error'), 'New password and confirm password do not match.');
            return;
        }

        if (currentPassword === newPassword) {
            Alert.alert(t('common.error'), 'New password must be different from current password.');
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            Alert.alert(t('common.error'), passwordError);
            return;
        }

        setSubmitting(true);
        try {
            const response = await authApi.post('/auth/change-password', {
                currentPassword,
                newPassword,
            });

            Alert.alert(
                t('common.success'),
                response.data?.message || 'Password changed successfully. Please log in again.',
                [
                    {
                        text: t('common.ok'),
                        onPress: () => {
                            void logout();
                        },
                    },
                ]
            );
        } catch (error: any) {
            const apiMessage = error?.response?.data?.error as string | undefined;
            const details = error?.response?.data?.details as string[] | undefined;
            const fullMessage = details?.length
                ? `${apiMessage || 'Failed to change password.'}\n${details.join('\n')}`
                : (apiMessage || 'Failed to change password.');
            Alert.alert(t('common.error'), fullMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Password & Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Text style={styles.description}>
                        Update your password to keep your account secure.
                    </Text>

                    <PasswordField
                        label="Current Password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPassword}
                        onToggleVisibility={() => setShowCurrentPassword((prev) => !prev)}
                        visible={showCurrentPassword}
                    />

                    <PasswordField
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        onToggleVisibility={() => setShowNewPassword((prev) => !prev)}
                        visible={showNewPassword}
                    />

                    <PasswordField
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        onToggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
                        visible={showConfirmPassword}
                    />

                    <View style={styles.rulesCard}>
                        <Text style={styles.rulesTitle}>Password rules</Text>
                        <Text style={styles.rulesItem}>• At least 8 characters</Text>
                        <Text style={styles.rulesItem}>• Uppercase + lowercase letters</Text>
                        <Text style={styles.rulesItem}>• At least one number</Text>
                        <Text style={styles.rulesItem}>• At least one special character</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Update Password</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

type PasswordFieldProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    secureTextEntry: boolean;
    visible: boolean;
    onToggleVisibility: () => void;
};

const PasswordField = ({
    label,
    value,
    onChangeText,
    secureTextEntry,
    visible,
    onToggleVisibility,
}: PasswordFieldProps) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.inputWrap}>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
            />
            <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
            </TouchableOpacity>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F7',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
    },
    content: {
        padding: 16,
        gap: 14,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        color: '#64748B',
        marginBottom: 4,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: '#1F2937',
    },
    eyeButton: {
        padding: 4,
        marginLeft: 8,
    },
    rulesCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EEF2F7',
        marginTop: 6,
    },
    rulesTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    rulesItem: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
    },
    saveButton: {
        marginTop: 8,
        backgroundColor: '#0EA5E9',
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default PasswordSecurityScreen;
