'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import { STUDENT_SERVICE_URL } from '@/lib/api/config';
import { schoolAPI } from '@/lib/api/school';
import { gradeAPI, type KhmerMonthlyReportData } from '@/lib/api/grades';
import { sortSubjectsByOrder } from '@/lib/reports/templates/khm-moeys/subjects';
import { KHMER_MONTHS, getKhmerMonthLabel } from '@/lib/reports/templates/khm-moeys/months';
import TranscriptPrint from '@/components/reports/templates/khm-moeys/TranscriptPrint';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import {
  calculateTranscriptSubject,
  calculateTranscriptSummary,
  getKhmerRemark,
  getLetterGrade,
} from '@/lib/reports/studentTranscript';
import {
  Home,
  ChevronRight,
  Award,
  Download,
  Printer,
  ArrowLeft,
  AlertTriangle,
  Settings,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';

interface TranscriptData {
  documentMeta?: {
    status: 'DRAFT' | 'OFFICIAL';
    isOfficial: boolean;
    generatedAt: string;
    formulaVersion: string;
    hasGrades: boolean;
    hasAttendance: boolean;
  };
  documentMetaByYear?: Record<string, {
    status: 'DRAFT' | 'OFFICIAL' | 'REVOKED';
    isOfficial: boolean;
    documentNumber?: string;
    verificationCode?: string;
    snapshotChecksum?: string;
    formulaVersion: string;
    approvedAt?: string;
    approvedById?: string;
    issuedAt?: string;
    generatedAt?: string;
  }>;
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    englishFirstName?: string | null;
    englishLastName?: string | null;
    khmerName?: string | null;
    dateOfBirth: string;
    gender: string;
    photo: string | null;
    enrolledAt: string;
    status: string;
  };
  summary: {
    totalYears: number;
    currentClass: string | null;
    currentGrade: string | null;
    cumulativeAverage: number | null;
    cumulativeGrade: string | null;
    promotions: number;
    repeats: number;
    totalProgressions: number;
  };
  academicYears: {
    yearId: string;
    classId?: string;
    yearName: string;
    startDate: string;
    endDate: string;
    className: string;
    gradeLevel: string;
    overallAverage: number | null;
    overallGrade: string | null;
    subjectCount: number;
    subjects: {
      subjectId: string;
      subjectName: string;
      subjectNameKh?: string | null;
      subjectCode: string;
      average: number;
      letterGrade: string;
      grades: {
        id: string;
        score: number;
        maxScore: number;
        percentage: number;
        month: string;
        monthNumber: number;
        year: number;
        remarks: string | null;
      }[];
    }[];
    attendance: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      rate: number;
    } | null;
  }[];
  progressions: {
    id: string;
    fromYear: string;
    toYear: string;
    fromClass: string;
    toClass: string;
    promotionType: string;
    notes: string | null;
    createdAt: string;
  }[];
  monthlySummaries: {
    month: string;
    monthNumber: number;
    year: number;
    classId: string;
    totalScore: number;
    totalMaxScore: number;
    average: number;
    classRank: number | null;
    gradeLevel: string | null;
  }[];
}

