'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
  ClipboardList,
  ClipboardCheck,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
          <p className="text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_ab1bbaad" /></p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
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
                <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_afe6e384" /> {school?.name}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white dark:bg-gray-900/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30">
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +12%
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_86180ad5" /></h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">2,847</p>
            <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_01e0ba42" /></p>
          </div>

          {/* Teachers */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +5%
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_e5f93717" /></h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">124</p>
            <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_72fc0887" /></p>
          </div>

          {/* Classes */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                <Activity className="w-4 h-4" />
                <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_64f8e7d0" />
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_8c3f21ef" /></h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">48</p>
            <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_34636e35" /></p>
          </div>

          {/* Attendance */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_388f6a16" />
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_91c132e8" /></h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">94.5%</p>
            <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_ddebb951" /></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" />
                <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_3eac2183" />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Add Student */}
                <button
                  onClick={() => router.push(`/${params.locale}/students?action=add`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_6b180a37" /></h3>
                    <p className="text-sm text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_b104be96" /></p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* Create Class */}
                <button
                  onClick={() => router.push(`/${params.locale}/classes?action=create`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                    <CalendarPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_a9b2ceec" /></h3>
                    <p className="text-sm text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_af71c484" /></p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* View Reports */}
                <button
                  onClick={() => router.push(`/${params.locale}/reports`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_751c5bb1" /></h3>
                    <p className="text-sm text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_f29a2872" /></p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* Grade Entry */}
                <button
                  onClick={() => router.push(`/${params.locale}/grades/entry`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_d917f318" /></h3>
                    <p className="text-sm text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_c464ad31" /></p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* Attendance */}
                <button
                  onClick={() => router.push(`/${params.locale}/attendance/mark`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_646109d5" /></h3>
                    <p className="text-sm text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_ed98d73e" /></p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>

                {/* Settings */}
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group"
                >
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg group-hover:scale-110 transition-transform">
                    <SettingsIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_ebced1fb" /></h3>
                    <p className="text-sm text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_ad50823f" /></p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-orange-500" />
                <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_6e857eba" />
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
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 transition-colors"
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
                      <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
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
                <h3 className="font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_5a467fd5" /></h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">2025-2026</p>
                  <p className="text-sm text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_ee104173" /></p>
                </div>
                <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full w-2/3"></div>
                </div>
                <p className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_5f0d4522" /></p>
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                >
                  <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_8e71a1fc" />
                </button>
              </div>
            </div>

            {/* Subscription Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_1674331a" /></h3>
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
                      {school.trialDaysRemaining} <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_c94da53b" />
                    </p>
                  </div>
                )}
                <button className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors">
                  <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_081eb8ed" />
                </button>
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_31e23598" /></h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_54b5589b" />
                  </p>
                  <p className="text-xs text-blue-700"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_264ddf8f" /></p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-1">
                    <AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_2106f515" />
                  </p>
                  <p className="text-xs text-green-700"><AutoI18nText i18nKey="auto.web.dashboard_page_old_backup.k_036715ba" /></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
