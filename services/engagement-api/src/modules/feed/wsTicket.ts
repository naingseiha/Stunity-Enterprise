/**
 * Short-lived, single-use tickets for Quiz War WebSocket authentication.
 *
 * Browser/RN WebSocket clients typically cannot set Authorization headers on
 * the upgrade request. Exchanging a header-authenticated JWT for an opaque
 * ticket keeps the long-lived access token out of Cloud Run access logs.
 */

import crypto from 'crypto';
import { publisher, isRedisConnected } from './redis';

const TICKET_TTL_SECONDS = 30;
const TICKET_PREFIX = 'ws:ticket:';

const memoryTickets = new Map<string, { jwt: string; expiresAt: number }>();

function pruneMemoryTickets(): void {
  const now = Date.now();
  for (const [ticket, entry] of memoryTickets) {
    if (entry.expiresAt <= now) memoryTickets.delete(ticket);
  }
}

export async function mintWsTicket(jwtToken: string): Promise<string> {
  const ticket = crypto.randomBytes(24).toString('base64url');

  if (publisher && isRedisConnected) {
    await publisher.set(TICKET_PREFIX + ticket, jwtToken, 'EX', TICKET_TTL_SECONDS);
  } else {
    pruneMemoryTickets();
    memoryTickets.set(ticket, { jwt: jwtToken, expiresAt: Date.now() + TICKET_TTL_SECONDS * 1000 });
  }

  return ticket;
}

export async function consumeWsTicket(ticket: string): Promise<string | null> {
  if (publisher && isRedisConnected) {
    const key = TICKET_PREFIX + ticket;
    const jwtToken = await publisher.get(key);
    if (!jwtToken) return null;
    await publisher.del(key);
    return jwtToken;
  }

  pruneMemoryTickets();
  const entry = memoryTickets.get(ticket);
  if (!entry) return null;
  memoryTickets.delete(ticket);
  return entry.jwt;
}

export const WS_TICKET_TTL_SECONDS = TICKET_TTL_SECONDS;
