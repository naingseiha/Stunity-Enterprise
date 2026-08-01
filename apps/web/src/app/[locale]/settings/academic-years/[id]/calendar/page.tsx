'use client';

import { useEffect, useMemo, useRef, useState, use, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { SCHOOL_SERVICE_URL } from '@/lib/api/config';
import { useAcademicCalendar } from '@/hooks/useAcademicYearResources';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarDays,
  GraduationCap,
  PartyPopper,
  Plus,
  Sparkles,
  Trophy,
  Trash2,
  Users,
  X,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isSchoolDay: boolean;
  isPublic: boolean;
}

interface AcademicCalendar {
  id: string;
  name: string;
  events: CalendarEvent[];
  academicYear: {
    name: string;
    startDate: string;
    endDate: string;
  } | null;
}

const EVENT_TYPES = [
  {
    value: 'SCHOOL_DAY',
    label: 'ថ្ងៃសិក្សា',
    icon: BookOpen,
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    value: 'HOLIDAY',
    label: 'ថ្ងៃឈប់សម្រាក',
    icon: PartyPopper,
    dot: 'bg-rose-500',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    accent: 'from-rose-500 to-pink-500',
  },
  {
    value: 'VACATION',
    label: 'វិសមកាល',
    icon: Calendar,
    dot: 'bg-amber-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    value: 'EXAM_PERIOD',
    label: 'រយៈពេលប្រឡង',
    icon: BookOpen,
    dot: 'bg-violet-500',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    accent: 'from-violet-500 to-indigo-500',
  },
  {
    value: 'REGISTRATION',
    label: 'ការចុះឈ្មោះ',
    icon: Users,
    dot: 'bg-sky-500',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    value: 'ORIENTATION',
    label: 'ការណែនាំដើមឆ្នាំ',
    icon: GraduationCap,
    dot: 'bg-cyan-500',
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    accent: 'from-cyan-500 to-teal-500',
  },
  {
    value: 'PARENT_MEETING',
    label: 'ប្រជុំមាតាបិតា',
    icon: Users,
    dot: 'bg-yellow-500',
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    accent: 'from-yellow-500 to-amber-500',
  },
  {
    value: 'SPORTS_DAY',
    label: 'ទិវាកីឡា',
    icon: Trophy,
    dot: 'bg-emerald-600',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    accent: 'from-emerald-500 to-lime-500',
  },
  {
    value: 'CULTURAL_EVENT',
    label: 'ព្រឹត្តិការណ៍វប្បធម៌',
    icon: PartyPopper,
    dot: 'bg-pink-500',
    badge: 'border-pink-200 bg-pink-50 text-pink-700',
    accent: 'from-pink-500 to-rose-500',
  },
  {
    value: 'SPECIAL_EVENT',
    label: 'ព្រឹត្តិការណ៍ពិសេស',
    icon: CalendarDays,
    dot: 'bg-indigo-500',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    accent: 'from-indigo-500 to-sky-500',
  },
] as const;

const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
];

function formatDateLabel(value: string) {
  const date = new Date(value);
  return `ថ្ងៃទី ${date.getUTCDate()} ខែ${KHMER_MONTHS[date.getUTCMonth()]} ឆ្នាំ ${date.getUTCFullYear()}`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return `${date.getUTCDate()} ${KHMER_MONTHS[date.getUTCMonth()]}`;
}

function formatMonthLabel(value: string) {
  const date = new Date(value);
  return `${KHMER_MONTHS[date.getUTCMonth()]} ឆ្នាំ ${date.getUTCFullYear()}`;
}

