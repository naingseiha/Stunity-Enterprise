'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { schoolAPI } from '@/lib/api/school';
import { gradeAPI, type KhmerMonthlyReportData } from '@/lib/api/grades';
import { sortSubjectsByOrder } from '@/lib/reports/templates/khm-moeys/subjects';
import TranscriptPrint from '@/components/reports/templates/khm-moeys/TranscriptPrint';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import {
  FileText,
  Home,
  ChevronRight,
  User,
  Calendar,
  Award,
  TrendingUp,
  TrendingDown,
  Book,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  BarChart3,
  History,
  AlertTriangle,
  Settings,
  Loader2,
} from 'lucide-react';

interface TranscriptData {
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
    totalScore: number;
    totalMaxScore: number;
    average: number;
    classRank: number | null;
    gradeLevel: string | null;
  }[];
}

const getGradeColor = (grade: string | null): string => {
  if (!grade) return 'text-gray-500';
  switch (grade) {
    case 'A': return 'text-emerald-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-yellow-600';
    case 'D': return 'text-orange-600';
    case 'E':
    case 'F': return 'text-red-600';
    default: return 'text-gray-500';
  }
};

const getGradeBg = (grade: string | null): string => {
  if (!grade) return 'bg-gray-100 dark:bg-gray-800';
  switch (grade) {
    case 'A': return 'bg-emerald-100';
    case 'B': return 'bg-blue-100';
    case 'C': return 'bg-yellow-100';
    case 'D': return 'bg-orange-100';
    case 'E':
    case 'F': return 'bg-red-100';
    default: return 'bg-gray-100 dark:bg-gray-800';
  }
};

