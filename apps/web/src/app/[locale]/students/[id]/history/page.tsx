'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  ArrowLeft,
  User,
  Calendar,
  BookOpen,
  TrendingUp,
  GraduationCap,
  Clock,
  Award,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  ArrowUpRight,
} from 'lucide-react';

interface Progression {
  id: string;
  fromYear: { id: string; name: string };
  toYear: { id: string; name: string };
  fromClass: { name: string; grade: string };
  toClass: { name: string; grade: string };
  promotionType: string;
  promotionDate: string;
  notes: string | null;
}

interface ClassHistory {
  academicYear: { id: string; name: string; status: string };
  class: { id: string; name: string; grade: string; section: string | null };
  enrolledAt: string;
}

interface StudentHistory {
  student: {
    id: string;
    studentId: string;
    name: string;
    khmerName: string;
    gender: string;
    dateOfBirth: string;
    photoUrl: string | null;
    currentClass: { id: string; name: string; grade: string } | null;
    currentYear: { id: string; name: string } | null;
  };
  progressions: Progression[];
  classHistory: ClassHistory[];
  summary: {
    totalYears: number;
    totalProgressions: number;
    currentGrade: string | null;
    firstEnrolledYear: string | null;
  };
}

export default function StudentHistoryPage({ params }: { params: { locale: string; id: string } }) {
  const router = useRouter();
  const { id } = useParams();
  const [data, setData] = useState<StudentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${params.locale}/login`);
  };

  useEffect(() => {
    loadStudentHistory();
  }, [id]);

  const loadStudentHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${params.locale}/login`);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/${id}/progression`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load student history');
      }

      setData(result.data);
    } catch (err: any) {
      console.error('Error loading student history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPromotionTypeInfo = (type: string) => {
    switch (type) {
      case 'AUTOMATIC':
        return { label: 'Promoted', color: 'bg-green-100 text-green-700', icon: TrendingUp };
      case 'MANUAL':
        return { label: 'Manual', color: 'bg-blue-100 text-blue-700', icon: UserPlus };
      case 'REPEAT':
        return { label: 'Repeated', color: 'bg-orange-100 text-orange-700', icon: RefreshCw };
      case 'NEW_ADMISSION':
        return { label: 'New Admission', color: 'bg-purple-100 text-purple-700', icon: UserPlus };
      case 'TRANSFER_IN':
        return { label: 'Transfer In', color: 'bg-cyan-100 text-cyan-700', icon: ArrowUpRight };
      case 'TRANSFER_OUT':
        return { label: 'Transfer Out', color: 'bg-red-100 text-red-700', icon: ArrowUpRight };
      default:
        return { label: type, color: 'bg-gray-100 text-gray-700', icon: ChevronRight };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading student history...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-gray-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
              <p className="text-red-700 mb-4">{error || 'Student not found'}</p>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { student, progressions, classHistory, summary } = data;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${params.locale}/students/${id}`)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/50"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{student.khmerName || student.name}</h1>
                  <p className="text-blue-100">
                    {student.studentId} • Academic History
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-gray-900">{summary.totalYears}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Years Enrolled</h3>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-gray-900">{summary.totalProgressions}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Progressions</h3>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-gray-900">{summary.currentGrade || '-'}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Current Grade</h3>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">{summary.firstEnrolledYear || '-'}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">First Enrolled</h3>
            </div>
          </div>

          {/* Current Status */}
          {student.currentClass && student.currentYear && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Current Enrollment
              </h2>
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="p-3 bg-green-500 rounded-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{student.currentClass.name}</h3>
                  <p className="text-sm text-gray-600">
                    Grade {student.currentClass.grade} • {student.currentYear.name}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/${params.locale}/classes/${student.currentClass?.id}/roster`)}
                  className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  View Class
                </button>
              </div>
            </div>
          )}

          {/* Progression Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              Progression History
            </h2>

            {progressions.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-6">
                  {progressions.map((p, index) => {
                    const typeInfo = getPromotionTypeInfo(p.promotionType);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <div key={p.id} className="relative pl-16">
                        {/* Timeline dot */}
                        <div className={`absolute left-4 w-5 h-5 rounded-full border-4 border-white ${
                          p.promotionType === 'AUTOMATIC' ? 'bg-green-500' :
                          p.promotionType === 'REPEAT' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}></div>

                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                  <TypeIcon className="w-3 h-3 inline mr-1" />
                                  {typeInfo.label}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(p.promotionDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-900">
                                <span className="font-medium">{p.fromClass.name}</span>
                                <span className="text-gray-400">({p.fromYear.name})</span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{p.toClass.name}</span>
                                <span className="text-gray-400">({p.toYear.name})</span>
                              </div>
                              {p.notes && (
                                <p className="text-sm text-gray-600 mt-2">{p.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No progression history available.</p>
                <p className="text-sm">This student has not been promoted yet.</p>
              </div>
            )}
          </div>

          {/* Class History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-600" />
              Class Enrollment History
            </h2>

            {classHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Academic Year</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Grade</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Enrolled</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {classHistory.map((history, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{history.academicYear.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{history.class.name}</td>
                        <td className="px-4 py-3 text-gray-700">Grade {history.class.grade}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(history.enrolledAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            history.academicYear.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            history.academicYear.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {history.academicYear.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No class history available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
