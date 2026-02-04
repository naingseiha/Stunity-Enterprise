'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import { getClasses, Class } from '@/lib/api/classes';
import { getTeachers, Teacher } from '@/lib/api/teachers';
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
  getCategoryColor,
  ClassTimetable,
  TeacherSchedule,
  SchoolShift,
  TeacherSubjectAssignment,
} from '@/lib/api/timetable';
import HorizontalTeacherPanel from '@/components/timetable/HorizontalTeacherPanel';
import TeacherCard from '@/components/timetable/TeacherCard';
import {
  Teacher as SidebarTeacher,
  Subject as SidebarSubject,
  getTeacherDisplayName,
} from '@/components/timetable/types';
import {
  Calendar,
  Home,
  ChevronRight,
  Clock,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
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
  ChevronDown,
  ChevronLeft,
  Move,
  AlertTriangle,
  Check,
  School,
  Copy,
  Eraser,
  PanelLeftClose,
  PanelLeftOpen,
  GripVertical,
  Ban,
  ArrowRightLeft,
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

// Droppable Cell Component for the timetable grid
import { useDroppable, useDraggable } from '@dnd-kit/core';

// Material Design inspired color palette for subjects
const MATERIAL_COLORS: Record<string, { bg: string; border: string; text: string; light: string }> = {
  // Primary subject categories
  'Languages': { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', light: 'bg-blue-50' },
  'Language': { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', light: 'bg-blue-50' },
  'Mathematics': { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', light: 'bg-emerald-50' },
  'Math': { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', light: 'bg-emerald-50' },
  'Sciences': { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', light: 'bg-purple-50' },
  'Science': { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', light: 'bg-purple-50' },
  'Social Sciences': { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white', light: 'bg-amber-50' },
  'Social': { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white', light: 'bg-amber-50' },
  'Arts & Culture': { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50' },
  'Arts': { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50' },
  'Art': { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50' },
  'Physical Education': { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', light: 'bg-orange-50' },
  'PE': { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', light: 'bg-orange-50' },
  'Technology': { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', light: 'bg-cyan-50' },
  'Tech': { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', light: 'bg-cyan-50' },
  // Additional colors for variety
  'Other': { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-white', light: 'bg-indigo-50' },
  'default': { bg: 'bg-slate-500', border: 'border-slate-400', text: 'text-white', light: 'bg-slate-50' },
};

// Extended color palette for generating unique colors per subject/teacher
const COLOR_PALETTE = [
  { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', light: 'bg-blue-50' },
  { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', light: 'bg-emerald-50' },
  { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', light: 'bg-purple-50' },
  { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white', light: 'bg-amber-50' },
  { bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-white', light: 'bg-pink-50' },
  { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', light: 'bg-orange-50' },
  { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', light: 'bg-cyan-50' },
  { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-white', light: 'bg-indigo-50' },
  { bg: 'bg-teal-500', border: 'border-teal-400', text: 'text-white', light: 'bg-teal-50' },
  { bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-white', light: 'bg-rose-50' },
  { bg: 'bg-violet-500', border: 'border-violet-400', text: 'text-white', light: 'bg-violet-50' },
  { bg: 'bg-lime-500', border: 'border-lime-400', text: 'text-white', light: 'bg-lime-50' },
  { bg: 'bg-sky-500', border: 'border-sky-400', text: 'text-white', light: 'bg-sky-50' },
  { bg: 'bg-fuchsia-500', border: 'border-fuchsia-400', text: 'text-white', light: 'bg-fuchsia-50' },
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
  cellId,
  day,
  periodId,
  onClick,
}: {
  entry: TimetableEntry;
  cellId: string;
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
        h-[56px] p-2 rounded-lg cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none
        ${colors.bg} ${colors.text}
        ${isDragging ? 'shadow-xl ring-2 ring-white scale-105 z-50' : 'hover:shadow-lg hover:scale-[1.02]'}
      `}
    >
      <div className="font-semibold text-[11px] truncate leading-tight drop-shadow-sm">
        {entry.subject?.name || 'No Subject'}
      </div>
      <div className="flex items-center gap-1 mt-1 opacity-90">
        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <User className="w-2.5 h-2.5" />
        </div>
        <span className="text-[9px] truncate">
          {entry.teacher
            ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
            : 'No Teacher'}
        </span>
      </div>
      {entry.room && (
        <div className="text-[8px] opacity-75 truncate mt-0.5">
          📍 {entry.room}
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
              <div className="bg-white px-2 py-1 rounded-lg text-xs font-medium text-amber-700 shadow-lg flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                Swap
              </div>
            </div>
          )}
          {/* Replace teacher indicator */}
          {isDraggingTeacher && isOver && !isTeacherBusy && (
            <div className="absolute inset-0 bg-indigo-500/20 rounded-lg flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white px-2 py-1 rounded-lg text-xs font-medium text-indigo-600 shadow-lg">
                Replace Teacher
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
          <span className="text-[9px] font-medium mt-0.5">Busy</span>
        </div>
      ) : (
        <div
          onClick={onClick}
          className={`
            h-[56px] w-full rounded-lg flex flex-col items-center justify-center 
            transition-all duration-100 cursor-pointer group
            ${isHighlighted
              ? 'bg-indigo-100 border-2 border-indigo-400 shadow-md scale-[1.02]'
              : showDropZone
                ? 'bg-indigo-50/50 border-2 border-dashed border-indigo-300'
                : 'bg-gray-50/30 border border-dashed border-gray-200 hover:bg-indigo-50/30 hover:border-indigo-300'
            }
          `}
        >
          {isHighlighted ? (
            <div className="flex flex-col items-center text-indigo-600">
              <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center">
                {isDraggingEntry ? <Move className="h-3 w-3" /> : <User className="h-3 w-3" />}
              </div>
              <span className="text-[9px] font-medium mt-0.5">Drop here</span>
            </div>
          ) : (
            <Plus className={`h-3.5 w-3.5 ${showDropZone ? 'text-indigo-400' : 'text-gray-300 group-hover:text-indigo-400'} transition-colors`} />
          )}
        </div>
      )}
    </td>
  );
}

export default function TimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Data
  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
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
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [draggedTeacherId, setDraggedTeacherId] = useState<string | null>(null);
  const [draggedTeacherBusySlots, setDraggedTeacherBusySlots] = useState<Set<string>>(new Set());
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  
  // Teacher sidebar state
  const [showTeacherSidebar, setShowTeacherSidebar] = useState(true);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | undefined>();

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
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push('/en/auth/login');
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData?.user) {
      setUser(userData.user);
      setSchool(userData.school || { id: userData.user.schoolId, name: 'School' });
    }

    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [classesRes, teachersRes, subjectsRes, periodsRes, yearsRes, shiftsRes] = await Promise.all([
        getClasses({ limit: 100 }),
        getTeachers({ limit: 100 }),
        subjectAPI.getAll(),
        periodAPI.list().catch(() => ({ data: { periods: [] } })),
        getAcademicYearsAuto(),
        shiftAPI.list().catch(() => ({ data: { shifts: [] } })),
      ]);

      const classesData = classesRes.data.classes || [];
      const teachersData = teachersRes.data.teachers || [];
      const subjectsData = subjectsRes.data.subjects || [];
      const periodsData = periodsRes.data.periods || [];
      const yearsData = yearsRes.data.academicYears || [];
      const shiftsData = shiftsRes.data.shifts || [];

      setClasses(classesData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setPeriods(periodsData);
      setAcademicYears(yearsData);
      setShifts(shiftsData);

      // Load teacher-subject assignments
      try {
        const assignmentsRes = await teacherSubjectAPI.list();
        setTeacherAssignments(assignmentsRes.data.assignments || []);
      } catch (e) {
        console.error('Error loading teacher assignments:', e);
      }

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
  };

  // Load timetable when selection changes
  useEffect(() => {
    if (viewMode === 'class' && selectedClassId && selectedYearId) {
      loadClassTimetable(selectedClassId);
    } else if (viewMode === 'teacher' && selectedTeacherId && selectedYearId) {
      loadTeacherSchedule(selectedTeacherId);
    } else if (viewMode === 'overview' && selectedYearId) {
      loadAllClassesStats();
    }
  }, [viewMode, selectedClassId, selectedTeacherId, selectedYearId, gradeLevel]);

  // Load teacher assignments when classes are available
  useEffect(() => {
    if (classes.length > 0 && selectedYearId && allTeacherAssignments.size === 0) {
      loadAllTeacherAssignments();
    }
  }, [classes, selectedYearId]);

  const loadClassTimetable = async (classId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getClassTimetable(classId, selectedYearId);
      setTimetableData(response.data);
    } catch (err) {
      console.error('Error loading timetable:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const loadAllClassesStats = async () => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getAllClasses(selectedYearId, gradeLevel);
      setClasses(response.data.classes as unknown as ClassWithStats[]);
      
      // Also load all timetable entries to calculate teacher assignments
      await loadAllTeacherAssignments();
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  // Load all teacher assignments from all class timetables
  const loadAllTeacherAssignments = async () => {
    try {
      const assignmentsMap = new Map<string, Array<{ classId: string; className: string; subjectName: string; hoursPerWeek: number }>>();
      
      // Load timetables for all classes to get teacher assignments
      const classesToLoad = classes.length > 0 ? classes : filteredClasses;
      
      for (const cls of classesToLoad.slice(0, 20)) { // Limit to first 20 classes for performance
        try {
          const response = await timetableAPI.getClassTimetable(cls.id, selectedYearId);
          const entries = response.data.entries || [];
          
          // Group entries by teacher
          entries.forEach((entry: TimetableEntry) => {
            if (entry.teacherId) {
              const existing = assignmentsMap.get(entry.teacherId) || [];
              
              // Check if this class+subject combination already exists
              const subjectName = entry.subject?.name || 'Unknown';
              const existingAssignment = existing.find(
                a => a.classId === entry.classId && a.subjectName === subjectName
              );
              
              if (existingAssignment) {
                existingAssignment.hoursPerWeek += 1;
              } else {
                existing.push({
                  classId: entry.classId,
                  className: entry.class?.name || cls.name,
                  subjectName: subjectName,
                  hoursPerWeek: 1,
                });
              }
              
              assignmentsMap.set(entry.teacherId, existing);
            }
          });
        } catch (err) {
          // Skip classes that fail to load
          console.warn(`Failed to load timetable for class ${cls.id}`);
        }
      }
      
      setAllTeacherAssignments(assignmentsMap);
    } catch (err) {
      console.error('Error loading teacher assignments:', err);
    }
  };

  const loadTeacherSchedule = async (teacherId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getTeacherSchedule(teacherId, selectedYearId);
      setTimetableData(response.data);
    } catch (err) {
      console.error('Error loading teacher schedule:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

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

      const { copiedCount, conflictCount, skippedCount } = response.data;
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
      const totalHours = assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      
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
        totalHoursAssigned: totalHours,
        maxHoursPerWeek: 25,
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

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string;
    setDragOverCell(overId || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTeacher(null);
    setActiveDragTeacher(null);
    setDragOverCell(null);
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation user={user} school={school} />

        <div className="lg:ml-64">
          {/* Main Content */}
          <main className="p-4 lg:p-8">
            {/* Header */}
            <AnimatedContent animation="fade" delay={0}>
              <div className="mb-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Home className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-gray-900 font-medium">Timetable</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <Calendar className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Timetable</h1>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {gradeLevel === 'SECONDARY' ? 'Secondary (Grades 7-9)' : 'High School (Grades 10-12)'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons - Cleaner layout */}
                  <div className="flex items-center gap-2">
                    {periods.length === 0 && (
                      <button
                        onClick={handleCreateDefaultPeriods}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                        Setup Periods
                      </button>
                    )}
                    
                    {shifts.length === 0 && (
                      <button
                        onClick={handleCreateDefaultShifts}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                        Setup Shifts
                      </button>
                    )}
                    
                    {viewMode === 'class' && selectedClassId && (
                      <button
                        onClick={() => setShowAutoAssignModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
                      >
                        <Wand2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Auto-Assign</span>
                      </button>
                    )}
                    
                    {viewMode === 'class' && selectedClassId && timetableData && (timetableData as ClassTimetable).entries?.length > 0 && (
                      <>
                        <button
                          onClick={() => setShowCopyModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                          <Copy className="h-4 w-4" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          onClick={handleClearTimetable}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                          <span className="hidden sm:inline">Clear</span>
                        </button>
                      </>
                    )}
                    
                    {/* Utility buttons */}
                    {(viewMode === 'class' && selectedClassId || viewMode === 'teacher' && selectedTeacherId) && timetableData && (
                      <button
                        onClick={handleExportCSV}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Export CSV"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Print"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </AnimatedContent>

            {/* Messages */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Filters - Cleaner card */}
            <AnimatedContent animation="slide-up" delay={50}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Grade Level Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setGradeLevel('HIGH_SCHOOL')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        gradeLevel === 'HIGH_SCHOOL' 
                          ? 'bg-white shadow-sm text-indigo-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      High School
                    </button>
                    <button
                      onClick={() => setGradeLevel('SECONDARY')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        gradeLevel === 'SECONDARY' 
                          ? 'bg-white shadow-sm text-amber-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <School className="h-3.5 w-3.5" />
                      Secondary
                    </button>
                  </div>

                  <div className="h-6 w-px bg-gray-200" />

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('class')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'class' 
                          ? 'bg-white shadow-sm text-indigo-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      Class
                    </button>
                    <button
                      onClick={() => setViewMode('teacher')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'teacher' 
                          ? 'bg-white shadow-sm text-indigo-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      Teacher
                    </button>
                    <button
                      onClick={() => setViewMode('overview')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'overview' 
                          ? 'bg-white shadow-sm text-indigo-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      All
                    </button>
                  </div>

                  <div className="h-6 w-px bg-gray-200" />

                  {/* Academic Year */}
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"
                  >
                    <option value="">Select Year</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>

                  {/* Class Selector */}
                  {viewMode === 'class' && (
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white min-w-[140px]"
                    >
                      <option value="">Select Class</option>
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
                  )}

                  {/* Teacher Selector */}
                  {viewMode === 'teacher' && (
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white min-w-[160px]"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.firstNameLatin} {teacher.lastNameLatin}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Refresh */}
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
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-auto"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingTimetable ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </AnimatedContent>

            {/* Main Content */}
            {viewMode === 'overview' ? (
              // Overview Mode - Show all classes with coverage stats
              <AnimatedContent animation="slide-up" delay={100}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {gradeLevel === 'HIGH_SCHOOL' ? 'High School Classes' : 'Secondary Classes'} - Timetable Coverage
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setViewMode('class');
                        }}
                        className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{cls.name}</span>
                          <span className="text-sm text-gray-500">Grade {cls.grade}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${
                              (cls.coverage || 0) >= 80
                                ? 'bg-green-500'
                                : (cls.coverage || 0) >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${cls.coverage || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            {cls.entryCount || 0} / {cls.totalSlots || 0} slots
                          </span>
                          <span className="font-medium">{cls.coverage || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedContent>
            ) : viewMode === 'teacher' ? (
              // Teacher Schedule View
              <AnimatedContent animation="slide-up" delay={100}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {periods.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Periods Configured</h3>
                      <p className="text-gray-500 mb-4">
                        Set up your school's period schedule to view teacher schedules.
                      </p>
                      <button
                        onClick={handleCreateDefaultPeriods}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Setup Default Periods
                      </button>
                    </div>
                  ) : !selectedTeacherId ? (
                    <div className="p-12 text-center">
                      <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Teacher</h3>
                      <p className="text-gray-500">Choose a teacher from the dropdown to view their schedule.</p>
                    </div>
                  ) : (
                    <BlurLoader isLoading={loadingTimetable} showSpinner={false}>
                      {/* Teacher Info Header */}
                      {timetableData && 'teacher' in timetableData && (
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {timetableData.teacher.firstName} {timetableData.teacher.lastName}
                                </h3>
                                {timetableData.teacher.khmerName && (
                                  <p className="text-sm text-gray-500">{timetableData.teacher.khmerName}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Total Periods</p>
                              <p className="text-2xl font-bold text-indigo-600">{timetableData.totalPeriods}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-36 sticky left-0 bg-gray-50">
                                Time
                              </th>
                              {days.map((day) => (
                                <th key={day} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                  {DAY_LABELS[day].en}
                                  <span className="block text-xs font-normal text-gray-500">{DAY_LABELS[day].kh}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {periods.map((period) => (
                              <tr
                                key={period.id}
                                className={`border-b border-gray-200 ${period.isBreak ? 'bg-gray-50' : ''}`}
                              >
                                <td className="px-4 py-3 sticky left-0 bg-white border-r border-gray-100">
                                  <div className="font-medium text-gray-900 text-sm">{period.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {period.startTime} - {period.endTime}
                                  </div>
                                </td>
                                {days.map((day) => {
                                  const entry = grid[day]?.[period.id];
                                  const colors = getMaterialColor(entry?.subject?.category, entry?.subjectId || entry?.id);
                                  return (
                                    <td key={`${day}-${period.id}`} className="px-1 py-1">
                                      {period.isBreak ? (
                                        <div className="h-[56px] flex items-center justify-center text-gray-400 text-[10px] italic bg-gray-100/30 rounded-lg">
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
                                            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
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
                                        <div className="h-[56px] flex items-center justify-center text-gray-300 bg-gray-50/30 rounded-lg border border-dashed border-gray-200">
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
                </div>
              </AnimatedContent>
            ) : (
              // Class Timetable View
              <>
                {/* Horizontal Teacher Panel - Show when class is selected */}
                {selectedClassId && periods.length > 0 && (
                  <HorizontalTeacherPanel
                    teachers={sidebarTeachers}
                    subjects={sidebarSubjects}
                    selectedGradeLevel={gradeLevel}
                    isVisible={showTeacherSidebar}
                    onToggle={() => setShowTeacherSidebar(!showTeacherSidebar)}
                  />
                )}

                <AnimatedContent animation="slide-up" delay={100}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {periods.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Periods Configured</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                          Set up your school's period schedule to start creating timetables.
                        </p>
                        <button
                          onClick={handleCreateDefaultPeriods}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Setup Default Periods
                        </button>
                      </div>
                    ) : !selectedClassId ? (
                      <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Class</h3>
                        <p className="text-sm text-gray-500">Choose a class from the dropdown above to view its timetable.</p>
                      </div>
                    ) : (
                      <BlurLoader isLoading={loadingTimetable} showSpinner={false}>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[900px] border-collapse">
                            <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                              <th className="px-4 py-4 text-left w-32 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100/50 z-10">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</span>
                              </th>
                              {days.map((day) => (
                                <th key={day} className="px-2 py-4 text-center">
                                  <span className="text-sm font-semibold text-gray-800">{DAY_LABELS[day].en}</span>
                                  <span className="block text-[10px] text-gray-400 mt-0.5">{DAY_LABELS[day].kh}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {periods.map((period) => (
                              <tr
                                key={period.id}
                                className={`${period.isBreak ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'} transition-colors`}
                              >
                                <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-gray-100">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800 text-sm">{period.name}</span>
                                    <span className="text-[10px] text-gray-400 mt-0.5">
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
                                        <div className="h-[56px] flex items-center justify-center bg-gray-100/30 rounded-lg">
                                          <span className="text-[10px] text-gray-400 font-medium">{period.name}</span>
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
                                        <DraggableEntry
                                          entry={entry}
                                          cellId={cellId}
                                          day={day}
                                          periodId={period.id}
                                          onClick={() => openEntryModal(period.id, day, entry)}
                                        />
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
                </div>
              </AnimatedContent>
            </>
            )}

            {/* Legend - More compact */}
            {periods.length > 0 && (viewMode === 'class' || viewMode === 'teacher') && (
              <AnimatedContent animation="slide-up" delay={150}>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-medium">Subjects:</span>
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
              </AnimatedContent>
            )}
          </main>
        </div>

        {/* Entry Modal */}
        {showEntryModal && editingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingEntry.entry ? 'Edit Entry' : 'Add Entry'}
                </h3>
                <button onClick={() => setShowEntryModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div className="text-sm text-gray-500 mb-4">
                  <strong>{DAY_LABELS[editingEntry.dayOfWeek].en}</strong> •{' '}
                  {periods.find((p) => p.id === editingEntry.periodId)?.name}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={entryForm.subjectId}
                    onChange={(e) => setEntryForm({ ...entryForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Subject</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select
                    value={entryForm.teacherId}
                    onChange={(e) => setEntryForm({ ...entryForm, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Teacher</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room (Optional)</label>
                  <input
                    type="text"
                    value={entryForm.room}
                    onChange={(e) => setEntryForm({ ...entryForm, room: e.target.value })}
                    placeholder="e.g., Room 101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                {editingEntry.entry && (
                  <button
                    onClick={() => {
                      handleDeleteEntry(editingEntry.entry!.id);
                      setShowEntryModal(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setShowEntryModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Assign Modal */}
        {showAutoAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Wand2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Auto-Assign Teachers</h3>
                    <p className="text-sm text-gray-500">
                      Automatically assign teachers to {classes.find((c) => c.id === selectedClassId)?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAutoAssignModal(false);
                    setAutoAssignResult(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {!autoAssignResult ? (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Options</h4>
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
                          <span className="text-sm text-gray-700">Balance teacher workload (prefer less busy teachers)</span>
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
                          <span className="text-sm text-gray-700">Clear existing entries for this class first</span>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <strong>Note:</strong> Auto-assign will use teacher-subject assignments to determine which
                          teachers can teach which subjects. Make sure teachers are assigned to their subjects first.
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                        <Check className="h-5 w-5" />
                        Auto-assignment complete!
                      </div>
                      <div className="text-sm text-green-600">
                        <p>Assigned: {autoAssignResult.assignedCount} entries</p>
                        {autoAssignResult.unassignedCount > 0 && (
                          <p className="text-yellow-600">Unassigned: {autoAssignResult.unassignedCount} slots</p>
                        )}
                      </div>
                    </div>

                    {autoAssignResult.subjectCoverage && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Subject Coverage</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {autoAssignResult.subjectCoverage.map((s: any) => (
                            <div key={s.subjectId} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{s.subjectName}</span>
                              <span
                                className={`font-medium ${s.assigned >= s.required ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {s.assigned}/{s.required} periods
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowAutoAssignModal(false);
                    setAutoAssignResult(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
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
                    Start Auto-Assign
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {(activeTeacher || activeDragTeacher) && (
            <div className="p-3 bg-white rounded-xl shadow-2xl border-2 border-indigo-500 flex items-center gap-3 cursor-grabbing">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {activeTeacher 
                    ? `${activeTeacher.firstName || activeTeacher.firstNameLatin} ${activeTeacher.lastName || activeTeacher.lastNameLatin}`
                    : activeDragTeacher 
                      ? getTeacherDisplayName(activeDragTeacher)
                      : ''}
                </p>
                <p className="text-xs text-gray-500">Drag to assign</p>
              </div>
            </div>
          )}
        </DragOverlay>

        {/* Copy Timetable Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Copy className="h-5 w-5 text-teal-600" />
                  Copy Timetable
                </h3>
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopyTargetClassId('');
                    setCopyClearTarget(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <p className="font-medium">
                    Source: {classes.find((c) => c.id === selectedClassId)?.name || 'Unknown'}
                  </p>
                  <p className="text-blue-600 mt-1">
                    {timetableData && 'entries' in timetableData ? (timetableData as ClassTimetable).entries.length : 0} entries will be copied
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Copy to Class
                  </label>
                  <select
                    value={copyTargetClassId}
                    onChange={(e) => setCopyTargetClassId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select target class...</option>
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
                  <span className="text-gray-700">Clear existing entries in target class first</span>
                </label>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Entries with teacher conflicts will be skipped to avoid double-booking.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopyTargetClassId('');
                    setCopyClearTarget(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCopyTimetable}
                  disabled={saving || !copyTargetClassId}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Copy Timetable
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
