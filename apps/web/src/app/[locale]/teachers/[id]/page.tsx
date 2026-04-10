'use client';

import { useEffect, useState, use } from 'react';
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
  isProfileLocked?: boolean;
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

export default function TeacherDetailPage(
  props: {
    params: Promise<{ locale: string; id: string }>;
  }
) {
  const params = use(props.params);
  const router = useRouter();
  const { locale, id } = params;

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  };

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}/teachers/${id}`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}/teachers/${id}/history`, {
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

  const handleToggleLock = async () => {
    if (!teacher) return;
    try {
      setIsTogglingLock(true);
      const { toggleProfileLock } = await import('@/lib/api/teachers');
      const newLockState = !teacher.isProfileLocked;
      await toggleProfileLock(teacher.id, newLockState);
      setTeacher({ ...teacher, isProfileLocked: newLockState });
    } catch (err) {
      console.error('Failed to toggle profile lock:', err);
      alert('Unable to change profile lock status. Please try again.');
    } finally {
      setIsTogglingLock(false);
    }
  };

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 p-8">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{error || 'Teacher not found'}</p>
            <button
              onClick={() => router.push(`/${locale}/teachers`)}
              className="mt-4 text-orange-600 dark:text-orange-400 hover:underline"
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 dark:from-amber-600 dark:via-orange-600 dark:to-red-700 text-white p-8 shadow-lg">
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
                src={`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}${teacher.photoUrl}`}
                alt={`${teacher.firstName} ${teacher.lastName}`}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white/30 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-4xl font-bold backdrop-blur-sm border border-white/20 shadow-xl">
                {teacher.firstName[0]}
                {teacher.lastName[0]}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {teacher.firstName} {teacher.lastName}
              </h1>
              {teacher.khmerName && (
                <p className="text-xl text-white/80 mt-1" style={{ fontFamily: 'Battambang, sans-serif' }}>
                  {teacher.khmerName}
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                {teacher.position && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/10">
                    {teacher.position}
                  </span>
                )}
                {teacher.department && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/10">
                    {teacher.department}
                  </span>
                )}
                {teacher.employeeId && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/10">
                    ID: {teacher.employeeId}
                  </span>
                )}
                <button
                  onClick={() => router.push(`/${params?.locale || 'en'}/teachers/${teacher.id}/subjects`)}
                  className="px-4 py-1 bg-white/30 hover:bg-white/40 rounded-full text-sm font-medium flex items-center gap-2 transition-colors border border-white/20"
                >
                  <BookOpen className="w-4 h-4" />
                  Manage Subjects
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 transition-colors">
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
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
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
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    {teacher.email && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
                          <Mail className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{teacher.email}</p>
                        </div>
                      </div>
                    )}
                    {teacher.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                          <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{teacher.phone}</p>
                        </div>
                      </div>
                    )}
                    {teacher.gender && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{teacher.gender.toLowerCase()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Protection / Lock status */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Identity Lock</h3>
                    <button
                      onClick={handleToggleLock}
                      disabled={isTogglingLock}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${
                        teacher.isProfileLocked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'
                      } ${isTogglingLock ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          teacher.isProfileLocked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                    {teacher.isProfileLocked
                      ? 'Modifications Locked'
                      : 'Unlocked'}
                  </p>
                  <p className="mt-2 text-[12px] font-medium text-slate-500 dark:text-gray-400">
                    {teacher.isProfileLocked
                      ? 'Name edits require admin approval.'
                      : 'Teacher can edit name freely.'}
                  </p>
                </div>

                {/* Qualifications */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Qualifications</h3>
                  <div className="space-y-3">
                    {teacher.qualification && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Qualification</p>
                        <p className="text-sm text-gray-900 dark:text-white mt-0.5">{teacher.qualification}</p>
                      </div>
                    )}
                    {teacher.specialization && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Specialization</p>
                        <p className="text-sm text-gray-900 dark:text-white mt-0.5">{teacher.specialization}</p>
                      </div>
                    )}
                    {!teacher.qualification && !teacher.specialization && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No qualifications recorded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Column - Homeroom & Classes */}
              <div className="space-y-6">
                {/* Homeroom */}
                {teacher.homeroomClass && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/30 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
                        <School className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Homeroom Teacher</p>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {teacher.homeroomClass.name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-amber-500" />
                        {teacher.homeroomClass._count.students} students
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4 text-amber-500" />
                        Grade {teacher.homeroomClass.gradeLevel}
                        {teacher.homeroomClass.section}
                      </span>
                    </div>
                  </div>
                )}

                {/* Classes Teaching */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Classes Teaching ({teacher.teacherClasses.length})
                  </h3>
                  {teacher.teacherClasses.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No classes assigned</p>
                  ) : (
                    <div className="space-y-3">
                      {teacher.teacherClasses.map((tc) => (
                        <div
                          key={tc.class.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border border-transparent dark:border-gray-700/50"
                          onClick={() => router.push(`/${locale}/classes/${tc.class.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{tc.class.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Subjects Teaching ({uniqueSubjects.length})
                  </h3>
                  {uniqueSubjects.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No subjects assigned</p>
                  ) : (
                    <div className="space-y-3">
                      {uniqueSubjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{subject.name}</p>
                              {subject.nameKh && (
                                <p
                                  className="text-sm text-gray-500 dark:text-gray-400"
                                  style={{ fontFamily: 'Battambang, sans-serif' }}
                                >
                                  {subject.nameKh}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                              {subject.code}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Grade {subject.grade}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
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
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Years Teaching</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {historyData.summary.totalYears}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total Classes</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {historyData.summary.totalClasses}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Subjects Taught</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {historyData.summary.totalSubjects}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* History Timeline */}
                  {historyData.history.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 transition-colors">
                      <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No assignment history found</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {historyData.history.map((yearHistory, index) => (
                        <div
                          key={yearHistory.academicYear.id}
                          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors"
                        >
                          {/* Year Header */}
                          <div
                            className={`p-6 ${
                              yearHistory.academicYear.isCurrent
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    yearHistory.academicYear.isCurrent
                                      ? 'bg-white/20'
                                      : 'bg-white dark:bg-gray-900 shadow-sm'
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
                                        : 'text-gray-900 dark:text-white'
                                    }`}
                                  >
                                    {yearHistory.academicYear.name}
                                  </h3>
                                  <p
                                    className={`text-sm ${
                                      yearHistory.academicYear.isCurrent
                                        ? 'text-white/80'
                                        : 'text-gray-500 dark:text-gray-400'
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
                                className={`flex gap-4 text-sm font-medium ${
                                  yearHistory.academicYear.isCurrent
                                    ? 'text-white/90'
                                    : 'text-gray-600 dark:text-gray-400'
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
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Classes ({yearHistory.classes.length})
                              </h4>
                              {yearHistory.classes.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500">No classes assigned</p>
                              ) : (
                                <div className="space-y-2">
                                  {yearHistory.classes.map((cls) => (
                                    <div
                                      key={cls.id}
                                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                          {cls.name}
                                        </span>
                                        {cls.isHomeroom && (
                                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded text-xs">
                                            Homeroom
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {cls.studentCount} students
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Subjects */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Subjects ({yearHistory.subjects.length})
                              </h4>
                              {yearHistory.subjects.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500">No subjects assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {yearHistory.subjects.map((subject) => (
                                    <span
                                      key={subject.id}
                                      className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full text-sm border border-blue-100 dark:border-blue-500/20"
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
                  <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Failed to load history</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