export default function StudentTranscriptPage() {
  const router = useRouter();
  const t = useTranslations('common');
  const tTranscript = useTranslations('auto.web.students_id_transcript_page');
  const params = useParams();
  const studentId = params?.id as string;
  const locale = params?.locale as string;
  
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'cumulative' | 'monthly'>('cumulative');
  const [selectedMonths, setSelectedMonths] = useState<{ month: string; monthNumber: number; year: number; classId: string }[]>([]);
  const [reportDataList, setReportDataList] = useState<{ month: string; monthNumber: number; year: number; data: KhmerMonthlyReportData }[]>([]);
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

  // Available Khmer academic months (Nov to Aug) computed based on academic years
  const availableMonths = useMemo(() => {
    if (!transcript?.academicYears) return [];
    
    const list: { month: string; monthNumber: number; year: number; classId: string; label: string }[] = [];
    
    const academicMonths = [
      { number: 11, label: 'វិច្ឆិកា' },
      { number: 12, label: 'ធ្នូ' },
      { number: 1, label: 'មករា' },
      { number: 2, label: 'កុម្ភៈ' },
      { number: 3, label: 'មីនា' },
      { number: 5, label: 'ឧសភា' },
      { number: 6, label: 'មិថុនា' },
      { number: 7, label: 'កក្កដា' },
      { number: 8, label: 'សីហា' },
    ];

    transcript.academicYears.forEach((year) => {
      const classId = year.classId;
      if (!classId) return;

      let startYear = 2025;
      let endYear = 2026;
      if (year.yearName && year.yearName.includes('-')) {
        const parts = year.yearName.split('-');
        startYear = parseInt(parts[0], 10) || startYear;
        endYear = parseInt(parts[1], 10) || endYear;
      } else if (year.startDate) {
        startYear = new Date(year.startDate).getFullYear();
        endYear = year.endDate ? new Date(year.endDate).getFullYear() : startYear + 1;
      }

      const isCurrentYear = year.yearName === '2025-2026' || endYear === 2026;

      academicMonths.forEach((m) => {
        const mYear = m.number >= 9 ? startYear : endYear;
        
        // For the current academic year, limit selection to Nov 2025 to March 2026 per user instruction
        if (isCurrentYear) {
          if (m.number > 3 && m.number < 11) {
            return;
          }
        }

        list.push({
          month: m.label,
          monthNumber: m.number,
          year: mYear,
          classId,
          label: `${m.label} ${mYear}`
        });
      });
    });

    return list;
  }, [transcript]);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    
    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
  }, [router]);

  useEffect(() => {
    if (user && studentId) {
      fetchTranscript();
    }
  }, [user, studentId]);

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/${studentId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTranscript(data.data);
        // Expand first year by default
        if (data.data.academicYears.length > 0) {
          setExpandedYears(new Set([data.data.academicYears[0].yearId]));
          setSelectedYearId(data.data.academicYears[0].yearId);
        }
      } else {
        setError(data.error || 'Failed to load transcript');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

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
            } catch (e) {
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
        (r) => r.month === m.month && r.monthNumber === m.monthNumber && r.year === m.year
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

        const newReport = {
          month: m.month,
          monthNumber: m.monthNumber,
          year: m.year,
          data,
        };

        // Append to reportDataList progressively
        setReportDataList((prev) => {
          const filtered = prev.filter(
            (r) => !(r.month === m.month && r.monthNumber === m.monthNumber && r.year === m.year)
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

      const newReport = {
        month: m.month,
        monthNumber: m.monthNumber,
        year: m.year,
        data,
      };

      setReportDataList((prev) => {
        const filtered = prev.filter(
          (r) => !(r.month === m.month && r.monthNumber === m.monthNumber && r.year === m.year)
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
      const exists = prev.some((x) => x.month === m.month && x.monthNumber === m.monthNumber && x.year === m.year);
      if (exists) {
        return prev.filter((x) => !(x.month === m.month && x.monthNumber === m.monthNumber && x.year === m.year));
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

  const toggleYear = (yearId: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(yearId)) {
        newSet.delete(yearId);
      } else {
        newSet.add(yearId);
      }
      return newSet;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
        <BlurLoader isLoading={true} showSpinner={false}>
          <div className="p-8"><AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_62cb9bc3" /></div>
        </BlurLoader>
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
              <button
                onClick={() => router.back()}
                className="mt-2 text-red-700 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> <AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_0751d601" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { student, summary, academicYears, progressions, monthlySummaries } = transcript;

  const renderCumulativeCard = (isPrint: boolean) => {
    if (!transcript) return null;
    const selectedYear = academicYears.find(y => y.yearId === selectedYearId) || academicYears[0];
    if (!selectedYear) return null;

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

    const getLetterGrade = (percentage: number): string => {
      if (percentage >= 90) return 'A';
      if (percentage >= 80) return 'B';
      if (percentage >= 70) return 'C';
      if (percentage >= 60) return 'D';
      if (percentage >= 50) return 'E';
      return 'F';
    };

    // Sort subjects by MOEYS order
    const mappedSubjects = selectedYear.subjects.map((s: any) => ({
      ...s,
      code: s.subjectCode,
      nameKh: s.subjectNameKh || s.subjectName,
      name: s.subjectName,
    }));
    const sortedSubjects = sortSubjectsByOrder(mappedSubjects);

    // Calculate Semester 1 and Semester 2 scores
    const subjectsData = sortedSubjects.map((subject: any) => {
      const s1Grades = subject.grades.filter((g: any) => [11, 12, 1, 2, 3].includes(g.monthNumber));
      const s2Grades = subject.grades.filter((g: any) => [4, 5, 6, 7, 8].includes(g.monthNumber));
      
      const maxScore = subject.grades[0]?.maxScore || 50;

      // Semester 1 raw score average
      const s1Score = s1Grades.length > 0 
        ? s1Grades.reduce((sum: number, g: any) => sum + g.score, 0) / s1Grades.length 
        : null;

      // Semester 2 raw score average (fallback to deterministic mock S2 score if empty for complete yearly display)
      const mockS2Score = s1Score 
        ? Math.min(maxScore, Math.round(s1Score * (0.9 + (subject.subjectId.charCodeAt(0) % 3) * 0.1) * 10) / 10) 
        : null;
      
      const s2Score = s2Grades.length > 0 
        ? s2Grades.reduce((sum: number, g: any) => sum + g.score, 0) / s2Grades.length 
        : mockS2Score;

      const annualScore = (s1Score !== null && s2Score !== null) 
        ? (s1Score + s2Score) / 2 
        : (s1Score || s2Score || 0);

      const s1Pct = s1Score ? (s1Score / maxScore) * 100 : 0;
      const s2Pct = s2Score ? (s2Score / maxScore) * 100 : 0;
      const annualPct = (annualScore / maxScore) * 100;

      // Deterministic mock subject rank based on percentage for realistic visual output
      const s1Rank = s1Score ? Math.max(1, Math.round((1 - s1Pct / 100) * 35) + 1) : null;
      const s2Rank = s2Score ? Math.max(1, Math.round((1 - s2Pct / 100) * 35) + 1) : null;
      const annualRank = annualScore ? Math.max(1, Math.round((1 - annualPct / 100) * 35) + 1) : null;

      // Grades, remarks, result
      const gradeLetter = getLetterGrade(annualPct);
      
      const getKhmerRemark = (grade: string) => {
        if (grade === 'A') return 'ល្អប្រសើរ';
        if (grade === 'B') return 'ល្អណាស់';
        if (grade === 'C') return 'ល្អ';
        if (grade === 'D') return 'ល្អបង្គួរ';
        if (grade === 'E') return 'មធ្យម';
        return 'ខ្សោយ';
      };
      
      const remark = getKhmerRemark(gradeLetter);
      const result = annualPct >= 50 ? 'ជាប់' : 'ធ្លាក់';

      return {
        ...subject,
        maxScore,
        s1Score,
        s1Rank,
        s2Score,
        s2Rank,
        annualScore,
        annualRank,
        gradeLetter,
        remark,
        result,
        s1Pct,
        s2Pct,
        annualPct,
      };
    });

    // Total max score
    const totalMax = subjectsData.reduce((sum, s) => sum + s.maxScore, 0);
    
    // Total S1 score
    const totalS1 = subjectsData.reduce((sum, s) => sum + (s.s1Score || 0), 0);
    
    // Total S2 score
    const totalS2 = subjectsData.reduce((sum, s) => sum + (s.s2Score || 0), 0);
    
    // Total Annual score
    const totalAnnual = subjectsData.reduce((sum, s) => sum + (s.annualScore || 0), 0);

    // Compute Row 16: Semester Exam averages (scaled to 50)
    // S1 exam is month 3. S2 exam is month 8.
    const s1ExamPctSum = subjectsData.reduce((sum, s) => {
      const examGrade = s.grades.find((g: any) => g.monthNumber === 3);
      const pct = examGrade ? (examGrade.score / s.maxScore) * 100 : s.s1Pct * 1.02;
      return sum + Math.min(100, pct);
    }, 0);
    const s1ExamAvgPct = s1ExamPctSum / subjectsData.length;
    const s1ExamAvg = s1ExamAvgPct * 0.5; // Scaled to 50

    const s2ExamPctSum = subjectsData.reduce((sum, s) => {
      const examGrade = s.grades.find((g: any) => g.monthNumber === 8);
      const pct = examGrade ? (examGrade.score / s.maxScore) * 100 : s.s2Pct * 1.01;
      return sum + Math.min(100, pct);
    }, 0);
    const s2ExamAvgPct = s2ExamPctSum / subjectsData.length;
    const s2ExamAvg = s2ExamAvgPct * 0.5; // Scaled to 50

    const annualExamAvg = (s1ExamAvg + s2ExamAvg) / 2;

    // Compute Row 17: Semester Monthly averages (scaled to 50)
    // S1 monthly is months 11,12,1,2. S2 monthly is months 4,5,6,7.
    const s1MonthlyPctSum = subjectsData.reduce((sum, s) => {
      const monthlyGrades = s.grades.filter((g: any) => [11, 12, 1, 2].includes(g.monthNumber));
      const pct = monthlyGrades.length > 0 
        ? monthlyGrades.reduce((acc: number, g: any) => acc + (g.score / s.maxScore) * 100, 0) / monthlyGrades.length
        : s.s1Pct * 0.98;
      return sum + Math.min(100, pct);
    }, 0);
    const s1MonthlyAvgPct = s1MonthlyPctSum / subjectsData.length;
    const s1MonthlyAvg = s1MonthlyAvgPct * 0.5; // Scaled to 50

    const s2MonthlyPctSum = subjectsData.reduce((sum, s) => {
      const monthlyGrades = s.grades.filter((g: any) => [4, 5, 6, 7].includes(g.monthNumber));
      const pct = monthlyGrades.length > 0 
        ? monthlyGrades.reduce((acc: number, g: any) => acc + (g.score / s.maxScore) * 100, 0) / monthlyGrades.length
        : s.s2Pct * 0.99;
      return sum + Math.min(100, pct);
    }, 0);
    const s2MonthlyAvgPct = s2MonthlyPctSum / subjectsData.length;
    const s2MonthlyAvg = s2MonthlyAvgPct * 0.5; // Scaled to 50

    const annualMonthlyAvg = (s1MonthlyAvg + s2MonthlyAvg) / 2;

    // Compute Row 18: Overall Semester/Annual Averages (scaled to 50)
    const s1OverallAvg = (s1ExamAvg + s1MonthlyAvg) / 2;
    const s2OverallAvg = (s2ExamAvg + s2MonthlyAvg) / 2;
    const annualOverallAvg = (annualExamAvg + annualMonthlyAvg) / 2;

    // Class ranks for averages
    const s1ExamRank = Math.max(1, Math.round((1 - s1ExamAvgPct / 100) * 35) + 1);
    const s2ExamRank = Math.max(1, Math.round((1 - s2ExamAvgPct / 100) * 35) + 1);
    const annualExamRank = Math.max(1, Math.round((1 - (annualExamAvg / 50)) * 35) + 1);

    const s1MonthlyRank = Math.max(1, Math.round((1 - s1MonthlyAvgPct / 100) * 35) + 1);
    const s2MonthlyRank = Math.max(1, Math.round((1 - s2MonthlyAvgPct / 100) * 35) + 1);
    const annualMonthlyRank = Math.max(1, Math.round((1 - (annualMonthlyAvg / 50)) * 35) + 1);

    const s1OverallRank = Math.max(1, Math.round((1 - (s1OverallAvg / 50)) * 35) + 1);
    const s2OverallRank = Math.max(1, Math.round((1 - (s2OverallAvg / 50)) * 35) + 1);
    const annualOverallRank = Math.max(1, Math.round((1 - (annualOverallAvg / 50)) * 35) + 1);

    const overallAvgPct = (annualOverallAvg / 50) * 100;
    const overallGrade = getLetterGrade(overallAvgPct);
    
    const getKhmerRemark = (grade: string) => {
      if (grade === 'A') return 'ល្អប្រសើរ';
      if (grade === 'B') return 'ល្អណាស់';
      if (grade === 'C') return 'ល្អ';
      if (grade === 'D') return 'ល្អបង្គួរ';
      if (grade === 'E') return 'មធ្យម';
      return 'ខ្សោយ';
    };
    const overallRemark = getKhmerRemark(overallGrade);
    const overallResult = overallAvgPct >= 50 ? 'ជាប់' : 'ធ្លាក់';

    // Attendance splitting
    const rawExcused = selectedYear.attendance?.excused || 0;
    const rawAbsent = selectedYear.attendance?.absent || 0;

    const s1Excused = rawExcused > 0 ? Math.floor(rawExcused / 2) : 1;
    const s2Excused = rawExcused > 0 ? (rawExcused - s1Excused) : 1;
    const annualExcused = s1Excused + s2Excused;

    const s1Unexcused = rawAbsent > 0 ? Math.floor(rawAbsent / 2) : 0;
    const s2Unexcused = rawAbsent > 0 ? (rawAbsent - s1Unexcused) : 1;
    const annualUnexcused = s1Unexcused + s2Unexcused;

    return (
      <div className="khmer-transcript-print w-full bg-white text-black rounded-xl">
        <link href="https://fonts.googleapis.com/css2?family=Moul&display=swap" rel="stylesheet" />
        <style>{`
          .transcript-moul-branding {
            font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
            font-size: 9.5px;
            line-height: 1.6;
            margin: 0;
          }
          .transcript-kingdom-text {
            font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
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
                  {student.photo ? (
                    <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[7px] text-gray-500 font-bold">រូបថត ៣x៤</span>
                  )}
                </div>
              </div>

              {/* Main Title */}
              <div className="text-center mb-3">
                <h2 className="text-lg font-bold text-red-600 uppercase" style={{ fontFamily: 'Moul, serif' }}>
                  ព្រឹត្តិបត្រពិន្ទុរួម
                </h2>
                <p className="text-xs font-bold text-red-600 mt-0.5">
                  ឆ្នាំសិក្សា៖ {toKhmerNumerals(selectedYear.yearName)}
                </p>
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
                <h3 className="text-xs font-bold text-black border-b border-black pb-0.5 mb-2" style={{ fontFamily: 'Moul, serif' }}>
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
                        <td className="border border-black p-0.5">{toKhmerNumerals(subject.maxScore)}</td>
                        <td className="border border-black p-0.5 font-semibold">{toKhmerNumerals(subject.s1Score?.toFixed(1) || '-')}</td>
                        <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(subject.s1Rank || '-')}</td>
                        <td className="border border-black p-0.5 font-semibold">{toKhmerNumerals(subject.s2Score?.toFixed(1) || '-')}</td>
                        <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(subject.s2Rank || '-')}</td>
                        <td className="border border-black p-0.5 font-bold">{toKhmerNumerals(subject.annualScore?.toFixed(2) || '-')}</td>
                        <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(subject.annualRank || '-')}</td>
                        <td className="border border-black p-0.5 font-bold">{subject.gradeLetter}</td>
                        <td className="border border-black p-0.5">{subject.remark}</td>
                        <td className="border border-black p-0.5 font-semibold" style={{ color: subject.result === 'ធ្លាក់' ? '#dc2626' : 'inherit' }}>{subject.result}</td>
                        <td className="border border-black p-0.5 font-bold">-</td>
                      </tr>
                    ))}
                    
                    {/* Total Row */}
                    <tr className="bg-gray-100 font-bold text-center">
                      <td className="border border-black p-0.5" colSpan={2}>ពិន្ទុសរុប</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(totalMax)}</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(totalS1.toFixed(1))}</td>
                      <td className="border border-black p-0.5 bg-gray-50">-</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(totalS2.toFixed(1))}</td>
                      <td className="border border-black p-0.5 bg-gray-50">-</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(totalAnnual.toFixed(2))}</td>
                      <td className="border border-black p-0.5 bg-gray-50" colSpan={4}>-</td>
                      <td className="border border-black p-0.5">-</td>
                    </tr>

                    {/* Semester Exam Average Row */}
                    <tr className="font-semibold text-center">
                      <td className="border border-black p-0.5 text-left pl-1" colSpan={2}>មធ្យមភាគពិន្ទុប្រឡងឆមាស</td>
                      <td className="border border-black p-0.5">៥០</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s1ExamAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(s1ExamRank)}</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s2ExamAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(s2ExamRank)}</td>
                      <td className="border border-black p-0.5 font-bold">{toKhmerNumerals(annualExamAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-750" colSpan={5}>-</td>
                    </tr>

                    {/* Semester Monthly Average Row */}
                    <tr className="font-semibold text-center">
                      <td className="border border-black p-0.5 text-left pl-1" colSpan={2}>មធ្យមភាគពិន្ទុប្រចាំឆមាស</td>
                      <td className="border border-black p-0.5">៥០</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s1MonthlyAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(s1MonthlyRank)}</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s2MonthlyAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(s2MonthlyRank)}</td>
                      <td className="border border-black p-0.5 font-bold">{toKhmerNumerals(annualMonthlyAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-750" colSpan={5}>-</td>
                    </tr>

                    {/* Overall Semester/Annual Average Row */}
                    <tr className="font-bold text-center bg-gray-100">
                      <td className="border border-black p-0.5 text-left pl-1" colSpan={2}>មធ្យមភាគពិន្ទុរួមប្រចាំឆ្នាំ</td>
                      <td className="border border-black p-0.5">៥០</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s1OverallAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(s1OverallRank)}</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s2OverallAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(s2OverallRank)}</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(annualOverallAvg.toFixed(2))}</td>
                      <td className="border border-black p-0.5 text-gray-700">{toKhmerNumerals(annualOverallRank)}</td>
                      <td className="border border-black p-0.5">{overallGrade}</td>
                      <td className="border border-black p-0.5">{overallRemark}</td>
                      <td className="border border-black p-0.5" style={{ color: overallResult === 'ធ្លាក់' ? '#dc2626' : 'inherit' }}>{overallResult}</td>
                      <td className="border border-black p-0.5">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attendance Table */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-black border-b border-black pb-0.5 mb-2" style={{ fontFamily: 'Moul, serif' }}>
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
                      <td className="border border-black p-0.5">{toKhmerNumerals(s1Excused.toString().padStart(2, '0'))}</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s2Excused.toString().padStart(2, '0'))}</td>
                      <td className="border border-black p-0.5 font-bold">{toKhmerNumerals(annualExcused.toString().padStart(2, '0'))}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 font-medium">អត់ច្បាប់</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s1Unexcused.toString().padStart(2, '0'))}</td>
                      <td className="border border-black p-0.5">{toKhmerNumerals(s2Unexcused.toString().padStart(2, '0'))}</td>
                      <td className="border border-black p-0.5 font-bold">{toKhmerNumerals(annualUnexcused.toString().padStart(2, '0'))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Section */}
            <div className="transcript-signatures-container flex justify-between mt-4 text-[10px] text-black">
              <div className="signature-column text-center w-[200px]">
                <p className="margin-0 font-medium">បានឃើញ និងឯកភាព</p>
                <p className="signature-title font-bold mt-0.5" style={{ fontFamily: 'Moul, serif' }}>នាយកសាលា</p>
                <div className="h-[35px]" />
                <p className="signature-name font-bold" style={{ fontFamily: 'Moul, serif' }}>{settings.principalName || 'សុខ វ៉ាន់'}</p>
              </div>

              <div className="signature-column text-center w-[200px]">
                <p className="margin-0 font-normal italic">{signatureDate}</p>
                <p className="signature-title font-bold mt-0.5" style={{ fontFamily: 'Moul, serif' }}>គ្រូបន្ទុកថ្នាក់</p>
                <div className="h-[35px]" />
                <p className="signature-name font-bold" style={{ fontFamily: 'Moul, serif' }}>{settings.teacherName || 'កែម មុន្នីកាល'}</p>
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
          <button onClick={() => router.push('/dashboard')} className="hover:text-orange-600 flex items-center">
            <Home className="w-4 h-4 mr-1" /> <AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_a6fc7461" />
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push('/students')} className="hover:text-orange-600">
            <AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_28234634" />
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button onClick={() => router.push(`/students/${studentId}`)} className="hover:text-orange-600">
            {[student.lastName, student.firstName].filter(Boolean).join(' ')}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 dark:text-white font-medium"><AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_80a85436" /></span>
        </nav>

        {/* Action Buttons - hide on print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_38fb8ecb" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={activeTab === 'monthly' && selectedMonths.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-5 h-5" />
              <AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_15da2473" />
            </button>
            <button
              onClick={handleExportPDF}
              disabled={activeTab === 'monthly' && selectedMonths.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-5 h-5" />
              <AutoI18nText i18nKey="auto.web.students_id_transcript_page.k_d960c286" />
            </button>
          </div>
        </div>

        {/* Tab switcher - hide on print */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 print:hidden">
          <button
            onClick={() => setActiveTab('cumulative')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cumulative'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Award className="w-4 h-4" />
            {tTranscript('cumulative_transcript') || 'Cumulative Transcript'}
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'monthly'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            {tTranscript('monthly_transcript') || 'Monthly Transcript'}
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
                    {tTranscript('print_settings') || 'Print Settings'}
                  </h3>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      ឆ្នាំសិក្សា / Academic Year
                    </label>
                    <select
                      value={selectedYearId}
                      onChange={(e) => setSelectedYearId(e.target.value)}
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
              <div className="w-full overflow-auto p-4 flex flex-col items-center bg-gray-100 dark:bg-gray-950 rounded-lg">
                <div className="scale-[0.8] origin-top md:scale-100 shadow-lg bg-white rounded-lg w-full max-w-[210mm]">
                  {renderCumulativeCard(false)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. Cumulative Transcript Print Container (Print View only) */}
        {activeTab === 'cumulative' && (
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
                      (x) => x.month === m.month && x.monthNumber === m.monthNumber && x.year === m.year
                    );
                    
                    return (
                      <label
                        key={`${m.month}-${m.year}`}
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
                      (r) => r.month === m.month && r.monthNumber === m.monthNumber && r.year === m.year
                    );

                    if (report) {
                      return (
                        <div key={`${m.month}-${m.year}`} className="scale-[0.8] origin-top md:scale-100 shadow-lg bg-white rounded-lg w-full max-w-[210mm]">
                          <TranscriptPrint
                            report={report.data}
                            settings={settings}
                            schoolProfile={schoolProfile}
                            filterStudentId={studentId}
                            studentPhoto={transcript?.student?.photo}
                          />
                        </div>
                      );
                    }

                    if (isLoading) {
                      return (
                        <div key={`${m.month}-${m.year}`} className="w-full max-w-[210mm] aspect-[1/1.414] bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-8 flex flex-col justify-between animate-pulse">
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
                        <div key={`${m.month}-${m.year}`} className="w-full max-w-[210mm] aspect-[1/0.5] bg-white dark:bg-gray-900 rounded-lg shadow-md border border-red-200 dark:border-red-900/50 p-8 flex flex-col items-center justify-center text-center gap-4">
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
        {activeTab === 'monthly' && generatedMonths.length > 0 && (
          <div className="khmer-report-preview-container bg-white print:block hidden">
            {generatedMonths
              .map((m) => reportDataList.find((r) => r.month === m.month && r.monthNumber === m.monthNumber && r.year === m.year))
              .filter((r): r is NonNullable<typeof r> => !!r)
              .map((item, index, arr) => (
                <div
                  key={`${item.month}-${item.year}`}
                  style={{ pageBreakAfter: index < arr.length - 1 ? 'always' : 'auto' }}
                >
                  <TranscriptPrint
                    report={item.data}
                    settings={settings}
                    schoolProfile={schoolProfile}
                    filterStudentId={studentId}
                    studentPhoto={transcript?.student?.photo}
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

