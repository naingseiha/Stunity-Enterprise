'use client';

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
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'amber' | 'emerald' | 'slate';
}) {
  const tones = {
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/75 shadow-amber-100/40',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/75 shadow-emerald-100/40',
    slate:
      'border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/80 shadow-slate-200/40',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.28)] ring-1 ring-white/70 dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
    </div>
  );
}

export default function YearEndWorkflowPage(props: { params: Promise<{ locale: string }> }) {
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
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-200">Error</h3>
            <p className="mt-2 text-rose-700 dark:text-rose-300">{error}</p>
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="mt-5 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Back to Academic Years
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
              Academic year not found
            </h3>
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-gray-900 dark:text-slate-950"
            >
              Back to Academic Years
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

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] py-8 text-slate-900 dark:text-white transition-colors duration-500 dark:bg-none dark:bg-gray-950 dark:text-white lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="inline-flex items-center gap-2 transition hover:text-slate-900 dark:text-white dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Academic Years
            </button>
            <ChevronRight className="h-4 w-4" />
            <span>Year-End Workflow</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <CompactHeroCard
              icon={Archive}
              eyebrow="Year Closing"
              title="Year-end workflow"
              description="Review readiness, confirm promotion, and close the cycle from one guided workspace."
              chipsPosition="below"
              backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_54%,#fffbeb_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
              glowClassName="bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_58%)] dark:opacity-50"
              eyebrowClassName="text-orange-700 dark:text-orange-300"
              iconShellClassName="bg-gradient-to-br from-amber-600 to-orange-500 text-white"
              breadcrumbs={
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                  <button
                    onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                    className="inline-flex items-center gap-2 transition hover:text-slate-900 dark:text-white dark:hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Academic Years
                  </button>
                  <ChevronRight className="h-4 w-4" />
                  <span>Year-End Workflow</span>
                </div>
              }
              chips={
                <>
                  <span className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    Cycle: {currentYear.name}
                  </span>
                  <span className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    {formatDateLabel(currentYear.startDate)} - {formatDateLabel(currentYear.endDate)}
                  </span>
                </>
              }
            />

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-6 text-white shadow-[0_40px_120px_-48px_rgba(15,23,42,0.62)] ring-1 ring-white/10 dark:border-gray-800/90">
              <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="absolute -right-14 top-6 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/60">
                      Workflow Status
                    </p>
                    <h2 className="mt-3 text-4xl font-black tracking-tight">0{progressStep}</h2>
                    <p className="mt-2 text-sm font-medium text-white/70">
                      {isArchived
                        ? 'Cycle archived'
                        : isClosed
                          ? 'Cycle closed and ready for archive'
                          : 'Guided sequence in progress'}
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white dark:bg-none dark:bg-gray-900/10 ring-1 ring-white/10">
                    <Lock className="h-7 w-7 text-amber-200" />
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-300 via-amber-300 to-yellow-200 transition-all duration-700"
                    style={{ width: `${progressStep * 20}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.15rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 p-4">
                    <p className="text-2xl font-black">{isPromotionComplete ? 'Yes' : 'No'}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                      Promotion Done
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/10 bg-white dark:bg-gray-900/5 p-4">
                    <p className="text-2xl font-black">{currentYear.status}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                      Current Status
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white dark:bg-gray-900/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                    Next Action
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
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
            <section className="mt-5 flex flex-wrap items-center justify-center gap-4 rounded-[1.25rem] border border-white/70 bg-white dark:bg-gray-900/80 px-5 py-4 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
              <StepPill number={1} label="Review" helper="Check readiness" active={progressStep >= 1} current={progressStep === 1} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={2} label="Promotion" helper="Verify transition" active={progressStep >= 2} current={progressStep === 2} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={3} label="Approve" helper="Authorize close" active={progressStep >= 3} current={progressStep === 3} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={4} label="Close" helper="End cycle" active={progressStep >= 4} current={progressStep === 4} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepPill number={5} label="Archive" helper="Store records" active={progressStep >= 5} current={progressStep === 5} />
            </section>
          </AnimatedContent>

          {progressStep === 1 && (
            <>
              <AnimatedContent animation="slide-up" delay={80}>
                <section className="mt-5 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="Cycle Status"
                    value={currentYear.status}
                    helper="Current academic-year state."
                    tone="amber"
                  />
                  <MetricCard
                    label="Promotion"
                    value={isPromotionComplete ? 'Ready' : 'Pending'}
                    helper="Student progression must be complete first."
                    tone={isPromotionComplete ? 'emerald' : 'slate'}
                  />
                  <MetricCard
                    label="Current Flag"
                    value={currentYear.isCurrent ? 'Live' : 'Off'}
                    helper="Current cycle flag will be removed on close."
                    tone="slate"
                  />
                </section>
              </AnimatedContent>

              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
                  <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                      Review
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Cycle readiness
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Confirm which cycle you are closing and verify that promotion is complete
                      before moving forward.
                    </p>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-5 dark:border-gray-800/70 dark:bg-gray-950/60">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                        Selected cycle
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
                      Back to Academic Years
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </section>
              </AnimatedContent>
            </>
          )}

          {progressStep === 2 && (
            <AnimatedContent animation="slide-up" delay={100}>
              <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-none dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:ring-gray-800/70">
                <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                    Promotion Check
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Verify year-end promotion
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    The cycle should only be closed once student progression into the next year
                    has been reviewed or completed.
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
                    Back
                  </button>
                  {!isPromotionComplete && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/${params.locale}/settings/promotion?yearId=${currentYear.id}`)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-600 hover:text-white dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300"
                    >
                      Open Promotion
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!isPromotionComplete}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            </AnimatedContent>
          )}

          {progressStep === 3 && (
            <AnimatedContent animation="slide-up" delay={100}>
              <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
                <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                    Approval
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Authorize cycle closure
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Closing the year removes its current flag and marks the cycle as ended.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="rounded-[1.15rem] border border-rose-100 bg-rose-50/80 p-5 dark:border-rose-500/20 dark:bg-rose-500/10">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-300" />
                      <div>
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          This action ends the academic cycle.
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                          Use this only after promotion and year-end checks are complete.
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
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseYear}
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-rose-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Close Academic Year
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
                    label="Cycle Status"
                    value="Ended"
                    helper="The academic cycle is now closed."
                    tone="amber"
                  />
                  <MetricCard
                    label="Current Flag"
                    value="Removed"
                    helper="The cycle is no longer marked as current."
                    tone="slate"
                  />
                  <MetricCard
                    label="Archive"
                    value="Ready"
                    helper="You can now store this cycle historically."
                    tone="emerald"
                  />
                </section>
              </AnimatedContent>

              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
                  <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                      Archive
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Move the cycle to archive
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Archiving protects the closed cycle as historical reference and makes it
                      read-only.
                    </p>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-5 dark:border-gray-800/70 dark:bg-gray-950/60">
                      <div className="flex items-start gap-3">
                        <Archive className="mt-0.5 h-5 w-5 text-slate-600 dark:text-gray-300" />
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white">
                            Archive {currentYear.name} for long-term records.
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                            This is the final step of the workflow.
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
                      Finish Later
                    </button>
                    <button
                      type="button"
                      onClick={handleArchiveYear}
                      disabled={processing}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900 dark:text-slate-950 dark:shadow-white/10"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                      Archive Cycle
                    </button>
                  </div>
                </section>
              </AnimatedContent>
            </>
          )}

          {progressStep === 5 && (
            <AnimatedContent animation="slide-up" delay={100}>
              <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
                <div className="p-8 text-center sm:p-10">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                    <FileCheck2 className="h-10 w-10" />
                  </div>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
                    Completed
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Year-end workflow finished
                  </h2>
                  <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">
                    {currentYear.name} is now archived and stored as a historical cycle.
                  </p>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                    className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                  >
                    Back to Academic Years
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
