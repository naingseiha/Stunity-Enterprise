'use client';

import { createContext, useCallback, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { getCurrentAcademicYear, getAcademicYears, type AcademicYear } from '@/lib/api/academic-years';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';
import { TokenManager } from '@/lib/api/auth';
import {
  SCHOOL_CONTEXT_CHANGED_EVENT,
  BEFORE_ACADEMIC_YEAR_CHANGE_EVENT,
  canWriteOperationalAcademicData,
  getAcademicYearMode,
  persistSelectedAcademicYearId,
  readSelectedAcademicYearId,
  selectedAcademicYearStorageKey,
  type AcademicYearMode,
} from '@/lib/academic-year-scope';

interface AcademicYearContextType {
  currentYear: AcademicYear | null;
  selectedYear: AcademicYear | null;
  allYears: AcademicYear[];
  schoolId: string | null;
  terms: any[];
  setSelectedYear: (year: AcademicYear) => void;
  selectedYearMode: AcademicYearMode;
  isCurrentYearSelected: boolean;
  isOperationalReadOnly: boolean;
  canWriteOperationalData: boolean;
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
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const loadSequence = useRef(0);

  const resetContext = useCallback(() => {
    setCurrentYear(null);
    setSelectedYearState(null);
    setAllYears([]);
    setSchoolId(null);
    setTerms([]);
  }, []);

  const loadYears = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const token = TokenManager.getAccessToken();
      const userDataStr = localStorage.getItem('user');
      const schoolDataStr = localStorage.getItem('school');
      
      if (!token || !userDataStr) {
        resetContext();
        return;
      }

      const userData = JSON.parse(userDataStr);
      const schoolData = schoolDataStr ? JSON.parse(schoolDataStr) : null;
      
      // Try multiple ways to get schoolId: user.schoolId, school.id, or user.school.id
      const schoolIdFromData = userData?.schoolId || schoolData?.id || userData?.school?.id;

      if (!schoolIdFromData) {
        resetContext();
        return;
      }

      // Never retain another tenant's working-year data while a school switch
      // is resolving.
      setSelectedYearState((year) => year?.schoolId === schoolIdFromData ? year : null);
      setSchoolId(schoolIdFromData);

      const yearsCacheKey = `academic-years:${schoolIdFromData}`;
      const currentYearCacheKey = `academic-years:${schoolIdFromData}:current`;
      const cachedYears = readPersistentCache<AcademicYear[]>(yearsCacheKey, ACADEMIC_YEAR_CACHE_TTL_MS);
      const cachedCurrentYear = readPersistentCache<AcademicYear | null>(currentYearCacheKey, ACADEMIC_YEAR_CACHE_TTL_MS);
      const savedYearId = readSelectedAcademicYearId(schoolIdFromData);

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
      if (sequence !== loadSequence.current) return;
      const derivedCurrent = years.find((year) => year.isCurrent) ?? null;
      const current = derivedCurrent ?? await getCurrentAcademicYear(schoolIdFromData, token);
      if (sequence !== loadSequence.current) return;

      setCurrentYear(current);
      setAllYears(years);
      writePersistentCache(yearsCacheKey, years);
      writePersistentCache(currentYearCacheKey, current);

      if (savedYearId) {
        const savedYear = years.find(y => y.id === savedYearId);
        if (savedYear) {
          setSelectedYearState(savedYear);
          persistSelectedAcademicYearId(schoolIdFromData, savedYear.id);
        } else {
          // If saved year doesn't exist, use current
          setSelectedYearState(current);
          if (current) persistSelectedAcademicYearId(schoolIdFromData, current.id);
        }
      } else {
        // Default to current year
        setSelectedYearState(current);
        if (current) persistSelectedAcademicYearId(schoolIdFromData, current.id);
      }
    } catch (error) {
      console.error('Failed to load academic years:', error);
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [resetContext]);

  useEffect(() => {
    void loadYears();

    const handleSchoolContextChange = () => void loadYears();
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === 'user' ||
        event.key === 'school' ||
        (schoolId && event.key === selectedAcademicYearStorageKey(schoolId))
      ) {
        void loadYears();
      }
    };
    window.addEventListener(SCHOOL_CONTEXT_CHANGED_EVENT, handleSchoolContextChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SCHOOL_CONTEXT_CHANGED_EVENT, handleSchoolContextChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadYears, schoolId]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchTerms = async () => {
      if (!selectedYear?.id || !schoolId) {
        setTerms([]);
        return;
      }
      try {
        const token = TokenManager.getAccessToken();
        if (token) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${selectedYear.id}/terms`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            setTerms(data.data || []);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to load terms:', err);
      }
    };
    void fetchTerms();
    return () => controller.abort();
  }, [selectedYear?.id, schoolId]);

  const setSelectedYear = (year: AcademicYear) => {
    if (!schoolId || year.schoolId !== schoolId) {
      console.error('Rejected academic year from a different school context');
      return;
    }
    if (year.id === selectedYear?.id) return;
    const canChange = window.dispatchEvent(
      new CustomEvent(BEFORE_ACADEMIC_YEAR_CHANGE_EVENT, {
        cancelable: true,
        detail: { schoolId, fromAcademicYearId: selectedYear?.id || null, toAcademicYearId: year.id },
      }),
    );
    if (!canChange) return;
    setSelectedYearState(year);
    persistSelectedAcademicYearId(schoolId, year.id);
  };

  const refreshYears = async () => {
    await loadYears();
  };

  const selectedYearMode = useMemo(() => getAcademicYearMode(selectedYear), [selectedYear]);
  const canWriteOperationalData = useMemo(
    () => canWriteOperationalAcademicData(selectedYear),
    [selectedYear],
  );
  const isCurrentYearSelected = Boolean(selectedYear && selectedYear.id === currentYear?.id);

  return (
    <AcademicYearContext.Provider
      value={{
        currentYear,
        selectedYear,
        allYears,
        schoolId,
        terms,
        setSelectedYear,
        selectedYearMode,
        isCurrentYearSelected,
        isOperationalReadOnly: !canWriteOperationalData,
        canWriteOperationalData,
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
