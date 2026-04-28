'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  GraduationCap,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import { CLASS_SERVICE_URL, STUDENT_SERVICE_URL } from '@/lib/api/config';

interface ManagedStudent {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  khmerName?: string;
  gender: string;
  dateOfBirth?: string;
  photoUrl?: string;
  enrolledAt?: string;
  status?: string;
}

interface ClassData {
  id: string;
  name: string;
  grade: string;
  section?: string | null;
  room?: string | null;
  capacity?: number | null;
  academicYearId: string;
  academicYearName?: string;
}

interface OtherClass {
  id: string;
  name: string;
  grade: string;
  section?: string | null;
  studentCount: number;
}

type GenderFilter = 'all' | 'MALE' | 'FEMALE';
type MessageTone = 'success' | 'warning' | 'error';
type DragSource = 'enrolled' | 'unassigned' | null;

function buildPhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return null;
  if (/^https?:\/\//.test(photoUrl)) return photoUrl;
  return `${STUDENT_SERVICE_URL}${photoUrl}`;
}

function getInitials(student: Pick<ManagedStudent, 'firstName' | 'lastName'>) {
  return `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`.toUpperCase() || 'ST';
}

function normalizeStudent(raw: any): ManagedStudent {
  return {
    id: raw.id,
    studentId: raw.studentId || raw.student?.studentId || raw.id,
    firstName: raw.firstName || raw.firstNameLatin || raw.student?.firstName || raw.student?.firstNameLatin || '',
    lastName: raw.lastName || raw.lastNameLatin || raw.student?.lastName || raw.student?.lastNameLatin || '',
    khmerName:
      raw.khmerName ||
      raw.nameKh ||
      raw.firstNameKhmer ||
      raw.student?.khmerName ||
      raw.student?.nameKh ||
      '',
    gender: raw.gender || raw.student?.gender || 'UNSPECIFIED',
    dateOfBirth: raw.dateOfBirth || raw.student?.dateOfBirth,
    photoUrl: raw.photoUrl || raw.student?.photoUrl,
    enrolledAt: raw.enrolledAt,
    status: raw.status,
  };
}

function normalizeClassData(raw: any): ClassData {
  return {
    id: raw.id,
    name: raw.name || 'Class',
    grade: String(raw.grade || ''),
    section: raw.section || null,
    room: raw.room || null,
    capacity: raw.capacity ?? null,
    academicYearId: raw.academicYearId || raw.academicYear?.id || '',
    academicYearName: raw.academicYear?.name || raw.academicYearName || '',
  };
}

function normalizeOtherClass(raw: any): OtherClass {
  return {
    id: raw.id,
    name: raw.name || 'Class',
    grade: String(raw.grade || ''),
    section: raw.section || null,
    studentCount: raw.studentCount || raw._count?.studentClasses || raw._count?.students || 0,
  };
}

function matchesStudentQuery(student: ManagedStudent, query: string) {
  if (!query.trim()) return true;
  const normalized = query.toLowerCase();
  return (
    student.firstName.toLowerCase().includes(normalized) ||
    student.lastName.toLowerCase().includes(normalized) ||
    student.khmerName?.toLowerCase().includes(normalized) ||
    student.studentId.toLowerCase().includes(normalized)
  );
}

