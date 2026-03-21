/**
 * Club API Client
 * 
 * Handles all API calls to the Club Service (Port 3012)
 */

import { clubsApi as api } from './client';

// ============================================================================
// Types
// ============================================================================

export interface Club {
  id: string;
  name: string;
  description: string;
  type: 'CASUAL_STUDY_GROUP' | 'STRUCTURED_CLASS' | 'PROJECT_GROUP' | 'EXAM_PREP';
  mode: 'PUBLIC' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED';
  creatorId: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
  };
  school?: {
    id: string;
    name: string;
  };
  memberCount?: number;
  isJoined?: boolean;
  isActive: boolean;
  tags?: string[];
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubMember {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string;
  };
  clubId: string;
  role: 'OWNER' | 'INSTRUCTOR' | 'TEACHING_ASSISTANT' | 'STUDENT' | 'OBSERVER';
  isActive: boolean;
  joinedAt: string;
  studentNumber?: string;
  enrollmentDate?: string;
}

export interface CreateClubData {
  name: string;
  description: string;
  type: 'CASUAL_STUDY_GROUP' | 'STRUCTURED_CLASS' | 'PROJECT_GROUP' | 'EXAM_PREP';
  mode: 'PUBLIC' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED';
  schoolId?: string;
  tags?: string[];
  coverImage?: string;
  settings?: any;
}

export interface UpdateClubData {
  name?: string;
  description?: string;
  mode?: 'PUBLIC' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED';
  tags?: string[];
  coverImage?: string;
  settings?: any;
  isActive?: boolean;
}

export interface ClubPagination {
  page: number;
  limit: number;
  hasMore: boolean;
  nextPage: number | null;
  returned: number;
}

