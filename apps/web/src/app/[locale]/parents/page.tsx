'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckSquare,
  Home,
  ChevronRight,
  KeyRound,
  Link2,
  Lock,
  RefreshCw,
  Search,
  Square,
  UserCheck,
  Users,
  X,
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
    amber: { shell: 'border-amber-200/60 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white', icon: 'bg-white/20 text-white ring-1 ring-white/30' },
    emerald: { shell: 'border-emerald-200/60 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-white', icon: 'bg-white/20 text-white ring-1 ring-white/30' },
    blue: { shell: 'border-sky-200/60 bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 text-white', icon: 'bg-white/20 text-white ring-1 ring-white/30' },
    slate: { shell: 'border-violet-200/60 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-500 text-white', icon: 'bg-white/20 text-white ring-1 ring-white/30' },
  };

  const styles = toneClasses[tone];

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${styles.shell}`}>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/85">
            {label}
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm font-medium text-white/90">{helper}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-20 w-32 rounded-full border border-white/25" />
    </div>
  );
}

export default function ParentsPage({ params }: { params: Promise<{ locale: string }> }) {
    const autoT = useTranslations();
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations('common');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const [parentToReset, setParentToReset] = useState<ParentDirectoryEntry | null>(null);
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set());

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

  const toggleParentSelection = (id: string) => {
    const newSelection = new Set(selectedParents);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedParents(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedParents.size === parents.length) {
      setSelectedParents(new Set());
    } else {
      setSelectedParents(new Set(parents.map((p) => p.id)));
    }
  };

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)] transition-colors duration-500 dark:bg-[linear-gradient(180deg,#0f172a_0%,#111827_220px,#111827_100%)] lg:ml-64">
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
                  title={autoT("auto.web.app_locale_parents_page.k_5382458a")}
                  description="Track guardian access and support needs."
                  icon={Users}
                  chipsPosition="below"
                  backgroundClassName="bg-white dark:bg-gray-900/95"
                  glowClassName="opacity-0"
                  eyebrowClassName="text-amber-700"
                  iconShellClassName="bg-indigo-600 text-white"
                  breadcrumbs={
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500/70">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200">
                        <Home className="h-3.5 w-3.5" />
                        Home
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      <span className="text-slate-900 dark:text-gray-100">Parents</span>
                    </div>
                  }
                  chips={
                    <>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200">
                        {pagination.total} <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_53851e57" />
                      </span>
                      <span className="inline-flex items-center rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:border-indigo-600/60 dark:bg-indigo-500/20 dark:text-indigo-100">
                        {linkedStudentCount} <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_cf8f12f7" />
                      </span>
                      <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-500/15 dark:text-amber-300">
                        {supportQueueCount} <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_dcd507ef" />
                      </span>
                      {hasSearch ? (
                        <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-700/50 dark:bg-blue-500/15 dark:text-blue-300">
                          <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_0c2a4c54" />
                        </span>
                      ) : null}
                    </>
                  }
                  actions={
                    <button
                      type="button"
                      onClick={() => mutate()}
                      disabled={isValidating}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-800/70"
                    >
                      <RefreshCw className={`h-4 w-4 text-indigo-600 dark:text-indigo-300 ${isValidating ? 'animate-spin' : ''}`} />
                      <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_0189c770" />
                    </button>
                  }
                />
              </div>

              <div className="relative h-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-sm dark:border-gray-800 dark:bg-gray-900/90 dark:text-white xl:col-span-4 sm:p-7">
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_8e8ea1ec" />
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{accessReadyRate}%</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_b1d6c168" />
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-500/15">
                      <KeyRound className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-700"
                      style={{ width: `${Math.max(visibleCount ? accessReadyRate : 0, visibleCount > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-800/70">
                      <p className="text-xl font-black tracking-tight">{visibleCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_621ba5da" />
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-800/70">
                      <p className="text-xl font-black tracking-tight">{readyAccountCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_dfb9c963" />
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-800/70">
                      <p className="text-xl font-black tracking-tight">{supportQueueCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_6ada58b6" />
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-gray-700 dark:bg-gray-800/70 dark:text-slate-300">
                      <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_6f4a4ce6" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={50}>
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={autoT("auto.web.app_locale_parents_page.k_d65a632e")}
                value={String(pagination.total)}
                helper="Directory total"
                icon={Users}
                tone="amber"
              />
              <MetricCard
                label={autoT("auto.web.app_locale_parents_page.k_62f56437")}
                value={String(readyAccountCount)}
                helper="Healthy active accounts"
                icon={UserCheck}
                tone="emerald"
              />
              <MetricCard
                label={autoT("auto.web.app_locale_parents_page.k_3d504395")}
                value={String(withoutAccountCount)}
                helper="Need portal onboarding"
                icon={AlertCircle}
                tone="blue"
              />
              <MetricCard
                label={autoT("auto.web.app_locale_parents_page.k_02cd379f")}
                value={String(multiStudentCount)}
                helper="Linked to 2+ students"
                icon={Link2}
                tone="slate"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={100}>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
              <div className="border-b border-slate-200 dark:border-gray-800/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_f1147690" />
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {hasSearch ? 'Filtered guardian results' : 'Parent access directory'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/80">
                      {visibleCount} <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_7b1e4fb5" />
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/80">
                      {hasSearch ? `Search: "${debouncedSearch}"` : 'No keyword filter'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="relative block">
                    <span className="pointer-events-none absolute left-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={autoT("auto.web.app_locale_parents_page.k_f65f62a2")}
                      className="h-14 w-full rounded-full border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 pl-14 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                    />
                  </label>

                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-5 text-sm font-black text-slate-900 dark:text-gray-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_8e90e0e6" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                {isValidating && !isLoading ? (
                  <div className="absolute right-6 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.55)] dark:bg-gray-900 dark:text-white">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_08c9459a" />
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
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white"><AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_fd446951" /></h3>
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
                          <tr className="border-b border-slate-200 dark:border-gray-800/70">
                            <th className="w-14 px-6 py-4 sm:px-8">
                              <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="inline-flex items-center justify-center"
                              >
                                {selectedParents.size === parents.length && parents.length > 0 ? (
                                  <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                ) : selectedParents.size > 0 ? (
                                  <div className="h-[18px] w-[18px] rounded border-2 border-blue-500 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.25)]" />
                                ) : (
                                  <Square className="h-[18px] w-[18px] text-slate-300 transition-colors hover:text-slate-500 dark:text-gray-700 dark:text-gray-200 dark:hover:text-gray-500" />
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_fd1b468c" />
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_090a68af" />
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_dc94d02e" />
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_2c93b6f6" />
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_6ada58b6" />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                          {parents.map((parent) => {
                            const accountStatus = getAccountStatus(parent);

                            return (
                                <tr
                                  key={parent.id}
                                  className={`align-top transition-colors ${selectedParents.has(parent.id) ? 'bg-blue-50/40 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-none dark:bg-gray-800/50 dark:hover:bg-gray-950/30'}`}
                                >
                                  <td className="px-6 py-4 sm:px-8">
                                    <button
                                      type="button"
                                      onClick={() => toggleParentSelection(parent.id)}
                                      className="mt-2 inline-flex items-center justify-center"
                                    >
                                      {selectedParents.has(parent.id) ? (
                                        <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                      ) : (
                                        <Square className="h-[18px] w-[18px] text-slate-300 transition-colors hover:text-slate-500 dark:text-gray-700 dark:text-gray-200 dark:hover:text-gray-500" />
                                      )}
                                    </button>
                                  </td>
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
                                          <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_7e0c21f8" /> {parent.parentId}
                                        </p>
                                      ) : null}
                                      <p className="mt-1 text-xs font-medium text-slate-400 dark:text-gray-500">
                                        {parent.linkedStudents.length} <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_fa9e5e18" />{parent.linkedStudents.length === 1 ? '' : 's'}
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
                                              <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_ad13aa31" />
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
                                        +{parent.linkedStudents.length - 2} <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_888d7e8a" />
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
                                      <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_6ed3af0c" />
                                    </button>
                                  ) : (
                                    <div className="max-w-xs rounded-[0.95rem] border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs font-medium leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                      <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_97a5df03" />
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

      {selectedParents.size > 0 && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 lg:left-[calc(50%+128px)]">
          <AnimatedContent animation="slide-up" delay={0}>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-900/90 px-6 py-4 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/20 dark:bg-slate-950/90">
              <div className="flex items-center gap-3 border-r border-white/10 pr-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 font-bold text-white shadow-lg shadow-blue-500/20">
                  {selectedParents.size}
                </div>
                <p className="text-sm font-bold">{t('selected', { count: selectedParents.size })}</p>
              </div>

              <div className="flex items-center gap-2 px-2">
                <button
                  type="button"
                  onClick={() => {
                    alert('Bulk Password Reset triggered for ' + selectedParents.size + ' parents.');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  <Lock className="h-4 w-4" />
                  <AutoI18nText i18nKey="auto.web.app_locale_parents_page.k_6ed3af0c" />
                </button>
              </div>

              <div className="border-l border-white/10 pl-2">
                <button
                  type="button"
                  onClick={() => setSelectedParents(new Set())}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  title={t('clearSelection')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </AnimatedContent>
        </div>
      )}

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
