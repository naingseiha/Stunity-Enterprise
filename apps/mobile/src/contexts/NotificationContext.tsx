
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerDeviceToken, unregisterDeviceToken } from '@/api/notifications';
import { fetchAppSettings } from '@/api/settings';
import { useAuthStore } from '@/stores';
import { useNotificationStore } from '@/stores/notificationStore';
import {
    getAppPreferences,
    saveAppPreferences,
    setAppPreference,
    type AppPreferences,
} from '@/services/appPreferences';

/**
 * Push Notification Configuration
 *
 * Firebase credentials are configured for production builds.
 * Keep this enabled for release binaries; toggle to false only for local troubleshooting.
 */
const PUSH_NOTIFICATIONS_ENABLED = true;

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
    pushNotificationsEnabled: boolean;
    setPushNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
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
    const [pushNotificationsEnabled, setPushNotificationsEnabledState] = useState(true);
    const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
    const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

    const { user, isAuthenticated } = useAuthStore();
    const fetchNotifications = useNotificationStore(state => state.fetchNotifications);
    const subscribeToNotifications = useNotificationStore(state => state.subscribeToNotifications);
    const unsubscribeFromNotifications = useNotificationStore(state => state.unsubscribeFromNotifications);

    const registerForPushNotificationsAsync = async (options: { force?: boolean } = {}): Promise<string | undefined> => {
        // Guard: skip entirely if push notifications are disabled (no real Firebase config)
        if (!PUSH_NOTIFICATIONS_ENABLED) {
            console.log('[Notifications] Push notifications disabled (placeholder google-services.json). In-app notifications work via Supabase Realtime.');
            return undefined;
        }

        const preferences = await getAppPreferences();
        if (!preferences.pushNotifications && !options.force) {
            console.log('[Notifications] Push notifications disabled by user preference.');
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
        const token = await registerForPushNotificationsAsync({ force: true });
        setExpoPushToken(token);
        return !!token;
    };

    const setPushNotificationsEnabled = async (enabled: boolean) => {
        setPushNotificationsEnabledState(enabled);

        if (!enabled) {
            const tokenToRemove = expoPushToken;
            await setAppPreference('pushNotifications', false);
            setExpoPushToken(undefined);

            if (tokenToRemove) {
                try {
                    await unregisterDeviceToken(tokenToRemove);
                } catch (error) {
                    console.warn('[Notifications] Failed to unregister push token:', error);
                }
            }

            return true;
        }

        await setAppPreference('pushNotifications', true);
        const token = await registerForPushNotificationsAsync({ force: true });
        setExpoPushToken(token);

        if (!token) {
            setPushNotificationsEnabledState(false);
            await setAppPreference('pushNotifications', false);
            return false;
        }

        return true;
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
            if (isAuthenticated && user?.id && expoPushToken && pushNotificationsEnabled) {
                try {
                    await registerDeviceToken(user.id, expoPushToken, Platform.OS);
                    console.log('[Notifications] Device token registered');
                } catch (error) {
                    console.error('[Notifications] Failed to register device token:', error);
                }
            }
        };
        registerToken();
    }, [isAuthenticated, user?.id, expoPushToken, pushNotificationsEnabled]);

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

    // Request push permission on startup only if the persisted preference allows it.
    useEffect(() => {
        let mounted = true;

        const hydrateNotificationPreference = async () => {
            let preferences: AppPreferences = await getAppPreferences();

            if (isAuthenticated) {
                try {
                    const remote = await fetchAppSettings();
                    preferences = await saveAppPreferences(remote);
                } catch (error) {
                    console.warn('[Notifications] Failed to sync remote app settings:', error);
                }
            }

            if (!mounted) return;
            setPushNotificationsEnabledState(preferences.pushNotifications);

            if (!preferences.pushNotifications) {
                setExpoPushToken(undefined);
                return;
            }

            const token = await registerForPushNotificationsAsync();
            if (mounted && token) {
                setExpoPushToken(token);
            }
        };

        void hydrateNotificationPreference();

        return () => {
            mounted = false;
        };
    }, [isAuthenticated]);

    return (
        <NotificationContext.Provider value={{
            expoPushToken,
            notification,
            requestPermissions,
            pushNotificationsEnabled,
            setPushNotificationsEnabled,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
