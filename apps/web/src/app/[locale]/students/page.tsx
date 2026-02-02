'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  GraduationCap,
  LogOut,
  Home,
  BookOpen,
  Eye,
  RefreshCw,
  ChevronRight,
  ArrowRightLeft,
  X,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { deleteStudent, type Student } from '@/lib/api/students';
import { useStudents } from '@/hooks/useStudents';
import StudentModal from '@/components/students/StudentModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { useDebounce } from '@/hooks/useDebounce';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import AcademicYearSelector from '@/components/AcademicYearSelector';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UnifiedNavigation from '@/components/UnifiedNavigation';

interface ClassOption {
  id: string;
  name: string;
  grade: string;
  section?: string;
  studentCount?: number;
}

export default function StudentsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('students');
  const tc = useTranslations('common');
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const { selectedYear } = useAcademicYear();

  // Class filter and reassignment state
  const [classFilter, setClassFilter] = useState<string>('all');
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  // Reassign modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [studentToReassign, setStudentToReassign] = useState<Student | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Multi-select for bulk actions
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;

  // Use SWR hook for data fetching with automatic caching
  const { 
    students, 
    pagination, 
    isLoading, 
    isValidating, 
    mutate,
    isEmpty 
  } = useStudents({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch,
    academicYearId: selectedYear?.id,
  });

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  // Fetch available classes when academic year changes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedYear?.id) return;
      
      setLoadingClasses(true);
      try {
        const token = TokenManager.getAccessToken();
        const response = await fetch(
          `http://localhost:3005/classes/lightweight?academicYearId=${selectedYear.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (data.success) {
          setAvailableClasses(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [selectedYear?.id]);

  const handleSearch = useCallback(() => {
    setPage(1);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      await deleteStudent(id);
      // Revalidate the cache after deletion
      mutate();
    } catch (error: any) {
      alert(error.message);
    }
  }, [mutate]);

  const handleEdit = useCallback((student: Student) => {
    setSelectedStudent(student);
    setShowModal(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedStudent(null);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback((refresh?: boolean) => {
    setShowModal(false);
    setSelectedStudent(null);
    if (refresh) {
      mutate(); // Revalidate the cache
    }
  }, [mutate]);

  // Open reassign modal for a single student
  const handleOpenReassign = useCallback((student: Student) => {
    setStudentToReassign(student);
    setTargetClassId('');
    setReassignMessage(null);
    setShowReassignModal(true);
  }, []);

  // Reassign a single student to a new class
  const handleReassignStudent = async () => {
    if (!studentToReassign || !targetClassId) return;

    setIsReassigning(true);
    setReassignMessage(null);

    try {
      const token = TokenManager.getAccessToken();

      // First, remove from current class if exists
      if (studentToReassign.class?.id) {
        await fetch(
          `http://localhost:3005/classes/${studentToReassign.class.id}/students/${studentToReassign.id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Then assign to new class
      const response = await fetch(
        `http://localhost:3005/classes/${targetClassId}/students`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: studentToReassign.id,
            academicYearId: selectedYear?.id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const targetClass = availableClasses.find(c => c.id === targetClassId);
        setReassignMessage({
          type: 'success',
          text: `✓ ${studentToReassign.firstNameLatin} ${studentToReassign.lastNameLatin} assigned to ${targetClass?.name || 'class'}`,
        });
        mutate(); // Refresh student list
        setTimeout(() => {
          setShowReassignModal(false);
          setStudentToReassign(null);
        }, 1500);
      } else {
        setReassignMessage({
          type: 'error',
          text: data.message || 'Failed to reassign student',
        });
      }
    } catch (err: any) {
      setReassignMessage({
        type: 'error',
        text: err.message || 'Failed to reassign student',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  // Toggle student selection for bulk actions
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Select all visible students
  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  // Bulk reassign students
  const handleBulkReassign = async () => {
    if (selectedStudents.size === 0 || !targetClassId) return;

    setIsReassigning(true);
    setReassignMessage(null);

    try {
      const token = TokenManager.getAccessToken();
      const studentIds = Array.from(selectedStudents);

      // Remove from current classes first
      for (const studentId of studentIds) {
        const student = students.find(s => s.id === studentId);
        if (student?.class?.id) {
          await fetch(
            `http://localhost:3005/classes/${student.class.id}/students/${studentId}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }
      }

      // Batch assign to new class
      const response = await fetch(
        `http://localhost:3005/classes/${targetClassId}/students/batch`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentIds,
            academicYearId: selectedYear?.id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const targetClass = availableClasses.find(c => c.id === targetClassId);
        setReassignMessage({
          type: 'success',
          text: `✓ ${data.data?.assigned || studentIds.length} student(s) assigned to ${targetClass?.name || 'class'}`,
        });
        setSelectedStudents(new Set());
        mutate();
        setTimeout(() => {
          setShowBulkReassignModal(false);
          setTargetClassId('');
        }, 1500);
      } else {
        setReassignMessage({
          type: 'error',
          text: data.message || 'Failed to reassign students',
        });
      }
    } catch (err: any) {
      setReassignMessage({
        type: 'error',
        text: err.message || 'Failed to reassign students',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  // Filter students by class
  const filteredStudents = classFilter === 'all' 
    ? students 
    : classFilter === 'unassigned'
    ? students.filter(s => !s.class)
    : students.filter(s => s.class?.id === classFilter);

  const totalPages = pagination.totalPages;
  const totalCount = pagination.total;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        <main className="p-4 lg:p-8">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">Students</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <GraduationCap className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Student Management</h1>
                    <p className="text-gray-600 mt-1">
                      {selectedYear ? `${selectedYear.name}` : 'All students'} • {pagination.total || 0} students
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => mutate()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Student
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Filters */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or class..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Academic Year Badge */}
                {selectedYear && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Year:</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {selectedYear.name}
                    </span>
                  </div>
                )}

                {/* Class Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Classes</option>
                    <option value="unassigned">Unassigned</option>
                    {availableClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Grade {c.grade})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bulk Actions */}
                {selectedStudents.size > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-sm text-gray-600">{selectedStudents.size} selected</span>
                    <button
                      onClick={() => {
                        setTargetClassId('');
                        setReassignMessage(null);
                        setShowBulkReassignModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Assign to Class
                    </button>
                    <button
                      onClick={() => setSelectedStudents(new Set())}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </AnimatedContent>

        {/* Students Table with Blur Loading */}
        <AnimatedContent animation="slide-up" delay={100}>
          <BlurLoader
            isLoading={isLoading}
            skeleton={
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                {/* Skeleton Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <div className="col-span-1"><div className="w-5 h-5 bg-gray-200 rounded animate-pulse" /></div>
                  <div className="col-span-3"><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></div>
                  <div className="col-span-2"><div className="w-12 h-4 bg-gray-200 rounded animate-pulse" /></div>
                  <div className="col-span-1"><div className="w-16 h-4 bg-gray-200 rounded animate-pulse" /></div>
                  <div className="col-span-2"><div className="w-24 h-4 bg-gray-200 rounded animate-pulse" /></div>
                  <div className="col-span-2"><div className="w-16 h-4 bg-gray-200 rounded animate-pulse" /></div>
                  <div className="col-span-1"><div className="w-16 h-4 bg-gray-200 rounded animate-pulse ml-auto" /></div>
                </div>
                {/* Skeleton Rows */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center">
                    <div className="col-span-1"><div className="w-5 h-5 bg-gray-100 rounded animate-pulse" /></div>
                    <div className="col-span-3 flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
                      <div className="space-y-2">
                        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="col-span-2"><div className="w-20 h-6 bg-gray-100 rounded-lg animate-pulse" /></div>
                    <div className="col-span-1"><div className="w-14 h-6 bg-gray-100 rounded-lg animate-pulse" /></div>
                    <div className="col-span-2"><div className="w-24 h-4 bg-gray-100 rounded animate-pulse" /></div>
                    <div className="col-span-2"><div className="w-20 h-6 bg-gray-100 rounded-lg animate-pulse" /></div>
                    <div className="col-span-1 flex justify-end gap-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                      <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                      <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative">
              {/* Show subtle loading indicator when revalidating */}
              {isValidating && !isLoading && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Updating...
                  </div>
                </div>
              )}
              {isEmpty ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first student to the system</p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200"
              >
                <Plus className="w-5 h-5" />
                Add First Student
              </button>
            </div>
          ) : (
            <>
              {/* Card-based Student List */}
              <div className="divide-y divide-gray-100">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1.5 hover:bg-white rounded-lg transition-colors"
                    >
                      {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-3">Student</div>
                  <div className="col-span-2">ID</div>
                  <div className="col-span-1">Gender</div>
                  <div className="col-span-2">Date of Birth</div>
                  <div className="col-span-2">Class</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Student Rows */}
                {filteredStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className={`group grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent ${
                      selectedStudents.has(student.id) ? 'bg-blue-50/70 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 hidden md:flex items-center">
                      <button
                        onClick={() => toggleStudentSelection(student.id)}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        {selectedStudents.has(student.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Student Info - Photo & Name */}
                    <div className="col-span-3 flex items-center gap-4">
                      <div className="relative">
                        {student.photoUrl ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}${student.photoUrl}`}
                            alt={`${student.firstNameLatin} ${student.lastNameLatin}`}
                            className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-md"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md ${
                            student.gender === 'MALE' 
                              ? 'bg-gradient-to-br from-blue-400 to-blue-600' 
                              : 'bg-gradient-to-br from-pink-400 to-pink-600'
                          }`}>
                            {student.firstNameLatin.charAt(0)}{student.lastNameLatin.charAt(0)}
                          </div>
                        )}
                        {/* Online indicator style badge */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          student.class?.name ? 'bg-green-400' : 'bg-gray-300'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {student.firstNameLatin} {student.lastNameLatin}
                        </p>
                        {student.firstNameKhmer && (
                          <p className="text-sm text-gray-500 truncate" style={{ fontFamily: 'Battambang, sans-serif' }}>
                            {student.firstNameKhmer} {student.lastNameKhmer}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Student ID */}
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">
                        {student.studentId}
                      </span>
                    </div>

                    {/* Gender */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        student.gender === 'MALE' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-pink-50 text-pink-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          student.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'
                        }`} />
                        {student.gender === 'MALE' ? 'Male' : 'Female'}
                      </span>
                    </div>

                    {/* Date of Birth */}
                    <div className="col-span-2 text-sm text-gray-600">
                      {new Date(student.dateOfBirth).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>

                    {/* Class */}
                    <div className="col-span-2">
                      {student.class?.name ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {student.class.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-sm border border-gray-200 border-dashed">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Unassigned
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenReassign(student)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        title="Assign to Class"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/${locale}/students/${student.id}`)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mobile View - Additional Info */}
                    <div className="col-span-full md:hidden flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => toggleStudentSelection(student.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        {selectedStudents.has(student.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <span className="text-xs text-gray-500">ID: {student.studentId}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{student.gender}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-transparent flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                    <span className="font-semibold text-gray-900">{Math.min(page * ITEMS_PER_PAGE, totalCount)}</span> of{' '}
                    <span className="font-semibold text-gray-900">{totalCount}</span> students
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              page === pageNum
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
            </div>
          </BlurLoader>
        </AnimatedContent>

        {/* Student Modal */}
        {showModal && (
          <StudentModal
            student={selectedStudent}
            onClose={handleModalClose}
          />
        )}

        {/* Single Student Reassign Modal */}
        {showReassignModal && studentToReassign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5" />
                      Assign to Class
                    </h3>
                    <p className="text-green-100 text-sm mt-1">
                      {studentToReassign.firstNameLatin} {studentToReassign.lastNameLatin}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowReassignModal(false);
                      setStudentToReassign(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Current Class Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Current Class</p>
                  <p className="font-medium text-gray-900">
                    {studentToReassign.class?.name || 'Unassigned'}
                  </p>
                </div>

                {/* Target Class Selection */}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Class
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Choose a class...</option>
                  {availableClasses
                    .filter(c => c.id !== studentToReassign.class?.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Grade {c.grade}) - {c.studentCount || 0} students
                      </option>
                    ))}
                </select>

                {/* Message */}
                {reassignMessage && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                    reassignMessage.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {reassignMessage.type === 'success' ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{reassignMessage.text}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowReassignModal(false);
                      setStudentToReassign(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassignStudent}
                    disabled={!targetClassId || isReassigning}
                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    {isReassigning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4" />
                        Assign
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Reassign Modal */}
        {showBulkReassignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Bulk Assign to Class
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedStudents.size} student(s) selected
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowBulkReassignModal(false);
                      setTargetClassId('');
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Selected Students Preview */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">Selected Students:</p>
                  <div className="flex flex-wrap gap-1">
                    {students
                      .filter(s => selectedStudents.has(s.id))
                      .slice(0, 10)
                      .map(s => (
                        <span key={s.id} className="px-2 py-0.5 bg-white border rounded text-xs text-gray-700">
                          {s.firstNameLatin} {s.lastNameLatin}
                        </span>
                      ))}
                    {selectedStudents.size > 10 && (
                      <span className="px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-600">
                        +{selectedStudents.size - 10} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Target Class Selection */}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign All to Class
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a class...</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Grade {c.grade}) - {c.studentCount || 0} students
                    </option>
                  ))}
                </select>

                {/* Message */}
                {reassignMessage && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                    reassignMessage.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {reassignMessage.type === 'success' ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{reassignMessage.text}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowBulkReassignModal(false);
                      setTargetClassId('');
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkReassign}
                    disabled={!targetClassId || isReassigning}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    {isReassigning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Assign {selectedStudents.size} Students
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </>
  );
}
