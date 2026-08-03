'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Users,
  GraduationCap,
  School,
  Sparkles,
  UserCheck,
  Award,
  Layers,
  BarChart3,
  Filter,
  Check,
  User,
  ChevronDown
} from 'lucide-react';

export interface GradeStat {
  grade: string;
  gradeLabel: string;
  totalStudents: number;
  femaleStudents: number;
  maleStudents: number;
  classCount: number;
}

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

interface StudentGradeBreakdownProps {
  gradeData?: GradeStat[];
  classData?: ClassDetailStat[];
  locale?: string;
}

// Preset themes for grade color coding
const GRADE_THEMES = [
  { color: '#f97316' },
  { color: '#3b82f6' },
  { color: '#06b6d4' },
  { color: '#10b981' },
  { color: '#d946ef' },
  { color: '#8b5cf6' },
];

export default function StudentGradeBreakdown({
  gradeData,
  classData,
  locale = 'km',
}: StudentGradeBreakdownProps) {
  const isKhmer = locale === 'km';
  const [chartMode, setChartMode] = useState<'gender' | 'total'>('gender');

  // Selected filter states for Grade & Class
  const [selectedGrade, setSelectedGrade] = useState<string>('12');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Fallback realistic datasets
  const defaultGradeStats: GradeStat[] = useMemo(
    () => [
      { grade: '12', gradeLabel: isKhmer ? 'ថ្នាក់ទី ១២' : 'Grade 12', totalStudents: 142, femaleStudents: 78, maleStudents: 64, classCount: 4 },
      { grade: '11', gradeLabel: isKhmer ? 'ថ្នាក់ទី ១១' : 'Grade 11', totalStudents: 156, femaleStudents: 84, maleStudents: 72, classCount: 4 },
      { grade: '10', gradeLabel: isKhmer ? 'ថ្នាក់ទី ១០' : 'Grade 10', totalStudents: 168, femaleStudents: 90, maleStudents: 78, classCount: 4 },
      { grade: '9',  gradeLabel: isKhmer ? 'ថ្នាក់ទី ៩'  : 'Grade 9',  totalStudents: 135, femaleStudents: 72, maleStudents: 63, classCount: 3 },
      { grade: '8',  gradeLabel: isKhmer ? 'ថ្នាក់ទី ៨'  : 'Grade 8',  totalStudents: 87, femaleStudents: 47, maleStudents: 40, classCount: 2 },
      { grade: '7',  gradeLabel: isKhmer ? 'ថ្នាក់ទី ៧'  : 'Grade 7',  totalStudents: 95, femaleStudents: 51, maleStudents: 44, classCount: 2 },
    ],
    [isKhmer]
  );

  const defaultClasses: ClassDetailStat[] = useMemo(
    () => [
      { id: 'c-12a', name: isKhmer ? 'ថ្នាក់ ១២ ក' : '12A', grade: '12', section: 'A', track: isKhmer ? 'វិទ្យាសាស្ត្រ' : 'Science', totalStudents: 38, femaleStudents: 22, maleStudents: 16, capacity: 40, homeroomTeacher: { id: 't-1', name: isKhmer ? 'លោកគ្រូ សុខ ចាន់ថា' : 'Sok Chantha', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-12b', name: isKhmer ? 'ថ្នាក់ ១២ ខ' : '12B', grade: '12', section: 'B', track: isKhmer ? 'សង្គម' : 'Social Studies', totalStudents: 36, femaleStudents: 20, maleStudents: 16, capacity: 40, homeroomTeacher: { id: 't-2', name: isKhmer ? 'អ្នកគ្រូ គឹម ស្រីមុំ' : 'Kim Sreymom', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-12c', name: isKhmer ? 'ថ្នាក់ ១២ គ' : '12C', grade: '12', section: 'C', track: isKhmer ? 'វិទ្យាសាស្ត្រ' : 'Science', totalStudents: 35, femaleStudents: 19, maleStudents: 16, capacity: 40, homeroomTeacher: { id: 't-3', name: isKhmer ? 'លោកគ្រូ ហេង វិបុល' : 'Heng Vibol', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-12d', name: isKhmer ? 'ថ្នាក់ ១២ ឃ' : '12D', grade: '12', section: 'D', track: isKhmer ? 'សង្គម' : 'Social Studies', totalStudents: 33, femaleStudents: 17, maleStudents: 16, capacity: 40, homeroomTeacher: { id: 't-4', name: isKhmer ? 'អ្នកគ្រូ លី ណារី' : 'Ly Nary', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },

      { id: 'c-11a', name: isKhmer ? 'ថ្នាក់ ១១ ក' : '11A', grade: '11', section: 'A', track: isKhmer ? 'វិទ្យាសាស្ត្រ' : 'Science', totalStudents: 40, femaleStudents: 23, maleStudents: 17, capacity: 40, homeroomTeacher: { id: 't-5', name: isKhmer ? 'លោកគ្រូ ជិន សុភ័ក្ត្រ' : 'Chin Sopheak', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-11b', name: isKhmer ? 'ថ្នាក់ ១១ ខ' : '11B', grade: '11', section: 'B', track: isKhmer ? 'សង្គម' : 'Social Studies', totalStudents: 39, femaleStudents: 21, maleStudents: 18, capacity: 40, homeroomTeacher: { id: 't-6', name: isKhmer ? 'អ្នកគ្រូ ចាន់ សុភា' : 'Chan Sophea', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-11c', name: isKhmer ? 'ថ្នាក់ ១១ គ' : '11C', grade: '11', section: 'C', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 38, femaleStudents: 20, maleStudents: 18, capacity: 40, homeroomTeacher: { id: 't-7', name: isKhmer ? 'លោកគ្រូ សន វុទ្ធី' : 'Sorn Vuthy', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-11d', name: isKhmer ? 'ថ្នាក់ ១១ ឃ' : '11D', grade: '11', section: 'D', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 39, femaleStudents: 20, maleStudents: 19, capacity: 40, homeroomTeacher: { id: 't-8', name: isKhmer ? 'អ្នកគ្រូ អ៊ុំ សាវី' : 'Oum Savey', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },

      { id: 'c-10a', name: isKhmer ? 'ថ្នាក់ ១០ ក' : '10A', grade: '10', section: 'A', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 42, femaleStudents: 24, maleStudents: 18, capacity: 45, homeroomTeacher: { id: 't-9', name: isKhmer ? 'លោកគ្រូ មាស សារ៉ាត' : 'Meas Sarat', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-10b', name: isKhmer ? 'ថ្នាក់ ១០ ខ' : '10B', grade: '10', section: 'B', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 41, femaleStudents: 22, maleStudents: 19, capacity: 45, homeroomTeacher: { id: 't-10', name: isKhmer ? 'អ្នកគ្រូ ប៉ែន ចិន្តា' : 'Pen Chenda', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-10c', name: isKhmer ? 'ថ្នាក់ ១០ គ' : '10C', grade: '10', section: 'C', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 43, femaleStudents: 23, maleStudents: 20, capacity: 45, homeroomTeacher: { id: 't-11', name: isKhmer ? 'លោកគ្រូ រ័ត្ន សម្បត្តិ' : 'Rath Sambath', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-10d', name: isKhmer ? 'ថ្នាក់ ១០ ឃ' : '10D', grade: '10', section: 'D', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 42, femaleStudents: 21, maleStudents: 21, capacity: 45, homeroomTeacher: { id: 't-12', name: isKhmer ? 'អ្នកគ្រូ កែវ សោភា' : 'Keo Sophea', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },

      { id: 'c-9a', name: isKhmer ? 'ថ្នាក់ ៩ ក' : '9A', grade: '9', section: 'A', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 44, femaleStudents: 25, maleStudents: 19, capacity: 45, homeroomTeacher: { id: 't-13', name: isKhmer ? 'លោកគ្រូ គង់ សុជាតិ' : 'Kong Socheat', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-9b', name: isKhmer ? 'ថ្នាក់ ៩ ខ' : '9B', grade: '9', section: 'B', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 45, femaleStudents: 24, maleStudents: 21, capacity: 45, homeroomTeacher: { id: 't-14', name: isKhmer ? 'អ្នកគ្រូ ស៊ឹម ធីតា' : 'Sim Thida', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-9c', name: isKhmer ? 'ថ្នាក់ ៩ គ' : '9C', grade: '9', section: 'C', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 46, femaleStudents: 23, maleStudents: 23, capacity: 45, homeroomTeacher: { id: 't-15', name: isKhmer ? 'លោកគ្រូ អ៊ុក ដារ៉ា' : 'Ouk Dara', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },

      { id: 'c-8a', name: isKhmer ? 'ថ្នាក់ ៨ ក' : '8A', grade: '8', section: 'A', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 43, femaleStudents: 23, maleStudents: 20, capacity: 45, homeroomTeacher: { id: 't-16', name: isKhmer ? 'អ្នកគ្រូ តាំង លីដា' : 'Tang Lyda', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-8b', name: isKhmer ? 'ថ្នាក់ ៨ ខ' : '8B', grade: '8', section: 'B', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 44, femaleStudents: 24, maleStudents: 20, capacity: 45, homeroomTeacher: { id: 't-17', name: isKhmer ? 'លោកគ្រូ ថោង សំណាង' : 'Thong Samnang', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },

      { id: 'c-7a', name: isKhmer ? 'ថ្នាក់ ៧ ក' : '7A', grade: '7', section: 'A', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 48, femaleStudents: 26, maleStudents: 22, capacity: 50, homeroomTeacher: { id: 't-18', name: isKhmer ? 'អ្នកគ្រូ នួន សុខា' : 'Nuon Sokha', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
      { id: 'c-7b', name: isKhmer ? 'ថ្នាក់ ៧ ខ' : '7B', grade: '7', section: 'B', track: isKhmer ? 'ទូទៅ' : 'General', totalStudents: 47, femaleStudents: 25, maleStudents: 22, capacity: 50, homeroomTeacher: { id: 't-19', name: isKhmer ? 'លោកគ្រូ អ៊ាង ចាន់នី' : 'Eang Channy', position: isKhmer ? 'គ្រូប្រចាំថ្នាក់' : 'Homeroom Teacher' } },
    ],
    [isKhmer]
  );

  const activeStats = (gradeData && gradeData.length > 0) ? gradeData : defaultGradeStats;
  const activeClassList = (classData && classData.length > 0) ? classData : defaultClasses;

  // Extract unique available grades
  const availableGrades = useMemo(() => {
    const gradesSet = new Set(activeClassList.map((c) => c.grade));
    return Array.from(gradesSet).sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
  }, [activeClassList]);

  // Classes filtered by selected grade
  const classesForSelectedGrade = useMemo(() => {
    if (selectedGrade === 'ALL') return activeClassList;
    return activeClassList.filter((c) => c.grade === selectedGrade);
  }, [activeClassList, selectedGrade]);

  // Currently selected class object (or null if 'ALL')
  const selectedClass = useMemo(() => {
    if (selectedClassId === 'ALL') return null;
    return activeClassList.find((c) => c.id === selectedClassId) || null;
  }, [activeClassList, selectedClassId]);

  // Totals for overall overview header
  const totalStudentsOverall = useMemo(() => activeStats.reduce((sum, item) => sum + item.totalStudents, 0), [activeStats]);
  const totalFemaleOverall = useMemo(() => activeStats.reduce((sum, item) => sum + item.femaleStudents, 0), [activeStats]);
  const femaleRatioOverall = totalStudentsOverall > 0 ? ((totalFemaleOverall / totalStudentsOverall) * 100).toFixed(1) : '0';

  // Metrics for the Right Card (dynamically update when filter changes!)
  const activeCardMetrics = useMemo(() => {
    if (selectedClass) {
      const female = selectedClass.femaleStudents;
      const male = selectedClass.maleStudents;
      const total = selectedClass.totalStudents;
      const ratio = total > 0 ? ((female / total) * 100).toFixed(1) : '0';
      return {
        title: isKhmer ? `សមភាពភេទ: ${selectedClass.name}` : `Gender Ratio: ${selectedClass.name}`,
        ratio: `${ratio}%`,
        femaleCount: female,
        maleCount: male,
        totalCount: total,
        subtitle: isKhmer ? `ភាគរយសិស្សស្រីក្នុង${selectedClass.name}` : `Female ratio in ${selectedClass.name}`,
        teacherName: selectedClass.homeroomTeacher?.name,
      };
    }

    if (selectedGrade !== 'ALL') {
      const gradeClasses = activeClassList.filter((c) => c.grade === selectedGrade);
      const total = gradeClasses.reduce((sum, c) => sum + c.totalStudents, 0);
      const female = gradeClasses.reduce((sum, c) => sum + c.femaleStudents, 0);
      const male = gradeClasses.reduce((sum, c) => sum + c.maleStudents, 0);
      const ratio = total > 0 ? ((female / total) * 100).toFixed(1) : '0';
      return {
        title: isKhmer ? `សមភាពភេទ: កម្រិតទី ${selectedGrade}` : `Gender Ratio: Grade ${selectedGrade}`,
        ratio: `${ratio}%`,
        femaleCount: female,
        maleCount: male,
        totalCount: total,
        subtitle: isKhmer ? `ភាគរយសិស្សស្រីក្នុងកម្រិតទី ${selectedGrade}` : `Female ratio in Grade ${selectedGrade}`,
        teacherName: null,
      };
    }

    return {
      title: isKhmer ? 'សមភាពភេទសិស្ស' : 'Gender Balance Ratio',
      ratio: `${femaleRatioOverall}%`,
      femaleCount: totalFemaleOverall,
      maleCount: totalStudentsOverall - totalFemaleOverall,
      totalCount: totalStudentsOverall,
      subtitle: isKhmer ? 'ភាគរយសិស្សស្រីសរុបទូទាំងសាលារៀន' : 'Overall female proportion across school',
      teacherName: null,
    };
  }, [selectedClass, selectedGrade, activeClassList, totalFemaleOverall, totalStudentsOverall, femaleRatioOverall, isKhmer]);

  // Dynamic Pie/Donut Chart Data calculation
  const pieChartConfig = useMemo(() => {
    if (selectedClass) {
      const total = selectedClass.totalStudents;
      const female = selectedClass.femaleStudents;
      const male = selectedClass.maleStudents;
      const femaleRatio = total > 0 ? ((female / total) * 100).toFixed(1) : '0';
      const maleRatio = total > 0 ? ((male / total) * 100).toFixed(1) : '0';

      return {
        title: isKhmer ? `ផលធៀបសិស្ស: ${selectedClass.name}` : `Gender Ratio: ${selectedClass.name}`,
        subtitle: isKhmer ? `សិស្សសរុប ${total} នាក់ (ស្រី ${female} នាក់)` : `Total ${total} students`,
        centerText: `${femaleRatio}%`,
        centerSubtext: isKhmer ? 'សិស្សស្រី' : 'Female Ratio',
        data: [
          { name: isKhmer ? 'សិស្សស្រី' : 'Female', value: female, female: female, percentage: femaleRatio, color: '#ec4899' },
          { name: isKhmer ? 'សិស្សប្រុស' : 'Male', value: male, female: 0, percentage: maleRatio, color: '#3b82f6' },
        ],
      };
    }

    if (selectedGrade !== 'ALL') {
      const gradeClasses = activeClassList.filter((c) => c.grade === selectedGrade);
      const totalGradeStudents = gradeClasses.reduce((sum, c) => sum + c.totalStudents, 0);

      const slices = gradeClasses.map((c, index) => {
        const percentage = totalGradeStudents > 0 ? ((c.totalStudents / totalGradeStudents) * 100).toFixed(1) : '0';
        const theme = GRADE_THEMES[index % GRADE_THEMES.length];
        return {
          name: c.name,
          value: c.totalStudents,
          female: c.femaleStudents,
          male: c.maleStudents,
          percentage,
          color: theme.color,
        };
      });

      return {
        title: isKhmer ? `ផលធៀបសិស្ស: កម្រិតទី ${selectedGrade}` : `Class Ratio: Grade ${selectedGrade}`,
        subtitle: isKhmer ? `សិស្សសរុប ${totalGradeStudents} នាក់ តាមផ្នែកនីមួយៗ` : `Total ${totalGradeStudents} students`,
        centerText: `${totalGradeStudents}`,
        centerSubtext: isKhmer ? 'សិស្សសរុប' : 'Total Students',
        data: slices,
      };
    }

    const slices = activeStats.map((item, index) => {
      const percentage = totalStudentsOverall > 0 ? ((item.totalStudents / totalStudentsOverall) * 100).toFixed(1) : '0';
      const theme = GRADE_THEMES[index % GRADE_THEMES.length];
      return {
        name: item.gradeLabel,
        value: item.totalStudents,
        female: item.femaleStudents,
        male: item.maleStudents,
        percentage,
        color: theme.color,
      };
    });

    return {
      title: isKhmer ? 'ផលធៀបសិស្សតាមកម្រិតថ្នាក់' : 'Grade Percentage Breakdown',
      subtitle: isKhmer ? 'ទិន្នន័យសិស្សសរុបទូទាំងសាលារៀន' : 'Schoolwide Student Census',
      centerText: `${femaleRatioOverall}%`,
      centerSubtext: isKhmer ? 'សិស្សស្រីសរុប' : 'Overall Female %',
      data: slices,
    };
  }, [selectedClass, selectedGrade, activeClassList, activeStats, totalStudentsOverall, femaleRatioOverall, isKhmer]);

  // Columns Chart Data Preparation
  const columnChartData = useMemo(() => {
    return activeStats.map((item, index) => {
      const femaleRatio = item.totalStudents > 0 ? Math.round((item.femaleStudents / item.totalStudents) * 100) : 0;
      const theme = GRADE_THEMES[index % GRADE_THEMES.length];
      return {
        name: item.gradeLabel,
        shortName: isKhmer ? `ថ្នាក់ទី ${item.grade}` : `G${item.grade}`,
        total: item.totalStudents,
        female: item.femaleStudents,
        male: item.maleStudents,
        femaleRatio,
        classes: item.classCount,
        color: theme.color,
      };
    });
  }, [activeStats, isKhmer]);

  return (
    <div className="space-y-8">
      {/* Top Banner Stats Overview */}
      <div className="bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 space-y-8">
        
        {/* Header & Main Overall Counters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {isKhmer ? 'ទិន្នន័យសិស្សសរុប' : 'Total Students Data'}
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              {isKhmer ? 'ព័ត៌មានលម្អិតអំពីចំនួនសិស្ស ភេទស្រី និងថ្នាក់រៀនតាមកម្រិតនីមួយៗ' : 'Comprehensive grade metrics and female student demographics'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/60">
              <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {isKhmer ? 'សិស្សស្រីសរុប' : 'Total Female'}
                </p>
                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                  {totalFemaleOverall} <span className="text-xs text-pink-500 font-bold">({femaleRatioOverall}%)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/60">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {isKhmer ? 'សិស្សសរុប' : 'Total Students'}
                </p>
                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                  {totalStudentsOverall} {isKhmer ? 'នាក់' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Class Filter Controls (2 Equal-Width Material Design Dropdowns Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full p-4 rounded-2xl bg-slate-50/90 dark:bg-gray-800/50 border border-slate-200/80 dark:border-gray-800/80 shadow-sm">
          {/* Grade Level Material Dropdown (Column 1 - 50% width) */}
          <div className="group relative w-full">
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110 z-10" />
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedClassId('ALL');
              }}
              className="w-full appearance-none pl-11 pr-10 py-3 rounded-xl bg-white dark:bg-gray-800 border border-slate-200/90 dark:border-gray-700 text-xs font-black text-slate-800 dark:text-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">{isKhmer ? 'កម្រិតទាំងអស់ (All Grades)' : 'All Grades'}</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  {isKhmer ? `ថ្នាក់ទី ${g}` : `Grade ${g}`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-2px] z-10" />
          </div>

          {/* Class Section Material Dropdown (Column 2 - 50% width) */}
          <div className="group relative w-full">
            <School className="w-4 h-4 text-purple-600 dark:text-purple-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110 z-10" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full appearance-none pl-11 pr-10 py-3 rounded-xl bg-white dark:bg-gray-800 border border-slate-200/90 dark:border-gray-700 text-xs font-black text-slate-800 dark:text-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all cursor-pointer"
            >
              <option value="ALL">
                {isKhmer
                  ? `ថ្នាក់ទាំងអស់ (${classesForSelectedGrade.length} ថ្នាក់)`
                  : `All Classes (${classesForSelectedGrade.length})`}
              </option>
              {classesForSelectedGrade.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.totalStudents} {isKhmer ? 'នាក់' : 'students'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-2px] z-10" />
          </div>
        </div>





        {/* Donut Chart Widget (Left lg:col-span-8) & Rich Gradient Visual Cards (Right lg:col-span-4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Distribution Donut Widget (8 Columns) */}
          <div className="lg:col-span-8 bg-slate-50/80 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-200/60 dark:border-gray-800/60 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold flex-shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                    {pieChartConfig.title}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">{pieChartConfig.subtitle}</p>
                </div>
              </div>
              {selectedClass && (
                <span className="px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 text-xs font-black border border-pink-200 dark:border-pink-800/40 flex-shrink-0">
                  {selectedClass.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center my-auto">
              {/* Donut Chart Canvas */}
              <div className="sm:col-span-6 relative h-64 sm:h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Pie
                      data={pieChartConfig.data}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={88}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartConfig.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
                              <p className="font-bold">{data.name}</p>
                              <p className="text-slate-300">
                                {isKhmer ? 'ចំនួនសិស្ស:' : 'Students:'} <span className="text-white font-bold">{data.value} នាក់</span>
                              </p>
                              <p className="text-blue-400 font-bold">{data.percentage}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Content in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                    {pieChartConfig.centerText}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    {pieChartConfig.centerSubtext}
                  </span>
                </div>
              </div>

              {/* Legend Items List on Right of Donut */}
              <div className="sm:col-span-6 space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-none">
                {pieChartConfig.data.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-gray-800/80 shadow-sm border border-slate-200/60 dark:border-gray-700/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate">{item.name}</p>
                        {item.female !== undefined && (
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            {isKhmer ? `ស្រី ${item.female} នាក់` : `${item.female} Female`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 whitespace-nowrap">
                      <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{item.value} នាក់</p>
                      <p className="text-[10px] font-bold text-blue-500 mt-0.5">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>



          {/* Dynamic Rich Visual Cards (Right 4 Columns - 3 Well-Proportioned Cards Stack) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4">
            
            {/* Card 1 (Top - Sleek Purple/Indigo Gradient Card) */}
            <div className="p-5 rounded-[1.75rem] bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white border border-white/30">
                    {activeCardMetrics.title}
                  </span>
                  <Award className="w-5 h-5 text-amber-300 flex-shrink-0" />
                </div>

                <div>
                  <p className="text-3xl font-black tracking-tight">{activeCardMetrics.ratio}</p>
                  <p className="text-xs text-purple-200 font-medium leading-normal mt-0.5">
                    {activeCardMetrics.subtitle}
                  </p>
                </div>

                {/* Progress ratio bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-white/90">
                    <span>{isKhmer ? `ស្រី: ${activeCardMetrics.femaleCount}` : `Female: ${activeCardMetrics.femaleCount}`}</span>
                    <span>{isKhmer ? `ប្រុស: ${activeCardMetrics.maleCount}` : `Male: ${activeCardMetrics.maleCount}`}</span>
                  </div>
                  <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/20 flex">
                    <div
                      className="h-full bg-pink-400 rounded-full transition-all duration-700"
                      style={{ width: activeCardMetrics.ratio }}
                    />
                    <div
                      className="h-full bg-blue-300 rounded-full transition-all duration-700"
                      style={{ width: `${100 - parseFloat(activeCardMetrics.ratio)}%` }}
                    />
                  </div>
                </div>

                {activeCardMetrics.teacherName && (
                  <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                    <User className="w-4 h-4 text-pink-300 flex-shrink-0" />
                    <span className="text-xs font-semibold text-purple-100 truncate">
                      {isKhmer ? `គ្រូប្រចាំថ្នាក់: ${activeCardMetrics.teacherName}` : `Homeroom Teacher: ${activeCardMetrics.teacherName}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* Card 2 (Middle - Emerald Card) */}
            <div className="p-5 rounded-[1.75rem] bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center font-bold flex-shrink-0">
                  <GraduationCap className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-white leading-tight truncate">
                    {isKhmer ? 'ចំនួនថ្នាក់សរុប' : 'Total Classes'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate mt-1">
                    {isKhmer ? (selectedGrade === 'ALL' ? 'ថ្នាក់រៀនក្នុងសាលា' : `ថ្នាក់រៀនក្នុងកម្រិតទី ${selectedGrade}`) : 'Active section rosters'}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-black text-slate-800 dark:text-white block leading-none">
                  {classesForSelectedGrade.length}
                </span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{isKhmer ? 'ថ្នាក់រៀន' : 'classes'}</span>
              </div>
            </div>

            {/* Card 3 (Bottom - Amber Card) */}
            <div className="p-5 rounded-[1.75rem] bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 flex items-center justify-center font-bold flex-shrink-0">
                  <School className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-white leading-tight truncate">
                    {isKhmer ? 'មធ្យមភាគតាមថ្នាក់' : 'Average Class Size'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate mt-1">
                    {isKhmer ? 'សិស្សសរុប/ថ្នាក់' : 'Students per class'}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-black text-slate-800 dark:text-white block leading-none">
                  {activeStats.length > 0
                    ? Math.round(totalStudentsOverall / activeStats.reduce((sum, g) => sum + g.classCount, 0) || 0)
                    : 0}
                </span>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block mt-1">{isKhmer ? 'នាក់/ថ្នាក់' : 'students'}</span>
              </div>
            </div>





          </div>
        </div>


      </div>

      {/* Enterprise Columns Chart Section ( របារស្ថិតិសិស្សតាមកម្រិតថ្នាក់ ) */}
      <div className="bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 space-y-6">
        {/* Columns Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
                {isKhmer ? 'របារស្ថិតិសិស្សតាមកម្រិតថ្នាក់' : 'Grade Analytics Columns Chart'}
              </h3>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {isKhmer ? 'ការប្រៀបធៀបចំនួនសិស្សស្រី សិស្សប្រុស និងចំនួនសិស្សសរុបតាមកម្រិតថ្នាក់នីមួយៗ' : 'Comparative distribution of female, male, and total student counts per grade'}
            </p>
          </div>

          {/* Toggle View Mode Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl self-start sm:self-auto border border-slate-200 dark:border-gray-700">
            <button
              onClick={() => setChartMode('gender')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                chartMode === 'gender'
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {isKhmer ? 'ប្រៀបធៀបភេទ' : 'Gender Split'}
            </button>
            <button
              onClick={() => setChartMode('total')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                chartMode === 'total'
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {isKhmer ? 'សិស្សសរុប' : 'Total Students'}
            </button>
          </div>
        </div>

        {/* Recharts Bar/Columns Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={columnChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFemaleBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="colorMaleBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="colorTotalBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="shortName"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 'semibold', fill: '#94a3b8' }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl text-xs shadow-2xl border border-slate-700 space-y-1.5">
                        <p className="font-black text-sm text-blue-400">{data.name}</p>
                        <div className="space-y-1 text-slate-300">
                          <p className="flex justify-between gap-4">
                            <span>{isKhmer ? 'សិស្សសរុប:' : 'Total Students:'}</span>
                            <span className="font-bold text-white">{data.total} {isKhmer ? 'នាក់' : ''}</span>
                          </p>
                          <p className="flex justify-between gap-4 text-pink-400 font-medium">
                            <span>{isKhmer ? 'សិស្សស្រី:' : 'Female Students:'}</span>
                            <span className="font-bold">{data.female} នាក់ ({data.femaleRatio}%)</span>
                          </p>
                          <p className="flex justify-between gap-4 text-blue-400 font-medium">
                            <span>{isKhmer ? 'សិស្សប្រុស:' : 'Male Students:'}</span>
                            <span className="font-bold">{data.male} នាក់ ({100 - data.femaleRatio}%)</span>
                          </p>
                          <p className="flex justify-between gap-4 text-purple-300 border-t border-slate-800 pt-1">
                            <span>{isKhmer ? 'ចំនួនថ្នាក់រៀន:' : 'Classes:'}</span>
                            <span className="font-bold text-white">{data.classes} {isKhmer ? 'ថ្នាក់' : ''}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {chartMode === 'gender' ? (
                <>
                  <Bar dataKey="female" name={isKhmer ? 'សិស្សស្រី' : 'Female'} fill="url(#colorFemaleBar)" radius={[8, 8, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="male" name={isKhmer ? 'សិស្សប្រុស' : 'Male'} fill="url(#colorMaleBar)" radius={[8, 8, 0, 0]} maxBarSize={32} />
                </>
              ) : (
                <Bar dataKey="total" name={isKhmer ? 'សិស្សសរុប' : 'Total Students'} radius={[10, 10, 0, 0]} maxBarSize={45}>
                  {columnChartData.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Indicators & Quick Data Summary Strip */}
        <div className="pt-4 border-t border-slate-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-500" />
              <span className="text-slate-700 dark:text-slate-300">{isKhmer ? 'សិស្សស្រី' : 'Female Students'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-700 dark:text-slate-300">{isKhmer ? 'សិស្សប្រុស' : 'Male Students'}</span>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {columnChartData.map((g) => (
              <div
                key={g.shortName}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700/80 text-[11px] font-bold"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-slate-800 dark:text-white">{g.shortName}:</span>
                <span className="text-blue-600 dark:text-blue-400 font-black">{g.total}</span>
                <span className="text-[9px] text-pink-500 font-bold">(ស្រី {g.female})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
