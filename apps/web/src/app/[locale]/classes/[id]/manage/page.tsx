'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  ArrowLeft,
  Home,
  ChevronRight,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowRightLeft,
  Filter,
  Download,
  RefreshCw,
  GraduationCap,
  Info,
} from 'lucide-react';

interface Student {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  khmerName: string;
  gender: string;
  dateOfBirth?: string;
  photoUrl?: string;
}

interface ClassData {
  id: string;
  name: string;
  grade: string;
  section: string | null;
  academicYearId: string;
  academicYear?: {
    id: string;
    name: string;
  };
  studentCount?: number;
  maxCapacity?: number;
}

interface ClassStudent extends Student {
  enrolledAt?: string;
  status?: string;
}

export default function ClassManagePage() {
  const router = useRouter();
  const params = useParams();
  const classId = params?.id as string;
  const locale = params?.locale as string;

  const [user, setUser] = useState<any>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<ClassStudent[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedEnrolled, setSelectedEnrolled] = useState<Set<string>>(new Set());
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());

  // Search and filter
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [unassignedSearch, setUnassignedSearch] = useState('');

  // Action states
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    setUser(userData.user);
  }, [router, locale]);

  useEffect(() => {
    if (user && classId) {
      fetchClassData();
    }
  }, [user, classId]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = TokenManager.getAccessToken();

      // Fetch class details and enrolled students
      const [classRes, studentsRes] = await Promise.all([
        fetch(`http://localhost:3005/classes/${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`http://localhost:3005/classes/${classId}/students`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const classJson = await classRes.json();
      const studentsJson = await studentsRes.json();

      if (classJson.success) {
        setClassData(classJson.data.class);
        // Fetch unassigned students after we have the academic year
        if (classJson.data.class.academicYearId) {
          fetchUnassignedStudents(classJson.data.class.academicYearId);
        }
      } else {
        setError(classJson.message || 'Failed to load class');
      }

      if (studentsJson.success) {
        setEnrolledStudents(studentsJson.data.students || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedStudents = async (academicYearId: string) => {
    try {
      setLoadingUnassigned(true);
      const token = TokenManager.getAccessToken();

      const response = await fetch(
        `http://localhost:3005/classes/unassigned-students/${academicYearId}?search=${unassignedSearch}&limit=100`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setUnassignedStudents(data.data.students || []);
      }
    } catch (err) {
      console.error('Failed to fetch unassigned students:', err);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleAssignStudents = async () => {
    if (selectedUnassigned.size === 0) return;

    try {
      setIsAssigning(true);
      setActionMessage(null);
      const token = TokenManager.getAccessToken();
      const studentIds = Array.from(selectedUnassigned);

      const response = await fetch(`http://localhost:3005/classes/${classId}/students/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds,
          academicYearId: classData?.academicYearId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActionMessage({ type: 'success', text: `${data.data?.assigned || studentIds.length} student(s) assigned successfully` });
        setSelectedUnassigned(new Set());
        // Refresh data
        fetchClassData();
      } else {
        // Check for students already in other classes
        if (data.alreadyInOtherClass && data.alreadyInOtherClass.length > 0) {
          const names = data.alreadyInOtherClass.map((s: any) => `${s.studentName} (${s.existingClass})`).join(', ');
          setActionMessage({ 
            type: 'error', 
            text: `Some students are already in other classes: ${names}` 
          });
        } else {
          setActionMessage({ type: 'error', text: data.message || 'Failed to assign students' });
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to assign students' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveStudents = async () => {
    if (selectedEnrolled.size === 0) return;

    if (!confirm(`Remove ${selectedEnrolled.size} student(s) from this class?`)) return;

    try {
      setIsRemoving(true);
      setActionMessage(null);
      const token = TokenManager.getAccessToken();

      // Remove students one by one (or implement batch remove in API)
      const studentIds = Array.from(selectedEnrolled);
      let successCount = 0;
      let failCount = 0;

      for (const studentId of studentIds) {
        try {
          const response = await fetch(`http://localhost:3005/classes/${classId}/students/${studentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.success) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        setActionMessage({ type: 'success', text: `${successCount} student(s) removed` });
        setSelectedEnrolled(new Set());
        fetchClassData();
      }
      if (failCount > 0) {
        setActionMessage({ type: 'error', text: `Failed to remove ${failCount} student(s)` });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to remove students' });
    } finally {
      setIsRemoving(false);
    }
  };

  const toggleEnrolledSelection = (studentId: string) => {
    setSelectedEnrolled(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) newSet.delete(studentId);
      else newSet.add(studentId);
      return newSet;
    });
  };

  const toggleUnassignedSelection = (studentId: string) => {
    setSelectedUnassigned(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) newSet.delete(studentId);
      else newSet.add(studentId);
      return newSet;
    });
  };

  const selectAllEnrolled = () => {
    const filtered = filteredEnrolledStudents;
    if (selectedEnrolled.size === filtered.length) {
      setSelectedEnrolled(new Set());
    } else {
      setSelectedEnrolled(new Set(filtered.map(s => s.id)));
    }
  };

  const selectAllUnassigned = () => {
    const filtered = filteredUnassignedStudents;
    if (selectedUnassigned.size === filtered.length) {
      setSelectedUnassigned(new Set());
    } else {
      setSelectedUnassigned(new Set(filtered.map(s => s.id)));
    }
  };

  // Filter students based on search
  const filteredEnrolledStudents = enrolledStudents.filter(s => {
    const search = enrolledSearch.toLowerCase();
    return !search ||
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      s.khmerName?.toLowerCase().includes(search) ||
      s.studentId?.toLowerCase().includes(search);
  });

  const filteredUnassignedStudents = unassignedStudents.filter(s => {
    const search = unassignedSearch.toLowerCase();
    return !search ||
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      s.khmerName?.toLowerCase().includes(search) ||
      s.studentId?.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <BlurLoader isLoading={true}>
          <div className="p-8">Loading class data...</div>
        </BlurLoader>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation />
        <main className="lg:ml-64 p-4 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800">Error Loading Class</h3>
              <p className="text-red-600">{error || 'Class not found'}</p>
              <button onClick={() => router.back()} className="mt-2 text-red-700 hover:underline flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Go back
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation />
      
      <main className="lg:ml-64 p-4 lg:p-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-600 mb-6">
          <button onClick={() => router.push(`/${locale}/dashboard`)} className="hover:text-orange-600 flex items-center">
            <Home className="w-4 h-4 mr-1" /> Dashboard
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push(`/${locale}/classes`)} className="hover:text-orange-600">
            Classes
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">{classData.name} - Manage Students</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-orange-500" />
              {classData.name}
            </h1>
            <p className="text-gray-500 mt-1">
              Grade {classData.grade} {classData.section && `• Section ${classData.section}`}
              {classData.academicYear && ` • ${classData.academicYear.name}`}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Student Assignment Rules:</p>
            <ul className="list-disc ml-4 mt-1 text-blue-600">
              <li>Each student can only be assigned to <strong>one class</strong> per academic year</li>
              <li>Students already enrolled in another class will show an error</li>
              <li>Select multiple students and click the arrow button to assign/remove</li>
            </ul>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            actionMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <AlertCircle className="w-5 h-5" />
            {actionMessage.text}
            <button onClick={() => setActionMessage(null)} className="ml-auto text-gray-500 hover:text-gray-700">×</button>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Unassigned Students */}
          <AnimatedContent>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Unassigned Students
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {unassignedStudents.length} students available
                </p>
              </div>

              {/* Search & Actions */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={unassignedSearch}
                      onChange={(e) => setUnassignedSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={() => classData.academicYearId && fetchUnassignedStudents(classData.academicYearId)}
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-5 h-5 ${loadingUnassigned ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={selectAllUnassigned}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedUnassigned.size === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedUnassigned.size} selected
                  </span>
                </div>
              </div>

              {/* Student List */}
              <div className="max-h-[400px] overflow-y-auto">
                {loadingUnassigned ? (
                  <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : filteredUnassignedStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {unassignedSearch ? 'No matching students' : 'All students are assigned to classes'}
                  </div>
                ) : (
                  filteredUnassignedStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => toggleUnassignedSelection(student.id)}
                      className={`flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUnassigned.has(student.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      {selectedUnassigned.has(student.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium overflow-hidden">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${student.firstName[0]}${student.lastName[0]}`
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {student.khmerName} {student.studentId && `• ${student.studentId}`}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        student.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {student.gender === 'MALE' ? 'M' : 'F'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </AnimatedContent>

          {/* Center: Action Buttons */}
          <div className="hidden lg:flex flex-col items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 z-10" style={{ marginTop: '100px' }}>
            <button
              onClick={handleAssignStudents}
              disabled={selectedUnassigned.size === 0 || isAssigning}
              className="p-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
              title="Assign selected students to class"
            >
              <UserPlus className={`w-6 h-6 ${isAssigning ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={handleRemoveStudents}
              disabled={selectedEnrolled.size === 0 || isRemoving}
              className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove selected students from class"
            >
              <UserMinus className={`w-6 h-6 ${isRemoving ? 'animate-pulse' : ''}`} />
            </button>
          </div>

          {/* Right: Enrolled Students */}
          <AnimatedContent delay={100}>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 text-white">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Enrolled Students
                </h2>
                <p className="text-orange-100 text-sm mt-1">
                  {enrolledStudents.length} students in {classData.name}
                </p>
              </div>

              {/* Search & Actions */}
              <div className="p-4 border-b bg-gray-50">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search enrolled..."
                    value={enrolledSearch}
                    onChange={(e) => setEnrolledSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={selectAllEnrolled}
                    className="text-sm text-orange-600 hover:text-orange-800"
                  >
                    {selectedEnrolled.size === filteredEnrolledStudents.length && filteredEnrolledStudents.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedEnrolled.size} selected
                  </span>
                </div>
              </div>

              {/* Student List */}
              <div className="max-h-[400px] overflow-y-auto">
                {filteredEnrolledStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {enrolledSearch ? 'No matching students' : 'No students enrolled yet'}
                  </div>
                ) : (
                  filteredEnrolledStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => toggleEnrolledSelection(student.id)}
                      className={`flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedEnrolled.has(student.id) ? 'bg-orange-50' : ''
                      }`}
                    >
                      {selectedEnrolled.has(student.id) ? (
                        <CheckSquare className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium overflow-hidden">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${student.firstName[0]}${student.lastName[0]}`
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {student.khmerName} {student.studentId && `• ${student.studentId}`}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        student.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {student.gender === 'MALE' ? 'M' : 'F'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </AnimatedContent>
        </div>

        {/* Mobile Action Buttons */}
        <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
          <button
            onClick={handleAssignStudents}
            disabled={selectedUnassigned.size === 0 || isAssigning}
            className="px-6 py-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Assign ({selectedUnassigned.size})
          </button>
          <button
            onClick={handleRemoveStudents}
            disabled={selectedEnrolled.size === 0 || isRemoving}
            className="px-6 py-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
          >
            <UserMinus className="w-5 h-5" />
            Remove ({selectedEnrolled.size})
          </button>
        </div>
      </main>
    </div>
  );
}
