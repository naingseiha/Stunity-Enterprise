/**
 * Learn Home cache — native learnHomeCache parity for web/PWA.
 * Layers: memory Map → localStorage (24h) → network with inFlight dedupe.
 */

import {
  learnPathApi,
  LearnerProfile,
  LearnPath,
  PerformanceStatsSummary,
} from "@/lib/api/learnPath";

export type LearnHomeCachePayload = {
  profile: LearnerProfile | null;
  path: LearnPath | null;
  activeSubjectId: string | null;
  stats: PerformanceStatsSummary | null;
};

type CacheEntry = {
  data: LearnHomeCachePayload;
  cachedAt: number;
};

const MEMORY = new Map<string, CacheEntry>();
const IN_FLIGHT = new Map<string, Promise<LearnHomeCachePayload | null>>();
const FRESH_MS = 60_000;
const STALE_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "stunity:learn-home:v1:";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readDisk(userId: string): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.data || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > STALE_MS) {
      localStorage.removeItem(storageKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDisk(userId: string, entry: CacheEntry) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function readLearnHomeCache(userId: string): LearnHomeCachePayload | null {
  if (!userId) return null;
  const mem = MEMORY.get(userId);
  if (mem?.data && (mem.data.profile || mem.data.path)) return mem.data;

  const disk = readDisk(userId);
  if (disk?.data && (disk.data.profile || disk.data.path)) {
    MEMORY.set(userId, disk);
    return disk.data;
  }
  return null;
}

export function isLearnHomeCacheFresh(userId: string, now = Date.now()): boolean {
  if (!userId) return false;
  const mem = MEMORY.get(userId);
  if (mem && (mem.data.profile || mem.data.path)) {
    return now - mem.cachedAt < FRESH_MS;
  }
  const disk = readDisk(userId);
  if (!disk) return false;
  MEMORY.set(userId, disk);
  return now - disk.cachedAt < FRESH_MS;
}

export function writeLearnHomeCache(userId: string, data: LearnHomeCachePayload): void {
  if (!userId) return;
  const entry: CacheEntry = { data, cachedAt: Date.now() };
  MEMORY.set(userId, entry);
  writeDisk(userId, entry);
}

export function invalidateLearnHomeCache(userId?: string): void {
  if (userId) {
    MEMORY.delete(userId);
    IN_FLIGHT.delete(userId);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey(userId));
      } catch {
        /* ignore */
      }
    }
    return;
  }
  MEMORY.clear();
  IN_FLIGHT.clear();
}

async function fetchLearnHomeNetwork(
  userId: string,
  subjectId?: string | null
): Promise<LearnHomeCachePayload | null> {
  const [profile, stats] = await Promise.all([
    learnPathApi.getProfile(),
    learnPathApi.getStatsSummary(userId),
  ]);

  let path: LearnPath | null = null;
  let activeSubjectId: string | null = subjectId || null;

  if (profile?.subjects?.length) {
    activeSubjectId = activeSubjectId || profile.subjects[0].id;
    if (activeSubjectId) {
      path = await learnPathApi.getPath(activeSubjectId);
    }
  }

  return {
    profile,
    path,
    activeSubjectId,
    stats,
  };
}

/** Network fetch with dedupe; writes cache on success. */
export async function fetchLearnHome(options: {
  userId: string;
  subjectId?: string | null;
  force?: boolean;
}): Promise<LearnHomeCachePayload | null> {
  const { userId, subjectId, force } = options;
  if (!userId) return null;

  if (!force && isLearnHomeCacheFresh(userId)) {
    return readLearnHomeCache(userId);
  }

  const existing = IN_FLIGHT.get(userId);
  if (existing && !force) return existing;

  const cached = readLearnHomeCache(userId);
  const request = fetchLearnHomeNetwork(
    userId,
    subjectId || cached?.activeSubjectId
  )
    .then((payload) => {
      if (payload) writeLearnHomeCache(userId, payload);
      return payload;
    })
    .catch(() => cached)
    .finally(() => {
      IN_FLIGHT.delete(userId);
    });

  IN_FLIGHT.set(userId, request);
  return request;
}

/** Fire-and-forget warm used by nav / boot. */
export function prefetchLearnHome(userId: string): void {
  if (!userId || typeof window === "undefined") return;
  if (isLearnHomeCacheFresh(userId)) return;
  void fetchLearnHome({ userId });
}
