'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { 
  ArrowLeft, Calendar, Users, BookOpen, TrendingUp, 
  Edit, Trash2, Settings as SettingsIcon, CheckCircle, 
  AlertCircle, Star, Copy, Award, GraduationCap
} from 'lucide-react';

interface AcademicYearDetail {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
  copiedFromYearId: string | null;
  createdAt: string;
  updatedAt: string;
  statistics: {
    totalStudents: number;
    totalClasses: number;
    totalPromotions: number;
    studentsByGrade: Record<number, number>;
  };
  classes: Array<{
    id: string;
    name: string;
    grade: number;
    section: string;
    track: string | null;
    capacity: number;
    studentCount: number;
    isAtCapacity: boolean;
  }>;
}

export default function AcademicYearDetailPage({ params }: { params: { locale: string } }) {
  const { id } = useParams();
  const router = useRouter();
  const [yearData, setYearData] = useState<AcademicYearDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadYearDetails();
  }, [id]);

  const loadYearDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();

      if (!token || !userData?.schoolId) {
        router.push(`/${params.locale}/login`);
        return;
      }

      const response = await fetch(
        `http://localhost:3002/schools/${userData.schoolId}/academic-years/${id}`,
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
      year: 'numeric' 
    });
  };

  const handlePromoteStudents = () => {
    router.push(`/${params.locale}/settings/promotion?yearId=${id}`);
  };

  const handleCopySettings = () => {
    // TODO: Implement copy settings to new year
    alert('Copy Settings - Coming soon!');
  };

  const handleEditYear = () => {
    // TODO: Implement edit year modal
    alert('Edit Year - Coming soon!');
  };

  const handleDeleteYear = () => {
    // TODO: Implement delete confirmation
    alert('Delete Year - Coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
          <p className="text-gray-600">Loading academic year details...</p>
        </div>
      </div>
    );
  }

  if (error || !yearData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
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
    );
  }

  const statusInfo = getStatusInfo(yearData.status);
  const StatusIcon = statusInfo.icon;

  // Group classes by grade
  const classesByGrade: Record<number, typeof yearData.classes> = {};
  yearData.classes.forEach(cls => {
    if (!classesByGrade[cls.grade]) {
      classesByGrade[cls.grade] = [];
    }
    classesByGrade[cls.grade].push(cls);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{yearData.name}</h1>
                  {yearData.isCurrent && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-400 to-yellow-400 text-white text-sm font-semibold rounded-full shadow-sm">
                      <Star className="w-4 h-4 fill-current" />
                      Current
                    </span>
                  )}
                  <span className={`flex items-center gap-1.5 px-3 py-1 ${statusInfo.color} text-sm font-medium rounded-full border`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">
                  {formatDate(yearData.startDate)} - {formatDate(yearData.endDate)}
                  <span className="text-gray-400 mx-2">•</span>
                  <span className="text-sm">{statusInfo.description}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditYear}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={handleDeleteYear}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Students */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {yearData.statistics.totalStudents}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total Students</h3>
            <p className="text-xs text-gray-500 mt-1">Enrolled in this year</p>
          </div>

          {/* Total Classes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {yearData.statistics.totalClasses}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total Classes</h3>
            <p className="text-xs text-gray-500 mt-1">Active classes</p>
          </div>

          {/* Promotions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {yearData.statistics.totalPromotions}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Promotions</h3>
            <p className="text-xs text-gray-500 mt-1">Students promoted</p>
          </div>

          {/* Grade Levels */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {Object.keys(yearData.statistics.studentsByGrade).length}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Grade Levels</h3>
            <p className="text-xs text-gray-500 mt-1">Different grades</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handlePromoteStudents}
              className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group"
            >
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-700">Promote Students</h3>
                <p className="text-sm text-gray-600">Move students to next grade</p>
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
                <p className="text-sm text-gray-600">Create new year from this one</p>
              </div>
            </button>
          </div>
        </div>

        {/* Students by Grade */}
        {Object.keys(yearData.statistics.studentsByGrade).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-gray-600" />
              Students by Grade Level
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(yearData.statistics.studentsByGrade)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([grade, count]) => (
                  <div
                    key={grade}
                    className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {count}
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      Grade {grade}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Classes by Grade */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-600" />
            Classes ({yearData.statistics.totalClasses})
          </h2>

          {Object.entries(classesByGrade)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([grade, classes]) => (
              <div key={grade} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-sm rounded-full">
                      Grade {grade}
                    </span>
                    <span className="text-gray-600 text-sm">
                      {classes.length} {classes.length === 1 ? 'class' : 'classes'} • {classes.reduce((sum, c) => sum + c.studentCount, 0)} students
                    </span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className={`p-4 rounded-xl border-2 ${
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
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            <Users className="w-4 h-4 inline mr-1" />
                            {cls.studentCount}/{cls.capacity}
                          </span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                cls.isAtCapacity 
                                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500' 
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
                              }`}
                              style={{ width: `${Math.min((cls.studentCount / cls.capacity) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Empty State */}
        {yearData.statistics.totalClasses === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Yet</h3>
            <p className="text-gray-600 mb-6">
              This academic year doesn't have any classes yet. Create classes to get started.
            </p>
            <button
              onClick={() => router.push(`/${params.locale}/classes?yearId=${yearData.id}`)}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full hover:shadow-lg transition-shadow font-medium"
            >
              Create First Class
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
