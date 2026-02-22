/**
 * Redis PubSub Manager for Real-Time Events
 * Handles publishing and subscribing to Redis channels for SSE
 */

import Redis from 'ioredis';
import { SSEEvent, createEvent, EventType, EventData, REDIS_CHANNELS } from './events';

// Simple in-memory LRU cache (fallback when Redis unavailable - Free Tier friendly)
class LRUCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 100, ttlSeconds = 900) {
    this.maxSize = maxSize;
    this.ttlMs = ttlSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  deleteByPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// In-memory cache for hot feeds (top 100 cached feeds)
const memoryCache = new LRUCache<any>(100, 900); // 100 entries, 15min TTL

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

// ========================================
// Feed Response Cache (reuses publisher client)
// ========================================

const FEED_CACHE_TTL = 900; // 15 minutes (Phase 1 optimization: increased from 5min for better hit rate)

export const feedCache = {
  async get(key: string): Promise<any | null> {
    // Try memory cache first (instant, works without Redis)
    const memCached = memoryCache.get(key);
    if (memCached) return memCached;

    // Fall back to Redis if available
    if (!publisher || !isRedisConnected) return null;
    try {
      const cached = await publisher.get(`feed:${key}`);
      if (cached) {
        const data = JSON.parse(cached);
        // Backfill memory cache
        memoryCache.set(key, data);
        return data;
      }
      return null;
    } catch {
      return null;
    }
  },

  async set(key: string, data: any): Promise<void> {
    // Always set in memory cache (works without Redis)
    memoryCache.set(key, data);

    // Also cache in Redis if available
    if (!publisher || !isRedisConnected) return;
    try {
      await publisher.setex(`feed:${key}`, FEED_CACHE_TTL, JSON.stringify(data));
    } catch {
      // Non-critical — memory cache still works
    }
  },

  async invalidateUser(userId: string): Promise<void> {
    // Clear memory cache
    memoryCache.deleteByPattern(`feedranker:session:${userId}:*`);

    // Clear Redis if available — use SCAN (non-blocking) instead of KEYS (blocks Redis)
    if (!publisher || !isRedisConnected) return;
    try {
      const keysToDelete: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, keys] = await publisher.scan(cursor, 'MATCH', `feed:feedranker:session:${userId}:*`, 'COUNT', 100);
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');
      if (keysToDelete.length > 0) {
        await publisher.del(...keysToDelete);
      }
    } catch {
      // Non-critical
    }
  },
};

export { publisher, isRedisConnected };
