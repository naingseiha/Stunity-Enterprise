// Feed API Client for activity feed and social features
import { apiCache, generateCacheKey } from "../cache";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// Types
export type PostType =
  | "ARTICLE"
  | "COURSE"
  | "QUIZ"
  | "QUESTION"
  | "EXAM"
  | "ANNOUNCEMENT"
  | "ASSIGNMENT"
  | "POLL"
  | "RESOURCE"
  | "PROJECT"
  | "TUTORIAL"
  | "RESEARCH"
  | "ACHIEVEMENT"
  | "REFLECTION"
  | "COLLABORATION";

export type PostVisibility = "PUBLIC" | "SCHOOL" | "CLASS" | "PRIVATE";

export interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  role: string;
  student?: {
    khmerName: string;
    class?: {
      name: string;
      grade: string;
    };
  };
  teacher?: {
    khmerName?: string;
    position?: string;
  };
  parent?: {
    khmerName: string;
  };
}

export interface PollOption {
  id: string;
  text: string;
  position: number;
  votesCount: number;
}

export interface Post {
  id: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  mediaUrls: string[];
  postType: PostType;
  visibility: PostVisibility;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isEdited: boolean;
  isPinned: boolean;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
  // Poll fields
  pollOptions?: PollOption[];
  userVotes?: string[]; // Array of option IDs (for multiple choice)
  totalVotes?: number;
  // Enhanced poll fields
  pollExpiresAt?: string | null;
  pollAllowMultiple?: boolean;
  pollMaxChoices?: number | null;
  pollIsAnonymous?: boolean;
  isPollExpired?: boolean;
  // Legacy field (kept for backwards compatibility)
  userVote?: string | null;
  // Assignment fields
  assignmentDueDate?: string | null;
  assignmentPoints?: number | null;
  assignmentSubmissionType?: string | null;
  // Course fields
  courseCode?: string | null;
  courseLevel?: string | null;
  courseDuration?: string | null;
  // Announcement fields
  announcementUrgency?: string | null;
  announcementExpiryDate?: string | null;
  // Tutorial fields
  tutorialDifficulty?: string | null;
  tutorialEstimatedTime?: string | null;
  tutorialPrerequisites?: string | null;
  // Exam fields
  examDate?: string | null;
  examDuration?: number | null;
  examTotalPoints?: number | null;
  examPassingScore?: number | null;
  // Resource fields
  resourceType?: string | null;
  resourceUrl?: string | null;
  // Research fields
  researchField?: string | null;
  researchCollaborators?: string | null;
  // Project fields
  projectStatus?: string | null;
  projectDeadline?: string | null;
  projectTeamSize?: number | null;
  // Quiz fields
  quizQuestions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  postId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
  position: number;
  explanation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReactionType = "LIKE" | "LOVE" | "HELPFUL" | "INSIGHTFUL";

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  parentId: string | null;
  replies: Comment[];
  reactionCounts?: {
    LIKE: number;
    LOVE: number;
    HELPFUL: number;
    INSIGHTFUL: number;
  };
  userReaction: ReactionType | null;
  repliesCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FeedResponse {
  data: Post[];
  pagination: Pagination;
}

export interface CommentsResponse {
  data: Comment[];
  pagination: Pagination;
}

export interface FollowUser {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  headline?: string;
  role: string;
  followedAt: string;
  isFollowedByMe: boolean;
  student?: {
    khmerName: string;
    class?: {
      name: string;
      grade: string;
    };
  };
  teacher?: {
    khmerName?: string;
    position?: string;
  };
  parent?: {
    khmerName: string;
  };
  suggestionReason?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  actor?: PostAuthor;
}

export interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
  pagination: Pagination;
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

// ==================== POST FUNCTIONS ====================

/**
 * Create a new post (invalidates cache)
 */
export const createPost = async (data: {
  content: string;
  postType?: PostType;
  visibility?: PostVisibility;
  media?: File[];
  pollOptions?: string[];
  // Enhanced poll fields
  pollExpiresAt?: string;
  pollAllowMultiple?: boolean;
  pollMaxChoices?: number;
  pollIsAnonymous?: boolean;
  // Assignment fields
  assignmentDueDate?: string;
  assignmentPoints?: number;
  assignmentSubmissionType?: string;
  // Course fields
  courseCode?: string;
  courseLevel?: string;
  courseDuration?: string;
  // Announcement fields
  announcementUrgency?: string;
  announcementExpiryDate?: string;
  // Tutorial fields
  tutorialDifficulty?: string;
  tutorialEstimatedTime?: string;
  tutorialPrerequisites?: string;
  // Exam fields
  examDate?: string;
  examDuration?: number;
  examTotalPoints?: number;
  examPassingScore?: number;
  // Resource fields
  resourceType?: string;
  resourceUrl?: string;
  // Research fields
  researchField?: string;
  researchCollaborators?: string;
  // Project fields
  projectStatus?: string;
  projectDeadline?: string;
  projectTeamSize?: number;
  // Quiz fields
  quizQuestions?: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    points: number;
    explanation?: string;
  }>;
}): Promise<Post> => {
  const token = getAuthToken();
  const formData = new FormData();

  formData.append("content", data.content);
  if (data.postType) formData.append("postType", data.postType);
  if (data.visibility) formData.append("visibility", data.visibility);

  // ✅ Add poll options if present
  if (data.pollOptions && Array.isArray(data.pollOptions)) {
    formData.append("pollOptions", JSON.stringify(data.pollOptions));
  }

  // ✅ Add enhanced poll fields
  if (data.pollExpiresAt) {
    formData.append("pollExpiresAt", data.pollExpiresAt);
  }
  if (data.pollAllowMultiple !== undefined) {
    formData.append("pollAllowMultiple", String(data.pollAllowMultiple));
  }
  if (data.pollMaxChoices) {
    formData.append("pollMaxChoices", String(data.pollMaxChoices));
  }
  if (data.pollIsAnonymous !== undefined) {
    formData.append("pollIsAnonymous", String(data.pollIsAnonymous));
  }

  // ✅ Add assignment fields
  if (data.assignmentDueDate) {
    formData.append("assignmentDueDate", data.assignmentDueDate);
  }
  if (data.assignmentPoints !== undefined) {
    formData.append("assignmentPoints", String(data.assignmentPoints));
  }
  if (data.assignmentSubmissionType) {
    formData.append("assignmentSubmissionType", data.assignmentSubmissionType);
  }

  // ✅ Add course fields
  if (data.courseCode) {
    formData.append("courseCode", data.courseCode);
  }
  if (data.courseLevel) {
    formData.append("courseLevel", data.courseLevel);
  }
  if (data.courseDuration) {
    formData.append("courseDuration", data.courseDuration);
  }

  // ✅ Add announcement fields
  if (data.announcementUrgency) {
    formData.append("announcementUrgency", data.announcementUrgency);
  }
  if (data.announcementExpiryDate) {
    formData.append("announcementExpiryDate", data.announcementExpiryDate);
  }

  // ✅ Add tutorial fields
  if (data.tutorialDifficulty) {
    formData.append("tutorialDifficulty", data.tutorialDifficulty);
  }
  if (data.tutorialEstimatedTime) {
    formData.append("tutorialEstimatedTime", data.tutorialEstimatedTime);
  }
  if (data.tutorialPrerequisites) {
    formData.append("tutorialPrerequisites", data.tutorialPrerequisites);
  }

  // ✅ Add exam fields
  if (data.examDate) {
    formData.append("examDate", data.examDate);
  }
  if (data.examDuration !== undefined) {
    formData.append("examDuration", String(data.examDuration));
  }
  if (data.examTotalPoints !== undefined) {
    formData.append("examTotalPoints", String(data.examTotalPoints));
  }
  if (data.examPassingScore !== undefined) {
    formData.append("examPassingScore", String(data.examPassingScore));
  }

  // ✅ Add resource fields
  if (data.resourceType) {
    formData.append("resourceType", data.resourceType);
  }
  if (data.resourceUrl) {
    formData.append("resourceUrl", data.resourceUrl);
  }

  // ✅ Add research fields
  if (data.researchField) {
    formData.append("researchField", data.researchField);
  }
  if (data.researchCollaborators) {
    formData.append("researchCollaborators", data.researchCollaborators);
  }

  // ✅ Add project fields
  if (data.projectStatus) {
    formData.append("projectStatus", data.projectStatus);
  }
  if (data.projectDeadline) {
    formData.append("projectDeadline", data.projectDeadline);
  }
  if (data.projectTeamSize !== undefined) {
    formData.append("projectTeamSize", String(data.projectTeamSize));
  }

  // ✅ Add quiz questions if present
  if (data.quizQuestions && Array.isArray(data.quizQuestions)) {
    formData.append("quizQuestions", JSON.stringify(data.quizQuestions));
  }

  if (data.media) {
    data.media.forEach((file) => {
      formData.append("media", file);
    });
  }

  const response = await fetch(`${API_BASE_URL}/feed/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to create post" }));
    throw new Error(error.message);
  }

  const result = await response.json();
  
  // Invalidate feed cache after creating post
  apiCache.clear();
  
  return result.data;
};

/**
 * Get feed posts (paginated) with caching
 */
export const getFeedPosts = async (params?: {
  page?: number;
  limit?: number;
  postType?: PostType | "ALL";
}): Promise<FeedResponse> => {
  const cacheKey = generateCacheKey("feed", {
    page: params?.page || 1,
    limit: params?.limit || 10,
    postType: params?.postType || "ALL",
  });

  return apiCache.getOrFetch(
    cacheKey,
    async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.postType) queryParams.set("postType", params.postType);

      const response = await authFetch(`/feed/posts?${queryParams.toString()}`);
      return response;
    },
    30000 // Cache for 30 seconds
  );
};

/**
 * Get single post by ID
 * ✅ OPTIMIZED: Added caching for instant revisits
 */
export const getPost = async (postId: string): Promise<Post> => {
  const cacheKey = `post:${postId}`;
  
  return apiCache.getOrFetch(
    cacheKey,
    async () => {
      const response = await authFetch(`/feed/posts/${postId}`);
      return response.data;
    },
    60000 // Cache for 60 seconds
  );
};

// Alias for consistency
export const getPostById = getPost;

/**
 * Update a post (text and visibility only)
 */
export const updatePost = async (
  postId: string,
  data: {
    content?: string;
    visibility?: PostVisibility;
  }
): Promise<Post> => {
  const response = await authFetch(`/feed/posts/${postId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  
  // Invalidate cache after updating post
  apiCache.clear();
  
  return response.data;
};

/**
 * Update a post with media (images can be added, removed, reordered)
 */
export const updatePostWithMedia = async (
  postId: string,
  formData: FormData
): Promise<Post> => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/feed/posts/${postId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - let browser set it with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: "Failed to update post" 
    }));
    throw new Error(error.message);
  }

  const result = await response.json();
  
  // Invalidate cache after updating post
  apiCache.clear();
  
  return result.data;
};

