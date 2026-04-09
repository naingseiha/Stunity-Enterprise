'use client';

import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

export function buildRouteDataCacheKey(scope: string, ...parts: Array<string | number | null | undefined>) {
  const normalizedParts = parts
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map((part) => String(part));

  return ['route-data', scope, ...normalizedParts].join(':');
}

export function readRouteDataCache<T>(cacheKey: string, ttlMs: number) {
  return readPersistentCache<T>(cacheKey, ttlMs);
}

export function writeRouteDataCache<T>(cacheKey: string, data: T) {
  writePersistentCache(cacheKey, data);
}
