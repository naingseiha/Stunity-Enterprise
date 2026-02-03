'use client';

import useSWR from 'swr';
import type { Class } from '@/lib/api/classes';

const CLASS_SERVICE_URL = process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';

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
  if (params?.search) queryParams.append('search', params.search);
  
  return `${CLASS_SERVICE_URL}/classes/lightweight?${queryParams}`;
}

// Transform backend response to expected frontend format
function transformClasses(data: any[]): Class[] {
  return (data || []).map((cls: any) => ({
    ...cls,
    homeroomTeacher: cls.homeroomTeacher ? {
      id: cls.homeroomTeacher.id,
      firstNameLatin: cls.homeroomTeacher.firstName || cls.homeroomTeacher.firstNameLatin || '',
      lastNameLatin: cls.homeroomTeacher.lastName || cls.homeroomTeacher.lastNameLatin || '',
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

  return response.json();
}

/**
 * Enterprise-grade class data hook with SWR
 * - Automatic caching & deduplication
 * - Stale-while-revalidate pattern
 * - Background revalidation
 */
export function useClasses(params?: ClassesParams) {
  const cacheKey = createClassesCacheKey(params);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<ClassesResponse>(
    cacheKey,
    fetchClasses,
    {
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const classes = data ? transformClasses(data.data) : [];
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
    fetchClasses(cacheKey).catch(() => {});
  }
}
