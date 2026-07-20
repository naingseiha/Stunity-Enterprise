import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'stunity.pending-school-claim.v1';
export const PENDING_SCHOOL_CLAIM_TTL_MS = 15 * 60 * 1000;
const CLAIM_CODE_PATTERN = /^[A-Z]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export type PendingSchoolClaim = {
  code: string;
  capturedAt: number;
  expiresAt: number;
};

export function normalizeClaimCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return CLAIM_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function extractClaimCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const queryMatch = trimmed.match(/[?&]code=([^&#]+)/i);
  if (queryMatch?.[1]) {
    try {
      return normalizeClaimCode(decodeURIComponent(queryMatch[1]));
    } catch {
      return normalizeClaimCode(queryMatch[1]);
    }
  }

  const pathMatch = trimmed.match(/\/claim\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    try {
      return normalizeClaimCode(decodeURIComponent(pathMatch[1]));
    } catch {
      return normalizeClaimCode(pathMatch[1]);
    }
  }

  return normalizeClaimCode(trimmed);
}

export async function savePendingSchoolClaim(
  value: string,
  now = Date.now(),
): Promise<PendingSchoolClaim | null> {
  const code = extractClaimCode(value);
  if (!code) return null;

  const pending = {
    code,
    capturedAt: now,
    expiresAt: now + PENDING_SCHOOL_CLAIM_TTL_MS,
  };
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(pending));
  return pending;
}

export async function getPendingSchoolClaim(now = Date.now()): Promise<PendingSchoolClaim | null> {
  const serialized = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!serialized) return null;

  try {
    const pending = JSON.parse(serialized) as Partial<PendingSchoolClaim>;
    const code = typeof pending.code === 'string' ? normalizeClaimCode(pending.code) : null;
    if (
      !code ||
      typeof pending.capturedAt !== 'number' ||
      typeof pending.expiresAt !== 'number' ||
      pending.expiresAt <= now
    ) {
      await clearPendingSchoolClaim();
      return null;
    }
    return { code, capturedAt: pending.capturedAt, expiresAt: pending.expiresAt };
  } catch {
    await clearPendingSchoolClaim();
    return null;
  }
}

export async function clearPendingSchoolClaim(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
