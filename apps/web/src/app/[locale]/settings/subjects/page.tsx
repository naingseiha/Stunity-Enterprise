'use client';

import { useEffect, useState, useMemo, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { subjectAPI, Subject, SubjectStatistics } from '@/lib/api/subjects';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useSubjects, useSubjectStatistics } from '@/hooks/useSubjects';
import { useDebounce } from '@/hooks/useDebounce';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Edit,
  Trash2,
  Users,
  Clock,
  Target,
  TrendingUp,
  X,
  CheckCircle,
  XCircle,
  Layers,
  Award,
  Calendar,
  Hash,
  Home,
  ChevronRight,
  Settings,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export default function SubjectsManagementPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;

  // View & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nameKh: '',
    nameEn: '',
    code: '',
    description: '',
    grade: '',
    track: '',
    category: '',
    weeklyHours: '',
    annualHours: '',
    maxScore: '',
    coefficient: '',
    isActive: true,
  });

  // User data
  const [userData, setUserData] = useState<any>(null);

  // Use SWR hooks for data fetching
  const { 
    subjects, 
    isLoading: loading, 
    isValidating,
    mutate,
    error
  } = useSubjects({
    grade: filterGrade || undefined,
    category: filterCategory || undefined,
    isActive: filterStatus === 'all' ? undefined : filterStatus === 'active',
    includeTeachers: true,
  });

  const { statistics, mutate: mutateStats } = useSubjectStatistics();

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    const user = TokenManager.getUserData();
    
    if (!token || !user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    
    setUserData(user);
  }, [locale, router]);

  // Filter subjects by search (client-side for instant feedback)
  const filteredSubjects = useMemo(() => {
    let filtered = [...subjects];

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.nameKh?.toLowerCase().includes(query) ||
          s.nameEn?.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [subjects, debouncedSearch]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      nameKh: '',
      nameEn: '',
      code: '',
      description: '',
      grade: '',
      track: '',
      category: '',
      weeklyHours: '',
      annualHours: '',
      maxScore: '',
      coefficient: '',
      isActive: true,
    });
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const handleEdit = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      nameKh: subject.nameKh || '',
      nameEn: subject.nameEn || '',
      code: subject.code,
      description: subject.description || '',
      grade: subject.grade,
      track: subject.track || '',
      category: subject.category,
      weeklyHours: subject.weeklyHours.toString(),
      annualHours: subject.annualHours.toString(),
      maxScore: subject.maxScore.toString(),
      coefficient: subject.coefficient.toString(),
      isActive: subject.isActive,
    });
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  }, []);

  const handleSubmitCreate = async () => {
    try {
      if (!formData.name || !formData.code || !formData.grade || !formData.category) {
        return;
      }

      await subjectAPI.createSubject({
        name: formData.name,
        nameKh: formData.nameKh,
        nameEn: formData.nameEn,
        code: formData.code,
        description: formData.description,
        grade: formData.grade,
        track: formData.track || undefined,
        category: formData.category,
        weeklyHours: parseFloat(formData.weeklyHours) || 0,
        annualHours: parseFloat(formData.annualHours) || 0,
        maxScore: parseFloat(formData.maxScore) || 100,
        coefficient: parseFloat(formData.coefficient) || 1,
        isActive: formData.isActive,
      });

      setShowCreateModal(false);
      resetForm();
      mutate(); // Revalidate subjects
      mutateStats(); // Revalidate statistics
    } catch (err: any) {
      console.error('Failed to create subject:', err.message);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedSubject) return;

    try {
      await subjectAPI.updateSubject(selectedSubject.id, {
        name: formData.name,
        nameKh: formData.nameKh,
        nameEn: formData.nameEn,
        code: formData.code,
        description: formData.description,
        grade: formData.grade,
        track: formData.track || undefined,
        category: formData.category,
        weeklyHours: parseFloat(formData.weeklyHours),
        annualHours: parseFloat(formData.annualHours),
        maxScore: parseFloat(formData.maxScore),
        coefficient: parseFloat(formData.coefficient),
        isActive: formData.isActive,
      });

      setShowEditModal(false);
      setSelectedSubject(null);
      resetForm();
      mutate(); // Revalidate subjects
      mutateStats(); // Revalidate statistics
    } catch (err: any) {
      console.error('Failed to update subject:', err.message);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedSubject) return;

    try {
      await subjectAPI.deleteSubject(selectedSubject.id);
      setShowDeleteModal(false);
      setSelectedSubject(null);
      mutate(); // Revalidate subjects
      mutateStats(); // Revalidate statistics
    } catch (err: any) {
      console.error('Failed to delete subject:', err.message);
    }
  };

  const handleToggleStatus = async (subject: Subject) => {
    try {
      await subjectAPI.toggleStatus(subject.id);
      mutate(); // Revalidate subjects
      mutateStats(); // Revalidate statistics
    } catch (err: any) {
      console.error('Failed to toggle status:', err.message);
    }
  };

  const getUniqueGrades = useCallback(() => {
    const grades = [...new Set(subjects.map((s) => s.grade))];
    return grades.sort();
  }, [subjects]);

  const getUniqueCategories = useCallback(() => {
    const categories = [...new Set(subjects.map((s) => s.category))];
    return categories.sort();
  }, [subjects]);

  const getCategoryCount = useCallback((category: string) => {
    return statistics?.byCategory.find((c) => c.category === category)?._count || 0;
  }, [statistics]);

  const handleLogout = useCallback(async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  }, [locale, router]);

  if (loading && subjects.length === 0) {
    return <PageSkeleton user={userData?.user} school={userData?.school} type="cards" />;
  }

  return (
    <>
      <UnifiedNavigation user={userData?.user} school={userData?.school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800/50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-orange-50/90 via-white/40 to-transparent dark:from-orange-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/10" />
        <div className="pointer-events-none absolute right-0 top-12 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/10" />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-12">
              <div className="relative overflow-hidden rounded-[1.65rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(255,247,237,0.96)_48%,rgba(255,237,213,0.92))] p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)] ring-1 ring-slate-100/50 backdrop-blur-xl dark:border-gray-800/70 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))] dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-8 sm:p-7">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-orange-100/50 to-transparent blur-3xl dark:from-orange-500/10" />
                <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.1),transparent_58%)]" />
                <div className="relative z-10">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">
                        <Settings className="h-3.5 w-3.5" />
                        Curriculum Settings
                      </div>
                      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-[2.2rem]">
                        Subjects Registry
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-gray-400 sm:text-[15px]">
                        Organize and manage your school's curriculum in one central workspace.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <button
                        onClick={() => { mutate(); mutateStats(); }}
                        disabled={isValidating}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                      >
                        <Plus className="h-4 w-4" />
                        New Subject
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                      {statistics?.total || 0} registered subjects
                    </span>
                    <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                      Academic blueprint
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                      Settings workspace
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.65rem] border border-orange-200/80 bg-gradient-to-br from-white via-orange-50/80 to-amber-100/90 p-6 text-slate-900 shadow-[0_8px_32px_-8px_rgba(249,115,22,0.15)] ring-1 ring-orange-200/50 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-400/20 blur-3xl dark:bg-orange-500/20" />
                <div className="pointer-events-none absolute -bottom-12 left-0 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-500/20" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Registry Status</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{statistics?.total || 0}</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">subjects</span>
                      </div>
                    </div>

                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/60 dark:border-white/10 dark:bg-gray-900/10 dark:ring-white/10">
                      <BookOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-orange-200/50 dark:bg-gray-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max((statistics?.total || 0) * 8, statistics?.total ? 12 : 0))}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/50 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{statistics?.active || 0}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Active</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/50 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{statistics?.inactive || 0}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Draft</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/50 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{statistics?.byCategory.length || 0}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Tracks</p>
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center rounded-full border border-orange-200/80 bg-white dark:bg-gray-900/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-gray-900/5 dark:text-slate-300">
                    Curriculum system ready
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          {/* Statistics Cards */}
          {statistics && (
            <AnimatedContent animation="slide-up" delay={25}>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/70 to-blue-50/30 p-5 shadow-xl shadow-slate-200/30 ring-1 ring-slate-100/70 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70">
                  <div className="flex items-center justify-between mb-4">
                    <div className="rounded-[0.95rem] bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.26em] mb-1">Total Subjects</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{statistics.total}</p>
                </div>

                <div className="rounded-[1.2rem] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/75 p-5 shadow-xl shadow-emerald-100/30 ring-1 ring-emerald-100/70 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70">
                  <div className="flex items-center justify-between mb-4">
                    <div className="rounded-[0.95rem] bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.26em] mb-1">Active Modules</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-300 tracking-tight leading-none">{statistics.active}</p>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 p-5 shadow-xl shadow-slate-200/30 ring-1 ring-slate-100/80 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70">
                  <div className="flex items-center justify-between mb-4">
                    <div className="rounded-[0.95rem] bg-slate-100 dark:bg-gray-800 p-3 text-slate-500 dark:bg-slate-50 dark:bg-gray-800/95 dark:text-slate-300">
                      <XCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.26em] mb-1">Retired / Draft</p>
                  <p className="text-3xl font-black text-slate-500 dark:text-slate-300 tracking-tight leading-none">{statistics.inactive}</p>
                </div>

                <div className="rounded-[1.2rem] border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/70 to-slate-50/75 p-5 shadow-xl shadow-indigo-100/30 ring-1 ring-indigo-100/70 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70">
                  <div className="flex items-center justify-between mb-4">
                    <div className="rounded-[0.95rem] bg-amber-100 p-3 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                      <Layers className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.26em] mb-1">Disciplines</p>
                  <p className="text-3xl font-black text-amber-600 dark:text-amber-300 tracking-tight leading-none">{statistics.byCategory.length}</p>
                </div>
              </div>
            </AnimatedContent>
          )}

          {/* Search and Filters */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="mt-5 rounded-[1.35rem] border border-white/70 bg-white dark:bg-gray-900/80 px-4 py-3 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
              <div className="flex flex-nowrap items-stretch gap-3 overflow-x-auto">
                {/* Search */}
                <div className="flex-1 min-w-[160px] relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search curriculum by name, code, or description..."
                    className="h-[44px] w-full rounded-[0.85rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 pl-11 pr-16 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:bg-white dark:bg-gray-900 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <kbd className="hidden sm:inline-flex items-center rounded-md border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-tighter text-slate-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
                      Search
                    </kbd>
                  </div>
                </div>

                {/* Grade Filter */}
                <div className="relative flex-shrink-0">
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="h-[44px] w-[220px] appearance-none rounded-[0.85rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 pl-4 pr-9 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-orange-300 focus:bg-white dark:bg-gray-900 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">All Academic Levels</option>
                    {getUniqueGrades().map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="relative flex-shrink-0">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="h-[44px] w-[190px] appearance-none rounded-[0.85rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 pl-4 pr-9 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-orange-300 focus:bg-white dark:bg-gray-900 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">All Disciplines</option>
                    {getUniqueCategories().map((category) => (
                      <option key={category} value={category}>
                        {category} ({getCategoryCount(category)})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-slate-200/70 dark:bg-gray-800 self-stretch flex-shrink-0" />

                {/* View Toggle */}
                <div className="flex items-center gap-1 rounded-[0.85rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-1 dark:border-gray-800/70 dark:bg-gray-950 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-[0.65rem] transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-900 text-orange-600 shadow-sm dark:bg-gray-900 dark:text-orange-300'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-[0.65rem] transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-900 text-orange-600 shadow-sm dark:bg-gray-900 dark:text-orange-300'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-6 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-3xl flex items-center justify-between shadow-sm animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-500" />
              </div>
              <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                {typeof error === 'string' ? error : error.message}
              </p>
            </div>
            <button 
              onClick={() => mutate()} 
              className="p-3 bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Subjects Grid/List */}
        <AnimatedContent animation="slide-up" delay={100} className="mt-5">
          <BlurLoader isLoading={loading} showSpinner={false}>
            {filteredSubjects.length === 0 ? (
              <div className="rounded-[1.35rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/90 p-16 text-center shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 animate-in zoom-in-95 duration-700 dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
                <div className="relative mb-8 inline-block">
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 blur-2xl rounded-full opacity-50" />
                  <div className="relative p-8 bg-gray-50 dark:bg-gray-800 rounded-full">
                    <BookOpen className="w-20 h-20 text-gray-300 dark:text-gray-700 dark:text-gray-200" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Registry is Empty</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto mb-10 leading-relaxed">
                  {searchQuery || filterGrade || filterCategory || filterStatus !== 'all'
                    ? "We couldn't find any modules matching your current configuration. Try broadening your search or resetting filters."
                    : "Your academic blueprint is currently blank. Start building your school's curriculum by adding your first subject."}
                </p>
                {!searchQuery && !filterGrade && !filterCategory && filterStatus === 'all' && (
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-3 rounded-[0.95rem] bg-gradient-to-r from-orange-500 to-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                  >
                    <Plus className="w-6 h-6" />
                    Initialize Subject
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={`group relative rounded-[1.25rem] border bg-white dark:bg-gray-900/90 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900/80 dark:shadow-black/10 ${
                      subject.isActive 
                        ? 'border-slate-200 dark:border-gray-800/70 dark:border-gray-800/70' 
                        : 'border-slate-200 dark:border-gray-800 opacity-60 grayscale'
                    }`}
                  >
                    <div className="p-8">
                      {/* Status Badge */}
                      <div className="absolute top-8 right-8">
                        {subject.isActive ? (
                          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest leading-none">Live</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-full">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Draft</span>
                          </div>
                        )}
                      </div>

                      {/* Icon & Category */}
                      <div className="flex items-center gap-5 mb-8">
                        <div className="rounded-[1rem] bg-orange-50 p-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-orange-600 group-hover:shadow-lg group-hover:shadow-orange-500/30 dark:bg-orange-500/10 dark:group-hover:bg-orange-500">
                          <BookOpen className="w-7 h-7 text-orange-600 transition-colors group-hover:text-white dark:text-orange-500 dark:group-hover:text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-[0.2em] block mb-1">
                            {subject.category}
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
                            {subject.nameKh || subject.name}
                          </h3>
                        </div>
                      </div>

                      {/* Subtitle */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-8 truncate pl-4 border-l-2 border-orange-500/20">{subject.nameEn || subject.name}</p>
                      
                      {/* Detailed Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 dark:bg-gray-800/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <Target className="w-3 h-3 text-orange-500" />
                            Code
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{subject.code}</p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-gray-800/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <GraduationCap className="w-3 h-3 text-orange-500" />
                            Level
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{subject.grade}</p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-gray-800/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <Clock className="w-3 h-3 text-orange-500" />
                            Weekly
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{subject.weeklyHours}h <span className="text-[9px] text-slate-400">/ week</span></p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-gray-800/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <Award className="w-3 h-3 text-orange-500" />
                            Factor
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white underline decoration-orange-500/30">x{subject.coefficient}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-1.5 transition-all dark:border-gray-800/70 dark:bg-gray-950/70">
                        <button
                          onClick={() => handleToggleStatus(subject)}
                          className={`flex-1 px-4 py-3.5 rounded-[1.2rem] font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 shadow-sm ${
                            subject.isActive
                              ? 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-500 border border-slate-100 dark:border-gray-700'
                              : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:scale-105'
                          }`}
                        >
                          {subject.isActive ? 'Suspend' : 'Resume'}
                        </button>
                        <button
                          onClick={() => handleEdit(subject)}
                          className="p-3.5 bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-gray-700 rounded-[1.2rem] hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(subject)}
                          className="p-3.5 bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-500 border border-slate-100 dark:border-gray-700 rounded-[1.2rem] hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/90 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 transition-all dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-800/50 dark:bg-gray-800/30 border-b border-slate-100 dark:border-gray-800">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Academic Subject</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">ID Code</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Curriculum Level</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Discipline</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Load</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/50">
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="group hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800/30 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all">
                            <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white tracking-tight text-lg leading-none mb-1">{subject.nameKh || subject.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">{subject.nameEn || subject.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1.5 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 text-slate-900 dark:text-white font-mono text-xs font-black rounded-lg">
                          {subject.code}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100/50 dark:border-blue-500/20">
                            {subject.grade}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-4 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-purple-100/50 dark:border-purple-500/20">
                          {subject.category}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                         <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                           <Clock className="w-4 h-4 text-orange-500" />
                           {subject.weeklyHours}h
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/wk</span>
                         </div>
                      </td>
                      <td className="px-6 py-6">
                        {subject.isActive ? (
                          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            Live
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            Draft
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
                          <button
                            onClick={() => handleToggleStatus(subject)}
                            className="p-3 bg-white dark:bg-gray-800 text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 transition-all hover:scale-110 active:scale-95"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(subject)}
                            className="p-3 bg-white dark:bg-gray-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 transition-all hover:scale-110 active:scale-95"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(subject)}
                            className="p-3 bg-white dark:bg-gray-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 transition-all hover:scale-110 active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            )}
          </BlurLoader>
        </AnimatedContent>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Initialize Module</h2>
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">New Academic Subject</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-3 text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
              {/* Names Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                    Multilingual Identification
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Platform Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Mathematics"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Local Label (Khmer)
                    </label>
                    <input
                      type="text"
                      value={formData.nameKh}
                      onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                      placeholder="គណិតវិទ្យា"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      International Label (English)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Mathematics"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </section>

              {/* Basic Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                    Module Classification
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      System Code <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="MATH101"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black font-mono transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Academic Level <span className="text-orange-500">*</span>
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                    >
                      <option value="">Select Grade</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Subject Category <span className="text-orange-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                    >
                      <option value="">Select Category</option>
                      <option value="Core">Core</option>
                      <option value="Science">Science</option>
                      <option value="Language">Language</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Arts">Arts</option>
                      <option value="Physical Education">Physical Education</option>
                      <option value="Technology">Technology</option>
                      <option value="Elective">Elective</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Academic Track (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.track}
                      onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                      placeholder="e.g. Science, Literature"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Extended Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide a brief summary of the module curriculum..."
                    rows={4}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400 resize-none"
                  />
                </div>
              </section>

              {/* Academic Details */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                    Performance Metrics
                  </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Weekly Load (h)
                    </label>
                    <input
                      type="number"
                      value={formData.weeklyHours}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                      placeholder="3"
                      min="0"
                      step="0.5"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Annual Total (h)
                    </label>
                    <input
                      type="number"
                      value={formData.annualHours}
                      onChange={(e) => setFormData({ ...formData, annualHours: e.target.value })}
                      placeholder="120"
                      min="0"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Maximum Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      placeholder="100"
                      min="0"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Coefficient
                    </label>
                    <input
                      type="number"
                      value={formData.coefficient}
                      onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                      placeholder="1.0"
                      min="0"
                      step="0.1"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* Status Toggle */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900/80 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl transition-all ${formData.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gray-200 dark:bg-gray-800'}`}>
                    <CheckCircle className={`w-5 h-5 ${formData.isActive ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Active Status</h4>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Available in academic registry</p>
                  </div>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-14 h-8 rounded-full transition-all duration-300 ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white dark:bg-gray-900 rounded-full shadow-md transform transition-transform duration-300 ${formData.isActive ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 bg-gray-50 dark:bg-none dark:bg-gray-800/50 dark:bg-none dark:bg-gray-900/50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-8 py-4 bg-white dark:bg-none dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-none dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-all active:scale-95"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSubmitCreate}
                className="px-10 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/20 transition-all"
              >
                Register Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-none dark:bg-gray-950 rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-none dark:bg-gray-800/50 dark:bg-none dark:bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20">
                  <Edit className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Modify Registry</h2>
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Update Module Parameters</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-3 text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:bg-none dark:bg-gray-800 dark:hover:bg-gray-800 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
              {/* Names Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                    Multilingual Identification
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Platform Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Mathematics"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Local Label (Khmer)
                    </label>
                    <input
                      type="text"
                      value={formData.nameKh}
                      onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                      placeholder="គណិតវិទ្យា"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      International Label (English)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Mathematics"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </section>

              {/* Basic Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                    Module Classification
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      System Code <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="MATH101"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black font-mono transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Academic Level <span className="text-orange-500">*</span>
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                    >
                      <option value="">Select Grade</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Subject Category <span className="text-orange-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                    >
                      <option value="">Select Category</option>
                      <option value="Core">Core</option>
                      <option value="Science">Science</option>
                      <option value="Language">Language</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Arts">Arts</option>
                      <option value="Physical Education">Physical Education</option>
                      <option value="Technology">Technology</option>
                      <option value="Elective">Elective</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Academic Track (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.track}
                      onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                      placeholder="e.g. Science, Literature"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Extended Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide a brief summary of the module curriculum..."
                    rows={4}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400 resize-none"
                  />
                </div>
              </section>

              {/* Academic Details */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                    Performance Metrics
                  </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Weekly Load (h)
                    </label>
                    <input
                      type="number"
                      value={formData.weeklyHours}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                      placeholder="3"
                      min="0"
                      step="0.5"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Annual Total (h)
                    </label>
                    <input
                      type="number"
                      value={formData.annualHours}
                      onChange={(e) => setFormData({ ...formData, annualHours: e.target.value })}
                      placeholder="120"
                      min="0"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Maximum Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      placeholder="100"
                      min="0"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Coefficient
                    </label>
                    <input
                      type="number"
                      value={formData.coefficient}
                      onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                      placeholder="1.0"
                      min="0"
                      step="0.1"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* Status Toggle */}
              <div className="p-6 bg-gray-50 dark:bg-none dark:bg-gray-900/80 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl transition-all ${formData.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gray-200 dark:bg-gray-800'}`}>
                    <CheckCircle className={`w-5 h-5 ${formData.isActive ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Active Status</h4>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Available in academic registry</p>
                  </div>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-14 h-8 rounded-full transition-all duration-300 ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white dark:bg-gray-900 rounded-full shadow-md transform transition-transform duration-300 ${formData.isActive ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 bg-gray-50 dark:bg-gray-800/50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-all active:scale-95"
              >
                Cancel modification
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20 transition-all"
              >
                Finalize Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-300">
          <div className="bg-white dark:bg-gray-950 rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative group">
                <div className="absolute inset-0 bg-rose-500 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
                <Trash2 className="w-10 h-10 text-rose-500 relative transition-transform group-hover:scale-110" />
              </div>
              
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Retire Module?</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 leading-relaxed">
                You are about to remove <span className="text-gray-900 dark:text-white font-black">{selectedSubject.nameKh || selectedSubject.name}</span> from the active curriculum registry.
                <br /><br />
                <span className="text-rose-500 font-bold uppercase tracking-widest text-[10px]">Warning: This action is irreversible.</span>
              </p>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSubmitDelete}
                  className="w-full px-8 py-5 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-rose-600 active:scale-95 shadow-xl shadow-rose-500/20 transition-all"
                >
                  Confirm Deletion
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full px-8 py-5 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-sm hover:text-gray-900 dark:text-white dark:hover:text-white transition-all"
                >
                  Keep Subject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>
    </>
  );
}
