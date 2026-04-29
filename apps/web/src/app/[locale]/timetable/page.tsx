'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import { getClasses, Class } from '@/lib/api/classes';
import { subjectAPI, Subject } from '@/lib/api/subjects';
import { getAcademicYearsAuto, AcademicYear } from '@/lib/api/academic-years';
import {
  timetableAPI,
  periodAPI,
  shiftAPI,
  teacherSubjectAPI,
  Period,
  TimetableEntry,
  DayOfWeek,
  DAY_LABELS,
  ClassTimetable,
  TeacherSchedule,
  SchoolShift,
  TeacherSubjectAssignment,
  TeacherWorkloadAssignment,
} from '@/lib/api/timetable';
import HorizontalTeacherPanel from '@/components/timetable/HorizontalTeacherPanel';
import {
  Teacher as SidebarTeacher,
  Subject as SidebarSubject,
  getTeacherDisplayName,
} from '@/components/timetable/types';
import {
  Home,
  ChevronRight,
  Clock,
  Users,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  Printer,
  Download,
  RefreshCw,
  User,
  GraduationCap,
  Wand2,
  Building2,
  Move,
  AlertTriangle,
  Check,
  School,
  Copy,
  Eraser,
  Ban,
  ArrowRightLeft,
  BarChart3,
  CalendarClock,
} from 'lucide-react';

type ViewMode = 'class' | 'teacher' | 'overview';
type GradeLevel = 'SECONDARY' | 'HIGH_SCHOOL';

interface ClassWithStats extends Class {
  entryCount?: number;
  totalSlots?: number;
  coverage?: number;
}

interface AvailableTeacher {
  id: string;
  firstName?: string;
  lastName?: string;
  firstNameLatin?: string;
  lastNameLatin?: string;
  khmerName?: string;
  isBusy: boolean;
  busyWith?: string;
  currentWorkload: number;
  subjects: Array<{ id: string; name: string; isPrimary: boolean }>;
  canTeachSubject: boolean;
  available: boolean;
}

interface TeacherListItem {
  id: string;
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameKhmer?: string | null;
  email?: string | null;
  totalHoursAssigned: number;
  maxHoursPerWeek: number;
  assignedClasses: TeacherWorkloadAssignment[];
}

// Droppable Cell Component for the timetable grid
import { useDroppable, useDraggable } from '@dnd-kit/core';