export default function StudentTranscriptPage() {
  const router = useRouter();
  const tTranscript = useTranslations('auto.web.students_id_transcript_page');
  const params = useParams();
  const studentId = params?.id as string;
  const locale = params?.locale as string;
  
  const [authReady, setAuthReady] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuingOfficial, setIssuingOfficial] = useState(false);
  const [revokingOfficial, setRevokingOfficial] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'cumulative' | 'monthly'>('cumulative');
  const [selectedMonths, setSelectedMonths] = useState<{ month: string; monthNumber: number; year: number; classId: string }[]>([]);
  const [reportDataList, setReportDataList] = useState<{
    month: string;
    monthNumber: number;
    year: number;
    classId: string;
    data: KhmerMonthlyReportData;
  }[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedMonths, setGeneratedMonths] = useState<{ month: string; monthNumber: number; year: number; classId: string }[]>([]);
  const [loadingMonths, setLoadingMonths] = useState<Record<string, boolean>>({});
  const [fetchErrors, setFetchErrors] = useState<Record<string, string | null>>({});
  
  const [settings, setSettings] = useState({
    province: '',
    principalName: '',
    teacherName: '',
    reportDate: '',
  });

  const SETTINGS_STORAGE = 'stunity:monthly-report-print-settings:v1';

  // Only expose months backed by persisted grade/summary records. Calendar
  // defaults and hard-coded "current year" cutoffs can create empty or future
  // reports, so they must never drive document generation.
  const availableMonths = useMemo(() => {
    if (!transcript?.academicYears) return [];
    const records = new Map<string, { month: string; monthNumber: number; year: number; classId: string; label: string }>();
    const addRecord = (monthNumber: number | null | undefined, year: number | null | undefined, classId?: string, month?: string | null) => {
      if (!monthNumber || !year || !classId) return;
      const monthLabel = getKhmerMonthLabel(monthNumber) || month || `Month ${monthNumber}`;
      const key = `${classId}-${monthNumber}-${year}`;
      records.set(key, { month: monthLabel, monthNumber, year, classId, label: `${monthLabel} ${year}` });
    };

    transcript.monthlySummaries.forEach((summary) =>
      addRecord(summary.monthNumber, summary.year, summary.classId, summary.month)
    );
    transcript.academicYears.forEach((academicYear) => {
      academicYear.subjects.forEach((subject) => {
        subject.grades.forEach((grade) =>
          addRecord(grade.monthNumber, grade.year, academicYear.classId, grade.month)
        );
      });
    });

    const academicOrder = new Map<number, number>(
      KHMER_MONTHS.map((month, index): [number, number] => [month.number, index])
    );
    return [...records.values()].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (academicOrder.get(a.monthNumber) ?? 99) - (academicOrder.get(b.monthNumber) ?? 99);
    });
  }, [transcript]);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    
    const userData = TokenManager.getUserData();
    setSchool(userData?.school ?? null);
    setUserRole((userData as any)?.role || userData?.user?.role || '');
    setAuthReady(true);
  }, [locale, router]);

  const fetchTranscript = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${STUDENT_SERVICE_URL}/students/${studentId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal,
      });
      
      const data = await response.json().catch(() => null);
      
      if (response.ok && data?.success && Array.isArray(data?.data?.academicYears)) {
        setTranscript(data.data);
        if (data.data.academicYears.length > 0) {
          setSelectedYearId(data.data.academicYears[0].yearId);
        } else {
          setSelectedYearId('');
        }
      } else {
        throw new Error(data?.error || `Failed to load transcript (${response.status})`);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err.message || 'Failed to load transcript');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!authReady || !studentId) return;
    const controller = new AbortController();
    void fetchTranscript(controller.signal);
    return () => controller.abort();
  }, [authReady, fetchTranscript, studentId]);

  useEffect(() => {
    const fetchSchoolProfile = async () => {
      if (!school?.id) return;
      try {
        const res = await schoolAPI.getProfile(school.id);
        if (res.success && res.data) {
          setSchoolProfile(res.data);
          
          // Pre-populate settings from school profile and local storage
          const savedSettingsRaw = localStorage.getItem(`${SETTINGS_STORAGE}:${school.id}`);
          let savedSettings = {};
          if (savedSettingsRaw) {
            try {
              savedSettings = JSON.parse(savedSettingsRaw);
            } catch {
              /* ignore */
            }
          }
          
          setSettings((prev) => ({
            ...prev,
            province: res.data.province ? `ខេត្ត${res.data.province}` : (savedSettings as any).province || prev.province,
            teacherName: (savedSettings as any).teacherName || prev.teacherName,
            principalName: (savedSettings as any).principalName || prev.principalName,
            reportDate: (savedSettings as any).reportDate || prev.reportDate,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch school profile:', err);
      }
    };
    
    if (school) {
      fetchSchoolProfile();
    }
  }, [school]);

  // Persist settings to localStorage on change
  useEffect(() => {
    if (!school?.id) return;
    localStorage.setItem(`${SETTINGS_STORAGE}:${school.id}`, JSON.stringify(settings));
  }, [settings, school]);

  // Automatically select all months initially when transcript is loaded
  useEffect(() => {
    if (availableMonths.length > 0) {
      setSelectedMonths(availableMonths);
    }
  }, [availableMonths]);

  const handleGenerateReports = async () => {
    if (selectedMonths.length === 0) {
      setGeneratedMonths([]);
      return;
    }

    setHasGenerated(true);
    setGeneratedMonths(selectedMonths);

    const templateQuery = school?.educationModel === 'CUSTOM' ? 'KHM_MOEYS' : undefined;

    // Fetch only those that aren't already fetched
    const monthsToFetch = selectedMonths.filter((m) => {
      const alreadyFetched = reportDataList.some(
        (r) => r.classId === m.classId && r.monthNumber === m.monthNumber && r.year === m.year
      );
      return !alreadyFetched;
    });

    // Initialize loading and error states for new months
    const newLoadingStates: Record<string, boolean> = {};
    const newErrorStates: Record<string, string | null> = {};
    monthsToFetch.forEach((m) => {
      const key = `${m.classId}-${m.monthNumber}-${m.year}`;
      newLoadingStates[key] = true;
      newErrorStates[key] = null;
    });

    setLoadingMonths((prev) => ({ ...prev, ...newLoadingStates }));
    setFetchErrors((prev) => ({ ...prev, ...newErrorStates }));

    // Fetch in parallel
    const promises = monthsToFetch.map(async (m) => {
      const key = `${m.classId}-${m.monthNumber}-${m.year}`;
      try {
        const data = await gradeAPI.getMonthlyReport({
          scope: 'class',
          classId: m.classId,
          monthNumber: m.monthNumber,
          year: m.year,
          periodYear: m.year,
          format: 'summary',
          template: templateQuery,
        });
        if (!Array.isArray(data.students) || !data.students.some((student) => student.studentId === studentId)) {
          throw new Error(locale === 'km' ? 'មិនមានទិន្នន័យសិស្សក្នុងរបាយការណ៍ខែនេះទេ' : 'This student is missing from the monthly report');
        }

        const newReport = {
          month: m.month,
          monthNumber: m.monthNumber,
          year: m.year,
          classId: m.classId,
          data,
        };

        // Append to reportDataList progressively
        setReportDataList((prev) => {
          const filtered = prev.filter(
            (r) => !(r.classId === m.classId && r.monthNumber === m.monthNumber && r.year === m.year)
          );
          return [...filtered, newReport];
        });

        setLoadingMonths((prev) => ({ ...prev, [key]: false }));
      } catch (err: any) {
        console.error(`Failed to load monthly report for ${m.month} ${m.year}:`, err);
        setFetchErrors((prev) => ({ ...prev, [key]: err.message || 'Failed to load report' }));
        setLoadingMonths((prev) => ({ ...prev, [key]: false }));
      }
    });

    await Promise.allSettled(promises);
  };

  const handleRetryMonth = async (m: { month: string; monthNumber: number; year: number; classId: string }) => {
    const key = `${m.classId}-${m.monthNumber}-${m.year}`;
    setLoadingMonths((prev) => ({ ...prev, [key]: true }));
    setFetchErrors((prev) => ({ ...prev, [key]: null }));

    const templateQuery = school?.educationModel === 'CUSTOM' ? 'KHM_MOEYS' : undefined;

    try {
      const data = await gradeAPI.getMonthlyReport({
        scope: 'class',
        classId: m.classId,
        monthNumber: m.monthNumber,
        year: m.year,
        periodYear: m.year,
        format: 'summary',
        template: templateQuery,
      });
      if (!Array.isArray(data.students) || !data.students.some((student) => student.studentId === studentId)) {
        throw new Error(locale === 'km' ? 'មិនមានទិន្នន័យសិស្សក្នុងរបាយការណ៍ខែនេះទេ' : 'This student is missing from the monthly report');
      }

      const newReport = {
        month: m.month,
        monthNumber: m.monthNumber,
        year: m.year,
        classId: m.classId,
        data,
      };

      setReportDataList((prev) => {
        const filtered = prev.filter(
          (r) => !(r.classId === m.classId && r.monthNumber === m.monthNumber && r.year === m.year)
        );
        return [...filtered, newReport];
      });

      setLoadingMonths((prev) => ({ ...prev, [key]: false }));
    } catch (err: any) {
      console.error(`Failed to retry monthly report for ${m.month} ${m.year}:`, err);
      setFetchErrors((prev) => ({ ...prev, [key]: err.message || 'Failed to load report' }));
      setLoadingMonths((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleToggleMonth = (m: { month: string; monthNumber: number; year: number; classId: string }) => {
    setSelectedMonths((prev) => {
      const exists = prev.some((x) => x.classId === m.classId && x.monthNumber === m.monthNumber && x.year === m.year);
      if (exists) {
        return prev.filter((x) => !(x.classId === m.classId && x.monthNumber === m.monthNumber && x.year === m.year));
      } else {
        return [...prev, m];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedMonths(availableMonths);
  };

  const handleDeselectAll = () => {
    setSelectedMonths([]);
  };

  const selectedAcademicYear = transcript?.academicYears.find((year) => year.yearId === selectedYearId)
    ?? transcript?.academicYears[0];
  const selectedYearDocument = selectedYearId ? transcript?.documentMetaByYear?.[selectedYearId] : null;
  const isSelectedYearOfficial = selectedYearDocument?.status === 'OFFICIAL';
  const canPrintCumulative = Boolean(
    selectedAcademicYear?.subjects.some((subject) => subject.grades.length > 0)
  );
  const canIssueOfficial = Boolean(
    selectedAcademicYear
      && canPrintCumulative
      && !isSelectedYearOfficial
      && ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(userRole)
  );
  const printableMonthlyReports = generatedMonths
    .map((month) => reportDataList.find(
      (report) => report.classId === month.classId
        && report.monthNumber === month.monthNumber
        && report.year === month.year
    ))
    .filter((report): report is NonNullable<typeof report> => Boolean(report));
  const canPrintMonthly = generatedMonths.length > 0
    && printableMonthlyReports.length === generatedMonths.length
    && !Object.values(loadingMonths).some(Boolean)
    && generatedMonths.every((month) => !fetchErrors[`${month.classId}-${month.monthNumber}-${month.year}`]);
  const canPrint = activeTab === 'cumulative' ? canPrintCumulative : canPrintMonthly;

  const handlePrint = () => {
    if (canPrint) window.print();
  };

  const handleExportPDF = () => {
    if (canPrint) window.print();
  };

  const handleIssueOfficial = async () => {
    if (!selectedAcademicYear || !canIssueOfficial) return;

    const confirmed = window.confirm(
      locale === 'km'
        ? 'តើអ្នកចង់ចេញព្រឹត្តិបត្រពិន្ទុផ្លូវការសម្រាប់ឆ្នាំសិក្សានេះឬ? កំណត់ត្រានេះនឹងរក្សាទុកជាឯកសារ audit។'
        : 'Issue an official transcript for this academic year? This creates an auditable record.'
    );
    if (!confirmed) return;

    try {
      setIssuingOfficial(true);
      setIssueError(null);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${STUDENT_SERVICE_URL}/students/${studentId}/transcript/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ academicYearId: selectedAcademicYear.yearId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Failed to issue transcript (${response.status})`);
      }
      setTranscript((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documentMetaByYear: {
            ...(prev.documentMetaByYear || {}),
            [selectedAcademicYear.yearId]: {
              ...data.data,
              isOfficial: data.data.status === 'OFFICIAL',
              generatedAt: data.data.issuedAt,
            },
          },
        };
      });
    } catch (err: any) {
      setIssueError(err.message || (locale === 'km' ? 'មិនអាចចេញឯកសារផ្លូវការបានទេ' : 'Could not issue official transcript'));
    } finally {
      setIssuingOfficial(false);
    }
  };

  const handleRevokeOfficial = async () => {
    if (!selectedAcademicYear || !isSelectedYearOfficial) return;

    const reason = window.prompt(
      locale === 'km'
        ? 'សូមបញ្ចូលហេតុផលសម្រាប់ដកហូតឯកសារផ្លូវការនេះ'
        : 'Enter the reason for revoking this official transcript'
    );
    if (!reason?.trim()) return;

    try {
      setRevokingOfficial(true);
      setIssueError(null);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${STUDENT_SERVICE_URL}/students/${studentId}/transcript/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ academicYearId: selectedAcademicYear.yearId, reason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Failed to revoke transcript (${response.status})`);
      }
      setTranscript((prev) => {
        if (!prev) return prev;
        const nextDocuments = { ...(prev.documentMetaByYear || {}) };
        delete nextDocuments[selectedAcademicYear.yearId];
        return { ...prev, documentMetaByYear: nextDocuments };
      });
    } catch (err: any) {
      setIssueError(err.message || (locale === 'km' ? 'មិនអាចដកហូតឯកសារផ្លូវការបានទេ' : 'Could not revoke official transcript'));
    } finally {
      setRevokingOfficial(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
        <UnifiedNavigation />
        <main className="lg:ml-64 p-4 lg:p-8" aria-busy="true" aria-live="polite">
          <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
            <div className="h-5 w-64 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" aria-hidden="true" />
              <span><AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_62cb9bc3" /></span>
            </div>
            <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
              <div className="h-80 rounded-xl bg-white shadow-sm dark:bg-gray-900" />
              <div className="min-h-[520px] rounded-xl bg-white shadow-sm dark:bg-gray-900" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
        <UnifiedNavigation />
        <main className="lg:ml-64 p-4 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800"><AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_f18cbf09" /></h3>
              <p className="text-red-600">{error || 'Student not found'}</p>
              <div className="mt-3 flex flex-wrap gap-4">
                <button
                  onClick={() => void fetchTranscript()}
                  className="font-medium text-red-700 hover:underline"
                >
                  {locale === 'km' ? 'ព្យាយាមម្តងទៀត' : 'Try again'}
                </button>
                <button
                  onClick={() => router.back()}
                  className="text-red-700 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> <AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_0751d601" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { student, summary, academicYears } = transcript;
  const studentPhotoUrl = student.photo
    ? /^https?:\/\//.test(student.photo)
      ? student.photo
      : `${STUDENT_SERVICE_URL}${student.photo}`
    : null;

  const renderCumulativeCard = (isPrint: boolean) => {
    if (!transcript) return null;
    const selectedYear = academicYears.find(y => y.yearId === selectedYearId) || academicYears[0];
    if (!selectedYear) return null;
    const officialDocument = transcript.documentMetaByYear?.[selectedYear.yearId];
    const isOfficialDocument = officialDocument?.status === 'OFFICIAL';

    const provinceVal = schoolProfile?.province || settings.province || '';
    const cleanProvince = provinceVal.replace(/^(ខេត្ត៖|ខេត្ត)/, '').trim();
    const schoolName = schoolProfile?.nameKh || schoolProfile?.name || school?.name || '';
    const logoUrl = schoolProfile?.logoUrl || school?.logo || '';
    const signatureDate = settings.reportDate?.trim() || formatReportDate(cleanProvince || '');

    // Convert numbers to Khmer numerals
    const toKhmerNumerals = (num: number | string | null | undefined): string => {
      if (num === null || num === undefined) return '-';
      const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
      return String(num).replace(/[0-9]/g, (w) => khmerDigits[+w]);
    };

    // Sort subjects by MOEYS order
    const mappedSubjects = selectedYear.subjects.map((s: any) => ({
      ...s,
      code: s.subjectCode,
      nameKh: s.subjectNameKh || s.subjectName,
      name: s.subjectName,
    }));
    const sortedSubjects = sortSubjectsByOrder(mappedSubjects);

    // Only calculate from persisted grade records. Missing semester scores,
    // ranks and attendance periods remain blank; they are never synthesized.
    const subjectsData = sortedSubjects.map((subject: any) => {
      const calculation = calculateTranscriptSubject(subject);
      return {
        ...subject,
        maxScore: calculation.maxScore,
        s1Score: calculation.semester1Score,
        s1Rank: null,
        s2Score: calculation.semester2Score,
        s2Rank: null,
        annualScore: calculation.annualScore,
        annualRank: null,
        gradeLetter: calculation.gradeLetter,
        remark: calculation.remark,
        result: calculation.result,
        isComplete: calculation.isComplete,
      };
    });

    const sumWhenComplete = (values: Array<number | null>) =>
      values.length > 0 && values.every((value) => value !== null)
        ? values.reduce((sum, value) => sum + (value as number), 0)
        : null;
    const totalMax = sumWhenComplete(subjectsData.map((subject) => subject.maxScore));
    const totalS1 = sumWhenComplete(subjectsData.map((subject) => subject.s1Score));
    const totalS2 = sumWhenComplete(subjectsData.map((subject) => subject.s2Score));
    const totalAnnual = sumWhenComplete(subjectsData.map((subject) => subject.annualScore));
    const calculatedSummary = calculateTranscriptSummary(sortedSubjects as any[]);
    const s1ExamAvg = calculatedSummary.semester1Exam;
    const s2ExamAvg = calculatedSummary.semester2Exam;
    const annualExamAvg = calculatedSummary.annualExam;
    const s1MonthlyAvg = calculatedSummary.semester1Monthly;
    const s2MonthlyAvg = calculatedSummary.semester2Monthly;
    const annualMonthlyAvg = calculatedSummary.annualMonthly;
    const s1OverallAvg = calculatedSummary.semester1Overall;
    const s2OverallAvg = calculatedSummary.semester2Overall;
    const annualOverallAvg = calculatedSummary.annualOverall;
    const overallAvgPct = annualOverallAvg === null ? null : annualOverallAvg * 2;
    const overallGrade = overallAvgPct === null ? null : getLetterGrade(overallAvgPct);
    const overallRemark = overallGrade ? getKhmerRemark(overallGrade) : null;
    const overallResult = overallAvgPct === null ? null : overallAvgPct >= 50 ? 'ជាប់' : 'ធ្លាក់';
    const annualExcused = selectedYear.attendance?.excused ?? null;
    const annualUnexcused = selectedYear.attendance?.absent ?? null;

    const displayNumber = (value: number | null, digits = 2) =>
      value === null ? '-' : toKhmerNumerals(value.toFixed(digits));
    const displayAttendance = (value: number | null) =>
      value === null ? '-' : toKhmerNumerals(value.toString().padStart(2, '0'));

    return (
      <div className="khmer-transcript-print w-full bg-white text-black rounded-xl">
        <style>{`
          .transcript-moul-branding {
            font-family: var(--font-moul), "Khmer OS Muol Light", serif;
            font-size: 9.5px;
            line-height: 1.6;
            margin: 0;
          }
          .transcript-kingdom-text {
            font-family: var(--font-moul), "Khmer OS Muol Light", serif;
            font-size: 10px;
            line-height: 1.6;
            margin: 0;
          }
          .transcript-symbol-3 {
            font-family: "Tacteing", "Tacteng", "tactieng", serif;
            font-size: 20px;
            color: #000;
            margin-top: -2px;
            line-height: 1;
          }
          .cumulative-table th, .cumulative-table td {
            padding: 5px 3px !important;
          }
          .cumulative-attendance-table th, .cumulative-attendance-table td {
            padding: 6px 4px !important;
          }
        `}</style>
        <div className="transcript-page cumulative-transcript-page bg-white text-black border border-gray-200 shadow-sm" style={{ width: isPrint ? '210mm' : '100%', minHeight: isPrint ? '297mm' : 'auto', padding: isPrint ? '5mm' : '15px', boxSizing: 'border-box', position: 'relative' }}>
          
          {/* Formal MoEYS Double Border Frame */}
          <div className="cumulative-transcript-inner border-[3px] border-double border-black p-4 h-full flex flex-col justify-between" style={{ minHeight: isPrint ? '287mm' : 'auto' }}>
            <div className={`mb-2 border px-3 py-1.5 text-center text-[9px] font-bold ${
              isOfficialDocument ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-amber-500 bg-amber-50 text-amber-900'
            }`}>
              {isOfficialDocument
                ? `ឯកសារផ្លូវការ · លេខឯកសារ ${officialDocument?.documentNumber || '-'} · លេខផ្ទៀងផ្ទាត់ ${officialDocument?.verificationCode || '-'}`
                : 'សេចក្តីព្រាងសម្រាប់ពិនិត្យ · មិនមែនជាឯកសារផ្លូវការ'}
            </div>
            <div>
              {/* MoEYS Standard Header */}
              <div className="transcript-header-container flex justify-between items-start mb-3 relative">
                <div className="transcript-header-left text-left flex-1" style={{ paddingTop: logoUrl ? '0px' : '40px' }}>
                  {logoUrl && (
                    <div className="mb-1">
                      <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                    </div>
                  )}
                  <p className="transcript-moul-branding text-xs font-semibold text-black">
                    មន្ទីរអប់រំ យុវជន និងកីឡា{cleanProvince ? `ខេត្ត${cleanProvince}` : '...'}
                  </p>
                  <p className="transcript-moul-branding text-xs font-semibold text-black">
                    ការិយាល័យអប់រំ យុវជន និងកីឡា
                  </p>
                  <p className="transcript-moul-branding text-xs font-semibold text-black">
                    {schoolName}
                  </p>
                </div>

                {/* Royal Kingdom Branding */}
                <div className="transcript-header-right text-center w-[200px]" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '0px' }}>
                  <p className="transcript-kingdom-text text-sm font-semibold text-black">ព្រះរាជាណាចក្រកម្ពុជា</p>
                  <p className="transcript-kingdom-text text-sm font-semibold mt-0.5 text-black">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                  <p className="transcript-symbol-3 text-xl mt-0.5 text-black">3</p>
                </div>

                {/* Photo Box */}
                <div className="transcript-photo-placeholder w-[70px] h-[90px] border border-gray-400 flex flex-col items-center justify-center bg-gray-50 rounded select-none" style={{ marginTop: '40px' }}>
                  {studentPhotoUrl ? (
                    <img src={studentPhotoUrl} alt={student.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[7px] text-gray-500 font-bold">រូបថត ៣x៤</span>
                  )}
                </div>
              </div>

              {/* Main Title */}
              <div className="text-center mb-3">
                <h2 className="text-lg font-bold text-red-600 uppercase" style={{ fontFamily: 'var(--font-moul), serif' }}>
                  ព្រឹត្តិបត្រពិន្ទុរួម
                </h2>
                <p className="text-xs font-bold text-red-600 mt-0.5">
                  ឆ្នាំសិក្សា៖ {toKhmerNumerals(selectedYear.yearName)}
                </p>
                {isOfficialDocument && (
                  <p className="mt-1 text-[9px] font-semibold text-black">
                    Document No: {officialDocument?.documentNumber} · Verification: {officialDocument?.verificationCode}
                  </p>
                )}
              </div>

              {/* Student Details Grid */}
              <div className="border border-black p-3 rounded-lg mb-3 bg-transparent text-black">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                  <div>
                    <span className="font-semibold text-gray-700">គោត្តនាម-នាម៖</span>{' '}
                    <span className="font-bold">
                      {student.khmerName || [student.lastName, student.firstName].filter(Boolean).join(' ')} 
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">អត្តលេខសិស្ស៖</span>{' '}
                    <span className="font-bold">{toKhmerNumerals(student.studentId || 'N/A')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">ភេទ៖</span>{' '}
                    <span className="font-bold">
                      {student.gender?.toUpperCase() === 'FEMALE' || student.gender?.toUpperCase() === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">ថ្ងៃ ខែ ឆ្នាំកំណើត៖</span>{' '}
                    <span className="font-bold">
                      {student.dateOfBirth ? toKhmerNumerals(new Date(student.dateOfBirth).toLocaleDateString('km-KH')) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">ថ្នាក់៖</span>{' '}
                    <span className="font-bold">{toKhmerNumerals(selectedYear.className || summary.currentClass || 'N/A')}</span>
                  </div>
                </div>
              </div>

              {/* Academic Records Table */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-black border-b border-black pb-0.5 mb-2" style={{ fontFamily: 'var(--font-moul), serif' }}>
                  ក. លទ្ធផលនៃការសិក្សា
                </h3>
                
                <table className="cumulative-table w-full border-collapse border border-black text-[9px] text-black">
                  <thead>
                    <tr className="bg-gray-150 text-center font-bold">
                      <th className="border border-black p-0.5 w-[4%]" rowSpan={2}>ល-រ</th>
                      <th className="border border-black p-0.5 text-left pl-1" rowSpan={2}>មុខវិជ្ជា</th>
                      <th className="border border-black p-0.5 w-[8%]" rowSpan={2}>ពិន្ទុអតិបរមា</th>
                      <th className="border border-black p-0.5 w-[16%]" colSpan={2}>ឆមាសទី១</th>
                      <th className="border border-black p-0.5 w-[16%]" colSpan={2}>ឆមាសទី២</th>
                      <th className="border border-black p-0.5 w-[36%]" colSpan={5}>លទ្ធផលប្រចាំឆ្នាំសិក្សា</th>
                      <th className="border border-black p-0.5 w-[6%]" rowSpan={2}>ផ្សេងៗ</th>
                    </tr>
                    <tr className="bg-gray-150 text-center font-bold">
                      <th className="border border-black p-0.5">ពិន្ទុ</th>
                      <th className="border border-black p-0.5">ចំណាត់ថ្នាក់</th>
                      <th className="border border-black p-0.5">ពិន្ទុ</th>
                      <th className="border border-black p-0.5">ចំណាត់ថ្នាក់</th>
                      <th className="border border-black p-0.5">ពិន្ទុ</th>
                      <th className="border border-black p-0.5">ចំណាត់ថ្នាក់</th>
                      <th className="border border-black p-0.5">និទ្ទេស</th>
                      <th className="border border-black p-0.5">មូលវិចារ</th>
                      <th className="border border-black p-0.5">លទ្ធផល</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectsData.map((subject, idx) => (
                      <tr key={subject.subjectId} className="hover:bg-gray-55 text-center">
                        <td className="border border-black p-0.5 font-bold">{toKhmerNumerals(idx + 1)}</td>
                        <td className="border border-black p-0.5 text-left pl-1 font-medium">{subject.subjectNameKh || subject.subjectName}</td>
                        <td className="border border-black p-0.5">{subject.maxScore === null ? '-' : toKhmerNumerals(subject.maxScore)}</td>
                        <td className="border border-black p-0.5 font-semibold">{displayNumber(subject.s1Score, 1)}</td>
                        <td className="border border-black p-0.5 text-gray-700">-</td>
                        <td className="border border-black p-0.5 font-semibold">{displayNumber(subject.s2Score, 1)}</td>
                        <td className="border border-black p-0.5 text-gray-700">-</td>
                        <td className="border border-black p-0.5 font-bold">{displayNumber(subject.annualScore)}</td>
                        <td className="border border-black p-0.5 text-gray-700">-</td>
                        <td className="border border-black p-0.5 font-bold">{subject.gradeLetter || '-'}</td>
                        <td className="border border-black p-0.5">{subject.remark || '-'}</td>
                        <td className="border border-black p-0.5 font-semibold" style={{ color: subject.result === 'ធ្លាក់' ? '#dc2626' : 'inherit' }}>{subject.result || '-'}</td>
                        <td className="border border-black p-0.5 font-bold">-</td>
                      </tr>
                    ))}
                    
                    {/* Total Row */}
                    <tr className="bg-gray-100 font-bold text-center">
                      <td className="border border-black p-0.5" colSpan={2}>ពិន្ទុសរុប</td>
                      <td className="border border-black p-0.5">{displayNumber(totalMax, 0)}</td>
                      <td className="border border-black p-0.5">{displayNumber(totalS1, 1)}</td>
                      <td className="border border-black p-0.5 bg-gray-50">-</td>
                      <td className="border border-black p-0.5">{displayNumber(totalS2, 1)}</td>
                      <td className="border border-black p-0.5 bg-gray-50">-</td>
                      <td className="border border-black p-0.5">{displayNumber(totalAnnual)}</td>
                      <td className="border border-black p-0.5 bg-gray-50" colSpan={4}>-</td>
                      <td className="border border-black p-0.5">-</td>
                    </tr>

                    {/* Semester Exam Average Row */}
                    <tr className="font-semibold text-center">
                      <td className="border border-black p-0.5 text-left pl-1" colSpan={2}>មធ្យមភាគពិន្ទុប្រឡងឆមាស</td>
                      <td className="border border-black p-0.5">៥០</td>
                      <td className="border border-black p-0.5">{displayNumber(s1ExamAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-700">-</td>
                      <td className="border border-black p-0.5">{displayNumber(s2ExamAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-700">-</td>
                      <td className="border border-black p-0.5 font-bold">{displayNumber(annualExamAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-750" colSpan={5}>-</td>
                    </tr>

                    {/* Semester Monthly Average Row */}
                    <tr className="font-semibold text-center">
                      <td className="border border-black p-0.5 text-left pl-1" colSpan={2}>មធ្យមភាគពិន្ទុប្រចាំឆមាស</td>
                      <td className="border border-black p-0.5">៥០</td>
                      <td className="border border-black p-0.5">{displayNumber(s1MonthlyAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-700">-</td>
                      <td className="border border-black p-0.5">{displayNumber(s2MonthlyAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-700">-</td>
                      <td className="border border-black p-0.5 font-bold">{displayNumber(annualMonthlyAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-750" colSpan={5}>-</td>
                    </tr>

                    {/* Overall Semester/Annual Average Row */}
                    <tr className="font-bold text-center bg-gray-100">
                      <td className="border border-black p-0.5 text-left pl-1" colSpan={2}>មធ្យមភាគពិន្ទុរួមប្រចាំឆ្នាំ</td>
                      <td className="border border-black p-0.5">៥០</td>
                      <td className="border border-black p-0.5">{displayNumber(s1OverallAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-700">-</td>
                      <td className="border border-black p-0.5">{displayNumber(s2OverallAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-700">-</td>
                      <td className="border border-black p-0.5">{displayNumber(annualOverallAvg)}</td>
                      <td className="border border-black p-0.5 text-gray-700">-</td>
                      <td className="border border-black p-0.5">{overallGrade || '-'}</td>
                      <td className="border border-black p-0.5">{overallRemark || '-'}</td>
                      <td className="border border-black p-0.5" style={{ color: overallResult === 'ធ្លាក់' ? '#dc2626' : 'inherit' }}>{overallResult || '-'}</td>
                      <td className="border border-black p-0.5">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attendance Table */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-black border-b border-black pb-0.5 mb-2" style={{ fontFamily: 'var(--font-moul), serif' }}>
                  ខ. ចំនួនអវត្តមាន
                </h3>
                <table className="cumulative-attendance-table w-full text-center text-[9px] border-collapse border border-black text-black">
                  <thead>
                    <tr className="bg-gray-150 font-bold">
                      <th className="border border-black p-0.5 w-[25%]">អវត្តមាន</th>
                      <th className="border border-black p-0.5 w-[25%]">ប្រចាំឆមាសទី១</th>
                      <th className="border border-black p-0.5 w-[25%]">ប្រចាំឆមាសទី២</th>
                      <th className="border border-black p-0.5 w-[25%]">ប្រចាំឆ្នាំសិក្សា</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-0.5 font-medium">ច្បាប់</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5 font-bold">{displayAttendance(annualExcused)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 font-medium">អត់ច្បាប់</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5 font-bold">{displayAttendance(annualUnexcused)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Section */}
            <div className="transcript-signatures-container flex justify-between mt-4 text-[10px] text-black">
              <div className="signature-column text-center w-[200px]">
                <p className="margin-0 font-medium">បានឃើញ និងឯកភាព</p>
                <p className="signature-title font-bold mt-0.5" style={{ fontFamily: 'var(--font-moul), serif' }}>នាយកសាលា</p>
                <div className="h-[35px]" />
                <p className="signature-name font-bold" style={{ fontFamily: 'var(--font-moul), serif' }}>{settings.principalName || '________________'}</p>
              </div>

              <div className="signature-column text-center w-[200px]">
                <p className="margin-0 font-normal italic">{signatureDate}</p>
                <p className="signature-title font-bold mt-0.5" style={{ fontFamily: 'var(--font-moul), serif' }}>គ្រូបន្ទុកថ្នាក់</p>
                <div className="h-[35px]" />
                <p className="signature-name font-bold" style={{ fontFamily: 'var(--font-moul), serif' }}>{settings.teacherName || '________________'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <UnifiedNavigation />
      
      <main className="lg:ml-64 p-4 lg:p-8 print:ml-0 print:p-0">
        {/* Breadcrumb - hide on print */}
        <nav className="flex items-center text-sm text-gray-600 mb-6 print:hidden">
          <button onClick={() => router.push(`/${locale}/dashboard`)} className="hover:text-orange-600 flex items-center">
            <Home className="w-4 h-4 mr-1" /> {locale === 'km' ? 'ទំព័រដើម' : 'Home'}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push(`/${locale}/students`)} className="hover:text-orange-600">
            {locale === 'km' ? 'សិស្ស' : 'Students'}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push(`/${locale}/students/${studentId}`)} className="hover:text-orange-600">
            {[student.lastName, student.firstName].filter(Boolean).join(' ')}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 dark:text-white font-medium">{locale === 'km' ? 'ព្រឹត្តិបត្រពិន្ទុ' : 'Academic transcript'}</span>
        </nav>

        {/* Action Buttons - hide on print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            {locale === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
          </button>
          <div className="flex gap-2">
            {activeTab === 'cumulative' && (
              <>
                <button
                  onClick={handleIssueOfficial}
                  disabled={!canIssueOfficial || issuingOfficial}
                  title={!canIssueOfficial && !isSelectedYearOfficial ? (locale === 'km' ? 'ត្រូវការសិទ្ធិ admin និងពិន្ទុដែលបានរក្សាទុក' : 'Admin access and saved grades are required') : undefined}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {issuingOfficial ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                  {isSelectedYearOfficial
                    ? (locale === 'km' ? 'ផ្លូវការរួចហើយ' : 'Official')
                    : (locale === 'km' ? 'ចេញឯកសារផ្លូវការ' : 'Issue official')}
                </button>
                {isSelectedYearOfficial && ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(userRole) && (
                  <button
                    onClick={handleRevokeOfficial}
                    disabled={revokingOfficial}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-200 dark:border-red-900"
                  >
                    {revokingOfficial ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShieldOff className="w-5 h-5" />
                    )}
                    {locale === 'km' ? 'ដកហូត' : 'Revoke'}
                  </button>
                )}
              </>
            )}
            <button
              onClick={handlePrint}
              disabled={!canPrint}
              title={!canPrint ? (locale === 'km' ? 'មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់សម្រាប់បោះពុម្ព' : 'Complete data is required before printing') : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-5 h-5" />
              {locale === 'km' ? 'បោះពុម្ព' : 'Print'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!canPrint}
              title={!canPrint ? (locale === 'km' ? 'មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់សម្រាប់រក្សាទុក PDF' : 'Complete data is required before saving a PDF') : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-5 h-5" />
              {locale === 'km' ? 'រក្សាទុក PDF' : 'Export PDF'}
            </button>
          </div>
        </div>

        {issueError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 print:hidden" role="alert">
            {issueError}
          </div>
        )}

        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm print:hidden ${
          isSelectedYearOfficial
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
            : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
        }`} role="status">
          <div className="flex items-start gap-3">
            {isSelectedYearOfficial ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">
                {isSelectedYearOfficial
                  ? (locale === 'km' ? 'ឯកសារផ្លូវការបានចេញរួច' : 'Official transcript issued')
                  : (locale === 'km' ? 'ឯកសារព្រាងសម្រាប់ពិនិត្យ' : 'Review draft')}
              </p>
              <p className={`mt-0.5 ${isSelectedYearOfficial ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                {isSelectedYearOfficial
                  ? (locale === 'km'
                      ? `លេខឯកសារ៖ ${selectedYearDocument?.documentNumber || '-'} · លេខផ្ទៀងផ្ទាត់៖ ${selectedYearDocument?.verificationCode || '-'}`
                      : `Document No: ${selectedYearDocument?.documentNumber || '-'} · Verification: ${selectedYearDocument?.verificationCode || '-'}`)
                  : (locale === 'km'
                      ? 'ប្រព័ន្ធបង្ហាញតែពិន្ទុ និងវត្តមានដែលបានរក្សាទុកពិតប្រាកដ។ ក្រឡាដែលខ្វះទិន្នន័យត្រូវទុកសញ្ញា “-” ហើយមិនមានការប៉ាន់ស្មានពិន្ទុ ឬចំណាត់ថ្នាក់ទេ។'
                      : 'Only persisted grades and attendance are shown. Missing values remain blank; scores and ranks are never estimated.')}
              </p>
              {isSelectedYearOfficial && selectedYearDocument?.verificationCode && (
                <button
                  onClick={() => router.push(`/${locale}/transcripts/verify/${selectedYearDocument.verificationCode}`)}
                  className="mt-2 text-xs font-semibold underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-100"
                >
                  {locale === 'km' ? 'បើកទំព័រផ្ទៀងផ្ទាត់' : 'Open verification page'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher - hide on print */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 print:hidden" role="tablist" aria-label={locale === 'km' ? 'ប្រភេទព្រឹត្តិបត្រពិន្ទុ' : 'Transcript type'}>
          <button
            onClick={() => setActiveTab('cumulative')}
            role="tab"
            aria-selected={activeTab === 'cumulative'}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cumulative'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Award className="w-4 h-4" />
            {locale === 'km' ? 'ព្រឹត្តិបត្រពិន្ទុសរុប' : 'Cumulative transcript'}
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            role="tab"
            aria-selected={activeTab === 'monthly'}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'monthly'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            {locale === 'km' ? 'ព្រឹត្តិបត្រពិន្ទុប្រចាំខែ' : 'Monthly transcript'}
          </button>
        </div>

        {/* 1. Cumulative Transcript Layout (Screen View) */}
        {activeTab === 'cumulative' && (
          <div className="flex flex-col lg:flex-row gap-6 print:hidden">
            {/* Sidebar / Left Column */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Print Settings Card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {locale === 'km' ? 'ការកំណត់សម្រាប់បោះពុម្ព' : 'Print settings'}
                  </h3>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {locale === 'km' ? 'ឆ្នាំសិក្សា' : 'Academic year'}
                    </label>
                    <select
                      value={selectedYearId}
                      onChange={(e) => setSelectedYearId(e.target.value)}
                      disabled={academicYears.length === 0}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    >
                      {academicYears.map((y) => (
                        <option key={y.yearId} value={y.yearId} className="dark:bg-gray-950 text-black dark:text-white">
                          {y.yearName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {locale === 'km' ? 'រាជធានី/ខេត្ត' : 'Province'}
                    </label>
                    <input
                      type="text"
                      value={settings.province}
                      onChange={(e) => setSettings((prev) => ({ ...prev, province: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {locale === 'km' ? 'ឈ្មោះគ្រូបន្ទុកថ្នាក់' : 'Teacher name'}
                    </label>
                    <input
                      type="text"
                      value={settings.teacherName}
                      onChange={(e) => setSettings((prev) => ({ ...prev, teacherName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {locale === 'km' ? 'ឈ្មោះនាយកសាលា' : 'Principal name'}
                    </label>
                    <input
                      type="text"
                      value={settings.principalName}
                      onChange={(e) => setSettings((prev) => ({ ...prev, principalName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {tTranscript('signature_date') || 'Signature Date'}
                    </label>
                    <input
                      type="text"
                      value={settings.reportDate}
                      placeholder="e.g. ថ្ងៃទី២០ ខែឧសភា ឆ្នាំ២០២៦"
                      onChange={(e) => setSettings((prev) => ({ ...prev, reportDate: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Column */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-800 min-h-[500px] flex flex-col items-center justify-start overflow-auto">
              {canPrintCumulative ? (
                <div className="w-full overflow-auto p-4 flex flex-col items-center bg-gray-100 dark:bg-gray-950 rounded-lg">
                  <div className="scale-[0.8] origin-top md:scale-100 shadow-lg bg-white rounded-lg w-full max-w-[210mm]">
                    {renderCumulativeCard(false)}
                  </div>
                </div>
              ) : (
                <div className="my-auto max-w-md py-20 text-center" role="status">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-orange-500 dark:border-orange-900/50 dark:bg-orange-950/30">
                    <Award className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {locale === 'km' ? 'មិនទាន់មានពិន្ទុសម្រាប់ឆ្នាំសិក្សានេះ' : 'No grades for this academic year yet'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    {locale === 'km'
                      ? 'ព្រឹត្តិបត្រពិន្ទុមិនអាចបោះពុម្ពបានទេ រហូតដល់មានពិន្ទុដែលបានរក្សាទុក។ អ្នកនៅតែអាចជ្រើសរើសឆ្នាំសិក្សាផ្សេងទៀតបាន។'
                      : 'Printing stays disabled until persisted grades are available. You can select another academic year.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. Cumulative Transcript Print Container (Print View only) */}
        {activeTab === 'cumulative' && canPrintCumulative && (
          <div className="cumulative-print-container bg-white print:block hidden">
            {renderCumulativeCard(true)}
          </div>
        )}

        {/* 2. Monthly Transcripts Layout (Screen View) */}
        {activeTab === 'monthly' && (
          <div className="flex flex-col lg:flex-row gap-6 print:hidden">
            {/* Sidebar / Left Column */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Month Selection Card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {tTranscript('select_month_to_print') || 'Select month(s) to print:'}
                </h3>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md transition"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {availableMonths.map((m) => {
                    const item = { month: m.month, monthNumber: m.monthNumber, year: m.year, classId: m.classId };
                    const isChecked = selectedMonths.some(
                      (x) => x.classId === m.classId && x.monthNumber === m.monthNumber && x.year === m.year
                    );
                    
                    return (
                      <label
                        key={`${m.classId}-${m.monthNumber}-${m.year}`}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMonth(item)}
                          className="rounded text-orange-500 focus:ring-orange-400 border-gray-300 dark:border-gray-700 h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {m.month} {m.year}
                        </span>
                      </label>
                    );
                  })}
                  {availableMonths.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">No monthly scores available</p>
                  )}
                </div>
                
                {/* Generate Button */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleGenerateReports}
                    disabled={selectedMonths.length === 0 || Object.values(loadingMonths).some(Boolean)}
                    className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 text-sm"
                  >
                    {Object.values(loadingMonths).some(Boolean) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{locale === 'km' ? 'កំពុងបង្កើត...' : 'Generating...'}</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>{locale === 'km' ? 'បង្កើតព្រឹត្តិបត្រពិន្ទុ' : 'Generate Transcripts'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Print Settings Card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {tTranscript('print_settings') || 'Print Settings'}
                  </h3>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {tTranscript('province') || 'Province'}
                    </label>
                    <input
                      type="text"
                      value={settings.province}
                      onChange={(e) => setSettings((prev) => ({ ...prev, province: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {tTranscript('teacher_name') || 'Teacher Name'}
                    </label>
                    <input
                      type="text"
                      value={settings.teacherName}
                      onChange={(e) => setSettings((prev) => ({ ...prev, teacherName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {tTranscript('principal_name') || 'Principal Name'}
                    </label>
                    <input
                      type="text"
                      value={settings.principalName}
                      onChange={(e) => setSettings((prev) => ({ ...prev, principalName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {tTranscript('signature_date') || 'Signature Date'}
                    </label>
                    <input
                      type="text"
                      value={settings.reportDate}
                      placeholder="e.g. ថ្ងៃទី២០ ខែឧសភា ឆ្នាំ២០២៦"
                      onChange={(e) => setSettings((prev) => ({ ...prev, reportDate: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Column */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-800 min-h-[500px] flex flex-col items-center justify-start overflow-auto">
              {!hasGenerated ? (
                // 1. Initial Empty State / Call to Action
                <div className="text-center py-24 my-auto max-w-md">
                  <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500 shadow-sm border border-orange-100/50 dark:border-orange-950/50">
                    <Printer className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                    {locale === 'km' ? 'ព្រឹត្តិបត្រពិន្ទុប្រចាំខែ' : 'Monthly Academic Transcripts'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    {locale === 'km' 
                      ? 'សូមជ្រើសរើសខែសិក្សាពីរបារចំហៀងខាងឆ្វេង រួចចុចប៊ូតុង "បង្កើតព្រឹត្តិបត្រពិន្ទុ" ដើម្បីមើលនិងបោះពុម្ព។' 
                      : 'Please select academic months from the left sidebar and click "Generate Transcripts" to preview and print.'}
                  </p>
                </div>
              ) : generatedMonths.length === 0 ? (
                // 2. Empty State when user cleared selection and generated
                <div className="text-center py-20 my-auto text-gray-400">
                  <Printer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>
                    {locale === 'km' 
                      ? 'មិនមានខែណាមួយត្រូវបានជ្រើសរើសទេ។' 
                      : 'No months selected. Please select months and generate.'}
                  </p>
                </div>
              ) : (
                // 3. Progressive Render List
                <div className="w-full overflow-auto p-4 flex flex-col items-center gap-8 bg-gray-100 dark:bg-gray-950 rounded-lg">
                  {generatedMonths.map((m) => {
                    const key = `${m.classId}-${m.monthNumber}-${m.year}`;
                    const isLoading = loadingMonths[key];
                    const errorMsg = fetchErrors[key];
                    const report = reportDataList.find(
                      (r) => r.classId === m.classId && r.monthNumber === m.monthNumber && r.year === m.year
                    );

                    if (report) {
                      return (
                        <div key={`${m.classId}-${m.monthNumber}-${m.year}`} className="scale-[0.8] origin-top md:scale-100 shadow-lg bg-white rounded-lg w-full max-w-[210mm]">
                          <TranscriptPrint
                            report={report.data}
                            settings={settings}
                            schoolProfile={schoolProfile}
                            filterStudentId={studentId}
                            studentPhoto={studentPhotoUrl}
                            showDraftNotice
                          />
                        </div>
                      );
                    }

                    if (isLoading) {
                      return (
                        <div key={`${m.classId}-${m.monthNumber}-${m.year}`} className="w-full max-w-[210mm] aspect-[1/1.414] bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-8 flex flex-col justify-between animate-pulse">
                          {/* Skeleton Header */}
                          <div className="flex justify-between items-start w-full">
                            <div className="space-y-2 w-1/3">
                              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                            </div>
                            <div className="space-y-2 w-1/3 flex flex-col items-center">
                              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                            </div>
                            <div className="w-20 h-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
                          </div>
                          {/* Skeleton Title */}
                          <div className="space-y-2 w-full flex flex-col items-center my-6">
                            <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                          </div>
                          {/* Skeleton Table */}
                          <div className="flex-1 space-y-3 my-4">
                            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                            ))}
                          </div>
                          {/* Skeleton Footer */}
                          <div className="flex justify-between items-end w-full mt-6">
                            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                          </div>
                        </div>
                      );
                    }

                    if (errorMsg) {
                      return (
                        <div key={`${m.classId}-${m.monthNumber}-${m.year}`} className="w-full max-w-[210mm] aspect-[1/0.5] bg-white dark:bg-gray-900 rounded-lg shadow-md border border-red-200 dark:border-red-900/50 p-8 flex flex-col items-center justify-center text-center gap-4">
                          <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400" />
                          <div>
                            <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-1">
                              {locale === 'km' ? `ការបង្កើតបរាជ័យសម្រាប់ខែ${m.month}` : `Failed to load ${m.month}`}
                            </h5>
                            <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                          </div>
                          <button
                            onClick={() => handleRetryMonth(m)}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium text-xs rounded-lg border border-red-200 dark:border-red-900/50 transition"
                          >
                            {locale === 'km' ? 'ព្យាយាមឡើងវិញ' : 'Retry Month'}
                          </button>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Monthly Report Print Container (Print View only) */}
        {activeTab === 'monthly' && canPrintMonthly && (
          <div className="khmer-report-preview-container bg-white print:block hidden">
            {generatedMonths
              .map((m) => reportDataList.find((r) => r.classId === m.classId && r.monthNumber === m.monthNumber && r.year === m.year))
              .filter((r): r is NonNullable<typeof r> => !!r)
              .map((item, index, arr) => (
                <div
                  key={`${item.classId}-${item.monthNumber}-${item.year}`}
                  style={{ pageBreakAfter: index < arr.length - 1 ? 'always' : 'auto' }}
                >
                  <TranscriptPrint
                    report={item.data}
                    settings={settings}
                    schoolProfile={schoolProfile}
                    filterStudentId={studentId}
                    studentPhoto={studentPhotoUrl}
                    showDraftNotice
                  />
                </div>
              ))}
          </div>
        )}

        {/* Print Styles Dynamic Overrides */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body { 
              background: white !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
            
            nav, 
            aside, 
            header,
            footer,
            [class*="UnifiedNavigation"],
            [class*="PageSkeleton"],
            .print\\:hidden { 
              display: none !important; 
            }
            
            .lg\\:ml-64 { 
              margin-left: 0 !important; 
              width: 100% !important; 
            }
            main { 
              padding: 0 !important; 
              margin: 0 !important; 
              width: 100% !important; 
            }

            .cumulative-transcript-page {
              margin: 0 !important;
              padding: 5mm !important;
              border: none !important;
              box-shadow: none !important;
              width: 210mm !important;
              min-height: 297mm !important;
              height: 297mm !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              page-break-inside: avoid !important;
            }

            .cumulative-transcript-inner {
              min-height: 287mm !important;
              height: 287mm !important;
              box-sizing: border-box !important;
            }

            ${activeTab === 'cumulative' ? `
              .cumulative-print-container {
                display: block !important;
              }
              .khmer-report-preview-container {
                display: none !important;
              }
            ` : `
              .cumulative-print-container {
                display: none !important;
              }
              .khmer-report-preview-container {
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
              }
            `}
          }
        `}</style>
      </main>
    </div>
  );
}
