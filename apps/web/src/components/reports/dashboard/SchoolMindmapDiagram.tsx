'use client';

import React, { useMemo, useState } from 'react';
import {
  School,
  BookOpen,
  GraduationCap,
  Sparkles,
  Users,
  Award,
  TrendingUp,
  Target,
  Layers,
  ChevronRight,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { SchoolReportsDashboardResponse } from '@/lib/api/reports';
import { toKhmerDigits } from '@/lib/reports/templates/khm-moeys/khmer-date';

interface SchoolMindmapDiagramProps {
  data: SchoolReportsDashboardResponse;
  locale: string;
  schoolName: string;
  onSelectClass: (classId: string) => void;
}

const cardClass =
  'rounded-[2rem] border border-slate-200 bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800/60 dark:bg-slate-900 dark:shadow-black/30';

export default function SchoolMindmapDiagram({
  data,
  locale,
  schoolName,
  onSelectClass,
}: SchoolMindmapDiagramProps) {
  const [expandedBranch, setExpandedBranch] = useState<'all' | 'junior' | 'senior' | 'subjects'>('all');

  // Build node data grouped by school level
  const treeData = useMemo(() => {
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

    // Group junior classes by grade level (7, 8, 9)
    const juniorGrades = [7, 8, 9].map((gNum) => {
      const classes = juniorClasses.filter((c) => String(c.grade) === String(gNum));
      const avg =
        classes.length > 0
          ? Number((classes.reduce((sum, c) => sum + c.average, 0) / classes.length).toFixed(2))
          : 0;
      const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
      return { grade: gNum, classes, avg, totalStudents };
    });

    // Group senior classes by grade level (10, 11, 12)
    const seniorGrades = [10, 11, 12].map((gNum) => {
      const classes = seniorClasses.filter((c) => String(c.grade) === String(gNum));
      const avg =
        classes.length > 0
          ? Number((classes.reduce((sum, c) => sum + c.average, 0) / classes.length).toFixed(2))
          : 0;
      const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
      return { grade: gNum, classes, avg, totalStudents };
    });

    // Subject top highlights
    const topSubjects = [...data.averageScoreBySubject]
      .sort((a, b) => b.passRatePercent - a.passRatePercent)
      .slice(0, 4);

    const weakSubjects = [...data.averageScoreBySubject]
      .sort((a, b) => a.passRatePercent - b.passRatePercent)
      .slice(0, 3);

    return {
      juniorGrades,
      seniorGrades,
      topSubjects,
      weakSubjects,
    };
  }, [data.averageScoreByClass, data.averageScoreBySubject]);

  return (
    <div className={`${cardClass} overflow-hidden p-5 sm:p-8`}>
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              ទិដ្ឋភាព Mindmap / ដើមឈើរចនាសម្ព័ន្ធ
            </span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            ផែនទីទិន្នន័យសិក្សាសាលារៀន (School Data Mindmap)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            បង្ហាញទំនាក់ទំនងទិន្នន័យពី សាលារៀន ទៅកាន់ផ្នែក អនុវិទ្យាល័យ, វិទ្យាល័យ, និងមុខវិជ្ជាសិក្សា
          </p>
        </div>

        {/* BRANCH FILTER BUTTONS */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setExpandedBranch('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              expandedBranch === 'all'
                ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            គ្រប់មែកធាង
          </button>
          <button
            type="button"
            onClick={() => setExpandedBranch('junior')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              expandedBranch === 'junior'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            ផ្នែក អនុវិទ្យាល័យ
          </button>
          <button
            type="button"
            onClick={() => setExpandedBranch('senior')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              expandedBranch === 'senior'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            ផ្នែក វិទ្យាល័យ
          </button>
          <button
            type="button"
            onClick={() => setExpandedBranch('subjects')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              expandedBranch === 'subjects'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            មុខវិជ្ជា
          </button>
        </div>
      </div>

      {/* MINDMAP CANVAS / CONTAINER */}
      <div className="relative mt-8 min-h-[500px] rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 dark:border-slate-800/80 dark:bg-slate-950/40">
        
        {/* ROOT NODE (CENTER TOP) */}
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-purple-200 bg-gradient-to-r from-slate-900 to-purple-950 px-6 py-4 text-white shadow-xl ring-4 ring-purple-100 dark:border-purple-800 dark:ring-purple-950/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white shadow-md">
              <School className="h-5 w-5" />
            </span>
            <div>
              <span className="rounded-full bg-purple-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-200">
                សាលារៀន
              </span>
              <h3 className="font-moul text-sm font-bold tracking-tight text-amber-300 mt-0.5">{schoolName}</h3>
              <p className="text-[11px] text-purple-200 mt-1">
                សិស្សសរុប {toKhmerDigits(data.overview.totalStudents)} នាក់ · {toKhmerDigits(data.overview.totalClasses)} ថ្នាក់ · អត្រាជាប់ {toKhmerDigits(data.passRate.passRatePercent)}%
              </p>
            </div>
          </div>
          <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500 to-slate-300 dark:to-slate-700" />
        </div>

        {/* THREE MAIN BRANCHES (JUNIOR HIGH, HIGH SCHOOL, ACADEMICS) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* BRANCH 1: JUNIOR HIGH SCHOOL (ថ្នាក់ទី ៧-៩) */}
          {(expandedBranch === 'all' || expandedBranch === 'junior') && (
            <div className="flex flex-col items-center space-y-4">
              {/* BRANCH 1 CONNECTOR & HEADER NODE */}
              <div className="w-full rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600 to-cyan-600 p-4 text-white shadow-lg dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black">ផ្នែក អនុវិទ្យាល័យ</h4>
                      <p className="text-[10px] text-blue-100">ថ្នាក់ទី ៧, ៨ និង ៩</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black">
                    ៣ កម្រិតថ្នាក់
                  </span>
                </div>
              </div>

              {/* LEVEL 2 SUB-NODES (GRADES 7, 8, 9) */}
              <div className="w-full space-y-3 pl-2 sm:pl-4">
                {treeData.juniorGrades.map((gItem) => (
                  <div
                    key={`junior-g-${gItem.grade}`}
                    className="relative rounded-2xl border border-blue-100 bg-white p-3.5 shadow-xs transition hover:shadow-md dark:border-blue-900/30 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        ថ្នាក់ទី {toKhmerDigits(gItem.grade)}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        មធ្យមភាគ៖ {toKhmerDigits(gItem.avg)}
                      </span>
                    </div>

                    {/* CLASSES PILLS */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {gItem.classes.map((cls) => (
                        <button
                          key={cls.classId}
                          type="button"
                          onClick={() => onSelectClass(cls.classId)}
                          className="group inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        >
                          <span>{cls.className}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-blue-500">
                            ({toKhmerDigits(cls.average)})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BRANCH 2: HIGH SCHOOL (ថ្នាក់ទី ១០-១២) */}
          {(expandedBranch === 'all' || expandedBranch === 'senior') && (
            <div className="flex flex-col items-center space-y-4">
              {/* BRANCH 2 CONNECTOR & HEADER NODE */}
              <div className="w-full rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 to-purple-600 p-4 text-white shadow-lg dark:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black">ផ្នែក វិទ្យាល័យ</h4>
                      <p className="text-[10px] text-indigo-100">ថ្នាក់ទី ១០, ១១ និង ១២</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black">
                    ៣ កម្រិតថ្នាក់
                  </span>
                </div>
              </div>

              {/* LEVEL 2 SUB-NODES (GRADES 10, 11, 12) */}
              <div className="w-full space-y-3 pl-2 sm:pl-4">
                {treeData.seniorGrades.map((gItem) => (
                  <div
                    key={`senior-g-${gItem.grade}`}
                    className="relative rounded-2xl border border-indigo-100 bg-white p-3.5 shadow-xs transition hover:shadow-md dark:border-indigo-900/30 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        ថ្នាក់ទី {toKhmerDigits(gItem.grade)}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        មធ្យមភាគ៖ {toKhmerDigits(gItem.avg)}
                      </span>
                    </div>

                    {/* CLASSES PILLS */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {gItem.classes.map((cls) => (
                        <button
                          key={cls.classId}
                          type="button"
                          onClick={() => onSelectClass(cls.classId)}
                          className="group inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                        >
                          <span>{cls.className}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-indigo-500">
                            ({toKhmerDigits(cls.average)})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BRANCH 3: ACADEMIC SUBJECTS & INDICATORS */}
          {(expandedBranch === 'all' || expandedBranch === 'subjects') && (
            <div className="flex flex-col items-center space-y-4">
              {/* BRANCH 3 CONNECTOR & HEADER NODE */}
              <div className="w-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-teal-600 p-4 text-white shadow-lg dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs">
                      <Target className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black">លទ្ធផល និង មុខវិជ្ជា</h4>
                      <p className="text-[10px] text-emerald-100">មុខវិជ្ជាជួរមុខ និង មុខវិជ្ជាត្រូវកែលម្អ</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black">
                    {toKhmerDigits(data.averageScoreBySubject.length)} មុខវិជ្ជា
                  </span>
                </div>
              </div>

              {/* TOP SUBJECTS SUB-NODE */}
              <div className="w-full rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-xs dark:border-emerald-900/30 dark:bg-slate-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  🌟 មុខវិជ្ជាមានអត្រាជាប់ខ្ពស់
                </p>
                <div className="mt-2.5 space-y-2">
                  {treeData.topSubjects.map((sb) => (
                    <div key={sb.subject} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">
                        {sb.subjectKh || sb.subject}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {toKhmerDigits(sb.passRatePercent)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WEAK SUBJECTS SUB-NODE */}
              <div className="w-full rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 shadow-xs dark:border-rose-900/30 dark:bg-rose-950/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  ⚠️ មុខវិជ្ជាត្រូវការជំនួយបំប៉ន
                </p>
                <div className="mt-2.5 space-y-2">
                  {treeData.weakSubjects.map((sb) => (
                    <div key={sb.subject} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">
                        {sb.subjectKh || sb.subject}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {toKhmerDigits(sb.passRatePercent)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
