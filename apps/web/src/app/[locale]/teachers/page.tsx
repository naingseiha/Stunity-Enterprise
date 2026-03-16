'use client';

import { useEffect, useState, useCallback, use } from 'react';
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
  LogOut,
  Home,
  BookOpen,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  UserCog,
  Eye,
  Mail,
  Phone,
  Briefcase,
  Lock,
  Ticket,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { claimCodeService } from '@/lib/api/claimCodes';
import { deleteTeacher } from '@/lib/api/teachers';
import { useTeachers, type Teacher } from '@/hooks/useTeachers';
import TeacherModal from '@/components/teachers/TeacherModal';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import AcademicYearSelector from '@/components/AcademicYearSelector';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { useDebounce } from '@/hooks/useDebounce';

const ITEMS_PER_PAGE = 20;

export default function TeachersPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);

  const {
    locale
  } = params;

  const t = useTranslations('teachers');
  const tc = useTranslations('common');
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [page, setPage] = useState(1);
  const { selectedYear } = useAcademicYear();

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;
  const schoolId = school?.id;

  // Use SWR hook for data fetching with automatic caching
  const {
    teachers,
    pagination,
    isLoading,
    isValidating,
    mutate,
    isEmpty,
  } = useTeachers({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch,
  });

  const totalPages = pagination.totalPages;
  const totalCount = pagination.total || 0;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  const handleSearch = useCallback(() => {
    setPage(1);
  }, []);

  const handleGenerateCode = async (teacher: Teacher) => {
    if (!schoolId) return;
    try {
      setIsGenerating(teacher.id);
      const codes = await claimCodeService.generate(schoolId, {
        type: 'TEACHER',
        count: 1,
        teacherIds: [teacher.id],
        expiresInDays: 30,
      });
      if (codes && codes.length > 0) {
        // Automatically copy to clipboard and alert the user
        navigator.clipboard.writeText(codes[0]);
        alert(`Claim code generated for ${teacher.firstNameLatin} ${teacher.lastNameLatin}:\n\n${codes[0]}\n\nThis code has been copied to your clipboard.`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to generate claim code for this teacher.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;

    try {
      await deleteTeacher(id);
      mutate(); // Revalidate the cache
    } catch (error: any) {
      alert(error.message);
    }
  }, [mutate]);

  const handleEdit = useCallback((teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowModal(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedTeacher(null);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback((refresh?: boolean) => {
    setShowModal(false);
    setSelectedTeacher(null);
    if (refresh) {
      mutate(); // Revalidate the cache
    }
  }, [mutate]);

  // Stats
  const maleCount = teachers.filter(t => t.gender === 'MALE').length;
  const femaleCount = teachers.filter(t => t.gender === 'FEMALE').length;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-500">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400 mb-2">
                    <Link href={`/${locale}/dashboard`} className="hover:text-slate-700 dark:hover:text-gray-200 transition-colors">Dashboard</Link>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-gray-600" />
                    <span className="font-medium text-slate-900 dark:text-white">Teachers</span>
                  </nav>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Teachers</h1>
                  <p className="text-slate-500 dark:text-gray-400 mt-1">
                    Manage your teaching staff and their assignments
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => mutate()}
                    disabled={isValidating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Teacher
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Stats Cards */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Teachers</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalCount}</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-50 dark:bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <UserCog className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Male</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{maleCount}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Female</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{femaleCount}</p>
                  </div>
                  <div className="h-10 w-10 bg-pink-50 dark:bg-pink-500/10 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Academic Year</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{selectedYear?.name || '-'}</p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Main Content Card */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm shadow-gray-200/50 dark:shadow-none">

              {/* Toolbar */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search teachers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-0 rounded-lg focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  {/* Year Badge Removed for Global List */}
                </div>
              </div>

              <BlurLoader
                isLoading={isLoading}
                skeleton={
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="px-4 py-3 text-left"><div className="w-16 h-3 bg-gray-100 dark:bg-gray-800 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-14 h-3 bg-gray-100 dark:bg-gray-800 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-14 h-3 bg-gray-100 dark:bg-gray-800 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-16 h-3 bg-gray-100 dark:bg-gray-800 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-20 h-3 bg-gray-100 dark:bg-gray-800 rounded" /></th>
                          <th className="px-4 py-3 text-right"><div className="w-16 h-3 bg-gray-100 dark:bg-gray-800 rounded ml-auto" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                                <div className="space-y-1.5">
                                  <div className="w-28 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                  <div className="w-20 h-3 bg-gray-50 dark:bg-gray-800/50 rounded animate-pulse" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4"><div className="w-16 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-12 h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-20 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-28 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-20 h-8 bg-gray-100 dark:bg-gray-800 rounded ml-auto animate-pulse" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              >
                {/* Revalidating indicator */}
                {isValidating && !isLoading && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 text-white rounded-md text-xs">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Syncing
                    </div>
                  </div>
                )}

                {isEmpty ? (
                  <div className="px-6 py-16 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                      <UserCog className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No teachers found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first teacher</p>
                    <button
                      onClick={handleAdd}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Teacher
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Professional Data Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Teacher</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gender</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Position</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                          {teachers.map((teacher) => (
                            <tr
                              key={teacher.id}
                              className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                            >
                              {/* Teacher Info */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {teacher.photoUrl ? (
                                    <img
                                      src={`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}${teacher.photoUrl}`}
                                      alt=""
                                      className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                                    />
                                  ) : (
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium text-white ${teacher.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'
                                      }`}>
                                      {teacher.firstNameLatin.charAt(0)}{teacher.lastNameLatin.charAt(0)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {teacher.firstNameLatin} {teacher.lastNameLatin}
                                    </p>
                                    {teacher.firstNameKhmer && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {teacher.firstNameKhmer} {teacher.lastNameKhmer}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Teacher ID */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{teacher.teacherId}</span>
                              </td>

                              {/* Gender */}
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                  teacher.gender === 'MALE'
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20'
                                    : 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-100 dark:border-pink-500/20'
                                }`}>
                                  {teacher.gender === 'MALE' ? 'Male' : 'Female'}
                                </span>
                              </td>

                              {/* Position */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {teacher.position || '-'}
                                </span>
                              </td>

                              {/* Contact */}
                              <td className="px-4 py-3">
                                <div className="space-y-0.5">
                                  {teacher.phoneNumber && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                      {teacher.phoneNumber}
                                    </p>
                                  )}
                                  {teacher.email && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                      <Mail className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                      {teacher.email}
                                    </p>
                                  )}
                                  {!teacher.phoneNumber && !teacher.email && (
                                    <span className="text-sm text-gray-400 dark:text-gray-600">-</span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleGenerateCode(teacher)}
                                    disabled={isGenerating === teacher.id}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors disabled:opacity-50"
                                    title="Generate Claim Code"
                                  >
                                    <Ticket className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/${locale}/teachers/${teacher.id}`)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedTeacher(teacher);
                                      setShowResetModal(true);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
                                    title="Reset Password"
                                  >
                                    <Lock className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(teacher)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(teacher.id)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                                    title="Delete"
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

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * ITEMS_PER_PAGE + 1}</span>–
                          <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * ITEMS_PER_PAGE, totalCount)}</span> of{' '}
                          <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span>
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="inline-flex items-center justify-center h-8 w-8 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`inline-flex items-center justify-center h-8 min-w-[32px] px-2 text-sm font-medium rounded-md transition-colors ${
                                  page === pageNum
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="inline-flex items-center justify-center h-8 w-8 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </BlurLoader>
            </div>
          </AnimatedContent>
        </main>
      </div>

      {/* Teacher Modal */}
      {showModal && (
        <TeacherModal
          teacher={selectedTeacher}
          onClose={handleModalClose}
        />
      )}

      {/* Admin Reset Password Modal */}
      {showResetModal && selectedTeacher && (
        <AdminResetPasswordModal
          user={{
            id: selectedTeacher.id,
            name: `${selectedTeacher.firstNameLatin} ${selectedTeacher.lastNameLatin}`,
            email: selectedTeacher.email ?? undefined,
          }}
          onClose={() => {
            setShowResetModal(false);
            setSelectedTeacher(null);
          }}
        />
      )}
    </>
  );
}
