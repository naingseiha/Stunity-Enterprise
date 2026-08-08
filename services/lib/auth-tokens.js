const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AUTH_TOKEN_ISSUER = process.env.AUTH_TOKEN_ISSUER || 'stunity-auth';
const ACCESS_TOKEN_AUDIENCE = process.env.AUTH_ACCESS_TOKEN_AUDIENCE || 'stunity-api';
const REFRESH_TOKEN_AUDIENCE = process.env.AUTH_REFRESH_TOKEN_AUDIENCE || 'stunity-auth-refresh';
const TWO_FACTOR_TOKEN_AUDIENCE = process.env.AUTH_TWO_FACTOR_TOKEN_AUDIENCE || 'stunity-auth-2fa';

function requireUserId(payload, expectedUse) {
  if (
    typeof payload === 'string'
    || !payload
    || typeof payload.userId !== 'string'
    || payload.userId.length === 0
    || payload.tokenUse !== expectedUse
  ) {
    throw new jwt.JsonWebTokenError(`Invalid ${expectedUse} token`);
  }
  return payload;
}

function signAccessToken(claims, secret, expiresIn) {
  return jwt.sign(
    { ...claims, tokenUse: 'access' },
    secret,
    {
      algorithm: 'HS256',
      issuer: AUTH_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      subject: claims.userId,
      expiresIn,
    },
  );
}

function verifyAccessToken(token, secret) {
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: AUTH_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE,
  });
  return requireUserId(payload, 'access');
}

function signLegacyRefreshToken(userId, secret, expiresIn) {
  return jwt.sign(
    { userId, tokenUse: 'refresh' },
    secret,
    {
      algorithm: 'HS256',
      issuer: AUTH_TOKEN_ISSUER,
      audience: REFRESH_TOKEN_AUDIENCE,
      subject: userId,
      expiresIn,
    },
  );
}

function verifyLegacyRefreshToken(token, secret) {
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: AUTH_TOKEN_ISSUER,
    audience: REFRESH_TOKEN_AUDIENCE,
  });
  return requireUserId(payload, 'refresh');
}

function signTwoFactorChallenge(userId, secret) {
  return jwt.sign(
    { userId, purpose: '2fa_challenge', tokenUse: '2fa_challenge' },
    secret,
    {
      algorithm: 'HS256',
      issuer: AUTH_TOKEN_ISSUER,
      audience: TWO_FACTOR_TOKEN_AUDIENCE,
      subject: userId,
      expiresIn: '5m',
      jwtid: crypto.randomUUID(),
    },
  );
}

function verifyTwoFactorChallenge(token, secret) {
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: AUTH_TOKEN_ISSUER,
    audience: TWO_FACTOR_TOKEN_AUDIENCE,
  });
  const verified = requireUserId(payload, '2fa_challenge');
  if (verified.purpose !== '2fa_challenge') {
    throw new jwt.JsonWebTokenError('Invalid 2fa challenge token');
  }
  return verified;
}

module.exports = {
  AUTH_TOKEN_ISSUER,
  ACCESS_TOKEN_AUDIENCE,
  REFRESH_TOKEN_AUDIENCE,
  TWO_FACTOR_TOKEN_AUDIENCE,
  signAccessToken,
  verifyAccessToken,
  signLegacyRefreshToken,
  verifyLegacyRefreshToken,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
};