/**
 * Delete a post (invalidates cache)
 */
export const deletePost = async (postId: string): Promise<void> => {
  await authFetch(`/feed/posts/${postId}`, {
    method: "DELETE",
  });
  
  // Invalidate feed cache after deleting post
  apiCache.clear();
};

/**
 * Like/Unlike a post
 */
export const toggleLike = async (postId: string): Promise<{
  isLiked: boolean;
  likesCount: number;
}> => {
  const response = await authFetch(`/feed/posts/${postId}/like`, {
    method: "POST",
  });
  return response.data;
};

/**
 * Get user's posts
 */
export const getUserPosts = async (
  userId: string,
  params?: {
    page?: number;
    limit?: number;
  }
): Promise<FeedResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());

  const response = await authFetch(`/feed/users/${userId}/posts?${queryParams.toString()}`);
  return response;
};

// ==================== COMMENT FUNCTIONS ====================

/**
 * Get comments for a post
 */
/**
 * Get comments for a post
 * ✅ OPTIMIZED: Added caching for faster repeated loads
 */
export const getComments = async (
  postId: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: "new" | "old" | "top";
  }
): Promise<CommentsResponse> => {
  const cacheKey = generateCacheKey("comments", {
    postId,
    page: params?.page || 1,
    limit: params?.limit || 20,
    sort: params?.sort || "new",
  });

  return apiCache.getOrFetch(
    cacheKey,
    async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.sort) queryParams.set("sort", params.sort);

      const response = await authFetch(`/feed/posts/${postId}/comments?${queryParams.toString()}`);
      return response;
    },
    30000 // ✅ Cache for 30 seconds
  );
};

