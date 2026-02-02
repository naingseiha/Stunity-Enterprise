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
              </div>
            </div>
          </AnimatedContent>

        {/* Students Table with Blur Loading */}
        <AnimatedContent animation="slide-up" delay={100}>
          <BlurLoader
            isLoading={isLoading}
            skeleton={
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TableSkeleton rows={10} />
                    </tbody>
                  </table>
                </div>
              </div>
            }
          >
            <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
              {/* Show subtle loading indicator when revalidating */}
              {isValidating && !isLoading && (
                <div className="absolute top-2 right-2 z-10">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                </div>
              )}
              {isEmpty ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No students found</p>
              <p className="text-gray-500 text-sm mt-2">Click "Add Student" to create your first student</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Photo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date of Birth
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.photoUrl ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}${student.photoUrl}`}
                              alt={`${student.firstNameLatin} ${student.lastNameLatin}`}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                              {student.firstNameLatin.charAt(0)}{student.lastNameLatin.charAt(0)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.firstNameLatin} {student.lastNameLatin}
                          </div>
                          {student.firstNameKhmer && (
                            <div className="text-sm text-gray-500">
                              {student.firstNameKhmer} {student.lastNameKhmer}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.gender}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(student.dateOfBirth).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.class?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => router.push(`/${locale}/students/${student.id}`)}
                            className="text-orange-600 hover:text-orange-900 mr-3"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleEdit(student)}
                            className="text-stunity-primary-600 hover:text-stunity-primary-900 mr-3"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
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
        </main>
      </div>
    </>
  );
}
