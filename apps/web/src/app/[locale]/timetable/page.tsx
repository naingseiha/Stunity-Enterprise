'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Move,
  AlertTriangle,
  Check,
  School,
  Copy,
  Eraser,
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
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

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
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      setLoadingTimetable(false);
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

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const teacher = availableTeachers.find((t) => t.id === event.active.id);
    if (teacher) {
      setActiveTeacher(teacher);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string;
    setDragOverCell(overId || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTeacher(null);
    setDragOverCell(null);

    if (!over) return;

    const teacherId = active.id as string;
    const [dayOfWeek, periodId] = (over.id as string).split('-') as [DayOfWeek, string];

    // Create entry with the dropped teacher
    try {
      setSaving(true);
      await timetableAPI.createEntry({
        classId: selectedClassId,
        teacherId,
        periodId,
        dayOfWeek,
        academicYearId: selectedYearId,
      });
      setSuccessMessage('Teacher assigned!');
      loadClassTimetable(selectedClassId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return <PageSkeleton type="table" />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation user={user} school={school} />

        <div className="lg:ml-64">
          <main className="p-4 lg:p-8">
            {/* Header */}
            <AnimatedContent animation="fade" delay={0}>
              <div className="mb-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Home className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-gray-900 font-medium">Timetable Management</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <Calendar className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Timetable Management</h1>
                      <p className="text-gray-600 mt-1">
                        {gradeLevel === 'SECONDARY' ? 'Secondary School (Grades 7-9)' : 'High School (Grades 10-12)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {periods.length === 0 && (
                      <button
                        onClick={handleCreateDefaultPeriods}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                        Setup Periods
                      </button>
                    )}
                    {shifts.length === 0 && (
                      <button
                        onClick={handleCreateDefaultShifts}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                        Setup Shifts
                      </button>
                    )}
                    {viewMode === 'class' && selectedClassId && (
                      <button
                        onClick={() => setShowAutoAssignModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Wand2 className="h-4 w-4" />
                        Auto-Assign
                      </button>
                    )}
                    {viewMode === 'class' && selectedClassId && timetableData && (timetableData as ClassTimetable).entries?.length > 0 && (
                      <>
                        <button
                          onClick={() => setShowCopyModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy To...
                        </button>
                        <button
                          onClick={handleClearTimetable}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                          Clear
                        </button>
                      </>
                    )}
                    {(viewMode === 'class' && selectedClassId || viewMode === 'teacher' && selectedTeacherId) && timetableData && (
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>
                </div>
              </div>
            </AnimatedContent>

            {/* Messages */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Filters */}
            <AnimatedContent animation="slide-up" delay={50}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Grade Level Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setGradeLevel('HIGH_SCHOOL')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        gradeLevel === 'HIGH_SCHOOL' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      High School
                    </button>
                    <button
                      onClick={() => setGradeLevel('SECONDARY')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        gradeLevel === 'SECONDARY' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <School className="h-4 w-4" />
                      Secondary
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('class')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        viewMode === 'class' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" />
                      By Class
                    </button>
                    <button
                      onClick={() => setViewMode('teacher')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        viewMode === 'teacher' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <User className="h-4 w-4" />
                      By Teacher
                    </button>
                    <button
                      onClick={() => setViewMode('overview')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        viewMode === 'overview' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      Overview
                    </button>
                  </div>

                  {/* Academic Year */}
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`h-5 w-5 ${loadingTimetable ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Shift Info */}
                {shifts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Shifts:</span>
                    {shifts.map((shift) => (
                      <span key={shift.id} className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: shift.color || '#3B82F6' }}
                        />
                        <span className="font-medium">{shift.name}</span>
                        <span className="text-gray-400">
                          ({shift.startTime} - {shift.endTime})
                        </span>
                        {shift.gradeLevel && (
                          <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {shift.gradeLevel === 'SECONDARY' ? 'Secondary' : 'High School'}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
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
                    <BlurLoader isLoading={loadingTimetable}>
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
                                  return (
                                    <td key={`${day}-${period.id}`} className="px-2 py-2">
                                      {period.isBreak ? (
                                        <div className="h-16 flex items-center justify-center text-gray-400 text-sm italic">
                                          {period.name}
                                        </div>
                                      ) : entry ? (
                                        <div
                                          className={`h-16 p-2 rounded-lg border transition-all ${getCategoryColor(
                                            entry.subject?.category
                                          )}`}
                                        >
                                          <div className="font-medium text-xs truncate">
                                            {entry.subject?.name || 'No Subject'}
                                          </div>
                                          <div className="text-xs opacity-75 truncate">
                                            {entry.class?.name || 'Unknown Class'}
                                          </div>
                                          {entry.room && (
                                            <div className="text-xs opacity-50 truncate">Room: {entry.room}</div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="h-16 flex items-center justify-center text-gray-300">
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
              <AnimatedContent animation="slide-up" delay={100}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {periods.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Periods Configured</h3>
                      <p className="text-gray-500 mb-4">
                        Set up your school's period schedule to start creating timetables.
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
                  ) : !selectedClassId ? (
                    <div className="p-12 text-center">
                      <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Class</h3>
                      <p className="text-gray-500">Choose a class from the dropdown to view its timetable.</p>
                    </div>
                  ) : (
                    <BlurLoader isLoading={loadingTimetable}>
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
                                  const cellId = `${day}-${period.id}`;
                                  const isDropTarget = dragOverCell === cellId && !entry;

                                  return (
                                    <td key={cellId} className="px-2 py-2">
                                      {period.isBreak ? (
                                        <div className="h-16 flex items-center justify-center text-gray-400 text-sm italic">
                                          {period.name}
                                        </div>
                                      ) : entry ? (
                                        <div
                                          className={`h-16 p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getCategoryColor(
                                            entry.subject?.category
                                          )}`}
                                          onClick={() => openEntryModal(period.id, day, entry)}
                                        >
                                          <div className="font-medium text-xs truncate">
                                            {entry.subject?.name || 'No Subject'}
                                          </div>
                                          <div className="text-xs opacity-75 truncate">
                                            {entry.teacher
                                              ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
                                              : 'No Teacher'}
                                          </div>
                                          {entry.room && (
                                            <div className="text-xs opacity-50 truncate">Room: {entry.room}</div>
                                          )}
                                        </div>
                                      ) : (
                                        <div
                                          id={cellId}
                                          data-droppable="true"
                                          onClick={() => openEntryModal(period.id, day)}
                                          className={`h-16 w-full border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                                            isDropTarget
                                              ? 'border-indigo-500 bg-indigo-50 text-indigo-500'
                                              : 'border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'
                                          }`}
                                        >
                                          <Plus className="h-5 w-5" />
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
            )}

            {/* Legend */}
            {periods.length > 0 && (viewMode === 'class' || viewMode === 'teacher') && (
              <AnimatedContent animation="slide-up" delay={150}>
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Subject Categories</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries({
                      Languages: 'bg-blue-100 border-blue-300',
                      Mathematics: 'bg-green-100 border-green-300',
                      Sciences: 'bg-purple-100 border-purple-300',
                      'Social Sciences': 'bg-yellow-100 border-yellow-300',
                      'Arts & Culture': 'bg-pink-100 border-pink-300',
                      'Physical Education': 'bg-orange-100 border-orange-300',
                      Technology: 'bg-cyan-100 border-cyan-300',
                    }).map(([category, colors]) => (
                      <div key={category} className={`px-3 py-1 rounded-lg border text-xs font-medium ${colors}`}>
                        {category}
                      </div>
                    ))}
                  </div>
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
        <DragOverlay>
          {activeTeacher && (
            <div className="p-3 bg-white rounded-lg shadow-lg border-2 border-indigo-500">
              <span className="font-medium">
                {activeTeacher.firstName || activeTeacher.firstNameLatin} {activeTeacher.lastName || activeTeacher.lastNameLatin}
              </span>
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
