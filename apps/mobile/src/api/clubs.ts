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
  enableSubjects?: boolean;
  enableGrading?: boolean;
  enableAttendance?: boolean;
  enableAssignments?: boolean;
  enableReports?: boolean;
  enableAwards?: boolean;
  subject?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  membershipStatus?: string | null;
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

export interface ClubJoinRequest {
  id: string;
  clubId: string;
  userId: string;
  role: ClubMember['role'];
  isActive: boolean;
  joinedAt: string;
  withdrawalReason?: string | null;
  user: ClubMember['user'];
}

export interface ClubInvite {
  id: string;
  clubId: string;
  userId: string;
  invitedBy?: string | null;
  isActive: boolean;
  withdrawalReason?: string | null;
  joinedAt: string;
  club?: Club;
}

export interface CreateClubData {
  name: string;
  description: string;
  type: 'CASUAL_STUDY_GROUP' | 'STRUCTURED_CLASS' | 'PROJECT_GROUP' | 'EXAM_PREP';
  mode: 'PUBLIC' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED';
  enableSubjects?: boolean;
  enableGrading?: boolean;
  enableAttendance?: boolean;
  enableAssignments?: boolean;
  enableReports?: boolean;
  enableAwards?: boolean;
  subject?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  schoolId?: string;
  tags?: string[];
  coverImage?: string;
  settings?: any;
}

export interface UpdateClubData {
  name?: string;
  description?: string;
  mode?: 'PUBLIC' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED';
  subject?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
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

const DEFAULT_CLUB_TYPE: Club['type'] = 'CASUAL_STUDY_GROUP';
const DEFAULT_CLUB_MODE: Club['mode'] = 'PUBLIC';

const extractRows = (payload: any, keys: string[]): any[] => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const normalizeClub = (payload: any): Club => {
  const source = payload?.club || payload?.data || payload || {};
  const membership = payload?.membership || source?.membership || null;
  const type = (source.type || source.clubType || DEFAULT_CLUB_TYPE) as Club['type'];
  const mode = (source.mode || DEFAULT_CLUB_MODE) as Club['mode'];
  const memberCountFromPayload =
    source.memberCount ??
    source._count?.members ??
    (Array.isArray(source.members) ? source.members.length : undefined);

  return {
    ...source,
    type,
    mode,
    isJoined: typeof source.isJoined === 'boolean' ? source.isJoined : Boolean(membership?.isActive),
    membershipStatus: source.membershipStatus || (membership ? (membership.isActive ? 'JOINED' : membership.withdrawalReason || 'PENDING') : null),
    memberCount:
      memberCountFromPayload !== undefined && memberCountFromPayload !== null
        ? Number(memberCountFromPayload)
        : undefined,
  } as Club;
};

const normalizeClubList = (payload: any): Club[] =>
  extractRows(payload, ['clubs', 'data']).map(normalizeClub);

const normalizeInvite = (payload: any): ClubInvite => {
  const source = payload || {};
  const club = source.club ? normalizeClub(source.club) : undefined;
  return {
    ...source,
    club,
  } as ClubInvite;
};

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
  return normalizeClubList(response.data);
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
    const clubs = normalizeClubList(response.data);
    const pagination: ClubPagination = response.data.pagination || {
      page: Number(normalizedParams.page ?? 1),
      limit: Number((normalizedParams.limit ?? clubs.length) || 0),
      hasMore: false,
      nextPage: null,
      returned: clubs.length,
    };

    const result: GetClubsPaginatedResult = {
      clubs,
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
    const club = normalizeClub(response.data);
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
  const club = normalizeClub(response.data);
  primeClubCache(club);
  _clubsCache.clear();
  return club;
};

/**
 * Update club
 */
export const updateClub = async (
  clubId: string,
  data: UpdateClubData
): Promise<Club> => {
  const response = await api.put(`/clubs/${clubId}`, data);
  const club = normalizeClub(response.data);
  primeClubCache(club);
  _clubsCache.clear();
  return club;
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
  _clubsCache.clear();
  return { message: response.data?.message || 'Joined club successfully' };
};

/**
 * Leave a club
 */
export const leaveClub = async (clubId: string): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/leave`);
  _clubDetailCache.delete(clubId);
  _clubMembersCache.delete(clubId);
  _clubsCache.clear();
  return { message: response.data?.message || 'Left club successfully' };
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
    const members = extractRows(response.data, ['members', 'data']) as ClubMember[];
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
  userId: string,
  role: ClubMember['role']
): Promise<{ message: string }> => {
  const response = await api.put(`/clubs/${clubId}/members/${userId}/role`, { role });
  _clubMembersCache.delete(clubId);
  _clubDetailCache.delete(clubId);
  return { message: response.data?.message || 'Member role updated successfully' };
};

/**
 * Remove member from club (instructor/owner only)
 */
export const removeMember = async (
  clubId: string,
  userId: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/clubs/${clubId}/members/${userId}`);
  _clubMembersCache.delete(clubId);
  _clubDetailCache.delete(clubId);
  _clubsCache.clear();
  return { message: response.data?.message || 'Member removed successfully' };
};

export const requestJoinClub = async (clubId: string): Promise<{ message: string; status?: string }> => {
  const response = await api.post(`/clubs/${clubId}/request-join`);
  _clubDetailCache.delete(clubId);
  return {
    message: response.data?.message || 'Join request submitted',
    status: response.data?.status,
  };
};

export const getClubJoinRequests = async (clubId: string): Promise<ClubJoinRequest[]> => {
  const response = await api.get(`/clubs/${clubId}/join-requests`);
  return extractRows(response.data, ['requests', 'data']) as ClubJoinRequest[];
};

export const approveClubJoinRequest = async (
  clubId: string,
  userId: string
): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/join-requests/${userId}/approve`);
  _clubMembersCache.delete(clubId);
  _clubDetailCache.delete(clubId);
  _clubsCache.clear();
  return { message: response.data?.message || 'Join request approved successfully' };
};

export const rejectClubJoinRequest = async (
  clubId: string,
  userId: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/clubs/${clubId}/join-requests/${userId}/reject`);
  _clubMembersCache.delete(clubId);
  _clubDetailCache.delete(clubId);
  return { message: response.data?.message || 'Join request rejected successfully' };
};

export const inviteMemberToClub = async (
  clubId: string,
  payload: { userId?: string; email?: string }
): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/invite`, payload);
  _clubDetailCache.delete(clubId);
  return { message: response.data?.message || 'Invitation sent successfully' };
};

export const getMyClubInvites = async (): Promise<ClubInvite[]> => {
  const response = await api.get('/clubs/invites/my');
  return extractRows(response.data, ['invites', 'data']).map(normalizeInvite);
};

export const acceptClubInvite = async (clubId: string): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/accept-invite`);
  _clubMembersCache.delete(clubId);
  _clubDetailCache.delete(clubId);
  _clubsCache.clear();
  return { message: response.data?.message || 'Invitation accepted successfully' };
};

export const declineClubInvite = async (clubId: string): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/decline-invite`);
  _clubMembersCache.delete(clubId);
  _clubDetailCache.delete(clubId);
  _clubsCache.clear();
  return { message: response.data?.message || 'Invitation declined successfully' };
};
