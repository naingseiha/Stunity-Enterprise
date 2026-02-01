'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { subjectAPI, Subject, SubjectStatistics } from '@/lib/api/subjects';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Edit,
  Trash2,
  Users,
  Clock,
  Target,
  TrendingUp,
  X,
  CheckCircle,
  XCircle,
  Layers,
  Award,
  Calendar,
  Hash,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export default function SubjectsManagementPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const { locale } = params;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [statistics, setStatistics] = useState<SubjectStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // View & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nameKh: '',
    nameEn: '',
    code: '',
    description: '',
    grade: '',
    track: '',
    category: '',
    weeklyHours: '',
    annualHours: '',
    maxScore: '',
    coefficient: '',
    isActive: true,
  });

  // User data
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    const user = TokenManager.getUserData();
    
    if (!token || !user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    
    setUserData(user);
    loadSubjects();
    loadStatistics();
  }, []);

  useEffect(() => {
    filterSubjects();
  }, [subjects, searchQuery, filterGrade, filterCategory, filterStatus]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await subjectAPI.getSubjects({ includeTeachers: true });
      setSubjects(data);
    } catch (err: any) {
      setError('Failed to load subjects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await subjectAPI.getStatistics();
      setStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
    }
  };

  const filterSubjects = () => {
    let filtered = [...subjects];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.nameKh?.toLowerCase().includes(query) ||
          s.nameEn?.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query)
      );
    }

    // Grade filter
    if (filterGrade) {
      filtered = filtered.filter((s) => s.grade === filterGrade);
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter((s) => s.category === filterCategory);
    }

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter((s) => s.isActive);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((s) => !s.isActive);
    }

    setFilteredSubjects(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameKh: '',
      nameEn: '',
      code: '',
      description: '',
      grade: '',
      track: '',
      category: '',
      weeklyHours: '',
      annualHours: '',
      maxScore: '',
      coefficient: '',
      isActive: true,
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      nameKh: subject.nameKh || '',
      nameEn: subject.nameEn || '',
      code: subject.code,
      description: subject.description || '',
      grade: subject.grade,
      track: subject.track || '',
      category: subject.category,
      weeklyHours: subject.weeklyHours.toString(),
      annualHours: subject.annualHours.toString(),
      maxScore: subject.maxScore.toString(),
      coefficient: subject.coefficient.toString(),
      isActive: subject.isActive,
    });
    setShowEditModal(true);
  };

  const handleDelete = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  };

  const handleSubmitCreate = async () => {
    try {
      if (!formData.name || !formData.code || !formData.grade || !formData.category) {
        setError('Please fill all required fields');
        return;
      }

      await subjectAPI.createSubject({
        name: formData.name,
        nameKh: formData.nameKh,
        nameEn: formData.nameEn,
        code: formData.code,
        description: formData.description,
        grade: formData.grade,
        track: formData.track || undefined,
        category: formData.category,
        weeklyHours: parseFloat(formData.weeklyHours) || 0,
        annualHours: parseFloat(formData.annualHours) || 0,
        maxScore: parseFloat(formData.maxScore) || 100,
        coefficient: parseFloat(formData.coefficient) || 1,
        isActive: formData.isActive,
      });

      setShowCreateModal(false);
      resetForm();
      loadSubjects();
      loadStatistics();
    } catch (err: any) {
      setError('Failed to create subject: ' + err.message);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedSubject) return;

    try {
      await subjectAPI.updateSubject(selectedSubject.id, {
        name: formData.name,
        nameKh: formData.nameKh,
        nameEn: formData.nameEn,
        code: formData.code,
        description: formData.description,
        grade: formData.grade,
        track: formData.track || undefined,
        category: formData.category,
        weeklyHours: parseFloat(formData.weeklyHours),
        annualHours: parseFloat(formData.annualHours),
        maxScore: parseFloat(formData.maxScore),
        coefficient: parseFloat(formData.coefficient),
        isActive: formData.isActive,
      });

      setShowEditModal(false);
      setSelectedSubject(null);
      resetForm();
      loadSubjects();
      loadStatistics();
    } catch (err: any) {
      setError('Failed to update subject: ' + err.message);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedSubject) return;

    try {
      await subjectAPI.deleteSubject(selectedSubject.id);
      setShowDeleteModal(false);
      setSelectedSubject(null);
      loadSubjects();
      loadStatistics();
    } catch (err: any) {
      setError('Failed to delete subject: ' + err.message);
    }
  };

  const handleToggleStatus = async (subject: Subject) => {
    try {
      await subjectAPI.toggleStatus(subject.id);
      loadSubjects();
      loadStatistics();
    } catch (err: any) {
      setError('Failed to toggle status: ' + err.message);
    }
  };

  const getUniqueGrades = () => {
    const grades = [...new Set(subjects.map((s) => s.grade))];
    return grades.sort();
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(subjects.map((s) => s.category))];
    return categories.sort();
  };

  const getCategoryCount = (category: string) => {
    return statistics?.byCategory.find((c) => c.category === category)?._count || 0;
  };

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return <PageSkeleton user={userData?.user} school={userData?.school} type="cards" />;
  }

  return (
    <>
      <UnifiedNavigation user={userData?.user} school={userData?.school} onLogout={handleLogout} />

      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedContent animation="fade" delay={0}>
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl text-white shadow-lg">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
                  <p className="text-gray-600 mt-1">Manage subjects, categories, and curriculum</p>
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Create Subject
              </button>
            </div>

            {/* Statistics Cards */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active</p>
                      <p className="text-3xl font-bold text-green-600">{statistics.active}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Inactive</p>
                      <p className="text-3xl font-bold text-gray-600">{statistics.inactive}</p>
                    </div>
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <XCircle className="w-6 h-6 text-gray-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Categories</p>
                      <p className="text-3xl font-bold text-purple-600">{statistics.byCategory.length}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Layers className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </AnimatedContent>

          {/* Search and Filters */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subjects by name, code..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Grade Filter */}
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Grades</option>
                {getUniqueGrades().map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Categories</option>
                {getUniqueCategories().map((category) => (
                  <option key={category} value={category}>
                    {category} ({getCategoryCount(category)})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          </AnimatedContent>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Subjects Grid/List */}
        <AnimatedContent animation="slide-up" delay={100}>
          <BlurLoader isLoading={loading}>
            {filteredSubjects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No subjects found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterGrade || filterCategory || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first subject'}
                </p>
                {!searchQuery && !filterGrade && !filterCategory && filterStatus === 'all' && (
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Create Subject
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map((subject) => (
              <div
                key={subject.id}
                className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
                  subject.isActive ? 'border-gray-200' : 'border-gray-300 opacity-75'
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{subject.nameKh || subject.name}</h3>
                        {subject.isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{subject.nameEn || subject.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-mono">
                          {subject.code}
                        </span>
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded">
                          {subject.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Grade</p>
                      <p className="text-sm font-semibold text-gray-900">{subject.grade}</p>
                    </div>
                    {subject.track && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Track</p>
                        <p className="text-sm font-semibold text-gray-900">{subject.track}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Coefficient</p>
                      <p className="text-sm font-semibold text-gray-900">{subject.coefficient}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Max Score</p>
                      <p className="text-sm font-semibold text-gray-900">{subject.maxScore}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Weekly Hours</p>
                      <p className="text-sm font-semibold text-gray-900">{subject.weeklyHours}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Teachers</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {subject._count?.subjectTeachers || 0}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleStatus(subject)}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                        subject.isActive
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {subject.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(subject)}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(subject)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coef
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{subject.nameKh || subject.name}</p>
                        <p className="text-sm text-gray-600">{subject.nameEn || subject.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-mono text-sm">
                        {subject.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{subject.grade}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-sm">
                        {subject.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{subject.coefficient}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{subject.weeklyHours}h</td>
                    <td className="px-6 py-4">
                      {subject.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(subject)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={subject.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {subject.isActive ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(subject)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subject)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </BlurLoader>
        </AnimatedContent>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New Subject</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Names Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Subject Names
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name (General) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Subject name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Khmer Name
                    </label>
                    <input
                      type="text"
                      value={formData.nameKh}
                      onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                      placeholder="ឈ្មោះមុខវិជ្ជា"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      English Name
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Subject name in English"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., MATH101"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Grade</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Core">Core</option>
                      <option value="Science">Science</option>
                      <option value="Language">Language</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Arts">Arts</option>
                      <option value="Physical Education">Physical Education</option>
                      <option value="Technology">Technology</option>
                      <option value="Elective">Elective</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Track (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.track}
                      onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                      placeholder="e.g., Science, Social"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the subject"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Academic Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Academic Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Hours
                    </label>
                    <input
                      type="number"
                      value={formData.weeklyHours}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Annual Hours
                    </label>
                    <input
                      type="number"
                      value={formData.annualHours}
                      onChange={(e) => setFormData({ ...formData, annualHours: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Score
                    </label>
                    <input
                      type="number"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      placeholder="100"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coefficient
                    </label>
                    <input
                      type="number"
                      value={formData.coefficient}
                      onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                      placeholder="1"
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active (Available for use)
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCreate}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all"
              >
                Create Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Subject</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Names Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Subject Names
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name (General) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Subject name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Khmer Name
                    </label>
                    <input
                      type="text"
                      value={formData.nameKh}
                      onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                      placeholder="ឈ្មោះមុខវិជ្ជា"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      English Name
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Subject name in English"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., MATH101"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Grade</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Core">Core</option>
                      <option value="Science">Science</option>
                      <option value="Language">Language</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Arts">Arts</option>
                      <option value="Physical Education">Physical Education</option>
                      <option value="Technology">Technology</option>
                      <option value="Elective">Elective</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Track (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.track}
                      onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                      placeholder="e.g., Science, Social"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the subject"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Academic Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Academic Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Hours
                    </label>
                    <input
                      type="number"
                      value={formData.weeklyHours}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Annual Hours
                    </label>
                    <input
                      type="number"
                      value={formData.annualHours}
                      onChange={(e) => setFormData({ ...formData, annualHours: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Score
                    </label>
                    <input
                      type="number"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      placeholder="100"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coefficient
                    </label>
                    <input
                      type="number"
                      value={formData.coefficient}
                      onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                      placeholder="1"
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="isActiveEdit" className="text-sm font-medium text-gray-700">
                  Active (Available for use)
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Delete Subject?</h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold">{selectedSubject.nameKh || selectedSubject.name}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDelete}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* End main content wrapper */}
    </div>
    </>
  );
}
