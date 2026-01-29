// Profile API Client for social media features

import { apiCache, generateCacheKey } from "../cache";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

interface ProfileData {
  id: string;
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  headline?: string;
  interests?: string[];
  skills?: string[];
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  profileVisibility?: string;
  profileCompleteness?: number;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  student?: {
    id: string;
    studentId?: string;
    khmerName: string;
    englishName?: string;
    gender: string;
    dateOfBirth: string;
    class?: {
      id: string;
      name: string;
      grade: string;
    };
  };
  teacher?: {
    id: string;
    teacherId?: string;
    khmerName?: string;
    englishName?: string;
    position?: string;
  };
  parent?: {
    id: string;
    parentId?: string;
    khmerName: string;
    englishName?: string;
    relationship?: string;
  };
}

interface ProfileCompletenessData {
  completeness: number;
  suggestions: string[];
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

// Helper for authenticated fetch
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Profile API functions

/**
 * Get my profile (extended details)
 */
export const getMyProfile = async (): Promise<ProfileData> => {
  const response = await authFetch("/profile/me");
  return response.data;
};

/**
 * Get user profile by ID
 * Cached for 60 seconds for better performance
 */
export const getUserProfile = async (userId: string): Promise<ProfileData> => {
  const cacheKey = generateCacheKey("profile", { userId });
  
  return apiCache.getOrFetch(
    cacheKey,
    async () => {
      const response = await authFetch(`/profile/${userId}`);
      return response.data;
    },
    60 * 1000 // 60 second TTL
  );
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (file: File): Promise<{
  profilePictureUrl: string;
  profileCompleteness: number;
}> => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await fetch(`${API_BASE_URL}/profile/picture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || "Failed to upload profile picture");
  }

  const result = await response.json();
  
  // Invalidate profile cache after update
  const userId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
  if (userId) {
    const cacheKey = generateCacheKey("profile", { userId });
    apiCache.invalidate(cacheKey);
  }
  
  return result.data;
};

/**
 * Delete profile picture
 */
export const deleteProfilePicture = async (): Promise<{
  profileCompleteness: number;
}> => {
  const response = await authFetch("/profile/picture", {
    method: "DELETE",
  });
  
  // Invalidate profile cache after deletion
  const token = getAuthToken();
  const userId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
  if (userId) {
    const cacheKey = generateCacheKey("profile", { userId });
    apiCache.invalidate(cacheKey);
  }
  
  return response.data;
};

/**
 * Upload cover photo
 */
export const uploadCoverPhoto = async (file: File): Promise<{
  coverPhotoUrl: string;
  profileCompleteness: number;
}> => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("coverPhoto", file);

  const response = await fetch(`${API_BASE_URL}/profile/cover`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || "Failed to upload cover photo");
  }

  const result = await response.json();
  
  // Invalidate profile cache after update
  const userId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
  if (userId) {
    const cacheKey = generateCacheKey("profile", { userId });
    apiCache.invalidate(cacheKey);
  }
  
  return result.data;
};

/**
 * Delete cover photo
 */
export const deleteCoverPhoto = async (): Promise<{
  profileCompleteness: number;
}> => {
  const response = await authFetch("/profile/cover", {
    method: "DELETE",
  });
  
  // Invalidate profile cache after deletion
  const token = getAuthToken();
  const userId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
  if (userId) {
    const cacheKey = generateCacheKey("profile", { userId });
    apiCache.invalidate(cacheKey);
  }
  
  return response.data;
};

/**
 * Update bio and profile details
 */
export const updateBio = async (data: {
  bio?: string;
  headline?: string;
  location?: string;
  interests?: string[];
  skills?: string[];
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  profileVisibility?: string;
}): Promise<{
  bio?: string;
  headline?: string;
  location?: string;
  interests?: string[];
  skills?: string[];
  socialLinks?: any;
  profileVisibility?: string;
  profileCompleteness: number;
}> => {
  const response = await authFetch("/profile/bio", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  
  // Invalidate profile cache after update
  const token = getAuthToken();
  const userId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
  if (userId) {
    const cacheKey = generateCacheKey("profile", { userId });
    apiCache.invalidate(cacheKey);
  }
  
  return response.data;
};

/**
 * Get profile completeness score
 */
export const getProfileCompleteness = async (): Promise<ProfileCompletenessData> => {
  const response = await authFetch("/profile/completeness");
  return response.data;
};

export type { ProfileData, ProfileCompletenessData };

// ==================== CAREER PROFILE APIs ====================

/**
 * Skills Management
 */

export interface UserSkill {
  id: string;
  userId: string;
  skillName: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  yearsOfExp?: number;
  description?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  endorsementCount: number;
  recentEndorsements?: SkillEndorsement[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillEndorsement {
  id: string;
  skillId: string;
  endorserId: string;
  recipientId: string;
  comment?: string;
  createdAt: string;
  endorser: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    student?: { khmerName: string };
    teacher?: { khmerName: string };
  };
}

/**
 * Get user's skills
 */
export const getUserSkills = async (userId: string): Promise<UserSkill[]> => {
  const response = await authFetch(`/profile/${userId}/skills`);
  return response.data;
};

/**
 * Add new skill
 */
export const addSkill = async (data: {
  skillName: string;
  category: string;
  level: string;
  yearsOfExp?: number;
  description?: string;
}): Promise<UserSkill> => {
  const response = await authFetch("/profile/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.data;
};

/**
 * Update skill
 */
export const updateSkill = async (
  skillId: string,
  data: {
    level?: string;
    yearsOfExp?: number;
    description?: string;
  }
): Promise<UserSkill> => {
  const response = await authFetch(`/profile/skills/${skillId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.data;
};

/**
 * Delete skill
 */
export const deleteSkill = async (skillId: string): Promise<void> => {
  await authFetch(`/profile/skills/${skillId}`, {
    method: "DELETE",
  });
};

/**
 * Endorse a skill
 */
export const endorseSkill = async (
  skillId: string,
  comment?: string
): Promise<SkillEndorsement> => {
  const response = await authFetch(`/profile/skills/${skillId}/endorse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  return response.data;
};

/**
 * Projects/Portfolio Management
 */

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  status: "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  startDate?: string;
  endDate?: string;
  technologies: string[];
  skills: string[];
  githubUrl?: string;
  liveUrl?: string;
  projectUrl?: string;
  mediaUrls: string[];
  mediaKeys: string[];
  collaborators: string[];
  viewsCount: number;
  likesCount: number;
  isFeatured: boolean;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

/**
 * Get user's projects
 */
export const getUserProjects = async (userId: string): Promise<Project[]> => {
  const response = await authFetch(`/profile/${userId}/projects`);
  return response.data;
};

/**
 * Get single project
 */
export const getProject = async (projectId: string): Promise<Project> => {
  const response = await authFetch(`/profile/projects/${projectId}`);
  return response.data;
};

/**
 * Create project with media upload
 */
export const createProject = async (data: {
  title: string;
  description: string;
  category: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  technologies?: string[];
  skills?: string[];
  githubUrl?: string;
  liveUrl?: string;
  projectUrl?: string;
  collaborators?: string[];
  privacy?: string;
  media?: File[];
}): Promise<Project> => {
  const token = getAuthToken();
  const formData = new FormData();

  // Append text fields
  formData.append("title", data.title);
  formData.append("description", data.description);
  formData.append("category", data.category);
  if (data.status) formData.append("status", data.status);
  if (data.startDate) formData.append("startDate", data.startDate);
  if (data.endDate) formData.append("endDate", data.endDate);
  if (data.githubUrl) formData.append("githubUrl", data.githubUrl);
  if (data.liveUrl) formData.append("liveUrl", data.liveUrl);
  if (data.projectUrl) formData.append("projectUrl", data.projectUrl);
  if (data.privacy) formData.append("privacy", data.privacy);

  // Append arrays as JSON
  if (data.technologies) formData.append("technologies", JSON.stringify(data.technologies));
  if (data.skills) formData.append("skills", JSON.stringify(data.skills));
  if (data.collaborators) formData.append("collaborators", JSON.stringify(data.collaborators));

  // Append files
  if (data.media) {
    data.media.forEach((file) => {
      formData.append("media", file);
    });
  }

  const response = await fetch(`${API_BASE_URL}/profile/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to create project" }));
    throw new Error(error.message);
  }

  const result = await response.json();
  return result.data;
};

/**
 * Update project
 */
export const updateProject = async (
  projectId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    endDate?: string;
    technologies?: string[];
    skills?: string[];
    githubUrl?: string;
    liveUrl?: string;
    projectUrl?: string;
    privacy?: string;
  }
): Promise<Project> => {
  const response = await authFetch(`/profile/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.data;
};

/**
 * Delete project
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  await authFetch(`/profile/projects/${projectId}`, {
    method: "DELETE",
  });
};

/**
 * Like a project
 */
export const likeProject = async (projectId: string): Promise<{
  isLiked: boolean;
  likesCount: number;
}> => {
  const response = await authFetch(`/profile/projects/${projectId}/like`, {
    method: "POST",
  });
  return response.data;
};

/**
 * Toggle featured status
 */
export const toggleFeaturedProject = async (projectId: string): Promise<{
  isFeatured: boolean;
}> => {
  const response = await authFetch(`/profile/projects/${projectId}/feature`, {
    method: "POST",
  });
  return response.data;
};
