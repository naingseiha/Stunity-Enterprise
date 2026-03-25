'use client';

import { useState, use, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useAcademicYearDetail } from '@/hooks/useAcademicYearResources';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  History,
  Layers3,
  RefreshCw,
  School,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';

interface PromotionStats {
  promotedOut: number;
  repeated: number;
  graduated: number;
  transferredOut: number;
  newAdmissions: number;
  transferredIn: number;
  promotedIn: number;
}

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  section: string | null;
  track: string | null;
  capacity: number | null;
  studentCount: number;
  isAtCapacity: boolean;
  homeroomTeacher: { id: string; name: string } | null;
}

interface TeacherInfo {
  id: string;
  name: string;
  position: string | null;
  classCount: number;
}

interface PromotionRecord {
  studentId: string;
  studentName: string;
  gender: string;
  fromClass: string;
  toClass: string;
  toYear?: string;
  fromYear?: string;
  type: string;
  date: string;
}

interface AcademicYearDetail {
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
    isPromotionDone: boolean;
    promotionDate: string | null;
    copiedFromYearId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  statistics: {
    totalStudents: number;
    totalClasses: number;
    totalTeachers: number;
    studentsByGrade: Record<string, number>;
    studentsByGender: Record<string, number>;
    promotionStats: PromotionStats;
    attendance: Record<string, number>;
    grades: {
      averageScore: number | null;
      totalGradeEntries: number;
    };
  };
  classes: ClassInfo[];
  teachers: TeacherInfo[];
  terms: Array<{ id: string; name: string; termNumber: number; startDate: string; endDate: string }>;
  examTypes: Array<{ id: string; name: string; weight: number; maxScore: number }>;
  promotionHistory: {
    promotedOut: PromotionRecord[];
    promotedIn: PromotionRecord[];
    totalPromotedOut: number;
    totalPromotedIn: number;
  };
}

type DetailTab = 'overview' | 'classes' | 'teachers' | 'promotions' | 'calendar';

