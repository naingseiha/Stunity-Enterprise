import { authApi } from './client';

export type AuthSession = {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent?: boolean;
};

export async function listAuthSessions(): Promise<AuthSession[]> {
  const response = await authApi.get<{
    success: boolean;
    data?: { sessions: AuthSession[] };
    error?: string;
  }>('/auth/me/sessions');

  if (!response.data?.success) {
    throw new Error(response.data?.error || 'Failed to load sessions');
  }
  return response.data.data?.sessions || [];
}

export async function revokeAuthSession(sessionId: string): Promise<void> {
  const response = await authApi.delete<{
    success: boolean;
    error?: string;
  }>(`/auth/me/sessions/${encodeURIComponent(sessionId)}`);

  if (!response.data?.success) {
    throw new Error(response.data?.error || 'Failed to revoke session');
  }
}

export async function revokeOtherAuthSessions(): Promise<number> {
  const response = await authApi.post<{
    success: boolean;
    data?: { revokedCount: number };
    error?: string;
  }>('/auth/me/sessions/revoke-others');

  if (!response.data?.success) {
    throw new Error(response.data?.error || 'Failed to revoke other sessions');
  }
  return response.data.data?.revokedCount ?? 0;
}
