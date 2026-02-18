/**
 * Notification Store
 * 
 * Manages in-app notifications with Hybrid Architecture:
 * - Fetches list via API (Cloud Run)
 * - Listens for real-time updates via Supabase
 */

import { create } from 'zustand';
import { Notification, ApiResponse } from '@/types';
import { notificationApi } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;

    // Actions
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;

    // Real-time
    subscribeToNotifications: (userId: string) => void;
    unsubscribeFromNotifications: () => void;

    realtimeSubscription: RealtimeChannel | null;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    realtimeSubscription: null,

    fetchNotifications: async () => {
        set({ isLoading: true });
        try {
            const response = await notificationApi.get('/notifications');

            if (response.data.success) {
                const notifications = response.data.data || [];
                const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

                set({
                    notifications,
                    unreadCount,
                    isLoading: false
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            set({ isLoading: false });
        }
    },

    markAsRead: async (notificationId: string) => {
        // Optimistic update
        set(state => {
            const updatedNotifications = state.notifications.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            );
            const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
            return { notifications: updatedNotifications, unreadCount };
        });

        try {
            await notificationApi.patch(`/notifications/${notificationId}/read`);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            // Revert if needed, but usually safe to ignore for read status
            get().fetchNotifications();
        }
    },

    markAllAsRead: async () => {
        set(state => ({
            notifications: state.notifications.map(n => ({ ...n, isRead: true })),
            unreadCount: 0
        }));

        try {
            await notificationApi.post('/notifications/read-all');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            get().fetchNotifications();
        }
    },

    deleteNotification: async (notificationId: string) => {
        const previousState = get().notifications;

        set(state => ({
            notifications: state.notifications.filter(n => n.id !== notificationId),
            unreadCount: state.notifications.find(n => n.id === notificationId && !n.isRead)
                ? state.unreadCount - 1
                : state.unreadCount
        }));

        try {
            await notificationApi.delete(`/notifications/${notificationId}`);
        } catch (error) {
            console.error('Failed to delete notification:', error);
            set({ notifications: previousState });
        }
    },

    subscribeToNotifications: (userId: string) => {
        console.log('🔔 [NotificationStore] Subscribing to realtime notifications...');
        const { unsubscribeFromNotifications } = get();

        unsubscribeFromNotifications();

        const channel = supabase
            .channel(`notifications:user:${userId}`)
            // New notifications
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipientId=eq.${userId}`,
                },
                async (payload) => {
                    console.log('🔔 [NotificationStore] New notification:', payload);
                    // Refresh to get full populated data (actor details, etc.)
                    await get().fetchNotifications();
                }
            )
            // Notification read status updates (sync across devices)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipientId=eq.${userId}`,
                },
                (payload) => {
                    const updated = payload.new as any;
                    if (!updated?.id) return;

                    set(state => {
                        const notifications = state.notifications.map(n =>
                            n.id === updated.id
                                ? { ...n, isRead: updated.isRead ?? n.isRead }
                                : n
                        );
                        const unreadCount = notifications.filter(n => !n.isRead).length;
                        return { notifications, unreadCount };
                    });
                }
            )
            .subscribe((status) => {
                console.log('🔔 [NotificationStore] Subscription:', status);
            });

        set({ realtimeSubscription: channel });
    },

    unsubscribeFromNotifications: () => {
        const { realtimeSubscription } = get();
        if (realtimeSubscription) {
            supabase.removeChannel(realtimeSubscription);
            set({ realtimeSubscription: null });
        }
    }
}));
