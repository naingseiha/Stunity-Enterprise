'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// Event types matching backend
export type EventType =
  | 'NEW_POST'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  | 'NEW_LIKE'
  | 'NEW_COMMENT'
  | 'NEW_REACTION'
  | 'NEW_SHARE'
  | 'NEW_FOLLOWER'
  | 'NEW_CONNECTION'
  | 'SKILL_ENDORSED'
  | 'NEW_RECOMMENDATION'
  | 'NEW_DM'
  | 'DM_READ'
  | 'TYPING_START'
  | 'TYPING_STOP'
  | 'NOTIFICATION'
  | 'ANNOUNCEMENT'
  | 'HEARTBEAT'
  | 'CONNECTED'
  | 'RECONNECT';

export interface SSEEvent {
  id: string;
  type: EventType;
  timestamp: string;
  data: {
    userId?: string;
    targetUserId?: string;
    postId?: string;
    authorId?: string;
    authorName?: string;
    authorAvatar?: string;
    postPreview?: string;
    commentId?: string;
    commentPreview?: string;
    reactionType?: string;
    conversationId?: string;
    messageId?: string;
    messagePreview?: string;
    senderName?: string;
    senderAvatar?: string;
    title?: string;
    message?: string;
    link?: string;
    [key: string]: any;
  };
}

interface UseEventStreamOptions {
  onEvent?: (event: SSEEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

const FEED_API = process.env.NEXT_PUBLIC_FEED_API_URL || 'http://localhost:3010';

export function useEventStream(userId: string | undefined, options: UseEventStreamOptions = {}) {
  const { onEvent, onConnect, onDisconnect, onError, enabled = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [unreadCounts, setUnreadCounts] = useState({
    notifications: 0,
    messages: 0,
    likes: 0,
    comments: 0,
    followers: 0,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // Mark events as read
  const markAsRead = useCallback((type: keyof typeof unreadCounts) => {
    setUnreadCounts(prev => ({ ...prev, [type]: 0 }));
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setUnreadCounts({
      notifications: 0,
      messages: 0,
      likes: 0,
      comments: 0,
      followers: 0,
    });
  }, []);

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!userId || !enabled) return;
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const url = `${FEED_API}/api/events/stream?userId=${userId}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        onConnect?.();
        console.log('📡 SSE Connected');
      };

      // Handle specific event types
      const handleEvent = (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data) as SSEEvent;
          
          // Add to events list
          setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100
          
          // Update unread counts
          switch (event.type) {
            case 'NEW_LIKE':
              setUnreadCounts(prev => ({ ...prev, likes: prev.likes + 1, notifications: prev.notifications + 1 }));
              break;
            case 'NEW_COMMENT':
              setUnreadCounts(prev => ({ ...prev, comments: prev.comments + 1, notifications: prev.notifications + 1 }));
              break;
            case 'NEW_FOLLOWER':
              setUnreadCounts(prev => ({ ...prev, followers: prev.followers + 1, notifications: prev.notifications + 1 }));
              break;
            case 'NEW_DM':
              setUnreadCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
              break;
            case 'NOTIFICATION':
              setUnreadCounts(prev => ({ ...prev, notifications: prev.notifications + 1 }));
              break;
          }
          
          // Call user callback
          onEvent?.(event);
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      // Listen for all event types
      eventSource.onmessage = handleEvent;
      
      // Also listen for named events
      ['NEW_LIKE', 'NEW_COMMENT', 'NEW_FOLLOWER', 'NEW_DM', 'NEW_POST', 'NOTIFICATION'].forEach(type => {
        eventSource.addEventListener(type, handleEvent);
      });

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
        onError?.(error);
        
        // Reconnect with exponential backoff
        eventSource.close();
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`📡 SSE Reconnecting (attempt ${reconnectAttempts.current})...`);
          connect();
        }, delay);
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
    }
  }, [userId, enabled, onConnect, onEvent, onError]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (userId && enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId, enabled, connect, disconnect]);

  // Handle visibility change (reconnect when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && userId && enabled) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, userId, enabled, connect]);

  return {
    isConnected,
    events,
    unreadCounts,
    markAsRead,
    clearEvents,
    connect,
    disconnect,
    totalUnread: unreadCounts.notifications + unreadCounts.messages,
  };
}

// Convenience hook for notifications only
export function useNotifications(userId: string | undefined) {
  const { events, unreadCounts, markAsRead, isConnected } = useEventStream(userId, {
    enabled: !!userId,
  });

  const notifications = events.filter(e => 
    ['NEW_LIKE', 'NEW_COMMENT', 'NEW_FOLLOWER', 'SKILL_ENDORSED', 'NEW_RECOMMENDATION', 'NOTIFICATION'].includes(e.type)
  );

  return {
    notifications,
    unreadCount: unreadCounts.notifications,
    markAsRead: () => markAsRead('notifications'),
    isConnected,
  };
}

// Convenience hook for DM messages only
export function useMessageUpdates(userId: string | undefined) {
  const { events, unreadCounts, markAsRead, isConnected } = useEventStream(userId, {
    enabled: !!userId,
  });

  const messages = events.filter(e => 
    ['NEW_DM', 'DM_READ', 'TYPING_START', 'TYPING_STOP'].includes(e.type)
  );

  return {
    messages,
    unreadCount: unreadCounts.messages,
    markAsRead: () => markAsRead('messages'),
    isConnected,
  };
}

export default useEventStream;
