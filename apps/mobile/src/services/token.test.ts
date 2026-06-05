/**
 * Token refresh — the auth-critical concurrency + failure semantics.
 *
 * Focus: a burst of 401s (several in-flight requests expiring at once) must
 * trigger exactly ONE network refresh and all callers must receive the same new
 * token; terminal rejection clears the session; a transient network error
 * preserves tokens. SecureStore is mocked in-memory (jest.setup) and the auth
 * API client is mocked so no network is touched.
 */
import * as SecureStore from 'expo-secure-store';
import { tokenService } from '@/services/token';

// Mock the API client the service dynamically imports inside refreshAccessToken.
jest.mock('@/api/client', () => ({
  authApi: { post: jest.fn() },
}));
import { authApi } from '@/api/client';

const post = authApi.post as jest.Mock;

const refreshOk = (accessToken: string, refreshToken: string) => ({
  data: { success: true, data: { accessToken, refreshToken, expiresIn: '24h' } },
});

/** Get a value straight out of the in-memory SecureStore mock. */
const stored = (key: string) => (SecureStore.getItemAsync as jest.Mock)(key);

beforeEach(async () => {
  post.mockReset();
  await tokenService.clearTokens();
  // Seed a valid session: access "a0", refresh "r1".
  post.mockResolvedValueOnce(refreshOk('a0', 'r1'));
  // setTokens directly would be cleaner, but it's also exercised via a refresh;
  // use the public setter:
  await tokenService.setTokens({ accessToken: 'a0', refreshToken: 'r1', expiresIn: '24h' });
  post.mockReset();
});

describe('refreshAccessToken — success', () => {
  it('calls /auth/refresh once with the stored refresh token and persists the new pair', async () => {
    post.mockResolvedValueOnce(refreshOk('a1', 'r2'));

    const token = await tokenService.refreshAccessToken();

    expect(token).toBe('a1');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'r1' });
    expect(await stored('stunity_access_token')).toBe('a1');
    expect(await stored('stunity_refresh_token')).toBe('r2');
  });
});

describe('refreshAccessToken — concurrent 401 burst dedup', () => {
  it('coalesces simultaneous refreshes into one network call; all callers get the same token', async () => {
    // Hold the refresh in-flight so the later callers queue behind it.
    let resolvePost!: (v: unknown) => void;
    post.mockReturnValueOnce(new Promise((res) => { resolvePost = res; }));

    const p1 = tokenService.refreshAccessToken();
    const p2 = tokenService.refreshAccessToken();
    const p3 = tokenService.refreshAccessToken();

    // Complete the single in-flight refresh.
    resolvePost(refreshOk('a1', 'r2'));
    const [t1, t2, t3] = await Promise.all([p1, p2, p3]);

    expect(post).toHaveBeenCalledTimes(1); // one network refresh for three callers
    expect(t1).toBe('a1');
    expect(t2).toBe('a1');
    expect(t3).toBe('a1');
  });

  it('allows a fresh refresh after the previous one settled (isRefreshing resets)', async () => {
    post.mockResolvedValueOnce(refreshOk('a1', 'r2'));
    await tokenService.refreshAccessToken();
    post.mockResolvedValueOnce(refreshOk('a2', 'r3'));
    const token = await tokenService.refreshAccessToken();

    expect(token).toBe('a2');
    expect(post).toHaveBeenCalledTimes(2);
  });
});

describe('refreshAccessToken — failure handling', () => {
  it('terminal rejection (401) clears the session and rethrows', async () => {
    post.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(tokenService.refreshAccessToken()).rejects.toEqual({ response: { status: 401 } });
    // Session wiped so the API client logs the user out.
    expect(await stored('stunity_access_token')).toBeNull();
    expect(await stored('stunity_refresh_token')).toBeNull();
  });

  it('transient network error returns null and PRESERVES tokens (no logout)', async () => {
    post.mockRejectedValueOnce({ message: 'Network Error' }); // no response.status

    const token = await tokenService.refreshAccessToken();

    expect(token).toBeNull();
    expect(await stored('stunity_refresh_token')).toBe('r1'); // still logged in
  });

  it('returns null without a network call when there is no refresh token', async () => {
    await tokenService.clearTokens();
    const token = await tokenService.refreshAccessToken();

    expect(token).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});
