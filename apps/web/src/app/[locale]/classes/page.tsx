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
                <span className="text-slate-900 dark:text-white">Classes</span>
              </nav>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700 shadow-sm">
                    <School className="h-6 w-6 text-stunity-primary-600 dark:text-stunity-primary-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Class Management</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1 font-medium">
                      {selectedYear ? `Academic Year ${selectedYear.name}` : 'Select an academic year'} 
                      {classes.length > 0 && ` • ${classes.length} classes`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => mutate()}
                    disabled={isValidating}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''} text-gray-500 dark:text-gray-400`} />
                    <span className="hidden sm:inline text-gray-700 dark:text-gray-300 font-medium">Refresh</span>
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-500/20"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="font-bold">Add Class</span>
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Statistics Cards */}
          {selectedYear && classes.length > 0 && (
            <AnimatedContent animation="slide-up" delay={50}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl dark:hover:shadow-black/20 group">
                  <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                      <School className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{classes.length}</p>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Total Classes</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl dark:hover:shadow-black/20 group">
                  <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-green-50 dark:bg-green-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{statistics.totalStudents}</p>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Total Students</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl dark:hover:shadow-black/20 group">
                  <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-purple-50 dark:bg-purple-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                      <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{statistics.avgStudentsPerClass}</p>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Avg per Class</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl dark:hover:shadow-black/20 group">
                  <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                      <GraduationCap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{Object.keys(statistics.gradeDistribution).length}</p>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Grade Levels</p>
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
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search classes, teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all text-sm dark:text-white"
                  />
                </div>

                {/* Grade Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedGrade(undefined)}
                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                      selectedGrade === undefined
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'
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
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedGrade === grade
                            ? `${colors.bg} text-white shadow-lg shadow-${colors.bg.split('-')[1]}-500/20`
                            : `${colors.light} dark:bg-${colors.bg.split('-')[1]}-500/10 ${colors.text} dark:text-${colors.bg.split('-')[1]}-400 hover:opacity-80`
                        }`}

                      >
                        <span>Grade {grade}</span>
                        {count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                            selectedGrade === grade ? 'bg-white/20' : 'bg-white'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-lg transition-all ${
                      viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-md text-stunity-primary-600 dark:text-stunity-primary-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-lg transition-all ${
                      viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-md text-stunity-primary-600 dark:text-stunity-primary-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/50'
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
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                        Create First Class
                      </button>
                    </>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                (<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClasses.map((classItem) => {
                    const colors = getGradeColor(classItem.grade);
                    const studentCount = classItem._count?.students || 0;
                    const capacityPercent = classItem.capacity ? Math.round((studentCount / classItem.capacity) * 100) : 0;
                    
                    return (
                      <div
                        key={classItem.id}
                        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all duration-500 group"
                      >
                        {/* Header with gradient */}
                        <div className={`p-5 ${colors.bg} relative overflow-hidden`}>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                          
                          <div className="relative z-10 flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-white">{classItem.name}</h3>
                              <p className="text-white/80 text-sm mt-1">
                                Grade {classItem.grade} {classItem.section && `• Section ${classItem.section}`}
                              </p>
                            </div>
                            
                            {/* Actions Dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === classItem.id ? null : classItem.id);
                                }}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                              >
                                <MoreVertical className="h-5 w-5 text-white" />
                              </button>
                              
                              {activeDropdown === classItem.id && (
                                  <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-3 z-20 overflow-hidden">
                                    <button
                                      onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-50 dark:hover:bg-green-500/10 flex items-center gap-3 transition-colors group/item"
                                    >
                                      <div className="p-2 bg-green-50 dark:bg-green-500/20 rounded-lg group-hover/item:scale-110 transition-transform">
                                        <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      </div>
                                      <span className="font-bold text-gray-700 dark:text-gray-300">Manage Students</span>
                                    </button>
                                    <button
                                      onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center gap-3 transition-colors group/item"
                                    >
                                      <div className="p-2 bg-blue-50 dark:bg-blue-500/20 rounded-lg group-hover/item:scale-110 transition-transform">
                                        <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <span className="font-bold text-gray-700 dark:text-gray-300">View Roster</span>
                                    </button>
                                    <button
                                      onClick={() => router.push(`/${locale}/attendance/mark?classId=${classItem.id}`)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-50 dark:hover:bg-purple-500/10 flex items-center gap-3 transition-colors group/item"
                                    >
                                      <div className="p-2 bg-purple-50 dark:bg-purple-500/20 rounded-lg group-hover/item:scale-110 transition-transform">
                                        <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                      </div>
                                      <span className="font-bold text-gray-700 dark:text-gray-300">Mark Attendance</span>
                                    </button>
                                    <button
                                      onClick={() => router.push(`/${locale}/grades/entry?classId=${classItem.id}`)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-3 transition-colors group/item"
                                    >
                                      <div className="p-2 bg-amber-50 dark:bg-amber-500/20 rounded-lg group-hover/item:scale-110 transition-transform">
                                        <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                      </div>
                                      <span className="font-bold text-gray-700 dark:text-gray-300">Enter Grades</span>
                                    </button>
                                    <div className="border-t border-gray-100 dark:border-gray-800 my-2" />
                                    <button
                                      onClick={() => handleEdit(classItem)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors group/item"
                                    >
                                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover/item:scale-110 transition-transform">
                                        <Edit className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                      </div>
                                      <span className="font-bold text-gray-700 dark:text-gray-300">Edit Class</span>
                                    </button>
                                    <button
                                      onClick={() => handleDelete(classItem.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors group/item"
                                    >
                                      <div className="p-2 bg-red-50 dark:bg-red-500/20 rounded-lg group-hover/item:scale-110 transition-transform">
                                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                      </div>
                                      <span className="font-bold text-red-600 dark:text-red-400">Delete Class</span>
                                    </button>
                                  </div>

                              )}
                            </div>
                          </div>
                          
                          {/* Student count badge */}
                          <div className="mt-4 flex items-center gap-2">
                            <Users className="h-4 w-4 text-white/80" />
                            <span className="text-white font-semibold">{studentCount}</span>
                            <span className="text-white/80 text-sm">students</span>
                            {classItem.capacity && (
                              <span className="text-white/60 text-sm ml-auto">/ {classItem.capacity} capacity</span>
                            )}
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-5">
                          {/* Capacity Progress */}
                          {classItem.capacity && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-500">Capacity</span>
                                <span className={`font-medium ${
                                  capacityPercent >= 100 ? 'text-red-600' : capacityPercent >= 80 ? 'text-amber-600' : 'text-green-600'
                                }`}>{capacityPercent}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    capacityPercent >= 100 ? 'bg-red-500' : capacityPercent >= 80 ? 'bg-amber-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Class Info */}
                          <div className="space-y-4">
                            {classItem.track && (
                              <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <GraduationCap className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </div>
                                <span className="text-gray-600 dark:text-gray-400 font-bold">{classItem.track} Track</span>
                              </div>
                            )}
                            {classItem.room && (
                              <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <School className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </div>
                                <span className="text-gray-600 dark:text-gray-400 font-bold">Room {classItem.room}</span>
                              </div>
                            )}
                            {classItem.homeroomTeacher && (
                              <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-900 dark:text-white font-bold leading-none">
                                    {classItem.homeroomTeacher.firstNameLatin} {classItem.homeroomTeacher.lastNameLatin}
                                  </span>
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mt-1">Homeroom Teacher</span>
                                </div>
                              </div>
                            )}
                          </div>


                          {/* Quick Actions */}
                          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <button
                               onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                               className="flex-1 py-3 text-[11px] uppercase tracking-wider font-black bg-stunity-primary-50 dark:bg-stunity-primary-500/10 text-stunity-primary-700 dark:text-stunity-primary-400 rounded-2xl hover:bg-stunity-primary-100 dark:hover:bg-stunity-primary-500/20 transition-all flex items-center justify-center gap-2"
                             >
                               <UserPlus className="h-3.5 w-3.5" />
                               Manage
                             </button>
                             <button
                               onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                               className="flex-1 py-3 text-[11px] uppercase tracking-wider font-black bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                             >
                               <Eye className="h-3.5 w-3.5" />
                               Roster
                             </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>)
              ) : (
                /* List View */
                             <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left py-4 px-6 font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">Class</th>
                          <th className="text-left py-4 px-4 font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">Grade</th>
                          <th className="text-left py-4 px-4 font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">Section</th>
                          <th className="text-left py-4 px-4 font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">Students</th>
                          <th className="text-left py-4 px-4 font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">Homeroom Teacher</th>
                          <th className="text-left py-4 px-4 font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">Room</th>
                          <th className="text-right py-4 px-6 font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {filteredClasses.map((classItem) => {
                          const colors = getGradeColor(classItem.grade);
                          return (
                            <tr key={classItem.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shadow-lg shadow-${colors.bg.split('-')[1]}-500/20`}>
                                    <span className="text-white font-black text-sm">{classItem.grade}</span>
                                  </div>
                                  <span className="font-bold text-gray-900 dark:text-white">{classItem.name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.light} dark:bg-${colors.bg.split('-')[1]}-500/10 ${colors.text} dark:text-${colors.bg.split('-')[1]}-400`}>
                                  Grade {classItem.grade}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-gray-600 dark:text-gray-400 font-medium">{classItem.section || '—'}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                  <span className="font-bold dark:text-white">{classItem._count?.students || 0}</span>
                                  {classItem.capacity && (
                                    <span className="text-gray-400 dark:text-gray-600">/ {classItem.capacity}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-gray-600 dark:text-gray-400 font-medium">
                                {classItem.homeroomTeacher 
                                  ? `${classItem.homeroomTeacher.firstNameLatin} ${classItem.homeroomTeacher.lastNameLatin}`
                                  : '—'}
                              </td>
                              <td className="py-4 px-4 text-gray-600 dark:text-gray-400 font-medium">{classItem.room || '—'}</td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                                    className="p-2 hover:bg-green-100 dark:hover:bg-green-500/10 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                                    title="Manage Students"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                                    className="p-2 hover:bg-blue-100 dark:hover:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                    title="View Roster"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(classItem)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(classItem.id)}
                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                    title="Delete"
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
