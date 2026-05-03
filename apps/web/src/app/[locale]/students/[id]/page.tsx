'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
  Printer,
  ShieldCheck,
  Activity,
  Sparkles,
  TrendingUp,
  User,
  Users,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import StudentDetailSkeleton from '@/components/students/StudentDetailSkeleton';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import { useEducationSystem } from '@/hooks/useEducationSystem';
import { extractStudentCustomFields } from '@/lib/api/students';

import { useTranslations } from 'next-intl';
interface Student {
  id: string;
  studentId: string;
  firstName?: string;
  lastName?: string;
  firstNameLatin: string;
  lastNameLatin: string;
  khmerName: string;
  englishFirstName?: string | null;
  englishLastName?: string | null;
  gender: string;
  dateOfBirth: string;
  placeOfBirth?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  currentAddress?: string | null;
  photoUrl?: string | null;
  isProfileLocked?: boolean;
  [key: string]: any;
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

  const fn = rawStudent.firstName || '';
  const ln = rawStudent.lastName || '';
  const efn = rawStudent.englishFirstName || '';
  const eln = rawStudent.englishLastName || '';
  const nativeName = rawStudent.khmerName || `${ln} ${fn}`.trim();

  // Extract and flatten custom fields from customFields.regional
  const customFields = extractStudentCustomFields(rawStudent);

