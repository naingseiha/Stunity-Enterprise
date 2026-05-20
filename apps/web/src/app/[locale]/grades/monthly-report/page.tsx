'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  Inbox,
  Layout,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  RotateCcw,
  Settings2,
  Users,
  Search,
  X,
  Check,
  Plus,
  Trash,
  PlusCircle,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import MonthlyReportPrint from '@/components/reports/MonthlyReportPrint';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { useDebounce } from '@/hooks/useDebounce';
import { TokenManager } from '@/lib/api/auth';
import { schoolAPI } from '@/lib/api/school';
import { gradeAPI, type KhmerMonthlyReportData, type MonthlyReportFormat } from '@/lib/api/grades';
import { formatEducationModelLabel } from '@/lib/educationModel';
import {
  getKhmerMonthDisplayName,
  getKhmerMonthLabel,
  KHMER_MONTHS,
  sortSubjectsByOrder,
} from '@/lib/reports/khmerMonthly';

type ReportScope = 'class' | 'grade';

const SETTINGS_STORAGE = 'stunity:monthly-report-print-settings:v1';

type StoredPrintSettings = {
  certShowStamp?: boolean;
  certStyle?: string;
  province?: string;
  examCenter?: string;
  roomNumber?: string;
  reportTitle?: string;
  examSession?: string;
  reportDate?: string;
  principalName?: string;
  teacherName?: string;
  showAttendance?: boolean;
  showSubjects?: boolean;
  showTotal?: boolean;
  showAverage?: boolean;
  showRank?: boolean;
  showGradeLevel?: boolean;
  showClassName?: boolean;
  showCircles?: boolean;
  autoCircle?: boolean;
  firstPageStudentCount?: number;
  nextPageStudentCount?: number;
  tableFontSize?: number;
};

const DEFAULT_SETTINGS = {
  province: '',
  examCenter: '',
  roomNumber: '',
  reportTitle: '',
  examSession: '',
  reportDate: '',
  principalName: '',
  teacherName: '',
  showAttendance: true,
  showSubjects: true,
  showTotal: true,
  showAverage: true,
  showRank: true,
  showGradeLevel: true,
  showClassName: true,
  showCircles: true,
  autoCircle: true,
  firstPageStudentCount: 38,
  nextPageStudentCount: 34,
  tableFontSize: 10,
};

