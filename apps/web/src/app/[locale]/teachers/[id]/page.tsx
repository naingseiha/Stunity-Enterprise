'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  Users,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  Award,
  History,
  School,
  ChevronRight,
  User,
  Loader2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Briefcase,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import { useEducationSystem } from '@/hooks/useEducationSystem';
import TeacherDetailSkeleton from '@/components/teachers/TeacherDetailSkeleton';

import { useTranslations } from 'next-intl';
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
  tone?: 'emerald' | 'blue' | 'amber' | 'slate' | 'violet';
}) {
  const toneClasses = {
    emerald: {
      shell: 'border-emerald-500/10 bg-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-500/5',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    },
    blue: {
      shell: 'border-blue-500/10 bg-blue-500/5 dark:border-blue-500/20 dark:bg-blue-500/5',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    },
    amber: {
      shell: 'border-amber-500/10 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-500/5',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    },
    violet: {
      shell: 'border-violet-500/10 bg-violet-500/5 dark:border-violet-500/20 dark:bg-violet-500/5',
      icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    },
    slate: {
      shell: 'border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/50 dark:border-gray-800/60 dark:bg-gray-900/40',
      icon: 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:bg-gray-800 dark:text-gray-400',
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
    violet: 'text-violet-500',
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

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  englishFirstName?: string;
  englishLastName?: string;
  khmerName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  gender?: string;
  employeeId?: string;
  isProfileLocked?: boolean;
  position?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  homeroomClass?: {
    id: string;
    name: string;
    gradeLevel: number;
    section: string;
    _count: { students: number };
    students: any[];
  };
  teacherClasses: {
    class: {
      id: string;
      name: string;
      gradeLevel: number;
      section: string;
      _count: { students: number };
    };
  }[];
  subjectTeachers: {
    subject: {
      id: string;
      name: string;
      nameKh: string;
      code: string;
      grade: number;
      category: string;
    };
  }[];
}

interface YearHistory {
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    isCurrent: boolean;
  };
  classes: {
    id: string;
    name: string;
    gradeLevel: number;
    section: string;
    studentCount: number;
    isHomeroom: boolean;
  }[];
  homerooms: {
    id: string;
    name: string;
    gradeLevel: number;
    section: string;
    studentCount: number;
  }[];
  subjects: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    grade: number;
    category: string;
  }[];
  stats: {
    totalClasses: number;
    totalHomerooms: number;
    totalSubjects: number;
    totalStudents: number;
  };
}

interface HistoryData {
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
    photoUrl?: string;
  };
  history: YearHistory[];
  summary: {
    totalYears: number;
    totalClasses: number;
    totalSubjects: number;
  };
}

