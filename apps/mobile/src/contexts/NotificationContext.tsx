
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerDeviceToken } from '@/api/notifications';
import { useAuthStore } from '@/stores';
import { useNotificationStore } from '@/stores/notificationStore';

/**
 * Push Notification Configuration
 *
 * NOTE: expo-notifications plugin is intentionally NOT in app.json plugins.
 * Reason: The google-services.json uses placeholder credentials. Including the
 * expo-notifications plugin compiles Firebase FCM into the native binary, and
 * Firebase CRASHES the Android process when initialized with placeholder credentials.
 *
 * When you have a real Firebase project:
 * 1. Replace google-services.json with the real one from Firebase console.
 * 2. Add expo-notifications back to app.json plugins.
 * 3. Remove the PUSH_NOTIFICATIONS_ENABLED = false guard below.
 *
 * In-app notifications via Supabase Realtime work WITHOUT Firebase and are unaffected.
 */
const PUSH_NOTIFICATIONS_ENABLED = false; // Set to true once google-services.json is real

// Only set up the notification handler if push notifications are enabled
if (PUSH_NOTIFICATIONS_ENABLED) {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (e) {
        console.warn('[Notifications] setNotificationHandler failed (plugin not compiled in):', e);
    }
}

interface NotificationContextType {
    expoPushToken: string | undefined;
    notification: Notifications.Notification | undefined;
    requestPermissions: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
    const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

    const { user, isAuthenticated } = useAuthStore();
    const fetchNotifications = useNotificationStore(state => state.fetchNotifications);
    const subscribeToNotifications = useNotificationStore(state => state.subscribeToNotifications);
    const unsubscribeFromNotifications = useNotificationStore(state => state.unsubscribeFromNotifications);

    const registerForPushNotificationsAsync = async (): Promise<string | undefined> => {
        // Guard: skip entirely if push notifications are disabled (no real Firebase config)
        if (!PUSH_NOTIFICATIONS_ENABLED) {
            console.log('[Notifications] Push notifications disabled (placeholder google-services.json). In-app notifications work via Supabase Realtime.');
            return undefined;
        }

        let token: string | undefined;

        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            } catch (channelError) {
                console.warn('[Notifications] Failed to set Android notification channel:', channelError);
            }
        }

        if (Device.isDevice) {
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    console.log('[Notifications] Push permission not granted');
                    return undefined;
                }

                const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
                if (!projectId || projectId === 'your-project-id') {
                    console.warn('⚠️ [Notifications] EAS projectId not configured — push tokens disabled.');
                    return undefined;
                }

                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                console.log('[Notifications] Expo Push Token:', token);
            } catch (e: any) {
                if (e?.message?.includes('VALIDATION_ERROR') || e?.message?.includes('Invalid uuid')) {
                    console.warn('⚠️ [Notifications] Push token unavailable (invalid projectId).');
                } else {
                    console.error('[Notifications] Error getting push token:', e);
                }
            }
        }

        return token;
    };

    const requestPermissions = async () => {
        const token = await registerForPushNotificationsAsync();
        setExpoPushToken(token);
        return !!token;
    };

    // Set up in-app notification listeners (only if plugin is compiled in)
    useEffect(() => {
        if (!PUSH_NOTIFICATIONS_ENABLED) return;

        try {
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                setNotification(notification);
                fetchNotifications();
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('[Notifications] Response received:', response);
            });
        } catch (e) {
            console.warn('[Notifications] Failed to add listeners (plugin not compiled in):', e);
        }

        return () => {
            try {
                if (notificationListener.current) notificationListener.current.remove();
                if (responseListener.current) responseListener.current.remove();
            } catch (e) { /* no-op */ }
        };
    }, []);

    // Register token with backend when user logs in
    useEffect(() => {
        if (!PUSH_NOTIFICATIONS_ENABLED) return;
        const registerToken = async () => {
            if (isAuthenticated && user?.id && expoPushToken) {
                try {
                    await registerDeviceToken(user.id, expoPushToken, Platform.OS);
                    console.log('[Notifications] Device token registered');
                } catch (error) {
                    console.error('[Notifications] Failed to register device token:', error);
                }
            }
        };
        registerToken();
    }, [isAuthenticated, user?.id, expoPushToken]);

    // Initialize in-app notification store (Supabase Realtime — works WITHOUT Firebase)
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            fetchNotifications();
            subscribeToNotifications(user.id);
        } else {
            unsubscribeFromNotifications();
        }

        return () => {
            unsubscribeFromNotifications();
        };
    }, [isAuthenticated, user?.id]);

    // Request push permission on startup (skips silently if disabled)
    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            if (token) setExpoPushToken(token);
        });
    }, []);

    return (
        <NotificationContext.Provider value={{ expoPushToken, notification, requestPermissions }}>
            {children}
        </NotificationContext.Provider>
    );
};
