'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  BookOpen, 
  Star, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  PlayCircle,
  MessageSquare,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';

import { useTranslations } from 'next-intl';
const MOCK_DATA = [
  { name: 'Mon', students: 40, revenue: 2400 },
  { name: 'Tue', students: 30, revenue: 1398 },
  { name: 'Wed', students: 20, revenue: 9800 },
  { name: 'Thu', students: 27, revenue: 3908 },
  { name: 'Fri', students: 18, revenue: 4800 },
  { name: 'Sat', students: 23, revenue: 3800 },
  { name: 'Sun', students: 34, revenue: 4300 },
];

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: any;
  color: string;
}

function StatCard({ title, value, change, isPositive, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm hover:border-slate-700 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-inherit/20`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-white mt-1">{value}</h3>
      </div>
    </div>
  );
}

export default function InstructorDashboard() {
    const autoT = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [user, setUser] = useState<any>(null);
  const t = useTranslations('common');

  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData.user);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-black text-white">
          <AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_b0a6f6ad" /> <span className="text-amber-500">{user?.firstName || 'Chief'}</span>
        </h1>
        <p className="text-slate-500 mt-2 font-medium"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_2c4efdb4" /></p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={autoT("auto.web.app_locale_instructor_page.k_09118602")} 
          value="1,248" 
          change="+12.5%" 
          isPositive={true} 
          icon={Users} 
          color="bg-blue-500"
        />
        <StatCard 
          title={autoT("auto.web.app_locale_instructor_page.k_d693c909")} 
          value="45.2k" 
          change="+8.2%" 
          isPositive={true} 
          icon={TrendingUp} 
          color="bg-amber-500"
        />
        <StatCard 
          title={autoT("auto.web.app_locale_instructor_page.k_fd130b00")} 
          value="4.8" 
          change="-0.1%" 
          isPositive={false} 
          icon={Star} 
          color="bg-emerald-500"
        />
        <StatCard 
          title={autoT("auto.web.app_locale_instructor_page.k_2b587853")} 
          value="12.5k" 
          change="+15.3%" 
          isPositive={true} 
          icon={Award} 
          color="bg-purple-500"
        />
      </div>

      {/* Charts & Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Engagement Chart */}
        <div className="xl:col-span-2 bg-[#1E293B]/60 backdrop-blur-md border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_54781291" /></h3>
              <p className="text-slate-500 text-sm"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_b13ee140" /></p>
            </div>
            <select className="bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-300 px-4 py-2 focus:ring-amber-500">
              <option>{autoT("auto.web.app_locale_instructor_page.k_0cff9d1f")}</option>
              <option>{autoT("auto.web.app_locale_instructor_page.k_eced1de2")}</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold" 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold" 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#F59E0B', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#F59E0B" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorStudents)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Tips */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-amber-500/20 group cursor-pointer overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_db314a1a" /></h3>
              <p className="text-white/80 text-sm font-medium mb-6"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_1140144a" /></p>
              <Link 
                href={`/${locale}/learn/create`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 text-amber-600 rounded-2xl font-bold hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" />
                <AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_a1581adb" />
              </Link>
            </div>
            <PlayCircle className="absolute right-[-10px] bottom-[-10px] w-40 h-40 text-black/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
          </div>

          <div className="bg-slate-800/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-sm">
            <h3 className="font-bold text-white mb-4"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_1b16bd47" /></h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 flex-shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_47d2e76f" /></p>
                  <p className="text-[10px] text-slate-500 mt-0.5"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_c135c7ef" /></p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_3e28d8d6" /></p>
                  <p className="text-[10px] text-slate-500 mt-0.5"><AutoI18nText i18nKey="auto.web.app_locale_instructor_page.k_ad3086db" /></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
