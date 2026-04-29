'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import {
  getEligibleStudents,
  getPromotionPreview,
  promoteStudents,
  type EligibleStudentsResponse,
  type PromotionPreviewResponse,
  type PromotionRequest,
} from '@/lib/api/promotion';
import { type AcademicYear } from '@/lib/api/academic-years';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

type FlowStep = 1 | 2 | 3 | 4 | 5;

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  tone: 'amber' | 'sky' | 'emerald' | 'slate';
}) {
  const tones = {
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/30',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/30',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/30',
    slate:
      'border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/80 shadow-slate-200/30',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.26)] ring-1 ring-white/75 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function StepPill({
  step,
  label,
  active,
  complete,
}: {
  step: number;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[1.15rem] px-4 py-3 ${
        active
          ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
          : complete
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-transparent text-slate-400'
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${
          active
            ? 'bg-white dark:bg-gray-900 text-slate-950'
            : complete
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-200 text-slate-400'
        }`}
      >
        {complete ? <CheckCircle2 className="h-5 w-5" /> : step}
      </div>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${active ? 'text-white/60' : complete ? 'text-emerald-600' : 'text-slate-400'}`}>
          Step 0{step}
        </p>
        <p className="mt-1 text-sm font-bold">{label}</p>
      </div>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

export default function PromotionWizardPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale as string);
  const fromYearId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { schoolId: contextSchoolId } = useAcademicYear();
  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;
  const schoolId = contextSchoolId || user?.schoolId || school?.id;
  const { years: allYears, isLoading: isLoadingYears } = useAcademicYearsList(schoolId);

  const [step, setStep] = useState<FlowStep>(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [fromYear, setFromYear] = useState<AcademicYear | null>(null);
  const [toYear, setToYear] = useState<AcademicYear | null>(null);
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudentsResponse | null>(null);
  const [preview, setPreview] = useState<PromotionPreviewResponse | null>(null);
  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [result, setResult] = useState<any>(null);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const token = TokenManager.getAccessToken();
        if (!token || !schoolId || isLoadingYears) return;

        const currentYear = allYears.find((year) => year.id === fromYearId) || null;
        setFromYear(currentYear);

        if (currentYear) {
          const nextYear = allYears
            .filter((year) => year.id !== fromYearId)
            .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime())
            .find((year) => new Date(year.startDate) > new Date(currentYear.endDate));

          setToYear(nextYear || null);
        }

        const eligible = await getEligibleStudents(schoolId, fromYearId, token || undefined);
        setEligibleStudents(eligible);
      } catch (err: any) {
        setError(err.message || 'Unable to load promotion data.');
      } finally {
        setLoading(false);
      }
    }

    if (!schoolId || !fromYearId) {
      setLoading(false);
      return;
    }

    if (isLoadingYears && allYears.length === 0) return;
    loadData();
  }, [allYears, fromYearId, isLoadingYears, schoolId]);

  useEffect(() => {
    async function loadPreview() {
      if (!toYear || !schoolId || !eligibleStudents) return;

      try {
        setError('');
        const token = TokenManager.getAccessToken();
        const previewData = await getPromotionPreview(schoolId, fromYearId, toYear.id, token || undefined);
        setPreview(previewData);

        const requests: PromotionRequest[] = [];
        eligibleStudents.classesByGrade?.forEach((classData) => {
          const classPreview = previewData.preview.find((item) => item.fromClass.id === classData.class.id);
          if (!classPreview || classPreview.willGraduate) return;

          const targetClass = classPreview.targetClasses[0];
          if (!targetClass) return;

          classData.students.forEach((student) => {
            requests.push({
              studentId: student.id,
              fromClassId: classData.class.id,
              toClassId: targetClass.id,
              promotionType: 'AUTOMATIC',
            });
          });
        });

        setPromotions(requests);
      } catch (err: any) {
        setError(err.message || 'Unable to generate the promotion preview.');
      }
    }

    loadPreview();
  }, [eligibleStudents, fromYearId, schoolId, toYear]);

  const handlePromote = async () => {
    if (!toYear || !schoolId) return;
    if (!promotions.length) {
      setError('No students are ready for promotion from this cycle.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      const token = TokenManager.getAccessToken();
      const response = await promoteStudents(
        schoolId,
        fromYearId,
        toYear.id,
        promotions,
        user?.id || 'SYSTEM',
        token || undefined
      );
      setResult(response);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to promote students.');
    } finally {
      setProcessing(false);
    }
  };

  const previewSummary = preview?.summary;
  const blockedClasses = preview?.preview.filter((item) => !item.willGraduate && item.targetClasses.length === 0).length || 0;
  const graduatingClasses = preview?.preview.filter((item) => item.willGraduate).length || 0;
  const readyScore = Math.min(100, 22 + step * 14 + (preview ? 14 : 0) + (result ? 8 : 0));

  const promotedResult = result?.results?.promoted ?? result?.results?.successCount ?? 0;
  const repeatedResult = result?.results?.repeated ?? 0;
  const graduatedResult = result?.results?.graduated ?? 0;
  const failedResult = result?.results?.failed ?? result?.results?.failureCount ?? 0;
  const resultErrors = result?.results?.errors ?? [];

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.15),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 lg:ml-64">
          <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">Loading promotion workspace...</p>
          </div>
        </div>
      </>
    );
  }

  if (!fromYear) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] px-6 py-10 lg:ml-64">
          <div className="mx-auto max-w-2xl rounded-[1.8rem] border border-red-100 bg-white dark:bg-none dark:bg-gray-900/90 p-8 text-center shadow-[0_30px_80px_-42px_rgba(15,23,42,0.28)] ring-1 ring-red-100/80">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-red-50 text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Unable to load promotion data</h3>
            <p className="mt-3 text-sm text-slate-500">The academic year could not be found or is no longer accessible.</p>
            <button
              onClick={() => router.push(`/${locale}/settings/academic-years`)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to academic years
            </button>
          </div>
        </div>
      </>
    );
  }

  if (fromYear.isPromotionDone) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] px-6 py-10 lg:ml-64">
          <div className="mx-auto max-w-3xl rounded-[1.85rem] border border-amber-100 bg-white dark:bg-none dark:bg-gray-900/90 p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.28)] ring-1 ring-amber-100/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-amber-50 text-amber-600">
              <History className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Promotion already completed</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Students from <strong>{fromYear.name}</strong> have already been promoted. Running this flow again is blocked so the system does not create duplicate year-end movement.
            </p>
            <button
              onClick={() => router.push(`/${locale}/settings/academic-years`)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to academic years
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_50%,#f8fafc_100%)] lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_360px]">
              <div className="overflow-hidden rounded-[1.95rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(255,247,237,0.96)_54%,rgba(239,246,255,0.9))] p-6 shadow-[0_38px_110px_-48px_rgba(249,115,22,0.32)] ring-1 ring-orange-100/70 sm:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <button
                      onClick={() => router.push(`/${locale}/settings/academic-years`)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to academic years
                    </button>
                    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.3em] text-orange-500">Promotion Workflow</p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-[2.65rem]">
                      Promote students into the next academic cycle with confidence.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
                      Review the target year, inspect class-by-class movement, and run the transition with a clearer enterprise workflow.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                        <CalendarDays className="h-4 w-4 text-orange-500" />
                        From {fromYear.name}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                        <ArrowRight className="h-4 w-4 text-sky-500" />
                        {toYear ? `To ${toYear.name}` : 'Target year not available'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.9rem] border border-orange-200/70 bg-[linear-gradient(145deg,rgba(120,53,15,0.96),rgba(146,64,14,0.94)_48%,rgba(30,64,175,0.88))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(120,53,15,0.56)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-100/80">Promotion Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{readyScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-orange-100/75">Ready</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <Sparkles className="h-7 w-7 text-orange-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-200 via-amber-200 to-sky-200"
                    style={{ width: `${readyScore}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Step', value: step },
                    { label: 'Ready', value: promotions.length },
                    { label: 'Blocked', value: blockedClasses },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-orange-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold text-orange-50/90">
                  {toYear ? 'Next year target is aligned' : 'Next year setup is still missing'}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Students" value={previewSummary?.totalStudents ?? eligibleStudents?.totalStudents ?? 0} helper="Total learners in the source year" tone="sky" />
              <MetricCard label="Promoting" value={previewSummary?.promotingStudents ?? promotions.length} helper="Students ready to move" tone="emerald" />
              <MetricCard label="Graduating" value={previewSummary?.graduatingStudents ?? graduatingClasses} helper="Completing the final grade" tone="amber" />
              <MetricCard label="Classes" value={previewSummary?.totalClasses ?? eligibleStudents?.classesByGrade?.length ?? 0} helper="Source classes in this run" tone="slate" />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.08}>
            <div className="mt-5 overflow-x-auto rounded-[1.55rem] border border-white/70 bg-white dark:bg-gray-900/80 p-2 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex min-w-max gap-2">
                {[
                  { id: 1, label: 'Target Year' },
                  { id: 2, label: 'Preview' },
                  { id: 3, label: 'Assignments' },
                  { id: 4, label: 'Confirm' },
                  { id: 5, label: 'Results' },
                ].map((item) => (
                  <StepPill key={item.id} step={item.id} label={item.label} active={item.id === step} complete={item.id < step} />
                ))}
              </div>
            </div>
          </AnimatedContent>

          {error ? (
            <AnimatedContent delay={0.1}>
              <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.12}>
            <div className="mt-5 space-y-5">
              {step === 1 ? (
                toYear ? (
                  <SectionCard
                    eyebrow="Target"
                    title="Confirm the next academic year"
                    description="The system selected the next cycle automatically based on dates. Review it before continuing."
                    action={
                      <button
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    }
                  >
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_300px]">
                      <div className="rounded-[1.35rem] border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-indigo-50/60 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Selected Target</p>
                        <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{toYear.name}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {formatDateLabel(toYear.startDate)} - {formatDateLabel(toYear.endDate)}
                        </p>
                        <div className="mt-4 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                          {toYear.status}
                        </div>
                      </div>
                      <div className="rounded-[1.35rem] border border-emerald-100 bg-emerald-50/80 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Why This Year</p>
                        <p className="mt-3 text-sm font-semibold text-emerald-900">It is the next configured academic cycle after {fromYear.name}.</p>
                        <p className="mt-2 text-sm leading-6 text-emerald-800">Students will move forward one grade band and graduating classes will exit the cycle.</p>
                      </div>
                    </div>
                  </SectionCard>
                ) : (
                  <SectionCard
                    eyebrow="Target"
                    title="No next academic year is available"
                    description="Create the next academic year first so student promotion has a valid destination."
                  >
                    <div className="rounded-[1.4rem] border border-amber-100 bg-amber-50/80 p-5">
                      <p className="text-sm font-semibold text-amber-900">There is no year configured after {fromYear.name}.</p>
                      <p className="mt-2 text-sm leading-6 text-amber-800">Set up the next academic year before promoting students from this cycle.</p>
                      <button
                        onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Create next academic year
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </SectionCard>
                )
              ) : null}

              {step === 2 && preview ? (
                <SectionCard
                  eyebrow="Preview"
                  title="Review promotion preview"
                  description={`Preview movement from ${fromYear.name} into ${toYear?.name || 'the next cycle'} before any write happens.`}
                  action={
                    <button
                      onClick={() => setStep(3)}
                      disabled={!promotions.length}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                >
                  <div className="space-y-4">
                    {preview.preview.map((classPreview) => (
                      <div key={classPreview.fromClass.id} className="rounded-[1.3rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Source Class</p>
                            <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">{classPreview.fromClass.name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{classPreview.studentCount} students · Grade {classPreview.fromClass.grade}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-slate-100 dark:bg-gray-800 text-slate-500">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                            {classPreview.willGraduate ? (
                              <div className="rounded-[0.95rem] border border-violet-100 bg-violet-50 px-4 py-3 text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-500">Exit</p>
                                <p className="mt-1 text-sm font-semibold text-violet-700">Graduating</p>
                              </div>
                            ) : classPreview.targetClasses.length > 0 ? (
                              <div className="rounded-[0.95rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500">Target</p>
                                <p className="mt-1 text-sm font-semibold text-emerald-700">{classPreview.targetClasses.map((item) => item.name).join(', ')}</p>
                              </div>
                            ) : (
                              <div className="rounded-[0.95rem] border border-rose-100 bg-rose-50 px-4 py-3 text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">Blocked</p>
                                <p className="mt-1 text-sm font-semibold text-rose-700">No target class</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : null}

              {step === 3 ? (
                <SectionCard
                  eyebrow="Assignment Check"
                  title="Review generated assignments"
                  description="The system mapped students automatically using the previewed target class for each source roster."
                  action={
                    <button
                      onClick={() => setStep(4)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Continue to confirm
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard label="Promotion Requests" value={promotions.length} helper="Students with a generated target class" tone="emerald" />
                    <MetricCard label="Blocked Classes" value={blockedClasses} helper="Classes still missing a valid target" tone="amber" />
                    <MetricCard label="Graduating Classes" value={graduatingClasses} helper="Classes that exit the cycle" tone="sky" />
                  </div>
                </SectionCard>
              ) : null}

              {step === 4 ? (
                <SectionCard
                  eyebrow="Confirm"
                  title="Finalize the promotion run"
                  description="Check the scope carefully before the system writes progression data and class placement changes."
                  action={
                    <button
                      onClick={handlePromote}
                      disabled={processing || !promotions.length}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_20px_45px_-24px_rgba(16,185,129,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {processing ? 'Promoting students...' : 'Confirm and promote'}
                    </button>
                  }
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                    <div className="rounded-[1.35rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Promotion Summary</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1rem] bg-white dark:bg-gray-900 px-4 py-4 ring-1 ring-slate-200/70">
                          <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">From</p>
                          <p className="mt-2 text-sm font-bold text-slate-950">{fromYear.name}</p>
                        </div>
                        <div className="rounded-[1rem] bg-white dark:bg-gray-900 px-4 py-4 ring-1 ring-slate-200/70">
                          <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">To</p>
                          <p className="mt-2 text-sm font-bold text-slate-950">{toYear?.name || 'Missing target'}</p>
                        </div>
                        <div className="rounded-[1rem] bg-white dark:bg-gray-900 px-4 py-4 ring-1 ring-slate-200/70">
                          <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">Students</p>
                          <p className="mt-2 text-sm font-bold text-slate-950">{promotions.length}</p>
                        </div>
                        <div className="rounded-[1rem] bg-white dark:bg-gray-900 px-4 py-4 ring-1 ring-slate-200/70">
                          <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">Source Classes</p>
                          <p className="mt-2 text-sm font-bold text-slate-950">{previewSummary?.totalClasses ?? 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.35rem] border border-amber-100 bg-amber-50/80 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Important</p>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-900">
                        <li>This writes progression history for the selected students.</li>
                        <li>Graduating classes will exit rather than move into a target class.</li>
                        <li>Only classes with valid targets are included in the automatic run.</li>
                      </ul>
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {step === 5 && result ? (
                <SectionCard
                  eyebrow="Results"
                  title="Promotion completed"
                  description="The system finished the transition and recorded the result of each student movement."
                  action={
                    <button
                      onClick={() => router.push(`/${locale}/settings/academic-years`)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Return to academic years
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Promoted" value={promotedResult} helper="Students successfully moved" tone="emerald" />
                    <MetricCard label="Repeated" value={repeatedResult} helper="Students kept in the same cycle" tone="amber" />
                    <MetricCard label="Graduated" value={graduatedResult} helper="Students completing the final grade" tone="sky" />
                    <MetricCard label="Errors" value={failedResult} helper="Students needing manual review" tone="slate" />
                  </div>

                  {resultErrors.length > 0 ? (
                    <div className="mt-5 rounded-[1.35rem] border border-rose-100 bg-rose-50/80 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-500">Error Log</p>
                      <div className="mt-4 space-y-3">
                        {resultErrors.map((item: any, index: number) => (
                          <div key={`${item.studentId || 'error'}-${index}`} className="rounded-[1rem] border border-white/80 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-slate-700 dark:text-gray-200 ring-1 ring-rose-100/70">
                            Student {item.studentId}: {item.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </SectionCard>
              ) : null}
            </div>
          </AnimatedContent>

          {step > 1 && step < 5 ? (
            <AnimatedContent delay={0.14}>
              <div className="mt-6 flex justify-start">
                <button
                  onClick={() => setStep((current) => Math.max(1, current - 1) as FlowStep)}
                  className="inline-flex items-center gap-2 rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            </AnimatedContent>
          ) : null}
        </div>
      </div>
    </>
  );
}
