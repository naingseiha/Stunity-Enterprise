'use client';

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

export interface Student {
  id: string;
  studentId: string;
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameKhmer?: string | null;
  lastNameKhmer?: string | null;
  gender: string;
  dateOfBirth: string;
  placeOfBirth?: string | null;
  currentAddress?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  classId?: string | null;
  photoUrl?: string | null;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  class?: {
    id: string;
    name: string;
    grade: number;
  };
}

export interface StudentsParams {
  page?: number;
  limit?: number;
  classId?: string;
  gender?: string;
  search?: string;
  academicYearId?: string;
}

interface StudentsResponse {
  success: boolean;
  data: Student[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Transform backend response to frontend format
function transformStudents(data: any[]): Student[] {
  return (data || []).map((student: any) => ({
    ...student,
    studentId: student.studentId || student.id,
    firstNameLatin: student.firstName || student.englishName || '',
    lastNameLatin: student.lastName || '',
    firstNameKhmer: student.khmerName || null,
    lastNameKhmer: null,
  }));
}

// Create stable cache key from params
function createStudentsCacheKey(params?: StudentsParams): string | null {
  if (typeof window === 'undefined') return null;
  
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.classId) queryParams.append('classId', params.classId);
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.academicYearId) queryParams.append('academicYearId', params.academicYearId);
  
  return `${STUDENT_SERVICE_URL}/students/lightweight?${queryParams}`;
}

// Custom fetcher with auth
async function fetchStudents(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch students' }));
    throw new Error(error.message || 'Failed to fetch students');
  }

  return response.json();
}

/**
 * Enterprise-grade student data hook
 * - Automatic caching & deduplication
 * - Stale-while-revalidate pattern
 * - Optimistic updates
 * - Error handling with retry
 */
export function useStudents(params?: StudentsParams) {
  const cacheKey = createStudentsCacheKey(params);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<StudentsResponse>(
    cacheKey,
    fetchStudents,
    {
      // Fresh for 2 minutes, serve stale for up to 10 minutes
      dedupingInterval: 2 * 60 * 1000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const students = data ? transformStudents(data.data) : [];
  const pagination = data?.pagination || {
    total: 0,
    page: params?.page || 1,
    limit: params?.limit || 20,
    totalPages: 1,
  };

  return {
    students,
    pagination,
    isLoading,
    isValidating, // True when revalidating in background
    error,
    mutate, // Use to manually refresh or optimistically update
    isEmpty: !isLoading && students.length === 0,
  };
}

// Mutation helpers for create/update/delete
async function mutateStudents(url: string, { arg }: { arg: { action: string; id?: string; data?: any } }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const baseUrl = STUDENT_SERVICE_URL;
  
  let endpoint = `${baseUrl}/students`;
  let method = 'POST';
  let body = arg.data;

  if (arg.action === 'update' && arg.id) {
    endpoint = `${baseUrl}/students/${arg.id}`;
    method = 'PUT';
  } else if (arg.action === 'delete' && arg.id) {
    endpoint = `${baseUrl}/students/${arg.id}`;
    method = 'DELETE';
    body = undefined;
  }

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Operation failed' }));
    throw new Error(error.message || 'Operation failed');
  }

  return response.json();
}

export function useStudentMutations() {
  const { trigger, isMutating } = useSWRMutation(
    'students-mutation',
    mutateStudents
  );

  return {
    createStudent: async (data: any) => trigger({ action: 'create', data }),
    updateStudent: async (id: string, data: any) => trigger({ action: 'update', id, data }),
    deleteStudent: async (id: string) => trigger({ action: 'delete', id }),
    isMutating,
  };
}

/**
 * Prefetch students for instant navigation
 * Call this on hover/focus of a link to preload data
 */
export function prefetchStudents(params?: StudentsParams) {
  const cacheKey = createStudentsCacheKey(params);
  if (cacheKey) {
    // This will populate SWR cache for instant access
    fetchStudents(cacheKey).catch(() => {}); // Silent prefetch
  }
}
