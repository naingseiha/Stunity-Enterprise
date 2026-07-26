'use client';

import { useEffect } from 'react';
import { TokenManager } from '@/lib/api/auth';

/**
 * Proactive token refresh keeps the one-hour access token fresh while the
 * long-lived rotating device session preserves remember-me UX.
 */
export default function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const refreshIfLoggedIn = async () => {
      if (typeof window === 'undefined') return;
      const tokens = TokenManager.getTokens();
      const isLegacyRefreshToken = tokens?.refreshToken?.includes('.') === true;
      if (tokens?.refreshToken && (isLegacyRefreshToken || TokenManager.accessTokenExpiresWithin(10 * 60))) {
        await TokenManager.refreshTokens();
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshIfLoggedIn();
    };

    void refreshIfLoggedIn();
    const interval = setInterval(refreshIfLoggedIn, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  return <>{children}</>;
}
