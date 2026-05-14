'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import { AcademicYear, getAcademicYearsAuto } from '@/lib/api/academic-years';
import {
  periodAPI,
  timetableAPI,
  type Period,
  type TeacherWorkloadTeacher,
  type TimetableEntry as ApiTimetableEntry,
} from '@/lib/api/timetable';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  Filter,
  Grid3X3,
  Layers3,
  ListChecks,
  Loader2,
  Printer,
  RefreshCw,
  School,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Users,
  Wand2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import TimetablePrint from '@/components/timetable/TimetablePrint';
import { 
  DAYS,
  DAY_LABELS,
  type DayOfWeek, 
  type GradeLevel, 
  getGradeLevel 
} from '@/components/timetable/types';

type ViewMode = 'grid' | 'classes' | 'workload';
type DayFilter = DayOfWeek | 'ALL';
type CoverageFilter = 'all' | 'ready' | 'watch' | 'action';
type ConflictFilter = 'all' | 'conflicts' | 'clear';
type SlotFilter = 'all' | 'has-empty' | 'fully-booked';
type GenerationScope = 'filtered' | 'level' | 'all';
type PrintScope = 'current' | 'class' | 'teacher' | 'grade' | 'all-classes' | 'all-teachers';

interface ClassStats {
  id: string;
  name: string;
  grade: number;
  section: string | null;
  homeroomTeacher?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    englishFirstName?: string | null;
    englishLastName?: string | null;
    khmerName?: string | null;
    email?: string | null;
  } | null;
  gradeLevel: GradeLevel;
  entryCount: number;
  totalSlots: number;
  coverage: number;
  conflicts: number;
}

interface FilterOption {
  id: string;
  label: string;
  meta?: string;
}

interface GenerationState {
  running: boolean;
  current: number;
  total: number;
  assigned: number;
  unassigned: number;
  failed: number;
  message: string;
}

const EMPTY_GENERATION_STATE: GenerationState = {
  running: false,
  current: 0,
  total: 0,
  assigned: 0,
  unassigned: 0,
  failed: 0,
  message: '',
};