/**
 * Add a comment to a post (or reply to a comment)
 * ✅ OPTIMIZED: Invalidate cache after adding comment
 */
export const addComment = async (
  postId: string,
  content: string,
  parentId?: string
): Promise<Comment> => {
  const response = await authFetch(`/feed/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, parentId }),
  });

  // ✅ Invalidate comments cache for this post
  const cacheKeys = Array.from({ length: 10 }, (_, i) => 
    generateCacheKey("comments", {
      postId,
      page: i + 1,
      limit: 20,
      sort: "new",
    })
  );
  cacheKeys.forEach(key => apiCache.delete(key));

  // ✅ Also invalidate post cache to update comment count
  apiCache.delete(`post:${postId}`);

  return response.data;
};

// Alias for consistency
export const createComment = addComment;

/**
 * Edit a comment
 */
export const editComment = async (commentId: string, content: string): Promise<Comment> => {
  const response = await authFetch(`/feed/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  return response.data;
};

/**
 * Delete a comment
 */
export const deleteComment = async (commentId: string): Promise<void> => {
  await authFetch(`/feed/comments/${commentId}`, {
    method: "DELETE",
  });
};

/**
 * Toggle comment reaction
 */
export const toggleCommentReaction = async (
  commentId: string,
  type: ReactionType
): Promise<{ action: "added" | "removed" }> => {
  const response = await authFetch(`/feed/comments/${commentId}/react`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type }),
  });
  return response;
};

