import { NextRequest, NextResponse } from 'next/server';
import {
  authServiceBaseUrl,
  clearRefreshCookie,
  isSameOriginRequest,
  readRefreshCookie,
  setRefreshCookie,
} from '@/lib/auth/serverAuthCookies';

/**
 * Rotate the refresh session using the httpOnly cookie and return a fresh
 * access token to the browser. The new refresh credential stays httpOnly.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: 'Invalid origin' }, { status: 403 });
  }

  const refreshToken = readRefreshCookie(request);
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, code: 'REFRESH_COOKIE_MISSING', error: 'No refresh session' },
      { status: 401 },
    );
  }

  const deviceId = request.headers.get('x-device-id')?.slice(0, 200) || 'web_bff';
  const deviceName = request.headers.get('x-device-name')?.slice(0, 200) || 'web';

  try {
    const upstream = await fetch(`${authServiceBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
        'X-Device-Name': deviceName,
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });

    const payload = await upstream.json().catch(() => ({} as any));
    if (!upstream.ok || !payload?.success || !payload?.data?.accessToken || !payload?.data?.refreshToken) {
      const response = NextResponse.json(
        {
          success: false,
          code: payload?.code || 'REFRESH_FAILED',
          error: payload?.error || 'Failed to refresh session',
        },
        { status: upstream.status === 409 ? 409 : 401 },
      );
      if (upstream.status === 401 || upstream.status === 403) {
        clearRefreshCookie(response);
      }
      return response;
    }

    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: payload.data.accessToken,
        expiresIn: payload.data.expiresIn,
      },
    });
    setRefreshCookie(response, payload.data.refreshToken);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Auth service unavailable' },
      { status: 503 },
    );
  }
}
