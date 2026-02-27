import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores';

export function LinkSchoolCard() {
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const { linkClaimCode } = useAuthStore();

    const handleLink = async () => {
        if (!code.trim()) {
            setErrorMsg('Please enter a claim code');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const result = await linkClaimCode(code.trim().toUpperCase());

        if (result.success) {
            setSuccessMsg('Successfully linked to school!');
            setCode('');
        } else {
            setErrorMsg(result.error || 'Failed to link code');
        }

        setIsSubmitting(false);
    };

    return (
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="school" size={20} color="#0EA5E9" />
                </View>
                <Text style={styles.title}>Join Your School</Text>
            </View>

            <Text style={styles.description}>
                If you have a claim code from your school or teacher, enter it below to access your courses and features.
            </Text>

            <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Enter claim code (e.g. ABCDEF)"
                    placeholderTextColor="#9CA3AF"
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
                    onPress={handleLink}
                    disabled={!code.trim() || isSubmitting}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <LinearGradient
                            colors={['#0EA5E9', '#0284C7']}
                            style={styles.gradientButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.submitButtonText}>Link</Text>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </LinearGradient>
                    )}
                </TouchableOpacity>
            </View>

            {errorMsg ? (
                <Animated.Text entering={SlideInDown.duration(200)} style={styles.errorText}>
                    {errorMsg}
                </Animated.Text>
            ) : null}

            {successMsg ? (
                <Animated.Text entering={SlideInDown.duration(200)} style={styles.successText}>
                    {successMsg}
                </Animated.Text>
            ) : null}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
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
});
