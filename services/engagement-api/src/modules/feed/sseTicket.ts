/**
 * Short-lived, single-use tickets for SSE authentication.
 *
 * EventSource cannot set an Authorization header, so the browser must pass
 * proof of identity via the URL — which Cloud Run logs in plaintext. To keep
 * the real JWT out of access logs, the client exchanges its JWT for a random
 * opaque ticket (via an authenticated, header-based request) and only the
 * ticket appears in the /stream URL. The ticket resolves back to the JWT
 * server-side and is deleted on first use.
 */

import crypto from 'crypto';
import { publisher, isRedisConnected } from './redis';

const TICKET_TTL_SECONDS = 30;
const TICKET_PREFIX = 'sse:ticket:';

// Fallback store when Redis is unavailable (single-instance/dev only).
const memoryTickets = new Map<string, { jwt: string; expiresAt: number }>();

function pruneMemoryTickets(): void {
  const now = Date.now();
  for (const [ticket, entry] of memoryTickets) {
    if (entry.expiresAt <= now) memoryTickets.delete(ticket);
  }
}

export async function mintSseTicket(jwtToken: string): Promise<string> {
  const ticket = crypto.randomBytes(24).toString('base64url');

  if (publisher && isRedisConnected) {
    await publisher.set(TICKET_PREFIX + ticket, jwtToken, 'EX', TICKET_TTL_SECONDS);
  } else {
    pruneMemoryTickets();
    memoryTickets.set(ticket, { jwt: jwtToken, expiresAt: Date.now() + TICKET_TTL_SECONDS * 1000 });
  }

  return ticket;
}

export async function consumeSseTicket(ticket: string): Promise<string | null> {
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
