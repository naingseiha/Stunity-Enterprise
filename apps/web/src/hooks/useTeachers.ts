'use client';

import useSWR from 'swr';

const TEACHER_SERVICE_URL = process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004';

export interface Teacher {
  id: string;
  teacherId: string;
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameKhmer?: string | null;
  lastNameKhmer?: string | null;
  gender: string;
  dateOfBirth: string;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate: string;
  position?: string | null;
  department?: string | null;
  salary?: number | null;
  photoUrl?: string | null;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subjects?: Array<{ id: string; name: string }>;
  classes?: Array<{ id: string; name: string; grade: number }>;
}

export interface TeachersParams {
  page?: number;
  limit?: number;
  gender?: string;
  search?: string;
  academicYearId?: string;
}

interface TeachersResponse {
  success: boolean;
  data: Teacher[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function transformTeachers(data: any[]): Teacher[] {
  return (data || []).map((teacher: any) => {
    // Flatten regional fields from customFields if they exist
    const regional = teacher.customFields?.regional || {};

    return {
      ...teacher,
      ...regional,
      teacherId: teacher.employeeId || teacher.teacherId || teacher.id,
      firstNameLatin: teacher.firstName || regional.englishName?.split(' ')[0] || '',
      lastNameLatin: teacher.lastName || regional.englishName?.split(' ').slice(1).join(' ') || '',
      firstNameKhmer: regional.khmerName || teacher.khmerName || null,
      lastNameKhmer: null,
      phoneNumber: teacher.phone || teacher.phoneNumber || null,
      position: regional.position || teacher.position || null,
    };
  });
}

function createTeachersCacheKey(params?: TeachersParams): string {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.academicYearId) queryParams.append('academicYearId', params.academicYearId);
  return `${TEACHER_SERVICE_URL}/teachers/lightweight?${queryParams}`;
}

async function fetchTeachers(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch teachers' }));
    throw new Error(error.message || 'Failed to fetch teachers');
  }

  return response.json();
}

/**
 * Enterprise-grade teacher data hook with SWR
 */
export function useTeachers(params?: TeachersParams) {
  const cacheKey = createTeachersCacheKey(params);

  const { data, error, isLoading, isValidating, mutate } = useSWR<TeachersResponse>(
    cacheKey,
    fetchTeachers,
    {
      dedupingInterval: 2 * 60 * 1000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const rawData = Array.isArray(data?.data) ? data.data : [];
  const teachers = data ? transformTeachers(rawData) : [];
  const pagination = data?.pagination || {
    total: teachers.length,
    page: params?.page || 1,
    limit: params?.limit || 20,
    totalPages: Math.max(1, Math.ceil(teachers.length / (params?.limit || 20))),
  };

  return {
    teachers,
    pagination,
    isLoading,
    isValidating,
    error,
    mutate,
    isEmpty: !isLoading && teachers.length === 0,
  };
}

export function prefetchTeachers(params?: TeachersParams) {
  const cacheKey = createTeachersCacheKey(params);
  if (cacheKey) {
    fetchTeachers(cacheKey).catch(() => { });
  }
}