const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; muted: string }> = {
  Languages: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', muted: 'text-blue-50' },
  Language: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', muted: 'text-blue-50' },
  Mathematics: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', muted: 'text-emerald-50' },
  Math: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', muted: 'text-emerald-50' },
  Sciences: { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white', muted: 'text-purple-50' },
  Science: { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white', muted: 'text-purple-50' },
  'Social Sciences': { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white', muted: 'text-amber-50' },
  Social: { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white', muted: 'text-amber-50' },
  'Arts & Culture': { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', muted: 'text-pink-50' },
  Arts: { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', muted: 'text-pink-50' },
  Art: { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', muted: 'text-pink-50' },
  'Physical Education': { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', muted: 'text-orange-50' },
  PE: { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', muted: 'text-orange-50' },
  Technology: { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white', muted: 'text-cyan-50' },
  Tech: { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white', muted: 'text-cyan-50' },
};

const SUBJECT_COLOR_PALETTE = [
  { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', muted: 'text-blue-50' },
  { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', muted: 'text-emerald-50' },
  { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white', muted: 'text-purple-50' },
  { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white', muted: 'text-amber-50' },
  { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', muted: 'text-pink-50' },
  { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', muted: 'text-orange-50' },
  { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white', muted: 'text-cyan-50' },
  { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white', muted: 'text-indigo-50' },
  { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-white', muted: 'text-teal-50' },
  { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', muted: 'text-rose-50' },
  { bg: 'bg-violet-500', border: 'border-violet-600', text: 'text-white', muted: 'text-violet-50' },
  { bg: 'bg-lime-500', border: 'border-lime-600', text: 'text-white', muted: 'text-lime-50' },
  { bg: 'bg-sky-500', border: 'border-sky-600', text: 'text-white', muted: 'text-sky-50' },
  { bg: 'bg-fuchsia-500', border: 'border-fuchsia-600', text: 'text-white', muted: 'text-fuchsia-50' },
];

function normalizeGrade(grade: unknown) {
  if (typeof grade === 'number') return grade;
  const parsed = parseInt(String(grade || ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSubjectColor(entry?: ApiTimetableEntry | null) {
  const category = entry?.subject?.category;
  if (category && SUBJECT_COLORS[category]) {
    return SUBJECT_COLORS[category];
  }

  const key = entry?.subjectId || entry?.subject?.code || entry?.subject?.name || 'subject';
  return SUBJECT_COLOR_PALETTE[hashString(key) % SUBJECT_COLOR_PALETTE.length];
}

function getCoverageTone(coverage: number) {
  if (coverage >= 85) {
    return {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      bar: 'bg-emerald-600',
      label: 'Ready',
    };
  }

  if (coverage >= 60) {
    return {
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      bar: 'bg-amber-500',
      label: 'Watch',
    };
  }

  return {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    bar: 'bg-rose-600',
    label: 'Action',
  };
}

function formatPeriodTime(period: Period) {
  return `${period.startTime}-${period.endTime}`;
}

function formatEntrySubject(entry?: ApiTimetableEntry | null) {
  if (!entry) return '';
  return entry.subject?.code || entry.subject?.name || 'Subject';
}

function formatEntrySubjectName(entry?: ApiTimetableEntry | null) {
  if (!entry) return '';
  return entry.subject?.nameKh || entry.subject?.name || entry.subject?.code || 'Subject';
}

function formatEntryTeacher(entry?: ApiTimetableEntry | null) {
  if (!entry?.teacher) return 'Unassigned';
  return (
    entry.teacher.khmerName ||
    `${entry.teacher.firstName || ''} ${entry.teacher.lastName || ''}`.trim() ||
    'Teacher'
  );
}

function formatTeacherName(teacher?: ClassStats['homeroomTeacher'] | null) {
  if (!teacher) return 'Unassigned';
  return (
    teacher.khmerName ||
    `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() ||
    `${teacher.englishFirstName || ''} ${teacher.englishLastName || ''}`.trim() ||
    teacher.email ||
    'Teacher'
  );
}

function formatWorkloadTeacherName(teacher: TeacherWorkloadTeacher) {
  return (
    teacher.khmerName ||
    `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() ||
    `${teacher.firstNameLatin || ''} ${teacher.lastNameLatin || ''}`.trim() ||
    teacher.email ||
    'Teacher'
  );
}

type MetricTone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper: string;
  tone: MetricTone;
}) {
  const toneClasses = {
    sky: {
      surface: 'from-sky-500 via-blue-500 to-indigo-500 shadow-sky-200/70 dark:shadow-sky-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    emerald: {
      surface: 'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-200/70 dark:shadow-emerald-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    amber: {
      surface: 'from-amber-400 via-orange-500 to-rose-500 shadow-amber-200/70 dark:shadow-orange-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    rose: {
      surface: 'from-rose-500 via-red-500 to-pink-500 shadow-rose-200/70 dark:shadow-rose-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    violet: {
      surface: 'from-violet-500 via-fuchsia-500 to-pink-500 shadow-violet-200/70 dark:shadow-violet-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
  };

  const classes = toneClasses[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-gradient-to-br ${classes.surface} p-5 text-white shadow-xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl dark:border-white/5`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${classes.glow}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-white/30 via-white/10 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 opacity-30 transition-opacity group-hover:opacity-40">
        <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
          <path
            d="M0 34 Q 18 28, 35 31 T 68 24 T 100 28 V 40 H 0 Z"
            fill="currentColor"
            className="text-white/20"
          />
          <path
            d="M0 34 Q 18 28, 35 31 T 68 24 T 100 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="text-white/30"
          />
        </svg>
      </div>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">{label}</p>
          <p className="mt-3 text-3xl font-black leading-none tracking-tight text-white">{value}</p>
          <div className="mt-3 inline-flex items-center rounded-full bg-white/20 dark:bg-gray-900/20 px-2.5 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-md">
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

function ControlLabel({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{children}</span>;
}

function ControlShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-w-[160px] flex-col gap-1.5 ${className}`}>{children}</div>;
}

function TimetableCell({ entry }: { entry?: ApiTimetableEntry | null }) {
  if (!entry) {
    return (
      <div className="group/cell flex min-h-[72px] flex-col items-center justify-center rounded-[0.85rem] border-2 border-dashed border-slate-200/60 bg-white/40 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-gray-800/60 dark:bg-gray-950/20 dark:hover:border-gray-700 dark:hover:bg-gray-900/50">
        <span className="sr-only">Open</span>
      </div>
    );
  }
  const color = getSubjectColor(entry);

  return (
    <div className={`group/cell relative flex min-h-[72px] flex-col justify-center overflow-hidden rounded-[0.85rem] border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${color.bg} ${color.border} ${color.text}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover/cell:opacity-100" />
      <div className="relative z-10 px-2.5 py-2">
        <div className="truncate text-[12px] font-black leading-tight tracking-tight" title={formatEntrySubjectName(entry)}>
          {formatEntrySubject(entry)}
        </div>
        <div className={`mt-1 truncate text-[11px] font-semibold leading-none ${color.muted}`} title={formatEntryTeacher(entry)}>
          {formatEntryTeacher(entry)}
        </div>
        {entry.room ? (
          <div className={`mt-1.5 inline-flex items-center rounded-md bg-black/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${color.muted} dark:bg-white/15`}>
            {entry.room}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MasterTimetablePage() {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entriesByClass, setEntriesByClass] = useState<Record<string, ApiTimetableEntry[]>>({});
  const [teacherWorkloads, setTeacherWorkloads] = useState<TeacherWorkloadTeacher[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teacherCount, setTeacherCount] = useState(0);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel>('HIGH_SCHOOL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState<DayFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [conflictFilter, setConflictFilter] = useState<ConflictFilter>('all');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [printScope, setPrintScope] = useState<PrintScope>('current');
  const [selectedPrintId, setSelectedPrintId] = useState<string>('');
  const [generationScope, setGenerationScope] = useState<GenerationScope>('filtered');
  const [generationOptions, setGenerationOptions] = useState({
    balanceWorkload: true,
    clearExisting: false,
    respectTeacherPreferences: true,
  });
  const [generationState, setGenerationState] = useState<GenerationState>(EMPTY_GENERATION_STATE);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState('');
  const [printSettings, setPrintSettings] = useState({
    officeName: 'មន្ទីរអប់រំយុជន និងកីឡា',
    clusterName: 'ខេត្ត៖ សៀមរាប',
    gradeRange: '',
    schoolName: '',
    logoUrl: '',
  });

  const hydrateClassTimetables = useCallback(async (yearId: string, classList: ClassStats[]) => {
    setLoadingGrid(true);
    try {
      const settled = await Promise.allSettled(
        classList.map((classItem) => timetableAPI.getClassTimetable(classItem.id, yearId))
      );

      const nextEntriesByClass: Record<string, ApiTimetableEntry[]> = {};
      const loadedClassIds = new Set<string>();
      let nextPeriods: Period[] = [];

      settled.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;

        const classId = classList[index]?.id;
        if (!classId) return;

        loadedClassIds.add(classId);
        nextEntriesByClass[classId] = result.value.data.entries || [];

        if (nextPeriods.length === 0) {
          nextPeriods = (result.value.data.periods || []).filter((period) => !period.isBreak);
        }
      });

      setEntriesByClass(nextEntriesByClass);
      setPeriods(nextPeriods);
      setClasses((current) =>
        current.map((classItem) => {
          const wasLoaded = loadedClassIds.has(classItem.id);
          const entryCount = wasLoaded
            ? nextEntriesByClass[classItem.id]?.length || 0
            : classItem.entryCount;
          const totalSlots = nextPeriods.length > 0 ? nextPeriods.length * DAYS.length : classItem.totalSlots;

          return {
            ...classItem,
            entryCount,
            totalSlots,
            coverage: totalSlots > 0 ? Math.round((entryCount / totalSlots) * 100) : 0,
          };
        })
      );
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  const loadClassStats = useCallback(
    async (yearId: string) => {
      try {
        setLoadingData(true);
        setError('');

        const [masterStatsRes, workloadsRes, periodsRes] = await Promise.all([
          timetableAPI.getMasterStats(yearId),
          timetableAPI.getAllTeacherWorkloads(yearId).catch(() => ({ data: { teachers: [] } })),
          periodAPI.list().catch(() => ({ data: { periods: [] } })),
        ]);
        const masterStats = masterStatsRes.data;
        const embeddedPeriods = (masterStats.periods || []).filter((period) => !period.isBreak);
        const fallbackPeriods = (periodsRes.data.periods || []).filter((period) => !period.isBreak);
        const resolvedPeriods = embeddedPeriods.length > 0 ? embeddedPeriods : fallbackPeriods;
        const hasEmbeddedEntries = Array.isArray(masterStats.entries);
        const embeddedEntriesByClass: Record<string, ApiTimetableEntry[]> = {};

        if (hasEmbeddedEntries) {
          (masterStats.entries || []).forEach((entry) => {
            if (!embeddedEntriesByClass[entry.classId]) {
              embeddedEntriesByClass[entry.classId] = [];
            }
            embeddedEntriesByClass[entry.classId].push(entry);
          });
        }

        const classStats: ClassStats[] = (masterStats.classes || []).map((classItem) => {
          const grade = normalizeGrade(classItem.grade);
          const gradeLevel = getGradeLevel(grade);
          const embeddedEntries = embeddedEntriesByClass[classItem.id] || [];
          const totalSlots = resolvedPeriods.length > 0 ? resolvedPeriods.length * DAYS.length : classItem.totalSlots;
          const entryCount = hasEmbeddedEntries ? embeddedEntries.length : classItem.entryCount;

          return {
            id: classItem.id,
            name: classItem.name,
            grade,
            section: classItem.section || null,
            homeroomTeacher: classItem.homeroomTeacher || null,
            gradeLevel,
            entryCount,
            totalSlots,
            coverage: totalSlots > 0 ? Math.round((entryCount / totalSlots) * 100) : classItem.coverage,
            conflicts: classItem.conflicts,
          };
        });

        setClasses(classStats);
        setTeacherWorkloads(workloadsRes.data.teachers || []);
        setTeacherCount(masterStats.teacherStats?.total || workloadsRes.data.teachers?.length || 0);
        setPeriods(resolvedPeriods);

        if (hasEmbeddedEntries) {
          setEntriesByClass(embeddedEntriesByClass);
        } else {
          void hydrateClassTimetables(yearId, classStats).catch((hydrateError) => {
            console.error('Error loading timetable grid entries:', hydrateError);
            setError('The master stats loaded, but the detailed grid could not be hydrated.');
          });
        }
      } catch (err) {
        console.error('Error loading master timetable:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Unable to load the master timetable right now. ${message}`);
        setClasses([]);
        setEntriesByClass({});
        setTeacherWorkloads([]);
        setTeacherCount(0);
      } finally {
        setLoadingData(false);
      }
    },
    [hydrateClassTimetables]
  );

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const yearsRes = await getAcademicYearsAuto();
      const yearsData = yearsRes.data.academicYears || [];
      setAcademicYears(yearsData);

      const defaultYear = yearsData.find((year: AcademicYear) => year.isCurrent) || yearsData[0];
      if (defaultYear) {
        setSelectedYearId(defaultYear.id);
        await loadClassStats(defaultYear.id);
      }
    } catch (err) {
      console.error('Error loading initial timetable data:', err);
      setError('Unable to initialize the timetable workspace.');
    } finally {
      setLoading(false);
    }
  }, [loadClassStats]);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData?.user) {
      setUser(userData.user);
      const s = userData.school || { id: userData.user.schoolId, name: 'School' };
      setSchool(s);

      // Hydrate official report metadata from school profile
      const savedMetadata = localStorage.getItem(`school_profile_${s.id}`);
      if (savedMetadata) {
        try {
          const metadata = JSON.parse(savedMetadata);
          setPrintSettings(prev => ({
            ...prev,
            officeName: metadata.officeName || prev.officeName,
            clusterName: metadata.province ? `ខេត្ត៖ ${metadata.province}` : prev.clusterName,
            schoolName: metadata.nameKh || metadata.name || s.name || prev.schoolName,
            logoUrl: metadata.logoUrl || s.logoUrl || '',
          }));
        } catch (e) {
          console.error('Failed to parse school profile metadata', e);
        }
      }
    }

    loadInitialData();
  }, [loadInitialData, locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const selectedYear = academicYears.find((year) => year.id === selectedYearId);
  const visibleDays = useMemo(
    () => (selectedDay === 'ALL' ? DAYS : [selectedDay]),
    [selectedDay]
  );

  const allEntries = useMemo(() => Object.values(entriesByClass).flat(), [entriesByClass]);

  const entryLookup = useMemo(() => {
    const lookup = new Map<string, ApiTimetableEntry>();
    Object.entries(entriesByClass).forEach(([classId, entries]) => {
      entries.forEach((entry) => {
        lookup.set(`${classId}|${entry.dayOfWeek}|${entry.periodId}`, entry);
      });
    });
    return lookup;
  }, [entriesByClass]);

  const gradeLevelClasses = useMemo(
    () => classes.filter((classItem) => classItem.gradeLevel === selectedGradeLevel),
    [classes, selectedGradeLevel]
  );

  const gradeOptions = useMemo(() => {
    return Array.from(new Set(gradeLevelClasses.map((classItem) => classItem.grade)))
      .filter(Boolean)
      .sort((a, b) => a - b);
  }, [gradeLevelClasses]);

  const subjectOptions = useMemo<FilterOption[]>(() => {
    const options = new Map<string, FilterOption>();
    allEntries.forEach((entry) => {
      if (!entry.subjectId || !entry.subject) return;
      options.set(entry.subjectId, {
        id: entry.subjectId,
        label: entry.subject.nameKh || entry.subject.name || entry.subject.code,
        meta: entry.subject.code,
      });
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allEntries]);

  const teacherOptions = useMemo<FilterOption[]>(() => {
    const options = new Map<string, FilterOption>();

    teacherWorkloads.forEach((teacher) => {
      options.set(teacher.id, {
        id: teacher.id,
        label: formatWorkloadTeacherName(teacher),
        meta: `${teacher.totalHoursAssigned || 0}/${teacher.maxHoursPerWeek || 25}`,
      });
    });

    allEntries.forEach((entry) => {
      if (!entry.teacherId || !entry.teacher) return;
      options.set(entry.teacherId, {
        id: entry.teacherId,
        label: formatEntryTeacher(entry),
        meta: 'Assigned',
      });
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allEntries, teacherWorkloads]);

  const getScopedEntries = useCallback(
    (classId: string) => {
      const entries = entriesByClass[classId] || [];
      if (selectedDay === 'ALL') return entries;
      return entries.filter((entry) => entry.dayOfWeek === selectedDay);
    },
    [entriesByClass, selectedDay]
  );

  const getScopedTotalSlots = useCallback(
    (classItem: ClassStats) => {
      if (periods.length === 0) return classItem.totalSlots;
      return periods.length * visibleDays.length;
    },
    [periods.length, visibleDays.length]
  );

  const filteredClasses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return gradeLevelClasses.filter((classItem) => {
      const scopedEntries = getScopedEntries(classItem.id);
      const scopedTotalSlots = getScopedTotalSlots(classItem);
      const emptySlots = Math.max(0, scopedTotalSlots - scopedEntries.length);

      if (selectedGrade !== 'ALL' && String(classItem.grade) !== selectedGrade) return false;

      if (coverageFilter === 'ready' && classItem.coverage < 85) return false;
      if (coverageFilter === 'watch' && (classItem.coverage < 60 || classItem.coverage >= 85)) return false;
      if (coverageFilter === 'action' && classItem.coverage >= 60) return false;

      if (conflictFilter === 'conflicts' && classItem.conflicts === 0) return false;
      if (conflictFilter === 'clear' && classItem.conflicts > 0) return false;

      if (slotFilter === 'has-empty' && emptySlots === 0) return false;
      if (slotFilter === 'fully-booked' && emptySlots > 0) return false;

      if (teacherFilter !== 'ALL' && !scopedEntries.some((entry) => entry.teacherId === teacherFilter)) return false;
      if (subjectFilter !== 'ALL' && !scopedEntries.some((entry) => entry.subjectId === subjectFilter)) return false;

      if (!query) return true;

      const classText = `${classItem.name} ${classItem.grade} ${classItem.section || ''} ${formatTeacherName(classItem.homeroomTeacher)}`.toLowerCase();
      const entryText = scopedEntries
        .map((entry) => `${formatEntrySubjectName(entry)} ${formatEntryTeacher(entry)} ${entry.room || ''}`)
        .join(' ')
        .toLowerCase();

      return classText.includes(query) || entryText.includes(query);
    });
  }, [
    conflictFilter,
    coverageFilter,
    getScopedEntries,
    getScopedTotalSlots,
    gradeLevelClasses,
    searchQuery,
    selectedGrade,
    slotFilter,
    subjectFilter,
    teacherFilter,
  ]);

  const visibleStats = useMemo(() => {
    const totalClasses = filteredClasses.length;
    const totalSlots = filteredClasses.reduce((sum, classItem) => sum + getScopedTotalSlots(classItem), 0);
    const filledSlots = filteredClasses.reduce((sum, classItem) => sum + getScopedEntries(classItem.id).length, 0);
    const conflicts = filteredClasses.reduce((sum, classItem) => sum + classItem.conflicts, 0);
    const emptySlots = Math.max(0, totalSlots - filledSlots);
    const coverage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    return {
      totalClasses,
      totalSlots,
      filledSlots,
      conflicts,
      emptySlots,
      coverage,
    };
  }, [filteredClasses, getScopedEntries, getScopedTotalSlots]);

  const classesByGrade = useMemo(() => {
    const grouped: Record<number, ClassStats[]> = {};
    filteredClasses.forEach((classItem) => {
      if (!grouped[classItem.grade]) grouped[classItem.grade] = [];
      grouped[classItem.grade].push(classItem);
    });

    Object.values(grouped).forEach((classList) => {
      classList.sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [filteredClasses]);

  const generationTargets = useMemo(() => {
    if (generationScope === 'filtered') return filteredClasses;
    if (generationScope === 'level') return gradeLevelClasses;
    return classes;
  }, [classes, filteredClasses, generationScope, gradeLevelClasses]);

  const workloadRows = useMemo(() => {
    return teacherWorkloads
      .map((teacher) => {
        const maxHours = teacher.maxHoursPerWeek || 25;
        const totalHours = teacher.totalHoursAssigned || 0;
        return {
          teacher,
          name: formatWorkloadTeacherName(teacher),
          totalHours,
          maxHours,
          percent: maxHours > 0 ? Math.round((totalHours / maxHours) * 100) : 0,
        };
      })
      .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
  }, [teacherWorkloads]);

  const resetFilters = () => {
    setSelectedGrade('ALL');
    setSelectedDay('ALL');
    setSearchQuery('');
    setTeacherFilter('ALL');
    setSubjectFilter('ALL');
    setCoverageFilter('all');
    setConflictFilter('all');
    setSlotFilter('all');
  };

  const navigateToClassEditor = (classId: string) => {
    router.push(`/${locale}/timetable?classId=${classId}`);
  };

  const refreshCurrentYear = () => {
    if (selectedYearId) {
      loadClassStats(selectedYearId);
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedYearId) {
      setError('Select an academic year before generating a timetable.');
      return;
    }

    if (generationTargets.length === 0) {
      setError('No classes match the selected generation scope.');
      return;
    }

    const clearWarning = generationOptions.clearExisting
      ? ' Existing entries in the target classes will be cleared first.'
      : '';
    const confirmed = window.confirm(
      `Generate timetable entries for ${generationTargets.length} classes in ${selectedYear?.name || 'this year'}?${clearWarning}`
    );

    if (!confirmed) return;

    let assigned = 0;
    let unassigned = 0;
    let failed = 0;

    setGenerationState({
      running: true,
      current: 0,
      total: generationTargets.length,
      assigned: 0,
      unassigned: 0,
      failed: 0,
      message: 'Starting generation...',
    });

    for (let index = 0; index < generationTargets.length; index += 1) {
      const classItem = generationTargets[index];
      setGenerationState((current) => ({
        ...current,
        current: index + 1,
        message: `Generating ${classItem.name}`,
      }));

      try {
        const response = await timetableAPI.autoAssign(classItem.id, selectedYearId, generationOptions);
        assigned += response.data.assignedCount || 0;
        unassigned += response.data.unassignedCount || 0;
      } catch (err) {
        console.error(`Unable to auto-generate timetable for ${classItem.name}:`, err);
        failed += 1;
      }

      setGenerationState((current) => ({
        ...current,
        assigned,
        unassigned,
        failed,
      }));
    }

    await loadClassStats(selectedYearId);

    setGenerationState({
      running: false,
      current: generationTargets.length,
      total: generationTargets.length,
      assigned,
      unassigned,
      failed,
      message:
        failed > 0
          ? `Generated with ${failed} class${failed === 1 ? '' : 'es'} needing review.`
          : 'Generation complete.',
    });
  };

  const handleExportCsv = () => {
    if (periods.length === 0) return;

    const headers = [
      'Class',
      'Grade',
      'Coverage',
      ...visibleDays.flatMap((day) =>
        periods.map((period) => `${DAY_LABELS[day].short} ${period.name} ${formatPeriodTime(period)}`)
      ),
    ];

    const rows = filteredClasses.map((classItem) => [
      classItem.name,
      String(classItem.grade),
      `${classItem.coverage}%`,
      ...visibleDays.flatMap((day) =>
        periods.map((period) => {
          const entry = entryLookup.get(`${classItem.id}|${day}|${period.id}`);
          if (!entry) return '';
          return `${formatEntrySubjectName(entry)} / ${formatEntryTeacher(entry)}${entry.room ? ` / ${entry.room}` : ''}`;
        })
      ),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master-timetable-${selectedYear?.name || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const gridMinWidth = 124 + 170 + visibleDays.length * periods.length * 118;
  const gradeLabel = selectedGradeLevel === 'HIGH_SCHOOL' ? 'High School' : 'Secondary';
  const gradeDescription = selectedGradeLevel === 'HIGH_SCHOOL' ? 'Grades 10-12' : 'Grades 7-9';

  if (loading) {
    return <PageSkeleton type="table" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64">
        <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-950">
                      <School className="h-3.5 w-3.5" />
                      Schedule
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-slate-950 dark:text-gray-100">Master Timetable</span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="rounded-lg bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950">
                      <CalendarClock className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Enterprise scheduling
                      </p>
                      <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                        Master Timetable
                      </h1>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                      <Clock3 className="h-4 w-4 text-sky-600" />
                      Monday-Saturday
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                      <Layers3 className="h-4 w-4 text-violet-600" />
                      {periods.length || 0} periods per day
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      {teacherCount} teachers
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={refreshCurrentYear}
                    disabled={loadingData || !selectedYearId}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingData || loadingGrid ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleExportCsv}
                    disabled={periods.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  <button
                    onClick={() => setIsPrintMode(!isPrintMode)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold shadow-sm transition ${
                      isPrintMode 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' 
                        : 'border-slate-950 bg-white text-slate-950 hover:bg-slate-100 dark:border-gray-200 dark:bg-gray-950 dark:text-gray-100'
                    }`}
                  >
                    <Printer className="h-4 w-4" />
                    {isPrintMode ? 'Close Print' : 'Print Report'}
                  </button>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent delay={0.03}>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                icon={BarChart3}
                label="Coverage"
                value={`${visibleStats.coverage}%`}
                helper={`${visibleStats.filledSlots}/${visibleStats.totalSlots} visible slots`}
                tone="emerald"
              />
              <MetricCard
                icon={School}
                label="Classes"
                value={visibleStats.totalClasses}
                helper={`${gradeDescription} after filters`}
                tone="sky"
              />
              <MetricCard
                icon={Users}
                label="Faculty"
                value={teacherCount}
                helper={`${teacherOptions.length} in schedule filters`}
                tone="violet"
              />
              <MetricCard
                icon={AlertTriangle}
                label="Conflicts"
                value={visibleStats.conflicts}
                helper={visibleStats.conflicts > 0 ? 'Open schedule blockers' : 'No blockers in view'}
                tone={visibleStats.conflicts > 0 ? 'rose' : 'emerald'}
              />
              <MetricCard
                icon={Sparkles}
                label="Open Slots"
                value={visibleStats.emptySlots}
                helper="Available periods in view"
                tone="amber"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/50 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2.5 text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-800">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Advanced Filters</h2>
                    <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">
                      {gradeLabel} / {selectedYear?.name || 'No year selected'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="grid rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3">
                    {[
                      { id: 'grid', label: 'Grid', icon: Grid3X3 },
                      { id: 'classes', label: 'Classes', icon: ListChecks },
                      { id: 'workload', label: 'Workload', icon: Users },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = viewMode === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setViewMode(item.id as ViewMode)}
                          className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition ${
                            active
                              ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setFiltersExpanded((current) => !current)}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                    {filtersExpanded ? 'Collapse' : 'Expand Filters'}
                  </button>
                  <button
                    onClick={resetFilters}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <Filter className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>

              {filtersExpanded ? (
              <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_310px]">
                <div className="space-y-4">
                  <ControlShell className="max-w-3xl">
                    <ControlLabel>Search</ControlLabel>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search class, subject, teacher, room"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      />
                    </div>
                  </ControlShell>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                    <ControlShell>
                      <ControlLabel>Academic Year</ControlLabel>
                      <select
                        value={selectedYearId}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSelectedYearId(value);
                          if (value) loadClassStats(value);
                        }}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="">Select year</option>
                        {academicYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name} {year.isCurrent ? '(Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Grade Level</ControlLabel>
                      <div className="grid h-10 grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-gray-800 dark:bg-gray-950">
                        {[
                          { id: 'HIGH_SCHOOL', label: 'High' },
                          { id: 'SECONDARY', label: 'Secondary' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedGradeLevel(item.id as GradeLevel);
                              setSelectedGrade('ALL');
                            }}
                            className={`rounded-md text-sm font-bold transition ${
                              selectedGradeLevel === item.id
                                ? 'bg-white text-slate-950 shadow-sm dark:bg-gray-800 dark:text-white'
                                : 'text-slate-500 hover:text-slate-950 dark:text-gray-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Grade</ControlLabel>
                      <select
                        value={selectedGrade}
                        onChange={(event) => setSelectedGrade(event.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="ALL">All grades</option>
                        {gradeOptions.map((grade) => (
                          <option key={grade} value={grade}>
                            Grade {grade}
                          </option>
                        ))}
                      </select>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Day</ControlLabel>
                      <select
                        value={selectedDay}
                        onChange={(event) => setSelectedDay(event.target.value as DayFilter)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="ALL">All days</option>
                        {DAYS.map((day) => (
                          <option key={day} value={day}>
                            {DAY_LABELS[day].en}
                          </option>
                        ))}
                      </select>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Teacher</ControlLabel>
                      <select
                        value={teacherFilter}
                        onChange={(event) => setTeacherFilter(event.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="ALL">All teachers</option>
                        {teacherOptions.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.label}
                          </option>
                        ))}
                      </select>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Subject</ControlLabel>
                      <select
                        value={subjectFilter}
                        onChange={(event) => setSubjectFilter(event.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="ALL">All subjects</option>
                        {subjectOptions.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.meta ? `${subject.meta} - ${subject.label}` : subject.label}
                          </option>
                        ))}
                      </select>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Coverage</ControlLabel>
                      <select
                        value={coverageFilter}
                        onChange={(event) => setCoverageFilter(event.target.value as CoverageFilter)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="all">All coverage</option>
                        <option value="ready">Ready 85%+</option>
                        <option value="watch">Watch 60-84%</option>
                        <option value="action">Action below 60%</option>
                      </select>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Issues</ControlLabel>
                      <select
                        value={conflictFilter}
                        onChange={(event) => setConflictFilter(event.target.value as ConflictFilter)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="all">All statuses</option>
                        <option value="conflicts">Has conflicts</option>
                        <option value="clear">No conflicts</option>
                      </select>
                    </ControlShell>

                    <ControlShell>
                      <ControlLabel>Slots</ControlLabel>
                      <select
                        value={slotFilter}
                        onChange={(event) => setSlotFilter(event.target.value as SlotFilter)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <option value="all">All slots</option>
                        <option value="has-empty">Has empty slots</option>
                        <option value="fully-booked">Fully booked</option>
                      </select>
                    </ControlShell>
                  </div>
                </div>

                <aside className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-gray-800 dark:bg-gray-950">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-gray-900 dark:ring-emerald-900/40">
                      <Wand2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-gray-100">
                        Generator
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        {generationTargets.length} target class{generationTargets.length === 1 ? '' : 'es'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <ControlLabel>Scope</ControlLabel>
                      <select
                        value={generationScope}
                        onChange={(event) => setGenerationScope(event.target.value as GenerationScope)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <option value="filtered">Filtered classes</option>
                        <option value="level">{gradeLabel}</option>
                        <option value="all">Whole school</option>
                      </select>
                    </label>

                    {[
                      { key: 'balanceWorkload', label: 'Balance teacher load' },
                      { key: 'respectTeacherPreferences', label: 'Respect preferences' },
                      { key: 'clearExisting', label: 'Clear target first' },
                    ].map((option) => (
                      <label key={option.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                        <span className="text-sm font-bold text-slate-700 dark:text-gray-200">{option.label}</span>
                        <input
                          type="checkbox"
                          checked={generationOptions[option.key as keyof typeof generationOptions]}
                          onChange={(event) =>
                            setGenerationOptions((current) => ({
                              ...current,
                              [option.key]: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                    ))}

                    <button
                      onClick={handleAutoGenerate}
                      disabled={generationState.running || generationTargets.length === 0}
                      className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generationState.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      Auto-generate
                    </button>
                    {generationState.running && (
                      <GenerationProgress
                        state={generationState}
                        onStop={() => setGenerationState((s) => ({ ...s, running: false }))}
                      />
                    )}
                  </div>

                  {generationState.running || generationState.message ? (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3 text-emerald-950 dark:border-emerald-900/50 dark:bg-gray-900 dark:text-emerald-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black">{generationState.message}</p>
                        {generationState.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width: `${generationState.total > 0 ? (generationState.current / generationState.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black">
                        <span>{generationState.assigned} assigned</span>
                        <span>{generationState.unassigned} open</span>
                        <span>{generationState.failed} failed</span>
                      </div>
                    </div>
                  ) : null}
                </aside>
              </div>
              ) : null}
            </section>
          </AnimatedContent>

          {isPrintMode && (
            <section className="mt-8 border-t border-slate-200 pt-8 print:border-none print:mt-0 print:pt-0">
              <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                      <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">របាយការណ៍កាលវិភាគ (Timetable Report Workspace)</h3>
                      <p className="text-xs text-slate-500">Preview and print high-quality timetable reports</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
                  >
                    <Printer className="h-4 w-4" />
                    Print Now
                  </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">វិសាលភាព (Scope)</label>
                    <select 
                      value={printScope}
                      onChange={(e) => setPrintScope(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="current">តាមតម្រងបច្ចុប្បន្ន (Filtered View)</option>
                      <option value="class">តាមថ្នាក់ជាក់លាក់ (Specific Class)</option>
                      <option value="teacher">តាមគ្រូជាក់លាក់ (Specific Teacher)</option>
                      <option value="all-classes">គ្រប់ថ្នាក់ទាំងអស់ (All Classes)</option>
                      <option value="all-teachers">គ្រប់គ្រូទាំងអស់ (All Teachers)</option>
                    </select>
                  </div>

                  {(printScope === 'class' || printScope === 'teacher') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        ជ្រើសរើស {printScope === 'class' ? 'ថ្នាក់' : 'គ្រូ'}
                      </label>
                      <select 
                        value={selectedPrintId}
                        onChange={(e) => setSelectedPrintId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">ជ្រើសរើស...</option>
                        {printScope === 'class' ? (
                          classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        ) : (
                          teacherWorkloads.map(t => <option key={t.id} value={t.id}>{formatWorkloadTeacherName(t)}</option>)
                        )}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ឈ្មោះសាលារៀន (School Name)</label>
                    <input 
                      type="text"
                      value={printSettings.schoolName || school?.name || ''}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, schoolName: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ឈ្មោះការិយាល័យ (Office Name)</label>
                    <input 
                      type="text"
                      value={printSettings.officeName}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, officeName: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ឈ្មោះកម្រង (Cluster Name)</label>
                    <input 
                      type="text"
                      value={printSettings.clusterName}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, clusterName: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">កម្រិតថ្នាក់ (Grade Range)</label>
                    <input 
                      type="text"
                      value={printSettings.gradeRange}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, gradeRange: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-8">
                <div className="flex items-center justify-center gap-2 text-slate-400 print:hidden">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">Preview Area</span>
                </div>
                <div className="flex flex-col items-center gap-8 bg-slate-100 rounded-[2rem] p-8 min-h-[500px] print:block print:bg-transparent print:p-0 print:m-0 print:gap-0">
                  {(() => {
                    const items: any[] = [];
                    if (printScope === 'current') {
                      filteredClasses.forEach(cls => {
                        items.push({
                          entries: entriesByClass[cls.id] || [],
                          title: 'កាលវិភាគសិក្សា',
                          subTitle: `ថ្នាក់៖ ${cls.name}`,
                          teacherName: formatTeacherName(cls.homeroomTeacher),
                        });
                      });
                    } else if (printScope === 'class' && selectedPrintId) {
                      const cls = classes.find(c => c.id === selectedPrintId);
                      if (cls) {
                        items.push({
                          entries: entriesByClass[cls.id] || [],
                          title: 'កាលវិភាគសិក្សា',
                          subTitle: `ថ្នាក់៖ ${cls.name}`,
                          teacherName: formatTeacherName(cls.homeroomTeacher),
                        });
                      }
                    } else if (printScope === 'teacher' && selectedPrintId) {
                      const teacher = teacherWorkloads.find(t => t.id === selectedPrintId);
                      if (teacher) {
                        const teacherEntries = Object.values(entriesByClass).flat().filter(e => e.teacherId === selectedPrintId);
                        items.push({
                          entries: teacherEntries,
                          title: 'កាលវិភាគបង្រៀនគ្រូ',
                          subTitle: `គ្រូ៖ ${formatWorkloadTeacherName(teacher)}`,
                          teacherName: formatWorkloadTeacherName(teacher),
                        });
                      }
                    } else if (printScope === 'all-classes') {
                      classes.forEach(cls => {
                        items.push({
                          entries: entriesByClass[cls.id] || [],
                          title: 'កាលវិភាគសិក្សា',
                          subTitle: `ថ្នាក់៖ ${cls.name}`,
                          teacherName: formatTeacherName(cls.homeroomTeacher),
                        });
                      });
                    } else if (printScope === 'all-teachers') {
                      teacherWorkloads.forEach(teacher => {
                        const teacherEntries = Object.values(entriesByClass).flat().filter(e => e.teacherId === teacher.id);
                        if (teacherEntries.length > 0) {
                          items.push({
                            entries: teacherEntries,
                            title: 'កាលវិភាគបង្រៀនគ្រូ',
                            subTitle: `គ្រូ៖ ${formatWorkloadTeacherName(teacher)}`,
                            teacherName: formatWorkloadTeacherName(teacher),
                          });
                        }
                      });
                    }

                    if (items.length === 0) {
                      return <div className="text-slate-400 italic py-20 print:hidden">No preview items available. Select a scope and valid ID.</div>;
                    }

                    return items.map((item, index) => (
                      <div key={index} className="print:page-break-after-always print:m-0 print:p-0">
                        <TimetablePrint 
                          entries={item.entries}
                          periods={periods}
                          title={item.title}
                          subTitle={item.subTitle}
                          schoolName={printSettings.schoolName || school?.name}
                          logoUrl={printSettings.logoUrl || school?.logoUrl}
                          officeName={printSettings.officeName}
                          clusterName={printSettings.clusterName}
                          gradeRange={printSettings.gradeRange}
                          academicYear={selectedYear?.name || ''}
                          teacherName={item.teacherName}
                        />
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </section>
          )}

          <style jsx global>{`
            @media print {
              body { background: white !important; margin: 0 !important; padding: 0 !important; }
              .print\\:hidden { display: none !important; }
              .print\\:page-break-after-always { page-break-after: always; }
              
              /* Hide all UI elements except the print workspace reports */
              nav, aside, .UnifiedNavigation, .PageSkeleton { display: none !important; }
              .lg\\:ml-64 { margin-left: 0 !important; width: 100% !important; }
              main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
              
              /* Hide everything in main except the print mode section */
              main > *:not(section:has(.timetable-print-container)) {
                display: none !important;
              }
            }
          `}</style>

          {error ? (
            <AnimatedContent delay={0.06}>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-widest">Timetable Error</p>
                  <p className="mt-1 text-sm font-semibold">{error}</p>
                </div>
                <button
                  onClick={refreshCurrentYear}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.08}>
            <BlurLoader isLoading={loadingData || loadingGrid} showSpinner={false}>
              {filteredClasses.length === 0 ? (
                <section className="mt-4 rounded-lg border border-slate-200 bg-white px-6 py-20 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  {loadingData || loadingGrid ? (
                    <>
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
                      <p className="mt-4 text-sm font-semibold text-slate-500">Loading master timetable...</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="mx-auto h-10 w-10 text-slate-300" />
                      <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950 dark:text-white">No classes found</h2>
                    </>
                  )}
                </section>
              ) : viewMode === 'grid' ? (
                <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/50 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">School Grid</p>
                      <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                        All Classes by Day and Period
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                        {visibleDays.length} day{visibleDays.length === 1 ? '' : 's'}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                        {periods.length} slots
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                        {filteredClasses.length} classes
                      </span>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-gray-700">
                      <table className="table-fixed border-separate border-spacing-0 text-left" style={{ minWidth: `${gridMinWidth}px` }}>
                        <thead>
                          <tr>
                            <th
                              rowSpan={2}
                              className="sticky left-0 top-0 z-30 w-[124px] min-w-[124px] border-b border-r border-slate-200 bg-slate-50/90 px-3 py-3 text-center text-[11px] font-black uppercase tracking-widest text-slate-500 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-400"
                            >
                              Class
                            </th>
                            <th
                              rowSpan={2}
                              className="sticky left-[124px] top-0 z-30 w-[170px] min-w-[170px] border-b border-r border-slate-200 bg-slate-50/90 px-3 py-3 text-center text-[11px] font-black uppercase tracking-widest text-slate-500 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-400"
                            >
                              Homeroom
                            </th>
                            {visibleDays.map((day) => (
                              <th
                                key={day}
                                colSpan={periods.length}
                                className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50/90 px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest text-slate-700 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-300"
                              >
                                {DAY_LABELS[day].en}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            {visibleDays.flatMap((day) =>
                              periods.map((period) => (
                                <th
                                  key={`${day}-${period.id}`}
                                  className="sticky top-[45px] z-20 w-[118px] min-w-[118px] border-b border-r border-slate-200 bg-white/90 px-2 py-2.5 text-center backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90"
                                >
                                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-gray-200">
                                    {period.name}
                                  </div>
                                  <div className="mt-1 text-[10px] font-medium text-slate-500">
                                    {formatPeriodTime(period)}
                                  </div>
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClasses.map((classItem, rowIndex) => {
                            const isLastRow = rowIndex === filteredClasses.length - 1;
                            return (
                              <tr key={classItem.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                                <td className={`sticky left-0 z-10 w-[124px] min-w-[124px] border-r border-slate-200 bg-white px-2 py-2 text-center align-middle transition-colors group-hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-950 dark:group-hover:bg-gray-900/50 ${isLastRow ? '' : 'border-b'} shadow-[4px_0_12px_-6px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.4)]`}>
                                  <button
                                    onClick={() => navigateToClassEditor(classItem.id)}
                                    className="block w-full truncate text-center text-sm font-black text-slate-700 transition hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400"
                                    title={classItem.name}
                                  >
                                    {classItem.name}
                                  </button>
                                </td>
                                <td className={`sticky left-[124px] z-10 w-[170px] min-w-[170px] border-r border-slate-200 bg-white px-3 py-2 text-center align-middle transition-colors group-hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-950 dark:group-hover:bg-gray-900/50 ${isLastRow ? '' : 'border-b'} shadow-[4px_0_12px_-6px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.4)]`}>
                                  <span
                                    className={`block truncate text-sm font-bold ${
                                      classItem.homeroomTeacher
                                        ? 'text-slate-600 dark:text-gray-300'
                                        : 'text-slate-400 dark:text-gray-600'
                                    }`}
                                    title={formatTeacherName(classItem.homeroomTeacher)}
                                  >
                                    {formatTeacherName(classItem.homeroomTeacher)}
                                  </span>
                                </td>
                                {visibleDays.flatMap((day) =>
                                  periods.map((period) => {
                                    const entry = entryLookup.get(`${classItem.id}|${day}|${period.id}`);
                                    const isHighlighted =
                                      Boolean(entry) &&
                                      ((teacherFilter !== 'ALL' && entry?.teacherId === teacherFilter) ||
                                        (subjectFilter !== 'ALL' && entry?.subjectId === subjectFilter));
  
                                    return (
                                      <td
                                        key={`${classItem.id}-${day}-${period.id}`}
                                        className={`w-[118px] min-w-[118px] border-r border-slate-200 p-1.5 align-top transition-colors dark:border-gray-800 ${isLastRow ? '' : 'border-b'} ${
                                          isHighlighted ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-400 dark:bg-emerald-950/20' : 'bg-transparent'
                                        }`}
                                      >
                                        <TimetableCell entry={entry} />
                                      </td>
                                    );
                                  })
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ) : viewMode === 'classes' ? (
                <div className="mt-4 space-y-4">
                  {Object.entries(classesByGrade)
                    .sort(([left], [right]) => Number(left) - Number(right))
                    .map(([grade, classList]) => {
                      const gradeSlots = classList.reduce((sum, classItem) => sum + classItem.totalSlots, 0);
                      const gradeEntries = classList.reduce((sum, classItem) => sum + classItem.entryCount, 0);
                      const gradeCoverage = gradeSlots > 0 ? Math.round((gradeEntries / gradeSlots) * 100) : 0;
                      const gradeTone = getCoverageTone(gradeCoverage);

                      return (
                        <section key={grade} className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Grade {grade}</p>
                              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                                {classList.length} classes
                              </h2>
                            </div>
                            <div className={`rounded-lg border px-3 py-2 text-sm font-black ${gradeTone.bg} ${gradeTone.border} ${gradeTone.text}`}>
                              {gradeCoverage}% coverage
                            </div>
                          </div>

                          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {classList.map((classItem) => {
                              const tone = getCoverageTone(classItem.coverage);
                              const emptySlots = Math.max(0, classItem.totalSlots - classItem.entryCount);

                              return (
                                <button
                                  key={classItem.id}
                                  onClick={() => navigateToClassEditor(classItem.id)}
                                  className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white">
                                        {classItem.name}
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-500">
                                        Grade {classItem.grade} / Section {classItem.section || '-'}
                                      </p>
                                    </div>
                                    {classItem.conflicts > 0 ? (
                                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                                    ) : (
                                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    )}
                                  </div>

                                  <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-gray-900">
                                      <p className={`text-lg font-black ${tone.text}`}>{classItem.coverage}%</p>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cover</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-gray-900">
                                      <p className="text-lg font-black text-slate-950 dark:text-white">{emptySlots}</p>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Open</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-gray-900">
                                      <p className="text-lg font-black text-slate-950 dark:text-white">{classItem.conflicts}</p>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Issue</p>
                                    </div>
                                  </div>

                                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, classItem.coverage)}%` }} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                </div>
              ) : (
                <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Teacher Workload</p>
                      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                        Faculty Capacity
                      </h2>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-base font-black text-slate-950 dark:text-white">{workloadRows.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Teachers</p>
                      </div>
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                        <p className="text-base font-black">{workloadRows.filter((row) => row.percent >= 90).length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest">High</p>
                      </div>
                      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700">
                        <p className="text-base font-black">{workloadRows.filter((row) => row.percent <= 30).length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest">Open</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full text-left">
                      <thead className="bg-slate-100 dark:bg-gray-950">
                        <tr>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-300">Teacher</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-300">Load</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-300">Classes</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-300">Primary Assignments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                        {workloadRows.map((row) => {
                          const tone = row.percent >= 90 ? 'bg-rose-600' : row.percent >= 70 ? 'bg-amber-500' : 'bg-emerald-600';
                          return (
                            <tr key={row.teacher.id} className="hover:bg-slate-50 dark:hover:bg-gray-950/70">
                              <td className="px-4 py-4">
                                <p className="font-black text-slate-950 dark:text-white">{row.name}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{row.teacher.email || 'No email'}</p>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-2.5 w-36 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, row.percent)}%` }} />
                                  </div>
                                  <span className="text-sm font-black text-slate-700 dark:text-gray-200">
                                    {row.totalHours}/{row.maxHours}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm font-bold text-slate-700 dark:text-gray-200">
                                {row.teacher.assignedClasses?.length || 0}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex max-w-xl flex-wrap gap-2">
                                  {(row.teacher.assignedClasses || []).slice(0, 5).map((assignment) => (
                                    <span
                                      key={`${row.teacher.id}-${assignment.classId}-${assignment.subjectName}`}
                                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                                    >
                                      {assignment.className} / {assignment.subjectName}
                                    </span>
                                  ))}
                                  {(row.teacher.assignedClasses?.length || 0) > 5 ? (
                                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-gray-800 dark:bg-gray-900">
                                      +{(row.teacher.assignedClasses?.length || 0) - 5}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </BlurLoader>
          </AnimatedContent>
        </main>
      </div>
    </div>
  );
}
