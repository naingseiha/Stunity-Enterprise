'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { 
  ArrowLeft, Calendar, Users, BookOpen, TrendingUp, 
  Edit, Trash2, Settings as SettingsIcon, CheckCircle, 
  AlertCircle, Star, Copy, Award, GraduationCap, 
  UserCheck, UserX, ChevronRight, BarChart3, Clock,
  CalendarDays, FileText, PieChart, ArrowUpRight, ArrowDownRight,
  School, UserPlus, RefreshCw, History
} from 'lucide-react';

interface PromotionStats {
  promotedOut: number;
  repeated: number;
  graduated: number;
  transferredOut: number;
  newAdmissions: number;
  transferredIn: number;
  promotedIn: number;
}

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  section: string | null;
  track: string | null;
  capacity: number | null;
  studentCount: number;
  isAtCapacity: boolean;
  homeroomTeacher: { id: string; name: string } | null;
}

interface TeacherInfo {
  id: string;
  name: string;
  position: string | null;
  classCount: number;
}

interface PromotionRecord {
  studentId: string;
  studentName: string;
  gender: string;
  fromClass: string;
  toClass: string;
  toYear?: string;
  fromYear?: string;
  type: string;
  date: string;
}

interface AcademicYearDetail {
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
    isPromotionDone: boolean;
    promotionDate: string | null;
    copiedFromYearId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  statistics: {
    totalStudents: number;
    totalClasses: number;
    totalTeachers: number;
    studentsByGrade: Record<string, number>;
    studentsByGender: Record<string, number>;
    promotionStats: PromotionStats;
    attendance: Record<string, number>;
    grades: {
      averageScore: number | null;
      totalGradeEntries: number;
    };
  };
  classes: ClassInfo[];
  teachers: TeacherInfo[];
  terms: Array<{ id: string; name: string; termNumber: number; startDate: string; endDate: string }>;
  examTypes: Array<{ id: string; name: string; weight: number; maxScore: number }>;
  promotionHistory: {
    promotedOut: PromotionRecord[];
    promotedIn: PromotionRecord[];
    totalPromotedOut: number;
    totalPromotedIn: number;
  };
}

