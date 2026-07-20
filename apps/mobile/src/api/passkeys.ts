import { authApi } from './client';

export function getRegistrationOptions() {
  return authApi.post('/auth/passkeys/register/options').then((res) => res.data.data);
}

export function verifyRegistration(response: unknown, deviceLabel?: string) {
  return authApi
    .post('/auth/passkeys/register/verify', { response, deviceLabel })
    .then((res) => res.data.data);
}

export function getAuthenticationOptions(): Promise<{ challengeId: string; options: unknown }> {
  return authApi.post('/auth/passkeys/authenticate/options').then((res) => res.data.data);
}

export function verifyAuthentication(challengeId: string, response: unknown) {
  return authApi
    .post('/auth/passkeys/authenticate/verify', { challengeId, response })
    .then((res) => res.data.data);
}

export function listPasskeys(): Promise<{
  passkeys: Array<{ id: string; deviceLabel: string | null; createdAt: string; lastUsedAt: string | null }>;
}> {
  return authApi.get('/auth/me/passkeys').then((res) => res.data.data);
}

export function removePasskey(id: string) {
  return authApi.delete(`/auth/me/passkeys/${encodeURIComponent(id)}`).then((res) => res.data.data);
}
