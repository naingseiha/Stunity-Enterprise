import { TokenManager } from './auth';

function fakeAccessToken(expiresAtSeconds: number) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode({ exp: expiresAtSeconds })}.signature`;
}

type MockFetchCall = { url: string; init?: RequestInit };

describe('TokenManager rotating-session support', () => {
  const localValues = new Map<string, string>();
  const sessionValues = new Map<string, string>();
  let fetchCalls: MockFetchCall[];

  function makeStorage(values: Map<string, string>) {
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    };
  }

  beforeAll(() => {
    Object.defineProperty(global, 'window', { value: {}, configurable: true });
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'jest-user-agent' },
      configurable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: makeStorage(localValues),
    });
    Object.defineProperty(global, 'sessionStorage', {
      configurable: true,
      value: makeStorage(sessionValues),
    });
  });

  beforeEach(() => {
    TokenManager.clearTokens();
    localValues.clear();
    sessionValues.clear();
    fetchCalls = [];
    jest.restoreAllMocks();
  });

  function mockFetchSequence(
    handlers: Array<(url: string, init?: RequestInit) => Promise<Partial<Response> & { json?: () => Promise<unknown> }>>,
  ) {
    let i = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, init });
      const handler = handlers[Math.min(i, handlers.length - 1)];
      i += 1;
      const partial = await handler(url, init);
      return {
        ok: partial.ok ?? false,
        status: partial.status ?? (partial.ok ? 200 : 500),
        json: partial.json ?? (async () => ({})),
      } as Response;
    });
  }

  it('refreshes only when the access token is close to expiry', () => {
    mockFetchSequence([async () => ({ ok: true, json: async () => ({ success: true }) })]);
    const now = Math.floor(Date.now() / 1000);
    TokenManager.setTokens(fakeAccessToken(now + 3600), 'opaque-refresh-token-12345');
    expect(TokenManager.accessTokenExpiresWithin(600)).toBe(false);

    TokenManager.setTokens(fakeAccessToken(now + 300), 'opaque-refresh-token-12345');
    expect(TokenManager.accessTokenExpiresWithin(600)).toBe(true);
  });

  it('keeps access in memory/sessionStorage and migrates refresh into the httpOnly cookie', async () => {
    mockFetchSequence([
      async (url) => {
        expect(url).toBe('/api/auth/session');
        return { ok: true, json: async () => ({ success: true }) };
      },
    ]);

    const access = fakeAccessToken(Math.floor(Date.now() / 1000) + 3600);
    TokenManager.setTokens(access, 'opaque-refresh-token-12345');
    expect(TokenManager.getAccessToken()).toBe(access);
    expect(sessionStorage.getItem('accessToken')).toBe(access);
    expect(localStorage.getItem('accessToken')).toBeNull();

    await new Promise((r) => setImmediate(r));
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(fetchCalls[0]?.url).toBe('/api/auth/session');
    expect(fetchCalls[0]?.init?.credentials).toBe('same-origin');
  });

  it('refreshes via the cookie BFF and never keeps tokens in localStorage', async () => {
    mockFetchSequence([
      async (url) => {
        expect(url).toBe('/api/auth/refresh');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { accessToken: 'new-access', expiresIn: 900 },
          }),
        };
      },
    ]);

    await expect(TokenManager.refreshTokens()).resolves.toBe(true);
    expect(TokenManager.getAccessToken()).toBe('new-access');
    expect(sessionStorage.getItem('accessToken')).toBe('new-access');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(fetchCalls[0]?.init?.credentials).toBe('same-origin');
  });

  it('falls back to legacy body refresh once, then migrates into the cookie', async () => {
    localStorage.setItem('refreshToken', 'legacy-refresh-token-abcde');

    jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, init });
      if (url === '/api/auth/refresh') {
        return {
          ok: false,
          status: 401,
          json: async () => ({ success: false, code: 'REFRESH_COOKIE_MISSING' }),
        } as Response;
      }
      if (url.includes('/auth/refresh')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { accessToken: 'legacy-access', refreshToken: 'rotated-refresh-token-xyz' },
          }),
        } as Response;
      }
      if (url === '/api/auth/session') {
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    await expect(TokenManager.refreshTokens()).resolves.toBe(true);
    expect(TokenManager.getAccessToken()).toBe('legacy-access');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(fetchCalls.map((c) => c.url)).toEqual([
      '/api/auth/refresh',
      'http://localhost:3001/auth/refresh',
      '/api/auth/session',
    ]);
  });

  it('logs out through the cookie BFF', async () => {
    TokenManager.setTokens('access', 'opaque-refresh-token-12345');
    mockFetchSequence([
      async () => ({ ok: true, json: async () => ({ success: true }) }), // setTokens migrate
      async (url) => {
        expect(url).toBe('/api/auth/logout');
        return { ok: true, json: async () => ({ success: true }) };
      },
    ]);

    await TokenManager.logout();
    expect(TokenManager.getAccessToken()).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
