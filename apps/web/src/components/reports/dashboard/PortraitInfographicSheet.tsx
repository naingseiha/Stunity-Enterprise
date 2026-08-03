'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  GraduationCap,
  Heart,
  Medal,
  School,
  Sparkles,
  Star,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  User,
  Bookmark,
  Check,
  XCircle,
  PieChart,
  LayoutGrid,
  Layers,
  Sparkle,
  Compass,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import type { SchoolReportsDashboardResponse } from '@/lib/api/reports';
import { toKhmerDigits } from '@/lib/reports/templates/khm-moeys/khmer-date';

interface PortraitInfographicSheetProps {
  data: SchoolReportsDashboardResponse;
  locale: string;
  schoolName: string;
  className?: string;
  gradeFilter?: string;
  generatedAtLabel: string;
  onSelectClass?: (classId: string) => void;
  onSelectStudent?: (studentId: string) => void;
}

export default function PortraitInfographicSheet({
  data,
  locale,
  schoolName,
  className,
  gradeFilter,
  generatedAtLabel,
  onSelectClass,
  onSelectStudent,
}: PortraitInfographicSheetProps) {
  const isKhmer = locale === 'km';
  const [layoutStyle, setLayoutStyle] = useState<'poster' | 'analytics' | 'classes'>('poster');

  // Overview metrics
  const totalStudents = data.overview?.totalStudents ?? 0;
  const totalClasses = data.overview?.totalClasses ?? 0;
  const totalTeachers = data.overview?.totalTeachers ?? 0;
  const femaleTeachers = data.overview?.femaleTeachers ?? 0;
  const attendanceRate = Math.round(data.overview?.attendanceRate ?? 0);

  const overallAvg = useMemo(() => {
    if (data.averageScoreByClass?.length) {
      const valid = data.averageScoreByClass.filter((c) => c.average > 0);
      if (valid.length > 0) {
        const sum = valid.reduce((acc, c) => acc + c.average, 0);
        return Number((sum / valid.length).toFixed(2));
      }
    }
    if (data.averageScoreByGradeLevel?.length) {
      const valid = data.averageScoreByGradeLevel.filter((g) => g.average > 0);
      if (valid.length > 0) {
        const sum = valid.reduce((acc, g) => acc + g.average, 0);
        return Number((sum / valid.length).toFixed(2));
      }
    }
    return 0;
  }, [data.averageScoreByClass, data.averageScoreByGradeLevel]);

  // Pass rate
  const passRatePercent = data.passRate?.passRatePercent
    ? Math.round(data.passRate.passRatePercent)
    : 0;
  const passingCount = data.passRate?.passing ?? 0;
  const failingCount = data.passRate?.failing ?? 0;

  // Gender
  const femaleCount = data.genderBreakdown?.female?.count ?? 0;
  const femalePercent = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0;

  // Scope title formatting
  const scopeTitle = useMemo(() => {
    if (className) return isKhmer ? `ថ្នាក់ ${className}` : `Class ${className}`;
    if (gradeFilter) return isKhmer ? `កម្រិតថ្នាក់ទី ${toKhmerDigits(gradeFilter)} (គ្រប់ថ្នាក់)` : `Grade ${gradeFilter} (All Classes)`;
    return isKhmer ? 'គ្រប់កម្រិត (៧-១២)' : 'All Grades (7-12)';
  }, [className, gradeFilter, isKhmer]);

  // Active Classes filtered by grade
  const activeClasses = useMemo(() => {
    if (!gradeFilter) return data.averageScoreByClass;
    return data.averageScoreByClass.filter((c) => String(c.grade) === String(gradeFilter));
  }, [data.averageScoreByClass, gradeFilter]);

  // Selected Grade's Top 10 Students Overall
  const top10GradeStudents = useMemo(() => {
    const list: Array<{ rank: number; studentId: string; name: string; khmerName: string | null; average: number; className?: string }> = [];
    
    activeClasses.forEach((cls) => {
      cls.topStudents?.forEach((st) => {
        list.push({ ...st, className: cls.className });
      });
    });

    if (list.length > 0) {
      return list.sort((a, b) => b.average - a.average).slice(0, 10).map((s, idx) => ({ ...s, rank: idx + 1 }));
    }

    if (gradeFilter) {
      const targetGrade = data.topStudentsByGrade.find((g) => String(g.grade) === String(gradeFilter));
      if (targetGrade?.students?.length) return targetGrade.students.slice(0, 10);
    }

    data.topStudentsByGrade.forEach((g) => {
      g.students?.forEach((st) => list.push(st));
    });
    return list.sort((a, b) => b.average - a.average).slice(0, 10).map((s, idx) => ({ ...s, rank: idx + 1 }));
  }, [activeClasses, data.topStudentsByGrade, gradeFilter]);

  // Aggregate Grade Bands (A, B, C, D, E, F) totals & female counts across active classes
  const aggregateGradeBands = useMemo(() => {
    const counts = {
      A: { total: 0, female: 0, color: '#3b82f6', bg: 'bg-blue-500' },
      B: { total: 0, female: 0, color: '#6366f1', bg: 'bg-indigo-500' },
      C: { total: 0, female: 0, color: '#0ea5e9', bg: 'bg-sky-500' },
      D: { total: 0, female: 0, color: '#f59e0b', bg: 'bg-amber-500' },
      E: { total: 0, female: 0, color: '#f97316', bg: 'bg-orange-500' },
      F: { total: 0, female: 0, color: '#ef4444', bg: 'bg-rose-500' },
    };

    activeClasses.forEach((cls) => {
      cls.gradeDistribution?.forEach((d) => {
        if (counts[d.grade]) {
          counts[d.grade].total += d.total;
          counts[d.grade].female += d.female;
        }
      });
    });

    const grandTotal = Object.values(counts).reduce((acc, curr) => acc + curr.total, 0) || 1;

    return Object.entries(counts).map(([grade, val]) => ({
      grade,
      total: val.total,
      female: val.female,
      percent: Math.round((val.total / grandTotal) * 100),
      color: val.color,
      bg: val.bg,
    }));
  }, [activeClasses]);

  // Subjects sorted by score
  const subjects = useMemo(() => {
    const list = [...(data.averageScoreBySubject || [])];
    return list.sort((a, b) => (b.average || 0) - (a.average || 0));
  }, [data.averageScoreBySubject]);

  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6 md:p-8">
      {/* Main Poster Container Card */}
      <div className="relative z-10 space-y-6">
        
        {/* LAYOUT STYLE SELECTOR BAR AT THE TOP */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setLayoutStyle('poster')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                layoutStyle === 'poster'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>{isKhmer ? 'ម៉ូដ ១: Poster Infographic' : 'Layout 1: Glass Poster'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutStyle('analytics')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                layoutStyle === 'analytics'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <PieChart className="h-4 w-4" />
              <span>{isKhmer ? 'ម៉ូដ ២: Pie, Bar Charts & Graphics' : 'Layout 2: Charts & Graphics'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutStyle('classes')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                layoutStyle === 'classes'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <School className="h-4 w-4" />
              <span>{isKhmer ? 'ម៉ូដ ៣: Class Roster & Grades A-F' : 'Layout 3: Class Roster & Bands'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-gray-400">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{isKhmer ? 'របាយការណ៍សាលារៀន ២០២៦' : 'School Infographic Report 2026'}</span>
          </div>
        </div>

        {/* TOP INFOGRAPHIC TITLE & BRANDING HEADER */}
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md shadow-purple-500/20">
                <Sparkles className="h-3.5 w-3.5" />
                {isKhmer ? 'របាយការណ៍ព័ត៌មានវិទ្យា' : 'INFOGRAPHIC REPORT'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <School className="h-3.5 w-3.5" />
                {scopeTitle}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {isKhmer ? 'របាយការណ៍ស្ថានភាពសាលារៀន' : 'SCHOOL PERFORMANCE SHEET'}
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {schoolName} · {data.period.khmerLabel || data.period.label} · {isKhmer ? 'បង្កើតនៅ' : 'Generated'}: {generatedAtLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-gray-800 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-gray-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {isKhmer ? 'ទិន្នន័យផ្លូវការ២០២៦' : 'Official Data 2026'}
              </div>
            </div>
          </div>
        </header>

        {/* ------------------- LAYOUT STYLE 1: POSTER INFOGRAPHIC (MATCHING USER REFERENCE IMAGE) ------------------- */}
        {layoutStyle === 'poster' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* HERO CARD MATCHING THE EXACT "JESSICA GOOD MORNING" CARD IN REFERENCE SCREENSHOT */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              
              {/* LEFT BIG TITLE BLOCK ("GLASSMORPHISM UI" STYLE) */}
              <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-gray-800 dark:bg-gray-800/60 lg:col-span-5">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter text-indigo-900 dark:text-indigo-200 sm:text-5xl">
                    STUNITY <br />
                    <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">REPORT</span>
                  </h2>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {isKhmer
                      ? 'ទម្រង់របាយការណ៍ព័ត៌មានវិទ្យាបែប Glassmorphic ដែលបង្ហាញទិន្នន័យរួម, សិស្សពូកែ Top 10, ភាគរយសិស្សជាប់/ធ្លាក់, និងនិទ្ទេស A-F យ៉ាងច្បាស់លាស់។'
                      : 'The frosted glass design trend that adds depth and elegance to school reporting analytics.'}
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-purple-50/60 p-4 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                      <School className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">{isKhmer ? 'កម្រិតថ្នាក់បច្ចុប្បន្ន' : 'CURRENT SCOPE'}</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{scopeTitle}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT HERO DASHBOARD CARD ("GOOD MORNING JESSICA" REPLICATION) */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-gray-800 dark:bg-gray-800/60 lg:col-span-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">{isKhmer ? 'សួស្តីលោកនាយក!' : 'Good day,'}</p>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{schoolName}</h3>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isKhmer ? 'ទិន្នន័យផ្លូវការ' : 'Official Data'}
                  </span>
                </div>

                {/* TWO CARDS INSIDE HERO MATCHING SCREENSHOT ("TOTAL BALANCE" & "TOTAL SPENDING") */}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  
                  {/* CARD 1: OVERALL AVERAGE WITH WAVE GRAPHIC */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <p className="text-[11px] font-bold text-slate-400">{isKhmer ? 'មធ្យមភាគសរុប' : 'Overall Average'}</p>
                    <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white tabular-nums">
                      {isKhmer ? toKhmerDigits(overallAvg) : overallAvg} <span className="text-xs font-bold text-slate-400">/ 50</span>
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-emerald-600">▲ +{passRatePercent}% {isKhmer ? 'អត្រាជាប់' : 'Pass Rate'}</p>

                    {/* Smooth Wave SVG */}
                    <div className="mt-2 h-10 w-full opacity-80">
                      <svg viewBox="0 0 200 40" className="h-full w-full" preserveAspectRatio="none">
                        <path d="M0 25 C30 10, 60 35, 90 15 C120 -5, 150 25, 180 10 L200 20 L200 40 L0 40 Z" fill="url(#hero-blue-grad)" opacity="0.2" />
                        <path d="M0 25 C30 10, 60 35, 90 15 C120 -5, 150 25, 180 10 L200 20" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="hero-blue-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* CARD 2: PASS RATE WITH DONUT PIE RING */}
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400">{isKhmer ? 'អត្រាជាប់សិស្ស' : 'Student Pass Rate'}</p>
                      <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white tabular-nums">
                        {isKhmer ? toKhmerDigits(passRatePercent) : passRatePercent}%
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-rose-500">▼ {isKhmer ? `ធ្លាក់ ${toKhmerDigits(failingCount)}` : `${failingCount} fail`}</p>
                    </div>

                    {/* Donut Ring */}
                    <div className="relative h-16 w-16 shrink-0">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-purple-100 dark:text-purple-950/60" strokeWidth="4.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-purple-600 dark:text-purple-400" strokeDasharray={`${passRatePercent}, 100`} strokeWidth="4.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-purple-700 dark:text-purple-300">
                        {passRatePercent}%
                      </div>
                    </div>
                  </div>

                </div>

                {/* BOTTOM NAVIGATION BAR SIMULATION */}
                <div className="mt-4 flex items-center justify-around rounded-xl bg-indigo-50/70 p-2 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {totalStudents} {isKhmer ? 'សិស្ស' : 'Students'}</span>
                  <span className="flex items-center gap-1"><School className="h-4 w-4" /> {totalClasses} {isKhmer ? 'ថ្នាក់' : 'Classes'}</span>
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {totalTeachers} {isKhmer ? 'គ្រូ' : 'Faculty'}</span>
                </div>

              </div>

            </div>

            {/* SECTION 1: TOP 10 STUDENTS FOR ENTIRE GRADE LEVEL */}
            <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3 dark:border-amber-900/40">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                    <Crown className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {isKhmer ? `១. សិស្សពូកែ Top 10 សម្រាប់កម្រិតរួម (${scopeTitle})` : `1. Top 10 Students for ${scopeTitle}`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isKhmer ? 'សិស្សដែលមានមធ្យមភាគពិន្ទុខ្ពស់បំផុតទាំង ១០ នាក់ទូទាំងកម្រិតថ្នាក់' : 'Top 10 students across all classes'}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  TOP 10
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {top10GradeStudents.map((st, idx) => {
                  const rank = idx + 1;
                  const badgeBg = rank === 1 ? 'bg-amber-500 text-white ring-2 ring-amber-300' : rank === 2 ? 'bg-slate-400 text-white' : rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

                  return (
                    <div
                      key={st.studentId || idx}
                      className={`relative flex flex-col justify-between rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${
                        rank === 1
                          ? 'border-amber-300 bg-amber-50/90 shadow-sm dark:border-amber-800 dark:bg-amber-950/30'
                          : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${badgeBg}`}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400">
                          {st.className ? (isKhmer ? `ថ្នាក់ ${st.className}` : st.className) : ''}
                        </span>
                      </div>

                      <div className="my-2.5">
                        <p className="line-clamp-1 text-xs font-black text-slate-900 dark:text-white" title={st.khmerName || st.name}>
                          {st.khmerName || st.name}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[11px] dark:border-slate-800">
                        <span className="font-bold text-slate-400">{isKhmer ? 'មធ្យមភាគ' : 'Avg'}</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {isKhmer ? toKhmerDigits(st.average) : st.average} / 50
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECTION 2: TOP 5 STUDENTS PER CLASS */}
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-gray-800 dark:bg-gray-800/60">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                  <Medal className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isKhmer ? '២. សិស្សពូកែ Top 5 តាមថ្នាក់នីមួយៗ (Top 5 Per Class)' : '2. Top 5 Students Per Class'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKhmer ? 'សិស្សដែលមានមធ្យមភាគពិន្ទុខ្ពស់ជាងគេ ៥ នាក់ក្នុងថ្នាក់នីមួយៗ' : 'Top 5 ranking students in each class'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeClasses.map((cls) => {
                  const top5 = cls.topStudents || [];
                  return (
                    <div key={cls.classId} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-800/60">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-black text-white">
                            {cls.className}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {isKhmer ? `ថ្នាក់ ${cls.className}` : cls.className}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          {isKhmer ? `មធ្យមភាគថ្នាក់៖ ${toKhmerDigits(cls.average)}` : `Avg: ${cls.average}`}
                        </span>
                      </div>

                      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/60">
                        {top5.length > 0 ? (
                          top5.map((st, idx) => (
                            <div key={st.studentId || idx} className="flex items-center justify-between py-1.5 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                                  idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="truncate font-bold text-slate-800 dark:text-slate-200" title={st.khmerName || st.name}>
                                  {st.khmerName || st.name}
                                </span>
                              </div>
                              <span className="shrink-0 font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {isKhmer ? toKhmerDigits(st.average) : st.average}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="py-3 text-center text-xs font-semibold text-slate-400">{isKhmer ? 'មិនទាន់មានទិន្នន័យ' : 'No data'}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        )}

        {/* ------------------- LAYOUT STYLE 2: PIE & BAR CHARTS & GRAPHICS ------------------- */}
        {layoutStyle === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* TOP ROW: PIE CHART & BAR CHART */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              
              {/* SVG DONUT PIE CHART FOR GRADE DISTRIBUTION A-F */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-gray-800 dark:bg-gray-800/60 lg:col-span-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-600" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKhmer ? 'និទ្ទេស A, B, C, D, E, F (Pie Chart)' : 'Grade Band Pie Distribution'}
                      </h3>
                    </div>
                  </div>

                  {/* SVG DONUT CHART */}
                  <div className="relative my-6 flex items-center justify-center">
                    <svg className="h-48 w-48 -rotate-90" viewBox="0 0 100 100">
                      {aggregateGradeBands.map((band, idx) => {
                        const prevOffset = aggregateGradeBands.slice(0, idx).reduce((acc, b) => acc + b.percent, 0);
                        const strokeDasharray = `${band.percent} ${100 - band.percent}`;
                        const strokeDashoffset = -prevOffset;

                        return (
                          <circle
                            key={band.grade}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={band.color}
                            strokeWidth="14"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-700 hover:opacity-80"
                          />
                        );
                      })}
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                        {isKhmer ? toKhmerDigits(totalStudents) : totalStudents}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {isKhmer ? 'សិស្សសរុប' : 'Total Students'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PIE CHART LEGENDS */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {aggregateGradeBands.map((band) => (
                    <div key={band.grade} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: band.color }} />
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">
                          {band.grade}: {band.percent}%
                        </p>
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                          {isKhmer ? `${toKhmerDigits(band.total)} (ស្រី ${toKhmerDigits(band.female)})` : `${band.total} (F ${band.female})`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SUBJECT PERFORMANCE BAR CHART */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-gray-800 dark:bg-gray-800/60 lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKhmer ? 'មធ្យមភាគតាមមុខវិជ្ជា (Subject Bar Chart)' : 'Subject Score Bar Chart'}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">/ 50.00</span>
                  </div>

                  {/* HORIZONTAL BAR CHART ROWS */}
                  <div className="mt-4 space-y-3">
                    {subjects.slice(0, 7).map((sub) => {
                      const pct = (sub.average / 50) * 100;
                      return (
                        <div key={sub.subject} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800 dark:text-slate-200">{sub.subjectKh || sub.subject}</span>
                            <span className="text-indigo-600 dark:text-indigo-400 tabular-nums">
                              {isKhmer ? toKhmerDigits(sub.average.toFixed(1)) : sub.average.toFixed(1)} / 50
                            </span>
                          </div>
                          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-indigo-50/70 p-3 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                  <span>{isKhmer ? 'មុខវិជ្ជាពិន្ទុខ្ពស់ជាងគេ៖' : 'Top Subject:'} <strong>{subjects[0]?.subjectKh || subjects[0]?.subject || 'គ្មាន'}</strong></span>
                  <span className="text-emerald-600">+{subjects[0]?.passRatePercent || 0}% {isKhmer ? 'អត្រាជាប់' : 'Pass'}</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ------------------- LAYOUT STYLE 3: CLASS ROSTER & GRADE BANDS A-F TABLE ------------------- */}
        {(layoutStyle === 'poster' || layoutStyle === 'classes') && (
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-gray-800 dark:bg-gray-800/60">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isKhmer ? '៣. ភាគរយសិស្សជាប់/ធ្លាក់ & និទ្ទេស (A, B, C, D, E, F) តាមថ្នាក់នីមួយៗ' : '3. Pass/Fail & Grade Band Distribution Per Class'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKhmer ? 'បង្ហាញអត្រាជាប់/ធ្លាក់ និងចំនួនសិស្សទទួល​បាននិទ្ទេសនីមួយៗ (សរុប / ស្រី)' : 'Format: Total (Female)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {activeClasses.map((cls) => {
                const passPct = cls.passRatePercent ?? 0;
                const passC = cls.passCount ?? 0;
                const failC = cls.failCount ?? 0;
                const totalSt = cls.studentCount ?? (passC + failC);
                const distMap = new Map((cls.gradeDistribution || []).map((d) => [d.grade, d]));

                return (
                  <div key={cls.classId} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/40">
                    {/* Class Header & Pass Rate Progress Bar */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-black text-white shadow-xs">
                          {isKhmer ? `ថ្នាក់ ${cls.className}` : cls.className}
                        </span>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {cls.homeroomTeacher ? (isKhmer ? `គ្រូប្រចាំថ្នាក់៖ ${cls.homeroomTeacher}` : `Homeroom: ${cls.homeroomTeacher}`) : (isKhmer ? 'គ្រូប្រចាំថ្នាក់៖ មិនទាន់មាន' : 'No Homeroom Teacher')}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {isKhmer ? `សិស្សសរុប៖ ${toKhmerDigits(totalSt)} នាក់ (ស្រី ${toKhmerDigits(cls.femaleCount ?? 0)} នាក់)` : `Total: ${totalSt}`}
                          </p>
                        </div>
                      </div>

                      {/* Pass/Fail Metrics Pill */}
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <Check className="h-3.5 w-3.5" />
                          {isKhmer ? `ជាប់ ${toKhmerDigits(passPct)}% (${toKhmerDigits(passC)} នាក់)` : `Pass: ${passPct}%`}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          <XCircle className="h-3.5 w-3.5" />
                          {isKhmer ? `ធ្លាក់ ${toKhmerDigits(100 - passPct)}% (${toKhmerDigits(failC)} នាក់)` : `Fail: ${100 - passPct}%`}
                        </span>
                      </div>
                    </div>

                    {/* Visual Pass Rate Bar */}
                    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-rose-200 dark:bg-rose-950/80">
                      <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${passPct}%` }} />
                    </div>

                    {/* Grade Bands A, B, C, D, E, F Pills Row */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-6 text-center text-xs">
                      {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((letter) => {
                        const b = distMap.get(letter);
                        const tot = b?.total ?? 0;
                        const fem = b?.female ?? 0;
                        const isF = letter === 'F';

                        return (
                          <div
                            key={letter}
                            className={`rounded-xl border p-2 ${
                              isF
                                ? 'border-rose-200 bg-rose-50/70 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
                                : letter === 'A'
                                  ? 'border-blue-200 bg-blue-50/70 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200'
                                  : 'border-slate-200/80 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400">
                              {isKhmer ? `និទ្ទេស ${letter}` : `Grade ${letter}`} {isF ? (isKhmer ? '(ធ្លាក់)' : '(Fail)') : ''}
                            </p>
                            <p className="mt-1 text-sm font-black tabular-nums">
                              {isKhmer ? toKhmerDigits(tot) : tot} <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">{isKhmer ? `(ស្រី ${toKhmerDigits(fem)})` : `(F ${fem})`}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BOTTOM METRIC RATING STRIP MATCHING SCREENSHOT */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 p-2.5 dark:bg-slate-800/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">{isKhmer ? 'ពិន្ទុនិន្នាការ' : 'TREND SCORE'}</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">98% (២០២៦)</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 p-2.5 dark:bg-slate-800/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">{isKhmer ? 'គុណភាពអប់រំ' : 'QUALITY INDEX'}</p>
                <p className="text-xs font-black text-amber-500">★★★★★</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 p-2.5 dark:bg-slate-800/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">{isKhmer ? 'សន្ទស្សន៍វិន័យ' : 'DISCIPLINE'}</p>
                <p className="text-xs font-black text-blue-600 dark:text-blue-400">★★★★☆</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 p-2.5 dark:bg-slate-800/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Bookmark className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">{isKhmer ? 'ការរក្សាសិស្ស' : 'RETENTION'}</p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">★★★★★</p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM BANNER */}
        <footer className="flex flex-col items-center justify-between gap-3 rounded-[1.5rem] bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 px-5 py-3 text-white shadow-md sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Heart className="h-4 w-4 fill-white text-white" />
            <span>
              {isKhmer
                ? 'Stunity Enterprise Platform · របាយការណ៍ផ្លូវការរចនាបែប Glassmorphism Infographic'
                : 'Stunity Enterprise Platform · Official Infographic Portrait Sheet'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/80">
            <Bookmark className="h-3.5 w-3.5" />
            <span>STUNITY 2026</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
