'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { archiveAcademicYear, updateAcademicYear } from '@/lib/api/academic-years';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Loader2,
  Lock,
  TrendingUp,
  X,
} from 'lucide-react';

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StepPill({
  number,
  label,
  helper,
  active,
  current,
}: {
  number: number;
  label: string;
  helper: string;
  active: boolean;
  current: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black transition-all ${
          active
            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/20'
            : 'border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 text-slate-400 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-gray-500'
        } ${current ? 'ring-4 ring-orange-500/10' : ''}`}
      >
        {number}
      </div>
      <div className="hidden sm:block">
        <p
          className={`text-[10px] font-black uppercase tracking-[0.22em] ${
            active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-500'
          }`}
        >
          {label}
        </p>
        <p
          className={`mt-1 text-xs font-semibold ${
            active ? 'text-orange-600 dark:text-orange-300' : 'text-slate-400 dark:text-gray-500'
          }`}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'amber' | 'emerald' | 'slate';
  icon: LucideIcon;
}) {
  const tones = {
    amber: {
      surface:
        'from-amber-400 via-orange-500 to-rose-500 shadow-amber-200/70 dark:shadow-orange-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    emerald: {
      surface:
        'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-200/70 dark:shadow-emerald-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    slate: {
      surface: 'from-blue-500 via-cyan-500 to-sky-500 shadow-blue-200/70 dark:shadow-blue-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
  };
  const classes = tones[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-gradient-to-br ${classes.surface} p-5 text-white shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl dark:border-white/5`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${classes.glow}`} />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">{label}</p>
          <p className="mt-3 text-3xl font-black leading-none tracking-tight text-white">{value}</p>
          <div className="mt-3 inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-md">
            {helper}
          </div>
        </div>
        <div className={`rounded-[1rem] p-3.5 shadow-lg backdrop-blur-md ring-1 ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function YearEndWorkflowPage(props: { params: Promise<{ locale: string }> }) {
    const autoT = useTranslations();
  const params = use(props.params);
  const router = useRouter();
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const yearId = searchParams.get('yearId');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);

  const { years, isLoading: isLoadingYears, mutate: mutateYears } = useAcademicYearsList(school?.id);

  const currentYear = useMemo(() => {
    if (!years.length) return null;
    if (yearId) {
      return years.find((year) => year.id === yearId) || null;
    }
    return years.find((year) => year.isCurrent) || null;
  }, [yearId, years]);

  const loading = Boolean(school?.id) && isLoadingYears && years.length === 0;

  useEffect(() => {
    if (TokenManager.getAccessToken() && school?.id) return;
    router.push(`/${params.locale}/auth/login`);
  }, [params.locale, router, school?.id]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${params.locale}/auth/login`);
  };

  const handleCloseYear = async () => {
    if (!currentYear) return;

    try {
      setProcessing(true);
      setError('');
      const token = TokenManager.getAccessToken();
      if (!token || !school?.id) return;

      await updateAcademicYear(
        school.id,
        currentYear.id,
        {
          status: 'ENDED',
          isCurrent: false,
        },
        token
      );

      await mutateYears();
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to close academic year');
    } finally {
      setProcessing(false);
    }
  };

  const handleArchiveYear = async () => {
    if (!currentYear) return;

    try {
      setProcessing(true);
      setError('');
      const token = TokenManager.getAccessToken();
      if (!token || !school?.id) return;

      await archiveAcademicYear(school.id, currentYear.id, token);
      await mutateYears();
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to archive academic year');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" showFilters={false} />;
  }

  if (error && !currentYear) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-800/50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
            <AlertCircle className="mx-auto mb-3 h-12 w-12 text-rose-500" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-200"><AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_d9c4c285" /></h3>
            <p className="mt-2 text-rose-700 dark:text-rose-300">{error}</p>
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="mt-5 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_ca5b5f72" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentYear) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-800/50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[1.5rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center dark:border-gray-800 dark:bg-gray-900">
            <AlertCircle className="mx-auto mb-3 h-12 w-12 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_9aaf25ba" />
            </h3>
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-gray-900 dark:text-slate-950"
            >
              <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_ca5b5f72" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPromotionComplete = currentYear.isPromotionDone;
  const isClosed = currentYear.status === 'ENDED' || currentYear.status === 'ARCHIVED';
  const isArchived = currentYear.status === 'ARCHIVED';

  const progressStep = isArchived ? 5 : isClosed ? 4 : step;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] py-8 text-slate-900 transition-colors duration-500 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1120_52%,#020617_100%)] dark:text-white lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <CompactHeroCard
              icon={Archive}
              eyebrow="Year Closing"
              title={autoT("auto.web.year_end_workflow_page.k_0995dfcd")}
              description="Confirm promotion readiness, close the cycle, then archive records."
              chipsPosition="below"
              backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_54%,#fffbeb_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
              glowClassName="bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.14),transparent_58%)] dark:opacity-50"
              eyebrowClassName="text-orange-700 dark:text-orange-300"
              iconShellClassName="bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
              breadcrumbs={
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                  <button
                    onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                    className="inline-flex items-center gap-2 transition hover:text-slate-900 dark:text-white dark:hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_315c5266" />
                  </button>
                  <ChevronRight className="h-4 w-4" />
                  <span><AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_35e33a7b" /></span>
                </div>
              }
              chips={
                <>
                  <span className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_7df6e8ef" /> {currentYear.name}
                  </span>
                  <span className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    {formatDateLabel(currentYear.startDate)} - {formatDateLabel(currentYear.endDate)}
                  </span>
                </>
              }
            />

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-gray-800 dark:bg-gray-900/95 dark:text-gray-100">
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_28ca92cf" />
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-gray-100">
                      0{progressStep}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {isArchived
                        ? 'Cycle archived'
                        : isClosed
                          ? 'Cycle closed and ready for archive'
                          : 'Guided sequence in progress'}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/15">
                    <Lock className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-700"
                    style={{ width: `${progressStep * 20}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="text-xl font-black text-slate-900 dark:text-gray-100">
                      {isPromotionComplete ? 'Yes' : 'No'}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_4955020d" />
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="text-xl font-black text-slate-900 dark:text-gray-100">
                      {currentYear.status}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_23ba93fe" />
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_e067d4f4" />
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-gray-200">
                    {isArchived
                      ? 'This cycle is already completed.'
                      : isClosed
                        ? 'Archive the closed cycle for record keeping.'
                        : isPromotionComplete
                          ? 'Close the cycle once you are ready.'
                          : 'Finish promotion before closure.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-6 flex items-start justify-between gap-4 rounded-[1rem] border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="rounded p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-gray-900/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
              <StepPill number={1} label={autoT("auto.web.year_end_workflow_page.k_25cf9070")} helper="Check readiness" active={progressStep >= 1} current={progressStep === 1} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={2} label={autoT("auto.web.year_end_workflow_page.k_e85252bb")} helper="Verify transition" active={progressStep >= 2} current={progressStep === 2} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={3} label={autoT("auto.web.year_end_workflow_page.k_467b861a")} helper="Authorize close" active={progressStep >= 3} current={progressStep === 3} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={4} label={autoT("auto.web.year_end_workflow_page.k_f9219abf")} helper="End cycle" active={progressStep >= 4} current={progressStep === 4} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={5} label={autoT("auto.web.year_end_workflow_page.k_85b3c9b9")} helper="Store records" active={progressStep >= 5} current={progressStep === 5} />
            </section>
          </AnimatedContent>

          {progressStep === 1 && (
            <>
              <AnimatedContent animation="slide-up" delay={80}>
                <section className="mt-5 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label={autoT("auto.web.year_end_workflow_page.k_1c59be6f")}
                    value={currentYear.status}
                    helper="Current academic-year state."
                    tone="amber"
                    icon={FileCheck2}
                  />
                  <MetricCard
                    label={autoT("auto.web.year_end_workflow_page.k_e85252bb")}
                    value={isPromotionComplete ? 'Ready' : 'Pending'}
                    helper="Student progression must be complete first."
                    tone={isPromotionComplete ? 'emerald' : 'slate'}
                    icon={isPromotionComplete ? CheckCircle2 : TrendingUp}
                  />
                  <MetricCard
                    label={autoT("auto.web.year_end_workflow_page.k_92c50b0d")}
                    value={currentYear.isCurrent ? 'Live' : 'Off'}
                    helper="Current cycle flag will be removed on close."
                    tone="slate"
                    icon={Lock}
                  />
                </section>
              </AnimatedContent>

              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                  <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_fdc50424" />
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_a4c7e48a" />
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_15704fc8" />
                    </p>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-5 dark:border-gray-800/70 dark:bg-gray-950/60">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                        <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_238102fd" />
                      </p>
                      <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                        {currentYear.name}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                        {formatDateLabel(currentYear.startDate)} - {formatDateLabel(currentYear.endDate)}
                      </p>
                    </div>

                    <div
                      className={`rounded-[1rem] border p-5 ${
                        isPromotionComplete
                          ? 'border-emerald-100 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                          : 'border-amber-100 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isPromotionComplete ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                          <TrendingUp className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                        )}
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white">
                            {isPromotionComplete
                              ? 'Promotion has been completed for this year.'
                              : 'Promotion still needs to be completed.'}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                            {isPromotionComplete
                              ? 'You can safely move into closure approval.'
                              : 'Run the promotion workflow first so student progression data stays correct.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                      className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                    >
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_ca5b5f72" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                    >
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_d8340f91" />
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </section>
              </AnimatedContent>
            </>
          )}

          {progressStep === 2 && (
            <AnimatedContent animation="slide-up" delay={100}>
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_78a2e0c8" />
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_efdab706" />
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_88315c84" />
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div
                    className={`rounded-[1.15rem] border p-6 ${
                      isPromotionComplete
                        ? 'border-emerald-100 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                        : 'border-amber-100 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${
                          isPromotionComplete
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isPromotionComplete ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <TrendingUp className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                          {isPromotionComplete
                            ? 'Promotion verified'
                            : 'Promotion still pending'}
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-gray-400">
                          {isPromotionComplete
                            ? 'You can proceed to cycle closure.'
                            : 'Open the promotion workspace for this year, complete the student transition, and then return here.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                  >
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_487dd32e" />
                  </button>
                  {!isPromotionComplete && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/${params.locale}/settings/promotion?yearId=${currentYear.id}`)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-600 hover:text-white dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300"
                    >
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_b9fe49c9" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!isPromotionComplete}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_d8340f91" />
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            </AnimatedContent>
          )}

          {progressStep === 3 && (
            <AnimatedContent animation="slide-up" delay={100}>
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_0992d067" />
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_1b0a607c" />
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_535d735d" />
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="rounded-[1.15rem] border border-rose-100 bg-rose-50/80 p-5 dark:border-rose-500/20 dark:bg-rose-500/10">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-300" />
                      <div>
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_83d6fd2c" />
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                          <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_c2c4b90a" />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                  >
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_487dd32e" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseYear}
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-rose-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_218cb6e2" />
                  </button>
                </div>
              </section>
            </AnimatedContent>
          )}

          {progressStep === 4 && (
            <>
              <AnimatedContent animation="slide-up" delay={80}>
                <section className="mt-5 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label={autoT("auto.web.year_end_workflow_page.k_1c59be6f")}
                    value="Ended"
                    helper="The academic cycle is now closed."
                    tone="amber"
                    icon={Archive}
                  />
                  <MetricCard
                    label={autoT("auto.web.year_end_workflow_page.k_92c50b0d")}
                    value="Removed"
                    helper="The cycle is no longer marked as current."
                    tone="slate"
                    icon={Lock}
                  />
                  <MetricCard
                    label={autoT("auto.web.year_end_workflow_page.k_85b3c9b9")}
                    value="Ready"
                    helper="You can now store this cycle historically."
                    tone="emerald"
                    icon={FileCheck2}
                  />
                </section>
              </AnimatedContent>

              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                  <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_f0b4bd18" />
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_1f75dacc" />
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_56a46144" />
                    </p>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-5 dark:border-gray-800/70 dark:bg-gray-950/60">
                      <div className="flex items-start gap-3">
                        <Archive className="mt-0.5 h-5 w-5 text-slate-600 dark:text-gray-300" />
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white">
                            <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_f0b4bd18" /> {currentYear.name} <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_3a01eacd" />
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                            <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_84ccc66a" />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                      className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                    >
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_2e6c941f" />
                    </button>
                    <button
                      type="button"
                      onClick={handleArchiveYear}
                      disabled={processing}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900 dark:text-slate-950 dark:shadow-white/10"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                      <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_a2f4c89f" />
                    </button>
                  </div>
                </section>
              </AnimatedContent>
            </>
          )}

          {progressStep === 5 && (
            <AnimatedContent animation="slide-up" delay={100}>
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                <div className="p-8 text-center sm:p-10">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                    <FileCheck2 className="h-10 w-10" />
                  </div>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_b06e3449" />
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_41c13cab" />
                  </h2>
                  <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">
                    {currentYear.name} <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_302b9602" />
                  </p>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                    className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                  >
                    <AutoI18nText i18nKey="auto.web.year_end_workflow_page.k_ca5b5f72" />
                  </button>
                </div>
              </section>
            </AnimatedContent>
          )}
        </main>
      </div>
    </>
  );
}
