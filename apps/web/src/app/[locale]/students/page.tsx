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
  ChevronLeft,
  ArrowRightLeft,
  X,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  AlertCircle,
  MoreVertical,
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
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';

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
  const [showResetModal, setShowResetModal] = useState(false);
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

  const handleLogout = async () => {
    await TokenManager.logout();
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
          `${process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005'}/classes/lightweight?academicYearId=${selectedYear.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (data.success) {
          // Map _count.studentClasses to studentCount for UI display
          const mappedClasses = (data.data || []).map((cls: any) => ({
            ...cls,
            studentCount: cls._count?.studentClasses ?? cls.studentCount ?? 0,
          }));
          setAvailableClasses(mappedClasses);
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
          `${process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005'}/classes/${studentToReassign.class.id}/students/${studentToReassign.id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Then assign to new class
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005'}/classes/${targetClassId}/students`,
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
            `${process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005'}/classes/${student.class.id}/students/${studentId}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }
      }

      // Batch assign to new class
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005'}/classes/${targetClassId}/students/batch`,
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

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen bg-[#f8fafc]">
        <main className="p-6 lg:p-8 max-w-[1600px] mx-auto">

          {/* Page Header - Clean & Minimal */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-gray-900">Students</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
                  <p className="text-gray-500 mt-1">
                    Manage and organize your student records
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => mutate()}
                    disabled={isValidating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Add Student
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Stats Cards */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Students</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{pagination.total || 0}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Assigned</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {students.filter(s => s.class).length}
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unassigned</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {students.filter(s => !s.class).length}
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Classes</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{availableClasses.length}</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Main Content Card */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

              {/* Toolbar */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-3">
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="h-10 px-3 text-sm bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all cursor-pointer"
                    >
                      <option value="all">All Classes</option>
                      <option value="unassigned">Unassigned</option>
                      {availableClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {selectedYear && (
                      <div className="hidden lg:flex items-center gap-2 px-3 h-10 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                        <span>{selectedYear.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Bulk Actions */}
                  {selectedStudents.size > 0 && (
                    <div className="flex items-center gap-2 lg:ml-auto">
                      <span className="text-sm text-gray-500">{selectedStudents.size} selected</span>
                      <button
                        onClick={() => {
                          setTargetClassId('');
                          setReassignMessage(null);
                          setShowBulkReassignModal(true);
                        }}
                        className="h-10 px-4 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
                      >
                        Assign to Class
                      </button>
                      <button
                        onClick={() => setSelectedStudents(new Set())}
                        className="h-10 px-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <BlurLoader
                isLoading={isLoading}
                skeleton={
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="w-12 px-4 py-3"><div className="w-5 h-5 bg-gray-100 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-16 h-3 bg-gray-100 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-12 h-3 bg-gray-100 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-14 h-3 bg-gray-100 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-20 h-3 bg-gray-100 rounded" /></th>
                          <th className="px-4 py-3 text-left"><div className="w-14 h-3 bg-gray-100 rounded" /></th>
                          <th className="px-4 py-3 text-right"><div className="w-16 h-3 bg-gray-100 rounded ml-auto" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="px-4 py-4"><div className="w-5 h-5 bg-gray-100 rounded animate-pulse" /></td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gray-100 rounded-full animate-pulse" />
                                <div className="space-y-1.5">
                                  <div className="w-28 h-4 bg-gray-100 rounded animate-pulse" />
                                  <div className="w-20 h-3 bg-gray-50 rounded animate-pulse" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4"><div className="w-16 h-4 bg-gray-100 rounded animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-12 h-5 bg-gray-100 rounded animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-20 h-4 bg-gray-100 rounded animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-16 h-6 bg-gray-100 rounded-full animate-pulse" /></td>
                            <td className="px-4 py-4"><div className="w-20 h-8 bg-gray-100 rounded ml-auto animate-pulse" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              >
                {/* Revalidating indicator */}
                {isValidating && !isLoading && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 text-white rounded-md text-xs">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Syncing
                    </div>
                  </div>
                )}

                {isEmpty ? (
                  <div className="px-6 py-16 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
                      <Users className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No students found</h3>
                    <p className="text-sm text-gray-500 mb-4">Get started by adding your first student</p>
                    <button
                      onClick={handleAdd}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Student
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Professional Data Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="w-12 px-4 py-3">
                              <button
                                onClick={toggleSelectAll}
                                className="flex items-center justify-center w-5 h-5"
                              >
                                {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? (
                                  <CheckSquare className="w-[18px] h-[18px] text-gray-900" />
                                ) : selectedStudents.size > 0 ? (
                                  <div className="w-[18px] h-[18px] border-2 border-gray-300 bg-gray-100 rounded" />
                                ) : (
                                  <Square className="w-[18px] h-[18px] text-gray-300" />
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Student</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Birth Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Class</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredStudents.map((student) => (
                            <tr
                              key={student.id}
                              className={`group transition-colors ${selectedStudents.has(student.id)
                                ? 'bg-gray-50'
                                : 'hover:bg-gray-50/50'
                                }`}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleStudentSelection(student.id)}
                                  className="flex items-center justify-center w-5 h-5"
                                >
                                  {selectedStudents.has(student.id) ? (
                                    <CheckSquare className="w-[18px] h-[18px] text-gray-900" />
                                  ) : (
                                    <Square className="w-[18px] h-[18px] text-gray-300 group-hover:text-gray-400" />
                                  )}
                                </button>
                              </td>

                              {/* Student Info */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {student.photoUrl ? (
                                    <img
                                      src={`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}${student.photoUrl}`}
                                      alt=""
                                      className="w-9 h-9 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium text-white ${student.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'
                                      }`}>
                                      {student.firstNameLatin.charAt(0)}{student.lastNameLatin.charAt(0)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {student.firstNameLatin} {student.lastNameLatin}
                                    </p>
                                    {student.firstNameKhmer && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {student.firstNameKhmer} {student.lastNameKhmer}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Student ID */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600 font-mono">{student.studentId}</span>
                              </td>

                              {/* Gender */}
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${student.gender === 'MALE'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-pink-50 text-pink-700'
                                  }`}>
                                  {student.gender === 'MALE' ? 'Male' : 'Female'}
                                </span>
                              </td>

                              {/* Date of Birth */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600">
                                  {new Date(student.dateOfBirth).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </td>

                              {/* Class */}
                              <td className="px-4 py-3">
                                {student.class?.name ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                    {student.class.name}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                    Unassigned
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenReassign(student)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Assign to Class"
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setShowResetModal(true);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                    title="Reset Password"
                                  >
                                    <Lock className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/${locale}/students/${student.id}`)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(student)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(student.id)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete"
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

                    {/* Mobile Cards (hidden on desktop) */}
                    <div className="lg:hidden divide-y divide-gray-100">
                      {filteredStudents.map((student) => (
                        <div key={student.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleStudentSelection(student.id)}
                              className="mt-1"
                            >
                              {selectedStudents.has(student.id) ? (
                                <CheckSquare className="w-5 h-5 text-gray-900" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-300" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                {student.photoUrl ? (
                                  <img src={`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}${student.photoUrl}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white ${student.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                    {student.firstNameLatin.charAt(0)}{student.lastNameLatin.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{student.firstNameLatin} {student.lastNameLatin}</p>
                                  <p className="text-xs text-gray-500">{student.studentId}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className={`px-2 py-0.5 rounded ${student.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                  {student.gender === 'MALE' ? 'Male' : 'Female'}
                                </span>
                                {student.class?.name ? (
                                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">{student.class.name}</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500">Unassigned</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowResetModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-amber-600"
                              title="Reset Password"
                            >
                              <Lock className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(student)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </BlurLoader>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-900">{(page - 1) * ITEMS_PER_PAGE + 1}</span>–
                    <span className="font-medium text-gray-900">{Math.min(page * ITEMS_PER_PAGE, totalCount)}</span> of{' '}
                    <span className="font-medium text-gray-900">{totalCount}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center justify-center h-8 w-8 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
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
                          className={`inline-flex items-center justify-center h-8 min-w-[32px] px-2 text-sm font-medium rounded-md transition-colors ${page === pageNum
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="inline-flex items-center justify-center h-8 w-8 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </AnimatedContent>
        </main>
      </div>

      {/* Student Modal */}
      {showModal && (
        <StudentModal
          student={selectedStudent}
          onClose={handleModalClose}
        />
      )}

      {/* Admin Reset Password Modal */}
      {showResetModal && selectedStudent && (
        <AdminResetPasswordModal
          user={{
            id: selectedStudent.id,
            name: `${selectedStudent.firstNameLatin} ${selectedStudent.lastNameLatin}`,
            email: selectedStudent.email || undefined,
          }}
          onClose={() => {
            setShowResetModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* Single Student Reassign Modal */}
      {showReassignModal && studentToReassign && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Assign to Class</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {studentToReassign.firstNameLatin} {studentToReassign.lastNameLatin}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setStudentToReassign(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Current Class
                </label>
                <div className="flex items-center gap-2">
                  {studentToReassign.class?.name ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700">
                      {studentToReassign.class.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-500">
                      Unassigned
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  New Class
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full h-11 px-4 text-sm bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all cursor-pointer"
                >
                  <option value="">Select a class...</option>
                  {availableClasses
                    .filter(c => c.id !== studentToReassign.class?.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} • Grade {c.grade} • {c.studentCount || 0} students
                      </option>
                    ))}
                </select>
              </div>

              {reassignMessage && (
                <div className={`mb-5 p-3 rounded-lg text-sm ${reassignMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                  }`}>
                  {reassignMessage.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReassignModal(false);
                    setStudentToReassign(null);
                  }}
                  className="flex-1 h-11 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReassignStudent}
                  disabled={!targetClassId || isReassigning}
                  className="flex-1 h-11 px-4 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reassign Modal */}
      {showBulkReassignModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Bulk Assign to Class</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedStudents.size} student{selectedStudents.size > 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkReassignModal(false);
                  setTargetClassId('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Selected Students
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-lg max-h-24 overflow-y-auto">
                  {students
                    .filter(s => selectedStudents.has(s.id))
                    .slice(0, 8)
                    .map(s => (
                      <span key={s.id} className="inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-700">
                        {s.firstNameLatin} {s.lastNameLatin}
                      </span>
                    ))}
                  {selectedStudents.size > 8 && (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-200 rounded-md text-xs text-gray-600">
                      +{selectedStudents.size - 8} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Target Class
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full h-11 px-4 text-sm bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all cursor-pointer"
                >
                  <option value="">Select a class...</option>
                  {(() => {
                    const selectedStudentsList = students.filter(s => selectedStudents.has(s.id));
                    const currentClassIds = new Set(
                      selectedStudentsList
                        .filter(s => s.class?.id)
                        .map(s => s.class!.id)
                    );

                    return availableClasses
                      .filter(c => !currentClassIds.has(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} • Grade {c.grade} • {c.studentCount || 0} students
                        </option>
                      ));
                  })()}
                </select>
              </div>

              {reassignMessage && (
                <div className={`mb-5 p-3 rounded-lg text-sm ${reassignMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                  }`}>
                  {reassignMessage.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBulkReassignModal(false);
                    setTargetClassId('');
                  }}
                  className="flex-1 h-11 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkReassign}
                  disabled={!targetClassId || isReassigning}
                  className="flex-1 h-11 px-4 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    `Assign ${selectedStudents.size} Student${selectedStudents.size > 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
