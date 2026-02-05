/**
 * SSE Event Types for Real-Time Features
 * Used by both backend and frontend
 */

export interface SSEEvent {
  id: string;
  type: EventType;
  timestamp: string;
  data: EventData;
}

export type EventType =
  // Feed events
  | 'NEW_POST'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  // Engagement events
  | 'NEW_LIKE'
  | 'NEW_COMMENT'
  | 'NEW_REACTION'
  | 'NEW_SHARE'
  // Social events
  | 'NEW_FOLLOWER'
  | 'NEW_CONNECTION'
  | 'SKILL_ENDORSED'
  | 'NEW_RECOMMENDATION'
  // DM events
  | 'NEW_DM'
  | 'DM_READ'
  | 'TYPING_START'
  | 'TYPING_STOP'
  // Notification events
  | 'NOTIFICATION'
  | 'ANNOUNCEMENT'
  // System events
  | 'HEARTBEAT'
  | 'CONNECTED'
  | 'RECONNECT';

export interface EventData {
  // Common fields
  userId?: string;
  targetUserId?: string;
  
  // Post events
  postId?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  postPreview?: string;
  
  // Comment events
  commentId?: string;
  commentPreview?: string;
  
  // Like/Reaction events
  reactionType?: string;
  
  // DM events
  conversationId?: string;
  messageId?: string;
  messagePreview?: string;
  senderName?: string;
  senderAvatar?: string;
  
  // Notification
  title?: string;
  message?: string;
  link?: string;
  
  // Generic
  [key: string]: any;
}

// Helper to create events
export function createEvent(type: EventType, data: EventData): SSEEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    data
  };
}

// Redis channel names
export const REDIS_CHANNELS = {
  userEvents: (userId: string) => `user:${userId}:events`,
  globalEvents: 'global:events',
  dmTyping: (conversationId: string) => `dm:${conversationId}:typing`
} as const;
