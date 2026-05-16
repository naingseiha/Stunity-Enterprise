import type { ProfileVisitor } from '@/api/profileApi';
import { fetchProfileVisitorsPreview } from '@/api/profileApi';

const VISITORS_TTL_MS = 60_000;

let cache: { userId: string; fetchedAt: number; visitors: ProfileVisitor[] } | null =
  null;
const inflightByUser = new Map<string, Promise<ProfileVisitor[]>>();

export function getCachedProfileVisitors(userId: string): ProfileVisitor[] | null {
  if (
    !cache ||
    cache.userId !== userId ||
    Date.now() - cache.fetchedAt >= VISITORS_TTL_MS
  ) {
    return null;
  }
  return cache.visitors;
}

export function invalidateProfileVisitorsCache(userId?: string) {
  if (!userId) {
    cache = null;
    inflightByUser.clear();
    return;
  }
  if (cache?.userId === userId) {
    cache = null;
  }
  inflightByUser.delete(userId);
}

/** @param cacheUserId Stable user id for cache key (not the literal "me"). */
export async function fetchProfileVisitorsPreviewCached(
  cacheUserId: string,
  options: { force?: boolean } = {},
): Promise<ProfileVisitor[]> {
  if (
    !options.force &&
    cache &&
    cache.userId === cacheUserId &&
    Date.now() - cache.fetchedAt < VISITORS_TTL_MS
  ) {
    return cache.visitors;
  }

  const existing = inflightByUser.get(cacheUserId);
  if (existing) {
    return existing;
  }

  const request = fetchProfileVisitorsPreview('me')
    .then((visitors) => {
      cache = { userId: cacheUserId, fetchedAt: Date.now(), visitors };
      return visitors;
    })
    .finally(() => {
      inflightByUser.delete(cacheUserId);
    });

  inflightByUser.set(cacheUserId, request);
  return request;
}
