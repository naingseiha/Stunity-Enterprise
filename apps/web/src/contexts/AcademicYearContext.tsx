'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentAcademicYear, getAcademicYears, type AcademicYear } from '@/lib/api/academic-years';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

interface AcademicYearContextType {
  currentYear: AcademicYear | null;
  selectedYear: AcademicYear | null;
  allYears: AcademicYear[];
  schoolId: string | null;
  setSelectedYear: (year: AcademicYear) => void;
  loading: boolean;
  refreshYears: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);
const ACADEMIC_YEAR_CACHE_TTL_MS = 5 * 60 * 1000;

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [selectedYear, setSelectedYearState] = useState<AcademicYear | null>(null);
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadYears = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const userDataStr = localStorage.getItem('user');
      const schoolDataStr = localStorage.getItem('school');
      
      if (!token || !userDataStr) {
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userDataStr);
      const schoolData = schoolDataStr ? JSON.parse(schoolDataStr) : null;
      
      // Try multiple ways to get schoolId: user.schoolId, school.id, or user.school.id
      const schoolIdFromData = userData?.schoolId || schoolData?.id || userData?.school?.id;

      if (!schoolIdFromData) {
        setLoading(false);
        return;
      }

      setSchoolId(schoolIdFromData);

      const yearsCacheKey = `academic-years:${schoolIdFromData}`;
      const currentYearCacheKey = `academic-years:${schoolIdFromData}:current`;
      const cachedYears = readPersistentCache<AcademicYear[]>(yearsCacheKey, ACADEMIC_YEAR_CACHE_TTL_MS);
      const cachedCurrentYear = readPersistentCache<AcademicYear | null>(currentYearCacheKey, ACADEMIC_YEAR_CACHE_TTL_MS);
      const savedYearId = localStorage.getItem('selectedAcademicYearId');

      if (cachedYears?.length) {
        setAllYears(cachedYears);
      }

      if (cachedCurrentYear !== undefined) {
        setCurrentYear(cachedCurrentYear);
      }

      if (cachedYears?.length) {
        const cachedSelectedYear = savedYearId
          ? cachedYears.find((year) => year.id === savedYearId)
          : cachedCurrentYear;
        if (cachedSelectedYear) {
          setSelectedYearState(cachedSelectedYear);
        }
        setLoading(false);
      }

      const years = await getAcademicYears(schoolIdFromData, token);
      const derivedCurrent = years.find((year) => year.isCurrent) ?? null;
      const current = derivedCurrent ?? await getCurrentAcademicYear(schoolIdFromData, token);

      setCurrentYear(current);
      setAllYears(years);
      writePersistentCache(yearsCacheKey, years);
      writePersistentCache(currentYearCacheKey, current);

      if (savedYearId) {
        const savedYear = years.find(y => y.id === savedYearId);
        if (savedYear) {
          setSelectedYearState(savedYear);
        } else {
          // If saved year doesn't exist, use current
          setSelectedYearState(current);
        }
      } else {
        // Default to current year
        setSelectedYearState(current);
      }
    } catch (error) {
      console.error('Failed to load academic years:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const setSelectedYear = (year: AcademicYear) => {
    setSelectedYearState(year);
    localStorage.setItem('selectedAcademicYearId', year.id);
  };

  const refreshYears = async () => {
    await loadYears();
  };

  return (
    <AcademicYearContext.Provider
      value={{
        currentYear,
        selectedYear,
        allYears,
        schoolId,
        setSelectedYear,
        loading,
        refreshYears,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within AcademicYearProvider');
  }
  return context;
}
