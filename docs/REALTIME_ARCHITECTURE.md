# Stunity Enterprise - Real-Time Architecture Guide

**Created:** February 5, 2026  
**Vision:** Global Education Platform with Real-Time Features

---

## 🏗️ Current Infrastructure

| Component | Service | Tier | Scalability |
|-----------|---------|------|-------------|
| **Frontend** | Vercel | Free → Pro | Excellent (Edge) |
| **Backend APIs** | Google Cloud Run | Free tier | Excellent (Auto-scale) |
| **Database** | Supabase / Neon | Free tier | Good (Postgres) |
| **Cache** | Redis (Upstash/Redis Cloud) | Free tier | Excellent |
| **Media Storage** | Cloudflare R2 | Free tier | Excellent |
| **Mobile** | React Native | App Store fees | N/A |

---

## 🎯 Recommended Real-Time Strategy

### **Primary: Server-Sent Events (SSE) + Smart Polling**

This is the **best choice** for your current stage because:

1. ✅ **Free** - No additional services needed
2. ✅ **Works on Cloud Run** - No timeout issues for SSE
3. ✅ **Scalable** - Easy to migrate to WebSockets later
4. ✅ **Mobile-friendly** - Works with React Native
5. ✅ **Simple** - No complex infrastructure

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   Feed Page      │  │   Chat/DM Page   │  │ Notifications │ │
│  │   (SSE Stream)   │  │   (SSE + Poll)   │  │ (SSE Stream)  │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
└───────────┼─────────────────────┼────────────────────┼─────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Google Cloud Run)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SSE Service (feed-service)                   │  │
│  │  /api/events/stream?userId=xxx                           │  │
│  │  - New posts in feed                                     │  │
│  │  - New likes/comments on your posts                      │  │
│  │  - New followers                                         │  │
│  │  - New DM messages                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Redis (Upstash)                        │  │
│  │  - PubSub for multi-instance sync                        │  │
│  │  - Event queue                                           │  │
│  │  - Session data                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE (Supabase/Neon)                      │
│  - Posts, Comments, Likes                                       │
│  - DM Conversations, Messages                                   │
│  - Notifications                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Implementation Plan

### Phase 1: SSE Infrastructure (Current Phase)

```typescript
// Backend: SSE endpoint in feed-service
app.get('/api/events/stream', async (req, res) => {
  const userId = req.query.userId;
  
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx
  
  // Subscribe to Redis pubsub for this user
  const subscriber = redis.duplicate();
  await subscriber.subscribe(`user:${userId}:events`);
  
  subscriber.on('message', (channel, message) => {
    res.write(`data: ${message}\n\n`);
  });
  
  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);
  
  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    subscriber.unsubscribe();
    subscriber.quit();
  });
});

// When something happens (new like, comment, DM, etc.)
async function publishEvent(userId: string, event: any) {
  await redis.publish(`user:${userId}:events`, JSON.stringify(event));
}
```

```typescript
// Frontend: SSE client hook
function useEventStream(userId: string) {
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource(
      `${API_URL}/api/events/stream?userId=${userId}`
    );
    
    eventSource.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents(prev => [event, ...prev]);
      
      // Handle specific event types
      if (event.type === 'NEW_DM') {
        // Show notification, update DM badge
      }
    };
    
    eventSource.onerror = () => {
      // Reconnect after 5 seconds
      setTimeout(() => eventSource.close(), 5000);
    };
    
    return () => eventSource.close();
  }, [userId]);
  
  return events;
}
```

### Phase 2: React Native Support

For mobile apps, SSE works but with limitations. Use this approach:

```typescript
// React Native: Polling fallback for background
import { useEffect } from 'react';
import { AppState } from 'react-native';

function useNotifications() {
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    
    const startSSE = () => {
      eventSource = new EventSource(`${API_URL}/api/events/stream`);
      // ... SSE handling
    };
    
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        const notifications = await fetchNewNotifications();
        // Handle notifications
      }, 10000); // Poll every 10s in background
    };
    
    const handleAppStateChange = (state: string) => {
      if (state === 'active') {
        // App is in foreground - use SSE
        if (pollInterval) clearInterval(pollInterval);
        startSSE();
      } else {
        // App is in background - use polling
        if (eventSource) eventSource.close();
        startPolling();
      }
    };
    
    AppState.addEventListener('change', handleAppStateChange);
    startSSE(); // Start with SSE
    
    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);
}
```

