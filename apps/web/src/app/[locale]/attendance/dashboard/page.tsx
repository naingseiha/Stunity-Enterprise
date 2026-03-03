'use client';

import { useState, useEffect } from 'react';
import {
    BarChart3,
    Users,
    UserCheck,
    UserMinus,
    UserPlus,
    Clock,
    Calendar,
    ChevronRight,
    Home,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    LogIn,
    LogOut
} from 'lucide-react';
import Link from 'next/link';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { TokenManager } from '@/lib/api/auth';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import AnimatedContent from '@/components/AnimatedContent';
import StatCard from '@/components/dashboard/StatCard';

export default function AttendanceDashboardPage({ params }: { params: { locale: string } }) {
    const { locale } = params;
    const { schoolId } = useAcademicYear();
    const [user, setUser] = useState<any>(null);
    const [school, setSchool] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [dateRange, setDateRange] = useState('month');

    useEffect(() => {
        const userData = TokenManager.getUserData();
        if (userData) {
            setUser(userData.user);
            setSchool(userData.school);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!schoolId) return;

            const token = TokenManager.getAccessToken();
            if (!token) return;

            try {
                setLoading(true);
                const now = new Date();
                let start = new Date();
                let end = new Date();

                if (dateRange === 'day') {
                    start.setHours(0, 0, 0, 0);
                } else if (dateRange === 'week') {
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
                    start = new Date(now.setDate(diff));
                    start.setHours(0, 0, 0, 0);
                } else if (dateRange === 'semester') {
                    start.setMonth(now.getMonth() - 5);
                    start.setDate(1);
                    start.setHours(0, 0, 0, 0);
                } else {
                    // month
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    start.setHours(0, 0, 0, 0);
                }

                // Use local date strings to avoid timezone mismatch with the backend
                const startDateStr = start.toLocaleDateString('en-CA'); // YYYY-MM-DD
                const endDateStr = end.toLocaleDateString('en-CA'); // YYYY-MM-DD

                const res = await fetch(
                    `${ATTENDANCE_SERVICE_URL}/attendance/school/summary?startDate=${startDateStr}&endDate=${endDateStr}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error('Error fetching attendance dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [schoolId, dateRange]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    const stats = data?.stats || {
        studentCount: 0,
        attendanceRate: 0,
        totals: { present: 0, absent: 0, late: 0 }
    };

    return (
        <div className="min-h-screen bg-gray-50 uppercase-indicator">
            <UnifiedNavigation user={user} school={school} />

            <div className="lg:ml-64 min-h-screen">
                <main className="p-4 lg:p-8">
                    {/* Header */}
                    <AnimatedContent animation="fade" delay={0}>
                        <div className="mb-6">
                            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <Link href={`/${locale}/dashboard`} className="flex items-center gap-1 hover:text-gray-700">
                                    <Home className="h-4 w-4" />
                                    <span>Home</span>
                                </Link>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-gray-900 font-medium">Attendance Dashboard</span>
                            </nav>

                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-orange-100 rounded-xl">
                                        <BarChart3 className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
                                        <p className="text-gray-600 mt-1">School-wide attendance overview and trends.</p>
                                    </div>
                                </div>

                                <div className="flex items-center p-1 bg-gray-200/50 rounded-xl w-fit">
                                    {[
                                        { id: 'day', label: 'Today' },
                                        { id: 'week', label: 'Weekly' },
                                        { id: 'month', label: 'Monthly' },
                                        { id: 'semester', label: 'Semester' },
                                    ].map((range) => (
                                        <button
                                            key={range.id}
                                            onClick={() => setDateRange(range.id)}
                                            className={`
                                                px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200
                                                ${dateRange === range.id
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
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
                                value={String(data?.atRiskClasses?.length || 0)}
                                subtitle="Attendance below 80%"
                                icon={AlertCircle}
                                iconColor="red"
                            />
                        </AnimatedContent>
                    </div>

                    {/* Performance & Sessions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        {/* Session Breakdown */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-500" />
                                Session Breakdown
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['MORNING', 'AFTERNOON'].map((session) => {
                                    const sessionData = stats.sessions?.[session] || { present: 0, absent: 0, late: 0, total: 0 };
                                    const rate = sessionData.total > 0 ? ((sessionData.present + sessionData.late) / sessionData.total) * 100 : 0;
                                    return (
                                        <div key={session} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="font-bold text-gray-700">{session}</span>
                                                <span className={`text-sm font-bold ${rate >= 90 ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {Math.round(rate)}%
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Present</span>
                                                    <span className="font-medium text-gray-900">{sessionData.present}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Late</span>
                                                    <span className="font-medium text-gray-900">{sessionData.late}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Absent</span>
                                                    <span className="font-medium text-gray-900">{sessionData.absent}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                    <div
                                                        className={`h-1.5 rounded-full ${rate >= 90 ? 'bg-green-500' : 'bg-orange-500'}`}
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
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Users className="h-5 w-5 text-orange-500" />
                                Class Performance
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Performing</h4>
                                    <div className="space-y-2">
                                        {data?.topClasses?.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <span className="text-sm text-gray-700">{c.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${c.rate}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-green-600">{Math.round(c.rate)}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">At Risk ({'<'}80%)</h4>
                                    <div className="space-y-2">
                                        {data?.atRiskClasses?.length > 0 ? data.atRiskClasses.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <span className="text-sm text-gray-700">{c.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${c.rate}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-red-600">{Math.round(c.rate)}%</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-gray-400 italic">No classes currently at risk.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staff Recent Check-ins */}
                    <AnimatedContent animation="slide-up" delay={300}>
                        <div className="mt-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-blue-500" />
                                    Staff Check-in Log
                                </h3>
                                <span className="text-sm text-gray-500">All staff check-ins for period</span>
                            </div>

                            {data?.recentCheckIns?.length > 0 ? (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {data.recentCheckIns.map((log: any, index: number) => (
                                        <div key={log.id || index} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4">

                                            {/* Staff Info */}
                                            <div className="flex items-center gap-3">
                                                {log.teacher?.photoUrl ? (
                                                    <img src={log.teacher.photoUrl} alt="Staff" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                                                        <UserCheck className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {log.teacher?.firstName} {log.teacher?.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{log.teacher?.user?.email || 'Staff'}</p>
                                                </div>
                                            </div>

                                            {/* Date and Status */}
                                            <div className="flex items-center gap-4 hidden md:flex">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-medium text-gray-500">Date</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${log.status === 'PRESENT' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {log.status}
                                                </div>
                                            </div>

                                            {/* Time Logs */}
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-sky-100 rounded-lg">
                                                        <LogIn className="w-4 h-4 text-sky-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-gray-400">Time In</p>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {log.timeIn ? new Date(log.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-orange-100 rounded-lg">
                                                        <LogOut className="w-4 h-4 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-gray-400">Time Out</p>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {log.timeOut ? new Date(log.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                                    <UserCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium text-sm">No recent staff check-ins found.</p>
                                </div>
                            )}
                        </div>
                    </AnimatedContent>
                </main>
            </div>
        </div>
    );
}
