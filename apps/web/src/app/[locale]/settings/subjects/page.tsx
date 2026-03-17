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

      <div className="lg:ml-64 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
        <main className="max-w-7xl mx-auto p-4 lg:p-12">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-8">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 mb-6">
                <div className="flex items-center gap-2 hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors">
                  <Home className="h-3.5 w-3.5" />
                  <span>Stunity</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-700" />
                <span className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors">Settings</span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-700" />
                <span className="text-slate-900 dark:text-white underline decoration-orange-500/30 underline-offset-4">Subjects Registry</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-orange-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative p-4 bg-white dark:bg-gray-900 border border-orange-100 dark:border-orange-500/20 rounded-2xl shadow-sm">
                      <BookOpen className="h-8 w-8 text-orange-600 dark:text-orange-500" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                      Subject <span className="bg-gradient-to-r from-orange-600 to-yellow-500 bg-clip-text text-transparent">Management</span>
                    </h1>
                    <div className="flex items-center gap-3">
                      <p className="text-slate-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">
                        Curriculum & Academic Blueprint
                      </p>
                      <div className="w-1.5 h-1.5 bg-orange-500/30 rounded-full" />
                      <span className="text-orange-600 dark:text-orange-500 font-black text-xs uppercase tracking-[0.2em]">
                        {statistics?.total || 0} Registered Modules
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { mutate(); mutateStats(); }}
                    disabled={isValidating}
                    className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh Data</span>
                  </button>
                  <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-orange-500/20"
                  >
                    <Plus className="h-5 w-5" />
                    New Subject
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Statistics Cards */}
          {statistics && (
            <AnimatedContent animation="slide-up" delay={25}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 group hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                      <BookOpen className="w-7 h-7 text-orange-600 dark:text-orange-500" />
                    </div>
                    <div className="flex flex-col items-end">
                      <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">+2.4%</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Total Subjects</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{statistics.total}</p>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                      <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Active Modules</p>
                  <p className="text-4xl font-black text-emerald-600 dark:text-emerald-500 tracking-tight leading-none">{statistics.active}</p>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 group hover:shadow-2xl hover:shadow-gray-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                      <XCircle className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Retired / Draft</p>
                  <p className="text-4xl font-black text-slate-400 dark:text-gray-400 tracking-tight leading-none">{statistics.inactive}</p>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 group hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                      <Layers className="w-7 h-7 text-purple-600 dark:text-purple-500" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Disciplines</p>
                  <p className="text-4xl font-black text-purple-600 dark:text-purple-500 tracking-tight leading-none">{statistics.byCategory.length}</p>
                </div>
              </div>
            </AnimatedContent>
          )}

          {/* Search and Filters */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 mb-12">
              <div className="flex flex-col xl:flex-row gap-8">
                {/* Search */}
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search curriculum by name, code, or description..."
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 text-sm"
                  />
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                    <kbd className="hidden sm:inline-flex items-center h-6 px-2 font-mono text-[10px] font-black text-slate-400 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg uppercase tracking-tighter shadow-sm">
                      CMD + K
                    </kbd>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Grade Filter */}
                  <div className="relative group/select">
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="pl-6 pr-12 py-5 bg-white dark:bg-gray-950 border border-slate-100 dark:border-gray-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black text-[10px] uppercase tracking-widest transition-all appearance-none cursor-pointer min-w-[180px] shadow-sm"
                    >
                      <option value="">All Academic Levels</option>
                      {getUniqueGrades().map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none group-hover/select:translate-y-0.5 transition-transform">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="relative group/select">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="pl-6 pr-12 py-5 bg-white dark:bg-gray-950 border border-slate-100 dark:border-gray-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black text-[10px] uppercase tracking-widest transition-all appearance-none cursor-pointer min-w-[200px] shadow-sm"
                    >
                      <option value="">All Disciplines</option>
                      {getUniqueCategories().map((category) => (
                        <option key={category} value={category}>
                          {category} ({getCategoryCount(category)})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none group-hover/select:translate-y-0.5 transition-transform">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-gray-800/50 p-1.5 rounded-[1.5rem] border border-slate-100 dark:border-gray-700 shadow-inner">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-3 rounded-xl transition-all duration-500 ${
                        viewMode === 'grid' 
                          ? 'bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-500 shadow-lg scale-110' 
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'
                      }`}
                    >
                      <Grid3x3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-3 rounded-xl transition-all duration-500 ${
                        viewMode === 'list' 
                          ? 'bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-500 shadow-lg scale-110' 
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
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
        <AnimatedContent animation="slide-up" delay={100}>
          <BlurLoader isLoading={loading} showSpinner={false}>
            {filteredSubjects.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-800 p-20 text-center animate-in zoom-in-95 duration-700">
                <div className="relative mb-8 inline-block">
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 blur-2xl rounded-full opacity-50" />
                  <div className="relative p-8 bg-gray-50 dark:bg-gray-800 rounded-full">
                    <BookOpen className="w-20 h-20 text-gray-300 dark:text-gray-700" />
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
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/20"
                  >
                    <Plus className="w-6 h-6" />
                    Initialize Subject
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={`group relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 ${
                      subject.isActive 
                        ? 'border-slate-100 dark:border-gray-800' 
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
                        <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-[1.5rem] group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-yellow-500 group-hover:rotate-6 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-orange-500/20">
                          <BookOpen className="w-7 h-7 text-orange-600 dark:text-orange-500 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-[0.2em] block mb-1">
                            {subject.category}
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate max-w-[180px] tracking-tight group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors leading-none">
                            {subject.nameKh || subject.name}
                          </h3>
                        </div>
                      </div>

                      {/* Subtitle */}
                      <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mb-8 line-clamp-1 border-l-2 border-orange-500/30 pl-4">{subject.nameEn || subject.name}</p>
                      
                      {/* Detailed Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-slate-50/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <Target className="w-3 h-3 text-orange-500" />
                            Code
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{subject.code}</p>
                        </div>

                        <div className="p-4 bg-slate-50/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <GraduationCap className="w-3 h-3 text-orange-500" />
                            Level
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{subject.grade}</p>
                        </div>

                        <div className="p-4 bg-slate-50/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <Clock className="w-3 h-3 text-orange-500" />
                            Weekly
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{subject.weeklyHours}h <span className="text-[9px] text-slate-400">/ week</span></p>
                        </div>

                        <div className="p-4 bg-slate-50/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700/50 group-hover:border-orange-500/20 transition-colors">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                            <Award className="w-3 h-3 text-orange-500" />
                            Factor
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white underline decoration-orange-500/30">x{subject.coefficient}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 p-1.5 bg-slate-50 dark:bg-gray-800/50 rounded-[1.8rem] border border-slate-100 dark:border-gray-700 transition-all">
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
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 overflow-hidden hover:shadow-2xl transition-all duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-gray-800/30 border-b border-slate-100 dark:border-gray-800">
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
                    <tr key={subject.id} className="group hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-all duration-300">
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
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
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
                className="p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
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
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${formData.isActive ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 bg-gray-50/50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
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
          <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
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
                className="p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
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
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${formData.isActive ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 bg-gray-50/50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
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
                  className="w-full px-8 py-5 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-sm hover:text-gray-900 dark:hover:text-white transition-all"
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
