'use client';

import useSWR from 'swr';
import type { GetParentsParams, ParentDirectoryResponse } from '@/lib/api/parents';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

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

  return response.json();
}

export function useParents(params?: GetParentsParams) {
  const cacheKey = createParentsCacheKey(params);

  const { data, error, isLoading, isValidating, mutate } = useSWR<ParentDirectoryResponse>(
    cacheKey,
    fetchParents,
    {
      dedupingInterval: 2 * 60 * 1000,
      revalidateOnFocus: false,
      keepPreviousData: true,
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
