import { MAX_RECENT_SEARCHES, RECENT_SEARCHES_KEY } from './constants';

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed || typeof window === 'undefined') return getRecentSearches();

  const next = [trimmed, ...getRecentSearches().filter((item) => item !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

export function removeRecentSearch(term: string): string[] {
  if (typeof window === 'undefined') return [];
  const next = getRecentSearches().filter((item) => item !== term);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
}