export default function AcademicYearDetailPage({ params }: { params: { locale: string } }) {
  const { id } = useParams();
  const router = useRouter();
  const [yearData, setYearData] = useState<AcademicYearDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'teachers' | 'promotions' | 'calendar'>('overview');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${params.locale}/login`);
  };

  useEffect(() => {
    loadYearDetails();
  }, [id]);

  const loadYearDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${params.locale}/login`);
        return;
      }

      const response = await fetch(
        `http://localhost:3002/schools/${schoolId}/academic-years/${id}/comprehensive`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load academic year details');
      }

      setYearData(result.data);
    } catch (err: any) {
      console.error('Load year details error:', err);
      setError(err.message || 'Failed to load academic year details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return { 
          label: 'Planning', 
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: Calendar,
          description: 'This academic year is being prepared'
        };
      case 'ACTIVE':
        return { 
          label: 'Active', 
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: CheckCircle,
          description: 'This is the current active academic year'
        };
      case 'ENDED':
        return { 
          label: 'Ended', 
          color: 'bg-orange-100 text-orange-700 border-orange-200',
          icon: AlertCircle,
          description: 'This academic year has ended'
        };
      case 'ARCHIVED':
        return { 
          label: 'Archived', 
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: BookOpen,
          description: 'This academic year is archived'
        };
      default:
        return { 
          label: status, 
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: Calendar,
          description: ''
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handlePromoteStudents = () => {
    router.push(`/${params.locale}/settings/academic-years/${id}/promote`);
  };

  const handleYearEndWorkflow = () => {
    router.push(`/${params.locale}/settings/year-end-workflow?yearId=${id}`);
  };

  const handleCopySettings = () => {
    router.push(`/${params.locale}/settings/academic-years?action=create&copyFrom=${id}`);
  };

  const handleEditYear = () => {
    router.push(`/${params.locale}/settings/academic-years?action=edit&yearId=${id}`);
  };

  const handleViewCalendar = () => {
    router.push(`/${params.locale}/settings/academic-years/${id}/calendar`);
  };

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading academic year details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !yearData) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-gray-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Details</h3>
              <p className="text-red-700 mb-4">{error || 'Academic year not found'}</p>
              <button
                onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                Back to Academic Years
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { academicYear, statistics, classes, teachers, terms, examTypes, promotionHistory } = yearData;
  const statusInfo = getStatusInfo(academicYear.status);
  const StatusIcon = statusInfo.icon;

  // Group classes by grade
  const classesByGrade: Record<string, ClassInfo[]> = {};
  classes.forEach(cls => {
    if (!classesByGrade[cls.grade]) {
      classesByGrade[cls.grade] = [];
    }
    classesByGrade[cls.grade].push(cls);
  });

  // Calculate total promotions
  const totalPromotions = statistics.promotionStats.promotedOut + statistics.promotionStats.promotedIn;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{academicYear.name}</h1>
                    {academicYear.isCurrent && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-white/20 text-white text-sm font-semibold rounded-full">
                        <Star className="w-4 h-4 fill-current" />
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-orange-100 mt-1">
                    {formatShortDate(academicYear.startDate)} - {formatShortDate(academicYear.endDate)}
                    <span className="mx-2">•</span>
                    {statusInfo.description}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-3 py-1 bg-white/90 ${statusInfo.color.replace('bg-', 'text-').split(' ')[1]} text-sm font-medium rounded-full`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusInfo.label}
                </span>
                <button
                  onClick={handleEditYear}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'classes', label: 'Classes', icon: BookOpen },
                { id: 'teachers', label: 'Teachers', icon: Users },
                { id: 'promotions', label: 'Promotions', icon: TrendingUp },
                { id: 'calendar', label: 'Calendar', icon: CalendarDays },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-gray-900">{statistics.totalStudents}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">Total Students</h3>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-blue-600">♂ {statistics.studentsByGender.MALE || 0}</span>
                    <span className="text-pink-600">♀ {statistics.studentsByGender.FEMALE || 0}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-gray-900">{statistics.totalClasses}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">Total Classes</h3>
                  <p className="text-xs text-gray-500 mt-1">{Object.keys(statistics.studentsByGrade).length} grade levels</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                      <School className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-gray-900">{statistics.totalTeachers}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">Teachers Assigned</h3>
                  <p className="text-xs text-gray-500 mt-1">Active this year</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-gray-900">{totalPromotions}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">Total Promotions</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {academicYear.isPromotionDone ? '✓ Completed' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-gray-600" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={handlePromoteStudents}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group"
                  >
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 group-hover:text-orange-700">Promote Students</h3>
                      <p className="text-sm text-gray-600">Move to next grade</p>
                    </div>
                  </button>

                  <button
                    onClick={handleYearEndWorkflow}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
                  >
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                      <RefreshCw className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-700">Year-End Workflow</h3>
                      <p className="text-sm text-gray-600">Close & archive year</p>
                    </div>
                  </button>

                  <button
                    onClick={handleCopySettings}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Copy className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Copy Settings</h3>
                      <p className="text-sm text-gray-600">Create new year</p>
                    </div>
                  </button>

                  <button
                    onClick={handleViewCalendar}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group"
                  >
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg group-hover:scale-110 transition-transform">
                      <CalendarDays className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Academic Calendar</h3>
                      <p className="text-sm text-gray-600">Events & holidays</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Students by Grade */}
              {Object.keys(statistics.studentsByGrade).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-gray-600" />
                    Students by Grade Level
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(statistics.studentsByGrade)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([grade, count]) => (
                        <div
                          key={grade}
                          className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/${params.locale}/students?grade=${grade}&yearId=${academicYear.id}`)}
                        >
                          <div className="text-2xl font-bold text-gray-900 mb-1">{count}</div>
                          <div className="text-sm font-medium text-gray-600">Grade {grade}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Promotion Summary */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  Promotion Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Promoted Out</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{statistics.promotionStats.promotedOut}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownRight className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Promoted In</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{statistics.promotionStats.promotedIn}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">Repeated</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">{statistics.promotionStats.repeated}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">New Admissions</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{statistics.promotionStats.newAdmissions}</p>
                  </div>
                </div>
              </div>

              {/* Terms & Exam Types */}
              {(terms.length > 0 || examTypes.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {terms.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        Academic Terms
                      </h2>
                      <div className="space-y-3">
                        {terms.map((term) => (
                          <div key={term.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900">{term.name}</span>
                            <span className="text-sm text-gray-600">
                              {formatDate(term.startDate)} - {formatDate(term.endDate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {examTypes.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-600" />
                        Exam Types
                      </h2>
                      <div className="space-y-3">
                        {examTypes.map((exam) => (
                          <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900">{exam.name}</span>
                            <div className="text-sm text-gray-600">
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs mr-2">
                                {exam.weight}%
                              </span>
                              <span className="text-gray-500">Max: {exam.maxScore}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Classes ({statistics.totalClasses})</h2>
                <button
                  onClick={() => router.push(`/${params.locale}/classes?yearId=${academicYear.id}`)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
                >
                  Manage Classes
                </button>
              </div>

              {Object.entries(classesByGrade)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([grade, gradeClasses]) => (
                  <div key={grade} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-sm rounded-full">
                          Grade {grade}
                        </span>
                        <span className="text-gray-600 text-sm">
                          {gradeClasses.length} {gradeClasses.length === 1 ? 'class' : 'classes'} • {gradeClasses.reduce((sum, c) => sum + c.studentCount, 0)} students
                        </span>
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gradeClasses.map((cls) => (
                          <div
                            key={cls.id}
                            onClick={() => router.push(`/${params.locale}/classes/${cls.id}/roster`)}
                            className={`p-4 rounded-xl border-2 cursor-pointer ${
                              cls.isAtCapacity 
                                ? 'border-orange-300 bg-orange-50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            } transition-colors`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900">{cls.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Section {cls.section}
                                  {cls.track && <span className="text-gray-400"> • {cls.track}</span>}
                                </p>
                              </div>
                              {cls.isAtCapacity && (
                                <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
                                  Full
                                </span>
                              )}
                            </div>
                            {cls.homeroomTeacher && (
                              <p className="text-xs text-gray-500 mb-2">
                                Homeroom: {cls.homeroomTeacher.name}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                <Users className="w-4 h-4 inline mr-1" />
                                {cls.studentCount}/{cls.capacity || '∞'}
                              </span>
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    cls.isAtCapacity 
                                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500' 
                                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  }`}
                                  style={{ width: `${cls.capacity ? Math.min((cls.studentCount / cls.capacity) * 100, 100) : 50}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

              {statistics.totalClasses === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Yet</h3>
                  <p className="text-gray-600 mb-6">This academic year doesn't have any classes yet.</p>
                  <button
                    onClick={() => router.push(`/${params.locale}/classes?action=create&yearId=${academicYear.id}`)}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full hover:shadow-lg transition-shadow font-medium"
                  >
                    Create First Class
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Teachers Assigned ({statistics.totalTeachers})</h2>
                <button
                  onClick={() => router.push(`/${params.locale}/teachers`)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
                >
                  Manage Teachers
                </button>
              </div>

              {teachers.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Teacher</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Position</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Classes</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {teacher.name.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-900">{teacher.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{teacher.position || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {teacher.classCount} classes
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => router.push(`/${params.locale}/teachers/${teacher.id}`)}
                              className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                            >
                              View Profile →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teachers Assigned</h3>
                  <p className="text-gray-600 mb-6">Assign teachers to classes to see them here.</p>
                </div>
              )}
            </div>
          )}

          {/* Promotions Tab */}
          {activeTab === 'promotions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Promotion History</h2>
                <button
                  onClick={handlePromoteStudents}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
                >
                  Promote Students
                </button>
              </div>

              {/* Promotion Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <ArrowUpRight className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{promotionHistory.totalPromotedOut}</p>
                  <p className="text-sm text-gray-600">Promoted Out</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <ArrowDownRight className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{promotionHistory.totalPromotedIn}</p>
                  <p className="text-sm text-gray-600">Promoted In</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <RefreshCw className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{statistics.promotionStats.repeated}</p>
                  <p className="text-sm text-gray-600">Repeated</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <GraduationCap className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{statistics.promotionStats.graduated}</p>
                  <p className="text-sm text-gray-600">Graduated</p>
                </div>
              </div>

              {/* Promoted Out */}
              {promotionHistory.promotedOut.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-green-50 px-6 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5" />
                      Students Promoted Out ({promotionHistory.totalPromotedOut})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">From Class</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">To Class</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">To Year</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {promotionHistory.promotedOut.map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-gray-900">{p.studentName}</td>
                            <td className="px-6 py-3 text-gray-600">{p.fromClass}</td>
                            <td className="px-6 py-3 text-gray-600">{p.toClass}</td>
                            <td className="px-6 py-3 text-gray-600">{p.toYear}</td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                p.type === 'AUTOMATIC' ? 'bg-green-100 text-green-700' :
                                p.type === 'REPEAT' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {p.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Promoted In */}
              {promotionHistory.promotedIn.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-blue-50 px-6 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5" />
                      Students Promoted In ({promotionHistory.totalPromotedIn})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">From Year</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">From Class</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">To Class</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {promotionHistory.promotedIn.map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-gray-900">{p.studentName}</td>
                            <td className="px-6 py-3 text-gray-600">{p.fromYear}</td>
                            <td className="px-6 py-3 text-gray-600">{p.fromClass}</td>
                            <td className="px-6 py-3 text-gray-600">{p.toClass}</td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                p.type === 'AUTOMATIC' ? 'bg-green-100 text-green-700' :
                                p.type === 'NEW_ADMISSION' ? 'bg-purple-100 text-purple-700' :
                                p.type === 'TRANSFER_IN' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {p.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {promotionHistory.totalPromotedOut === 0 && promotionHistory.totalPromotedIn === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Promotions Yet</h3>
                  <p className="text-gray-600 mb-6">No students have been promoted for this academic year.</p>
                  <button
                    onClick={handlePromoteStudents}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full hover:shadow-lg transition-shadow font-medium"
                  >
                    Start Promotion
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Academic Calendar</h2>
                <button
                  onClick={handleViewCalendar}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
                >
                  Manage Calendar
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar Management</h3>
                <p className="text-gray-600 mb-6">View and manage holidays, events, and important dates.</p>
                <button
                  onClick={handleViewCalendar}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full hover:shadow-lg transition-shadow font-medium"
                >
                  Open Calendar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
