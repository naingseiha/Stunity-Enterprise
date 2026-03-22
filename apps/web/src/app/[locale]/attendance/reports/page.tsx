'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import {
  ClipboardCheck,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Percent,
  User,
  Sparkles,
} from 'lucide-react';

interface MonthlyStudentData {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  attendance: {
    [date: string]: {
      morning?: { id: string; status: string; remarks: string | null };
      afternoon?: { id: string; status: string; remarks: string | null };
    };
  };
  totals: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    permission: number;
  };
}

interface MonthlyData {
  classId: string;
  month: number;
  year: number;
  students: MonthlyStudentData[];
}

export default function AttendanceReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();

  // Selectors
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // Month/Year navigation
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Data
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize
  useEffect(() => {
    setIsClient(true);
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    if (selectedAcademicYear && allYears.some((year) => year.id === selectedAcademicYear)) {
      return;
    }

    const preferredYearId =
      contextSelectedYear?.id || allYears.find((year) => year.isCurrent)?.id || allYears[0]?.id || '';

    if (preferredYearId) {
      setSelectedAcademicYear(preferredYearId);
    }
  }, [allYears, contextSelectedYear, selectedAcademicYear]);

  const { classes } = useClasses({
    academicYearId: selectedAcademicYear || undefined,
    limit: 100,
  });

  useEffect(() => {
    if (!classes.length) {
      setSelectedClass('');
      return;
    }

    if (!selectedClass || !classes.some((cls) => cls.id === selectedClass)) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  // Load attendance when class or month changes
  useEffect(() => {
    if (selectedClass && selectedMonth && selectedYear) {
      loadMonthlyAttendance();
    }
  }, [selectedClass, selectedMonth, selectedYear]);

  const loadMonthlyAttendance = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008'}/attendance/class/${selectedClass}/month/${selectedMonth}/year/${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${TokenManager.getAccessToken()}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setMonthlyData(result.data);
      } else {
        setError(result.message || 'Failed to load attendance data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Navigate months
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!monthlyData?.students?.length) {
      return { totalStudents: 0, avgAttendance: 0, totalPresent: 0, totalAbsent: 0, totalLate: 0 };
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalSessions = 0;

    monthlyData.students.forEach((student) => {
      totalPresent += student.totals.present;
      totalAbsent += student.totals.absent;
      totalLate += student.totals.late;
      totalSessions += student.totals.present + student.totals.absent + student.totals.late + 
                       student.totals.excused + student.totals.permission;
    });

    const avgAttendance = totalSessions > 0 
      ? Math.round(((totalPresent + totalLate) / totalSessions) * 100) 
      : 0;

    return {
      totalStudents: monthlyData.students.length,
      avgAttendance,
      totalPresent,
      totalAbsent,
      totalLate,
    };
  }, [monthlyData]);

  // Get days in month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
  const selectedClassData = classes.find(c => c.id === selectedClass);

  // Get status cell color
  const getStatusCellClass = (status: string | undefined) => {
    if (!status) return 'bg-gray-50';
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-700';
      case 'ABSENT': return 'bg-red-100 text-red-700';
      case 'LATE': return 'bg-orange-100 text-orange-700';
      case 'EXCUSED': return 'bg-blue-100 text-blue-700';
      case 'PERMISSION': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-50';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return '-';
    switch (status) {
      case 'PRESENT': return 'P';
      case 'ABSENT': return 'A';
      case 'LATE': return 'L';
      case 'EXCUSED': return 'E';
      case 'PERMISSION': return 'S';
      default: return '-';
    }
  };

  // Loading skeleton
  if (!isClient || !user || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
          <div className="p-6"><div className="h-8 bg-gray-200 rounded-lg animate-pulse w-32" /></div>
        </div>
        <div className="lg:ml-64 min-h-screen">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-8 h-40" />
          <div className="p-8">
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border p-6 h-24 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600 dark:from-teal-950/40 dark:via-cyan-950/40 dark:to-emerald-950/40 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
          <div className="max-w-7xl mx-auto px-8 py-16 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/20 shadow-2xl">
                  <ClipboardCheck className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Analytics Engine
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
                    Attendance <span className="text-emerald-300">Reports</span>
                  </h1>
                  <p className="text-white/70 font-medium mt-2 max-w-xl">
                    High-fidelity monthly synthesis of academic presence and engagement metrics.
                  </p>
                </div>
              </div>
              <button
                onClick={loadMonthlyAttendance}
                disabled={loading || !selectedClass}
                className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 transition-all shadow-xl disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                <RefreshCw className={`w-4 h-4 relative z-10 ${loading ? 'animate-spin' : ''}`} />
                <span className="relative z-10">Sync Data Stream</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Filters */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Academic Year */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Academic Epoch</label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-black text-xs tracking-tight text-gray-900 dark:text-white appearance-none"
                  >
                    <option value="">Select Year</option>
                    {allYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Cohort Segment</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all disabled:opacity-50 font-black text-xs tracking-tight text-gray-900 dark:text-white appearance-none"
                    disabled={!selectedAcademicYear || classes.length === 0}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Navigation */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Temporal Coordinate</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-white dark:hover:bg-gray-900 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all shadow-sm active:scale-95"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 px-8 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-center font-black uppercase tracking-[0.2em] text-xs text-gray-900 dark:text-white shadow-inner">
                      {monthName} {selectedYear}
                    </div>
                    <button
                      onClick={goToNextMonth}
                      className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-white dark:hover:bg-gray-900 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all shadow-sm active:scale-95"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>

          <BlurLoader isLoading={loading} showSpinner={false}>
            {error ? (
              <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">{error}</p>
                <button onClick={loadMonthlyAttendance} className="mt-4 text-teal-600 hover:underline">
                  Try again
                </button>
              </div>
            ) : !selectedClass ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a class to view attendance reports</p>
              </div>
            ) : (
              <>
                {/* Statistics Cards */}
                <AnimatedContent animation="slide-up" delay={100}>
                <AnimatedContent animation="slide-up" delay={100}>
                  <div className="grid md:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 hover:translate-y-[-5px] transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-all duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Students</p>
                          <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{statistics.totalStudents}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 hover:translate-y-[-5px] transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-teal-500/10 transition-all duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-teal-50 dark:bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner group-hover:scale-110 transition-transform">
                          <Percent className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Avg Rate</p>
                          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 tracking-tight">{statistics.avgAttendance}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 hover:translate-y-[-5px] transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-all duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner group-hover:scale-110 transition-transform">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Present</p>
                          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{statistics.totalPresent}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 hover:translate-y-[-5px] transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-rose-500/10 transition-all duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner group-hover:scale-110 transition-transform">
                          <XCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Absent</p>
                          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{statistics.totalAbsent}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 hover:translate-y-[-5px] transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-all duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner group-hover:scale-110 transition-transform">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Late</p>
                          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{statistics.totalLate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedContent>
                </AnimatedContent>

                {/* Monthly Grid */}
                <AnimatedContent animation="slide-up" delay={200}>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden group">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                          {selectedClassData?.name}
                        </h2>
                        <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 animate-pulse uppercase tracking-[0.2em] mt-1">
                          Cycle: {monthName} {selectedYear}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                        <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm">P = Present</span>
                        <span className="px-3 py-1.5 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-lg border border-rose-200/50 dark:border-rose-500/20 shadow-sm">A = Absent</span>
                        <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200/50 dark:border-amber-500/20 shadow-sm">L = Late</span>
                        <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-200/50 dark:border-indigo-500/20 shadow-sm">E = Excused</span>
                        <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg border border-purple-200/50 dark:border-purple-500/20 shadow-sm">S = Permission</span>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50/50 dark:bg-gray-950/30 border-b border-gray-100 dark:border-gray-800">
                            <th className="sticky left-0 z-20 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md px-6 py-6 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] min-w-[240px] border-r border-gray-100 dark:border-gray-800">
                              Academic Persona
                            </th>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                              <th key={day} className="px-2 py-6 text-center text-[10px] font-black text-gray-400 dark:text-gray-600 min-w-[40px]">
                                {day}
                              </th>
                            ))}
                            <th className="px-4 py-6 text-center text-[10px] font-black text-teal-600 dark:text-teal-400 bg-teal-50/30 dark:bg-teal-950/10 min-w-[90px] uppercase tracking-[0.2em]">
                              Metrics
                            </th>
                            <th className="px-4 py-6 text-center text-[10px] font-black text-teal-600 dark:text-teal-400 bg-teal-50/30 dark:bg-teal-950/10 min-w-[90px] uppercase tracking-[0.2em]">
                              Efficiency
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                          {monthlyData?.students?.map((student, idx) => {
                            const totalSessions = student.totals.present + student.totals.absent + 
                                                  student.totals.late + student.totals.excused + 
                                                  student.totals.permission;
                            const attendanceRate = totalSessions > 0 
                              ? Math.round(((student.totals.present + student.totals.late) / totalSessions) * 100)
                              : 0;

                            return (
                              <tr key={student.studentId} className={`group/row transition-colors ${idx % 2 === 0 ? 'bg-white/40 dark:bg-gray-900/40' : 'bg-gray-50/40 dark:bg-gray-950/40'} hover:bg-teal-50/60 dark:hover:bg-teal-500/10`}>
                                <td className="sticky left-0 z-10 bg-inherit backdrop-blur-md px-6 py-5 border-r border-gray-100 dark:border-gray-800">
                                  <div className="flex items-center gap-4">
                                    <div className="relative">
                                      {student.photo ? (
                                        <img src={student.photo} alt="" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm" />
                                      ) : (
                                        <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-inner">
                                          <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                        </div>
                                      )}
                                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-950 shadow-sm ${attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-black text-gray-900 dark:text-white tracking-tight group-hover/row:text-teal-600 dark:group-hover/row:text-teal-400 transition-colors">
                                        {student.firstName} {student.lastName}
                                      </p>
                                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest leading-none mt-1">{student.studentNumber}</p>
                                    </div>
                                  </div>
                                </td>
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                  const day = i + 1;
                                  const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                  const dayAttendance = student.attendance[dateKey];
                                  const morningStatus = dayAttendance?.morning?.status;
                                  const afternoonStatus = dayAttendance?.afternoon?.status;
                                  
                                  return (
                                    <td key={day} className="px-0.5 py-3">
                                      <div className="flex flex-col gap-1.5">
                                        <div className={`text-center text-[10px] font-black py-1 px-1 rounded-lg border transition-all duration-300 ${
                                          morningStatus === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                                          morningStatus === 'ABSENT' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' :
                                          morningStatus === 'LATE' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                                          morningStatus === 'EXCUSED' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                                          morningStatus === 'PERMISSION' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                          morningStatus ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700' : 'bg-transparent text-transparent border-transparent select-none'
                                        }`}>
                                          {getStatusLabel(morningStatus)}
                                        </div>
                                        <div className={`text-center text-[10px] font-black py-1 px-1 rounded-lg border transition-all duration-300 ${
                                          afternoonStatus === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                                          afternoonStatus === 'ABSENT' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' :
                                          afternoonStatus === 'LATE' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                                          afternoonStatus === 'EXCUSED' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                                          afternoonStatus === 'PERMISSION' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                          afternoonStatus ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700' : 'bg-transparent text-transparent border-transparent select-none'
                                        }`}>
                                          {getStatusLabel(afternoonStatus)}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-4 text-center bg-teal-50/50 dark:bg-teal-950/20 border-l border-gray-100 dark:border-gray-800">
                                  <div className="text-[10px] space-y-1.5 font-black uppercase tracking-widest">
                                    <div className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1"><span className="opacity-50 font-medium">P:</span>{student.totals.present}</div>
                                    <div className="text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1"><span className="opacity-50 font-medium">A:</span>{student.totals.absent}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center bg-teal-50/50 dark:bg-teal-950/20">
                                  <div className={`text-sm font-black tracking-tight ${
                                    attendanceRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 
                                    attendanceRate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {attendanceRate}%
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {(!monthlyData?.students || monthlyData.students.length === 0) && (
                      <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No attendance data for this month</p>
                      </div>
                    )}
                  </div>
                </AnimatedContent>
              </>
            )}
          </BlurLoader>
        </div>
      </div>
    </div>
  );
}
