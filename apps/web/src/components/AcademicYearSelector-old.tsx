'use client';

import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { Calendar, ChevronDown, Check, Settings } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function AcademicYearSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en'; // Extract locale from path
  const { currentYear, selectedYear, allYears, setSelectedYear, loading } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || !selectedYear) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
      PLANNING: { label: 'Planning', className: 'bg-blue-100 text-blue-700' },
      ENDED: { label: 'Ended', className: 'bg-gray-100 text-gray-700' },
      ARCHIVED: { label: 'Archived', className: 'bg-purple-100 text-purple-700' },
    };
    return badges[status as keyof typeof badges] || badges.PLANNING;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Calendar className="w-4 h-4 text-blue-600" />
        <div className="text-left">
          <div className="text-sm font-semibold text-gray-900">{selectedYear.name}</div>
          {selectedYear.isCurrent && (
            <div className="text-xs text-green-600">Current Year</div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Academic Year</h3>
                <p className="text-xs text-blue-100 mt-0.5">Select year to view</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${locale}/settings/academic-years`);
                  setIsOpen(false);
                }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Manage Academic Years"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Years List */}
          <div className="max-h-96 overflow-y-auto">
            {allYears.map((year) => {
              const isSelected = year.id === selectedYear.id;
              const status = getStatusBadge(year.status);

              return (
                <button
                  key={year.id}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                          {year.name}
                        </span>
                        {year.isCurrent && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                      </div>
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => {
                router.push(`/${locale}/settings/academic-years`);
                setIsOpen(false);
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage Academic Years →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
