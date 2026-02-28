'use client';

import { AcademicYearProvider } from '@/contexts/AcademicYearContext';
import { SWRProvider } from '@/lib/swr-config';
import SplashScreenProvider from './SplashScreenProvider';
import AnnouncementBanner from './AnnouncementBanner';
import MaintenanceOverlay from './MaintenanceOverlay';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <SplashScreenProvider>
        <AcademicYearProvider>
          <MaintenanceOverlay />
          <AnnouncementBanner />
          {children}
        </AcademicYearProvider>
      </SplashScreenProvider>
    </SWRProvider>
  );
}
