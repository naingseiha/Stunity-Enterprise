import tokenService from './token';
import { Config } from '@/config';

const getBaseUrl = () => {
    return Config.attendanceUrl;
};

export interface CheckInLocation {
    latitude: number;
    longitude: number;
}

export type TeacherAttendanceMutationOptions = {
    localDate?: string;
    acknowledgeOffSchedule?: boolean;
};

/** Server error payloads often include `code` (e.g. NOT_ON_TIMETABLE) */
export type AttendanceRequestError = Error & { code?: string };

export const NOT_ON_TIMETABLE_CODE = 'NOT_ON_TIMETABLE';

function throwAttendanceFailure(
    responseStatus: number,
    payload: { message?: string; code?: string },
    fallback: string
): never {
    const err = new Error(payload.message || fallback) as AttendanceRequestError;
    if (payload.code) err.code = payload.code;
    err.name = `AttendanceHttp${responseStatus}`;
    throw err;
}

export const attendanceService = {
    checkIn: async (
        location: CheckInLocation,
        session?: 'MORNING' | 'AFTERNOON',
        opts?: TeacherAttendanceMutationOptions
    ) => {
        const token = await tokenService.getAccessToken();
        const body: Record<string, unknown> = {
            ...location,
            ...(session !== undefined ? { session } : {}),
        };
        if (opts?.localDate) body.localDate = opts.localDate;
        if (opts?.acknowledgeOffSchedule) body.acknowledgeOffSchedule = true;

        const response = await fetch(`${getBaseUrl()}/attendance/teacher/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();
        let data: { message?: string; code?: string; success?: boolean };
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Check-in failed');
        }
        return data;
    },

    checkOut: async (
        location: CheckInLocation,
        session?: 'MORNING' | 'AFTERNOON',
        opts?: TeacherAttendanceMutationOptions
    ) => {
        const token = await tokenService.getAccessToken();
        const body: Record<string, unknown> = {
            ...location,
            ...(session !== undefined ? { session } : {}),
        };
        if (opts?.localDate) body.localDate = opts.localDate;
        if (opts?.acknowledgeOffSchedule) body.acknowledgeOffSchedule = true;

        const response = await fetch(`${getBaseUrl()}/attendance/teacher/check-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();
        let data: { message?: string; code?: string; success?: boolean };
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Check-out failed');
        }
        return data;
    },

    requestPermission: async (
        session?: 'MORNING' | 'AFTERNOON',
        reason?: string,
        opts?: TeacherAttendanceMutationOptions
    ) => {
        const token = await tokenService.getAccessToken();
        const body: Record<string, unknown> = {
            ...(session !== undefined ? { session } : {}),
            ...(reason !== undefined ? { reason } : {}),
        };
        if (opts?.localDate) body.localDate = opts.localDate;
        if (opts?.acknowledgeOffSchedule) body.acknowledgeOffSchedule = true;

        const response = await fetch(`${getBaseUrl()}/attendance/teacher/permission-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();
        let data: { message?: string; code?: string; success?: boolean };
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Permission request failed');
        }
        return data;
    },

    getTodayStatus: async (localDate?: string, options?: { bustCache?: boolean }) => {
        const token = await tokenService.getAccessToken();
        const params = new URLSearchParams();
        if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
            params.set('localDate', localDate);
        }
        if (options?.bustCache) {
            params.set('_t', String(Date.now()));
        }
        const qs = params.toString();
        const url = qs
            ? `${getBaseUrl()}/attendance/teacher/today?${qs}`
            : `${getBaseUrl()}/attendance/teacher/today`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Failed to fetch status');
        }
        return data;
    },

    getSummary: async (
        studentId: string,
        startDate?: string,
        endDate?: string,
        options?: { bustCache?: boolean }
    ) => {
        const token = await tokenService.getAccessToken();
        let url = `${getBaseUrl()}/attendance/student/${studentId}/summary`;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (options?.bustCache) params.append('_t', String(Date.now()));
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Failed to fetch summary');
        }
        return data;
    },

    getTeacherSummary: async (
        teacherId: string,
        startDate?: string,
        endDate?: string,
        options?: { bustCache?: boolean }
    ) => {
        const token = await tokenService.getAccessToken();
        let url = `${getBaseUrl()}/attendance/teacher/${teacherId}/summary`;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (options?.bustCache) params.append('_t', String(Date.now()));
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Failed to fetch teacher summary');
        }
        return data;
    },
};
