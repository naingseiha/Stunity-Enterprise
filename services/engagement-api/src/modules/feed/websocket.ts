import { getJwtSecret } from '../../../../lib/jwt-secret';
import { IncomingMessage, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyAccessToken } from '../auth/security/tokenClaims';
import { parse as parseUrl } from 'url';
import { createSubscriber, isRedisConnected, publisher } from './redis';
import { inMemorySubscribe } from './redis';

import { REDIS_CHANNELS, SSEEvent } from './events';
import { isQuizWarEnabled } from './featureFlags';
import { consumeWsTicket } from './wsTicket';

const JWT_SECRET = getJwtSecret();

// Map of warId -> Set of active WebSocket connections
const activeConnections = new Map<string, Set<WebSocket>>();

function rejectUpgrade(socket: any, status: 401 | 403) {
  const reason = status === 401 ? 'Unauthorized' : 'Forbidden';
  socket.write(`HTTP/1.1 ${status} ${reason}\r\n\r\n`);
  socket.destroy();
}

export function initWebSocketServer(server: Server) {
  if (!isQuizWarEnabled()) {
    console.log('📡 WS: Quiz War WebSocket disabled by QUIZ_WAR_ENABLED');
    return;
  }

  const wss = new WebSocketServer({ noServer: true });

  console.log('📡 WS: Initializing Quiz War WebSocket Server');

  // Handle upgrade manually to support route matching + ticket auth.
  // Clients mint a short-lived opaque ticket over HTTPS (Authorization header)
  // and only that ticket appears on the WS URL — never the access JWT.
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    void (async () => {
      const { pathname, query } = parseUrl(request.url || '', true);

      const match = pathname?.match(/^\/quiz-wars\/([a-zA-Z0-9_-]+)\/ws$/);
      if (!match) {
        return;
      }

      const warId = match[1];
      const ticket = typeof query.ticket === 'string' ? query.ticket : undefined;

      if (!ticket) {
        rejectUpgrade(socket, 401);
        return;
      }

      try {
        const jwtToken = await consumeWsTicket(ticket);
        if (!jwtToken) {
          rejectUpgrade(socket, 403);
          return;
        }

        const decoded = verifyAccessToken(jwtToken, JWT_SECRET);
        if (!decoded?.userId) {
          rejectUpgrade(socket, 403);
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, warId, decoded.userId);
        });
      } catch (err) {
        rejectUpgrade(socket, 403);
      }
    })();
  });

  wss.on('connection', (ws: WebSocket, request: IncomingMessage, ...args: any[]) => {
    const warId = args[0] as string;
    const userId = args[1] as string;

    console.log(`📡 WS: User ${userId} connected to war ${warId}`);

    if (!activeConnections.has(warId)) {
      activeConnections.set(warId, new Set());
    }
    activeConnections.get(warId)!.add(ws);

    ws.send(JSON.stringify({ type: 'CONNECTED', warId }));

    ws.on('message', (message: string) => {
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
  if (!isQuizWarEnabled()) return;

  const messagePayload = {
    warId,
    event,
  };

  const { publishGlobal } = require('./redis');
  await publishGlobal('QUIZ_WAR_UPDATED' as any, messagePayload);
}
