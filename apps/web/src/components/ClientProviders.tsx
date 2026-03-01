'use client';

import { AcademicYearProvider } from '@/contexts/AcademicYearContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SWRProvider } from '@/lib/swr-config';
import SplashScreenProvider from './SplashScreenProvider';
import AnnouncementBanner from './AnnouncementBanner';
import MaintenanceOverlay from './MaintenanceOverlay';
import TokenRefreshProvider from './TokenRefreshProvider';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <ThemeProvider>
        <TokenRefreshProvider>
          <SplashScreenProvider>
            <AcademicYearProvider>
            <MaintenanceOverlay />
            <AnnouncementBanner />
            {children}
            </AcademicYearProvider>
          </SplashScreenProvider>
        </TokenRefreshProvider>
      </ThemeProvider>
    </SWRProvider>
  );
}
