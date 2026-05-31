import { IncomingMessage, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { parse as parseUrl } from 'url';
import { createSubscriber, isRedisConnected, publisher } from './redis';
import { inMemorySubscribe } from './redis';

import { REDIS_CHANNELS, SSEEvent } from './events';

const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// Map of warId -> Set of active WebSocket connections
const activeConnections = new Map<string, Set<WebSocket>>();

export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  console.log('📡 WS: Initializing Quiz War WebSocket Server');

  // Handle upgrade manually to support route matching + authentication
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const { pathname, query } = parseUrl(request.url || '', true);

    // Match path: /quiz-wars/:id/ws
    const match = pathname?.match(/^\/quiz-wars\/([a-zA-Z0-9_-]+)\/ws$/);
    if (!match) {
      // Not a quiz war ws request, ignore and let other systems upgrade (e.g. messaging if any)
      return;
    }

    const warId = match[1];
    const token = typeof query.token === 'string' ? query.token : undefined;

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded || !decoded.userId) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // Upgrade connection
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, warId, decoded.userId);
      });
    } catch (err) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, request: IncomingMessage, ...args: any[]) => {
    const warId = args[0] as string;
    const userId = args[1] as string;

    console.log(`📡 WS: User ${userId} connected to war ${warId}`);

    if (!activeConnections.has(warId)) {
      activeConnections.set(warId, new Set());
    }
    activeConnections.get(warId)!.add(ws);

    // Send connection success acknowledgement
    ws.send(JSON.stringify({ type: 'CONNECTED', warId }));

    ws.on('message', (message: string) => {
      // Clients only receive score pushes, no interactive input required on WS stream
      console.log(`📡 WS: Received message from user ${userId} on war ${warId}: ${message}`);
    });

    ws.on('close', () => {
      console.log(`📡 WS: User ${userId} disconnected from war ${warId}`);
      const clients = activeConnections.get(warId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          activeConnections.delete(warId);
        }
      }
    });

    ws.on('error', (err) => {
      console.error(`📡 WS: Error for user ${userId} on war ${warId}:`, err);
      const clients = activeConnections.get(warId);
      if (clients) {
        clients.delete(ws);
      }
    });
  });

  // ── Redis PubSub Subscription ──
  if (isRedisConnected) {
    const subscriber = createSubscriber();
    if (subscriber) {
      subscriber.subscribe(REDIS_CHANNELS.globalEvents).then(() => {
        console.log(`📡 WS: Subscribed to Redis channel "${REDIS_CHANNELS.globalEvents}"`);
      });

      subscriber.on('message', (channel, message) => {
        if (channel === REDIS_CHANNELS.globalEvents) {
          handlePubSubMessage(message);
        }
      });
    }
  }

  // ── In-Memory Fallback Subscription ──
  inMemorySubscribe(REDIS_CHANNELS.globalEvents, (event: SSEEvent) => {
    if (event.type === ('QUIZ_WAR_UPDATED' as any) && event.data) {
      broadcastToWar(event.data.warId, event.data.event);
    }
  });
}

function handlePubSubMessage(message: string) {
  try {
    const event = JSON.parse(message) as SSEEvent;
    if (event && event.type === ('QUIZ_WAR_UPDATED' as any) && event.data) {
      broadcastToWar(event.data.warId, event.data.event);
    }
  } catch (err) {
    console.error('📡 WS: Failed to parse PubSub message:', err);
  }
}

function broadcastToWar(warId: string, event: any) {
  const clients = activeConnections.get(warId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify(event);
  console.log(`📡 WS: Broadcasting update for war ${warId} to ${clients.size} clients`);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Publish update to both Redis and local pub-sub fallback
 */
export async function publishQuizWarUpdate(warId: string, event: any): Promise<void> {
  const messagePayload = {
    warId,
    event,
  };

  const { publishGlobal } = require('./redis');
  await publishGlobal('QUIZ_WAR_UPDATED' as any, messagePayload);
}