export default function TeacherDetailPage(
  props: {
    params: Promise<{ locale: string; id: string }>;
  }
) {
  const autoT = useTranslations();
  const params = use(props.params);
  const router = useRouter();
  const t = useTranslations('common');
  const tDynamic = useTranslations('dynamicFields');
  const { locale, id } = params;
  const { fieldConfig } = useEducationSystem();

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  };

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
        if (data.success) {
        const rawTeacher = data.data;
        const regional = rawTeacher.customFields?.regional || {};
        
        // Flatten custom fields for dynamic access
        const flattenedData = {
          ...rawTeacher,
          ...regional,
          // Special mappings
          gender: rawTeacher.gender || regional.gender,
          dateOfBirth: rawTeacher.dateOfBirth || regional.dateOfBirth,
          hireDate: rawTeacher.hireDate || regional.hireDate,
          email: rawTeacher.email || regional.email,
          phoneNumber: rawTeacher.phone || rawTeacher.phoneNumber || regional.phoneNumber || regional.phone,
          address: rawTeacher.address || regional.address,
        };

        const transformedTeacher = {
          ...flattenedData,
          firstName: rawTeacher.firstName || '',
          lastName: rawTeacher.lastName || '',
          englishFirstName: rawTeacher.englishFirstName || regional.englishName?.split(' ')[0] || regional.englishFirstName || null,
          englishLastName: rawTeacher.englishLastName || regional.englishName?.split(' ').slice(1).join(' ') || regional.englishLastName || null,
          khmerName: rawTeacher.khmerName || regional.khmerName || null,
        };
        
        setTeacher(transformedTeacher);
      } else {
        setError(data.error || 'Failed to load teacher');
      }
    } catch (err: any) {
      setError('Failed to load teacher details');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (historyData) return;
    setLoadingHistory(true);
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}/teachers/${id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setHistoryData(data.data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTabChange = (tab: 'overview' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history' && !historyData) {
      loadHistory();
    }
  };

  const handleToggleLock = async () => {
    if (!teacher) return;
    try {
      setIsTogglingLock(true);
      const { toggleProfileLock } = await import('@/lib/api/teachers');
      const newLockState = !teacher.isProfileLocked;
      await toggleProfileLock(teacher.id, newLockState);
      setTeacher({ ...teacher, isProfileLocked: newLockState });
    } catch (err) {
      console.error('Failed to toggle profile lock:', err);
      alert('Unable to change profile lock status. Please try again.');
    } finally {
      setIsTogglingLock(false);
    }
  };

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 p-8">
          <TeacherDetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 p-8">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{error || 'Teacher not found'}</p>
            <button
              onClick={() => router.push(`/${locale}/teachers`)}
              className="mt-4 text-orange-600 dark:text-orange-400 hover:underline"
            >
              <AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_78b6f2b6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const uniqueSubjects = teacher.subjectTeachers
    .map((st) => st.subject)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

  const filledFieldsCount = [
    teacher.firstName,
    teacher.lastName,
    teacher.email,
    teacher.phone,
    teacher.position,
    teacher.department,
    teacher.employeeId,
    teacher.photoUrl,
  ].filter(Boolean).length;
  const profileHealthScore = Math.round((filledFieldsCount / 8) * 100);

  const nativeName = [teacher.lastName, teacher.firstName].filter(Boolean).join(' ').trim() || teacher.khmerName?.trim() || 'N/A';
  let internationalName = [teacher.englishLastName, teacher.englishFirstName].filter(Boolean).join(' ').trim() || 'N/A';
  if (internationalName === nativeName) internationalName = 'N/A';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 transition-colors duration-500 dark:bg-gray-950">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800/50 px-4 pb-12 pt-4 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-[100px] transition-all duration-1000 dark:bg-blue-500/20" />
        <div className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-[120px] dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-amber-300/10 blur-[140px] dark:bg-amber-500/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[100px] transition-all duration-1000 dark:bg-indigo-500/10" />

        <main className="relative z-10 mx-auto max-w-7xl">
          <AnimatedContent animation="fade" delay={0}>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/teachers`)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800/70 dark:bg-gray-900/80 dark:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_dc559aed" />
            </button>

            <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
              {/* Left Column: Hero Card */}
              <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] xl:col-span-3">
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700 ring-1 ring-blue-100/50 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20 backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    Faculty Member
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-6 group">
                    <div className="relative overflow-hidden h-44 w-44 rounded-[2.5rem] shadow-2xl ring-8 ring-white transition-all duration-500 hover:rotate-2 hover:scale-105 dark:ring-gray-900">
                      <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-blue-600/30 via-cyan-500/30 to-emerald-400/30 blur-2xl animate-pulse" />
                      {teacher.photoUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}${teacher.photoUrl}`}
                          alt={nativeName}
                          className="h-full w-full object-cover transition-all duration-700"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-gray-900">
                          <User className="h-28 w-28 text-slate-200 dark:text-gray-800" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                        Employee ID: {teacher.employeeId || 'N/A'}
                      </p>
                      <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                        {nativeName}
                      </h1>
                      <p className="text-base font-bold text-blue-500/80 dark:text-blue-400/80 uppercase tracking-wide">
                        {internationalName.trim() !== '' ? internationalName : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Summary & Actions */}
              <aside className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-xl shadow-slate-200/40 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] xl:col-span-9">
                <div className="relative z-10 flex flex-col h-full">
                  {/* Section 1: Current Assignment */}
                  <div className="p-6">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 text-orange-600 shadow-sm ring-1 ring-orange-100 dark:from-orange-500/10 dark:to-amber-500/5 dark:text-orange-300 dark:ring-orange-500/20">
                          <School className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                            Academic Assignment
                          </p>
                          <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white leading-tight">
                            {teacher.homeroomClass ? teacher.homeroomClass.name : 'No Homeroom Assigned'}
                          </h3>
                          <p className="mt-0.5 text-[13px] font-semibold text-slate-500 dark:text-gray-400">
                            {teacher.teacherClasses.length} Classes • {uniqueSubjects.length} Disciplines
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                          {teacher.position || 'Teacher'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-gray-800/50 dark:text-gray-300 dark:ring-gray-700/50">
                          {teacher.department || 'General Education'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-100 dark:bg-gray-800/50" />

                  {/* Section 2: Health & Security */}
                  <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-gray-800/50">
                    <div className="p-6">
                      <div className="flex items-center gap-4">
                        <StatusRing 
                          percentage={profileHealthScore} 
                          tone={profileHealthScore > 80 ? 'emerald' : profileHealthScore > 50 ? 'blue' : 'amber'} 
                        />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                            Profile Completion
                          </p>
                          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                            Administrative Health
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-gray-400">
                            {filledFieldsCount} of 8 verified fields
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${teacher.isProfileLocked ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-50 text-slate-600 dark:bg-gray-800'}`}>
                            {teacher.isProfileLocked ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Profile Security
                            </p>
                            <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                              {teacher.isProfileLocked ? 'Protected' : 'Unlocked'}
                            </p>
                            <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-gray-400">
                              {teacher.isProfileLocked ? 'Records are read-only' : 'Administrative access open'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleToggleLock}
                          disabled={isTogglingLock}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            teacher.isProfileLocked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow transition duration-200 ease-in-out ${teacher.isProfileLocked ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-100 dark:bg-gray-800/50 mt-auto" />

                  {/* Section 3: History & Reports */}
                  <div className="p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-8">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                            Career History
                          </p>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 dark:text-white">
                              {historyData?.summary.totalYears || 0}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Years</span>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-slate-100 dark:bg-gray-800" />
                        <button
                          type="button"
                          onClick={() => handleTabChange('history')}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 dark:bg-gray-800 dark:text-gray-300"
                        >
                          <History className="h-3.5 w-3.5" />
                          View History
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          Print Profile
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-100"
                        >
                          <Award className="h-4 w-4" />
                          Evaluation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={20}>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Career Longevity"
                value={`${historyData?.summary.totalYears || 1}Y`}
                helper="Years in service"
                icon={Calendar}
                tone="blue"
              />
              <MetricCard
                label="Class Load"
                value={String(teacher.teacherClasses.length)}
                helper="Active class assignments"
                icon={School}
                tone="emerald"
              />
              <MetricCard
                label="Subject Mastery"
                value={String(uniqueSubjects.length)}
                helper="Disciplines handled"
                icon={BookOpen}
                tone="amber"
              />
              <MetricCard
                label="Student Reach"
                value={String(teacher.teacherClasses.reduce((acc, c) => acc + (c.class._count?.students || 0), 0))}
                helper="Lifetime student impact"
                icon={Users}
                tone="violet"
              />
            </div>

            <div className="mt-8 mb-8 grid gap-1 border-b border-slate-200 dark:border-gray-800/50 sm:flex sm:items-center">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'history', label: 'Assignment History', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`relative flex items-center gap-2.5 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute inset-x-0 bottom-0 h-1 rounded-t-full bg-blue-600 dark:bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </AnimatedContent>

          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="grid gap-6">
                <div className="space-y-6">
                  {fieldConfig.teacher.sections.map((section, sectionIdx) => {
                    const SECTION_ICONS: Record<string, LucideIcon> = {
                      personal: User,
                      contact: Phone,
                      employment: Briefcase,
                      qualifications: GraduationCap,
                    };
                    const SectionIcon = SECTION_ICONS[section.id] || SECTION_ICONS.personal;

                    return (
                      <div 
                        key={section.id}
                        className="overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800/50 px-8 py-6 dark:border-gray-800/50">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-gray-500">
                                Segment {sectionIdx + 1}
                              </p>
                            </div>
                            <h2 className="mt-2 text-3xl font-black tracking-tighter bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
                              {section.label}
                            </h2>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 shadow-inner dark:bg-gray-800 dark:text-gray-500">
                            <SectionIcon className="h-6 w-6 transition-transform group-hover:scale-110" />
                          </div>
                        </div>
                        <div className="grid gap-4 p-8 md:grid-cols-2">
                          {section.fields.map((field) => {
                            const rawValue = (teacher as any)[field.key];
                            let displayValue = rawValue || 'N/A';
                            
                            if (field.type === 'date' && rawValue) {
                              const date = new Date(rawValue);
                              displayValue = isNaN(date.getTime()) ? rawValue : date.toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              });
                            } else if (field.type === 'select' && field.options) {
                              displayValue = field.options.find(o => o.value === rawValue)?.label || rawValue || 'N/A';
                            }

                            return (
                              <div 
                                key={field.key} 
                                className={field.span === 1 ? 'md:col-span-2' : 'col-span-1'}
                              >
                                <DetailField
                                  icon={SectionIcon}
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
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="grid gap-6">
                {loadingHistory ? (
                  <div className="flex h-64 items-center justify-center rounded-2xl bg-white dark:bg-gray-900/50 backdrop-blur-xl dark:bg-gray-900/50">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  </div>
                ) : historyData ? (
                  <div className="space-y-8">
                    <div className="grid gap-4 md:grid-cols-3">
                      <MetricCard label={autoT("auto.web.locale_teachers_id_page.k_404496b8")} value={`${historyData.summary.totalYears}Y`} helper="Academic Seasons" icon={Calendar} tone="violet" />
                      <MetricCard label={autoT("auto.web.locale_teachers_id_page.k_6cea0bde")} value={historyData.summary.totalClasses} helper="Lifetime sections" icon={GraduationCap} tone="blue" />
                      <MetricCard label={autoT("auto.web.locale_teachers_id_page.k_3cfa7f89")} value={historyData.summary.totalSubjects} helper="Lifetime disciplines" icon={BookOpen} tone="emerald" />
                    </div>

                    <div className="space-y-6">
                      {historyData.history.map((yearHistory) => (
                        <div
                          key={yearHistory.academicYear.id}
                          className="overflow-hidden rounded-[1.35rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]"
                        >
                          <div className={`border-b border-slate-200 dark:border-gray-800/50 px-6 py-6 transition-colors dark:border-gray-800/50 ${yearHistory.academicYear.isCurrent ? 'bg-blue-500/5' : ''}`}>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ring-1 ${yearHistory.academicYear.isCurrent ? 'bg-blue-600 text-white ring-blue-500' : 'bg-slate-100 dark:bg-gray-800 text-slate-500 ring-slate-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700'}`}>
                                  <Calendar className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                                    {yearHistory.academicYear.name}
                                    {yearHistory.academicYear.isCurrent && (
                                      <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"><AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_3f34d84c" /></span>
                                    )}
                                  </h3>
                                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400"><AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_a01fab01" /></p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-400">{yearHistory.stats.totalClasses} <AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_e3ff05ca" /></span>
                                <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-400">{yearHistory.stats.totalSubjects} <AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_9c244e64" /></span>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-6 p-8 md:grid-cols-2">
                            <div className="space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_4c6b0ee5" /></p>
                              <div className="grid gap-2.5">
                                {yearHistory.classes.map(cls => (
                                  <div key={cls.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white dark:bg-gray-900/50 p-3.5 transition-all hover:bg-white dark:bg-gray-900 dark:border-gray-800 dark:bg-gray-950/20">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-black text-slate-900 dark:text-white">{cls.name}</span>
                                      {cls.isHomeroom && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest dark:bg-amber-500/20 dark:text-amber-300">H</span>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{cls.studentCount} <AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_b7c441eb" /></span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_4a480c4a" /></p>
                              <div className="flex flex-wrap gap-2">
                                {yearHistory.subjects.map(subject => (
                                  <span key={subject.id} className="inline-flex items-center rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-tight text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                    {subject.name} • {subject.code}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="rounded-3xl bg-rose-50 p-6 dark:bg-rose-500/10">
                      <AlertCircle className="h-10 w-10 text-rose-500" />
                    </div>
                    <h3 className="mt-6 text-xl font-black tracking-tighter text-slate-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_d17a1458" /></h3>
                    <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_teachers_id_page.k_33968456" /></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
