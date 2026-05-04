import tokenService from './token';
import { Config } from '@/config';

/** Normalize base URL (avoids double slashes if env has a trailing `/`). */
const getBaseUrl = () => String(Config.attendanceUrl || '').replace(/\/+$/, '');

/** Max time to wait for attendance API (slow networks / cold starts). */
const READ_TIMEOUT_MS = 28_000;
const MUTATION_TIMEOUT_MS = 45_000;

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
export const REQUEST_TIMEOUT_CODE = 'REQUEST_TIMEOUT';

function isAbortLike(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    if (error.name === 'AbortError') return true;
    const code = (error as { code?: unknown }).code;
    return code === 20 || code === 'ABORT_ERR';
}

function timeoutSignal(ms: number): { signal: AbortSignal; cleanup?: () => void } {
    try {
        const Ab = typeof AbortSignal !== 'undefined' ? AbortSignal : null;
        if (Ab && typeof (Ab as unknown as { timeout?: (n: number) => AbortSignal }).timeout === 'function') {
            return { signal: (Ab as unknown as { timeout: (n: number) => AbortSignal }).timeout(ms) };
        }
    } catch {
        /* noop */
    }
    const c = new AbortController();
    const id = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, cleanup: () => clearTimeout(id) };
}

async function fetchAttendance(
    path: string,
    init: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const { signal, cleanup } = timeoutSignal(timeoutMs);
    try {
        return await fetch(`${getBaseUrl()}${path}`, {
            ...init,
            signal,
        });
    } catch (e) {
        if (isAbortLike(e)) {
            const err = new Error('Request timed out') as AttendanceRequestError;
            err.code = REQUEST_TIMEOUT_CODE;
            err.name = 'AttendanceTimeout';
            throw err;
        }
        throw e;
    } finally {
        cleanup?.();
    }
}

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

async function parseJsonBody(
    response: Response
): Promise<{ data: { message?: string; code?: string; success?: boolean; [k: string]: unknown } }> {
    const text = await response.text();
    try {
        const data = JSON.parse(text) as {
            message?: string;
            code?: string;
            success?: boolean;
            [k: string]: unknown;
        };
        return { data };
    } catch {
        const preview = text.replace(/\s+/g, ' ').trim().slice(0, 160);
        throw new Error(
            preview ? `Invalid response from server: ${preview}` : 'Server returned an invalid response.'
        );
    }
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

        const response = await fetchAttendance(
            '/attendance/teacher/check-in',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            },
            MUTATION_TIMEOUT_MS
        );

        const { data } = await parseJsonBody(response);

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

        const response = await fetchAttendance(
            '/attendance/teacher/check-out',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            },
            MUTATION_TIMEOUT_MS
        );

        const { data } = await parseJsonBody(response);

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

        const response = await fetchAttendance(
            '/attendance/teacher/permission-request',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            },
            MUTATION_TIMEOUT_MS
        );

        const { data } = await parseJsonBody(response);

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
        const path = qs ? `/attendance/teacher/today?${qs}` : '/attendance/teacher/today';

        const response = await fetchAttendance(
            path,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            READ_TIMEOUT_MS
        );

        const { data } = await parseJsonBody(response);

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Failed to fetch status');
        }
        return data as {
            success?: boolean;
            data?: unknown;
            message?: string;
        };
    },

    getSummary: async (
        studentId: string,
        startDate?: string,
        endDate?: string,
        options?: { bustCache?: boolean }
    ) => {
        const token = await tokenService.getAccessToken();
        let path = `/attendance/student/${studentId}/summary`;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (options?.bustCache) params.append('_t', String(Date.now()));
        if (params.toString()) path += `?${params.toString()}`;

        const response = await fetchAttendance(
            path,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            READ_TIMEOUT_MS
        );

        const { data } = await parseJsonBody(response);

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Failed to fetch summary');
        }
        return data as {
            success?: boolean;
            data?: unknown;
            message?: string;
        };
    },

    getTeacherSummary: async (
        teacherId: string,
        startDate?: string,
        endDate?: string,
        options?: { bustCache?: boolean }
    ) => {
        const token = await tokenService.getAccessToken();
        let path = `/attendance/teacher/${teacherId}/summary`;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (options?.bustCache) params.append('_t', String(Date.now()));
        if (params.toString()) path += `?${params.toString()}`;

        const response = await fetchAttendance(
            path,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            READ_TIMEOUT_MS
        );

        const { data } = await parseJsonBody(response);

        if (!response.ok) {
            throwAttendanceFailure(response.status, data, 'Failed to fetch teacher summary');
        }
        return data as {
            success?: boolean;
            data?: unknown;
            message?: string;
        };
    },
};
