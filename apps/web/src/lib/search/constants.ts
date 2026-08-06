export const RECENT_SEARCHES_KEY = 'stunity_recent_searches';
export const MAX_RECENT_SEARCHES = 8;
export const SEARCH_DEBOUNCE_MS = 200;
export const SEARCH_CACHE_TTL_MS = 90_000;

export const TRENDING_TOPICS = [
  'math',
  'physics',
  'exam prep',
  'essay writing',
  'programming',
  'research',
  'scholarship',
  'study group',
] as const;

export const POST_TYPE_FILTERS = [
  { value: '', labelKey: 'allTypes' as const },
  { value: 'ARTICLE', labelKey: 'article' as const },
  { value: 'QUESTION', labelKey: 'question' as const },
  { value: 'QUIZ', labelKey: 'quiz' as const },
  { value: 'POLL', labelKey: 'poll' as const },
  { value: 'ANNOUNCEMENT', labelKey: 'announcement' as const },
  { value: 'EVENT', labelKey: 'event' as const },
  { value: 'COURSE', labelKey: 'course' as const },
  { value: 'TUTORIAL', labelKey: 'tutorial' as const },
  { value: 'RESOURCE', labelKey: 'resource' as const },
  { value: 'RESEARCH', labelKey: 'research' as const },
  { value: 'PROJECT', labelKey: 'project' as const },
] as const;

export type SearchTab = 'all' | 'people' | 'posts' | 'clubs' | 'courses' | 'media';
export type SortMode = 'top' | 'recent' | 'popular';