export interface GetClubsPaginatedParams {
  joined?: boolean;
  myClubs?: boolean;
  discover?: boolean;
  type?: string;
  schoolId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetClubsPaginatedResult {
  clubs: Club[];
  pagination: ClubPagination;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all clubs (optionally filter by user membership)
 */
export const getClubs = async (params?: {
  joined?: boolean;
  myClubs?: boolean;
  discover?: boolean;
  type?: string;
  schoolId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<Club[]> => {
  const normalizedParams: Record<string, unknown> = { ...(params || {}) };

  if (typeof normalizedParams.joined === 'boolean' && normalizedParams.myClubs === undefined) {
    normalizedParams.myClubs = normalizedParams.joined;
  }
  delete normalizedParams.joined;

  const response = await api.get('/clubs', { params: normalizedParams });
  return response.data.clubs || response.data;  // Handle both { clubs: [...] } and direct array
};


// ============================================================================
// Cache Layer (30s TTL)
// ============================================================================

const CLUBS_CACHE_TTL = 30_000;
let _clubsCache: Map<string, { data: GetClubsPaginatedResult; ts: number }> = new Map();
const _clubsInFlight = new Map<string, Promise<GetClubsPaginatedResult>>();
const CLUB_DETAIL_CACHE_TTL = 60_000;
const _clubDetailCache = new Map<string, { data: Club; ts: number }>();
const _clubDetailInFlight = new Map<string, Promise<Club>>();
const _clubMembersCache = new Map<string, { data: ClubMember[]; ts: number }>();
const _clubMembersInFlight = new Map<string, Promise<ClubMember[]>>();

const getCacheKey = (params?: GetClubsPaginatedParams): string => {
  return JSON.stringify(params || {});
};
const getCachedResource = <T>(map: Map<string, { data: T; ts: number }>, key: string, ttl = CLUB_DETAIL_CACHE_TTL): T | null => {
  const cached = map.get(key);
  if (!cached) return null;

  if (Date.now() - cached.ts >= ttl) {
    map.delete(key);
    return null;
  }

  return cached.data;
};

export const getCachedClubsPaginated = (
  params?: GetClubsPaginatedParams
): GetClubsPaginatedResult | null => {
  const cacheKey = getCacheKey(params);
  const cached = _clubsCache.get(cacheKey);

  if (!cached) return null;

  if (Date.now() - cached.ts >= CLUBS_CACHE_TTL) {
    _clubsCache.delete(cacheKey);
    return null;
  }

  return cached.data;
};

/**
 * Get paginated clubs (preferred for large datasets)
 * Results are cached for 30s to prevent redundant network calls during UI navigation.
 */
export const getClubsPaginated = async (
  params?: GetClubsPaginatedParams,
  force = false
): Promise<GetClubsPaginatedResult> => {
  const cacheKey = getCacheKey(params);
  if (!force) {
    const cached = getCachedClubsPaginated(params);
    if (cached) {
      return cached;
    }

    const inFlight = _clubsInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const normalizedParams: Record<string, unknown> = { ...(params || {}) };

  if (typeof normalizedParams.joined === 'boolean' && normalizedParams.myClubs === undefined) {
    normalizedParams.myClubs = normalizedParams.joined;
  }
  delete normalizedParams.joined;

  const request = api.get('/clubs', { params: normalizedParams }).then((response) => {
    const clubs = response.data.clubs || response.data || [];
    const pagination: ClubPagination = response.data.pagination || {
      page: Number(normalizedParams.page ?? 1),
      limit: Number((normalizedParams.limit ?? clubs.length) || 0),
      hasMore: false,
      nextPage: null,
      returned: Array.isArray(clubs) ? clubs.length : 0,
    };

    const result: GetClubsPaginatedResult = {
      clubs: Array.isArray(clubs) ? clubs : [],
      pagination,
    };

    _clubsCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }).finally(() => {
    _clubsInFlight.delete(cacheKey);
  });

  _clubsInFlight.set(cacheKey, request);
  return request;
};

/**
 * Busts the clubs cache (e.g., after join/leave/create).
 */
export const invalidateClubsCache = (): void => {
  _clubsCache.clear();
  _clubsInFlight.clear();
  _clubDetailCache.clear();
  _clubDetailInFlight.clear();
  _clubMembersCache.clear();
  _clubMembersInFlight.clear();
};

/**
 * Background prefetch for common club filters.
 */
export const prefetchClubs = async (): Promise<void> => {
  try {
    // Prefetch 'all' clubs with default pagination
    await getClubsPaginated({ page: 1, limit: 20 }, true);
  } catch (err) {
    // Silence
  }
};

export const getCachedClubById = (clubId: string): Club | null =>
  getCachedResource(_clubDetailCache, clubId);

export const primeClubCache = (club: Club): Club => {
  _clubDetailCache.set(club.id, { data: club, ts: Date.now() });
  return club;
};

/**
 * Get club by ID
 */
export const getClubById = async (clubId: string, force = false): Promise<Club> => {
  if (!force) {
    const cached = getCachedClubById(clubId);
    if (cached) return cached;

    const inFlight = _clubDetailInFlight.get(clubId);
    if (inFlight) return inFlight;
  }

  const request = api.get(`/clubs/${clubId}`).then((response) => {
    const club = (response.data.club || response.data) as Club;
    return primeClubCache(club);
  }).finally(() => {
    _clubDetailInFlight.delete(clubId);
  });

  _clubDetailInFlight.set(clubId, request);
  return request;
};

/**
 * Create a new club
 */
export const createClub = async (data: CreateClubData): Promise<Club> => {
  const response = await api.post('/clubs', data);
  return response.data;
};

/**
 * Update club
 */
export const updateClub = async (
  clubId: string,
  data: UpdateClubData
): Promise<Club> => {
  const response = await api.put(`/clubs/${clubId}`, data);
  return response.data;
};

/**
 * Delete club
 */
export const deleteClub = async (clubId: string): Promise<void> => {
  await api.delete(`/clubs/${clubId}`);
};

/**
 * Join a club
 */
export const joinClub = async (clubId: string): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/join`);
  _clubDetailCache.delete(clubId);
  _clubMembersCache.delete(clubId);
  return response.data;
};

/**
 * Leave a club
 */
export const leaveClub = async (clubId: string): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/leave`);
  _clubDetailCache.delete(clubId);
  _clubMembersCache.delete(clubId);
  return response.data;
};

export const getCachedClubMembers = (clubId: string): ClubMember[] | null =>
  getCachedResource(_clubMembersCache, clubId);

/**
 * Get club members
 */
export const getClubMembers = async (clubId: string, force = false): Promise<ClubMember[]> => {
  if (!force) {
    const cached = getCachedClubMembers(clubId);
    if (cached) return cached;

    const inFlight = _clubMembersInFlight.get(clubId);
    if (inFlight) return inFlight;
  }

  const request = api.get(`/clubs/${clubId}/members`).then((response) => {
    const members = (response.data.members || response.data || []) as ClubMember[];
    _clubMembersCache.set(clubId, { data: Array.isArray(members) ? members : [], ts: Date.now() });
    return Array.isArray(members) ? members : [];
  }).finally(() => {
    _clubMembersInFlight.delete(clubId);
  });

  _clubMembersInFlight.set(clubId, request);
  return request;
};

export const prefetchClubDetail = async (clubId: string): Promise<void> => {
  try {
    await getClubById(clubId);
  } catch {
    // Ignore prefetch failures.
  }
};

/**
 * Update member role (instructor/owner only)
 */
export const updateMemberRole = async (
  clubId: string,
  memberId: string,
  role: ClubMember['role']
): Promise<{ message: string }> => {
  const response = await api.put(`/clubs/${clubId}/members/${memberId}/role`, { role });
  return response.data;
};

/**
 * Remove member from club (instructor/owner only)
 */
export const removeMember = async (
  clubId: string,
  memberId: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/clubs/${clubId}/members/${memberId}`);
  return response.data;
};
