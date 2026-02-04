'use client';

import { AcademicYearProvider } from '@/contexts/AcademicYearContext';
import { SWRProvider } from '@/lib/swr-config';
import SplashScreenProvider from './SplashScreenProvider';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <SplashScreenProvider>
        <AcademicYearProvider>{children}</AcademicYearProvider>
      </SplashScreenProvider>
    </SWRProvider>
  );
}
