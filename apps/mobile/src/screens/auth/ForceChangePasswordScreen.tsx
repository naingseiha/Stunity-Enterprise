/**
 * Force Change Password Screen
 * 
 * Displayed when a user logs in with a password reset by an admin.
 * Requires the user to set a new password before accessing the app.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Colors, Spacing } from '@/config';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/stores';

export default function ForceChangePasswordScreen() {
    const { logout, refreshUser } = useAuthStore();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const validatePassword = (pw: string) => {
        if (pw.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(pw)) return 'Must contain an uppercase letter';
        if (!/[a-z]/.test(pw)) return 'Must contain a lowercase letter';
        if (!/[0-9]/.test(pw)) return 'Must contain a number';
        if (!/[^A-Za-z0-9]/.test(pw)) return 'Must contain a special character';
        return null;
    };

    const handleSubmit = async () => {
        const pwError = validatePassword(password);
        if (pwError) {
            Alert.alert('Weak Password', pwError);
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // Use the change-password endpoint (authenticated)
            await authApi.post('/auth/change-password', {
                currentPassword: '', // This is checked by the backend differently or we might need a special endpoint
                newPassword: password
            });

            Alert.alert('Success', 'Password updated successfully!', [
                { text: 'OK', onPress: () => refreshUser() }
            ]);
        } catch (error: any) {
            // If /change-password requires currentPassword, we might need a specific 'force-update' endpoint
            // Let's check how the backend handles /change-password
            const msg = error.response?.data?.error || 'Failed to update password.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.content}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Update Password</Text>
                        <Text style={styles.subtitle}>
                            Your password was reset by an administrator. For your security, please set a new password before continuing.
                        </Text>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="New password"
                                placeholderTextColor={Colors.textTertiary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm new password"
                                placeholderTextColor={Colors.textTertiary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, loading && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>
                                {loading ? 'Updating...' : 'Update & Continue'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                            <Text style={styles.logoutButtonText}>Log Out</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.lg,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: `${Colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.md,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        height: 52,
        width: '100%',
        marginBottom: Spacing.md,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        height: 52,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    logoutButton: {
        marginTop: Spacing.xl,
        padding: Spacing.sm,
    },
    logoutButtonText: {
        color: Colors.error,
        fontSize: 15,
        fontWeight: '600',
    },
});
