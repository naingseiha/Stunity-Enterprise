import { useTranslation } from 'react-i18next';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * New Message Screen — Clean Professional Design
 *
 * Shows recent contacts from existing conversations
 * Search + tap to open/start a conversation
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ActivityIndicator, Animated, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';


import { Avatar } from '@/components/common';
import { useMessagingStore, useAuthStore } from '@/stores';
import { Shadows } from '@/config';
import { MessagesStackScreenProps } from '@/navigation/types';
import { DMConversation } from '@/stores/messagingStore';
import { useThemeContext } from '@/contexts';

type NavigationProp = MessagesStackScreenProps<'NewMessage'>['navigation'];

interface ContactItem {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    isOnline?: boolean;
    conversationId: string;
}

export default function NewMessageScreen() {
    const { t: autoT } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuthStore();
    const { conversations, startConversation } = useMessagingStore();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Extract unique contacts from existing conversations
    const contacts: ContactItem[] = useMemo(() => {
        const seen = new Set<string>();
        const result: ContactItem[] = [];

        conversations.forEach((conv: DMConversation) => {
            conv.participants.forEach((p) => {
                if (p.id !== user?.id && !seen.has(p.id)) {
                    seen.add(p.id);
                    result.push({
                        id: p.id,
                        firstName: p.firstName,
                        lastName: p.lastName,
                        profilePictureUrl: p.profilePictureUrl,
                        isOnline: p.isOnline,
                        conversationId: conv.id,
                    });
                }
            });
        });

        return result;
    }, [conversations, user?.id]);

    const filteredContacts = useMemo(() => {
        if (!search.trim()) return contacts;
        const q = search.toLowerCase();
        return contacts.filter(
            (c) =>
                c.firstName.toLowerCase().includes(q) ||
                c.lastName.toLowerCase().includes(q)
        );
    }, [contacts, search]);

    const handleContactPress = useCallback(async (contact: ContactItem) => {
        setLoading(true);
        try {
            // Navigate directly to existing conversation
            (navigation as any).replace('Chat', {
                conversationId: contact.conversationId,
                userId: contact.id,
            });
        } catch (error) {
            console.error('Failed to open conversation:', error);
        } finally {
            setLoading(false);
        }
    }, [navigation, startConversation]);

    const keyExtractor = useCallback((item: ContactItem) => item.id, []);

    const renderContact = useCallback(({ item }: { item: ContactItem; index: number }) => (
        <Animated.View>
            <TouchableOpacity
                style={styles.contactRow}
                onPress={() => handleContactPress(item)}
                activeOpacity={0.6}
                disabled={loading}
            >
                <View style={styles.contactAvatar}>
                    <Avatar
                        uri={item.profilePictureUrl}
                        name={`${item.firstName} ${item.lastName}`}
                        size="md"
                        showOnline={item.isOnline}
                    />
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>
                        {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.contactStatus}>
                        {item.isOnline ? 'Online' : 'Offline'}
                    </Text>
                </View>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
        </Animated.View>
    ), [handleContactPress, loading]);

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={36} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
                {search ? 'No results found' : 'No contacts yet'}
            </Text>
            <Text style={styles.emptyText}>
                {search
                    ? `No contacts matching "${search}"`
                    : 'Your contacts will appear here once you start conversations'}
            </Text>
        </View>
    ), [search]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}><AutoI18nText i18nKey="auto.mobile.screens_messages_NewMessageScreen.k_3d7ee034" /></Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Search */}
                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color={colors.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={autoT("auto.mobile.screens_messages_NewMessageScreen.k_f9d8da19")}
                            placeholderTextColor={colors.textTertiary}
                            value={search}
                            onChangeText={setSearch}
                            autoFocus
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}

            {/* Contacts Section Label */}
            <View style={styles.sectionLabel}>
                <Text style={styles.sectionLabelText}>
                    {search ? 'Results' : 'Recent Contacts'}
                </Text>
                <Text style={styles.sectionCount}>{filteredContacts.length}</Text>
            </View>

            {/* Contact List */}
            <FlatList
                data={filteredContacts}
                renderItem={renderContact}
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={10}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={Platform.OS === 'android'}
            />
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    headerSafe: { backgroundColor: colors.card },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: isDark ? colors.surfaceVariant : '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },

    // Search
    searchWrap: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
        paddingHorizontal: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        height: '100%',
    },

    // Section Label
    sectionLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    sectionLabelText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sectionCount: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '500',
    },

    // Loading
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.7)',
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Contact List
    listContent: {
        flexGrow: 1,
        paddingTop: 4,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    contactAvatar: {
        marginRight: 14,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    contactStatus: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 2,
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },
});
