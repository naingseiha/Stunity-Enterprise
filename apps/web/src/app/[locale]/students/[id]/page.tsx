'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  GraduationCap,
  History,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import StudentDetailSkeleton from '@/components/students/StudentDetailSkeleton';
import { TokenManager } from '@/lib/api/auth';

interface Student {
  id: string;
  studentId: string;
  firstNameLatin: string;
  lastNameLatin: string;
  khmerName: string;
  gender: string;
  dateOfBirth: string;
  email?: string | null;
  phoneNumber?: string | null;
  currentAddress?: string | null;
  photoUrl?: string | null;
  isProfileLocked?: boolean;
}

interface Progression {
  id: string;
  fromAcademicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  toAcademicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  fromClass: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
  };
  toClass: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
  };
  promotionType: string;
  promotionDate: string;
  notes?: string;
}

const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

function formatDisplayDate(value?: string | null) {
  if (!value) return 'Unknown';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatAgeLabel(value?: string | null) {
  if (!value) return 'Unknown';

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return 'Unknown';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? `${age} yrs` : 'Unknown';
}

function formatGenderLabel(value?: string | null) {
  switch ((value || '').toUpperCase()) {
    case 'MALE':
      return 'Male';
    case 'FEMALE':
      return 'Female';
    case 'OTHER':
      return 'Other';
    default:
      return 'Unspecified';
  }
}

function normalizeStudent(rawStudent: any): Student | null {
  if (!rawStudent || typeof rawStudent !== 'object') return null;

  const firstNameLatin =
    rawStudent.firstNameLatin ||
    rawStudent.firstName ||
    rawStudent.englishName?.split(' ')?.[0] ||
    '';
  const lastNameLatin =
    rawStudent.lastNameLatin ||
    rawStudent.lastName ||
    rawStudent.englishName?.split(' ')?.slice(1).join(' ') ||
    '';
  const khmerName =
    rawStudent.khmerName ||
    [rawStudent.firstNameKhmer, rawStudent.lastNameKhmer].filter(Boolean).join(' ') ||
    '';

  return {
    id: rawStudent.id,
    studentId: rawStudent.studentId || rawStudent.id,
    firstNameLatin,
    lastNameLatin,
    khmerName,
    gender: rawStudent.gender || 'UNKNOWN',
    dateOfBirth: rawStudent.dateOfBirth || '',
    email: rawStudent.email || null,
    phoneNumber: rawStudent.phoneNumber || null,
    currentAddress: rawStudent.currentAddress || null,
    photoUrl: rawStudent.photoUrl || null,
    isProfileLocked: rawStudent.isProfileLocked || false,
  };
}

function getStudentInitials(student: Pick<Student, 'firstNameLatin' | 'lastNameLatin'>) {
  const firstInitial = student.firstNameLatin?.charAt(0) ?? '';
  const lastInitial = student.lastNameLatin?.charAt(0) ?? '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'ST';
}

function getSafeTimestamp(value?: string | null) {
  const timestamp = Date.parse(value || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getPromotionMeta(type: string): {
  icon: LucideIcon;
  label: string;
  badgeClass: string;
  iconClass: string;
} {
  switch (type) {
    case 'AUTOMATIC':
      return {
        icon: TrendingUp,
        label: 'Automatic',
        badgeClass:
          'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
        iconClass:
          'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
      };
    case 'MANUAL':
      return {
        icon: User,
        label: 'Manual',
        badgeClass:
          'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
        iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
      };
    case 'REPEAT':
      return {
        icon: Clock3,
        label: 'Repeat',
        badgeClass:
          'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
        iconClass:
          'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
      };
    default:
      return {
        icon: CheckCircle2,
        label: 'Recorded',
        badgeClass:
          'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20',
        iconClass: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
      };
  }
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: 'blue' | 'emerald' | 'amber' | 'slate';
}) {
  const toneClasses = {
    blue: {
      shell:
        'border-blue-100/80 bg-gradient-to-br from-white via-blue-50/70 to-cyan-50/80 shadow-blue-100/40 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
    emerald: {
      shell:
        'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/80 shadow-emerald-100/40 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    amber: {
      shell:
        'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/80 shadow-amber-100/40 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    },
    slate: {
      shell:
        'border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 shadow-slate-200/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    },
  };

  const styles = toneClasses[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[1.2rem] border p-5 shadow-xl backdrop-blur-xl ${styles.shell}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/65 blur-2xl dark:bg-white/5" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-[0.95rem] p-3 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-gray-800/70 dark:bg-gray-900/60">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function TimelineLoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 p-5 dark:border-gray-800/70 dark:bg-gray-900/60"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200 dark:bg-gray-800" />
              <div className="space-y-2">
                <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200 dark:bg-gray-800" />
                <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-gray-800" />
              </div>
            </div>
            <div className="h-10 w-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-gray-800" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="h-24 animate-pulse rounded-[1rem] bg-white dark:bg-gray-950/70" />
            <div className="hidden items-center justify-center md:flex">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-gray-800" />
            </div>
            <div className="h-24 animate-pulse rounded-[1rem] bg-white dark:bg-gray-950/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale, id } = params;

  const [student, setStudent] = useState<Student | null>(null);
  const [progressions, setProgressions] = useState<Progression[]>([]);
  const [studentLoading, setStudentLoading] = useState(true);
  const [progressionsLoading, setProgressionsLoading] = useState(true);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [error, setError] = useState('');
  const [progressionError, setProgressionError] = useState('');

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const controller = new AbortController();
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    setStudent(null);
    setProgressions([]);
    setError('');
    setProgressionError('');
    setStudentLoading(true);
    setProgressionsLoading(true);

    const fetchStudentDetails = async () => {
      try {
        const studentRes = await fetch(`${STUDENT_SERVICE_URL}/students/${id}`, {
          headers,
          signal: controller.signal,
        });
        const studentData = await studentRes.json().catch(() => ({}));

        if (!studentRes.ok || !studentData.success) {
          throw new Error(studentData.message || 'Failed to load student');
        }

        const normalizedStudent = normalizeStudent(studentData.data?.student ?? studentData.data);
        if (!normalizedStudent) {
          throw new Error('Student data is unavailable');
        }

        if (!controller.signal.aborted) {
          setStudent(normalizedStudent);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Error loading student data');
        }
      } finally {
        if (!controller.signal.aborted) {
          setStudentLoading(false);
        }
      }
    };

    const fetchProgressionHistory = async () => {
      try {
        const progressionRes = await fetch(`${STUDENT_SERVICE_URL}/students/${id}/progression`, {
          headers,
          signal: controller.signal,
        });
        const progressionData = await progressionRes.json().catch(() => ({}));

        if (!progressionRes.ok || !progressionData.success) {
          throw new Error(progressionData.message || 'Unable to load academic progression');
        }

        const progressionItems = Array.isArray(progressionData.data?.progressions)
          ? progressionData.data.progressions
          : Array.isArray(progressionData.data)
            ? progressionData.data
            : [];

        if (!controller.signal.aborted) {
          setProgressions(progressionItems);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setProgressions([]);
          setProgressionError(err.message || 'Unable to load academic progression right now.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setProgressionsLoading(false);
        }
      }
    };

    void fetchStudentDetails();
    void fetchProgressionHistory();

    return () => controller.abort();
  }, [id, locale, router]);

  const orderedProgressions = useMemo(
    () => [...progressions].sort((a, b) => getSafeTimestamp(b.promotionDate) - getSafeTimestamp(a.promotionDate)),
    [progressions]
  );

  const latestProgression = orderedProgressions[0] ?? null;
  const academicYearsCovered = useMemo(() => {
    const yearIds = new Set<string>();

    orderedProgressions.forEach((progression) => {
      if (progression.fromAcademicYear?.id) yearIds.add(progression.fromAcademicYear.id);
      if (progression.toAcademicYear?.id) yearIds.add(progression.toAcademicYear.id);
    });

    return yearIds.size;
  }, [orderedProgressions]);

  const manualMoveCount = orderedProgressions.filter((progression) => progression.promotionType === 'MANUAL').length;
  const repeatCount = orderedProgressions.filter((progression) => progression.promotionType === 'REPEAT').length;
  const currentClassName = latestProgression?.toClass?.name || 'No class placement yet';
  const currentGradeLabel = latestProgression?.toClass?.grade
    ? `Grade ${latestProgression.toClass.grade}`
    : 'Awaiting grade record';
  const currentAcademicYear = latestProgression?.toAcademicYear?.name || 'Awaiting first progression';
  const latestMoveLabel = latestProgression ? formatDisplayDate(latestProgression.promotionDate) : 'No movement yet';
  const profileCoverage = [student?.email, student?.phoneNumber, student?.currentAddress].filter(Boolean).length;
  const placementHealthLabel = latestProgression
    ? repeatCount > 0
      ? `${repeatCount} repeat flag${repeatCount > 1 ? 's' : ''}`
      : manualMoveCount > 0
        ? `${manualMoveCount} manual update${manualMoveCount > 1 ? 's' : ''}`
        : 'Progression on track'
    : 'Awaiting first placement history';

  const handleToggleLock = async () => {
    if (!student) return;
    try {
      setIsTogglingLock(true);
      const { toggleProfileLock } = await import('@/lib/api/students');
      const newLockState = !student.isProfileLocked;
      await toggleProfileLock(student.id, newLockState);
      setStudent({ ...student, isProfileLocked: newLockState });
    } catch (err) {
      console.error('Failed to toggle profile lock:', err);
      alert('Unable to change profile lock status. Please try again.');
    } finally {
      setIsTogglingLock(false);
    }
  };

  if (studentLoading && !student) {
    return <StudentDetailSkeleton />;
  }

  if (error || !student) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gray-50 px-4 py-8 transition-colors duration-500 dark:bg-gray-950">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />

        <div className="relative z-10 mx-auto max-w-xl pt-16">
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/35 backdrop-blur-2xl dark:border-gray-800/70 dark:bg-gray-900/85 dark:shadow-black/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
              <User className="h-7 w-7" />
            </div>
            <div className="mt-5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                Student Record
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Unable to load this student
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                {error || 'Student not found'}
              </p>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => router.push(`/${locale}/students`)}
                className="inline-flex items-center gap-2 rounded-[0.85rem] border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to students
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 px-4 pb-12 pt-8 transition-colors duration-500 dark:bg-gray-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
      <div className="pointer-events-none absolute -left-16 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />

      <main className="relative z-10 mx-auto max-w-7xl">
        <AnimatedContent animation="fade" delay={0}>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/students`)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800/70 dark:bg-gray-900/80 dark:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to students
          </button>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="relative overflow-hidden rounded-[1.55rem] border border-slate-200/60 bg-white/85 p-5 shadow-xl shadow-slate-200/45 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/85 dark:shadow-black/20 xl:col-span-8 sm:p-6">
              <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  Student Record
                </div>

                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="relative flex-shrink-0">
                      {student.photoUrl ? (
                        <img
                          src={`${STUDENT_SERVICE_URL}${student.photoUrl}`}
                          alt={`${student.firstNameLatin} ${student.lastNameLatin}`}
                          className="h-20 w-20 rounded-[1.15rem] object-cover ring-4 ring-white shadow-xl shadow-slate-200/30 dark:ring-gray-900 dark:shadow-black/20 sm:h-24 sm:w-24"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.15rem] bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 text-xl font-black text-white shadow-xl shadow-blue-500/20 sm:h-24 sm:w-24 sm:text-2xl">
                          {getStudentInitials(student)}
                        </div>
                      )}
                    </div>

                    <div className="pt-0.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                        Profile Overview
                      </p>
                      <h1 className="mt-2 text-[1.75rem] font-black tracking-tight text-slate-900 dark:text-white sm:text-[2rem]">
                        {student.firstNameLatin} {student.lastNameLatin}
                      </h1>
                      {student.khmerName ? (
                        <p
                          className="mt-1.5 text-sm font-medium text-slate-500 dark:text-gray-400 sm:text-base"
                          style={{ fontFamily: 'Battambang, sans-serif' }}
                        >
                          {student.khmerName}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                          ID {student.studentId}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                          {formatGenderLabel(student.gender)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                          {formatAgeLabel(student.dateOfBirth)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                          {currentAcademicYear}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:min-w-[210px]">
                    <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-gray-800/70 dark:bg-gray-950/50">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                        Current Class
                      </p>
                      <p className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">{currentClassName}</p>
                      <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-gray-400">
                        {currentGradeLabel}
                      </p>
                    </div>
                    <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-gray-800/70 dark:bg-gray-950/50">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                        Latest Move
                      </p>
                      <p className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">{latestMoveLabel}</p>
                      <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-gray-400">
                        Profile ready {profileCoverage}/3
                      </p>
                    </div>

                    {/* Profile Protection / Lock status */}
                    <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-gray-800/70 dark:bg-gray-950/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                            Identity Lock
                          </p>
                          <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                            {student.isProfileLocked ? 'Modifications Locked' : 'Unlocked'}
                          </p>
                        </div>
                        <button
                          onClick={handleToggleLock}
                          disabled={isTogglingLock}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                            student.isProfileLocked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'
                          } ${isTogglingLock ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              student.isProfileLocked ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="mt-2 text-[12px] font-medium text-slate-500 dark:text-gray-400">
                        {student.isProfileLocked
                          ? 'Name edits require admin approval.'
                          : 'Student can edit name freely.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[1.55rem] border border-white/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50/70 p-5 text-slate-900 shadow-[0_30px_80px_-35px_rgba(148,163,184,0.45)] ring-1 ring-slate-200/70 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-6">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-200/45 blur-3xl dark:bg-blue-500/20" />
              <div className="pointer-events-none absolute -bottom-14 left-0 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/20" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Academic Snapshot
                    </p>
                    <h2 className="mt-2 text-[1.9rem] font-black tracking-tight">{orderedProgressions.length}</h2>
                    <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      progression records
                    </p>
                  </div>
                  <div className="rounded-[0.95rem] border border-white/80 bg-white/85 p-3 shadow-sm ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-white/10 dark:ring-white/10">
                    <GraduationCap className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="rounded-[0.95rem] border border-white/80 bg-white/80 p-3.5 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Current Placement
                    </p>
                    <p className="mt-1.5 text-base font-bold">{currentClassName}</p>
                    <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      {currentAcademicYear}
                    </p>
                  </div>
                  <div className="rounded-[0.95rem] border border-white/80 bg-white/80 p-3.5 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Status
                    </p>
                    <p className="mt-1.5 text-base font-bold">{placementHealthLabel}</p>
                    <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      Last updated {latestMoveLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/${locale}/students/${student.id}/transcript`)}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.8rem] border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <Award className="h-4 w-4" />
                    Transcript
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/${locale}/students/${student.id}/history`)}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.8rem] bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 px-4 py-2.5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <History className="h-4 w-4" />
                    Full History
                  </button>
                </div>
              </div>
            </aside>
          </section>
        </AnimatedContent>

        <AnimatedContent animation="slide-up" delay={40}>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Progressions"
              value={String(orderedProgressions.length)}
              helper="Recorded promotions"
              icon={TrendingUp}
              tone="blue"
            />
            <MetricCard
              label="Academic Years"
              value={String(academicYearsCovered)}
              helper="Years with history"
              icon={BookOpen}
              tone="emerald"
            />
            <MetricCard
              label="Manual Moves"
              value={String(manualMoveCount)}
              helper="Admin interventions"
              icon={User}
              tone="amber"
            />
            <MetricCard
              label="Profile Ready"
              value={`${profileCoverage}/3`}
              helper="Contact fields completed"
              icon={CheckCircle2}
              tone="slate"
            />
          </div>
        </AnimatedContent>

        <AnimatedContent animation="slide-up" delay={80}>
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/35 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-black/20 xl:col-span-7">
              <div className="border-b border-slate-200/70 px-6 py-5 dark:border-gray-800/70">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                  Personal Details
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Profile summary
                </h2>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <DetailField
                  icon={User}
                  label="Latin Name"
                  value={`${student.firstNameLatin} ${student.lastNameLatin}`.trim() || 'Not available'}
                />
                <DetailField
                  icon={Sparkles}
                  label="Khmer Name"
                  value={student.khmerName || 'Not available'}
                />
                <DetailField icon={Award} label="Student ID" value={student.studentId || 'Not available'} />
                <DetailField icon={User} label="Gender" value={formatGenderLabel(student.gender)} />
                <DetailField
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatDisplayDate(student.dateOfBirth)}
                />
                <DetailField icon={Clock3} label="Age" value={formatAgeLabel(student.dateOfBirth)} />
              </div>
            </div>

            <aside className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/35 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-black/20 xl:col-span-5">
              <div className="border-b border-slate-200/70 px-6 py-5 dark:border-gray-800/70">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                  Directory Context
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Contact and placement
                </h2>
              </div>
              <div className="space-y-4 p-6">
                <div className="rounded-[1rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50/70 to-cyan-50/80 p-5 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/50">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    Current Placement
                  </p>
                  <p className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {currentClassName}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    {currentAcademicYear}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[1rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-gray-800/70 dark:bg-gray-950/50">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {student.email || 'Not available'}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-gray-800/70 dark:bg-gray-950/50">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {student.phoneNumber || 'Not available'}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-gray-800/70 dark:bg-gray-950/50">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      Address
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                      {student.currentAddress || 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </AnimatedContent>

        <AnimatedContent animation="slide-up" delay={120}>
          <section className="mt-6 overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/35 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-black/20">
            <div className="border-b border-slate-200/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                    Academic Timeline
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Progression history
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Review academic movement by year, class, and promotion type.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                  <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                    {orderedProgressions.length} records
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                    {academicYearsCovered} academic years
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {progressionError ? (
                <div className="mb-5 rounded-[1rem] border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  {progressionError}
                </div>
              ) : null}

              {progressionsLoading ? (
                <TimelineLoadingState />
              ) : orderedProgressions.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/70 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800/70">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">No progression history yet</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    This student has not been promoted into another academic year yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderedProgressions.map((progression) => {
                    const promotionMeta = getPromotionMeta(progression.promotionType);
                    const PromotionIcon = promotionMeta.icon;

                    return (
                      <div
                        key={progression.id}
                        className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 p-5 shadow-sm transition-colors hover:border-slate-300 dark:border-gray-800/70 dark:bg-gray-950/50 dark:hover:border-gray-700"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${promotionMeta.iconClass}`}
                            >
                              <PromotionIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                  {progression.toAcademicYear.name}
                                </h3>
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${promotionMeta.badgeClass}`}
                                >
                                  {promotionMeta.label}
                                </span>
                              </div>
                              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                                Updated on {formatDisplayDate(progression.promotionDate)}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-[1rem] border border-slate-200/70 bg-white/80 px-4 py-3 text-right dark:border-gray-800/70 dark:bg-gray-900/80">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Academic Shift
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                              {progression.fromAcademicYear.name} to {progression.toAcademicYear.name}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                          <div className="rounded-[1rem] border border-slate-200/70 bg-white/90 p-4 dark:border-gray-800/70 dark:bg-gray-900/75">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              From Class
                            </p>
                            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                              {progression.fromClass.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                              Grade {progression.fromClass.grade}
                              {progression.fromClass.section ? ` - Section ${progression.fromClass.section}` : ''}
                            </p>
                          </div>

                          <div className="hidden items-center justify-center md:flex">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-300">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>

                          <div className="rounded-[1rem] border border-slate-200/70 bg-white/90 p-4 dark:border-gray-800/70 dark:bg-gray-900/75">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              To Class
                            </p>
                            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                              {progression.toClass.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                              Grade {progression.toClass.grade}
                              {progression.toClass.section ? ` - Section ${progression.toClass.section}` : ''}
                            </p>
                          </div>
                        </div>

                        {progression.notes ? (
                          <div className="mt-4 rounded-[1rem] border border-slate-200/70 bg-white/80 p-4 dark:border-gray-800/70 dark:bg-gray-900/70">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              Notes
                            </p>
                            <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-gray-300">
                              {progression.notes}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </AnimatedContent>
      </main>
    </div>
  );
}
