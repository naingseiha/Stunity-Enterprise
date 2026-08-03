'use client';

import React, { useMemo } from 'react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PieChart, BarChart3, Users, Target, ClipboardCheck, Sparkles } from 'lucide-react';
import type { SchoolReportsDashboardResponse } from '@/lib/api/reports';

interface ChartsAnalyticsHubProps {
  data: SchoolReportsDashboardResponse;
  locale: string;
}

const cardClass =
  'rounded-[2rem] border border-slate-200 bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800/60 dark:bg-slate-900 dark:shadow-black/30';

const GRADE_COLORS: Record<string, string> = {
  A: '#1d4ed8', // Blue
  B: '#2563eb',
  C: '#60a5fa',
  D: '#93c5fd',
  E: '#bfdbfe',
  F: '#e11d48', // Rose
};

const GENDER_COLORS = ['#3b82f6', '#ec4899']; // Blue, Pink

export default function ChartsAnalyticsHub({ data, locale }: ChartsAnalyticsHubProps) {
  const isKhmer = locale === 'km';
  const tx = (kh: string, en: string) => (isKhmer ? kh : en);

  // 1. Compute overall Grade Band Distribution across all classes
  const gradeDistributionData = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    data.averageScoreByClass.forEach((cls) => {
      cls.gradeDistribution?.forEach((dist) => {
        if (counts[dist.grade] !== undefined) {
          counts[dist.grade] += dist.total;
        }
      });
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([grade, value]) => ({
        name: tx(`និទ្ទេស ${grade}`, `Grade ${grade}`),
        value,
        color: GRADE_COLORS[grade] || '#64748b',
      }));
  }, [data.averageScoreByClass, isKhmer]);

  // 2. Gender Ratio Donut Chart Data
  const genderData = useMemo(() => {
    return [
      {
        name: tx('សិស្សប្រុស', 'Male'),
        value: data.genderBreakdown.male.count,
        passRate: data.genderBreakdown.male.passRatePercent,
        color: '#3b82f6',
      },
      {
        name: tx('សិស្សស្រី', 'Female'),
        value: data.genderBreakdown.female.count,
        passRate: data.genderBreakdown.female.passRatePercent,
        color: '#ec4899',
      },
    ].filter((item) => item.value > 0);
  }, [data.genderBreakdown, isKhmer]);

  // 3. Junior High vs High School Comparison Data for Bar Chart
  const schoolLevelComparison = useMemo(() => {
    const isJunior = (gradeStr: string) => {
      const g = Number.parseInt(gradeStr, 10);
      return g >= 7 && g <= 9;
    };
    const isSenior = (gradeStr: string) => {
      const g = Number.parseInt(gradeStr, 10);
      return g >= 10 && g <= 12;
    };

    const juniorClasses = data.averageScoreByClass.filter((c) => isJunior(c.grade));
    const seniorClasses = data.averageScoreByClass.filter((c) => isSenior(c.grade));

    const calcStats = (classes: typeof data.averageScoreByClass) => {
      const valid = classes.filter((c) => c.average > 0);
      const avg = valid.length > 0 ? Number((valid.reduce((sum, c) => sum + c.average, 0) / valid.length).toFixed(2)) : 0;
      const passSum = classes.reduce((sum, c) => sum + (c.passCount || 0), 0);
      const failSum = classes.reduce((sum, c) => sum + (c.failCount || 0), 0);
      const totalGraded = passSum + failSum;
      const passRate = totalGraded > 0 ? Math.round((passSum / totalGraded) * 100) : 0;
      return { avg, passRate };
    };

    const junior = calcStats(juniorClasses);
    const senior = calcStats(seniorClasses);

    return [
      {
        name: tx('អនុវិទ្យាល័យ (៧-៩)', 'Junior High (7-9)'),
        average: junior.avg,
        passRate: junior.passRate,
      },
      {
        name: tx('វិទ្យាល័យ (១០-១២)', 'High School (10-12)'),
        average: senior.avg,
        passRate: senior.passRate,
      },
    ];
  }, [data.averageScoreByClass, isKhmer]);

  // 4. Attendance Breakdown Pie Chart Data
  const attendanceBreakdownData = useMemo(() => {
    if (!data.attendanceBreakdown) return [];

    const { onTime, late, absent, excused } = data.attendanceBreakdown;
    return [
      { name: tx('ទាន់ពេលវេលា', 'On Time'), value: onTime.count, color: '#10b981' },
      { name: tx('យឺត', 'Late'), value: late.count, color: '#f59e0b' },
      { name: tx('អវត្តមាន', 'Absent'), value: absent.count, color: '#ef4444' },
      { name: tx('ច្បាប់', 'Excused'), value: excused.count, color: '#6366f1' },
    ].filter((item) => item.value > 0);
  }, [data.attendanceBreakdown, isKhmer]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <PieChart className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {tx('មជ្ឈមណ្ឌល ក្រាហ្វ និង តារាង', 'Charts & Visual Analytics Gallery')}
          </span>
        </div>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          {tx('ក្រាហ្វតំណាងទិន្នន័យចម្រុះ', 'Pie, Donut & Bar Charts Gallery')}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {tx(
            'ទិដ្ឋភាពក្រាហ្វ Pie, Donut និង Grouped Bar Chart បង្ហាញការបែងចែកសមាសភាពសិក្សាផ្សេងៗ',
            'Interactive charts representing grade distributions, gender breakdowns, and level comparisons',
          )}
        </p>
      </div>

      {/* GRID OF CHARTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 1: GRADE DISTRIBUTION DONUT CHART */}
        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {tx('១. ភាគរយបែងចែកនិទ្ទេស A ដល់ F', '1. Grade Distribution (A–F)')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tx('បង្ហាញចំនួនសិស្សទទួលបាននិទ្ទេសនីមួយៗ', 'Proportion of students in each grade band')}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <PieChart className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 h-64 w-full">
            {gradeDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={gradeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {gradeDistributionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                {tx('មិនមានទិន្នន័យនិទ្ទេស', 'No grade distribution data')}
              </div>
            )}
          </div>

          {/* CUSTOM LEGEND */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {gradeDistributionData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/40">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold text-slate-700 dark:text-slate-300">{item.name}</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CHART 2: GENDER BREAKDOWN DONUT CHART */}
        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {tx('២. ផលធៀបសិស្សប្រុស និង ស្រី', '2. Gender Composition')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tx('សមាមាត្រសិស្សសរុបតាមភេទ និង អត្រាជាប់', 'Student count and pass rates by gender')}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
              <Users className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 h-64 w-full">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                {tx('មិនមានទិន្នន័យភេទ', 'No gender breakdown data')}
              </div>
            )}
          </div>

          {/* LEGEND WITH PASS RATE */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {genderData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.value} {tx('នាក់', 'students')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{item.passRate}%</p>
                  <p className="text-[9px] text-slate-400">{tx('ជាប់', 'Pass')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CHART 3: SCHOOL LEVEL COMPARISON BAR CHART */}
        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {tx('៣. ប្រៀបធៀប អនុវិទ្យាល័យ នឹង វិទ្យាល័យ', '3. Junior vs High School Comparison')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tx('ប្រៀបធៀបពិន្ទុមធ្យម និង អត្រាជាប់ (%)', 'Comparison of Average Score and Pass Rate')}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <BarChart3 className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolLevelComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="average" name={tx('ពិន្ទុមធ្យម', 'Average')} fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="passRate" name={tx('អត្រាជាប់ (%)', 'Pass Rate (%)')} fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* CHART 4: ATTENDANCE BREAKDOWN DONUT CHART */}
        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {tx('៤. ភាគរយវត្តមានសិស្ស', '4. Attendance Breakdown')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tx('ទាន់ពេលវេលា, យឺត, អវត្តមាន និង ច្បាប់', 'On-time, late, absent, and excused records')}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <ClipboardCheck className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 h-64 w-full">
            {attendanceBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={attendanceBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendanceBreakdownData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                {tx('មិនទាន់មានទិន្នន័យកំណត់ត្រាវត្តមាន', 'No detailed attendance records')}
              </div>
            )}
          </div>

          {/* LEGEND */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {attendanceBreakdownData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/40">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold text-slate-600 dark:text-slate-400">{item.name}</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
