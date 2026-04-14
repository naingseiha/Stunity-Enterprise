import { clubsApi as api } from './client';

export interface ClubAnnouncement {
  id: string;
  clubId: string;
  title: string;
  content: string;
  isPinned: boolean;
  priority?: string;
  targetRoles?: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
  };
}

export interface ClubMaterial {
  id: string;
  clubId: string;
  title: string;
  description?: string;
  type: 'DOCUMENT' | 'VIDEO' | 'LINK' | 'IMAGE' | 'AUDIO' | 'PRESENTATION' | 'CODE' | 'QUIZ';
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  tags?: string[];
  uploadedById: string;
  uploadedAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const extractRows = (payload: any, keys: string[]): any[] => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const extractEntity = <T>(payload: any, keys: string[]): T => {
  for (const key of keys) {
    if (payload?.[key]) return payload[key] as T;
  }
  return payload as T;
};

export const getClubAnnouncements = async (clubId: string): Promise<ClubAnnouncement[]> => {
  const response = await api.get(`/announcements/clubs/${clubId}/announcements`);
  return extractRows(response.data, ['announcements', 'data']) as ClubAnnouncement[];
};

export const createClubAnnouncement = async (
  clubId: string,
  payload: {
    title?: string;
    content: string;
    isPinned?: boolean;
    targetRoles?: string[];
  }
): Promise<ClubAnnouncement> => {
  const response = await api.post(`/announcements/clubs/${clubId}/announcements`, payload);
  return extractEntity<ClubAnnouncement>(response.data, ['announcement', 'data']);
};

export const deleteClubAnnouncement = async (announcementId: string): Promise<void> => {
  await api.delete(`/announcements/${announcementId}`);
};

export const getClubMaterials = async (
  clubId: string,
  params?: { type?: ClubMaterial['type']; category?: string; search?: string }
): Promise<ClubMaterial[]> => {
  const response = await api.get(`/materials/clubs/${clubId}/materials`, { params });
  return extractRows(response.data, ['materials', 'data']) as ClubMaterial[];
};

export const createClubMaterial = async (
  clubId: string,
  payload: {
    title: string;
    description?: string;
    type?: ClubMaterial['type'];
    url: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    category?: string;
    tags?: string[];
  }
): Promise<ClubMaterial> => {
  const response = await api.post(`/materials/clubs/${clubId}/materials`, payload);
  return extractEntity<ClubMaterial>(response.data, ['material', 'data']);
};

export const deleteClubMaterial = async (materialId: string): Promise<void> => {
  await api.delete(`/materials/${materialId}`);
};
