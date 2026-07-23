/**
 * Shared JWT secret accessor (all services).
 *
 * Replaces the per-file `process.env.JWT_SECRET || 'stunity-enterprise-secret-2026'`
 * pattern: in production a missing JWT_SECRET is a hard startup failure instead of
 * silently falling back to a publicly known constant.
 */

const DEV_FALLBACK = 'stunity-enterprise-secret-2026';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
  }
  return DEV_FALLBACK;
}

module.exports = { getJwtSecret };
