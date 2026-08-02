'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { getAvailableMonthsForGrade, getKhmerMonthDisplayName } from '@/lib/reports/khmerMonthly';
import { attendanceAPI, MonthlyEntryGridItem } from '@/lib/api/attendance';
import { TokenManager } from '@/lib/api/auth';
import { useClasses } from '@/hooks/useClasses';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Home,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  Edit3,
  Users,
  Award,
} from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'PERMISSION' | null;

export default function MonthlyAttendanceEntryPage() {
  const autoT = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { selectedYear, allYears, setSelectedYear, terms } = useAcademicYear();
  const [user, setUser] = useState<any>(null);

  const selectedAcademicYear = selectedYear?.id || '';
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);

  const [gridData, setGridData] = useState<MonthlyEntryGridItem[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set()); // studentId-day

  // Auth check
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    setUser(userData.user);
  }, [locale, router]);

  const { classes } = useClasses({
    academicYearId: selectedAcademicYear || undefined,
    limit: 100,
  });
  const selectedClassObj = classes.find((cls) => cls.id === selectedClass);

  useEffect(() => {
    if (selectedClass && !classes.some((cls) => cls.id === selectedClass)) {
      setSelectedClass('');
      setGridData([]);
    }
  }, [classes, selectedClass]);

  // Available months derived dynamically from AcademicTerm (from context)
  const availableMonths = useMemo(() => {
    const gradeStr = classes.find((c) => c.id === selectedClass)?.grade || '';
    return getAvailableMonthsForGrade(terms, gradeStr);
  }, [terms, classes, selectedClass]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.some((m) => m.number === selectedMonth)) {
      setSelectedMonth(availableMonths[0].number);
    }
  }, [availableMonths, selectedMonth]);

  const monthLabel = useMemo(() => {
    const found = availableMonths.find((m) => m.number === selectedMonth);
    if (found) return getKhmerMonthDisplayName(found.number, found.label, found.isExamMonth, found.termNumber);
    return `Month ${selectedMonth}`;
  }, [availableMonths, selectedMonth]);

  // Calculate actual days in month for column generation
  const academicStartYear = selectedYear?.startDate ? new Date(selectedYear.startDate).getFullYear() : new Date().getFullYear();
  // We approximate the physical year/month for date math. If the month number is 1-12.
  const physicalYear = selectedMonth > 4 ? academicStartYear : academicStartYear + 1; // standard academic year logic
  // Since we only need number of days, we just pass the month 1-12
  const daysInMonth = useMemo(() => {
    const m = selectedMonth > 0 && selectedMonth <= 12 ? selectedMonth : 1;
    return new Date(physicalYear, m, 0).getDate();
  }, [selectedMonth, physicalYear]);

  // Load attendance grid
  const loadGrid = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }

    try {
      setLoadingGrid(true);
      const data = await attendanceAPI.getMonthlyEntryGrid(selectedClass, selectedMonth, academicStartYear);
      setGridData(data);
      setPendingUpdates(new Set());
    } catch (error) {
      console.error('Failed to load attendance grid:', error);
      alert('Failed to load attendance grid. Please try again.');
    } finally {
      setLoadingGrid(false);
    }
  };

  const getNextStatus = (current: string | undefined | null): string | null => {
    switch (current) {
      case 'ABSENT': return 'PERMISSION';
      case 'PERMISSION': return 'PRESENT';
      case 'PRESENT': return null;
      default: return 'ABSENT';
    }
  };

  const getStatusLabel = (status: string | undefined | null) => {
    switch (status) {
      case 'PRESENT': return 'P';
      case 'ABSENT': return 'A';
      case 'PERMISSION': return 'S'; // S = Sabab / Xin
      default: return '';
    }
  };

  const getStatusTone = (status: string | undefined | null) => {
    switch (status) {
      case 'PRESENT': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'ABSENT': return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'PERMISSION': return 'border-amber-200 bg-amber-50 text-amber-700';
      default: return 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-transparent';
    }
  };

  const handleCellClick = useCallback(async (studentId: string, day: number) => {
    const student = gridData.find(s => s.studentId === studentId);
    if (!student) return;

    const currentStatus = student.attendance[day] as string | undefined;
    const nextStatus = getNextStatus(currentStatus);

    // Optimistic update
    setGridData(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      const newAttendance = { ...s.attendance };
      if (nextStatus) {
        newAttendance[day] = nextStatus;
      } else {
        delete newAttendance[day];
      }
      return { ...s, attendance: newAttendance };
    }));

    const updateKey = `${studentId}-${day}`;
    setPendingUpdates(prev => {
      const next = new Set(prev);
      next.add(updateKey);
      return next;
    });
    
    setSaveStatus('saving');

    try {
      await attendanceAPI.updateMonthlyEntryCell(
        selectedClass,
        selectedMonth,
        academicStartYear,
        monthLabel,
        studentId,
        day,
        nextStatus
      );
      setPendingUpdates(prev => {
        const next = new Set(prev);
        next.delete(updateKey);
        return next;
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save cell:', error);
      setSaveStatus('error');
      // Revert on error
      setGridData(prev => prev.map(s => {
        if (s.studentId !== studentId) return s;
        const newAttendance = { ...s.attendance };
        if (currentStatus) {
          newAttendance[day] = currentStatus;
        } else {
          delete newAttendance[day];
        }
        return { ...s, attendance: newAttendance };
      }));
      setPendingUpdates(prev => {
        const next = new Set(prev);
        next.delete(updateKey);
        return next;
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [gridData, selectedClass, selectedMonth, academicStartYear, monthLabel]);

  // Derived stats
  const selectedYearLabel = selectedYear?.name || 'Choose academic year';
  const selectedClassName = selectedClassObj?.name || 'Choose class';

  let totalAbsent = 0;
  let totalPermission = 0;
  let studentsRecorded = 0;

  gridData.forEach(s => {
    let hasRecord = false;
    Object.values(s.attendance).forEach(status => {
      if (status) hasRecord = true;
      if (status === 'ABSENT') totalAbsent++;
      if (status === 'PERMISSION') totalPermission++;
    });
    if (hasRecord) studentsRecorded++;
  });

  const completionRate = gridData.length > 0 ? Math.round((studentsRecorded / gridData.length) * 100) : 0;

  const metricCards = [
    {
      label: 'Loaded',
      value: gridData.length,
      hint: 'Students in grid',
      tone: 'from-sky-500 via-blue-500 to-cyan-500',
      Icon: Users,
    },
    {
      label: 'Recorded',
      value: studentsRecorded,
      hint: 'Students with data',
      tone: 'from-emerald-500 via-teal-500 to-cyan-500',
      Icon: CheckCircle,
    },
    {
      label: 'Absent',
      value: totalAbsent,
      hint: 'Total absent days',
      tone: 'from-rose-500 via-pink-500 to-fuchsia-500',
      Icon: XCircle,
    },
    {
      label: 'Permission',
      value: totalPermission,
      hint: 'Total permission days',
      tone: 'from-orange-500 via-amber-500 to-yellow-500',
      Icon: ClipboardCheck,
    },
  ];

  return (
    <>
      <UnifiedNavigation user={user} />

      {/* Floating save status toast */}
      {saveStatus !== 'idle' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-300">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-blue-950/10 backdrop-blur-xl ${
              saveStatus === 'saving' || pendingUpdates.size > 0
                ? 'border-blue-200 bg-white text-blue-700'
                : saveStatus === 'saved'
                  ? 'border-emerald-300 bg-white text-emerald-700'
                  : 'border-rose-300 bg-white text-rose-700'
            }`}
          >
            <div className="rounded-xl bg-slate-950/5 p-2">
              {(saveStatus === 'saving' || pendingUpdates.size > 0) && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveStatus === 'saved' && pendingUpdates.size === 0 && <CheckCircle className="h-4 w-4" />}
              {saveStatus === 'error' && <XCircle className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em]">
                {saveStatus === 'saving' || pendingUpdates.size > 0 ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Error'}
              </p>
              <p className="text-xs text-slate-500">
                {saveStatus === 'saving' || pendingUpdates.size > 0
                  ? `Syncing ${pendingUpdates.size} changes...`
                  : saveStatus === 'saved'
                    ? 'Monthly attendance is up to date'
                    : 'Please retry the last change'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)] text-slate-900 transition-colors duration-500 lg:ml-64">
        <main className="mx-auto max-w-[1600px] p-4 lg:p-8">

          {/* Header section + control panel */}
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              {/* Left: Header card */}
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500/70">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-slate-600">
                    <Home className="h-3.5 w-3.5" />
                    Attendance
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-slate-900">Monthly Entry</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Monthly Attendance Entry
                  </h1>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-800">
                    {selectedYearLabel}
                  </div>
                  <div className="rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-800">
                    {selectedClassName}
                  </div>
                  <div className="rounded-full border border-violet-200/70 bg-violet-50/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-violet-800">
                    {monthLabel}
                  </div>
                </div>

                {/* Filter controls */}
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {/* Year */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Year
                    </label>
                    <select
                      value={selectedAcademicYear}
                      onChange={(e) => {
                        const year = allYears.find((item) => item.id === e.target.value);
                        if (year) setSelectedYear(year);
                      }}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Choose year</option>
                      {allYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name} {year.isCurrent && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      disabled={!selectedAcademicYear}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                    >
                      <option value="">Choose class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      {availableMonths.length > 0 ? (
                        availableMonths.map((month) => (
                          <option key={month.number} value={month.number}>
                            {getKhmerMonthDisplayName(month.number, month.label, month.isExamMonth, month.termNumber)}
                          </option>
                        ))
                      ) : (
                        Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            Month {m}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Load button */}
                  <div className="col-span-2 flex items-end sm:col-span-1">
                    <button
                      onClick={loadGrid}
                      disabled={!selectedClass || loadingGrid}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {loadingGrid ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                      {loadingGrid ? 'Loading' : 'Load Grid'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Pulse card */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Grid pulse</p>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                  {gridData.length > 0 ? `${completionRate}%` : '0%'}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-700"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{gridData.length}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Students</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{totalAbsent}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Absent</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{pendingUpdates.size}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pending</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  {loadingGrid
                    ? 'Loading attendance grid'
                    : gridData.length > 0
                      ? `${studentsRecorded} of ${gridData.length} students recorded`
                      : 'Select class to begin'}
                </div>
              </div>
            </section>
          </AnimatedContent>

          {/* Metric cards */}
          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => (
                <div
                  key={card.label}
                  className={`relative min-h-[128px] overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm ${card.tone}`}
                >
                  <div className="relative flex items-start justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">{card.label}</p>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white backdrop-blur-sm">
                      <card.Icon className="h-4.5 w-4.5" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.2),transparent_45%)]" />
                  <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-36 rounded-full border border-white/25" />
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{card.value}</p>
                  <p className="relative mt-1 text-sm text-white/90">{card.hint}</p>
                </div>
              ))}
            </section>
          </AnimatedContent>

          {/* Attendance grid table */}
          <AnimatedContent animation="slide-up" delay={80}>
            <section className="mt-5">
              <BlurLoader
                isLoading={loadingGrid}
                skeleton={
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Student</th>
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(day => (
                              <th key={day} className="px-2 py-4 text-center text-[11px] font-black uppercase text-slate-400">{day}</th>
                            ))}
                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <TableSkeleton rows={10} />
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              >
                {gridData.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* Table header bar */}
                    <div className="flex flex-col gap-4 border-b border-blue-100 bg-blue-50/35 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Attendance Grid</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                          {selectedClassName}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          {selectedYearLabel} • {monthLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          ['A = Absent', 'border-rose-200 bg-rose-50 text-rose-700'],
                          ['S = Sabab', 'border-amber-200 bg-amber-50 text-amber-700'],
                          ['P = Present', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
                        ].map(([label, tone]) => (
                          <span key={label} className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto relative">
                      <table className="w-full text-left min-w-max border-collapse">
                        <thead className="sticky top-0 z-20 border-b border-blue-100 bg-blue-50">
                          <tr>
                            <th className="sticky left-0 z-30 min-w-[240px] border-r border-blue-100 bg-blue-50 px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 backdrop-blur">
                              Student
                            </th>
                            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
                              <th key={day} className="min-w-[40px] px-1 py-4 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {day}
                              </th>
                            ))}
                            <th className="bg-blue-100/50 min-w-[80px] px-3 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">
                              Absent
                            </th>
                            <th className="bg-blue-100/50 min-w-[80px] px-3 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">
                              Perm.
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {gridData.map((item, index) => {
                            let stuAbsent = 0;
                            let stuPerm = 0;
                            Object.values(item.attendance).forEach(st => {
                              if (st === 'ABSENT') stuAbsent++;
                              if (st === 'PERMISSION') stuPerm++;
                            });

                            return (
                              <tr
                                key={item.studentId}
                                className="group transition hover:bg-slate-50"
                              >
                                <td className="sticky left-0 z-10 border-r border-slate-100 bg-white group-hover:bg-slate-50 px-5 py-3 backdrop-blur transition-colors">
                                  <div className="flex items-center gap-3">
                                    <span className="flex w-6 shrink-0 justify-end text-[11px] font-black text-slate-400">
                                      {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                                        {item.lastName} {item.firstName}
                                      </p>
                                      <p className="truncate mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        {item.studentCode || '-'} • {item.gender}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                                  const status = item.attendance[day] as string | undefined;
                                  const isPending = pendingUpdates.has(`${item.studentId}-${day}`);
                                  
                                  return (
                                    <td key={day} className="px-1 py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleCellClick(item.studentId, day)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-black transition-all mx-auto select-none ${getStatusTone(status)} ${isPending ? 'opacity-50 animate-pulse' : ''}`}
                                      >
                                        {getStatusLabel(status) || <span className="opacity-0">-</span>}
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="bg-slate-50/50 px-3 py-2 text-center">
                                  <span className="text-sm font-black text-rose-600">{stuAbsent}</span>
                                </td>
                                <td className="bg-slate-50/50 px-3 py-2 text-center">
                                  <span className="text-sm font-black text-amber-600">{stuPerm}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-100 bg-white">
                      <AlertCircle className="h-7 w-7 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">No Data Loaded</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                      Select a class and month, then click "Load Grid" to start entering monthly attendance data.
                    </p>
                  </div>
                )}
              </BlurLoader>
            </section>
          </AnimatedContent>

          {/* Keyboard shortcuts hint */}
          <AnimatedContent animation="fade" delay={160}>
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-cyan-700">
                      <Edit3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Productivity</p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">How to use Grid</h3>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 text-slate-300 transition duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Usage</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Click any cell to toggle status</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Changes are saved instantly</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Cycle Order</p>
                    <div className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold">
                      <span className="rounded border px-2 py-1 text-slate-400">Empty</span>
                      <span className="text-slate-300">→</span>
                      <span className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">A</span>
                      <span className="text-slate-300">→</span>
                      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">S</span>
                      <span className="text-slate-300">→</span>
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">P</span>
                    </div>
                  </div>
                </div>
              </details>
            </section>
          </AnimatedContent>

        </main>
      </div>
    </>
  );
}
