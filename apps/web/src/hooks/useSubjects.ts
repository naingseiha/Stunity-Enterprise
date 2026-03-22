'use client';

import useSWR, { preload } from 'swr';
import type { Subject, SubjectStatistics } from '@/lib/api/subjects';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const SUBJECT_SERVICE_URL = process.env.NEXT_PUBLIC_SUBJECT_SERVICE_URL || 'http://localhost:3006';
const SUBJECTS_CACHE_TTL_MS = 2 * 60 * 1000;
const SUBJECT_STATS_CACHE_TTL_MS = 5 * 60 * 1000;

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

  const data = await response.json();
  writePersistentCache(url, data);
  return data;
}

const SUBJECT_STATS_KEY = `${SUBJECT_SERVICE_URL}/subjects/statistics`;

async function fetchStatistics() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const response = await fetch(SUBJECT_STATS_KEY, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch statistics' }));
    throw new Error(error.message || 'Failed to fetch statistics');
  }

  const data = await response.json();
  writePersistentCache(SUBJECT_STATS_KEY, data);
  return data;
}

/**
 * Enterprise-grade subjects data hook with SWR
 * - Automatic caching & deduplication
 * - Stale-while-revalidate pattern
 * - Background revalidation
 */
export function useSubjects(params?: SubjectsParams) {
  const cacheKey = createSubjectsCacheKey(params);
  const fallbackData = cacheKey
    ? readPersistentCache<Subject[]>(cacheKey, SUBJECTS_CACHE_TTL_MS)
    : undefined;
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<Subject[]>(
    cacheKey,
    fetchSubjects,
    {
      dedupingInterval: SUBJECTS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
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
  const fallbackData = readPersistentCache<SubjectStatistics>(SUBJECT_STATS_KEY, SUBJECT_STATS_CACHE_TTL_MS);
  const { data, error, isLoading, mutate } = useSWR<SubjectStatistics>(
    typeof window !== 'undefined' ? SUBJECT_STATS_KEY : null,
    fetchStatistics,
    {
      dedupingInterval: SUBJECT_STATS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      fallbackData,
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
    preload(cacheKey, fetchSubjects);
  }
}
