'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  GraduationCap,
  Home,
  BookOpen,
  ChevronRight,
  School,
  RefreshCw,
  Eye,
  UserPlus,
  Calendar,
  ClipboardList,
  BarChart3,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { getClasses, deleteClass, type Class } from '@/lib/api/classes';
import ClassModal from '@/components/classes/ClassModal';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { CardSkeleton } from '@/components/LoadingSkeleton';

// Grade colors for visual distinction
const gradeColors: Record<number, { bg: string; text: string; border: string; light: string }> = {
  7: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200', light: 'bg-blue-50' },
  8: { bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-200', light: 'bg-indigo-50' },
  9: { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200', light: 'bg-purple-50' },
  10: { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', light: 'bg-emerald-50' },
  11: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-amber-50' },
  12: { bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200', light: 'bg-rose-50' },
};

const getGradeColor = (grade: number) => gradeColors[grade] || gradeColors[7];

export default function ClassesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('classes');
  const tc = useTranslations('common');
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { selectedYear } = useAcademicYear();

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    if (selectedYear) {
      fetchClasses();
    } else {
      setLoading(false);
    }
  }, [selectedGrade, selectedYear]);

  const fetchClasses = async () => {
    if (!selectedYear) return;
    
    setLoading(true);
    try {
      const response = await getClasses({ 
        limit: 100, 
        grade: selectedGrade,
        academicYearId: selectedYear.id 
      });
      setClasses(response.data.classes);
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter classes by search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const query = searchQuery.toLowerCase();
    return classes.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.section?.toLowerCase().includes(query) ||
      c.homeroomTeacher?.firstNameLatin?.toLowerCase().includes(query) ||
      c.homeroomTeacher?.lastNameLatin?.toLowerCase().includes(query)
    );
  }, [classes, searchQuery]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalStudents = classes.reduce((sum, c) => sum + (c._count?.students || 0), 0);
    const gradeDistribution = classes.reduce((acc, c) => {
      const grade = c.grade;
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const avgStudentsPerClass = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;
    return { totalStudents, gradeDistribution, avgStudentsPerClass };
  }, [classes]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? All student assignments will be removed.')) return;

    try {
      await deleteClass(id);
      setActiveDropdown(null);
      fetchClasses();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowModal(true);
    setActiveDropdown(null);
  };

  const handleAdd = () => {
    setSelectedClass(null);
    setShowModal(true);
  };

  const handleModalClose = (refresh?: boolean) => {
    setShowModal(false);
    setSelectedClass(null);
    if (refresh) {
      fetchClasses();
    }
  };

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        <main className="p-4 lg:p-8">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <button onClick={() => router.push(`/${locale}/dashboard`)} className="hover:text-green-600 flex items-center gap-1">
                  <Home className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">Classes</span>
              </nav>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl shadow-lg">
                    <School className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Class Management</h1>
                    <p className="text-gray-500 mt-1">
                      {selectedYear ? `Academic Year ${selectedYear.name}` : 'Select an academic year'} 
                      {classes.length > 0 && ` • ${classes.length} classes`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchClasses}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-200"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Class</span>
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Statistics Cards */}
          {selectedYear && classes.length > 0 && (
            <AnimatedContent animation="slide-up" delay={50}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <School className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
                      <p className="text-sm text-gray-500">Total Classes</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{statistics.totalStudents}</p>
                      <p className="text-sm text-gray-500">Total Students</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{statistics.avgStudentsPerClass}</p>
                      <p className="text-sm text-gray-500">Avg per Class</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{Object.keys(statistics.gradeDistribution).length}</p>
                      <p className="text-sm text-gray-500">Grade Levels</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedContent>
          )}

          {/* Filters & Search */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search classes, teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>

                {/* Grade Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedGrade(undefined)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedGrade === undefined
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Grades
                  </button>
                  {[7, 8, 9, 10, 11, 12].map(grade => {
                    const colors = getGradeColor(grade);
                    const count = statistics.gradeDistribution[grade] || 0;
                    return (
                      <button
                        key={grade}
                        onClick={() => setSelectedGrade(grade === selectedGrade ? undefined : grade)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedGrade === grade
                            ? `${colors.bg} text-white shadow-md`
                            : `${colors.light} ${colors.text} hover:opacity-80`
                        }`}
                      >
                        <span>Grade {grade}</span>
                        {count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                            selectedGrade === grade ? 'bg-white/20' : 'bg-white'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Classes Grid/List */}
          <AnimatedContent animation="slide-up" delay={150}>
            <BlurLoader
              isLoading={loading}
              skeleton={
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              }
            >
              {filteredClasses.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-10 h-10 text-gray-400" />
                  </div>
                  {!selectedYear ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Academic Year Selected</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Please select an academic year from the dropdown in the navigation bar to view classes
                      </p>
                    </>
                  ) : searchQuery ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Found</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        No classes match your search "{searchQuery}". Try different keywords.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Yet</h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Get started by creating your first class for {selectedYear.name}
                      </p>
                      <button
                        onClick={handleAdd}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                        Create First Class
                      </button>
                    </>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClasses.map((classItem) => {
                    const colors = getGradeColor(classItem.grade);
                    const studentCount = classItem._count?.students || 0;
                    const capacityPercent = classItem.capacity ? Math.round((studentCount / classItem.capacity) * 100) : 0;
                    
                    return (
                      <div
                        key={classItem.id}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
                      >
                        {/* Header with gradient */}
                        <div className={`p-5 ${colors.bg} relative overflow-hidden`}>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                          
                          <div className="relative z-10 flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-white">{classItem.name}</h3>
                              <p className="text-white/80 text-sm mt-1">
                                Grade {classItem.grade} {classItem.section && `• Section ${classItem.section}`}
                              </p>
                            </div>
                            
                            {/* Actions Dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === classItem.id ? null : classItem.id);
                                }}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                              >
                                <MoreVertical className="h-5 w-5 text-white" />
                              </button>
                              
                              {activeDropdown === classItem.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20">
                                  <button
                                    onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <UserPlus className="h-4 w-4 text-green-500" />
                                    Manage Students
                                  </button>
                                  <button
                                    onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4 text-blue-500" />
                                    View Roster
                                  </button>
                                  <button
                                    onClick={() => router.push(`/${locale}/attendance/mark?classId=${classItem.id}`)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <ClipboardList className="h-4 w-4 text-purple-500" />
                                    Mark Attendance
                                  </button>
                                  <button
                                    onClick={() => router.push(`/${locale}/grades/entry?classId=${classItem.id}`)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <BookOpen className="h-4 w-4 text-amber-500" />
                                    Enter Grades
                                  </button>
                                  <div className="border-t border-gray-100 my-1" />
                                  <button
                                    onClick={() => handleEdit(classItem)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4 text-gray-500" />
                                    Edit Class
                                  </button>
                                  <button
                                    onClick={() => handleDelete(classItem.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Class
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Student count badge */}
                          <div className="mt-4 flex items-center gap-2">
                            <Users className="h-4 w-4 text-white/80" />
                            <span className="text-white font-semibold">{studentCount}</span>
                            <span className="text-white/80 text-sm">students</span>
                            {classItem.capacity && (
                              <span className="text-white/60 text-sm ml-auto">/ {classItem.capacity} capacity</span>
                            )}
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-5">
                          {/* Capacity Progress */}
                          {classItem.capacity && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-500">Capacity</span>
                                <span className={`font-medium ${
                                  capacityPercent >= 100 ? 'text-red-600' : capacityPercent >= 80 ? 'text-amber-600' : 'text-green-600'
                                }`}>{capacityPercent}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    capacityPercent >= 100 ? 'bg-red-500' : capacityPercent >= 80 ? 'bg-amber-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Class Info */}
                          <div className="space-y-3">
                            {classItem.track && (
                              <div className="flex items-center gap-2 text-sm">
                                <GraduationCap className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{classItem.track} Track</span>
                              </div>
                            )}
                            {classItem.room && (
                              <div className="flex items-center gap-2 text-sm">
                                <School className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">Room {classItem.room}</span>
                              </div>
                            )}
                            {classItem.homeroomTeacher && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">
                                  {classItem.homeroomTeacher.firstNameLatin} {classItem.homeroomTeacher.lastNameLatin}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Homeroom</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                              className="flex-1 py-2.5 text-sm font-medium bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <UserPlus className="h-4 w-4" />
                              Manage
                            </button>
                            <button
                              onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                              className="flex-1 py-2.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Roster
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left py-4 px-6 font-semibold text-gray-600 text-sm">Class</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-600 text-sm">Grade</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-600 text-sm">Section</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-600 text-sm">Students</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-600 text-sm">Homeroom Teacher</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-600 text-sm">Room</th>
                          <th className="text-right py-4 px-6 font-semibold text-gray-600 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClasses.map((classItem) => {
                          const colors = getGradeColor(classItem.grade);
                          return (
                            <tr key={classItem.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-sm">{classItem.grade}</span>
                                  </div>
                                  <span className="font-semibold text-gray-900">{classItem.name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.light} ${colors.text}`}>
                                  Grade {classItem.grade}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-gray-600">{classItem.section || '—'}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">{classItem._count?.students || 0}</span>
                                  {classItem.capacity && (
                                    <span className="text-gray-400">/ {classItem.capacity}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-gray-600">
                                {classItem.homeroomTeacher 
                                  ? `${classItem.homeroomTeacher.firstNameLatin} ${classItem.homeroomTeacher.lastNameLatin}`
                                  : '—'}
                              </td>
                              <td className="py-4 px-4 text-gray-600">{classItem.room || '—'}</td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                                    className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-colors"
                                    title="Manage Students"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                    title="View Roster"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(classItem)}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(classItem.id)}
                                    className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </BlurLoader>
          </AnimatedContent>

          {/* Class Modal */}
          {showModal && (
            <ClassModal
              classItem={selectedClass}
              onClose={handleModalClose}
            />
          )}
        </main>
      </div>

      {/* Click outside to close dropdowns */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </>
  );
}
