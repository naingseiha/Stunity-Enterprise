'use client';

import { useState, useEffect, use } from 'react';
import {
    BarChart3,
    Users,
    UserCheck,
    Clock,
    ChevronRight,
    Home,
    AlertCircle,
    LogIn,
    LogOut
} from 'lucide-react';
import Link from 'next/link';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useAttendanceSummary, type AttendanceSummaryRange } from '@/hooks/useAttendanceSummary';
import { TokenManager } from '@/lib/api/auth';
import AnimatedContent from '@/components/AnimatedContent';
import StatCard from '@/components/dashboard/StatCard';

const DATE_RANGE_OPTIONS: Array<{ id: AttendanceSummaryRange; label: string }> = [
    { id: 'day', label: 'Today' },
    { id: 'week', label: 'Weekly' },
    { id: 'month', label: 'Monthly' },
    { id: 'semester', label: 'Semester' },
];

export default function AttendanceDashboardPage(props: { params: Promise<{ locale: string }> }) {
    const params = use(props.params);
    const { locale } = params;
    const { schoolId } = useAcademicYear();
    const [user, setUser] = useState<any>(null);
    const [school, setSchool] = useState<any>(null);
    const [dateRange, setDateRange] = useState<AttendanceSummaryRange>('month');

    useEffect(() => {
        const userData = TokenManager.getUserData();
        if (userData) {
            setUser(userData.user);
            setSchool(userData.school);
        }
    }, []);

    const {
        data,
        isLoading,
    } = useAttendanceSummary(schoolId, dateRange);

    const loading = !data && isLoading;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors duration-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]"></div>
            </div>
        );
    }

    const stats = data?.stats || {
        studentCount: 0,
        attendanceRate: 0,
        totals: { present: 0, absent: 0, late: 0 }
    };
    const topClasses = data?.topClasses || [];
    const atRiskClasses = data?.atRiskClasses || [];
    const recentCheckIns = data?.recentCheckIns || [];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-500 uppercase-indicator">
            <UnifiedNavigation user={user} school={school} />

            <div className="lg:ml-64 min-h-screen">
                <main className="p-4 lg:p-8">
                    {/* Header */}
                    <AnimatedContent animation="fade" delay={0}>
                        <div className="mb-6">
                            <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 mb-6 font-medium uppercase tracking-widest text-[10px]">
                                <Link href={`/${locale}/dashboard`} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                    <Home className="h-3.5 w-3.5" />
                                    <span>Home</span>
                                </Link>
                                <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-700" />
                                <span className="text-gray-900 dark:text-white">Attendance Dashboard</span>
                            </nav>

                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3.5 bg-orange-100 dark:bg-orange-500/10 rounded-2xl">
                                        <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Attendance Dashboard</h1>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">School-wide attendance overview and trends.</p>
                                    </div>
                                </div>

                                <div className="flex items-center p-1 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50 w-fit">
                                    {DATE_RANGE_OPTIONS.map((range) => (
                                        <button
                                            key={range.id}
                                            onClick={() => setDateRange(range.id)}
                                            className={`
                                                px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300
                                                ${dateRange === range.id
                                                    ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-md scale-105'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                }
                                            `}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </AnimatedContent>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <AnimatedContent animation="slide-up" delay={100}>
                            <StatCard
                                title="Avg Attendance Rate"
                                value={`${stats.attendanceRate}%`}
                                subtitle="School average"
                                icon={UserCheck}
                                iconColor="green"
                            />
                        </AnimatedContent>
                        <AnimatedContent animation="slide-up" delay={150}>
                            <StatCard
                                title="Teacher Attendance"
                                value={`${stats.teacherAttendanceRate}%`}
                                subtitle="Staff check-in rate"
                                icon={UserCheck}
                                iconColor="blue"
                            />
                        </AnimatedContent>
                        <AnimatedContent animation="slide-up" delay={200}>
                            <StatCard
                                title="Total Present"
                                value={String(stats.totals.present + (stats.teacherTotals?.present || 0))}
                                subtitle="Combined students & staff"
                                icon={Users}
                                iconColor="indigo"
                            />
                        </AnimatedContent>
                        <AnimatedContent animation="slide-up" delay={250}>
                            <StatCard
                                title="At Risk Classes"
                                value={String(atRiskClasses.length)}
                                subtitle="Attendance below 80%"
                                icon={AlertCircle}
                                iconColor="red"
                            />
                        </AnimatedContent>
                    </div>

                    {/* Performance & Sessions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        {/* Session Breakdown */}
                        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl dark:hover:shadow-black/20">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3 tracking-tight">
                                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                    <Clock className="h-5 w-5 text-blue-500" />
                                </div>
                                Session Breakdown
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['MORNING', 'AFTERNOON'].map((session) => {
                                    const sessionData = stats.sessions?.[session] || { present: 0, absent: 0, late: 0, total: 0 };
                                    const rate = sessionData.total > 0 ? ((sessionData.present + sessionData.late) / sessionData.total) * 100 : 0;
                                    return (
                                        <div key={session} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 group hover:scale-[1.02] transition-all duration-300">
                                            <div className="flex justify-between items-center mb-6">
                                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{session} SESSION</span>
                                                <span className={`text-lg font-black ${rate >= 90 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                                    {Math.round(rate)}%
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-gray-500 dark:text-gray-400">Present</span>
                                                    <span className="text-gray-900 dark:text-white">{sessionData.present}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-gray-500 dark:text-gray-400">Late</span>
                                                    <span className="text-gray-900 dark:text-white">{sessionData.late}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-gray-500 dark:text-gray-400">Absent</span>
                                                    <span className="text-gray-900 dark:text-white">{sessionData.absent}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-1000 bg-gradient-to-r ${rate >= 90 ? 'from-green-400 to-emerald-600 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'from-orange-400 to-red-600 shadow-[0_0_8px_rgba(251,146,60,0.4)]'}`}
                                                        style={{ width: `${rate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Class Performance */}
                        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl dark:hover:shadow-black/20">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3 tracking-tight">
                                <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                                    <Users className="h-5 w-5 text-orange-500" />
                                </div>
                                Class Performance
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Top Performing</h4>
                                    <div className="space-y-3">
                                        {topClasses.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all group">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{c.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-1.5 rounded-full transition-all duration-1000 group-hover:shadow-[0_0_8px_rgba(52,211,153,0.4)]" style={{ width: `${c.rate}%` }} />
                                                    </div>
                                                    <span className="text-xs font-black text-green-600 dark:text-green-400 w-8 text-right">{Math.round(c.rate)}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">At Risk ({'<'}80%)</h4>
                                    <div className="space-y-3">
                                        {atRiskClasses.length > 0 ? atRiskClasses.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all group">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{c.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-orange-400 to-red-500 h-1.5 rounded-full transition-all duration-1000 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]" style={{ width: `${c.rate}%` }} />
                                                    </div>
                                                    <span className="text-xs font-black text-red-600 dark:text-red-400 w-8 text-right">{Math.round(c.rate)}%</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex items-center justify-center p-6 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">No classes currently at risk</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staff Recent Check-ins */}
                    <AnimatedContent animation="slide-up" delay={300}>
                        <div className="mt-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-xl dark:hover:shadow-black/20">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                        <UserCheck className="h-5 w-5 text-blue-500" />
                                    </div>
                                    Staff Check-in Log
                                </h3>
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800">Recent Activity</span>
                            </div>

                            {recentCheckIns.length > 0 ? (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-3 custom-scrollbar">
                                    {recentCheckIns.map((log: any, index: number) => (
                                        <div key={log.id || index} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:scale-[1.01] transition-all duration-300 gap-6">

                                            {/* Staff Info */}
                                            <div className="flex items-center gap-4">
                                                <div className="relative group">
                                                    <div className="absolute -inset-1 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full opacity-20 blur-sm group-hover:opacity-40 transition-opacity" />
                                                    {log.teacher?.photoUrl ? (
                                                        <img src={log.teacher.photoUrl} alt="Staff" className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 relative z-10" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border-2 border-white dark:border-gray-800 relative z-10">
                                                            <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">
                                                        {log.teacher?.firstName} {log.teacher?.lastName}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">{log.teacher?.user?.displayName || 'Academic Staff'}</p>
                                                </div>
                                            </div>

                                            {/* Date and Status */}
                                            <div className="flex items-center gap-8 hidden md:flex">
                                                <div className="flex flex-col items-start md:items-end">
                                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Check-in Date</span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${log.status === 'PRESENT' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'}`}>
                                                    {log.status}
                                                </div>
                                            </div>

                                            {/* Time Logs */}
                                            <div className="flex items-center gap-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-sky-50 dark:bg-sky-500/10 rounded-xl transition-colors group-hover:bg-sky-100 dark:group-hover:bg-sky-500/20">
                                                        <LogIn className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 tracking-widest mb-0.5">Time In</p>
                                                        <p className="text-sm font-black text-gray-900 dark:text-white">
                                                            {log.timeIn ? new Date(log.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl transition-colors group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20">
                                                        <LogOut className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 tracking-widest mb-0.5">Time Out</p>
                                                        <p className="text-sm font-black text-gray-900 dark:text-white">
                                                            {log.timeOut ? new Date(log.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] bg-gray-50/50 dark:bg-gray-800/20">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <UserCheck className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2 tracking-tight">No Activity Logged</h4>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm max-w-xs mx-auto">No recent staff check-ins have been recorded for the selected period.</p>
                                </div>
                            )}
                        </div>
                    </AnimatedContent>
                </main>
            </div>
        </div>
    );
}
