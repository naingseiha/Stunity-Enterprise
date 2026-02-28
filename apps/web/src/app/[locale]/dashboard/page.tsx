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
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation 
        user={user} 
        school={school}
        onLogout={handleLogout}
      />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        <main className="p-4 lg:p-8">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Link href={`/${locale}/dashboard`} className="flex items-center gap-1 hover:text-gray-700">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">Dashboard</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <LayoutDashboard className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">
                      Welcome back, {user?.firstName || 'Admin'}! Here's your school overview.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>

            {/* Stats Grid with Staggered Animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <AnimatedContent key={index} animation="slide-up" delay={100 + index * 50}>
                  <StatCard {...stat} />
                </AnimatedContent>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <AnimatedContent animation="slide-up" delay={400}>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quickActions.map((action, index) => (
                        <ActionCard key={index} {...action} />
                      ))}
                    </div>
                  </div>
                </AnimatedContent>

                {/* Recent Activity */}
                <AnimatedContent animation="slide-up" delay={500}>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent Activity
                    </h2>
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500 text-sm">
                      Recent activity will appear here once you enroll students, mark attendance, or submit grades.
                    </div>
                  </div>
                </AnimatedContent>
              </div>

              {/* Sidebar */}
              <AnimatedContent animation="slide-left" delay={600}>
                <div className="space-y-6">
                {/* Academic Year */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Current Academic Year
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {currentYear?.name ?? '—'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {currentYear
                          ? `${new Date(currentYear.startDate).toLocaleDateString()} – ${new Date(currentYear.endDate).toLocaleDateString()}`
                          : 'Set up in settings'}
                      </p>
                    </div>
                    {currentYear && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-blue-500 h-2 rounded-full"
                            style={{
                              width: currentYear.status === 'ACTIVE' ? '60%' : currentYear.status === 'ENDED' ? '100%' : '30%',
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-600">{currentYear.status}</p>
                      </>
                    )}
                    <Link
                      href={`/${locale}/settings/academic-years`}
                      className="block w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
                    >
                      Manage Academic Years
                    </Link>
                  </div>
                </div>

                {/* Subscription */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                      FREE TRIAL
                    </span>
                    <span className="text-xs text-purple-700">3 months</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">
                    You're on the free trial. Upgrade to unlock premium features.
                  </p>
                  <button className="w-full py-2 px-4 bg-white border-2 border-purple-600 text-purple-700 text-sm font-semibold rounded-lg hover:bg-purple-50 transition-colors">
                    Upgrade Plan
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Today&apos;s Overview
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Present</span>
                      <span className="text-sm font-semibold text-gray-900">—</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Absent</span>
                      <span className="text-sm font-semibold text-gray-900">—</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Late</span>
                      <span className="text-sm font-semibold text-gray-900">—</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Attendance</span>
                        <span className="text-sm font-bold text-gray-500">—</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Mark attendance to see today&apos;s numbers</p>
                  </div>
                </div>
                </div>
              </AnimatedContent>
            </div>
        </main>
      </div>
    </div>
  );
}
