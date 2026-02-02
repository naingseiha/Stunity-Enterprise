'use client';

import useSWR from 'swr';

const CLASS_SERVICE_URL = process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';

export interface Class {
  id: string;
  name: string;
  grade: number;
  section?: string | null;
  track?: string | null;
  academicYearId: string;
  schoolId: string;
  capacity?: number | null;
  room?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  homeroomTeacher?: {
    id: string;
    firstNameLatin: string;
    lastNameLatin: string;
  } | null;
  _count?: {
    students: number;
  };
}

export interface ClassesParams {
  page?: number;
  limit?: number;
  grade?: number;
  academicYearId?: string;
}

interface ClassesResponse {
  success: boolean;
  data: Class[];
}

function createClassesCacheKey(params?: ClassesParams): string | null {
  if (typeof window === 'undefined') return null;
  
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.grade) queryParams.append('grade', params.grade.toString());
  if (params?.academicYearId) queryParams.append('academicYearId', params.academicYearId);
  
  return `${CLASS_SERVICE_URL}/classes/lightweight?${queryParams}`;
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
 */
export function useClasses(params?: ClassesParams) {
  const cacheKey = createClassesCacheKey(params);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<ClassesResponse>(
    cacheKey,
    fetchClasses,
    {
      dedupingInterval: 2 * 60 * 1000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const classes = data?.data || [];
  const pagination = {
    total: classes.length,
    page: params?.page || 1,
    limit: params?.limit || 50,
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
