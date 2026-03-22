'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import {
  archiveAcademicYear,
  copySettings,
  createAcademicYear,
  deleteAcademicYear,
  getCopyPreview,
  setCurrentAcademicYear,
  type AcademicYear,
  updateAcademicYear,
} from '@/lib/api/academic-years';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import {
  prefetchAcademicYearComparison,
  prefetchSetupTemplates,
} from '@/hooks/useAcademicYearResources';
import {
  Calendar,
  Plus,
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  Archive,
  Settings,
  Copy,
  Play,
  AlertCircle,
  ChevronRight,
  GraduationCap,
  Edit,
  Trash2,
  Star,
  X,
  Loader2,
  Sparkles,
  BarChart3,
} from 'lucide-react';

export default function AcademicYearsManagementPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;
  const { refreshYears } = useAcademicYear();
  const { years, isLoading: isLoadingYears, mutate: mutateYears } = useAcademicYearsList(school?.id);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  };

  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);

  // Create form
  const [newYearName, setNewYearName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [copyFromYearId, setCopyFromYearId] = useState('');

  // Edit form
  const [editYearName, setEditYearName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Copy Settings Modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState<AcademicYear | null>(null);
  const [copyTargetYearId, setCopyTargetYearId] = useState('');
  const [copyPreviewData, setCopyPreviewData] = useState<any>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copySubjects, setCopySubjects] = useState(true);
  const [copyTeachers, setCopyTeachers] = useState(true);
  const [copyClasses, setCopyClasses] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const loading = Boolean(school?.id) && isLoadingYears && years.length === 0;

  const refreshAcademicYearsData = async () => {
    await Promise.allSettled([mutateYears(), refreshYears()]);
  };

  const handleCreateYear = async () => {
    if (!newYearName || !newStartDate || !newEndDate) {
      setError('Please fill all fields');
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      await createAcademicYear(
        schoolId,
        {
          name: newYearName,
          startDate: new Date(newStartDate).toISOString(),
          endDate: new Date(newEndDate).toISOString(),
          copiedFromYearId: copyFromYearId || undefined,
        },
        token
      );

      setError('');
      setShowCreateModal(false);
      setNewYearName('');
      setNewStartDate('');
      setNewEndDate('');
      setCopyFromYearId('');
      await refreshAcademicYearsData();
    } catch (err: any) {
      setError('Error creating academic year: ' + err.message);
    }
  };

  const handleSetCurrent = async (yearId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await setCurrentAcademicYear(schoolId, yearId, token);
      setError('');
      await refreshAcademicYearsData();
    } catch (err: any) {
      setError('Error setting current year: ' + err.message);
    }
  };

  const handleEditYear = (year: AcademicYear) => {
    setSelectedYear(year);
    setEditYearName(year.name);
    setEditStartDate(year.startDate.split('T')[0]);
    setEditEndDate(year.endDate.split('T')[0]);
    setShowEditModal(true);
  };

  const handleUpdateYear = async () => {
    if (!editYearName || !editStartDate || !editEndDate || !selectedYear) {
      setError('Please fill all fields');
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await updateAcademicYear(
        schoolId,
        selectedYear.id,
        {
          name: editYearName,
          startDate: new Date(editStartDate).toISOString(),
          endDate: new Date(editEndDate).toISOString(),
        },
        token
      );

      setError('');
      setShowEditModal(false);
      setSelectedYear(null);
      setEditYearName('');
      setEditStartDate('');
      setEditEndDate('');
      await refreshAcademicYearsData();
    } catch (err: any) {
      setError('Error updating year: ' + err.message);
    }
  };

  const handleDeleteYear = (year: AcademicYear) => {
    setSelectedYear(year);
    setShowDeleteModal(true);
  };

  const confirmDeleteYear = async () => {
    if (!selectedYear) return;

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await deleteAcademicYear(schoolId, selectedYear.id, token);
      setError('');
      setShowDeleteModal(false);
      setSelectedYear(null);
      await refreshAcademicYearsData();
    } catch (err: any) {
      setError('Error deleting year: ' + err.message);
    }
  };

  const handleArchiveYear = async (year: AcademicYear) => {
    if (!confirm(`Archive academic year "${year.name}"? This will make it read-only.`)) {
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      await archiveAcademicYear(schoolId, year.id, token);
      setError('');
      setSuccessMessage(`Academic year "${year.name}" has been archived successfully!`);
      await refreshAcademicYearsData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('Error archiving year: ' + err.message);
    }
  };

  const handleOpenCopyModal = async (year: AcademicYear) => {
    setCopySourceYear(year);
    setCopyTargetYearId('');
    setCopySubjects(true);
    setCopyTeachers(true);
    setCopyClasses(true);
    setCopyError('');
    setCopyPreviewData(null);
    setShowCopyModal(true);

    // Fetch preview data
    try {
      setCopyLoading(true);
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      const preview = await getCopyPreview(schoolId, year.id, token);
      setCopyPreviewData(preview);
    } catch (err: any) {
      setCopyError('Failed to load preview: ' + err.message);
    } finally {
      setCopyLoading(false);
    }
  };

  const handleExecuteCopy = async () => {
    if (!copySourceYear || !copyTargetYearId) {
      setCopyError('Please select a target year');
      return;
    }

    if (!copySubjects && !copyTeachers && !copyClasses) {
      setCopyError('Please select at least one option to copy');
      return;
    }

    try {
      setCopyLoading(true);
      setCopyError('');
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await copySettings(schoolId, copySourceYear.id, {
        toAcademicYearId: copyTargetYearId,
        copySettings: {
          subjects: copySubjects,
          teachers: copyTeachers,
          classes: copyClasses,
        },
      }, token);

      setSuccessMessage('Settings copied successfully!');
      setShowCopyModal(false);
      await refreshAcademicYearsData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setCopyError('Failed to copy settings: ' + err.message);
    } finally {
      setCopyLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statuses = {
      PLANNING: {
        label: 'Planning',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: Clock,
        description: 'In preparation phase',
      },
      ACTIVE: {
        label: 'Active',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle2,
        description: 'Currently in progress',
      },
      ENDED: {
        label: 'Ended',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: AlertCircle,
        description: 'Completed, needs archiving',
      },
      ARCHIVED: {
        label: 'Archived',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Archive,
        description: 'Archived for records',
      },
    };
    return statuses[status as keyof typeof statuses] || statuses.PLANNING;
  };

  const currentYear = years.find((y) => y.isCurrent);

  if (loading) {
    return <PageSkeleton user={user} school={school} type="cards" showFilters={false} />;
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 transition-colors duration-500">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Academic Year Management</h1>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Manage your school's academic years, student promotions, and settings
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/${locale}/reports/year-comparison`)}
                onMouseEnter={() => {
                  router.prefetch(`/${locale}/reports/year-comparison`);
                  prefetchAcademicYearComparison(school?.id);
                }}
                onFocus={() => {
                  router.prefetch(`/${locale}/reports/year-comparison`);
                  prefetchAcademicYearComparison(school?.id);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 text-sm"
              >
                <BarChart3 className="w-5 h-5" />
                Compare Years
              </button>
              <button
                onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                onMouseEnter={() => {
                  router.prefetch(`/${locale}/settings/academic-years/new/wizard`);
                  prefetchSetupTemplates(school?.id);
                }}
                onFocus={() => {
                  router.prefetch(`/${locale}/settings/academic-years/new/wizard`);
                  prefetchSetupTemplates(school?.id);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 text-sm"
              >
                <Sparkles className="w-5 h-5" />
                Setup Wizard
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25 text-sm"
              >
                <Plus className="w-5 h-5" />
                Quick Create
              </button>
            </div>
          </div>

          {/* Current Year Highlight */}
          {currentYear && (
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 dark:from-orange-500/20 dark:to-yellow-500/20 border border-orange-200 dark:border-orange-500/30 rounded-3xl p-8 shadow-xl shadow-orange-500/10 dark:shadow-black/20">
              <div className="flex items-center gap-6 mb-2">
                <div className="w-14 h-14 bg-white dark:bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                  <Star className="w-7 h-7 text-orange-500 dark:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white/80 dark:text-orange-400 uppercase tracking-widest mb-1.5">Current Academic Year</p>
                  <h2 className="text-3xl font-black text-white dark:text-white tracking-tight">{currentYear.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white/90 dark:text-gray-300 mb-2">
                    {new Date(currentYear.startDate).toLocaleDateString()} -{' '}
                    {new Date(currentYear.endDate).toLocaleDateString()}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-white/20 dark:bg-black/20 text-white border-white/30`}
                  >
                    {getStatusInfo(currentYear.status).label}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top-2">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-rose-900 dark:text-rose-200">Error Occurred</p>
              <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">Done Successfully</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Academic Years Timeline */}
        <AnimatedContent animation="slide-up" delay={100}>
          <div className="space-y-6">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">All Academic Years</h2>

            {years.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-16 text-center shadow-slate-200/50 dark:shadow-black/50">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Academic Years Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto mb-8">Create your first academic year to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25"
              >
                <Plus className="w-5 h-5" />
                Create Academic Year
              </button>
            </div>
          ) : (
            years.map((year) => {
              const statusInfo = getStatusInfo(year.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={year.id}
                  className={`bg-white dark:bg-gray-900 rounded-3xl shadow-sm border transition-all hover:shadow-xl hover:-translate-y-1 shadow-slate-200/50 dark:shadow-black/50 ${
                    year.isCurrent ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{year.name}</h3>
                          {year.isCurrent && (
                            <span className="px-3 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 shadow-lg shadow-orange-500/20">
                              <Star className="w-3 h-3 fill-current" />
                              Current
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusInfo.color.replace('100', '500/10').replace('700', '500')}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                          {new Date(year.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          -{' '}
                          {new Date(year.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{statusInfo.description}</p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-6 mb-6 p-6 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                      <div className="text-center group">
                        <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Students</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">
                          {year.id === currentYear?.id ? '~' : '-'}
                        </p>
                      </div>
                      <div className="text-center group">
                        <div className="w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                          <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Classes</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">
                          {year.id === currentYear?.id ? '~' : '-'}
                        </p>
                      </div>
                      <div className="text-center group">
                        <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                          <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Promoted</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">
                          {year.isPromotionDone ? '✓' : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!year.isCurrent && year.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleSetCurrent(year.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl font-bold hover:bg-orange-600 hover:text-white transition-all text-[11px] uppercase tracking-wider"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Set as Current
                        </button>
                      )}

                      {/* Manage button disabled - detail page coming soon
                      <button
                        onClick={() => router.push(`/${locale}/settings/academic-years/${year.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm"
                      >
                        <Settings className="w-4 h-4" />
                        Manage
                      </button>
                      */}

                      {(year.isCurrent || year.status === 'ENDED') && !year.isPromotionDone && (
                        <button
                          onClick={() => router.push(`/${locale}/settings/academic-years/${year.id}/promote`)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-all text-[11px] uppercase tracking-wider"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Promote Students
                        </button>
                      )}
                      
                      {year.isPromotionDone && (
                        <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/50">
                          <CheckCircle2 className="w-4 h-4" />
                          Promotion Complete
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenCopyModal(year)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl font-bold hover:bg-purple-600 hover:text-white transition-all text-[11px] uppercase tracking-wider"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Settings
                      </button>

                      <button
                        onClick={() => handleEditYear(year)}
                        disabled={year.status === 'ARCHIVED'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-[11px] uppercase tracking-wider ${
                          year.status === 'ARCHIVED'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-black'
                        }`}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>

                      {year.status === 'ENDED' && !year.isPromotionDone && (
                        <button
                          onClick={() => handleArchiveYear(year)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all text-[11px] uppercase tracking-wider"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      )}

                      {!year.isCurrent && year.status === 'PLANNING' && (
                        <button
                          onClick={() => handleDeleteYear(year)}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl font-bold hover:bg-rose-600 hover:text-white transition-all text-[11px] uppercase tracking-wider"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </AnimatedContent>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Create New Academic Year</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Define dates and settings for your next school cycle</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Year Name */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Academic Year Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={newYearName}
                    onChange={(e) => setNewYearName(e.target.value)}
                    placeholder="e.g., 2026-2027"
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all"
                  />
                </div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-2 ml-1">
                  Usually in format: YYYY-YYYY (e.g., 2026-2027)
                </p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all"
                  />
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-2 ml-1">October / November</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all"
                  />
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-2 ml-1">August / September</p>
                </div>
              </div>

              {/* Copy Settings */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Copy Settings From (Optional)
                </label>
                <div className="relative">
                  <select
                    value={copyFromYearId}
                    onChange={(e) => setCopyFromYearId(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Start from scratch</option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} (Classes, Subjects, Teachers)
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                    <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 rotate-90" />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-2 ml-1">
                  Copy classes, subjects, and teachers from a previous year
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20 rounded-[1.25rem] p-6 shadow-sm">
                <div className="flex gap-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl h-fit">
                    <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-sm dark:text-gray-300">
                    <p className="font-black text-gray-900 dark:text-white mb-2 uppercase tracking-widest text-[10px]">What happens next:</p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 font-medium">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        Year starts in <span className="text-orange-600 dark:text-orange-400 font-bold">PLANNING</span> status
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        Settings will be duplicated if copied
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        Student promotion can be done later
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 bg-gray-50/50 dark:bg-gray-800/30">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 rounded-2xl font-bold hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateYear}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-orange-500/20"
              >
                Create Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedYear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Edit Academic Year</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Update details for {selectedYear.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedYear(null);
                  }}
                  className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Year Name */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Academic Year Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={editYearName}
                    onChange={(e) => setEditYearName(e.target.value)}
                    placeholder="e.g., 2026-2027"
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:text-white font-bold transition-all"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:text-white font-bold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:text-white font-bold transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 bg-gray-50/50 dark:bg-gray-800/30">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedYear(null);
                }}
                className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 rounded-2xl font-bold hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateYear}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20"
              >
                Update Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedYear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10 text-rose-600 dark:text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-4 tracking-tight">
                Delete Academic Year?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-center font-medium mb-8 leading-relaxed">
                Are you sure you want to delete <span className="text-gray-900 dark:text-white font-black">{selectedYear.name}</span>? This action is <span className="text-rose-600 dark:text-rose-500 font-bold underline underline-offset-4">permanent</span> and cannot be undone.
              </p>

              {/* Warning */}
              <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-4 mb-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <p className="text-xs text-rose-700 dark:text-rose-400 font-bold leading-relaxed">
                    Deletion will only succeed if no records or classes are currently linked to this cycle.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 bg-gray-50/50 dark:bg-gray-800/30">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedYear(null);
                }}
                className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 rounded-2xl font-bold hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteYear}
                className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-rose-700 active:scale-[0.98] transition-all shadow-xl shadow-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Settings Modal */}
      {showCopyModal && copySourceYear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Copy Institutional Settings</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
                    Migrating from cycle: <span className="text-orange-600 dark:text-orange-400 font-black">{copySourceYear.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Copy Preview Section */}
              {copyLoading && !copyPreviewData ? (
                <div className="flex items-center justify-center py-20 bg-gray-50/50 dark:bg-gray-800/20 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                  <div className="text-center">
                    <div className="relative mx-auto w-20 h-20 mb-6">
                      <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
                      <div className="relative w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/30">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                      </div>
                    </div>
                    <p className="text-gray-900 dark:text-white font-black tracking-widest text-xs uppercase">Preparing Preview Data...</p>
                  </div>
                </div>
              ) : copyPreviewData ? (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                  <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-1">Institutional Blueprint:</h3>
                  <div className="grid grid-cols-3 gap-6">
                    {/* Subjects Card */}
                    <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl p-6 border border-blue-500/10 hover:border-blue-500/30 transition-all group">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:-rotate-6 transition-transform">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-black text-blue-900 dark:text-blue-100">
                            {copyPreviewData.subjectsCount || 0}
                          </p>
                          <p className="text-[10px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest mt-1">Subjects</p>
                        </div>
                      </div>
                    </div>

                    {/* Teachers Card */}
                    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl p-6 border border-emerald-500/10 hover:border-emerald-500/30 transition-all group">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-black text-emerald-900 dark:text-emerald-100">
                            {copyPreviewData.teachersCount || 0}
                          </p>
                          <p className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mt-1">Teachers</p>
                        </div>
                      </div>
                    </div>

                    {/* Classes Card */}
                    <div className="bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl p-6 border border-purple-500/10 hover:border-purple-500/30 transition-all group">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:-rotate-3 transition-transform">
                          <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-black text-purple-900 dark:text-purple-100">
                            {copyPreviewData.classesCount || 0}
                          </p>
                          <p className="text-[10px] font-black text-purple-600/60 dark:text-purple-400/60 uppercase tracking-widest mt-1">Classes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Target Year Selection */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Target Academic Cycle <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={copyTargetYearId}
                    onChange={(e) => setCopyTargetYearId(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none cursor-pointer disabled:opacity-50"
                    disabled={copyLoading}
                  >
                    <option value="">Select destination cycle...</option>
                    {years
                      .filter((year) => year.id !== copySourceYear.id)
                      .map((year) => (
                        <option key={year.id} value={year.id}>
                          Cycle: {year.name}
                        </option>
                      ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                    <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 rotate-90" />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-2 ml-1">
                  Choose the academic year that will receive these inherited settings
                </p>
              </div>

              {/* Checkbox Options */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">
                  Select Modules to Migrate:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className={`group relative flex flex-col items-center justify-center p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${
                    copySubjects ? 'bg-blue-500/5 border-blue-500 ring-4 ring-blue-500/10' : 'bg-transparent border-gray-100 dark:border-gray-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={copySubjects}
                      onChange={(e) => setCopySubjects(e.target.checked)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={copyLoading}
                    />
                    <div className={`p-4 rounded-2xl mb-4 transition-all ${
                      copySubjects ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <p className={`font-black uppercase tracking-widest text-[10px] transition-colors ${
                      copySubjects ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                    }`}>Subjects</p>
                  </label>

                  <label className={`group relative flex flex-col items-center justify-center p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${
                    copyTeachers ? 'bg-emerald-500/5 border-emerald-500 ring-4 ring-emerald-500/10' : 'bg-transparent border-gray-100 dark:border-gray-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={copyTeachers}
                      onChange={(e) => setCopyTeachers(e.target.checked)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={copyLoading}
                    />
                    <div className={`p-4 rounded-2xl mb-4 transition-all ${
                      copyTeachers ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      <Users className="w-8 h-8" />
                    </div>
                    <p className={`font-black uppercase tracking-widest text-[10px] transition-colors ${
                      copyTeachers ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                    }`}>Teachers</p>
                  </label>

                  <label className={`group relative flex flex-col items-center justify-center p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${
                    copyClasses ? 'bg-purple-500/5 border-purple-500 ring-4 ring-purple-500/10' : 'bg-transparent border-gray-100 dark:border-gray-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={copyClasses}
                      onChange={(e) => setCopyClasses(e.target.checked)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={copyLoading}
                    />
                    <div className={`p-4 rounded-2xl mb-4 transition-all ${
                      copyClasses ? 'bg-purple-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      <GraduationCap className="w-8 h-8" />
                    </div>
                    <p className={`font-black uppercase tracking-widest text-[10px] transition-colors ${
                      copyClasses ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'
                    }`}>Classes</p>
                  </label>
                </div>
              </div>

              {/* Warning/Info Messages */}
              <div className="space-y-4">
                <div className="bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-6">
                  <div className="flex gap-4">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-[10px] mb-2">Technical Disclaimer:</p>
                      <ul className="space-y-1.5 text-gray-600 dark:text-gray-400 font-medium">
                        <li>• This process creates independent duplicates</li>
                        <li>• It will not overwrite existing data in destination</li>
                        <li>• Enrollments & Attendance are not migrated</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {copyError && (
                  <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center gap-4">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{copyError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 bg-gray-50/50 dark:bg-gray-800/30">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 rounded-2xl font-bold hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all active:scale-[0.98]"
                disabled={copyLoading}
              >
                Discard
              </button>
              <button
                onClick={handleExecuteCopy}
                disabled={copyLoading || !copyTargetYearId}
                className="flex-[2] px-6 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-orange-700 active:scale-[0.98] transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {copyLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Apply Migration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* End main content wrapper */}
    </div>
    </>
  );
}
