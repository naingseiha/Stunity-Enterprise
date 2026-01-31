'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { getCopyPreview, copySettings } from '@/lib/api/academic-years';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  Calendar,
  Plus,
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  Archive,
  Settings,
  Copy,
  Play,
  AlertCircle,
  ChevronRight,
  GraduationCap,
  Edit,
  Trash2,
  Star,
  X,
  Loader2,
} from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
  copiedFromYearId?: string;
  isPromotionDone: boolean;
  createdAt: string;
}

export default function AcademicYearsManagementPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const { locale } = params;

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = () => {
    TokenManager.clearAccessToken();
    router.push(`/${locale}/login`);
  };

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);

  // Create form
  const [newYearName, setNewYearName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [copyFromYearId, setCopyFromYearId] = useState('');

  // Edit form
  const [editYearName, setEditYearName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Copy Settings Modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState<AcademicYear | null>(null);
  const [copyTargetYearId, setCopyTargetYearId] = useState('');
  const [copyPreviewData, setCopyPreviewData] = useState<any>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copySubjects, setCopySubjects] = useState(true);
  const [copyTeachers, setCopyTeachers] = useState(true);
  const [copyClasses, setCopyClasses] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadAcademicYears();
  }, []);

  const loadAcademicYears = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      console.log('User data:', userData);
      console.log('School ID:', schoolId);

      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      if (!schoolId) {
        setError('No schoolId found in user data');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // Sort by start date descending (newest first)
        const sortedYears = data.data.sort(
          (a: AcademicYear, b: AcademicYear) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        setYears(sortedYears);
      } else {
        setError(data.message || 'Failed to load academic years');
      }
    } catch (err: any) {
      setError('Error loading academic years: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async () => {
    if (!newYearName || !newStartDate || !newEndDate) {
      setError('Please fill all fields');
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newYearName,
            startDate: new Date(newStartDate).toISOString(),
            endDate: new Date(newEndDate).toISOString(),
            copiedFromYearId: copyFromYearId || undefined,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setNewYearName('');
        setNewStartDate('');
        setNewEndDate('');
        setCopyFromYearId('');
        loadAcademicYears();
      } else {
        setError(data.message || 'Failed to create academic year');
      }
    } catch (err: any) {
      setError('Error creating academic year: ' + err.message);
    }
  };

  const handleSetCurrent = async (yearId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${yearId}/set-current`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        loadAcademicYears();
      } else {
        setError(data.message || 'Failed to set current year');
      }
    } catch (err: any) {
      setError('Error setting current year: ' + err.message);
    }
  };

  const handleEditYear = (year: AcademicYear) => {
    setSelectedYear(year);
    setEditYearName(year.name);
    setEditStartDate(year.startDate.split('T')[0]);
    setEditEndDate(year.endDate.split('T')[0]);
    setShowEditModal(true);
  };

  const handleUpdateYear = async () => {
    if (!editYearName || !editStartDate || !editEndDate || !selectedYear) {
      setError('Please fill all fields');
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${selectedYear.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editYearName,
            startDate: new Date(editStartDate).toISOString(),
            endDate: new Date(editEndDate).toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setShowEditModal(false);
        setSelectedYear(null);
        setEditYearName('');
        setEditStartDate('');
        setEditEndDate('');
        loadAcademicYears();
      } else {
        setError(data.message || 'Failed to update year');
      }
    } catch (err: any) {
      setError('Error updating year: ' + err.message);
    }
  };

  const handleDeleteYear = (year: AcademicYear) => {
    setSelectedYear(year);
    setShowDeleteModal(true);
  };

  const confirmDeleteYear = async () => {
    if (!selectedYear) return;

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${selectedYear.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setShowDeleteModal(false);
        setSelectedYear(null);
        loadAcademicYears();
      } else {
        setError(data.message || 'Failed to delete year');
      }
    } catch (err: any) {
      setError('Error deleting year: ' + err.message);
    }
  };

  const handleArchiveYear = async (year: AcademicYear) => {
    if (!confirm(`Archive academic year "${year.name}"? This will make it read-only.`)) {
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${year.id}/archive`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Academic year "${year.name}" has been archived successfully!`);
        loadAcademicYears();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to archive year');
      }
    } catch (err: any) {
      setError('Error archiving year: ' + err.message);
    }
  };

  const handleOpenCopyModal = async (year: AcademicYear) => {
    setCopySourceYear(year);
    setCopyTargetYearId('');
    setCopySubjects(true);
    setCopyTeachers(true);
    setCopyClasses(true);
    setCopyError('');
    setCopyPreviewData(null);
    setShowCopyModal(true);

    // Fetch preview data
    try {
      setCopyLoading(true);
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      const preview = await getCopyPreview(schoolId, year.id, token);
      setCopyPreviewData(preview);
    } catch (err: any) {
      setCopyError('Failed to load preview: ' + err.message);
    } finally {
      setCopyLoading(false);
    }
  };

  const handleExecuteCopy = async () => {
    if (!copySourceYear || !copyTargetYearId) {
      setCopyError('Please select a target year');
      return;
    }

    if (!copySubjects && !copyTeachers && !copyClasses) {
      setCopyError('Please select at least one option to copy');
      return;
    }

    try {
      setCopyLoading(true);
      setCopyError('');
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      await copySettings(schoolId, copySourceYear.id, {
        toAcademicYearId: copyTargetYearId,
        copySettings: {
          subjects: copySubjects,
          teachers: copyTeachers,
          classes: copyClasses,
        },
      }, token);

      setSuccessMessage('Settings copied successfully!');
      setShowCopyModal(false);
      loadAcademicYears();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setCopyError('Failed to copy settings: ' + err.message);
    } finally {
      setCopyLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statuses = {
      PLANNING: {
        label: 'Planning',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: Clock,
        description: 'In preparation phase',
      },
      ACTIVE: {
        label: 'Active',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle2,
        description: 'Currently in progress',
      },
      ENDED: {
        label: 'Ended',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: AlertCircle,
        description: 'Completed, needs archiving',
      },
      ARCHIVED: {
        label: 'Archived',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Archive,
        description: 'Archived for records',
      },
    };
    return statuses[status as keyof typeof statuses] || statuses.PLANNING;
  };

  const currentYear = years.find((y) => y.isCurrent);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading academic years...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Year Management</h1>
              <p className="text-gray-600">
                Manage your school's academic years, student promotions, and settings
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              Create New Year
            </button>
          </div>

          {/* Current Year Highlight */}
          {currentYear && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-700">Current Academic Year</p>
                  <h2 className="text-2xl font-bold text-gray-900">{currentYear.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {new Date(currentYear.startDate).toLocaleDateString()} -{' '}
                    {new Date(currentYear.endDate).toLocaleDateString()}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                      getStatusInfo(currentYear.status).color
                    }`}
                  >
                    {getStatusInfo(currentYear.status).label}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              ×
            </button>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Success</p>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
              ×
            </button>
          </div>
        )}

        {/* Academic Years Timeline */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">All Academic Years</h2>

          {years.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Academic Years Yet</h3>
              <p className="text-gray-600 mb-4">Create your first academic year to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create Academic Year
              </button>
            </div>
          ) : (
            years.map((year) => {
              const statusInfo = getStatusInfo(year.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={year.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                    year.isCurrent ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{year.name}</h3>
                          {year.isCurrent && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Current
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(year.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          -{' '}
                          {new Date(year.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-gray-500">{statusInfo.description}</p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
                      <div className="text-center">
                        <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Students</p>
                        <p className="text-lg font-bold text-gray-900">
                          {year.id === currentYear?.id ? '~' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <BookOpen className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Classes</p>
                        <p className="text-lg font-bold text-gray-900">
                          {year.id === currentYear?.id ? '~' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <GraduationCap className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Promoted</p>
                        <p className="text-lg font-bold text-gray-900">
                          {year.isPromotionDone ? '✓' : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!year.isCurrent && year.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleSetCurrent(year.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors text-sm"
                        >
                          <Play className="w-4 h-4" />
                          Set as Current
                        </button>
                      )}

                      {/* Manage button disabled - detail page coming soon
                      <button
                        onClick={() => router.push(`/${locale}/settings/academic-years/${year.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm"
                      >
                        <Settings className="w-4 h-4" />
                        Manage
                      </button>
                      */}

                      {(year.isCurrent || year.status === 'ENDED') && !year.isPromotionDone && (
                        <button
                          onClick={() => router.push(`/${locale}/settings/academic-years/${year.id}/promote`)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors text-sm"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Promote Students
                        </button>
                      )}
                      
                      {year.isPromotionDone && (
                        <span className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Promotion Complete
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenCopyModal(year)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Settings
                      </button>

                      <button
                        onClick={() => handleEditYear(year)}
                        disabled={year.status === 'ARCHIVED'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                          year.status === 'ARCHIVED'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>

                      {year.status === 'ENDED' && !year.isPromotionDone && (
                        <button
                          onClick={() => handleArchiveYear(year)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      )}

                      {!year.isCurrent && year.status === 'PLANNING' && (
                        <button
                          onClick={() => handleDeleteYear(year)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New Academic Year</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Year Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="e.g., 2026-2027"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usually in format: YYYY-YYYY (e.g., 2026-2027)
                </p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Usually starts in October or November</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Usually ends in August or September</p>
                </div>
              </div>

              {/* Copy Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copy Settings From (Optional)
                </label>
                <select
                  value={copyFromYearId}
                  onChange={(e) => setCopyFromYearId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Start from scratch</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} (Classes, Subjects, Teachers)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Copy classes, subjects, and teachers from a previous year
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">What happens after creating:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>New academic year will be created in PLANNING status</li>
                      <li>If copying, classes and settings will be duplicated</li>
                      <li>You can then promote students from the previous year</li>
                      <li>Set it as current when ready to use</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateYear}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
              >
                Create Academic Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedYear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Academic Year</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedYear(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Year Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editYearName}
                  onChange={(e) => setEditYearName(e.target.value)}
                  placeholder="e.g., 2026-2027"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usually starts in October or November
                </p>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usually ends in August or September
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedYear(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateYear}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
              >
                Update Academic Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedYear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Delete Academic Year?
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <strong>{selectedYear.name}</strong>? This action
                cannot be undone.
              </p>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ This will only work if no classes are associated with this year.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedYear(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteYear}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-md"
              >
                Delete Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Settings Modal */}
      {showCopyModal && copySourceYear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Copy Settings</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    From: <span className="font-semibold text-gray-900">{copySourceYear.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Copy Preview Section */}
              {copyLoading && !copyPreviewData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading preview...</p>
                  </div>
                </div>
              ) : copyPreviewData ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What will be copied:</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Subjects Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-900">
                            {copyPreviewData.subjectsCount || 0}
                          </p>
                          <p className="text-sm text-blue-700">Subjects</p>
                        </div>
                      </div>
                    </div>

                    {/* Teachers Card */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-900">
                            {copyPreviewData.teachersCount || 0}
                          </p>
                          <p className="text-sm text-green-700">Active Teachers</p>
                        </div>
                      </div>
                    </div>

                    {/* Classes Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-900">
                            {copyPreviewData.classesCount || 0}
                          </p>
                          <p className="text-sm text-purple-700">Classes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Target Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copy to Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={copyTargetYearId}
                  onChange={(e) => setCopyTargetYearId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={copyLoading}
                >
                  <option value="">Select target year...</option>
                  {years
                    .filter((year) => year.id !== copySourceYear.id)
                    .map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose which academic year to copy the settings to
                </p>
              </div>

              {/* Checkbox Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select what to copy:
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copySubjects}
                      onChange={(e) => setCopySubjects(e.target.checked)}
                      className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                      disabled={copyLoading}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Copy Subjects</p>
                        <p className="text-xs text-gray-500">
                          Duplicate all subjects to the target year
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyTeachers}
                      onChange={(e) => setCopyTeachers(e.target.checked)}
                      className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                      disabled={copyLoading}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Users className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Copy Teachers</p>
                        <p className="text-xs text-gray-500">
                          Assign active teachers to the target year
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyClasses}
                      onChange={(e) => setCopyClasses(e.target.checked)}
                      className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                      disabled={copyLoading}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Copy Classes</p>
                        <p className="text-xs text-gray-500">
                          Duplicate class structures to the target year
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Warning/Info Messages */}
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-900">
                      <p className="font-semibold mb-1">Important Information:</p>
                      <ul className="list-disc list-inside space-y-1 text-yellow-800">
                        <li>This will create duplicates in the target year</li>
                        <li>Existing data in target year won't be affected</li>
                        <li>Students are not copied - use "Promote Students" for that</li>
                        <li>You can run this multiple times if needed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {copyError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-900">Error</p>
                        <p className="text-sm text-red-700">{copyError}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3 bg-gray-50">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white transition-colors"
                disabled={copyLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCopy}
                disabled={copyLoading || !copyTargetYearId}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {copyLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* End main content wrapper */}
    </div>
    </>
  );
}

