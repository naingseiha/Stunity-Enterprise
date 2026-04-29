'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import {
  getEligibleStudents,
  getPromotionPreview,
  promoteStudents,
  type EligibleStudentsResponse,
  type PromotionPreviewResponse,
  type PromotionRequest,
} from '@/lib/api/promotion';
import { STUDENT_SERVICE_URL } from '@/lib/api/config';
import { useSWRConfig } from 'swr';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Home,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';

interface MergedPreviewItem {
  fromClass: { id: string; name: string; grade: string; section: string | null };
  toClass: { id: string; name: string } | null;
  studentCount: number;
  students: Array<{ id: string; firstName: string; lastName: string }>;
  willGraduate: boolean;
}

function StepBadge({
  number,
  label,
  active,
  current,
}: {
  number: number;
  label: string;
  active: boolean;
  current: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black transition-all ${
          active
            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
            : 'border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 text-slate-400 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-gray-500'
        } ${current ? 'ring-4 ring-orange-500/10' : ''}`}
      >
        {number}
      </div>
      <div className="hidden sm:block">
        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-500'}`}>
          Step 0{number}
        </p>
        <p className={`mt-1 text-xs font-semibold ${active ? 'text-orange-600 dark:text-orange-300' : 'text-slate-400 dark:text-gray-500'}`}>
          {label}
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
  tone: 'orange' | 'emerald' | 'slate';
}) {
  const tones = {
    orange: 'border-orange-100/80 bg-gradient-to-br from-white via-orange-50/70 to-amber-50/75 shadow-orange-100/30',
    emerald: 'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/75 shadow-emerald-100/30',
    slate: 'border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 shadow-slate-200/30',
  };

  return (
    <div className={`rounded-[1.2rem] border p-5 shadow-xl ring-1 ring-white/60 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
    </div>
  );
}

export default function StudentPromotionPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;

  const router = useRouter();
  const t = useTranslations('common');
  const { mutate } = useSWRConfig();
  const { allYears: academicYears } = useAcademicYear();

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;
  const schoolId = user?.schoolId || school?.id;

  const [step, setStep] = useState(1);
  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudentsResponse | null>(null);
  const [previewData, setPreviewData] = useState<PromotionPreviewResponse | null>(null);
  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const resetFlow = () => {
    setStep(1);
    setFromYearId('');
    setToYearId('');
    setEligibleStudents(null);
    setPreviewData(null);
    setPromotions([]);
    setResults(null);
    setError('');
  };

  const handleLoadPreview = async () => {
    if (!fromYearId || !toYearId || !schoolId) {
      setError('Please select both academic years');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      const [eligible, preview] = await Promise.all([
        getEligibleStudents(schoolId, fromYearId, token || undefined),
        getPromotionPreview(schoolId, fromYearId, toYearId, token || undefined),
      ]);

      setEligibleStudents(eligible);
      setPreviewData(preview);

      const requests: PromotionRequest[] = [];
      eligible.classesByGrade?.forEach((classData) => {
        const classPreview = preview.preview.find((item) => item.fromClass.id === classData.class.id);
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
      setStep(2);
    } catch (err: any) {
      setError(`Error loading preview: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePromotion = async () => {
    if (!schoolId || promotions.length === 0) return;

    setExecuting(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      const userId = user?.id || 'SYSTEM';

      const response = await promoteStudents(
        schoolId,
        fromYearId,
        toYearId,
        promotions,
        userId,
        token || undefined
      );

      setResults(response);

      mutate(
        (key) => typeof key === 'string' && key.startsWith(`${STUDENT_SERVICE_URL}/students`),
        undefined,
        { revalidate: true }
      );

      setStep(4);
    } catch (err: any) {
      setError(`Error executing promotion: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const fromYear = academicYears.find((year) => year.id === fromYearId);
  const toYear = academicYears.find((year) => year.id === toYearId);

  const mergedPreview: MergedPreviewItem[] = useMemo(() => {
    if (!eligibleStudents || !previewData) return [];

    return (eligibleStudents.classesByGrade || [])
      .map((classData) => {
        const preview = previewData.preview.find((item) => item.fromClass.id === classData.class.id);
        if (!preview) return null;
        const targetClass = preview.willGraduate ? null : preview.targetClasses[0];
        return {
          fromClass: classData.class,
          toClass: targetClass ? { id: targetClass.id, name: targetClass.name } : null,
          studentCount: classData.studentCount,
          students: classData.students.map((student) => ({
            id: student.id,
            firstName: student.firstName || '',
            lastName: student.lastName || '',
          })),
          willGraduate: preview.willGraduate,
        };
      })
      .filter(Boolean) as MergedPreviewItem[];
  }, [eligibleStudents, previewData]);

  const promotableStudents = mergedPreview
    .filter((item) => !item.willGraduate && item.toClass)
    .reduce((sum, item) => sum + item.studentCount, 0);
  const totalStudents = mergedPreview.reduce((sum, item) => sum + item.studentCount, 0);
  const graduatingStudents = mergedPreview
    .filter((item) => item.willGraduate)
    .reduce((sum, item) => sum + item.studentCount, 0);
  const blockedStudents = mergedPreview
    .filter((item) => !item.willGraduate && !item.toClass)
    .reduce((sum, item) => sum + item.studentCount, 0);
  const blockedClasses = mergedPreview.filter((item) => !item.willGraduate && !item.toClass).length;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800/50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-12">
              <div className="relative overflow-hidden rounded-[1.65rem] border border-white/70 bg-white dark:bg-gray-900/80 p-6 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70 xl:col-span-8 sm:p-7">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-orange-100/60 to-transparent blur-3xl dark:from-orange-500/10" />
                <div className="relative z-10">
                  <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                    <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:text-gray-200 dark:hover:text-gray-300">
                      <Home className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <span className="transition-colors hover:text-slate-700 dark:text-gray-200 dark:hover:text-gray-300">Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-900 dark:text-white">Promotion</span>
                  </nav>

                  <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                        <Settings className="h-3.5 w-3.5" />
                        Student Promotion
                      </div>
                      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-[2.2rem]">
                        Promotion Workflow
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-gray-400 sm:text-[15px]">
                        Review eligible students, verify target placement paths, and execute year-end promotion with a clearer administrative flow.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <button
                        type="button"
                        onClick={resetFlow}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200 dark:bg-gray-900/5 dark:text-slate-300 dark:ring-white/10">
                      4-step workflow
                    </span>
                    <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                      Year-end operations
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                      Promotion control
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.65rem] border border-orange-300/80 bg-gradient-to-br from-white via-orange-100/80 to-amber-100/90 p-6 text-slate-900 dark:text-white shadow-[0_8px_32px_-8px_rgba(249,115,22,0.25)] ring-1 ring-orange-200/80 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-orange-300/20 blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Workflow Status</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">0{step}</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">current step</span>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/75 text-orange-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-orange-200/75">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 transition-all duration-700"
                      style={{ width: `${step * 25}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/60">
                      <p className="text-xl font-black tracking-tight">{totalStudents}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Visible</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/60">
                      <p className="text-xl font-black tracking-tight">{promotableStudents}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Ready</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-orange-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-orange-200/60">
                      <p className="text-xl font-black tracking-tight">{graduatingStudents}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Graduate</p>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center rounded-full border border-orange-200/80 bg-white dark:bg-gray-900/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                    {step === 1
                      ? 'Choose source and target years'
                      : step === 2
                        ? 'Preview the placement matrix'
                        : step === 3
                          ? 'Confirm execution'
                          : 'Promotion complete'}
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 flex flex-wrap items-center justify-center gap-4 rounded-[1.25rem] border border-white/70 bg-white dark:bg-gray-900/80 px-5 py-4 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
              <StepBadge number={1} label="Configuration" active={step >= 1} current={step === 1} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepBadge number={2} label="Preview" active={step >= 2} current={step === 2} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepBadge number={3} label="Execute" active={step >= 3} current={step === 3} />
              <div className="hidden h-px w-8 bg-slate-200 dark:bg-gray-800 sm:block" />
              <StepBadge number={4} label="Complete" active={step >= 4} current={step === 4} />
            </section>
          </AnimatedContent>

          {error ? (
            <AnimatedContent animation="slide-up" delay={60}>
              <div className="mt-5 flex items-start justify-between gap-4 rounded-[1rem] border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button type="button" onClick={() => setError('')} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-gray-900/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          {step === 1 ? (
            <AnimatedContent animation="slide-up" delay={80}>
              <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
                <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Configuration</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Year mapping</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Choose the current academic year as the source and the next academic year as the target.
                  </p>
                </div>

                <div className="space-y-6 p-5 sm:p-6">
                  {fromYear?.isPromotionDone ? (
                    <div className="rounded-[1rem] border border-amber-100 bg-amber-50/80 p-4 text-sm font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">{fromYear.name} has already been promoted.</p>
                          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-200/80">
                            This source year is locked to protect record integrity.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                        Source year
                      </span>
                      <select
                        value={fromYearId}
                        onChange={(event) => setFromYearId(event.target.value)}
                        className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                      >
                        <option value="">Select source year</option>
                        {academicYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name}
                            {year.isCurrent ? ' - Current' : ''}
                            {year.isPromotionDone ? ' - Promotion complete' : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                        Target year
                      </span>
                      <select
                        value={toYearId}
                        onChange={(event) => setToYearId(event.target.value)}
                        className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                      >
                        <option value="">Select target year</option>
                        {academicYears
                          .filter((year) => year.id !== fromYearId)
                          .map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name}
                              {year.isCurrent ? ' - Current' : ''}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-4 dark:border-gray-800/70 dark:bg-gray-950/60">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Source selection</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{fromYear?.name || 'Not selected'}</p>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-4 dark:border-gray-800/70 dark:bg-gray-950/60">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Target selection</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{toYear?.name || 'Not selected'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:px-6">
                  <button
                    type="button"
                    onClick={handleLoadPreview}
                    disabled={!fromYearId || !toYearId || loading || fromYear?.isPromotionDone === true}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    Load Preview
                  </button>
                </div>
              </section>
            </AnimatedContent>
          ) : null}

          {step === 2 ? (
            <>
              <AnimatedContent animation="slide-up" delay={80}>
                <section className="mt-5 grid gap-4 md:grid-cols-3">
                  <MetricCard label="Total Students" value={totalStudents} helper="Students evaluated across source classes." tone="orange" />
                  <MetricCard label="Ready To Promote" value={promotableStudents} helper="Students with a valid destination class." tone="emerald" />
                  <MetricCard label="Graduate / Blocked" value={graduatingStudents + blockedStudents} helper="Students leaving or waiting for setup." tone="slate" />
                </section>
              </AnimatedContent>

              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-none dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:ring-gray-800/70">
                  <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Preview</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Promotion matrix</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Review each source class, confirm the target path, and check any blocked placement before execution.
                    </p>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    {mergedPreview.map((item) => (
                      <div
                        key={item.fromClass.id}
                        className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900/90 p-5 shadow-sm dark:border-gray-800/70 dark:bg-none dark:bg-gray-950/60"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Source class</p>
                            <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">{item.fromClass.name}</h3>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                              {item.studentCount} students
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-slate-100 dark:bg-none dark:bg-gray-800 text-slate-500 dark:bg-none dark:bg-gray-900 dark:text-gray-400">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                            {item.willGraduate ? (
                              <div className="rounded-[0.95rem] border border-indigo-100 bg-indigo-50 px-4 py-3 text-right dark:border-indigo-500/20 dark:bg-indigo-500/10">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500 dark:text-indigo-300">Exit</p>
                                <p className="mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-200">Graduating</p>
                              </div>
                            ) : item.toClass ? (
                              <div className="rounded-[0.95rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-right dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500 dark:text-emerald-300">Target</p>
                                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{item.toClass.name}</p>
                              </div>
                            ) : (
                              <div className="rounded-[0.95rem] border border-rose-100 bg-rose-50 px-4 py-3 text-right dark:border-rose-500/20 dark:bg-rose-500/10">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500 dark:text-rose-300">Blocked</p>
                                <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-200">No target class</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.students.slice(0, 6).map((student) => (
                            <span
                              key={student.id}
                              className="inline-flex rounded-full bg-slate-100 dark:bg-none dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200 dark:bg-none dark:bg-gray-900/5 dark:text-slate-300 dark:ring-white/10"
                            >
                              {student.firstName} {student.lastName}
                            </span>
                          ))}
                          {item.students.length > 6 ? (
                            <span className="inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                              +{item.students.length - 6} more
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={promotableStudents === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </section>
              </AnimatedContent>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <AnimatedContent animation="slide-up" delay={80}>
                <section className="mt-5 grid gap-4 md:grid-cols-3">
                  <MetricCard label="Promotions" value={promotableStudents} helper="Students ready to move into the next year." tone="emerald" />
                  <MetricCard label="Graduating" value={graduatingStudents} helper="Students exiting this cycle at the final grade." tone="orange" />
                  <MetricCard label="Blocked" value={blockedStudents} helper={`${blockedClasses} class${blockedClasses === 1 ? '' : 'es'} still need target setup.`} tone="slate" />
                </section>
              </AnimatedContent>

              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
                  <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Execution</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Final confirmation</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Confirm the year transition before running the promotion process.
                    </p>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-4 dark:border-gray-800/70 dark:bg-gray-950/60">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">From year</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{fromYear?.name || 'Not selected'}</p>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-4 dark:border-gray-800/70 dark:bg-gray-950/60">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">To year</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{toYear?.name || 'Not selected'}</p>
                      </div>
                    </div>

                    <div className="rounded-[1rem] border border-orange-100 bg-orange-50/80 p-4 text-sm font-medium text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">This action will write progression data and update student placement.</p>
                          <p className="mt-1 text-xs font-medium text-orange-700 dark:text-orange-200/80">
                            Students without a valid target class will not be promoted until the target setup is completed.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleExecutePromotion}
                      disabled={executing || promotions.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Execute Promotion
                    </button>
                  </div>
                </section>
              </AnimatedContent>
            </>
          ) : null}

          {step === 4 && results ? (
            <>
              <AnimatedContent animation="slide-up" delay={80}>
                <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-none dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:ring-gray-800/70">
                  <div className="p-8 text-center sm:p-10">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">Completed</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Promotion finalized</h2>
                    <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Student progression has been written for the selected academic year transition.
                    </p>
                  </div>

                  <div className="grid gap-4 border-t border-slate-200 dark:border-gray-800/70 p-5 dark:border-gray-800/70 sm:grid-cols-2 sm:p-6">
                    <MetricCard
                      label="Promoted"
                      value={results.results?.promoted ?? results.results?.successCount ?? 0}
                      helper="Students successfully moved into the new year."
                      tone="emerald"
                    />
                    <MetricCard
                      label="Failed"
                      value={results.results?.failed ?? results.results?.failureCount ?? 0}
                      helper="Students that need manual review."
                      tone="slate"
                    />
                  </div>

                  {results.results?.errors?.length > 0 ? (
                    <div className="border-t border-slate-200 dark:border-gray-800/70 p-5 dark:border-gray-800/70 sm:p-6">
                      <div className="rounded-[1rem] border border-rose-100 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500 dark:text-rose-300">Error log</p>
                        <div className="mt-4 space-y-3">
                          {results.results.errors.map((item: any, index: number) => (
                            <div
                              key={`${item.studentId || 'error'}-${index}`}
                              className="flex items-center gap-3 rounded-[0.95rem] border border-white/60 bg-white dark:bg-gray-900/80 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 dark:border-gray-800/70 dark:bg-gray-950/60 dark:text-gray-300"
                            >
                              <span className="font-mono text-xs text-slate-400 dark:text-gray-500">#{item.studentId?.slice(-4) || index}</span>
                              <span>{item.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 px-5 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() => router.push(`/${locale}/students`)}
                      className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                    >
                      Open Students
                    </button>
                    <button
                      type="button"
                      onClick={resetFlow}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Start New Cycle
                    </button>
                  </div>
                </section>
              </AnimatedContent>
            </>
          ) : null}
        </main>
      </div>
    </>
  );
}
