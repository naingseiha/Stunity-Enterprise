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
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { getClasses, deleteClass, type Class } from '@/lib/api/classes';
import ClassModal from '@/components/classes/ClassModal';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import AcademicYearSelector from '@/components/AcademicYearSelector';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { CardSkeleton } from '@/components/LoadingSkeleton';

export default function ClassesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('classes');
  const tc = useTranslations('common');
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
    }
  }, [page, selectedGrade, selectedYear]);

  const fetchClasses = async () => {
    if (!selectedYear) return;
    
    setLoading(true);
    try {
      const response = await getClasses({ 
        page, 
        limit: 20, 
        grade: selectedGrade,
        academicYearId: selectedYear.id 
      });
      setClasses(response.data.classes);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await deleteClass(id);
      fetchClasses();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowModal(true);
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

      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
        {/* Academic Year Info */}
        {selectedYear && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-gray-600">Viewing classes for:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {selectedYear.name}
            </span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <select
              value={selectedGrade || ''}
              onChange={(e) => setSelectedGrade(e.target.value ? parseInt(e.target.value) : undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
            >
              <option value="">All Grades</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-stunity-primary-600 text-white rounded-lg hover:bg-stunity-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Class
          </button>
        </div>

        {/* Classes Grid with Blur Loading */}
        <AnimatedContent animation="slide-up" delay={100}>
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
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {classes.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No classes found</p>
              <p className="text-gray-500 text-sm mt-2">Click "Add Class" to create your first class</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {classes.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{classItem.name}</h3>
                        <p className="text-sm text-gray-500">Grade {classItem.grade}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                          className="text-stunity-primary-600 hover:text-stunity-primary-900"
                          title="View Roster"
                        >
                          <Users className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(classItem)}
                          className="text-stunity-primary-600 hover:text-stunity-primary-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(classItem.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {classItem.section && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Section:</span>
                          <span className="font-medium">{classItem.section}</span>
                        </div>
                      )}
                      {classItem.track && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Track:</span>
                          <span className="font-medium">{classItem.track}</span>
                        </div>
                      )}
                      {classItem.room && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Room:</span>
                          <span className="font-medium">{classItem.room}</span>
                        </div>
                      )}
                      {classItem.capacity && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Capacity:</span>
                          <span className="font-medium">{classItem.capacity}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-medium">{classItem._count?.students || 0}</span>
                      </div>
                      {classItem.homeroomTeacher && (
                        <div className="pt-2 mt-2 border-t">
                          <p className="text-gray-600 text-xs mb-1">Homeroom Teacher:</p>
                          <p className="font-medium">
                            {classItem.homeroomTeacher.firstNameLatin} {classItem.homeroomTeacher.lastNameLatin}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
      </div>

      {/* Class Modal */}
      {showModal && (
        <ClassModal
          classItem={selectedClass}
          onClose={handleModalClose}
        />
      )}
      {/* End main content wrapper */}
    </div>
    </>
  );
}
