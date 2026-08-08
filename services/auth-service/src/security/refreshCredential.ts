import type { Request } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAuthSession } from './authSessionService';
import { signLegacyRefreshToken } from '../../../lib/auth-tokens';

const DURATION_PATTERN = /^(\d+)([smhd])$/;
const DURATION_MULTIPLIERS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
};

/**
 * Opaque DB sessions. Explicit `true`/`false` win; unset fails closed to ON
 * in production so a missing Cloud Run env var cannot silently weaken auth.
 */
export function authDbSessionsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.AUTH_DB_SESSIONS_ENABLED === 'true') return true;
  if (env.AUTH_DB_SESSIONS_ENABLED === 'false') return false;
  return env.NODE_ENV === 'production';
}

/**
 * Legacy JWT refresh. Never honored in production unless the explicit
 * AUTH_ALLOW_INSECURE_SESSIONS escape hatch is set (break-glass only).
 */
export function authLegacyJwtRefreshEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.AUTH_LEGACY_JWT_REFRESH_ENABLED !== 'true') return false;
  if (env.NODE_ENV === 'production' && env.AUTH_ALLOW_INSECURE_SESSIONS !== 'true') {
    return false;
  }
  return true;
}

export function getAuthSessionSecurityStatus(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const dbSessions = authDbSessionsEnabled(env);
  const legacyRefresh = authLegacyJwtRefreshEnabled(env);
  const allowInsecure = env.AUTH_ALLOW_INSECURE_SESSIONS === 'true';
  const secure = !production || (dbSessions && !legacyRefresh);
  return {
    production,
    dbSessions,
    legacyRefresh,
    allowInsecure,
    secure,
    ready: secure || allowInsecure,
  };
}

/** Throw in production when session config is insecure (unless break-glass). */
export function assertSecureAuthSessionConfig(env: NodeJS.ProcessEnv = process.env): void {
  const status = getAuthSessionSecurityStatus(env);
  if (status.ready) return;
  throw new Error(
    '[auth] Refusing insecure session config in production: '
    + `AUTH_DB_SESSIONS_ENABLED=${env.AUTH_DB_SESSIONS_ENABLED ?? '(unset→fail-closed ON expected)'} `
    + `AUTH_LEGACY_JWT_REFRESH_ENABLED=${env.AUTH_LEGACY_JWT_REFRESH_ENABLED ?? 'false'}. `
    + 'Set AUTH_DB_SESSIONS_ENABLED=true and AUTH_LEGACY_JWT_REFRESH_ENABLED=false, '
    + 'or AUTH_ALLOW_INSECURE_SESSIONS=true for break-glass only.',
  );
}

export function durationToMilliseconds(duration: string): number {
  const match = duration.trim().match(DURATION_PATTERN);
  if (!match) throw new Error(`Unsupported token duration: ${duration}`);
  return Number(match[1]) * DURATION_MULTIPLIERS[match[2]];
}

function requestIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.ip || null;
}

export async function issueRefreshCredential(input: {
  prisma: PrismaClient;
  userId: string;
  schoolAccessVersion: number;
  jwtSecret: string;
  refreshTokenExpiration: string;
  req?: Request;
}): Promise<string> {
  if (!authDbSessionsEnabled()) {
    return signLegacyRefreshToken(
      input.userId,
      input.jwtSecret,
      input.refreshTokenExpiration,
    );
  }

  const session = await createAuthSession(input.prisma, {
    userId: input.userId,
    schoolAccessVersion: input.schoolAccessVersion,
    expiresAt: new Date(Date.now() + durationToMilliseconds(input.refreshTokenExpiration)),
    deviceId: input.req?.get('x-device-id')?.slice(0, 200) || undefined,
    deviceName: input.req?.get('x-device-name')?.slice(0, 200) || undefined,
    ipAddress: requestIp(input.req),
    userAgent: input.req?.get('user-agent')?.slice(0, 500) || undefined,
  });
  return session.refreshToken;
}
