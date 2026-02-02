'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent, { StaggeredList } from '@/components/AnimatedContent';

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

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${params.locale}/auth/login`);
      return;
    }

    // Get user and school data from TokenManager
    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [params.locale, router]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${params.locale}/auth/login`);
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="dashboard" />;
  }

  const stats = [
    {
      title: 'Total Students',
      value: '2,847',
      change: '+142 this semester',
      changeType: 'positive' as const,
      subtitle: '+5.2% from last year',
      icon: GraduationCap,
      iconColor: 'blue',
    },
    {
      title: 'Teachers',
      value: '124',
      change: '+6 new hires',
      changeType: 'positive' as const,
      subtitle: 'All departments covered',
      icon: Users,
      iconColor: 'purple',
    },
    {
      title: 'Classes',
      value: '48',
      change: 'All active',
      changeType: 'neutral' as const,
      subtitle: 'Grades 7-12',
      icon: School,
      iconColor: 'green',
    },
    {
      title: 'Attendance Rate',
      value: '94.5%',
      change: 'Above target',
      changeType: 'positive' as const,
      subtitle: 'Last 30 days',
      icon: Target,
      iconColor: 'amber',
    },
  ];

  const quickActions = [
    {
      title: 'Add Student',
      description: 'Enroll new student to the school',
      icon: UserPlus,
      iconColor: 'blue',
      href: '/students/new',
    },
    {
      title: 'Create Class',
      description: 'Set up new class for current year',
      icon: BookOpen,
      iconColor: 'purple',
      href: '/classes/new',
    },
    {
      title: 'Grade Entry',
      description: 'Enter student grades and scores',
      icon: ClipboardList,
      iconColor: 'green',
      href: '/grades',
    },
    {
      title: 'View Reports',
      description: 'Analytics and performance insights',
      icon: BarChart3,
      iconColor: 'cyan',
      href: '/reports',
    },
    {
      title: 'Mark Attendance',
      description: 'Take daily class attendance',
      icon: Calendar,
      iconColor: 'amber',
      href: '/attendance',
    },
    {
      title: 'Settings',
      description: 'Manage school configuration',
      icon: Settings,
      iconColor: 'red',
      href: '/settings',
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
                <Home className="h-4 w-4" />
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
                    <div className="bg-white rounded-lg border border-gray-200 divide-y">
                    {[
                      {
                        action: 'New student enrolled',
                        details: 'Sopheap Chan - Grade 10A',
                        time: '2 hours ago',
                      },
                      {
                        action: 'Attendance marked',
                        details: 'Grade 11B - 28/30 present',
                        time: '3 hours ago',
                      },
                      {
                        action: 'Grades submitted',
                        details: 'Mathematics Midterm - Grade 12',
                        time: '5 hours ago',
                      },
                      {
                        action: 'Teacher added',
                        details: 'Dara Sok - Physics Department',
                        time: '1 day ago',
                      },
                    ].map((item, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                        <p className="text-sm font-medium text-gray-900">{item.action}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{item.details}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                      </div>
                    ))}
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
                      <p className="text-2xl font-bold text-gray-900">2025-2026</p>
                      <p className="text-sm text-gray-600 mt-1">
                        October 2025 - September 2026
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <p className="text-xs text-gray-600">4 months remaining</p>
                    <button className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Manage Academic Years
                    </button>
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
                    Today's Overview
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Present</span>
                      <span className="text-sm font-semibold text-gray-900">2,689</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Absent</span>
                      <span className="text-sm font-semibold text-gray-900">158</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Late</span>
                      <span className="text-sm font-semibold text-gray-900">42</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Attendance</span>
                        <span className="text-sm font-bold text-green-600">94.5%</span>
                      </div>
                    </div>
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
