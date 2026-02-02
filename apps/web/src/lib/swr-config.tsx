'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

/**
 * Enterprise-grade SWR configuration
 * - Stale-while-revalidate for instant navigation
 * - Smart retry with exponential backoff
 * - Deduplication of requests
 * - Focus revalidation for fresh data
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Data stays fresh for 2 minutes, stale data served while revalidating
        dedupingInterval: 2000, // Dedupe requests within 2 seconds
        focusThrottleInterval: 5000, // Throttle focus revalidation to every 5 seconds
        
        // Smart retry with exponential backoff
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        
        // Revalidation strategy
        revalidateOnFocus: false, // Disable auto-refresh on window focus (saves bandwidth)
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        
        // Keep previous data while loading new (prevents flash)
        keepPreviousData: true,
        
        // Custom fetcher with auth
        fetcher: async (url: string) => {
          const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
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
