/**
 * Server-Sent Events (SSE) Handler
 * Provides real-time event streaming to connected clients
 */

import { Request, Response, Router } from 'express';
import { createSubscriber, inMemorySubscribe, isRedisConnected } from './redis';
import { SSEEvent, REDIS_CHANNELS } from './events';

const router = Router();

// Track active connections for metrics
let activeConnections = 0;

/**
 * SSE Stream Endpoint
 * GET /api/events/stream?userId=xxx
 * 
 * Clients connect to this endpoint to receive real-time events
 */
router.get('/stream', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  activeConnections++;
  console.log(`📡 SSE: User ${userId} connected (${activeConnections} active)`);

  // Send initial connection event
  sendEvent(res, {
    id: 'init',
    type: 'CONNECTED',
    timestamp: new Date().toISOString(),
    data: { message: 'Connected to event stream' }
  });

  // Track cleanup functions
  const cleanupFns: (() => void)[] = [];

  // Subscribe to user's personal channel
  if (isRedisConnected) {
    // Use Redis PubSub
    const subscriber = createSubscriber();
    if (subscriber) {
      const userChannel = REDIS_CHANNELS.userEvents(userId);
      const globalChannel = REDIS_CHANNELS.globalEvents;

      subscriber.subscribe(userChannel, globalChannel).then(() => {
        console.log(`📡 SSE: Subscribed to ${userChannel}`);
      });

      subscriber.on('message', (channel: string, message: string) => {
        try {
          const event = JSON.parse(message) as SSEEvent;
          sendEvent(res, event);
        } catch (error) {
          console.error('Failed to parse event:', error);
        }
      });

      cleanupFns.push(() => {
        subscriber.unsubscribe();
        subscriber.quit();
      });
    }
  } else {
    // Use in-memory fallback
    const userChannel = REDIS_CHANNELS.userEvents(userId);
    const globalChannel = REDIS_CHANNELS.globalEvents;

    const unsub1 = inMemorySubscribe(userChannel, (event) => sendEvent(res, event));
    const unsub2 = inMemorySubscribe(globalChannel, (event) => sendEvent(res, event));

    cleanupFns.push(unsub1, unsub2);
  }

  // Heartbeat to keep connection alive (every 30 seconds)
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 30000);
  cleanupFns.push(() => clearInterval(heartbeatInterval));

  // Cleanup on client disconnect
  req.on('close', () => {
    activeConnections--;
    console.log(`📡 SSE: User ${userId} disconnected (${activeConnections} active)`);
    cleanupFns.forEach(fn => fn());
  });

  // Handle errors
  req.on('error', (err) => {
    console.error('SSE request error:', err);
    cleanupFns.forEach(fn => fn());
  });
});

/**
 * Get SSE connection stats
 * GET /api/events/stats
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    activeConnections,
    redisConnected: isRedisConnected,
    timestamp: new Date().toISOString()
  });
});

/**
 * Send an SSE event to the response stream
 */
function sendEvent(res: Response, event: SSEEvent) {
  if (res.writableEnded) return;
  
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export default router;
