'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Clock3,
  Database,
  Info,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import type { SchoolReportsDashboardResponse } from '@/lib/api/reports';

type Props = {
  data: SchoolReportsDashboardResponse;
  locale: string;
};

const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

function MetricBox({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'blue' | 'amber' | 'rose';
}) {
  const valueClass = {
    neutral: 'text-slate-950 dark:text-white',
    blue: 'text-blue-700 dark:text-blue-300',
    amber: 'text-amber-700 dark:text-amber-300',
    rose: 'text-rose-700 dark:text-rose-300',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-black ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

export default function OperationalHealthSection({ data, locale }: Props) {
  const km = locale === 'km';
  const tx = (kh: string, en: string) => (km ? kh : en);

  const model = useMemo(() => {
    const monthly = data.trend
      .filter((point) => (point.gradedStudents ?? 0) > 0 || (point.attendanceRecords ?? 0) > 0)
      .map((point) => ({
        ...point,
        attendanceDisplayRate: point.attendanceRateReliable ? point.attendanceRate : null,
      }));
    const latest = monthly.at(-1);
    const previous = monthly.at(-2);
    const passDelta = latest && previous
      ? Math.round(((latest.passRatePercent ?? 0) - (previous.passRatePercent ?? 0)) * 10) / 10
      : null;
    const attendanceDelta = latest && previous && latest.attendanceRateReliable && previous.attendanceRateReliable
      ? Math.round((latest.attendanceRate - previous.attendanceRate) * 10) / 10
      : null;

    return { monthly, latest, passDelta, attendanceDelta };
  }, [data.trend]);

  const attendance = data.attendanceBreakdown;
  const discipline = data.disciplineSummary;
  const hasAttendanceRecords = Boolean(attendance && attendance.totalRecords > 0);
  const attendanceRateReliable = Boolean(attendance?.rateReliable);

  return (
    <section className="space-y-5" aria-label={tx('លទ្ធផល វត្តមាន និងវិន័យ', 'Learning, attendance and discipline')}>
      <article className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
              {tx('និន្នាការប្រចាំខែ', 'Monthly trend')}
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
              {tx('អត្រាជាប់ និងវត្តមានប្រចាំខែ', 'Monthly pass and attendance rates')}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {tx('អត្រាជាប់គណនាតាមសិស្សមានពិន្ទុក្នុងខែនីមួយៗ; វត្តមានគណនាតាមកំណត់ត្រាសិស្ស-វេន។', 'Pass rate uses students graded in each month; attendance uses student-session records.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-600" /> {tx('អត្រាជាប់', 'Pass rate')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-600" /> {tx('វត្តមាន', 'Attendance')}
            </span>
          </div>
        </div>

        {model.monthly.length >= 2 ? (
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 980, height: 288 }}>
              <BarChart data={model.monthly} margin={{ top: 8, right: 12, left: -18, bottom: 4 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={km ? 'khmerLabel' : 'label'} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip />
                <Bar dataKey="passRatePercent" name={tx('អត្រាជាប់', 'Pass rate')} fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="attendanceDisplayRate" name={tx('វត្តមាន', 'Attendance')} fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : model.latest ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricBox
              label={`${model.latest.khmerLabel || model.latest.label} · ${tx('អត្រាជាប់', 'Pass rate')}`}
              value={`${model.latest.passRatePercent ?? 0}%`}
              detail={`${model.latest.passing ?? 0} / ${model.latest.gradedStudents ?? 0} ${tx('សិស្សមានពិន្ទុ', 'graded students')}`}
              tone="blue"
            />
            <MetricBox
              label={`${model.latest.khmerLabel || model.latest.label} · ${tx('វត្តមាន', 'Attendance')}`}
              value={model.latest.attendanceRateReliable ? `${model.latest.attendanceRate}%` : '—'}
              detail={model.latest.attendanceRateReliable
                ? `${model.latest.attendanceRecords ?? 0} ${tx('កំណត់ត្រាសិស្ស-វេន', 'student-session records')}`
                : tx('កំណត់ត្រាវត្តមានមិនទាន់ពេញលេញ', 'Presence coverage is incomplete')}
              tone="neutral"
            />
          </div>
        ) : (
          <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30">
            <Database className="h-5 w-5 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{tx('មិនទាន់មានទិន្នន័យប្រចាំខែ', 'No monthly data available')}</p>
          </div>
        )}

        {model.latest && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>{tx('សិស្សមានពិន្ទុថ្មីបំផុត', 'Latest graded students')}: <strong className="text-slate-800 dark:text-slate-200">{model.latest.gradedStudents ?? 0}</strong></span>
            <span>{tx('ចលនាអត្រាជាប់', 'Pass-rate movement')}: <strong className="text-slate-800 dark:text-slate-200">{model.passDelta === null ? '—' : `${model.passDelta > 0 ? '+' : ''}${model.passDelta}pp`}</strong></span>
            <span>{tx('ចលនាវត្តមាន', 'Attendance movement')}: <strong className="text-slate-800 dark:text-slate-200">{model.attendanceDelta === null ? '—' : `${model.attendanceDelta > 0 ? '+' : ''}${model.attendanceDelta}pp`}</strong></span>
          </div>
        )}
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <article className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">{tx('ការចូលរៀន', 'Attendance')}</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{tx('វត្តមាន និងអវត្តមានសិស្ស', 'Student attendance composition')}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{tx('មួយកំណត់ត្រាតំណាងឱ្យសិស្សម្នាក់ក្នុងវេនសិក្សាមួយ។', 'One record represents one student in one school session.')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400">{tx('អត្រាវត្តមាន', 'Attendance rate')}</p>
              <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{attendanceRateReliable ? `${attendance?.attendanceRate}%` : '—'}</p>
            </div>
          </div>

          {hasAttendanceRecords && attendance ? (
            <>
              {!attendanceRateReliable && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <p className="text-[10px] leading-4 text-amber-800 dark:text-amber-200">
                    {tx('ប្រព័ន្ធមានកំណត់ត្រាអវត្តមាន/មានច្បាប់ ប៉ុន្តែខ្វះកំណត់ត្រាមករៀនច្បាស់លាស់។ ភាគរយខាងក្រោមជាសមាសភាពនៃកំណត់ត្រាដែលបានបញ្ចូល មិនមែនអត្រាវត្តមានសិស្សទេ។', 'Absence and permission events are recorded, but explicit presence coverage is incomplete. Percentages below describe logged records, not the student attendance rate.')}
                  </p>
                </div>
              )}
              <div className="mt-6 flex h-4 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800" aria-label={tx('សមាសភាពវត្តមាន', 'Attendance composition')}>
                <div className="bg-blue-600" style={{ width: `${attendance.onTime.rate}%` }} title={`${tx('ទាន់ពេល', 'On time')} ${attendance.onTime.rate}%`} />
                <div className="bg-amber-500" style={{ width: `${attendance.late.rate}%` }} title={`${tx('មកយឺត', 'Late')} ${attendance.late.rate}%`} />
                <div className="bg-rose-500" style={{ width: `${attendance.absent.rate}%` }} title={`${tx('អវត្តមាន', 'Absent')} ${attendance.absent.rate}%`} />
                <div className="bg-slate-400" style={{ width: `${attendance.excused.rate}%` }} title={`${tx('មានច្បាប់', 'Excused')} ${attendance.excused.rate}%`} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricBox label={tx('មកទាន់ពេល', 'On time')} value={attendance.onTime.count.toLocaleString()} detail={`${attendance.onTime.rate}% ${tx('នៃកំណត់ត្រាដែលបានបញ្ចូល', 'of logged records')}`} tone="blue" />
                <MetricBox label={tx('មករៀនយឺត', 'Late')} value={attendance.late.count.toLocaleString()} detail={`${attendance.late.rate}% ${tx('នៃកំណត់ត្រាដែលបានបញ្ចូល', 'of logged records')}`} tone="amber" />
                <MetricBox label={tx('អវត្តមាន', 'Absent')} value={attendance.absent.count.toLocaleString()} detail={`${attendance.absent.rate}% ${tx('នៃកំណត់ត្រាដែលបានបញ្ចូល', 'of logged records')}`} tone="rose" />
                <MetricBox label={tx('មានច្បាប់/អនុញ្ញាត', 'Excused/permission')} value={attendance.excused.count.toLocaleString()} detail={`${attendance.excused.rate}% ${tx('នៃកំណត់ត្រាដែលបានបញ្ចូល', 'of logged records')}`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <span>{tx('កំណត់ត្រាសរុប', 'Total records')}: <strong className="text-slate-800 dark:text-slate-200">{attendance.totalRecords.toLocaleString()}</strong></span>
                <span>{tx('សិស្សមានកំណត់ត្រា', 'Students covered')}: <strong className="text-slate-800 dark:text-slate-200">{attendance.studentsWithRecords.toLocaleString()}</strong></span>
              </div>
            </>
          ) : (
            <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30">
              <Database className="h-5 w-5 text-slate-400" />
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{tx('មិនទាន់មានកំណត់ត្រាវត្តមានក្នុងរយៈពេលនេះ', 'No attendance records for this period')}</p>
            </div>
          )}
        </article>

        <article className={`${cardClass} p-5 sm:p-6`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">{tx('វិន័យសិស្ស', 'Student discipline')}</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{tx('ករណីដែលត្រូវតាមដាន', 'Incidents requiring follow-up')}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{tx('បង្ហាញតែប្រភេទដែលមាន incident source អាចផ្ទៀងផ្ទាត់បាន។', 'Only categories with a verifiable incident source are counted.')}</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/30">
              <p className="text-xl font-black text-amber-800 dark:text-amber-200">{discipline?.totalTrackedIncidents ?? 0}</p>
              <p className="mt-1 text-[9px] font-bold text-amber-700 dark:text-amber-300">{tx('ករណីយឺត', 'Late incidents')}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <p className="text-xl font-black text-slate-950 dark:text-white">{discipline?.studentsInvolved ?? 0}</p>
              <p className="mt-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">{tx('សិស្សពាក់ព័ន្ធ', 'Students')}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-3 text-center dark:bg-rose-950/30">
              <p className="text-xl font-black text-rose-800 dark:text-rose-200">{discipline?.repeatedLateStudents ?? 0}</p>
              <p className="mt-1 text-[9px] font-bold text-rose-700 dark:text-rose-300">{tx('យឺត ≥3 ដង', 'Late ≥3')}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-center gap-2.5">
                <Clock3 className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">{tx('មករៀនយឺត', 'Late arrival')}</p>
                  <p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">{tx('ប្រភព៖ កំណត់ត្រាវត្តមាន', 'Source: attendance records')}</p>
                </div>
              </div>
              <span className="text-sm font-black text-amber-800 dark:text-amber-200">{discipline?.totalTrackedIncidents ?? 0}</span>
            </div>
            {[
              { icon: ShieldAlert, kh: 'ខុសឯកសណ្ឋាន', en: 'Uniform violation' },
              { icon: UserX, kh: 'ខុសបទបញ្ជាសក់', en: 'Hair-policy violation' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.en} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{tx(item.kh, item.en)}</p>
                      <p className="mt-0.5 text-[9px] text-slate-400">{tx('មិនទាន់មានប្រភពកត់ត្រា', 'No standardized source yet')}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">—</span>
                </div>
              );
            })}
          </div>

          {(discipline?.repeatedLateStudents ?? 0) > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 dark:bg-rose-950/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-300" />
              <p className="text-[10px] leading-4 text-rose-700 dark:text-rose-300">{tx(`មានសិស្ស ${discipline?.repeatedLateStudents} នាក់មកយឺតចាប់ពី 3 ដងឡើង។ ត្រូវកំណត់ការតាមដានជាមួយគ្រូបន្ទុកថ្នាក់។`, `${discipline?.repeatedLateStudents} students were late at least 3 times. Assign homeroom follow-up.`)}</p>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">{tx('សញ្ញា “—” មានន័យថាមិនទាន់មាន source សម្រាប់គណនា មិនមែនសូន្យករណីទេ។', '“—” means there is no source to calculate the category; it does not mean zero incidents.')}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
