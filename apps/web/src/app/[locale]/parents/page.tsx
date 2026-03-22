'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronRight,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import Pagination from '@/components/Pagination';
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';
import { TokenManager } from '@/lib/api/auth';
import { useDebounce } from '@/hooks/useDebounce';
import { useParents } from '@/hooks/useParents';
import type { ParentDirectoryEntry } from '@/lib/api/parents';

const ITEMS_PER_PAGE = 20;

function formatDateTime(value?: string | null) {
  if (!value) return 'Never';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'Never';
  }
}

function getAccountStatus(parent: ParentDirectoryEntry) {
  if (!parent.account) {
    return {
      label: 'No account',
      className: 'bg-amber-100 text-amber-800',
      helper: 'Ask the parent to register from the parent portal.',
    };
  }

  if (!parent.account.isActive) {
    return {
      label: 'Suspended',
      className: 'bg-red-100 text-red-700',
      helper: 'Account exists but is currently inactive.',
    };
  }

  if (parent.account.lockedUntil && new Date(parent.account.lockedUntil) > new Date()) {
    return {
      label: 'Locked',
      className: 'bg-orange-100 text-orange-800',
      helper: `Locked until ${formatDateTime(parent.account.lockedUntil)}`,
    };
  }

  if (parent.account.isDefaultPassword) {
    return {
      label: 'Needs change',
      className: 'bg-blue-100 text-blue-800',
      helper: 'Temporary password still needs to be changed by the parent.',
    };
  }

  return {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800',
    helper: parent.account.lastLogin ? `Last login ${formatDateTime(parent.account.lastLogin)}` : 'Account exists but has not logged in yet.',
  };
}

export default function ParentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const [parentToReset, setParentToReset] = useState<ParentDirectoryEntry | null>(null);

  const { user, school } = TokenManager.getUserData();

  const {
    parents,
    pagination,
    isLoading,
    isValidating,
    error,
    mutate,
    isEmpty,
  } = useParents({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch,
  });

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const withAccountCount = useMemo(
    () => parents.filter((parent) => Boolean(parent.account)).length,
    [parents]
  );
  const withoutAccountCount = useMemo(
    () => parents.filter((parent) => !parent.account).length,
    [parents]
  );
  const multiStudentCount = useMemo(
    () => parents.filter((parent) => parent.linkedStudents.length > 1).length,
    [parents]
  );

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

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
                    <span className="font-medium text-slate-900 dark:text-white">Parents</span>
                  </nav>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Parents</h1>
                  <p className="text-slate-500 dark:text-gray-400 mt-1">
                    Review linked guardian accounts and help parents recover access when needed.
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
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={50}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Parents</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{pagination.total}</p>
                  </div>
                  <div className="h-10 w-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">With Accounts</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{withAccountCount}</p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">No Account Yet</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{withoutAccountCount}</p>
                  </div>
                  <div className="h-10 w-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Linked To 2+ Students</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{multiStudentCount}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={100}>
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  Parents create their own accounts from the parent portal. This screen helps school admins see who is linked, who already has a login, and reset passwords for parents who forgot them.
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={150}>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-2xl shadow-gray-200/50 dark:shadow-none">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by parent, phone, email, or student"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="p-5">
                  <TableSkeleton rows={8} />
                </div>
              ) : error ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Failed to load parents</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {error instanceof Error ? error.message : 'Something went wrong while loading parent accounts.'}
                  </p>
                </div>
              ) : isEmpty ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No parents found</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    No linked parents matched this search yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                      <thead className="bg-gray-50/80 dark:bg-gray-950/50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Parent</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Contact</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Linked Students</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Account</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {parents.map((parent) => {
                          const accountStatus = getAccountStatus(parent);

                          return (
                            <tr key={parent.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-950/40 transition-colors">
                              <td className="px-5 py-4 align-top">
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-white">{parent.fullName}</div>
                                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {parent.relationship.replace(/_/g, ' ')}
                                  </div>
                                  {parent.parentId && (
                                    <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                      Parent ID: {parent.parentId}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4 align-top">
                                <div className="space-y-1 text-sm">
                                  <div className="font-medium text-gray-900 dark:text-white">{parent.phone}</div>
                                  <div className="text-gray-500 dark:text-gray-400">{parent.account?.email || parent.email || 'No email'}</div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Last login: {formatDateTime(parent.account?.lastLogin)}
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 align-top">
                                <div className="space-y-2">
                                  {parent.linkedStudents.slice(0, 3).map((link) => (
                                    <div key={`${parent.id}-${link.student.id}`} className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {link.student.fullName}
                                        {link.isPrimary && (
                                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                            Primary
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {link.student.studentId || 'No student ID'}
                                        {link.student.class?.name ? ` · ${link.student.class.name}` : ' · Unassigned class'}
                                      </div>
                                    </div>
                                  ))}
                                  {parent.linkedStudents.length > 3 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      +{parent.linkedStudents.length - 3} more linked students
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4 align-top">
                                <div className="space-y-2">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accountStatus.className}`}>
                                    {accountStatus.label}
                                  </span>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                    {accountStatus.helper}
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 align-top">
                                {parent.account ? (
                                  <button
                                    onClick={() => setParentToReset(parent)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                                  >
                                    <Lock className="h-4 w-4" />
                                    Reset Password
                                  </button>
                                ) : (
                                  <div className="max-w-xs rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                                    No login exists yet. Ask the parent to register from the parent portal using their child’s student ID.
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                  />
                </>
              )}
            </div>
          </AnimatedContent>
        </main>
      </div>

      {parentToReset?.account && (
        <AdminResetPasswordModal
          user={{
            id: parentToReset.account.userId,
            name: parentToReset.fullName,
            email: parentToReset.account.email || parentToReset.email || undefined,
          }}
          onClose={(success) => {
            setParentToReset(null);
            if (success) {
              mutate();
            }
          }}
        />
      )}
    </>
  );
}