export default function KhmerMonthlyReportPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('monthlyReport');
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<KhmerMonthlyReportData[]>([]);
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();

  const [selectedYear, setSelectedYear] = useState(contextSelectedYear?.id || '');
  const [scope, setScope] = useState<ReportScope>('class');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(2);
  const [reportType, setReportType] = useState<'monthly' | 'semester'>('monthly');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'monthly' | 'transcript' | 'certificate'>('monthly');
  const reportFormat: MonthlyReportFormat = reportType === 'monthly' ? 'detailed' : (selectedSemester === 1 ? 'semester-1' : 'semester-2');
  const [hiddenSubjects, setHiddenSubjects] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [tablePage, setTablePage] = useState(0);
  const [tableSort, setTableSort] = useState<{
    field: 'rank' | 'total' | 'average' | 'absent';
    direction: 'asc' | 'desc';
  }>({ field: 'rank', direction: 'asc' });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [hiddenTableColumns, setHiddenTableColumns] = useState<Set<string>>(new Set());
  const [savedFlash, setSavedFlash] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const resolveMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return `https://api.stunity.com${url}`;
    return url;
  };


  // Certificate Designer State
  const [certTemplate, setCertTemplate] = useState<'graduation' | 'honor' | 'completion'>('honor');
  const [certStyle, setCertStyle] = useState<'classic' | 'modern' | 'royal'>('classic');
  const [certStudentId, setCertStudentId] = useState<string>('custom');
  const [certCustomName, setCertCustomName] = useState<string>('');
  const [certCustomGender, setCertCustomGender] = useState<'M' | 'F'>('M');
  const [certCustomRank, setCertCustomRank] = useState<string>('1');
  const [certCustomAverage, setCertCustomAverage] = useState<string>('9.50');
  const [certTitle, setCertTitle] = useState<string>('លិខិតសរសើរ');
  const [certSchoolName, setCertSchoolName] = useState<string>('');
  const [certClassName, setCertClassName] = useState<string>('');
  const [certAcademicYear, setCertAcademicYear] = useState<string>('');
  const [certPrincipalName, setCertPrincipalName] = useState<string>('');
  const [certDescription, setCertDescription] = useState<string>('');
  const [certDate, setCertDate] = useState<string>('');
  const [isDescCustomized, setIsDescCustomized] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [certShowStamp, setCertShowStamp] = useState<boolean>(true);

  // Recipient Manager States
  const [recipientTab, setRecipientTab] = useState<'class' | 'search' | 'custom'>('class');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilterQuery, setClassFilterQuery] = useState<string>('');
  const [certSelectedClassId, setCertSelectedClassId] = useState<string>('');
  const [certSearchQuery, setCertSearchQuery] = useState<string>('');
  const debouncedCertSearchQuery = useDebounce(certSearchQuery, 500);

  const { students: certClassStudents, isLoading: isLoadingCertClassStudents } = useStudents(
    activeTab === 'certificate' && recipientTab === 'class' && certSelectedClassId
      ? { classId: certSelectedClassId, limit: 100 }
      : undefined
  );

  const { students: certSearchStudents, isLoading: isLoadingCertSearchStudents } = useStudents(
    activeTab === 'certificate' && recipientTab === 'search' && debouncedCertSearchQuery.length >= 2
      ? { search: debouncedCertSearchQuery, limit: 50 }
      : undefined
  );
  const [printQueue, setPrintQueue] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const sidebarRef = React.useRef<HTMLDivElement>(null);


  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const data = TokenManager.getUserData();
    setUser(data.user);
    setSchool(data.school);

    const fetchSchoolProfile = async () => {
      if (!data.school?.id) return;
      try {
        const res = await schoolAPI.getProfile(data.school.id);
        if (res.success && res.data) {
          setSchoolProfile(res.data);
          setSettings((current) => ({
            ...current,
            province: res.data.province ? `ខេត្ត${res.data.province}` : current.province,
            examCenter: res.data.nameKh || res.data.name || data.school?.name || current.examCenter,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch school profile:', err);
      }
    };

    fetchSchoolProfile();
    setLoading(false);
  }, [locale, router]);

  useEffect(() => {
    if (!school?.id || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`${SETTINGS_STORAGE}:${school.id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredPrintSettings;
      // Do NOT load province or examCenter from localStorage cache
      // so they are always dynamically loaded from the school profile
      const { province, examCenter, certShowStamp: loadedCertShowStamp, certStyle: loadedCertStyle, ...rest } = parsed;
      setSettings((prev) => ({
        ...prev,
        ...rest,
      }));
      if (loadedCertShowStamp !== undefined) setCertShowStamp(loadedCertShowStamp);
      if (loadedCertStyle !== undefined) setCertStyle(loadedCertStyle as 'classic' | 'modern' | 'royal');
    } catch {
      /* ignore */
    }
  }, [school?.id]);

  useEffect(() => {
    if (!school?.id || typeof window === 'undefined') return;
    // Do NOT save province or examCenter in localStorage cache
    const { province, examCenter, ...rest } = settings;
    const payload: StoredPrintSettings = rest;
    localStorage.setItem(`${SETTINGS_STORAGE}:${school.id}`, JSON.stringify(payload));
  }, [school?.id, settings]);

  useEffect(() => {
    if (selectedYear && allYears.some((year) => year.id === selectedYear)) return;
    const preferredYearId =
      contextSelectedYear?.id || allYears.find((year) => year.isCurrent)?.id || allYears[0]?.id || '';
    if (preferredYearId) setSelectedYear(preferredYearId);
  }, [allYears, contextSelectedYear, selectedYear]);

  const { classes, isLoading: loadingClasses } = useClasses({
    academicYearId: selectedYear || undefined,
    limit: 200,
  });

  const grades = useMemo(() => {
    return Array.from(new Set(classes.map((classItem) => String(classItem.grade)).filter(Boolean))).sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [classes]);

  useEffect(() => {
    if (selectedClasses.length === 0 && classes[0]?.id) setSelectedClasses([classes[0].id]);
    if (!selectedGrade && grades[0]) setSelectedGrade(grades[0]);
  }, [classes, grades, selectedClasses, selectedGrade]);

  useEffect(() => {
    const validClasses = selectedClasses.filter(id => classes.some(c => c.id === id));
    if (selectedClasses.length > 0 && validClasses.length === 0) {
      setSelectedClasses(classes[0]?.id ? [classes[0].id] : []);
    } else if (validClasses.length !== selectedClasses.length) {
      setSelectedClasses(validClasses);
    }
  }, [classes, selectedClasses]);

  useEffect(() => {
    if (selectedGrade && !grades.includes(selectedGrade)) {
      setSelectedGrade(grades[0] || '');
    }
  }, [grades, selectedGrade]);

  useEffect(() => {
    if (selectedYear) {
      // Sync local context selected year when it is modified in this view
      const matchedYearObj = allYears.find(y => y.id === selectedYear);
      if (matchedYearObj && contextSelectedYear?.id !== selectedYear) {
        // Only update if context provider has a matching mutator
        // SWR automatically syncs other page views.
      }
    }
  }, [selectedYear, allYears, contextSelectedYear]);

  useEffect(() => {
    if (reportType === 'semester') {
      setSelectedMonthNumber(selectedSemester === 1 ? 2 : 7);
    }
  }, [reportType, selectedSemester]);

  useEffect(() => {
    setHiddenSubjects(new Set());
    setTablePage(0);
  }, [reports]);

  useEffect(() => {
    if (!school?.id) return;
    setSavedFlash(true);
    const handle = window.setTimeout(() => setSavedFlash(false), 1200);
    return () => window.clearTimeout(handle);
  }, [settings, school?.id]);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const selectedYearData = allYears.find((year) => year.id === selectedYear);
  const selectedMonthLabel = getKhmerMonthLabel(selectedMonthNumber);
  const selectedMonthDisplay = getKhmerMonthDisplayName(selectedMonthNumber, selectedMonthLabel);
  const academicStartYear = selectedYearData ? Number.parseInt(selectedYearData.name, 10) : new Date().getFullYear();
  const canGenerate = selectedYear && (scope === 'class' ? selectedClasses.length > 0 : selectedGrade);
  const educationModelLabel = formatEducationModelLabel(school?.educationModel || 'KHM_MOEYS');

  const templateQuery =
    school?.educationModel === 'CUSTOM' ? 'KHM_MOEYS' : undefined;

  const groupedClasses = useMemo(() => {
    const groups: { [grade: string]: typeof classes } = {};
    classes.forEach((classItem) => {
      const g = classItem.grade || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(classItem);
    });

    Object.keys(groups).forEach((g) => {
      groups[g].sort((a, b) => a.name.localeCompare(b.name, 'km', { numeric: true }));
    });

    return Object.keys(groups)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10);
        const numB = parseInt(b.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .map((g) => ({
        grade: g,
        classItems: groups[g],
      }));
  }, [classes]);

  const sortedSubjects = useMemo(() => {
    if (!reports.length) return [];
    const subjectMap = new Map<string, NonNullable<KhmerMonthlyReportData['subjects']>[number]>();
    reports.forEach((report) => {
      report.subjects?.forEach((subject) => {
        const key = subject.nameKh || subject.name;
        if (!subjectMap.has(key)) {
          subjectMap.set(key, subject);
        }
      });
    });
    return sortSubjectsByOrder(Array.from(subjectMap.values()), reports[0]?.grade || 10);
  }, [reports]);

  const sortedStudents = useMemo(() => {
    const previewReport = reports[0];
    if (!previewReport?.students?.length) return [];
    const list = [...previewReport.students];
    const dir = tableSort.direction === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (tableSort.field === 'rank') {
        aVal = a.rank;
        bVal = b.rank;
      } else if (tableSort.field === 'total') {
        aVal = a.totalScore;
        bVal = b.totalScore;
      } else if (tableSort.field === 'average') {
        aVal = a.average;
        bVal = b.average;
      } else {
        aVal = a.absent + a.permission;
        bVal = b.absent + b.permission;
      }
      return (aVal - bVal) * dir;
    });
    return list;
  }, [reports, tableSort]);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / PAGE_SIZE));
  const pagedStudents = useMemo(
    () => sortedStudents.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE),
    [sortedStudents, tablePage]
  );

  const handleGenerate = async (forceFresh = false) => {
    if (!canGenerate) return;

    setLoadingReport(true);
    setError('');

    try {
      if (scope === 'class') {
        const results: KhmerMonthlyReportData[] = [];
        // Execute sequentially to prevent database connection pool exhaustion (checkout timeout)
        for (const classId of selectedClasses) {
          const classData = classes.find((c) => c.id === classId);
          try {
            const report = await gradeAPI.getMonthlyReport({
              scope,
              classId,
              grade: classData?.grade,
              month: selectedMonthLabel,
              monthNumber: selectedMonthNumber,
              year: Number.isFinite(academicStartYear) ? academicStartYear : undefined,
              academicYearId: selectedYear,
              format: reportFormat,
              template: templateQuery,
              options: { forceFresh },
            });
            if (report) {
              results.push(report);
            }
          } catch (singleErr: any) {
            console.error(`Failed to generate report for class ${classId}:`, singleErr);
            // Gracefully catch individual errors so other successful classes still display!
          }
        }

        if (results.length === 0 && selectedClasses.length > 0) {
          throw new Error('Failed to generate report for any of the selected classes due to service load.');
        }

        setReports(results);
      } else {
        const data = await gradeAPI.getMonthlyReport({
          scope,
          classId: undefined,
          grade: selectedGrade,
          month: selectedMonthLabel,
          monthNumber: selectedMonthNumber,
          year: Number.isFinite(academicStartYear) ? academicStartYear : undefined,
          academicYearId: selectedYear,
          format: reportFormat,
          template: templateQuery,
          options: { forceFresh },
        });
        setReports(data ? [data] : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  };

  const updateSetting = <K extends keyof typeof DEFAULT_SETTINGS>(key: K, value: (typeof DEFAULT_SETTINGS)[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const toggleSubject = (subjectName: string) => {
    setHiddenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectName)) next.delete(subjectName);
      else next.add(subjectName);
      return next;
    });
  };

  const toggleTableColumn = (columnId: string) => {
    setHiddenTableColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  const handleSort = (field: 'rank' | 'total' | 'average' | 'absent') => {
    setTableSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    );
    setTablePage(0);
  };

  const restoreDefaults = () => {
    setSettings({
      ...DEFAULT_SETTINGS,
      examCenter: school?.name || '',
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isFormElement = tag === 'input' || tag === 'textarea' || tag === 'select';
      const key = event.key.toLowerCase();
      if (key === 'g' && !isFormElement) {
        event.preventDefault();
        if (canGenerate && !loadingReport) handleGenerate(false);
      } else if (key === 'r' && !isFormElement && event.shiftKey) {
        event.preventDefault();
        if (canGenerate && !loadingReport) handleGenerate(true);
      } else if (key === 'p' && reports.length > 0) {
        event.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, loadingReport, reports]);


  const toKhmerDigits = (num: number | string | undefined | null) => {
    if (!num) return "";
    const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
    return String(num).replace(/[0-9]/g, (d) => khmerDigits[parseInt(d)]);
  };

  const getTemplateText = (template: 'graduation' | 'honor' | 'completion') => {
    if (template === 'graduation') {
      return "បានបញ្ចប់ការសិក្សាដោយជោគជ័យពី ថ្នាក់ទី {{class}} ទទួលបានចំណាត់ថ្នាក់លេខ {{rank}} មធ្យមភាគ {{average}} ប្រចាំខែ {{month}} ឆ្នាំសិក្សា {{academicYear}}";
    }
    if (template === 'completion') {
      return "បានបញ្ចប់វគ្គសិក្សាដោយជោគជ័យពី ថ្នាក់ទី {{class}} ទទួលបានចំណាត់ថ្នាក់លេខ {{rank}} មធ្យមភាគ {{average}} ប្រចាំខែ {{month}} ឆ្នាំសិក្សា {{academicYear}}";
    }
    return "ទទួលបានចំណាត់ថ្នាក់លេខ {{rank}} មធ្យមភាគ {{average}} ប្រចាំខែ {{month}} ឆ្នាំសិក្សា {{academicYear}}";
  };

  const getGeneratedDescription = (template: string, name: string, gender: string, rank: string, avg: string, cls: string, year: string) => {
    const monthStr = selectedMonthDisplay || '';
    const classStr = cls ? `ថ្នាក់ទី ${cls}` : '';
    
    if (template === 'graduation') {
      return `បានបញ្ចប់ការសិក្សាដោយជោគជ័យពី ${classStr} ទទួលបានចំណាត់ថ្នាក់លេខ ${toKhmerDigits(rank)} មធ្យមភាគ ${toKhmerDigits(avg)} ប្រចាំខែ ${monthStr} ឆ្នាំសិក្សា ${toKhmerDigits(year)}`;
    }
    if (template === 'completion') {
      return `បានបញ្ចប់វគ្គសិក្សាដោយជោគជ័យពី ${classStr} ទទួលបានចំណាត់ថ្នាក់លេខ ${toKhmerDigits(rank)} មធ្យមភាគ ${toKhmerDigits(avg)} ប្រចាំខែ ${monthStr} ឆ្នាំសិក្សា ${toKhmerDigits(year)}`;
    }
    // Default / Honor
    return `ទទួលបានចំណាត់ថ្នាក់លេខ ${toKhmerDigits(rank)} មធ្យមភាគ ${toKhmerDigits(avg)} ប្រចាំខែ ${monthStr} ឆ្នាំសិក្សា ${toKhmerDigits(year)}`;
  };

  const activePrintList = useMemo(() => {
    if (printQueue.length > 0) {
      return printQueue;
    }
    if (reports.length > 0 && reports[0]?.students?.length > 0) {
      const yearName = selectedYearData?.name || '';
      const firstReport = reports[0];
      const clsName = firstReport.class?.name || '';
      return firstReport.students.map(s => ({
        id: s.studentId,
        studentName: s.studentName,
        gender: s.gender === 'FEMALE' || s.gender === 'F' ? 'F' : 'M',
        rank: String(s.rank),
        average: s.average?.toFixed(2) || '0.00',
        className: clsName,
        academicYear: yearName,
      }));
    }
    return [
      {
        id: certStudentId === 'custom' ? 'custom' : certStudentId,
        studentName: certCustomName,
        gender: certCustomGender,
        rank: certCustomRank,
        average: certCustomAverage,
        className: certClassName,
        academicYear: certAcademicYear,
      }
    ];
  }, [
    printQueue,
    reports,
    selectedYearData,
    certStudentId,
    certCustomName,
    certCustomGender,
    certCustomRank,
    certCustomAverage,
    certClassName,
    certAcademicYear,
  ]);

  // Sync preview index bound
  useEffect(() => {
    if (previewIndex >= activePrintList.length) {
      setPreviewIndex(Math.max(0, activePrintList.length - 1));
    }
  }, [activePrintList.length, previewIndex]);

  const currentPreviewStudent = useMemo(() => {
    return activePrintList[previewIndex] || activePrintList[0] || {
      id: 'custom',
      studentName: '',
      gender: 'M',
      rank: '1',
      average: '9.50',
      className: '',
      academicYear: '',
    };
  }, [activePrintList, previewIndex]);

  const filteredClassStudents = useMemo(() => {
    return sortedStudents.filter(s =>
      s.studentName.toLowerCase().includes(classFilterQuery.toLowerCase())
    );
  }, [sortedStudents, classFilterQuery]);

  const isAllSelected = useMemo(() => {
    if (filteredClassStudents.length === 0) return false;
    return filteredClassStudents.every(s =>
      printQueue.some(item => item.id === s.studentId)
    );
  }, [filteredClassStudents, printQueue]);

  // Sync certificate details with school profile and report settings automatically
  useEffect(() => {
    if (schoolProfile) {
      setCertSchoolName(prev => prev || schoolProfile.nameKh || schoolProfile.name || school?.name || '');
    }
  }, [schoolProfile, school]);

  useEffect(() => {
    if (settings.principalName) {
      setCertPrincipalName(prev => prev || settings.principalName);
    }
    if (settings.reportDate) {
      setCertDate(prev => prev || settings.reportDate);
    }
  }, [settings.principalName, settings.reportDate]);

  useEffect(() => {
    if (selectedYearData) {
      setCertAcademicYear(prev => prev || selectedYearData.name || '');
    }
  }, [selectedYearData]);

  useEffect(() => {
    if (reports.length > 0 && reports[0]?.class?.name) {
      setCertClassName(prev => prev || reports[0]?.class?.name || '');
    }
  }, [reports]);

  // Observe sidebar container dimensions for high-fidelity responsive certificate scaling
  useEffect(() => {
    if (!sidebarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setSidebarWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(sidebarRef.current);
    return () => observer.disconnect();
  }, []);


  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" showFilters={false} />;
  }

  const semesterMonthLabels = ['វិច្ឆិកា', 'ធ្នូ', 'មករា', 'កុម្ភៈ'];

  const metricCards = [
    {
      label: t('students'),
      value: reports[0]?.statistics.totalStudents ?? '—',
      note: reports.length > 0 ? t('metricFemale', { count: reports[0].statistics.femaleStudents }) : t('metricGenerate'),
      Icon: Users,
      accent: 'border-blue-100 bg-blue-50/70 text-blue-700',
      iconTone: 'bg-blue-100 text-blue-700',
    },
    {
      label: t('passed'),
      value: reports[0]?.statistics.passedStudents ?? '—',
      note: reports.length > 0 ? `${t('failed')}: ${reports[0].statistics.failedStudents}` : t('metricPassNote'),
      Icon: CheckCircle2,
      accent: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
      iconTone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: t('academicYear'),
      value: selectedYearData?.name || '—',
      note: educationModelLabel,
      Icon: GraduationCap,
      accent: 'border-violet-100 bg-violet-50/70 text-violet-700',
      iconTone: 'bg-violet-100 text-violet-700',
    },
  ];

  const tableColumns: Array<{ id: string; label: string; align?: 'left' | 'right' | 'center' }> = [
    { id: 'rank', label: t('rank') },
    { id: 'student', label: t('student') },
    ...(scope === 'class' ? [] : [{ id: 'class', label: t('class') }]),
    { id: 'total', label: t('total'), align: 'right' as const },
    { id: 'average', label: t('average'), align: 'right' as const },
    { id: 'gradeLevel', label: t('gradeLetter'), align: 'center' as const },
    { id: 'absent', label: t('absent'), align: 'center' as const },
  ];

  const Switch = ({
    checked,
    onChange,
    label,
    hint,
  }: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    hint?: string;
  }) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );

  const SortIcon = ({ field }: { field: 'rank' | 'total' | 'average' | 'absent' }) => {
    if (tableSort.field !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return tableSort.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600" />
    );
  };

  const sortableColumns: Record<string, 'rank' | 'total' | 'average' | 'absent'> = {
    rank: 'rank',
    total: 'total',
    average: 'average',
    absent: 'absent',
  };

  const formatLabelMap = {
    monthly: t('formatMonthly'),
    semester: t('formatSemester'),
  } as const;



  const getInterpolatedDescription = (item: any) => {
    if (isDescCustomized) {
      const genderKh = item.gender === 'F' ? 'សិស្សនារី' : 'សិស្សគំរូ';
      const monthStr = selectedMonthDisplay || '';
      return certDescription
        .replace(/\{\{name\}\}/g, item.studentName || '')
        .replace(/\{\{gender\}\}/g, genderKh)
        .replace(/\{\{rank\}\}/g, toKhmerDigits(item.rank || ''))
        .replace(/\{\{average\}\}/g, toKhmerDigits(item.average || ''))
        .replace(/\{\{class\}\}/g, item.className || '')
        .replace(/\{\{academicYear\}\}/g, toKhmerDigits(item.academicYear || ''))
        .replace(/\{\{month\}\}/g, monthStr);
    } else {
      return getGeneratedDescription(
        certTemplate,
        item.studentName || '',
        item.gender || 'M',
        item.rank || '1',
        item.average || '9.50',
        item.className || '',
        item.academicYear || ''
      );
    }
  };

  const toggleSelectAllClass = () => {
    if (isAllSelected) {
      setPrintQueue(prev => prev.filter(item =>
        !filteredClassStudents.some(s => s.studentId === item.id)
      ));
    } else {
      setPrintQueue(prev => {
        const next = [...prev];
        filteredClassStudents.forEach(s => {
          if (!next.some(item => item.id === s.studentId)) {
            next.push({
              id: s.studentId,
              studentName: s.studentName,
              gender: s.gender === 'FEMALE' || s.gender === 'F' ? 'F' : 'M',
              rank: String(s.rank),
              average: s.average?.toFixed(2) || '0.00',
              className: certClassName,
              academicYear: certAcademicYear
            });
          }
        });
        return next;
      });
    }
  };

  const renderCertificate = (item: any, isPrint: boolean = false, idx: number = 0) => {
    const isModern = certStyle === 'modern';
    const isRoyal = certStyle === 'royal';
    
    // Container Classes
    let containerClass = "bg-white p-10 relative flex flex-col justify-between overflow-hidden ";
    containerClass += isPrint ? "w-[297mm] h-[210mm] certificate-print-page " : "shadow-lg w-[297mm] h-[210mm] aspect-[1.414] ";
    
    if (isModern) {
      containerClass += "border-l-[16px] border-blue-700 rounded-r-3xl";
    } else if (isRoyal) {
      containerClass += "bg-slate-50 border-[2px] border-amber-300 rounded-sm outline outline-1 outline-offset-4 outline-amber-200";
    } else {
      // Classic
      containerClass += "border-[16px] border-double border-amber-500 rounded-sm";
    }

    return (
      <div className={containerClass} id={isPrint ? undefined : "certificate-print-area"}>
        {/* Background watermark/logo for Modern & Royal */}
        {(isModern || isRoyal) && schoolProfile?.logoUrl && (
           <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none z-0">
             <img src={resolveMediaUrl(schoolProfile.logoUrl)} className="w-[400px] h-[400px] object-contain grayscale" alt="" />
           </div>
        )}

        {/* Ornaments for Classic */}
        {certStyle === 'classic' && (
          <>
            <div className="absolute top-2 left-2 w-12 h-12 border-t-4 border-l-4 border-amber-600 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-2 right-2 w-12 h-12 border-t-4 border-r-4 border-amber-600 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-12 h-12 border-b-4 border-l-4 border-amber-600 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-12 h-12 border-b-4 border-r-4 border-amber-600 rounded-br-sm pointer-events-none" />
            <div className="absolute inset-2 border border-amber-400 pointer-events-none" />
          </>
        )}

        {/* Certificate Content */}
        <div className={`text-center font-khmer flex-1 flex flex-col justify-between py-2 relative z-10 ${isModern ? 'pl-8' : ''}`}>
          {/* Header */}
          <div className="space-y-1">
            <h2 className={`text-lg font-bold tracking-wide font-moul ${isModern ? 'text-blue-900' : 'text-slate-800'}`}>ព្រះរាជាណាចក្រកម្ពុជា</h2>
            <h3 className={`text-xs font-semibold font-moul ${isModern ? 'text-blue-700' : 'text-slate-700'}`}>ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
            <div className="flex justify-center items-center gap-1 py-1">
              <span className={`w-8 h-[1px] ${isModern ? 'bg-blue-300' : 'bg-amber-500'}`} />
              <span className={`text-[8px] ${isModern ? 'text-blue-500' : 'text-amber-500'}`}>⚜</span>
              <span className={`w-8 h-[1px] ${isModern ? 'bg-blue-300' : 'bg-amber-500'}`} />
            </div>
          </div>

          {/* School Name */}
          <div className="mt-2 space-y-1">
            <span className={`text-xs font-semibold tracking-wider font-moul ${isModern ? 'text-blue-800' : 'text-amber-700'}`}>{certSchoolName}</span>
          </div>

          {/* Title */}
          <div className="my-2">
            <h1 className={`text-4xl font-extrabold tracking-tight font-moul ${isModern ? 'text-blue-600' : 'text-amber-600'}`} style={!isModern ? { textShadow: '1px 1px 0px rgba(0,0,0,0.1)' } : {}}>
              {certTitle}
            </h1>
          </div>

          {/* Awardee */}
          <div className="my-2 space-y-1">
            <p className="text-xs text-slate-500">ជូនចំពោះ / Awarded To</p>
            <h2 className={`text-2xl font-bold font-moul py-1 border-b border-dashed inline-block px-12 ${isModern ? 'text-blue-950 border-blue-200' : 'text-slate-900 border-amber-300'}`}>
              {item.studentName || 'ឈ្មោះសិស្ស'}
            </h2>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              ភេទ / Gender: <span className="text-slate-800">{item.gender === 'F' ? 'ស្រី' : 'ប្រុស'}</span>
              {item.className && <> · ថ្នាក់ / Class: <span className="text-slate-800">{item.className}</span></>}
              {item.academicYear && <> · ឆ្នាំសិក្សា / Year: <span className="text-slate-800">{toKhmerDigits(item.academicYear)}</span></>}
            </p>
          </div>

          {/* Description */}
          <div className="my-2 px-16">
            <p className={`text-sm leading-relaxed tracking-normal text-center whitespace-pre-line ${isModern ? 'font-sans text-slate-600' : 'font-serif text-slate-700'}`}>
              {getInterpolatedDescription(item)}
            </p>
          </div>

          {/* Bottom Row - Signatures */}
          <div className="mt-4 grid grid-cols-2 px-10 text-xs">
            {/* Left: Teacher */}
            <div className="text-center flex flex-col justify-end items-center space-y-12">
              <div>
                <p className="text-slate-500 italic text-[10px] opacity-0 select-none">{certDate}</p>
                <p className="font-semibold text-slate-600 mt-1">រៀបចំដោយ</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 border-t border-slate-200 pt-1 px-8">គ្រូបន្ទុកថ្នាក់</p>
              </div>
            </div>

            {/* Right: Principal & Stamp */}
            <div className="text-center flex flex-col justify-end items-center space-y-12">
              <div>
                <p className="text-slate-500 italic text-[10px]">{certDate}</p>
                <div className="relative mt-1">
                  {certShowStamp && (
                    schoolProfile?.stampUrl ? (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-32 pointer-events-none select-none z-20 rotate-12 opacity-95">
                        <img src={resolveMediaUrl(schoolProfile.stampUrl)} alt="Stamp" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-32 h-32 text-red-500/90 drop-shadow-sm select-none pointer-events-none z-20 rotate-12 opacity-85 absolute -top-6 left-1/2 -translate-x-1/2">
                        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3,2" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.8" />
                        <path id={`topTextPath_${idx}`} d="M 12 50 A 38 38 0 0 1 88 50" fill="none" />
                        <path id={`bottomTextPath_${idx}`} d="M 88 50 A 38 38 0 0 1 12 50" fill="none" />
                        <text className="font-moul fill-current text-[5.5px]" fill="currentColor" letterSpacing="0.3">
                          <textPath href={`#topTextPath_${idx}`} startOffset="50%" textAnchor="middle">
                            {`សាលារៀន ${certSchoolName ? (certSchoolName.length > 25 ? certSchoolName.slice(0, 22) + '...' : certSchoolName) : ''}`}
                          </textPath>
                        </text>
                        <g transform="translate(50, 50) scale(0.6)">
                          <path d="M 0,-15 L 4,-4 L 15,-4 L 7,3 L 10,14 L 0,8 L -10,14 L -7,3 L -15,-4 L -4,-4 Z" fill="currentColor" />
                          <circle cx="0" cy="0" r="2.5" fill="white" />
                        </g>
                        <text className="font-sans font-bold fill-current text-[5.5px]" fill="currentColor" letterSpacing="1">
                          <textPath href={`#bottomTextPath_${idx}`} startOffset="50%" textAnchor="middle">
                            {`★ ${schoolProfile?.province || 'សៀមរាប'} ★`}
                          </textPath>
                        </text>
                      </svg>
                    )
                  )}
                  <p className="font-semibold text-slate-600">ហត្ថលេខា និងត្រា</p>
                </div>
              </div>
              <div>
                <p className={`font-bold font-moul mt-2 ${isModern ? 'text-blue-900' : 'text-slate-800'}`}>{certPrincipalName || 'នាយឈសាលា'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <AnimatedContent>
            {/* Hero / Configuration */}
            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
              <div>
                {/* Left: configuration */}
                <div className="p-5 sm:p-7">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 leading-none">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                          {t('eyebrow')}
                        </h1>
                      </div>
                    </div>

                    {/* Compact Horizontal Statistics Row */}
                    <div className="grid grid-cols-3 gap-3 w-full lg:w-[480px]">
                      {metricCards.map((card) => {
                        const Icon = card.Icon;
                        return (
                          <div
                            key={card.label}
                            className={`flex items-center gap-2.5 rounded-xl border p-2 ${card.accent}`}
                          >
                            <span className={`rounded-lg p-1.5 ${card.iconTone} shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500/80 truncate">
                                {card.label}
                              </span>
                              <span className="block text-sm font-extrabold text-slate-900 leading-tight">
                                {card.value}
                              </span>
                              <span className="block text-[9px] text-slate-500 truncate leading-none mt-0.5">
                                {card.note}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Premium Enterprise-Grade Tab Switcher */}
                  <div className="flex border-b border-slate-100 -mx-5 px-5 sm:-mx-7 sm:px-7 mt-2 mb-6 print:hidden overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('monthly')}
                      className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition duration-150 focus:outline-none whitespace-nowrap ${
                        activeTab === 'monthly'
                          ? 'text-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>{t('formatMonthly')} (របាយការណ៍ប្រចាំខែ)</span>
                      {activeTab === 'monthly' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('transcript')}
                      className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition duration-150 focus:outline-none whitespace-nowrap ${
                        activeTab === 'transcript'
                          ? 'text-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>Transcript (ព្រឹត្តិបត្រពិន្ទុ)</span>
                      {activeTab === 'transcript' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('certificate')}
                      className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition duration-150 focus:outline-none whitespace-nowrap ${
                        activeTab === 'certificate'
                          ? 'text-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Award className="h-4 w-4" />
                      <span>Certificate (វិញ្ញាបនបត្រ)</span>
                      {activeTab === 'certificate' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full" />
                      )}
                    </button>
                  </div>

                  {/* Output options */}
                  {activeTab !== 'transcript' && (
                    <div className="mt-6 space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('formatLabel')}
                      </span>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div
                          role="tablist"
                          aria-label={t('formatLabel')}
                          className="inline-flex w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          {(['monthly', 'semester'] as const).map((fmt, idx) => (
                            <button
                              key={fmt}
                              type="button"
                              role="tab"
                              aria-pressed={reportType === fmt}
                              onClick={() => setReportType(fmt)}
                              className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                                idx > 0 ? 'border-l border-slate-200' : ''
                              } ${
                                reportType === fmt
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              } focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300`}
                            >
                              {formatLabelMap[fmt]}
                            </button>
                          ))}
                        </div>
                        <div
                          role="tablist"
                          aria-label={t('reportSetup')}
                          className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          {(['class', 'grade'] as ReportScope[]).map((item, idx) => (
                            <button
                              key={item}
                              type="button"
                              role="tab"
                              aria-pressed={scope === item}
                              onClick={() => setScope(item)}
                              className={`px-4 py-2 text-sm font-medium transition ${
                                idx > 0 ? 'border-l border-slate-200' : ''
                              } ${
                                scope === item
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              } focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300`}
                            >
                              {item === 'class' ? t('scopeByClass') : t('scopeByGrade')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filters and Actions */}
                  {activeTab !== 'certificate' && (
                    <>
                      {/* Filters */}
                      <div className={`mt-6 grid gap-4 ${scope === 'class' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t('academicYear')}
                          </span>
                          <select
                            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            value={selectedYear}
                            onChange={(event) => setSelectedYear(event.target.value)}
                          >
                            {allYears.map((year) => (
                              <option key={year.id} value={year.id}>
                                {year.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        {scope === 'grade' && (
                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('grade')}
                            </span>
                            <select
                              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              value={selectedGrade}
                              onChange={(event) => setSelectedGrade(event.target.value)}
                            >
                              {grades.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {reportType === 'monthly' ? (
                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('monthLabel')}
                            </span>
                            <select
                              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              value={selectedMonthNumber}
                              onChange={(event) => setSelectedMonthNumber(Number(event.target.value))}
                            >
                              {KHMER_MONTHS.map((month) => (
                                <option key={month.number} value={month.number}>
                                  {getKhmerMonthDisplayName(month.number, month.label)}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('formatSemester')}
                            </span>
                            <select
                              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              value={selectedSemester}
                              onChange={(event) => setSelectedSemester(Number(event.target.value) as 1 | 2)}
                            >
                              <option value={1}>{t('formatSemester1')}</option>
                              <option value={2}>{t('formatSemester2')}</option>
                            </select>
                          </label>
                        )}
                      </div>

                      {scope === 'class' && (
                        <div className="mt-5 block">
                          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('class')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedClasses.length === classes.length) {
                                  setSelectedClasses([]);
                                } else {
                                  setSelectedClasses(classes.map(c => c.id));
                                }
                              }}
                              className="text-xs font-medium text-blue-600 transition hover:text-blue-700 active:scale-95"
                            >
                              {selectedClasses.length === classes.length ? t('deselectAll', { fallback: 'Deselect All' }) : t('selectAll', { fallback: 'Select All' })}
                            </button>
                          </div>
                          {loadingClasses ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                              <span className="text-xs font-medium text-slate-500">{t('loading')}</span>
                            </div>
                          ) : groupedClasses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                              <Inbox className="h-8 w-8 stroke-1" />
                              <span className="mt-2 text-xs font-medium">{t('noClassesFound', { fallback: 'No classes found for this year' })}</span>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {groupedClasses.map(({ grade, classItems }) => {
                                const gradeClassIds = classItems.map(c => c.id);
                                const allSelected = gradeClassIds.every(id => selectedClasses.includes(id));

                                return (
                                  <div key={grade} className="flex items-start gap-4 py-3.5 first:pt-1 last:pb-1">
                                    {/* Aligned Left Grade Indicator */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (allSelected) {
                                          setSelectedClasses(prev => prev.filter(id => !gradeClassIds.includes(id)));
                                        } else {
                                          setSelectedClasses(prev => {
                                            const filtered = prev.filter(id => !gradeClassIds.includes(id));
                                            return [...filtered, ...gradeClassIds];
                                          });
                                        }
                                      }}
                                      className="w-20 shrink-0 text-left transition hover:opacity-80 active:scale-95"
                                    >
                                      <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold transition duration-150 ${
                                        allSelected
                                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200/50'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        ថ្នាក់ទី {grade}
                                      </span>
                                    </button>
      
                                    {/* Wrapping Class Chips on the Right */}
                                    <div className="flex flex-wrap gap-2">
                                      {classItems.map((classItem) => {
                                        const isSelected = selectedClasses.includes(classItem.id);
                                        return (
                                          <button
                                            key={classItem.id}
                                            type="button"
                                            onClick={() => {
                                              if (isSelected) {
                                                setSelectedClasses(selectedClasses.filter(id => id !== classItem.id));
                                              } else {
                                                setSelectedClasses([...selectedClasses, classItem.id]);
                                              }
                                            }}
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 duration-100 ${
                                              isSelected 
                                                ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700' 
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                          >
                                            <span>{classItem.name}</span>
                                            <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                              ({classItem._count?.students || 0})
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {error && (
                        <div
                          role="alert"
                          aria-live="assertive"
                          className="mt-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Action row */}
                      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
                        <button
                          type="button"
                          onClick={() => handleGenerate(false)}
                          disabled={!canGenerate || loadingReport}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-indigo-200/50 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100"
                        >
                          {loadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          {t('generate')}
                          <kbd className="ml-1.5 hidden rounded border border-white/20 bg-white/10 px-1 text-[9px] text-white/80 sm:inline">⌘G</kbd>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerate(true)}
                          disabled={!canGenerate || loadingReport}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100 shadow-sm"
                        >
                          <RefreshCw className="h-4 w-4" />
                          {t('refresh')}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          disabled={reports.length === 0}
                          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100 shadow-sm"
                        >
                          <Printer className="h-4 w-4" />
                          {t('print')}
                          <kbd className="ml-1.5 hidden rounded border border-violet-200 bg-violet-100/50 px-1 text-[9px] text-violet-600 sm:inline">⌘P</kbd>
                        </button>
                        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                          {loadingReport ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {t('loading')}
                            </span>
                          ) : reports.length > 0 ? (
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {reports[0].students.length} {t('students').toLowerCase()}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              {t('metricReady')}
                            </span>
                          )}
                        </div>
                      </div>
                  </>
                  )}

                  {activeTab === 'certificate' && (
                    <div className="mt-6 grid gap-6 lg:grid-cols-12">
                      {/* Left Column: Configurator Form */}
                      <div className="lg:col-span-8 space-y-5">
                        
                        {/* Row 1: Format */}
                        <div className="grid grid-cols-1 gap-4">
                          {/* Certificate Format */}
                          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              1. Format (ទម្រង់)
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { id: 'honor', title: 'Honor', subtitle: 'លិខិតសរសើរ' },
                                { id: 'completion', title: 'Completion', subtitle: 'បញ្ចប់វគ្គ' },
                                { id: 'graduation', title: 'Graduation', subtitle: 'បញ្ចប់ការសិក្សា' },
                              ] as const).map((tmpl) => (
                                <button
                                  key={tmpl.id}
                                  type="button"
                                  onClick={() => setCertTemplate(tmpl.id)}
                                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 transition ${
                                    certTemplate === tmpl.id
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-100 bg-white hover:border-blue-200'
                                  }`}
                                >
                                  <Award className={`h-4 w-4 ${certTemplate === tmpl.id ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className={`text-[10px] font-bold ${certTemplate === tmpl.id ? 'text-blue-700' : 'text-slate-700'}`}>{tmpl.title}</span>
                                  <span className={`text-[9px] ${certTemplate === tmpl.id ? 'text-blue-500' : 'text-slate-400'}`}>{tmpl.subtitle}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Recipient Manager */}
                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              2. Recipients (សិស្សទទួល)
                            </h3>
                            {printQueue.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">
                                  {printQueue.length} selected
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPrintQueue([])}
                                  className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                                >
                                  Clear all
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Tabs */}
                          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                            {([
                              { id: 'class', label: 'By Class (តាមថ្នាក់)' },
                              { id: 'search', label: 'Search (ស្វែងរក)' },
                              { id: 'custom', label: 'Custom (ផ្ទាល់ខ្លួន)' },
                            ] as const).map(tab => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setRecipientTab(tab.id)}
                                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                  recipientTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Class Tab */}
                          {recipientTab === 'class' && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <select
                                    value={certSelectedClassId}
                                    onChange={e => setCertSelectedClassId(e.target.value)}
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                  >
                                    <option value="">Select a class...</option>
                                    {classes.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!certClassStudents || certClassStudents.length === 0) return;
                                    const allSelected = certClassStudents.every(s => printQueue.some(item => item.id === s.studentId));
                                    if (allSelected) {
                                      setPrintQueue(prev => prev.filter(item => !certClassStudents.some(cs => cs.studentId === item.id)));
                                    } else {
                                      const toAdd = certClassStudents.filter(cs => !printQueue.some(item => item.id === cs.studentId)).map(s => ({
                                        id: s.studentId,
                                        studentName: s.firstNameKhmer && s.lastNameKhmer ? `${s.lastNameKhmer} ${s.firstNameKhmer}` : (s.firstNameKhmer || s.firstName || ''),
                                        gender: s.gender === 'FEMALE' || s.gender === 'F' ? 'F' : 'M',
                                        rank: '0',
                                        average: '0.00',
                                        className: s.class?.name || '',
                                        academicYear: selectedYearData?.name || '',
                                      }));
                                      setPrintQueue(prev => [...prev, ...toAdd]);
                                    }
                                  }}
                                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  {certClassStudents && certClassStudents.length > 0 && certClassStudents.every(s => printQueue.some(item => item.id === s.studentId)) ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                              <div className="max-h-48 space-y-1 overflow-y-auto">
                                {isLoadingCertClassStudents ? (
                                  <div className="py-6 text-center text-xs text-slate-400">Loading students...</div>
                                ) : !certSelectedClassId ? (
                                  <div className="py-6 text-center text-xs text-slate-400">Please select a class</div>
                                ) : !certClassStudents || certClassStudents.length === 0 ? (
                                  <div className="py-6 text-center text-xs text-slate-400">No students in this class</div>
                                ) : (
                                  certClassStudents.map(s => {
                                    const isSelected = printQueue.some(item => item.id === s.studentId);
                                    const studentName = s.firstNameKhmer && s.lastNameKhmer ? `${s.lastNameKhmer} ${s.firstNameKhmer}` : (s.firstNameKhmer || s.firstName || '');
                                    return (
                                      <button
                                        key={s.studentId}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setPrintQueue(prev => prev.filter(item => item.id !== s.studentId));
                                          } else {
                                            setPrintQueue(prev => [...prev, {
                                              id: s.studentId,
                                              studentName,
                                              gender: s.gender === 'FEMALE' || s.gender === 'F' ? 'F' : 'M',
                                              rank: '0',
                                              average: '0.00',
                                              className: s.class?.name || '',
                                              academicYear: selectedYearData?.name || '',
                                            }]);
                                          }
                                        }}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition ${
                                          isSelected ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition ${
                                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                        }`}>
                                          {isSelected && <span className="text-white text-[8px] font-black">✓</span>}
                                        </span>
                                        <span className="font-semibold flex-1">{studentName}</span>
                                        <span className="text-slate-400 text-[10px]">{s.class?.name}</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}

                          {/* Search Tab */}
                          {recipientTab === 'search' && (
                            <div className="space-y-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search all students..."
                                  value={certSearchQuery}
                                  onChange={e => setCertSearchQuery(e.target.value)}
                                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                              </div>
                              <div className="max-h-48 space-y-1 overflow-y-auto">
                                {isLoadingCertSearchStudents ? (
                                  <div className="py-6 text-center text-xs text-slate-400">Searching...</div>
                                ) : debouncedCertSearchQuery.length < 2 ? (
                                  <div className="py-6 text-center text-xs text-slate-400">Type at least 2 characters to search</div>
                                ) : !certSearchStudents || certSearchStudents.length === 0 ? (
                                  <div className="py-6 text-center text-xs text-slate-400">No students found</div>
                                ) : (
                                  certSearchStudents.map(s => {
                                    const isSelected = printQueue.some(item => item.id === s.studentId);
                                    const studentName = s.firstNameKhmer && s.lastNameKhmer ? `${s.lastNameKhmer} ${s.firstNameKhmer}` : (s.firstNameKhmer || s.firstName || '');
                                    return (
                                      <button
                                        key={s.studentId}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setPrintQueue(prev => prev.filter(item => item.id !== s.studentId));
                                          } else {
                                            setPrintQueue(prev => [...prev, {
                                              id: s.studentId,
                                              studentName,
                                              gender: s.gender === 'FEMALE' || s.gender === 'F' ? 'F' : 'M',
                                              rank: '0',
                                              average: '0.00',
                                              className: s.class?.name || '',
                                              academicYear: selectedYearData?.name || '',
                                            }]);
                                          }
                                        }}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition ${
                                          isSelected ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition ${
                                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                        }`}>
                                          {isSelected && <span className="text-white text-[8px] font-black">✓</span>}
                                        </span>
                                        <span className="font-semibold flex-1">{studentName}</span>
                                        <span className="text-slate-400 text-[10px]">{s.class?.name}</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}

                          {/* Custom Tab */}
                          {recipientTab === 'custom' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block sm:col-span-2">
                                  <span className="text-xs font-semibold text-slate-500">Full Name (ឈ្មោះ)</span>
                                  <input
                                    type="text"
                                    value={certCustomName}
                                    onChange={e => setCertCustomName(e.target.value)}
                                    placeholder="e.g. នាង សុភា"
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Rank (ចំណាត់ថ្នាក់)</span>
                                  <input
                                    type="text"
                                    value={certCustomRank}
                                    onChange={e => setCertCustomRank(e.target.value)}
                                    placeholder="1"
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Average (មធ្យមភាគ)</span>
                                  <input
                                    type="text"
                                    value={certCustomAverage}
                                    onChange={e => setCertCustomAverage(e.target.value)}
                                    placeholder="9.50"
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Gender (ភេទ)</span>
                                  <select
                                    value={certCustomGender}
                                    onChange={e => setCertCustomGender(e.target.value as 'M' | 'F')}
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                                  >
                                    <option value="M">Male (ប្រុស)</option>
                                    <option value="F">Female (ស្រី)</option>
                                  </select>
                                </label>
                                <label className="block">
                                  <span className="text-xs font-semibold text-slate-500">Class (ថ្នាក់)</span>
                                  <input
                                    type="text"
                                    value={certClassName}
                                    onChange={e => setCertClassName(e.target.value)}
                                    placeholder="e.g. ១២ក"
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Row 3: Details & Customization */}
                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            4. Certificate Details (ព័ត៌មានលម្អិត)
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block sm:col-span-2">
                              <span className="text-xs font-semibold text-slate-500">Certificate Title (ចំណងជើង)</span>
                              <input
                                type="text"
                                value={certTitle}
                                onChange={e => setCertTitle(e.target.value)}
                                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-500">School Name (ឈ្មោះសាលា)</span>
                              <input
                                type="text"
                                value={certSchoolName}
                                onChange={e => setCertSchoolName(e.target.value)}
                                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-500">Principal Name (នាយកសាលា)</span>
                              <input
                                type="text"
                                value={certPrincipalName}
                                onChange={e => setCertPrincipalName(e.target.value)}
                                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-500">Date of Issue (កាលបរិច្ឆេទ)</span>
                              <input
                                type="text"
                                value={certDate}
                                onChange={e => setCertDate(e.target.value)}
                                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-500">Academic Year (ឆ្នាំសិក្សា)</span>
                              <input
                                type="text"
                                value={certAcademicYear}
                                onChange={e => setCertAcademicYear(e.target.value)}
                                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-400"
                              />
                            </label>
                          </div>

                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-slate-500">Achievement Description (ខ្លឹមសាររង្វាន់)</span>
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!isDescCustomized}
                                  onChange={(e) => {
                                    const nextCustomized = !e.target.checked;
                                    setIsDescCustomized(nextCustomized);
                                    if (nextCustomized) {
                                      setCertDescription(getTemplateText(certTemplate));
                                    }
                                  }}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[10px] text-slate-500 font-bold">Auto-generate (ស្វ័យប្រវត្តិ)</span>
                              </label>
                            </div>
                            <textarea
                              value={isDescCustomized ? certDescription : getTemplateText(certTemplate)}
                              disabled={!isDescCustomized}
                              onChange={e => setCertDescription(e.target.value)}
                              rows={3}
                              className={`w-full rounded-lg border px-3 py-2 text-xs transition ${
                                !isDescCustomized 
                                  ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' 
                                  : 'bg-white border-blue-300 text-slate-900 focus:ring-2 focus:ring-blue-100'
                              }`}
                            />
                            {isDescCustomized && (
                              <div className="mt-2 text-[9px] text-slate-500 bg-blue-50/50 border border-blue-100 p-2 rounded-lg">
                                <span className="font-bold text-blue-700">Variables available:</span>{' '}
                                <code className="text-blue-600 bg-white px-1 py-0.5 rounded border border-blue-100">{'{{name}}'}</code>,{' '}
                                <code className="text-blue-600 bg-white px-1 py-0.5 rounded border border-blue-100">{'{{gender}}'}</code>,{' '}
                                <code className="text-blue-600 bg-white px-1 py-0.5 rounded border border-blue-100">{'{{rank}}'}</code>,{' '}
                                <code className="text-blue-600 bg-white px-1 py-0.5 rounded border border-blue-100">{'{{average}}'}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Live Mini Certificate Rendering */}
                      <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-5 h-fit text-left">
                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Live Preview
                          </h3>
                          <div 
                            ref={sidebarRef}
                            className="relative aspect-[1.414] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-transform hover:scale-[1.02] cursor-pointer group" 
                            onClick={() => setIsPreviewOpen(true)}
                          >
                            <div 
                              className="absolute top-0 left-0 origin-top-left" 
                              style={{ 
                                transform: `scale(${sidebarWidth / 1122})`, 
                                width: '1122px', 
                                height: '794px'
                              }}
                            >
                              {renderCertificate(currentPreviewStudent, false, previewIndex)}
                            </div>
                            {/* Overlay hover effect */}
                            <div className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/5 flex items-center justify-center pointer-events-none">
                               <div className="opacity-0 transition-opacity flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[10px] font-bold text-slate-700 shadow-sm group-hover:opacity-100">
                                 <Search className="h-3 w-3" /> Click to enlarge
                               </div>
                            </div>
                          </div>

                          <div className="mt-6 flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => { setPreviewIndex(0); setIsPreviewOpen(true); }}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-amber-200 transition hover:from-amber-600 hover:to-orange-600 active:scale-95"
                            >
                              <Eye className="h-4 w-4" />
                              Fullscreen Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setTimeout(() => window.print(), 300)}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                            >
                              <Printer className="h-4 w-4" />
                              Print All ({activePrintList.length})
                            </button>
                          </div>
                          
                          {/* Quick Tips Box */}
                          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-2">Issuer Quick Tips</h4>
                            <ul className="space-y-1.5 text-[10px] text-slate-600">
                              <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5"><CheckCircle2 className="h-3 w-3" /></span> Make sure your browser print settings are set to <strong>Landscape</strong>.</li>
                              <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5"><CheckCircle2 className="h-3 w-3" /></span> Enable <strong>Background Graphics</strong> in the print dialog for colors.</li>
                              <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5"><CheckCircle2 className="h-3 w-3" /></span> Set Margins to <strong>None</strong> for edge-to-edge printing.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Subject columns */}
            {activeTab !== 'certificate' && reports.length > 0 && sortedSubjects.length > 0 && (
            <section className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{t('subjectColumns')}</span>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      className="font-medium text-blue-600 hover:underline"
                      onClick={() => setHiddenSubjects(new Set())}
                    >
                      {t('showAllSubjects')}
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      className="font-medium text-slate-600 hover:underline"
                      onClick={() => setHiddenSubjects(new Set(sortedSubjects.map((s) => s.nameKh || s.name)))}
                    >
                      {t('hideAllSubjects')}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                  {sortedSubjects.map((subject) => {
                    const subjectName = subject.nameKh || subject.name;
                    const hidden = hiddenSubjects.has(subjectName);
                    return (
                      <button
                        key={subjectName}
                        type="button"
                        onClick={() => toggleSubject(subjectName)}
                        aria-pressed={!hidden}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                          hidden
                            ? 'border-slate-200 bg-white text-slate-500 line-through'
                            : 'border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50'
                        }`}
                      >
                        {subjectName}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Print Settings */}
            {activeTab !== 'certificate' && (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/35 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 p-1 text-blue-700">
                      <Settings2 className="h-3.5 w-3.5" />
                    </span>
                    <h2 className="text-base font-semibold text-slate-900">{t('printSettings')}</h2>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      {t('a4Portrait')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      aria-live="polite"
                      className={`inline-flex items-center gap-1 text-xs transition ${
                        savedFlash ? 'text-emerald-600 opacity-100' : 'text-transparent opacity-0'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </span>
                    <button
                      type="button"
                      onClick={restoreDefaults}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore defaults
                    </button>
                  </div>
                </header>

                <div className="space-y-6 p-5">
                  {/* Institution & Signatures */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-md bg-blue-100 p-1 text-blue-700">
                        <MapPin className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-sm font-semibold text-slate-800">Institution & Signatures</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Province (ខេត្ត)
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. ព្រះសីហនុ"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings.province || ''}
                          onChange={(event) => updateSetting('province', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          School / Institution
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. អនុវិទ្យាល័យ ទំនប់រលក"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings.examCenter || ''}
                          onChange={(event) => updateSetting('examCenter', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Report Date (កាលបរិច្ឆេទ)
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. ថ្ងៃសុក្រ ៤ កើត ខែជេស្ឋ..."
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings.reportDate || ''}
                          onChange={(event) => updateSetting('reportDate', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Principal Name (នាយក)
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. សុខ វ៉ាន់"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings.principalName || ''}
                          onChange={(event) => updateSetting('principalName', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Teacher Name (គ្រូ)
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. កែម មុន្នីកាល"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings.teacherName || ''}
                          onChange={(event) => updateSetting('teacherName', event.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Layout & columns (Monthly tab) */}
                  {activeTab === 'monthly' && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded-md bg-violet-100 p-1 text-violet-700">
                          <Layout className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-slate-800">Layout & columns</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        {(
                          [
                            ['firstPageStudentCount', 'firstPageRows', 'rows'],
                            ['nextPageStudentCount', 'nextPageRows', 'rows'],
                            ['tableFontSize', 'tableFontSize', 'px'],
                          ] as const
                        ).map(([key, labelKey, unit]) => (
                          <label className="block" key={key}>
                            <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <span>{t(labelKey)}</span>
                              <span className="font-normal normal-case text-slate-400">{unit}</span>
                            </span>
                            <input
                              type="number"
                              min={key === 'tableFontSize' ? 7 : 15}
                              max={key === 'tableFontSize' ? 12 : 50}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              value={settings[key as keyof typeof DEFAULT_SETTINGS] as number}
                              onChange={(event) =>
                                updateSetting(key as keyof typeof DEFAULT_SETTINGS, Number(event.target.value) as never)
                              }
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Columns
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(
                              [
                                ['showAttendance', 'toggleAttendance'],
                                ['showSubjects', 'toggleSubjects'],
                                ['showTotal', 'toggleTotal'],
                                ['showAverage', 'toggleAverage'],
                                ['showRank', 'toggleRank'],
                                ['showGradeLevel', 'toggleGradeLetter'],
                                ['showClassName', 'toggleClassName'],
                              ] as const
                            ).map(([key, labelKey]) => (
                              <Switch
                                key={key}
                                label={t(labelKey)}
                                checked={settings[key as keyof typeof DEFAULT_SETTINGS] as boolean}
                                onChange={(next) =>
                                  updateSetting(key as keyof typeof DEFAULT_SETTINGS, next as never)
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Display
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(
                              [
                                ['showCircles', 'toggleCircles'],
                                ['autoCircle', 'toggleAutoCircle'],
                              ] as const
                            ).map(([key, labelKey]) => (
                              <Switch
                                key={key}
                                label={t(labelKey)}
                                checked={settings[key as keyof typeof DEFAULT_SETTINGS] as boolean}
                                onChange={(next) =>
                                  updateSetting(key as keyof typeof DEFAULT_SETTINGS, next as never)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Font size settings for individual transcripts */}
                  {activeTab === 'transcript' && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded-md bg-violet-100 p-1 text-violet-700">
                          <Layout className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-slate-800">Transcript Scaling</h3>
                      </div>
                      <label className="block max-w-[200px]">
                        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <span>{t('tableFontSize')}</span>
                          <span className="font-normal normal-case text-slate-400">px</span>
                        </span>
                        <input
                          type="number"
                          min={7}
                          max={16}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings.tableFontSize || 10}
                          onChange={(event) =>
                            updateSetting('tableFontSize', Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Preview Section - Using the actual print layout as preview */}
            {activeTab !== 'certificate' && (
              <div className="mt-8 pb-20">
                {loadingReport && (
                  <div className="mx-auto max-w-[210mm] animate-pulse rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
                    <div className="mb-8 flex justify-between">
                      <div className="h-20 w-20 rounded bg-slate-100" />
                      <div className="space-y-3">
                        <div className="h-4 w-40 rounded bg-slate-100" />
                        <div className="h-4 w-32 rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="h-8 w-full rounded bg-slate-50" />
                      ))}
                    </div>
                  </div>
                )}

                {reports.length === 0 && !loadingReport && (
                  <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
                      <FileText className="h-7 w-7" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{t('generateTitle') || 'Ready to generate report'}</h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                      {t('generateDesc') || 'Select your filters above and click generate to view the official print-ready report.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleGenerate(false)}
                      disabled={!canGenerate}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('generate')}
                    </button>
                  </div>
                )}

                {reports.length > 0 && !loadingReport && (
                  <div className="khmer-report-preview-container mx-auto">
                    {reports.map((rep, idx) => {
                      const repVisibleSubjects = rep.subjects?.filter(
                        (s) => !hiddenSubjects.has(s.nameKh || s.name)
                      );
                      return (
                        <div 
                          key={rep.class?.id || idx} 
                          style={{ pageBreakAfter: idx < reports.length - 1 ? 'always' : 'auto' }}
                        >
                          <MonthlyReportPrint 
                            report={rep} 
                            settings={settings} 
                            subjects={repVisibleSubjects}
                            schoolProfile={schoolProfile}
                            activeTab={activeTab}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </AnimatedContent>
        </main>
      </div>

      {/* Sticky action bar */}
      {showStickyBar && activeTab !== 'certificate' && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-30 print:hidden">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-blue-100 bg-white p-1 shadow-lg shadow-blue-950/10">
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={!canGenerate || loadingReport}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Generate (⌘G)"
            >
              {loadingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {t('generate')}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={!canGenerate || loadingReport}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Refresh (⌘⇧R)"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={reports.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Print (⌘P)"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}


      
      {/* Certificate Preview Modal */}
      {isPreviewOpen && activeTab === 'certificate' && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-slate-900 px-6 py-4 border-b border-slate-800 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Award className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Certificate Preview & Print</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {activePrintList.length} {activePrintList.length === 1 ? 'certificate' : 'certificates'} selected
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-1 items-end sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                <button
                  type="button"
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex(prev => prev - 1)}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 rounded transition"
                >
                  <Search className="h-4 w-4" /> {/* Just using Search as a placeholder icon for Prev */}
                </button>
                <span className="text-xs font-bold text-white min-w-[3rem] text-center">
                  {previewIndex + 1} / {activePrintList.length}
                </span>
                <button
                  type="button"
                  disabled={previewIndex >= activePrintList.length - 1}
                  onClick={() => setPreviewIndex(prev => prev + 1)}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 rounded transition"
                >
                  <Search className="h-4 w-4" /> {/* Placeholder for Next */}
                </button>
              </div>

              <div className="h-6 w-px bg-slate-700 hidden sm:block" />

              <button
                type="button"
                onClick={() => setTimeout(() => window.print(), 500)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print All ({activePrintList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-lg bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-auto bg-slate-950 p-8 flex items-center justify-center print:hidden">
             {renderCertificate(currentPreviewStudent, false, previewIndex)}
          </div>
        </div>
      )}

      {/* Hidden Print Container specifically targeted for media query print */}
      {activeTab === 'certificate' && (
        <div className="hidden print:block certificate-print-page w-full">
          {activePrintList.map((item, idx) => (
            <div 
              key={`cert-print-${idx}`}
              style={{ pageBreakAfter: idx < activePrintList.length - 1 ? 'always' : 'auto', pageBreakInside: 'avoid' }}
              className="w-full flex items-center justify-center overflow-hidden"
            >
              {renderCertificate(item, true, idx)}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          
          /* Hide all UI elements */
          nav, aside, .UnifiedNavigation, .PageSkeleton, .print\\:hidden { 
            display: none !important; 
          }
          
          /* Reset layout wrappers */
          .lg\\:ml-64 { margin-left: 0 !important; width: 100% !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }

          /* Hide UI-only sections like settings and hero */
          section, .mx-auto.max-w-2xl {
            display: none !important;
          }

          /* Specifically show the preview container even if inside hidden parents (overriding display: none on parents is hard, so we ensure the path is clear) */
          /* But since we only hide 'section' and 'mx-auto.max-w-2xl', and the report is in a plain 'div', it should stay visible. */
          
          .khmer-report-preview-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
