'use client';

import useSWR, { preload } from 'swr';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const TEACHER_SERVICE_URL = process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004';
const TEACHERS_CACHE_TTL_MS = 2 * 60 * 1000;

export interface Teacher {
  id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  englishFirstName?: string | null;
  englishLastName?: string | null;
  firstNameKhmer?: string | null;
  lastNameKhmer?: string | null;
  khmerName?: string | null;
  firstNameLatin?: string | null;
  lastNameLatin?: string | null;
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
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      englishFirstName: teacher.englishFirstName || regional.englishName?.split(' ')[0] || null,
      englishLastName: teacher.englishLastName || regional.englishName?.split(' ').slice(1).join(' ') || null,
      firstNameKhmer: regional.khmerName || teacher.khmerName || null,
      lastNameKhmer: null,
      khmerName: regional.khmerName || teacher.khmerName || null,
      firstNameLatin: regional.englishName?.split(' ')[0] || teacher.firstName || '',
      lastNameLatin: regional.englishName?.split(' ').slice(1).join(' ') || teacher.lastName || '',
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
  queryParams.append('includeRelations', '0');
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

  const data = await response.json();
  writePersistentCache(url, data);
  return data;
}

/**
 * Enterprise-grade teacher data hook with SWR
 */
export function useTeachers(params?: TeachersParams) {
  const cacheKey = createTeachersCacheKey(params);
  const fallbackData = readPersistentCache<TeachersResponse>(cacheKey, TEACHERS_CACHE_TTL_MS);

  const { data, error, isLoading, isValidating, mutate } = useSWR<TeachersResponse>(
    cacheKey,
    fetchTeachers,
    {
      dedupingInterval: TEACHERS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
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
    preload(cacheKey, fetchTeachers);
  }
}
