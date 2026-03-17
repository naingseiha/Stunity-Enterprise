'use client';

import { useEffect, useState, useMemo, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Users,
  Plus,
  Search,
  Edit,
  Edit2,
  Trash2,
  GraduationCap,
  Home,
  BookOpen,
  ChevronRight,
  School,
  RefreshCw,
  Eye,
  UserPlus,
  Calendar,
  ClipboardList,
  BarChart3,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { deleteClass, type Class } from '@/lib/api/classes';
import ClassModal from '@/components/classes/ClassModal';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { useClasses } from '@/hooks/useClasses';
import { useDebounce } from '@/hooks/useDebounce';

// Grade colors for visual distinction
const gradeColors: Record<number, { bg: string; text: string; border: string; light: string }> = {
  7: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200', light: 'bg-blue-50' },
  8: { bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-200', light: 'bg-indigo-50' },
  9: { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200', light: 'bg-purple-50' },
  10: { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', light: 'bg-emerald-50' },
  11: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-amber-50' },
  12: { bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200', light: 'bg-rose-50' },
};

const getGradeColor = (grade: number) => gradeColors[grade] || gradeColors[7];

export default function ClassesPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);

  const {
    locale
  } = params;

  const t = useTranslations('classes');
  const tc = useTranslations('common');
  const router = useRouter();

  const [selectedGrade, setSelectedGrade] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { selectedYear } = useAcademicYear();

  // Client-side only user data to avoid hydration mismatch
  const [userData, setUserData] = useState<{ user: any; school: any }>({ user: null, school: null });

  const user = userData.user;
  const school = userData.school;

  // Use SWR hook for data fetching with automatic caching
  const {
    classes,
    isLoading: loading,
    isValidating,
    mutate,
    isEmpty,
  } = useClasses({
    grade: selectedGrade,
    academicYearId: selectedYear?.id,
  });

  const handleLogout = useCallback(async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  }, [locale, router]);

  // Auth check and user data initialization
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    const data = TokenManager.getUserData();
    setUserData({ user: data.user, school: data.school });
  }, [locale, router]);

  // Filter classes by search query (client-side for instant feedback)
  const filteredClasses = useMemo(() => {
    if (!debouncedSearch.trim()) return classes;
    const query = debouncedSearch.toLowerCase();
    return classes.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.section?.toLowerCase().includes(query) ||
      c.homeroomTeacher?.firstNameLatin?.toLowerCase().includes(query) ||
      c.homeroomTeacher?.lastNameLatin?.toLowerCase().includes(query)
    );
  }, [classes, debouncedSearch]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalStudents = classes.reduce((sum, c) => sum + (c._count?.students || 0), 0);
    const gradeDistribution = classes.reduce((acc, c) => {
      const grade = c.grade;
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const avgStudentsPerClass = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;
    return { totalStudents, gradeDistribution, avgStudentsPerClass };
  }, [classes]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? All student assignments will be removed.')) return;

    try {
      await deleteClass(id);
      setActiveDropdown(null);
      mutate(); // Revalidate the cache
    } catch (error: any) {
      alert(error.message);
    }
  }, [mutate]);

  const handleEdit = useCallback((classItem: Class) => {
    setSelectedClass(classItem);
    setShowModal(true);
    setActiveDropdown(null);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedClass(null);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback((refresh?: boolean) => {
    setShowModal(false);
    setSelectedClass(null);
    if (refresh) {
      mutate(); // Revalidate the cache
    }
  }, [mutate]);

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      <div className="lg:ml-64 min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-500">

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-8">
              <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-500 mb-6 font-medium uppercase tracking-widest text-[10px]">
                <Link href={`/${locale}/dashboard`} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-300 transition-colors">
                  <Home className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Link>
                <ChevronRight className="h-3 w-3 text-slate-300 dark:text-gray-700" />
                <span className="text-slate-900 dark:text-white font-black">Classes</span>
              </nav>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/50 dark:border-gray-800/50 shadow-sm group hover:scale-110 transition-transform duration-500">
                    <School className="h-8 w-8 text-stunity-primary-600 dark:text-stunity-primary-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Class Management</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1 font-medium flex items-center gap-2">
                      {selectedYear ? `Academic Year ${selectedYear.name}` : 'Select an academic year'} 
                      {classes.length > 0 && (
                        <>
                          <span className="w-1 h-1 bg-slate-300 dark:bg-gray-700 rounded-full" />
                          <span className="text-stunity-primary-600 dark:text-stunity-primary-400 font-bold uppercase tracking-widest text-[10px]">{classes.length} active classes</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => mutate()}
                    disabled={isValidating}
                    className="flex items-center gap-2 px-5 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50 font-bold text-gray-700 dark:text-gray-300"
                  >
                    <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-500/25 font-black uppercase tracking-widest text-xs"
                  >
                    <Plus className="h-5 w-5" />
                    Add Class
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>          {/* Statistics Cards */}
          {selectedYear && classes.length > 0 && (
            <AnimatedContent animation="slide-up" delay={50}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] p-7 border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all hover:shadow-2xl hover:shadow-blue-500/5 dark:hover:shadow-black/40 group">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                      <School className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Total Classes</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{classes.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] p-7 border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all hover:shadow-2xl hover:shadow-green-500/5 dark:hover:shadow-black/40 group">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                      <Users className="h-7 w-7 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Total Students</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{statistics.totalStudents}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] p-7 border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all hover:shadow-2xl hover:shadow-purple-500/5 dark:hover:shadow-black/40 group">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                      <BarChart3 className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Avg per Class</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{statistics.avgStudentsPerClass}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] p-7 border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all hover:shadow-2xl hover:shadow-amber-500/5 dark:hover:shadow-black/40 group">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">
                      <GraduationCap className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Grade Levels</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{Object.keys(statistics.gradeDistribution).length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedContent>
          )}

          {/* Filters & Search */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none group-focus-within:text-green-500 transition-colors">
                    <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search classes, teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-sm dark:text-white placeholder:text-gray-400"
                  />
                </div>

                {/* Grade Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedGrade(undefined)}
                    className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedGrade === undefined
                        ? 'bg-green-500 text-white shadow-xl shadow-green-500/30'
                        : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border border-transparent dark:border-gray-700/50'
                    }`}
                  >
                    All Grades
                  </button>
                  {[7, 8, 9, 10, 11, 12].map(grade => {
                    const colors = getGradeColor(grade);
                    const count = statistics.gradeDistribution[grade] || 0;
                    return (
                      <button
                        key={grade}
                        onClick={() => setSelectedGrade(grade === selectedGrade ? undefined : grade)}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${
                          selectedGrade === grade
                            ? `${colors.bg} text-white shadow-xl shadow-${colors.bg.split('-')[1]}-500/30`
                            : `${colors.light} dark:bg-${colors.bg.split('-')[1]}-500/10 ${colors.text} dark:text-${colors.bg.split('-')[1]}-400 hover:opacity-80 border border-transparent dark:border-${colors.bg.split('-')[1]}-500/20`
                        }`}
                      >
                        <span>Grade {grade}</span>
                        {count > 0 && (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                            selectedGrade === grade ? 'bg-white/20' : 'bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-700 shadow-sm'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/50 dark:bg-gray-800/30 rounded-2xl border border-gray-200/50 dark:border-gray-700/30">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-[1.125rem] transition-all duration-300 ${
                      viewMode === 'grid' ? 'bg-white dark:bg-gray-950 shadow-md text-stunity-primary-600 dark:text-stunity-primary-400 border border-slate-100 dark:border-gray-800' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-[1.125rem] transition-all duration-300 ${
                      viewMode === 'list' ? 'bg-white dark:bg-gray-950 shadow-md text-stunity-primary-600 dark:text-stunity-primary-400 border border-slate-100 dark:border-gray-800' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Classes Grid/List */}
          <AnimatedContent animation="slide-up" delay={150}>
            <BlurLoader
              isLoading={loading}
              skeleton={
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              }
            >
              {filteredClasses.length === 0 ? (
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800">

                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-10 h-10 text-gray-400" />
                  </div>
                  {!selectedYear ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Academic Year Selected</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Please select an academic year from the dropdown in the navigation bar to view classes
                      </p>
                    </>
                  ) : searchQuery ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Found</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        No classes match your search "{searchQuery}". Try different keywords.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Yet</h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Get started by creating your first class for {selectedYear.name}
                      </p>
                      <button
                        onClick={handleAdd}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-500/25 font-black uppercase tracking-widest text-xs"
                      >
                        <Plus className="h-5 w-5" />
                        Create First Class
                      </button>
                    </>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredClasses.map((cls) => {
                    const colors = getGradeColor(cls.grade);
                    const studentCount = cls._count?.students || 0;
                    const isFull = studentCount >= (cls.capacity || 0);

                    return (
                      <div
                        key={cls.id}
                        className="group bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:shadow-stunity-primary-500/10 dark:hover:shadow-black/40 transition-all duration-500 hover:-translate-y-2"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center text-white shadow-lg shadow-${colors.bg.split('-')[1]}-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                            <GraduationCap className="h-7 w-7" />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(cls)}
                              className="p-3 bg-slate-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-stunity-primary-600 dark:hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cls.id)}
                              className="p-3 bg-slate-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all hover:scale-110 active:scale-95"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{cls.name}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${colors.text} ${colors.light} border-${colors.bg.split('-')[1]}-200/50 dark:border-${colors.bg.split('-')[1]}-800/20`}>
                              Grade {cls.grade}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">
                            <Users className="h-3.5 w-3.5" />
                            <span>{cls.homeroomTeacher?.firstNameLatin} {cls.homeroomTeacher?.lastNameLatin}</span>
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800/50">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400 dark:text-gray-500">Capacity Utilization</span>
                            <span className={isFull ? 'text-rose-500' : 'text-slate-900 dark:text-white'}>
                              {studentCount} / {cls.capacity}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden ring-1 ring-inset ring-black/5 dark:ring-white/5">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)] ${
                                isFull ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-stunity-primary-500 to-emerald-400'
                              }`}
                              style={{ width: `${Math.min((studentCount / (cls.capacity || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 flex items-center gap-3">
                          <button
                            onClick={() => router.push(`/${locale}/classes/${cls.id}/manage`)}
                            className="flex-1 py-3.5 bg-stunity-primary-50 dark:bg-stunity-primary-500/10 text-stunity-primary-700 dark:text-stunity-primary-400 rounded-2xl hover:bg-stunity-primary-100 dark:hover:bg-stunity-primary-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => router.push(`/${locale}/classes/${cls.id}/roster`)}
                            className="flex-1 py-3.5 bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-gray-750 transition-all font-black uppercase tracking-widest text-[10px]"
                          >
                            Roster
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
)
              ) : (
                /* List View */
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-500">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30">
                          <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest underline decoration-stunity-primary-500/30 underline-offset-8">Class Name</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Grade</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Homeroom Teacher</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-72">Capacity</th>
                          <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                        {filteredClasses.map((cls) => {
                          const studentCount = cls._count?.students || 0;
                          const isFull = studentCount >= (cls.capacity || 0);
                          const colors = getGradeColor(cls.grade);
                          return (
                            <tr key={cls.id} className="group hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center text-white shadow-lg shadow-${colors.bg.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-500`}>
                                    <GraduationCap className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <span className="font-black text-slate-900 dark:text-white tracking-tight text-lg">{cls.name}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                                       <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${colors.text} ${colors.light}`}>
                                        Grade {cls.grade}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${colors.text} ${colors.light} border-${colors.bg.split('-')[1]}-200/50 dark:border-${colors.bg.split('-')[1]}-800/30 shadow-sm`}>
                                  Grade {cls.grade}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-400 dark:text-gray-600 font-bold text-xs">
                                    {cls.homeroomTeacher?.firstNameLatin?.[0]}
                                  </div>
                                  <span className="font-bold text-slate-700 dark:text-gray-300 text-sm">{cls.homeroomTeacher?.firstNameLatin} {cls.homeroomTeacher?.lastNameLatin}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="space-y-3">
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400 dark:text-gray-500">Utilization</span>
                                    <span className={isFull ? 'text-rose-500' : 'text-slate-900 dark:text-white'}>
                                      {studentCount} / {cls.capacity}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden ring-1 ring-inset ring-black/5 dark:ring-white/5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 ${
                                        isFull ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-stunity-primary-500 to-emerald-400'
                                      }`}
                                      style={{ width: `${Math.min((studentCount / (cls.capacity || 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEdit(cls)}
                                    className="p-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-stunity-primary-600 dark:hover:text-white rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:scale-110 active:scale-95"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(cls.id)}
                                    className="p-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:scale-110 active:scale-95"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </BlurLoader>
          </AnimatedContent>

          {/* Class Modal */}
          {showModal && (
            <ClassModal
              classItem={selectedClass}
              onClose={handleModalClose}
            />
          )}
        </main>
      </div>
      {/* Click outside to close dropdowns */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </>
  );
}
