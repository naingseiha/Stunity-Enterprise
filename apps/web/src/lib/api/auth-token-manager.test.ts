import { TokenManager } from './auth';

function fakeAccessToken(expiresAtSeconds: number) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode({ exp: expiresAtSeconds })}.signature`;
}

describe('TokenManager rotating-session support', () => {
  const values = new Map<string, string>();

  beforeAll(() => {
    Object.defineProperty(global, 'window', { value: {}, configurable: true });
    Object.defineProperty(global, 'navigator', { value: {}, configurable: true });
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, String(value)),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      },
    });
  });

  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('refreshes only when the access token is close to expiry', () => {
    const now = Math.floor(Date.now() / 1000);
    TokenManager.setTokens(fakeAccessToken(now + 3600), 'opaque-refresh');
    expect(TokenManager.accessTokenExpiresWithin(600)).toBe(false);

    TokenManager.setTokens(fakeAccessToken(now + 300), 'opaque-refresh');
    expect(TokenManager.accessTokenExpiresWithin(600)).toBe(true);
  });

  it('persists the rotated opaque credential returned by the server', async () => {
    TokenManager.setTokens(fakeAccessToken(Math.floor(Date.now() / 1000) + 30), 'old-refresh');
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { accessToken: 'new-access', refreshToken: 'new-opaque-refresh' },
      }),
    } as Response);

    await expect(TokenManager.refreshTokens()).resolves.toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-opaque-refresh');
  });
});
