import type { Request } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAuthSession } from './authSessionService';
import { signLegacyRefreshToken } from './tokenClaims';

const DURATION_PATTERN = /^(\d+)([smhd])$/;
const DURATION_MULTIPLIERS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
};

export function authDbSessionsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AUTH_DB_SESSIONS_ENABLED === 'true';
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
