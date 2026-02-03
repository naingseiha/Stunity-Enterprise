'use client';

import useSWR from 'swr';
import type { Subject, SubjectStatistics } from '@/lib/api/subjects';

const SUBJECT_SERVICE_URL = process.env.NEXT_PUBLIC_SUBJECT_SERVICE_URL || 'http://localhost:3006';

// Re-export types from api/subjects for consistency
export type { Subject, SubjectStatistics } from '@/lib/api/subjects';

export interface SubjectsParams {
  grade?: string;
  track?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
  includeTeachers?: boolean;
}

function createSubjectsCacheKey(params?: SubjectsParams): string | null {
  if (typeof window === 'undefined') return null;
  
  const queryParams = new URLSearchParams();
  if (params?.grade) queryParams.append('grade', params.grade);
  if (params?.track) queryParams.append('track', params.track);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.includeTeachers) queryParams.append('includeTeachers', 'true');
  
  return `${SUBJECT_SERVICE_URL}/subjects${queryParams.toString() ? `?${queryParams}` : ''}`;
}

async function fetchSubjects(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch subjects' }));
    throw new Error(error.message || 'Failed to fetch subjects');
  }

  return response.json();
}

async function fetchStatistics() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const response = await fetch(`${SUBJECT_SERVICE_URL}/subjects/statistics`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch statistics' }));
    throw new Error(error.message || 'Failed to fetch statistics');
  }

  return response.json();
}

/**
 * Enterprise-grade subjects data hook with SWR
 * - Automatic caching & deduplication
 * - Stale-while-revalidate pattern
 * - Background revalidation
 */
export function useSubjects(params?: SubjectsParams) {
  const cacheKey = createSubjectsCacheKey(params);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<Subject[]>(
    cacheKey,
    fetchSubjects,
    {
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const subjects = data || [];

  return {
    subjects,
    isLoading,
    isValidating,
    error,
    mutate,
    isEmpty: !isLoading && subjects.length === 0,
  };
}

/**
 * Hook for fetching subject statistics
 */
export function useSubjectStatistics() {
  const { data, error, isLoading, mutate } = useSWR<SubjectStatistics>(
    typeof window !== 'undefined' ? `${SUBJECT_SERVICE_URL}/subjects/statistics` : null,
    fetchStatistics,
    {
      dedupingInterval: 5 * 60 * 1000, // 5 minutes for stats
      revalidateOnFocus: false,
    }
  );

  return {
    statistics: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Prefetch subjects for instant navigation
 */
export function prefetchSubjects(params?: SubjectsParams) {
  const cacheKey = createSubjectsCacheKey(params);
  if (cacheKey) {
    fetchSubjects(cacheKey).catch(() => {});
  }
}
