'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { STUDENT_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import { useStudents } from '@/hooks/useStudents';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  khmerName: string | null;
  gender: string;
  grade: number;
  className: string;
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
  tone: 'rose' | 'amber' | 'sky' | 'slate';
}) {
  const tones = {
    rose:
      'border-rose-100/80 bg-gradient-to-br from-white via-rose-50/80 to-orange-50/75',
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/75',
    sky:
      'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/75',
    slate:
      'border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/80',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.22)] ring-1 ring-white/70 dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70 ${tones[tone]}`}
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

export default function FailedStudentsPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { years, isLoading: yearsLoading } = useAcademicYearsList(school?.id);
  const sortedYears = useMemo(
    () =>
      [...years].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      ),
    [years]
  );

  const { students: rawStudents, isLoading: studentsLoading, mutate: mutateStudents } = useStudents({
    page: 1,
    limit: 2000,
    academicYearId: fromYearId || undefined,
  });

  const students = useMemo<Student[]>(
    () =>
      rawStudents.map((student) => ({
        id: student.id,
        firstName: student.firstNameLatin || '',
        lastName: student.lastNameLatin || '',
        khmerName:
          [student.firstNameKhmer, student.lastNameKhmer].filter(Boolean).join(' ').trim() || null,
        gender: student.gender,
        grade: student.class?.grade || 0,
        className: student.class?.name || '',
      })),
    [rawStudents]
  );

  useEffect(() => {
    if (TokenManager.getAccessToken() && school?.id) return;
    router.push(`/${params.locale}/auth/login`);
  }, [params.locale, router, school?.id]);

  useEffect(() => {
    if (!sortedYears.length) return;

    if (!fromYearId) {
      const currentYear = sortedYears.find((year) => year.isCurrent) || sortedYears[0];
      if (currentYear) {
        setFromYearId(currentYear.id);
      }
      return;
    }

    if (!toYearId || toYearId === fromYearId) {
      const sourceYear = sortedYears.find((year) => year.id === fromYearId);
      const nextYear = sortedYears
        .filter((year) => year.id !== fromYearId)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .find((year) => !sourceYear || new Date(year.startDate) > new Date(sourceYear.startDate));

      if (nextYear) {
        setToYearId(nextYear.id);
      }
    }
  }, [fromYearId, sortedYears, toYearId]);

  useEffect(() => {
    setSelectedStudents(new Set());
  }, [fromYearId]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${params.locale}/auth/login`);
  };

  const handleMarkAsFailed = async () => {
    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    if (!fromYearId || !toYearId) {
      setError('Please select academic years');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const token = TokenManager.getAccessToken();

      const response = await fetch(`${STUDENT_SERVICE_URL}/students/mark-failed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          fromAcademicYearId: fromYearId,
          toAcademicYearId: toYearId,
          notes: 'Marked as failed - repeating grade',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully processed ${result.data.processed} student(s)`);
        setSelectedStudents(new Set());
        if (result.data.failed.length > 0) {
          setError(`Failed: ${result.data.failed.length} student(s)`);
        }
        void mutateStudents();
      } else {
        setError(result.error || 'Failed to mark students');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const next = new Set(selectedStudents);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedStudents(next);
  };

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const query = searchQuery.toLowerCase();
        return (
          student.firstName.toLowerCase().includes(query) ||
          student.lastName.toLowerCase().includes(query) ||
          (student.khmerName && student.khmerName.includes(searchQuery)) ||
          student.className.toLowerCase().includes(query)
        );
      }),
    [searchQuery, students]
  );

  const toggleAll = () => {
    if (filteredStudents.length === 0) return;
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((student) => student.id)));
    }
  };

  const fromYear = sortedYears.find((year) => year.id === fromYearId);
  const toYear = sortedYears.find((year) => year.id === toYearId);
  const loading = Boolean(school?.id) && yearsLoading && sortedYears.length === 0;
  const selectAllChecked =
    filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length;

  if (loading) {
    return <PageSkeleton user={user} school={school} type="table" showFilters={true} />;
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.06),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] py-8 text-slate-900 dark:text-white transition-colors duration-500 dark:bg-none dark:bg-gray-950 dark:text-white lg:ml-64">
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
            <span>Repeat Students</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <CompactHeroCard
              icon={AlertTriangle}
              eyebrow="Repeat Workflow"
              title="Repeat students"
              description="Select learners who should stay in the same grade for the next cycle."
              chipsPosition="below"
              backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#fff1f2_56%,#ffedd5_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
              glowClassName="bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.16),transparent_58%)] dark:opacity-50"
              eyebrowClassName="text-rose-700 dark:text-rose-300"
              iconShellClassName="bg-gradient-to-br from-rose-600 to-orange-500 text-white"
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
                  <span>Repeat Students</span>
                </div>
              }
              chips={
                <>
                  <span className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    Source: {fromYear?.name || 'Not selected'}
                  </span>
                  <span className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    Repeat into: {toYear?.name || 'Not selected'}
                  </span>
                </>
              }
            />

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950 p-6 text-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.45)] ring-1 ring-white/10 dark:border-gray-800/90">
              <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-rose-500/10 blur-3xl" />
              <div className="absolute -right-14 top-6 h-40 w-40 rounded-full bg-orange-300/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/60">
                      Repeat Queue
                    </p>
                    <h2 className="mt-3 text-4xl font-black tracking-tight">
                      {selectedStudents.size}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-white/70">
                      Students currently selected for repeat processing.
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white dark:bg-none dark:bg-gray-900/10 ring-1 ring-white/10">
                    <Users className="h-7 w-7 text-rose-200" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.15rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 p-4">
                    <p className="text-2xl font-black">{filteredStudents.length}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                      Visible
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 p-4">
                    <p className="text-2xl font-black">{toYear ? 'Ready' : 'Wait'}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                      Target Year
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white dark:bg-gray-900/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                    Action Rule
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    Selected students stay in the same grade level when moved into the chosen
                    destination year.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <div className="rounded-xl bg-rose-100 p-2 dark:bg-rose-900/40">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                <p className="mt-1 text-sm font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-rose-400 transition hover:text-rose-600 dark:hover:text-rose-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {success && (
            <div className="mt-6 flex items-start gap-4 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              <div className="rounded-xl bg-emerald-100 p-2 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-[0.18em]">Success</p>
                <p className="mt-1 text-sm font-medium">{success}</p>
              </div>
              <button
                onClick={() => setSuccess('')}
                className="text-emerald-400 transition hover:text-emerald-600 dark:hover:text-emerald-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <AnimatedContent animation="slide-up" delay={80}>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Source Students"
                value={students.length}
                helper="Students loaded from the source academic year."
                tone="rose"
              />
              <MetricCard
                label="Visible"
                value={filteredStudents.length}
                helper="Students matching the current search."
                tone="sky"
              />
              <MetricCard
                label="Selected"
                value={selectedStudents.size}
                helper="Students queued for repeat processing."
                tone="amber"
              />
              <MetricCard
                label="Target"
                value={toYear ? 'Ready' : 'Missing'}
                helper="Destination academic year mapping."
                tone="slate"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={120}>
            <section className="mt-6 rounded-[1.75rem] border border-white/70 bg-white dark:bg-gray-900/90 p-6 shadow-[0_34px_100px_-46px_rgba(15,23,42,0.35)] ring-1 ring-white/90 backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/80 dark:ring-gray-800/70 sm:p-7">
              <div className="flex flex-col gap-5 border-b border-slate-200 dark:border-gray-800/80 pb-5 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    Year Mapping
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    Repeat planning
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Choose the source year and the destination year where selected students will
                    repeat the same grade level.
                  </p>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 py-3 text-sm font-medium text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  {fromYear && toYear
                    ? `${fromYear.name} -> ${toYear.name}`
                    : 'Select both academic years'}
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                    Source Year
                  </span>
                  <select
                    value={fromYearId}
                    onChange={(event) => setFromYearId(event.target.value)}
                    className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">Select source year</option>
                    {sortedYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                        {year.isCurrent ? ' - Current' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                    Destination Year
                  </span>
                  <select
                    value={toYearId}
                    onChange={(event) => setToYearId(event.target.value)}
                    className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">Select destination year</option>
                    {sortedYears
                      .filter((year) => year.id !== fromYearId)
                      .map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {fromYear && toYear && (
                <div className="mt-6 rounded-[1.15rem] border border-amber-100 bg-amber-50/80 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        Repeat placement rule
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                        Selected students from {fromYear.name} will be carried into {toYear.name}
                        while staying in the same grade level.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </AnimatedContent>

          {fromYearId && (
            <AnimatedContent animation="slide-up" delay={160}>
              <section className="mt-6 rounded-[1.75rem] border border-white/70 bg-white dark:bg-gray-900/90 p-6 shadow-[0_34px_100px_-46px_rgba(15,23,42,0.35)] ring-1 ring-white/90 backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/80 dark:ring-gray-800/70 sm:p-7">
                <div className="flex flex-col gap-5 border-b border-slate-200 dark:border-gray-800/80 pb-5 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                      Student Workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                      Select repeat students
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Search the source roster, select the students who should repeat, and then
                      process them into the next year.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-[260px] flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search name, Khmer name, or class"
                        className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => void mutateStudents()}
                      className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      title="Refresh students"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${studentsLoading ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/70">
                  <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectAllChecked}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300 dark:border-gray-700 text-sky-600 focus:ring-sky-500/20"
                    />
                    Select all visible students
                  </label>
                  <div className="text-sm font-medium text-slate-500 dark:text-gray-400">
                    {selectedStudents.size} selected
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-slate-200 dark:border-gray-800/80 dark:border-gray-800/80">
                  {studentsLoading ? (
                    <div className="flex items-center justify-center py-24">
                      <div className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg">
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-gray-300">
                          Loading student roster...
                        </p>
                      </div>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="flex items-center justify-center py-24">
                      <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-slate-100 dark:bg-gray-800 text-slate-400 dark:bg-gray-900 dark:text-gray-600">
                          <Users className="h-8 w-8" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-gray-300">
                          No students match the current search.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800">
                        <thead className="bg-slate-50 dark:bg-gray-800/50 dark:bg-gray-900/80">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              Select
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              Student
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              Grade
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              Class
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              Gender
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-gray-800 bg-white dark:bg-gray-900 dark:divide-gray-800 dark:bg-gray-950/70">
                          {filteredStudents.map((student) => {
                            const isSelected = selectedStudents.has(student.id);
                            return (
                              <tr
                                key={student.id}
                                className={isSelected ? 'bg-sky-50/60 dark:bg-sky-950/10' : ''}
                              >
                                <td className="px-4 py-4">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleStudent(student.id)}
                                    className="h-4 w-4 rounded border-slate-300 dark:border-gray-700 text-sky-600 focus:ring-sky-500/20"
                                  />
                                </td>
                                <td className="px-4 py-4">
                                  <div>
                                    <p className="font-semibold text-slate-950 dark:text-white">
                                      {student.firstName} {student.lastName}
                                    </p>
                                    {student.khmerName ? (
                                      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                                        {student.khmerName}
                                      </p>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                  Grade {student.grade}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-600 dark:text-gray-400">
                                  {student.className || 'Unassigned'}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-600 dark:text-gray-400">
                                  {student.gender}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {selectedStudents.size > 0 && toYearId && (
                  <div className="mt-6 flex flex-col gap-4 rounded-[1.2rem] border border-amber-100 bg-amber-50/80 p-5 dark:border-amber-500/20 dark:bg-amber-500/10 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        {selectedStudents.size} student{selectedStudents.size === 1 ? '' : 's'} will repeat
                        into {toYear?.name}.
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                        The selected students keep the same grade level in the destination year.
                      </p>
                    </div>
                    <button
                      onClick={handleMarkAsFailed}
                      disabled={processing}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          Mark As Repeat Students
                        </>
                      )}
                    </button>
                  </div>
                )}
              </section>
            </AnimatedContent>
          )}
        </main>
      </div>
    </>
  );
}
