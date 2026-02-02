'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  Users,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  Award,
  History,
  School,
  ChevronRight,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  khmerName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  gender?: string;
  employeeId?: string;
  position?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  homeroomClass?: {
    id: string;
    name: string;
    gradeLevel: number;
    section: string;
    _count: { students: number };
    students: any[];
  };
  teacherClasses: {
    class: {
      id: string;
      name: string;
      gradeLevel: number;
      section: string;
      _count: { students: number };
    };
  }[];
  subjectTeachers: {
    subject: {
      id: string;
      name: string;
      nameKh: string;
      code: string;
      grade: number;
      category: string;
    };
  }[];
}

interface YearHistory {
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    isCurrent: boolean;
  };
  classes: {
    id: string;
    name: string;
    gradeLevel: number;
    section: string;
    studentCount: number;
    isHomeroom: boolean;
  }[];
  homerooms: {
    id: string;
    name: string;
    gradeLevel: number;
    section: string;
    studentCount: number;
  }[];
  subjects: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    grade: number;
    category: string;
  }[];
  stats: {
    totalClasses: number;
    totalHomerooms: number;
    totalSubjects: number;
    totalStudents: number;
  };
}

interface HistoryData {
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
    photoUrl?: string;
  };
  history: YearHistory[];
  summary: {
    totalYears: number;
    totalClasses: number;
    totalSubjects: number;
  };
}

