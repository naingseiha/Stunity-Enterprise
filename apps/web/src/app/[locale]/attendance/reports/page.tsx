'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  User,
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

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'sky' | 'emerald' | 'rose' | 'amber' | 'teal';
}) {
  const tones = {
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/35',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/35',
    rose: 'border-rose-100/80 bg-gradient-to-br from-white via-rose-50/80 to-pink-50/70 shadow-rose-100/35',
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/35',
    teal: 'border-teal-100/80 bg-gradient-to-br from-white via-teal-50/80 to-cyan-50/70 shadow-teal-100/35',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function getStatusLabel(status: string | undefined) {
  if (!status) return '';
  switch (status) {
    case 'PRESENT':
      return 'P';
    case 'ABSENT':
      return 'A';
    case 'LATE':
      return 'L';
    case 'EXCUSED':
      return 'E';
    case 'PERMISSION':
      return 'S';
    default:
      return '';
  }
}

function getStatusTone(status: string | undefined) {
  switch (status) {
    case 'PRESENT':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'ABSENT':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'LATE':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'EXCUSED':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    case 'PERMISSION':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    default:
      return 'border-transparent bg-transparent text-transparent';
  }
}

export default function AttendanceReportsPage() {
  const router = useRouter();
  const locale = useLocale();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsClient(true);
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
      return;
    }
    router.push(`/${locale}/auth/login`);
  }, [locale, router]);

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

  const loadMonthlyAttendance = useCallback(async () => {
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
        setMonthlyData(null);
        setError(result.message || 'Failed to load attendance data');
      }
    } catch (err: any) {
      setMonthlyData(null);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedClass && selectedMonth && selectedYear) {
      loadMonthlyAttendance();
    }
  }, [loadMonthlyAttendance, selectedClass, selectedMonth, selectedYear]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((current) => current - 1);
    } else {
      setSelectedMonth((current) => current - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((current) => current + 1);
    } else {
      setSelectedMonth((current) => current + 1);
    }
  };

  const statistics = useMemo(() => {
    if (!monthlyData?.students?.length) {
      return {
        totalStudents: 0,
        avgAttendance: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalLogged: 0,
      };
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalSessions = 0;

    monthlyData.students.forEach((student) => {
      totalPresent += student.totals.present;
      totalAbsent += student.totals.absent;
      totalLate += student.totals.late;
      totalSessions +=
        student.totals.present +
        student.totals.absent +
        student.totals.late +
        student.totals.excused +
        student.totals.permission;
    });

    const avgAttendance = totalSessions > 0 ? Math.round(((totalPresent + totalLate) / totalSessions) * 100) : 0;

    return {
      totalStudents: monthlyData.students.length,
      avgAttendance,
      totalPresent,
      totalAbsent,
      totalLate,
      totalLogged: totalSessions,
    };
  }, [monthlyData]);

  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0).getDate(), [selectedMonth, selectedYear]);
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
  const selectedClassData = classes.find((item) => item.id === selectedClass);
  const readyRate = monthlyData?.students?.length ? Math.min(100, statistics.avgAttendance) : 0;

  if (!isClient || !user || !school) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)] px-6">
        <div className="rounded-[1.75rem] border border-white/75 bg-white/92 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading attendance reporting workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.15),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_52%,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                eyebrow="Reporting Suite"
                title="Attendance reports"
                description="Review monthly attendance quality by class."
                icon={ClipboardCheck}
                backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(236,253,245,0.96)_48%,rgba(224,242,254,0.9))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.18),transparent_58%)]"
                eyebrowClassName="text-teal-700"
                actions={
                  <button
                    onClick={loadMonthlyAttendance}
                    disabled={loading || !selectedClass}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Report
                  </button>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-teal-200/70 bg-[linear-gradient(145deg,rgba(17,94,89,0.98),rgba(13,148,136,0.95)_52%,rgba(8,145,178,0.9))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(15,118,110,0.5)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-teal-50/80">Report Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{readyRate}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-teal-50/75">Ready</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <ClipboardCheck className="h-7 w-7 text-teal-50" />
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-sky-200"
                    style={{ width: `${readyRate}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Class', value: selectedClassData?.name || '--' },
                    { label: 'Month', value: monthName.slice(0, 3) },
                    { label: 'Logged', value: statistics.totalLogged },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                      <p className="truncate text-lg font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-teal-50/80">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-50/90">
                  {monthName}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/92 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Controls</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Attendance report filters</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">Choose the academic year, class, and month you want to inspect.</p>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Academic Year</span>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  >
                    <option value="">Select Year</option>
                    {allYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Class</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={!selectedAcademicYear || classes.length === 0}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:opacity-60"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[1.2rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                  <p className="px-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Month</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={goToPreviousMonth}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[0.95rem] border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-950">
                      {monthName} {selectedYear}
                    </div>
                    <button
                      onClick={goToNextMonth}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[0.95rem] border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <BlurLoader isLoading={loading} showSpinner={false}>
            {error ? (
              <AnimatedContent delay={0.06}>
                <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                  <div className="rounded-xl bg-rose-100 p-2">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                    <p className="mt-1 text-sm font-medium">{error}</p>
                  </div>
                  <button
                    onClick={loadMonthlyAttendance}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Retry
                  </button>
                </div>
              </AnimatedContent>
            ) : !selectedClass ? (
              <AnimatedContent delay={0.06}>
                <div className="mt-5 rounded-[1.75rem] border border-white/75 bg-white/92 px-6 py-20 text-center shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-slate-50 shadow-sm ring-1 ring-slate-200/80">
                    <Calendar className="h-8 w-8 text-slate-300" />
                  </div>
                  <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">Select a class to view the report</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">Choose a class above to load monthly attendance details.</p>
                </div>
              </AnimatedContent>
            ) : (
              <>
                <AnimatedContent delay={0.08}>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard label="Students" value={statistics.totalStudents} helper="Roster size in this report" tone="sky" />
                    <MetricCard label="Avg Rate" value={`${statistics.avgAttendance}%`} helper="Average attendance score" tone="teal" />
                    <MetricCard label="Present" value={statistics.totalPresent} helper="Present sessions logged" tone="emerald" />
                    <MetricCard label="Absent" value={statistics.totalAbsent} helper="Absence sessions recorded" tone="rose" />
                    <MetricCard label="Late" value={statistics.totalLate} helper="Late sessions recorded" tone="amber" />
                  </div>
                </AnimatedContent>

                <AnimatedContent delay={0.1}>
                  <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/92 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                    <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Monthly Grid</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{selectedClassData?.name || 'Attendance report'}</h2>
                        <p className="mt-2 text-sm font-medium text-slate-500">Daily attendance markers for {monthName} {selectedYear}.</p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                        {[
                          ['P = Present', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
                          ['A = Absent', 'border-rose-200 bg-rose-50 text-rose-700'],
                          ['L = Late', 'border-amber-200 bg-amber-50 text-amber-700'],
                          ['E = Excused', 'border-indigo-200 bg-indigo-50 text-indigo-700'],
                          ['S = Permission', 'border-violet-200 bg-violet-50 text-violet-700'],
                        ].map(([label, tone]) => (
                          <span key={label} className={`inline-flex rounded-full border px-3 py-1.5 ${tone}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1200px] text-left">
                        <thead className="bg-slate-50/80">
                          <tr>
                            <th className="sticky left-0 z-20 min-w-[260px] border-r border-slate-200/70 bg-slate-50/95 px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 backdrop-blur">
                              Student
                            </th>
                            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
                              <th key={day} className="px-2 py-4 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {day}
                              </th>
                            ))}
                            <th className="bg-teal-50/60 px-5 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-teal-600">Totals</th>
                            <th className="bg-teal-50/60 px-5 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-teal-600">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 bg-white/70">
                          {monthlyData?.students?.map((student) => {
                            const totalSessions =
                              student.totals.present +
                              student.totals.absent +
                              student.totals.late +
                              student.totals.excused +
                              student.totals.permission;
                            const attendanceRate =
                              totalSessions > 0
                                ? Math.round(((student.totals.present + student.totals.late) / totalSessions) * 100)
                                : 0;

                            return (
                              <tr key={student.studentId} className="transition hover:bg-slate-50/60">
                                <td className="sticky left-0 z-10 border-r border-slate-200/70 bg-white/95 px-5 py-4 backdrop-blur">
                                  <div className="flex items-center gap-4">
                                    <div className="relative">
                                      {student.photo ? (
                                        <img
                                          src={student.photo}
                                          alt=""
                                          className="h-11 w-11 rounded-[0.95rem] object-cover ring-1 ring-slate-200/80"
                                        />
                                      ) : (
                                        <div className="flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-slate-100 ring-1 ring-slate-200/80">
                                          <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                      )}
                                      <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-950">{student.firstName} {student.lastName}</p>
                                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{student.studentNumber}</p>
                                    </div>
                                  </div>
                                </td>
                                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                                  const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                  const dayAttendance = student.attendance[dateKey];
                                  const morningStatus = dayAttendance?.morning?.status;
                                  const afternoonStatus = dayAttendance?.afternoon?.status;

                                  return (
                                    <td key={day} className="px-1 py-3">
                                      <div className="flex flex-col gap-1.5">
                                        <div className={`flex h-6 items-center justify-center rounded-[0.65rem] border text-[10px] font-black ${getStatusTone(morningStatus)}`}>
                                          {getStatusLabel(morningStatus) || <span className="opacity-0">-</span>}
                                        </div>
                                        <div className={`flex h-6 items-center justify-center rounded-[0.65rem] border text-[10px] font-black ${getStatusTone(afternoonStatus)}`}>
                                          {getStatusLabel(afternoonStatus) || <span className="opacity-0">-</span>}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="bg-teal-50/40 px-5 py-4 text-center">
                                  <div className="space-y-1 text-[11px] font-black uppercase tracking-[0.16em]">
                                    <div className="text-emerald-600">P: {student.totals.present}</div>
                                    <div className="text-rose-600">A: {student.totals.absent}</div>
                                  </div>
                                </td>
                                <td className="bg-teal-50/40 px-5 py-4 text-center">
                                  <span className={`text-sm font-black ${attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {attendanceRate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {(!monthlyData?.students || monthlyData.students.length === 0) && (
                      <div className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-slate-50 shadow-sm ring-1 ring-slate-200/80">
                          <Calendar className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950">No attendance data for this month</h3>
                        <p className="mt-2 text-sm font-medium text-slate-500">Try another class or month to review attendance history.</p>
                      </div>
                    )}
                  </section>
                </AnimatedContent>
              </>
            )}
          </BlurLoader>
        </main>
      </div>
    </div>
  );
}
