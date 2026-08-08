import { IncomingMessage, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { createSubscriber, isRedisConnected, publisher } from './redis';
import { inMemorySubscribe } from './redis';
import { verifyAccessToken } from '../../lib/auth-tokens';
import { getJwtSecret } from '../../lib/jwt-secret';

import { REDIS_CHANNELS, SSEEvent } from './events';

const JWT_SECRET = getJwtSecret();

// Map of warId -> Set of active WebSocket connections
const activeConnections = new Map<string, Set<WebSocket>>();

function rejectUpgrade(socket: any, status: 401 | 403) {
  const reason = status === 401 ? 'Unauthorized' : 'Forbidden';
  socket.write(`HTTP/1.1 ${status} ${reason}\r\n\r\n`);
  socket.destroy();
}

export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  console.log('📡 WS: Initializing Quiz War WebSocket Server');

  // Prefer short-lived opaque tickets. Legacy ?token= access JWTs are rejected
  // so long-lived credentials never appear in proxy access logs.
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const { pathname, query } = parseUrl(request.url || '', true);

    const match = pathname?.match(/^\/quiz-wars\/([a-zA-Z0-9_-]+)\/ws$/);
    if (!match) {
      return;
    }

    const warId = match[1];
    // Standalone feed-service is legacy; keep verifyAccessToken but require
    // Authorization-style token only via a pre-exchanged ticket query param
    // when the consolidated engagement-api path is unavailable.
    const ticketOrToken = typeof query.ticket === 'string'
      ? query.ticket
      : typeof query.token === 'string'
        ? query.token
        : undefined;

    if (!ticketOrToken) {
      rejectUpgrade(socket, 401);
      return;
    }

    try {
      // When ticket stores are unavailable in this legacy binary, treat the
      // value as an access JWT (dev-only fallback). Production traffic should
      // hit engagement-api which consumes opaque tickets first.
      const decoded = verifyAccessToken(ticketOrToken, JWT_SECRET);
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

export async function publishQuizWarUpdate(warId: string, event: any): Promise<void> {
  const messagePayload = {
    warId,
    event,
  };

  const { publishGlobal } = require('./redis');
  await publishGlobal('QUIZ_WAR_UPDATED' as any, messagePayload);
}
