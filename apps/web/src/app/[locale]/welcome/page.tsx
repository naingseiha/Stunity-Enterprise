'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import MacAppStoreDashboard from '@/components/dashboard/MacAppStoreDashboard';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { SCHOOL_SERVICE_URL, ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import PageSkeleton from '@/components/layout/PageSkeleton';

export default function WelcomePage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;
  const { schoolId, selectedYear } = useAcademicYear();
  const activeYear = selectedYear;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [yearStats, setYearStats] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState({ present: 0, absent: 0, rate: '—' });

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
    let cancelled = false;
    setYearStats(null);
    if (!schoolId || !activeYear?.id) return;
    const token = TokenManager.getAccessToken();
    if (!token) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${activeYear.id}/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setYearStats(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch welcome stats', err);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [activeYear?.id, schoolId]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="dashboard" />;
  }

  const studentsVal = yearStats ? String(yearStats.students) : '—';
  const teachersVal = yearStats ? String(yearStats.teachers) : '—';
  const classesVal = yearStats ? String(yearStats.classes) : '—';

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-indigo-500/10 dark:bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />

        {/* macOS Window Title Bar Header for Welcome Landing Screen */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-3 px-5 border border-slate-200/80 dark:border-gray-800/80 shadow-sm flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                Stunity AppStore Welcome Landing Screen
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                ← Back to Classic Dashboard
              </button>
            </div>
          </div>

          <MacAppStoreDashboard
            locale={locale}
            user={user}
            school={school}
            activeYear={activeYear}
            stats={{
              students: studentsVal,
              teachers: teachersVal,
              classes: classesVal,
              attendanceRate: attendanceData.rate,
            }}
          />
        </div>
      </div>
    </div>
  );
}
