'use client';

import { useEffect, useState } from 'react';
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

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const { locale } = params;
  const { schoolId, currentYear } = useAcademicYear();
  const [user, setUser] = useState<UserData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
    if (!schoolId || !currentYear?.id) {
      setStatsLoading(false);
      return;
    }

    const token = TokenManager.getAccessToken();
    if (!token) return;

    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const res = await fetch(
          `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${currentYear.id}/stats`,
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
  }, [schoolId, currentYear?.id]);

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
      change: currentYear ? 'Current year' : 'No year selected',
      changeType: 'neutral' as const,
      subtitle: currentYear?.name ?? 'Select academic year',
      icon: GraduationCap,
      iconColor: 'blue',
    },
    {
      title: 'Teachers',
      value: teachersVal,
      change: currentYear ? 'This year' : '',
      changeType: 'neutral' as const,
      subtitle: currentYear?.name ?? '',
      icon: Users,
      iconColor: 'purple',
    },
    {
      title: 'Classes',
      value: classesVal,
      change: currentYear ? 'Active' : '',
      changeType: 'neutral' as const,
      subtitle: currentYear?.name ?? '',
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
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950">
      <UnifiedNavigation
        user={user}
        school={school}
        onLogout={handleLogout}
      />

      <div className="lg:ml-64 min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Page header */}
          <AnimatedContent animation="fade" delay={0}>
            <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
              <Link
                href={`/${locale}/dashboard`}
                className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <Home className="h-4 w-4" aria-hidden />
                <span>Dashboard</span>
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" aria-hidden />
              <span className="font-medium text-slate-700 dark:text-slate-200">Overview</span>
            </nav>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/80 shadow-sm">
                  <LayoutDashboard className="h-7 w-7 text-stunity-primary-600 dark:text-stunity-primary-400" aria-hidden />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Dashboard
                  </h1>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Welcome back, {user?.firstName || 'Admin'}. Here’s your school overview.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mt-8">
            {stats.map((stat, index) => (
              <AnimatedContent key={index} animation="slide-up" delay={80 + index * 60}>
                <StatCard {...stat} />
              </AnimatedContent>
            ))}
          </div>

          {/* Main content: Quick Actions + Activity | Sidebar */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Quick Actions + Recent Activity in one card */}
            <div className="lg:col-span-2 space-y-8">
              <AnimatedContent animation="slide-up" delay={350}>
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quickActions.map((action, index) => (
                      <ActionCard key={index} {...action} />
                    ))}
                  </div>
                </section>
              </AnimatedContent>

              <AnimatedContent animation="slide-up" delay={450}>
                <section className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/80 shadow-sm overflow-hidden">
                  <div className="px-6 pt-6 pb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Recent Activity
                    </h2>
                  </div>
                  <div className="px-6 pb-8 pt-2">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 py-12 text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Recent activity will appear here once you enroll students, mark attendance, or submit grades.
                      </p>
                    </div>
                  </div>
                </section>
              </AnimatedContent>
            </div>

            {/* Right: Single overview card with subsections */}
            <AnimatedContent animation="slide-left" delay={500}>
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/80 shadow-sm overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Overview
                  </h2>
                </div>

                {/* Academic Year */}
                <div className="px-6 pb-6 border-b border-slate-200/60 dark:border-slate-700/80">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    Current Academic Year
                  </h3>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {currentYear?.name ?? '—'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {currentYear
                      ? `${new Date(currentYear.startDate).toLocaleDateString()} – ${new Date(currentYear.endDate).toLocaleDateString()}`
                      : 'Set up in settings'}
                  </p>
                  {currentYear && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-stunity-primary-500 to-stunity-primary-400 transition-all duration-500"
                          style={{
                            width:
                              currentYear.status === 'ACTIVE'
                                ? '60%'
                                : currentYear.status === 'ENDED'
                                  ? '100%'
                                  : '30%',
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{currentYear.status}</p>
                    </div>
                  )}
                  <Link
                    href={`/${locale}/settings/academic-years`}
                    className="mt-4 flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-stunity-primary-600 text-white text-sm font-medium hover:bg-stunity-primary-700 transition-colors"
                  >
                    Manage Academic Years
                  </Link>
                </div>

                {/* Subscription */}
                <div className="px-6 py-6 border-b border-slate-200/60 dark:border-slate-700/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-stunity-primary-100 dark:bg-stunity-primary-900/40 text-stunity-primary-700 dark:text-stunity-primary-300 text-xs font-semibold">
                      FREE TRIAL
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">3 months</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    You're on the free trial. Upgrade to unlock premium features.
                  </p>
                  <button
                    type="button"
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600/80 transition-colors border border-slate-200/60 dark:border-slate-600/60"
                  >
                    Upgrade Plan
                  </button>
                </div>

                {/* Today's attendance */}
                <div className="px-6 py-6">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                    Today&apos;s Attendance
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Present', value: '—' },
                      { label: 'Absent', value: '—' },
                      { label: 'Late', value: '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                        <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/80 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Total</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">—</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Mark attendance to see today&apos;s numbers
                  </p>
                </div>
              </div>
            </AnimatedContent>
          </div>
        </main>
      </div>
    </div>
  );
}
