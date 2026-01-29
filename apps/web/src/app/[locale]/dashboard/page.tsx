'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Users,
  GraduationCap,
  Database,
  Calendar,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Crown,
} from 'lucide-react';
import { TokenManager, verifyToken } from '@/lib/api/auth';

interface UserData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: number;
}

interface SchoolData {
  id: number;
  name: string;
  slug: string;
  subscriptionTier: string;
  isActive: boolean;
  trialDaysRemaining: number;
  maxStudents?: number;
  maxTeachers?: number;
  maxStorageGB?: number;
}

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = TokenManager.getAccessToken();
      
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      try {
        // Try to verify token
        const response = await verifyToken(token);
        
        if (response.success && response.user) {
          setUser(response.user);
          setSchool(response.school || null);
        } else {
          throw new Error('Invalid token');
        }
      } catch (error) {
        // Token invalid, try to get from localStorage
        const { user: storedUser, school: storedSchool } = TokenManager.getUserData();
        
        if (storedUser && storedSchool) {
          setUser(storedUser);
          setSchool(storedSchool);
        } else {
          // No valid session, redirect to login
          TokenManager.clearTokens();
          router.push(`/${locale}/auth/login`);
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [locale, router]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-stunity-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !school) {
    return null;
  }

  const subscriptionLimits = {
    FREE_TRIAL_1M: { students: 100, teachers: 10, storage: 1 },
    FREE_TRIAL_3M: { students: 300, teachers: 20, storage: 2 },
    BASIC: { students: 500, teachers: 30, storage: 5 },
    STANDARD: { students: 1000, teachers: 50, storage: 10 },
    PREMIUM: { students: 3000, teachers: 100, storage: 25 },
    ENTERPRISE: { students: 10000, teachers: 500, storage: 100 },
  };

  const limits = subscriptionLimits[school.subscriptionTier as keyof typeof subscriptionLimits] || subscriptionLimits.FREE_TRIAL_1M;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stunity-primary-600 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{school.name}</h1>
                <p className="text-sm text-gray-600">{school.slug}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {tc('logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-stunity-primary-600 to-stunity-primary-700 rounded-xl text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">
            {t('welcome', { name: `${user.firstName} ${user.lastName}` })}
          </h2>
          <div className="flex items-center gap-6 text-stunity-primary-100">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">{school.subscriptionTier.replace(/_/g, ' ')}</span>
            </div>
            {school.trialDaysRemaining > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {t('trialDays')}: {school.trialDaysRemaining} days
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Students */}
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">{t('maxStudents')}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">0 / {limits.students}</h3>
            <p className="text-sm text-gray-600">{t('students')}</p>
          </div>

          {/* Teachers */}
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">{t('maxTeachers')}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">0 / {limits.teachers}</h3>
            <p className="text-sm text-gray-600">{t('teachers')}</p>
          </div>

          {/* Storage */}
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">{t('maxStorage')}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">0 / {limits.storage} GB</h3>
            <p className="text-sm text-gray-600">{t('storage')}</p>
          </div>

          {/* Classes */}
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">0</h3>
            <p className="text-sm text-gray-600">Classes</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('quickActions')}</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => router.push(`/${locale}/students`)}
              className="p-4 border-2 border-stunity-primary-200 bg-stunity-primary-50 rounded-lg hover:border-stunity-primary-500 hover:bg-stunity-primary-100 transition-all text-left group"
            >
              <Users className="w-8 h-8 text-stunity-primary-600 mb-2" />
              <p className="font-semibold text-gray-900">Manage Students</p>
              <p className="text-sm text-stunity-primary-600">View and manage</p>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-stunity-primary-500 hover:bg-stunity-primary-50 transition-all text-left group">
              <GraduationCap className="w-8 h-8 text-gray-400 group-hover:text-stunity-primary-600 mb-2" />
              <p className="font-semibold text-gray-900">Manage Teachers</p>
              <p className="text-sm text-gray-500">Coming soon</p>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-stunity-primary-500 hover:bg-stunity-primary-50 transition-all text-left group">
              <BarChart3 className="w-8 h-8 text-gray-400 group-hover:text-stunity-primary-600 mb-2" />
              <p className="font-semibold text-gray-900">{t('viewReports')}</p>
              <p className="text-sm text-gray-500">Coming soon</p>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-stunity-primary-500 hover:bg-stunity-primary-50 transition-all text-left group">
              <Settings className="w-8 h-8 text-gray-400 group-hover:text-stunity-primary-600 mb-2" />
              <p className="font-semibold text-gray-900">{t('settings')}</p>
              <p className="text-sm text-gray-500">Coming soon</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
