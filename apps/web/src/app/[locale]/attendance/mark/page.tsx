'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import {
  attendanceAPI,
  AttendanceStatus,
  AttendanceSession,
  getStatusInfo,
  getAllStatusOptions,
  StudentDailyAttendance,
  BulkAttendanceItem,
} from '@/lib/api/attendance';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { getClasses, Class } from '@/lib/api/classes';
import { getClassStudents, StudentInClass } from '@/lib/api/class-students';
import {
  ClipboardList,
  Home,
  ChevronRight,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  Search,
  CheckSquare,
  X as XIcon,
  AlertTriangle,
} from 'lucide-react';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus | null;
  remarks: string;
  isModified: boolean;
}

interface Statistics {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  permission: number;
}

export default function MarkAttendancePage() {
  const router = useRouter();
  const locale = useLocale();
  const { selectedYear, allYears, setSelectedYear } = useAcademicYear();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Academic year from context
  const selectedAcademicYear = selectedYear?.id || '';
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSession, setSelectedSession] = useState<AttendanceSession>(
    AttendanceSession.MORNING
  );

  // Students and attendance
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(
    new Map()
  );
  const [existingAttendance, setExistingAttendance] = useState<StudentDailyAttendance[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check authentication
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
  }, [router]);

  // Load classes when academic year changes
  useEffect(() => {
    if (user && selectedAcademicYear) {
      loadClasses();
    }
  }, [user, selectedAcademicYear]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await getClasses({
        academicYearId: selectedAcademicYear,
        limit: 100,
      });
      setClasses(response.data.classes);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndAttendance = async () => {
    if (!selectedClass || !selectedDate) return;

    try {
      setLoadingStudents(true);

      // Load students
      const studentsData = await getClassStudents(selectedClass);
      setStudents(studentsData);

      // Load existing attendance
      const attendanceData = await attendanceAPI.getDailyAttendance(selectedClass, selectedDate);
      setExistingAttendance(attendanceData);

      // Initialize attendance records
      const records = new Map<string, AttendanceRecord>();
      studentsData.forEach((student) => {
        const existing = attendanceData.find((a) => a.student.id === student.id);
        const sessionData =
          selectedSession === AttendanceSession.MORNING ? existing?.morning : existing?.afternoon;

        records.set(student.id, {
          studentId: student.id,
          status: sessionData?.status || null,
          remarks: sessionData?.remarks || '',
          isModified: false,
        });
      });

      setAttendanceRecords(records);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to load students and attendance:', error);
      alert('Failed to load attendance data');
    } finally {
      setLoadingStudents(false);
    }
  };

  const updateAttendanceStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      const record = updated.get(studentId);
      if (record) {
        updated.set(studentId, {
          ...record,
          status,
          isModified: true,
        });
      }
      return updated;
    });
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      const record = updated.get(studentId);
      if (record) {
        updated.set(studentId, {
          ...record,
          remarks,
          isModified: true,
        });
      }
      return updated;
    });
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAttendance();
    }, 1500);
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedDate) return;

    try {
      setSaveStatus('saving');
      setSaveError('');

      const attendanceData: BulkAttendanceItem[] = [];
      attendanceRecords.forEach((record) => {
        if (record.status && record.isModified) {
          attendanceData.push({
            studentId: record.studentId,
            status: record.status,
            remarks: record.remarks || undefined,
          });
        }
      });

      if (attendanceData.length === 0) {
        setSaveStatus('idle');
        return;
      }

      await attendanceAPI.bulkMarkAttendance(
        selectedClass,
        selectedDate,
        selectedSession,
        attendanceData
      );

      // Mark all as saved
      setAttendanceRecords((prev) => {
        const updated = new Map(prev);
        updated.forEach((record, key) => {
          updated.set(key, { ...record, isModified: false });
        });
        return updated;
      });

      setSaveStatus('saved');
      setHasUnsavedChanges(false);

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error: any) {
      setSaveStatus('error');
      setSaveError(error.message || 'Failed to save attendance');
      console.error('Failed to save attendance:', error);
    }
  };

  const markAllAs = (status: AttendanceStatus) => {
    const confirmMessage = `Are you sure you want to mark all students as ${status}?`;
    if (!confirm(confirmMessage)) return;

    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      students.forEach((student) => {
        updated.set(student.id, {
          studentId: student.id,
          status,
          remarks: prev.get(student.id)?.remarks || '',
          isModified: true,
        });
      });
      return updated;
    });
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const clearAll = () => {
    if (!confirm('Are you sure you want to clear all attendance records?')) return;

    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      students.forEach((student) => {
        updated.set(student.id, {
          studentId: student.id,
          status: null,
          remarks: '',
          isModified: true,
        });
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Statistics calculation
  const statistics = useMemo((): Statistics => {
    let present = 0,
      absent = 0,
      late = 0,
      excused = 0,
      permission = 0;

    attendanceRecords.forEach((record) => {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          present++;
          break;
        case AttendanceStatus.ABSENT:
          absent++;
          break;
        case AttendanceStatus.LATE:
          late++;
          break;
        case AttendanceStatus.EXCUSED:
          excused++;
          break;
        case AttendanceStatus.PERMISSION:
          permission++;
          break;
      }
    });

    return {
      total: students.length,
      present,
      absent,
      late,
      excused,
      permission,
    };
  }, [attendanceRecords, students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;

    const term = searchTerm.toLowerCase();
    return students.filter(
      (student) =>
        student.firstName.toLowerCase().includes(term) ||
        student.lastName.toLowerCase().includes(term) ||
        student.studentId?.toLowerCase().includes(term) ||
        student.nameKh?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;

      const keyMap: { [key: string]: AttendanceStatus } = {
        '1': AttendanceStatus.PRESENT,
        '2': AttendanceStatus.ABSENT,
        '3': AttendanceStatus.LATE,
        '4': AttendanceStatus.EXCUSED,
        '5': AttendanceStatus.PERMISSION,
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        // This is for future enhancement - could focus on selected row
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/auth/login`);
  };

  // Validate date not in future
  const isDateValid = useMemo(() => {
    const selected = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected <= today;
  }, [selectedDate]);

  const canLoad =
    selectedAcademicYear && selectedClass && selectedDate && isDateValid;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Header */}
        <AnimatedContent animation="fade" delay={0}>
          <div className="mb-6">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Home className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
              <span>School</span>
              <ChevronRight className="w-4 h-4" />
              <span>Attendance</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-orange-600 font-medium">Mark</span>
            </div>

            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl text-white">
                <ClipboardList className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
                <p className="text-gray-600">Record student attendance for the day</p>
              </div>
            </div>
          </div>
        </AnimatedContent>

        {/* Selectors Section */}
        <AnimatedContent animation="slide-up" delay={50}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => {
                    const year = allYears.find(y => y.id === e.target.value);
                    if (year) setSelectedYear(year);
                    setSelectedClass('');
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                >
                  <option value="">Select Year</option>
                  {allYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={!selectedAcademicYear}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-shadow"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Session */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSession(AttendanceSession.MORNING)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    selectedSession === AttendanceSession.MORNING
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Morning
                </button>
                <button
                  onClick={() => setSelectedSession(AttendanceSession.AFTERNOON)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    selectedSession === AttendanceSession.AFTERNOON
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Afternoon
                </button>
              </div>
            </div>

            {/* Load Button */}
            <div className="flex items-end">
              <button
                onClick={loadStudentsAndAttendance}
                disabled={!canLoad || loadingStudents}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loadingStudents ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Load
                  </>
                )}
              </button>
            </div>
          </div>

          {!isDateValid && selectedDate && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Cannot mark attendance for future dates</span>
            </div>
          )}
        </div>
        </AnimatedContent>

        {/* Main Content */}
        <AnimatedContent animation="slide-up" delay={100}>
          <BlurLoader isLoading={loading} showSpinner={false}>
            {students.length > 0 ? (
              <>
                {/* Quick Actions & Search */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                      <button
                        onClick={() => markAllAs(AttendanceStatus.PRESENT)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark All Present
                      </button>
                      <button
                        onClick={() => markAllAs(AttendanceStatus.ABSENT)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Mark All Absent
                      </button>
                      <button
                        onClick={clearAll}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                      >
                        <XIcon className="w-4 h-4" />
                        Clear All
                      </button>
                    </div>

                    {/* Search */}
                    <div className="ml-auto relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-64"
                  />
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Keyboard Shortcuts:</strong> 1 = Present, 2 = Absent, 3 = Late, 4 = Excused, 5 = Permission
              </p>
            </div>

            {/* Student Attendance Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Photo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Student ID</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => {
                      const record = attendanceRecords.get(student.id);
                      const statusOptions = getAllStatusOptions();

                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } hover:bg-orange-50`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                              {student.photoUrl ? (
                                <img
                                  src={student.photoUrl}
                                  alt={student.firstName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </div>
                              {student.nameKh && (
                                <div className="text-sm text-gray-600">{student.nameKh}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {student.studentId || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {statusOptions.map((status) => {
                                const info = getStatusInfo(status);
                                const isActive = record?.status === status;

                                return (
                                  <button
                                    key={status}
                                    onClick={() => updateAttendanceStatus(student.id, status)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                      isActive
                                        ? `${info.bgColor} ${info.color} border-current shadow-sm scale-105`
                                        : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                                    }`}
                                    title={`${info.label} (${info.shortLabel})`}
                                  >
                                    {info.shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={record?.remarks || ''}
                              onChange={(e) => updateRemarks(student.id, e.target.value)}
                              placeholder="Optional remarks..."
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No students found matching your search.
                </div>
              )}
            </div>

            {/* Statistics Panel */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Present</div>
                    <div className="text-2xl font-bold text-green-700">
                      {statistics.present}
                      <span className="text-sm text-gray-500 ml-1">
                        ({statistics.total > 0 ? Math.round((statistics.present / statistics.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Absent</div>
                    <div className="text-2xl font-bold text-red-700">
                      {statistics.absent}
                      <span className="text-sm text-gray-500 ml-1">
                        ({statistics.total > 0 ? Math.round((statistics.absent / statistics.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Late</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {statistics.late}
                      <span className="text-sm text-gray-500 ml-1">
                        ({statistics.total > 0 ? Math.round((statistics.late / statistics.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Excused</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {statistics.excused}
                      <span className="text-sm text-gray-500 ml-1">
                        ({statistics.total > 0 ? Math.round((statistics.excused / statistics.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Permission</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {statistics.permission}
                      <span className="text-sm text-gray-500 ml-1">
                        ({statistics.total > 0 ? Math.round((statistics.permission / statistics.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Class Selected</h3>
                <p className="text-gray-600">
                  Please select an academic year, class, date, and session, then click "Load" to begin marking attendance.
                </p>
              </div>
            )}
          </BlurLoader>
        </AnimatedContent>
      </div>

      {/* Floating Save Indicator */}
      {saveStatus !== 'idle' && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all ${
              saveStatus === 'saving'
                ? 'bg-yellow-500 text-white'
                : saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Saved ✓</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-5 h-5" />
                <div>
                  <div className="font-medium">Error ✗</div>
                  <div className="text-xs">{saveError}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* End main content wrapper */}
    </div>
    </>
  );
}
