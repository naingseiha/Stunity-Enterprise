/**
 * In-memory cache for unit mini-lessons (GET /learn/lesson).
 * Keeps UnitLessonScreen instant on revisit / after press-prefetch.
 */
import { learnPathService, UnitLesson } from '@/services/learnPath.service';

const TTL_MS = 10 * 60_000; // 10 minutes — lesson content is mostly static
const cache = new Map<string, { data: UnitLesson | null; ts: number }>();
const inFlight = new Map<string, Promise<UnitLesson | null>>();

export const getCachedUnitLesson = (topicId: string): UnitLesson | null | undefined => {
  const hit = cache.get(topicId);
  if (!hit) return undefined;
  if (Date.now() - hit.ts >= TTL_MS) return hit.data; // stale-ok for paint
  return hit.data;
};

export const isUnitLessonCacheFresh = (topicId: string): boolean => {
  const hit = cache.get(topicId);
  return Boolean(hit) && Date.now() - (hit?.ts ?? 0) < TTL_MS;
};

export const fetchUnitLesson = async (
  topicId: string,
  force = false,
): Promise<UnitLesson | null> => {
  if (!force && isUnitLessonCacheFresh(topicId)) {
    return cache.get(topicId)!.data;
  }
  const pending = inFlight.get(topicId);
  if (pending) return pending;

  const task = learnPathService
    .getLesson(topicId)
    .then((data) => {
      cache.set(topicId, { data, ts: Date.now() });
      return data;
    })
    .catch((err) => {
      // Keep stale paint if we already had something.
      const stale = cache.get(topicId)?.data;
      if (stale !== undefined) return stale;
      throw err;
    })
    .finally(() => {
      inFlight.delete(topicId);
    });

  inFlight.set(topicId, task);
  return task;
};

export const prefetchUnitLesson = (topicId: string): void => {
  if (!topicId || isUnitLessonCacheFresh(topicId)) return;
  void fetchUnitLesson(topicId).catch(() => {});
};