// ==================== SOCIAL FUNCTIONS ====================

/**
 * Follow a user
 */
export const followUser = async (userId: string): Promise<{
  isFollowing: boolean;
  followersCount: number;
}> => {
  const response = await authFetch(`/social/follow/${userId}`, {
    method: "POST",
  });
  return response.data;
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (userId: string): Promise<{
  isFollowing: boolean;
  followersCount: number;
}> => {
  const response = await authFetch(`/social/follow/${userId}`, {
    method: "DELETE",
  });
  return response.data;
};

/**
 * Get followers
 */
export const getFollowers = async (params?: {
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: FollowUser[];
  pagination: Pagination;
}> => {
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.set("userId", params.userId);
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());

  const response = await authFetch(`/social/followers?${queryParams.toString()}`);
  return response;
};

/**
 * Get following
 */
export const getFollowing = async (params?: {
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: FollowUser[];
  pagination: Pagination;
}> => {
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.set("userId", params.userId);
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());

  const response = await authFetch(`/social/following?${queryParams.toString()}`);
  return response;
};

/**
 * Get follow suggestions
 */
export const getFollowSuggestions = async (limit?: number): Promise<FollowUser[]> => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.set("limit", limit.toString());

  const response = await authFetch(`/social/suggestions?${queryParams.toString()}`);
  return response.data;
};

// ==================== NOTIFICATION FUNCTIONS ====================

/**
 * Get notifications
 */
export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.unreadOnly) queryParams.set("unreadOnly", "true");

  const response = await authFetch(`/social/notifications?${queryParams.toString()}`);
  return response;
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await authFetch(`/social/notifications/${notificationId}/read`, {
    method: "PUT",
  });
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  await authFetch("/social/notifications/read-all", {
    method: "PUT",
  });
};

// Post type display info
export const POST_TYPE_INFO: Record<
  PostType,
  {
    label: string;
    labelKh: string;
    icon: string;
    color: string;
    bgColor: string;
  }
