'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';
import { TokenManager } from '@/lib/api/auth';

/**
 * Enterprise-grade SWR configuration
 * - Stale-while-revalidate for instant navigation
 * - Smart retry with exponential backoff
 * - Deduplication of requests
 * - Auto token refresh on 401 (remember-me)
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Data stays fresh for 2 minutes, stale data served while revalidating
        dedupingInterval: 2000,
        focusThrottleInterval: 5000,
        
        // Smart retry with exponential backoff
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        keepPreviousData: true,
        
        // Fetcher with auth + auto-refresh on 401 (remember-me)
        fetcher: async (url: string) => {
          const response = await TokenManager.fetchWithAuth(url, {
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
          }
          
          return response.json();
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
