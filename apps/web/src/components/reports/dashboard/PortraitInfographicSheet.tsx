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
} from 'recharts';
import {
  School,
  Sparkles,
  Users,
  Award,
  Crown,
  BookOpen,
  GraduationCap,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Layers,
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

const GRADE_COLORS: Record<string, string> = {
  A: '#1d4ed8',
  B: '#2563eb',
  C: '#0ea5e9',
  D: '#f59e0b',
  E: '#f97316',
  F: '#ef4444',
};

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
  const totalStudents = data.overview?.totalStudents ?? 0;
  const totalClasses = data.overview?.totalClasses ?? 0;
  const totalTeachers = data.overview?.totalTeachers ?? 0;
  const passRatePercent = Math.round(data.passRate?.passRatePercent ?? 0);
  const passingCount = data.passRate?.passing ?? 0;
  const failingCount = data.passRate?.failing ?? 0;

  const overallAvg = useMemo(() => {
    if (data.averageScoreByClass?.length) {
      const valid = data.averageScoreByClass.filter((c) => c.average > 0);
      if (valid.length > 0) {
        const sum = valid.reduce((acc, c) => acc + c.average, 0);
        return Number((sum / valid.length).toFixed(2));
      }
    }
    return 0;
  }, [data.averageScoreByClass]);

  // 1. Column Chart Data: Average score by Grade Level (7, 8, 9, 10, 11, 12)
  const gradeColumnData = useMemo(() => {
    return (data.averageScoreByGradeLevel || []).map((g) => ({
      grade: `ថ្នាក់ទី ${toKhmerDigits(g.grade)}`,
      average: g.average,
      levelGroup: Number(g.grade) <= 9 ? 'អនុវិទ្យាល័យ' : 'វិទ្យាល័យ',
      fill: Number(g.grade) <= 9 ? '#2563eb' : '#4f46e5',
    }));
  }, [data.averageScoreByGradeLevel]);

  // 2. Junior High vs High School Summary
  const levelBreakdown = useMemo(() => {
    const juniorClasses = data.averageScoreByClass.filter(
      (c) => Number(c.grade) >= 7 && Number(c.grade) <= 9,
    );
    const seniorClasses = data.averageScoreByClass.filter(
      (c) => Number(c.grade) >= 10 && Number(c.grade) <= 12,
    );

    const calcLevel = (classes: typeof data.averageScoreByClass) => {
      const stCount = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
      const passC = classes.reduce((sum, c) => sum + (c.passCount || 0), 0);
      const failC = classes.reduce((sum, c) => sum + (c.failCount || 0), 0);
      const graded = passC + failC;
      const passRate = graded > 0 ? Math.round((passC / graded) * 100) : 0;
      const valid = classes.filter((c) => c.average > 0);
      const avg =
        valid.length > 0
          ? Number((valid.reduce((sum, c) => sum + c.average, 0) / valid.length).toFixed(2))
          : 0;

      // Extract top 3 students
      const top3: Array<{ studentId: string; name: string; khmerName: string | null; average: number; className: string }> = [];
      classes.forEach((cls) => {
        cls.topStudents?.forEach((st) => top3.push({ ...st, className: cls.className }));
      });
      const sortedTop3 = top3.sort((a, b) => b.average - a.average).slice(0, 3);

      return { classCount: classes.length, studentCount: stCount, avg, passRate, top3: sortedTop3 };
    };

    return {
      junior: calcLevel(juniorClasses),
      senior: calcLevel(seniorClasses),
    };
  }, [data.averageScoreByClass]);

  // 3. Pie Chart Data: Grade Distribution A-F
  const gradeDistributionPie = useMemo(() => {
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
        name: `និទ្ទេស ${grade}`,
        value,
        color: GRADE_COLORS[grade] || '#64748b',
      }));
  }, [data.averageScoreByClass]);

  return (
    <div className="mx-auto w-full max-w-[850px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      
      {/* ------------------- OFFICIAL A4 BANNER HEADER ------------------- */}
      <header className="border-b-2 border-slate-900 pb-4 dark:border-slate-200">
        <div className="flex items-start justify-between text-xs font-black text-slate-900 dark:text-white">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
            <p className="font-moul text-base font-bold text-blue-950 dark:text-blue-200">{schoolName}</p>
          </div>
          <div className="text-center font-moul">
            <p className="text-xs font-bold text-slate-900 dark:text-white">ព្រះរាជាណាចក្រកម្ពុជា</p>
            <p className="text-[10px] font-normal text-slate-700 dark:text-slate-300">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[9px] font-black text-slate-950 uppercase tracking-wide">
                របាយការណ៍ព័ត៌មានវិទ្យា (A4 INFOGRAPHIC)
              </span>
              <span className="text-xs font-bold text-slate-300">
                {data.period.khmerLabel || data.period.label}
              </span>
            </div>
            <h1 className="mt-1 font-moul text-lg font-normal tracking-wide text-amber-300 sm:text-xl">
              របាយការណ៍ស្ថានភាពសាលារៀន (សង្ខេប)
            </h1>
          </div>
          <div className="text-left text-[11px] font-semibold text-slate-300 sm:text-right">
            <p>កាលបរិច្ឆេទបង្កើត៖ {generatedAtLabel}</p>
            <p>កម្រិតសិក្សា៖ {className ? `ថ្នាក់ ${className}` : gradeFilter ? `ថ្នាក់ទី ${toKhmerDigits(gradeFilter)}` : 'គ្រប់កម្រិត (៧–១២)'}</p>
          </div>
        </div>
      </header>

      {/* ------------------- SECTION 1: 4 EXECUTIVE KEY INDICATOR BADGES ------------------- */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/30">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase">សិស្សសរុប</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white tabular-nums">
            {toKhmerDigits(totalStudents)}
          </p>
          <p className="text-[10px] text-slate-500">{toKhmerDigits(totalClasses)} ថ្នាក់ · {toKhmerDigits(totalTeachers)} គ្រូ</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase">អត្រាជាប់</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
            {toKhmerDigits(passRatePercent)}%
          </p>
          <p className="text-[10px] text-emerald-600">{toKhmerDigits(passingCount)} ជាប់ · {toKhmerDigits(failingCount)} ធ្លាក់</p>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Award className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase">មធ្យមភាគសរុប</span>
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-400 tabular-nums">
            {toKhmerDigits(overallAvg)} <span className="text-xs text-slate-400">/ ៥០</span>
          </p>
          <p className="text-[10px] text-slate-500">មាត្រដ្ឋាន ៥០ ពិន្ទុ</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase">វត្តមានសិស្ស</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
            {data.overview.attendanceRate > 0 ? `${toKhmerDigits(Math.round(data.overview.attendanceRate))}%` : '—'}
          </p>
          <p className="text-[10px] text-slate-500">អត្រាវត្តមានសរុប</p>
        </div>
      </section>

      {/* ------------------- SECTION 2: JUNIOR HIGH vs HIGH SCHOOL GROUPED SPOTLIGHT ------------------- */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <School className="h-4 w-4" />
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              ១. សង្ខេបលទ្ធផល ផ្នែកអនុវិទ្យាល័យ និង វិទ្យាល័យ
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">បែងចែកដាច់ដោយឡែក</span>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* JUNIOR HIGH CARD */}
          <div className="rounded-xl border border-blue-200 bg-white p-3.5 shadow-xs dark:border-blue-900/50 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  ផ្នែក អនុវិទ្យាល័យ (ថ្នាក់ទី ៧–៩)
                </h4>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                {toKhmerDigits(levelBreakdown.junior.classCount)} ថ្នាក់
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-slate-400">សិស្សសរុប</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{toKhmerDigits(levelBreakdown.junior.studentCount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">ពិន្ទុមធ្យម</p>
                <p className="text-sm font-black text-blue-600 dark:text-blue-400">{toKhmerDigits(levelBreakdown.junior.avg)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">អត្រាជាប់</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{toKhmerDigits(levelBreakdown.junior.passRate)}%</p>
              </div>
            </div>

            {/* TOP 3 CHAMPIONS */}
            {levelBreakdown.junior.top3.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] dark:border-slate-800">
                <p className="font-bold text-slate-500 mb-1">សិស្សពូកែ ៣ នាក់ដំបូង (Top 3)៖</p>
                <div className="space-y-1">
                  {levelBreakdown.junior.top3.map((st, idx) => (
                    <div key={st.studentId || idx} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="truncate font-semibold">
                        {toKhmerDigits(idx + 1)}. {st.khmerName || st.name} ({st.className})
                      </span>
                      <span className="font-black text-blue-600">{toKhmerDigits(st.average)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* HIGH SCHOOL CARD */}
          <div className="rounded-xl border border-indigo-200 bg-white p-3.5 shadow-xs dark:border-indigo-900/50 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  ផ្នែក វិទ្យាល័យ (ថ្នាក់ទី ១០–១២)
                </h4>
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                {toKhmerDigits(levelBreakdown.senior.classCount)} ថ្នាក់
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-slate-400">សិស្សសរុប</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{toKhmerDigits(levelBreakdown.senior.studentCount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">ពិន្ទុមធ្យម</p>
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{toKhmerDigits(levelBreakdown.senior.avg)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">អត្រាជាប់</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{toKhmerDigits(levelBreakdown.senior.passRate)}%</p>
              </div>
            </div>

            {/* TOP 3 CHAMPIONS */}
            {levelBreakdown.senior.top3.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] dark:border-slate-800">
                <p className="font-bold text-slate-500 mb-1">សិស្សពូកែ ៣ នាក់ដំបូង (Top 3)៖</p>
                <div className="space-y-1">
                  {levelBreakdown.senior.top3.map((st, idx) => (
                    <div key={st.studentId || idx} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="truncate font-semibold">
                        {toKhmerDigits(idx + 1)}. {st.khmerName || st.name} ({st.className})
                      </span>
                      <span className="font-black text-indigo-600">{toKhmerDigits(st.average)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 3: MULTI-CHART GALLERY (COLUMN & PIE CHARTS) ------------------- */}
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        
        {/* CHART A: COLUMN CHART (GRADE LEVEL AVERAGES 7-12) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                ២. មធ្យមភាគពិន្ទុតាមកម្រិតថ្នាក់ ៧-១២ (Column Chart)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">/ ៥០</span>
          </div>

          <div className="mt-3 h-44 w-full">
            {gradeColumnData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeColumnData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="grade" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 50]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="average" name="ពិន្ទុមធ្យម" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                មិនមានទិន្នន័យ
              </div>
            )}
          </div>
        </div>

        {/* CHART B: PIE DONUT CHART (GRADE DISTRIBUTION A-F) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                ៣. ភាគរយបែងចែកនិទ្ទេស A ដល់ F (Pie Chart)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">A–F</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="h-40 w-40 shrink-0">
              {gradeDistributionPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={gradeDistributionPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {gradeDistributionPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
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

            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold flex-1">
              {gradeDistributionPie.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 rounded-lg bg-white p-1.5 shadow-2xs dark:bg-slate-900">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 dark:text-slate-300">{item.name}:</span>
                  <span className="font-black text-slate-900 dark:text-white">{toKhmerDigits(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* ------------------- SECTION 4: COMPACT MINDMAP HIERARCHY SNIPPET ------------------- */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              ៤. រចនាសម្ព័ន្ធដើមឈើ Mindmap សាលារៀន
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400">រចនាសម្ព័ន្ធ</span>
        </div>

        <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* ROOT */}
          <div className="rounded-xl bg-slate-900 px-3.5 py-2 text-white shadow-xs text-center text-xs font-black">
            <p className="text-[9px] text-amber-400 uppercase">សាលារៀន</p>
            <p className="font-moul text-xs">{schoolName}</p>
          </div>

          <div className="text-slate-400 font-black text-xs hidden sm:block">➔</div>

          {/* BRANCH 1: JUNIOR HIGH */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-center text-xs font-bold text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <p className="text-[9px] uppercase text-blue-600 font-extrabold">ផ្នែក អនុវិទ្យាល័យ</p>
            <p>ថ្នាក់ទី ៧, ៨, ៩ · {toKhmerDigits(levelBreakdown.junior.classCount)} ថ្នាក់</p>
          </div>

          <div className="text-slate-400 font-black text-xs hidden sm:block">➔</div>

          {/* BRANCH 2: HIGH SCHOOL */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-center text-xs font-bold text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
            <p className="text-[9px] uppercase text-indigo-600 font-extrabold">ផ្នែក វិទ្យាល័យ</p>
            <p>ថ្នាក់ទី ១០, ១១, ១២ · {toKhmerDigits(levelBreakdown.senior.classCount)} ថ្នាក់</p>
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 5: OFFICIAL PRINTABLE STAMP & SIGNATURE BLOCK ------------------- */}
      <footer className="mt-6 border-t-2 border-dashed border-slate-300 pt-5 dark:border-slate-700">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-1">
            <p className="font-bold text-slate-600 dark:text-slate-400">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</p>
            <p className="text-[10px] text-slate-400">ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២៦</p>
            <p className="mt-6 font-moul text-xs font-bold text-slate-900 dark:text-white">នាយក/នាយិកាសាលារៀន</p>
            <div className="h-10 flex items-center justify-center text-[9px] text-slate-400 italic">
              (ហត្ថលេខា និងត្រា)
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-bold text-slate-600 dark:text-slate-400">រៀបចំដោយ</p>
            <p className="text-[10px] text-slate-400">ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២៦</p>
            <p className="mt-6 font-moul text-xs font-bold text-slate-900 dark:text-white">អ្នកគ្រូ/លោកគ្រូ ទទួលបន្ទុករបាយការណ៍</p>
            <div className="h-10 flex items-center justify-center text-[9px] text-slate-400 italic">
              (ហត្ថលេខា)
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <span>ប្រព័ន្ធគ្រប់គ្រងសាលារៀន Stunity Enterprise · របាយការណ៍ព័ត៌មានវិទ្យាបោះពុម្ព A4</span>
          <span>STUNITY 2026</span>
        </div>
      </footer>

    </div>
  );
}
