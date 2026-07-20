import { TokenManager } from './auth';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;

async function authedJson(path: string, init?: RequestInit) {
  const token = TokenManager.getAccessToken();
  const response = await fetch(`${AUTH_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Passkey request failed');
  return result.data;
}

async function publicJson(path: string, init?: RequestInit) {
  const response = await fetch(`${AUTH_SERVICE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Passkey request failed');
  return result.data;
}

export function getRegistrationOptions() {
  return authedJson('/auth/passkeys/register/options', { method: 'POST' });
}

export function verifyRegistration(response: unknown, deviceLabel?: string) {
  return authedJson('/auth/passkeys/register/verify', {
    method: 'POST',
    body: JSON.stringify({ response, deviceLabel }),
  });
}

export function getAuthenticationOptions(): Promise<{ challengeId: string; options: unknown }> {
  return publicJson('/auth/passkeys/authenticate/options', { method: 'POST' });
}

export function verifyAuthentication(challengeId: string, response: unknown) {
  return publicJson('/auth/passkeys/authenticate/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, response }),
  });
}

export function listPasskeys(): Promise<{ passkeys: Array<{ id: string; deviceLabel: string | null; createdAt: string; lastUsedAt: string | null }> }> {
  return authedJson('/auth/me/passkeys');
}

export function removePasskey(id: string) {
  return authedJson(`/auth/me/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
