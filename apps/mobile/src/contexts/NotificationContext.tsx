
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerDeviceToken } from '@/api/notifications';
import { useAuthStore } from '@/stores';
import { useNotificationStore } from '@/stores/notificationStore';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

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

    const registerForPushNotificationsAsync = async () => {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }

            try {
                const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
                if (!projectId || projectId === 'your-project-id') {
                    console.warn('⚠️ [Notifications] EAS projectId not configured — push tokens disabled. Run `npx eas project:init` to set up.');
                    return;
                }
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId,
                })).data;
                console.log('Expo Push Token:', token);
            } catch (e: any) {
                // Don't spam console in Expo Go where push tokens don't work
                if (e?.message?.includes('VALIDATION_ERROR') || e?.message?.includes('Invalid uuid')) {
                    console.warn('⚠️ [Notifications] Push token unavailable (invalid projectId). In-app notifications still work via Supabase Realtime.');
                } else {
                    console.error('Error getting expo push token:', e);
                }
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        return token;
    };

    const requestPermissions = async () => {
        const token = await registerForPushNotificationsAsync();
        setExpoPushToken(token);
        return !!token;
    };

    useEffect(() => {
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
            // Refresh in-app notifications when push received
            fetchNotifications();
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response received:', response);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    // Register token with backend when user logs in and we have a token
    useEffect(() => {
        const registerToken = async () => {
            if (isAuthenticated && user?.id && expoPushToken) {
                try {
                    console.log('Registering device token with backend...');
                    await registerDeviceToken(user.id, expoPushToken, Platform.OS);
                    console.log('Device token registered successfully');
                } catch (error) {
                    console.error('Failed to register device token:', error);
                }
            }
        };

        registerToken();
    }, [isAuthenticated, user?.id, expoPushToken]);

    // Initialize notification store (Hybrid: API fetch + Realtime sub)
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            console.log('🔄 [NotificationContext] Initializing notification store for user:', user.id);
            fetchNotifications();
            subscribeToNotifications(user.id);
        } else {
            unsubscribeFromNotifications();
        }

        return () => {
            unsubscribeFromNotifications();
        };
    }, [isAuthenticated, user?.id]);

    // Initial permission request
    useEffect(() => {
        registerForPushNotificationsAsync().then(token => setExpoPushToken(token));
    }, []);

    return (
        <NotificationContext.Provider value={{ expoPushToken, notification, requestPermissions }}>
            {children}
        </NotificationContext.Provider>
    );
};
