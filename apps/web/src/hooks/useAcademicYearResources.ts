'use client';

import useSWR, { preload } from 'swr';
import { SCHOOL_SERVICE_URL } from '@/lib/api/config';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const ACADEMIC_YEAR_RESOURCE_CACHE_TTL_MS = 5 * 60 * 1000;
const ACADEMIC_YEAR_TEMPLATE_CACHE_TTL_MS = 10 * 60 * 1000;
const SETUP_TEMPLATES_CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchAcademicYearResource<T>(url: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch academic year resource' }));
    throw new Error(error.error || error.message || 'Failed to fetch academic year resource');
  }

  const data = (await response.json()) as T;
  writePersistentCache(url, data);
  return data;
}

function createAcademicYearDetailCacheKey(schoolId?: string | null, yearId?: string | null): string | null {
  if (typeof window === 'undefined' || !schoolId || !yearId) return null;
  return `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${yearId}/comprehensive`;
}

function createAcademicCalendarCacheKey(schoolId?: string | null, yearId?: string | null): string | null {
  if (typeof window === 'undefined' || !schoolId || !yearId) return null;
  return `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${yearId}/calendar`;
}

function createAcademicYearTemplateCacheKey(schoolId?: string | null, yearId?: string | null): string | null {
  if (typeof window === 'undefined' || !schoolId || !yearId) return null;
  return `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${yearId}/template`;
}

function createAcademicYearComparisonCacheKey(schoolId?: string | null): string | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  return `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/comparison?yearIds=all`;
}

function createSetupTemplatesCacheKey(schoolId?: string | null): string | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  return `${SCHOOL_SERVICE_URL}/schools/${schoolId}/setup-templates`;
}

export function useAcademicYearDetail<T = unknown>(schoolId?: string | null, yearId?: string | null) {
  const cacheKey = createAcademicYearDetailCacheKey(schoolId, yearId);
  const fallbackData = cacheKey
    ? readPersistentCache<{ success: boolean; data: T }>(
        cacheKey,
        ACADEMIC_YEAR_RESOURCE_CACHE_TTL_MS
      )
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ success: boolean; data: T }>(
    cacheKey,
    fetchAcademicYearResource,
    {
      dedupingInterval: ACADEMIC_YEAR_RESOURCE_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    data: data?.data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useAcademicCalendar<T = unknown>(schoolId?: string | null, yearId?: string | null) {
  const cacheKey = createAcademicCalendarCacheKey(schoolId, yearId);
  const fallbackData = cacheKey
    ? readPersistentCache<{ success: boolean; data: T }>(
        cacheKey,
        ACADEMIC_YEAR_RESOURCE_CACHE_TTL_MS
      )
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ success: boolean; data: T }>(
    cacheKey,
    fetchAcademicYearResource,
    {
      dedupingInterval: ACADEMIC_YEAR_RESOURCE_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    data: data?.data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useAcademicYearTemplate<T = unknown>(schoolId?: string | null, yearId?: string | null) {
  const cacheKey = createAcademicYearTemplateCacheKey(schoolId, yearId);
  const fallbackData = cacheKey
    ? readPersistentCache<{ success: boolean; data: T }>(
        cacheKey,
        ACADEMIC_YEAR_TEMPLATE_CACHE_TTL_MS
      )
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ success: boolean; data: T }>(
    cacheKey,
    fetchAcademicYearResource,
    {
      dedupingInterval: ACADEMIC_YEAR_TEMPLATE_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    data: data?.data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useAcademicYearComparison<T = unknown>(schoolId?: string | null) {
  const cacheKey = createAcademicYearComparisonCacheKey(schoolId);
  const fallbackData = cacheKey
    ? readPersistentCache<{ success: boolean; data: T }>(
        cacheKey,
        ACADEMIC_YEAR_RESOURCE_CACHE_TTL_MS
      )
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ success: boolean; data: T }>(
    cacheKey,
    fetchAcademicYearResource,
    {
      dedupingInterval: ACADEMIC_YEAR_RESOURCE_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    data: data?.data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useSetupTemplates<T = unknown>(schoolId?: string | null) {
  const cacheKey = createSetupTemplatesCacheKey(schoolId);
  const fallbackData = cacheKey
    ? readPersistentCache<{ success: boolean; data: T }>(
        cacheKey,
        SETUP_TEMPLATES_CACHE_TTL_MS
      )
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ success: boolean; data: T }>(
    cacheKey,
    fetchAcademicYearResource,
    {
      dedupingInterval: SETUP_TEMPLATES_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    data: data?.data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function prefetchAcademicYearDetail(schoolId?: string | null, yearId?: string | null) {
  const cacheKey = createAcademicYearDetailCacheKey(schoolId, yearId);
  if (cacheKey) {
    preload(cacheKey, fetchAcademicYearResource);
  }
}

export function prefetchAcademicCalendar(schoolId?: string | null, yearId?: string | null) {
  const cacheKey = createAcademicCalendarCacheKey(schoolId, yearId);
  if (cacheKey) {
    preload(cacheKey, fetchAcademicYearResource);
  }
}

export function prefetchAcademicYearTemplate(schoolId?: string | null, yearId?: string | null) {
  const cacheKey = createAcademicYearTemplateCacheKey(schoolId, yearId);
  if (cacheKey) {
    preload(cacheKey, fetchAcademicYearResource);
  }
}

export function prefetchAcademicYearComparison(schoolId?: string | null) {
  const cacheKey = createAcademicYearComparisonCacheKey(schoolId);
  if (cacheKey) {
    preload(cacheKey, fetchAcademicYearResource);
  }
}

export function prefetchSetupTemplates(schoolId?: string | null) {
  const cacheKey = createSetupTemplatesCacheKey(schoolId);
  if (cacheKey) {
    preload(cacheKey, fetchAcademicYearResource);
  }
}
