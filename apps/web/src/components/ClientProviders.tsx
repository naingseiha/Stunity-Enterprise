'use client';

import { AcademicYearProvider } from '@/contexts/AcademicYearContext';
import { SWRProvider } from '@/lib/swr-config';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <AcademicYearProvider>{children}</AcademicYearProvider>
    </SWRProvider>
  );
}
