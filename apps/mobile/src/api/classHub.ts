import apiClient from './client';

export interface ClassAnnouncement {
  id: string;
  classId: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  mediaKeys: string[];
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
  };
}

export interface ClassMaterial {
  id: string;
  classId: string;
  uploaderId: string;
  title: string;
  description?: string;
  fileUrl?: string;
  linkUrl?: string;
  type: string;
  createdAt: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ClassAssignment {
  id: string;
  classId: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxPoints?: number;
  deepLinkUrl?: string;
  quizId?: string;
  createdAt: string;
  submissions: {
    studentId: string;
    status: string;
    score?: number;
  }[];
}

export const classHubApi = {
  getAnnouncements: async (classId: string) => {
    const response = await apiClient.classApi.get<{ success: boolean; data: ClassAnnouncement[] }>(`/classes/${classId}/announcements`);
    return response.data.data;
  },
  getMaterials: async (classId: string) => {
    const response = await apiClient.classApi.get<{ success: boolean; data: ClassMaterial[] }>(`/classes/${classId}/materials`);
    return response.data.data;
  },
  getAssignments: async (classId: string) => {
    const response = await apiClient.classApi.get<{ success: boolean; data: ClassAssignment[] }>(`/classes/${classId}/assignments`);
    return response.data.data;
  },
};
