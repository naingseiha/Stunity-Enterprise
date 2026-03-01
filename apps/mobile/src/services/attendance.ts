import tokenService from './token';
import { Config } from '@/config';

const getBaseUrl = () => {
    return Config.attendanceUrl;
};

export interface CheckInLocation {
    latitude: number;
    longitude: number;
}

export const attendanceService = {
    checkIn: async (location: CheckInLocation, session?: 'MORNING' | 'AFTERNOON') => {
        const token = await tokenService.getAccessToken();
        const response = await fetch(`${getBaseUrl()}/attendance/teacher/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...location, session }),
        });

        // Read the text first, in case it's not JSON
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) throw new Error(data.message || 'Check-in failed');
        return data;
    },

    checkOut: async (location: CheckInLocation, session?: 'MORNING' | 'AFTERNOON') => {
        const token = await tokenService.getAccessToken();
        const response = await fetch(`${getBaseUrl()}/attendance/teacher/check-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...location, session }),
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) throw new Error(data.message || 'Check-out failed');
        return data;
    },

    getTodayStatus: async () => {
        const token = await tokenService.getAccessToken();
        const response = await fetch(`${getBaseUrl()}/attendance/teacher/today`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) throw new Error(data.message || 'Failed to fetch status');
        return data;
    },
};