// Material Design inspired color palette for subjects
const MATERIAL_COLORS: Record<string, { bg: string; border: string; text: string; light: string; dark: string }> = {
  // Primary subject categories
  'Languages': { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', light: 'bg-blue-50', dark: 'dark:bg-blue-500/20' },
  'Language': { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', light: 'bg-blue-50', dark: 'dark:bg-blue-500/20' },
  'Mathematics': { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', light: 'bg-emerald-50', dark: 'dark:bg-emerald-500/20' },
  'Math': { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', light: 'bg-emerald-50', dark: 'dark:bg-emerald-500/20' },
  'Sciences': { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', light: 'bg-purple-50', dark: 'dark:bg-purple-500/20' },
  'Science': { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', light: 'bg-purple-50', dark: 'dark:bg-purple-500/20' },
  'Social Sciences': { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white', light: 'bg-amber-50', dark: 'dark:bg-amber-500/20' },
  'Social': { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white', light: 'bg-amber-50', dark: 'dark:bg-amber-500/20' },
  'Arts & Culture': { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50', dark: 'dark:bg-pink-500/20' },
  'Arts': { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50', dark: 'dark:bg-pink-500/20' },
  'Art': { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50', dark: 'dark:bg-pink-500/20' },
  'Physical Education': { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', light: 'bg-orange-50', dark: 'dark:bg-orange-500/20' },
  'PE': { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', light: 'bg-orange-50', dark: 'dark:bg-orange-500/20' },
  'Technology': { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', light: 'bg-cyan-50', dark: 'dark:bg-cyan-500/20' },
  'Tech': { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', light: 'bg-cyan-50', dark: 'dark:bg-cyan-500/20' },
  // Additional colors for variety
  'Other': { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-white', light: 'bg-indigo-50', dark: 'dark:bg-indigo-500/20' },
  'default': { bg: 'bg-slate-50 dark:bg-gray-800/95', border: 'border-slate-400', text: 'text-white', light: 'bg-slate-50 dark:bg-gray-800/50', dark: 'dark:bg-slate-50 dark:bg-gray-800/95' },
};

// Extended color palette for generating unique colors per subject/teacher
const COLOR_PALETTE = [
  { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', light: 'bg-blue-50', dark: 'dark:bg-blue-500/20' },
  { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', light: 'bg-emerald-50', dark: 'dark:bg-emerald-500/20' },
  { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', light: 'bg-purple-50', dark: 'dark:bg-purple-500/20' },
  { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white', light: 'bg-amber-50', dark: 'dark:bg-amber-500/20' },
  { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50', dark: 'dark:bg-pink-500/20' },
  { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', light: 'bg-orange-50', dark: 'dark:bg-orange-500/20' },
  { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', light: 'bg-cyan-50', dark: 'dark:bg-cyan-500/20' },
  { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-white', light: 'bg-indigo-50', dark: 'dark:bg-indigo-500/20' },
  { bg: 'bg-teal-500', border: 'border-teal-400', text: 'text-white', light: 'bg-teal-50', dark: 'dark:bg-teal-500/20' },
  { bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-white', light: 'bg-rose-50', dark: 'dark:bg-rose-500/20' },
  { bg: 'bg-violet-500', border: 'border-violet-400', text: 'text-white', light: 'bg-violet-50', dark: 'dark:bg-violet-500/20' },
  { bg: 'bg-lime-500', border: 'border-lime-400', text: 'text-white', light: 'bg-lime-50', dark: 'dark:bg-lime-500/20' },
  { bg: 'bg-sky-500', border: 'border-sky-400', text: 'text-white', light: 'bg-sky-50', dark: 'dark:bg-sky-500/20' },
  { bg: 'bg-fuchsia-500', border: 'border-fuchsia-400', text: 'text-white', light: 'bg-fuchsia-50', dark: 'dark:bg-fuchsia-500/20' },
];


// Hash function to generate consistent color index from string
function hashStringToIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getMaterialColor(category?: string, subjectId?: string) {
  // First try to match by category
  if (category && MATERIAL_COLORS[category]) {
    return MATERIAL_COLORS[category];
  }
  
  // If no category match, generate color from subject ID for consistency
  if (subjectId) {
    const index = hashStringToIndex(subjectId) % COLOR_PALETTE.length;
    return COLOR_PALETTE[index];
  }
  
  return MATERIAL_COLORS.default;
}

// Draggable timetable entry component
function DraggableEntry({
  entry,
  day,
  periodId,
  onClick,
}: {
  entry: TimetableEntry;
  day: DayOfWeek;
  periodId: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry-${entry.id}`,
    data: {
      type: 'ENTRY',
      entryId: entry.id,
      entry,
      fromSlot: { day, periodId, classId: entry.classId },
    },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = getMaterialColor(entry.subject?.category, entry.subjectId || entry.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        h-[56px] p-2 rounded-xl cursor-grab active:cursor-grabbing
        transition-all duration-300 select-none
        ${colors.bg} ${colors.text}
        shadow-sm border border-white/10
        ${isDragging ? 'shadow-2xl ring-4 ring-white/30 dark:ring-indigo-500/50 scale-105 z-50' : 'hover:shadow-xl hover:scale-[1.02] active:scale-95'}
      `}
    >
      <div className="font-bold text-[11px] truncate leading-tight drop-shadow-md">
        {entry.subject?.name || 'No Subject'}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 opacity-90">
        <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-900/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <User className="w-2.5 h-2.5" />
        </div>
        <span className="text-[9px] font-semibold truncate tracking-tight">
          {entry.teacher
            ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
            : 'No Teacher'}
        </span>
      </div>
      {entry.room && (
        <div className="text-[8px] font-bold opacity-75 truncate mt-0.5 flex items-center gap-0.5">
          <span className="opacity-50">📍</span> {entry.room}
        </div>
      )}
    </div>

  );
}

function DroppableCell({
  id,
  day,
  period,
  periodId,
  hasEntry,
  children,
  onClick,
  isTeacherBusy = false,
  isPending = false,
  entryId,
}: {
  id: string;
  day: DayOfWeek;
  period: number;
  periodId: string;
  hasEntry: boolean;
  children: React.ReactNode;
  onClick: () => void;
  isTeacherBusy?: boolean;
  isPending?: boolean;
  entryId?: string;
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'SLOT',
      day,
      period,
      periodId,
      classId: id.split('-')[0],
      isEmpty: !hasEntry,
      hasEntry,
      entryId,
    },
    disabled: isTeacherBusy,
  });

  const isDraggingTeacher = active?.data?.current?.type === 'TEACHER';
  const isDraggingEntry = active?.data?.current?.type === 'ENTRY';
  const draggedEntryId = active?.data?.current?.entryId;
  const canDrop = !isTeacherBusy && (isDraggingTeacher || isDraggingEntry);
  const isHighlighted = isOver && canDrop && !isTeacherBusy;
  const showDropZone = canDrop && !hasEntry;
  const showSwapZone = isDraggingEntry && hasEntry && isOver && entryId !== draggedEntryId;
  const showUnavailable = isDraggingTeacher && isTeacherBusy;

  return (
    <td ref={setNodeRef} className={`px-1 py-1 transition-all duration-100 ${isPending ? 'opacity-70' : ''}`}>
      {hasEntry ? (
        <div className="relative">
          {children}
          {/* Swap indicator overlay */}
          {showSwapZone && (
            <div className="absolute inset-0 bg-amber-500/20 rounded-lg flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white dark:bg-gray-900 px-2 py-1 rounded-lg text-xs font-medium text-amber-700 shadow-lg flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_387a38b0" />
              </div>
            </div>
          )}
          {/* Replace teacher indicator */}
          {isDraggingTeacher && isOver && !isTeacherBusy && (
            <div className="absolute inset-0 bg-indigo-500/20 rounded-lg flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white dark:bg-gray-900 px-2 py-1 rounded-lg text-xs font-medium text-indigo-600 shadow-lg">
                <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_d197acc8" />
              </div>
            </div>
          )}
        </div>
      ) : showUnavailable ? (
        <div
          className="h-[56px] w-full rounded-lg flex flex-col items-center justify-center 
            bg-red-50 border-2 border-red-200 text-red-400"
        >
          <Ban className="h-4 w-4" />
          <span className="text-[9px] font-medium mt-0.5"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_dc91b739" /></span>
        </div>
      ) : (
        <div
          onClick={onClick}
          className={`
            h-[56px] w-full rounded-xl flex flex-col items-center justify-center 
            transition-all duration-300 cursor-pointer group
            ${isHighlighted
              ? 'bg-indigo-100 dark:bg-indigo-500/20 border-2 border-indigo-400 dark:border-indigo-500 shadow-lg scale-[1.02] z-10'
              : showDropZone
                ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-2 border-dashed border-indigo-300 dark:border-indigo-500/30'
                : 'bg-gray-50 dark:bg-gray-800/50 dark:bg-gray-800/10 border border-dashed border-gray-200 dark:border-gray-800 hover:bg-white dark:bg-gray-900 dark:hover:bg-gray-800/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm'
            }
          `}
        >
          {isHighlighted ? (
            <div className="flex flex-col items-center text-indigo-600 dark:text-indigo-400">
              <div className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-500/30 flex items-center justify-center">
                {isDraggingEntry ? <Move className="h-3 w-3" /> : <User className="h-3 w-3" />}
              </div>
              <span className="text-[9px] font-black mt-1 uppercase tracking-tighter"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_a3445047" /></span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Plus className={`h-4 w-4 ${showDropZone ? 'text-indigo-400' : 'text-gray-300 dark:text-gray-700 dark:text-gray-200 group-hover:text-indigo-400 dark:group-hover:text-indigo-500'} transition-all`} />
            </div>
          )}
        </div>

      )}
    </td>
  );
}

export default function TimetablePage() {
    const autoT = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Data
  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherSubjectAssignment[]>([]);

  // Selection state
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('HIGH_SCHOOL');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  // Timetable data
  const [timetableData, setTimetableData] = useState<ClassTimetable | TeacherSchedule | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<AvailableTeacher[]>([]);
  const [allTeacherAssignments, setAllTeacherAssignments] = useState<Map<string, Array<{ classId: string; className: string; subjectName: string; hoursPerWeek: number }>>>(new Map());

  // Modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    periodId: string;
    dayOfWeek: DayOfWeek;
    entry?: TimetableEntry;
  } | null>(null);
  const [entryForm, setEntryForm] = useState({
    subjectId: '',
    teacherId: '',
    room: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-assign state
  const [autoAssignOptions, setAutoAssignOptions] = useState({
    balanceWorkload: true,
    clearExisting: false,
  });
  const [autoAssignResult, setAutoAssignResult] = useState<any>(null);

  // Copy timetable state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetClassId, setCopyTargetClassId] = useState('');
  const [copyClearTarget, setCopyClearTarget] = useState(false);

  // Drag and drop state
  const [activeTeacher, setActiveTeacher] = useState<AvailableTeacher | null>(null);
  const [activeDragTeacher, setActiveDragTeacher] = useState<SidebarTeacher | null>(null);
  const [draggedTeacherId, setDraggedTeacherId] = useState<string | null>(null);
  const [draggedTeacherBusySlots, setDraggedTeacherBusySlots] = useState<Set<string>>(new Set());
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  
  // Teacher sidebar state
  const [showTeacherSidebar, setShowTeacherSidebar] = useState(true);

  // Days to display (Monday-Saturday for Cambodian schools)
  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);

      const [classesRes, periodsRes, yearsRes, shiftsRes] = await Promise.all([
        getClasses({ limit: 100 }),
        periodAPI.list().catch(() => ({ data: { periods: [] } })),
        getAcademicYearsAuto(),
        shiftAPI.list().catch(() => ({ data: { shifts: [] } })),
      ]);

      const classesData = classesRes.data.classes || [];
      const periodsData = periodsRes.data.periods || [];
      const yearsData = yearsRes.data.academicYears || [];
      const shiftsData = shiftsRes.data.shifts || [];

      setClasses(classesData);
      setPeriods(periodsData);
      setAcademicYears(yearsData);
      setShifts(shiftsData);

      // Set default selections
      const currentYear = yearsData.find((y: AcademicYear) => y.isCurrent);
      if (currentYear) {
        setSelectedYearId(currentYear.id);

        // Check if classId is in URL params
        const urlClassId = searchParams.get('classId');
        
        // Filter classes by current year
        const yearClasses = classesData.filter((c: Class) => c.academicYearId === currentYear.id);
        
        if (urlClassId && yearClasses.some((c: Class) => c.id === urlClassId)) {
          // Use class from URL if valid
          setSelectedClassId(urlClassId);
          // Determine grade level from the class
          const urlClass = yearClasses.find((c: Class) => c.id === urlClassId);
          if (urlClass) {
            const grade = typeof urlClass.grade === 'string' ? parseInt(urlClass.grade) : urlClass.grade;
            setGradeLevel(grade >= 7 && grade <= 9 ? 'SECONDARY' : 'HIGH_SCHOOL');
          }
        } else if (yearClasses.length > 0) {
          setSelectedClassId(yearClasses[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData?.user) {
      setUser(userData.user);
      setSchool(userData.school || { id: userData.user.schoolId, name: 'School' });
    }

    loadInitialData();
  }, [loadInitialData, locale, router]);

  useEffect(() => {
    let isCancelled = false;

    const loadStaticTimetableResources = async () => {
      try {
        const [subjectsRes, assignmentsRes] = await Promise.all([
          subjectAPI.getAll(),
          teacherSubjectAPI.list().catch(() => ({ data: { assignments: [] } })),
        ]);

        if (isCancelled) return;

        setSubjects(subjectsRes.data.subjects || []);
        setTeacherAssignments(assignmentsRes.data.assignments || []);
      } catch (err) {
        console.error('Error loading timetable sidebar resources:', err);
      }
    };

    loadStaticTimetableResources();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedYearId) return;

    let isCancelled = false;

    const loadTeacherWorkloads = async () => {
      try {
        const response = await timetableAPI.getAllTeacherWorkloads(selectedYearId);
        if (isCancelled) return;

        const workloadTeachers = response.data.teachers || [];
        setTeachers(
          workloadTeachers.map((teacher) => ({
            id: teacher.id,
            firstNameLatin: teacher.firstNameLatin || teacher.firstName || '',
            lastNameLatin: teacher.lastNameLatin || teacher.lastName || '',
            firstNameKhmer: teacher.khmerName || null,
            email: teacher.email || null,
            totalHoursAssigned: teacher.totalHoursAssigned,
            maxHoursPerWeek: teacher.maxHoursPerWeek,
            assignedClasses: teacher.assignedClasses || [],
          }))
        );
        setAllTeacherAssignments(
          new Map(workloadTeachers.map((teacher) => [teacher.id, teacher.assignedClasses || []]))
        );
      } catch (err) {
        console.error('Error loading teacher workloads:', err);
      }
    };

    loadTeacherWorkloads();

    return () => {
      isCancelled = true;
    };
  }, [selectedYearId]);

  useEffect(() => {
    if (selectedTeacherId && !teachers.some((teacher) => teacher.id === selectedTeacherId)) {
      setSelectedTeacherId('');
    }
  }, [selectedTeacherId, teachers]);

  const loadClassTimetable = useCallback(async (classId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getClassTimetable(classId, selectedYearId);
      setTimetableData(response.data);
    } catch (err) {
      console.error('Error loading timetable:', err);
    } finally {
      setLoadingTimetable(false);
    }
  }, [selectedYearId]);

  const loadAllClassesStats = useCallback(async () => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getAllClasses(selectedYearId, gradeLevel);
      setClasses(response.data.classes as unknown as ClassWithStats[]);
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      setLoadingTimetable(false);
    }
  }, [gradeLevel, selectedYearId]);

  const loadTeacherSchedule = useCallback(async (teacherId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getTeacherSchedule(teacherId, selectedYearId);
      setTimetableData(response.data);
    } catch (err) {
      console.error('Error loading teacher schedule:', err);
    } finally {
      setLoadingTimetable(false);
    }
  }, [selectedYearId]);

  // Load timetable when selection changes
  useEffect(() => {
    if (viewMode === 'class' && selectedClassId && selectedYearId) {
      loadClassTimetable(selectedClassId);
    } else if (viewMode === 'teacher' && selectedTeacherId && selectedYearId) {
      loadTeacherSchedule(selectedTeacherId);
    } else if (viewMode === 'overview' && selectedYearId) {
      loadAllClassesStats();
    }
  }, [viewMode, selectedClassId, selectedTeacherId, selectedYearId, gradeLevel, loadClassTimetable, loadTeacherSchedule, loadAllClassesStats]);

  // Create default periods
  const handleCreateDefaultPeriods = async () => {
    try {
      setSaving(true);
      const response = await periodAPI.createDefaults();
      setPeriods(response.data.periods);
      setSuccessMessage('Default periods created successfully!');
      if (selectedClassId) {
        loadClassTimetable(selectedClassId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Create default shifts
  const handleCreateDefaultShifts = async () => {
    try {
      setSaving(true);
      const response = await shiftAPI.createDefaults();
      setShifts(response.data.shifts);
      setSuccessMessage('Default shifts created successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open entry modal
  const openEntryModal = async (periodId: string, dayOfWeek: DayOfWeek, existingEntry?: TimetableEntry) => {
    setEditingEntry({ periodId, dayOfWeek, entry: existingEntry });
    setEntryForm({
      subjectId: existingEntry?.subjectId || '',
      teacherId: existingEntry?.teacherId || '',
      room: existingEntry?.room || '',
    });
    setShowEntryModal(true);
    setError(null);

    // Load available teachers for this slot
    try {
      const response = await timetableAPI.getAvailableTeachers({
        periodId,
        dayOfWeek,
        academicYearId: selectedYearId,
      });
      setAvailableTeachers(response.data.teachers);
    } catch (err) {
      console.error('Error loading available teachers:', err);
    }
  };

  // Save entry
  const handleSaveEntry = async () => {
    if (!editingEntry) return;

    try {
      setSaving(true);
      setError(null);

      if (editingEntry.entry) {
        // Update existing entry
        await timetableAPI.updateEntry(editingEntry.entry.id, {
          subjectId: entryForm.subjectId || undefined,
          teacherId: entryForm.teacherId || undefined,
          room: entryForm.room || undefined,
        });
      } else {
        // Create new entry
        await timetableAPI.createEntry({
          classId: selectedClassId,
          subjectId: entryForm.subjectId || undefined,
          teacherId: entryForm.teacherId || undefined,
          periodId: editingEntry.periodId,
          dayOfWeek: editingEntry.dayOfWeek,
          room: entryForm.room || undefined,
          academicYearId: selectedYearId,
        });
      }

      setShowEntryModal(false);
      setSuccessMessage('Entry saved successfully!');
      loadClassTimetable(selectedClassId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await timetableAPI.deleteEntry(entryId);
      setSuccessMessage('Entry deleted');
      loadClassTimetable(selectedClassId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Auto-assign
  const handleAutoAssign = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await timetableAPI.autoAssign(selectedClassId, selectedYearId, autoAssignOptions);
      setAutoAssignResult(response.data);

      if (response.data.assignedCount > 0) {
        setSuccessMessage(`Auto-assigned ${response.data.assignedCount} entries!`);
        loadClassTimetable(selectedClassId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Clear timetable for class
  const handleClearTimetable = async () => {
    if (!selectedClassId) return;
    
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!confirm(`Are you sure you want to clear ALL timetable entries for ${selectedClass?.name || 'this class'}? This cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await timetableAPI.clearClass(selectedClassId, selectedYearId);
      setSuccessMessage(response.data.message);
      loadClassTimetable(selectedClassId);
    } catch (err: any) {
      setError(err.message || 'Failed to clear timetable');
    } finally {
      setSaving(false);
    }
  };

  // Copy timetable to another class
  const handleCopyTimetable = async () => {
    if (!selectedClassId || !copyTargetClassId) {
      setError('Please select a target class');
      return;
    }

    if (selectedClassId === copyTargetClassId) {
      setError('Cannot copy to the same class');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await timetableAPI.copyClass({
        sourceClassId: selectedClassId,
        targetClassId: copyTargetClassId,
        academicYearId: selectedYearId,
        clearTarget: copyClearTarget,
      });

      const { conflictCount, skippedCount } = response.data;
      let message = response.data.message;
      
      if (conflictCount > 0) {
        message += ` (${conflictCount} entries skipped due to teacher conflicts)`;
      }
      if (skippedCount > 0) {
        message += ` (${skippedCount} entries skipped due to existing slots)`;
      }

      setSuccessMessage(message);
      setShowCopyModal(false);
      setCopyTargetClassId('');
      setCopyClearTarget(false);
    } catch (err: any) {
      setError(err.message || 'Failed to copy timetable');
    } finally {
      setSaving(false);
    }
  };

  // Transform teachers for sidebar
  const sidebarTeachers: SidebarTeacher[] = useMemo(() => {
    return teachers.map((t) => {
      const teacherAssigns = teacherAssignments.filter((a) => a.teacherId === t.id);
      const assignments = allTeacherAssignments.get(t.id) || [];
      
      return {
        id: t.id,
        firstName: t.firstNameLatin,
        lastName: t.lastNameLatin,
        firstNameLatin: t.firstNameLatin,
        lastNameLatin: t.lastNameLatin,
        khmerName: t.firstNameKhmer || undefined,
        email: t.email || undefined,
        subjects: teacherAssigns.map((a) => ({
          id: a.id,
          subjectId: a.subjectId,
          subjectName: a.subject?.name || '',
          subjectCode: a.subject?.code || '',
          isPrimary: a.isPrimary,
          grades: a.preferredGrades?.map((g: string) => parseInt(g)) || [7, 8, 9, 10, 11, 12],
        })),
        totalHoursAssigned: t.totalHoursAssigned,
        maxHoursPerWeek: t.maxHoursPerWeek,
        assignedClasses: assignments.map(a => ({
          classId: a.classId,
          className: a.className,
          hoursPerWeek: a.hoursPerWeek,
          subjectName: a.subjectName,
        })),
      };
    });
  }, [teachers, teacherAssignments, allTeacherAssignments]);

  // Transform subjects for sidebar
  const sidebarSubjects: SidebarSubject[] = useMemo(() => {
    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      nameKh: s.nameKh,
      code: s.code,
      category: s.category || 'Other',
    }));
  }, [subjects]);

  // Calculate teacher busy slots from all timetable entries
  const calculateTeacherBusySlots = useCallback(async (teacherId: string): Promise<Set<string>> => {
    const busySlots = new Set<string>();
    
    try {
      // Get teacher's schedule to find their busy slots
      const response = await timetableAPI.getTeacherSchedule(teacherId, selectedYearId);
      const entries = response.data.entries || [];
      
      entries.forEach((entry: TimetableEntry) => {
        // Create slot key from day and period
        const periodOrder = periods.find(p => p.id === entry.periodId)?.order;
        if (periodOrder) {
          busySlots.add(`${entry.dayOfWeek}-${periodOrder}`);
        }
      });
    } catch (err) {
      console.error('Error fetching teacher schedule:', err);
    }
    
    return busySlots;
  }, [selectedYearId, periods]);

  // Drag and drop handlers
  const handleDragStart = async (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    const activeData = event.active.data.current;
    
    // Check if dragging from sidebar (teacher card)
    if (activeId.startsWith('teacher-')) {
      const teacherId = activeId.replace('teacher-', '');
      const teacher = sidebarTeachers.find((t) => t.id === teacherId);
      if (teacher) {
        setActiveDragTeacher(teacher);
        setDraggedTeacherId(teacherId);
        
        // Fetch teacher's busy slots immediately
        const busySlots = await calculateTeacherBusySlots(teacherId);
        setDraggedTeacherBusySlots(busySlots);
      }
    } else if (activeData?.type === 'ENTRY') {
      // Dragging an existing entry - track the teacher
      const entry = activeData.entry as TimetableEntry;
      if (entry?.teacherId) {
        setDraggedTeacherId(entry.teacherId);
        const busySlots = await calculateTeacherBusySlots(entry.teacherId);
        setDraggedTeacherBusySlots(busySlots);
      }
    } else {
      // Legacy: dragging from modal
      const teacher = availableTeachers.find((t) => t.id === activeId);
      if (teacher) {
        setActiveTeacher(teacher);
        setDraggedTeacherId(teacher.id);
        const busySlots = await calculateTeacherBusySlots(teacher.id);
        setDraggedTeacherBusySlots(busySlots);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTeacher(null);
    setActiveDragTeacher(null);
    setDraggedTeacherId(null);
    setDraggedTeacherBusySlots(new Set());

    if (!over) return;
    
    const activeId = active.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    // Get the drop target data
    const dropData = overData as { 
      type: string;
      day: DayOfWeek; 
      period: number; 
      periodId?: string;
      classId: string;
      isEmpty?: boolean;
      hasEntry?: boolean;
      entryId?: string;
    } | undefined;
    
    if (!dropData || dropData.type !== 'SLOT' || !dropData.day || dropData.period === undefined) {
      console.error('Invalid drop target data:', overData);
      return;
    }

    // Find the period - use periodId if available, otherwise find by number
    let periodId = dropData.periodId;
    if (!periodId) {
      const period = periods.find((p) => p.order === dropData.period);
      periodId = period?.id;
    }
    
    if (!periodId) {
      setError('Could not find period');
      return;
    }

    // Handle dragging an existing entry to a new slot
    if (activeId.startsWith('entry-') && activeData?.type === 'ENTRY') {
      const entryId = activeId.replace('entry-', '');
      const fromSlot = activeData.fromSlot as { day: DayOfWeek; periodId?: string; period?: number; classId: string };
      const entry = activeData.entry as TimetableEntry;
      const fromPeriodId = fromSlot.periodId || periods.find(p => p.order === fromSlot.period)?.id;

      // Check if dropping on the same slot
      const isSameSlot = fromSlot.day === dropData.day && (
        (fromSlot.periodId && fromSlot.periodId === periodId) ||
        (fromSlot.period !== undefined && fromSlot.period === dropData.period)
      );
      if (isSameSlot) {
        return; // Same slot, do nothing
      }

      // Check if teacher is busy at target slot (if entry has a teacher)
      if (entry.teacherId) {
        const targetSlotKey = `${dropData.day}-${dropData.period}`;
        const sourceSlotKey = `${fromSlot.day}-${fromSlot.period || periods.find(p => p.id === fromSlot.periodId)?.order}`;
        // Check if busy at target (excluding the source slot since we're moving from there)
        if (draggedTeacherBusySlots.has(targetSlotKey) && targetSlotKey !== sourceSlotKey) {
          setError('Teacher is already busy at this time slot in another class');
          return;
        }
      }

      // Check if target slot has an entry - if so, swap them
      if (dropData.hasEntry && dropData.entryId && dropData.entryId !== entryId) {
        // Get target entry for optimistic update
        const targetEntry = grid[dropData.day]?.[periodId];
        
        // Optimistic update - swap entries immediately in UI
        if (fromPeriodId && targetEntry) {
          setTimetableData(prev => {
            if (!prev) return prev;
            const newGrid = { ...prev.grid };
            
            // Swap the entries
            newGrid[fromSlot.day] = {
              ...newGrid[fromSlot.day],
              [fromPeriodId]: {
                ...targetEntry,
                dayOfWeek: fromSlot.day,
                periodId: fromPeriodId,
              },
            };
            newGrid[dropData.day] = {
              ...newGrid[dropData.day],
              [periodId]: {
                ...entry,
                dayOfWeek: dropData.day,
                periodId,
              },
            };
            return { ...prev, grid: newGrid };
          });
        }

        // API call in background
        setPendingOperations(prev => new Set([...prev, entryId, dropData.entryId!]));
        timetableAPI.swapEntries(entryId, dropData.entryId)
          .then(() => {
            setSuccessMessage('Entries swapped!');
          })
          .catch((err: any) => {
            setError(err.message || 'Failed to swap entries');
            loadClassTimetable(selectedClassId);
          })
          .finally(() => {
            setPendingOperations(prev => {
              const newSet = new Set(prev);
              newSet.delete(entryId);
              newSet.delete(dropData.entryId!);
              return newSet;
            });
          });
        return;
      }
      
      // Move to empty slot (optimistic)
      if (dropData.isEmpty || !dropData.hasEntry) {
        // Optimistic update - move entry immediately in UI
        if (fromPeriodId) {
          setTimetableData(prev => {
            if (!prev) return prev;
            const newGrid = { ...prev.grid };
            
            // Remove from old slot
            if (newGrid[fromSlot.day]) {
              newGrid[fromSlot.day] = { ...newGrid[fromSlot.day] };
              delete newGrid[fromSlot.day][fromPeriodId];
            }
            
            // Add to new slot
            if (!newGrid[dropData.day]) {
              newGrid[dropData.day] = {};
            }
            newGrid[dropData.day] = {
              ...newGrid[dropData.day],
              [periodId]: {
                ...entry,
                dayOfWeek: dropData.day,
                periodId,
              },
            };
            return { ...prev, grid: newGrid };
          });
        }

        // API call in background
        setPendingOperations(prev => new Set([...prev, entryId]));
        
        // Use Promise chain for delete + create
        timetableAPI.deleteEntry(entryId)
          .then(() => timetableAPI.createEntry({
            classId: selectedClassId,
            teacherId: entry.teacherId || undefined,
            subjectId: entry.subjectId || undefined,
            periodId,
            dayOfWeek: dropData.day,
            academicYearId: selectedYearId,
            room: entry.room || undefined,
          }))
          .then(() => {
            setSuccessMessage('Entry moved!');
            // Reload to get the new entry ID
            loadClassTimetable(selectedClassId);
          })
          .catch((err: any) => {
            setError(err.message || 'Failed to move entry');
            loadClassTimetable(selectedClassId);
          })
          .finally(() => {
            setPendingOperations(prev => {
              const newSet = new Set(prev);
              newSet.delete(entryId);
              return newSet;
            });
          });
        return;
      }
      return;
    }

    // Handle dragging a teacher from sidebar
    if (!activeId.startsWith('teacher-') && !availableTeachers.some(t => t.id === activeId)) {
      return;
    }

    // Parse teacher ID - handle both formats
    let teacherId = activeId;
    if (activeId.startsWith('teacher-')) {
      teacherId = activeId.replace('teacher-', '');
    }

    // Check if teacher is busy at this slot (cross-class conflict)
    const slotKey = `${dropData.day}-${dropData.period}`;
    if (draggedTeacherBusySlots.has(slotKey)) {
      // Find teacher name for better error message
      const teacher = sidebarTeachers.find(t => t.id === teacherId) || activeDragTeacher;
      const teacherName = teacher ? getTeacherDisplayName(teacher) : 'This teacher';
      setError(`${teacherName} is already teaching another class at this time slot`);
      return;
    }

    // Get teacher info for optimistic update
    const teacher = sidebarTeachers.find(t => t.id === teacherId) || activeDragTeacher;

    // If there's an existing entry, update its teacher (optimistic)
    if (dropData.hasEntry && dropData.entryId) {
      // Optimistic update - update UI immediately
      setTimetableData(prev => {
        if (!prev) return prev;
        const newGrid = { ...prev.grid };
        if (newGrid[dropData.day]?.[periodId]) {
          newGrid[dropData.day] = {
            ...newGrid[dropData.day],
            [periodId]: {
              ...newGrid[dropData.day][periodId]!,
              teacherId,
              teacher: teacher ? { id: teacherId, firstName: teacher.firstName || '', lastName: teacher.lastName || '', khmerName: teacher.khmerName } : undefined,
            },
          };
        }
        return { ...prev, grid: newGrid };
      });

      // API call in background
      setPendingOperations(prev => new Set([...prev, dropData.entryId!]));
      timetableAPI.updateEntry(dropData.entryId, { teacherId })
        .then(() => {
          setSuccessMessage('Teacher assigned!');
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to assign teacher');
          // Rollback on error
          loadClassTimetable(selectedClassId);
        })
        .finally(() => {
          setPendingOperations(prev => {
            const newSet = new Set(prev);
            newSet.delete(dropData.entryId!);
            return newSet;
          });
        });
      return;
    }

    // Create entry with the dropped teacher on empty slot (optimistic)
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update - show entry immediately
    setTimetableData(prev => {
      if (!prev) return prev;
      const newGrid = { ...prev.grid };
      if (!newGrid[dropData.day]) {
        newGrid[dropData.day] = {};
      }
      newGrid[dropData.day] = {
        ...newGrid[dropData.day],
        [periodId]: {
          id: tempId,
          schoolId: '',
          classId: selectedClassId,
          teacherId,
          subjectId: null,
          periodId,
          dayOfWeek: dropData.day,
          room: null,
          academicYearId: selectedYearId,
          teacher: teacher ? { id: teacherId, firstName: teacher.firstName || '', lastName: teacher.lastName || '', khmerName: teacher.khmerName } : undefined,
        },
      };
      return { ...prev, grid: newGrid };
    });

    // API call in background
    setPendingOperations(prev => new Set([...prev, tempId]));
    timetableAPI.createEntry({
      classId: selectedClassId,
      teacherId,
      periodId,
      dayOfWeek: dropData.day,
      academicYearId: selectedYearId,
    })
      .then(() => {
        setSuccessMessage('Teacher assigned!');
        // Reload to get the real entry ID
        loadClassTimetable(selectedClassId);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to assign teacher');
        // Rollback on error
        loadClassTimetable(selectedClassId);
      })
      .finally(() => {
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
      });
  };

  // Filter classes by selected year and grade level
  const filteredClasses = classes.filter((c) => {
    if (c.academicYearId !== selectedYearId) return false;
    const grade = typeof c.grade === 'string' ? parseInt(c.grade) : c.grade;
    if (gradeLevel === 'SECONDARY') {
      return grade >= 7 && grade <= 9;
    } else {
      return grade >= 10 && grade <= 12;
    }
  });

  // Group classes by grade
  const classesByGrade = filteredClasses.reduce(
    (acc, c) => {
      const grade = c.grade;
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(c);
      return acc;
    },
    {} as Record<string, ClassWithStats[]>
  );

  // Get the grid data
  const grid = timetableData?.grid || {};
  const selectedClassDetails = classes.find((item) => item.id === selectedClassId);
  const selectedTeacherDetails = teachers.find((item) => item.id === selectedTeacherId);
  const activePeriods = periods.filter((period) => !period.isBreak);
  const classEntryCount =
    timetableData && 'entries' in timetableData ? (timetableData as ClassTimetable).entries.length : 0;
  const teacherPeriodCount =
    timetableData && 'totalPeriods' in timetableData ? (timetableData as TeacherSchedule).totalPeriods : 0;
  const averageCoverage = filteredClasses.length
    ? Math.round(filteredClasses.reduce((sum, cls) => sum + (cls.coverage || 0), 0) / filteredClasses.length)
    : 0;
  const classCoverage = selectedClassDetails?.coverage || 0;
  const teacherUtilization = activePeriods.length
    ? Math.min(100, Math.round((teacherPeriodCount / Math.max(activePeriods.length * days.length, 1)) * 100))
    : 0;
  const pulseValue =
    viewMode === 'overview' ? averageCoverage : viewMode === 'teacher' ? teacherUtilization : classCoverage;
  const pulseLabel =
    viewMode === 'overview' ? 'Coverage' : viewMode === 'teacher' ? 'Utilization' : 'Scheduled';
  const currentYearLabel =
    academicYears.find((year) => year.id === selectedYearId)?.name || 'No year selected';
  const viewSummaryLabel =
    viewMode === 'overview'
      ? `${filteredClasses.length} classes in view`
      : viewMode === 'teacher'
        ? selectedTeacherDetails
          ? `${selectedTeacherDetails.firstNameLatin} ${selectedTeacherDetails.lastNameLatin}`
          : 'Teacher schedule'
        : selectedClassDetails?.name || 'Class schedule';
  const workloadSummary =
    viewMode === 'overview'
      ? `${averageCoverage}% average coverage`
      : viewMode === 'teacher'
        ? `${teacherPeriodCount} scheduled periods`
        : `${classEntryCount} scheduled entries`;
  const modeAccent =
    viewMode === 'overview'
      ? 'text-sky-600'
      : viewMode === 'teacher'
        ? 'text-violet-600'
        : 'text-indigo-600';

  // Export timetable to CSV
  const handleExportCSV = () => {
    if (!timetableData || periods.length === 0) return;

    // Build CSV content
    let csvContent = '';
    
    // Header row with days
    csvContent += 'Period,Time,' + days.map(day => DAY_LABELS[day].en).join(',') + '\n';
    
    // Data rows
    periods.forEach(period => {
      const row = [
        period.name,
        `${period.startTime}-${period.endTime}`,
        ...days.map(day => {
          const entry = grid[day]?.[period.id];
          if (period.isBreak) return period.name;
          if (!entry) return '';
          
          // Format based on view mode
          if (viewMode === 'class') {
            const subject = entry.subject?.name || '';
            const teacher = entry.teacher 
              ? `${entry.teacher.firstName || ''} ${entry.teacher.lastName || ''}`.trim()
              : '';
            return `${subject}${teacher ? ` (${teacher})` : ''}`;
          } else {
            const subject = entry.subject?.name || '';
            const className = entry.class?.name || '';
            return `${subject}${className ? ` - ${className}` : ''}`;
          }
        })
      ];
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename
    let filename = 'timetable';
    if (viewMode === 'class') {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) filename = `timetable-${selectedClass.name}`;
    } else if (viewMode === 'teacher' && timetableData && 'teacher' in timetableData) {
      const teacher = timetableData.teacher;
      filename = `schedule-${teacher.firstName}-${teacher.lastName}`;
    }
    filename = filename.replace(/\s+/g, '_').toLowerCase();
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSuccessMessage('Timetable exported successfully!');
  };

  // Clear messages after a delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return <PageSkeleton type="table" />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.08),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)]">
        <UnifiedNavigation user={user} school={school} />

        <div className="lg:ml-64">
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <AnimatedContent>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
                <CompactHeroCard
                  icon={CalendarClock}
                  eyebrow="Scheduling Studio"
                  title={
                    viewMode === 'overview'
                      ? 'Timetable editor'
                      : viewMode === 'teacher'
                        ? 'Teacher schedule view'
                        : 'Class timetable editor'
                  }
                  description={
                    viewMode === 'overview'
                      ? 'Switch views and manage timetable coverage from one clean workspace.'
                      : viewMode === 'teacher'
                        ? 'Review teacher workload and weekly placement with less noise.'
                        : 'Build class schedules, copy patterns, and auto-assign with a calmer editor.'
                  }
                  chipsPosition="below"
                  backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#eef2ff_58%,#f0f9ff_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                  glowClassName="bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.16),transparent_58%)] dark:opacity-50"
                  eyebrowClassName={modeAccent}
                  iconShellClassName="bg-gradient-to-br from-indigo-600 to-sky-500 text-white"
                  breadcrumbs={
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-slate-500">
                        <Home className="h-3.5 w-3.5" />
                        <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_b7ecdb33" />
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="text-slate-950"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_7a2eddfe" /></span>
                    </div>
                  }
                  chips={
                    <>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <School className="h-3.5 w-3.5 text-indigo-500" />
                        {currentYearLabel}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                        {workloadSummary}
                      </span>
                    </>
                  }
                  actions={
                    <>
                      {periods.length === 0 && (
                        <button
                          onClick={handleCreateDefaultPeriods}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                          <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_831861fb" />
                        </button>
                      )}
                      {shifts.length === 0 && (
                        <button
                          onClick={handleCreateDefaultShifts}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950 disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                          <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_2eae6f71" />
                        </button>
                      )}
                      {viewMode === 'class' && selectedClassId && (
                        <button
                          onClick={() => setShowAutoAssignModal(true)}
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-700 hover:to-indigo-700"
                        >
                          <Wand2 className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_80a91754" />
                        </button>
                      )}
                      {viewMode === 'class' && selectedClassId && timetableData && (timetableData as ClassTimetable).entries?.length > 0 && (
                        <>
                          <button
                            onClick={() => setShowCopyModal(true)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950"
                          >
                            <Copy className="h-4 w-4" />
                            <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_384b8188" />
                          </button>
                          <button
                            onClick={handleClearTimetable}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                            <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_96633dcd" />
                          </button>
                        </>
                      )}
                      {((viewMode === 'class' && selectedClassId) || (viewMode === 'teacher' && selectedTeacherId)) && timetableData && (
                        <button
                          onClick={handleExportCSV}
                          className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950"
                        >
                          <Download className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_d769b0cf" />
                        </button>
                      )}
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950"
                      >
                        <Printer className="h-4 w-4" />
                        <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_924ea21e" />
                      </button>
                    </>
                  }
                />

                <div className="overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(49,46,129,0.98),rgba(79,70,229,0.94)_52%,rgba(59,130,246,0.88))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(49,46,129,0.5)] ring-1 ring-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-100/80"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_ee1bef72" /></p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-5xl font-black tracking-tight">{pulseValue}%</span>
                        <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-indigo-100/75">
                          {pulseLabel}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                      <CalendarClock className="h-7 w-7 text-indigo-100" />
                    </div>
                  </div>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-indigo-200 to-violet-200"
                      style={{ width: `${Math.min(100, pulseValue)}%` }}
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { label: 'View', value: viewMode },
                      { label: 'Focus', value: viewSummaryLabel },
                      { label: 'Year', value: currentYearLabel },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                        <p className="truncate text-lg font-black tracking-tight">{item.value}</p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-indigo-100/80">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white dark:bg-none dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold text-indigo-50/90">
                    {workloadSummary}
                  </div>
                </div>
              </div>
            </AnimatedContent>

            <AnimatedContent delay={0.04}>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.3rem] border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/80 to-blue-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_0fb17e55" /></p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{viewMode === 'overview' ? 'All' : viewMode === 'teacher' ? 'Teacher' : 'Class'}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_d41fb277" /></p>
                </div>
                <div className="rounded-[1.3rem] border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_6421546e" /></p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{activePeriods.length}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_b79b67cf" /></p>
                </div>
                <div className="rounded-[1.3rem] border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/80 to-indigo-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_b4768de2" /></p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                    {viewMode === 'overview' ? filteredClasses.length : viewMode === 'teacher' ? teacherPeriodCount : classEntryCount}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-500">{viewMode === 'overview' ? 'Classes in the selected year' : viewMode === 'teacher' ? 'Scheduled teacher periods' : 'Entries in the selected class'}</p>
                </div>
                <div className="rounded-[1.3rem] border border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_9f5e870b" /></p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{gradeLevel === 'SECONDARY' ? '7-9' : '10-12'}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">{gradeLevel === 'SECONDARY' ? 'Secondary scheduling scope' : 'High school scheduling scope'}</p>
                </div>
              </div>
            </AnimatedContent>

            {successMessage ? (
              <div className="mt-5 flex items-start gap-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm">
                <div className="rounded-xl bg-emerald-100 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_dfce9bdf" /></p>
                  <p className="mt-1 text-sm font-medium">{successMessage}</p>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 flex items-start gap-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_f4cf29d8" /></p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="rounded-[0.9rem] bg-white dark:bg-gray-900 p-2 text-rose-600 transition hover:bg-rose-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <AnimatedContent delay={0.06}>
              <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_1bcee2eb" /></p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_4fac7138" /></h2>
                    <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_c8a94227" /></p>
                  </div>
                  <button
                    onClick={() => {
                      if (viewMode === 'class' && selectedClassId) {
                        loadClassTimetable(selectedClassId);
                      } else if (viewMode === 'teacher' && selectedTeacherId) {
                        loadTeacherSchedule(selectedTeacherId);
                      } else if (viewMode === 'overview') {
                        loadAllClassesStats();
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:text-slate-950"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingTimetable ? 'animate-spin' : ''}`} />
                    <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_0c4954de" />
                  </button>
                </div>

                <div className="flex flex-nowrap items-end justify-between gap-3 px-5 py-5 sm:px-6 overflow-x-auto">
                  <div className="flex items-center rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-1.5">
                    <button
                      onClick={() => setGradeLevel('HIGH_SCHOOL')}
                      className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2.5 text-sm font-semibold transition ${
                        gradeLevel === 'HIGH_SCHOOL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-900 dark:text-white'
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_1eb89146" />
                    </button>
                    <button
                      onClick={() => setGradeLevel('SECONDARY')}
                      className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2.5 text-sm font-semibold transition ${
                        gradeLevel === 'SECONDARY' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-900 dark:text-white'
                      }`}
                    >
                      <School className="h-4 w-4" />
                      <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_6f08204f" />
                    </button>
                  </div>

                  <div className="flex items-center rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-1.5">
                    {[
                      { id: 'class' as ViewMode, label: 'Class', Icon: GraduationCap },
                      { id: 'teacher' as ViewMode, label: 'Teacher', Icon: User },
                      { id: 'overview' as ViewMode, label: 'All', Icon: BarChart3 },
                    ].map(({ id, label, Icon }) => {
                      const Component = Icon;
                      const isActive = viewMode === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setViewMode(id as ViewMode)}
                          className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2.5 text-sm font-semibold transition ${
                            isActive ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'text-slate-500 hover:text-slate-900 dark:text-white'
                          }`}
                        >
                          <Component className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="space-y-2 w-[200px] flex-shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_845f2146" /></span>
                    <select
                      value={selectedYearId}
                      onChange={(e) => setSelectedYearId(e.target.value)}
                      className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    >
                      <option value="">{autoT("auto.web.app_locale_timetable_page.k_6eda4c0d")}</option>
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name} {year.isCurrent && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </label>

                  {viewMode === 'class' ? (
                    <label className="space-y-2 w-[220px] flex-shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_9fa6838a" /></span>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">{autoT("auto.web.app_locale_timetable_page.k_b1f283a9")}</option>
                        {Object.entries(classesByGrade).map(([grade, classList]) => (
                          <optgroup key={grade} label={`Grade ${grade}`}>
                            {classList
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                  {cls.name}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                  ) : viewMode === 'teacher' ? (
                    <label className="space-y-2 w-[220px] flex-shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_514fe240" /></span>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">{autoT("auto.web.app_locale_timetable_page.k_aae6c487")}</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.firstNameLatin} {teacher.lastNameLatin}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="rounded-[1.1rem] border border-slate-200 dark:border-gray-800 bg-gradient-to-br from-slate-50 to-white px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_188afaa8" /></p>
                      <p className="mt-2 text-base font-semibold text-slate-950">{gradeLevel === 'SECONDARY' ? 'Secondary classes' : 'High school classes'}</p>
                      <p className="mt-1 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_bb105621" /></p>
                    </div>
                  )}
                </div>
              </section>
            </AnimatedContent>

            {/* Main Content */}
            {viewMode === 'overview' ? (
              // Overview Mode - Show all classes with coverage stats
              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_aa4891b7" /></p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950">
                      {gradeLevel === 'HIGH_SCHOOL' ? 'High school timetable coverage' : 'Secondary timetable coverage'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_43c54b52" /></p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:px-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setViewMode('class');
                        }}
                        className="cursor-pointer rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/80 to-white p-4 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.32)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_26px_70px_-40px_rgba(79,70,229,0.2)]"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="font-bold text-slate-950">{cls.name}</span>
                          <span className="rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-2.5 py-1 text-xs font-bold text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_18e25930" /> {cls.grade}</span>
                        </div>
                        <div className="mb-2 h-2.5 w-full rounded-full bg-slate-200/80">
                          <div
                            className={`h-2.5 rounded-full ${
                              (cls.coverage || 0) >= 80
                                ? 'bg-emerald-500'
                                : (cls.coverage || 0) >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${cls.coverage || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-500">
                            {cls.entryCount || 0} / {cls.totalSlots || 0} <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_2ddcf10b" />
                          </span>
                          <span className="font-bold text-slate-950">{cls.coverage || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </AnimatedContent>
            ) : viewMode === 'teacher' ? (
              // Teacher Schedule View
              <AnimatedContent animation="slide-up" delay={100}>
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_a8d26765" /></p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_49eda514" /></h3>
                    <p className="text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_e1580d2f" /></p>
                  </div>
                  {periods.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_3b06e845" /></h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_4dac118e" />
                      </p>
                      <button
                        onClick={handleCreateDefaultPeriods}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_3cd4db67" />
                      </button>
                    </div>
                  ) : !selectedTeacherId ? (
                    <div className="p-12 text-center">
                      <User className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_12ef6887" /></h3>
                      <p className="text-gray-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_894d90b1" /></p>
                    </div>
                  ) : (
                    <BlurLoader isLoading={loadingTimetable} showSpinner={false}>
                      {/* Teacher Info Header */}
                      {timetableData && 'teacher' in timetableData && (
                        <div className="border-b border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-5 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                                <User className="h-5 w-5 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-950">
                                  {timetableData.teacher.firstName} {timetableData.teacher.lastName}
                                </h3>
                                {timetableData.teacher.khmerName && (
                                  <p className="text-sm text-slate-500">{timetableData.teacher.khmerName}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_47ff9e4c" /></p>
                              <p className="text-2xl font-bold text-indigo-600">{timetableData.totalPeriods}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-36 sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                                <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_11b66c20" />
                              </th>
                              {days.map((day) => (
                                <th key={day} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                  {DAY_LABELS[day].en}
                                  <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{DAY_LABELS[day].kh}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {periods.map((period) => (
                              <tr
                                key={period.id}
                                className={`border-b border-gray-200 dark:border-gray-800 ${period.isBreak ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
                              >
                                <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm">{period.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {period.startTime} - {period.endTime}
                                  </div>
                                </td>
                                {days.map((day) => {
                                  const entry = grid[day]?.[period.id];
                                  const colors = getMaterialColor(entry?.subject?.category, entry?.subjectId || entry?.id);
                                  return (
                                    <td key={`${day}-${period.id}`} className="px-1 py-1">
                                      {period.isBreak ? (
                                        <div className="h-[56px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-[10px] italic bg-gray-100 dark:bg-gray-800/30 dark:bg-gray-800/30 rounded-lg">
                                          {period.name}
                                        </div>
                                      ) : entry ? (
                                        <div
                                          className={`h-[56px] p-2 rounded-lg ${colors.bg} ${colors.text} transition-all hover:shadow-md hover:scale-[1.02]`}
                                        >
                                          <div className="font-semibold text-[11px] truncate leading-tight drop-shadow-sm">
                                            {entry.subject?.name || 'No Subject'}
                                          </div>
                                          <div className="flex items-center gap-1 mt-1 opacity-90">
                                            <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-900/20 flex items-center justify-center flex-shrink-0">
                                              <School className="w-2.5 h-2.5" />
                                            </div>
                                            <span className="text-[9px] truncate">
                                              {entry.class?.name || 'Unknown Class'}
                                            </span>
                                          </div>
                                          {entry.room && (
                                            <div className="text-[8px] opacity-75 truncate mt-0.5">📍 {entry.room}</div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="h-[56px] flex items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50 dark:bg-gray-800/20 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                          —
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </BlurLoader>
                  )}
                </section>
              </AnimatedContent>
            ) : (
              // Class Timetable View
              <>
                {/* Horizontal Teacher Panel - Show when class is selected */}
                {selectedClassId && periods.length > 0 && (
                  <div className="mt-5">
                    <HorizontalTeacherPanel
                      teachers={sidebarTeachers}
                      subjects={sidebarSubjects}
                      selectedGradeLevel={gradeLevel}
                      isVisible={showTeacherSidebar}
                      onToggle={() => setShowTeacherSidebar(!showTeacherSidebar)}
                    />
                  </div>
                )}

                <AnimatedContent animation="slide-up" delay={100}>
                  <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                    <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_2401ec36" /></p>
                      <h3 className="text-2xl font-black tracking-tight text-slate-950">{selectedClassDetails?.name || 'Class timetable'}</h3>
                      <p className="text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_b1b10c37" /></p>
                    </div>

                    {periods.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_3b06e845" /></h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                          <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_f11bc296" />
                        </p>
                        <button
                          onClick={handleCreateDefaultPeriods}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_3cd4db67" />
                        </button>
                      </div>
                    ) : !selectedClassId ? (
                      <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_db3a917d" /></h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_55cf6abb" /></p>
                      </div>
                    ) : (
                      <BlurLoader isLoading={loadingTimetable} showSpinner={false}>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[900px] border-collapse">
                            <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30">
                              <th className="px-4 py-4 text-left w-32 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 z-10">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_f5641665" /></span>
                              </th>
                              {days.map((day) => (
                                <th key={day} className="px-2 py-4 text-center">
                                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{DAY_LABELS[day].en}</span>
                                  <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{DAY_LABELS[day].kh}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {periods.map((period) => (
                              <tr
                                key={period.id}
                                className={`${period.isBreak ? 'bg-gray-50 dark:bg-gray-800/50 dark:bg-gray-800/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800/20'} transition-colors`}
                              >
                                <td className="px-4 py-2 sticky left-0 bg-white dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-800">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{period.name}</span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                      {period.startTime} - {period.endTime}
                                    </span>
                                  </div>
                                </td>
                                {days.map((day) => {
                                  const entry = grid[day]?.[period.id];
                                  const cellId = `${selectedClassId}-${day}-${period.order}`;
                                  const slotKey = `${day}-${period.order}`;
                                  const isTeacherBusyHere = draggedTeacherId ? draggedTeacherBusySlots.has(slotKey) : false;
                                  const isEntryPending = entry?.id ? pendingOperations.has(entry.id) : false;

                                  if (period.isBreak) {
                                    return (
                                      <td key={cellId} className="px-1 py-1">
                                        <div className="h-[56px] flex items-center justify-center bg-gray-100 dark:bg-gray-800/30 dark:bg-gray-800/30 rounded-lg">
                                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{period.name}</span>
                                        </div>
                                      </td>
                                    );
                                  }

                                  return (
                                    <DroppableCell
                                      key={cellId}
                                      id={cellId}
                                      day={day}
                                      period={period.order}
                                      periodId={period.id}
                                      hasEntry={!!entry}
                                      entryId={entry?.id}
                                      isTeacherBusy={isTeacherBusyHere}
                                      isPending={isEntryPending}
                                      onClick={() => openEntryModal(period.id, day, entry || undefined)}
                                    >
                                      {entry && (
                                        <DraggableEntry entry={entry} day={day} periodId={period.id} onClick={() => openEntryModal(period.id, day, entry)} />
                                      )}
                                    </DroppableCell>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </BlurLoader>
                  )}
                </section>
              </AnimatedContent>
            </>
            )}

            {/* Legend - More compact */}
            {periods.length > 0 && (viewMode === 'class' || viewMode === 'teacher') && (
              <AnimatedContent animation="slide-up" delay={150}>
                <div className="mt-5 rounded-[1.35rem] border border-white/75 bg-white dark:bg-gray-900/90 px-5 py-4 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_5442c2c0" /></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {Object.entries({
                    Languages: 'bg-blue-500 text-white',
                    Mathematics: 'bg-emerald-500 text-white',
                    Sciences: 'bg-purple-500 text-white',
                    'Social Sciences': 'bg-amber-500 text-white',
                    'Arts & Culture': 'bg-pink-500 text-white',
                    'Physical Education': 'bg-orange-500 text-white',
                    Technology: 'bg-cyan-500 text-white',
                  }).map(([category, colors]) => (
                    <span key={category} className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${colors}`}>
                      {category}
                    </span>
                  ))}
                  </div>
                </div>
              </AnimatedContent>
            )}
          </main>
        </div>

        {/* Entry Modal */}
        {showEntryModal && editingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingEntry.entry ? 'Edit Entry' : 'Add Entry'}
                </h3>
                <button onClick={() => setShowEntryModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <strong>{DAY_LABELS[editingEntry.dayOfWeek].en}</strong> •{' '}
                  {periods.find((p) => p.id === editingEntry.periodId)?.name}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_b0b296c2" /></label>
                  <select
                    value={entryForm.subjectId}
                    onChange={(e) => setEntryForm({ ...entryForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="">{autoT("auto.web.app_locale_timetable_page.k_35cfae28")}</option>
                    {subjects
                      .filter((s) => {
                        const selectedClass = classes.find((c) => c.id === selectedClassId);
                        return selectedClass && String(s.grade) === String(selectedClass.grade);
                      })
                      .map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_514fe240" /></label>
                  <select
                    value={entryForm.teacherId}
                    onChange={(e) => setEntryForm({ ...entryForm, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="">{autoT("auto.web.app_locale_timetable_page.k_aae6c487")}</option>
                    {availableTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id} disabled={teacher.isBusy}>
                        {teacher.firstName || teacher.firstNameLatin} {teacher.lastName || teacher.lastNameLatin}
                        {teacher.isBusy && ` (Busy: ${teacher.busyWith})`}
                        {teacher.available && teacher.canTeachSubject && ' ✓'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_7c60e5ab" /></label>
                  <input
                    type="text"
                    value={entryForm.room}
                    onChange={(e) => setEntryForm({ ...entryForm, room: e.target.value })}
                    placeholder={autoT("auto.web.app_locale_timetable_page.k_3a6a0575")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                {editingEntry.entry && (
                  <button
                    onClick={() => {
                      handleDeleteEntry(editingEntry.entry!.id);
                      setShowEntryModal(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_0aa0db70" />
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setShowEntryModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_93bc7aa0" />
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_3c834433" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Assign Modal */}
        {showAutoAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
                    <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_18d868b2" /></h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_c339e95a" /> {classes.find((c) => c.id === selectedClassId)?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAutoAssignModal(false);
                    setAutoAssignResult(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {!autoAssignResult ? (
                  <>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_056353e9" /></h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={autoAssignOptions.balanceWorkload}
                            onChange={(e) =>
                              setAutoAssignOptions({ ...autoAssignOptions, balanceWorkload: e.target.checked })
                            }
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_d748b785" /></span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={autoAssignOptions.clearExisting}
                            onChange={(e) =>
                              setAutoAssignOptions({ ...autoAssignOptions, clearExisting: e.target.checked })
                            }
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_c59ae06c" /></span>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-300">
                          <strong><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_c1a45174" /></strong> <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_4b2e3176" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                        <Check className="h-5 w-5" />
                        <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_f77a3ab5" />
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        <p><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_1da1f6d3" /> {autoAssignResult.assignedCount} <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_28fe6f5f" /></p>
                        {autoAssignResult.unassignedCount > 0 && (
                          <p className="text-yellow-600 dark:text-yellow-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_5b0f1c50" /> {autoAssignResult.unassignedCount} <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_2ddcf10b" /></p>
                        )}
                      </div>
                    </div>

                    {autoAssignResult.subjectCoverage && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_bf64673d" /></h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {autoAssignResult.subjectCoverage.map((s: any) => (
                            <div key={s.subjectId} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{s.subjectName}</span>
                              <span
                                className={`font-medium ${s.assigned >= s.required ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {s.assigned}/{s.required} <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_5c5a9df3" />
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowAutoAssignModal(false);
                    setAutoAssignResult(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {autoAssignResult ? 'Close' : 'Cancel'}
                </button>
                {!autoAssignResult && (
                  <button
                    onClick={handleAutoAssign}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_9fb6c570" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {(activeTeacher || activeDragTeacher) && (
            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-indigo-500 flex items-center gap-3 cursor-grabbing">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {activeTeacher 
                    ? `${activeTeacher.firstName || activeTeacher.firstNameLatin} ${activeTeacher.lastName || activeTeacher.lastNameLatin}`
                    : activeDragTeacher 
                      ? getTeacherDisplayName(activeDragTeacher)
                      : ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_4945df50" /></p>
              </div>
            </div>
          )}
        </DragOverlay>

        {/* Copy Timetable Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Copy className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_aad12c75" />
                </h3>
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopyTargetClassId('');
                    setCopyClearTarget(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg text-sm text-blue-700 dark:text-blue-400">
                  <p className="font-medium">
                    <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_a641a22b" /> {classes.find((c) => c.id === selectedClassId)?.name || 'Unknown'}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 mt-1">
                    {timetableData && 'entries' in timetableData ? (timetableData as ClassTimetable).entries.length : 0} <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_9813c9f9" />
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_17d2f523" />
                  </label>
                  <select
                    value={copyTargetClassId}
                    onChange={(e) => setCopyTargetClassId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="">{autoT("auto.web.app_locale_timetable_page.k_270bedae")}</option>
                    {filteredClasses
                      .filter((c) => c.id !== selectedClassId)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyClearTarget}
                    onChange={(e) => setCopyClearTarget(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_d1a67c7d" /></span>
                </label>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg text-sm text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_e9ba7d45" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopyTargetClassId('');
                    setCopyClearTarget(false);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_93bc7aa0" />
                </button>
                <button
                  onClick={handleCopyTimetable}
                  disabled={saving || !copyTargetClassId}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  <AutoI18nText i18nKey="auto.web.app_locale_timetable_page.k_aad12c75" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .lg\\:ml-64 main,
            .lg\\:ml-64 main * {
              visibility: visible;
            }
            .lg\\:ml-64 {
              margin-left: 0 !important;
            }
            .lg\\:ml-64 main {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            button,
            select,
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </DndContext>
  );
}
