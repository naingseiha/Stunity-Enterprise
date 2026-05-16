import {
  fetchMyJoinedQuizzes,
  type MyJoinedQuizzesParams,
  type PaginatedQuizzes,
} from '@/services/quiz';

const CACHE_TTL_MS = 45_000;

type CacheKey = string;

let cache: { key: CacheKey; fetchedAt: number; data: PaginatedQuizzes } | null = null;
const inflight = new Map<CacheKey, Promise<PaginatedQuizzes>>();

function buildCacheKey(params: MyJoinedQuizzesParams): CacheKey {
  return JSON.stringify({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search?.trim() || '',
    status: params.status ?? 'all',
  });
}

export function getCachedJoinedQuizzes(
  params: MyJoinedQuizzesParams,
): PaginatedQuizzes | null {
  const key = buildCacheKey(params);
  if (!cache || cache.key !== key || Date.now() - cache.fetchedAt >= CACHE_TTL_MS) {
    return null;
  }
  return cache.data;
}

export function invalidateJoinedQuizzesCache() {
  cache = null;
  inflight.clear();
}

export async function fetchMyJoinedQuizzesCached(
  params: MyJoinedQuizzesParams,
  options: { force?: boolean } = {},
): Promise<PaginatedQuizzes> {
  const key = buildCacheKey(params);

  if (!options.force) {
    const hit = getCachedJoinedQuizzes(params);
    if (hit) return hit;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = fetchMyJoinedQuizzes(params)
    .then((data) => {
      cache = { key, fetchedAt: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}
