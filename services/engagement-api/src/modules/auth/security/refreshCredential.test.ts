import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import {
  authDbSessionsEnabled,
  durationToMilliseconds,
  issueRefreshCredential,
} from './refreshCredential';
import { hashRefreshToken } from './authSessionService';

test('duration parser supports the configured session units', () => {
  assert.equal(durationToMilliseconds('1h'), 3_600_000);
  assert.equal(durationToMilliseconds('365d'), 31_536_000_000);
  assert.throws(() => durationToMilliseconds('1 year'));
});

test('database sessions are opt-in outside the production deploy wrapper', () => {
  assert.equal(authDbSessionsEnabled({ AUTH_DB_SESSIONS_ENABLED: 'true' } as NodeJS.ProcessEnv), true);
  assert.equal(authDbSessionsEnabled({ AUTH_DB_SESSIONS_ENABLED: 'false' } as NodeJS.ProcessEnv), false);
});

test('legacy mode still issues a signed refresh token for rollout compatibility', async () => {
  const previous = process.env.AUTH_DB_SESSIONS_ENABLED;
  process.env.AUTH_DB_SESSIONS_ENABLED = 'false';
  try {
    const token = await issueRefreshCredential({
      prisma: {} as any,
      userId: 'user-1',
      schoolAccessVersion: 0,
      jwtSecret: 'test-secret',
      refreshTokenExpiration: '365d',
    });
    const decoded = jwt.verify(token, 'test-secret') as any;
    assert.equal(decoded.userId, 'user-1');
    assert.equal(decoded.tokenUse, 'refresh');
  } finally {
    if (previous === undefined) delete process.env.AUTH_DB_SESSIONS_ENABLED;
    else process.env.AUTH_DB_SESSIONS_ENABLED = previous;
  }
});

test('database mode stores only a hash and returns an opaque credential', async () => {
  const previous = process.env.AUTH_DB_SESSIONS_ENABLED;
  process.env.AUTH_DB_SESSIONS_ENABLED = 'true';
  let stored: any;
  const prisma = {
    authSession: {
      create: async ({ data }: any) => {
        stored = data;
        return { id: 'session-1', expiresAt: data.expiresAt };
      },
    },
  };
  try {
    const token = await issueRefreshCredential({
      prisma: prisma as any,
      userId: 'user-1',
      schoolAccessVersion: 4,
      jwtSecret: 'unused-in-db-mode',
      refreshTokenExpiration: '365d',
    });
    assert.equal(token.includes('.'), false);
    assert.notEqual(stored.refreshTokenHash, token);
    assert.equal(stored.refreshTokenHash, hashRefreshToken(token));
    assert.equal(stored.schoolAccessVersion, 4);
  } finally {
    if (previous === undefined) delete process.env.AUTH_DB_SESSIONS_ENABLED;
    else process.env.AUTH_DB_SESSIONS_ENABLED = previous;
  }
});
