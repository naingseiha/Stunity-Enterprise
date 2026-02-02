'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  TrendingUp,
  Award,
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  History,
} from 'lucide-react';

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  gender: string;
  dateOfBirth: string;
  email?: string;
  phoneNumber?: string;
  currentAddress?: string;
  photoUrl?: string;
}

interface Progression {
  id: string;
  fromAcademicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  toAcademicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  fromClass: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
  };
  toClass: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
  };
  promotionType: string;
  promotionDate: string;
  notes?: string;
}

export default function StudentDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const router = useRouter();
  const { locale, id } = params;

  const [student, setStudent] = useState<Student | null>(null);
  const [progressions, setProgressions] = useState<Progression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = TokenManager.getAccessToken();
        if (!token) {
          router.replace(`/${locale}/auth/login`);
          return;
        }

        // Fetch student details
        const studentRes = await fetch(
          `${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const studentData = await studentRes.json();

        if (!studentData.success) {
          setError(studentData.message || 'Failed to load student');
          setLoading(false);
          return;
        }

        setStudent(studentData.data);

        // Fetch progression history
        const progressionRes = await fetch(
          `${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/${id}/progression`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const progressionData = await progressionRes.json();

        if (progressionData.success) {
          setProgressions(progressionData.data.progressions);
        }

        setLoading(false);
      } catch (err: any) {
        setError('Error loading student data: ' + err.message);
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [id, locale, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error || 'Student not found'}</p>
            <button
              onClick={() => router.push(`/${locale}/students`)}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all"
            >
              Back to Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'AUTOMATIC':
        return <TrendingUp className="w-4 h-4" />;
      case 'MANUAL':
        return <User className="w-4 h-4" />;
      case 'REPEAT':
        return <Clock className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getPromotionTypeColor = (type: string) => {
    switch (type) {
      case 'AUTOMATIC':
        return 'bg-green-100 text-green-700';
      case 'MANUAL':
        return 'bg-blue-100 text-blue-700';
      case 'REPEAT':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/${locale}/students`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Students</span>
          </button>
        </div>

        {/* Student Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-24 h-24 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    {student.firstName} {student.lastName}
                  </h1>
                  <p className="text-xl text-gray-600" style={{ fontFamily: 'Battambang, sans-serif' }}>
                    {student.khmerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Student ID</p>
                  <p className="text-lg font-semibold text-gray-900">{student.studentId}</p>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="text-sm font-medium">{student.dateOfBirth}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="text-sm font-medium">{student.gender}</p>
                  </div>
                </div>

                {student.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium truncate">{student.email}</p>
                    </div>
                  </div>
                )}

                {student.phoneNumber && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium">{student.phoneNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Progression Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Academic Progression</h2>
                <p className="text-gray-600">Complete history of academic years and promotions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/${locale}/students/${student.id}/transcript`)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
              >
                <Award className="w-4 h-4" />
                View Transcript
              </button>
              <button
                onClick={() => router.push(`/${locale}/students/${student.id}/history`)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
              >
                <History className="w-4 h-4" />
                View Full History
              </button>
            </div>
          </div>

          {progressions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No progression history yet</p>
              <p className="text-sm text-gray-500">
                Student hasn't been promoted to another academic year
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-orange-200 to-yellow-200"></div>

              {/* Timeline Items */}
              <div className="space-y-6">
                {progressions.map((prog, index) => (
                  <div key={prog.id} className="relative pl-16">
                    {/* Timeline Dot */}
                    <div className="absolute left-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center shadow-md">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>

                    {/* Content Card */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {prog.fromAcademicYear.name} → {prog.toAcademicYear.name}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getPromotionTypeColor(
                                prog.promotionType
                              )}`}
                            >
                              {getPromotionTypeIcon(prog.promotionType)}
                              {prog.promotionType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Promoted on{' '}
                            {new Date(prog.promotionDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Class Progression */}
                      <div className="flex items-center gap-4 bg-white rounded-lg p-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">From Class</p>
                          <p className="font-semibold text-gray-900">{prog.fromClass.name}</p>
                          <p className="text-sm text-gray-600">
                            Grade {prog.fromClass.grade}
                            {prog.fromClass.section ? ` - Section ${prog.fromClass.section}` : ''}
                          </p>
                        </div>

                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-orange-600" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">To Class</p>
                          <p className="font-semibold text-gray-900">{prog.toClass.name}</p>
                          <p className="text-sm text-gray-600">
                            Grade {prog.toClass.grade}
                            {prog.toClass.section ? ` - Section ${prog.toClass.section}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {prog.notes && (
                        <div className="mt-4 p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Notes</p>
                          <p className="text-sm text-gray-700">{prog.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
