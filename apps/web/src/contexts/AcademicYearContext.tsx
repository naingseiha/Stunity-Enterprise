'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentAcademicYear, getAcademicYears, type AcademicYear } from '@/lib/api/academic-years';

interface AcademicYearContextType {
  currentYear: AcademicYear | null;
  selectedYear: AcademicYear | null;
  allYears: AcademicYear[];
  setSelectedYear: (year: AcademicYear) => void;
  loading: boolean;
  refreshYears: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [selectedYear, setSelectedYearState] = useState<AcademicYear | null>(null);
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  const loadYears = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolId = user.schoolId;

      if (!token || !schoolId) return;

      // Load all years
      const years = await getAcademicYears(schoolId, token);
      setAllYears(years);

      // Get current year
      const current = await getCurrentAcademicYear(schoolId, token);
      setCurrentYear(current);

      // Check if there's a saved selected year in localStorage
      const savedYearId = localStorage.getItem('selectedAcademicYearId');
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