function formatGenderLabel(gender: string) {
  if (gender === 'MALE') return 'Male';
  if (gender === 'FEMALE') return 'Female';
  return 'Unspecified';
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: 'emerald' | 'blue' | 'amber' | 'slate';
}) {
  const toneClasses = {
    emerald: {
      shell:
        'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/80 shadow-emerald-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    blue: {
      shell:
        'border-blue-100/80 bg-gradient-to-br from-white via-blue-50/70 to-cyan-50/80 shadow-blue-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
    amber: {
      shell:
        'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/80 shadow-amber-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    },
    slate: {
      shell:
        'border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 shadow-slate-200/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    },
  };

  const classes = toneClasses[tone];

  return (
    <div className={`relative overflow-hidden rounded-[1.2rem] border p-5 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl ${classes.shell}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/65 blur-2xl dark:bg-white/5" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-[0.95rem] p-3 ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StudentAvatar({ student }: { student: ManagedStudent }) {
  const photo = buildPhotoUrl(student.photoUrl);

  if (photo) {
    return (
      <img
        src={photo}
        alt={`${student.firstName} ${student.lastName}`}
        className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200/70 shadow-sm dark:ring-gray-700/70"
      />
    );
  }

  const gradient = student.gender === 'FEMALE' ? 'from-fuchsia-500 to-rose-500' : 'from-blue-500 to-cyan-500';

  return (
    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-lg`}>
      {getInitials(student)}
    </div>
  );
}

function ManageSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,_#f7fbfa_0%,_#f8fafc_45%,_#f8fafc_100%)] lg:ml-64">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8 rounded-[1.65rem] border border-slate-200/70 bg-white/85 p-7 shadow-sm">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-10 w-64 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-5 w-80 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 flex gap-2">
              <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="xl:col-span-4 rounded-[1.65rem] border border-slate-200/70 bg-white/85 p-7 shadow-sm">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-12 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-3 w-full animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[1.2rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-9 w-16 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, panelIndex) => (
            <div key={panelIndex} className="rounded-[1.35rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
              <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-11 w-full animate-pulse rounded bg-slate-200" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-3 rounded-[1rem] border border-slate-200/70 p-3">
                    <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ClassManagePage() {
  const router = useRouter();
  const params = useParams();
  const classId = params?.id as string;
  const locale = params?.locale as string;

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<ManagedStudent[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<ManagedStudent[]>([]);
  const [otherClasses, setOtherClasses] = useState<OtherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPool, setLoadingPool] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedEnrolled, setSelectedEnrolled] = useState<Set<string>>(new Set());
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());

  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetClass, setTransferTargetClass] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<DragSource>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: MessageTone; text: string } | null>(null);

  const fetchAuthedJson = useCallback(async (url: string, init?: RequestInit) => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      throw new Error('Your session has expired.');
    }

    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...init, headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || payload.error || 'Request failed');
    }

    return payload;
  }, []);

  const refreshSupportData = useCallback(
    async (academicYearId: string, showLoader = true) => {
      if (!academicYearId) return;

      try {
        if (showLoader) setLoadingPool(true);

        const [poolPayload, classesPayload] = await Promise.all([
          fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/unassigned-students/${academicYearId}?limit=200`),
          fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/lightweight?academicYearId=${academicYearId}`),
        ]);

        const poolData = Array.isArray(poolPayload.data?.students)
          ? poolPayload.data.students
          : Array.isArray(poolPayload.data)
            ? poolPayload.data
            : [];
        const classesData = Array.isArray(classesPayload.data) ? classesPayload.data : [];

        setUnassignedStudents(poolData.map(normalizeStudent));
        setOtherClasses(classesData.filter((item: any) => item.id !== classId).map(normalizeOtherClass));
      } catch (error) {
        console.error('Failed to refresh support data', error);
      } finally {
        if (showLoader) setLoadingPool(false);
      }
    },
    [classId, fetchAuthedJson]
  );

  const fetchClassData = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        else setRefreshing(true);

        const [classPayload, studentsPayload] = await Promise.all([
          fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/${classId}`),
          fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/${classId}/students`),
        ]);

        const rawClass = classPayload.data?.class || classPayload.data;
        const normalizedClass = normalizeClassData(rawClass);
        const rawStudents = Array.isArray(studentsPayload.data?.students)
          ? studentsPayload.data.students
          : Array.isArray(studentsPayload.data)
            ? studentsPayload.data
            : [];

        setClassData(normalizedClass);
        setEnrolledStudents(rawStudents.map(normalizeStudent));

        if (normalizedClass.academicYearId) {
          await refreshSupportData(normalizedClass.academicYearId, false);
        }
      } catch (error: any) {
        setActionMessage({ tone: 'error', text: error.message || 'Failed to load class data' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [classId, fetchAuthedJson, refreshSupportData]
  );

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    if (classId) {
      void fetchClassData();
    }
  }, [classId, fetchClassData, locale, router]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  useEffect(() => {
    setSelectedEnrolled((previous) => new Set([...previous].filter((id) => enrolledStudents.some((student) => student.id === id))));
  }, [enrolledStudents]);

  useEffect(() => {
    setSelectedUnassigned((previous) => new Set([...previous].filter((id) => unassignedStudents.some((student) => student.id === id))));
  }, [unassignedStudents]);

  const filteredEnrolledStudents = useMemo(
    () =>
      enrolledStudents.filter((student) => {
        const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
        return matchesGender && matchesStudentQuery(student, enrolledSearch);
      }),
    [enrolledSearch, enrolledStudents, genderFilter]
  );

  const filteredUnassignedStudents = useMemo(
    () =>
      unassignedStudents.filter((student) => {
        const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
        return matchesGender && matchesStudentQuery(student, unassignedSearch);
      }),
    [genderFilter, unassignedSearch, unassignedStudents]
  );

  const selectedEnrolledStudents = useMemo(
    () => enrolledStudents.filter((student) => selectedEnrolled.has(student.id)),
    [enrolledStudents, selectedEnrolled]
  );

  const capacity = classData?.capacity || 0;
  const openSeats = capacity ? Math.max(capacity - enrolledStudents.length, 0) : null;
  const utilizationRate = capacity
    ? Math.min(100, Math.round((enrolledStudents.length / capacity) * 100))
    : Math.min(100, enrolledStudents.length * 8);
  const rosterStatusLabel = capacity
    ? enrolledStudents.length >= capacity
      ? 'Class is full'
      : `${openSeats} seats open`
    : 'No seat cap configured';

  const toggleEnrolledSelection = (studentId: string) => {
    setSelectedEnrolled((previous) => {
      const next = new Set(previous);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleUnassignedSelection = (studentId: string) => {
    setSelectedUnassigned((previous) => {
      const next = new Set(previous);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAllEnrolled = () => {
    if (selectedEnrolled.size === filteredEnrolledStudents.length && filteredEnrolledStudents.length > 0) {
      setSelectedEnrolled(new Set());
      return;
    }
    setSelectedEnrolled(new Set(filteredEnrolledStudents.map((student) => student.id)));
  };

  const toggleSelectAllUnassigned = () => {
    if (selectedUnassigned.size === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0) {
      setSelectedUnassigned(new Set());
      return;
    }
    setSelectedUnassigned(new Set(filteredUnassignedStudents.map((student) => student.id)));
  };

  const handleAssignStudents = useCallback(
    async (studentIds?: string[]) => {
      if (!classData?.academicYearId) return;
      const idsToAssign = studentIds || Array.from(selectedUnassigned);
      if (idsToAssign.length === 0) return;

      const originalEnrolled = [...enrolledStudents];
      const originalUnassigned = [...unassignedStudents];
      const studentsToMove = unassignedStudents.filter((student) => idsToAssign.includes(student.id));

      setActionMessage(null);
      setIsAssigning(true);
      setSelectedUnassigned(new Set());
      setUnassignedStudents((previous) => previous.filter((student) => !idsToAssign.includes(student.id)));
      setEnrolledStudents((previous) => [
        ...previous,
        ...studentsToMove.map((student) => ({
          ...student,
          enrolledAt: new Date().toISOString(),
          status: 'ACTIVE',
        })),
      ]);

      try {
        const payload = await fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/${classId}/students/batch`, {
          method: 'POST',
          body: JSON.stringify({
            studentIds: idsToAssign,
            academicYearId: classData.academicYearId,
          }),
        });

        setActionMessage({
          tone: 'success',
          text: `${payload.data?.assigned || idsToAssign.length} student${idsToAssign.length > 1 ? 's were' : ' was'} assigned to ${classData.name}.`,
        });
        void refreshSupportData(classData.academicYearId, false);
      } catch (error: any) {
        setUnassignedStudents(originalUnassigned);
        setEnrolledStudents(originalEnrolled);
        setActionMessage({ tone: 'error', text: error.message || 'Failed to assign students' });
      } finally {
        setIsAssigning(false);
      }
    },
    [classData, classId, enrolledStudents, fetchAuthedJson, refreshSupportData, selectedUnassigned, unassignedStudents]
  );

  const handleRemoveStudents = useCallback(
    async (studentIds?: string[]) => {
      const idsToRemove = studentIds || Array.from(selectedEnrolled);
      if (idsToRemove.length === 0) return;
      if (!studentIds) {
        const confirmed = window.confirm(`Remove ${idsToRemove.length} student${idsToRemove.length > 1 ? 's' : ''} from this class?`);
        if (!confirmed) return;
      }

      const originalEnrolled = [...enrolledStudents];
      const originalUnassigned = [...unassignedStudents];
      const studentsToMove = enrolledStudents.filter((student) => idsToRemove.includes(student.id));

      setActionMessage(null);
      setIsRemoving(true);
      setSelectedEnrolled(new Set());
      setEnrolledStudents((previous) => previous.filter((student) => !idsToRemove.includes(student.id)));
      setUnassignedStudents((previous) => [...studentsToMove, ...previous]);

      try {
        const payload = await fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/${classId}/students/batch-remove`, {
          method: 'POST',
          body: JSON.stringify({ studentIds: idsToRemove }),
        });

        setActionMessage({
          tone: 'success',
          text: `${payload.count || idsToRemove.length} student${idsToRemove.length > 1 ? 's were' : ' was'} removed from ${classData?.name || 'the class'}.`,
        });
        if (classData?.academicYearId) {
          void refreshSupportData(classData.academicYearId, false);
        }
      } catch (error: any) {
        setEnrolledStudents(originalEnrolled);
        setUnassignedStudents(originalUnassigned);
        setActionMessage({ tone: 'error', text: error.message || 'Failed to remove students' });
      } finally {
        setIsRemoving(false);
      }
    },
    [classData, classId, enrolledStudents, fetchAuthedJson, refreshSupportData, selectedEnrolled, unassignedStudents]
  );

  const handleTransferStudents = useCallback(async () => {
    if (!classData?.academicYearId || selectedEnrolled.size === 0 || !transferTargetClass) return;

    const studentIds = Array.from(selectedEnrolled);
    setIsTransferring(true);
    setActionMessage(null);

    try {
      await fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/${classId}/students/batch-remove`, {
        method: 'POST',
        body: JSON.stringify({ studentIds }),
      });

      await fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/${transferTargetClass}/students/batch`, {
        method: 'POST',
        body: JSON.stringify({
          studentIds,
          academicYearId: classData.academicYearId,
        }),
      });

      const targetLabel = otherClasses.find((item) => item.id === transferTargetClass)?.name || 'the target class';
      setActionMessage({
        tone: 'success',
        text: `${studentIds.length} student${studentIds.length > 1 ? 's were' : ' was'} transferred to ${targetLabel}.`,
      });
      setSelectedEnrolled(new Set());
      setShowTransferModal(false);
      setTransferTargetClass('');
      await fetchClassData(false);
    } catch (error: any) {
      try {
        await fetchAuthedJson(`${CLASS_SERVICE_URL}/classes/${classId}/students/batch`, {
          method: 'POST',
          body: JSON.stringify({
            studentIds,
            academicYearId: classData.academicYearId,
          }),
        });
        setActionMessage({ tone: 'error', text: `${error.message || 'Transfer failed'}. The original roster was restored.` });
      } catch {
        setActionMessage({ tone: 'error', text: `${error.message || 'Transfer failed'}. Please refresh and verify the roster.` });
      }
    } finally {
      setIsTransferring(false);
    }
  }, [classData, classId, fetchAuthedJson, fetchClassData, otherClasses, selectedEnrolled, transferTargetClass]);

  const handleDragStart = (studentId: string, source: DragSource) => {
    setDraggedStudentId(studentId);
    setDragSource(source);
  };

  const handleDragEnd = () => {
    setDraggedStudentId(null);
    setDragSource(null);
  };

  const handleDropOnEnrolled = async (event: React.DragEvent) => {
    event.preventDefault();
    if (draggedStudentId && dragSource === 'unassigned') {
      const ids = new Set(selectedUnassigned);
      ids.add(draggedStudentId);
      await handleAssignStudents(Array.from(ids));
    }
    handleDragEnd();
  };

  const handleDropOnUnassigned = async (event: React.DragEvent) => {
    event.preventDefault();
    if (draggedStudentId && dragSource === 'enrolled') {
      const ids = new Set(selectedEnrolled);
      ids.add(draggedStudentId);
      await handleRemoveStudents(Array.from(ids));
    }
    handleDragEnd();
  };

  const handleExportRoster = () => {
    if (!classData) return;
    const rows = [
      ['Student ID', 'First Name', 'Last Name', 'Khmer Name', 'Gender', 'Status', 'Enrolled At'],
      ...enrolledStudents.map((student) => [
        student.studentId,
        student.firstName,
        student.lastName,
        student.khmerName || '',
        formatGenderLabel(student.gender),
        student.status || 'ACTIVE',
        student.enrolledAt || '',
      ]),
    ];
    downloadCsv(`${classData.name.replace(/\s+/g, '-').toLowerCase()}-roster.csv`, rows);
  };

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} />
        <ManageSkeleton />
      </>
    );
  }

  if (!classData) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,_#f7fbfa_0%,_#f8fafc_45%,_#f8fafc_100%)] lg:ml-64">
          <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-8 text-center shadow-[0_28px_80px_-42px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Class not found</h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-gray-400">
                This class may have been removed, moved to another school context, or the link may no longer be valid.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/classes`)}
                  className="inline-flex items-center justify-center rounded-[0.95rem] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  View classes
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go back
                </button>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,_#f7fbfa_0%,_#f8fafc_45%,_#f8fafc_100%)] text-slate-900 transition-colors duration-500 dark:bg-gray-950 dark:text-white lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-12">
              <div className="relative overflow-hidden rounded-[1.65rem] border border-white/70 bg-white/85 p-6 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] dark:ring-gray-800/70 xl:col-span-8 sm:p-7">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-emerald-100/50 to-transparent blur-3xl dark:from-emerald-500/10" />
                <div className="relative z-10">
                  <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                    <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-gray-300">
                      <Home className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <Link href={`/${locale}/classes`} className="transition-colors hover:text-slate-700 dark:hover:text-gray-300">
                      Classes
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-900 dark:text-white">Manage</span>
                  </nav>
                  <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        <Sparkles className="h-3.5 w-3.5" />
                        Class Operations
                      </div>
                      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">{classData.name}</h1>
                      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-gray-400 sm:text-[15px]">
                        Assign, remove, and transfer students while keeping this roster balanced for {classData.academicYearName || 'the current year'}.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => void fetchClassData(false)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={handleExportRoster}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <Users className="h-4 w-4" />
                        Export Roster
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/${locale}/classes/${classId}/roster`)}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                      >
                        <Users className="h-4 w-4" />
                        Open Roster
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                      Grade {classData.grade}{classData.section ? ` · Section ${classData.section}` : ''}
                    </span>
                    {classData.academicYearName ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                        {classData.academicYearName}
                      </span>
                    ) : null}
                    {classData.room ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                        Room {classData.room}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[1.65rem] border border-emerald-300/85 bg-gradient-to-br from-white via-emerald-200/80 to-teal-200/90 p-6 text-slate-900 shadow-[0_34px_90px_-38px_rgba(16,185,129,0.28)] ring-1 ring-emerald-200/80 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/40 blur-3xl dark:bg-emerald-500/20" />
                <div className="pointer-events-none absolute -bottom-12 left-0 h-40 w-40 rounded-full bg-teal-400/30 blur-3xl dark:bg-cyan-500/20" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Roster Balance</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{utilizationRate}%</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">filled</span>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/75 dark:border-white/10 dark:bg-white/10 dark:ring-white/10">
                      <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-emerald-200/75 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 transition-all duration-700"
                      style={{ width: `${Math.max(utilizationRate, enrolledStudents.length > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{enrolledStudents.length}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Enrolled</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{openSeats ?? '∞'}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Open</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{unassignedStudents.length}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Pool</p>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center rounded-full border border-emerald-200/85 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {rosterStatusLabel}
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Enrolled" value={enrolledStudents.length} helper="Students currently placed in this class." icon={Users} tone="emerald" />
              <MetricCard label="Placement Pool" value={unassignedStudents.length} helper="Students available to assign in this year." icon={UserPlus} tone="blue" />
              <MetricCard label="Capacity" value={classData.capacity || 'Open'} helper="Configured seat target for this class." icon={GraduationCap} tone="amber" />
              <MetricCard label="Other Classes" value={otherClasses.length} helper="Alternative transfer destinations this year." icon={MapPin} tone="slate" />
            </section>
          </AnimatedContent>

          {actionMessage ? (
            <AnimatedContent animation="slide-up" delay={60}>
              <div
                className={`mt-5 flex items-start justify-between gap-4 rounded-[1rem] border px-4 py-3 text-sm font-medium ${
                  actionMessage.tone === 'success'
                    ? 'border-emerald-100 bg-emerald-50/85 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : actionMessage.tone === 'warning'
                      ? 'border-amber-100 bg-amber-50/85 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'border-rose-100 bg-rose-50/85 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {actionMessage.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                  <span>{actionMessage.text}</span>
                </div>
                <button type="button" onClick={() => setActionMessage(null)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent animation="slide-up" delay={80}>
            <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/88 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/82 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] dark:ring-gray-800/70">
              <div className="border-b border-slate-200/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Operations</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Student Placement Workspace</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Use the roster panel for current placements and the pool panel for available students. Drag between panels or use bulk actions.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setGenderFilter('all')}
                      className={`rounded-[0.8rem] px-3.5 py-2 text-xs font-semibold transition-all ${
                        genderFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-900 dark:shadow-none'
                          : 'border border-slate-200/70 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('MALE')}
                      className={`rounded-[0.8rem] px-3.5 py-2 text-xs font-semibold transition-all ${
                        genderFilter === 'MALE'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 hover:-translate-y-0.5 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('FEMALE')}
                      className={`rounded-[0.8rem] px-3.5 py-2 text-xs font-semibold transition-all ${
                        genderFilter === 'FEMALE'
                          ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20'
                          : 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100 hover:-translate-y-0.5 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {(selectedEnrolled.size > 0 || selectedUnassigned.size > 0) ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-[1rem] border border-slate-200/70 bg-slate-50/85 p-4 dark:border-gray-800/70 dark:bg-gray-950/70 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedUnassigned.size > 0 ? `${selectedUnassigned.size} ready to assign` : `${selectedEnrolled.size} ready to manage`}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                        Assign from the pool, remove from the roster, or transfer selected students to another class.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {selectedUnassigned.size > 0 ? (
                        <button
                          type="button"
                          onClick={() => void handleAssignStudents()}
                          disabled={isAssigning}
                          className="inline-flex items-center gap-2 rounded-[0.9rem] bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          Assign Selected
                        </button>
                      ) : null}
                      {selectedEnrolled.size > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowTransferModal(true)}
                            className="inline-flex items-center gap-2 rounded-[0.9rem] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                            Transfer
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveStudents()}
                            disabled={isRemoving}
                            className="inline-flex items-center gap-2 rounded-[0.9rem] bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                            Remove Selected
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-2 sm:p-6">
                <section
                  className={`overflow-hidden rounded-[1.25rem] border shadow-lg transition-all ${dragSource === 'unassigned' ? 'border-emerald-200 bg-emerald-50/40 ring-2 ring-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:ring-emerald-500/10' : 'border-slate-200/70 bg-white dark:border-gray-800/70 dark:bg-gray-900/70'}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => void handleDropOnEnrolled(event)}
                >
                  <div className="border-b border-slate-200/70 bg-slate-50/80 px-5 py-4 dark:border-gray-800/70 dark:bg-gray-950/60">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Current Roster</p>
                        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">Placed Students</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">{filteredEnrolledStudents.length} visible of {enrolledStudents.length} enrolled</p>
                      </div>
                      <button
                        type="button"
                        onClick={toggleSelectAllEnrolled}
                        className="inline-flex items-center gap-2 rounded-[0.8rem] border border-slate-200/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        {selectedEnrolled.size === filteredEnrolledStudents.length && filteredEnrolledStudents.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        {selectedEnrolled.size === filteredEnrolledStudents.length && filteredEnrolledStudents.length > 0 ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                        <input
                          type="text"
                          value={enrolledSearch}
                          onChange={(event) => setEnrolledSearch(event.target.value)}
                          placeholder="Search by student, Khmer name, or ID"
                          className="w-full rounded-[0.95rem] border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                        />
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        {selectedEnrolled.size} selected
                      </span>
                    </div>
                  </div>
                  <div className="max-h-[620px] overflow-y-auto">
                    {filteredEnrolledStudents.length === 0 ? (
                      <div className="px-6 py-14 text-center">
                        <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-gray-700" />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No roster results</p>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                          {enrolledSearch ? 'Try a different search term.' : 'This class does not have any enrolled students yet.'}
                        </p>
                      </div>
                    ) : (
                      filteredEnrolledStudents.map((student) => {
                        const selected = selectedEnrolled.has(student.id);
                        return (
                          <div
                            key={student.id}
                            draggable
                            onDragStart={() => handleDragStart(student.id, 'enrolled')}
                            onDragEnd={handleDragEnd}
                            onClick={() => toggleEnrolledSelection(student.id)}
                            className={`flex cursor-pointer items-center gap-3 border-b border-slate-200/70 px-5 py-4 transition-all last:border-b-0 dark:border-gray-800/70 ${selected ? 'bg-emerald-50/70 dark:bg-emerald-500/5' : 'hover:bg-slate-50/70 dark:hover:bg-gray-950/40'} ${draggedStudentId === student.id ? 'opacity-50' : ''}`}
                          >
                            <div className="flex-shrink-0 text-slate-400 dark:text-gray-500">
                              {selected ? <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-300" /> : <Square className="h-5 w-5" />}
                            </div>
                            <StudentAvatar student={student} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</p>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.gender === 'FEMALE' ? 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20'}`}>
                                  {formatGenderLabel(student.gender)}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-gray-400">
                                {student.khmerName || 'No Khmer name'} · {student.studentId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRemoveStudents([student.id]);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-rose-100 bg-rose-50 text-rose-600 transition-all hover:border-rose-200 hover:text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section
                  className={`overflow-hidden rounded-[1.25rem] border shadow-lg transition-all ${dragSource === 'enrolled' ? 'border-blue-200 bg-blue-50/40 ring-2 ring-blue-100 dark:border-blue-500/20 dark:bg-blue-500/5 dark:ring-blue-500/10' : 'border-slate-200/70 bg-white dark:border-gray-800/70 dark:bg-gray-900/70'}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => void handleDropOnUnassigned(event)}
                >
                  <div className="border-b border-slate-200/70 bg-slate-50/80 px-5 py-4 dark:border-gray-800/70 dark:bg-gray-950/60">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Placement Pool</p>
                        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">Available Students</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">{filteredUnassignedStudents.length} visible of {unassignedStudents.length} available</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => classData.academicYearId && void refreshSupportData(classData.academicYearId)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-slate-200/70 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
                        >
                          <RefreshCw className={`h-4 w-4 ${loadingPool ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={toggleSelectAllUnassigned}
                          className="inline-flex items-center gap-2 rounded-[0.8rem] border border-slate-200/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                        >
                          {selectedUnassigned.size === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          {selectedUnassigned.size === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0 ? 'Clear all' : 'Select all'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                        <input
                          type="text"
                          value={unassignedSearch}
                          onChange={(event) => setUnassignedSearch(event.target.value)}
                          placeholder="Search by student, Khmer name, or ID"
                          className="w-full rounded-[0.95rem] border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                        />
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                        {selectedUnassigned.size} selected
                      </span>
                    </div>
                  </div>
                  <div className="max-h-[620px] overflow-y-auto">
                    {loadingPool ? (
                      <div className="px-6 py-14 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">Refreshing available students…</p>
                      </div>
                    ) : filteredUnassignedStudents.length === 0 ? (
                      <div className="px-6 py-14 text-center">
                        <UserRound className="mx-auto h-12 w-12 text-slate-300 dark:text-gray-700" />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No available students</p>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                          {unassignedSearch ? 'Try a different search term.' : 'Everyone in this academic year is already placed in a class.'}
                        </p>
                      </div>
                    ) : (
                      filteredUnassignedStudents.map((student) => {
                        const selected = selectedUnassigned.has(student.id);
                        return (
                          <div
                            key={student.id}
                            draggable
                            onDragStart={() => handleDragStart(student.id, 'unassigned')}
                            onDragEnd={handleDragEnd}
                            onClick={() => toggleUnassignedSelection(student.id)}
                            className={`flex cursor-pointer items-center gap-3 border-b border-slate-200/70 px-5 py-4 transition-all last:border-b-0 dark:border-gray-800/70 ${selected ? 'bg-blue-50/70 dark:bg-blue-500/5' : 'hover:bg-slate-50/70 dark:hover:bg-gray-950/40'} ${draggedStudentId === student.id ? 'opacity-50' : ''}`}
                          >
                            <div className="flex-shrink-0 text-slate-400 dark:text-gray-500">
                              {selected ? <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-300" /> : <Square className="h-5 w-5" />}
                            </div>
                            <StudentAvatar student={student} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</p>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.gender === 'FEMALE' ? 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20'}`}>
                                  {formatGenderLabel(student.gender)}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-gray-400">
                                {student.khmerName || 'No Khmer name'} · {student.studentId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleAssignStudents([student.id]);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-emerald-100 bg-emerald-50 text-emerald-600 transition-all hover:border-emerald-200 hover:text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {showTransferModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/95 shadow-[0_35px_90px_-35px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 animate-in slide-in-from-bottom-4 duration-200 dark:border-gray-800/70 dark:bg-gray-900/95 dark:ring-gray-800/70">
            <div className="border-b border-slate-200/70 px-6 py-5 dark:border-gray-800/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                    <Sparkles className="h-3.5 w-3.5" />
                    Transfer Students
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Move to another class</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Transfer {selectedEnrolledStudents.length} selected student{selectedEnrolledStudents.length === 1 ? '' : 's'} into another class in the same academic year.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetClass('');
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200/70 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1rem] border border-slate-200/70 bg-slate-50/85 p-4 dark:border-gray-800/70 dark:bg-gray-950/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Current Class</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{classData.name}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200/70 bg-slate-50/85 p-4 dark:border-gray-800/70 dark:bg-gray-950/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Selected</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{selectedEnrolledStudents.length} students</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200/70 bg-slate-50/85 p-4 dark:border-gray-800/70 dark:bg-gray-950/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Academic Year</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{classData.academicYearName || 'Current year'}</p>
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300">Destination class</span>
                <select
                  value={transferTargetClass}
                  onChange={(event) => setTransferTargetClass(event.target.value)}
                  className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Select class</option>
                  {otherClasses.map((otherClass) => (
                    <option key={otherClass.id} value={otherClass.id}>
                      {otherClass.name} · Grade {otherClass.grade}{otherClass.section ? ` · ${otherClass.section}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-[1rem] border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                Students remain in only one class per academic year, so this transfer will remove them from the current roster first and then place them into the new destination.
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 px-6 py-4 dark:border-gray-800/70 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferTargetClass('');
                }}
                className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleTransferStudents()}
                disabled={isTransferring || !transferTargetClass}
                className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTransferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                Transfer Students
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
