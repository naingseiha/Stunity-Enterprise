'use client';

import useSWR, { preload } from 'swr';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';
import {
  getSuperAdminDashboardStats,
  getSuperAdminSchools,
  getSuperAdminSchoolOptions,
  getSuperAdminUsers,
  getSuperAdminPosts,
  getSuperAdminAnalytics,
  getSuperAdminAuditLogs,
  getSuperAdminAuditLogRetentionPolicy,
  getSuperAdminFeatureFlags,
  getSuperAdminAnnouncements,
  getSuperAdminDashboardHealth,
  getSuperAdminSchoolDetail,
  getSuperAdminUserDetail,
  type SuperAdminStats,
  type SuperAdminSchool,
  type SuperAdminUser,
  type ModerationPost,
  type SuperAdminAnalytics,
  type PlatformAuditLog,
  type AuditLogRetentionPolicy,
  type FeatureFlag,
  type PlatformAnnouncement,
  type SuperAdminHealth,
  type SuperAdminSchoolDetail,
  type SuperAdminUserDetail,
} from '@/lib/api/super-admin';

const CACHE_TTL_MS = 2 * 60 * 1000;
const OPTIONS_CACHE_TTL_MS = 5 * 60 * 1000;

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

function cacheKey(parts: Array<string | number | undefined | null>): string {
  return parts.map((p) => (p === undefined || p === null || p === '' ? '_' : String(p))).join(':');
}

async function withPersistentCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const data = await fetcher();
  writePersistentCache(key, data);
  return data;
}

function useCachedSWR<T>(key: string | null, fetcher: () => Promise<T>, ttl = CACHE_TTL_MS) {
  const fallbackData = key ? readPersistentCache<T>(key, ttl) : undefined;
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    key,
    () => withPersistentCache(key!, fetcher),
    {
      dedupingInterval: ttl,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      keepPreviousData: true,
      fallbackData,
    }
  );

  return {
    data: data ?? fallbackData,
    error,
    isLoading: isLoading && !fallbackData,
    isValidating,
    mutate,
  };
}

export function useSuperAdminDashboard() {
  const key = 'super-admin:dashboard-stats';
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<SuperAdminStats>(
    key,
    async () => (await getSuperAdminDashboardStats()).data
  );

  return { stats: data ?? null, error, isLoading, isValidating, mutate };
}

export function prefetchSuperAdminDashboard() {
  const key = 'super-admin:dashboard-stats';
  preload(key, () => withPersistentCache(key, async () => (await getSuperAdminDashboardStats()).data));
}

export interface SuperAdminSchoolsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'pending';
  disabled?: boolean;
}

