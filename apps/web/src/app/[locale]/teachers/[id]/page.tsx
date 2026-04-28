'use client';

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
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';

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
      shell: 'border-slate-200/60 bg-white/50 dark:border-gray-800/60 dark:bg-gray-900/40',
      icon: 'bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400',
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
    <div className={`group relative rounded-2xl border transition-all duration-300 ${
      isPlaceholder 
        ? 'border-dashed border-slate-200 bg-slate-50/30 dark:border-gray-800 dark:bg-gray-950/20' 
        : 'border-slate-200/50 bg-white/40 hover:border-blue-500/30 hover:bg-white dark:border-gray-800/40 dark:bg-gray-900/30 dark:hover:border-blue-500/30'
    } p-5`}>
      <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
        <Icon className={`h-3.5 w-3.5 ${!isPlaceholder ? 'group-hover:text-blue-500 transition-colors' : ''}`} />
        {label}
      </div>
      <p className={`mt-3.5 text-[15px] font-bold tracking-tight ${
        isPlaceholder ? 'opacity-40 italic font-medium' : 'text-slate-900 dark:text-white'
      }`}>
        {value}
      </p>
      {!isPlaceholder && (
        <div className="absolute inset-0 rounded-2xl bg-blue-500/0 opacity-0 transition-all group-hover:bg-blue-500/[0.02] group-hover:opacity-100" />
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
    violet: 'text-violet-500',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-12 w-12 -rotate-90 transform">
        <circle
          className="text-slate-100 dark:text-gray-800"
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
  const params = use(props.params);
  const router = useRouter();
  const { locale, id } = params;

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
        
        // Transform data to strictly prefer English fields for International Name
        const transformedTeacher = {
          ...rawTeacher,
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
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
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
              Back to Teachers
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
    <div className="min-h-screen bg-gray-50 transition-colors duration-500 dark:bg-gray-950">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 px-4 pb-12 pt-4 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-[100px] transition-all duration-1000 dark:bg-blue-500/20" />
        <div className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-[120px] dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-amber-300/10 blur-[140px] dark:bg-amber-500/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[100px] transition-all duration-1000 dark:bg-indigo-500/15" />

        <main className="relative z-10 mx-auto max-w-7xl">
          <AnimatedContent animation="fade" delay={0}>
            <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start group">
                <div className="relative flex-shrink-0">
                  {teacher.photoUrl ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}${teacher.photoUrl}`}
                      alt={nativeName}
                      className="h-28 w-28 rounded-[2rem] object-cover shadow-2xl ring-4 ring-white transition-transform duration-500 group-hover:scale-105 dark:ring-gray-900"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 text-3xl font-black text-white shadow-2xl ring-4 ring-white dark:ring-gray-900">
                      {teacher.lastName?.[0] || 'T'}{teacher.firstName?.[0] || ''}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-lg ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-gray-800">
                    <User className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                    Faculty Member
                  </p>
                  <h1 className="mt-2 text-[2rem] font-black tracking-tighter text-slate-900 dark:text-white sm:text-[2.5rem]">
                    {nativeName}
                  </h1>
                  <p className="mt-1 text-sm font-bold uppercase tracking-[0.15em] text-blue-500/80 dark:text-blue-400/80">
                    {internationalName.trim() !== '' ? internationalName : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/50 bg-white/40 p-4 transition-all hover:border-blue-500/30 hover:bg-white dark:border-gray-800/40 dark:bg-gray-900/30">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                      Status
                    </p>
                    <p className="mt-1 text-[13px] font-bold text-slate-900 dark:text-white">
                      Profile Health
                    </p>
                  </div>
                  <StatusRing 
                    percentage={profileHealthScore} 
                    tone={profileHealthScore > 80 ? 'emerald' : profileHealthScore > 50 ? 'blue' : 'amber'} 
                  />
                </div>

                <div className="rounded-2xl border border-slate-200/50 bg-white/40 p-4 dark:border-gray-800/40 dark:bg-gray-900/30">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    Faculty ID
                  </p>
                  <p className="mt-1.5 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {teacher.employeeId || 'NOT ASSIGNED'}
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-white dark:text-slate-950"
                  onClick={() => router.push(`/${locale}/teachers`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Directory
                </button>
              </div>
            </header>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={20}>
            <div className="mb-8 grid gap-1 border-b border-slate-200/50 dark:border-gray-800/50 sm:flex sm:items-center">
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
              <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between border-b border-slate-200/50 px-6 py-5 dark:border-gray-800/50">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                          Identity & Role
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                          Personal Information
                        </h2>
                      </div>
                      <User className="h-5 w-5 text-slate-400/80" />
                    </div>
                    <div className="grid gap-6 p-8 md:grid-cols-2">
                      <DetailField icon={User} label="Full Name (Native)" value={nativeName} />
                      <DetailField icon={Award} label="International Name" value={internationalName.trim() !== '' ? internationalName : 'N/A'} />
                      <DetailField icon={MapPin} label="Gender" value={teacher.gender ? (teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1).toLowerCase()) : 'N/A'} />
                      <DetailField icon={ShieldCheck} label="Position" value={teacher.position || 'Not specified'} />
                      <DetailField icon={School} label="Department" value={teacher.department || 'Not specified'} />
                      <div className="group relative flex items-center justify-between rounded-2xl border border-slate-200/50 bg-white/40 p-5 transition-all hover:border-emerald-500/30 hover:bg-white dark:border-gray-800/40 dark:bg-gray-900/30">
                        <div className="flex flex-col">
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">Profile Protection</p>
                          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                            {teacher.isProfileLocked ? 'Modifications Locked' : 'Open for Edits'}
                          </p>
                        </div>
                        <button
                          onClick={handleToggleLock}
                          disabled={isTogglingLock}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none   ${
                            teacher.isProfileLocked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'
                          } ${isTogglingLock ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              teacher.isProfileLocked ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between border-b border-slate-200/50 px-6 py-5 dark:border-gray-800/50">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                          Professional
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                          Qualifications & Specs
                        </h2>
                      </div>
                      <GraduationCap className="h-5 w-5 text-slate-400/80" />
                    </div>
                    <div className="grid gap-6 p-8 md:grid-cols-2">
                      <DetailField icon={Award} label="Qualification" value={teacher.qualification || 'No records added'} />
                      <DetailField icon={BookOpen} label="Specialization" value={teacher.specialization || 'No records added'} />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between border-b border-slate-200/50 px-6 py-5 dark:border-gray-800/50">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                          Communication
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                          Contact Details
                        </h2>
                      </div>
                      <Phone className="h-5 w-5 text-slate-400/80" />
                    </div>
                    <div className="grid gap-6 p-8 md:grid-cols-2">
                      <DetailField icon={Mail} label="Email Address" value={teacher.email || 'No email registered'} />
                      <DetailField icon={Phone} label="Phone Number" value={teacher.phone || 'No phone recorded'} />
                    </div>
                  </div>
                </div>

                <aside className="space-y-6 xl:col-span-4">
                  {teacher.homeroomClass ? (
                    <div className="relative overflow-hidden rounded-[1.55rem] border border-white/80 bg-gradient-to-br from-white via-slate-50 to-orange-50/70 p-8 text-slate-900 shadow-[0_30px_80px_-35px_rgba(148,163,184,0.45)] ring-1 ring-slate-200/70 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:ring-gray-800/70 group">
                      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-200/45 blur-3xl dark:bg-orange-500/20" />
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                          Homeroom Focus
                        </p>
                        <h2 className="mt-2 text-3xl font-black tracking-tighter group-hover:text-orange-600 transition-colors">
                          {teacher.homeroomClass.name}
                        </h2>
                        <div className="mt-4 space-y-3">
                          <div className="rounded-xl bg-white/50 p-3.5 backdrop-blur-sm dark:bg-white/5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Count</p>
                            <p className="text-xl font-black">{teacher.homeroomClass._count.students}</p>
                          </div>
                          <div className="rounded-xl bg-white/50 p-3.5 backdrop-blur-sm dark:bg-white/5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Placement</p>
                            <p className="text-sm font-bold">Grade {teacher.homeroomClass.gradeLevel}{teacher.homeroomClass.section}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.55rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/30">
                      <School className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-4 text-[13px] font-bold text-slate-400">Not assigned as homeroom teacher</p>
                    </div>
                  )}

                  <div className="rounded-[1.55rem] border border-slate-200/60 bg-white/80 p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500 mb-4">
                      Active Assignments
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-gray-800/50">
                        <span className="text-xs font-bold text-slate-500">Classes</span>
                        <span className="text-sm font-black tracking-tighter">{teacher.teacherClasses.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-gray-800/50">
                        <span className="text-xs font-bold text-slate-500">Subjects</span>
                        <span className="text-sm font-black tracking-tighter">{uniqueSubjects.length}</span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="grid gap-6">
                {loadingHistory ? (
                  <div className="flex h-64 items-center justify-center rounded-2xl bg-white/50 backdrop-blur-xl dark:bg-gray-900/50">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  </div>
                ) : historyData ? (
                  <div className="space-y-8">
                    <div className="grid gap-4 md:grid-cols-3">
                      <MetricCard label="Tenure" value={`${historyData.summary.totalYears}Y`} helper="Academic Seasons" icon={Calendar} tone="violet" />
                      <MetricCard label="Class Load" value={historyData.summary.totalClasses} helper="Lifetime sections" icon={GraduationCap} tone="blue" />
                      <MetricCard label="Subject Coverage" value={historyData.summary.totalSubjects} helper="Lifetime disciplines" icon={BookOpen} tone="emerald" />
                    </div>

                    <div className="space-y-6">
                      {historyData.history.map((yearHistory) => (
                        <div
                          key={yearHistory.academicYear.id}
                          className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]"
                        >
                          <div className={`border-b border-slate-200/50 px-6 py-6 transition-colors dark:border-gray-800/50 ${yearHistory.academicYear.isCurrent ? 'bg-blue-500/5' : ''}`}>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ring-1 ${yearHistory.academicYear.isCurrent ? 'bg-blue-600 text-white ring-blue-500' : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700'}`}>
                                  <Calendar className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                                    {yearHistory.academicYear.name}
                                    {yearHistory.academicYear.isCurrent && (
                                      <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">Current</span>
                                    )}
                                  </h3>
                                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Academic Season</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-400">{yearHistory.stats.totalClasses} sections</span>
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-400">{yearHistory.stats.totalSubjects} disciplines</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-6 p-8 md:grid-cols-2">
                            <div className="space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Section Assignments</p>
                              <div className="grid gap-2.5">
                                {yearHistory.classes.map(cls => (
                                  <div key={cls.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-3.5 transition-all hover:bg-white dark:border-gray-800 dark:bg-gray-950/20">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-black text-slate-900 dark:text-white">{cls.name}</span>
                                      {cls.isHomeroom && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest dark:bg-amber-500/20 dark:text-amber-300">H</span>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{cls.studentCount} pax</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Managed Disciplines</p>
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
                    <h3 className="mt-6 text-xl font-black tracking-tighter text-slate-900 dark:text-white">Historical Data Unreachable</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">We couldn't retrieve the assignment history records.</p>
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
