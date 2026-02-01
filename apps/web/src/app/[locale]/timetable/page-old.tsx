'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import { getClasses, Class } from '@/lib/api/classes';
import { getTeachers, Teacher } from '@/lib/api/teachers';
import { subjectAPI, Subject } from '@/lib/api/subjects';
import { getAcademicYears, AcademicYear } from '@/lib/api/academic-years';
import {
  timetableAPI,
  periodAPI,
  Period,
  TimetableEntry,
  DayOfWeek,
  DAY_LABELS,
  getCategoryColor,
  ClassTimetable,
  TeacherSchedule,
} from '@/lib/api/timetable';
import {
  Calendar,
  Home,
  ChevronRight,
  Clock,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  Printer,
  Download,
  RefreshCw,
  User,
  GraduationCap,
} from 'lucide-react';

type ViewMode = 'class' | 'teacher';

export default function TimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  
  // Data
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  
  // Selection state
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  
  // Timetable data
  const [timetableData, setTimetableData] = useState<ClassTimetable | TeacherSchedule | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  
  // Modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    periodId: string;
    dayOfWeek: DayOfWeek;
    entry?: TimetableEntry;
  } | null>(null);
  const [entryForm, setEntryForm] = useState({
    subjectId: '',
    teacherId: '',
    room: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Days to display
  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  // Initialize
  useEffect(() => {
    const tokens = TokenManager.getTokens();
    if (!tokens?.accessToken) {
      router.push('/en/login');
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData);
      setSchool({ id: userData.schoolId, name: userData.schoolName || 'School' });
    }

    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [classesRes, teachersRes, subjectsRes, periodsRes, yearsRes] = await Promise.all([
        getClasses({ limit: 100 }),
        getTeachers({ limit: 100 }),
        subjectAPI.getAll(),
        periodAPI.list().catch(() => ({ data: { periods: [] } })),
        getAcademicYears(),
      ]);

      const classesData = classesRes.data.classes || [];
      const teachersData = teachersRes.data.teachers || [];
      const subjectsData = subjectsRes.data.subjects || [];
      const periodsData = periodsRes.data.periods || [];
      const yearsData = yearsRes.data.academicYears || [];

      setClasses(classesData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setPeriods(periodsData);
      setAcademicYears(yearsData);

      // Set default selections
      const currentYear = yearsData.find((y: AcademicYear) => y.isCurrent);
      if (currentYear) {
        setSelectedYearId(currentYear.id);
        
        // Filter classes by current year
        const yearClasses = classesData.filter((c: Class) => c.academicYearId === currentYear.id);
        if (yearClasses.length > 0) {
          setSelectedClassId(yearClasses[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load timetable when selection changes
  useEffect(() => {
    if (viewMode === 'class' && selectedClassId) {
      loadClassTimetable(selectedClassId);
    } else if (viewMode === 'teacher' && selectedTeacherId) {
      loadTeacherSchedule(selectedTeacherId);
    }
  }, [viewMode, selectedClassId, selectedTeacherId, selectedYearId]);

  const loadClassTimetable = async (classId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getClassTimetable(classId, selectedYearId);
      setTimetableData(response.data);
    } catch (err) {
      console.error('Error loading timetable:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const loadTeacherSchedule = async (teacherId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await timetableAPI.getTeacherSchedule(teacherId, selectedYearId);
      setTimetableData(response.data);
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  // Create default periods
  const handleCreateDefaultPeriods = async () => {
    try {
      setSaving(true);
      const response = await periodAPI.createDefaults();
      setPeriods(response.data.periods);
      // Reload timetable
      if (selectedClassId) {
        loadClassTimetable(selectedClassId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open entry modal
  const openEntryModal = (periodId: string, dayOfWeek: DayOfWeek, existingEntry?: TimetableEntry) => {
    setEditingEntry({ periodId, dayOfWeek, entry: existingEntry });
    setEntryForm({
      subjectId: existingEntry?.subjectId || '',
      teacherId: existingEntry?.teacherId || '',
      room: existingEntry?.room || '',
    });
    setShowEntryModal(true);
    setError(null);
  };

  // Save entry
  const handleSaveEntry = async () => {
    if (!editingEntry) return;

    try {
      setSaving(true);
      setError(null);

      if (editingEntry.entry) {
        // Update existing entry
        await timetableAPI.updateEntry(editingEntry.entry.id, {
          subjectId: entryForm.subjectId || undefined,
          teacherId: entryForm.teacherId || undefined,
          room: entryForm.room || undefined,
        });
      } else {
        // Create new entry
        await timetableAPI.createEntry({
          classId: selectedClassId,
          subjectId: entryForm.subjectId || undefined,
          teacherId: entryForm.teacherId || undefined,
          periodId: editingEntry.periodId,
          dayOfWeek: editingEntry.dayOfWeek,
          room: entryForm.room || undefined,
          academicYearId: selectedYearId,
        });
      }

      setShowEntryModal(false);
      // Reload timetable
      loadClassTimetable(selectedClassId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await timetableAPI.deleteEntry(entryId);
      loadClassTimetable(selectedClassId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter classes by selected year
  const filteredClasses = classes.filter((c) => c.academicYearId === selectedYearId);

  // Get the grid data
  const grid = timetableData?.grid || {};

  if (loading) {
    return <PageSkeleton type="table" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64">
        <main className="p-4 lg:p-8">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">Timetable</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <Calendar className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                      Timetable Management
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Create and manage class schedules
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {periods.length === 0 && (
                    <button
                      onClick={handleCreateDefaultPeriods}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4" />
                      )}
                      Setup Default Periods
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Filters */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('class')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      viewMode === 'class'
                        ? 'bg-white shadow-sm text-indigo-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    By Class
                  </button>
                  <button
                    onClick={() => setViewMode('teacher')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      viewMode === 'teacher'
                        ? 'bg-white shadow-sm text-indigo-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    By Teacher
                  </button>
                </div>

                {/* Academic Year */}
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Current)'}
                    </option>
                  ))}
                </select>

                {/* Class/Teacher Selector */}
                {viewMode === 'class' ? (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Class</option>
                    {filteredClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Grade {cls.grade})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </option>
                    ))}
                  </select>
                )}

                {/* Refresh */}
                <button
                  onClick={() => {
                    if (viewMode === 'class' && selectedClassId) {
                      loadClassTimetable(selectedClassId);
                    } else if (viewMode === 'teacher' && selectedTeacherId) {
                      loadTeacherSchedule(selectedTeacherId);
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`h-5 w-5 ${loadingTimetable ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </AnimatedContent>

          {/* Timetable Grid */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {periods.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Periods Configured
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Set up your school's period schedule to start creating timetables.
                  </p>
                  <button
                    onClick={handleCreateDefaultPeriods}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Setup Default Periods
                  </button>
                </div>
              ) : !selectedClassId && viewMode === 'class' ? (
                <div className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a Class
                  </h3>
                  <p className="text-gray-500">
                    Choose a class from the dropdown to view its timetable.
                  </p>
                </div>
              ) : !selectedTeacherId && viewMode === 'teacher' ? (
                <div className="p-12 text-center">
                  <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a Teacher
                  </h3>
                  <p className="text-gray-500">
                    Choose a teacher from the dropdown to view their schedule.
                  </p>
                </div>
              ) : (
                <BlurLoader isLoading={loadingTimetable}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">
                            Time
                          </th>
                          {days.map((day) => (
                            <th
                              key={day}
                              className="px-4 py-3 text-center text-sm font-semibold text-gray-900"
                            >
                              {DAY_LABELS[day].en}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((period) => (
                          <tr
                            key={period.id}
                            className={`border-b border-gray-200 ${
                              period.isBreak ? 'bg-gray-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm">
                                {period.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {period.startTime} - {period.endTime}
                              </div>
                            </td>
                            {days.map((day) => {
                              const entry = grid[day]?.[period.id];
                              return (
                                <td key={`${day}-${period.id}`} className="px-2 py-2">
                                  {period.isBreak ? (
                                    <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
                                      {period.name}
                                    </div>
                                  ) : entry ? (
                                    <div
                                      className={`h-16 p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getCategoryColor(
                                        entry.subject?.category
                                      )}`}
                                      onClick={() =>
                                        viewMode === 'class' &&
                                        openEntryModal(period.id, day, entry)
                                      }
                                    >
                                      <div className="font-medium text-xs truncate">
                                        {entry.subject?.name || 'No Subject'}
                                      </div>
                                      <div className="text-xs opacity-75 truncate">
                                        {viewMode === 'class'
                                          ? entry.teacher
                                            ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
                                            : 'No Teacher'
                                          : entry.class?.name || 'Unknown Class'}
                                      </div>
                                      {entry.room && (
                                        <div className="text-xs opacity-50 truncate">
                                          Room: {entry.room}
                                        </div>
                                      )}
                                    </div>
                                  ) : viewMode === 'class' ? (
                                    <button
                                      onClick={() => openEntryModal(period.id, day)}
                                      className="h-16 w-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                                    >
                                      <Plus className="h-5 w-5" />
                                    </button>
                                  ) : (
                                    <div className="h-16 flex items-center justify-center text-gray-300">
                                      —
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BlurLoader>
              )}
            </div>
          </AnimatedContent>

          {/* Legend */}
          {periods.length > 0 && (
            <AnimatedContent animation="slide-up" delay={150}>
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Subject Categories</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries({
                    Languages: 'bg-blue-100 border-blue-300',
                    Mathematics: 'bg-green-100 border-green-300',
                    Sciences: 'bg-purple-100 border-purple-300',
                    'Social Sciences': 'bg-yellow-100 border-yellow-300',
                    'Arts & Culture': 'bg-pink-100 border-pink-300',
                    'Physical Education': 'bg-orange-100 border-orange-300',
                    Technology: 'bg-cyan-100 border-cyan-300',
                  }).map(([category, colors]) => (
                    <div
                      key={category}
                      className={`px-3 py-1 rounded-lg border text-xs font-medium ${colors}`}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedContent>
          )}
        </main>
      </div>

      {/* Entry Modal */}
      {showEntryModal && editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEntry.entry ? 'Edit Entry' : 'Add Entry'}
              </h3>
              <button
                onClick={() => setShowEntryModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={entryForm.subjectId}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, subjectId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher
                </label>
                <select
                  value={entryForm.teacherId}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, teacherId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room (Optional)
                </label>
                <input
                  type="text"
                  value={entryForm.room}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, room: e.target.value })
                  }
                  placeholder="e.g., Room 101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              {editingEntry.entry && (
                <button
                  onClick={() => {
                    handleDeleteEntry(editingEntry.entry!.id);
                    setShowEntryModal(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEntry}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .lg\\:ml-64 main,
          .lg\\:ml-64 main * {
            visibility: visible;
          }
          .lg\\:ml-64 {
            margin-left: 0 !important;
          }
          .lg\\:ml-64 main {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button,
          select,
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
