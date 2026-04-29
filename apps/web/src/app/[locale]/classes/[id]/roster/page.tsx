'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Download,
  GraduationCap,
  Home,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import { getClass } from '@/lib/api/classes';
import type { Class } from '@/lib/api/classes';
import {
  assignMultipleStudentsToClass,
  getClassStudents,
  removeStudentFromClass,
} from '@/lib/api/class-students';
import type { StudentInClass } from '@/lib/api/class-students';
import { getStudents } from '@/lib/api/students';
import type { Student } from '@/lib/api/students';
import { STUDENT_SERVICE_URL } from '@/lib/api/config';

import { useTranslations } from 'next-intl';
function buildPhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return null;
  if (/^https?:\/\//.test(photoUrl)) return photoUrl;
  return `${STUDENT_SERVICE_URL}${photoUrl}`;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'ST';
}

function matchesRosterQuery(student: StudentInClass, query: string) {
  if (!query.trim()) return true;
  const normalized = query.toLowerCase();
  return (
    (student.firstName || '').toLowerCase().includes(normalized) ||
    (student.lastName || '').toLowerCase().includes(normalized) ||
    (student.nameKh || '').toLowerCase().includes(normalized) ||
    (student.studentId || '').toLowerCase().includes(normalized)
  );
}

function matchesAvailableQuery(student: Student, query: string) {
  if (!query.trim()) return true;
  const normalized = query.toLowerCase();
  const searchableValues = [
    student.firstName,
    student.lastName,
    student.englishFirstName,
    student.englishLastName,
    student.firstNameNative,
    student.lastNameNative,
    student.firstNameInternational,
    student.lastNameInternational,
    student.studentId,
  ];

  return searchableValues.some((value) => (value || '').toLowerCase().includes(normalized));
}