---

## 🔄 Event Types

| Event Type | Description | Example |
|------------|-------------|---------|
| `NEW_POST` | New post in your feed | `{type: 'NEW_POST', postId: '123', authorId: '456'}` |
| `NEW_LIKE` | Someone liked your post | `{type: 'NEW_LIKE', postId: '123', userId: '456'}` |
| `NEW_COMMENT` | New comment on your post | `{type: 'NEW_COMMENT', postId: '123', commentId: '789'}` |
| `NEW_FOLLOWER` | Someone followed you | `{type: 'NEW_FOLLOWER', userId: '456'}` |
| `NEW_DM` | New direct message | `{type: 'NEW_DM', conversationId: '123', messageId: '456'}` |
| `TYPING` | Someone is typing in DM | `{type: 'TYPING', conversationId: '123', userId: '456'}` |
| `REACTION` | New reaction on post | `{type: 'REACTION', postId: '123', reactionType: 'love'}` |

---

## 📈 Scaling Strategy

### Stage 1: MVP (Current - 0-1000 users)
- **SSE + Redis PubSub** on Cloud Run
- Single Redis instance (Upstash free tier: 10k commands/day)
- No additional costs

### Stage 2: Growth (1000-10,000 users)
- Upgrade to Redis Cloud/Upstash Pro ($10-25/month)
- Enable Cloud Run autoscaling (min: 1, max: 5)
- Consider CDN for static assets

### Stage 3: Scale (10,000-100,000 users)
- **Option A: Continue with SSE + Redis Cluster**
  - Redis Cluster for high availability
  - Cloud Run regional deployment
  
- **Option B: Migrate to Managed WebSockets**
  - Ably/Pusher for WebSocket management
  - Or: Google Cloud Pub/Sub + WebSocket service

### Stage 4: Global (100,000+ users)
- Multi-region Cloud Run deployment
- Global Redis (Redis Enterprise)
- Consider: Firebase Realtime DB for specific features
- CDN edge caching (Cloudflare)

---

## 💰 Cost Comparison

| Users | SSE + Redis (Upstash) | Firebase Realtime | Pusher |
|-------|----------------------|-------------------|--------|
| 1K | **Free** | Free | Free |
| 10K | ~$10/mo | ~$25/mo | ~$49/mo |
| 100K | ~$50/mo | ~$100/mo | ~$499/mo |
| 1M | ~$200/mo | ~$400/mo | Enterprise |

**Recommendation:** Start with SSE + Upstash Redis (free), scale as needed.

---

## 🚀 Migration Path

If you need to switch to WebSockets later, the migration is straightforward:

```typescript
// Current: SSE
const eventSource = new EventSource('/api/events/stream');

// Future: WebSocket (same event handling)
const ws = new WebSocket('wss://your-ws-server.com');
ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  // Same event handling logic
};
```

The event structure remains the same, so your frontend components don't need changes.

---

## ✅ Summary

| Feature | Implementation | Infrastructure |
|---------|---------------|----------------|
| Live Feed Updates | SSE stream | Cloud Run |
| Notifications | SSE stream | Cloud Run + Redis |
| DM Messages | SSE + Short polling for list | Cloud Run + Redis |
| Typing Indicators | SSE (debounced) | Redis PubSub |
| Reactions | SSE instant update | Redis PubSub |
| Online Status | Redis presence | Upstash Redis |

**Total Additional Cost: $0** (within free tiers)

---

## 📝 Files to Create

1. `services/feed-service/src/sse.ts` - SSE handler
2. `packages/shared/src/events.ts` - Event type definitions
3. `apps/web/src/hooks/useEventStream.ts` - SSE client hook
4. `apps/mobile/src/hooks/useNotifications.ts` - Mobile notifications

---

**Next Step:** Implement SSE infrastructure in feed-service, then build DM feature on top of it.
