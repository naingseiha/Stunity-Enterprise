'use client';

import useSWR, { preload } from 'swr';
import { getAcademicYears, type AcademicYear } from '@/lib/api/academic-years';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const ACADEMIC_YEARS_CACHE_TTL_MS = 5 * 60 * 1000;

function createAcademicYearsCacheKey(schoolId?: string | null): string | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  return `academic-years:${schoolId}`;
}

async function fetchAcademicYears(cacheKey: string): Promise<AcademicYear[]> {
  const schoolId = cacheKey.replace('academic-years:', '');
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  if (!schoolId || !token) {
    throw new Error('Missing authentication for academic years');
  }

  const years = await getAcademicYears(schoolId, token);
  writePersistentCache(cacheKey, years);
  writePersistentCache(`${cacheKey}:current`, years.find((year) => year.isCurrent) ?? null);
  return years;
}

export function useAcademicYearsList(schoolId?: string | null) {
  const cacheKey = createAcademicYearsCacheKey(schoolId);
  const fallbackData = cacheKey
    ? readPersistentCache<AcademicYear[]>(cacheKey, ACADEMIC_YEARS_CACHE_TTL_MS)
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<AcademicYear[]>(
    cacheKey,
    fetchAcademicYears,
    {
      dedupingInterval: ACADEMIC_YEARS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    years: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function prefetchAcademicYears(schoolId?: string | null) {
  const cacheKey = createAcademicYearsCacheKey(schoolId);
  if (cacheKey) {
    preload(cacheKey, fetchAcademicYears);
  }
}
