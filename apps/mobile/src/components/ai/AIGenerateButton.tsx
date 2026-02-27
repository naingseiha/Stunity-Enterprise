/**
 * AIGenerateButton
 * 
 * Reusable sparkle button for triggering AI generation across all post forms.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface AIGenerateButtonProps {
    label?: string;
    onPress: () => void;
    isLoading?: boolean;
    type?: 'primary' | 'secondary' | 'icon-only' | 'ghost';
    icon?: keyof typeof Ionicons.glyphMap;
    size?: 'small' | 'medium' | 'large';
    style?: any;
}

export function AIGenerateButton({
    label = 'Generate with AI',
    onPress,
    isLoading = false,
    type = 'primary',
    icon = 'sparkles',
    size = 'medium',
    style,
}: AIGenerateButtonProps) {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    };

    if (type === 'icon-only') {
        return (
            <TouchableOpacity
                style={[
                    styles.iconOnly,
                    size === 'small' && { width: 36, height: 36, borderRadius: 18 },
                    size === 'large' && { width: 56, height: 56, borderRadius: 28 },
                    style
                ]}
                onPress={handlePress}
                disabled={isLoading}
            >
                <LinearGradient
                    colors={['#8B5CF6', '#3B82F6']} // Purple to Blue gemini-style
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 30 }]}
                />
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Ionicons name={icon} size={size === 'small' ? 18 : size === 'large' ? 28 : 22} color="#FFFFFF" />
                )}
            </TouchableOpacity>
        );
    }

    if (type === 'ghost') {
        return (
            <TouchableOpacity
                style={[styles.ghostButton, style]}
                onPress={handlePress}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#8B5CF6" size="small" />
                ) : (
                    <Ionicons name={icon} size={18} color="#8B5CF6" />
                )}
                {!!label && <Text style={[styles.ghostText, { marginLeft: 6 }]}>{label}</Text>}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[
                styles.container,
                size === 'small' && { paddingVertical: 8, paddingHorizontal: 12 },
                size === 'large' && { paddingVertical: 16, paddingHorizontal: 24 },
                style
            ]}
            onPress={handlePress}
            disabled={isLoading}
        >
            <LinearGradient
                colors={type === 'primary' ? ['#8B5CF6', '#3B82F6'] : ['#F3E8FF', '#DBEAFE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.content}>
                {isLoading ? (
                    <ActivityIndicator color={type === 'primary' ? '#FFFFFF' : '#6D28D9'} size="small" />
                ) : (
                    <><Ionicons name={icon} size={size === 'small' ? 16 : 20} color={type === 'primary' ? '#FFFFFF' : '#6D28D9'} /><Text style={[
                        styles.label,
                        type === 'secondary' && styles.labelSecondary,
                        size === 'small' && { fontSize: 13 },
                        size === 'large' && { fontSize: 16 }
                    ]}>
                        {label}
                    </Text></>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    labelSecondary: {
        color: '#6D28D9', // Deep purple
    },
    iconOnly: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    ghostButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#F5F3FF', // Very light purple
    },
    ghostText: {
        color: '#8B5CF6',
        fontSize: 14,
        fontWeight: '600',
    },
});
