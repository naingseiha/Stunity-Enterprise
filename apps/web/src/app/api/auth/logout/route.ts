import { NextRequest, NextResponse } from 'next/server';
import {
  authServiceBaseUrl,
  clearRefreshCookie,
  isSameOriginRequest,
  readRefreshCookie,
} from '@/lib/auth/serverAuthCookies';

/**
 * Revoke the refresh session server-side and clear the httpOnly cookie.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: 'Invalid origin' }, { status: 403 });
  }

  const refreshToken = readRefreshCookie(request);
  if (refreshToken) {
    try {
      await fetch(`${authServiceBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
    } catch {
      // Clear locally even if upstream revoke fails.
    }
  }

  const response = NextResponse.json({ success: true });
  clearRefreshCookie(response);
  return response;
}