function formatGender(gender?: string | null) {
  if (gender === 'FEMALE') return 'Female';
  if (gender === 'MALE') return 'Male';
  return 'Unspecified';
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function RosterSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_35%),linear-gradient(180deg,_#f8fbfd_0%,_#f8fafc_50%,_#f8fafc_100%)] lg:ml-64">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8 rounded-[1.65rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900/90 p-7 shadow-sm">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-10 w-64 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-5 w-80 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 flex gap-2">
              <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="xl:col-span-4 rounded-[1.65rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900/90 p-7 shadow-sm">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-12 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-3 w-full animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900/90 p-5 shadow-sm">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-9 w-16 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[1.35rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900/90 p-5 shadow-sm">
          <div className="h-6 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-11 w-full animate-pulse rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-[1rem] border border-slate-200 dark:border-gray-800/70 p-3">
                <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StudentAvatar({
  firstName,
  lastName,
  photoUrl,
  gender,
}: {
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  gender?: string | null;
}) {
  const photo = buildPhotoUrl(photoUrl);

  if (photo) {
    return (
      <img
        src={photo}
        alt={`${firstName || ''} ${lastName || ''}`.trim() || 'Student'}
        className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200/70 shadow-sm dark:ring-gray-700/70"
      />
    );
  }

  const gradient = gender === 'FEMALE' ? 'from-fuchsia-500 to-rose-500' : 'from-sky-500 to-cyan-500';

  return (
    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-lg`}>
      {getInitials(firstName, lastName)}
    </div>
  );
}

export default function ClassRosterPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const classId = params?.id as string;
  const locale = params?.locale as string;

  const authData = TokenManager.getUserData();
  const user = authData?.user;
  const school = authData?.school;

  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableLoaded, setAvailableLoaded] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadCoreData = useCallback(
    async (showSpinner = true) => {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.replace(`/${locale}/auth/login`);
        return;
      }

      try {
        if (showSpinner) setLoading(true);
        else setRefreshing(true);

        const [classResult, studentsResult] = await Promise.all([
          getClass(classId),
          getClassStudents(classId),
        ]);

        setClassData(classResult.data.class);
        setStudents(studentsResult);
      } catch (error: any) {
        setActionMessage({
          tone: 'error',
          text: error.message || 'Failed to load class roster',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [classId, locale, router]
  );

  const loadAvailableStudents = useCallback(
    async (force = false) => {
      if (!classData?.academicYearId) return;
      if (availableLoaded && !force) return;

      try {
        setAvailableLoading(true);
        const result = await getStudents({
          limit: 1000,
          academicYearId: classData.academicYearId,
        });
        setAllStudents(result.data.students);
        setAvailableLoaded(true);
      } catch (error: any) {
        setActionMessage({
          tone: 'error',
          text: error.message || 'Failed to load available students',
        });
      } finally {
        setAvailableLoading(false);
      }
    },
    [availableLoaded, classData?.academicYearId]
  );

  useEffect(() => {
    void loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    if (!showAddModal) return;
    void loadAvailableStudents();
  }, [loadAvailableStudents, showAddModal]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  useEffect(() => {
    setSelectedStudentIds((previous) => new Set([...previous].filter((id) => allStudents.some((student) => student.id === id))));
  }, [allStudents]);

  const filteredRoster = useMemo(
    () => students.filter((student) => matchesRosterQuery(student, rosterSearch)),
    [rosterSearch, students]
  );

  const availableStudents = useMemo(
    () => allStudents.filter((student) => !students.some((enrolled) => enrolled.id === student.id)),
    [allStudents, students]
  );

  const filteredAvailableStudents = useMemo(
    () => availableStudents.filter((student) => matchesAvailableQuery(student, searchQuery)),
    [availableStudents, searchQuery]
  );

  const capacity = classData?.capacity || 0;
  const openSeats = capacity ? Math.max(capacity - students.length, 0) : null;
  const utilizationRate = capacity
    ? Math.min(100, Math.round((students.length / capacity) * 100))
    : Math.min(100, students.length * 10);
  const rosterStatus = capacity
    ? students.length >= capacity
      ? 'Roster at capacity'
      : `${openSeats} seats open`
    : 'Flexible seat planning';

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((previous) => {
      const next = new Set(previous);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredAvailableStudents.length && filteredAvailableStudents.length > 0) {
      setSelectedStudentIds(new Set());
      return;
    }
    setSelectedStudentIds(new Set(filteredAvailableStudents.map((student) => student.id)));
  };

  const resetModalState = () => {
    setShowAddModal(false);
    setSearchQuery('');
    setSelectedStudentIds(new Set());
  };

  const handleBulkAddStudents = async () => {
    if (!classData?.academicYearId || selectedStudentIds.size === 0) return;

    setSubmitting(true);
    try {
      const result = await assignMultipleStudentsToClass(classId, {
        studentIds: Array.from(selectedStudentIds),
        academicYearId: classData.academicYearId,
      });

      await loadCoreData(false);
      await loadAvailableStudents(true);
      setActionMessage({
        tone: 'success',
        text: `Added ${result.assigned} student${result.assigned === 1 ? '' : 's'} to ${classData.name}.`,
      });
      resetModalState();
    } catch (error: any) {
      setActionMessage({
        tone: 'error',
        text: error.message || 'Failed to add students',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    const confirmed = window.confirm('Remove this student from the roster?');
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await removeStudentFromClass(classId, studentId);
      await loadCoreData(false);
      if (availableLoaded) {
        await loadAvailableStudents(true);
      }

      const removedStudent = students.find((student) => student.id === studentId);
      setActionMessage({
        tone: 'success',
        text: `${removedStudent?.firstName || 'Student'} was removed from ${classData?.name || 'the class'}.`,
      });
    } catch (error: any) {
      setActionMessage({
        tone: 'error',
        text: error.message || 'Failed to remove student',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportRoster = () => {
    if (!classData) return;
    const rows = [
      ['Student ID', 'First Name', 'Last Name', 'Khmer Name', 'Gender', 'Status', 'Enrolled At'],
      ...students.map((student) => [
        student.studentId,
        student.firstName,
        student.lastName,
        student.nameKh || '',
        formatGender(student.gender),
        student.status || 'ACTIVE',
        student.enrolledAt || '',
      ]),
    ];

    downloadCsv(`${classData.name.replace(/\s+/g, '-').toLowerCase()}-roster.csv`, rows);
  };

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} />
        <RosterSkeleton />
      </>
    );
  }

  if (!classData) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_35%),linear-gradient(180deg,_#f8fbfd_0%,_#f8fafc_50%,_#f8fafc_100%)] lg:ml-64">
          <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="rounded-[1.5rem] border border-white/70 bg-white dark:bg-gray-900/90 p-8 text-center shadow-[0_28px_80px_-42px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Class not found</h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-gray-400">
                This roster is no longer available or the class link is no longer valid.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/classes`)}
                  className="inline-flex items-center justify-center rounded-[0.95rem] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-gray-900 dark:text-white dark:hover:bg-slate-100 dark:bg-gray-800"
                >
                  View classes
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go back
                </button>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_35%),linear-gradient(180deg,_#f8fbfd_0%,_#f8fafc_50%,_#f8fafc_100%)] text-slate-900 dark:text-white transition-colors duration-500 dark:bg-none dark:bg-gray-950 dark:text-white lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-12">
              <div className="relative overflow-hidden rounded-[1.65rem] border border-white/70 bg-white dark:bg-gray-900/80 p-6 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70 xl:col-span-8 sm:p-7">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-sky-100/50 to-transparent blur-3xl dark:from-sky-500/10" />
                <div className="relative z-10">
                  <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                    <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:text-gray-200 dark:hover:text-gray-300">
                      <Home className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <Link href={`/${locale}/classes`} className="transition-colors hover:text-slate-700 dark:text-gray-200 dark:hover:text-gray-300">
                      Classes
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-900 dark:text-white">Roster</span>
                  </nav>
                  <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                        <Sparkles className="h-3.5 w-3.5" />
                        Class Roster
                      </div>
                      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-[2.2rem]">{classData.name}</h1>
                      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-gray-400 sm:text-[15px]">
                        Review the live roster, export the class list, and add students only when you need the placement pool.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => void loadCoreData(false)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={handleExportRoster}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-none dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/${locale}/classes/${classId}/manage`)}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5"
                      >
                        <Users className="h-4 w-4" />
                        Open Manage
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-none dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200 dark:bg-none dark:bg-gray-900/5 dark:text-slate-300 dark:ring-white/10">
                      Grade {classData.grade}
                      {classData.section ? ` · Section ${classData.section}` : ''}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                      Active roster
                    </span>
                    {classData.room ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                        Room {classData.room}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.65rem] border border-sky-300/80 bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-900 p-6 text-white shadow-[0_34px_90px_-38px_rgba(14,165,233,0.34)] ring-1 ring-sky-300/25 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-cyan-300/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-100/70">Roster Status</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{utilizationRate}%</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/70">filled</span>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/10 p-3 shadow-sm backdrop-blur-md">
                      <GraduationCap className="h-5 w-5 text-sky-100" />
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 transition-all duration-700"
                      style={{ width: `${Math.max(utilizationRate, students.length > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/10 p-3 shadow-sm backdrop-blur-md">
                      <p className="text-xl font-black tracking-tight">{students.length}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/70">Enrolled</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/10 p-3 shadow-sm backdrop-blur-md">
                      <p className="text-xl font-black tracking-tight">{openSeats ?? '∞'}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/70">Open</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/10 bg-white dark:bg-gray-900/10 p-3 shadow-sm backdrop-blur-md">
                      <p className="text-xl font-black tracking-tight">{selectedStudentIds.size}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/70">Queued</p>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center rounded-full border border-white/10 bg-white dark:bg-gray-900/10 px-3 py-1.5 text-xs font-semibold text-sky-50 shadow-sm backdrop-blur-md">
                    {rosterStatus}
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/70 to-cyan-50/75 p-5 shadow-xl shadow-sky-100/30 ring-1 ring-sky-100/70 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Enrolled</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{students.length}</p>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">Students currently on this class list.</p>
              </div>
              <div className="rounded-[1.2rem] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/75 p-5 shadow-xl shadow-emerald-100/30 ring-1 ring-emerald-100/70 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Capacity</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{classData.capacity || 'Open'}</p>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">Seat target configured for this class.</p>
              </div>
              <div className="rounded-[1.2rem] border border-amber-100/80 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/75 p-5 shadow-xl shadow-amber-100/30 ring-1 ring-amber-100/70 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:shadow-black/10 dark:ring-gray-800/70">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Open Seats</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{openSeats ?? 'Flexible'}</p>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">Immediate room available before reassignment.</p>
              </div>
            </section>
          </AnimatedContent>

          {actionMessage ? (
            <AnimatedContent animation="slide-up" delay={60}>
              <div
                className={`mt-5 flex items-start justify-between gap-4 rounded-[1rem] border px-4 py-3 text-sm font-medium ${
                  actionMessage.tone === 'success'
                    ? 'border-emerald-100 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-rose-100 bg-rose-50/80 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {actionMessage.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                  <span>{actionMessage.text}</span>
                </div>
                <button type="button" onClick={() => setActionMessage(null)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-none dark:bg-gray-900/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent animation="slide-up" delay={80}>
            <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white dark:bg-none dark:bg-gray-900/80 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/80 dark:ring-gray-800/70">
              <div className="border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Directory</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Roster Workspace</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Scan the current class list quickly, remove students when needed, and open the add flow only when you want more placements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Students
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={rosterSearch}
                      onChange={(event) => setRosterSearch(event.target.value)}
                      placeholder="Search by student name, Khmer name, or ID"
                      className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-none dark:bg-gray-900 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-800/70 dark:bg-none dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-none dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200 dark:bg-none dark:bg-gray-900/5 dark:text-slate-300 dark:ring-white/10">
                    {filteredRoster.length} visible of {students.length}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredRoster.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-gray-700 dark:text-gray-200" />
                    <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No roster results</p>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {rosterSearch ? 'Try a different search term.' : 'This class does not have any enrolled students yet.'}
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800/70 dark:divide-gray-800/70">
                    <thead className="bg-slate-50 dark:bg-gray-800/50 dark:bg-gray-950/60">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">Student</th>
                        <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">ID</th>
                        <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">Gender</th>
                        <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">Status</th>
                        <th className="px-6 py-3 text-right text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 dark:divide-gray-800/70">
                      {filteredRoster.map((student) => (
                        <tr key={student.id} className="bg-white dark:bg-gray-900/70 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:bg-transparent dark:hover:bg-gray-950/40">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <StudentAvatar
                                firstName={student.firstName}
                                lastName={student.lastName}
                                photoUrl={student.photoUrl}
                                gender={student.gender}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                  {student.firstName} {student.lastName}
                                </p>
                                <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-gray-400">
                                  {student.nameKh || 'No Khmer name'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{student.studentId}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                student.gender === 'FEMALE'
                                  ? 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20'
                                  : 'bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20'
                              }`}
                            >
                              {formatGender(student.gender)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                              {student.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => void handleRemoveStudent(student.id)}
                              disabled={submitting}
                              className="inline-flex items-center gap-2 rounded-[0.85rem] border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-all hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                            >
                              <UserMinus className="h-4 w-4" />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl overflow-hidden rounded-[1.35rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_100%)] shadow-[0_40px_110px_-40px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 animate-in slide-in-from-bottom-4 duration-200 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/95 dark:ring-gray-800/70">
            <div className="border-b border-slate-200 dark:border-gray-800/70 px-6 py-5 dark:border-gray-800/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                    <Sparkles className="h-3.5 w-3.5" />
                    Placement Intake
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Add Students</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Select one or more students to add into {classData.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetModalState}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 text-slate-500 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 p-4 shadow-sm ring-1 ring-slate-100/70 dark:border-gray-800/70 dark:bg-gray-950/70 dark:ring-gray-800/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Class</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{classData.name}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 p-4 shadow-sm ring-1 ring-slate-100/70 dark:border-gray-800/70 dark:bg-gray-950/70 dark:ring-gray-800/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Selected</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{selectedStudentIds.size} students</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 p-4 shadow-sm ring-1 ring-slate-100/70 dark:border-gray-800/70 dark:bg-gray-950/70 dark:ring-gray-800/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Available</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{availableLoading ? 'Loading...' : `${availableStudents.length} ready`}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search available students by name or ID"
                    className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadAvailableStudents(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 text-slate-500 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
                  >
                    <RefreshCw className={`h-4 w-4 ${availableLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    disabled={availableLoading || filteredAvailableStudents.length === 0}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                  >
                    {selectedStudentIds.size === filteredAvailableStudents.length && filteredAvailableStudents.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    {selectedStudentIds.size === filteredAvailableStudents.length && filteredAvailableStudents.length > 0 ? 'Clear' : 'Select all'}
                  </button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 ring-1 ring-slate-100/70 dark:border-gray-800/70 dark:bg-gray-950/70 dark:ring-gray-800/70">
                {availableLoading ? (
                  <div className="px-6 py-16 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-500" />
                    <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">Loading available students...</p>
                  </div>
                ) : filteredAvailableStudents.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-gray-700 dark:text-gray-200" />
                    <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No available students</p>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {searchQuery ? 'Try a different search term.' : 'Everyone in this academic year is already placed.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-gray-800/70 dark:divide-gray-800/70">
                    {filteredAvailableStudents.map((student) => {
                      const isSelected = selectedStudentIds.has(student.id);
                      const displayFirstName = student.firstNameInternational || student.englishFirstName || student.firstName;
                      const displayLastName = student.lastNameInternational || student.englishLastName || student.lastName;
                      const nativeName = [student.firstNameNative, student.lastNameNative].filter(Boolean).join(' ');
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudentSelection(student.id)}
                          disabled={submitting}
                          className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected ? 'bg-sky-50/80 dark:bg-sky-500/5' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-950/40'
                          }`}
                        >
                          <div className="flex-shrink-0 text-slate-400 dark:text-gray-500">
                            {isSelected ? <CheckSquare className="h-5 w-5 text-sky-600 dark:text-sky-300" /> : <Square className="h-5 w-5" />}
                          </div>
                          <StudentAvatar
                            firstName={displayFirstName}
                            lastName={displayLastName}
                            photoUrl={student.photoUrl}
                            gender={student.gender}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {displayFirstName} {displayLastName}
                              </p>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  student.gender === 'FEMALE'
                                    ? 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20'
                                    : 'bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20'
                                }`}
                              >
                                {formatGender(student.gender)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-gray-400">
                              {nativeName || 'No native name'} · {student.studentId}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/70 px-6 py-4 dark:border-gray-800/70 dark:bg-gray-950/40 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                {availableStudents.length} available students in this academic year
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetModalState}
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-all hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkAddStudents()}
                  disabled={submitting || selectedStudentIds.size === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Add Students
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
