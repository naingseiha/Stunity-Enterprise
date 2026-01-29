import { apiClient } from "./client";

// Types
export interface PostAnalytics {
  overview: {
    totalViews: number;
    uniqueViews: number;
    likes: number;
    comments: number;
    engagementRate: number;
  };
  viewsOverTime: Array<{
    date: string;
    views: number;
  }>;
  topViewSources: Array<{
    source: string;
    count: number;
  }>;
  audienceBreakdown: {
    students: number;
    teachers: number;
    admins: number;
    guests: number;
  };
  peakTimes: Array<{
    hour: number;
    views: number;
  }>;
  avgDuration: number;
}

/**
 * Track a post view
 * No auth required (guests can view)
 */
export const trackPostView = async (
  postId: string,
  data?: {
    duration?: number;
    source?: string;
  }
): Promise<{
  success: boolean;
  viewCount?: number;
  uniqueViewCount?: number;
}> => {
  try {
    const response = await apiClient.post(`/feed/posts/${postId}/view`, data || {});
    // Check if response and response.data exist
    if (response && response.data) {
      return response.data;
    }
    return { success: true };
  } catch (error) {
    // Silently fail - view tracking shouldn't break the UI
    console.warn("Failed to track view:", error);
    return { success: false };
  }
};

/**
 * Get post analytics (author only)
 * Requires authentication
 */
export const getPostAnalytics = async (
  postId: string,
  params?: {
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<PostAnalytics> => {
  const response = await apiClient.get(`/feed/posts/${postId}/analytics`, { params });
  return response.data;
};
