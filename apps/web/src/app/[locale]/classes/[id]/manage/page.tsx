'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  X,
  Check,
  AlertTriangle,
  ChevronDown,
  Loader2,
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
  capacity?: number;
}

interface ClassStudent extends Student {
  enrolledAt?: string;
  status?: string;
}

interface OtherClass {
  id: string;
  name: string;
  grade: string;
  section?: string;
  studentCount: number;
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
  const [otherClasses, setOtherClasses] = useState<OtherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);

  // Selection state
  const [selectedEnrolled, setSelectedEnrolled] = useState<Set<string>>(new Set());
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());

  // Search and filter
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'MALE' | 'FEMALE'>('all');

  // Action states
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetClass, setTransferTargetClass] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Drag state
  const [draggedStudent, setDraggedStudent] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'enrolled' | 'unassigned' | null>(null);

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
      const token = TokenManager.getAccessToken();

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

      if (classJson.success && classJson.data) {
        // API returns data directly, not nested in data.class
        setClassData(classJson.data);
        if (classJson.data.academicYearId) {
          fetchUnassignedStudents(classJson.data.academicYearId);
          fetchOtherClasses(classJson.data.academicYearId);
        }
      } else {
        // API returned an error
        setActionMessage({ 
          type: 'error', 
          text: classJson.message || 'Failed to load class. Please check if the class exists and you have permission to view it.' 
        });
      }

      if (studentsJson.success) {
        setEnrolledStudents(studentsJson.data?.students || studentsJson.data || []);
      }
    } catch (err: any) {
      console.error('Error loading class:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to load class data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedStudents = async (academicYearId: string) => {
    try {
      setLoadingUnassigned(true);
      const token = TokenManager.getAccessToken();

      const response = await fetch(
        `http://localhost:3005/classes/unassigned-students/${academicYearId}?limit=200`,
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

  const fetchOtherClasses = async (academicYearId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(
        `http://localhost:3005/classes/lightweight?academicYearId=${academicYearId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setOtherClasses((data.data || []).filter((c: OtherClass) => c.id !== classId));
      }
    } catch (err) {
      console.error('Failed to fetch other classes:', err);
    }
  };

  const handleAssignStudents = async (studentIds?: string[]) => {
    const idsToAssign = studentIds || Array.from(selectedUnassigned);
    if (idsToAssign.length === 0) return;

    // Store original state for potential rollback
    const originalUnassigned = [...unassignedStudents];
    const originalEnrolled = [...enrolledStudents];

    // OPTIMISTIC UPDATE: Move students to enrolled list immediately for instant UI feedback
    const studentsToMove = unassignedStudents.filter(s => idsToAssign.includes(s.id));
    const newUnassigned = unassignedStudents.filter(s => !idsToAssign.includes(s.id));
    const newEnrolled = [
      ...enrolledStudents,
      ...studentsToMove.map(s => ({
        id: s.id,
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        khmerName: s.khmerName,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        photoUrl: s.photoUrl,
        enrolledAt: new Date().toISOString(),
        status: 'ACTIVE',
      })),
    ];
    
    setUnassignedStudents(newUnassigned);
    setEnrolledStudents(newEnrolled);
    setSelectedUnassigned(new Set());

    try {
      setIsAssigning(true);
      setActionMessage(null);
      const token = TokenManager.getAccessToken();

      const response = await fetch(`http://localhost:3005/classes/${classId}/students/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: idsToAssign,
          academicYearId: classData?.academicYearId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActionMessage({ type: 'success', text: `✓ ${data.data?.assigned || idsToAssign.length} student(s) assigned successfully` });
      } else {
        // ROLLBACK on failure: restore original state
        setUnassignedStudents(originalUnassigned);
        setEnrolledStudents(originalEnrolled);
        if (data.alreadyInOtherClass && data.alreadyInOtherClass.length > 0) {
          const names = data.alreadyInOtherClass.map((s: any) => `${s.studentName} (in ${s.existingClass})`).join(', ');
          setActionMessage({ 
            type: 'warning', 
            text: `⚠ Some students are already assigned: ${names}` 
          });
        } else {
          setActionMessage({ type: 'error', text: data.message || 'Failed to assign students' });
        }
      }
    } catch (err: any) {
      // ROLLBACK on error: restore original state
      setUnassignedStudents(originalUnassigned);
      setEnrolledStudents(originalEnrolled);
      setActionMessage({ type: 'error', text: err.message || 'Failed to assign students' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveStudents = async (studentIds?: string[]) => {
    const idsToRemove = studentIds || Array.from(selectedEnrolled);
    if (idsToRemove.length === 0) return;

    if (!studentIds && !confirm(`Remove ${idsToRemove.length} student(s) from this class?`)) return;

    // Store original state for potential rollback
    const originalEnrolled = [...enrolledStudents];
    const originalUnassigned = [...unassignedStudents];

    // OPTIMISTIC UPDATE: Move students to unassigned list immediately for instant UI feedback
    const studentsToMove = enrolledStudents.filter(s => idsToRemove.includes(s.id));
    const newEnrolled = enrolledStudents.filter(s => !idsToRemove.includes(s.id));
    const newUnassigned = [
      ...studentsToMove.map(s => ({
        id: s.id,
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        khmerName: s.khmerName,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        photoUrl: s.photoUrl,
      })),
      ...unassignedStudents,
    ];
    
    setEnrolledStudents(newEnrolled);
    setUnassignedStudents(newUnassigned);
    setSelectedEnrolled(new Set());

    try {
      setIsRemoving(true);
      setActionMessage(null);
      const token = TokenManager.getAccessToken();

      // Use batch endpoint for faster operation
      const response = await fetch(`http://localhost:3005/classes/${classId}/students/batch-remove`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentIds: idsToRemove }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActionMessage({ type: 'success', text: `✓ ${data.count} student(s) removed` });
      } else {
        // ROLLBACK on failure: restore original state
        setEnrolledStudents(originalEnrolled);
        setUnassignedStudents(originalUnassigned);
        setActionMessage({ type: 'error', text: data.message || 'Failed to remove students' });
      }
    } catch (err: any) {
      // ROLLBACK on error: restore original state
      setEnrolledStudents(originalEnrolled);
      setUnassignedStudents(originalUnassigned);
      setActionMessage({ type: 'error', text: err.message || 'Failed to remove students' });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleTransferStudents = async () => {
    if (selectedEnrolled.size === 0 || !transferTargetClass) return;

    try {
      setIsTransferring(true);
      setActionMessage(null);
      const token = TokenManager.getAccessToken();
      const studentIds = Array.from(selectedEnrolled);

      // First remove from current class
      for (const studentId of studentIds) {
        await fetch(`http://localhost:3005/classes/${classId}/students/${studentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }

      // Then add to target class
      const response = await fetch(`http://localhost:3005/classes/${transferTargetClass}/students/batch`, {
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
      const targetClassName = otherClasses.find(c => c.id === transferTargetClass)?.name || 'target class';

      if (data.success) {
        setActionMessage({ type: 'success', text: `✓ ${studentIds.length} student(s) transferred to ${targetClassName}` });
        setSelectedEnrolled(new Set());
        setShowTransferModal(false);
        setTransferTargetClass('');
        fetchClassData();
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Transfer failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to transfer students' });
    } finally {
      setIsTransferring(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (studentId: string, source: 'enrolled' | 'unassigned') => {
    setDraggedStudent(studentId);
    setDragSource(source);
  };

  const handleDragEnd = () => {
    setDraggedStudent(null);
    setDragSource(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnEnrolled = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedStudent && dragSource === 'unassigned') {
      // Include all selected unassigned students + the dragged one
      const studentsToAssign = new Set(selectedUnassigned);
      studentsToAssign.add(draggedStudent);
      await handleAssignStudents(Array.from(studentsToAssign));
    }
    setDraggedStudent(null);
    setDragSource(null);
  };

  const handleDropOnUnassigned = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedStudent && dragSource === 'enrolled') {
      // Include all selected enrolled students + the dragged one
      const studentsToRemove = new Set(selectedEnrolled);
      studentsToRemove.add(draggedStudent);
      await handleRemoveStudents(Array.from(studentsToRemove));
    }
    setDraggedStudent(null);
    setDragSource(null);
  };

  // Filter students
  const filteredEnrolledStudents = useMemo(() => {
    return enrolledStudents.filter(s => {
      const matchesSearch = !enrolledSearch || 
        s.firstName.toLowerCase().includes(enrolledSearch.toLowerCase()) ||
        s.lastName.toLowerCase().includes(enrolledSearch.toLowerCase()) ||
        s.khmerName?.toLowerCase().includes(enrolledSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(enrolledSearch.toLowerCase());
      const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [enrolledStudents, enrolledSearch, genderFilter]);

  const filteredUnassignedStudents = useMemo(() => {
    return unassignedStudents.filter(s => {
      const matchesSearch = !unassignedSearch ||
        s.firstName.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
        s.lastName.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
        s.khmerName?.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(unassignedSearch.toLowerCase());
      const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [unassignedStudents, unassignedSearch, genderFilter]);

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
    if (selectedEnrolled.size === filteredEnrolledStudents.length) {
      setSelectedEnrolled(new Set());
    } else {
      setSelectedEnrolled(new Set(filteredEnrolledStudents.map(s => s.id)));
    }
  };

  const selectAllUnassigned = () => {
    if (selectedUnassigned.size === filteredUnassignedStudents.length) {
      setSelectedUnassigned(new Set());
    } else {
      setSelectedUnassigned(new Set(filteredUnassignedStudents.map(s => s.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading class data...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation />
        <main className="lg:ml-64 p-4 lg:p-8">
          <div className="max-w-lg mx-auto mt-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Class Not Found</h3>
              <p className="text-gray-600 mb-6">
                The class you're looking for doesn't exist or you don't have permission to access it.
                This could happen if:
              </p>
              <ul className="text-left text-sm text-gray-500 mb-6 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  The class was deleted
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  The class belongs to a different school
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  The URL is incorrect
                </li>
              </ul>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => router.push(`/${locale}/classes`)} 
                  className="px-6 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
                >
                  View All Classes
                </button>
                <button 
                  onClick={() => router.back()} 
                  className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
              </div>
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
          <button onClick={() => router.push(`/${locale}/dashboard`)} className="hover:text-green-600 flex items-center">
            <Home className="w-4 h-4 mr-1" /> Dashboard
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push(`/${locale}/classes`)} className="hover:text-green-600">
            Classes
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">{classData.name} - Manage Students</span>
        </nav>

        {/* Header */}
        <AnimatedContent>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
                <p className="text-gray-500">
                  Grade {classData.grade} {classData.section && `• Section ${classData.section}`}
                  {classData.academicYear && ` • ${classData.academicYear.name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchClassData}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </div>
          </div>
        </AnimatedContent>

        {/* Quick Stats */}
        <AnimatedContent delay={50}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{enrolledStudents.length}</p>
                  <p className="text-sm text-gray-500">Enrolled</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{unassignedStudents.length}</p>
                  <p className="text-sm text-gray-500">Unassigned</p>
                </div>
              </div>
            </div>
            {classData.capacity && (
              <>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{classData.capacity}</p>
                      <p className="text-sm text-gray-500">Capacity</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enrolledStudents.length >= classData.capacity ? 'bg-red-100' : 'bg-emerald-100'}`}>
                      <Check className={`h-5 w-5 ${enrolledStudents.length >= classData.capacity ? 'text-red-600' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{classData.capacity - enrolledStudents.length}</p>
                      <p className="text-sm text-gray-500">Available</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </AnimatedContent>

        {/* Info Banner */}
        <AnimatedContent delay={100}>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">How to manage students:</p>
                <ul className="space-y-1 text-blue-600">
                  <li>• <strong>Drag & Drop:</strong> Drag students between lists to assign/remove</li>
                  <li>• <strong>Multi-select:</strong> Click checkboxes to select multiple students, then use buttons</li>
                  <li>• <strong>Transfer:</strong> Select enrolled students and click "Transfer" to move to another class</li>
                  <li>• Each student can only be in <strong>one class per academic year</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </AnimatedContent>

        {/* Action Message */}
        {actionMessage && (
          <AnimatedContent>
            <div className={`mb-4 p-4 rounded-xl flex items-center justify-between ${
              actionMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 
              actionMessage.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
              'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {actionMessage.type === 'success' ? <Check className="w-5 h-5" /> : 
                 actionMessage.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                 <AlertCircle className="w-5 h-5" />}
                {actionMessage.text}
              </div>
              <button onClick={() => setActionMessage(null)} className="p-1 hover:bg-black/5 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </AnimatedContent>
        )}

        {/* Filter Bar */}
        <AnimatedContent delay={150}>
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-gray-500 font-medium">Filter by:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGenderFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    genderFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setGenderFilter('MALE')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    genderFilter === 'MALE' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  Male
                </button>
                <button
                  onClick={() => setGenderFilter('FEMALE')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    genderFilter === 'FEMALE' ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  Female
                </button>
              </div>

              {/* Action Buttons */}
              {(selectedEnrolled.size > 0 || selectedUnassigned.size > 0) && (
                <div className="flex items-center gap-2 ml-auto">
                  {selectedUnassigned.size > 0 && (
                    <button
                      onClick={() => handleAssignStudents()}
                      disabled={isAssigning}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 shadow-lg shadow-green-200"
                    >
                      {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Assign ({selectedUnassigned.size})
                    </button>
                  )}
                  {selectedEnrolled.size > 0 && (
                    <>
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-200"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer ({selectedEnrolled.size})
                      </button>
                      <button
                        onClick={() => handleRemoveStudents()}
                        disabled={isRemoving}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 shadow-lg shadow-red-200"
                      >
                        {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                        Remove ({selectedEnrolled.size})
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </AnimatedContent>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Unassigned Students */}
          <AnimatedContent delay={200}>
            <div 
              className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-200 ${
                dragSource === 'enrolled' ? 'border-blue-400 bg-blue-50/50 ring-4 ring-blue-200' : 'border-transparent'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnassigned}
            >
              {/* Drop indicator when dragging from enrolled */}
              {dragSource === 'enrolled' && (
                <div className="bg-blue-100 px-4 py-2 text-sm text-blue-700 font-medium flex items-center gap-2 animate-pulse">
                  <UserMinus className="w-4 h-4" />
                  Drop here to remove from class
                </div>
              )}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Unassigned Students
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {filteredUnassignedStudents.length} of {unassignedStudents.length} students
                    </p>
                  </div>
                  <button
                    onClick={() => classData.academicYearId && fetchUnassignedStudents(classData.academicYearId)}
                    className="p-2 hover:bg-white/20 rounded-lg"
                  >
                    <RefreshCw className={`w-5 h-5 ${loadingUnassigned ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Search & Select All */}
              <div className="p-4 border-b bg-gray-50">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={unassignedSearch}
                    onChange={(e) => setUnassignedSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={selectAllUnassigned} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    {selectedUnassigned.size === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">{selectedUnassigned.size} selected</span>
                </div>
              </div>

              {/* Student List */}
              <div className="max-h-[500px] overflow-y-auto">
                {loadingUnassigned ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-500 mt-2">Loading students...</p>
                  </div>
                ) : filteredUnassignedStudents.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">{unassignedSearch ? 'No matching students' : 'All students are assigned'}</p>
                  </div>
                ) : (
                  filteredUnassignedStudents.map((student) => (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={() => handleDragStart(student.id, 'unassigned')}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleUnassignedSelection(student.id)}
                      className={`flex items-center gap-3 p-4 border-b cursor-grab active:cursor-grabbing transition-all hover:bg-blue-50 ${
                        selectedUnassigned.has(student.id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      } ${draggedStudent === student.id ? 'opacity-50 scale-95' : ''}`}
                    >
                      <div className="flex-shrink-0">
                        {selectedUnassigned.has(student.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${student.firstName[0]}${student.lastName[0]}`
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-gray-500 truncate">{student.khmerName} {student.studentId && `• ${student.studentId}`}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
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

          {/* Right: Enrolled Students */}
          <AnimatedContent delay={250}>
            <div 
              className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-200 ${
                dragSource === 'unassigned' ? 'border-green-400 bg-green-50/50 ring-4 ring-green-200' : 'border-transparent'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDropOnEnrolled}
            >
              {/* Drop indicator when dragging from unassigned */}
              {dragSource === 'unassigned' && (
                <div className="bg-green-100 px-4 py-2 text-sm text-green-700 font-medium flex items-center gap-2 animate-pulse">
                  <UserPlus className="w-4 h-4" />
                  Drop here to enroll in class
                </div>
              )}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Enrolled in {classData.name}
                    </h2>
                    <p className="text-green-100 text-sm mt-1">
                      {filteredEnrolledStudents.length} of {enrolledStudents.length} students
                    </p>
                  </div>
                </div>
              </div>

              {/* Search & Select All */}
              <div className="p-4 border-b bg-gray-50">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search enrolled students..."
                    value={enrolledSearch}
                    onChange={(e) => setEnrolledSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={selectAllEnrolled} className="text-sm text-green-600 hover:text-green-800 font-medium">
                    {selectedEnrolled.size === filteredEnrolledStudents.length && filteredEnrolledStudents.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">{selectedEnrolled.size} selected</span>
                </div>
              </div>

              {/* Student List */}
              <div className="max-h-[500px] overflow-y-auto">
                {filteredEnrolledStudents.length === 0 ? (
                  <div className="p-8 text-center">
                    <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">{enrolledSearch ? 'No matching students' : 'No students enrolled yet'}</p>
                    <p className="text-sm text-gray-400 mt-1">Drag students here to enroll them</p>
                  </div>
                ) : (
                  filteredEnrolledStudents.map((student) => (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={() => handleDragStart(student.id, 'enrolled')}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleEnrolledSelection(student.id)}
                      className={`flex items-center gap-3 p-4 border-b cursor-grab active:cursor-grabbing transition-all hover:bg-green-50 ${
                        selectedEnrolled.has(student.id) ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                      } ${draggedStudent === student.id ? 'opacity-50 scale-95' : ''}`}
                    >
                      <div className="flex-shrink-0">
                        {selectedEnrolled.has(student.id) ? (
                          <CheckSquare className="w-5 h-5 text-green-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${student.firstName[0]}${student.lastName[0]}`
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-gray-500 truncate">{student.khmerName} {student.studentId && `• ${student.studentId}`}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
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

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Transfer Students
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Move {selectedEnrolled.size} student(s) to another class
                </p>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Target Class
                </label>
                <select
                  value={transferTargetClass}
                  onChange={(e) => setTransferTargetClass(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a class...</option>
                  {otherClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Grade {c.grade}) - {c.studentCount || 0} students
                    </option>
                  ))}
                </select>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      Students will be removed from <strong>{classData.name}</strong> and added to the selected class.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setTransferTargetClass('');
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferStudents}
                    disabled={!transferTargetClass || isTransferring}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transferring...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer
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
  );
}
