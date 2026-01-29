// Notifications API Client

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

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

export interface NotificationActor {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  role: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId?: string;
  actor?: NotificationActor;
  type: string;
  title: string;
  message: string;
  link?: string;
  postId?: string;
  commentId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Get user's notifications
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

  const response = await authFetch(`/notifications?${queryParams.toString()}`);
  return response;
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (): Promise<number> => {
  const response = await authFetch("/notifications/unread-count");
  return response.count;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await authFetch(`/notifications/${notificationId}/read`, {
    method: "PUT",
  });
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  await authFetch("/notifications/read-all", {
    method: "PUT",
  });
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await authFetch(`/notifications/${notificationId}`, {
    method: "DELETE",
  });
};
