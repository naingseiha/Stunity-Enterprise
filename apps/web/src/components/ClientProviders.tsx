'use client';

import { AcademicYearProvider } from '@/contexts/AcademicYearContext';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <AcademicYearProvider>{children}</AcademicYearProvider>;
}
