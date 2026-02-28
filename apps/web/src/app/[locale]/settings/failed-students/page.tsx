'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { SCHOOL_SERVICE_URL, STUDENT_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  khmerName: string | null;
  gender: string;
  grade: number;
  className: string;
}

export default function FailedStudentsPage({ params }: { params: { locale: string } }) {
  const router = useRouter();

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${params.locale}/login`);
  };

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    if (fromYearId) {
      loadStudents();
    }
  }, [fromYearId]);

  const loadAcademicYears = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${params.locale}/auth/login`);
        return;
      }

      const response = await fetch(
        `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const result = await response.json();
      if (result.success) {
        const sortedYears = result.data.sort(
          (a: AcademicYear, b: AcademicYear) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        setYears(sortedYears);
        
        // Auto-select current year as from year
        const current = sortedYears.find((y: AcademicYear) => y.isCurrent);
        if (current) {
          setFromYearId(current.id);
          // Auto-select next year as to year
          const nextYear = sortedYears.find(
            (y: AcademicYear) =>
              new Date(y.startDate) > new Date(current.startDate)
          );
          if (nextYear) {
            setToYearId(nextYear.id);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      // Get all students with their current classes
      const response = await fetch(
        `${STUDENT_SERVICE_URL}/schools/${schoolId}/students`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const result = await response.json();
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsFailed = async () => {
    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    if (!fromYearId || !toYearId) {
      setError('Please select academic years');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const token = TokenManager.getAccessToken();

      const response = await fetch(`${STUDENT_SERVICE_URL}/students/mark-failed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          fromAcademicYearId: fromYearId,
          toAcademicYearId: toYearId,
          notes: 'Marked as failed - repeating grade',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully processed ${result.data.processed} student(s)`);
        setSelectedStudents(new Set());
        if (result.data.failed.length > 0) {
          setError(`Failed: ${result.data.failed.length} student(s)`);
        }
      } else {
        setError(result.error || 'Failed to mark students');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const filteredStudents = students.filter(s =>
    s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.khmerName && s.khmerName.includes(searchQuery))
  );

  const fromYear = years.find(y => y.id === fromYearId);
  const toYear = years.find(y => y.id === toYearId);

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Academic Years
          </button>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" />
            Failed Student Management
          </h1>
          <p className="text-red-50">Mark students who failed and need to repeat the grade</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
              ×
            </button>
          </div>
        )}

        {/* Year Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Academic Years</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Academic Year (Current)
              </label>
              <select
                value={fromYearId}
                onChange={(e) => setFromYearId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select year...</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.isCurrent && '(Current)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Academic Year (Repeat In)
              </label>
              <select
                value={toYearId}
                onChange={(e) => setToYearId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select year...</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fromYear && toYear && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> Students will repeat their current grade in {toYear.name}. 
                They will stay in the same grade level (e.g., Grade 7 → Grade 7).
              </p>
            </div>
          )}
        </div>

        {/* Student Selection */}
        {fromYearId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Select Students ({selectedStudents.size} selected)
              </h2>
              <button
                onClick={loadStudents}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Select All */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                  onChange={toggleAll}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="font-medium text-gray-900">
                  Select All ({filteredStudents.length} students)
                </span>
              </label>
            </div>

            {/* Student List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-500 mb-3"></div>
                <p className="text-gray-600">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No students found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                        {student.khmerName && (
                          <span className="text-gray-600 ml-2">({student.khmerName})</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        Grade {student.grade} • {student.className || 'No class'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Action Button */}
            {selectedStudents.size > 0 && toYearId && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleMarkAsFailed}
                  disabled={processing}
                  className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      Mark {selectedStudents.size} Student(s) as Failed
                    </>
                  )}
                </button>
                <p className="text-center text-sm text-gray-600 mt-3">
                  Students will repeat grade in {toYear?.name}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* End main content wrapper */}
    </div>
    </>
  );
}
