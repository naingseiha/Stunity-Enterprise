/**
 * Shared JWT secret accessor (all services).
 *
 * Replaces the per-file `process.env.JWT_SECRET || 'stunity-enterprise-secret-2026'`
 * pattern: in production a missing or known-placeholder JWT_SECRET is a hard
 * startup failure instead of silently accepting a publicly known constant.
 */

const DEV_FALLBACK = 'stunity-enterprise-secret-2026';
const INSECURE_JWT_SECRETS = new Set([
  DEV_FALLBACK,
  'your-super-secret-jwt-key-change-this',
  'secret',
  'changeme',
]);

function getJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret || INSECURE_JWT_SECRETS.has(secret)) {
      throw new Error(
        'FATAL: JWT_SECRET must be a strong unique value in production (not a repo placeholder). Refusing to start.',
      );
    }
    return secret;
  }
  return secret || DEV_FALLBACK;
}

module.exports = { getJwtSecret, INSECURE_JWT_SECRETS };
