'use client';

import useSWR, { preload } from 'swr';
import type { Class } from '@/lib/api/classes';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const CLASS_SERVICE_URL = process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';
const CLASSES_CACHE_TTL_MS = 2 * 60 * 1000;

// Re-export Class type from api/classes for consistency
export type { Class } from '@/lib/api/classes';

export interface ClassesParams {
  page?: number;
  limit?: number;
  grade?: number;
  academicYearId?: string;
  search?: string;
}

interface ClassesResponse {
  success: boolean;
  data: Class[];
}

function createClassesCacheKey(params?: ClassesParams): string | null {
  if (typeof window === 'undefined') return null;
  if (!params?.academicYearId) return null; // Don't fetch without academic year
  
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', (params.limit || 100).toString());
  if (params?.grade) queryParams.append('grade', params.grade.toString());
  if (params?.academicYearId) queryParams.append('academicYearId', params.academicYearId);
  if (params?.search && params.search.trim() !== '') {
    queryParams.append('search', params.search.trim());
  }
  
  return `${CLASS_SERVICE_URL}/classes/lightweight?${queryParams}`;
}

// Transform backend response to expected frontend format
function transformClasses(data: any[]): Class[] {
  return (data || []).map((cls: any) => ({
    ...cls,
    // Map _count.studentClasses to _count.students for frontend consistency
    _count: {
      students: cls._count?.studentClasses || cls._count?.students || 0,
    },
    homeroomTeacher: cls.homeroomTeacher ? {
      ...cls.homeroomTeacher,
      id: cls.homeroomTeacher.id,
      firstNameLatin:
        cls.homeroomTeacher.englishFirstName ||
        cls.homeroomTeacher.firstNameLatin ||
        cls.homeroomTeacher.firstName ||
        '',
      lastNameLatin:
        cls.homeroomTeacher.englishLastName ||
        cls.homeroomTeacher.lastNameLatin ||
        cls.homeroomTeacher.lastName ||
        '',
    } : null,
  }));
}

async function fetchClasses(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch classes' }));
    throw new Error(error.message || 'Failed to fetch classes');
  }

  const data = await response.json();
  writePersistentCache(url, data);
  return data;
}

/**
 * Enterprise-grade class data hook with SWR
 * - Automatic caching & deduplication
 * - Stale-while-revalidate pattern
 * - Background revalidation
 */
export function useClasses(params?: ClassesParams) {
  const cacheKey = createClassesCacheKey(params);
  const fallbackData = cacheKey
    ? readPersistentCache<ClassesResponse>(cacheKey, CLASSES_CACHE_TTL_MS)
    : undefined;
  
  const { data, error, isLoading: swrLoading, isValidating, mutate } = useSWR<ClassesResponse>(
    cacheKey,
    fetchClasses,
    {
      dedupingInterval: CLASSES_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const hasFallback = !!fallbackData;
  const resolvedData = data || fallbackData;
  const isLoading = swrLoading && !hasFallback;

  const classes = resolvedData ? transformClasses(resolvedData.data) : [];
  const pagination = {
    total: classes.length,
    page: params?.page || 1,
    limit: params?.limit || 100,
    totalPages: 1,
  };

  return {
    classes,
    pagination,
    isLoading,
    isValidating,
    error,
    mutate,
    isEmpty: !isLoading && classes.length === 0,
  };
}

export function prefetchClasses(params?: ClassesParams) {
  const cacheKey = createClassesCacheKey(params);
  if (cacheKey) {
    preload(cacheKey, fetchClasses);
  }
}
