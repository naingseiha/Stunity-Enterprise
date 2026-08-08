import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  signLegacyRefreshToken,
  signTwoFactorChallenge,
  verifyAccessToken,
  verifyLegacyRefreshToken,
  verifyTwoFactorChallenge,
} from './tokenClaims';

const SECRET = 'test-secret-that-is-long-enough-for-unit-tests';

test('access and refresh tokens have mutually exclusive validation rules', () => {
  const access = signAccessToken({ userId: 'user-1', role: 'STUDENT' }, SECRET, '5m');
  const refresh = signLegacyRefreshToken('user-1', SECRET, '5m');

  assert.equal(verifyAccessToken(access, SECRET).tokenUse, 'access');
  assert.equal(verifyLegacyRefreshToken(refresh, SECRET).tokenUse, 'refresh');
  assert.throws(() => verifyLegacyRefreshToken(access, SECRET));
  assert.throws(() => verifyAccessToken(refresh, SECRET));
});

test('untyped legacy and arbitrary signed JWTs are rejected', () => {
  const untyped = jwt.sign({ userId: 'user-1' }, SECRET, { expiresIn: '5m' });
  assert.throws(() => verifyAccessToken(untyped, SECRET));
  assert.throws(() => verifyLegacyRefreshToken(untyped, SECRET));
});

test('2FA challenge cannot be used as an access or refresh token', () => {
  const challenge = signTwoFactorChallenge('user-1', SECRET);
  assert.equal(verifyTwoFactorChallenge(challenge, SECRET).purpose, '2fa_challenge');
  assert.throws(() => verifyAccessToken(challenge, SECRET));
  assert.throws(() => verifyLegacyRefreshToken(challenge, SECRET));
});
