'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { getStudents, deleteStudent, type Student } from '@/lib/api/students';
import StudentModal from '@/components/students/StudentModal';
import Pagination from '@/components/Pagination';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import AcademicYearSelector from '@/components/AcademicYearSelector';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function StudentsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('students');
  const tc = useTranslations('common');
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300); // 300ms delay
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;
  const { selectedYear } = useAcademicYear();

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    fetchStudents();
  }, [page, debouncedSearch]); // Use debounced search instead of direct searchTerm

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await getStudents({ 
        page, 
        limit: ITEMS_PER_PAGE, 
        search: debouncedSearch 
      });
      setStudents(response.data.students);
      setTotalPages(response.data.pagination.totalPages);
      setTotalCount(response.data.pagination.total || response.data.pagination.totalCount || 0);
    } catch (error: any) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchStudents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      await deleteStudent(id);
      fetchStudents();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedStudent(null);
    setShowModal(true);
  };

  const handleModalClose = (refresh?: boolean) => {
    setShowModal(false);
    setSelectedStudent(null);
    if (refresh) {
      fetchStudents();
    }
  };

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.replace(`/${locale}/auth/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 bg-stunity-primary-50 text-stunity-primary-700 rounded-lg text-sm font-medium"
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Students
                </button>
                <button
                  onClick={() => router.push(`/${locale}/teachers`)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  <GraduationCap className="w-4 h-4 inline mr-2" />
                  Teachers
                </button>
                <button
                  onClick={() => router.push(`/${locale}/classes`)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  <BookOpen className="w-4 h-4 inline mr-2" />
                  Classes
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <AcademicYearSelector />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{school?.name || 'School'}</p>
                <p className="text-xs text-gray-600">Students Management</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Academic Year Info */}
        {selectedYear && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-gray-600">Academic Year:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {selectedYear.name}
            </span>
            <span className="text-xs text-gray-500">(Showing all students - filter by class to see year-specific enrollments)</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Search
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-stunity-primary-600 text-white rounded-lg hover:bg-stunity-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </button>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-stunity-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
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
      </div>

      {/* Student Modal */}
      {showModal && (
        <StudentModal
          student={selectedStudent}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
