import { FEED_SERVICE_URL, LEARN_SERVICE_URL } from '@/lib/api/config';
import { feedApiPostToPost, feedPostToCardData } from '@/lib/feed-normalize';
import { SEARCH_CACHE_TTL_MS } from './constants';

export interface SearchUser {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string | null;
  role?: string;
  headline?: string | null;
  professionalTitle?: string | null;
  isVerified?: boolean;
}

export interface SearchClub {
  id: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  avatarUrl?: string | null;
  memberCount?: number;
  category?: string | null;
  clubType?: string | null;
}

export interface SearchCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  category?: string | null;
  enrollmentCount?: number;
  instructor?: { firstName?: string; lastName?: string; name?: string } | null;
}

export interface UnifiedSearchResult {
  users: SearchUser[];
  posts: any[];
  clubs: SearchClub[];
  courses: SearchCourse[];
}

export interface SearchQueryOptions {
  query: string;
  token: string;
  postType?: string;
  userLimit?: number;
  postLimit?: number;
  clubLimit?: number;
  courseLimit?: number;
  includeUsers?: boolean;
  includePosts?: boolean;
  includeClubs?: boolean;
  includeCourses?: boolean;
  signal?: AbortSignal;
}

type CacheEntry = {
  data: UnifiedSearchResult;
  timestamp: number;
};

const searchCache = new Map<string, CacheEntry>();

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function cacheKey(options: SearchQueryOptions): string {
  return [
    options.query.trim().toLowerCase(),
    options.postType || '',
    options.includeUsers !== false,
    options.includePosts !== false,
    options.includeClubs !== false,
    options.includeCourses !== false,
    options.userLimit || 12,
    options.postLimit || 20,
    options.clubLimit || 8,
    options.courseLimit || 8,
  ].join('::');
}

async function parseJson(res: Response) {
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeClub(raw: any): SearchClub {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    coverImageUrl: raw.coverImageUrl || raw.coverUrl,
    avatarUrl: raw.avatarUrl || raw.imageUrl || raw.logoUrl,
    memberCount: raw.memberCount ?? raw._count?.members ?? raw.membersCount ?? 0,
    category: raw.category,
    clubType: raw.clubType || raw.type,
  };
}

function normalizeCourse(raw: any): SearchCourse {
  return {
    id: raw.id,
    title: raw.title || raw.name,
    description: raw.description,
    thumbnailUrl: raw.thumbnailUrl || raw.coverImageUrl || raw.imageUrl,
    level: raw.level,
    category: raw.category,
    enrollmentCount: raw.enrollmentCount ?? raw._count?.enrollments ?? 0,
    instructor: raw.instructor || raw.creator || raw.author || null,
  };
}

export async function fetchUnifiedSearch(
  options: SearchQueryOptions,
): Promise<UnifiedSearchResult> {
  const trimmed = options.query.trim();
  const empty: UnifiedSearchResult = { users: [], posts: [], clubs: [], courses: [] };
  if (!trimmed || !options.token) return empty;

  const key = cacheKey(options);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.data;
  }

  const {
    token,
    postType = '',
    userLimit = 12,
    postLimit = 20,
    clubLimit = 8,
    courseLimit = 8,
    includeUsers = true,
    includePosts = true,
    includeClubs = true,
    includeCourses = true,
    signal,
  } = options;

  const postsParams = new URLSearchParams({
    search: trimmed,
    limit: String(postLimit),
    fields: 'minimal',
  });
  if (postType) postsParams.set('type', postType);

  const requests: Promise<Response | null>[] = [
    includeUsers
      ? fetch(
          `${FEED_SERVICE_URL}/users/search?q=${encodeURIComponent(trimmed)}&limit=${userLimit}`,
          { headers: authHeaders(token), signal },
        )
      : Promise.resolve(null),
    includePosts
      ? fetch(`${FEED_SERVICE_URL}/posts?${postsParams}`, {
          headers: authHeaders(token),
          signal,
        })
      : Promise.resolve(null),
    includeClubs
      ? fetch(
          `${FEED_SERVICE_URL}/clubs/discover?limit=${clubLimit}&search=${encodeURIComponent(trimmed)}`,
          { headers: authHeaders(token), signal },
        )
      : Promise.resolve(null),
    includeCourses
      ? fetch(
          `${LEARN_SERVICE_URL}/courses?search=${encodeURIComponent(trimmed)}&limit=${courseLimit}`,
          { headers: authHeaders(token), signal },
        )
      : Promise.resolve(null),
  ];

  const [usersRes, postsRes, clubsRes, coursesRes] = await Promise.allSettled(requests);

  const result: UnifiedSearchResult = { ...empty };

  if (usersRes.status === 'fulfilled' && usersRes.value) {
    const data = await parseJson(usersRes.value);
    if (data?.success) {
      result.users = (data.users || data.data || []) as SearchUser[];
    }
  }

  if (postsRes.status === 'fulfilled' && postsRes.value) {
    const data = await parseJson(postsRes.value);
    if (data?.success) {
      result.posts = (data.data || [])
        .map((raw: unknown) => {
          const normalized = feedApiPostToPost(raw);
          return normalized ? feedPostToCardData(normalized) : null;
        })
        .filter(Boolean);
    }
  }

  if (clubsRes.status === 'fulfilled' && clubsRes.value) {
    const data = await parseJson(clubsRes.value);
    const clubs = data?.clubs || data?.data || [];
    if (Array.isArray(clubs)) {
      result.clubs = clubs.map(normalizeClub);
    }
  }

  if (coursesRes.status === 'fulfilled' && coursesRes.value) {
    const data = await parseJson(coursesRes.value);
    const courses = data?.courses || data?.data || [];
    if (Array.isArray(courses)) {
      result.courses = courses.map(normalizeCourse);
    }
  }

  searchCache.set(key, { data: result, timestamp: Date.now() });
  if (searchCache.size > 40) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }

  return result;
}

export function sortPosts(posts: any[], mode: 'top' | 'recent' | 'popular'): any[] {
  const list = [...posts];
  if (mode === 'recent') {
    return list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
  }
  if (mode === 'popular') {
    return list.sort((a, b) => {
      const scoreA = (a.likesCount || 0) * 2 + (a.commentsCount || 0) * 3 + (a.sharesCount || 0) * 4;
      const scoreB = (b.likesCount || 0) * 2 + (b.commentsCount || 0) * 3 + (b.sharesCount || 0) * 4;
      return scoreB - scoreA;
    });
  }
  return list.sort((a, b) => {
    const scoreA =
      (a._score || 0) * 100 +
      (a.likesCount || 0) +
      (a.commentsCount || 0) * 1.5 +
      (a.sharesCount || 0) * 2;
    const scoreB =
      (b._score || 0) * 100 +
      (b.likesCount || 0) +
      (b.commentsCount || 0) * 1.5 +
      (b.sharesCount || 0) * 2;
    return scoreB - scoreA;
  });
}

export function filterMediaPosts(posts: any[]): any[] {
  return posts.filter(
    (post) =>
      (Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) ||
      post.imageUrl ||
      post.coverImageUrl ||
      post.hasMedia,
  );
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
}

export function formatRole(role?: string | null): string {
  if (!role) return '';
  return role.toLowerCase().replace(/_/g, ' ');
}
