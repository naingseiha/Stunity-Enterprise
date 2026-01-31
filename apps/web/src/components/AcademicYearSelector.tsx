'use client';

import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { ChevronDown, Calendar, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function AcademicYearSelector() {
  const { currentYear, selectedYear, allYears, setSelectedYear, loading } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!selectedYear || allYears.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'PLANNING':
        return 'bg-blue-100 text-blue-700';
      case 'ENDED':
        return 'bg-orange-100 text-orange-700';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
      >
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-gray-900 hidden md:inline">
          {selectedYear.name}
        </span>
        {selectedYear.isCurrent && (
          <span className="hidden lg:inline px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
            Current
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-2">
              Select Academic Year
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
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                          {year.name}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">
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
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <a
              href="/en/settings/academic-years"
              className="block w-full px-3 py-2 text-xs font-medium text-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Manage Academic Years →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
