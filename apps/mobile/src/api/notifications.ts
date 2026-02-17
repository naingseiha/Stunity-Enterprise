
import { notificationApi } from './client';
import { Platform } from 'react-native';

export const registerDeviceToken = async (userId: string, token: string, platform: string) => {
    try {
        const response = await notificationApi.post('/device-token', {
            userId,
            token,
            platform,
        });
        return response.data;
    } catch (error) {
        console.error('Error registering device token:', error);
        throw error;
    }
};
