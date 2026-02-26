/**
 * AIResultPreview
 * 
 * Shows what AI generated before applying it to the form.
 * Allows user to Accept, Regenerate, or Discard.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface AIResultPreviewProps {
    visible: boolean;
    content: string; // The preview text (can be JSON stringified for complex objects if needed, but usually we just show a summary)
    title?: string;
    onAccept: () => void;
    onRegenerate: () => void;
    onDiscard: () => void;
    isRegenerating?: boolean;
}

export function AIResultPreview({
    visible,
    content,
    title = 'AI Draft',
    onAccept,
    onRegenerate,
    onDiscard,
    isRegenerating = false,
}: AIResultPreviewProps) {

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={onDiscard} disabled={isRegenerating}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Ionicons name="sparkles" size={18} color="#8B5CF6" style={{ marginRight: 6 }} />
                        <Text style={styles.title}>{title}</Text>
                    </View>
                    <View style={{ width: 44 }} /> {/* Balance header */}
                </View>

                <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentWrap}>
                    <View style={styles.previewCard}>
                        <Text style={styles.previewText}>{content}</Text>
                    </View>
                    <Text style={styles.disclaimer}>
                        Remember to review AI-generated content before posting. You can edit it after accepting.
                    </Text>
                </ScrollView>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnSecondary, isRegenerating && { opacity: 0.5 }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onRegenerate();
                        }}
                        disabled={isRegenerating}
                    >
                        <Ionicons name="refresh" size={20} color="#4B5563" />
                        <Text style={styles.btnSecondaryText}>
                            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btn, styles.btnPrimary, isRegenerating && { opacity: 0.5 }]}
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onAccept();
                        }}
                        disabled={isRegenerating}
                    >
                        <LinearGradient
                            colors={['#8B5CF6', '#3B82F6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.btnPrimaryText}>Accept & Edit</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'android' ? 16 : 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    iconBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    contentScroll: {
        flex: 1,
    },
    contentWrap: {
        padding: 20,
    },
    previewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    previewText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#374151',
    },
    disclaimer: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 20,
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20,
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    btn: {
        flex: 1,
        height: 54,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        overflow: 'hidden',
    },
    btnSecondary: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    btnPrimary: {
        backgroundColor: '#8B5CF6',
    },
    btnSecondaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    btnPrimaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
