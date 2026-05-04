'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import {
  formatLocalDateEnCa,
  getAttendanceSummaryDateRange,
  useAttendanceSummary,
  type AttendanceSummaryRange,
} from '@/hooks/useAttendanceSummary';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import { downloadAttendanceAuditCsv } from '@/lib/attendance/auditExport';
import { reportClientOperationalError } from '@/lib/observability/clientError';
import { isSchoolAttendanceAdminRole } from '@/lib/permissions/schoolAttendance';
import { TokenManager } from '@/lib/api/auth';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  School,
  ShieldAlert,
  TrendingUp,
  UserRound,
  Users,
  FileEdit,
  Filter,
  Search,
} from 'lucide-react';

type SessionStat = {
  present: number;
  absent: number;
  late: number;
  total: number;
};

type ClassInsight = {
  id: string;
  name: string;
  rate: number;
};

type CheckInLog = {
  id?: string;
  date?: string;
  status?: string;
  timeIn?: string | null;
  timeOut?: string | null;
  teacher?: {
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    user?: {
      displayName?: string;
    };
  };
};

type SessionMonitorRowPayload = {
  classId: string;
  className: string;
  grade: string | null;
  periodId: string | null;
  periodName: string | null;
  periodStartTime: string | null;
  subjectId: string | null;
  subjectName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  timeInIso: string | null;
  timeOutIso: string | null;
  attendanceStatusRaw: string | null;
  displayStatus: string;
};

type SessionMonitorPayload = {
  summary: {
    totalClassesInYear: number;
    withFirstPeriod: number;
    unassignedSlots: number;
    notCheckedIn: number;
    absentMarked: number;
    permission: number;
    excused: number;
    onTime: number;
    late: number;
    noSlots: number;
  };
  rows: SessionMonitorRowPayload[];
  academicYearId: string | null;
  dayOfWeek: string | null;
  lateGraceMinutes: number;
};

const SESSION_KEYS = ['MORNING', 'AFTERNOON'] as const;

const SESSION_MONITOR_ISSUE_STATUSES = new Set([
  'NO_SLOT',
  'UNASSIGNED',
  'NOT_CHECKED_IN',
  'ABSENT',
  'PRESENT_LATE',
]);

/** Order for session monitor status filter chips */
const SESSION_MONITOR_FILTER_STATUSES = [
  'PRESENT_ON_TIME',
  'PRESENT_LATE',
  'NOT_CHECKED_IN',
  'ABSENT',
  'PERMISSION',
  'EXCUSED',
  'UNASSIGNED',
  'NO_SLOT',
] as const;