export default function TeacherDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const router = useRouter();
  const { locale, id } = params;

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3004/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setTeacher(data.data);
      } else {
        setError(data.error || 'Failed to load teacher');
      }
    } catch (err: any) {
      setError('Failed to load teacher details');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (historyData) return; // Already loaded
    setLoadingHistory(true);
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3004/teachers/${id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setHistoryData(data.data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTabChange = (tab: 'overview' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history' && !historyData) {
      loadHistory();
    }
  };

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 p-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 p-8">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error || 'Teacher not found'}</p>
            <button
              onClick={() => router.push(`/${locale}/teachers`)}
              className="mt-4 text-orange-600 hover:underline"
            >
              Back to Teachers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const uniqueSubjects = teacher.subjectTeachers
    .map((st) => st.subject)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-8">
          <button
            onClick={() => router.push(`/${locale}/teachers`)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Teachers
          </button>

          <div className="flex items-start gap-6">
            {teacher.photoUrl ? (
              <img
                src={teacher.photoUrl}
                alt={`${teacher.firstName} ${teacher.lastName}`}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white/30"
              />
            ) : (
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-4xl font-bold backdrop-blur-sm">
                {teacher.firstName[0]}
                {teacher.lastName[0]}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">
                {teacher.firstName} {teacher.lastName}
              </h1>
              {teacher.khmerName && (
                <p className="text-xl text-white/80 mt-1" style={{ fontFamily: 'Battambang, sans-serif' }}>
                  {teacher.khmerName}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-4">
                {teacher.position && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    {teacher.position}
                  </span>
                )}
                {teacher.department && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    {teacher.department}
                  </span>
                )}
                {teacher.employeeId && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    ID: {teacher.employeeId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'history', label: 'Assignment History', icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Contact & Info */}
              <div className="space-y-6">
                {/* Contact Info */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    {teacher.email && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                          <Mail className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium">{teacher.email}</p>
                        </div>
                      </div>
                    )}
                    {teacher.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Phone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium">{teacher.phone}</p>
                        </div>
                      </div>
                    )}
                    {teacher.gender && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gender</p>
                          <p className="text-sm font-medium">{teacher.gender}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Qualifications */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualifications</h3>
                  <div className="space-y-3">
                    {teacher.qualification && (
                      <div className="p-3 bg-green-50 rounded-xl">
                        <p className="text-xs text-green-600 font-medium">Qualification</p>
                        <p className="text-sm text-gray-900">{teacher.qualification}</p>
                      </div>
                    )}
                    {teacher.specialization && (
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-600 font-medium">Specialization</p>
                        <p className="text-sm text-gray-900">{teacher.specialization}</p>
                      </div>
                    )}
                    {!teacher.qualification && !teacher.specialization && (
                      <p className="text-gray-500 text-sm">No qualifications recorded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Column - Homeroom & Classes */}
              <div className="space-y-6">
                {/* Homeroom */}
                {teacher.homeroomClass && (
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border border-orange-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                        <School className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-orange-600 font-medium">Homeroom Teacher</p>
                        <h3 className="text-lg font-bold text-gray-900">
                          {teacher.homeroomClass.name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {teacher.homeroomClass._count.students} students
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        Grade {teacher.homeroomClass.gradeLevel}
                        {teacher.homeroomClass.section}
                      </span>
                    </div>
                  </div>
                )}

                {/* Classes Teaching */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Classes Teaching ({teacher.teacherClasses.length})
                  </h3>
                  {teacher.teacherClasses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No classes assigned</p>
                  ) : (
                    <div className="space-y-3">
                      {teacher.teacherClasses.map((tc) => (
                        <div
                          key={tc.class.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => router.push(`/${locale}/classes/${tc.class.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <GraduationCap className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{tc.class.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{tc.class._count.students} students</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Subjects */}
              <div>
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Subjects Teaching ({uniqueSubjects.length})
                  </h3>
                  {uniqueSubjects.length === 0 ? (
                    <p className="text-gray-500 text-sm">No subjects assigned</p>
                  ) : (
                    <div className="space-y-3">
                      {uniqueSubjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{subject.name}</p>
                              {subject.nameKh && (
                                <p
                                  className="text-sm text-gray-500"
                                  style={{ fontFamily: 'Battambang, sans-serif' }}
                                >
                                  {subject.nameKh}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {subject.code}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              Grade {subject.grade}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 capitalize">
                              {subject.category?.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : historyData ? (
                <div>
                  {/* Summary Stats */}
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Years Teaching</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {historyData.summary.totalYears}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Classes</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {historyData.summary.totalClasses}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Subjects Taught</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {historyData.summary.totalSubjects}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* History Timeline */}
                  {historyData.history.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border">
                      <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No assignment history found</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {historyData.history.map((yearHistory, index) => (
                        <div
                          key={yearHistory.academicYear.id}
                          className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                        >
                          {/* Year Header */}
                          <div
                            className={`p-6 ${
                              yearHistory.academicYear.isCurrent
                                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
                                : 'bg-gray-50 border-b'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    yearHistory.academicYear.isCurrent
                                      ? 'bg-white/20'
                                      : 'bg-white shadow-sm'
                                  }`}
                                >
                                  <Calendar
                                    className={`w-6 h-6 ${
                                      yearHistory.academicYear.isCurrent
                                        ? 'text-white'
                                        : 'text-orange-500'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <h3
                                    className={`text-xl font-bold ${
                                      yearHistory.academicYear.isCurrent
                                        ? 'text-white'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {yearHistory.academicYear.name}
                                  </h3>
                                  <p
                                    className={`text-sm ${
                                      yearHistory.academicYear.isCurrent
                                        ? 'text-white/80'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {new Date(
                                      yearHistory.academicYear.startDate
                                    ).toLocaleDateString()}{' '}
                                    -{' '}
                                    {new Date(
                                      yearHistory.academicYear.endDate
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`flex gap-4 text-sm ${
                                  yearHistory.academicYear.isCurrent
                                    ? 'text-white/90'
                                    : 'text-gray-600'
                                }`}
                              >
                                <span>{yearHistory.stats.totalClasses} classes</span>
                                <span>{yearHistory.stats.totalSubjects} subjects</span>
                                <span>{yearHistory.stats.totalStudents} students</span>
                              </div>
                            </div>
                          </div>

                          {/* Year Content */}
                          <div className="p-6 grid md:grid-cols-2 gap-6">
                            {/* Classes */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Classes ({yearHistory.classes.length})
                              </h4>
                              {yearHistory.classes.length === 0 ? (
                                <p className="text-sm text-gray-400">No classes assigned</p>
                              ) : (
                                <div className="space-y-2">
                                  {yearHistory.classes.map((cls) => (
                                    <div
                                      key={cls.id}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                          {cls.name}
                                        </span>
                                        {cls.isHomeroom && (
                                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                            Homeroom
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {cls.studentCount} students
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Subjects */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Subjects ({yearHistory.subjects.length})
                              </h4>
                              {yearHistory.subjects.length === 0 ? (
                                <p className="text-sm text-gray-400">No subjects assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {yearHistory.subjects.map((subject) => (
                                    <span
                                      key={subject.id}
                                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                                    >
                                      {subject.name} ({subject.code})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Failed to load history</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
