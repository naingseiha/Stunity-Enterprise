'use client';

import useSWR, { preload } from 'swr';
import { MESSAGING_SERVICE_URL } from '@/lib/api/config';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const MESSAGING_CONVERSATIONS_CACHE_TTL_MS = 60 * 1000;
const MESSAGING_PARENTS_CACHE_TTL_MS = 2 * 60 * 1000;

export interface AdminConversation {
  id: string;
  teacherId: string;
  parentId: string;
  studentId?: string;
  lastMessageAt: string;
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
    phone?: string;
  };
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    studentId: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderType: 'TEACHER' | 'PARENT';
    isRead: boolean;
    createdAt: string;
  };
  unreadCount: number;
}

export interface MessageParent {
  id: string;
  firstName: string;
  lastName: string;
  khmerName?: string;
  phone: string;
  relationship: string;
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    studentId?: string;
    class?: {
      id: string;
      name: string;
      grade: string;
    };
  }>;
}

interface ConversationsResponse {
  success: boolean;
  data: AdminConversation[];
}

interface ParentsResponse {
  success: boolean;
  data: MessageParent[];
}

function getConversationsCacheKey(): string | null {
  if (typeof window === 'undefined') return null;
  return `${MESSAGING_SERVICE_URL}/conversations`;
}

function getParentsCacheKey(): string | null {
  if (typeof window === 'undefined') return null;
  return `${MESSAGING_SERVICE_URL}/parents`;
}

async function fetchWithAuth<T>(url: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch messaging data' }));
    throw new Error(error.message || 'Failed to fetch messaging data');
  }

  const data = await response.json();
  writePersistentCache(url, data);
  return data;
}

export function useAdminConversations(enabled = true) {
  const cacheKey = enabled ? getConversationsCacheKey() : null;
  const fallbackData = cacheKey
    ? readPersistentCache<ConversationsResponse>(cacheKey, MESSAGING_CONVERSATIONS_CACHE_TTL_MS)
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ConversationsResponse>(
    cacheKey,
    fetchWithAuth,
    {
      dedupingInterval: MESSAGING_CONVERSATIONS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      fallbackData,
    }
  );

  return {
    conversations: data?.data || [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useMessageParents(enabled = false) {
  const cacheKey = enabled ? getParentsCacheKey() : null;
  const fallbackData = cacheKey
    ? readPersistentCache<ParentsResponse>(cacheKey, MESSAGING_PARENTS_CACHE_TTL_MS)
    : undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ParentsResponse>(
    cacheKey,
    fetchWithAuth,
    {
      dedupingInterval: MESSAGING_PARENTS_CACHE_TTL_MS,
      revalidateOnFocus: false,
      fallbackData,
    }
  );

  return {
    parents: data?.data || [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function prefetchAdminConversations() {
  const cacheKey = getConversationsCacheKey();
  if (cacheKey) {
    preload(cacheKey, fetchWithAuth);
  }
}

export function prefetchMessageParents() {
  const cacheKey = getParentsCacheKey();
  if (cacheKey) {
    preload(cacheKey, fetchWithAuth);
  }
}
