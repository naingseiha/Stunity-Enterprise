import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
import { useThemeContext } from '@/contexts';

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
    const { colors } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={onDiscard} disabled={isRegenerating}>
                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Ionicons name="sparkles" size={18} color="#8B5CF6" style={{ marginRight: 6 }} /><Text style={styles.title}>{title}</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentWrap}>
                    <View style={styles.previewCard}>
                        <Text style={styles.previewText}>{content}</Text>
                    </View>
                    <Text style={styles.disclaimer}>
                        <AutoI18nText i18nKey="auto.mobile.components_ai_AIResultPreview.k_2920eadb" />
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
                        <Ionicons name="refresh" size={20} color={colors.textSecondary} />
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
                        /><Ionicons name="checkmark-circle" size={20} color="#FFFFFF" /><Text style={styles.btnPrimaryText}><AutoI18nText i18nKey="auto.mobile.components_ai_AIResultPreview.k_e928957f" /></Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'android' ? 16 : 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
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
        color: colors.text,
    },
    contentScroll: {
        flex: 1,
    },
    contentWrap: {
        padding: 20,
    },
    previewCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    previewText: {
        fontSize: 16,
        lineHeight: 24,
        color: colors.text,
    },
    disclaimer: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 20,
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20,
        gap: 12,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    btnPrimary: {
        backgroundColor: '#8B5CF6',
    },
    btnSecondaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    btnPrimaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
