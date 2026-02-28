'use client';

import { useEffect } from 'react';
import { TokenManager } from '@/lib/api/auth';

/**
 * Proactive token refresh - keeps session alive (remember-me style).
 * Refreshes tokens every 12h when user is logged in.
 */
export default function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const refreshIfLoggedIn = async () => {
      if (typeof window === 'undefined') return;
      const tokens = TokenManager.getTokens();
      if (tokens?.refreshToken) {
        await TokenManager.refreshTokens();
      }
    };

    refreshIfLoggedIn();
    const interval = setInterval(refreshIfLoggedIn, 12 * 60 * 60 * 1000); // Every 12 hours
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
