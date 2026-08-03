'use client';

import React, { useMemo, useState } from 'react';
import {
  School,
  GraduationCap,
  Users,
  Award,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BookOpen,
  Crown,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import type { SchoolReportsDashboardResponse, ClassAverage } from '@/lib/api/reports';
import { toKhmerDigits } from '@/lib/reports/templates/khm-moeys/khmer-date';

interface SchoolLevelGroupedSectionProps {
  data: SchoolReportsDashboardResponse;
  locale: string;
  onSelectClass: (classId: string) => void;
  onSelectStudent: (studentId: string) => void;
}

const cardClass =
  'rounded-[2rem] border border-slate-200 bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800/60 dark:bg-slate-900 dark:shadow-black/30';

export default function SchoolLevelGroupedSection({
  data,
  locale,
  onSelectClass,
  onSelectStudent,
}: SchoolLevelGroupedSectionProps) {
  const isKhmer = locale === 'km';
  const tx = (kh: string, en: string) => (isKhmer ? kh : en);

  const [activeTab, setActiveTab] = useState<'all' | 'junior' | 'senior'>('all');

  // Compute Junior High (Grades 7-9) and High School (Grades 10-12) metrics
  const levelData = useMemo(() => {
    const isJunior = (gradeStr: string) => {
      const g = Number.parseInt(gradeStr, 10);
      return g >= 7 && g <= 9;
    };
    const isSenior = (gradeStr: string) => {
      const g = Number.parseInt(gradeStr, 10);
      return g >= 10 && g <= 12;
    };

    const juniorGrades = data.averageScoreByGradeLevel.filter((g) => isJunior(g.grade));
    const seniorGrades = data.averageScoreByGradeLevel.filter((g) => isSenior(g.grade));

    const juniorClasses = data.averageScoreByClass.filter((c) => isJunior(c.grade));
    const seniorClasses = data.averageScoreByClass.filter((c) => isSenior(c.grade));

    const computeLevelStats = (classes: ClassAverage[], gradeList: typeof data.averageScoreByGradeLevel) => {
      const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
      const totalFemale = classes.reduce((sum, c) => sum + (c.femaleCount || 0), 0);
      const totalPass = classes.reduce((sum, c) => sum + (c.passCount || 0), 0);
      const totalFail = classes.reduce((sum, c) => sum + (c.failCount || 0), 0);
      const gradedTotal = totalPass + totalFail;

      const validClassAvgs = classes.filter((c) => c.average > 0);
      const avgScore =
        validClassAvgs.length > 0
          ? Number((validClassAvgs.reduce((sum, c) => sum + c.average, 0) / validClassAvgs.length).toFixed(2))
          : 0;

      const passRate = gradedTotal > 0 ? Math.round((totalPass / gradedTotal) * 100) : 0;

      // Extract top students for this level
      const topStudents: Array<{
        rank: number;
        studentId: string;
        name: string;
        khmerName: string | null;
        average: number;
        className: string;
        grade: string;
      }> = [];

      classes.forEach((cls) => {
        cls.topStudents?.forEach((st) => {
          topStudents.push({
            ...st,
            className: cls.className,
            grade: cls.grade,
          });
        });
      });

      const sortedTop = topStudents.sort((a, b) => b.average - a.average).slice(0, 5);

      return {
        classCount: classes.length,
        studentCount: totalStudents,
        femaleCount: totalFemale,
        passCount: totalPass,
        failCount: totalFail,
        gradedTotal,
        avgScore,
        passRate,
        classes,
        gradeList,
        topStudents: sortedTop,
      };
    };

    return {
      junior: computeLevelStats(juniorClasses, juniorGrades),
      senior: computeLevelStats(seniorClasses, seniorGrades),
    };
  }, [data.averageScoreByClass, data.averageScoreByGradeLevel]);

  const maxAvg = data.scale.maxAverage;

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & TABS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <School className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {tx('ការបែងចែកតាមកម្រិតសិក្សា', 'School Level Breakdown')}
            </span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            {tx('អនុវិទ្យាល័យ និង វិទ្យាល័យ', 'Junior High vs High School Performance')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tx(
              'បែងចែកទិន្នន័យសិក្សារវាងផ្នែកអនុវិទ្យាល័យ (ថ្នាក់ទី ៧–៩) និង វិទ្យាល័យ (ថ្នាក់ទី ១០–១២) ដាច់ដោយឡែក',
              'Separate analysis comparing Lower Secondary (Grades 7–9) and Upper Secondary (Grades 10–12)',
            )}
          </p>
        </div>

        {/* TAB BUTTONS */}
        <div className="inline-flex shrink-0 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tx('បង្ហាញទាំងពីរ', 'Show Both')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('junior')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'junior'
                ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tx('អនុវិទ្យាល័យ (៧-៩)', 'Junior High (7-9)')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('senior')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'senior'
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tx('វិទ្យាល័យ (១០-១២)', 'High School (10-12)')}
          </button>
        </div>
      </div>

      {/* COMPARATIVE CARDS HEADER ROW */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* JUNIOR HIGH CARD */}
        {(activeTab === 'all' || activeTab === 'junior') && (
          <article className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 via-white to-cyan-50/40 p-6 shadow-md dark:border-blue-900/40 dark:from-blue-950/30 dark:via-slate-900 dark:to-cyan-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-blue-500">
                  <BookOpen className="h-6 w-6" />
                </span>
                <div>
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                    {tx('ថ្នាក់ទី ៧ - ៩', 'Grades 7 - 9')}
                  </span>
                  <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    {tx('ផ្នែក អនុវិទ្យាល័យ', 'Junior High School Division')}
                  </h3>
                </div>
              </div>
              <span className="text-2xl font-black tracking-tight text-blue-700 dark:text-blue-400">
                {levelData.junior.avgScore} <span className="text-xs text-slate-400">/ {maxAvg}</span>
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-blue-100 bg-white/80 p-3.5 backdrop-blur-xs dark:border-blue-900/40 dark:bg-slate-900/80">
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('សិស្សសរុប', 'Students')}</p>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {levelData.junior.studentCount.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">
                  {tx(`ស្រី ${levelData.junior.femaleCount}`, `Female ${levelData.junior.femaleCount}`)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('ចំនួនថ្នាក់', 'Classes')}</p>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {levelData.junior.classCount} {tx('ថ្នាក់', 'classes')}
                </p>
                <p className="text-[10px] text-slate-400">
                  {tx('៣ កម្រិតថ្នាក់', '3 Grades')}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('អត្រាជាប់', 'Pass Rate')}</p>
                <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {levelData.junior.passRate}%
                </p>
                <p className="text-[10px] text-slate-400">
                  {levelData.junior.passCount} / {levelData.junior.gradedTotal}
                </p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600 dark:text-slate-300">{tx('ភាគរយសិស្សប្រឡងជាប់', 'Passing Student Percentage')}</span>
                <span className="text-blue-700 dark:text-blue-400">{levelData.junior.passRate}%</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                  style={{ width: `${levelData.junior.passRate}%` }}
                />
              </div>
            </div>
          </article>
        )}

        {/* HIGH SCHOOL CARD */}
        {(activeTab === 'all' || activeTab === 'senior') && (
          <article className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 p-6 shadow-md dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:bg-indigo-500">
                  <GraduationCap className="h-6 w-6" />
                </span>
                <div>
                  <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {tx('ថ្នាក់ទី ១០ - ១២', 'Grades 10 - 12')}
                  </span>
                  <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    {tx('ផ្នែក វិទ្យាល័យ', 'High School Division')}
                  </h3>
                </div>
              </div>
              <span className="text-2xl font-black tracking-tight text-indigo-700 dark:text-indigo-400">
                {levelData.senior.avgScore} <span className="text-xs text-slate-400">/ {maxAvg}</span>
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3.5 backdrop-blur-xs dark:border-indigo-900/40 dark:bg-slate-900/80">
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('សិស្សសរុប', 'Students')}</p>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {levelData.senior.studentCount.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">
                  {tx(`ស្រី ${levelData.senior.femaleCount}`, `Female ${levelData.senior.femaleCount}`)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('ចំនួនថ្នាក់', 'Classes')}</p>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {levelData.senior.classCount} {tx('ថ្នាក់', 'classes')}
                </p>
                <p className="text-[10px] text-slate-400">
                  {tx('៣ កម្រិតថ្នាក់', '3 Grades')}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('អត្រាជាប់', 'Pass Rate')}</p>
                <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {levelData.senior.passRate}%
                </p>
                <p className="text-[10px] text-slate-400">
                  {levelData.senior.passCount} / {levelData.senior.gradedTotal}
                </p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600 dark:text-slate-300">{tx('ភាគរយសិស្សប្រឡងជាប់', 'Passing Student Percentage')}</span>
                <span className="text-indigo-700 dark:text-indigo-400">{levelData.senior.passRate}%</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500"
                  style={{ width: `${levelData.senior.passRate}%` }}
                />
              </div>
            </div>
          </article>
        )}
      </div>

      {/* TABLES AND CLASS CARDS FOR EACH DIVISION */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* JUNIOR HIGH SCHOOL CLASSES TABLE */}
        {(activeTab === 'all' || activeTab === 'junior') && (
          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-blue-50/40 px-5 py-4 dark:border-slate-800 dark:bg-blue-950/20 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {tx('ថ្នាក់រៀនផ្នែក អនុវិទ្យាល័យ', 'Junior High Classes')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tx('កម្រិតថ្នាក់ទី ៧, ៨ និង ៩', 'Grades 7, 8 & 9')}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                {levelData.junior.classCount} {tx('ថ្នាក់', 'classes')}
              </span>
            </div>

            {levelData.junior.classes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">{tx('ថ្នាក់', 'Class')}</th>
                      <th className="px-5 py-3">{tx('សិស្ស', 'Students')}</th>
                      <th className="px-5 py-3">{tx('មធ្យមភាគ', 'Average')}</th>
                      <th className="px-5 py-3">{tx('អត្រាជាប់', 'Pass Rate')}</th>
                      <th className="px-5 py-3 text-right">{tx('សកម្មភាព', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {levelData.junior.classes.map((cls) => (
                      <tr key={cls.classId} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                          {cls.className}
                          <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                            ({tx(`ថ្នាក់ទី ${toKhmerDigits(cls.grade)}`, `Grade ${cls.grade}`)})
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-600 dark:text-slate-300">
                          {cls.studentCount} {tx('នាក់', 'students')}
                        </td>
                        <td className="px-5 py-3 font-black text-slate-900 dark:text-white">
                          {cls.average}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            (cls.passRatePercent ?? 0) >= 70
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : (cls.passRatePercent ?? 0) >= 50
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {cls.passRatePercent ?? 0}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectClass(cls.classId)}
                            className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {tx('មើលថ្នាក់', 'View Class')} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                {tx('មិនមានទិន្នន័យថ្នាក់រៀនផ្នែកអនុវិទ្យាល័យ', 'No Junior High class data found')}
              </div>
            )}
          </section>
        )}

        {/* HIGH SCHOOL CLASSES TABLE */}
        {(activeTab === 'all' || activeTab === 'senior') && (
          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-50/40 px-5 py-4 dark:border-slate-800 dark:bg-indigo-950/20 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {tx('ថ្នាក់រៀនផ្នែក វិទ្យាល័យ', 'High School Classes')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tx('កម្រិតថ្នាក់ទី ១០, ១១ និង ១២', 'Grades 10, 11 & 12')}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                {levelData.senior.classCount} {tx('ថ្នាក់', 'classes')}
              </span>
            </div>

            {levelData.senior.classes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">{tx('ថ្នាក់', 'Class')}</th>
                      <th className="px-5 py-3">{tx('សិស្ស', 'Students')}</th>
                      <th className="px-5 py-3">{tx('មធ្យមភាគ', 'Average')}</th>
                      <th className="px-5 py-3">{tx('អត្រាជាប់', 'Pass Rate')}</th>
                      <th className="px-5 py-3 text-right">{tx('សកម្មភាព', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {levelData.senior.classes.map((cls) => (
                      <tr key={cls.classId} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                          {cls.className}
                          <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                            ({tx(`ថ្នាក់ទី ${toKhmerDigits(cls.grade)}`, `Grade ${cls.grade}`)})
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-600 dark:text-slate-300">
                          {cls.studentCount} {tx('នាក់', 'students')}
                        </td>
                        <td className="px-5 py-3 font-black text-slate-900 dark:text-white">
                          {cls.average}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            (cls.passRatePercent ?? 0) >= 70
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : (cls.passRatePercent ?? 0) >= 50
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {cls.passRatePercent ?? 0}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectClass(cls.classId)}
                            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {tx('មើលថ្នាក់', 'View Class')} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                {tx('មិនមានទិន្នន័យថ្នាក់រៀនផ្នែកវិទ្យាល័យ', 'No High School class data found')}
              </div>
            )}
          </section>
        )}
      </div>

      {/* TOP HONOR ROLL STUDENTS SEPARATED BY SCHOOL LEVEL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TOP STUDENTS JUNIOR HIGH */}
        {(activeTab === 'all' || activeTab === 'junior') && levelData.junior.topStudents.length > 0 && (
          <section className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {tx('សិស្សពូកែប្រចាំ អនុវិទ្យាល័យ (Top 5)', 'Top 5 Students - Junior High')}
                </h3>
              </div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                {tx('ថ្នាក់ទី ៧ - ៩', 'Grades 7 - 9')}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {levelData.junior.topStudents.map((student, index) => (
                <div
                  key={`${student.studentId}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${
                        index === 0
                          ? 'bg-amber-500 shadow-xs'
                          : index === 1
                          ? 'bg-slate-400'
                          : index === 2
                          ? 'bg-amber-700'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {student.khmerName || student.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {tx('ថ្នាក់', 'Class')} {student.className}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-blue-700 dark:text-blue-400">
                      {student.average}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectStudent(student.studentId)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-300"
                    >
                      {tx('មើលប្រវត្តិ', 'Profile')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TOP STUDENTS HIGH SCHOOL */}
        {(activeTab === 'all' || activeTab === 'senior') && levelData.senior.topStudents.length > 0 && (
          <section className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {tx('សិស្សពូកែប្រចាំ វិទ្យាល័យ (Top 5)', 'Top 5 Students - High School')}
                </h3>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {tx('ថ្នាក់ទី ១០ - ១២', 'Grades 10 - 12')}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {levelData.senior.topStudents.map((student, index) => (
                <div
                  key={`${student.studentId}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${
                        index === 0
                          ? 'bg-amber-500 shadow-xs'
                          : index === 1
                          ? 'bg-slate-400'
                          : index === 2
                          ? 'bg-amber-700'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {student.khmerName || student.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {tx('ថ្នាក់', 'Class')} {student.className}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                      {student.average}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectStudent(student.studentId)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                    >
                      {tx('មើលប្រវត្តិ', 'Profile')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
