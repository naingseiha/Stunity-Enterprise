'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Database,
  GraduationCap,
  Info,
  Scale,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { SchoolReportsDashboardResponse } from '@/lib/api/reports';
import OperationalHealthSection from './OperationalHealthSection';

type DashboardProps = {
  data: SchoolReportsDashboardResponse;
  locale: string;
  schoolName: string;
  className?: string;
  generatedAtLabel: string;
  onSelectClass: (classId: string) => void;
  onSelectStudent: (studentId: string) => void;
};

type Priority = {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  value: string;
};

const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

const GRADE_BAND_META = {
  A: { range: '90–100%', color: '#1d4ed8', lightClass: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200' },
  B: { range: '80–89%', color: '#2563eb', lightClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  C: { range: '70–79%', color: '#60a5fa', lightClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  D: { range: '60–69%', color: '#93c5fd', lightClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  E: { range: '50–59%', color: '#bfdbfe', lightClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  F: { range: '<50%', color: '#e11d48', lightClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
} as const;

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  status = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  status?: 'neutral' | 'good' | 'warning' | 'critical';
}) {
  const statusClass = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    critical: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  }[status];

  return (
    <article className={`${cardClass} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 min-h-8 text-[11px] font-medium leading-4 text-slate-500 dark:text-slate-400">{detail}</p>
    </article>
  );
}

function SectionHeading({ title, description, eyebrow }: { title: string; description?: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">{eyebrow}</p>}
      <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
      {description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center dark:border-slate-700 dark:bg-slate-950/30">
      <Database className="h-5 w-5 text-slate-400" aria-hidden="true" />
      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default function CleanReportsDashboard({
  data,
  locale,
  schoolName,
  className,
  generatedAtLabel,
  onSelectClass,
  onSelectStudent,
}: DashboardProps) {
  const km = locale === 'km';
  const tx = useCallback((kh: string, en: string) => (km ? kh : en), [km]);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('');

  const model = useMemo(() => {
    const graded = data.passRate.passing + data.passRate.failing;
    const coverage = data.overview.totalStudents > 0
      ? Math.round((graded / data.overview.totalStudents) * 100)
      : 0;
    const atRiskShare = graded > 0 ? Math.round((data.passRate.failing / graded) * 100) : 0;
    const averageClassSize = data.overview.totalClasses > 0
      ? Math.round((data.overview.totalStudents / data.overview.totalClasses) * 10) / 10
      : 0;
    const studentTeacherRatio = data.overview.totalTeachers > 0
      ? Math.round((data.overview.totalStudents / data.overview.totalTeachers) * 10) / 10
      : 0;
    const attendanceAvailable = (data.overview.attendanceRecords ?? (data.overview.attendanceRate > 0 ? 1 : 0)) > 0;
    const attendanceRateReliable = data.overview.attendanceRateReliable
      ?? data.attendanceBreakdown?.rateReliable
      ?? (attendanceAvailable && data.overview.attendanceRate > 0);
    const teacherAttendanceAvailable = (data.overview.teacherAttendanceRecords ?? (data.overview.teacherAttendanceRate !== null ? 1 : 0)) > 0;
    const genderGap = Math.round((data.genderBreakdown.female.passRatePercent - data.genderBreakdown.male.passRatePercent) * 10) / 10;
    const observedTrend = data.trend.filter((point) => point.average > 0 || point.attendanceRate > 0);
    const subjects = [...data.averageScoreBySubject].sort((a, b) => a.passRatePercent - b.passRatePercent);
    const subjectFocus = subjects.slice(0, 8);
    const classesNeedingAttention = [...data.averageScoreByClass].sort((a, b) => a.average - b.average).slice(0, 8);
    const flowTotal = data.studentFlow.repeaters.total + data.studentFlow.transferIn.total + data.studentFlow.transferOut.total;

    const priorities: Priority[] = [];
    if (data.passRate.failing > 0) {
      priorities.push({
        severity: data.passRate.passRatePercent < 60 ? 'critical' : 'warning',
        title: tx('គាំទ្រសិស្សក្រោមកម្រិតជាប់', 'Support students below the passing mark'),
        detail: tx(
          `កំណត់ផែនការតាមដានសម្រាប់សិស្ស ${data.passRate.failing} នាក់ដែលមានពិន្ទុក្រោមកម្រិតជាប់។`,
          `Create follow-up plans for ${data.passRate.failing} students currently below the passing mark.`,
        ),
        value: `${atRiskShare}%`,
      });
    }
    const weakest = subjects[0];
    if (weakest && weakest.passRatePercent < 70) {
      priorities.push({
        severity: weakest.passRatePercent < 50 ? 'critical' : 'warning',
        title: tx(`ពង្រឹងមុខវិជ្ជា ${weakest.subjectKh}`, `Strengthen ${weakest.subject}`),
        detail: tx(
          'ពិនិត្យលទ្ធផលតាមថ្នាក់ ផែនការបង្រៀន និងលំហាត់បំប៉នសម្រាប់មុខវិជ្ជានេះ។',
          'Review class-level results, teaching plans and remedial support for this subject.',
        ),
        value: `${weakest.passRatePercent}%`,
      });
    }
    if (!attendanceRateReliable) {
      priorities.push({
        severity: 'warning',
        title: tx('បំពេញកំណត់ត្រាវត្តមានឱ្យគ្រប់', 'Complete attendance coverage'),
        detail: tx(
          attendanceAvailable
            ? 'មានកំណត់ត្រាអវត្តមាន ប៉ុន្តែខ្វះកំណត់ត្រាវត្តមានច្បាស់លាស់ ដូច្នេះមិនអាចគណនាអត្រាវត្តមានបានទេ។'
            : 'មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់សម្រាប់វាយតម្លៃការចូលរៀនក្នុងរយៈពេលនេះ។',
          attendanceAvailable
            ? 'Absence events exist, but explicit presence coverage is incomplete, so an attendance rate cannot be calculated safely.'
            : 'There are not enough records to evaluate attendance for this period.',
        ),
        value: attendanceAvailable ? tx('មិនពេញលេញ', 'Partial') : tx('ខ្វះទិន្នន័យ', 'Missing'),
      });
    } else if (data.overview.attendanceRate < 90) {
      priorities.push({
        severity: data.overview.attendanceRate < 80 ? 'critical' : 'warning',
        title: tx('កែលម្អវត្តមានសិស្ស', 'Improve student attendance'),
        detail: tx(
          'កំណត់ថ្នាក់ និងសិស្សដែលអវត្តមានញឹកញាប់ ដើម្បីសហការតាមដានជាមួយអាណាព្យាបាល។',
          'Identify recurring absence by class and coordinate follow-up with guardians.',
        ),
        value: `${data.overview.attendanceRate}%`,
      });
    }
    if (Math.abs(genderGap) >= 5) {
      priorities.push({
        severity: 'warning',
        title: tx('ពិនិត្យគម្លាតលទ្ធផលតាមភេទ', 'Review the gender outcome gap'),
        detail: tx(
          `អត្រាជាប់រវាងសិស្សស្រី និងប្រុសខុសគ្នា ${Math.abs(genderGap)} ភាគរយ។`,
          `Female and male pass rates differ by ${Math.abs(genderGap)} percentage points.`,
        ),
        value: `${genderGap > 0 ? '+' : ''}${genderGap}pp`,
      });
    }
    if (priorities.length === 0) {
      priorities.push({
        severity: 'info',
        title: tx('បន្តតាមដានសូចនាករសំខាន់ៗ', 'Continue monitoring core indicators'),
        detail: tx('មិនមានសញ្ញាបន្ទាន់ក្នុងរយៈពេលដែលបានជ្រើសរើសទេ។', 'No urgent signal is present in the selected period.'),
        value: tx('ស្ថិរភាព', 'Stable'),
      });
    }

    return {
      graded,
      coverage,
      atRiskShare,
      averageClassSize,
      studentTeacherRatio,
      attendanceAvailable,
      attendanceRateReliable,
      teacherAttendanceAvailable,
      genderGap,
      observedTrend,
      subjectFocus,
      classesNeedingAttention,
      flowTotal,
      priorities: priorities.slice(0, 3),
    };
  }, [data, tx]);

  const subjectGradeAnalysis = useMemo(() => {
    const subjectOptions = [...data.averageScoreBySubject].sort((a, b) => a.passRatePercent - b.passRatePercent);
    const selectedSubject = subjectOptions.find((subject) => subject.subject === selectedSubjectKey)
      ?? subjectOptions[0]
      ?? null;
    if (!selectedSubject) return null;

    const bands = selectedSubject.gradeDistribution.map((band) => ({
      ...band,
      unclassified: Math.max(0, band.total - band.male - band.female),
      meta: GRADE_BAND_META[band.grade],
    }));
    const assessed = bands.reduce((sum, band) => sum + band.total, 0);
    const femaleAssessed = bands.reduce((sum, band) => sum + band.female, 0);
    const maleAssessed = bands.reduce((sum, band) => sum + band.male, 0);
    const passingBands = bands.filter((band) => band.grade !== 'F');
    const femalePassing = passingBands.reduce((sum, band) => sum + band.female, 0);
    const malePassing = passingBands.reduce((sum, band) => sum + band.male, 0);
    const femalePassRate = femaleAssessed > 0 ? Math.round((femalePassing / femaleAssessed) * 100) : 0;
    const malePassRate = maleAssessed > 0 ? Math.round((malePassing / maleAssessed) * 100) : 0;
    const genderPassGap = femalePassRate - malePassRate;
    const excellenceCount = bands.filter((band) => band.grade === 'A' || band.grade === 'B').reduce((sum, band) => sum + band.total, 0);
    const excellenceShare = assessed > 0 ? Math.round((excellenceCount / assessed) * 100) : 0;
    const belowMarkCount = bands.find((band) => band.grade === 'F')?.total ?? 0;
    const belowMarkShare = assessed > 0 ? Math.round((belowMarkCount / assessed) * 100) : 0;
    const largestBand = [...bands].sort((a, b) => b.total - a.total)[0];

    const insights: Array<{ tone: 'critical' | 'warning' | 'info'; title: string; detail: string }> = [];
    if (belowMarkShare >= 30) {
      insights.push({
        tone: 'critical',
        title: tx('ក្រុមសិស្សក្រោមកម្រិតជាប់មានចំនួនខ្ពស់', 'A large group is below the passing mark'),
        detail: tx(
          `សិស្សនិទ្ទេស F មាន ${belowMarkCount} នាក់ (${belowMarkShare}%)។ គួរបែងចែកក្រុមបំប៉នតាមជំនាញដែលខ្វះ។`,
          `${belowMarkCount} students (${belowMarkShare}%) received F. Organize targeted remediation by missing skill.`,
        ),
      });
    } else if (belowMarkShare > 0) {
      insights.push({
        tone: 'warning',
        title: tx('តាមដានសិស្សនិទ្ទេស F', 'Follow up students receiving F'),
        detail: tx(
          `មានសិស្ស ${belowMarkCount} នាក់ (${belowMarkShare}%) ក្រោមកម្រិតជាប់ក្នុងមុខវិជ្ជានេះ។`,
          `${belowMarkCount} students (${belowMarkShare}%) are below the passing mark in this subject.`,
        ),
      });
    } else {
      insights.push({
        tone: 'info',
        title: tx('មិនមានសិស្សក្រោមកម្រិតជាប់', 'No student is below the passing mark'),
        detail: tx('សិស្សដែលបានវាយតម្លៃទាំងអស់ស្ថិតនៅនិទ្ទេស A–E។', 'All assessed students are within grades A–E.'),
      });
    }

    if (excellenceShare < 20 && assessed > 0) {
      insights.push({
        tone: 'warning',
        title: tx('ក្រុមនិទ្ទេស A–B នៅមានកម្រិតទាប', 'The A–B group remains limited'),
        detail: tx(
          `មានសិស្ស ${excellenceCount} នាក់ (${excellenceShare}%) ទទួលបាននិទ្ទេស A ឬ B។ គួរបន្ថែមលំហាត់កម្រិតខ្ពស់ និងការបង្រៀនតាមក្រុម។`,
          `${excellenceCount} students (${excellenceShare}%) received A or B. Add advanced practice and differentiated grouping.`,
        ),
      });
    } else {
      insights.push({
        tone: 'info',
        title: tx('សមត្ថភាពកម្រិតខ្ពស់', 'Higher-achievement group'),
        detail: tx(
          `សិស្ស ${excellenceCount} នាក់ (${excellenceShare}%) ស្ថិតនៅនិទ្ទេស A–B។`,
          `${excellenceCount} students (${excellenceShare}%) are in grades A–B.`,
        ),
      });
    }

    if (Math.abs(genderPassGap) >= 10 && femaleAssessed > 0 && maleAssessed > 0) {
      insights.push({
        tone: 'warning',
        title: tx('មានគម្លាតអត្រាជាប់តាមភេទ', 'A gender pass-rate gap is present'),
        detail: tx(
          `សិស្សស្រីជាប់ ${femalePassRate}% និងសិស្សប្រុសជាប់ ${malePassRate}% (គម្លាត ${genderPassGap > 0 ? '+' : ''}${genderPassGap}pp)។ ពិនិត្យបន្តតាមក្រុមសិស្ស និងមេរៀន។`,
          `Female pass rate is ${femalePassRate}% and male pass rate is ${malePassRate}% (${genderPassGap > 0 ? '+' : ''}${genderPassGap}pp gap). Review by learner group and topic.`,
        ),
      });
    } else if (largestBand) {
      insights.push({
        tone: 'info',
        title: tx(`និទ្ទេស ${largestBand.grade} ជាក្រុមធំបំផុត`, `Grade ${largestBand.grade} is the largest group`),
        detail: tx(
          `មានសិស្ស ${largestBand.total} នាក់ ស្មើ ${assessed > 0 ? Math.round((largestBand.total / assessed) * 100) : 0}% នៃអ្នកបានវាយតម្លៃ។`,
          `${largestBand.total} students, or ${assessed > 0 ? Math.round((largestBand.total / assessed) * 100) : 0}% of assessed students, are in this band.`,
        ),
      });
    }

    return {
      selectedSubject,
      subjectOptions,
      bands,
      assessed,
      femaleAssessed,
      maleAssessed,
      femalePassRate,
      malePassRate,
      genderPassGap,
      excellenceCount,
      excellenceShare,
      belowMarkCount,
      belowMarkShare,
      insights: insights.slice(0, 3),
    };
  }, [data.averageScoreBySubject, selectedSubjectKey, tx]);

  const scaleSuffix = data.scale.system === 'KHM_MOEYS' ? `/ ${data.scale.maxAverage}` : '';
  const classGapToPass = (average: number) => Math.round((data.scale.passingMark - average) * 10) / 10;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            {tx('សេចក្តីសង្ខេបប្រតិបត្តិការ', 'Operational overview')}
          </div>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">{schoolName}</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {data.period.khmerLabel || data.period.label}{className ? ` · ${tx('ថ្នាក់', 'Class')} ${className}` : ''}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tx('ធ្វើបច្ចុប្បន្នភាព', 'Updated')}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{generatedAtLabel || '—'}</p>
        </div>
      </header>

      <section aria-label={tx('សូចនាករសំខាន់', 'Key indicators')} className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label={tx('សិស្សសរុប', 'Total students')}
          value={data.overview.totalStudents.toLocaleString()}
          detail={`${data.overview.totalClasses} ${tx('ថ្នាក់', 'classes')} · ${model.averageClassSize} ${tx('នាក់/ថ្នាក់', 'per class')}`}
          icon={Users}
        />
        <MetricCard
          label={tx('អត្រាជាប់', 'Pass rate')}
          value={`${data.passRate.passRatePercent}%`}
          detail={`${data.passRate.passing.toLocaleString()} / ${model.graded.toLocaleString()} ${tx('សិស្សមានពិន្ទុ', 'graded students')}`}
          icon={Target}
          status={data.passRate.passRatePercent >= 80 ? 'good' : data.passRate.passRatePercent >= 60 ? 'warning' : 'critical'}
        />
        <MetricCard
          label={tx('សិស្សក្រោមកម្រិតជាប់', 'Below passing mark')}
          value={data.passRate.failing.toLocaleString()}
          detail={`${model.atRiskShare}% ${tx('នៃសិស្សដែលមានពិន្ទុ', 'of graded students')}`}
          icon={AlertTriangle}
          status={data.passRate.failing > 0 ? 'critical' : 'good'}
        />
        <MetricCard
          label={tx('វត្តមានសិស្ស', 'Student attendance')}
          value={model.attendanceRateReliable ? `${data.overview.attendanceRate}%` : '—'}
          detail={model.attendanceRateReliable
            ? `${(data.overview.attendanceRecords ?? 0).toLocaleString()} ${tx('កំណត់ត្រា', 'records')}`
            : model.attendanceAvailable
              ? tx('កំណត់ត្រាមិនពេញលេញសម្រាប់គណនាភាគរយ', 'Partial records; rate withheld')
            : tx('មិនមានកំណត់ត្រាក្នុងរយៈពេលនេះ', 'No records for this period')}
          icon={ClipboardCheck}
          status={!model.attendanceRateReliable ? 'warning' : data.overview.attendanceRate >= 90 ? 'good' : 'warning'}
        />
        <MetricCard
          label={tx('ការគ្របដណ្តប់ពិន្ទុ', 'Grade coverage')}
          value={`${model.coverage}%`}
          detail={`${model.graded.toLocaleString()} / ${data.overview.totalStudents.toLocaleString()} ${tx('សិស្ស', 'students')}`}
          icon={Database}
          status={model.coverage >= 90 ? 'good' : model.coverage >= 70 ? 'warning' : 'critical'}
        />
        <MetricCard
          label={tx('សមាមាត្រសិស្ស-គ្រូ', 'Student–teacher ratio')}
          value={data.overview.totalTeachers > 0 ? `${model.studentTeacherRatio}:1` : '—'}
          detail={`${data.overview.totalTeachers} ${tx('គ្រូ', 'teachers')} · ${data.overview.femaleTeachers} ${tx('ស្រី', 'female')}`}
          icon={GraduationCap}
        />
      </section>

      <section className={`${cardClass} overflow-hidden`} aria-labelledby="priority-actions-title">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <SectionHeading
            eyebrow={tx('អាទិភាព', 'Priorities')}
            title={tx('អ្វីដែលត្រូវធ្វើបន្ទាប់', 'What needs attention next')}
            description={tx('បង្ហាញតែសញ្ញាសំខាន់បំផុតចំនួន ៣ សម្រាប់សកម្មភាពក្នុងរយៈពេលនេះ។', 'The three strongest signals that should drive action in this period.')}
          />
        </div>
        <div className="grid divide-y divide-slate-100 dark:divide-slate-800 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {model.priorities.map((priority, index) => {
            const tone = priority.severity === 'critical'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              : priority.severity === 'warning'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
            const Icon = priority.severity === 'critical' ? AlertCircle : priority.severity === 'warning' ? AlertTriangle : CheckCircle2;
            return (
              <article key={`${priority.title}-${index}`} className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
                  <span className="text-lg font-black text-slate-950 dark:text-white">{priority.value}</span>
                </div>
                <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white">{priority.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{priority.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeading
              eyebrow={tx('លទ្ធផល', 'Performance')}
              title={model.observedTrend.length >= 4 ? tx('និន្នាការលទ្ធផល', 'Learning trend') : tx('លទ្ធផលតាមកម្រិតថ្នាក់', 'Performance by grade level')}
              description={model.observedTrend.length >= 4
                ? tx('មធ្យមភាគមុខវិជ្ជាតាមខែ (%)', 'Monthly subject average (%)')
                : tx(`ពិន្ទុមធ្យមលើមាត្រដ្ឋាន ${data.scale.maxAverage}`, `Average score on a ${data.scale.maxAverage}-point scale`)}
            />
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <TrendingUp className="h-3.5 w-3.5" />
              {model.observedTrend.length >= 4 ? `${model.observedTrend.length} ${tx('ខែ', 'months')}` : `${data.averageScoreByGradeLevel.length} ${tx('កម្រិតថ្នាក់', 'grade levels')}`}
            </span>
          </div>
          <div className="mt-5 h-72 w-full">
            {model.observedTrend.length >= 4 ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 288 }}>
                <LineChart data={model.observedTrend} margin={{ top: 8, right: 14, left: -18, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey={km ? 'khmerLabel' : 'label'} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="average" name={tx('ពិន្ទុមធ្យម', 'Average score')} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : data.averageScoreByGradeLevel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 288 }}>
                <BarChart data={data.averageScoreByGradeLevel} margin={{ top: 8, right: 14, left: -18, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, data.scale.maxAverage]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <ReferenceLine y={data.scale.passingMark} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Bar dataKey="average" name={tx('ពិន្ទុមធ្យម', 'Average score')} fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label={tx('មិនទាន់មានទិន្នន័យលទ្ធផលតាមកម្រិតថ្នាក់', 'No grade-level performance data')} />
            )}
          </div>
        </section>

        <section className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading
            eyebrow={tx('សមាសភាព', 'Composition')}
            title={tx('ជាប់ និងក្រោមកម្រិតជាប់', 'Passing vs. below mark')}
            description={tx(`កម្រិតជាប់ ${data.scale.passingMark} ${scaleSuffix}`, `Passing mark ${data.scale.passingMark} ${scaleSuffix}`)}
          />
          <div className="mt-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{data.passRate.passRatePercent}%</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{tx('អត្រាជាប់', 'Pass rate')}</p>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">n = {model.graded.toLocaleString()}</p>
            </div>
            <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-label={tx('សមាសភាពលទ្ធផល', 'Outcome composition')}>
              <div className="bg-blue-600" style={{ width: `${data.passRate.passRatePercent}%` }} />
              <div className="bg-rose-500" style={{ width: `${100 - data.passRate.passRatePercent}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/30">
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300">{tx('ជាប់', 'Passing')}</p>
                <p className="mt-1 text-xl font-black text-blue-950 dark:text-blue-100">{data.passRate.passing.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/30">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300">{tx('ក្រោមកម្រិត', 'Below mark')}</p>
                <p className="mt-1 text-xl font-black text-rose-950 dark:text-rose-100">{data.passRate.failing.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                {tx(
                  `គណនាពីសិស្សមានពិន្ទុ ${model.graded.toLocaleString()} នាក់; ការគ្របដណ្តប់ ${model.coverage}%។`,
                  `Calculated from ${model.graded.toLocaleString()} graded students; ${model.coverage}% coverage.`,
                )}
              </p>
            </div>
          </div>
        </section>
      </div>

      <OperationalHealthSection data={data} locale={locale} />

      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            eyebrow={tx('មូលហេតុសិក្សា', 'Academic drivers')}
            title={tx('មុខវិជ្ជាដែលត្រូវការការគាំទ្រ', 'Subjects needing support')}
            description={tx('រៀបតាមអត្រាជាប់ទាបបំផុត; បន្ទាត់ពណ៌លឿងបង្ហាញកម្រិត ៥០%។', 'Sorted by lowest pass rate; the amber line marks 50%.')}
          />
          {data.averageScoreBySubject.length > 8 && (
            <span className="text-[10px] font-semibold text-slate-400">{tx('បង្ហាញ ៨ មុខវិជ្ជាទាបបំផុត', 'Showing the 8 lowest subjects')}</span>
          )}
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="w-full" style={{ height: Math.max(280, model.subjectFocus.length * 42) }}>
            {model.subjectFocus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 360 }}>
                <BarChart data={model.subjectFocus} layout="vertical" margin={{ top: 4, right: 18, left: 20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey={km ? 'subjectKh' : 'subject'} width={100} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <ReferenceLine x={50} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Bar dataKey="passRatePercent" name={tx('អត្រាជាប់', 'Pass rate')} radius={[0, 5, 5, 0]} maxBarSize={20}>
                    {model.subjectFocus.map((subject) => (
                      <Cell key={subject.subject} fill={subject.passRatePercent < 50 ? '#e11d48' : subject.passRatePercent < 70 ? '#f59e0b' : '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label={tx('មិនទាន់មានទិន្នន័យតាមមុខវិជ្ជា', 'No subject performance data')} />
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">{tx('ចំនួនជាប់តាមមុខវិជ្ជា', 'Pass counts by subject')}</p>
              <p className="mt-1 text-[9px] text-slate-400">{tx('ចំនួនជាប់ ÷ សិស្សបានវាយតម្លៃ', 'Passing students ÷ assessed students')}</p>
            </div>
            {model.subjectFocus.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-2.5">{tx('មុខវិជ្ជា', 'Subject')}</th>
                      <th className="px-4 py-2.5">{tx('ជាប់', 'Pass')}</th>
                      <th className="px-4 py-2.5">{tx('ក្រោមកម្រិត', 'Below')}</th>
                      <th className="px-4 py-2.5 text-right">{tx('អត្រា', 'Rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {model.subjectFocus.map((subject) => (
                      <tr key={subject.subject} className="text-[10px] text-slate-600 dark:text-slate-300">
                        <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{km ? subject.subjectKh : subject.subject}</td>
                        <td className="px-4 py-2.5">{subject.passCount}</td>
                        <td className="px-4 py-2.5">{subject.failCount}</td>
                        <td className={`px-4 py-2.5 text-right font-black ${subject.passRatePercent < 50 ? 'text-rose-700 dark:text-rose-300' : subject.passRatePercent < 70 ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>{subject.passRatePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 text-center text-xs text-slate-500">{tx('មិនទាន់មានទិន្នន័យ', 'No data')}</div>
            )}
          </div>
        </div>
      </section>

      {subjectGradeAnalysis && (
        <section className={`${cardClass} overflow-hidden`} aria-labelledby="subject-grade-analysis-title">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow={tx('វិភាគនិទ្ទេសតាមមុខវិជ្ជា', 'Subject grade analysis')}
                title={tx('ការបែងចែកនិទ្ទេស A–F', 'A–F grade distribution')}
                description={tx(
                  `${className ? `ថ្នាក់ ${className}` : 'គ្រប់ថ្នាក់'} · ${data.period.khmerLabel || data.period.label} · គណនាតាមភាគរយពិន្ទុរបស់មុខវិជ្ជា`,
                  `${className ? `Class ${className}` : 'All classes'} · ${data.period.label} · based on each subject's percentage score`,
                )}
              />
              <label className="block min-w-56">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {tx('ជ្រើសរើសមុខវិជ្ជា', 'Select subject')}
                </span>
                <select
                  value={subjectGradeAnalysis.selectedSubject.subject}
                  onChange={(event) => setSelectedSubjectKey(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {subjectGradeAnalysis.subjectOptions.map((subject) => (
                    <option key={subject.subject} value={subject.subject}>{km ? subject.subjectKh : subject.subject}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <BookOpenCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="subject-grade-analysis-title" className="text-base font-black text-slate-950 dark:text-white">
                    {km ? subjectGradeAnalysis.selectedSubject.subjectKh : subjectGradeAnalysis.selectedSubject.subject}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {tx('A–E ជាប់ · F ក្រោមកម្រិតជាប់', 'A–E passing · F below the passing mark')}
                  </p>
                </div>
              </div>
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                n = {subjectGradeAnalysis.assessed.toLocaleString()}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('បានវាយតម្លៃ', 'Assessed')}</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{subjectGradeAnalysis.assessed}</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{tx(`ស្រី ${subjectGradeAnalysis.femaleAssessed} នាក់`, `${subjectGradeAnalysis.femaleAssessed} female`)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('អត្រាជាប់មុខវិជ្ជា', 'Subject pass rate')}</p>
                <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{subjectGradeAnalysis.selectedSubject.passRatePercent}%</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{subjectGradeAnalysis.selectedSubject.passCount} / {subjectGradeAnalysis.assessed}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tx('និទ្ទេស A–B', 'Grades A–B')}</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{subjectGradeAnalysis.excellenceShare}%</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{subjectGradeAnalysis.excellenceCount} {tx('នាក់', 'students')}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300">{tx('និទ្ទេស F', 'Grade F')}</p>
                <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">{subjectGradeAnalysis.belowMarkShare}%</p>
                <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">{subjectGradeAnalysis.belowMarkCount} {tx('នាក់', 'students')}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{tx('សមាសភាពនិទ្ទេស', 'Grade composition')}</p>
                <p className="text-[10px] font-medium text-slate-400">{tx('ភាគរយនៃសិស្សបានវាយតម្លៃ', '% of assessed students')}</p>
              </div>
              <div className="mt-3 flex h-5 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800" aria-label={tx('សមាសភាពនិទ្ទេស A ដល់ F', 'Grade composition A through F')}>
                {subjectGradeAnalysis.bands.map((band) => {
                  const share = subjectGradeAnalysis.assessed > 0 ? (band.total / subjectGradeAnalysis.assessed) * 100 : 0;
                  return (
                    <div
                      key={band.grade}
                      title={`${band.grade}: ${band.total} (${Math.round(share)}%)`}
                      className="flex h-full items-center justify-center border-r border-white/70 text-[9px] font-black text-white last:border-r-0"
                      style={{ width: `${share}%`, backgroundColor: band.meta.color }}
                    >
                      {share >= 7 ? band.grade : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {subjectGradeAnalysis.bands.map((band) => {
                const share = subjectGradeAnalysis.assessed > 0 ? Math.round((band.total / subjectGradeAnalysis.assessed) * 100) : 0;
                return (
                  <article key={band.grade} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${band.meta.lightClass}`}>{band.grade}</span>
                      <span className="text-[10px] font-bold text-slate-400">{band.meta.range}</span>
                    </div>
                    <p className="mt-3 text-xl font-black text-slate-950 dark:text-white">{band.total}</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {tx(`ស្រី ${band.female} · ប្រុស ${band.male}`, `Female ${band.female} · Male ${band.male}`)}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: band.meta.color }} />
                    </div>
                    <p className="mt-1.5 text-right text-[9px] font-bold text-slate-400">{share}%</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">{tx('តារាងចំនួននិទ្ទេស', 'Grade count table')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2.5">{tx('និទ្ទេស', 'Grade')}</th>
                        <th className="px-4 py-2.5">{tx('កម្រិតពិន្ទុ', 'Range')}</th>
                        <th className="px-4 py-2.5">{tx('សរុប', 'Total')}</th>
                        <th className="px-4 py-2.5">{tx('ស្រី', 'Female')}</th>
                        <th className="px-4 py-2.5">{tx('ប្រុស', 'Male')}</th>
                        <th className="px-4 py-2.5 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {subjectGradeAnalysis.bands.map((band) => (
                        <tr key={band.grade} className="text-xs text-slate-600 dark:text-slate-300">
                          <td className="px-4 py-2.5"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black ${band.meta.lightClass}`}>{band.grade}</span></td>
                          <td className="px-4 py-2.5 text-[10px]">{band.meta.range}</td>
                          <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white">{band.total}</td>
                          <td className="px-4 py-2.5">{band.female}</td>
                          <td className="px-4 py-2.5">{band.male}</td>
                          <td className="px-4 py-2.5 text-right font-bold">{subjectGradeAnalysis.assessed > 0 ? Math.round((band.total / subjectGradeAnalysis.assessed) * 100) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{tx('សេចក្តីវិភាគសម្រាប់អន្តរាគមន៍', 'Intervention analysis')}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{tx('បង្កើតពីការបែងចែកនិទ្ទេស និងទិន្នន័យភេទរបស់មុខវិជ្ជាដែលបានជ្រើស។', 'Derived from the selected subject distribution and gender counts.')}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${Math.abs(subjectGradeAnalysis.genderPassGap) >= 10 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {tx('គម្លាតភេទ', 'Gender gap')} {subjectGradeAnalysis.genderPassGap > 0 ? '+' : ''}{subjectGradeAnalysis.genderPassGap}pp
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {subjectGradeAnalysis.insights.map((insight, index) => {
                    const tone = insight.tone === 'critical'
                      ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20'
                      : insight.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50';
                    return (
                      <article key={`${insight.title}-${index}`} className={`rounded-lg border p-3 ${tone}`}>
                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{insight.title}</p>
                        <p className="mt-1 text-[10px] leading-4 text-slate-600 dark:text-slate-400">{insight.detail}</p>
                      </article>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400">{tx('អត្រាជាប់សិស្សស្រី', 'Female pass rate')}</p>
                    <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{subjectGradeAnalysis.femalePassRate}%</p>
                    <p className="text-[9px] text-slate-400">n={subjectGradeAnalysis.femaleAssessed}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400">{tx('អត្រាជាប់សិស្សប្រុស', 'Male pass rate')}</p>
                    <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{subjectGradeAnalysis.malePassRate}%</p>
                    <p className="text-[9px] text-slate-400">n={subjectGradeAnalysis.maleAssessed}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                {tx('កម្រិតនិទ្ទេសមុខវិជ្ជា៖ A ≥90%, B ≥80%, C ≥70%, D ≥60%, E ≥50%, F <50%។ ចំនួនសរុបអាចរួមមានសិស្សដែលមិនទាន់កំណត់ភេទ។', 'Subject grade bands: A ≥90%, B ≥80%, C ≥70%, D ≥60%, E ≥50%, F <50%. Totals may include students whose gender is not recorded.')}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className={`grid gap-5 ${className ? '' : 'xl:grid-cols-[1.35fr_0.65fr]'}`}>
        {!className && (
          <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <SectionHeading
              eyebrow={tx('តាមដានតាមថ្នាក់', 'Class follow-up')}
              title={tx('ថ្នាក់ដែលត្រូវការការយកចិត្តទុកដាក់', 'Classes needing attention')}
              description={tx('រៀបពីពិន្ទុមធ្យមទាបទៅខ្ពស់។ ចុចលើថ្នាក់ដើម្បីមើលលម្អិត។', 'Sorted from lowest to highest average. Select a class to drill down.')}
            />
          </div>
          {model.classesNeedingAttention.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 sm:px-6">{tx('ថ្នាក់', 'Class')}</th>
                    <th className="px-5 py-3">{tx('សិស្សមានពិន្ទុ', 'Graded')}</th>
                    <th className="px-5 py-3">{tx('ពិន្ទុមធ្យម', 'Average')}</th>
                    <th className="px-5 py-3">{tx('ស្ថានភាព', 'Status')}</th>
                    <th className="px-5 py-3 text-right">{tx('លម្អិត', 'Detail')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {model.classesNeedingAttention.map((row) => {
                    const gap = classGapToPass(row.average);
                    const below = gap > 0;
                    return (
                      <tr key={row.classId} className="text-xs text-slate-600 dark:text-slate-300">
                        <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white sm:px-6">{row.className}</td>
                        <td className="px-5 py-3.5">{row.studentCount}</td>
                        <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white">{row.average} {scaleSuffix}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${below ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                            {below ? tx(`ខ្វះ ${gap} ពិន្ទុ`, `${gap} below mark`) : tx('លើកម្រិតជាប់', 'Above mark')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button type="button" onClick={() => onSelectClass(row.classId)} className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                            {tx('មើល', 'View')} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6"><EmptyChart label={tx('មិនទាន់មានទិន្នន័យតាមថ្នាក់', 'No class performance data')} /></div>
          )}
          </section>
        )}

        <section className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading
            eyebrow={tx('សមធម៌', 'Equity')}
            title={tx('លទ្ធផលតាមភេទ', 'Outcomes by gender')}
            description={tx('អត្រាជាប់ក្នុងចំណោមសិស្សដែលមានពិន្ទុ។', 'Pass rate among graded students.')}
          />
          <div className="mt-6 space-y-6">
            {[
              { label: tx('សិស្សស្រី', 'Female'), value: data.genderBreakdown.female.passRatePercent, count: data.genderBreakdown.female.count },
              { label: tx('សិស្សប្រុស', 'Male'), value: data.genderBreakdown.male.passRatePercent, count: data.genderBreakdown.male.count },
            ].map((group) => (
              <div key={group.label}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{group.label} <span className="font-medium text-slate-400">(n={group.count})</span></span>
                  <span className="font-black text-slate-950 dark:text-white">{group.value}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${group.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-7 rounded-xl p-4 ${Math.abs(model.genderGap) >= 5 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Scale className={`h-4 w-4 ${Math.abs(model.genderGap) >= 5 ? 'text-amber-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{tx('គម្លាតអត្រាជាប់', 'Pass-rate gap')}</span>
              </div>
              <span className="text-lg font-black text-slate-950 dark:text-white">{model.genderGap > 0 ? '+' : ''}{model.genderGap}pp</span>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              {Math.abs(model.genderGap) >= 5
                ? tx('ត្រូវពិនិត្យបន្តតាមថ្នាក់ និងមុខវិជ្ជា។', 'Review the difference by class and subject.')
                : tx('មិនមានគម្លាតធំក្នុងរយៈពេលនេះទេ។', 'No material gap in this period.')}
            </p>
          </div>
        </section>
      </div>

      {data.atRiskStudents.length > 0 && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeading
                eyebrow={tx('បញ្ជីសកម្មភាព', 'Action list')}
                title={tx('សិស្សដែលត្រូវការគាំទ្រជាបន្ទាន់', 'Students needing immediate support')}
                description={tx('បញ្ជីសិស្សមានពិន្ទុមធ្យមទាបបំផុត ដើម្បីបង្កើតផែនការតាមដាន។', 'Lowest-average students for targeted follow-up planning.')}
              />
              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {tx(`បង្ហាញ ${data.atRiskStudents.length} នាក់`, `Showing ${data.atRiskStudents.length}`)}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 sm:px-6">{tx('សិស្ស', 'Student')}</th>
                  <th className="px-5 py-3">{tx('ថ្នាក់', 'Class')}</th>
                  <th className="px-5 py-3">{tx('មធ្យមភាគ', 'Average')}</th>
                  <th className="px-5 py-3 text-right">{tx('សកម្មភាព', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.atRiskStudents.map((student) => (
                  <tr key={student.studentId} className="text-xs text-slate-600 dark:text-slate-300">
                    <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white sm:px-6">{student.khmerName || student.name}</td>
                    <td className="px-5 py-3.5">{student.className}</td>
                    <td className="px-5 py-3.5 font-black text-rose-700 dark:text-rose-300">{student.average} {scaleSuffix}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button type="button" onClick={() => onSelectStudent(student.studentId)} className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                        {tx('ប្រវត្តិសិស្ស', 'Student profile')} <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {model.flowTotal > 0 && (
        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="grid gap-5 sm:grid-cols-[1fr_2fr] sm:items-center">
            <SectionHeading
              eyebrow={tx('ចលនាសិស្ស', 'Student flow')}
              title={tx('ការផ្លាស់ប្តូរស្ថានភាពចុះឈ្មោះ', 'Enrollment movement')}
              description={tx('បង្ហាញតែនៅពេលមានកំណត់ត្រាចលនាក្នុងរយៈពេល។', 'Shown only when movement records exist in the period.')}
            />
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: tx('ត្រួតថ្នាក់', 'Repeaters'), value: data.studentFlow.repeaters.total },
                { label: tx('ផ្ទេរចូល', 'Transfer in'), value: data.studentFlow.transferIn.total },
                { label: tx('ផ្ទេរចេញ', 'Transfer out'), value: data.studentFlow.transferOut.total },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <p className="text-xl font-black text-slate-950 dark:text-white">{item.value}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs font-black text-slate-700 dark:text-slate-300">{tx('គុណភាព និងប្រភពទិន្នន័យ', 'Data quality and source context')}</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                {tx(
                  `លទ្ធផលផ្អែកលើសិស្សមានពិន្ទុ ${model.graded.toLocaleString()} នាក់ (${model.coverage}% នៃសិស្សសរុប)។ សូចនាករដែលគ្មានកំណត់ត្រាត្រូវបានបង្ហាញជា “—” មិនមែនសូន្យទេ។`,
                  `Results use ${model.graded.toLocaleString()} graded students (${model.coverage}% of enrollment). Indicators without records are shown as “—”, not zero.`,
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className={`rounded-full px-2.5 py-1 ${model.attendanceRateReliable ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
              {tx('វត្តមានសិស្ស', 'Student attendance')}: {model.attendanceRateReliable ? tx('អាចគណនា', 'ready') : model.attendanceAvailable ? tx('មិនពេញលេញ', 'partial') : tx('ខ្វះ', 'missing')}
            </span>
            <span className={`rounded-full px-2.5 py-1 ${model.teacherAttendanceAvailable ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {tx('វត្តមានគ្រូ', 'Teacher attendance')}: {model.teacherAttendanceAvailable ? `${data.overview.teacherAttendanceRate}%` : tx('ខ្វះ', 'missing')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
