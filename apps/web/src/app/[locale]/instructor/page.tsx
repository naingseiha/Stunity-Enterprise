'use client';

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
          Welcome back, <span className="text-amber-500">{user?.firstName || 'Chief'}</span>
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Your courses are reaching 1.2k students this week.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Students" 
          value="1,248" 
          change="+12.5%" 
          isPositive={true} 
          icon={Users} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Course Views" 
          value="45.2k" 
          change="+8.2%" 
          isPositive={true} 
          icon={TrendingUp} 
          color="bg-amber-500"
        />
        <StatCard 
          title="Avg. Rating" 
          value="4.8" 
          change="-0.1%" 
          isPositive={false} 
          icon={Star} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Earned Points" 
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
              <h3 className="text-xl font-bold text-white">Engagement Overview</h3>
              <p className="text-slate-500 text-sm">Student activity across all courses</p>
            </div>
            <select className="bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-300 px-4 py-2 focus:ring-amber-500">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
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
              <h3 className="text-2xl font-black mb-2">Ready to expand?</h3>
              <p className="text-white/80 text-sm font-medium mb-6">Create a new course or launch a learning path today.</p>
              <Link 
                href={`/${locale}/learn/create`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 text-amber-600 rounded-2xl font-bold hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" />
                New Course
              </Link>
            </div>
            <PlayCircle className="absolute right-[-10px] bottom-[-10px] w-40 h-40 text-black/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
          </div>

          <div className="bg-slate-800/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-sm">
            <h3 className="font-bold text-white mb-4">Instructor Tips</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 flex-shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Interact with QA</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Courses with active instructors have 40% higher completion rates.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Add Certificates</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Students are more likely to finish a course if they get a badge.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
