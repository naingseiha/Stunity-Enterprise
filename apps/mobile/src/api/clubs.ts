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

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all clubs (optionally filter by user membership)
 */
export const getClubs = async (params?: {
  joined?: boolean;
  type?: string;
  schoolId?: string;
}): Promise<Club[]> => {
  const response = await api.get('/clubs', { params });
  return response.data.clubs || response.data;  // Handle both { clubs: [...] } and direct array
};

/**
 * Get club by ID
 */
export const getClubById = async (clubId: string): Promise<Club> => {
  const response = await api.get(`/clubs/${clubId}`);
  return response.data.club || response.data;  // Handle both { club: {...} } and direct object
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
  return response.data;
};

/**
 * Leave a club
 */
export const leaveClub = async (clubId: string): Promise<{ message: string }> => {
  const response = await api.post(`/clubs/${clubId}/leave`);
  return response.data;
};

/**
 * Get club members
 */
export const getClubMembers = async (clubId: string): Promise<ClubMember[]> => {
  const response = await api.get(`/clubs/${clubId}/members`);
  return response.data.members || response.data || [];
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
