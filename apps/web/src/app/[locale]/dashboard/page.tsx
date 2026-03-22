'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  School,
  Target,
  UserPlus,
  BookOpen,
  ClipboardList,
  BarChart3,
  Calendar,
  Settings,
  Home,
  ChevronRight,
  LayoutDashboard,
  Search,
  Sparkles,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import StatCard from '@/components/dashboard/StatCard';
import ActionCard from '@/components/dashboard/ActionCard';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { SCHOOL_SERVICE_URL } from '@/lib/api/config';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: string;
}

interface SchoolData {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  isActive: boolean;
  trialDaysRemaining?: number;
}

interface YearStats {
  students: number;
  teachers: number;
  classes: number;
}

export default function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;
  const { schoolId, currentYear, selectedYear } = useAcademicYear();
  const [user, setUser] = useState<UserData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const activeYear = selectedYear ?? currentYear;

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);

  useEffect(() => {
    if (!schoolId || !activeYear?.id) {
      setStatsLoading(false);
      return;
    }

    const token = TokenManager.getAccessToken();
    if (!token) return;

    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const res = await fetch(
          `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${activeYear.id}/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setYearStats(data.data);
        }
      } catch {
        setYearStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [activeYear?.id, schoolId]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="dashboard" />;
  }

  const studentsVal = yearStats ? String(yearStats.students) : (statsLoading ? '…' : '—');
  const teachersVal = yearStats ? String(yearStats.teachers) : (statsLoading ? '…' : '—');
  const classesVal = yearStats ? String(yearStats.classes) : (statsLoading ? '…' : '—');

  const stats = [
    {
      title: 'Total Students',
      value: studentsVal,
      change: activeYear ? 'Selected year' : 'No year selected',
      changeType: 'neutral' as const,
      subtitle: activeYear?.name ?? 'Select academic year',
      icon: GraduationCap,
      iconColor: 'blue',
    },
    {
      title: 'Teachers',
      value: teachersVal,
      change: school ? 'School total' : '',
      changeType: 'neutral' as const,
      subtitle: school?.name ?? '',
      icon: Users,
      iconColor: 'purple',
    },
    {
      title: 'Classes',
      value: classesVal,
      change: activeYear ? 'Selected year' : '',
      changeType: 'neutral' as const,
      subtitle: activeYear?.name ?? '',
      icon: School,
      iconColor: 'green',
    },
    {
      title: 'Attendance Rate',
      value: '—',
      change: 'From attendance',
      changeType: 'neutral' as const,
      subtitle: 'Mark attendance to see rate',
      icon: Target,
      iconColor: 'amber',
    },
  ];

  const quickActions = [
    {
      title: 'Students',
      description: 'View and manage students',
      icon: UserPlus,
      iconColor: 'blue',
      href: `/${locale}/students`,
    },
    {
      title: 'Classes',
      description: 'View and manage classes',
      icon: BookOpen,
      iconColor: 'purple',
      href: `/${locale}/classes`,
    },
    {
      title: 'Grade Entry',
      description: 'Enter student grades and scores',
      icon: ClipboardList,
      iconColor: 'green',
      href: `/${locale}/grades/entry`,
    },
    {
      title: 'Report Cards',
      description: 'View reports and analytics',
      icon: BarChart3,
      iconColor: 'cyan',
      href: `/${locale}/grades/reports`,
    },
    {
      title: 'Mark Attendance',
      description: 'Take daily class attendance',
      icon: Calendar,
      iconColor: 'amber',
      href: `/${locale}/attendance/mark`,
    },
    {
      title: 'Settings',
      description: 'Academic years and school config',
      icon: Settings,
      iconColor: 'red',
      href: `/${locale}/settings/academic-years`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation
        user={user}
        school={school}
        onLogout={handleLogout}
      />

      <div className="lg:ml-64 min-h-screen relative overflow-hidden">
        {/* Animated background blobs for extra depth */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 relative z-10">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Stats & Actions (Main) */}
            <div className="lg:col-span-8 space-y-12">
              {/* Activity Section / Main Stats */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Activity Status</h2>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-900/40 backdrop-blur-xl rounded-full shadow-sm border border-slate-200/50 dark:border-gray-800/50 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    <span>Weekly</span>
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <AnimatedContent key={index} animation="slide-up" delay={150 + index * 50}>
                      <StatCard {...stat} />
                    </AnimatedContent>
                  ))}
                </div>
              </section>

              {/* Quick Actions Section */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Main Functions</h2>
                  <Link href={`/${locale}/settings`} className="text-sm font-black text-blue-600 dark:text-blue-400 hover:underline">
                    View Portfolio
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {quickActions.map((action, index) => (
                    <AnimatedContent key={index} animation="slide-up" delay={350 + index * 50}>
                      <ActionCard key={index} {...action} />
                    </AnimatedContent>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Context & Calendar Style */}
            <div className="lg:col-span-4 space-y-10">
              {/* Calendar / School Context Card */}
              <AnimatedContent animation="slide-left" delay={400}>
                <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-sm border border-slate-200/50 dark:border-gray-800/50 transition-all duration-500 group hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Schedule</h3>
                    <div className="flex gap-2">
                      <button className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                      </button>
                      <button className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Academic Year Info - Clean integrated style */}
                  <div className="mb-8 p-6 rounded-[2rem] bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm shadow-inner border border-slate-200/50 dark:border-gray-700/30">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-blue-600 dark:text-blue-400 border border-transparent dark:border-gray-700 group-hover:scale-110 transition-transform duration-500">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">School Session</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white leading-none mt-0.5">{activeYear?.name || 'Academic Session'}</p>
                      </div>
                    </div>
                    {activeYear && (
                      <div className="space-y-3">
                        <div className="h-2 w-full rounded-full bg-white dark:bg-gray-900/50 overflow-hidden ring-1 ring-slate-200/50 dark:ring-gray-700/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            style={{ width: activeYear.status === 'ACTIVE' ? '65%' : activeYear.status === 'ENDED' ? '100%' : '5%' }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest px-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            {activeYear.status}
                          </span>
                          <Link href={`/${locale}/settings/academic-years`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            Details
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Overview Stats Mini Cards */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Live Attendance</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-[1.5rem] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-800/20 group/stat hover:scale-105 transition-transform">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-emerald-900/40 flex items-center justify-center mb-3 shadow-sm text-emerald-500 border border-emerald-100 dark:border-emerald-800/30">
                          <Users className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">0</p>
                        <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mt-1">Present</p>
                      </div>
                      <div className="p-5 rounded-[1.5rem] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-800/20 group/stat hover:scale-105 transition-transform">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-rose-900/40 flex items-center justify-center mb-3 shadow-sm text-rose-500 border border-rose-100 dark:border-rose-800/30">
                          <Users className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">0</p>
                        <p className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest mt-1">Absent</p>
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedContent>

              {/* Support Panel Style - Simplified integrated card */}
              <AnimatedContent animation="slide-left" delay={500}>
                <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-8 shadow-sm border border-slate-200/50 dark:border-gray-800/50 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-black/40 transition-all duration-500 group">
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                      <Sparkles className="w-3.5 h-3.5" />
                      Priority Access
                    </div>
                    <h3 className="text-2xl font-black tracking-tight mb-3 text-slate-800 dark:text-white">Enterprise Support</h3>
                    <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-6">
                      Our specialists are here to help you optimize your school management workflow.
                    </p>
                    <button className="w-full py-4 rounded-[1.25rem] bg-blue-600 text-white font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40">
                      Contact Specialist
                    </button>
                  </div>
                  {/* Decorative Elements - Subtle glow */}
                  <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-blue-500/20 dark:bg-blue-600/10 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-1000" />
                </div>
              </AnimatedContent>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
