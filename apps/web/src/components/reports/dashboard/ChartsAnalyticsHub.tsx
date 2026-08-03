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
import {
  PieChart,
  BarChart3,
  Users,
  Award,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Layers,
  BookOpen,
} from 'lucide-react';
import type { SchoolReportsDashboardResponse } from '@/lib/api/reports';
import { toKhmerDigits } from '@/lib/reports/templates/khm-moeys/khmer-date';

interface ChartsAnalyticsHubProps {
  data: SchoolReportsDashboardResponse;
  locale: string;
}

const cardClass =
  'rounded-[2rem] border border-slate-200 bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800/60 dark:bg-slate-900 dark:shadow-black/30';

const GRADE_COLORS: Record<string, string> = {
  A: '#1d4ed8',
  B: '#2563eb',
  C: '#0ea5e9',
  D: '#f59e0b',
  E: '#f97316',
  F: '#ef4444',
};

export default function ChartsAnalyticsHub({ data, locale }: ChartsAnalyticsHubProps) {
  // 1. Grade A-F Donut Pie Data
  const gradeDistributionPie = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    data.averageScoreByClass.forEach((cls) => {
      cls.gradeDistribution?.forEach((dist) => {
        if (counts[dist.grade] !== undefined) {
          counts[dist.grade] += dist.total;
        }
      });
    });

    const total = Object.values(counts).reduce((acc, curr) => acc + curr, 0) || 1;

    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([grade, value]) => ({
        name: `និទ្ទេស ${grade}`,
        value,
        percent: Math.round((value / total) * 100),
        fill: GRADE_COLORS[grade] || '#64748b',
      }));
  }, [data.averageScoreByClass]);

  // 2. Gender Composition Donut Data
  const genderPie = useMemo(() => {
    const female = data.genderBreakdown?.female?.count ?? 0;
    const male = data.genderBreakdown?.male?.count ?? 0;
    return [
      { name: 'សិស្សស្រី', value: female, fill: '#ec4899' },
      { name: 'សិស្សប្រុស', value: male, fill: '#3b82f6' },
    ];
  }, [data.genderBreakdown]);

  // 3. Grouped Bar Chart Data: Junior High vs High School
  const levelComparisonBar = useMemo(() => {
    const isJunior = (g: string) => Number.parseInt(g, 10) >= 7 && Number.parseInt(g, 10) <= 9;
    const isSenior = (g: string) => Number.parseInt(g, 10) >= 10 && Number.parseInt(g, 10) <= 12;

    const juniorClasses = data.averageScoreByClass.filter((c) => isJunior(c.grade));
    const seniorClasses = data.averageScoreByClass.filter((c) => isSenior(c.grade));

    const getStats = (classes: typeof data.averageScoreByClass) => {
      const totalSt = classes.reduce((sum, c) => sum + c.studentCount, 0);
      const passC = classes.reduce((sum, c) => sum + (c.passCount || 0), 0);
      const failC = classes.reduce((sum, c) => sum + (c.failCount || 0), 0);
      const graded = passC + failC;
      const passRate = graded > 0 ? Math.round((passC / graded) * 100) : 0;
      const valid = classes.filter((c) => c.average > 0);
      const avg =
        valid.length > 0
          ? Number((valid.reduce((sum, c) => sum + c.average, 0) / valid.length).toFixed(2))
          : 0;
      return { totalSt, passRate, avg };
    };

    const jStats = getStats(juniorClasses);
    const sStats = getStats(seniorClasses);

    return [
      {
        category: 'ពិន្ទុមធ្យម (៥០ ពិន្ទុ)',
        អនុវិទ្យាល័យ: jStats.avg,
        វិទ្យាល័យ: sStats.avg,
      },
      {
        category: 'អត្រាជាប់ (%)',
        អនុវិទ្យាល័យ: jStats.passRate,
        វិទ្យាល័យ: sStats.passRate,
      },
    ];
  }, [data.averageScoreByClass]);

  // 4. Subject Scores Horizontal Bar Data
  const subjectBarData = useMemo(() => {
    return [...(data.averageScoreBySubject || [])]
      .sort((a, b) => b.average - a.average)
      .slice(0, 8)
      .map((s) => ({
        subject: s.subjectKh || s.subject,
        average: s.average,
        passRate: s.passRatePercent,
      }));
  }, [data.averageScoreBySubject]);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            <PieChart className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            មជ្ឈមណ្ឌល ក្រាហ្វ និង ការវិភាគ
          </span>
        </div>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          ក្រាហ្វវិភាគទិន្នន័យចម្រុះទម្រង់ (Charts Gallery)
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          បង្ហាញក្រាហ្វ Pie Charts, Donut Charts, និង Grouped Bar Charts សរុបទូទាំងសាលារៀន
        </p>
      </div>

      {/* TOP ROW: 2 CHARTS (A-F PIE & GENDER DONUT) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CHART 1: GRADE BAND A-F DONUT PIE */}
        <div className={`${cardClass} p-5 lg:col-span-7`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ក្រាហ្វបែងចែកនិទ្ទេសសិស្ស (A, B, C, D, E, F)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Pie Chart</span>
          </div>

          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-52 w-52 shrink-0">
              {gradeDistributionPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={gradeDistributionPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {gradeDistributionPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                  មិនមានទិន្នន័យ
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold flex-1">
              {gradeDistributionPie.map((band) => (
                <div key={band.name} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: band.fill }} />
                  <div>
                    <p className="text-slate-900 dark:text-white font-extrabold">{band.name}</p>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400">
                      {toKhmerDigits(band.value)} នាក់ ({toKhmerDigits(band.percent)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHART 2: GENDER COMPOSITION DONUT */}
        <div className={`${cardClass} p-5 lg:col-span-5`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ផលធៀបភេទសិស្ស (ប្រុស / ស្រី)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Donut Chart</span>
          </div>

          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={genderPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {genderPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex w-full justify-around text-xs font-bold">
              <div className="flex items-center gap-2 rounded-xl bg-pink-50 px-4 py-2 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">
                <span className="h-3 w-3 rounded-full bg-pink-500" />
                <span>សិស្សស្រី៖ {toKhmerDigits(genderPie[0].value)} នាក់</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span>សិស្សប្រុស៖ {toKhmerDigits(genderPie[1].value)} នាក់</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: GROUPED BAR CHART & SUBJECT PERFORMANCE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CHART 3: GROUPED BAR CHART (JUNIOR HIGH vs HIGH SCHOOL) */}
        <div className={`${cardClass} p-5 lg:col-span-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ប្រៀបធៀប អនុវិទ្យាល័យ vs វិទ្យាល័យ (Grouped Bar Chart)
              </h3>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelComparisonBar} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="អនុវិទ្យាល័យ" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="វិទ្យាល័យ" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: SUBJECT AVERAGE SCORE BAR CHART */}
        <div className={`${cardClass} p-5 lg:col-span-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ពិន្ទុមធ្យមតាមមុខវិជ្ជា (Subject Score Bar Chart)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">/ ៥០.០០</span>
          </div>

          <div className="mt-4 h-64 w-full">
            {subjectBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectBarData} layout="vertical" margin={{ top: 0, right: 12, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 50]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis dataKey="subject" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={85} />
                  <Tooltip />
                  <Bar dataKey="average" name="ពិន្ទុមធ្យម" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                មិនមានទិន្នន័យ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
