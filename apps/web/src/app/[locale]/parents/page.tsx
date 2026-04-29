'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  KeyRound,
  Link2,
  Lock,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import DirectoryPagination from '@/components/DirectoryPagination';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { TokenManager } from '@/lib/api/auth';
import { useDebounce } from '@/hooks/useDebounce';
import { useParents } from '@/hooks/useParents';
import type { ParentDirectoryEntry } from '@/lib/api/parents';

import { useTranslations } from 'next-intl';
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

function formatRelationship(value?: string | null) {
  if (!value) return 'Guardian';
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function getParentInitials(parent: ParentDirectoryEntry) {
  return parent.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'PA';
}

function getAccountStatus(parent: ParentDirectoryEntry) {
  if (!parent.account) {
    return {
      label: 'No account',
      helper: 'Invite the parent to register from the portal.',
      needsAction: true,
      pillClass:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    };
  }

  if (!parent.account.isActive) {
    return {
      label: 'Suspended',
      helper: 'Account exists but is currently inactive.',
      needsAction: true,
      pillClass:
        'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    };
  }

  if (parent.account.lockedUntil && new Date(parent.account.lockedUntil) > new Date()) {
    return {
      label: 'Locked',
      helper: `Locked until ${formatDateTime(parent.account.lockedUntil)}`,
      needsAction: true,
      pillClass:
        'bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20',
    };
  }

  if (parent.account.isDefaultPassword) {
    return {
      label: 'Needs change',
      helper: 'Temporary password still needs to be changed.',
      needsAction: true,
      pillClass:
        'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    };
  }

  return {
    label: 'Active',
    helper: parent.account.lastLogin
      ? `Last login ${formatDateTime(parent.account.lastLogin)}`
      : 'Account is active with no login yet.',
    needsAction: false,
    pillClass:
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  };
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: 'amber' | 'emerald' | 'blue' | 'slate';
}) {
  const toneClasses = {
    amber: {
      shell:
        'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/80 shadow-amber-100/30 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/10',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    },
    emerald: {
      shell:
        'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/80 shadow-emerald-100/30 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/10',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    },
    blue: {
      shell:
        'border-blue-100/80 bg-gradient-to-br from-white via-blue-50/70 to-cyan-50/80 shadow-blue-100/30 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/10',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    },
    slate: {
      shell:
        'border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 shadow-slate-200/30 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/10',
      icon: 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:bg-slate-50 dark:bg-gray-800/95 dark:text-slate-300',
    },
  };

  const styles = toneClasses[tone];

  return (
    <div className={`relative overflow-hidden rounded-[1.2rem] border p-5 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl ${styles.shell}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white dark:bg-gray-900/60 blur-2xl dark:bg-gray-900/5" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-[0.95rem] p-3 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function ParentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations('common');
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

  const visibleCount = parents.length;
  const withoutAccountCount = useMemo(
    () => parents.filter((parent) => !parent.account).length,
    [parents]
  );
  const multiStudentCount = useMemo(
    () => parents.filter((parent) => parent.linkedStudents.length > 1).length,
    [parents]
  );
  const readyAccountCount = useMemo(
    () => parents.filter((parent) => !getAccountStatus(parent).needsAction).length,
    [parents]
  );
  const supportQueueCount = useMemo(
    () => parents.filter((parent) => getAccountStatus(parent).needsAction).length,
    [parents]
  );
  const linkedStudentCount = useMemo(
    () => parents.reduce((total, parent) => total + parent.linkedStudents.length, 0),
    [parents]
  );
  const accessReadyRate = visibleCount > 0 ? Math.round((readyAccountCount / visibleCount) * 100) : 0;
  const hasSearch = Boolean(debouncedSearch.trim());

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800/50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
        <div className="pointer-events-none absolute right-0 top-12 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <CompactHeroCard
                  eyebrow="Household Management"
                  title="Parent directory"
                  description="Track guardian access and support needs."
                  icon={Users}
                  chipsPosition="below"
                  backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(255,251,235,0.96)_50%,rgba(255,237,213,0.92))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                  glowClassName="bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_58%)] dark:opacity-50"
                  eyebrowClassName="text-amber-700"
                  chips={
                    <>
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                        {pagination.total} linked guardians
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                        {linkedStudentCount} student links in view
                      </span>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                        {supportQueueCount} need support
                      </span>
                      {hasSearch ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                          Search active
                        </span>
                      ) : null}
                    </>
                  }
                  actions={
                    <button
                      type="button"
                      onClick={() => mutate()}
                      disabled={isValidating}
                      className="inline-flex items-center gap-2 rounded-[0.75rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/90 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800/60 dark:bg-gray-900/90 dark:text-gray-200"
                    >
                      <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  }
                />
              </div>

              <div className="relative h-full overflow-hidden rounded-[1.65rem] border border-amber-300/80 bg-gradient-to-br from-white via-amber-200/80 to-orange-200/90 p-6 text-slate-900 dark:text-white shadow-[0_34px_90px_-38px_rgba(245,158,11,0.26)] ring-1 ring-amber-200/80 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-400/40 blur-3xl dark:bg-amber-500/20" />
                <div className="pointer-events-none absolute -bottom-14 left-0 h-40 w-40 rounded-full bg-orange-400/30 blur-3xl dark:bg-orange-500/20" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Access Readiness
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{accessReadyRate}%</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          ready
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border border-amber-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-amber-200/75 dark:border-white/10 dark:bg-gray-900/10 dark:ring-white/10">
                      <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-amber-200/75 dark:bg-gray-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400 transition-all duration-700"
                      style={{ width: `${Math.max(visibleCount ? accessReadyRate : 0, visibleCount > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-amber-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-amber-200/60 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{visibleCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Visible
                      </p>
                    </div>
                    <div className="rounded-[0.95rem] border border-amber-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-amber-200/60 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{readyAccountCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Ready
                      </p>
                    </div>
                    <div className="rounded-[0.95rem] border border-amber-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-amber-200/60 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{supportQueueCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Action
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="inline-flex items-center rounded-full border border-amber-200/80 bg-white dark:bg-gray-900/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-gray-900/5 dark:text-slate-300">
                      Access health
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={50}>
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Linked Guardians"
                value={String(pagination.total)}
                helper="Directory total"
                icon={Users}
                tone="amber"
              />
              <MetricCard
                label="Access Ready"
                value={String(readyAccountCount)}
                helper="Healthy active accounts"
                icon={UserCheck}
                tone="emerald"
              />
              <MetricCard
                label="No Account"
                value={String(withoutAccountCount)}
                helper="Need portal onboarding"
                icon={AlertCircle}
                tone="blue"
              />
              <MetricCard
                label="Multi-Student Homes"
                value={String(multiStudentCount)}
                helper="Linked to 2+ students"
                icon={Link2}
                tone="slate"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={100}>
            <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
              <div className="border-b border-slate-200 dark:border-gray-800/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      Guardian Workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {hasSearch ? 'Filtered guardian results' : 'Parent access directory'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {visibleCount} visible
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {hasSearch ? `Search: "${debouncedSearch}"` : 'No keyword filter'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by parent, phone, email, or student"
                      className="h-14 w-full rounded-[0.75rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 pl-11 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                    />
                  </label>

                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-[0.75rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      Reset Search
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                {isValidating && !isLoading ? (
                  <div className="absolute right-6 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.55)] dark:bg-gray-900 dark:text-white">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Syncing
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="overflow-x-auto px-6 py-4 sm:px-8">
                    <table className="min-w-full">
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                        <TableSkeleton rows={8} />
                      </tbody>
                    </table>
                  </div>
                ) : error ? (
                  <div className="px-6 py-16 text-center sm:px-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">Failed to load parents</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {error instanceof Error ? error.message : 'Something went wrong while loading parent accounts.'}
                    </p>
                  </div>
                ) : isEmpty ? (
                  <div className="px-6 py-16 text-center sm:px-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                      {hasSearch ? 'No parents match this search' : 'No parents found yet'}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {hasSearch
                        ? 'Try a different keyword for guardian, student, or contact data.'
                        : 'Linked parents will appear here once student-family records are connected.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-800">
                        <thead className="bg-slate-50 dark:bg-none dark:bg-gray-800/50 dark:bg-none dark:bg-gray-950/40">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500 sm:px-8">
                              Guardian
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Contact
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Linked Students
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Access
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                          {parents.map((parent) => {
                            const accountStatus = getAccountStatus(parent);

                            return (
                              <tr
                                key={parent.id}
                                className="align-top transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-none dark:bg-gray-800/50 dark:hover:bg-gray-950/30"
                              >
                                <td className="px-6 py-4 sm:px-8">
                                  <div className="flex items-start gap-3.5">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 text-sm font-black text-white shadow-lg shadow-blue-500/10">
                                      {getParentInitials(parent)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                          {parent.fullName}
                                        </p>
                                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-none dark:bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-none dark:bg-gray-800 dark:text-gray-300">
                                          {formatRelationship(parent.relationship)}
                                        </span>
                                      </div>
                                      {parent.parentId ? (
                                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                                          Parent ID {parent.parentId}
                                        </p>
                                      ) : null}
                                      <p className="mt-1 text-xs font-medium text-slate-400 dark:text-gray-500">
                                        {parent.linkedStudents.length} linked student{parent.linkedStudents.length === 1 ? '' : 's'}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="space-y-1.5">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{parent.phone}</p>
                                    <p className="text-sm text-slate-500 dark:text-gray-400">
                                      {parent.account?.email || parent.email || 'No email on file'}
                                    </p>
                                    <p className="text-xs font-medium text-slate-400 dark:text-gray-500">
                                      {parent.account?.lastLogin
                                        ? `Last login ${formatDateTime(parent.account.lastLogin)}`
                                        : parent.account
                                          ? 'No login activity yet'
                                          : 'Portal account not created yet'}
                                    </p>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="space-y-2">
                                    {parent.linkedStudents.slice(0, 2).map((link) => (
                                      <div
                                        key={`${parent.id}-${link.student.id}`}
                                        className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 px-3 py-2.5 dark:border-gray-800/70 dark:bg-gray-950/50"
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {link.student.fullName}
                                          </span>
                                          {link.isPrimary ? (
                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                                              Primary
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                                          {link.student.studentId || 'No student ID'}
                                          {link.student.class?.name ? ` · ${link.student.class.name}` : ' · Unassigned class'}
                                        </p>
                                      </div>
                                    ))}
                                    {parent.linkedStudents.length > 2 ? (
                                      <p className="text-xs font-medium text-slate-400 dark:text-gray-500">
                                        +{parent.linkedStudents.length - 2} more linked students
                                      </p>
                                    ) : null}
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accountStatus.pillClass}`}
                                  >
                                    {accountStatus.label}
                                  </span>
                                  <p className="mt-2 max-w-xs text-xs font-medium leading-5 text-slate-500 dark:text-gray-400">
                                    {accountStatus.helper}
                                  </p>
                                </td>

                                <td className="px-6 py-4">
                                  {parent.account ? (
                                    <button
                                      type="button"
                                      onClick={() => setParentToReset(parent)}
                                      className="inline-flex items-center gap-2 rounded-[0.8rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)] dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200"
                                    >
                                      <Lock className="h-4 w-4" />
                                      Reset Password
                                    </button>
                                  ) : (
                                    <div className="max-w-xs rounded-[0.95rem] border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs font-medium leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                      Ask the parent to register first from the parent portal.
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <DirectoryPagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={setPage}
                      totalItems={pagination.total}
                      itemsPerPage={pagination.limit}
                    />
                  </>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {parentToReset?.account ? (
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
      ) : null}
    </>
  );
}