const TABS: Array<{ id: DetailTab; label: string; icon: typeof BookOpen }> = [
  { id: 'overview', label: 'Overview', icon: Layers3 },
  { id: 'classes', label: 'Classes', icon: BookOpen },
  { id: 'teachers', label: 'Teachers', icon: Users },
  { id: 'promotions', label: 'Promotions', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function getDurationLabel(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
  return `${months} mo cycle`;
}

function getStatusMeta(status: AcademicYearDetail['academicYear']['status']) {
  const map = {
    PLANNING: {
      label: 'Planning',
      helper: 'Setup and curriculum preparation',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
      icon: Clock3,
      score: 34,
    },
    ACTIVE: {
      label: 'Active',
      helper: 'Live academic operations',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
      score: 74,
    },
    ENDED: {
      label: 'Ended',
      helper: 'Ready for close-out',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: TrendingUp,
      score: 88,
    },
    ARCHIVED: {
      label: 'Archived',
      helper: 'Stored for record keeping',
      badge: 'border-slate-200 bg-slate-100 text-slate-700',
      icon: BookOpen,
      score: 100,
    },
  } as const;

  return map[status] || map.PLANNING;
}

function StatCard({
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
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/40',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/40',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/40',
    slate:
      'border-slate-200/80 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/80 shadow-slate-200/35',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_55px_-34px_rgba(15,23,42,0.28)] ring-1 ring-white/75 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white/92 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white shadow-sm ring-1 ring-slate-200/70">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export default function AcademicYearDetailPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const routeParams = useParams();
  const id = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const {
    data: yearData,
    isLoading,
    error: yearDataError,
  } = useAcademicYearDetail<AcademicYearDetail>(school?.id, String(id));

  const handlePromoteStudents = () => {
    router.push(`/${locale}/settings/academic-years/${id}/promote`);
  };

  const handleYearEndWorkflow = () => {
    router.push(`/${locale}/settings/year-end-workflow?yearId=${id}`);
  };

  const handleCopySettings = () => {
    router.push(`/${locale}/settings/academic-years?action=create&copyFrom=${id}`);
  };

  const handleEditYear = () => {
    router.push(`/${locale}/settings/academic-years?action=edit&yearId=${id}`);
  };

  const handleViewCalendar = () => {
    router.push(`/${locale}/settings/academic-years/${id}/calendar`);
  };

  if (isLoading && !yearData) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] lg:ml-64">
          <div className="flex min-h-screen items-center justify-center px-6">
            <div className="rounded-[1.75rem] border border-white/75 bg-white/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-amber-100 border-t-amber-500" />
              <p className="mt-5 text-sm font-medium text-slate-500">Loading academic cycle...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (yearDataError || !yearData) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] px-6 py-10 lg:ml-64">
          <div className="mx-auto max-w-2xl rounded-[1.8rem] border border-red-100 bg-white/92 p-8 text-center shadow-[0_30px_80px_-42px_rgba(15,23,42,0.28)] ring-1 ring-red-100/80">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-red-50 text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Unable to load this cycle</h3>
            <p className="mt-3 text-sm text-slate-500">{yearDataError?.message || 'Academic year not found.'}</p>
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

  const { academicYear, statistics, classes, teachers, terms, examTypes, promotionHistory } = yearData;
  const statusMeta = getStatusMeta(academicYear.status);
  const StatusIcon = statusMeta.icon;

  const groupedClasses: Record<string, ClassInfo[]> = {};
  classes.forEach((item) => {
    if (!groupedClasses[item.grade]) groupedClasses[item.grade] = [];
    groupedClasses[item.grade].push(item);
  });
  const classesByGrade = Object.entries(groupedClasses).sort(([a], [b]) => Number(a) - Number(b));

  const totalPromotions =
    statistics.promotionStats.promotedOut +
    statistics.promotionStats.promotedIn +
    statistics.promotionStats.graduated;
  const totalSeats = classes.reduce((sum, item) => sum + (item.capacity || 0), 0);
  const occupiedSeats = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const occupancyRate = totalSeats > 0 ? Math.min(100, Math.round((occupiedSeats / totalSeats) * 100)) : 0;
  const completionScore = Math.min(
    100,
    statusMeta.score +
      (academicYear.isCurrent ? 8 : 0) +
      (academicYear.isPromotionDone ? 10 : 0) +
      (terms.length > 0 ? 4 : 0) +
      (examTypes.length > 0 ? 4 : 0)
  );
  const gradeEntries = Object.keys(statistics.studentsByGrade).length;
  const genderSplit = [
    { label: 'Male', value: statistics.studentsByGender.MALE || 0 },
    { label: 'Female', value: statistics.studentsByGender.FEMALE || 0 },
  ];

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(244,114,182,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_360px]">
              <CompactHeroCard
                icon={CalendarDays}
                eyebrow="Academic Cycle"
                title={academicYear.name}
                description="Review cycle readiness, staffing, and promotion movement from one calm operations view."
                chipsPosition="below"
                backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#fffbeb_58%,#fef3c7_100%)]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(217,119,6,0.18),transparent_58%)]"
                eyebrowClassName="text-amber-500"
                iconShellClassName="bg-gradient-to-br from-amber-600 to-orange-500 text-white"
                breadcrumbs={
                  <button
                    onClick={() => router.push(`/${locale}/settings/academic-years`)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    All academic years
                  </button>
                }
                chips={
                  <>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusMeta.badge}`}>
                      <StatusIcon className="h-4 w-4" />
                      {statusMeta.label}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                      <CalendarDays className="h-4 w-4 text-amber-500" />
                      {formatMonthLabel(academicYear.startDate)} - {formatMonthLabel(academicYear.endDate)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                      <Clock3 className="h-4 w-4 text-amber-500" />
                      {getDurationLabel(academicYear.startDate, academicYear.endDate)}
                    </span>
                    {academicYear.isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Current cycle
                      </span>
                    ) : null}
                  </>
                }
                actions={
                  <button
                    onClick={handleEditYear}
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-white/80 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit cycle
                  </button>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-amber-200/70 bg-[linear-gradient(145deg,rgba(120,53,15,0.96),rgba(146,64,14,0.94)_48%,rgba(180,83,9,0.9))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(120,53,15,0.55)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-100/80">Cycle Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{completionScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-amber-100/75">Ready</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <Sparkles className="h-7 w-7 text-amber-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200"
                    style={{ width: `${completionScore}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Students', value: formatNumber(statistics.totalStudents) },
                    { label: 'Classes', value: formatNumber(statistics.totalClasses) },
                    { label: 'Terms', value: formatNumber(terms.length) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-amber-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-amber-50/90">
                  {statusMeta.helper}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Students"
                value={formatNumber(statistics.totalStudents)}
                helper={`${gradeEntries} grade bands in view`}
                tone="sky"
              />
              <StatCard
                label="Classes"
                value={formatNumber(statistics.totalClasses)}
                helper={`${occupancyRate}% of tracked seats filled`}
                tone="emerald"
              />
              <StatCard
                label="Teachers"
                value={formatNumber(statistics.totalTeachers)}
                helper="Assigned across this cycle"
                tone="slate"
              />
              <StatCard
                label="Promotion Activity"
                value={formatNumber(totalPromotions)}
                helper={academicYear.isPromotionDone ? 'Promotion recorded' : 'Still open'}
                tone="amber"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.08}>
            <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/82 p-2 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex min-w-max gap-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                          : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-950'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.1}>
            <div className="mt-5 space-y-5">
              {activeTab === 'overview' ? (
                <div className="space-y-5">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_380px]">
                    <SectionCard
                      eyebrow="Snapshot"
                      title="Operational overview"
                      action={
                        <button
                          onClick={handlePromoteStudents}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Promote students
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      }
                    >
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Academic Window</p>
                          <p className="mt-3 text-lg font-bold text-slate-950">{formatDateLabel(academicYear.startDate)}</p>
                          <p className="mt-1 text-sm text-slate-500">to {formatDateLabel(academicYear.endDate)}</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Grade Coverage</p>
                          <p className="mt-3 text-lg font-bold text-slate-950">{gradeEntries} active levels</p>
                          <p className="mt-1 text-sm text-slate-500">Across {statistics.totalClasses} classes</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4 sm:col-span-2 xl:col-span-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Curriculum Setup</p>
                          <p className="mt-3 text-lg font-bold text-slate-950">{terms.length} terms · {examTypes.length} exam types</p>
                          <p className="mt-1 text-sm text-slate-500">Evaluation structure in place</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.3rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Gender split</p>
                            <Users className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            {genderSplit.map((item) => (
                              <div key={item.label} className="rounded-[1rem] bg-slate-50 px-4 py-3">
                                <p className="text-2xl font-black tracking-tight text-slate-950">{formatNumber(item.value)}</p>
                                <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[1.3rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Promotion signal</p>
                            <History className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-[1rem] bg-emerald-50 px-4 py-3">
                              <p className="text-2xl font-black tracking-tight text-emerald-900">
                                {formatNumber(statistics.promotionStats.promotedOut)}
                              </p>
                              <p className="mt-1 text-sm text-emerald-700">Promoted out</p>
                            </div>
                            <div className="rounded-[1rem] bg-amber-50 px-4 py-3">
                              <p className="text-2xl font-black tracking-tight text-amber-900">
                                {formatNumber(statistics.promotionStats.repeated)}
                              </p>
                              <p className="mt-1 text-sm text-amber-700">Repeated</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard eyebrow="Actions" title="Cycle controls">
                      <div className="space-y-3">
                        {[
                          {
                            label: 'Promotion workspace',
                            helper: 'Review and move students into the next cycle.',
                            icon: TrendingUp,
                            onClick: handlePromoteStudents,
                            tone: 'from-amber-500 to-orange-500',
                          },
                          {
                            label: 'Year-end workflow',
                            helper: 'Close and archive this cycle with control.',
                            icon: RefreshCw,
                            onClick: handleYearEndWorkflow,
                            tone: 'from-fuchsia-500 to-violet-500',
                          },
                          {
                            label: 'Copy setup forward',
                            helper: 'Start a new cycle using this one as the template.',
                            icon: Copy,
                            onClick: handleCopySettings,
                            tone: 'from-sky-500 to-cyan-500',
                          },
                          {
                            label: 'Manage calendar',
                            helper: 'Open the academic event schedule and holidays.',
                            icon: CalendarDays,
                            onClick: handleViewCalendar,
                            tone: 'from-emerald-500 to-teal-500',
                          },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.label}
                              onClick={item.onClick}
                              className="flex w-full items-center gap-4 rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                            >
                              <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] bg-gradient-to-br ${item.tone} text-white shadow-lg shadow-slate-200/60`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-950">{item.label}</p>
                                <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </button>
                          );
                        })}
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard eyebrow="Distribution" title="Students by grade">
                    {gradeEntries > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {Object.entries(statistics.studentsByGrade)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([grade, count]) => (
                            <button
                              key={grade}
                              onClick={() => router.push(`/${locale}/students?grade=${grade}&yearId=${academicYear.id}`)}
                              className="rounded-[1.25rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 px-4 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                            >
                              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Grade {grade}</p>
                              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{formatNumber(count)}</p>
                              <p className="mt-2 text-sm text-slate-500">Open roster in students</p>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Users}
                        title="No enrolled students yet"
                        message="This cycle does not have student distribution data yet."
                      />
                    )}
                  </SectionCard>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <SectionCard eyebrow="Terms" title="Academic terms">
                      {terms.length > 0 ? (
                        <div className="space-y-3">
                          {terms.map((term) => (
                            <div key={term.id} className="flex items-center justify-between rounded-[1.15rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                              <div>
                                <p className="font-semibold text-slate-950">{term.name}</p>
                                <p className="mt-1 text-sm text-slate-500">Term {term.termNumber}</p>
                              </div>
                              <p className="text-sm font-medium text-slate-600">
                                {formatDateLabel(term.startDate)} - {formatDateLabel(term.endDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={Clock3}
                          title="No terms configured"
                          message="Set up terms to define the academic structure for this cycle."
                        />
                      )}
                    </SectionCard>

                    <SectionCard eyebrow="Assessments" title="Exam types">
                      {examTypes.length > 0 ? (
                        <div className="space-y-3">
                          {examTypes.map((exam) => (
                            <div key={exam.id} className="flex items-center justify-between rounded-[1.15rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                              <div>
                                <p className="font-semibold text-slate-950">{exam.name}</p>
                                <p className="mt-1 text-sm text-slate-500">Max score {exam.maxScore}</p>
                              </div>
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                                {exam.weight}%
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={BookOpen}
                          title="No exam types yet"
                          message="Assessment weights will appear here after setup."
                        />
                      )}
                    </SectionCard>
                  </div>
                </div>
              ) : null}

              {activeTab === 'classes' ? (
                <SectionCard
                  eyebrow="Classes"
                  title={`Class structure · ${formatNumber(statistics.totalClasses)}`}
                  action={
                    <button
                      onClick={() => router.push(`/${locale}/classes?yearId=${academicYear.id}`)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Manage classes
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                >
                  {classesByGrade.length > 0 ? (
                    <div className="space-y-5">
                      {classesByGrade.map(([grade, gradeClasses]) => (
                        <div key={grade} className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/75 p-4 sm:p-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white">
                                Grade {grade}
                              </span>
                              <p className="text-sm font-medium text-slate-500">
                                {gradeClasses.length} class{gradeClasses.length === 1 ? '' : 'es'} · {formatNumber(gradeClasses.reduce((sum, item) => sum + item.studentCount, 0))} students
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {gradeClasses.map((cls) => {
                              const classCapacity = cls.capacity || 0;
                              const classRate = classCapacity > 0 ? Math.min(100, Math.round((cls.studentCount / classCapacity) * 100)) : 0;
                              return (
                                <button
                                  key={cls.id}
                                  onClick={() => router.push(`/${locale}/classes/${cls.id}/roster`)}
                                  className="rounded-[1.3rem] border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-lg font-bold text-slate-950">{cls.name}</p>
                                      <p className="mt-1 text-sm text-slate-500">
                                        {cls.section ? `Section ${cls.section}` : 'No section'}
                                        {cls.track ? ` · ${cls.track}` : ''}
                                      </p>
                                    </div>
                                    {cls.isAtCapacity ? (
                                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
                                        Full
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-[1rem] bg-slate-50 px-3 py-3">
                                      <p className="text-sm font-semibold text-slate-700">Roster</p>
                                      <p className="mt-1 text-sm text-slate-500">
                                        {formatNumber(cls.studentCount)} / {classCapacity > 0 ? formatNumber(classCapacity) : 'Open'}
                                      </p>
                                    </div>
                                    <div className="rounded-[1rem] bg-slate-50 px-3 py-3">
                                      <p className="text-sm font-semibold text-slate-700">Homeroom</p>
                                      <p className="mt-1 text-sm text-slate-500">{cls.homeroomTeacher?.name || 'Unassigned'}</p>
                                    </div>
                                  </div>
                                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full ${cls.isAtCapacity ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}
                                      style={{ width: `${classCapacity > 0 ? classRate : Math.min(cls.studentCount * 8, 100)}%` }}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={BookOpen}
                      title="No classes added yet"
                      message="Create the first class for this academic cycle to begin organizing rosters."
                      action={
                        <button
                          onClick={() => router.push(`/${locale}/classes?action=create&yearId=${academicYear.id}`)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Create class
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      }
                    />
                  )}
                </SectionCard>
              ) : null}

              {activeTab === 'teachers' ? (
                <SectionCard
                  eyebrow="Faculty"
                  title={`Teachers in cycle · ${formatNumber(statistics.totalTeachers)}`}
                  action={
                    <button
                      onClick={() => router.push(`/${locale}/teachers`)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Manage teachers
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                >
                  {teachers.length > 0 ? (
                    <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-sm">
                      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(120px,0.8fr)_120px_130px] gap-3 border-b border-slate-200/80 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        <p>Teacher</p>
                        <p>Position</p>
                        <p className="text-center">Classes</p>
                        <p className="text-right">Action</p>
                      </div>
                      <div className="divide-y divide-slate-200/80">
                        {teachers.map((teacher) => (
                          <div
                            key={teacher.id}
                            className="grid grid-cols-[minmax(0,1.7fr)_minmax(120px,0.8fr)_120px_130px] items-center gap-3 px-5 py-4 transition hover:bg-slate-50/80"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-gradient-to-br from-sky-500 to-cyan-500 text-sm font-black text-white shadow-lg shadow-sky-100">
                                {teacher.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-950">{teacher.name}</p>
                                <p className="mt-1 text-sm text-slate-500">Faculty member</p>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600">{teacher.position || 'Not set'}</p>
                            <div className="text-center">
                              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                                {teacher.classCount} classes
                              </span>
                            </div>
                            <div className="text-right">
                              <button
                                onClick={() => router.push(`/${locale}/teachers/${teacher.id}`)}
                                className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={School}
                      title="No teachers linked yet"
                      message="Assigned faculty will appear here once teacher profiles are connected to this cycle."
                    />
                  )}
                </SectionCard>
              ) : null}

              {activeTab === 'promotions' ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      label="Promoted Out"
                      value={promotionHistory.totalPromotedOut}
                      helper="Advanced into the next cycle"
                      tone="emerald"
                    />
                    <StatCard
                      label="Promoted In"
                      value={promotionHistory.totalPromotedIn}
                      helper="Arrived from the previous cycle"
                      tone="sky"
                    />
                    <StatCard
                      label="Repeated"
                      value={statistics.promotionStats.repeated}
                      helper="Stayed in the same grade band"
                      tone="amber"
                    />
                    <StatCard
                      label="Graduated"
                      value={statistics.promotionStats.graduated}
                      helper="Completed the final grade"
                      tone="slate"
                    />
                  </div>

                  <SectionCard
                    eyebrow="History"
                    title="Promotion activity"
                    action={
                      <button
                        onClick={handlePromoteStudents}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open promotion
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    }
                  >
                    {promotionHistory.totalPromotedOut === 0 && promotionHistory.totalPromotedIn === 0 ? (
                      <EmptyState
                        icon={TrendingUp}
                        title="No promotion history yet"
                        message="Once promotion runs for this cycle, inbound and outbound movement will appear here."
                        action={
                          <button
                            onClick={handlePromoteStudents}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Start promotion
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        }
                      />
                    ) : (
                      <div className="space-y-5">
                        {promotionHistory.promotedOut.length > 0 ? (
                          <div className="overflow-hidden rounded-[1.35rem] border border-emerald-100 bg-emerald-50/45">
                            <div className="flex items-center gap-2 border-b border-emerald-100 px-5 py-4">
                              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                              <h3 className="font-bold text-emerald-900">Promoted out</h3>
                            </div>
                            <div className="divide-y divide-emerald-100/80 bg-white/80">
                              {promotionHistory.promotedOut.map((item, index) => (
                                <div key={`${item.studentId}-${index}`} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
                                  <div>
                                    <p className="font-semibold text-slate-950">{item.studentName}</p>
                                    <p className="mt-1 text-sm text-slate-500">{item.gender}</p>
                                  </div>
                                  <p className="text-sm text-slate-600">{item.fromClass}</p>
                                  <p className="text-sm text-slate-600">{item.toClass}</p>
                                  <div className="flex items-center justify-between gap-3 md:justify-end">
                                    <p className="text-sm text-slate-500">{item.toYear || '-'}</p>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                      {item.type}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {promotionHistory.promotedIn.length > 0 ? (
                          <div className="overflow-hidden rounded-[1.35rem] border border-sky-100 bg-sky-50/45">
                            <div className="flex items-center gap-2 border-b border-sky-100 px-5 py-4">
                              <ArrowUpRight className="h-4 w-4 rotate-180 text-sky-600" />
                              <h3 className="font-bold text-sky-900">Promoted in</h3>
                            </div>
                            <div className="divide-y divide-sky-100/80 bg-white/80">
                              {promotionHistory.promotedIn.map((item, index) => (
                                <div key={`${item.studentId}-${index}`} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
                                  <div>
                                    <p className="font-semibold text-slate-950">{item.studentName}</p>
                                    <p className="mt-1 text-sm text-slate-500">{item.gender}</p>
                                  </div>
                                  <p className="text-sm text-slate-600">{item.fromYear || '-'}</p>
                                  <p className="text-sm text-slate-600">{item.fromClass}</p>
                                  <div className="flex items-center justify-between gap-3 md:justify-end">
                                    <p className="text-sm text-slate-500">{item.toClass}</p>
                                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                                      {item.type}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </SectionCard>
                </div>
              ) : null}

              {activeTab === 'calendar' ? (
                <SectionCard
                  eyebrow="Calendar"
                  title="Academic event schedule"
                  action={
                    <button
                      onClick={handleViewCalendar}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Open calendar
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]">
                    <div className="rounded-[1.45rem] border border-slate-200/80 bg-gradient-to-br from-white via-emerald-50/45 to-sky-50/55 p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Schedule Setup</p>
                      <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Keep the year visible for staff and families</h3>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Manage holidays, exam periods, orientation, and special events from the dedicated calendar workspace.
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.1rem] bg-white/85 px-4 py-4 ring-1 ring-slate-200/70">
                          <p className="text-2xl font-black tracking-tight text-slate-950">{terms.length}</p>
                          <p className="mt-1 text-sm text-slate-500">Terms linked</p>
                        </div>
                        <div className="rounded-[1.1rem] bg-white/85 px-4 py-4 ring-1 ring-slate-200/70">
                          <p className="text-2xl font-black tracking-tight text-slate-950">{examTypes.length}</p>
                          <p className="mt-1 text-sm text-slate-500">Exam types</p>
                        </div>
                        <div className="rounded-[1.1rem] bg-white/85 px-4 py-4 ring-1 ring-slate-200/70">
                          <p className="text-2xl font-black tracking-tight text-slate-950">{academicYear.isCurrent ? 'Live' : statusMeta.label}</p>
                          <p className="mt-1 text-sm text-slate-500">Cycle state</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.45rem] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Linked Actions</p>
                      <div className="mt-4 space-y-3">
                        {[
                          { icon: CalendarDays, label: 'Open full calendar', helper: 'Manage events and holidays', onClick: handleViewCalendar },
                          { icon: RefreshCw, label: 'Year-end workflow', helper: 'Finish the cycle after the calendar closes', onClick: handleYearEndWorkflow },
                          { icon: Copy, label: 'Copy this setup', helper: 'Carry structure into the next year', onClick: handleCopySettings },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.label}
                              onClick={item.onClick}
                              className="flex w-full items-center gap-3 rounded-[1.1rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-100/80"
                            >
                              <div className="flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-slate-950 text-white">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-950">{item.label}</p>
                                <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </AnimatedContent>
        </div>
      </div>
    </>
  );
}
