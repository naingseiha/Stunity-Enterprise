/**
 * Redis PubSub Manager for Real-Time Events
 * Handles publishing and subscribing to Redis channels for SSE
 */

import Redis from 'ioredis';
import { SSEEvent, createEvent, EventType, EventData, REDIS_CHANNELS } from './events';

// Redis configuration from environment
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis clients (separate for pub/sub as per Redis requirements)
let publisher: Redis | null = null;
let isRedisConnected = false;

export function initRedis(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.log('⚠️  REDIS_URL not set - SSE will use in-memory fallback');
    return null;
  }

  try {
    publisher = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    publisher.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Redis connected for PubSub');
    });

    publisher.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      isRedisConnected = false;
    });

    publisher.on('close', () => {
      isRedisConnected = false;
      console.log('⚠️  Redis connection closed');
    });

    publisher.connect().catch(err => {
      console.error('❌ Redis connection failed:', err.message);
    });

    return publisher;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    return null;
  }
}

// Create a subscriber for a specific user
export function createSubscriber(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  
  try {
    const subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    return subscriber;
  } catch {
    return null;
  }
}

/**
 * Publish an event to a specific user's channel
 */
export async function publishToUser(userId: string, type: EventType, data: EventData): Promise<boolean> {
  const event = createEvent(type, data);
  return publishEvent(REDIS_CHANNELS.userEvents(userId), event);
}

/**
 * Publish an event to multiple users
 */
export async function publishToUsers(userIds: string[], type: EventType, data: EventData): Promise<void> {
  const event = createEvent(type, data);
  await Promise.all(
    userIds.map(userId => publishEvent(REDIS_CHANNELS.userEvents(userId), event))
  );
}

/**
 * Publish a global event (all connected users)
 */
export async function publishGlobal(type: EventType, data: EventData): Promise<boolean> {
  const event = createEvent(type, data);
  return publishEvent(REDIS_CHANNELS.globalEvents, event);
}

/**
 * Internal publish function
 */
async function publishEvent(channel: string, event: SSEEvent): Promise<boolean> {
  // Use in-memory event emitter as fallback if Redis not available
  if (!publisher || !isRedisConnected) {
    inMemoryPublish(channel, event);
    return true;
  }

  try {
    await publisher.publish(channel, JSON.stringify(event));
    return true;
  } catch (error) {
    console.error('Failed to publish event:', error);
    inMemoryPublish(channel, event);
    return false;
  }
}

// ========================================
// In-Memory Fallback (for local development)
// ========================================

type EventCallback = (event: SSEEvent) => void;
const inMemorySubscribers = new Map<string, Set<EventCallback>>();

function inMemoryPublish(channel: string, event: SSEEvent) {
  const subscribers = inMemorySubscribers.get(channel);
  if (subscribers) {
    subscribers.forEach(callback => callback(event));
  }
}

export function inMemorySubscribe(channel: string, callback: EventCallback): () => void {
  if (!inMemorySubscribers.has(channel)) {
    inMemorySubscribers.set(channel, new Set());
  }
  inMemorySubscribers.get(channel)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    inMemorySubscribers.get(channel)?.delete(callback);
  };
}

// ========================================
// Helper Functions for Common Events
// ========================================

export const EventPublisher = {
  // Feed events
  async newPost(authorId: string, followerIds: string[], postId: string, preview: string) {
    await publishToUsers(followerIds, 'NEW_POST', {
      postId,
      authorId,
      postPreview: preview.slice(0, 100)
    });
  },

  // Engagement events
  async newLike(postAuthorId: string, likerId: string, likerName: string, postId: string) {
    if (postAuthorId === likerId) return; // Don't notify self
    await publishToUser(postAuthorId, 'NEW_LIKE', {
      postId,
      userId: likerId,
      authorName: likerName
    });
  },

  async newComment(postAuthorId: string, commenterId: string, commenterName: string, postId: string, commentId: string, preview: string) {
    if (postAuthorId === commenterId) return;
    await publishToUser(postAuthorId, 'NEW_COMMENT', {
      postId,
      commentId,
      userId: commenterId,
      authorName: commenterName,
      commentPreview: preview.slice(0, 100)
    });
  },

  // Social events
  async newFollower(targetUserId: string, followerId: string, followerName: string, followerAvatar?: string) {
    await publishToUser(targetUserId, 'NEW_FOLLOWER', {
      userId: followerId,
      authorName: followerName,
      authorAvatar: followerAvatar
    });
  },

  async skillEndorsed(targetUserId: string, endorserId: string, endorserName: string, skillName: string) {
    await publishToUser(targetUserId, 'SKILL_ENDORSED', {
      userId: endorserId,
      authorName: endorserName,
      message: `endorsed your skill: ${skillName}`
    });
  },

  // DM events
  async newDM(recipientId: string, senderId: string, senderName: string, conversationId: string, messageId: string, preview: string) {
    await publishToUser(recipientId, 'NEW_DM', {
      conversationId,
      messageId,
      userId: senderId,
      senderName,
      messagePreview: preview.slice(0, 50)
    });
  },

  async typingIndicator(conversationId: string, participantIds: string[], typingUserId: string, isTyping: boolean) {
    const type = isTyping ? 'TYPING_START' : 'TYPING_STOP';
    const recipients = participantIds.filter(id => id !== typingUserId);
    await publishToUsers(recipients, type, {
      conversationId,
      userId: typingUserId
    });
  }
};

export { publisher, isRedisConnected };
