'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { ClassReportSummary, getGradeLevelColor, getScoreColor } from '@/lib/api/grades';
import { downloadClassSummaryPDF } from '@/lib/pdf/reportCardPdf';
import { Users, User, Trophy, TrendingUp, TrendingDown, BarChart3, CheckCircle, XCircle, Medal, Download } from 'lucide-react';
import { formatEducationModelLabel, type EducationModel } from '@/lib/educationModel';

interface ClassReportCardProps {
  report: ClassReportSummary;
  onSelectStudent?: (studentId: string) => void;
  schoolName?: string;
  educationModel?: EducationModel | string | null;
}

export default function ClassReportCard({ report, onSelectStudent, schoolName, educationModel }: ClassReportCardProps) {
  const { class: classInfo, semester, year, students, statistics } = report;
  const educationModelLabel = formatEducationModelLabel(educationModel);

  const semesterLabel = semester === 1 ? 'First Semester' : 'Second Semester';

  const handleDownloadPDF = () => {
    downloadClassSummaryPDF(report, schoolName, educationModel);
  };

  // Get top 3 students
  const topStudents = students.slice(0, 3);
  
  // Grade distribution
  const gradeDistribution = students.reduce((acc, s) => {
    acc[s.gradeLevel] = (acc[s.gradeLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-violet-950/40 p-10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest mb-4">
              <Users className="w-3.5 h-3.5" />
              <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_97363773" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-2">{classInfo?.name || 'Academic Cluster'}</h2>
            <div className="flex items-center gap-4 mt-6 text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
              <span className="px-3 py-1 bg-white/5 rounded-md border border-white/5">{semesterLabel}</span>
              <span className="px-3 py-1 bg-white/5 rounded-md border border-white/5">{year}</span>
              <span className="px-3 py-1 bg-white/5 rounded-md border border-white/5">{students.length} <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_cee574fd" /></span>
              <span className="px-3 py-1 bg-white/5 rounded-md border border-white/5">{educationModelLabel}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-7xl font-black text-white tracking-tighter leading-none mb-2">{statistics.classAverage.toFixed(1)}</div>
            <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-6"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_1cf43748" /></div>
            <button
              onClick={handleDownloadPDF}
              className="group relative flex items-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all print:hidden"
            >
              <Download className="w-4 h-4" />
              <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_80732f2e" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-10 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/30">
        <div className="group p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all">
          <div className="text-3xl font-black text-emerald-600 mb-2 leading-none">{statistics.passingCount}</div>
          <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-md">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
            </div>
            <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_3b5179d1" />
          </div>
        </div>
        <div className="group p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all">
          <div className="text-3xl font-black text-rose-600 mb-2 leading-none">{statistics.failingCount}</div>
          <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/10 rounded-md">
              <XCircle className="w-3 h-3 text-rose-600" />
            </div>
            <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_5a2a3dc0" />
          </div>
        </div>
        <div className="group p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all">
          <div className="text-3xl font-black text-blue-600 mb-2 leading-none">{statistics.highestAverage.toFixed(1)}</div>
          <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-md">
              <TrendingUp className="w-3 h-3 text-blue-600" />
            </div>
            <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_84673696" />
          </div>
        </div>
        <div className="group p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all">
          <div className="text-3xl font-black text-amber-600 mb-2 leading-none">{statistics.lowestAverage.toFixed(1)}</div>
          <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded-md">
              <TrendingDown className="w-3 h-3 text-amber-600" />
            </div>
            <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_01130fcc" />
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="col-span-3 lg:col-span-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_4073eba0" /></h3>
          </div>
          <div className="space-y-4">
            {topStudents.map((student, index) => (
              <div 
                key={student.studentId} 
                className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-3xl cursor-pointer hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 transition-all"
                onClick={() => onSelectStudent?.(student.studentId)}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform ${
                  index === 0 ? 'bg-amber-500 shadow-amber-500/20' : index === 1 ? 'bg-slate-400 shadow-slate-400/20' : 'bg-orange-600 shadow-orange-600/20'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-gray-900 dark:text-white truncate tracking-tight">{student.student.khmerName}</div>
                  <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">{student.student.firstName} {student.student.lastName}</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black tracking-tighter ${getScoreColor(student.average)}`}>
                    {student.average.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="col-span-3 lg:col-span-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_893e75bb" /></h3>
          </div>
          <div className="space-y-4">
            {['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => {
              const count = gradeDistribution[grade] || 0;
              const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
              return (
                <div key={grade} className="group">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      grade === 'F' ? 'text-rose-500' : 'text-gray-500 dark:text-gray-400'
                    }`}><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_d5f6396e" /> {grade}</span>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white">{count} <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_0ab3a194" /></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.1)] ${
                          grade === 'A' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                          grade === 'B' ? 'bg-gradient-to-r from-emerald-300 to-emerald-500' :
                          grade === 'C' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                          grade === 'D' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                          grade === 'E' ? 'bg-gradient-to-r from-rose-300 to-rose-500' : 'bg-gradient-to-r from-rose-500 to-rose-700'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pass Rate */}
        <div className="col-span-3 lg:col-span-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-600">
              <Medal className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_ff81247c" /></h3>
          </div>
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-950/50 rounded-[2rem] border border-gray-100 dark:border-gray-800 border-dashed">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-100 dark:text-gray-800"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(statistics.passRate / 100) * 439.8} 439.8`}
                  className={`transition-all duration-1000 ${
                    statistics.passRate >= 80 ? 'text-emerald-500' : statistics.passRate >= 60 ? 'text-amber-500' : 'text-rose-500'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-black tracking-tighter ${
                  statistics.passRate >= 80 ? 'text-emerald-600' : 
                  statistics.passRate >= 60 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {statistics.passRate}%
                </span>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_3e3063fc" /></span>
              </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-8 flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              {statistics.passingCount} / {students.length} <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_dd544c88" />
            </p>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="p-10 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_afa27647" /></h3>
        </div>
        <div className="overflow-x-auto rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-100 dark:border-gray-800">
                <th className="text-left py-5 px-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-24"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_576b6f37" /></th>
                <th className="text-left py-5 px-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_be06b47c" /></th>
                <th className="text-center py-5 px-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-32"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_51d0799f" /></th>
                <th className="text-center py-5 px-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-32"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_42a8341b" /></th>
                <th className="text-center py-5 px-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-32"><AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_4236963d" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {students.map((student) => (
                <tr 
                  key={student.studentId} 
                  className="group/row hover:bg-gray-50/50 dark:hover:bg-gray-800/20 cursor-pointer transition-colors"
                  onClick={() => onSelectStudent?.(student.studentId)}
                >
                  <td className="py-6 px-6">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl text-xs font-black shadow-lg ${
                      student.rank <= 3 ? 'bg-amber-500 text-white rotate-3 group-hover/row:rotate-0 transition-transform' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {student.rank}
                    </span>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      {student.student.photoUrl ? (
                        <img src={student.student.photoUrl} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-lg" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-black text-gray-900 dark:text-white group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 transition-colors tracking-tight">{student.student.khmerName}</div>
                        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">{student.student.firstName} {student.student.lastName}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`text-center py-6 px-6 text-xl font-black tracking-tighter ${getScoreColor(student.average)}`}>
                    {student.average.toFixed(1)}
                  </td>
                  <td className="text-center py-6 px-6">
                    <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${getGradeLevelColor(student.gradeLevel)}`}>
                      {student.gradeLevel}
                    </span>
                  </td>
                  <td className="text-center py-6 px-6">
                    {student.isPassing ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_3bf3fe21" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <XCircle className="w-3.5 h-3.5" />
                        <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_fbe9dc0e" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-950 px-10 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800">
        <AutoI18nText i18nKey="auto.web.components_reports_ClassReportCard.k_fbe049c9" /> {new Date(report.generatedAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  );
}
