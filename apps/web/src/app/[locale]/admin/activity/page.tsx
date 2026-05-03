'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { Activity, UserPlus, Calendar, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useAcademicYear } from '@/contexts/AcademicYearContext';

import { useTranslations } from 'next-intl';
import { isSchoolAttendanceAdminRole } from '@/lib/permissions/schoolAttendance';

export default function GlobalActivityPage(props: { params: Promise<{ locale: string }> }) {
    const autoT = useTranslations();
  const params = use(props.params);
  const router = useRouter();
  const t = useTranslations('common');
  const { locale } = params;
  const { schoolId } = useAcademicYear();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
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
    const fetchActivities = async () => {
      const token = TokenManager.getAccessToken();
      if (!token || !schoolId || !user || !isSchoolAttendanceAdminRole(user.role)) {
        setStatsLoading(false);
        return;
      }
      try {
        setStatsLoading(true);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const res = await fetch(
          `${ATTENDANCE_SERVICE_URL}/attendance/school/summary?startDate=${startOfMonth}&endDate=${endOfMonth}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success && data.data && data.data.recentCheckIns) {
          setActivities(data.data.recentCheckIns);
        }
      } catch (error) {
        console.error('Failed to fetch activity summary', error);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchActivities();
  }, [schoolId, user?.role]);

  if (loading) {
    return <PageSkeleton user={user} school={school} type="dashboard" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} onLogout={() => router.push(`/${locale}/auth/login`)} />

      <div className="lg:ml-64 min-h-screen relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 relative z-10">
          <AnimatedContent animation="slide-up">
            <div className="mb-8">
              <button onClick={() => router.back()} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 mb-4">
                <ChevronRight className="w-4 h-4 rotate-180" /> <AutoI18nText i18nKey="auto.web.locale_admin_activity_page.k_79f2ef60" />
              </button>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Activity className="w-6 h-6" />
                </div>
                <AutoI18nText i18nKey="auto.web.locale_admin_activity_page.k_f4f47e79" />
              </h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.locale_admin_activity_page.k_ce608c44" /></p>
            </div>
          </AnimatedContent>

          <div className="bg-white dark:bg-gray-900/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 dark:border-gray-800/50 min-h-[500px]">
            {statsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_admin_activity_page.k_511557c0" /></p>
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-6">
                {activities.map((checkIn: any, index: number) => (
                  <AnimatedContent key={checkIn.id} animation="slide-up" delay={100 + (index % 10) * 50}>
                    <div className="flex items-start gap-5 p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-slate-200 dark:border-gray-800/50 dark:hover:border-gray-700/50">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 overflow-hidden ring-4 ring-white dark:ring-gray-900">
                        {checkIn.teacher?.photoUrl ? (
                          <img src={checkIn.teacher.photoUrl} alt={autoT("auto.web.locale_admin_activity_page.k_f33bf21e")} className="w-full h-full object-cover" />
                        ) : (
                          <UserPlus className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-base font-bold text-slate-800 dark:text-white">
                              {checkIn.teacher?.firstName} {checkIn.teacher?.lastName} <span className="font-medium text-slate-400 dark:text-slate-500 text-sm"><AutoI18nText i18nKey="auto.web.locale_admin_activity_page.k_2df1b7a6" /></span>
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                                {checkIn.status}
                              </span>
                              <span className="flex items-center gap-1 text-sm font-semibold text-slate-400 dark:text-slate-500">
                                <Clock className="w-4 h-4" /> {new Date(checkIn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AnimatedContent>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_admin_activity_page.k_6527ed82" /></h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm"><AutoI18nText i18nKey="auto.web.locale_admin_activity_page.k_1d37445b" /></p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
