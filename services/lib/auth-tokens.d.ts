import type { JwtPayload } from 'jsonwebtoken';

export const AUTH_TOKEN_ISSUER: string;
export const ACCESS_TOKEN_AUDIENCE: string;
export const REFRESH_TOKEN_AUDIENCE: string;
export const TWO_FACTOR_TOKEN_AUDIENCE: string;

export type VerifiedAccessToken = JwtPayload & { userId: string; tokenUse: 'access' };
export type VerifiedRefreshToken = JwtPayload & { userId: string; tokenUse: 'refresh' };
export type VerifiedTwoFactorChallenge = JwtPayload & {
  userId: string;
  purpose: '2fa_challenge';
  tokenUse: '2fa_challenge';
};

export function signAccessToken(
  claims: Record<string, unknown> & { userId: string },
  secret: string,
  expiresIn: string,
): string;
export function verifyAccessToken(token: string, secret: string): VerifiedAccessToken;
export function signLegacyRefreshToken(userId: string, secret: string, expiresIn: string): string;
export function verifyLegacyRefreshToken(token: string, secret: string): VerifiedRefreshToken;
export function signTwoFactorChallenge(userId: string, secret: string): string;
export function verifyTwoFactorChallenge(token: string, secret: string): VerifiedTwoFactorChallenge;
