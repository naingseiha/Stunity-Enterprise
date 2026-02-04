'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import {
  BookOpen,
  Plus,
  X,
  Search,
  ArrowLeft,
  Home,
  ChevronRight,
  CheckSquare,
  Square,
  AlertCircle,
  Save,
  User,
  Filter,
  Layers,
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  nameKh?: string;
  code: string;
  category: string;
  grade: string;
  coefficient?: number;
  weeklyHours?: number;
  isActive: boolean;
  assignedAt?: string;
  assignmentId?: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

export default function TeacherSubjectsPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = params?.id as string;
  const locale = params?.locale as string;

  const [user, setUser] = useState<any>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Action states
  const [isSaving, setIsSaving] = useState(false);
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
    if (user && teacherId) {
      fetchData();
    }
  }, [user, teacherId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = TokenManager.getAccessToken();

      // Fetch teacher's assigned subjects and all available subjects
      const [teacherSubjectsRes, allSubjectsRes] = await Promise.all([
        fetch(`http://localhost:3004/teachers/${teacherId}/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('http://localhost:3006/subjects?limit=200', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const teacherData = await teacherSubjectsRes.json();
      const subjectsData = await allSubjectsRes.json();

      if (teacherData.success) {
        setTeacher(teacherData.data.teacher);
        setAssignedSubjects(teacherData.data.subjects || []);
      } else {
        setError(teacherData.error || 'Failed to load teacher data');
      }

      if (subjectsData.success) {
        setAllSubjects(subjectsData.data.subjects || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (selectedToAdd.size === 0 && selectedToRemove.size === 0) return;

    try {
      setIsSaving(true);
      setActionMessage(null);
      const token = TokenManager.getAccessToken();

      // Calculate new subject list
      const currentIds = new Set(assignedSubjects.map(s => s.id));
      
      // Add new selections
      selectedToAdd.forEach(id => currentIds.add(id));
      
      // Remove deselected
      selectedToRemove.forEach(id => currentIds.delete(id));

      const newSubjectIds = Array.from(currentIds);

      const response = await fetch(`http://localhost:3004/teachers/${teacherId}/subjects`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subjectIds: newSubjectIds }),
      });

      const data = await response.json();

      if (data.success) {
        setActionMessage({ type: 'success', text: 'Subject assignments updated successfully' });
        setSelectedToAdd(new Set());
        setSelectedToRemove(new Set());
        fetchData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to update subjects' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save changes' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSubjectSelection = (subjectId: string) => {
    const isAssigned = assignedSubjects.some(s => s.id === subjectId);

    if (isAssigned) {
      // Toggle removal
      setSelectedToRemove(prev => {
        const newSet = new Set(prev);
        if (newSet.has(subjectId)) newSet.delete(subjectId);
        else newSet.add(subjectId);
        return newSet;
      });
    } else {
      // Toggle addition
      setSelectedToAdd(prev => {
        const newSet = new Set(prev);
        if (newSet.has(subjectId)) newSet.delete(subjectId);
        else newSet.add(subjectId);
        return newSet;
      });
    }
  };

  // Get unique grades and categories for filters
  const grades = [...new Set(allSubjects.map(s => s.grade))].sort();
  const categories = [...new Set(allSubjects.map(s => s.category))].sort();

  // Filter subjects
  const filteredSubjects = allSubjects.filter(s => {
    const matchesSearch = !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameKh?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = !filterGrade || s.grade === filterGrade;
    const matchesCategory = !filterCategory || s.category === filterCategory;
    return matchesSearch && matchesGrade && matchesCategory && s.isActive;
  });

  // Separate into assigned and available
  const assignedIds = new Set(assignedSubjects.map(s => s.id));
  const displayAssigned = filteredSubjects.filter(s => assignedIds.has(s.id));
  const displayAvailable = filteredSubjects.filter(s => !assignedIds.has(s.id));

  const hasChanges = selectedToAdd.size > 0 || selectedToRemove.size > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <BlurLoader isLoading={true} showSpinner={false}>
          <div className="p-8">Loading teacher subjects...</div>
        </BlurLoader>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation />
        <main className="lg:ml-64 p-4 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-600">{error || 'Teacher not found'}</p>
            <button onClick={() => router.back()} className="mt-4 text-red-700 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
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
          <button onClick={() => router.push(`/${locale}/teachers`)} className="hover:text-orange-600">
            Teachers
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push(`/${locale}/teachers/${teacherId}`)} className="hover:text-orange-600">
            {teacher.firstName} {teacher.lastName}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">Subject Assignments</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
              {teacher.photoUrl ? (
                <img src={teacher.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                `${teacher.firstName[0]}${teacher.lastName[0]}`
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {teacher.firstName} {teacher.lastName}
              </h1>
              <p className="text-gray-500">Subject Assignments</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Save className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
                Save Changes
              </button>
            )}
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

        {/* Filters */}
        <AnimatedContent>
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white min-w-[120px]"
              >
                <option value="">All Grades</option>
                {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white min-w-[150px]"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Summary */}
            <div className="flex gap-4 mt-4 text-sm">
              <span className="text-gray-600">
                Currently assigned: <strong className="text-orange-600">{assignedSubjects.length}</strong>
              </span>
              {hasChanges && (
                <>
                  {selectedToAdd.size > 0 && (
                    <span className="text-green-600">
                      +{selectedToAdd.size} to add
                    </span>
                  )}
                  {selectedToRemove.size > 0 && (
                    <span className="text-red-600">
                      -{selectedToRemove.size} to remove
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </AnimatedContent>

        {/* Subject Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Subjects */}
          <AnimatedContent delay={100}>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 text-white">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Assigned Subjects
                </h2>
                <p className="text-orange-100 text-sm mt-1">
                  {displayAssigned.length} subject(s) currently teaching
                </p>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {displayAssigned.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No subjects assigned yet
                  </div>
                ) : (
                  displayAssigned.map((subject) => {
                    const willBeRemoved = selectedToRemove.has(subject.id);
                    return (
                      <div
                        key={subject.id}
                        onClick={() => toggleSubjectSelection(subject.id)}
                        className={`flex items-center gap-3 p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          willBeRemoved ? 'bg-red-50 opacity-60' : ''
                        }`}
                      >
                        {willBeRemoved ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckSquare className="w-5 h-5 text-orange-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${willBeRemoved ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {subject.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {subject.code} • Grade {subject.grade} • {subject.category}
                          </p>
                        </div>
                        {subject.coefficient && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                            ×{subject.coefficient}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </AnimatedContent>

          {/* Available Subjects */}
          <AnimatedContent delay={200}>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Available Subjects
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {displayAvailable.length} subject(s) available to assign
                </p>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {displayAvailable.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchQuery || filterGrade || filterCategory 
                      ? 'No matching subjects'
                      : 'All subjects are already assigned'}
                  </div>
                ) : (
                  displayAvailable.map((subject) => {
                    const willBeAdded = selectedToAdd.has(subject.id);
                    return (
                      <div
                        key={subject.id}
                        onClick={() => toggleSubjectSelection(subject.id)}
                        className={`flex items-center gap-3 p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          willBeAdded ? 'bg-green-50' : ''
                        }`}
                      >
                        {willBeAdded ? (
                          <CheckSquare className="w-5 h-5 text-green-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${willBeAdded ? 'text-green-700' : 'text-gray-900'}`}>
                            {subject.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {subject.code} • Grade {subject.grade} • {subject.category}
                          </p>
                        </div>
                        {subject.coefficient && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            ×{subject.coefficient}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </AnimatedContent>
        </div>

        {/* Floating Save Button for Mobile */}
        {hasChanges && (
          <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2">
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-6 py-3 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
              Save Changes
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
