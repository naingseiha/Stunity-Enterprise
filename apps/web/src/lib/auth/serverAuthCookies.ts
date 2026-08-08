import { NextRequest, NextResponse } from 'next/server';

/** httpOnly refresh credential scoped to the web origin auth BFF. */
export const REFRESH_COOKIE_NAME = 'stunity_refresh';

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function authServiceBaseUrl(): string {
  return (
    process.env.AUTH_SERVICE_URL
    || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL
    || 'http://localhost:3001'
  );
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    // Same-origin requests from some browsers / non-browser clients omit Origin.
    const fetchSite = request.headers.get('sec-fetch-site');
    return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
  }
  return origin === request.nextUrl.origin;
}

export function readRefreshCookie(request: NextRequest): string | null {
  const value = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!value || value.length < 20 || value.length > 4096) return null;
  return value;
}

export function setRefreshCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: ONE_YEAR_SECONDS,
  });
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
}
