'use client';

import { StudentReportCard as ReportCardType, getGradeLevelColor, getScoreColor } from '@/lib/api/grades';
import { User, Calendar, Trophy, TrendingUp, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface StudentReportCardProps {
  reportCard: ReportCardType;
  showPhoto?: boolean;
  compact?: boolean;
}

export default function StudentReportCard({ reportCard, showPhoto = true, compact = false }: StudentReportCardProps) {
  const { student, class: classInfo, semester, year, subjects, summary, attendance } = reportCard;

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showPhoto && student.photoUrl ? (
              <img src={student.photoUrl} alt={student.khmerName} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{student.khmerName}</h3>
              <p className="text-sm text-gray-500">{student.firstName} {student.lastName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(summary.overallPercentage)}`}>
              {summary.overallAverage.toFixed(1)}
            </div>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getGradeLevelColor(summary.overallGradeLevel)}`}>
              Grade {summary.overallGradeLevel}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">Rank: #{summary.classRank}/{summary.totalStudents}</span>
          <span className={summary.isPassing ? 'text-green-600' : 'text-red-600'}>
            {summary.isPassing ? '✓ Passing' : '✗ Failing'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden print:shadow-none">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {showPhoto && student.photoUrl ? (
              <img 
                src={student.photoUrl} 
                alt={student.khmerName} 
                className="w-20 h-20 rounded-xl object-cover border-2 border-white/30" 
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{student.khmerName}</h2>
              <p className="text-blue-100">{student.firstName} {student.lastName}</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-blue-100">
                <span>ID: {student.studentId || 'N/A'}</span>
                <span>•</span>
                <span>{classInfo.name}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{summary.overallAverage.toFixed(1)}</div>
            <div className="text-sm text-blue-100">Overall Average</div>
            <div className="mt-2 inline-block px-3 py-1 bg-white/20 rounded-full text-sm">
              Grade {summary.overallGradeLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            {semesterLabel} • {year}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Rank: #{summary.classRank} of {summary.totalStudents}
          </span>
          <span className={`flex items-center gap-1 ${summary.isPassing ? 'text-green-600' : 'text-red-600'}`}>
            {summary.isPassing ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {summary.isPassing ? 'Passing' : 'Failing'}
          </span>
        </div>
      </div>

      {/* Grades Table */}
      <div className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Subject Grades
        </h3>

        {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">{category}</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Subject</th>
                    {categorySubjects[0]?.monthlyGrades.map((_, i) => (
                      <th key={i} className="text-center py-2 px-2 text-sm font-medium text-gray-600 w-16">
                        M{i + 1}
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-600 bg-gray-50">Avg</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-600 bg-gray-50">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySubjects.map((subject) => (
                    <tr key={subject.subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-900">{subject.subject.nameKh}</div>
                        <div className="text-xs text-gray-500">{subject.subject.name}</div>
                      </td>
                      {subject.monthlyGrades.map((grade, i) => (
                        <td key={i} className="text-center py-2 px-2">
                          <span className={`text-sm ${getScoreColor(grade.percentage)}`}>
                            {grade.score}
                          </span>
                        </td>
                      ))}
                      <td className={`text-center py-2 px-3 bg-gray-50 font-medium ${getScoreColor(subject.percentage)}`}>
                        {subject.semesterAverage.toFixed(1)}
                      </td>
                      <td className="text-center py-2 px-3 bg-gray-50">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getGradeLevelColor(subject.gradeLevel)}`}>
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
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* Grade Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Academic Summary
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Subjects</span>
                <span className="font-medium">{summary.totalSubjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Average</span>
                <span className={`font-bold ${getScoreColor(summary.overallPercentage)}`}>
                  {summary.overallAverage.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Grade</span>
                <span className={`font-medium px-2 py-0.5 rounded ${getGradeLevelColor(summary.overallGradeLevel)}`}>
                  {summary.overallGradeLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Class Rank</span>
                <span className="font-medium">#{summary.classRank} / {summary.totalStudents}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="text-gray-600">Status</span>
                <span className={`font-bold ${summary.isPassing ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.isPassing ? '✓ PASSED' : '✗ FAILED'}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              Attendance Summary
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Present</span>
                <span className="font-medium text-green-600">{attendance.present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Late</span>
                <span className="font-medium text-orange-600">{attendance.late}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Absent</span>
                <span className="font-medium text-red-600">{attendance.absent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Excused / Permission</span>
                <span className="font-medium text-blue-600">{attendance.excused + attendance.permission}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="text-gray-600">Attendance Rate</span>
                <span className={`font-bold ${attendance.attendanceRate >= 80 ? 'text-green-600' : attendance.attendanceRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                  {attendance.attendanceRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-500">
        Generated on {new Date(reportCard.generatedAt).toLocaleDateString('en-US', { 
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
