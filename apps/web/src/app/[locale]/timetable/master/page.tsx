'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import { getAcademicYearsAuto, AcademicYear } from '@/lib/api/academic-years';
import {
  timetableAPI,
} from '@/lib/api/timetable';
import {
  Calendar,
  Home,
  ChevronRight,
  Users,
  GraduationCap,
  Building2,
  School,
  RefreshCw,
  Settings,
  Wand2,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit3,
  BarChart3,
  Grid3X3,
  List,
} from 'lucide-react';
import {
  DAYS,
  DAY_LABELS,
  DayOfWeek,
  ShiftType,
  GradeLevel,
  getGradeLevel,
  getDefaultShift,
} from '@/components/timetable/types';

type ViewMode = 'overview' | 'grid' | 'list';

interface ClassStats {
  id: string;
  name: string;
  grade: number;
  section: string;
  gradeLevel: GradeLevel;
  entryCount: number;
  totalSlots: number;
  coverage: number;
  conflicts: number;
  shiftSchedule: Array<{ dayOfWeek: DayOfWeek; shiftType: ShiftType }>;
}

export default function MasterTimetablePage() {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Data
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teacherCount, setTeacherCount] = useState(0);

  // Selection
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel>('HIGH_SCHOOL');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set([10, 11, 12]));

  // State
  const [loadingData, setLoadingData] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSlots: 0,
    filledSlots: 0,
    coverage: 0,
    conflicts: 0,
  });

  // Initialize
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData?.user) {
      setUser(userData.user);
      setSchool(userData.school || { id: userData.user.schoolId, name: 'School' });
    }

    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const yearsRes = await getAcademicYearsAuto();
      const yearsData = yearsRes.data.academicYears || [];
      setAcademicYears(yearsData);

      // Set default year
      const defaultYear = yearsData.find((y: AcademicYear) => y.isCurrent) || yearsData[0];
      if (defaultYear) {
        setSelectedYearId(defaultYear.id);
        await loadClassStats(defaultYear.id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassStats = async (yearId: string) => {
    try {
      setLoadingData(true);
      const masterStatsRes = await timetableAPI.getMasterStats(yearId);
      const masterStats = masterStatsRes.data;

      const classStats: ClassStats[] = (masterStats.classes || []).map((cls) => {
        const grade = typeof cls.grade === 'string' ? parseInt(cls.grade, 10) : cls.grade;
        const gradeLevel = getGradeLevel(grade);
        return {
          id: cls.id,
          name: cls.name,
          grade,
          section: cls.section || cls.name.replace(/\d+/g, '').trim(),
          gradeLevel,
          entryCount: cls.entryCount,
          totalSlots: cls.totalSlots,
          coverage: cls.coverage,
          conflicts: cls.conflicts,
          shiftSchedule: DAYS.map((day) => ({
            dayOfWeek: day,
            shiftType: getDefaultShift(gradeLevel, day),
          })),
        };
      });

      setClasses(classStats);
      setTeacherCount(masterStats.teacherStats?.total || 0);

      setStats({
        totalClasses: masterStats.totalClasses,
        totalSlots: masterStats.totalSlots,
        filledSlots: masterStats.filledSlots,
        coverage: masterStats.coverage,
        conflicts: classStats.reduce((sum, c) => sum + c.conflicts, 0),
      });
    } catch (err) {
      console.error('Error loading class stats:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Filter classes by grade level
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => c.gradeLevel === selectedGradeLevel);
  }, [classes, selectedGradeLevel]);

  // Group classes by grade
  const classesByGrade = useMemo(() => {
    const grouped: Record<number, ClassStats[]> = {};
    filteredClasses.forEach((cls) => {
      if (!grouped[cls.grade]) grouped[cls.grade] = [];
      grouped[cls.grade].push(cls);
    });
    // Sort classes within each grade
    Object.keys(grouped).forEach((grade) => {
      grouped[parseInt(grade)].sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [filteredClasses]);

  const toggleGrade = (grade: number) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  const navigateToClassEditor = (classId: string) => {
    // Get locale from pathname
    const locale = window.location.pathname.split('/')[1] || 'en';
    router.push(`/${locale}/timetable?classId=${classId}`);
  };

  if (loading) {
    return <PageSkeleton type="table" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64">
        <main className="p-4 lg:p-8">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span>Timetable</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 dark:text-white font-medium">Master View</span>
              </nav>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                    <Grid3X3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                      Master Timetable
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Manage timetables for all {stats.totalClasses} classes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => loadClassStats(selectedYearId)}
                    disabled={loadingData}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Stats Cards */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Classes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalClasses}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Teachers</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{teacherCount}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Slots Filled</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.filledSlots}/{stats.totalSlots}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Coverage</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.coverage}%</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      stats.coverage >= 80 ? 'bg-green-500' : stats.coverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.coverage}%` }}
                  />
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Filters */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6 transition-colors">
              <div className="flex flex-wrap items-center gap-4">
                {/* Grade Level Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setSelectedGradeLevel('HIGH_SCHOOL');
                      setExpandedGrades(new Set([10, 11, 12]));
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      selectedGradeLevel === 'HIGH_SCHOOL'
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    High School (10-12)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGradeLevel('SECONDARY');
                      setExpandedGrades(new Set([7, 8, 9]));
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      selectedGradeLevel === 'SECONDARY'
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600 dark:text-amber-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <School className="h-4 w-4" />
                    Secondary (7-9)
                  </button>
                </div>

                {/* Academic Year */}
                <select
                  value={selectedYearId}
                  onChange={(e) => {
                    setSelectedYearId(e.target.value);
                    loadClassStats(e.target.value);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Current)'}
                    </option>
                  ))}
                </select>

                {/* View Mode */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ml-auto">
                  <button
                    onClick={() => setViewMode('overview')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'overview' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                    title="Overview"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Shift Schedule Info */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Default Shifts:</span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-200">Morning (7:00 AM - 12:00 PM)</span>
                    <span className="text-gray-400 dark:text-gray-500">- {selectedGradeLevel === 'HIGH_SCHOOL' ? 'High School' : 'Some days'}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-200">Afternoon (12:00 PM - 5:00 PM)</span>
                    <span className="text-gray-400 dark:text-gray-500">- {selectedGradeLevel === 'SECONDARY' ? 'Secondary' : 'Some days'}</span>
                  </span>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Classes Grid */}
          <AnimatedContent animation="slide-up" delay={150}>
            <BlurLoader isLoading={loadingData} showSpinner={false}>
              {Object.entries(classesByGrade)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([grade, classList]) => (
                  <div key={grade} className="mb-6">
                    {/* Grade Header */}
                    <button
                      onClick={() => toggleGrade(parseInt(grade))}
                      className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors mb-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedGradeLevel === 'HIGH_SCHOOL' 
                            ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                            : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900 dark:text-white">Grade {grade}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {classList.length} classes • {classList.reduce((sum, c) => sum + c.entryCount, 0)} slots filled
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Grade Coverage */}
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {Math.round(
                              (classList.reduce((sum, c) => sum + c.entryCount, 0) /
                                classList.reduce((sum, c) => sum + c.totalSlots, 0)) * 100
                            ) || 0}%
                          </span>
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{
                                width: `${
                                  Math.round(
                                    (classList.reduce((sum, c) => sum + c.entryCount, 0) /
                                      classList.reduce((sum, c) => sum + c.totalSlots, 0)) * 100
                                  ) || 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        {expandedGrades.has(parseInt(grade)) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Classes */}
                    {expandedGrades.has(parseInt(grade)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-4">
                        {classList.map((cls) => (
                          <div
                            key={cls.id}
                            onClick={() => navigateToClassEditor(cls.id)}
                            className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                          >
                            {/* Class Header */}
                            <div className={`px-4 py-3 bg-gradient-to-r ${
                              selectedGradeLevel === 'HIGH_SCHOOL'
                                ? 'from-blue-500 to-indigo-500'
                                : 'from-amber-500 to-orange-500'
                            } text-white`}>
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-lg">{cls.name}</h4>
                                <Edit3 className="h-4 w-4 opacity-75" />
                              </div>
                            </div>

                            {/* Class Stats */}
                            <div className="p-4">
                              {/* Coverage Bar */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600 dark:text-gray-400">Coverage</span>
                                  <span className={`font-semibold ${
                                    cls.coverage >= 80 ? 'text-green-600 dark:text-green-400' : 
                                    cls.coverage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {cls.coverage}%
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      cls.coverage >= 80 ? 'bg-green-500' : 
                                      cls.coverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${cls.coverage}%` }}
                                  />
                                </div>
                              </div>

                              {/* Slots Info */}
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {cls.entryCount} / {cls.totalSlots} slots
                                </span>
                                {cls.conflicts > 0 && (
                                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <AlertTriangle className="h-3 w-3" />
                                    {cls.conflicts}
                                  </span>
                                )}
                              </div>

                              {/* Shift Schedule Mini Preview */}
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex gap-1">
                                  {DAYS.map((day) => {
                                    const shift = cls.shiftSchedule.find(s => s.dayOfWeek === day);
                                    const isMorning = shift?.shiftType === 'MORNING';
                                    return (
                                      <div
                                        key={day}
                                        className={`flex-1 h-2 rounded-full ${
                                          isMorning 
                                            ? 'bg-amber-400' 
                                            : 'bg-blue-400'
                                        }`}
                                        title={`${DAY_LABELS[day].short}: ${shift?.shiftType || 'Not set'}`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-xs text-gray-400 dark:text-gray-500">Mon</span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">Sat</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {filteredClasses.length === 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center transition-colors">
                  <GraduationCap className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Classes Found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No classes found for {selectedGradeLevel === 'HIGH_SCHOOL' ? 'High School' : 'Secondary'} 
                    {selectedYearId ? ' in this academic year' : '. Please select an academic year.'}
                  </p>
                </div>
              )}
            </BlurLoader>
          </AnimatedContent>

          {/* Legend */}
          <AnimatedContent animation="slide-up" delay={200}>
            <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-green-500 rounded-full" />
                  <span className="text-gray-600 dark:text-gray-400">80%+ Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-gray-600 dark:text-gray-400">50-79% Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-red-500 rounded-full" />
                  <span className="text-gray-600 dark:text-gray-400">&lt;50% Coverage</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-4 h-2 bg-amber-400 rounded-full" />
                  <span className="text-gray-600 dark:text-gray-400">Morning Shift</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-blue-400 rounded-full" />
                  <span className="text-gray-600 dark:text-gray-400">Afternoon Shift</span>
                </div>
              </div>
            </div>
          </AnimatedContent>
        </main>
      </div>
    </div>
  );
}
