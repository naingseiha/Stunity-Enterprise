/**
 * Centralized JWT_SECRET retrieval with production safety.
 * In production, startup will fail if JWT_SECRET is not set.
 */
export function getJwtSecret(): string {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET must be set in production. Refusing to start for security.'
    );
  }
  return process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
}