> = {
  ARTICLE: {
    label: "Article",
    labelKh: "អត្ថបទ",
    icon: "FileText",
    color: "#FF9500",
    bgColor: "bg-gradient-to-br from-orange-50 to-yellow-50",
  },
  COURSE: {
    label: "Course",
    labelKh: "វគ្គសិក្សា",
    icon: "GraduationCap",
    color: "#34C759",
    bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
  },
  QUIZ: {
    label: "Quiz",
    labelKh: "សំណួរក្លាយ",
    icon: "Brain",
    color: "#AF52DE",
    bgColor: "bg-gradient-to-br from-purple-50 to-violet-50",
  },
  QUESTION: {
    label: "Question",
    labelKh: "សំណួរ",
    icon: "HelpCircle",
    color: "#5856D6",
    bgColor: "bg-gradient-to-br from-indigo-50 to-blue-50",
  },
  EXAM: {
    label: "Exam",
    labelKh: "ប្រឡង",
    icon: "ClipboardCheck",
    color: "#FF3B30",
    bgColor: "bg-gradient-to-br from-red-50 to-pink-50",
  },
  ANNOUNCEMENT: {
    label: "Announcement",
    labelKh: "សេចក្តីប្រកាស",
    icon: "Megaphone",
    color: "#FF2D55",
    bgColor: "bg-gradient-to-br from-pink-50 to-rose-50",
  },
  ASSIGNMENT: {
    label: "Assignment",
    labelKh: "កិច្ចការផ្ទះ",
    icon: "BookOpen",
    color: "#007AFF",
    bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50",
  },
  POLL: {
    label: "Poll",
    labelKh: "ការស ទង់មតិ",
    icon: "BarChart3",
    color: "#FFB800",
    bgColor: "bg-gradient-to-br from-amber-50 to-yellow-50",
  },
  RESOURCE: {
    label: "Resource",
    labelKh: "ធនធាន",
    icon: "FolderOpen",
    color: "#30B0C7",
    bgColor: "bg-gradient-to-br from-cyan-50 to-teal-50",
  },
  PROJECT: {
    label: "Project",
    labelKh: "គម្រោង",
    icon: "Briefcase",
    color: "#FF6B35",
    bgColor: "bg-gradient-to-br from-orange-50 to-red-50",
  },
  TUTORIAL: {
    label: "Tutorial",
    labelKh: "មេរៀន",
    icon: "BookText",
    color: "#00D4AA",
    bgColor: "bg-gradient-to-br from-teal-50 to-green-50",
  },
  RESEARCH: {
    label: "Research",
    labelKh: "ការស្រាវជ្រាវ",
    icon: "Microscope",
    color: "#8B5CF6",
    bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50",
  },
  ACHIEVEMENT: {
    label: "Achievement",
    labelKh: "សមិទ្ធិផល",
    icon: "Trophy",
    color: "#FFD700",
    bgColor: "bg-gradient-to-br from-yellow-50 to-amber-50",
  },
  REFLECTION: {
    label: "Reflection",
    labelKh: "ការពិចារណា",
    icon: "Lightbulb",
    color: "#F59E0B",
    bgColor: "bg-gradient-to-br from-amber-50 to-orange-50",
  },
  COLLABORATION: {
    label: "Collaboration",
    labelKh: "កិច្ចសហការ",
    icon: "Users",
    color: "#06B6D4",
    bgColor: "bg-gradient-to-br from-cyan-50 to-sky-50",
  },
};

/**
 * Vote on a poll option
 */
export const votePoll = async (optionId: string): Promise<any> => {
  const response = await authFetch(`/feed/polls/${optionId}/vote`, {
    method: "POST",
  });
  
  // Clear cache after voting to show updated results
  apiCache.clear();
  
  return response;
};

/**
 * Search users for mentions
 */
export interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

export const searchUsers = async (query: string): Promise<MentionUser[]> => {
  if (!query || query.length < 2) {
    return [];
  }

  const response = await authFetch(`/feed/search/users?q=${encodeURIComponent(query)}`);
  return response.data || [];
};
