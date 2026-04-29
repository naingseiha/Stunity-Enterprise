'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import {
  attendanceAPI,
  AttendanceStatus,
  AttendanceSession,
  getStatusInfo,
  getAllStatusOptions,
  BulkAttendanceItem,
} from '@/lib/api/attendance';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
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
  Loader2,
  AlertCircle,
  Search,
  CheckSquare,
  X as XIcon,
  AlertTriangle,
  Building2,
  CheckCheck,
  RefreshCw,
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
    const autoT = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { selectedYear, allYears, setSelectedYear } = useAcademicYear();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Academic year from context
  const selectedAcademicYear = selectedYear?.id || '';
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
  const [hasLoadedRoster, setHasLoadedRoster] = useState(false);

  // UI state
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
  }, [locale, router]);

  const { classes, isLoading: isLoadingClasses } = useClasses({
    academicYearId: selectedAcademicYear || undefined,
    limit: 100,
  });

  useEffect(() => {
    if (selectedClass && !classes.some((cls) => cls.id === selectedClass)) {
      setSelectedClass('');
      setStudents([]);
      setAttendanceRecords(new Map());
      setHasLoadedRoster(false);
    }
  }, [classes, selectedClass]);

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

  const loadStudentsAndAttendance = async () => {
    if (!selectedClass || !selectedDate) return;

    try {
      setLoadingStudents(true);
      setHasLoadedRoster(true);

      // Load students
      const studentsData = await getClassStudents(selectedClass);
      setStudents(studentsData);

      // Load existing attendance
      const attendanceData = await attendanceAPI.getDailyAttendance(selectedClass, selectedDate);

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

  const handleLogout = async () => {
    await TokenManager.logout();
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

  const selectedClassDetails = classes.find((cls) => cls.id === selectedClass);
  const selectedYearLabel =
    allYears.find((year) => year.id === selectedAcademicYear)?.name || 'No year selected';
  const sessionLabel =
    selectedSession === AttendanceSession.MORNING ? 'Morning' : 'Afternoon';
  const markedCount = Array.from(attendanceRecords.values()).filter((record) => record.status !== null).length;
  const modifiedCount = Array.from(attendanceRecords.values()).filter((record) => record.isModified).length;
  const completionRate = statistics.total > 0 ? Math.round((markedCount / statistics.total) * 100) : 0;
  const saveTone =
    saveStatus === 'saving'
      ? 'Saving'
      : saveStatus === 'saved'
        ? 'Synced'
        : saveStatus === 'error'
          ? 'Attention'
          : 'Idle';

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.08),_transparent_22%),linear-gradient(180deg,#fffaf5_0%,#fff7ed_40%,#f8fafc_100%)]">
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                icon={ClipboardList}
                eyebrow="Attendance Desk"
                title={autoT("auto.web.locale_attendance_mark_page.k_0a64caa3")}
                description="Load a roster, mark the session quickly, and keep autosave quietly in sync."
                backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_58%,#fffbeb_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.16),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-orange-600/80"
                iconShellClassName="bg-gradient-to-br from-orange-600 to-amber-500 text-white"
                breadcrumbs={
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-slate-500">
                      <Home className="h-3.5 w-3.5" />
                      <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_231b79e7" />
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-slate-950"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_fdd8bde3" /></span>
                  </div>
                }
                chips={
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <Building2 className="h-3.5 w-3.5 text-orange-500" />
                      {selectedClassDetails?.name || 'No class selected'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-orange-500" />
                      {selectedDate}
                    </span>
                  </>
                }
                actions={
                  <>
                    <button
                      onClick={loadStudentsAndAttendance}
                      disabled={!canLoad || loadingStudents}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_851a4082" />
                    </button>
                    {students.length > 0 && (
                      <>
                        <button
                          onClick={() => markAllAs(AttendanceStatus.PRESENT)}
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_64724453" />
                        </button>
                        <button
                          onClick={() => markAllAs(AttendanceStatus.ABSENT)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <XCircle className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_cbe210bc" />
                        </button>
                        <button
                          onClick={clearAll}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950"
                        >
                          <XIcon className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_60f22496" />
                        </button>
                      </>
                    )}
                  </>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-orange-200/70 bg-[linear-gradient(145deg,rgba(154,52,18,0.98),rgba(234,88,12,0.92)_52%,rgba(245,158,11,0.9))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(154,52,18,0.5)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-50/80"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_249e7845" /></p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{completionRate}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-orange-50/75">
                        {sessionLabel}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <ClipboardList className="h-7 w-7 text-orange-50" />
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200"
                    style={{ width: `${Math.min(100, completionRate)}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Class', value: selectedClassDetails?.name || 'Not set' },
                    { label: 'Year', value: selectedYearLabel },
                    { label: 'Save', value: saveTone },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                      <p className="truncate text-lg font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-orange-50/80">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white dark:bg-none dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold text-orange-50/90">
                  {markedCount}/{statistics.total || students.length} <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_443528f7" />
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.3rem] border border-orange-100/80 bg-gradient-to-br from-white via-orange-50/80 to-amber-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_69c69ff9" /></p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{selectedClassDetails?.name || '--'}</p>
                <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_2a991ce6" /></p>
              </div>
              <div className="rounded-[1.3rem] border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-blue-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_97270b0f" /></p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{statistics.total}</p>
                <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_43ac98a0" /></p>
              </div>
              <div className="rounded-[1.3rem] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_c87e151f" /></p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{markedCount}</p>
                <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_481cdcbc" /></p>
              </div>
              <div className="rounded-[1.3rem] border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/70 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_6f55968a" /></p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{modifiedCount}</p>
                <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_48e65da6" /></p>
              </div>
            </div>
          </AnimatedContent>

          {!isDateValid && selectedDate ? (
            <div className="mt-5 flex items-start gap-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
              <div className="rounded-xl bg-rose-100 p-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_eea19a43" /></p>
                <p className="mt-1 text-sm font-medium"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_94b99625" /></p>
              </div>
            </div>
          ) : null}

          <AnimatedContent delay={0.06}>
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_ed1bfe04" /></p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_71a0ea62" /></h2>
                  <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_89f1eba7" /></p>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200 dark:border-gray-800 bg-gradient-to-br from-orange-50 to-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_0673188b" /></p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{sessionLabel}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{selectedDate}</p>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto_auto] lg:items-end">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_29bd03fa" /></span>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => {
                      const year = allYears.find((item) => item.id === e.target.value);
                      if (year) setSelectedYear(year);
                      setSelectedClass('');
                      setStudents([]);
                      setAttendanceRecords(new Map());
                      setHasLoadedRoster(false);
                    }}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">{autoT("auto.web.locale_attendance_mark_page.k_d94009eb")}</option>
                    {allYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_69c69ff9" /></span>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setStudents([]);
                      setAttendanceRecords(new Map());
                      setHasLoadedRoster(false);
                    }}
                    disabled={!selectedAcademicYear}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 dark:bg-gray-800/50"
                  >
                    <option value="">{autoT("auto.web.locale_attendance_mark_page.k_efdc038e")}</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_184386b9" /></span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <div className="flex items-center rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-1.5">
                  <button
                    onClick={() => setSelectedSession(AttendanceSession.MORNING)}
                    className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2.5 text-sm font-semibold transition ${
                      selectedSession === AttendanceSession.MORNING
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'text-slate-500 hover:text-slate-900 dark:text-white'
                    }`}
                  >
                    <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_8357fdf2" />
                  </button>
                  <button
                    onClick={() => setSelectedSession(AttendanceSession.AFTERNOON)}
                    className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2.5 text-sm font-semibold transition ${
                      selectedSession === AttendanceSession.AFTERNOON
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'text-slate-500 hover:text-slate-900 dark:text-white'
                    }`}
                  >
                    <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_1dbfd88c" />
                  </button>
                </div>

                <button
                  onClick={loadStudentsAndAttendance}
                  disabled={!canLoad || loadingStudents}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[0.95rem] bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_851a4082" />
                </button>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent delay={0.08}>
            <BlurLoader isLoading={Boolean(selectedAcademicYear) && isLoadingClasses && classes.length === 0} showSpinner={false}>
              {students.length > 0 ? (
                <div className="mt-5 space-y-5">
                  <section className="overflow-hidden rounded-[1.45rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                    <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-[1rem] bg-orange-50 p-3 text-orange-600">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_2a64b897" /></p>
                          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">{selectedClassDetails?.name || 'Class roster'}</h3>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {selectedYearLabel} • {sessionLabel} • {selectedDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_4923d570" />
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_87866a36" />
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => markAllAs(AttendanceStatus.PRESENT)}
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_fef7ef8b" />
                        </button>
                        <button
                          onClick={() => markAllAs(AttendanceStatus.ABSENT)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <XCircle className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_05060596" />
                        </button>
                        <button
                          onClick={() => markAllAs(AttendanceStatus.LATE)}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          <Clock className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_7e965695" />
                        </button>
                        <button
                          onClick={clearAll}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:text-slate-950"
                        >
                          <XIcon className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_60f22496" />
                        </button>
                      </div>

                      <div className="relative w-full lg:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400" />
                        <input
                          type="text"
                          placeholder={autoT("auto.web.locale_attendance_mark_page.k_1af8811f")}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-11 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-10 pr-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1080px]">
                        <thead className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">#</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_114f56fd" /></th>
                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_b3fffdf5" /></th>
                            <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_fe06068c" /></th>
                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_74771efc" /></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.map((student, index) => {
                            const record = attendanceRecords.get(student.id);
                            const statusOptions = getAllStatusOptions();

                            return (
                              <tr key={student.id} className="transition-colors hover:bg-orange-50/40">
                                <td className="px-4 py-4 text-sm font-black text-slate-400">{index + 1}</td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800">
                                      {student.photoUrl ? (
                                        <img src={student.photoUrl} alt={student.firstName} className="h-full w-full object-cover" />
                                      ) : (
                                        <Users className="h-5 w-5 text-slate-300" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-950">{student.firstName} {student.lastName}</div>
                                      {student.englishFirstName || student.englishLastName ? (
                                        <div className="text-[10px] font-semibold text-blue-500/80 dark:text-blue-400/80 uppercase tracking-wider">
                                          {[student.englishLastName, student.englishFirstName].filter(Boolean).join(' ')}
                                        </div>
                                      ) : null}
                                      {student.nameKh && <div className="text-sm font-medium text-slate-500">{student.nameKh}</div>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm font-semibold text-slate-500">{student.studentId || '-'}</td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    {statusOptions.map((status) => {
                                      const info = getStatusInfo(status);
                                      const isActive = record?.status === status;
                                      const activeTone =
                                        status === AttendanceStatus.PRESENT
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
                                          : status === AttendanceStatus.ABSENT
                                            ? 'border-rose-200 bg-rose-50 text-rose-700 shadow-sm'
                                            : status === AttendanceStatus.LATE
                                              ? 'border-amber-200 bg-amber-50 text-amber-700 shadow-sm'
                                              : status === AttendanceStatus.EXCUSED
                                                ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
                                                : 'border-violet-200 bg-violet-50 text-violet-700 shadow-sm';

                                      return (
                                        <button
                                          key={status}
                                          onClick={() => updateAttendanceStatus(student.id, status)}
                                          className={`flex h-9 min-w-9 items-center justify-center rounded-[0.85rem] border px-2 text-[11px] font-black transition ${
                                            isActive
                                              ? activeTone
                                              : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-400 hover:border-slate-300 dark:border-gray-700 hover:text-slate-600'
                                          }`}
                                          title={`${info.label} (${info.shortLabel})`}
                                        >
                                          {info.shortLabel}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <input
                                    type="text"
                                    value={record?.remarks || ''}
                                    onChange={(e) => updateRemarks(student.id, e.target.value)}
                                    placeholder={autoT("auto.web.locale_attendance_mark_page.k_f55a5c11")}
                                    className="h-10 w-full rounded-[0.9rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filteredStudents.length === 0 && (
                      <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-slate-100 dark:bg-gray-800 text-slate-400">
                          <Search className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_c633f566" /></h3>
                        <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_fff1ed15" /></p>
                      </div>
                    )}
                  </section>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    {[
                      { label: 'Total', value: statistics.total, icon: Users, tone: 'bg-sky-50 text-sky-600' },
                      { label: 'Present', value: statistics.present, icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-600' },
                      { label: 'Absent', value: statistics.absent, icon: XCircle, tone: 'bg-rose-50 text-rose-600' },
                      { label: 'Late', value: statistics.late, icon: Clock, tone: 'bg-amber-50 text-amber-600' },
                      { label: 'Excused', value: statistics.excused, icon: FileText, tone: 'bg-blue-50 text-blue-600' },
                      { label: 'Permission', value: statistics.permission, icon: CheckSquare, tone: 'bg-violet-50 text-violet-600' },
                    ].map((card) => {
                      const Icon = card.icon;
                      const percentage = statistics.total > 0 ? Math.round((Number(card.value) / statistics.total) * 100) : 0;

                      return (
                        <div key={card.label} className="rounded-[1.3rem] border border-white/75 bg-white dark:bg-gray-900/90 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/70">
                          <div className="flex items-center gap-4">
                            <div className={`rounded-[1rem] p-3 ${card.tone}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{card.label}</p>
                              <div className="mt-1 flex items-end gap-2">
                                <span className="text-2xl font-black tracking-tight text-slate-950">{card.value}</span>
                                {card.label !== 'Total' && <span className="pb-1 text-xs font-semibold text-slate-400">{percentage}%</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-6 py-16 text-center shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-orange-50 text-orange-600 shadow-inner">
                    {hasLoadedRoster ? <CheckCheck className="h-8 w-8" /> : <Calendar className="h-8 w-8" />}
                  </div>
                  <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">
                    {hasLoadedRoster ? 'No students in this roster' : 'Load a class to begin'}
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">
                    {hasLoadedRoster
                      ? 'This class has no students for the selected academic year, or the current search has filtered the roster out.'
                      : 'Choose the academic year, class, date, and session, then load the roster to start marking attendance.'}
                  </p>
                </section>
              )}
            </BlurLoader>
          </AnimatedContent>
        </main>

        {saveStatus !== 'idle' && (
          <div className="fixed bottom-6 right-6 z-50">
            <div
              className={`flex items-center gap-3 rounded-[1rem] px-5 py-3 shadow-[0_22px_55px_-30px_rgba(15,23,42,0.35)] ${
                saveStatus === 'saving'
                  ? 'border border-amber-200 bg-amber-50 text-amber-900'
                  : saveStatus === 'saved'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_64809d65" /></p>
                    <p className="text-xs font-medium opacity-80"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_a7d8b9fa" /></p>
                  </div>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_ea70a99b" /></p>
                    <p className="text-xs font-medium opacity-80"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_d91462d1" /></p>
                  </div>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold"><AutoI18nText i18nKey="auto.web.locale_attendance_mark_page.k_1423ff84" /></p>
                    <p className="text-xs font-medium opacity-80">{saveError}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
