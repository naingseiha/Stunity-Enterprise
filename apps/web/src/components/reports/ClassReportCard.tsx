'use client';

import { ClassReportSummary, getGradeLevelColor, getScoreColor } from '@/lib/api/grades';
import { Users, Trophy, TrendingUp, TrendingDown, BarChart3, CheckCircle, XCircle, Medal } from 'lucide-react';

interface ClassReportCardProps {
  report: ClassReportSummary;
  onSelectStudent?: (studentId: string) => void;
}

export default function ClassReportCard({ report, onSelectStudent }: ClassReportCardProps) {
  const { class: classInfo, semester, year, students, statistics } = report;

  const semesterLabel = semester === 1 ? 'First Semester' : 'Second Semester';

  // Get top 3 students
  const topStudents = students.slice(0, 3);
  
  // Grade distribution
  const gradeDistribution = students.reduce((acc, s) => {
    acc[s.gradeLevel] = (acc[s.gradeLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{classInfo?.name || 'Class Report'}</h2>
            <p className="text-indigo-100 mt-1">
              {semesterLabel} • {year} • {students.length} Students
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{statistics.classAverage.toFixed(1)}</div>
            <div className="text-sm text-indigo-100">Class Average</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{statistics.passingCount}</div>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Passing
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{statistics.failingCount}</div>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4" />
            Failing
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{statistics.highestAverage.toFixed(1)}</div>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Highest
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{statistics.lowestAverage.toFixed(1)}</div>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <TrendingDown className="w-4 h-4" />
            Lowest
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="col-span-1">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {topStudents.map((student, index) => (
              <div 
                key={student.studentId} 
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg cursor-pointer hover:from-yellow-100 hover:to-amber-100 transition"
                onClick={() => onSelectStudent?.(student.studentId)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{student.student.khmerName}</div>
                  <div className="text-xs text-gray-500">{student.student.firstName} {student.student.lastName}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${getScoreColor(student.average)}`}>
                    {student.average.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="col-span-1">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Grade Distribution
          </h3>
          <div className="space-y-2">
            {['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => {
              const count = gradeDistribution[grade] || 0;
              const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
              return (
                <div key={grade} className="flex items-center gap-2">
                  <span className={`w-8 text-center text-sm font-medium px-2 py-0.5 rounded ${getGradeLevelColor(grade)}`}>
                    {grade}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        grade === 'A' ? 'bg-green-500' :
                        grade === 'B' ? 'bg-green-400' :
                        grade === 'C' ? 'bg-yellow-500' :
                        grade === 'D' ? 'bg-orange-500' :
                        grade === 'E' ? 'bg-red-400' : 'bg-red-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pass Rate */}
        <div className="col-span-1">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-green-600" />
            Pass Rate
          </h3>
          <div className="flex flex-col items-center justify-center h-40">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={statistics.passRate >= 80 ? '#22c55e' : statistics.passRate >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(statistics.passRate / 100) * 351.86} 351.86`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${
                  statistics.passRate >= 80 ? 'text-green-600' : 
                  statistics.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {statistics.passRate}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {statistics.passingCount} of {students.length} passed
            </p>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="p-6 border-t border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          All Students ({students.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 w-12">Rank</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Student</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600 w-24">Average</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600 w-20">Grade</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr 
                  key={student.studentId} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectStudent?.(student.studentId)}
                >
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      student.rank <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {student.rank}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-3">
                      {student.student.photoUrl ? (
                        <img src={student.student.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{student.student.khmerName}</div>
                        <div className="text-xs text-gray-500">{student.student.firstName} {student.student.lastName}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`text-center py-2 px-3 font-bold ${getScoreColor(student.average)}`}>
                    {student.average.toFixed(1)}
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getGradeLevelColor(student.gradeLevel)}`}>
                      {student.gradeLevel}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    {student.isPassing ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        Fail
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-500">
        Generated on {new Date(report.generatedAt).toLocaleDateString('en-US', { 
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
