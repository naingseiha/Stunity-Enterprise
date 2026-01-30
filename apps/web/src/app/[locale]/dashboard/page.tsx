'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  Activity,
  ArrowUpRight,
  Clock,
  Award,
  Target,
  Sparkles,
  Bell,
  ChevronRight,
  BarChart3,
  FileText,
  UserPlus,
  CalendarPlus,
  Settings as SettingsIcon,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

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
      router.push(`/${params.locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData.user && userData.school) {
      setUser(userData.user);
      setSchool(userData.school);
    }
    setLoading(false);
  }, [params.locale, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                {getGreeting()}, {user?.firstName}!
              </h1>
              <p className="text-orange-50 text-lg">
                Welcome back to {school?.name}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-5 h-5" />
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Students */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +12%
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Students</h3>
            <p className="text-3xl font-bold text-gray-900 mb-2">2,847</p>
            <p className="text-xs text-gray-500">+142 this semester</p>
          </div>

          {/* Teachers */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +5%
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Teachers</h3>
            <p className="text-3xl font-bold text-gray-900 mb-2">124</p>
            <p className="text-xs text-gray-500">6 new hires</p>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                <Activity className="w-4 h-4" />
                Active
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Classes</h3>
            <p className="text-3xl font-bold text-gray-900 mb-2">48</p>
            <p className="text-xs text-gray-500">All grades covered</p>
          </div>

          {/* Attendance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Great!
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Attendance Rate</h3>
            <p className="text-3xl font-bold text-gray-900 mb-2">94.5%</p>
            <p className="text-xs text-gray-500">Above target</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Add Student */}
                <button
                  onClick={() => router.push(`/${params.locale}/students?action=add`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Add Student</h3>
                    <p className="text-sm text-gray-600">Enroll new student</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* Create Class */}
                <button
                  onClick={() => router.push(`/${params.locale}/classes?action=create`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                    <CalendarPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Create Class</h3>
                    <p className="text-sm text-gray-600">Set up new class</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* View Reports */}
                <button
                  onClick={() => router.push(`/${params.locale}/reports`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">View Reports</h3>
                    <p className="text-sm text-gray-600">Analytics & insights</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* Settings */}
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg group-hover:scale-110 transition-transform">
                    <SettingsIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Settings</h3>
                    <p className="text-sm text-gray-600">Manage school</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-orange-500" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: Users,
                    color: 'blue',
                    title: '15 new students enrolled',
                    time: '2 hours ago',
                  },
                  {
                    icon: GraduationCap,
                    color: 'purple',
                    title: '3 teachers joined',
                    time: '5 hours ago',
                  },
                  {
                    icon: BookOpen,
                    color: 'green',
                    title: 'Grade 8B completed final exam',
                    time: 'Yesterday',
                  },
                  {
                    icon: Award,
                    color: 'orange',
                    title: '127 assignments submitted',
                    time: '2 days ago',
                  },
                ].map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`p-2 bg-gradient-to-br ${
                        activity.color === 'blue'
                          ? 'from-blue-500 to-blue-600'
                          : activity.color === 'purple'
                          ? 'from-purple-500 to-purple-600'
                          : activity.color === 'green'
                          ? 'from-green-500 to-emerald-600'
                          : 'from-orange-500 to-yellow-500'
                      } rounded-lg`}
                    >
                      <activity.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Academic Year Card */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border-2 border-orange-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900">Current Academic Year</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900">2025-2026</p>
                  <p className="text-sm text-gray-600">October 2025 - September 2026</p>
                </div>
                <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full w-2/3"></div>
                </div>
                <p className="text-xs text-gray-600">4 months remaining</p>
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                >
                  Manage Academic Years
                </button>
              </div>
            </div>

            {/* Subscription Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900">Subscription</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-full">
                    {school?.subscriptionTier?.replace('_', ' ')}
                  </span>
                </div>
                {school?.trialDaysRemaining && school.trialDaysRemaining > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-900">
                      {school.trialDaysRemaining} days remaining in trial
                    </p>
                  </div>
                )}
                <button className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors">
                  Upgrade Plan
                </button>
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Announcements</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Parent-Teacher Meeting
                  </p>
                  <p className="text-xs text-blue-700">This Friday, 3:00 PM</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-1">
                    New Feature: Student Analytics
                  </p>
                  <p className="text-xs text-green-700">Now available in reports</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
