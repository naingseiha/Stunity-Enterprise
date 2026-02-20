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
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { useMessagingStore, useAuthStore } from '@/stores';
import { MessagesStackScreenProps } from '@/navigation/types';
import { DMConversation } from '@/stores/messagingStore';

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

    const renderContact = ({ item, index }: { item: ContactItem; index: number }) => (
        <Animated.View entering={FadeInDown.delay(20 * Math.min(index, 10)).duration(300)}>
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
                <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={36} color="#CBD5E1" />
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
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Message</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Search */}
                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search contacts..."
                            placeholderTextColor="#9CA3AF"
                            value={search}
                            onChangeText={setSearch}
                            autoFocus
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#0EA5E9" />
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
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4F8' },

    // Header
    headerSafe: { backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
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
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
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
        borderBottomColor: '#F1F5F9',
    },
    sectionLabelText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sectionCount: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },

    // Loading
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
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
        color: '#1F2937',
    },
    contactStatus: {
        fontSize: 12,
        color: '#9CA3AF',
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
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 18,
    },
});
