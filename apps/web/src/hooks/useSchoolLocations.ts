'use client';

import useSWR, { preload } from 'swr';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const SCHOOL_LOCATIONS_CACHE_TTL_MS = 5 * 60 * 1000;

export interface SchoolLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  createdAt: string;
}

interface SchoolLocationsResponse {
  success: boolean;
  data: SchoolLocation[];
}

function getLocationsCacheKey(): string | null {
  if (typeof window === 'undefined') return null;
  return `${ATTENDANCE_SERVICE_URL}/attendance/locations`;
}

async function fetchLocations(url: string): Promise<SchoolLocationsResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch locations' }));
    throw new Error(error.message || 'Failed to fetch locations');
  }

  const data = await response.json();
  writePersistentCache(url, data);
  return data;
}

export function useSchoolLocations() {
  const cacheKey = getLocationsCacheKey();
  const fallbackData = cacheKey
    ? readPersistentCache<SchoolLocationsResponse>(cacheKey, SCHOOL_LOCATIONS_CACHE_TTL_MS)
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<SchoolLocationsResponse>(
    cacheKey,
    fetchLocations,
    {
      dedupingInterval: SCHOOL_LOCATIONS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    locations: data?.data || [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function prefetchSchoolLocations() {
  const cacheKey = getLocationsCacheKey();
  if (cacheKey) {
    preload(cacheKey, fetchLocations);
  }
}