  return {
    ...rawStudent,
    ...customFields, // Flattened regional fields
    id: rawStudent.id,
    studentId: rawStudent.studentId || rawStudent.id,
    firstName: fn,
    lastName: ln,
    firstNameLatin: rawStudent.firstNameInternational || efn || fn,
    lastNameLatin: rawStudent.lastNameInternational || eln || ln,
    khmerName: nativeName,
    englishFirstName: efn || null,
    englishLastName: eln || null,
    gender: rawStudent.gender || 'UNKNOWN',
    dateOfBirth: rawStudent.dateOfBirth || '',
    placeOfBirth: rawStudent.placeOfBirth || customFields.placeOfBirth || null,
    email: rawStudent.email || customFields.email || null,
    phoneNumber: rawStudent.phoneNumber || customFields.phoneNumber || null,
    currentAddress: rawStudent.currentAddress || customFields.currentAddress || null,
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
          'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
      };
    case 'MANUAL':
      return {
        icon: User,
        label: 'Manual',
        badgeClass:
          'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
        iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
      };
    case 'REPEAT':
      return {
        icon: Clock3,
        label: 'Repeat',
        badgeClass:
          'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
        iconClass:
          'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
      };
    default:
      return {
        icon: CheckCircle2,
        label: 'Recorded',
        badgeClass:
          'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 ring-1 ring-slate-200 dark:bg-slate-50 dark:bg-gray-800/95 dark:text-slate-300 dark:ring-slate-500/20',
        iconClass: 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:bg-slate-50 dark:bg-gray-800/95 dark:text-slate-300',
      };
  }
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone?: 'emerald' | 'blue' | 'amber' | 'slate';
}) {
  const toneClasses = {
    emerald: {
      shell: 'border-emerald-500/10 bg-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-500/5',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      shell: 'border-blue-500/10 bg-blue-500/5 dark:border-blue-500/20 dark:bg-blue-500/5',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      text: 'text-blue-600 dark:text-blue-400',
    },
    amber: {
      shell: 'border-amber-500/10 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-500/5',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      text: 'text-amber-600 dark:text-amber-400',
    },
    slate: {
      shell: 'border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/50 dark:border-gray-800/60 dark:bg-gray-900/40',
      icon: 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:bg-gray-800 dark:text-gray-400',
      text: 'text-slate-600 dark:text-gray-300',
    },
  };

  const styles = toneClasses[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.4rem] border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/40 ${styles.shell}`}
    >
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-4 text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3.5 transition-transform duration-300 group-hover:scale-110 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  personal: User,
  family: Users,
  academic: BookOpen,
  exams: FileText,
  contact: Phone,
};

function DetailField({
  icon: Icon,
  label,
  value,
  isPlaceholder = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  isPlaceholder?: boolean;
}) {
  return (
    <div className={`group relative flex min-h-[5.5rem] flex-col rounded-2xl border transition-all duration-300 ${
      isPlaceholder 
        ? 'border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50' 
        : 'border-slate-200 dark:border-gray-800/40 bg-white dark:bg-gray-900/30 hover:border-blue-500/30 hover:bg-slate-50 dark:hover:bg-gray-800/30 hover:shadow-lg hover:shadow-blue-500/5'
    } p-5`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
          isPlaceholder ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 dark:bg-gray-800/50 dark:text-gray-500 dark:group-hover:bg-blue-500/10'
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
            {label}
          </p>
          <p className={`mt-1.5 break-words text-sm font-bold tracking-tight leading-relaxed ${
            isPlaceholder ? 'opacity-40 italic font-medium' : 'text-slate-900 dark:text-white'
          }`}>
            {value}
          </p>
        </div>
      </div>
      {!isPlaceholder && (
        <div className="absolute inset-0 rounded-2xl bg-blue-500/0 opacity-0 transition-all group-hover:bg-blue-500/[0.01] group-hover:opacity-100" />
      )}
    </div>
  );
}

function StatusRing({ percentage, tone = 'blue' }: { percentage: number; tone?: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colors = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-12 w-12 -rotate-90 transform">
        <circle
          className="text-slate-100 dark:text-gray-800 dark:text-gray-100"
          strokeWidth="3.5"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
        <circle
          className={`${colors[tone as keyof typeof colors] || colors.blue} transition-all duration-1000 ease-out`}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
      </svg>
      <span className="absolute text-[11px] font-black tracking-tighter text-slate-900 dark:text-white">
        {percentage}%
      </span>
    </div>
  );
}

function TimelineLoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-5 dark:border-gray-800/70 dark:bg-gray-900/60"
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
    const autoT = useTranslations();
  const params = use(props.params);
  const router = useRouter();
  const t = useTranslations('common');
  const tDynamic = useTranslations('dynamicFields');
  const { locale, id } = params;
  const { user, school } = TokenManager.getUserData();
  const { fieldConfig } = useEducationSystem();

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
  const profileFields = [
    student?.email,
    student?.phoneNumber,
    student?.currentAddress,
    student?.photoUrl,
    student?.dateOfBirth,
    student?.englishFirstName,
  ];
  const filledFieldsCount = profileFields.filter(Boolean).length;
  const profileHealthScore = Math.round((filledFieldsCount / profileFields.length) * 100);

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

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (studentLoading && !student) {
    return <StudentDetailSkeleton />;
  }

  if (error || !student) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800/50 px-4 py-8 transition-colors duration-500 dark:bg-gray-950">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
        <div className="pointer-events-none absolute right-0 top-12 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />

        <div className="relative z-10 mx-auto max-w-xl pt-16">
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/90 p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
              <User className="h-7 w-7" />
            </div>
            <div className="mt-5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_e57f0e7e" />
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_1a3e3067" />
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                {error || 'Student not found'}
              </p>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => router.push(`/${locale}/students`)}
                className="inline-flex items-center gap-2 rounded-[0.85rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6d5b12d1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800/50 px-4 pb-12 pt-4 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
      <div className="pointer-events-none absolute -left-16 top-0 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-[100px] transition-all duration-1000 dark:bg-blue-500/20" />
      <div className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-[120px] dark:bg-cyan-500/20" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-amber-300/10 blur-[140px] dark:bg-amber-500/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[100px] transition-all duration-1000 dark:bg-indigo-500/10" />

      <main className="relative z-10 mx-auto max-w-7xl">
        <AnimatedContent animation="fade" delay={0}>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/students`)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800/70 dark:bg-gray-900/80 dark:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6d5b12d1" />
          </button>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] xl:col-span-3">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_e57f0e7e" />
                </div>

                <div className="mt-8 flex flex-col items-center gap-6">
                  <div className="relative overflow-hidden h-40 w-40 rounded-[2rem] shadow-2xl ring-8 ring-white dark:ring-gray-900">
                    <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-blue-600/20 via-cyan-500/20 to-emerald-400/20 blur-2xl dark:from-blue-500/30 dark:via-cyan-500/30 dark:to-emerald-500/30" />
                    {student.photoUrl ? (
                      <img
                        src={`${STUDENT_SERVICE_URL}${student.photoUrl}`}
                        alt={student.firstName}
                        className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-gray-800">
                        <svg className="h-28 w-28 text-slate-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      Student ID: {student.studentId}
                    </p>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      {student.lastNameLatin} {student.firstNameLatin}
                    </h1>
                    <p className="text-base font-bold text-slate-500 dark:text-gray-400">
                      {student.khmerName}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <aside className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-xl shadow-slate-200/40 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] xl:col-span-9">
              <div className="relative z-10 flex flex-col">
                {/* Section 1: Academic Placement */}
                <div className="p-6">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                          <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_f9a0f9f5" />
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{currentClassName}</h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-gray-400">
                          {currentGradeLabel} • {currentAcademicYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        {placementHealthLabel}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-gray-800/50 dark:text-gray-300 dark:ring-gray-700/50">
                        Last Update: {latestMoveLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100 dark:bg-gray-800/50" />

                {/* Section 2: Integrity & Security */}
                <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-gray-800/50">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <StatusRing 
                          percentage={profileHealthScore} 
                          tone={profileHealthScore > 80 ? 'emerald' : profileHealthScore > 50 ? 'blue' : 'amber'} 
                        />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                            <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_183aafb9" />
                          </p>
                          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                            <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_77241e69" />
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-gray-400">
                            {filledFieldsCount} of 6 fields completed
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${student.isProfileLocked ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-50 text-slate-600 dark:bg-gray-800'}`}>
                          {student.isProfileLocked ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                            <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6338df26" />
                          </p>
                          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                            {student.isProfileLocked ? 'Locked' : 'Unlocked'}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-gray-400">
                            {student.isProfileLocked ? 'Records protected' : 'Security inactive'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleToggleLock}
                        disabled={isTogglingLock}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          student.isProfileLocked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow transition duration-200 ease-in-out ${student.isProfileLocked ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100 dark:bg-gray-800/50" />

                {/* Section 3: History & Quick Actions */}
                <div className="p-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                          <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_ff5375d1" />
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900 dark:text-white">{orderedProgressions.length}</span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Records</span>
                        </div>
                      </div>
                      <div className="h-10 w-px bg-slate-100 dark:bg-gray-800" />
                      <button
                        type="button"
                        onClick={() => router.push(`/${locale}/students/${student.id}/history`)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <History className="h-3.5 w-3.5" />
                        <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_e1345fc0" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        <Printer className="h-4 w-4 text-slate-400" />
                        <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6cb2a2f0" />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/${locale}/students/${student.id}/transcript`)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-100"
                      >
                        <Award className="h-4 w-4" />
                        <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_e4e7d133" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </AnimatedContent>

        <AnimatedContent animation="slide-up" delay={40}>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={autoT("auto.web.locale_students_id_page.k_ad948007")}
              value={String(orderedProgressions.length)}
              helper={orderedProgressions.length > 0 ? "Recorded promotions" : "No history recorded"}
              icon={TrendingUp}
              tone="blue"
            />
            <MetricCard
              label={autoT("auto.web.locale_students_id_page.k_88e0cd96")}
              value={String(academicYearsCovered)}
              helper={academicYearsCovered > 0 ? "Years with history" : "Initial enrollment"}
              icon={BookOpen}
              tone="emerald"
            />
            <MetricCard
              label={autoT("auto.web.locale_students_id_page.k_13e88078")}
              value={String(manualMoveCount)}
              helper={manualMoveCount > 0 ? "Admin interventions" : "Standard path"}
              icon={User}
              tone="amber"
            />
            <MetricCard
              label={autoT("auto.web.locale_students_id_page.k_116baa9d")}
              value={`${profileHealthScore}%`}
              helper={profileHealthScore === 100 ? "Complete record" : `${filledFieldsCount}/6 fields filled`}
              icon={ShieldCheck}
              tone={profileHealthScore > 80 ? "emerald" : profileHealthScore > 50 ? "blue" : "amber"}
            />
          </div>
        </AnimatedContent>

        <AnimatedContent animation="slide-up" delay={80}>
          <div className="mt-6 space-y-6">
            {fieldConfig.student.sections.map((section, sectionIdx) => {
              const SectionIcon = SECTION_ICONS[section.id] || SECTION_ICONS.personal;
              
              return (
                <div 
                  key={section.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800/50 px-8 py-6 dark:border-gray-800/50">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                        Section {sectionIdx + 1}
                      </p>
                      <h2 className="mt-2 text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                        {section.label}
                      </h2>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 dark:bg-gray-800 dark:text-gray-500">
                      <SectionIcon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="grid gap-4 p-8 md:grid-cols-2">
                    {section.fields.map((field) => {
                      const rawValue = student[field.key];
                      let displayValue = rawValue || 'N/A';
                      
                      if (field.type === 'date' && rawValue) {
                        displayValue = formatDisplayDate(rawValue);
                      } else if (field.type === 'select' && field.options) {
                        displayValue = field.options.find(o => o.value === rawValue)?.label || rawValue || 'N/A';
                      }

                      return (
                        <div 
                          key={field.key} 
                          className={field.span === 1 ? 'md:col-span-2' : 'col-span-1'}
                        >
                          <DetailField
                            icon={SECTION_ICONS[section.id] || User}
                            label={tDynamic(field.key as any)}
                            value={displayValue}
                            isPlaceholder={!rawValue}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Integrated Academic Aside - Keep for summary but made dynamic or merged */}
            <aside className="overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800/70 px-8 py-6 dark:border-gray-800/70">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_1952f8f1" />
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_10b1bacd" />
                  </h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 dark:bg-gray-800 dark:text-gray-500">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <div className="grid gap-4 p-8 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-blue-100/80 bg-gradient-to-br from-blue-50/30 via-white to-cyan-50/30 p-6 shadow-sm dark:border-gray-800/70 dark:bg-none dark:bg-gray-950/50 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_41ca76c5" />
                  </p>
                  <p className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {currentClassName}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                    {currentAcademicYear}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-slate-100 dark:border-gray-800/70 bg-slate-50/50 dark:bg-gray-800/50 p-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    <Mail className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_958eb1b5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white break-all">
                    {student.email || 'Not available'}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-slate-100 dark:border-gray-800/70 bg-slate-50/50 dark:bg-gray-800/50 p-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    <Phone className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_b4c01ab3" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                    {student.phoneNumber || 'Not available'}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-slate-100 dark:border-gray-800/70 bg-slate-50/50 dark:bg-gray-800/50 p-6 md:col-span-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_af9d477a" />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                    {student.currentAddress || 'Not available'}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </AnimatedContent>

        <AnimatedContent animation="slide-up" delay={120}>
          <section className="mt-6 overflow-hidden rounded-[1.35rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
            <div className="border-b border-slate-200 dark:border-gray-800/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-gray-500">
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_131fa679" />
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_bf8cee74" />
                  </h2>
                  <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_246b3552" />
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                    {orderedProgressions.length} <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_8f37d936" />
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                    {academicYearsCovered} <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_33d7d686" />
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
                <div className="rounded-[1.15rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-gray-900 text-slate-500 shadow-sm ring-1 ring-slate-200/70 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800/70">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_students_id_page.k_e96562d9" /></h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6433d64c" />
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
                        className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 p-5 shadow-sm transition-colors hover:border-slate-300 dark:border-gray-800/70 dark:bg-gray-950/50 dark:hover:border-gray-700"
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
                                <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_82454662" /> {formatDisplayDate(progression.promotionDate)}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 px-4 py-3 text-right dark:border-gray-800/70 dark:bg-gray-900/80">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_032bcc25" />
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                              {progression.fromAcademicYear.name} <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_0f9a25c0" /> {progression.toAcademicYear.name}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                          <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/90 p-4 dark:border-gray-800/70 dark:bg-gray-900/75">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6904d8bf" />
                            </p>
                            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                              {progression.fromClass.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                              <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6101bf9d" /> {progression.fromClass.grade}
                              {progression.fromClass.section ? ` - Section ${progression.fromClass.section}` : ''}
                            </p>
                          </div>

                          <div className="hidden items-center justify-center md:flex">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:bg-gray-800 dark:text-gray-300">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>

                          <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/90 p-4 dark:border-gray-800/70 dark:bg-gray-900/75">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_27907948" />
                            </p>
                            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                              {progression.toClass.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                              <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_6101bf9d" /> {progression.toClass.grade}
                              {progression.toClass.section ? ` - Section ${progression.toClass.section}` : ''}
                            </p>
                          </div>
                        </div>

                        {progression.notes ? (
                          <div className="mt-4 rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 p-4 dark:border-gray-800/70 dark:bg-gray-900/70">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                              <AutoI18nText i18nKey="auto.web.locale_students_id_page.k_3dc648c9" />
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
    </>
  );
}
