/**
 * Notifications Screen
 * 
 * Displays in-app notifications with:
 * - Pull-to-refresh
 * - Mark as read / mark all as read
 * - Swipe to delete
 * - Empty state
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Platform, Animated} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';


import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar, EmptyState } from '@/components/common';
import { Colors } from '@/config';
import { Notification } from '@/types';

const NOTIFICATION_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
    LIKE: { name: 'heart', color: '#EF4444', bg: '#FEE2E2' },
    COMMENT: { name: 'chatbubble', color: '#3B82F6', bg: '#DBEAFE' },
    REPLY: { name: 'chatbubble-ellipses', color: '#2563EB', bg: '#DBEAFE' },
    FOLLOW: { name: 'person-add', color: '#8B5CF6', bg: '#EDE9FE' },
    MENTION: { name: 'at', color: '#0EA5E9', bg: '#E0F2FE' },
    ANNOUNCEMENT: { name: 'megaphone', color: '#6366F1', bg: '#EEF2FF' },
    GRADE_POSTED: { name: 'school', color: '#4F46E5', bg: '#E0E7FF' },
    ATTENDANCE_MARKED: { name: 'calendar', color: '#0891B2', bg: '#CFFAFE' },
    SHARE: { name: 'share-social', color: '#7C3AED', bg: '#F3E8FF' },
    ACHIEVEMENT_EARNED: { name: 'ribbon', color: '#F59E0B', bg: '#FEF3C7' },
    ASSIGNMENT_DUE: { name: 'clipboard', color: '#0F766E', bg: '#CCFBF1' },
    COURSE_ENROLL: { name: 'book', color: '#2563EB', bg: '#DBEAFE' },
    POLL_RESULT: { name: 'stats-chart', color: '#EC4899', bg: '#FCE7F3' },
    SKILL_ENDORSED: { name: 'thumbs-up', color: '#0284C7', bg: '#E0F2FE' },
    RECOMMENDATION_RECEIVED: { name: 'chatbox-ellipses', color: '#4338CA', bg: '#E0E7FF' },
    PROJECT_LIKED: { name: 'heart-circle', color: '#DC2626', bg: '#FEE2E2' },
    ASSIGNMENT: { name: 'document-text', color: '#10B981', bg: '#D1FAE5' },
    QUIZ: { name: 'help-circle', color: '#EC4899', bg: '#FCE7F3' },
    ACHIEVEMENT: { name: 'trophy', color: '#0EA5E9', bg: '#E0F2FE' },
};

const getNotificationIcon = (type: string) => {
    return NOTIFICATION_ICONS[type] || { name: 'notifications' as keyof typeof Ionicons.glyphMap, color: '#6B7280', bg: '#F3F4F6' };
};

const parseLinkPath = (linkValue: unknown): string => {
    if (typeof linkValue !== 'string') return '';
    const trimmed = linkValue.trim();
    if (!trimmed) return '';
    try {
        return new URL(trimmed).pathname || '';
    } catch {
        return trimmed.startsWith('/') ? trimmed : '';
    }
};

const getLinkPostId = (linkValue: unknown): string | null => {
    const path = parseLinkPath(linkValue);
    const match = path.match(/^\/posts\/([^/]+)$/);
    return match?.[1] || null;
};

const getLinkClubId = (linkValue: unknown): string | null => {
    const path = parseLinkPath(linkValue);
    const match = path.match(/^\/clubs\/([^/]+)$/);
    return match?.[1] || null;
};

const formatTimeAgo = (dateString: string, t: any): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.time.justNow');
    if (diffMins < 60) return t('notifications.time.mAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.time.hAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.time.dAgo', { count: diffDays });
    return date.toLocaleDateString();
};

export default function NotificationsScreen() {
    const { t } = useTranslation();
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
        const postIdFromData = typeof notification.data?.postId === 'string' ? notification.data.postId : null;
        const postIdFromLink = getLinkPostId(notification.data?.link);
        const postId = postIdFromData || postIdFromLink;

        if (postId) {
            navigation.navigate('FeedTab' as any, {
                screen: 'PostDetail',
                params: { postId },
            });
            return;
        }

        const linkPath = parseLinkPath(notification.data?.link);
        if (linkPath.startsWith('/attendance')) {
            navigation.navigate('ProfileTab' as any, {
                screen: 'AttendanceReport',
            });
            return;
        }

        if (linkPath.includes('/grades') || linkPath.startsWith('/academic') || linkPath.startsWith('/parent/child/')) {
            navigation.navigate('ProfileTab' as any, {
                screen: 'AcademicProfile',
            });
            return;
        }

        if (linkPath === '/clubs/invites' || linkPath === '/clubs/invites/') {
            navigation.navigate('ClubsTab' as any, {
                screen: 'ClubInvites',
            });
            return;
        }

        const clubId = getLinkClubId(notification.data?.link);
        if (clubId) {
            navigation.navigate('ClubsTab' as any, {
                screen: 'ClubDetails',
                params: { clubId },
            });
        }
    }, [markAsRead, navigation]);

    const renderNotification = useCallback(({ item, index }: { item: Notification; index: number }) => {
        const icon = getNotificationIcon(item.type);

        return (
            <Animated.View>
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
                            {formatTimeAgo(item.createdAt, t)}
                        </Text>
                    </View>

                    {/* Unread dot */}
                    {!!item.isRead === false && <View style={styles.unreadDot} />}
                </TouchableOpacity>
            </Animated.View>
        );
    }, [handleNotificationPress, deleteNotification]);

    const renderEmpty = useCallback(() => {
        if (isLoading) return null;
        return (
            <EmptyState
                type="notifications"
                title={t('notifications.empty.title')}
                message={t('notifications.empty.message')}
            />
        );
    }, [isLoading, t]);

    // Fixed-height rows: 72px item + 1px hairline divider
    const ITEM_HEIGHT = 73;
    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
        }),
        []
    );

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
                        <Ionicons name="chevron-back" size={24} color="#374151" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>{t('notifications.title')}</Text>

                    {unreadCount > 0 ? (
                        <TouchableOpacity
                            onPress={markAllAsRead}
                            style={styles.markAllButton}
                        >
                            <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
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
                getItemLayout={getItemLayout}
                initialNumToRender={10}
                maxToRenderPerBatch={8}
                windowSize={7}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={Platform.OS === 'android'}
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
        backgroundColor: '#F0F4F8',
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
