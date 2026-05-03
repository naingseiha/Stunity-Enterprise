'use client';

import { useCallback } from 'react';
import useSWR, { preload } from 'swr';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import { readPersistentCache, removePersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const ATTENDANCE_SUMMARY_CACHE_TTL_MS = 60 * 1000;
const ATTENDANCE_SWR_DEDUP_MS = 5000;

export type AttendanceSummaryRange = 'day' | 'week' | 'month' | 'semester';

interface AttendanceSummaryStats {
  studentCount: number;
  teacherCount?: number;
  classCount?: number;
  attendanceRate: number;
  teacherAttendanceRate?: number;
  totals: {
    present: number;
    absent: number;
    late: number;
    excused?: number;
    permission?: number;
  };
  teacherTotals?: {
    present: number;
    absent: number;
    permission?: number;
  };
  sessions?: Record<string, { present: number; absent: number; late: number; total: number }>;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface AttendanceSummaryData {
  stats: AttendanceSummaryStats;
  trend: AttendanceTrendPoint[];
  topClasses: Array<Record<string, unknown>>;
  atRiskClasses: Array<Record<string, unknown>>;
  recentCheckIns: Array<Record<string, unknown>>;
}

interface AttendanceSummaryResponse {
  success: boolean;
  data: AttendanceSummaryData;
}

export function formatLocalDateEnCa(value: Date): string {
  return value.toLocaleDateString('en-CA');
}

/** Mirrors dashboard date-range chips — used by summary cache keys and CSV exports */
export function getAttendanceSummaryDateRange(
  dateRange: AttendanceSummaryRange,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  let start = new Date(now);
  const end = new Date(now);

  if (dateRange === 'day') {
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'week') {
    const mondayBase = new Date(now);
    const day = mondayBase.getDay();
    const diff = mondayBase.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(mondayBase.setDate(diff));
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'semester') {
    start = new Date(now);
    start.setMonth(now.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    startDate: formatLocalDateEnCa(start),
    endDate: formatLocalDateEnCa(end),
  };
}

export function createAttendanceSummaryCacheKey(
  schoolId?: string | null,
  dateRange: AttendanceSummaryRange = 'month'
): string | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  const { startDate, endDate } = getAttendanceSummaryDateRange(dateRange);
  return `attendance-summary:${schoolId}:${startDate}:${endDate}`;
}

function parseAttendanceSummaryCacheKey(
  cacheKey: string
): { schoolId: string; startDate: string; endDate: string } | null {
  const prefix = 'attendance-summary:';
  if (!cacheKey.startsWith(prefix)) return null;
  const rest = cacheKey.slice(prefix.length);
  const firstColon = rest.indexOf(':');
  if (firstColon <= 0) return null;
  const schoolId = rest.slice(0, firstColon);
  const restDates = rest.slice(firstColon + 1);
  const secondColon = restDates.indexOf(':');
  if (secondColon <= 0) return null;
  const startDate = restDates.slice(0, secondColon);
  const endDate = restDates.slice(secondColon + 1);
  if (!schoolId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return null;
  }
  return { schoolId, startDate, endDate };
}

async function fetchAttendanceSummaryResponse(
  schoolId: string,
  startDate: string,
  endDate: string,
  bypassServerCache: boolean
): Promise<AttendanceSummaryResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  if (!token || !schoolId || !startDate || !endDate) {
    throw new Error('Missing authentication for attendance summary');
  }

  const fresh = bypassServerCache ? '&fresh=1' : '';
  const response = await fetch(
    `${ATTENDANCE_SERVICE_URL}/attendance/school/summary?startDate=${startDate}&endDate=${endDate}${fresh}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    let message = 'Failed to fetch attendance summary';
    if (response.status === 401 || response.status === 403) {
      message = 'Session expired — please sign in again.';
    } else if (response.status === 404) {
      message = 'Attendance data was not found for your school.';
    } else if (response.status >= 500) {
      message = 'Attendance service is unavailable. Please retry shortly.';
    }
    try {
      const ct = response.headers.get('content-type');
      if (ct?.includes('application/json')) {
        const body = (await response.json()) as { message?: string };
        if (body?.message && typeof body.message === 'string') {
          message = body.message;
        }
      }
    } catch {
      /* keep derived message */
    }
    throw new Error(message);
  }

  const data = (await response.json()) as AttendanceSummaryResponse;
  return data;
}

async function fetchAttendanceSummary(cacheKey: string): Promise<AttendanceSummaryResponse> {
  const parsed = parseAttendanceSummaryCacheKey(cacheKey);
  if (!parsed) {
    throw new Error('Invalid attendance summary cache key');
  }
  const data = await fetchAttendanceSummaryResponse(
    parsed.schoolId,
    parsed.startDate,
    parsed.endDate,
    false
  );
  writePersistentCache(cacheKey, data);
  return data;
}

export function useAttendanceSummary(
  schoolId?: string | null,
  dateRange: AttendanceSummaryRange = 'month'
) {
  const cacheKey = createAttendanceSummaryCacheKey(schoolId, dateRange);
  const fallbackData = cacheKey
    ? readPersistentCache<AttendanceSummaryResponse>(cacheKey, ATTENDANCE_SUMMARY_CACHE_TTL_MS)
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<AttendanceSummaryResponse>(
    cacheKey,
    fetchAttendanceSummary,
    {
      dedupingInterval: ATTENDANCE_SWR_DEDUP_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
      fallbackData,
    }
  );

  const refresh = useCallback(async () => {
    if (!cacheKey) return undefined;
    removePersistentCache(cacheKey);
    const parsed = parseAttendanceSummaryCacheKey(cacheKey);
    if (!parsed) return undefined;
    const next = await fetchAttendanceSummaryResponse(
      parsed.schoolId,
      parsed.startDate,
      parsed.endDate,
      true
    );
    writePersistentCache(cacheKey, next);
    await mutate(next, { revalidate: false });
    return next.data;
  }, [cacheKey, mutate]);

  return {
    data: data?.data ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
    refresh,
  };
}

export function prefetchAttendanceSummary(
  schoolId?: string | null,
  dateRange: AttendanceSummaryRange = 'month'
) {
  const cacheKey = createAttendanceSummaryCacheKey(schoolId, dateRange);
  if (cacheKey) {
    preload(cacheKey, fetchAttendanceSummary);
  }
}
