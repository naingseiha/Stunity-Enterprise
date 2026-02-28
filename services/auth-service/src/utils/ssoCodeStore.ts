/**
 * In-memory store for short-lived SSO authorization codes.
 * Tokens are exchanged for a code to avoid passing them in URL.
 * For multi-instance production, consider Redis.
 */

import crypto from 'crypto';

interface StoredData {
  accessToken: string;
  refreshToken: string;
  user: any;
  school: any;
  expiresAt: number;
}

const store = new Map<string, StoredData>();

const TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateCode(): string {
  const buf = Buffer.alloc(32);
  crypto.randomFillSync(buf);
  return buf.toString('base64url');
}

export function createCode(accessToken: string, refreshToken: string, user: any, school: any): string {
  const code = generateCode();
  store.set(code, {
    accessToken,
    refreshToken,
    user,
    school,
    expiresAt: Date.now() + TTL_MS,
  });
  return code;
}

export function consumeCode(code: string): StoredData | null {
  const data = store.get(code);
  if (!data) return null;
  store.delete(code);
  if (Date.now() > data.expiresAt) return null;
  return data;
}
