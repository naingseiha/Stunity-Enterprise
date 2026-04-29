'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { ChevronDown, Calendar, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AcademicYearSelector() {
  const { currentYear, selectedYear, allYears, setSelectedYear, loading } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400"><AutoI18nText i18nKey="auto.web.components_AcademicYearSelector.k_dee65802" /></span>
      </div>
    );
  }

  // Show empty state button if no academic years available (instead of hiding)
  if (!selectedYear || allYears.length === 0) {
    return (
      <a
        href={`/${locale}/settings/academic-years`}
        className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-sm dark:bg-amber-500/10 dark:border-amber-500/20 dark:hover:bg-amber-500/20"
      >
        <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-500" />
        <span className="font-medium text-amber-700 hidden md:inline dark:text-amber-400">
          <AutoI18nText i18nKey="auto.web.components_AcademicYearSelector.k_774eda18" />
        </span>
      </a>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
      case 'PLANNING':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
      case 'ENDED':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm dark:bg-gray-900/80 dark:border-gray-800 dark:hover:bg-gray-800/80"
      >
        <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="font-medium text-gray-900 hidden md:inline dark:text-gray-200">
          {selectedYear.name}
        </span>
        {selectedYear.isCurrent && (
          <span className="hidden lg:inline px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded dark:bg-green-500/10 dark:text-green-400">
            <AutoI18nText i18nKey="auto.web.components_AcademicYearSelector.k_99838780" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden dark:bg-gray-900 dark:border-gray-800 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
          <div className="p-2 border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-2 dark:text-gray-400">
              <AutoI18nText i18nKey="auto.web.components_AcademicYearSelector.k_3cf02802" />
            </p>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {allYears.map((year) => {
              const isSelected = year.id === selectedYear.id;
              const isCurrent = year.id === currentYear?.id;
              
              return (
                <button
                  key={year.id}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-200'}`}>
                          {year.name}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded dark:bg-green-500/10 dark:text-green-400">
                            <AutoI18nText i18nKey="auto.web.components_AcademicYearSelector.k_99838780" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(year.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          -{' '}
                          {new Date(year.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusColor(year.status)}`}>
                          {year.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <a
              href={`/${locale}/settings/academic-years`}
              className="block w-full px-3 py-2 text-xs font-medium text-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10"
              onClick={() => setIsOpen(false)}
            >
              <AutoI18nText i18nKey="auto.web.components_AcademicYearSelector.k_90e75def" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
