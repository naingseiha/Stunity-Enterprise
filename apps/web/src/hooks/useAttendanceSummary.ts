'use client';

import useSWR, { preload } from 'swr';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const ATTENDANCE_SUMMARY_CACHE_TTL_MS = 60 * 1000;

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

export interface AttendanceSummaryData {
  stats: AttendanceSummaryStats;
  trend: Array<Record<string, unknown>>;
  topClasses: Array<Record<string, unknown>>;
  atRiskClasses: Array<Record<string, unknown>>;
  recentCheckIns: Array<Record<string, unknown>>;
}

interface AttendanceSummaryResponse {
  success: boolean;
  data: AttendanceSummaryData;
}

function formatLocalDate(value: Date): string {
  return value.toLocaleDateString('en-CA');
}

function getSummaryDates(dateRange: AttendanceSummaryRange) {
  const now = new Date();
  let start = new Date();
  const end = new Date();

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
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
}

function createAttendanceSummaryCacheKey(
  schoolId?: string | null,
  dateRange: AttendanceSummaryRange = 'month'
): string | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  const { startDate, endDate } = getSummaryDates(dateRange);
  return `attendance-summary:${schoolId}:${startDate}:${endDate}`;
}

async function fetchAttendanceSummary(cacheKey: string): Promise<AttendanceSummaryResponse> {
  const [, schoolId, startDate, endDate] = cacheKey.split(':');
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  if (!token || !schoolId || !startDate || !endDate) {
    throw new Error('Missing authentication for attendance summary');
  }

  const response = await fetch(
    `${ATTENDANCE_SERVICE_URL}/attendance/school/summary?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch attendance summary' }));
    throw new Error(error.message || 'Failed to fetch attendance summary');
  }

  const data = await response.json();
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
      dedupingInterval: ATTENDANCE_SUMMARY_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    data: data?.data ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
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
