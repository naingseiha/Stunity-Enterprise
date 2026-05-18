'use client';

import { useTranslations } from 'next-intl';
import { LayoutGrid, Calculator, Rocket, FlaskConical, Leaf, Terminal, Library, Hourglass, Globe2, Palette } from 'lucide-react';
import React from 'react';

export interface SubjectFilter {
  key: string;
  labelKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const SUBJECTS: SubjectFilter[] = [
  { key: 'ALL', labelKey: 'feed.subjects.all', icon: LayoutGrid, color: '#0EA5E9', bgColor: 'bg-sky-100 dark:bg-sky-900/30', gradientFrom: 'from-sky-300', gradientTo: 'to-sky-500' },
  { key: 'MATH', labelKey: 'feed.subjects.math', icon: Calculator, color: '#2563EB', bgColor: 'bg-blue-100 dark:bg-blue-900/30', gradientFrom: 'from-blue-400', gradientTo: 'to-blue-600' },
  { key: 'PHYSICS', labelKey: 'feed.subjects.physics', icon: Rocket, color: '#DC2626', bgColor: 'bg-red-100 dark:bg-red-900/30', gradientFrom: 'from-red-400', gradientTo: 'to-red-600' },
  { key: 'CHEMISTRY', labelKey: 'feed.subjects.chemistry', icon: FlaskConical, color: '#059669', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', gradientFrom: 'from-emerald-400', gradientTo: 'to-emerald-600' },
  { key: 'BIOLOGY', labelKey: 'feed.subjects.biology', icon: Leaf, color: '#16A34A', bgColor: 'bg-green-100 dark:bg-green-900/30', gradientFrom: 'from-green-400', gradientTo: 'to-green-600' },
  { key: 'CS', labelKey: 'feed.subjects.cs', icon: Terminal, color: '#4338CA', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', gradientFrom: 'from-indigo-400', gradientTo: 'to-indigo-600' },
  { key: 'ENGLISH', labelKey: 'feed.subjects.english', icon: Library, color: '#DB2777', bgColor: 'bg-pink-100 dark:bg-pink-900/30', gradientFrom: 'from-pink-400', gradientTo: 'to-pink-600' },
  { key: 'HISTORY', labelKey: 'feed.subjects.history', icon: Hourglass, color: '#C2410C', bgColor: 'bg-orange-100 dark:bg-orange-900/30', gradientFrom: 'from-orange-400', gradientTo: 'to-orange-600' },
  { key: 'GEOGRAPHY', labelKey: 'feed.subjects.geography', icon: Globe2, color: '#0891B2', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', gradientFrom: 'from-cyan-400', gradientTo: 'to-cyan-600' },
  { key: 'ARTS', labelKey: 'feed.subjects.arts', icon: Palette, color: '#E11D48', bgColor: 'bg-rose-100 dark:bg-rose-900/30', gradientFrom: 'from-rose-400', gradientTo: 'to-rose-600' },
];

interface SubjectFiltersProps {
  activeFilter: string;
  pendingFilter?: string | null;
  onFilterChange: (filterKey: string) => void;
}

export default function SubjectFilters({ activeFilter, pendingFilter, onFilterChange }: SubjectFiltersProps) {
  const t = useTranslations();

  return (
    <div className="relative w-full overflow-hidden mb-3">
      <div className="flex overflow-x-auto scrollbar-hide py-2 px-1 gap-2 sm:gap-3 snap-x">
        {SUBJECTS.map((subject) => {
          const isActive = activeFilter === subject.key;
          const isPending = pendingFilter === subject.key;
          const Icon = subject.icon;

          return (
            <button
              key={subject.key}
              onClick={() => onFilterChange(subject.key)}
              className="flex flex-col items-center gap-1.5 snap-center focus:outline-none group min-w-[72px]"
              aria-selected={isActive}
              aria-busy={isPending}
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Background Halo for active state */}
                <div 
                  className={`absolute inset-0 rounded-full transition-all duration-300 ${isActive ? 'scale-110 opacity-20' : 'scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-10'}`}
                  style={{ backgroundColor: subject.color }}
                />
                
                {/* Icon Container */}
                <div 
                  className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                    isActive 
                      ? `bg-gradient-to-br ${subject.gradientFrom} ${subject.gradientTo} scale-105 shadow-md` 
                      : `${subject.bgColor} scale-100 border-2 border-transparent group-hover:border-[color:var(--subject-color)]`
                  }`}
                  style={{ '--subject-color': subject.color } as React.CSSProperties}
                >
                  <Icon 
                    className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-white' : ''}`} 
                    style={!isActive ? { color: subject.color } : undefined}
                  />
                </div>
              </div>
              
              {/* Label */}
              <span 
                className={`text-[11px] font-semibold transition-colors duration-300 whitespace-nowrap px-1 ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}
                style={isActive ? { color: subject.color } : undefined}
              >
                {t(subject.labelKey)}
              </span>
              
              {/* Active Dot */}
              <div className="h-1 w-1 flex items-center justify-center mt-0.5">
                {isActive && (
                  <div 
                    className={`w-1 h-1 rounded-full transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`} 
                    style={{ backgroundColor: subject.color }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
