import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authDbSessionsEnabled,
  authLegacyJwtRefreshEnabled,
  durationToMilliseconds,
  getAuthSessionSecurityStatus,
} from './refreshCredential';

test('authDbSessionsEnabled fails closed ON in production when unset', () => {
  assert.equal(authDbSessionsEnabled({ AUTH_DB_SESSIONS_ENABLED: 'true' } as NodeJS.ProcessEnv), true);
  assert.equal(authDbSessionsEnabled({ AUTH_DB_SESSIONS_ENABLED: 'false' } as NodeJS.ProcessEnv), false);
  assert.equal(authDbSessionsEnabled({} as NodeJS.ProcessEnv), false);
  assert.equal(authDbSessionsEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), true);
});

test('authLegacyJwtRefreshEnabled is blocked in production without escape hatch', () => {
  assert.equal(
    authLegacyJwtRefreshEnabled({
      NODE_ENV: 'production',
      AUTH_LEGACY_JWT_REFRESH_ENABLED: 'true',
    } as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    getAuthSessionSecurityStatus({
      NODE_ENV: 'production',
      AUTH_DB_SESSIONS_ENABLED: 'true',
      AUTH_LEGACY_JWT_REFRESH_ENABLED: 'false',
    } as NodeJS.ProcessEnv).ready,
    true,
  );
});

test('durationToMilliseconds parses token lifetimes', () => {
  assert.equal(durationToMilliseconds('15m'), 15 * 60_000);
  assert.equal(durationToMilliseconds('24h'), 24 * 60 * 60_000);
  assert.equal(durationToMilliseconds('365d'), 365 * 24 * 60 * 60_000);
});
