'use client';

import { useMemo } from 'react';
import { getFieldConfig } from '@/lib/fieldConfigs';
import type { SystemFieldConfig } from '@/lib/fieldConfigs';

/**
 * Reads the current school's educationModel from localStorage (set at login)
 * and returns the matching field configuration for students and teachers.
 *
 * The school object is stored in localStorage['school'] by TokenManager.setUserData().
 */
export function useEducationSystem(): {
  educationModel: string | null;
  fieldConfig: SystemFieldConfig;
} {
  const educationModel = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const schoolRaw = localStorage.getItem('school');
      if (!schoolRaw) return null;
      const school = JSON.parse(schoolRaw);
      return school?.educationModel ?? null;
    } catch {
      return null;
    }
  }, []);

  const fieldConfig = useMemo(() => getFieldConfig(educationModel), [educationModel]);

  return { educationModel, fieldConfig };
}