export function useSuperAdminSchools(params: SuperAdminSchoolsParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const search = params.search?.trim() || '';
  const status = params.status ?? 'all';
  const key = params.disabled
    ? null
    : cacheKey(['super-admin:schools', page, limit, search, status]);

  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<{
    schools: SuperAdminSchool[];
    pagination: Pagination;
  }>(key, async () => {
    const res = await getSuperAdminSchools({
      page,
      limit,
      search: search || undefined,
      status,
    });
    return res.data;
  });

  return {
    schools: data?.schools ?? [],
    pagination: data?.pagination ?? { ...emptyPagination, page, limit },
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/** Lightweight {id,name} list for filter dropdowns — shared across pages via SWR. */
export function useSuperAdminSchoolOptions(disabled = false) {
  const key = disabled ? null : 'super-admin:school-options';
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<
    Array<{ id: string; name: string }>
  >(
    key,
    async () => (await getSuperAdminSchoolOptions()).data,
    OPTIONS_CACHE_TTL_MS
  );

  return {
    schools: data ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export interface SuperAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  role?: string;
  disabled?: boolean;
}

export function useSuperAdminUsers(params: SuperAdminUsersParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const search = params.search?.trim() || '';
  const schoolId = params.schoolId || '';
  const role = params.role || '';
  const key = params.disabled
    ? null
    : cacheKey(['super-admin:users', page, limit, search, schoolId, role]);

  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<{
    users: SuperAdminUser[];
    pagination: Pagination;
  }>(key, async () => {
    const res = await getSuperAdminUsers({
      page,
      limit,
      search: search || undefined,
      schoolId: schoolId || undefined,
      role: role || undefined,
    });
    return res.data;
  });

  return {
    users: data?.users ?? [],
    pagination: data?.pagination ?? { ...emptyPagination, page, limit },
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export interface SuperAdminPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  disabled?: boolean;
}

export function useSuperAdminPosts(params: SuperAdminPostsParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const search = params.search?.trim() || '';
  const schoolId = params.schoolId || '';
  const key = params.disabled
    ? null
    : cacheKey(['super-admin:posts', page, limit, search, schoolId]);

  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<{
    posts: ModerationPost[];
    pagination: Pagination;
  }>(key, async () => {
    const res = await getSuperAdminPosts({
      page,
      limit,
      search: search || undefined,
      schoolId: schoolId || undefined,
    });
    return res.data;
  });

  return {
    posts: data?.posts ?? [],
    pagination: data?.pagination ?? { ...emptyPagination, page, limit },
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function useSuperAdminAnalytics(months = 12) {
  const key = cacheKey(['super-admin:analytics', months]);
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<SuperAdminAnalytics>(
    key,
    async () => (await getSuperAdminAnalytics(months)).data
  );

  return { analytics: data ?? null, error, isLoading, isValidating, mutate };
}

export interface SuperAdminAuditLogsParams {
  page?: number;
  limit?: number;
  resourceType?: string;
  action?: string;
  disabled?: boolean;
}

export function useSuperAdminAuditLogs(params: SuperAdminAuditLogsParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const resourceType = params.resourceType || '';
  const action = params.action || '';
  const key = params.disabled
    ? null
    : cacheKey(['super-admin:audit-logs', page, limit, resourceType, action]);

  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<{
    logs: PlatformAuditLog[];
    pagination: Pagination;
  }>(key, async () => {
    const res = await getSuperAdminAuditLogs({
      page,
      limit,
      resourceType: resourceType || undefined,
      action: action || undefined,
    });
    return res.data;
  });

  return {
    logs: data?.logs ?? [],
    pagination: data?.pagination ?? { ...emptyPagination, page, limit },
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function useSuperAdminAuditRetentionPolicy() {
  const key = 'super-admin:audit-retention';
  const { data, error, isLoading, mutate } = useCachedSWR<AuditLogRetentionPolicy>(
    key,
    async () => (await getSuperAdminAuditLogRetentionPolicy()).data,
    OPTIONS_CACHE_TTL_MS
  );

  return { retentionPolicy: data ?? null, error, isLoading, mutate };
}

export function useSuperAdminFeatureFlags(scope?: 'platform' | 'school') {
  const key = cacheKey(['super-admin:feature-flags', scope || 'all']);
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<FeatureFlag[]>(
    key,
    async () => (await getSuperAdminFeatureFlags(scope)).data
  );

  return { flags: data ?? [], error, isLoading, isValidating, mutate };
}

export function useSuperAdminAnnouncements() {
  const key = 'super-admin:announcements';
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<PlatformAnnouncement[]>(
    key,
    async () => (await getSuperAdminAnnouncements()).data
  );

  return { announcements: data ?? [], error, isLoading, isValidating, mutate };
}

export function useSuperAdminHealth() {
  const key = 'super-admin:health';
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<SuperAdminHealth>(
    key,
    async () => (await getSuperAdminDashboardHealth()).data,
    30 * 1000
  );

  return { health: data ?? null, error, isLoading, isValidating, mutate };
}

export function useSuperAdminSchoolDetail(schoolId: string | null | undefined) {
  const key = schoolId ? cacheKey(['super-admin:school', schoolId]) : null;
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<SuperAdminSchoolDetail>(
    key,
    async () => (await getSuperAdminSchoolDetail(schoolId!)).data
  );

  return { school: data ?? null, error, isLoading, isValidating, mutate };
}

export function useSuperAdminUserDetail(userId: string | null | undefined) {
  const key = userId ? cacheKey(['super-admin:user', userId]) : null;
  const { data, error, isLoading, isValidating, mutate } = useCachedSWR<SuperAdminUserDetail>(
    key,
    async () => (await getSuperAdminUserDetail(userId!)).data
  );

  return { user: data ?? null, error, isLoading, isValidating, mutate };
}
