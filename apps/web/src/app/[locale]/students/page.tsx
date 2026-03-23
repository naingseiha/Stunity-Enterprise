'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  GraduationCap,
  Home,
  Loader2,
  Lock,
  LucideIcon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { deleteStudent, type Student } from '@/lib/api/students';
import { useStudents } from '@/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import StudentModal from '@/components/students/StudentModal';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { useDebounce } from '@/hooks/useDebounce';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';

interface ClassOption {
  id: string;
  name: string;
  grade: string;
  section?: string;
  studentCount?: number;
}

type MetricTone = 'blue' | 'emerald' | 'amber' | 'violet';

const ITEMS_PER_PAGE = 20;
const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';
const CLASS_SERVICE_URL = process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';

function formatDisplayDate(value?: string | null) {
  if (!value) return 'Unknown';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatAgeLabel(value?: string | null) {
  if (!value) return null;

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? `${age} yrs` : null;
}

function getStudentInitials(student: Pick<Student, 'firstNameLatin' | 'lastNameLatin'>) {
  const first = student.firstNameLatin?.charAt(0) ?? '';
  const last = student.lastNameLatin?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase() || 'ST';
}

function getKhmerName(student: Student) {
  return [student.firstNameKhmer, student.lastNameKhmer].filter(Boolean).join(' ');
}

function StudentAvatar({ student, size = 'md' }: { student: Student; size?: 'md' | 'lg' }) {
  const sizeClasses = {
    md: 'h-11 w-11 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  if (student.photoUrl) {
    return (
      <img
        src={`${STUDENT_SERVICE_URL}${student.photoUrl}`}
        alt={`${student.firstNameLatin} ${student.lastNameLatin}`}
        className={`${sizeClasses[size]} rounded-2xl object-cover ring-1 ring-slate-200/70 shadow-sm dark:ring-gray-700/70`}
      />
    );
  }

  const gradientClass =
    student.gender === 'MALE'
      ? 'from-blue-500 to-cyan-500 shadow-blue-500/20'
      : 'from-fuchsia-500 to-rose-500 shadow-fuchsia-500/20';

  return (
    <div
      className={`${sizeClasses[size]} inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${gradientClass} font-black text-white shadow-lg`}
    >
      {getStudentInitials(student)}
    </div>
  );
}

function GenderBadge({ gender }: { gender: string }) {
  const isMale = gender === 'MALE';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        isMale
          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20'
          : 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20'
      }`}
    >
      {isMale ? 'Male' : 'Female'}
    </span>
  );
}

function PlacementBadge({ hasClass }: { hasClass: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        hasClass
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
      }`}
    >
      {hasClass ? 'Placed' : 'Needs class'}
    </span>
  );
}

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
    blue: {
      surface: 'from-blue-500 via-cyan-500 to-sky-500 shadow-blue-200/70 dark:shadow-blue-950/40',
      icon: 'bg-white/18 text-white ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    emerald: {
      surface: 'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-200/70 dark:shadow-emerald-950/40',
      icon: 'bg-white/18 text-white ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    amber: {
      surface: 'from-amber-400 via-orange-500 to-rose-500 shadow-amber-200/70 dark:shadow-orange-950/40',
      icon: 'bg-white/18 text-white ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    violet: {
      surface: 'from-violet-500 via-fuchsia-500 to-pink-500 shadow-violet-200/70 dark:shadow-violet-950/40',
      icon: 'bg-white/18 text-white ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
  };

  const classes = toneClasses[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.25rem] border border-white/15 bg-gradient-to-br ${classes.surface} p-5 text-white shadow-xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl dark:border-white/5`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${classes.glow}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-white/35 via-white/10 to-transparent" />
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
            className="text-white/35"
          />
        </svg>
      </div>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">{label}</p>
          <p className="mt-3 text-3xl font-black leading-none tracking-tight text-white">{value}</p>
          <div className="mt-3 inline-flex items-center rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-md">
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

function IconActionButton({
  icon: Icon,
  title,
  onClick,
  tone = 'neutral',
  disabled = false,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  tone?: 'neutral' | 'blue' | 'amber' | 'red';
  disabled?: boolean;
}) {
  const toneClasses = {
    neutral:
      'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800',
    blue: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10',
    amber:
      'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-gray-400 dark:hover:text-amber-300 dark:hover:bg-amber-500/10',
    red: 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-300 dark:hover:bg-red-500/10',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[0.75rem] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MobileActionButton({
  icon: Icon,
  label,
  onClick,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'blue' | 'amber' | 'red';
}) {
  const toneClasses = {
    neutral:
      'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800',
    blue: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15',
    amber:
      'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[0.75rem] border px-3 py-2.5 text-xs font-semibold transition-colors ${toneClasses[tone]}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function StudentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const { selectedYear } = useAcademicYear();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [studentToReassign, setStudentToReassign] = useState<Student | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);

  const { user, school } = TokenManager.getUserData();
  const serverClassFilter = classFilter !== 'all' && classFilter !== 'unassigned' ? classFilter : undefined;

  const {
    students,
    pagination,
    isLoading,
    isValidating,
    mutate,
    isEmpty,
  } = useStudents({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch,
    classId: serverClassFilter,
    academicYearId: selectedYear?.id,
  });

  const { classes: classOptionsSource } = useClasses({
    academicYearId: selectedYear?.id,
    limit: 100,
  });

  const availableClasses = useMemo<ClassOption[]>(
    () =>
      classOptionsSource.map((cls) => ({
        id: cls.id,
        name: cls.name,
        grade: String(cls.grade),
        section: cls.section ?? undefined,
        studentCount: cls._count?.students ?? 0,
      })),
    [classOptionsSource]
  );

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedYear?.id, classFilter]);

  useEffect(() => {
    setSelectedStudents(new Set());
  }, [page, debouncedSearch, selectedYear?.id, classFilter]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this student?')) return;

      try {
        await deleteStudent(id);
        setSelectedStudents((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        mutate();
      } catch (error: any) {
        alert(error.message);
      }
    },
    [mutate]
  );

  const handleEdit = useCallback((student: Student) => {
    setSelectedStudent(student);
    setShowModal(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedStudent(null);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(
    (refresh?: boolean) => {
      setShowModal(false);
      setSelectedStudent(null);
      if (refresh) {
        mutate();
      }
    },
    [mutate]
  );

  const handleOpenReassign = useCallback((student: Student) => {
    setStudentToReassign(student);
    setTargetClassId('');
    setReassignMessage(null);
    setShowReassignModal(true);
  }, []);

  const handleReassignStudent = async () => {
    if (!studentToReassign || !targetClassId) return;

    setIsReassigning(true);
    setReassignMessage(null);

    try {
      const token = TokenManager.getAccessToken();

      if (studentToReassign.class?.id) {
        await fetch(`${CLASS_SERVICE_URL}/classes/${studentToReassign.class.id}/students/${studentToReassign.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const response = await fetch(`${CLASS_SERVICE_URL}/classes/${targetClassId}/students`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentToReassign.id,
          academicYearId: selectedYear?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const targetClass = availableClasses.find((classItem) => classItem.id === targetClassId);
        setReassignMessage({
          type: 'success',
          text: `${studentToReassign.firstNameLatin} ${studentToReassign.lastNameLatin} moved to ${targetClass?.name || 'the selected class'}.`,
        });
        setSelectedStudents((prev) => {
          const next = new Set(prev);
          next.delete(studentToReassign.id);
          return next;
        });
        mutate();
        setTimeout(() => {
          closeReassignModal();
        }, 1200);
      } else {
        setReassignMessage({
          type: 'error',
          text: data.message || 'Failed to reassign student.',
        });
      }
    } catch (error: any) {
      setReassignMessage({
        type: 'error',
        text: error.message || 'Failed to reassign student.',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  const handleBulkReassign = async () => {
    if (selectedStudents.size === 0 || !targetClassId) return;

    setIsReassigning(true);
    setReassignMessage(null);

    try {
      const token = TokenManager.getAccessToken();
      const studentIds = Array.from(selectedStudents);

      for (const studentId of studentIds) {
        const student = students.find((currentStudent) => currentStudent.id === studentId);
        if (student?.class?.id) {
          await fetch(`${CLASS_SERVICE_URL}/classes/${student.class.id}/students/${studentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      const response = await fetch(`${CLASS_SERVICE_URL}/classes/${targetClassId}/students/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds,
          academicYearId: selectedYear?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const targetClass = availableClasses.find((classItem) => classItem.id === targetClassId);
        setReassignMessage({
          type: 'success',
          text: `${data.data?.assigned || studentIds.length} students assigned to ${targetClass?.name || 'the selected class'}.`,
        });
        setSelectedStudents(new Set());
        mutate();
        setTimeout(() => {
          closeBulkReassignModal();
        }, 1200);
      } else {
        setReassignMessage({
          type: 'error',
          text: data.message || 'Failed to reassign students.',
        });
      }
    } catch (error: any) {
      setReassignMessage({
        type: 'error',
        text: error.message || 'Failed to reassign students.',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (classFilter === 'unassigned') {
      return students.filter((student) => !student.class);
    }

    return students;
  }, [classFilter, students]);

  const totalPages = pagination.totalPages || 1;
  const totalCount = pagination.total || 0;
  const visibleAssignedCount = useMemo(
    () => filteredStudents.filter((student) => Boolean(student.class)).length,
    [filteredStudents]
  );
  const visibleUnassignedCount = filteredStudents.length - visibleAssignedCount;
  const assignmentRate = filteredStudents.length > 0 ? Math.round((visibleAssignedCount / filteredStudents.length) * 100) : 0;
  const classesWithStudents = useMemo(
    () => availableClasses.filter((classItem) => (classItem.studentCount ?? 0) > 0).length,
    [availableClasses]
  );
  const selectedStudentsList = useMemo(
    () => students.filter((student) => selectedStudents.has(student.id)),
    [selectedStudents, students]
  );
  const selectedStudentsPlacedCount = useMemo(
    () => selectedStudentsList.filter((student) => Boolean(student.class)).length,
    [selectedStudentsList]
  );
  const selectedStudentsUnassignedCount = selectedStudentsList.length - selectedStudentsPlacedCount;
  const reassignableClasses = useMemo(() => {
    if (!studentToReassign) return availableClasses;
    return availableClasses.filter((classItem) => classItem.id !== studentToReassign.class?.id);
  }, [availableClasses, studentToReassign]);
  const selectedTargetClass = useMemo(
    () => availableClasses.find((classItem) => classItem.id === targetClassId) || null,
    [availableClasses, targetClassId]
  );
  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudents.has(student.id));
  const someVisibleSelected = filteredStudents.some((student) => selectedStudents.has(student.id));
  const hasActiveFilter = debouncedSearch.trim().length > 0 || classFilter !== 'all';
  const hasVisibleMatches = filteredStudents.length > 0;
  const showNoRoster = !isLoading && isEmpty && !hasActiveFilter;
  const showNoMatches = !isLoading && !showNoRoster && !hasVisibleMatches;

  const classScopeLabel = useMemo(() => {
    if (classFilter === 'all') return 'All classes';
    if (classFilter === 'unassigned') return 'Unassigned on this page';

    return availableClasses.find((classItem) => classItem.id === classFilter)?.name || 'Selected class';
  }, [availableClasses, classFilter]);

  const directoryTitle = useMemo(() => {
    if (classFilter === 'unassigned') return 'Students Needing Placement';
    if (classFilter !== 'all') return `${classScopeLabel} Roster`;
    return 'Student Directory';
  }, [classFilter, classScopeLabel]);

  const rosterHealth = useMemo(() => {
    if (filteredStudents.length === 0) {
      return {
        label: 'Awaiting roster focus',
        helper: 'Search or change filters to inspect placement health for this roster view.',
        icon: Sparkles,
        iconClass: 'text-cyan-500 dark:text-cyan-300',
      };
    }

    if (visibleUnassignedCount === 0) {
      return {
        label: 'Placement complete',
        helper: 'Every visible student is already attached to a class.',
        icon: CheckCircle2,
        iconClass: 'text-emerald-500 dark:text-emerald-300',
      };
    }

    if (assignmentRate >= 70) {
      return {
        label: 'Healthy coverage',
        helper: `${visibleUnassignedCount} students still need a class assignment in this view.`,
        icon: Sparkles,
        iconClass: 'text-blue-500 dark:text-blue-300',
      };
    }

    return {
      label: 'Needs attention',
      helper: `${visibleUnassignedCount} students still need a class assignment in this view.`,
      icon: AlertCircle,
      iconClass: 'text-amber-500 dark:text-amber-300',
    };
  }, [assignmentRate, filteredStudents.length, visibleUnassignedCount]);

  const summaryCards = useMemo(
    () => [
      {
        icon: Users,
        label: 'School Roster',
        value: totalCount,
        helper: school?.name || 'Total records',
        tone: 'blue' as MetricTone,
      },
      {
        icon: Search,
        label: 'Current View',
        value: filteredStudents.length,
        helper: hasActiveFilter ? 'Filtered results' : 'Visible now',
        tone: 'violet' as MetricTone,
      },
      {
        icon: GraduationCap,
        label: 'Placed In Class',
        value: visibleAssignedCount,
        helper: filteredStudents.length > 0 ? `${assignmentRate}% placed` : 'No records',
        tone: 'emerald' as MetricTone,
      },
      {
        icon: BookOpen,
        label: 'Active Classes',
        value: classesWithStudents,
        helper: selectedYear ? `${availableClasses.length} in ${selectedYear.name}` : `${availableClasses.length} classes`,
        tone: 'amber' as MetricTone,
      },
    ],
    [assignmentRate, availableClasses.length, classesWithStudents, filteredStudents.length, hasActiveFilter, school?.name, totalCount, visibleAssignedCount, selectedYear]
  );

  const toggleStudentSelection = useCallback((studentId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        filteredStudents.forEach((student) => next.delete(student.id));
      } else {
        filteredStudents.forEach((student) => next.add(student.id));
      }

      return next;
    });
  }, [allVisibleSelected, filteredStudents]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setClassFilter('all');
    setPage(1);
  }, []);

  const closeReassignModal = useCallback(() => {
    setShowReassignModal(false);
    setStudentToReassign(null);
    setTargetClassId('');
    setReassignMessage(null);
  }, []);

  const closeBulkReassignModal = useCallback(() => {
    setShowBulkReassignModal(false);
    setTargetClassId('');
    setReassignMessage(null);
  }, []);

  const pageStart = totalCount === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(page * ITEMS_PER_PAGE, totalCount);
  const RosterHealthIcon = rosterHealth.icon;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="relative overflow-hidden rounded-[1.65rem] border border-slate-200/60 bg-white/85 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/85 dark:shadow-black/20 xl:col-span-8 sm:p-7">
                <div className="pointer-events-none absolute -right-12 top-0 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
                <div className="relative z-10">
                  <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                    <Link
                      href={`/${locale}/dashboard`}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-gray-300"
                    >
                      <Home className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-slate-900 dark:text-white">Students</span>
                  </nav>

                  <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                        <Sparkles className="h-3.5 w-3.5" />
                        School Management
                      </div>
                      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                        Student Directory
                      </h1>
                      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                        Clean roster, cleaner placement.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => mutate()}
                        disabled={isValidating}
                        className="inline-flex items-center gap-2 rounded-[0.75rem] border border-slate-200/60 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800/60 dark:bg-gray-900/90 dark:text-gray-200"
                      >
                        <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="inline-flex items-center gap-2 rounded-[0.75rem] bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 px-5 py-2.5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="h-4 w-4" />
                        Add Student
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                      {selectedYear?.name || 'No academic year selected'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                      {classScopeLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                      {visibleUnassignedCount} need placement
                    </span>
                    {selectedStudents.size > 0 && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                        {selectedStudents.size} selected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50/70 p-6 text-slate-900 shadow-[0_30px_80px_-35px_rgba(148,163,184,0.45)] ring-1 ring-slate-200/70 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-200/45 blur-3xl dark:bg-blue-500/20" />
                <div className="pointer-events-none absolute -bottom-14 left-0 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/20" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Placement</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{assignmentRate}%</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">ready</span>
                      </div>
                    </div>
                    <div className={`rounded-[0.95rem] border border-white/80 bg-white/85 p-3 shadow-sm ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-white/10 dark:ring-white/10 ${rosterHealth.iconClass}`}>
                      <RosterHealthIcon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 transition-all duration-700"
                      style={{ width: `${Math.max(filteredStudents.length ? assignmentRate : 0, filteredStudents.length > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-white/80 bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{filteredStudents.length}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Visible</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/80 bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{visibleUnassignedCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Open</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/80 bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{selectedStudents.size}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Selected</p>
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {rosterHealth.label}
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={50}>
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <MetricCard
                  key={card.label}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  helper={card.helper}
                  tone={card.tone}
                />
              ))}
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={100}>
            <section className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/35 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-black/20">
              <div className="border-b border-slate-200/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">Directory workspace</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {directoryTitle}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {selectedYear?.name || 'Academic year not set'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {debouncedSearch ? `Search: “${debouncedSearch}”` : 'No keyword filter'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_240px_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by student name or ID"
                      className="h-14 w-full rounded-[0.75rem] border border-slate-200/70 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                    />
                  </label>

                  <select
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value)}
                    className="h-14 rounded-[0.75rem] border border-slate-200/70 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                  >
                    <option value="all">All Classes</option>
                    <option value="unassigned">Unassigned</option>
                    {availableClasses.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>

                  {hasActiveFilter ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-[0.75rem] border border-slate-200/70 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <X className="h-4 w-4" />
                      Reset Filters
                    </button>
                  ) : (
                    <div />
                  )}
                </div>

                {selectedStudents.size > 0 && (
                  <div className="mt-5 rounded-[0.85rem] bg-slate-900 px-5 py-3.5 text-white dark:bg-slate-950">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{selectedStudents.size} students selected</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetClassId('');
                            setReassignMessage(null);
                            setShowBulkReassignModal(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-[0.75rem] bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          Assign to Class
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStudents(new Set())}
                          className="inline-flex items-center gap-2 rounded-[0.75rem] border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <BlurLoader
                  isLoading={isLoading}
                  skeleton={
                    <div className="p-6 sm:p-8">
                      <div className="hidden space-y-4 lg:block">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[48px_minmax(0,2.4fr)_1.2fr_1.3fr_1fr_1.1fr] items-center gap-4 rounded-xl border border-slate-100/80 px-4 py-4 dark:border-gray-800/60"
                          >
                            <div className="h-5 w-5 rounded bg-slate-100 dark:bg-gray-800" />
                            <div className="flex items-center gap-4">
                              <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-gray-800" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 rounded bg-slate-100 dark:bg-gray-800" />
                                <div className="h-3 w-24 rounded bg-slate-50 dark:bg-gray-800/70" />
                              </div>
                            </div>
                            <div className="h-8 w-24 rounded-2xl bg-slate-100 dark:bg-gray-800" />
                            <div className="h-8 w-28 rounded-2xl bg-slate-100 dark:bg-gray-800" />
                            <div className="space-y-2">
                              <div className="h-4 w-24 rounded bg-slate-100 dark:bg-gray-800" />
                              <div className="h-3 w-16 rounded bg-slate-50 dark:bg-gray-800/70" />
                            </div>
                            <div className="ml-auto flex gap-2">
                              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-gray-800" />
                              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-gray-800" />
                              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-gray-800" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4 lg:hidden">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="rounded-[0.9rem] border border-slate-100/80 p-4 dark:border-gray-800/60"
                          >
                            <div className="flex items-start gap-4">
                              <div className="mt-1 h-5 w-5 rounded bg-slate-100 dark:bg-gray-800" />
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-gray-800" />
                                  <div className="space-y-2">
                                    <div className="h-4 w-28 rounded bg-slate-100 dark:bg-gray-800" />
                                    <div className="h-3 w-20 rounded bg-slate-50 dark:bg-gray-800/70" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <div className="h-7 w-16 rounded-full bg-slate-100 dark:bg-gray-800" />
                                  <div className="h-7 w-20 rounded-full bg-slate-100 dark:bg-gray-800" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="h-12 rounded-2xl bg-slate-100 dark:bg-gray-800" />
                                  <div className="h-12 rounded-2xl bg-slate-100 dark:bg-gray-800" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                >
                  {isValidating && !isLoading && (
                    <div className="absolute right-4 top-4 z-10">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Syncing
                      </div>
                    </div>
                  )}

                  {showNoRoster ? (
                    <div className="px-6 py-20 text-center sm:px-8">
                      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                        <Users className="h-8 w-8" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">No students yet</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-gray-400">
                        Start the directory by adding your first student to the roster. Once students are added, this workspace becomes the operational hub for placement and account actions.
                      </p>
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="mt-6 inline-flex items-center gap-2 rounded-[0.75rem] bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                      >
                        <Plus className="h-4 w-4" />
                        Add Student
                      </button>
                    </div>
                  ) : showNoMatches ? (
                    <div className="px-6 py-20 text-center sm:px-8">
                      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">No students match this view</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-gray-400">
                        Try a different search term or reset the class filter to bring more students back into focus.
                      </p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-6 inline-flex items-center gap-2 rounded-[0.75rem] border border-slate-200/70 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                      >
                        <X className="h-4 w-4" />
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto lg:block">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-slate-200/70 bg-slate-50/80 dark:border-gray-800/70 dark:bg-gray-950/40">
                              <th className="w-14 px-6 py-5">
                                <button
                                  type="button"
                                  onClick={toggleSelectAll}
                                  aria-label="Select all visible students"
                                  className="inline-flex items-center justify-center"
                                >
                                  {allVisibleSelected ? (
                                    <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                  ) : someVisibleSelected ? (
                                    <div className="h-[18px] w-[18px] rounded border-2 border-blue-500 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.25)]" />
                                  ) : (
                                    <Square className="h-[18px] w-[18px] text-slate-300 transition-colors hover:text-slate-500 dark:text-gray-700 dark:hover:text-gray-500" />
                                  )}
                                </button>
                              </th>
                              <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                                Student
                              </th>
                              <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                                Student ID
                              </th>
                              <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                                Current Class
                              </th>
                              <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                                Birth Date
                              </th>
                              <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/80 dark:divide-gray-800/70">
                            {filteredStudents.map((student) => {
                              const khmerName = getKhmerName(student);
                              const ageLabel = formatAgeLabel(student.dateOfBirth);

                              return (
                                <tr
                                  key={student.id}
                                  className={`group transition-colors ${
                                    selectedStudents.has(student.id)
                                      ? 'bg-blue-50/40 dark:bg-blue-500/5'
                                      : 'hover:bg-slate-50/80 dark:hover:bg-gray-950/30'
                                  }`}
                                >
                                  <td className="px-6 py-4 align-top">
                                    <button
                                      type="button"
                                      onClick={() => toggleStudentSelection(student.id)}
                                      aria-label={`Select ${student.firstNameLatin} ${student.lastNameLatin}`}
                                      className="mt-2 inline-flex items-center justify-center"
                                    >
                                      {selectedStudents.has(student.id) ? (
                                        <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                      ) : (
                                        <Square className="h-[18px] w-[18px] text-slate-300 transition-colors group-hover:text-slate-500 dark:text-gray-700 dark:group-hover:text-gray-500" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-start gap-4">
                                      <StudentAvatar student={student} />
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                            {student.firstNameLatin} {student.lastNameLatin}
                                          </p>
                                          <GenderBadge gender={student.gender} />
                                        </div>
                                        {khmerName ? (
                                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-gray-400">{khmerName}</p>
                                        ) : null}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 align-top">
                                    <div className="inline-flex rounded-[0.65rem] bg-slate-100 px-3 py-2 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700/70">
                                      {student.studentId}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 align-top">
                                    {student.class ? (
                                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                                        <span>{student.class.name}</span>
                                        <span className="text-emerald-400 dark:text-emerald-500">•</span>
                                        <span>G{student.class.grade}</span>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                                        Unassigned
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 align-top">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {formatDisplayDate(student.dateOfBirth)}
                                    </p>
                                    {ageLabel ? (
                                      <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{ageLabel}</p>
                                    ) : null}
                                  </td>
                                  <td className="px-6 py-4 align-top">
                                    <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                                      <IconActionButton
                                        icon={ArrowRightLeft}
                                        title="Assign to class"
                                        tone="blue"
                                        onClick={() => handleOpenReassign(student)}
                                      />
                                      <IconActionButton
                                        icon={Lock}
                                        title="Reset password"
                                        tone="amber"
                                        onClick={() => {
                                          setSelectedStudent(student);
                                          setShowResetModal(true);
                                        }}
                                      />
                                      <IconActionButton
                                        icon={Eye}
                                        title="View"
                                        onClick={() => router.push(`/${locale}/students/${student.id}`)}
                                      />
                                      <IconActionButton
                                        icon={Edit}
                                        title="Edit"
                                        onClick={() => handleEdit(student)}
                                      />
                                      <IconActionButton
                                        icon={Trash2}
                                        title="Delete"
                                        tone="red"
                                        onClick={() => handleDelete(student.id)}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-4 p-4 lg:hidden">
                        {filteredStudents.map((student) => {
                          const khmerName = getKhmerName(student);

                          return (
                            <article
                              key={student.id}
                              className={`rounded-[0.75rem] border p-4 shadow-sm transition-colors ${
                                selectedStudents.has(student.id)
                                  ? 'border-blue-200 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/5'
                                  : 'border-slate-200/70 bg-white dark:border-gray-800/70 dark:bg-gray-950/50'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <button
                                  type="button"
                                  onClick={() => toggleStudentSelection(student.id)}
                                  aria-label={`Select ${student.firstNameLatin} ${student.lastNameLatin}`}
                                  className="mt-1 inline-flex items-center justify-center"
                                >
                                  {selectedStudents.has(student.id) ? (
                                    <CheckSquare className="h-5 w-5 text-slate-900 dark:text-white" />
                                  ) : (
                                    <Square className="h-5 w-5 text-slate-300 dark:text-gray-700" />
                                  )}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <StudentAvatar student={student} size="lg" />
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                          {student.firstNameLatin} {student.lastNameLatin}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{student.studentId}</p>
                                        {khmerName ? (
                                          <p className="mt-1 truncate text-xs text-slate-400 dark:text-gray-500">{khmerName}</p>
                                        ) : null}
                                      </div>
                                    </div>
                                    <PlacementBadge hasClass={Boolean(student.class)} />
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <GenderBadge gender={student.gender} />
                                    {student.class ? (
                                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                                        {student.class.name}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                                        Unassigned
                                      </span>
                                    )}
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700/70">
                                      {formatAgeLabel(student.dateOfBirth) || 'Age unavailable'}
                                    </span>
                                  </div>

                                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-[0.75rem] bg-slate-50/80 p-3 text-xs dark:bg-gray-900/80">
                                    <div>
                                      <p className="font-black uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500">Class</p>
                                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                        {student.class?.name || 'Unassigned'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-black uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500">Birth date</p>
                                      <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                                        {formatDisplayDate(student.dateOfBirth)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <MobileActionButton
                                      icon={ArrowRightLeft}
                                      label="Assign"
                                      tone="blue"
                                      onClick={() => handleOpenReassign(student)}
                                    />
                                    <MobileActionButton
                                      icon={Eye}
                                      label="View"
                                      onClick={() => router.push(`/${locale}/students/${student.id}`)}
                                    />
                                    <MobileActionButton
                                      icon={Edit}
                                      label="Edit"
                                      onClick={() => handleEdit(student)}
                                    />
                                    <MobileActionButton
                                      icon={Lock}
                                      label="Reset"
                                      tone="amber"
                                      onClick={() => {
                                        setSelectedStudent(student);
                                        setShowResetModal(true);
                                      }}
                                    />
                                    <MobileActionButton
                                      icon={Trash2}
                                      label="Delete"
                                      tone="red"
                                      onClick={() => handleDelete(student.id)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                </BlurLoader>
              </div>

              {totalPages > 1 && !showNoRoster && !showNoMatches && (
                <div className="flex flex-col gap-4 border-t border-slate-200/70 px-6 py-6 dark:border-gray-800/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                    {classFilter === 'unassigned' ? (
                      <>
                        Showing <span className="text-slate-900 dark:text-white">{filteredStudents.length}</span> unassigned students on page{' '}
                        <span className="text-slate-900 dark:text-white">{page}</span>
                      </>
                    ) : (
                      <>
                        Showing <span className="text-slate-900 dark:text-white">{pageStart}</span>–
                        <span className="text-slate-900 dark:text-white">{pageEnd}</span> of{' '}
                        <span className="text-slate-900 dark:text-white">{totalCount}</span>
                      </>
                    )}
                  </p>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[0.75rem] border border-slate-200/70 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-800/70 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = index + 1;
                      } else if (page <= 3) {
                        pageNumber = index + 1;
                      } else if (page >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                      } else {
                        pageNumber = page - 2 + index;
                      }

                      return (
                        <button
                          type="button"
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-[0.75rem] px-2 text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
                            page === pageNumber
                              ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900 dark:shadow-none'
                              : 'border border-slate-200/70 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-gray-800/70 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[0.75rem] border border-slate-200/70 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-800/70 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </AnimatedContent>
        </main>
      </div>

      {showModal && <StudentModal student={selectedStudent} onClose={handleModalClose} />}

      {showResetModal && selectedStudent && (
        <AdminResetPasswordModal
          user={{
            id: selectedStudent.id,
            name: `${selectedStudent.firstNameLatin} ${selectedStudent.lastNameLatin}`,
            email: selectedStudent.email || undefined,
          }}
          onClose={() => {
            setShowResetModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showReassignModal && studentToReassign && (
        <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/60">
          <div className="animate-slideUp w-full max-w-xl overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)] dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-gray-400">Change class</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Move student</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">Update this student’s class assignment.</p>
              </div>
              <button
                type="button"
                onClick={closeReassignModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[0.75rem] border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500 dark:hover:bg-gray-900 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">Student</p>
                  <div className="mt-4 flex items-center gap-4">
                    <StudentAvatar student={studentToReassign} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {studentToReassign.firstNameLatin} {studentToReassign.lastNameLatin}
                      </p>
                      {getKhmerName(studentToReassign) ? (
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-gray-400">{getKhmerName(studentToReassign)}</p>
                      ) : null}
                      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-gray-400">{studentToReassign.studentId}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">Current class</p>
                  <div className="mt-4 flex items-start gap-3">
                    <div className="rounded-[0.75rem] bg-slate-100 p-3 dark:bg-gray-900">
                      <GraduationCap className="h-5 w-5 text-slate-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {studentToReassign.class?.name || 'Unassigned'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                        {studentToReassign.class ? `Grade ${studentToReassign.class.grade}` : 'Ready for placement'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">New class</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">Select the destination class.</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-gray-900 dark:text-gray-300">
                    {reassignableClasses.length} available
                  </span>
                </div>

                <select
                  value={targetClassId}
                  onChange={(event) => setTargetClassId(event.target.value)}
                  className="mt-4 h-12 w-full rounded-[0.75rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                >
                  <option value="">Select a class...</option>
                  {reassignableClasses.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} • Grade {classItem.grade} • {classItem.studentCount || 0} students
                    </option>
                  ))}
                </select>

                {selectedTargetClass && (
                  <div className="mt-4 rounded-[0.8rem] border border-blue-200 bg-blue-50/70 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{selectedTargetClass.name}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-gray-300">
                      Grade {selectedTargetClass.grade} • {selectedTargetClass.studentCount || 0} students enrolled
                    </p>
                  </div>
                )}
              </div>

              {reassignMessage && (
                <div
                  className={`rounded-[0.8rem] border px-4 py-3 text-sm ${
                    reassignMessage.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                  }`}
                >
                  {reassignMessage.text}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/90 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/80 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeReassignModal}
                className="inline-flex h-11 items-center justify-center rounded-[0.75rem] border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignStudent}
                disabled={!targetClassId || isReassigning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[0.75rem] bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {isReassigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Change'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkReassignModal && (
        <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/60">
          <div className="animate-slideUp w-full max-w-2xl overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)] dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-gray-400">Bulk change</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Move selected students</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">Update class assignment for the selected students.</p>
              </div>
              <button
                type="button"
                onClick={closeBulkReassignModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[0.75rem] border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500 dark:hover:bg-gray-900 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">Selected</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{selectedStudentsList.length}</p>
                </div>
                <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">Placed</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{selectedStudentsPlacedCount}</p>
                </div>
                <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">Unassigned</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{selectedStudentsUnassignedCount}</p>
                </div>
              </div>

              <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">Selected students</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">Quick preview of who will be moved.</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-gray-900 dark:text-gray-300">
                    {selectedStudentsList.length} total
                  </span>
                </div>

                <div className="mt-4 flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-[0.75rem] border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                  {selectedStudentsList.slice(0, 8).map((student) => (
                    <span
                      key={student.id}
                      className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-gray-950 dark:text-gray-200 dark:ring-gray-800"
                    >
                      {student.firstNameLatin} {student.lastNameLatin}
                    </span>
                  ))}
                  {selectedStudents.size > 8 && (
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                      +{selectedStudents.size - 8} more
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">Target class</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">Select the class that will receive all selected students.</p>

                <select
                  value={targetClassId}
                  onChange={(event) => setTargetClassId(event.target.value)}
                  className="mt-4 h-12 w-full rounded-[0.75rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                >
                  <option value="">Select a class...</option>
                  {(() => {
                    const currentClassIds = new Set(
                      selectedStudentsList.filter((student) => student.class?.id).map((student) => student.class!.id)
                    );

                    return availableClasses
                      .filter((classItem) => !currentClassIds.has(classItem.id))
                      .map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name} • Grade {classItem.grade} • {classItem.studentCount || 0} students
                        </option>
                      ));
                  })()}
                </select>

                {selectedTargetClass && (
                  <div className="mt-4 rounded-[0.8rem] border border-blue-200 bg-blue-50/70 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{selectedTargetClass.name}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-gray-300">
                      Grade {selectedTargetClass.grade} • {selectedTargetClass.studentCount || 0} students enrolled
                    </p>
                  </div>
                )}
              </div>

              {reassignMessage && (
                <div
                  className={`rounded-[0.8rem] border px-4 py-3 text-sm ${
                    reassignMessage.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                  }`}
                >
                  {reassignMessage.text}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/90 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/80 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeBulkReassignModal}
                className="inline-flex h-11 items-center justify-center rounded-[0.75rem] border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkReassign}
                disabled={!targetClassId || isReassigning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[0.75rem] bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {isReassigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save Change for ${selectedStudents.size} Student${selectedStudents.size > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
