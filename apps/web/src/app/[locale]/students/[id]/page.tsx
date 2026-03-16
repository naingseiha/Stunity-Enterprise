'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
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

export default function StudentDetailPage(
  props: {
    params: Promise<{ locale: string; id: string }>;
  }
) {
  const params = use(props.params);
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

  // Skeleton for loading state
  const StudentDetailSkeleton = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
            <div className="flex-1">
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-pulse"></div>
          ))}
        </div>

        {/* History Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <BlurLoader isLoading={true} skeleton={<StudentDetailSkeleton />}>
        <div />
      </BlurLoader>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors duration-500">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Student not found'}</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <AnimatedContent animation="fade" delay={0}>
          <div className="mb-6">
            <button
              onClick={() => router.push(`/${locale}/students`)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Students</span>
            </button>
          </div>
        </AnimatedContent>

        {/* Student Profile Card */}
        <AnimatedContent animation="slide-up" delay={50}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 mb-6 transition-colors">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {student.photoUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}${student.photoUrl}`}
                    alt={`${student.firstName} ${student.lastName}`}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-gray-800 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {student.firstName} {student.lastName}
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Battambang, sans-serif' }}>
                    {student.khmerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Student ID</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-800/50 px-3 py-1 rounded-lg mt-1">{student.studentId}</p>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-300">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Date of Birth</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{student.dateOfBirth}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-300">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{student.gender.toLowerCase()}</p>
                  </div>
                </div>

                {student.email && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-300">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                      <Mail className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.email}</p>
                    </div>
                  </div>
                )}

                {student.phoneNumber && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-300">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                      <Phone className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{student.phoneNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </AnimatedContent>

        {/* Academic Progression Timeline */}
        <AnimatedContent animation="slide-up" delay={100}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 rounded-xl flex items-center justify-center border border-amber-200/50 dark:border-amber-500/30">
                  <Award className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Academic Progression</h2>
                  <p className="text-gray-600 dark:text-gray-400">Complete history of academic years and promotions</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/${locale}/students/${student.id}/transcript`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                >
                  <Award className="w-4 h-4" />
                  View Transcript
                </button>
                <button
                  onClick={() => router.push(`/${locale}/students/${student.id}/history`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                >
                  <History className="w-4 h-4" />
                  View Full History
                </button>
              </div>
            </div>

            {progressions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300">No progression history yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Student hasn't been promoted to another academic year
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-amber-200 to-orange-200 dark:from-amber-500/30 dark:to-orange-500/30"></div>

                {/* Timeline Items */}
                <div className="space-y-6">
                  {progressions.map((prog, index) => (
                  <div key={prog.id} className="relative pl-16 group">
                    {/* Timeline Dot */}
                    <div className="absolute left-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-400 dark:from-amber-500 dark:to-orange-500 rounded-full flex items-center justify-center shadow-md ring-4 ring-white dark:ring-gray-900 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>

                    {/* Content Card */}
                    <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-500/5 dark:to-orange-500/5 rounded-xl p-6 border border-amber-100 dark:border-amber-500/20 group-hover:border-amber-300 dark:group-hover:border-amber-500/40 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {prog.fromAcademicYear.name} <span className="text-amber-500 mx-1">→</span> {prog.toAcademicYear.name}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${
                                prog.promotionType === 'AUTOMATIC' 
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                  : prog.promotionType === 'MANUAL'
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                  : prog.promotionType === 'REPEAT'
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                  : 'bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/20'
                              }`}
                            >
                              {getPromotionTypeIcon(prog.promotionType)}
                              {prog.promotionType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
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
                      <div className="flex items-center gap-4 bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">From Class</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{prog.fromClass.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Grade {prog.fromClass.grade}
                            {prog.fromClass.section ? ` - Section ${prog.fromClass.section}` : ''}
                          </p>
                        </div>

                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">To Class</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{prog.toClass.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Grade {prog.toClass.grade}
                            {prog.toClass.section ? ` - Section ${prog.toClass.section}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {prog.notes && (
                        <div className="mt-4 p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{prog.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </AnimatedContent>
      </div>
    </div>
  );
}
