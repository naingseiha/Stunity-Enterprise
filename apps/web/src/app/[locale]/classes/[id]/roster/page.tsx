'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, 
  UserPlus, 
  UserMinus, 
  Search, 
  Users, 
  CheckSquare, 
  Square,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { getClass } from '@/lib/api/classes';
import { 
  getClassStudents, 
  assignStudentToClass, 
  removeStudentFromClass,
  assignMultipleStudentsToClass
} from '@/lib/api/class-students';
import { getStudents } from '@/lib/api/students';
import { TokenManager } from '@/lib/api/auth';
import type { Class } from '@/lib/api/classes';
import type { StudentInClass } from '@/lib/api/class-students';
import type { Student } from '@/lib/api/students';

export default function ClassRosterEnhancedPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('classes');
  const tc = useTranslations('common');
  const router = useRouter();

  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Multi-select state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.replace(`/${locale}/auth/login`);
        return false;
      }
      return true;
    };

    const loadData = async () => {
      if (!checkAuth()) return;

      try {
        // Load class details and students in parallel
        const [classResult, studentsResult, allStudentsResult] = await Promise.all([
          getClass(id),
          getClassStudents(id),
          getStudents({ limit: 1000 }),
        ]);

        setClassData(classResult.data.class);
        setStudents(studentsResult);
        setAllStudents(allStudentsResult.data.students);
      } catch (error: any) {
        console.error('Error loading data:', error);
        alert(error.message || 'Failed to load class data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, locale, router]);

  const handleAddStudent = async (studentId: string) => {
    setSubmitting(true);
    try {
      await assignStudentToClass(id, { studentId });
      
      // Reload students
      const updatedStudents = await getClassStudents(id);
      setStudents(updatedStudents);
      setSearchQuery('');
    } catch (error: any) {
      alert(error.message || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student from the class?')) return;

    setSubmitting(true);
    try {
      await removeStudentFromClass(id, studentId);
      
      // Reload students
      const updatedStudents = await getClassStudents(id);
      setStudents(updatedStudents);
    } catch (error: any) {
      alert(error.message || 'Failed to remove student');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk add students
  const handleBulkAddStudents = async () => {
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student');
      return;
    }

    setSubmitting(true);
    try {
      const result = await assignMultipleStudentsToClass(id, {
        studentIds: Array.from(selectedStudentIds),
      });

      alert(
        `Successfully added ${result.assigned} student(s) to class. ${result.skipped > 0 ? `${result.skipped} already in class.` : ''}`
      );

      // Reload students and reset selection
      const updatedStudents = await getClassStudents(id);
      setStudents(updatedStudents);
      setSelectedStudentIds(new Set());
      setShowAddModal(false);
      setSearchQuery('');
    } catch (error: any) {
      alert(error.message || 'Failed to add students');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudentIds);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudentIds(newSelection);
  };

  // Select/deselect all visible students
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredAvailableStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredAvailableStudents.map(s => s.id)));
    }
  };

  // Filter out students already in the class
  const availableStudents = allStudents.filter(
    s => !students.some(cs => cs.id === s.id)
  );

  // Search filter for adding students
  const filteredAvailableStudents = availableStudents.filter(
    s =>
      (s.firstNameLatin || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.lastNameLatin || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.firstNameKhmer && s.firstNameKhmer.includes(searchQuery)) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stunity-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{tc('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {tc('back')}
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {classData?.name}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Grade {classData?.grade}</span>
                  {classData?.section && <span>Section {classData.section}</span>}
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {students.length} students
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-stunity-primary-600 text-white rounded-lg hover:bg-stunity-primary-700 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  Add Students
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Students in Class ({students.length})
              </h2>
              
              {students.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert('Export feature coming soon!')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              )}
            </div>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No students in this class yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-stunity-primary-600 hover:text-stunity-primary-700 font-medium"
              >
                Add your first student
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {students.map((student, index) => (
                <div
                  key={student.id}
                  className="p-4 hover:bg-gray-50 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    {/* Number */}
                    <div className="text-sm text-gray-500 w-8 text-right">
                      {index + 1}
                    </div>

                    {/* Photo */}
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {student.photoUrl ? (
                        <img
                          src={`http://localhost:3003${student.photoUrl}`}
                          alt={`${student.firstName} ${student.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {student.firstName[0]}{student.lastName[0]}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      {student.nameKh && (
                        <p className="text-sm text-gray-600 truncate">{student.nameKh}</p>
                      )}
                      <p className="text-xs text-gray-500">ID: {student.studentId}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveStudent(student.id)}
                    disabled={submitting}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal - Enhanced with Multi-Select */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Add Students to Class
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Select one or more students to add to {classData?.name}
                  </p>
                </div>
                
                {selectedStudentIds.size > 0 && (
                  <div className="flex items-center gap-2 bg-stunity-primary-50 text-stunity-primary-700 px-3 py-1.5 rounded-lg">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {selectedStudentIds.size} selected
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Search & Select All */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                />
              </div>

              {filteredAvailableStudents.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-stunity-primary-600 hover:text-stunity-primary-700"
                >
                  {selectedStudentIds.size === filteredAvailableStudents.length ? (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Select All ({filteredAvailableStudents.length})
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredAvailableStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchQuery ? 'No students found' : 'All students are already in this class'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableStudents.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);
                    
                    return (
                      <button
                        key={student.id}
                        onClick={() => toggleStudentSelection(student.id)}
                        disabled={submitting}
                        className={`w-full p-4 border-2 rounded-lg transition-all text-left disabled:opacity-50 ${
                          isSelected
                            ? 'border-stunity-primary-500 bg-stunity-primary-50'
                            : 'border-gray-200 hover:border-stunity-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Checkbox */}
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-stunity-primary-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </div>

                          {/* Photo */}
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {student.photoUrl ? (
                              <img
                                src={`http://localhost:3003${student.photoUrl}`}
                                alt={`${student.firstNameLatin} ${student.lastNameLatin}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 text-sm font-medium">
                                {(student.firstNameLatin || '')[0]}{(student.lastNameLatin || '')[0]}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {student.firstNameLatin} {student.lastNameLatin}
                            </p>
                            {student.firstNameKhmer && (
                              <p className="text-sm text-gray-600 truncate">{student.firstNameKhmer}</p>
                            )}
                            <p className="text-xs text-gray-500">ID: {student.studentId}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                {availableStudents.length} available students
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                    setSelectedStudentIds(new Set());
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleBulkAddStudents}
                  disabled={submitting || selectedStudentIds.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-stunity-primary-600 text-white rounded-lg hover:bg-stunity-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add {selectedStudentIds.size > 0 ? `${selectedStudentIds.size} ` : ''}Student{selectedStudentIds.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
