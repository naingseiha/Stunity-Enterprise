const CACHE_PREFIX = 'stunity:web-cache:';

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getStorageKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export function readPersistentCache<T>(key: string, maxAgeMs: number): T | undefined {
  const storage = getStorage();
  if (!storage) return undefined;

  try {
    const raw = storage.getItem(getStorageKey(key));
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') {
      storage.removeItem(getStorageKey(key));
      return undefined;
    }

    if (Date.now() - parsed.timestamp > maxAgeMs) {
      storage.removeItem(getStorageKey(key));
      return undefined;
    }

    return parsed.data;
  } catch {
    return undefined;
  }
}

export function writePersistentCache<T>(key: string, data: T): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const payload: CacheEnvelope<T> = {
      timestamp: Date.now(),
      data,
    };
    storage.setItem(getStorageKey(key), JSON.stringify(payload));
  } catch {
    // Ignore storage write failures.
  }
}

export function removePersistentCache(key: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(getStorageKey(key));
  } catch {
    // Ignore storage failures.
  }
}
