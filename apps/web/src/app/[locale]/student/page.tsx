'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';
import {
  LogOut,
  Bell,
  GraduationCap,
  Calendar,
  FileText,
  TrendingUp,
  BookOpen,
  Clock,
  Award,
  User,
} from 'lucide-react';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  studentId?: string;
}

export default function StudentPortal({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    
    // Verify this is a student account
    if (userData.user?.role !== 'STUDENT') {
      // Redirect to appropriate portal
      if (userData.user?.role === 'PARENT') {
        router.replace(`/${locale}/parent`);
      } else {
        router.replace(`/${locale}/feed`);
      }
      return;
    }

    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.replace(`/${locale}/auth/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const quickLinks = [
    { href: `/${locale}/student/grades`, icon: TrendingUp, label: 'My Grades', color: 'blue', desc: 'View all your grades' },
    { href: `/${locale}/student/attendance`, icon: Calendar, label: 'My Attendance', color: 'green', desc: 'Check attendance record' },
    { href: `/${locale}/student/timetable`, icon: Clock, label: 'Timetable', color: 'purple', desc: 'Class schedule' },
    { href: `/${locale}/student/report-card`, icon: FileText, label: 'Report Card', color: 'orange', desc: 'Download report cards' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <img src="/Stunity.png" alt="Stunity" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">Student Portal</h1>
                <p className="text-xs text-gray-500">{school?.name}</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full relative">
                <Bell className="w-5 h-5" />
              </button>
              
              <Link
                href={`/${locale}/feed`}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
              >
                <BookOpen className="w-4 h-4" />
                Social Feed
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500">Student</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {user.firstName}!</h1>
              <p className="text-blue-100 mt-1">
                {school?.name} • Student ID: {user.studentId || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">85%</p>
                <p className="text-xs text-gray-500">Average Grade</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">96%</p>
                <p className="text-xs text-gray-500">Attendance</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">8</p>
                <p className="text-xs text-gray-500">Subjects</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-xs text-gray-500">Rank in Class</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl bg-${link.color}-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <link.icon className={`w-6 h-6 text-${link.color}-600`} />
              </div>
              <h3 className="font-semibold text-gray-900">{link.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>

        {/* Upcoming & Recent */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Today's Schedule
            </h3>
            <div className="space-y-3">
              {[
                { time: '08:00 - 09:30', subject: 'Mathematics', room: 'Room 101' },
                { time: '09:45 - 11:15', subject: 'Physics', room: 'Lab 2' },
                { time: '13:00 - 14:30', subject: 'English', room: 'Room 205' },
                { time: '14:45 - 16:15', subject: 'Chemistry', room: 'Lab 1' },
              ].map((class_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 w-24">{class_.time}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{class_.subject}</p>
                    <p className="text-xs text-gray-500">{class_.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Grades */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Recent Grades
            </h3>
            <div className="space-y-3">
              {[
                { subject: 'Mathematics', score: 92, max: 100, date: 'Feb 2' },
                { subject: 'Physics', score: 85, max: 100, date: 'Feb 1' },
                { subject: 'English', score: 78, max: 100, date: 'Jan 30' },
                { subject: 'Chemistry', score: 88, max: 100, date: 'Jan 28' },
              ].map((grade, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{grade.subject}</p>
                    <p className="text-xs text-gray-500">{grade.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${grade.score >= 80 ? 'text-green-600' : grade.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {grade.score}/{grade.max}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
