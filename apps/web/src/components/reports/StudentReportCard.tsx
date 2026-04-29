'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { StudentReportCard as ReportCardType, getGradeLevelColor, getScoreColor } from '@/lib/api/grades';
import { downloadStudentReportCardPDF } from '@/lib/pdf/reportCardPdf';
import { User, Calendar, Trophy, TrendingUp, CheckCircle, XCircle, Clock, FileText, Download } from 'lucide-react';
import { formatEducationModelLabel, type EducationModel } from '@/lib/educationModel';

interface StudentReportCardProps {
  reportCard: ReportCardType;
  showPhoto?: boolean;
  compact?: boolean;
  schoolName?: string;
  educationModel?: EducationModel | string | null;
}

export default function StudentReportCard({
  reportCard,
  showPhoto = true,
  compact = false,
  schoolName,
  educationModel,
}: StudentReportCardProps) {
  const { student, class: classInfo, semester, year, subjects, summary, attendance } = reportCard;
  const educationModelLabel = formatEducationModelLabel(educationModel);

  const handleDownloadPDF = () => {
    downloadStudentReportCardPDF(reportCard, schoolName, educationModel);
  };

  // Group subjects by category
  const subjectsByCategory = subjects.reduce((acc, subject) => {
    const category = subject.subject.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subject);
    return acc;
  }, {} as Record<string, typeof subjects>);

  const semesterLabel = semester === 1 ? 'First Semester (ឆមាសទី១)' : 'Second Semester (ឆមាសទី២)';

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 hover:scale-[1.02] transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showPhoto && student.photoUrl ? (
              <img src={student.photoUrl} alt={student.khmerName} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-lg" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-500/20 shadow-inner">
                <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">{student.khmerName}</h3>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{student.firstName} {student.lastName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black tracking-tighter ${getScoreColor(summary.overallPercentage)}`}>
              {summary.overallAverage.toFixed(1)}
            </div>
            <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${getGradeLevelColor(summary.overallGradeLevel)}`}>
              <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_2e116437" /> {summary.overallGradeLevel}
            </span>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-gray-400 dark:text-gray-500"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_6891b1a9" /> <span className="text-gray-900 dark:text-white">#{summary.classRank}</span> / {summary.totalStudents}</span>
          <span className={summary.isPassing ? 'text-emerald-600' : 'text-rose-600'}>
            {summary.isPassing ? '✓ Integrity Verified' : '✗ Threshold Failed'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden print:shadow-none transition-colors duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-violet-950/40 p-10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
          <div className="flex items-center gap-8">
            {showPhoto && student.photoUrl ? (
              <img 
                src={student.photoUrl} 
                alt={student.khmerName} 
                className="w-28 h-28 rounded-3xl object-cover ring-4 ring-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-700" 
              />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest mb-4">
                <FileText className="w-3.5 h-3.5" />
                <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_98581f43" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-2">{student.khmerName}</h2>
              <p className="text-xl font-bold text-white/70 leading-none">{student.firstName} {student.lastName}</p>
              <div className="flex items-center gap-4 mt-6 text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
                <span className="px-3 py-1 bg-white/5 rounded-md border border-white/5"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_06c121bc" /> {student.studentId || 'N/A'}</span>
                <span className="px-3 py-1 bg-white/5 rounded-md border border-white/5">{classInfo.name}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-7xl font-black text-white tracking-tighter leading-none mb-2">{summary.overallAverage.toFixed(1)}</div>
            <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-6"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_12bbe0a3" /></div>
            <div className="flex flex-col items-end gap-4">
              <span className={`inline-block px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl border-2 shadow-2xl transition-all hover:scale-105 ${getGradeLevelColor(summary.overallGradeLevel)}`}>
                <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_992aa86c" /> {summary.overallGradeLevel}
              </span>
              <button
                onClick={handleDownloadPDF}
                className="group relative flex items-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all print:hidden"
              >
                <Download className="w-4 h-4" />
                <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_56b8c9b7" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-gray-50 dark:bg-gray-950 px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{semesterLabel} • {year}</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_6891b1a9" /> <span className="text-amber-600">#{summary.classRank}</span> / {summary.totalStudents}</span>
          </div>
          <div className="flex items-center gap-3 border-l border-gray-100 dark:border-gray-800 pl-8">
            <div className={`p-2 rounded-lg ${summary.isPassing ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {summary.isPassing ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${summary.isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summary.isPassing ? 'Integrity Verified' : 'Threshold Failed'}
            </span>
          </div>
          <span className="rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300">
            {educationModelLabel}
          </span>
        </div>
      </div>

      {/* Grades Table */}
      {/* Grades Table */}
      <div className="p-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_ffc7a2f3" /></h3>
        </div>

        {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
          <div key={category} className="mb-12 last:mb-0">
            <div className="flex items-center gap-4 mb-6">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] whitespace-nowrap">{category} <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_aa2a4b1d" /></h4>
              <div className="h-px w-full bg-gradient-to-r from-gray-100 dark:from-gray-800 to-transparent" />
            </div>
            <div className="overflow-x-auto rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-5 px-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_4a5158a0" /></th>
                    {categorySubjects[0]?.monthlyGrades.map((_, i) => (
                      <th key={i} className="text-center py-5 px-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-20">
                        <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_1ce8d7c6" /> {i + 1}
                      </th>
                    ))}
                    <th className="text-center py-5 px-6 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50/50 dark:bg-blue-500/5"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_875c51a7" /></th>
                    <th className="text-center py-5 px-6 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50/50 dark:bg-blue-500/5"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_f0bd6cac" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {categorySubjects.map((subject) => (
                    <tr key={subject.subject.id} className="group/row hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-5 px-6">
                        <div className="font-black text-gray-900 dark:text-white tracking-tight group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400 transition-colors">{subject.subject.nameKh}</div>
                        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{subject.subject.name}</div>
                      </td>
                      {subject.monthlyGrades.map((grade, i) => (
                        <td key={i} className="text-center py-5 px-3">
                          <span className={`text-lg font-black tracking-tighter ${getScoreColor(grade.percentage)}`}>
                            {grade.score}
                          </span>
                        </td>
                      ))}
                      <td className="text-center py-5 px-6 bg-blue-50/30 dark:bg-blue-500/5">
                        <span className={`text-lg font-black tracking-tighter ${getScoreColor(subject.percentage)}`}>
                          {subject.semesterAverage.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-center py-5 px-6 bg-blue-50/30 dark:bg-blue-500/5">
                        <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm rounded-lg border ${getGradeLevelColor(subject.gradeLevel)}`}>
                          {subject.gradeLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          {/* Grade Summary */}
          <div className="bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-violet-50/50 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-violet-900/10 rounded-[2rem] p-8 border border-blue-100 dark:border-blue-900/20 shadow-sm group">
            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-widest">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_c32d57b6" />
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_d55600c9" /></span>
                <span className="text-sm font-black text-gray-900 dark:text-white transition-transform group-hover/item:translate-x-1">{summary.totalSubjects}</span>
              </div>
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_ad29fb1f" /></span>
                <span className={`text-xl font-black tracking-tighter transition-transform group-hover/item:translate-x-1 ${getScoreColor(summary.overallPercentage)}`}>
                  {summary.overallAverage.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_3fbd33eb" /></span>
                <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border shadow-sm transition-transform group-hover/item:translate-x-1 ${getGradeLevelColor(summary.overallGradeLevel)}`}>
                  {summary.overallGradeLevel}
                </span>
              </div>
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_d36f460a" /></span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 transition-transform group-hover/item:translate-x-1">#{summary.classRank} / {summary.totalStudents}</span>
              </div>
              <div className="flex justify-between items-center pt-6 mt-6 border-t border-blue-100 dark:border-blue-900/30 group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_15e47115" /></span>
                <span className={`text-sm font-black tracking-[0.2em] transition-transform group-hover/item:translate-x-1 ${summary.isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {summary.isPassing ? 'VERIFIED' : 'FAILED'}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-cyan-50/50 dark:from-emerald-900/10 dark:via-teal-900/10 dark:to-cyan-900/10 rounded-[2rem] p-8 border border-emerald-100 dark:border-emerald-900/20 shadow-sm group">
            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-widest">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                <Clock className="w-5 h-5" />
              </div>
              <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_4a64ea25" />
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_ea26fd5e" /></span>
                <span className="text-sm font-black text-emerald-600 transition-transform group-hover/item:translate-x-1">{attendance.present}</span>
              </div>
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_930c8883" /></span>
                <span className="text-sm font-black text-amber-600 transition-transform group-hover/item:translate-x-1">{attendance.late}</span>
              </div>
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_832008c3" /></span>
                <span className="text-sm font-black text-rose-600 transition-transform group-hover/item:translate-x-1">{attendance.absent}</span>
              </div>
              <div className="flex justify-between items-center group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_e27b47e9" /></span>
                <span className="text-sm font-black text-blue-600 transition-transform group-hover/item:translate-x-1">{attendance.excused + attendance.permission}</span>
              </div>
              <div className="flex justify-between items-center pt-6 mt-6 border-t border-emerald-100 dark:border-emerald-900/30 group/item">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_d13db7a9" /></span>
                <span className={`text-xl font-black tracking-tighter transition-transform group-hover/item:translate-x-1 ${attendance.attendanceRate >= 80 ? 'text-emerald-600' : attendance.attendanceRate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {attendance.attendanceRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-950 px-10 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800">
        <AutoI18nText i18nKey="auto.web.components_reports_StudentReportCard.k_9999d19e" /> {new Date(reportCard.generatedAt).toLocaleDateString('en-US', { 
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
