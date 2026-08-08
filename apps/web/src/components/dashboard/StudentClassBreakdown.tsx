'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  School,
  Search,
  UserCheck,
  ChevronRight,
  Sparkles,
  BookOpen,
  Filter,
  User,
  GraduationCap
} from 'lucide-react';

export interface ClassDetailStat {
  id: string;
  name: string;
  grade: string;
  section?: string;
  track?: string;
  totalStudents: number;
  femaleStudents: number;
  maleStudents: number;
  capacity?: number;
  homeroomTeacher?: {
    id: string;
    name: string;
    photoUrl?: string;
    position?: string;
  } | null;
}

interface StudentClassBreakdownProps {
  classData?: ClassDetailStat[];
  locale?: string;
}

export default function StudentClassBreakdown({ classData, locale = 'km' }: StudentClassBreakdownProps) {
  const isKhmer = locale === 'km';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  // Default fallback realistic data for Enterprise System
  const defaultClasses: ClassDetailStat[] = useMemo(() => [
    {
      id: 'c-12a',
      name: isKhmer ? 'ថ្នាក់ទី ១២ ក' : 'Class 12A',
      grade: '12',
      section: 'A',
      track: isKhmer ? 'វិទ្យាសាស្ត្រ' : 'Science Track',
      totalStudents: 38,
      femaleStudents: 22,
      maleStudents: 16,
      capacity: 40,
      homeroomTeacher: { id: 't-1', name: isKhmer ? 'លោកគ្រូ សុខ ចាន់ថា' : 'Sok Chantha', position: isKhmer ? 'គ្រូគណិតវិទ្យា' : 'Math Teacher' },
    },
    {
      id: 'c-12b',
      name: isKhmer ? 'ថ្នាក់ទី ១២ ខ' : 'Class 12B',
      grade: '12',
      section: 'B',
      track: isKhmer ? 'សង្គម' : 'Social Studies',
      totalStudents: 36,
      femaleStudents: 20,
      maleStudents: 16,
      capacity: 40,
      homeroomTeacher: { id: 't-2', name: isKhmer ? 'អ្នកគ្រូ គឹម ស្រីមុំ' : 'Kim Sreymom', position: isKhmer ? 'គ្រូអក្សរសាស្ត្រខ្មែរ' : 'Khmer Literature' },
    },
    {
      id: 'c-11a',
      name: isKhmer ? 'ថ្នាក់ទី ១១ ក' : 'Class 11A',
      grade: '11',
      section: 'A',
      track: isKhmer ? 'វិទ្យាសាស្ត្រ' : 'Science Track',
      totalStudents: 40,
      femaleStudents: 23,
      maleStudents: 17,
      capacity: 40,
      homeroomTeacher: { id: 't-3', name: isKhmer ? 'លោកគ្រូ ហេង វិបុល' : 'Heng Vibol', position: isKhmer ? 'គ្រូរូបវិទ្យា' : 'Physics Teacher' },
    },
    {
      id: 'c-11b',
      name: isKhmer ? 'ថ្នាក់ទី ១១ ខ' : 'Class 11B',
      grade: '11',
      section: 'B',
      track: isKhmer ? 'សង្គម' : 'Social Studies',
      totalStudents: 39,
      femaleStudents: 21,
      maleStudents: 18,
      capacity: 40,
      homeroomTeacher: { id: 't-4', name: isKhmer ? 'អ្នកគ្រូ លី ណារី' : 'Ly Nary', position: isKhmer ? 'គ្រូប្រវត្តិវិទ្យា' : 'History Teacher' },
    },
    {
      id: 'c-10a',
      name: isKhmer ? 'ថ្នាក់ទី ១០ ក' : 'Class 10A',
      grade: '10',
      section: 'A',
      track: isKhmer ? 'ទូទៅ' : 'General',
      totalStudents: 42,
      femaleStudents: 24,
      maleStudents: 18,
      capacity: 45,
      homeroomTeacher: { id: 't-5', name: isKhmer ? 'លោកគ្រូ ជិន សុភ័ក្ត្រ' : 'Chin Sopheak', position: isKhmer ? 'គ្រូគមីវិទ្យា' : 'Chemistry Teacher' },
    },
    {
      id: 'c-9a',
      name: isKhmer ? 'ថ្នាក់ទី ៩ ក' : 'Class 9A',
      grade: '9',
      section: 'A',
      track: isKhmer ? 'ទូទៅ' : 'General',
      totalStudents: 44,
      femaleStudents: 25,
      maleStudents: 19,
      capacity: 45,
      homeroomTeacher: { id: 't-6', name: isKhmer ? 'អ្នកគ្រូ ចាន់ សុភា' : 'Chan Sophea', position: isKhmer ? 'គ្រូជីវវិទ្យា' : 'Biology Teacher' },
    },
  ], [isKhmer]);

  // An empty array is authoritative and must not reveal demo/current-year data.
  const activeClasses = classData ?? defaultClasses;

  // Extract unique grades available
  const availableGrades = useMemo(() => {
    const gradesSet = new Set(activeClasses.map(c => c.grade));
    return Array.from(gradesSet).sort((a, b) => {
      const numA = parseInt(a, 10) || 0;
      const numB = parseInt(b, 10) || 0;
      return numB - numA;
    });
  }, [activeClasses]);

  // Filtered classes based on search & grade tab
  const filteredClasses = useMemo(() => {
    return activeClasses.filter(cls => {
      const matchesGrade = selectedGrade === 'ALL' || cls.grade === selectedGrade;
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        cls.name.toLowerCase().includes(query) ||
        cls.grade.toLowerCase().includes(query) ||
        (cls.homeroomTeacher?.name && cls.homeroomTeacher.name.toLowerCase().includes(query));

      return matchesGrade && matchesSearch;
    });
  }, [activeClasses, selectedGrade, searchTerm]);

  return (
    <div className="bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-gray-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-widest mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ស្ថិតិសិស្សតាមថ្នាក់រៀន' : 'Class Roster & Demographics'}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            {isKhmer ? 'ទិន្នន័យសិស្ស និងគ្រូប្រចាំថ្នាក់' : 'Class Demographics & Homeroom Teachers'}
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {isKhmer ? 'ព័ត៌មានចំនួនសិស្ស សិស្សស្រី និងគ្រូទទួលបន្ទុកតាមថ្នាក់នីមួយៗ' : 'Detailed student count, female ratio, and homeroom teacher assignments'}
          </p>
        </div>

        <Link
          href={`/${locale}/classes`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:opacity-90 transition-all shadow-md self-start md:self-auto"
        >
          <span>{isKhmer ? 'គ្រប់គ្រងថ្នាក់រៀនទាំងអស់' : 'Manage All Classes'}</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Grade Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedGrade('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              selectedGrade === 'ALL'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-100 dark:bg-gray-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'
            }`}
          >
            {isKhmer ? 'ថ្នាក់ទាំងអស់' : 'All Classes'}
          </button>
          {availableGrades.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                selectedGrade === g
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-100 dark:bg-gray-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'
              }`}
            >
              {isKhmer ? `កម្រិតទី ${g}` : `Grade ${g}`}
            </button>
          ))}
        </div>

        {/* Search Input Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isKhmer ? 'ស្វែងរកឈ្មោះថ្នាក់ ឬគ្រូ...' : 'Search class or teacher...'}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((cls) => {
            const femaleRatio = cls.totalStudents > 0 ? ((cls.femaleStudents / cls.totalStudents) * 100).toFixed(0) : '0';
            const capacityPercent = cls.capacity ? Math.min(100, Math.round((cls.totalStudents / cls.capacity) * 100)) : 80;

            return (
              <div
                key={cls.id}
                className="group relative bg-slate-50/70 dark:bg-gray-800/40 rounded-[2rem] p-6 border border-slate-200/80 dark:border-gray-800/80 hover:bg-white dark:hover:bg-gray-800/90 transition-all duration-300 hover:shadow-xl hover:border-blue-500/30"
              >
                {/* Header: Class Title & Track Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                      <School className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cls.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {isKhmer ? `កម្រិត ${cls.grade}` : `Grade ${cls.grade}`}
                        </span>
                        {cls.track && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-black">
                            {cls.track}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/${locale}/classes/${cls.id}/roster`}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-all shadow-sm"
                    title={isKhmer ? 'មើលបញ្ជីឈ្មោះសិស្ស' : 'View Roster'}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* Homeroom Teacher Details */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900/60 border border-slate-200/60 dark:border-gray-800 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0 font-bold overflow-hidden">
                    {cls.homeroomTeacher?.photoUrl ? (
                      <Image
                        src={cls.homeroomTeacher.photoUrl}
                        alt={cls.homeroomTeacher.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                      {isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher'}
                    </p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {cls.homeroomTeacher?.name || (isKhmer ? 'មិនទាន់ចាត់តាំង' : 'Unassigned')}
                    </p>
                    {cls.homeroomTeacher?.position && (
                      <p className="text-[10px] text-slate-400 truncate">{cls.homeroomTeacher.position}</p>
                    )}
                  </div>
                </div>

                {/* Main Student Counts & Demographics */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-slate-100/80 dark:bg-gray-900/40">
                    <div>
                      <p className="text-base font-black text-slate-800 dark:text-white leading-tight">{cls.totalStudents}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{isKhmer ? 'សរុប' : 'Total'}</p>
                    </div>
                    <div className="border-x border-slate-200 dark:border-gray-800">
                      <p className="text-base font-black text-pink-600 dark:text-pink-400 leading-tight">{cls.femaleStudents}</p>
                      <p className="text-[9px] font-bold text-pink-500 uppercase">{isKhmer ? 'សិស្សស្រី' : 'Female'}</p>
                    </div>
                    <div>
                      <p className="text-base font-black text-blue-600 dark:text-blue-400 leading-tight">{cls.maleStudents}</p>
                      <p className="text-[9px] font-bold text-blue-500 uppercase">{isKhmer ? 'សិស្សប្រុស' : 'Male'}</p>
                    </div>
                  </div>

                  {/* Gender Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>{isKhmer ? `សិស្សស្រី ${femaleRatio}%` : `Female ${femaleRatio}%`}</span>
                      <span>{isKhmer ? `ចំណុះ: ${cls.totalStudents}/${cls.capacity || 40}` : `Capacity: ${cls.totalStudents}/${cls.capacity || 40}`}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div className="h-full bg-pink-500 transition-all duration-700" style={{ width: `${femaleRatio}%` }} />
                      <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${100 - parseFloat(femaleRatio)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-bold">{isKhmer ? 'មិនមានទិន្នន័យថ្នាក់រៀនត្រឹមត្រូវ' : 'No matching class records found'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
