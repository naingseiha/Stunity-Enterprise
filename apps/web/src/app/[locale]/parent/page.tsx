'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';
import {
  Users,
  ChevronRight,
  GraduationCap,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Clock,
  Award,
  BarChart3,
} from 'lucide-react';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  studentId: string;
  relationship: string;
  isPrimary: boolean;
}

export default function ParentDashboard({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/parent/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData.user?.role !== 'PARENT') {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const children: Child[] = user?.children || [];
  const relationshipLabels: Record<string, string> = {
    FATHER: 'Father / ឪពុក',
    MOTHER: 'Mother / ម្តាយ',
    GUARDIAN: 'Guardian / អាណាព្យាបាល',
    OTHER: 'Other',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-600">
          Track your children's academic progress at {school?.name}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{children.length}</p>
              <p className="text-sm text-gray-500">Children</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-sm text-gray-500">Subjects</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-sm text-gray-500">Avg. Grade</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-sm text-gray-500">Attendance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Children Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Your Children
        </h2>

        {children.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Linked</h3>
            <p className="text-gray-600 mb-4">
              You haven't linked any children to your account yet.
            </p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
              Link a Child
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/${locale}/parent/child/${child.id}`}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xl font-bold">
                      {child.firstName[0]}{child.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg" style={{ fontFamily: 'Battambang, sans-serif' }}>
                        {child.khmerName}
                      </h3>
                      <p className="text-sm text-gray-600">{child.firstName} {child.lastName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {relationshipLabels[child.relationship] || child.relationship}
                        </span>
                        {child.isPrimary && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-gray-50 hover:bg-green-50 transition-colors">
                    <BarChart3 className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                    <span className="text-xs text-gray-600">Grades</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-gray-50 hover:bg-green-50 transition-colors">
                    <Calendar className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                    <span className="text-xs text-gray-600">Attendance</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-gray-50 hover:bg-green-50 transition-colors">
                    <FileText className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                    <span className="text-xs text-gray-600">Report</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity / Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Recent Grades
            </h3>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <div className="p-6 text-center text-gray-500">
            <Award className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No recent grades</p>
            <p className="text-xs text-gray-400 mt-1">Grades will appear here when published</p>
          </div>
        </div>

        {/* School Announcements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              School Announcements
            </h3>
            <span className="text-xs text-gray-500">Recent</span>
          </div>
          <div className="p-6 text-center text-gray-500">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No announcements</p>
            <p className="text-xs text-gray-400 mt-1">School updates will appear here</p>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              If you have questions about your child's progress or need assistance, please contact the school administration.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 border border-gray-200">
                📞 Contact School
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 border border-gray-200">
                📧 Email Teacher
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
