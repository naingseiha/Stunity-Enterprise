'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import {
  FileText,
  Home,
  ChevronRight,
  User,
  Calendar,
  Award,
  TrendingUp,
  TrendingDown,
  Book,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  BarChart3,
  History,
  AlertTriangle,
} from 'lucide-react';

interface TranscriptData {
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    photo: string | null;
    enrolledAt: string;
    status: string;
  };
  summary: {
    totalYears: number;
    currentClass: string | null;
    currentGrade: string | null;
    cumulativeAverage: number | null;
    cumulativeGrade: string | null;
    promotions: number;
    repeats: number;
    totalProgressions: number;
  };
  academicYears: {
    yearId: string;
    yearName: string;
    startDate: string;
    endDate: string;
    className: string;
    gradeLevel: string;
    overallAverage: number | null;
    overallGrade: string | null;
    subjectCount: number;
    subjects: {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      average: number;
      letterGrade: string;
      grades: {
        id: string;
        score: number;
        maxScore: number;
        percentage: number;
        month: string;
        monthNumber: number;
        year: number;
        remarks: string | null;
      }[];
    }[];
    attendance: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      rate: number;
    } | null;
  }[];
  progressions: {
    id: string;
    fromYear: string;
    toYear: string;
    fromClass: string;
    toClass: string;
    promotionType: string;
    notes: string | null;
    createdAt: string;
  }[];
  monthlySummaries: {
    month: string;
    monthNumber: number;
    year: number;
    totalScore: number;
    totalMaxScore: number;
    average: number;
    classRank: number | null;
    gradeLevel: string | null;
  }[];
}

const getGradeColor = (grade: string | null): string => {
  if (!grade) return 'text-gray-500';
  switch (grade) {
    case 'A': return 'text-emerald-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-yellow-600';
    case 'D': return 'text-orange-600';
    case 'E':
    case 'F': return 'text-red-600';
    default: return 'text-gray-500';
  }
};

const getGradeBg = (grade: string | null): string => {
  if (!grade) return 'bg-gray-100';
  switch (grade) {
    case 'A': return 'bg-emerald-100';
    case 'B': return 'bg-blue-100';
    case 'C': return 'bg-yellow-100';
    case 'D': return 'bg-orange-100';
    case 'E':
    case 'F': return 'bg-red-100';
    default: return 'bg-gray-100';
  }
};

