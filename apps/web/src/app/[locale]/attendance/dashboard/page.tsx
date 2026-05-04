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
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileDown,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  School,
  TrendingUp,
  Users,
  FileEdit,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Calendar,
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

function labelForSessionMonitorGradeGroup(
  td: ReturnType<typeof useTranslations<'attendance.adminDashboard'>>,
  key: string
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

/** Shift calendar day for session-monitor date picker (YYYY-MM-DD). */
function shiftYmdEnCa(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  if ([y, m, d].some((n) => Number.isNaN(n))) return ymd;
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() + deltaDays);
  return formatLocalDateEnCa(t);
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
  const {
    schoolId,
    loading: academicContextLoading,
    selectedYear,
    currentYear,
  } = useAcademicYear();
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
  const [monitorRefreshNonce, setMonitorRefreshNonce] = useState(0);
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

  const summaryErrorMessage =
    error instanceof Error ? error.message : error != null ? String(error) : null;

  const handleRetrySummary = useCallback(async () => {
    setManualRefreshBanner(null);
    try {
      await refresh();
    } catch (err) {
      reportClientOperationalError('attendance-dashboard-summary-retry', err, {
        schoolId: schoolId ?? undefined,
      });
      const message = err instanceof Error ? err.message : td('refreshFailed');
      setManualRefreshBanner(message);
    }
  }, [refresh, schoolId, td]);

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
      setMonitorRefreshNonce((n) => n + 1);
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
  }, [sessionReady, schoolId, monitorDate, monitorSession, monitorRefreshNonce, td]);

  const activeAcademicYear = selectedYear ?? currentYear;
  const academicYearLabel = activeAcademicYear?.name ?? '—';

  const academicYearProgressPct = useMemo(() => {
    const y = activeAcademicYear;
    if (!y?.startDate || !y?.endDate) return null;
    const start = new Date(y.startDate).getTime();
    const end = new Date(y.endDate).getTime();
    const now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const t = Math.min(Math.max(now, start), end);
    return Math.round(((t - start) / (end - start)) * 100);
  }, [activeAcademicYear]);

  const refetchMonitor = useCallback(() => {
    setMonitorRefreshNonce((n) => n + 1);
  }, []);

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

  const monitorFiltersActive = useMemo(() => {
    return (
      monitorProblemsOnly ||
      monitorSelectedStatuses.length > 0 ||
      Boolean(monitorClassId) ||
      Boolean(monitorGradeGroupKey) ||
      Boolean(monitorSearch.trim())
    );
  }, [
    monitorProblemsOnly,
    monitorSelectedStatuses,
    monitorClassId,
    monitorGradeGroupKey,
    monitorSearch,
  ]);

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
            <p className="mt-5 text-sm font-bold text-slate-500 dark:text-gray-400">{td('loadingSummary')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500 lg:ml-64">
        {/* Animated background blobs for extra depth */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-emerald-500/5 dark:bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Full-width glassmorphic header area */}
        <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-600 dark:text-sky-400">{td('heroEyebrow')}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {td('heroTitle')}
              </h1>
              <nav className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/${locale}/attendance/mark`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <ClipboardList className="h-3.5 w-3.5 text-sky-500" />
                  {td('linkMarkAttendance')}
                </Link>
                <Link
                  href={`/${locale}/attendance/reports`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  {td('linkReports')}
                </Link>
                <Link
                  href={`/${locale}/timetable`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Calendar className="h-3.5 w-3.5 text-violet-500" />
                  {td('linkTimetable')}
                </Link>
              </nav>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as AttendanceSummaryRange)}
                  className="h-10 appearance-none rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:bg-slate-100 focus:ring-2 focus:ring-sky-500/20 dark:border-gray-700/80 dark:bg-gray-900 dark:text-gray-200"
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
                disabled={auditExportBusy}
                onClick={() => void handleAuditExport()}
                title={td('auditExportHint')}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
              >
                {auditExportBusy ? <Loader2 className="h-4 w-4 animate-spin text-sky-500" /> : <FileDown className="h-4 w-4 text-slate-500" />}
                <span className="hidden sm:inline">{td('auditExportCsv')}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleToolbarRefresh()}
                disabled={toolbarRefreshing || isValidating || monitorLoading || !schoolId}
                title={td('refreshTitle')}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md transition hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-slate-900 dark:hover:bg-gray-100 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4.5 w-4.5 ${toolbarRefreshing || isValidating || monitorLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 relative z-10">
          <AnimatedContent>
            {manualRefreshBanner ? (
              <div className="mt-4 mb-6 rounded-[1.15rem] border border-rose-200/90 bg-rose-50/95 px-4 py-3 text-sm font-semibold text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                {manualRefreshBanner}
              </div>
            ) : null}

            {summaryErrorMessage && !data ? (
              <div className="mt-4 mb-6 flex flex-col gap-3 rounded-[1.15rem] border border-rose-200/90 bg-rose-50/95 px-4 py-4 text-sm dark:border-rose-900/40 dark:bg-rose-950/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div>
                    <p className="font-bold text-rose-900 dark:text-rose-100">{td('loadErrorTitle')}</p>
                    <p className="mt-1 font-medium text-rose-800/90 dark:text-rose-200/90">{summaryErrorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRetrySummary()}
                  className="self-start rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-100"
                >
                  {td('retryAction')}
                </button>
              </div>
            ) : null}

            {summaryErrorMessage && data ? (
              <div className="mt-4 mb-6 flex flex-col gap-2 rounded-[1.15rem] border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-xs font-semibold text-amber-950 dark:border-amber-900/35 dark:bg-amber-950/25 dark:text-amber-50">
                <span className="font-bold">{td('loadErrorTitle')}</span>
                <span>{summaryErrorMessage}</span>
                <button
                  type="button"
                  onClick={() => void handleRetrySummary()}
                  className="self-start rounded-lg bg-amber-900/90 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-800 dark:bg-amber-700"
                >
                  {td('retryAction')}
                </button>
              </div>
            ) : null}

            {auditExportError ? (
              <div className="mt-4 mb-6 rounded-[1.15rem] border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm font-semibold text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                {auditExportError}
              </div>
            ) : null}
          </AnimatedContent>

          <div className="space-y-8">
            {/* Top Row: Activity Status & Schedule Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Side: Vibrant 2x2 Metric Grid */}
              <div className="lg:col-span-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full">
                  {/* Learner Attendance - Blue Gradient */}
                  <AnimatedContent animation="slide-up" delay={100} className="h-full">
                    <div className="group relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-xl shadow-blue-500/20">
                      <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                          <path d="M0,160 C120,130 180,190 400,140 L400,200 L0,200 Z" fill="white" fillOpacity="0.4" />
                          <path d="M0,180 C150,150 250,210 400,160 L400,200 L0,200 Z" fill="white" fillOpacity="0.6" />
                        </svg>
                      </div>
                      
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <MoreHorizontal className="h-4 w-4 text-white/60 cursor-pointer hover:text-white" />
                        </div>
                        <div className="mt-2">
                          <p className="text-3xl font-black">{stats.attendanceRate || 0}%</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mt-0.5">{td('metricLearnerAttendance')}</p>
                        </div>
                        <div className="flex justify-end">
                          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider backdrop-blur-sm">{td('liveWindowBadge')}</span>
                        </div>
                      </div>
                    </div>
                  </AnimatedContent>

                  {/* Staff Attendance - Purple Gradient */}
                  <AnimatedContent animation="slide-up" delay={150} className="h-full">
                    <div className="group relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-fuchsia-500 to-purple-600 p-6 text-white shadow-xl shadow-purple-500/20">
                      <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                          <path d="M0,160 C120,130 180,190 400,140 L400,200 L0,200 Z" fill="white" fillOpacity="0.4" />
                          <path d="M0,180 C150,150 250,210 400,160 L400,200 L0,200 Z" fill="white" fillOpacity="0.6" />
                        </svg>
                      </div>
                      
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                            <Users className="h-5 w-5" />
                          </div>
                          <MoreHorizontal className="h-4 w-4 text-white/60 cursor-pointer hover:text-white" />
                        </div>
                        <div className="mt-2">
                          <p className="text-3xl font-black">{stats.teacherAttendanceRate || 0}%</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mt-0.5">{td('metricStaffAttendance')}</p>
                        </div>
                        <div className="flex justify-end">
                          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider backdrop-blur-sm">
                            {td('metricTotalLabel')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AnimatedContent>

                  {/* Recorded Present - Green Gradient */}
                  <AnimatedContent animation="slide-up" delay={200} className="h-full">
                    <div className="group relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-400 to-teal-500 p-6 text-white shadow-xl shadow-emerald-500/20">
                      <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                          <path d="M0,160 C120,130 180,190 400,140 L400,200 L0,200 Z" fill="white" fillOpacity="0.4" />
                          <path d="M0,180 C150,150 250,210 400,160 L400,200 L0,200 Z" fill="white" fillOpacity="0.6" />
                        </svg>
                      </div>
                      
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <MoreHorizontal className="h-4 w-4 text-white/60 cursor-pointer hover:text-white" />
                        </div>
                        <div className="mt-2">
                          <p className="text-3xl font-black">{combinedPresent}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mt-0.5">{td('metricCombinedPresentLabel')}</p>
                        </div>
                        <div className="flex justify-end">
                          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider backdrop-blur-sm">
                            {td('liveWindowBadge')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AnimatedContent>

                  {/* Classes in Scope - Orange Gradient */}
                  <AnimatedContent animation="slide-up" delay={250} className="h-full">
                    <div className="group relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-400 to-amber-500 p-6 text-white shadow-xl shadow-orange-500/20">
                      <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                          <path d="M0,160 C120,130 180,190 400,140 L400,200 L0,200 Z" fill="white" fillOpacity="0.4" />
                          <path d="M0,180 C150,150 250,210 400,160 L400,200 L0,200 Z" fill="white" fillOpacity="0.6" />
                        </svg>
                      </div>
                      
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                            <School className="h-5 w-5" />
                          </div>
                          <MoreHorizontal className="h-4 w-4 text-white/60 cursor-pointer hover:text-white" />
                        </div>
                        <div className="mt-2">
                          <p className="text-3xl font-black">{stats.classCount || 0}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mt-0.5">{td('metricActiveClassesLabel')}</p>
                        </div>
                        <div className="flex justify-end">
                          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider backdrop-blur-sm">
                            {td('metricTotalClasses')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AnimatedContent>
                </div>
              </div>

              {/* Right Side: High-Fidelity Reference Sidebar */}
              <div className="lg:col-span-4">
                <AnimatedContent animation="slide-left" delay={300}>
                  <div className="h-full rounded-[3rem] border border-slate-50 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{td('scheduleTitle')}</h3>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          aria-label={td('monitorDateLabel')}
                          title={td('monitorDateLabel')}
                          onClick={() => setMonitorDate((d) => shiftYmdEnCa(d, -1))}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={td('monitorDateLabel')}
                          title={td('monitorDateLabel')}
                          onClick={() => setMonitorDate((d) => shiftYmdEnCa(d, 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* School Session Card */}
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-800/40 mb-4 relative overflow-hidden group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sky-500 shadow-sm border border-slate-50 dark:bg-gray-800 dark:border-gray-700">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{td('sessionLabel')}</p>
                          <p className="text-base font-black text-slate-900 dark:text-white leading-tight">{academicYearLabel}</p>
                        </div>
                      </div>
                      
                      {academicYearProgressPct != null ? (
                        <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-gray-700 mb-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-1000"
                            style={{ width: `${academicYearProgressPct}%` }}
                          />
                        </div>
                      ) : (
                        <div className="mb-3 h-1 w-full rounded-full bg-slate-100 dark:bg-gray-700" />
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-sky-600/80">{td('sessionActive')}</span>
                        </div>
                        <Link
                          href={`/${locale}/dashboard`}
                          className="text-[8px] font-black uppercase tracking-widest text-sky-600 hover:underline"
                        >
                          {td('sessionDetails')}
                        </Link>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">{td('liveAttendanceLabel')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Present Mini Card */}
                        <div className="rounded-[1.5rem] bg-[#F1FAF5] p-4 flex flex-col items-center text-center group cursor-pointer transition hover:scale-[1.02]">
                          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm border border-emerald-50">
                            <Users className="h-4 w-4" />
                          </div>
                          <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{sessionMonitorSnapshot?.compliant || 0}</p>
                          <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-emerald-600/80">{td('countPresent')}</p>
                        </div>

                        {/* Absent Mini Card */}
                        <div className="rounded-[1.5rem] bg-[#FFF5F6] p-4 flex flex-col items-center text-center group cursor-pointer transition hover:scale-[1.02]">
                          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-rose-500 shadow-sm border border-rose-50">
                            <Users className="h-4 w-4" />
                          </div>
                          <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{sessionMonitorSnapshot?.attention || 0}</p>
                          <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-rose-600/80">{td('countAbsent')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedContent>
              </div>
            </div>

            {/* Roster snapshot */}
            <AnimatedContent delay={0.15}>
              <div className="flex flex-wrap items-center justify-center gap-4 rounded-[1.5rem] border border-slate-200/60 bg-white px-6 py-4 text-base font-bold text-slate-700 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200 sm:justify-between">
                <p className="w-full text-[11px] font-black uppercase tracking-widest text-slate-400 sm:w-auto">
                  {td('rosterEyebrow')}
                </p>
                <div className="flex flex-wrap items-center gap-6">
                  <span>
                    <span className="text-slate-400 font-semibold">{td('rosterStudents')}</span>{' '}
                    <span className="font-black tabular-nums text-slate-900 dark:text-white">{stats.studentCount ?? 0}</span>
                  </span>
                  <span>
                    <span className="text-slate-400 font-semibold">{td('rosterTeachers')}</span>{' '}
                    <span className="font-black tabular-nums text-slate-900 dark:text-white">{stats.teacherCount ?? 0}</span>
                  </span>
                  <span>
                    <span className="text-slate-400 font-semibold">{td('rosterClasses')}</span>{' '}
                    <span className="font-black tabular-nums text-slate-900 dark:text-white">{stats.classCount ?? 0}</span>
                  </span>
                </div>
              </div>
            </AnimatedContent>

            {/* Session breakdown */}
            <AnimatedContent delay={0.18}>
              <section className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
                <div className="mb-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">{td('sessionsEyebrow')}</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">{td('sessionsTitle')}</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {sessionCards.map(({ session, rate, data: sd }) => (
                    <div
                      key={session}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 dark:border-gray-800 dark:bg-gray-800/30"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-base font-black text-slate-900 dark:text-white">{sessionLabel(session)}</p>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100">
                          {rate}%
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white p-3 dark:bg-gray-900/60">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">{td('countPresent')}</dt>
                          <dd className="mt-1 text-xl font-black text-slate-900 dark:text-white">{sd.present}</dd>
                        </div>
                        <div className="rounded-xl bg-white p-3 dark:bg-gray-900/60">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-amber-600">{td('countLate')}</dt>
                          <dd className="mt-1 text-xl font-black text-slate-900 dark:text-white">{sd.late}</dd>
                        </div>
                        <div className="rounded-xl bg-white p-3 dark:bg-gray-900/60">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-rose-600">{td('countAbsent')}</dt>
                          <dd className="mt-1 text-xl font-black text-slate-900 dark:text-white">{sd.absent}</dd>
                        </div>
                      </dl>
                      <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {td('monitorKpiScheduled')}: {sd.total}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </AnimatedContent>

            {/* Class insights */}
            <AnimatedContent delay={0.2}>
              <section className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
                <div className="mb-8">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">{td('insightsEyebrow')}</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">{td('insightsTitle')}</h2>
                </div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div>
                    <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-emerald-600">{td('topClassesLabel')}</p>
                    {topClasses.length === 0 ? (
                      <p className="text-base font-semibold text-slate-600 dark:text-slate-400">{td('topClassesEmpty')}</p>
                    ) : (
                      <ul className="space-y-2">
                        {topClasses.map((c) => (
                          <li
                            key={String(c.id)}
                            className="flex items-center justify-between rounded-xl border border-emerald-100/80 bg-emerald-50/30 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          >
                            <span className="text-[15px] font-bold text-slate-900 dark:text-white">{String(c.name)}</span>
                            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{Math.round(c.rate ?? 0)}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-rose-600">{td('atRiskLabel')}</p>
                    {atRiskClasses.length === 0 ? (
                      <p className="text-base font-semibold text-slate-600 dark:text-slate-400">{td('allClearAtRisk')}</p>
                    ) : (
                      <ul className="space-y-2">
                        {atRiskClasses.map((c) => (
                          <li
                            key={String(c.id)}
                            className="flex items-center justify-between rounded-xl border border-rose-100/80 bg-rose-50/30 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/25"
                          >
                            <span className="text-[15px] font-bold text-slate-900 dark:text-white">{String(c.name)}</span>
                            <span className="text-sm font-black text-rose-700 dark:text-rose-300">{Math.round(c.rate ?? 0)}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            </AnimatedContent>

            {/* Session Monitor Section: Full Width */}
            <AnimatedContent delay={0.3}>
              <section className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white dark:border-gray-800 dark:bg-gray-900/80 backdrop-blur-2xl shadow-sm">
                <div className="border-b border-slate-100 dark:border-gray-800/60 px-8 py-7">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{td('monitorTitle')}</h2>
                      <p className="mt-2 text-base font-semibold text-slate-600 dark:text-slate-400">{td('monitorSubtitle')}</p>
                      {monitorError ? (
                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-200/90 bg-rose-50/95 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/30">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                            <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">{monitorError}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => refetchMonitor()}
                            className="self-start rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-100"
                          >
                            {td('retryAction')}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-gray-800">
                        <button
                          onClick={() => setMonitorSession('MORNING')}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${monitorSession === 'MORNING' ? 'bg-white text-slate-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-slate-500'}`}
                        >
                          {td('monitorSessionMorning')}
                        </button>
                        <button
                          onClick={() => setMonitorSession('AFTERNOON')}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${monitorSession === 'AFTERNOON' ? 'bg-white text-slate-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-slate-500'}`}
                        >
                          {td('monitorSessionAfternoon')}
                        </button>
                      </div>
                      <input
                        type="date"
                        value={monitorDate}
                        onChange={(e) => setMonitorDate(e.target.value)}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="mt-8 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={monitorSearch}
                          onChange={(e) => setMonitorSearch(e.target.value)}
                          placeholder={td('searchPlaceholder')}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 text-xs font-medium outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-900"
                        />
                      </div>

                      <select
                        value={monitorGradeGroupKey}
                        onChange={(e) => setMonitorGradeGroupKey(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <option value="">{td('monitorFilterAllGrades')}</option>
                        {monitorGradeGroupKeys.map(k => (
                          <option key={k} value={k}>{labelForSessionMonitorGradeGroup(td, k)}</option>
                        ))}
                      </select>

                      <select
                        value={monitorClassId}
                        onChange={(e) => setMonitorClassId(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <option value="">{td('monitorFilterAllClasses')}</option>
                        {monitorClassOptions.map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => setMonitorProblemsOnly(!monitorProblemsOnly)}
                        className={`h-10 rounded-xl border px-4 text-xs font-bold transition ${monitorProblemsOnly ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        {td('monitorProblemsOnly')}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{td('monitorFilterStatus')}</span>
                      {SESSION_MONITOR_FILTER_STATUSES.map(status => {
                        const style = sessionMonitorStatusStyle(status);
                        const active = monitorSelectedStatuses.includes(status);
                        return (
                          <button
                            key={status}
                            onClick={() => toggleMonitorStatusFilter(status)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${active ? style.chipOn : style.chipOff}`}
                          >
                            {labelForSessionMonitorStatus(td, status)}
                          </button>
                        );
                      })}
                      {monitorSelectedStatuses.length > 0 && (
                        <button onClick={() => setMonitorSelectedStatuses([])} className="text-[10px] font-bold text-sky-600 hover:underline ml-2">
                          {td('monitorFilterClearStatuses')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-[15px]">
                    <thead className="bg-slate-50/50 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-gray-900/50 dark:text-gray-400">
                      <tr>
                        <th className="px-8 py-4">{td('monitorColClass')}</th>
                        <th className="px-8 py-4">{td('monitorColPeriod')}</th>
                        <th className="px-8 py-4">{td('monitorColTeacher')}</th>
                        <th className="px-8 py-4">{td('monitorColStatus')}</th>
                        <th className="px-8 py-4">{td('labelCheckIn')}</th>
                        <th className="px-8 py-4">{td('labelCheckOut')}</th>
                        <th className="px-8 py-4 text-right">{td('tableColActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800/50">
                      {monitorLoading && !monitorPayload ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-16 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-500" />
                            <p className="mt-3 text-xs font-semibold text-slate-500">{td('monitorSyncRefreshing')}</p>
                          </td>
                        </tr>
                      ) : monitorError && !monitorPayload ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-16 text-center text-sm font-medium text-slate-500">
                            {td('monitorLoadError')}
                          </td>
                        </tr>
                      ) : monitorRowsFiltered.length > 0 ? (
                        monitorRowsFiltered.map((row) => {
                          const statusUi = sessionMonitorStatusStyle(row.displayStatus);
                          return (
                            <tr key={row.classId} className="group transition hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                              <td className="px-8 py-5">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 dark:text-white">{row.className}</span>
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{row.grade || 'No Grade'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 dark:text-gray-200">{row.periodName || '--'}</span>
                                  <span className="font-mono text-[10px] text-slate-400">{row.periodStartTime || '--'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-slate-600 dark:text-gray-300 font-medium">{row.teacherName || '--'}</td>
                              <td className="px-8 py-5">
                                <span className={statusUi.badge}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusUi.dot}`} />
                                  {labelForSessionMonitorStatus(td, row.displayStatus)}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                {row.timeInIso ? (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <LogIn className="h-3 w-3" />
                                    {formatTimeLabel(row.timeInIso)}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 dark:text-gray-600">--:--</span>
                                )}
                              </td>
                              <td className="px-8 py-5">
                                {row.timeOutIso ? (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-gray-300">
                                    <LogOut className="h-3 w-3" />
                                    {formatTimeLabel(row.timeOutIso)}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 dark:text-gray-600">--:--</span>
                                )}
                              </td>
                              <td className="px-8 py-5 text-right">
                                <Link
                                  href={`/${locale}/attendance/mark?classId=${encodeURIComponent(row.classId)}&date=${encodeURIComponent(monitorDate)}&session=${encodeURIComponent(monitorSession)}`}
                                  title={td('actionMarkAttendance')}
                                  className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-gray-800 dark:hover:text-white"
                                >
                                  <FileEdit className="h-4 w-4" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full bg-slate-100 p-4 dark:bg-gray-800">
                                <Filter className="h-6 w-6 text-slate-400" />
                              </div>
                              <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                                {monitorPayload && monitorPayload.rows.length === 0 && !monitorFiltersActive
                                  ? td('monitorEmpty')
                                  : td('monitorNoMatchingRows')}
                              </h3>
                              <p className="mt-2 max-w-md text-xs font-medium text-slate-500">
                                {monitorPayload && monitorPayload.rows.length === 0 && !monitorFiltersActive
                                  ? td('monitorEmptyHint')
                                  : null}
                              </p>
                              {monitorFiltersActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMonitorSearch('');
                                    setMonitorGradeGroupKey('');
                                    setMonitorClassId('');
                                    setMonitorProblemsOnly(false);
                                    setMonitorSelectedStatuses([]);
                                  }}
                                  className="mt-2 text-xs font-bold text-sky-600 hover:underline"
                                >
                                  {td('monitorFilterClearStatuses')}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </AnimatedContent>

            {/* Activity Log */}
            <AnimatedContent delay={0.4}>
              <section className="h-full overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white dark:border-gray-800 dark:bg-gray-900/80 p-8 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{td('activityTitle')}</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentCheckIns.slice(0, 6).map((log, i) => (
                    <div key={log.id || i} className="flex items-center justify-between rounded-[1.25rem] border border-slate-50 bg-slate-50/30 p-4 transition hover:bg-white hover:shadow-md dark:border-gray-800/50 dark:bg-gray-800/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                          {getInitials(log)}
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-slate-900 dark:text-white">{`${log.teacher?.firstName || ''} ${log.teacher?.lastName || ''}`.trim() || 'Staff Member'}</p>
                          <p className="text-xs font-medium text-slate-500">{formatDateLabel(log.date)} • {formatTimeLabel(log.timeIn)}</p>
                        </div>
                      </div>
                      <div className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider ${log.status === 'LATE' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {log.status || 'PRESENT'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </AnimatedContent>

            {/* Daily Trend Chart (Full Width) */}
            <AnimatedContent delay={0.6}>
              <section className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white dark:border-gray-800 dark:bg-gray-900/80 p-8 shadow-sm">
                <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{td('trendTitle')}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{td('countPresent')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{td('legendLate')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{td('countAbsent')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex h-64 items-end gap-1 sm:gap-2">
                  {trendSeries.length > 0 ? (
                    trendSeries.map((p, i) => {
                      const presentH = (p.present / trendScaleMax) * 100;
                      const lateH = (p.late / trendScaleMax) * 100;
                      const absentH = (p.absent / trendScaleMax) * 100;
                      return (
                        <div key={i} className="group relative flex h-full flex-1 flex-col justify-end gap-0.5">
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 dark:bg-white dark:text-slate-900 whitespace-nowrap z-10 shadow-xl">
                            {formatDateLabel(p.date)}
                          </div>
                          <div 
                            className="w-full rounded-t-sm bg-rose-500/80 transition group-hover:bg-rose-500" 
                            style={{ height: `${absentH}%` }}
                          />
                          <div 
                            className="w-full bg-amber-500/80 transition group-hover:bg-amber-500" 
                            style={{ height: `${lateH}%` }}
                          />
                          <div 
                            className="w-full rounded-b-sm bg-emerald-500/80 transition group-hover:bg-emerald-500" 
                            style={{ height: `${presentH}%` }}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full w-full items-center justify-center border-t border-dashed border-slate-200 text-xs font-medium text-slate-400">
                      {td('trendEmpty')}
                    </div>
                  )}
                </div>
              </section>
            </AnimatedContent>
          </div>
        </main>
      </div>
    </>
  );
}
