/**
 * Production bootstrap checks and JWT secret resolution.
 * See PRODUCTION_RUNBOOK.md for required variables.
 */

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const missing: string[] = [];
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET');
  if (!process.env.DATABASE_URL?.trim()) missing.push('DATABASE_URL');
  if (missing.length) {
    throw new Error(
      `FATAL: Missing required environment variables in production: ${missing.join(', ')}`
    );
  }
}

/**
 * JWT for verifying Authorization Bearer tokens. In non-production, a dev default is used
 * if JWT_SECRET is unset (see console warning).
 */
export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set in production');
  }
  console.warn(
    '[attendance-service] JWT_SECRET is not set; using insecure development default. Do not use in production.'
  );
  return 'stunity-enterprise-secret-2026';
}
