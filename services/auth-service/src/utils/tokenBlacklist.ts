/**
 * In-memory refresh token blacklist for logout revocation.
 * Revoked tokens are rejected on /auth/refresh until they naturally expire.
 *
 * For multi-instance production, use Redis instead of in-memory Map.
 */
import crypto from 'crypto';

const blacklist = new Map<string, number>(); // hash -> expiry timestamp (ms)
const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function revokeRefreshToken(token: string, maxAgeMs: number): void {
  const hash = hashToken(token);
  const expiry = Date.now() + maxAgeMs;
  blacklist.set(hash, expiry);
}

export function isRevoked(token: string): boolean {
  const hash = hashToken(token);
  const expiry = blacklist.get(hash);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    blacklist.delete(hash);
    return false;
  }
  return true;
}

function prune(): void {
  const now = Date.now();
  for (const [hash, expiry] of blacklist.entries()) {
    if (now > expiry) blacklist.delete(hash);
  }
}

setInterval(prune, PRUNE_INTERVAL_MS);