function getEventTypeMeta(type: string) {
  return EVENT_TYPES.find((item) => item.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-emerald-100/70 bg-gradient-to-br from-white via-emerald-50/70 to-cyan-50/60 p-5 shadow-[0_22px_55px_-34px_rgba(15,23,42,0.25)] ring-1 ring-white/75">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_28px_72px_-40px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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

export default function AcademicCalendarPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const routeParams = useParams();
  const id = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const vacationPresetApplied = useRef(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({
    type: 'SPECIAL_EVENT',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isSchoolDay: true,
    isPublic: true,
  });

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const {
    data: calendar,
    isLoading,
    error: calendarError,
    mutate: mutateCalendar,
  } = useAcademicCalendar<AcademicCalendar>(school?.id, String(id));

  const loading = Boolean(school?.id) && isLoading && !calendar;

  useEffect(() => {
    if (vacationPresetApplied.current || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('add') !== 'vacation') return;
    if (!calendar?.academicYear) return;

    const rangeStart = calendar?.academicYear?.startDate?.slice(0, 10);
    const rangeEnd = calendar?.academicYear?.endDate?.slice(0, 10);
    let vacationStart = '';
    let vacationEnd = '';
    if (rangeStart && rangeEnd) {
      const startYear = Number(rangeStart.slice(0, 4));
      const endYear = Number(rangeEnd.slice(0, 4));
      for (let year = startYear; year <= endYear; year += 1) {
        const candidateStart = `${year}-04-06`;
        const candidateEnd = `${year}-04-20`;
        if (candidateStart >= rangeStart && candidateEnd <= rangeEnd) {
          vacationStart = candidateStart;
          vacationEnd = candidateEnd;
          break;
        }
      }
    }

    vacationPresetApplied.current = true;
    setNewEvent({
      type: 'VACATION',
      title: 'វិសមកាលតូច',
      description: '',
      startDate: vacationStart,
      endDate: vacationEnd,
      isSchoolDay: false,
      isPublic: true,
    });
    setShowAddModal(true);
  }, [calendar?.academicYear]);

  const resetEventForm = () => {
    setNewEvent({
      type: 'SPECIAL_EVENT',
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      isSchoolDay: true,
      isPublic: true,
    });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setError('');
    resetEventForm();
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) {
      setError('សូមបំពេញឈ្មោះ និងថ្ងៃចាប់ផ្តើម។');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const token = TokenManager.getAccessToken();
      const currentUserData = TokenManager.getUserData();
      const schoolId = currentUserData?.user?.schoolId || currentUserData?.school?.id;

      const response = await fetch(
        `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${id}/calendar/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...newEvent,
            endDate: newEvent.endDate || newEvent.startDate,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        throw new Error(result.error || 'មិនអាចបន្ថែមព្រឹត្តិការណ៍បានទេ។');
      }

      await mutateCalendar();
      closeAddModal();
    } catch (err: any) {
      setError(err.message || 'មិនអាចបន្ថែមព្រឹត្តិការណ៍បានទេ។');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបព្រឹត្តិការណ៍នេះមែនទេ?')) return;

    try {
      setError('');
      const token = TokenManager.getAccessToken();
      const currentUserData = TokenManager.getUserData();
      const schoolId = currentUserData?.user?.schoolId || currentUserData?.school?.id;

      const response = await fetch(
        `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${id}/calendar/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'មិនអាចលុបព្រឹត្តិការណ៍បានទេ។');
      }

      await mutateCalendar();
    } catch (err: any) {
      setError(err.message || 'មិនអាចលុបព្រឹត្តិការណ៍បានទេ។');
    }
  };

  const sortedEvents = useMemo(() => {
    return [...(calendar?.events || [])].sort(
      (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
    );
  }, [calendar?.events]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    sortedEvents.forEach((event) => {
      const label = formatMonthLabel(event.startDate);
      if (!groups[label]) groups[label] = [];
      groups[label].push(event);
    });
    return Object.entries(groups);
  }, [sortedEvents]);

  const totalEvents = sortedEvents.length;
  const publicEvents = sortedEvents.filter((event) => event.isPublic).length;
  const closures = sortedEvents.filter((event) => !event.isSchoolDay).length;
  const monthsCovered = groupedEvents.length;
  const highlightType = getEventTypeMeta(newEvent.type);
  const HighlightIcon = highlightType.icon;

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_48%,#f8fafc_100%)] lg:ml-64">
          <div className="flex min-h-screen items-center justify-center px-6">
            <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
              <p className="mt-5 text-sm font-medium text-slate-500">កំពុងទាញយកប្រតិទិនសិក្សា...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (calendarError && !calendar) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] px-6 py-10 lg:ml-64">
          <div className="mx-auto max-w-2xl rounded-[1.8rem] border border-red-100 bg-white dark:bg-none dark:bg-gray-900/90 p-8 text-center shadow-[0_30px_80px_-42px_rgba(15,23,42,0.28)] ring-1 ring-red-100/80">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-red-50 text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">មិនអាចទាញយកប្រតិទិនសិក្សាបានទេ</h3>
            <p className="mt-3 text-sm text-slate-500">{calendarError.message}</p>
            <button
              onClick={() => router.push(`/${locale}/settings/academic-years/${id}`)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              ត្រឡប់ទៅឆ្នាំសិក្សា
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_48%,#f8fafc_100%)] lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_360px]">
              <CompactHeroCard
                icon={CalendarDays}
                eyebrow="ប្រតិទិនសិក្សា"
                title={calendar?.academicYear?.name || 'ប្រតិទិនឆ្នាំសិក្សា'}
                description="រៀបចំវិសមកាល ការប្រឡង និងព្រឹត្តិការណ៍សំខាន់ៗជាចន្លោះថ្ងៃបានយ៉ាងច្បាស់។"
                chipsPosition="below"
                backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#ecfdf5_54%,#ecfeff_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-emerald-500"
                iconShellClassName="bg-gradient-to-br from-emerald-600 to-cyan-500 text-white"
                breadcrumbs={
                  <button
                    onClick={() => router.push(`/${locale}/settings/academic-years/${id}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    ត្រឡប់ទៅឆ្នាំសិក្សា
                  </button>
                }
                chips={
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                      <CalendarDays className="h-4 w-4 text-emerald-500" />
                      {calendar?.academicYear
                        ? `${formatDateLabel(calendar.academicYear.startDate)} - ${formatDateLabel(calendar.academicYear.endDate)}`
                        : 'មិនទាន់មានចន្លោះកាលបរិច្ឆេទ'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      មានព្រឹត្តិការណ៍ក្នុង {monthsCovered} ខែ
                    </span>
                  </>
                }
                actions={
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
                  >
                    <Plus className="h-4 w-4" />
                    បន្ថែមព្រឹត្តិការណ៍
                  </button>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-emerald-200/70 bg-[linear-gradient(145deg,rgba(6,78,59,0.96),rgba(6,95,70,0.94)_48%,rgba(8,145,178,0.9))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(6,95,70,0.54)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-100/80">សង្ខេបប្រតិទិន</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{totalEvents}</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-emerald-100/75">ព្រឹត្តិការណ៍</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <CalendarDays className="h-7 w-7 text-emerald-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200"
                    style={{ width: `${Math.max(12, Math.min(100, totalEvents * 12))}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'សាធារណៈ', value: publicEvents },
                    { label: 'ថ្ងៃឈប់', value: closures },
                    { label: 'ខែ', value: monthsCovered },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-emerald-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-50/90">
                  វិសមកាល និងថ្ងៃឈប់ត្រូវបានដកចេញពីថ្ងៃសិក្សា
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="ព្រឹត្តិការណ៍សរុប" value={totalEvents} helper="ព្រឹត្តិការណ៍ទាំងអស់ក្នុងឆ្នាំសិក្សានេះ" />
              <MetricCard label="ព្រឹត្តិការណ៍សាធារណៈ" value={publicEvents} helper="អាចបង្ហាញទៅអ្នកប្រើក្រៅផ្នែកគ្រប់គ្រង" />
              <MetricCard label="វិសមកាល និងថ្ងៃឈប់" value={closures} helper="ព្រឹត្តិការណ៍ដែលមិនរាប់ជាថ្ងៃសិក្សា" />
              <MetricCard label="ខែដែលមានព្រឹត្តិការណ៍" value={monthsCovered} helper="ចំនួនខែដែលមានព្រឹត្តិការណ៍យ៉ាងតិចមួយ" />
            </div>
          </AnimatedContent>

          {error ? (
            <AnimatedContent delay={0.08}>
              <div className="mt-5 flex items-center gap-3 rounded-[1.35rem] border border-red-100 bg-white dark:bg-gray-900/90 px-5 py-4 shadow-sm ring-1 ring-red-100/70">
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-red-50 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="flex-1 text-sm font-medium text-red-700">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="rounded-full p-2 text-red-500 transition hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.1}>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
              <SectionCard
                eyebrow="តាមលំដាប់ពេលវេលា"
                title="កាលវិភាគព្រឹត្តិការណ៍"
                action={
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    បន្ថែមព្រឹត្តិការណ៍
                  </button>
                }
              >
                {groupedEvents.length > 0 ? (
                  <div className="space-y-5">
                    {groupedEvents.map(([month, events]) => (
                      <div key={month} className="rounded-[1.35rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">ខែ</p>
                            <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{month}</h3>
                          </div>
                          <span className="rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                            {events.length} ព្រឹត្តិការណ៍
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {events.map((event) => {
                            const meta = getEventTypeMeta(event.type);
                            const Icon = meta.icon;
                            return (
                              <div
                                key={event.id}
                                className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-none dark:bg-gray-900 px-4 py-4 shadow-sm"
                              >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="flex min-w-0 items-start gap-4">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br ${meta.accent} text-white shadow-lg shadow-slate-200/50`}>
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-base font-bold text-slate-950">{event.title}</p>
                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${meta.badge}`}>
                                          {meta.label}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-sm font-medium text-slate-600">
                                        {formatShortDate(event.startDate)}
                                        {event.endDate && event.endDate !== event.startDate ? ` - ${formatShortDate(event.endDate)}` : ''}
                                      </p>
                                      {event.description ? (
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{event.description}</p>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end lg:self-start">
                                    {!event.isSchoolDay ? (
                                      <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                                        មិនមែនថ្ងៃសិក្សា
                                      </span>
                                    ) : null}
                                    {!event.isPublic ? (
                                      <span className="rounded-full border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-none dark:bg-gray-800 px-3 py-1 text-xs font-bold text-slate-600">
                                        ផ្ទៃក្នុង
                                      </span>
                                    ) : null}
                                    <button
                                      onClick={() => handleDeleteEvent(event.id)}
                                      className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      លុប
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-6 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white dark:bg-none dark:bg-gray-900 shadow-sm ring-1 ring-slate-200/70">
                      <CalendarDays className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-slate-950">មិនទាន់មានព្រឹត្តិការណ៍</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                      បន្ថែមវិសមកាល ថ្ងៃឈប់សម្រាក ការប្រឡង ឬព្រឹត្តិការណ៍សំខាន់ៗសម្រាប់ឆ្នាំសិក្សានេះ។
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      បន្ថែមព្រឹត្តិការណ៍ដំបូង
                    </button>
                  </div>
                )}
              </SectionCard>

              <div className="space-y-5">
                <SectionCard eyebrow="សញ្ញាសម្គាល់" title="ប្រភេទព្រឹត្តិការណ៍">
                  <div className="space-y-3">
                    {EVENT_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div
                          key={type.value}
                          className="flex items-center gap-3 rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3"
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-gradient-to-br ${type.accent} text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-950">{type.label}</p>
                            <p className="mt-1 text-sm text-slate-500">ប្រើសម្រាប់កំណត់ប្រតិទិនសិក្សា</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard eyebrow="ការណែនាំ" title="របៀបប្រើឱ្យត្រឹមត្រូវ">
                  <div className="space-y-3">
                    {[
                      'ប្រើ «វិសមកាល» សម្រាប់ចន្លោះថ្ងៃឈប់ ដូចជា ០៦–២០ មេសា ហើយប្រព័ន្ធនឹងកំណត់ថាមិនមែនជាថ្ងៃសិក្សា។',
                      'ប្រើ «រយៈពេលប្រឡង» សម្រាប់ការប្រឡងជាក់ស្តែង។ វិសមកាលមិនត្រូវបានចាត់ទុកថាជាការប្រឡងទេ។',
                      'បិទការបង្ហាញជាសាធារណៈ សម្រាប់ព្រឹត្តិការណ៍ផ្ទៃក្នុងដែលចង់ឱ្យឃើញតែអ្នកគ្រប់គ្រង។',
                    ].map((item) => (
                      <div key={item} className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-4 text-sm leading-6 text-slate-600">
                        {item}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
          </AnimatedContent>
        </div>

        {showAddModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-none dark:bg-gray-900 shadow-[0_42px_120px_-44px_rgba(15,23,42,0.45)] ring-1 ring-white/80 animate-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-gray-800/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(236,253,245,0.92)_58%,rgba(236,254,255,0.9))] px-6 py-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">ប្រតិទិនសិក្សា</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">បន្ថែមព្រឹត្តិការណ៍ ឬវិសមកាល</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    កំណត់ចន្លោះថ្ងៃជាក់លាក់ ដោយមិនប៉ះពាល់ដល់ខែទាំងមូល។
                  </p>
                </div>
                <button
                  onClick={closeAddModal}
                  className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 p-3 text-slate-400 transition hover:text-slate-900 dark:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_260px]">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        ប្រភេទ
                      </label>
                      <select
                        value={newEvent.type}
                        onChange={(event) => {
                          const nextType = event.target.value;
                          setNewEvent({
                            ...newEvent,
                            type: nextType,
                            isSchoolDay: nextType === 'VACATION' || nextType === 'HOLIDAY'
                              ? false
                              : newEvent.isSchoolDay,
                          });
                        }}
                        className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                      >
                        {EVENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        ឈ្មោះ
                      </label>
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })}
                        placeholder="ឧ. វិសមកាលតូច"
                        className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        ការពិពណ៌នា (មិនចាំបាច់)
                      </label>
                      <textarea
                        value={newEvent.description}
                        onChange={(event) => setNewEvent({ ...newEvent, description: event.target.value })}
                        placeholder="បន្ថែមព័ត៌មានសម្រាប់គ្រូ សិស្ស ឬមាតាបិតា"
                        rows={4}
                        className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                          ថ្ងៃចាប់ផ្តើម
                        </label>
                        <input
                          type="date"
                          value={newEvent.startDate}
                          onChange={(event) => setNewEvent({ ...newEvent, startDate: event.target.value })}
                          min={calendar?.academicYear?.startDate?.slice(0, 10)}
                          max={calendar?.academicYear?.endDate?.slice(0, 10)}
                          className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                          ថ្ងៃបញ្ចប់
                        </label>
                        <input
                          type="date"
                          value={newEvent.endDate}
                          onChange={(event) => setNewEvent({ ...newEvent, endDate: event.target.value })}
                          min={newEvent.startDate || calendar?.academicYear?.startDate?.slice(0, 10)}
                          max={calendar?.academicYear?.endDate?.slice(0, 10)}
                          className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.35rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">មើលជាមុន</p>
                      <div className="mt-4 flex items-start gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br ${highlightType.accent} text-white shadow-lg shadow-slate-200/60`}>
                          <HighlightIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">{newEvent.title || 'ឈ្មោះព្រឹត្តិការណ៍'}</p>
                          <p className="mt-1 text-sm text-slate-500">{highlightType.label}</p>
                          <p className="mt-2 text-sm text-slate-500">
                            {newEvent.startDate ? formatShortDate(newEvent.startDate) : 'សូមជ្រើសកាលបរិច្ឆេទ'}
                            {newEvent.endDate && newEvent.endDate !== newEvent.startDate
                              ? ` - ${formatShortDate(newEvent.endDate)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">ជម្រើស</p>
                      <div className="mt-4 space-y-3">
                        <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={newEvent.isSchoolDay}
                            onChange={(event) => setNewEvent({ ...newEvent, isSchoolDay: event.target.checked })}
                            disabled={newEvent.type === 'VACATION' || newEvent.type === 'HOLIDAY'}
                            className="h-4 w-4 rounded border-slate-300 dark:border-gray-700 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-950">រាប់ជាថ្ងៃសិក្សា</p>
                            <p className="text-sm text-slate-500">វិសមកាល និងថ្ងៃឈប់ នឹងបិទជម្រើសនេះដោយស្វ័យប្រវត្តិ។</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={newEvent.isPublic}
                            onChange={(event) => setNewEvent({ ...newEvent, isPublic: event.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 dark:border-gray-700 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-950">បង្ហាញជាសាធារណៈ</p>
                            <p className="text-sm text-slate-500">អនុញ្ញាតឱ្យគ្រូ សិស្ស និងមាតាបិតាឃើញព្រឹត្តិការណ៍នេះ។</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  onClick={closeAddModal}
                  className="rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-slate-100 dark:bg-gray-800"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកព្រឹត្តិការណ៍'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
