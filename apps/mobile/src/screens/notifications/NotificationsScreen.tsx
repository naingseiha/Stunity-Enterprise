/**
 * Notifications Screen
 * 
 * Displays in-app notifications with:
 * - Pull-to-refresh
 * - Mark as read / mark all as read
 * - Swipe to delete
 * - Empty state
 */

import React, { useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar, EmptyState } from '@/components/common';
import { Colors } from '@/config';
import { Notification } from '@/types';

const NOTIFICATION_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
    LIKE: { name: 'heart', color: '#EF4444', bg: '#FEE2E2' },
    COMMENT: { name: 'chatbubble', color: '#3B82F6', bg: '#DBEAFE' },
    FOLLOW: { name: 'person-add', color: '#8B5CF6', bg: '#EDE9FE' },
    MENTION: { name: 'at', color: '#0EA5E9', bg: '#E0F2FE' },
    ANNOUNCEMENT: { name: 'megaphone', color: '#6366F1', bg: '#EEF2FF' },
    ASSIGNMENT: { name: 'document-text', color: '#10B981', bg: '#D1FAE5' },
    QUIZ: { name: 'help-circle', color: '#EC4899', bg: '#FCE7F3' },
    ACHIEVEMENT: { name: 'trophy', color: '#0EA5E9', bg: '#E0F2FE' },
};

const getNotificationIcon = (type: string) => {
    return NOTIFICATION_ICONS[type] || { name: 'notifications' as keyof typeof Ionicons.glyphMap, color: '#6B7280', bg: '#F3F4F6' };
};

const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const {
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotificationStore();

    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, [fetchNotifications]);

    const handleNotificationPress = useCallback((notification: Notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        // Navigate based on notification data link if available
        if (notification.data?.postId) {
            navigation.navigate('FeedTab' as any, {
                screen: 'PostDetail',
                params: { postId: notification.data.postId },
            });
        }
    }, [markAsRead, navigation]);

    const renderNotification = useCallback(({ item, index }: { item: Notification; index: number }) => {
        const icon = getNotificationIcon(item.type);

        return (
            <Animated.View entering={FadeInDown.delay(30 * Math.min(index, 10)).duration(250)}>
                <TouchableOpacity
                    style={[
                        styles.notificationItem,
                        !item.isRead && styles.notificationUnread,
                    ]}
                    onPress={() => handleNotificationPress(item)}
                    onLongPress={() => deleteNotification(item.id)}
                    activeOpacity={0.7}
                >
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
                        <Ionicons name={icon.name} size={20} color={icon.color} />
                    </View>

                    {/* Content */}
                    <View style={styles.notificationContent}>
                        <Text style={[styles.notificationTitle, !item.isRead && styles.notificationTitleUnread]}>
                            {item.title}
                        </Text>
                        <Text style={styles.notificationBody} numberOfLines={2}>
                            {item.body}
                        </Text>
                        <Text style={styles.notificationTime}>
                            {formatTimeAgo(item.createdAt)}
                        </Text>
                    </View>

                    {/* Unread dot */}
                    {!item.isRead && <View style={styles.unreadDot} />}
                </TouchableOpacity>
            </Animated.View>
        );
    }, [handleNotificationPress, deleteNotification]);

    const renderEmpty = () => {
        if (isLoading) return null;
        return (
            <EmptyState
                type="notifications"
                title="No Notifications"
                message="You're all caught up! We'll notify you when something happens."
            />
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Notifications</Text>

                    {unreadCount > 0 ? (
                        <TouchableOpacity
                            onPress={markAllAsRead}
                            style={styles.markAllButton}
                        >
                            <Text style={styles.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerPlaceholder} />
                    )}
                </View>
                <View style={styles.headerDivider} />
            </SafeAreaView>

            {/* Notification List */}
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#6366F1"
                        colors={['#6366F1']}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerSafe: {
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    markAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#EEF2FF',
    },
    markAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366F1',
    },
    headerPlaceholder: {
        width: 80,
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    listContent: {
        paddingBottom: 32,
        flexGrow: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F3F4F6',
    },
    notificationUnread: {
        backgroundColor: '#FAFAFE',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
        marginRight: 8,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 2,
    },
    notificationTitleUnread: {
        fontWeight: '700',
        color: '#111827',
    },
    notificationBody: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    notificationTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6366F1',
    },
});
