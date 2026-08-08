'use client';

import { useEffect } from 'react';
import { subscribeAccessTokenSync, TokenManager } from '@/lib/api/auth';

/**
 * Proactive token refresh: hydrate short-lived access tokens from the httpOnly
 * refresh cookie, keep them fresh while the tab is open, and sync across tabs.
 */
export default function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsub = subscribeAccessTokenSync();

    const refreshIfNeeded = async () => {
      if (typeof window === 'undefined') return;
      if (TokenManager.isAssumedLoggedOut() && !TokenManager.getAccessToken() && !TokenManager.getRefreshToken()) {
        return;
      }

      const access = TokenManager.getAccessToken();
      if (access && !TokenManager.accessTokenExpiresWithin(10 * 60)) return;

      // No access (hard refresh / new tab) or near expiry → cookie / legacy refresh.
      await TokenManager.refreshTokens();
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshIfNeeded();
    };

    void refreshIfNeeded();
    const interval = setInterval(refreshIfNeeded, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      unsub();
    };
  }, []);

  return <>{children}</>;
}