export default function StudentTranscriptPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    
    const userData = TokenManager.getUserData();
    setUser(userData.user);
  }, [router]);

  useEffect(() => {
    if (user && studentId) {
      fetchTranscript();
    }
  }, [user, studentId]);

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/${studentId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTranscript(data.data);
        // Expand first year by default
        if (data.data.academicYears.length > 0) {
          setExpandedYears(new Set([data.data.academicYears[0].yearId]));
        }
      } else {
        setError(data.error || 'Failed to load transcript');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (yearId: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(yearId)) {
        newSet.delete(yearId);
      } else {
        newSet.add(yearId);
      }
      return newSet;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    // For now, use browser print to PDF
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <BlurLoader isLoading={true} showSpinner={false}>
          <div className="p-8">Loading transcript...</div>
        </BlurLoader>
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation />
        <main className="lg:ml-64 p-4 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800">Error Loading Transcript</h3>
              <p className="text-red-600">{error || 'Student not found'}</p>
              <button
                onClick={() => router.back()}
                className="mt-2 text-red-700 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Go back
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { student, summary, academicYears, progressions, monthlySummaries } = transcript;

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation />
      
      <main className="lg:ml-64 p-4 lg:p-8 print:ml-0 print:p-4">
        {/* Breadcrumb - hide on print */}
        <nav className="flex items-center text-sm text-gray-600 mb-6 print:hidden">
          <button onClick={() => router.push('/dashboard')} className="hover:text-orange-600 flex items-center">
            <Home className="w-4 h-4 mr-1" /> Dashboard
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push('/students')} className="hover:text-orange-600">
            Students
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push(`/students/${studentId}`)} className="hover:text-orange-600">
            {student.firstName} {student.lastName}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">Academic Transcript</span>
        </nav>

        {/* Action Buttons - hide on print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <Download className="w-5 h-5" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Transcript Content */}
        <div ref={printRef} className="bg-white rounded-xl shadow-lg p-6 lg:p-8 print:shadow-none">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              📜 Official Academic Transcript
            </h1>
            <p className="text-gray-500 mt-1">Complete Academic Record</p>
          </div>

          {/* Student Info */}
          <AnimatedContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Photo & Basic Info */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                  {student.photo ? (
                    <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                  ) : (
                    `${student.firstName[0]}${student.lastName[0]}`
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {student.firstName} {student.lastName}
                  </h2>
                  <p className="text-gray-500">ID: {student.studentId || 'N/A'}</p>
                  <p className="text-gray-500 text-sm">
                    DOB: {new Date(student.dateOfBirth).toLocaleDateString()}
                  </p>
                  <span className={`inline-flex px-2 py-1 rounded text-xs mt-1 ${
                    student.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {student.status}
                  </span>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Current Status
                </h3>
                <p className="text-lg font-bold text-gray-900">
                  {summary.currentClass || 'Not enrolled'}
                </p>
                <p className="text-sm text-gray-600">
                  Grade {summary.currentGrade || '-'}
                </p>
              </div>

              {/* Cumulative Grade */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Cumulative Performance
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${getGradeColor(summary.cumulativeGrade)}`}>
                    {summary.cumulativeGrade || '-'}
                  </span>
                  <span className="text-gray-600">
                    ({summary.cumulativeAverage?.toFixed(1) || '-'}%)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Based on {summary.totalYears} academic year(s)
                </p>
              </div>
            </div>
          </AnimatedContent>

          {/* Summary Statistics */}
          <AnimatedContent delay={100}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <Calendar className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{summary.totalYears}</p>
                <p className="text-xs text-gray-500">Academic Years</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold text-green-600">{summary.promotions}</p>
                <p className="text-xs text-gray-500">Promotions</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <TrendingDown className="w-6 h-6 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold text-red-600">{summary.repeats}</p>
                <p className="text-xs text-gray-500">Repeats</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <History className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold text-blue-600">{summary.totalProgressions}</p>
                <p className="text-xs text-gray-500">Total Progressions</p>
              </div>
            </div>
          </AnimatedContent>

          {/* Academic Years */}
          <AnimatedContent delay={200}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              Academic Records by Year
            </h3>

            {academicYears.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No academic records found
              </div>
            ) : (
              <div className="space-y-4">
                {academicYears.map((year, index) => (
                  <div key={year.yearId} className="border rounded-lg overflow-hidden">
                    {/* Year Header */}
                    <button
                      onClick={() => toggleYear(year.yearId)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg ${getGradeBg(year.overallGrade)} flex items-center justify-center`}>
                          <span className={`text-xl font-bold ${getGradeColor(year.overallGrade)}`}>
                            {year.overallGrade || '-'}
                          </span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900">{year.yearName}</h4>
                          <p className="text-sm text-gray-500">
                            {year.className} • {year.subjectCount} subjects
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {year.overallAverage && (
                          <span className="text-lg font-medium text-gray-700">
                            {year.overallAverage.toFixed(1)}%
                          </span>
                        )}
                        {year.attendance && (
                          <span className="text-sm text-gray-500 hidden lg:block">
                            Attendance: {year.attendance.rate}%
                          </span>
                        )}
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedYears.has(year.yearId) ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </button>

                    {/* Year Details */}
                    {expandedYears.has(year.yearId) && (
                      <div className="p-4 border-t">
                        {/* Attendance Summary */}
                        {year.attendance && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <h5 className="text-sm font-medium text-blue-800 mb-2">Attendance Summary</h5>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Present: {year.attendance.present}
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="w-4 h-4 text-red-500" />
                                Absent: {year.attendance.absent}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-yellow-500" />
                                Late: {year.attendance.late}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Excused: {year.attendance.excused}
                              </span>
                              <span className="font-medium">
                                Rate: {year.attendance.rate}%
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Subject Grades Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium text-gray-500">Subject</th>
                                <th className="text-center py-2 px-3 font-medium text-gray-500">Average</th>
                                <th className="text-center py-2 px-3 font-medium text-gray-500">Grade</th>
                                <th className="text-center py-2 px-3 font-medium text-gray-500">Records</th>
                              </tr>
                            </thead>
                            <tbody>
                              {year.subjects.map((subject) => (
                                <tr key={subject.subjectId} className="border-b last:border-0 hover:bg-gray-50">
                                  <td className="py-2 px-3">
                                    <span className="font-medium text-gray-900">{subject.subjectName}</span>
                                    {subject.subjectCode && (
                                      <span className="text-gray-400 text-xs ml-2">({subject.subjectCode})</span>
                                    )}
                                  </td>
                                  <td className="text-center py-2 px-3">
                                    <span className="font-medium">{subject.average?.toFixed(1)}%</span>
                                  </td>
                                  <td className="text-center py-2 px-3">
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${getGradeBg(subject.letterGrade)} ${getGradeColor(subject.letterGrade)}`}>
                                      {subject.letterGrade}
                                    </span>
                                  </td>
                                  <td className="text-center py-2 px-3 text-gray-500">
                                    {subject.grades.length} entries
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AnimatedContent>

          {/* Progression History */}
          {progressions.length > 0 && (
            <AnimatedContent delay={300}>
              <h3 className="text-lg font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-orange-500" />
                Progression History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">From</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">To</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressions.map((prog) => (
                      <tr key={prog.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{prog.fromClass}</div>
                          <div className="text-xs text-gray-500">{prog.fromYear}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{prog.toClass}</div>
                          <div className="text-xs text-gray-500">{prog.toYear}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            prog.promotionType === 'AUTOMATIC' ? 'bg-green-100 text-green-700' :
                            prog.promotionType === 'MANUAL' ? 'bg-blue-100 text-blue-700' :
                            prog.promotionType === 'REPEAT' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {prog.promotionType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(prog.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {prog.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedContent>
          )}

          {/* Monthly Performance Trend */}
          {monthlySummaries.length > 0 && (
            <AnimatedContent delay={400}>
              <h3 className="text-lg font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Monthly Performance Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Month</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Score</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Average</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Grade</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Class Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummaries.slice(0, 12).map((ms, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {ms.month} {ms.year}
                        </td>
                        <td className="text-center py-3 px-4">
                          {ms.totalScore.toFixed(1)} / {ms.totalMaxScore}
                        </td>
                        <td className="text-center py-3 px-4 font-medium">
                          {ms.average.toFixed(1)}%
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${getGradeBg(ms.gradeLevel)} ${getGradeColor(ms.gradeLevel)}`}>
                            {ms.gradeLevel || '-'}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-gray-500">
                          {ms.classRank ? `#${ms.classRank}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedContent>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-xs text-gray-400 print:block hidden">
            <p>Generated on {new Date().toLocaleDateString()} | Stunity Enterprise School Management System</p>
            <p className="mt-1">This is an official document. Unauthorized alteration is prohibited.</p>
          </div>
        </div>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:block {
              display: block !important;
            }
            .print\\:ml-0 {
              margin-left: 0 !important;
            }
            .print\\:p-4 {
              padding: 1rem !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            main, main * {
              visibility: visible;
            }
            main {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </main>
    </div>
  );
}