/** Visual system for session monitor: rows, filter chips, badges, and time icons */
function sessionMonitorStatusStyle(status: string): {
  dot: string;
  text: string;
  row: string;
  chipOff: string;
  chipOn: string;
  badge: string;
  timeIcon: string;
} {
  switch (status) {
    case 'PRESENT_ON_TIME':
      return {
        dot: 'bg-emerald-500 shadow-sm shadow-emerald-500/40',
        text: 'text-emerald-800 dark:text-emerald-200',
        row: 'border-l-[3px] border-l-emerald-500 bg-emerald-50/45 dark:bg-emerald-950/35',
        chipOff:
          'border-emerald-200/90 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100/90 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/70',
        chipOn:
          'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/25 dark:border-emerald-400 dark:bg-emerald-500',
        badge:
          'inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-950/55 dark:text-emerald-100',
        timeIcon: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'PRESENT_LATE':
      return {
        dot: 'bg-amber-500 shadow-sm shadow-amber-500/40',
        text: 'text-amber-900 dark:text-amber-200',
        row: 'border-l-[3px] border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/35',
        chipOff:
          'border-amber-200/90 bg-amber-50 text-amber-950 hover:border-amber-300 hover:bg-amber-100/90 dark:border-amber-800/70 dark:bg-amber-950/45 dark:text-amber-100 dark:hover:border-amber-600 dark:hover:bg-amber-950/70',
        chipOn:
          'border-amber-600 bg-amber-500 text-amber-950 shadow-md shadow-amber-500/25 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950',
        badge:
          'inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/55 dark:text-amber-100',
        timeIcon: 'text-amber-600 dark:text-amber-400',
      };
    case 'NOT_CHECKED_IN':
    case 'ABSENT':
      return {
        dot: 'bg-rose-500 shadow-sm shadow-rose-500/35',
        text: 'text-rose-900 dark:text-rose-200',
        row: 'border-l-[3px] border-l-rose-500 bg-rose-50/45 dark:bg-rose-950/30',
        chipOff:
          'border-rose-200/90 bg-rose-50 text-rose-950 hover:border-rose-300 hover:bg-rose-100/80 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:border-rose-600 dark:hover:bg-rose-950/65',
        chipOn:
          'border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-600/25 dark:border-rose-400 dark:bg-rose-500',
        badge:
          'inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-rose-100/80 px-2.5 py-0.5 text-xs font-semibold text-rose-950 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-100',
        timeIcon: 'text-rose-500 dark:text-rose-400',
      };
    case 'PERMISSION':
    case 'EXCUSED':
      return {
        dot: 'bg-teal-500 shadow-sm shadow-teal-500/35',
        text: 'text-teal-900 dark:text-teal-200',
        row: 'border-l-[3px] border-l-teal-500 bg-teal-50/40 dark:bg-teal-950/30',
        chipOff:
          'border-teal-200/90 bg-teal-50 text-teal-950 hover:border-teal-300 hover:bg-teal-100/80 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:border-teal-600 dark:hover:bg-teal-950/65',
        chipOn:
          'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/20 dark:border-teal-400 dark:bg-teal-500',
        badge:
          'inline-flex items-center gap-1.5 rounded-full border border-teal-200/90 bg-teal-100/80 px-2.5 py-0.5 text-xs font-semibold text-teal-950 dark:border-teal-800/70 dark:bg-teal-950/50 dark:text-teal-100',
        timeIcon: 'text-teal-600 dark:text-teal-400',
      };
    case 'UNASSIGNED':
    case 'NO_SLOT':
      return {
        dot: 'bg-violet-500 shadow-sm shadow-violet-400/35',
        text: 'text-violet-900 dark:text-violet-200',
        row: 'border-l-[3px] border-l-violet-500 bg-violet-50/40 dark:bg-violet-950/28',
        chipOff:
          'border-violet-200/90 bg-violet-50 text-violet-950 hover:border-violet-300 hover:bg-violet-100/80 dark:border-violet-800/55 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:border-violet-600 dark:hover:bg-violet-950/65',
        chipOn:
          'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-600/20 dark:border-violet-400 dark:bg-violet-500',
        badge:
          'inline-flex items-center gap-1.5 rounded-full border border-violet-200/90 bg-violet-100/80 px-2.5 py-0.5 text-xs font-semibold text-violet-950 dark:border-violet-800/65 dark:bg-violet-950/55 dark:text-violet-100',
        timeIcon: 'text-violet-500 dark:text-violet-400',
      };
    default:
      return {
        dot: 'bg-slate-400',
        text: 'text-slate-700 dark:text-slate-300',
        row: 'border-l-[3px] border-l-slate-300 bg-slate-50/50 dark:border-l-slate-600 dark:bg-gray-900/40',
        chipOff:
          'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-900 dark:text-slate-200 dark:hover:bg-gray-800',
        chipOn:
          'border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-slate-900',
        badge:
          'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-200',
        timeIcon: 'text-slate-400 dark:text-slate-500',
      };
  }
}

function labelForSessionMonitorStatus(
  td: ReturnType<typeof useTranslations<'attendance.adminDashboard'>>,
  status: string
): string {
  switch (status) {
    case 'NO_SLOT':
      return td('monitorStatus_NO_SLOT');
    case 'UNASSIGNED':
      return td('monitorStatus_UNASSIGNED');
    case 'NOT_CHECKED_IN':
      return td('monitorStatus_NOT_CHECKED_IN');
    case 'ABSENT':
      return td('monitorStatus_ABSENT');
    case 'PERMISSION':
      return td('monitorStatus_PERMISSION');
    case 'EXCUSED':
      return td('monitorStatus_EXCUSED');
    case 'PRESENT_ON_TIME':
      return td('monitorStatus_PRESENT_ON_TIME');
    case 'PRESENT_LATE':
      return td('monitorStatus_PRESENT_LATE');
    default:
      return status;
  }
}

/** Sentinel for rows with no parseable / empty grade — still filterable as a bucket */
const SESSION_MONITOR_GRADE_GROUP_NONE = '__NONE__';

/** Prefer leading digits so "10A", "10-B", "Grade 10" share group "10"; non-numeric stays whole string */
function sessionMonitorGradeGroupKeyFromLabel(grade: string | null | undefined): string | null {
  if (grade == null || !String(grade).trim()) return null;
  const g = grade.trim();
  const firstNum = g.match(/^[^\d]*(\d+)/);
  if (firstNum) return firstNum[1];
  const anyNum = g.match(/(\d+)/);
  if (anyNum) return anyNum[1];
  return g;
}

function sessionMonitorRowGradeGroupKey(rowGrade: string | null | undefined): string {
  const k = sessionMonitorGradeGroupKeyFromLabel(rowGrade);
  return k === null ? SESSION_MONITOR_GRADE_GROUP_NONE : k;
}

function labelSessionMonitorGradeGroup(
  key: string,
  td: ReturnType<typeof useTranslations<'attendance.adminDashboard'>>
): string {
  if (key === SESSION_MONITOR_GRADE_GROUP_NONE) return td('monitorFilterNoGradeGroup');
  if (/^\d+$/.test(key)) return td('monitorFilterGradeLevelGroup', { level: key });
  return key;
}

function sortSessionMonitorGradeGroupKeys(a: string, b: string): number {
  if (a === SESSION_MONITOR_GRADE_GROUP_NONE && b === SESSION_MONITOR_GRADE_GROUP_NONE) return 0;
  if (a === SESSION_MONITOR_GRADE_GROUP_NONE) return 1;
  if (b === SESSION_MONITOR_GRADE_GROUP_NONE) return -1;
  const num = (k: string) => (/^\d+$/.test(k) ? parseInt(k, 10) : NaN);
  const na = num(a);
  const nb = num(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  if (!Number.isNaN(na)) return -1;
  if (!Number.isNaN(nb)) return 1;
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  tone: 'emerald' | 'sky' | 'amber' | 'violet';
  icon?: any;
}) {
  const tones = {
    emerald:
      'border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/50 shadow-emerald-500/5 dark:border-emerald-900/30 dark:from-gray-900 dark:to-emerald-950/20',
    sky: 'border-sky-100 bg-gradient-to-br from-white via-white to-sky-50/50 shadow-sky-500/5 dark:border-sky-900/30 dark:from-gray-900 dark:to-sky-950/20',
    amber:
      'border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/50 shadow-amber-500/5 dark:border-amber-900/30 dark:from-gray-900 dark:to-amber-950/20',
    violet:
      'border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/50 shadow-violet-500/5 dark:border-violet-900/30 dark:from-gray-900 dark:to-violet-950/20',
  };

  const iconTones = {
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400',
    sky: 'text-sky-600 bg-sky-100 dark:bg-sky-900/40 dark:text-sky-400',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
    violet: 'text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-400',
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-[2.2rem] border p-7 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] dark:hover:shadow-none ${tones[tone]}`}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">{label}</p>
          {Icon && (
            <div className={`rounded-2xl p-3 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:shadow-md ${iconTones[tone]}`}>
              <Icon className="h-5.5 w-5.5" />
            </div>
          )}
        </div>
        <p className="mt-5 text-5xl font-black tracking-tighter text-slate-950 dark:text-white">{value}</p>
      </div>
      <div className={`absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-current opacity-[0.04] transition-transform duration-700 group-hover:scale-150 ${iconTones[tone].split(' ')[0]}`} />
    </div>
  );
}

function getInitials(log: CheckInLog) {
  const first = log.teacher?.firstName?.charAt(0) || '';
  const last = log.teacher?.lastName?.charAt(0) || '';
  const initials = `${first}${last}`.trim();
  return initials || 'ST';
}

export default function AttendanceDashboardPage(props: { params: Promise<{ locale: string }> }) {
  const format = useFormatter();
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const t = useTranslations('attendance');
  const td = useTranslations('attendance.adminDashboard');
  const { schoolId, loading: academicContextLoading } = useAcademicYear();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [auditExportBusy, setAuditExportBusy] = useState(false);
  const [auditExportError, setAuditExportError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<AttendanceSummaryRange>('month');

  const [monitorDate, setMonitorDate] = useState(() => formatLocalDateEnCa(new Date()));
  const [monitorSession, setMonitorSession] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [monitorPayload, setMonitorPayload] = useState<SessionMonitorPayload | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [monitorSearch, setMonitorSearch] = useState('');
  const [monitorProblemsOnly, setMonitorProblemsOnly] = useState(false);
  const [monitorClassId, setMonitorClassId] = useState('');
  const [monitorGradeGroupKey, setMonitorGradeGroupKey] = useState('');
  const [monitorSelectedStatuses, setMonitorSelectedStatuses] = useState<string[]>([]);
  const monitorFetchSeq = useRef(0);

  const toggleMonitorStatusFilter = useCallback((status: string) => {
    setMonitorSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  const recentMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
      months.push({ id: `${year}-${month}`, label });
    }
    return months;
  }, [locale]);

  const dateRangeOptions: Array<{ id: AttendanceSummaryRange; label: string; shortLabelKey: 'rangeShortDay' | 'rangeShortWeek' | 'rangeShortMonth' | 'rangeShortTerm' }> = [
    { id: 'day', label: t('today'), shortLabelKey: 'rangeShortDay' },
    { id: 'week', label: t('thisWeek'), shortLabelKey: 'rangeShortWeek' },
    { id: 'month', label: t('thisMonth'), shortLabelKey: 'rangeShortMonth' },
    { id: 'semester', label: t('semester'), shortLabelKey: 'rangeShortTerm' },
  ];

  const formatDateLabel = (value?: string | null) => {
    if (!value) return '--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';
    return format.dateTime(parsed, { dateStyle: 'medium' });
  };

  const formatTimeLabel = (value?: string | null) => {
    if (!value) return '--:--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--:--';
    return format.dateTime(parsed, { timeStyle: 'short' });
  };

  const sessionLabel = useCallback((session: string) => {
    if (session === 'MORNING') return td('sessionMorning');
    if (session === 'AFTERNOON') return td('sessionAfternoon');
    return session;
  }, [td]);

  useEffect(() => {
    const snapshot = TokenManager.getUserData();
    if (!snapshot?.user?.role) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    if (!isSchoolAttendanceAdminRole(snapshot.user.role)) {
      router.replace(`/${locale}/feed`);
      return;
    }
    setUser(snapshot.user);
    setSchool(snapshot.school ?? null);
    setSessionReady(true);
  }, [locale, router]);

  const [toolbarRefreshing, setToolbarRefreshing] = useState(false);
  const [manualRefreshBanner, setManualRefreshBanner] = useState<string | null>(null);

  useEffect(() => {
    setManualRefreshBanner(null);
    setAuditExportError(null);
  }, [dateRange]);

  const { data, isLoading, isValidating, error, refresh } = useAttendanceSummary(
    sessionReady ? schoolId : null,
    dateRange
  );

  const handleToolbarRefresh = useCallback(async () => {
    setManualRefreshBanner(null);
    setToolbarRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      reportClientOperationalError('attendance-dashboard-refresh', err, { schoolId: schoolId ?? undefined });
      const message = err instanceof Error ? err.message : td('refreshFailed');
      setManualRefreshBanner(message);
    } finally {
      setToolbarRefreshing(false);
    }
  }, [refresh, td, schoolId]);

  useEffect(() => {
    if (!sessionReady || !schoolId) return;
    const ac = new AbortController();
    const seq = ++monitorFetchSeq.current;
    setMonitorLoading(true);
    setMonitorError(null);
    (async () => {
      try {
        const token = TokenManager.getAccessToken();
        if (!token) {
          if (monitorFetchSeq.current !== seq) return;
          setMonitorError(td('monitorLoadError'));
          setMonitorPayload(null);
          return;
        }
        const res = await fetch(
          `${ATTENDANCE_SERVICE_URL}/attendance/school/session-monitor?date=${encodeURIComponent(monitorDate)}&session=${encodeURIComponent(monitorSession)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ac.signal }
        );
        let json: { success?: boolean; message?: string; data?: SessionMonitorPayload };
        try {
          json = (await res.json()) as typeof json;
        } catch {
          throw new Error(td('monitorLoadError'));
        }
        if (!res.ok || !json.success) {
          throw new Error(typeof json.message === 'string' ? json.message : td('monitorLoadError'));
        }
        if (monitorFetchSeq.current !== seq) return;
        if (json.data) setMonitorPayload(json.data);
        else setMonitorPayload(null);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        if (monitorFetchSeq.current !== seq) return;
        setMonitorError(e instanceof Error ? e.message : td('monitorLoadError'));
        setMonitorPayload(null);
      } finally {
        if (monitorFetchSeq.current === seq) setMonitorLoading(false);
      }
    })();
    return () => ac.abort();
  }, [sessionReady, schoolId, monitorDate, monitorSession, td]);

  const monitorClassOptions = useMemo(() => {
    const rows = monitorPayload?.rows ?? [];
    if (rows.length === 0) return [] as Array<[string, string]>;
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.classId, r.className);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [monitorPayload]);

  const monitorGradeGroupKeys = useMemo(() => {
    const rows = monitorPayload?.rows ?? [];
    const set = new Set<string>();
    for (const r of rows) set.add(sessionMonitorRowGradeGroupKey(r.grade));
    return [...set].sort(sortSessionMonitorGradeGroupKeys);
  }, [monitorPayload]);

  useEffect(() => {
    if (!monitorClassId || !monitorPayload?.rows?.length) return;
    const exists = monitorPayload.rows.some((r) => r.classId === monitorClassId);
    if (!exists) setMonitorClassId('');
  }, [monitorPayload, monitorClassId]);

  useEffect(() => {
    if (!monitorGradeGroupKey) return;
    if (monitorGradeGroupKeys.length === 0 || !monitorGradeGroupKeys.includes(monitorGradeGroupKey)) {
      setMonitorGradeGroupKey('');
    }
  }, [monitorGradeGroupKeys, monitorGradeGroupKey]);

  const monitorRowsFiltered = useMemo(() => {
    const rows = monitorPayload?.rows ?? [];
    let out = rows;
    if (monitorProblemsOnly) {
      out = out.filter((r) => SESSION_MONITOR_ISSUE_STATUSES.has(r.displayStatus));
    }
    if (monitorSelectedStatuses.length > 0) {
      const allow = new Set(monitorSelectedStatuses);
      out = out.filter((r) => allow.has(r.displayStatus));
    }
    if (monitorClassId) {
      out = out.filter((r) => r.classId === monitorClassId);
    }
    if (monitorGradeGroupKey) {
      out = out.filter((r) => sessionMonitorRowGradeGroupKey(r.grade) === monitorGradeGroupKey);
    }
    const q = monitorSearch.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.className.toLowerCase().includes(q) ||
          (r.teacherName || '').toLowerCase().includes(q) ||
          (r.subjectName || '').toLowerCase().includes(q) ||
          (r.grade || '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [
    monitorPayload,
    monitorProblemsOnly,
    monitorSelectedStatuses,
    monitorClassId,
    monitorGradeGroupKey,
    monitorSearch,
  ]);

  const sessionMonitorSnapshot = useMemo(() => {
    if (!monitorPayload) return null;
    const s = monitorPayload.summary;
    const compliant = s.onTime + s.permission + (s.excused ?? 0);
    const attention =
      s.notCheckedIn + s.absentMarked + s.unassignedSlots + s.late + s.noSlots;
    return { summary: s, compliant, attention };
  }, [monitorPayload]);

  const stats = data?.stats || {
    studentCount: 0,
    teacherCount: 0,
    classCount: 0,
    attendanceRate: 0,
    teacherAttendanceRate: 0,
    totals: { present: 0, absent: 0, late: 0 },
    teacherTotals: { present: 0, absent: 0 },
    sessions: {},
  };

  const topClasses = (data?.topClasses || []) as ClassInsight[];
  const atRiskClasses = (data?.atRiskClasses || []) as ClassInsight[];
  const recentCheckIns = (data?.recentCheckIns || []) as CheckInLog[];

  const trendSeries = useMemo(() => {
    const raw = data?.trend || [];
    return [...raw]
      .filter((p) => typeof p.date === 'string' && /^(\d{4}-\d{2}-\d{2})/.test(p.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-21);
  }, [data?.trend]);

  const trendScaleMax = useMemo(() => {
    const totals = trendSeries.map((p) => (Number(p.present) || 0) + (Number(p.absent) || 0) + (Number(p.late) || 0));
    return Math.max(1, ...totals);
  }, [trendSeries]);

  const combinedPresent = (stats.totals.present || 0) + (stats.teacherTotals?.present || 0);
  const readyScore = Math.round(((stats.attendanceRate || 0) + (stats.teacherAttendanceRate || 0)) / 2);
  const totalCheckIns = recentCheckIns.length;
  const rangeLabel = dateRangeOptions.find((item) => item.id === dateRange)?.label || recentMonths.find(m => m.id === dateRange)?.label || t('thisMonth');
  const activeRangeCfg = dateRangeOptions.find((item) => item.id === dateRange);
  const rangeShortLabel = activeRangeCfg ? td(activeRangeCfg.shortLabelKey) : rangeLabel;

  const sessionCards = useMemo(() => {
    return SESSION_KEYS.map((session) => {
      const sessionData = (stats.sessions?.[session] || {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      }) as SessionStat;
      const rate = sessionData.total > 0
        ? Math.round(((sessionData.present + sessionData.late) / sessionData.total) * 100)
        : 0;

      return {
        session,
        rate,
        data: sessionData,
      };
    });
  }, [stats.sessions]);

  const auditDateRange = useMemo(() => getAttendanceSummaryDateRange(dateRange), [dateRange]);

  const handleAuditExport = useCallback(async () => {
    setAuditExportError(null);
    setAuditExportBusy(true);
    try {
      await downloadAttendanceAuditCsv(auditDateRange.startDate, auditDateRange.endDate);
    } catch (err) {
      reportClientOperationalError('attendance-audit-export', err, auditDateRange);
      setAuditExportError(err instanceof Error ? err.message : td('auditExportFailed'));
    } finally {
      setAuditExportBusy(false);
    }
  }, [auditDateRange, td]);

  const handleLogout = async () => {
    await TokenManager.logout();
    window.location.href = `/${locale}/auth/login`;
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)]">
        <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
      </div>
    );
  }

  if (academicContextLoading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 lg:ml-64">
          <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">{t('syncing')}</p>
          </div>
        </div>
      </>
    );
  }

  if (!schoolId) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 lg:ml-64">
          <div className="mx-auto max-w-md rounded-[1.75rem] border border-amber-200/80 bg-amber-50/90 px-8 py-10 text-center shadow-lg ring-1 ring-amber-100">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
            <h1 className="mt-4 text-lg font-black tracking-tight text-slate-950">{td('needsSchoolTitle')}</h1>
            <p className="mt-3 text-sm font-medium text-slate-600">{td('needsSchoolDescription')}</p>
            <Link
              href={`/${locale}/dashboard`}
              className="mt-6 inline-flex items-center justify-center rounded-[0.95rem] bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
            >
              {td('goToDashboard')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (isLoading && !data) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 lg:ml-64">
          <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">{td('loadingSummary')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_52%,#f8fafc_100%)] lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-500">{td('heroEyebrow')}</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{td('heroTitle')}</h1>
              </div>
            </div>

            <div className="mt-4 rounded-[2.2rem] border border-white bg-white/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/50 backdrop-blur-2xl dark:bg-gray-900/60 dark:border-gray-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">{td('workflowStripTitle')}</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Action Center</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as AttendanceSummaryRange)}
                      className="appearance-none rounded-[1.1rem] border border-slate-200/80 bg-white px-4 py-2.5 pr-10 text-sm font-bold text-slate-800 shadow-sm outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-sky-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    >
                      <optgroup label={t('range')}>
                        {dateRangeOptions.map((range) => (
                          <option key={range.id} value={range.id}>{range.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label={td('recentMonths')}>
                        {recentMonths.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleToolbarRefresh()}
                    disabled={toolbarRefreshing || isValidating || !schoolId}
                    title={td('refreshTitle')}
                    className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-slate-200/80 bg-white shadow-sm transition-all hover:bg-slate-50 active:scale-95 dark:bg-gray-800 dark:border-gray-700"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 text-slate-600 dark:text-slate-400 ${toolbarRefreshing || isValidating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href={`/${locale}/attendance/mark`}
                  className="group flex items-center gap-3 rounded-[1.2rem] border border-slate-200/50 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500 transition-colors group-hover:bg-sky-100 dark:bg-sky-950/30">
                    <CalendarDays className="h-4.5 w-4.5" />
                  </div>
                  {td('linkMarkAttendance')}
                </Link>
                <Link
                  href={`/${locale}/timetable`}
                  className="group flex items-center gap-3 rounded-[1.2rem] border border-slate-200/50 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500 transition-colors group-hover:bg-violet-100 dark:bg-violet-950/30">
                    <Clock3 className="h-4.5 w-4.5" />
                  </div>
                  {td('linkTimetable')}
                </Link>
                <Link
                  href={`/${locale}/attendance/reports`}
                  className="group flex items-center gap-3 rounded-[1.2rem] border border-slate-200/50 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-950/30">
                    <BarChart3 className="h-4.5 w-4.5" />
                  </div>
                  {td('linkReports')}
                </Link>
                <button
                  type="button"
                  disabled={auditExportBusy}
                  title={td('auditExportHint')}
                  onClick={() => void handleAuditExport()}
                  className="group flex items-center gap-3 rounded-[1.2rem] border border-slate-200/50 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 transition-colors group-hover:bg-sky-100 dark:bg-gray-900">
                    {auditExportBusy ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-slate-400" />
                    ) : (
                      <FileDown className="h-4.5 w-4.5" />
                    )}
                  </div>
                  {auditExportBusy ? td('auditExportBusy') : td('auditExportCsv')}
                </button>
              </div>
            </div>

            {manualRefreshBanner ? (
              <div className="mt-4 rounded-[1.15rem] border border-rose-200/90 bg-rose-50/95 px-4 py-3 text-sm font-semibold text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                {manualRefreshBanner}
              </div>
            ) : null}

            {auditExportError ? (
              <div className="mt-4 rounded-[1.15rem] border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm font-semibold text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                {auditExportError}
              </div>
            ) : null}
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={td('metricLearnerAttendance')} value={`${stats.attendanceRate || 0}%`} tone="emerald" icon={TrendingUp} />
              <MetricCard label={td('metricStaffAttendance')} value={`${stats.teacherAttendanceRate || 0}%`} tone="sky" icon={Users} />
              <MetricCard label={td('metricCombinedPresentLabel')} value={combinedPresent} tone="violet" icon={CheckCircle2} />
              <MetricCard label={td('metricActiveClassesLabel')} value={stats.classCount || topClasses.length || atRiskClasses.length} tone="amber" icon={School} />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.055}>
            <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/30 ring-1 ring-slate-100/80 dark:border-gray-800 dark:bg-gray-950 dark:shadow-none dark:ring-gray-800/60">
              {/* Header */}
              <header className="flex flex-col gap-6 border-b border-slate-200 px-6 py-6 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    {td('monitorEyebrow')}
                  </div>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {td('monitorTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {td('monitorSubtitle')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => setMonitorSession('MORNING')}
                      className={`rounded-md px-3 py-1.5 font-medium transition ${
                        monitorSession === 'MORNING'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {td('monitorSessionMorning')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonitorSession('AFTERNOON')}
                      className={`rounded-md px-3 py-1.5 font-medium transition ${
                        monitorSession === 'AFTERNOON'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {td('monitorSessionAfternoon')}
                    </button>
                  </div>
                  <input
                    id="session-monitor-date"
                    type="date"
                    value={monitorDate}
                    onChange={(e) => setMonitorDate(e.target.value)}
                    aria-label={td('monitorDateLabel')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500 dark:focus:ring-white/5"
                  />
                </div>
              </header>

              {/* KPI strip */}
              {sessionMonitorSnapshot ? (
                <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/40 dark:border-gray-800 dark:bg-gray-900/30 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: td('monitorKpiCohort'), value: sessionMonitorSnapshot.summary.totalClassesInYear, tone: 'neutral' as const },
                    { label: td('monitorKpiScheduled'), value: sessionMonitorSnapshot.summary.withFirstPeriod, tone: 'neutral' as const },
                    { label: td('monitorKpiCompliant'), value: sessionMonitorSnapshot.compliant, tone: 'positive' as const },
                    { label: td('monitorKpiOntimeLabel'), value: sessionMonitorSnapshot.summary.onTime, tone: 'positive' as const },
                    {
                      label: td('monitorKpiAttention'),
                      value: sessionMonitorSnapshot.attention,
                      tone: sessionMonitorSnapshot.attention > 0 ? ('warning' as const) : ('neutral' as const),
                    },
                    {
                      label: td('monitorKpiLate'),
                      value: sessionMonitorSnapshot.summary.late,
                      tone: sessionMonitorSnapshot.summary.late > 0 ? ('danger' as const) : ('neutral' as const),
                    },
                  ].map((kpi, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-1 border-b border-r border-slate-200 px-5 py-4 last:border-r-0 dark:border-gray-800 sm:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n)]:border-r lg:[&:nth-child(6)]:border-r-0 lg:border-b-0"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {kpi.label}
                      </span>
                      <span
                        className={`text-2xl font-semibold tabular-nums tracking-tight ${
                          kpi.tone === 'positive'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : kpi.tone === 'warning'
                              ? 'text-amber-600 dark:text-amber-400'
                              : kpi.tone === 'danger'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {kpi.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Toolbar */}
              <div className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50/95 via-white to-sky-50/25 px-5 py-4 dark:border-gray-800 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/25 sm:px-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,15rem)_minmax(10rem,15rem)_auto] lg:items-end lg:gap-x-4">
                  <div className="flex min-h-10 flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {td('monitorFilterSearch')}
                    </span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500/80 dark:text-sky-400/70" />
                      <input
                        type="search"
                        value={monitorSearch}
                        onChange={(e) => setMonitorSearch(e.target.value)}
                        placeholder={td('searchPlaceholder')}
                        className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-sky-500/0 transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-sky-600/50 dark:focus:ring-sky-400/10"
                      />
                    </div>
                  </div>
                  <div className="flex min-h-10 flex-col gap-1.5">
                    <label
                      htmlFor="monitor-class-filter"
                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      {td('monitorFilterClass')}
                    </label>
                    <select
                      id="monitor-class-filter"
                      value={monitorClassId}
                      onChange={(e) => setMonitorClassId(e.target.value)}
                      disabled={monitorClassOptions.length === 0}
                      className="w-full min-w-0 rounded-xl border border-slate-200/90 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-900 shadow-sm outline-none ring-violet-500/0 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-100 dark:focus:border-violet-500/40 dark:focus:ring-violet-400/10"
                    >
                      <option value="">{td('monitorFilterAllClasses')}</option>
                      {monitorClassOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-h-10 flex-col gap-1.5">
                    <label
                      htmlFor="monitor-grade-group-filter"
                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      {td('monitorFilterGradeGroup')}
                    </label>
                    <select
                      id="monitor-grade-group-filter"
                      value={monitorGradeGroupKey}
                      onChange={(e) => setMonitorGradeGroupKey(e.target.value)}
                      disabled={monitorGradeGroupKeys.length === 0}
                      className="w-full min-w-0 rounded-xl border border-slate-200/90 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-900 shadow-sm outline-none ring-emerald-500/0 transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-100 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-400/10"
                    >
                      <option value="">{td('monitorFilterAllGrades')}</option>
                      {monitorGradeGroupKeys.map((key) => (
                        <option key={key} value={key}>
                          {labelSessionMonitorGradeGroup(key, td)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-h-10 flex-col gap-1.5 lg:text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 lg:min-h-[14px]">
                      {td('monitorFilterView')}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
                      <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm font-medium text-amber-950 shadow-sm transition hover:bg-amber-100/90 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100 dark:hover:bg-amber-950/55">
                        <input
                          type="checkbox"
                          checked={monitorProblemsOnly}
                          onChange={(e) => setMonitorProblemsOnly(e.target.checked)}
                          className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500/25 dark:border-amber-600 dark:bg-gray-900 dark:text-amber-500"
                        />
                        {td('monitorProblemsOnly')}
                      </label>
                      {monitorLoading ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {td('monitorSyncRefreshing')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm shadow-slate-200/20 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/55 dark:shadow-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    <span className="flex shrink-0 items-center gap-2 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                        <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </span>
                      {td('monitorFilterStatus')}
                    </span>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {SESSION_MONITOR_FILTER_STATUSES.map((status) => {
                        const pressed = monitorSelectedStatuses.includes(status);
                        const st = sessionMonitorStatusStyle(status);
                        return (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={pressed}
                            onClick={() => toggleMonitorStatusFilter(status)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 ${
                              pressed ? st.chipOn : st.chipOff
                            }`}
                          >
                            {labelForSessionMonitorStatus(td, status)}
                          </button>
                        );
                      })}
                      {monitorSelectedStatuses.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setMonitorSelectedStatuses([])}
                          className="rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-900 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700 dark:hover:text-white"
                        >
                          {td('monitorFilterClearStatuses')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Banners */}
              {monitorError ? (
                <div className="border-b border-rose-100 bg-rose-50/60 px-6 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
                  <span className="inline-flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {monitorError}
                  </span>
                </div>
              ) : null}

              {(monitorPayload?.summary.excused ?? 0) > 0 ? (
                <div className="border-b border-slate-200 bg-slate-50/60 px-6 py-2.5 text-xs text-slate-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-slate-400">
                  {td('monitorSummaryExcused', { count: monitorPayload!.summary.excused ?? 0 })}
                </div>
              ) : null}

              {/* Table / states */}
              {monitorLoading && !monitorPayload ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">{td('loadingSummary')}</p>
                </div>
              ) : monitorPayload && monitorPayload.rows.length === 0 ? (
                <div className="px-6 py-20 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-500">
                    <School className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{td('monitorEmpty')}</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{td('monitorEmptyHint')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/90 bg-gradient-to-r from-slate-100 via-slate-50/95 to-indigo-50/40 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-violet-950/40 dark:text-slate-400">
                        <th className="whitespace-nowrap px-6 py-3.5">{td('monitorColClass')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('monitorColGrade')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('monitorColPeriod')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('monitorColStart')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('monitorColSubject')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('monitorColTeacher')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('monitorColStatus')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('labelCheckIn')}</th>
                        <th className="whitespace-nowrap px-6 py-3.5">{td('labelCheckOut')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitorRowsFiltered.map((row) => {
                        const statusUi = sessionMonitorStatusStyle(row.displayStatus);
                        return (
                          <tr
                            key={row.classId}
                            className={`border-b border-slate-100/90 transition hover:saturate-110 dark:border-gray-800/70 ${statusUi.row}`}
                          >
                            <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">{row.className}</td>
                            <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">{row.grade ?? '—'}</td>
                            <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">{row.periodName ?? '—'}</td>
                            <td className="px-6 py-3.5 font-mono text-xs tabular-nums font-medium text-slate-800 dark:text-slate-200">
                              {row.periodStartTime ?? '—'}
                            </td>
                            <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">{row.subjectName ?? '—'}</td>
                            <td className="px-6 py-3.5 text-slate-800 dark:text-slate-200">{row.teacherName ?? '—'}</td>
                            <td className="px-6 py-3.5">
                              <span className={statusUi.badge}>
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusUi.dot}`} aria-hidden />
                                <span className={statusUi.text}>{labelForSessionMonitorStatus(td, row.displayStatus)}</span>
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              {row.timeInIso ? (
                                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                                  <LogIn className={`h-3.5 w-3.5 shrink-0 ${statusUi.timeIcon}`} aria-hidden />
                                  {formatTimeLabel(row.timeInIso)}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5">
                              {row.timeOutIso ? (
                                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                                  <LogOut className={`h-3.5 w-3.5 shrink-0 ${statusUi.timeIcon}`} aria-hidden />
                                  {formatTimeLabel(row.timeOutIso)}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-gray-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {monitorRowsFiltered.length === 0 && monitorPayload && monitorPayload.rows.length > 0 ? (
                    <div className="border-t border-slate-200/90 bg-gradient-to-r from-slate-50 to-indigo-50/30 px-6 py-12 text-center text-sm font-medium text-slate-600 dark:border-gray-800 dark:from-gray-900/80 dark:to-violet-950/25 dark:text-slate-400">
                      {td('monitorNoMatchingRows')}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Footer */}
              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 dark:border-gray-800 dark:text-slate-400">
                <span>
                  {td('monitorDescription', { minutes: monitorPayload?.lateGraceMinutes ?? 15 })}
                </span>
              </footer>
            </section>
          </AnimatedContent>

          {error ? (
            <AnimatedContent delay={0.08}>
              <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]">{td('loadErrorTitle')}</p>
                  <p className="mt-1 text-sm font-medium">{error.message}</p>
                </div>
                <button
                  onClick={() => void handleToolbarRefresh()}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  {td('retryAction')}
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.1}>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] ring-1 ring-slate-200/40 backdrop-blur-xl dark:bg-gray-900/60 dark:border-gray-800">
                <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-gray-800/60 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{td('sessionsEyebrow')}</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{td('sessionsTitle')}</h2>
                    <p className="mt-1.5 text-sm font-medium text-slate-500/80">{td('sessionsDescription')}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 dark:bg-gray-800/50 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                    {td('liveWindowBadge')}
                  </div>
                </div>

                <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
                  {sessionCards.map((session) => (
                    <div key={session.session} className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200/50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-lg dark:bg-gray-800/30 dark:border-gray-700/50 dark:hover:bg-gray-800/50">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400/80">{sessionLabel(session.session)}</p>
                          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{session.rate}%</p>
                        </div>
                        <div className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${session.rate >= 90 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                          {session.rate >= 90 ? t('healthy') : t('watch')}
                        </div>
                      </div>

                      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200/50 dark:bg-gray-700/30">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${session.rate >= 90 ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'}`}
                          style={{ width: `${session.rate}%` }}
                        />
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-3">
                        {[
                          { label: td('countPresent'), value: session.data.present, color: 'text-emerald-600' },
                          { label: td('countLate'), value: session.data.late, color: 'text-amber-500' },
                          { label: td('countAbsent'), value: session.data.absent, color: 'text-rose-500' },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-xl bg-white dark:bg-gray-900/50 p-3 text-center ring-1 ring-slate-100 dark:ring-gray-800">
                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400/80">{stat.label}</p>
                            <p className={`mt-1.5 text-sm font-black ${stat.color}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

               <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] ring-1 ring-slate-200/40 backdrop-blur-xl dark:bg-gray-900/60 dark:border-gray-800">
                <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-gray-800/60 px-6 py-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{td('insightsEyebrow')}</p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{td('insightsTitle')}</h2>
                  <p className="text-sm font-medium text-slate-500/80">{td('insightsDescription')}</p>
                </div>

                <div className="space-y-6 px-6 py-6">
                  <div>
                    <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-100">
                      <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-900/30">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      {td('topClassesLabel')}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {topClasses.length > 0 ? topClasses.map((item) => (
                        <div key={item.id} className="group rounded-[1.2rem] border border-slate-200/50 bg-white/50 px-4 py-4 transition-all hover:bg-white dark:bg-gray-800/40 dark:border-gray-700/50">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-950 dark:text-white">{item.name}</p>
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400">{td('topClassHelper')}</p>
                            </div>
                            <span className="text-sm font-black text-emerald-600">{Math.round(item.rate || 0)}%</span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700/50">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${item.rate || 0}%` }} />
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-full rounded-[1.2rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50/50 py-8 text-center text-sm font-medium text-slate-400">
                          {td('topClassesEmpty')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-100">
                      <div className="rounded-lg bg-amber-50 p-1.5 dark:bg-amber-900/30">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      {td('atRiskLabel')}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {atRiskClasses.length > 0 ? atRiskClasses.map((item) => (
                        <div key={item.id} className="group rounded-[1.2rem] border border-amber-100 bg-amber-50/40 px-4 py-4 transition-all hover:bg-amber-50/60">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-950 dark:text-white">{item.name}</p>
                              <p className="mt-0.5 text-[10px] font-medium text-amber-600/80">{td('atRiskHelper')}</p>
                            </div>
                            <span className="text-sm font-black text-amber-600">{Math.round(item.rate || 0)}%</span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100/50">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.4)]" style={{ width: `${item.rate || 0}%` }} />
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-full rounded-[1.2rem] border border-emerald-100/50 bg-emerald-50/30 py-8 text-center text-sm font-bold text-emerald-600/60">
                          {td('allClearAtRisk')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.12}>
            <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] ring-1 ring-slate-200/40 backdrop-blur-xl dark:bg-gray-900/60 dark:border-gray-800">
              <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-gray-800/60 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{td('activityEyebrow')}</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{td('activityTitle')}</h2>
                  <p className="mt-1.5 text-sm font-medium text-slate-500/80">{td('activityDescription')}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/50 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 shadow-sm dark:bg-emerald-950/30 dark:text-emerald-400">
                  {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {isValidating ? td('syncRefreshing') : td('syncSynced')}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder={td('searchPlaceholder')}
                      className="w-full rounded-[1rem] border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:border-sky-500"
                    />
                  </div>
                </div>

                {recentCheckIns.length > 0 ? (
                  <div className="overflow-x-auto rounded-[1.25rem] border border-slate-200 dark:border-gray-800">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:bg-gray-800/80 dark:text-gray-400">
                        <tr>
                          <th className="px-6 py-4">{td('tableColName')}</th>
                          <th className="px-6 py-4">{td('tableColRole')}</th>
                          <th className="px-6 py-4">{td('tableColDate')}</th>
                          <th className="px-6 py-4">{td('tableColTime')}</th>
                          <th className="px-6 py-4 text-right">{td('tableColActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white dark:divide-gray-800/50 dark:bg-gray-900/30">
                        {recentCheckIns.map((log, index) => (
                          <tr key={log.id || index} className="transition hover:bg-slate-50/80 dark:hover:bg-gray-800/40">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                  {getInitials(log)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-gray-100">
                                    {`${log.teacher?.firstName || ''} ${log.teacher?.lastName || ''}`.trim() || td('fallbackStaffMember')}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-gray-400">
                              {log.teacher?.user?.displayName || td('fallbackAcademicStaff')}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-gray-300 font-medium">
                              {formatDateLabel(log.date)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {log.timeIn ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    <LogIn className="h-3.5 w-3.5" />
                                    {formatTimeLabel(log.timeIn)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-gray-600">--:--</span>
                                )}
                                {log.timeOut ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                    <LogOut className="h-3.5 w-3.5" />
                                    {formatTimeLabel(log.timeOut)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-gray-600">--:--</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                                <FileEdit className="h-3.5 w-3.5" />
                                {td('editRecord')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-16 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-white dark:bg-gray-900 shadow-sm ring-1 ring-slate-200/80">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950 dark:text-white">{td('emptyCheckInsTitle')}</h3>
                    <p className="mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-gray-400 mx-auto">
                      {td('emptyCheckInsDescription')}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>
    </>
  );
}
