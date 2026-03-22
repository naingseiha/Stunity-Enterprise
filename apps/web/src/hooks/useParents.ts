'use client';

import useSWR, { preload } from 'swr';
import type { GetParentsParams, ParentDirectoryResponse } from '@/lib/api/parents';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
const PARENTS_CACHE_TTL_MS = 2 * 60 * 1000;

function createParentsCacheKey(params?: GetParentsParams): string | null {
  if (typeof window === 'undefined') return null;

  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);
  if (params?.schoolId) query.append('schoolId', params.schoolId);

  return `${AUTH_SERVICE_URL}/auth/admin/parents?${query.toString()}`;
}

async function fetchParents(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch parents' }));
    throw new Error(error.message || error.error || 'Failed to fetch parents');
  }

  const data = await response.json();
  writePersistentCache(url, data);
  return data;
}

export function useParents(params?: GetParentsParams) {
  const cacheKey = createParentsCacheKey(params);
  const fallbackData = cacheKey
    ? readPersistentCache<ParentDirectoryResponse>(cacheKey, PARENTS_CACHE_TTL_MS)
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ParentDirectoryResponse>(
    cacheKey,
    fetchParents,
    {
      dedupingInterval: PARENTS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    parents: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: 1,
    },
    isLoading,
    isValidating,
    error,
    mutate,
    isEmpty: !isLoading && (data?.data || []).length === 0,
  };
}

export function prefetchParents(params?: GetParentsParams) {
  const cacheKey = createParentsCacheKey(params);
  if (cacheKey) {
    preload(cacheKey, fetchParents);
  }
}
