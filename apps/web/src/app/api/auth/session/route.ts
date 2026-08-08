import { NextRequest, NextResponse } from 'next/server';
import {
  clearRefreshCookie,
  isSameOriginRequest,
  setRefreshCookie,
} from '@/lib/auth/serverAuthCookies';

/**
 * Establish (or clear) the httpOnly refresh cookie on the web origin.
 * Called after login/social/2FA so the long-lived refresh credential never
 * stays in localStorage (XSS-readable) longer than a brief migration window.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: 'Invalid origin' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({} as { refreshToken?: unknown }));
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken.trim() : '';
  if (!refreshToken || refreshToken.length < 20 || refreshToken.length > 4096) {
    return NextResponse.json({ success: false, error: 'Invalid refresh token' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  setRefreshCookie(response, refreshToken);
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: 'Invalid origin' }, { status: 403 });
  }
  const response = NextResponse.json({ success: true });
  clearRefreshCookie(response);
  return response;
}
