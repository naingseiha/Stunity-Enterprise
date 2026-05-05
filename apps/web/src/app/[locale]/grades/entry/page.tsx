'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { gradeAPI, GradeGridItem } from '@/lib/api/grades';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import {
  Download,
  Upload,
  Trash2,
  Calculator,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Home,
  ChevronRight,
  ClipboardList,
  Zap,
  Award,
  Edit3,
} from 'lucide-react';

interface GradeEntry {
  studentId: string;
  score: number | null;
  remarks: string;
  isModified: boolean;
}

interface Statistics {
  average: number;
  highest: number;
  lowest: number;
  passRate: number;
}

export default function GradeEntryPage() {
    const autoT = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { selectedYear, allYears, setSelectedYear } = useAcademicYear();
  const [user, setUser] = useState<any>(null);
  
  // The academic year from context
  const selectedAcademicYear = selectedYear?.id || '';
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  
  // Grid data
  const [gridData, setGridData] = useState<GradeGridItem[]>([]);
  const [gradeEntries, setGradeEntries] = useState<Map<string, GradeEntry>>(new Map());
  const [loadingGrid, setLoadingGrid] = useState(false);
  
  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Focus and navigation
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  
  // Quick fill state
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [quickFillScore, setQuickFillScore] = useState<string>('');
  
  // Statistics
  const [statistics, setStatistics] = useState<Statistics>({
    average: 0,
    highest: 0,
    lowest: 0,
    passRate: 0,
  });

  // Check authentication - client side only to avoid hydration mismatch
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    
    const userData = TokenManager.getUserData();
    setUser(userData.user);
  }, [locale, router]);

  const { classes } = useClasses({
    academicYearId: selectedAcademicYear || undefined,
    limit: 100,
  });
  const selectedClassObj = classes.find((cls) => cls.id === selectedClass);
  const { subjects } = useSubjects(
    selectedClassObj
      ? {
          grade: String(selectedClassObj.grade),
          isActive: true,
        }
      : undefined
  );

  useEffect(() => {
    if (selectedClass && !classes.some((cls) => cls.id === selectedClass)) {
      setSelectedClass('');
      setSelectedSubject('');
      setGridData([]);
      setGradeEntries(new Map());
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (selectedSubject && !subjects.some((subject) => subject.id === selectedSubject)) {
      setSelectedSubject('');
      setGridData([]);
      setGradeEntries(new Map());
    }
  }, [selectedSubject, subjects]);

  // Load grades grid
  const loadGrades = async () => {
    if (!selectedClass || !selectedSubject) {
      alert('Please select class and subject');
      return;
    }

    try {
      setLoadingGrid(true);
      const monthStr = `Month ${selectedMonth}`;
      const data = await gradeAPI.getGradeGrid(selectedClass, selectedSubject, monthStr);
      setGridData(data);
      
      // Initialize grade entries
      const entries = new Map<string, GradeEntry>();
      data.forEach(item => {
        entries.set(item.student.id, {
          studentId: item.student.id,
          score: item.grade?.score ?? null,
          remarks: item.grade?.remarks ?? '',
          isModified: false,
        });
      });
      setGradeEntries(entries);
      
      calculateStatistics(data);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to load grades:', error);
      alert('Failed to load grades. Please try again.');
    } finally {
      setLoadingGrid(false);
    }
  };

  // Calculate statistics
  const calculateStatistics = (data: GradeGridItem[]) => {
    const scores = data
      .map(item => item.grade?.score)
      .filter((score): score is number => score !== null && score !== undefined);
    
    if (scores.length === 0) {
      setStatistics({ average: 0, highest: 0, lowest: 0, passRate: 0 });
      return;
    }

    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    
    const subject = subjects.find(s => s.id === selectedSubject);
    const maxScore = subject?.maxScore || 100;
    const passingScore = maxScore * 0.5;
    const passCount = scores.filter(s => s >= passingScore).length;
    const passRate = (passCount / scores.length) * 100;

    setStatistics({ average, highest, lowest, passRate });
  };

  // Handle score change
  const handleScoreChange = (studentId: string, value: string) => {
    const subject = subjects.find(s => s.id === selectedSubject);
    const maxScore = subject?.maxScore || 100;
    
    const numValue = value === '' ? null : parseFloat(value);
    
    // Validation
    if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > maxScore)) {
      return;
    }

    const newEntries = new Map(gradeEntries);
    const entry = newEntries.get(studentId);
    if (entry) {
      entry.score = numValue;
      entry.isModified = true;
      newEntries.set(studentId, entry);
      setGradeEntries(newEntries);
      setHasUnsavedChanges(true);
      
      // Trigger auto-save
      debouncedSave();
    }
  };

  // Handle remarks change
  const handleRemarksChange = (studentId: string, value: string) => {
    const newEntries = new Map(gradeEntries);
    const entry = newEntries.get(studentId);
    if (entry) {
      entry.remarks = value;
      entry.isModified = true;
      newEntries.set(studentId, entry);
      setGradeEntries(newEntries);
      setHasUnsavedChanges(true);
      
      debouncedSave();
    }
  };

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveGrades();
    }, 2000);
  }, [gradeEntries]);

  // Save grades
  const saveGrades = async () => {
    const modifiedEntries = Array.from(gradeEntries.values()).filter(e => e.isModified);
    
    if (modifiedEntries.length === 0) return;

    try {
      setSaveStatus('saving');
      
      const subject = subjects.find(s => s.id === selectedSubject);
      const maxScore = subject?.maxScore || 100;
      const monthStr = `Month ${selectedMonth}`;
      const year = new Date().getFullYear();
      
      const grades = modifiedEntries
        .filter(e => e.score !== null)
        .map(e => ({
          studentId: e.studentId,
          subjectId: selectedSubject,
          classId: selectedClass,
          score: e.score!,
          maxScore,
          month: monthStr,
          monthNumber: selectedMonth,
          year,
          remarks: e.remarks || undefined,
        }));
      
      await gradeAPI.batchGrades(grades);
      
      // Reset modified flags
      const newEntries = new Map(gradeEntries);
      modifiedEntries.forEach(e => {
        const entry = newEntries.get(e.studentId);
        if (entry) {
          entry.isModified = false;
          newEntries.set(e.studentId, entry);
        }
      });
      setGradeEntries(newEntries);
      
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // Refresh grid to get calculated values
      await loadGrades();
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save grades:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Calculate grade level
  const getGradeLevel = (score: number | null, maxScore: number): string => {
    if (score === null) return '-';
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    if (percentage >= 50) return 'E';
    return 'F';
  };

  // Calculate percentage
  const getPercentage = (score: number | null, maxScore: number): number => {
    if (score === null) return 0;
    return (score / maxScore) * 100;
  };

  // Keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentId: string,
    field: 'score' | 'remarks'
  ) => {
    const currentIndex = gridData.findIndex(item => item.student.id === studentId);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex < gridData.length - 1) {
        const nextStudentId = gridData[currentIndex + 1].student.id;
        const key = `${nextStudentId}-${field}`;
        inputRefs.current.get(key)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < gridData.length - 1) {
        const nextStudentId = gridData[currentIndex + 1].student.id;
        const key = `${nextStudentId}-${field}`;
        inputRefs.current.get(key)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        const prevStudentId = gridData[currentIndex - 1].student.id;
        const key = `${prevStudentId}-${field}`;
        inputRefs.current.get(key)?.focus();
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      if (field === 'score') {
        e.preventDefault();
        const key = `${studentId}-remarks`;
        inputRefs.current.get(key)?.focus();
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      if (field === 'remarks') {
        e.preventDefault();
        const key = `${studentId}-score`;
        inputRefs.current.get(key)?.focus();
      }
    } else if (e.key === 'Escape') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Download template
  const downloadTemplate = async () => {
    if (!selectedClass || !selectedSubject) {
      alert('Please select class and subject');
      return;
    }

    try {
      const blob = await gradeAPI.downloadTemplate(selectedClass, selectedSubject);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grade_template_${selectedClass}_${selectedSubject}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template');
    }
  };

  // Calculate class averages
  const calculateClassAverages = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }

    try {
      const monthStr = `Month ${selectedMonth}`;
      await gradeAPI.calculateAverages(selectedClass, monthStr);
      alert('Class averages calculated successfully!');
      await loadGrades();
    } catch (error) {
      console.error('Failed to calculate averages:', error);
      alert('Failed to calculate class averages');
    }
  };

  // Clear all grades
  const clearAllGrades = () => {
    if (!confirm('Are you sure you want to clear all grades? This action cannot be undone.')) {
      return;
    }

    const newEntries = new Map(gradeEntries);
    newEntries.forEach((entry, studentId) => {
      entry.score = null;
      entry.remarks = '';
      entry.isModified = true;
      newEntries.set(studentId, entry);
    });
    setGradeEntries(newEntries);
    setHasUnsavedChanges(true);
    debouncedSave();
  };

  // Quick fill all empty scores
  const quickFillEmptyScores = (score: number) => {
    const newEntries = new Map(gradeEntries);
    let filledCount = 0;
    
    newEntries.forEach((entry, studentId) => {
      if (entry.score === null || entry.score === undefined) {
        entry.score = score;
        entry.isModified = true;
        newEntries.set(studentId, entry);
        filledCount++;
      }
    });
    
    if (filledCount > 0) {
      setGradeEntries(newEntries);
      setHasUnsavedChanges(true);
      debouncedSave();
    }
    
    setShowQuickFill(false);
    setQuickFillScore('');
    return filledCount;
  };

  // Quick fill all scores (overwrite)
  const quickFillAllScores = (score: number) => {
    const newEntries = new Map(gradeEntries);
    
    newEntries.forEach((entry, studentId) => {
      entry.score = score;
      entry.isModified = true;
      newEntries.set(studentId, entry);
    });
    
    setGradeEntries(newEntries);
    setHasUnsavedChanges(true);
    debouncedSave();
    setShowQuickFill(false);
    setQuickFillScore('');
  };

  // Export to Excel
  const exportToExcel = () => {
    const subject = subjects.find(s => s.id === selectedSubject);
    const maxScore = subject?.maxScore || 100;
    
    let csv = 'Student ID,Name,Score,Max Score,Percentage,Grade,Remarks\n';
    
    gridData.forEach(item => {
      const entry = gradeEntries.get(item.student.id);
      const score = entry?.score ?? '';
      const remarks = entry?.remarks ?? '';
      const percentage = score ? getPercentage(score as number, maxScore).toFixed(1) : '';
      const grade = score ? getGradeLevel(score as number, maxScore) : '';
      
      csv += `${item.student.studentId || ''},${item.student.firstName} ${item.student.lastName},${score},${maxScore},${percentage},${grade},"${remarks}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${selectedClass}_${selectedSubject}_month${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Warn before leaving
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

  const subject = subjects.find(s => s.id === selectedSubject);
  const maxScore = subject?.maxScore || 100;
  const selectedYearLabel = selectedYear?.name || 'Choose academic year';
  const selectedClassName = selectedClassObj?.name || 'Choose class';
  const selectedSubjectName = subject?.name || 'Choose subject';
  const monthLabel = `Month ${selectedMonth}`;
  const modifiedCount = Array.from(gradeEntries.values()).filter((entry) => entry.isModified).length;
  const scoredCount = Array.from(gradeEntries.values()).filter(
    (entry) => entry.score !== null && entry.score !== undefined
  ).length;
  const completionRate = gridData.length > 0 ? Math.round((scoredCount / gridData.length) * 100) : 0;
  const pulseValue = gridData.length > 0 ? `${completionRate}%` : '0%';
  const pulseLabel = loadingGrid
    ? 'Loading current grade ledger'
    : gridData.length > 0
      ? `${scoredCount} of ${gridData.length} learners scored`
      : 'Select class and subject to begin';
  const metricCards = [
    {
      label: 'Loaded',
      value: gridData.length,
      hint: 'Students in grid',
      tone: 'from-sky-500 via-blue-500 to-cyan-500',
      accent: 'text-white',
      Icon: ClipboardList,
    },
    {
      label: 'Completed',
      value: scoredCount,
      hint: 'Scores recorded',
      tone: 'from-emerald-500 via-teal-500 to-cyan-500',
      accent: 'text-white',
      Icon: CheckCircle,
    },
    {
      label: 'Modified',
      value: modifiedCount,
      hint: 'Pending autosave',
      tone: 'from-violet-500 via-fuchsia-500 to-pink-500',
      accent: 'text-white',
      Icon: Edit3,
    },
    {
      label: 'Average',
      value: `${statistics.average.toFixed(1)}%`,
      hint: 'Current class average',
      tone: 'from-orange-500 via-amber-500 to-rose-500',
      accent: 'text-white',
      Icon: Award,
    },
  ];

  return (
    <>
      <UnifiedNavigation user={user} />

      {showQuickFill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-5 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-blue-100 bg-white animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-gray-800/80 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_b0bc2820" /></p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_75d88b20" /></h3>
                <p className="mt-1.5 text-sm text-slate-600"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_d567d46d" /></p>
              </div>
              <button
                onClick={() => {
                  setShowQuickFill(false);
                  setQuickFillScore('');
                }}
                className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 transition hover:border-slate-300 dark:border-gray-700 hover:text-slate-700 dark:text-gray-200"
              >
                <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_7a498faf" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_ef360751" /></p>
                    <p className="mt-2 text-sm text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_2906e644" /> {maxScore}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">
                    <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_e4ee22d7" /> {maxScore}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={maxScore}
                  step="0.5"
                  value={quickFillScore}
                  onChange={(e) => setQuickFillScore(e.target.value)}
                  className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-5 py-4 text-center text-2xl font-semibold text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="0.0"
                  autoFocus
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    const score = parseFloat(quickFillScore);
                    if (!isNaN(score) && score >= 0 && score <= maxScore) {
                      const count = quickFillEmptyScores(score);
                      if (count === 0) alert('No empty score cells to fill.');
                    } else {
                      alert(`Please enter a valid score between 0 and ${maxScore}.`);
                    }
                  }}
                  disabled={!quickFillScore}
                  className="rounded-lg bg-blue-600 px-4 py-4 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_e9f71a79" />
                </button>
                <button
                  onClick={() => {
                    const score = parseFloat(quickFillScore);
                    if (!isNaN(score) && score >= 0 && score <= maxScore) {
                      if (confirm('This will overwrite all current scores. Continue?')) {
                        quickFillAllScores(score);
                      }
                    } else {
                      alert(`Please enter a valid score between 0 and ${maxScore}.`);
                    }
                  }}
                  disabled={!quickFillScore}
                  className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 dark:text-gray-200 transition hover:border-slate-300 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_d7ea5387" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {saveStatus !== 'idle' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-300">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-blue-950/10 backdrop-blur-xl ${
              saveStatus === 'saving'
                ? 'border-blue-200 bg-white text-blue-700'
                : saveStatus === 'saved'
                  ? 'border-emerald-300 bg-white dark:bg-gray-900/95 text-emerald-700'
                  : 'border-rose-300 bg-white dark:bg-gray-900/95 text-rose-700'
            }`}
          >
            <div className="rounded-xl bg-slate-950/5 p-2">
              {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle className="h-4 w-4" />}
              {saveStatus === 'error' && <XCircle className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em]">
                {saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Error'}
              </p>
              <p className="text-xs text-slate-500">
                {saveStatus === 'saving'
                  ? 'Syncing recent grade changes'
                  : saveStatus === 'saved'
                    ? 'The grade ledger is up to date'
                    : 'Please retry the last change'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)] text-slate-900 transition-colors duration-500 lg:ml-64">
        <main className="mx-auto max-w-[1600px] p-4 lg:p-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500/70">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-slate-600">
                    <Home className="h-3.5 w-3.5" />
                    Grades
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-slate-900">Entry</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    {autoT("auto.web.locale_grades_entry_page.k_b41bad1f")}
                  </h1>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-800">
                    {selectedYearLabel}
                  </div>
                  <div className="rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-800">
                    {selectedClassName}
                  </div>
                  <div className="rounded-full border border-violet-200/70 bg-violet-50/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-violet-800">
                    {selectedSubjectName}
                  </div>
                </div>

                <div className="mt-5 hidden grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-900">{selectedYearLabel}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Year</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-900">{selectedClassName}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Class</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-900">{selectedSubjectName}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Subject</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={loadGrades}
                    disabled={!selectedClass || !selectedSubject || loadingGrid}
                    className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingGrid ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                    {loadingGrid ? 'Loading' : 'Load Ledger'}
                  </button>
                  <button
                    onClick={downloadTemplate}
                    disabled={!selectedClass || !selectedSubject}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 text-indigo-600" />
                    Template
                  </button>
                  <button
                    onClick={exportToExcel}
                    disabled={gridData.length === 0}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 text-indigo-600" />
                    Export
                  </button>
                  <button
                    onClick={calculateClassAverages}
                    disabled={!selectedClass || gridData.length === 0}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Calculator className="h-4 w-4 text-indigo-600" />
                    Calculate
                  </button>
                  <button
                    onClick={() => setShowQuickFill(true)}
                    disabled={gridData.length === 0}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-700 hover:to-indigo-700 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    Quick Fill
                  </button>
                  <button
                    onClick={clearAllGrades}
                    disabled={gridData.length === 0}
                    className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Ledger pulse</p>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">{pulseValue}</div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${completionRate}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{gridData.length}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Visible</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{scoredCount}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scored</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{modifiedCount}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pending</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  {pulseLabel}
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => (
                <div
                  key={card.label}
                  className={`relative min-h-[128px] overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm ${card.tone}`}
                >
                  <div className="relative flex items-start justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">{card.label}</p>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white backdrop-blur-sm">
                      <card.Icon className="h-4.5 w-4.5" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.2),transparent_45%)]" />
                  <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-36 rounded-full border border-white/25" />
                  <p className={`mt-2 text-2xl font-semibold tracking-tight ${card.accent}`}>{card.value}</p>
                  <p className="relative mt-1 text-sm text-white/90">{card.hint}</p>
                </div>
              ))}
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={80}>
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_2731f09e" /></p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_0a3f95de" /></h2>
                  <p className="mt-2 text-sm text-slate-500">
                    <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_c7242b1f" />
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    {selectedClassName}
                  </span>
                  <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                    {selectedSubjectName}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="xl:col-span-1">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_72f22de5" /></label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => {
                      const year = allYears.find((item) => item.id === e.target.value);
                      if (year) setSelectedYear(year);
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">{autoT("auto.web.locale_grades_entry_page.k_9dde6e60")}</option>
                    {allYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-1">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_a5269cf1" /></label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={!selectedAcademicYear}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                  >
                    <option value="">{autoT("auto.web.locale_grades_entry_page.k_e576246b")}</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-1">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_8a71e65d" /></label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedClass}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                  >
                    <option value="">{autoT("auto.web.locale_grades_entry_page.k_809ce996")}</option>
                    {subjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({autoT("auto.web.shared.dynamic.maxPrefix")} {item.maxScore})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-1">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_2d906ef0" /></label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                      <option key={month} value={month}>
                        {autoT("auto.web.shared.dynamic.monthPrefix")} {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={loadGrades}
                    disabled={!selectedClass || !selectedSubject || loadingGrid}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {loadingGrid ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                    {loadingGrid ? 'Loading' : 'Load Ledger'}
                  </button>
                </div>
              </div>

            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={120}>
            <section className="mt-5">
              <BlurLoader
                isLoading={loadingGrid}
                skeleton={
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">#</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_580c4943" /></th>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_aaf8a7a7" /></th>
                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_2606650b" /></th>
                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_15392934" /></th>
                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_3d1343cb" /></th>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_03d3d137" /></th>
                          </tr>
                        </thead>
                        <tbody>
                          <TableSkeleton rows={10} />
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              >
                {gridData.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-col gap-4 border-b border-blue-100 bg-blue-50/35 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_6f18eaaf" /></p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                          {selectedClassName} • {selectedSubjectName}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          {selectedYearLabel} • {monthLabel} <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_d74adaa9" /> {maxScore}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                          {gridData.length} <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_63f9e32c" />
                        </span>
                        <span className="rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                          {statistics.passRate.toFixed(1)}<AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_d0c5b3ac" />
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 z-10 border-b border-blue-100 bg-blue-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">#</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_580c4943" /></th>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_aaf8a7a7" /></th>
                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_d70e333d" /> {maxScore}</th>
                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_15392934" /></th>
                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_3d1343cb" /></th>
                            <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_03d3d137" /></th>
                          </tr>
                        </thead>
                        <tbody>
                          {gridData.map((item, index) => {
                            const entry = gradeEntries.get(item.student.id);
                            const score = entry?.score;
                            const remarks = entry?.remarks || '';
                            const percentage = getPercentage(score ?? null, maxScore);
                            const gradeLevel = getGradeLevel(score ?? null, maxScore);

                            return (
                              <tr
                                key={item.student.id}
                                className="border-b border-slate-100 bg-white transition hover:bg-blue-50/40"
                              >
                                <td className="px-6 py-5">
                                  <span className="rounded-xl bg-slate-100 dark:bg-gray-800 px-2.5 py-1 text-[11px] font-black tracking-tight text-slate-500">
                                    {String(index + 1).padStart(2, '0')}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0.5 shadow-sm">
                                      <img
                                        src={item.student.photoUrl || '/default-avatar.png'}
                                        alt={item.student.firstName}
                                        className="h-full w-full rounded-[12px] object-cover"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black tracking-tight text-slate-950">
                                        {item.student.firstName} {item.student.lastName}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">{item.student.khmerName || 'No Khmer name'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-2 text-xs font-black text-slate-600">
                                    {item.student.studentId || '-'}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="mx-auto max-w-[128px]">
                                    <input
                                      ref={(el) => {
                                        if (el) inputRefs.current.set(`${item.student.id}-score`, el);
                                      }}
                                      type="number"
                                      min="0"
                                      max={maxScore}
                                      step="0.5"
                                      value={score ?? ''}
                                      onChange={(e) => handleScoreChange(item.student.id, e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, item.student.id, 'score')}
                                      placeholder="0"
                                      className={`w-full rounded-lg border px-4 py-3 text-center text-lg font-semibold outline-none transition focus:ring-2 focus:ring-blue-100 ${
                                        score !== null && score !== undefined
                                          ? percentage >= 50
                                            ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700 focus:border-emerald-300'
                                            : 'border-rose-200 bg-rose-50/60 text-rose-700 focus:border-rose-300'
                                          : 'border-slate-200 bg-white text-slate-900 focus:border-blue-400'
                                      }`}
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <div className="mx-auto flex max-w-[96px] flex-col items-center">
                                    <span
                                      className={`text-sm font-black ${
                                        score !== null
                                          ? percentage >= 50
                                            ? 'text-emerald-700'
                                            : 'text-rose-700'
                                          : 'text-slate-300'
                                      }`}
                                    >
                                      {score !== null ? `${percentage.toFixed(1)}%` : '—'}
                                    </span>
                                    {score !== null && (
                                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                                        <div
                                          className={`h-full rounded-full ${percentage >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${
                                      gradeLevel === '-'
                                        ? 'bg-slate-100 dark:bg-gray-800 text-slate-400'
                                        : gradeLevel === 'F'
                                          ? 'bg-rose-100 text-rose-700'
                                          : gradeLevel === 'E' || gradeLevel === 'D'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {gradeLevel === '-' ? 'Pending' : gradeLevel}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="relative">
                                    <input
                                      ref={(el) => {
                                        if (el) inputRefs.current.set(`${item.student.id}-remarks`, el);
                                      }}
                                      type="text"
                                      value={remarks}
                                      onChange={(e) => handleRemarksChange(item.student.id, e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, item.student.id, 'remarks')}
                                      placeholder={autoT("auto.web.locale_grades_entry_page.k_837e97c2")}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                    <Edit3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-300" />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-4 border-t border-blue-100 bg-blue-50/35 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-blue-100 bg-white p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_2a5e1cd4" /></p>
                        <p className="mt-3 text-3xl font-black tracking-tight text-sky-700">{statistics.average.toFixed(1)}%</p>
                        <p className="mt-2 text-sm text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_a0d6b944" /></p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_87826ef9" /></p>
                        <p className="mt-3 text-3xl font-black tracking-tight text-emerald-700">{statistics.highest.toFixed(1)}%</p>
                        <p className="mt-2 text-sm text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_24c75fe7" /></p>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-white p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_c1aadd20" /></p>
                        <p className="mt-3 text-3xl font-black tracking-tight text-rose-700">{statistics.lowest.toFixed(1)}%</p>
                        <p className="mt-2 text-sm text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_bb53aff2" /></p>
                      </div>
                      <div className="rounded-xl border border-cyan-100 bg-white p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_43d91a90" /></p>
                        <p className="mt-3 text-3xl font-black tracking-tight text-cyan-700">{statistics.passRate.toFixed(1)}%</p>
                        <p className="mt-2 text-sm text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_9c464c92" /></p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-100 bg-white">
                      <AlertCircle className="h-7 w-7 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_919e858c" /></h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                      <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_fb235369" />
                    </p>
                  </div>
                )}
              </BlurLoader>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="fade" delay={160}>
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-cyan-700">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_70e9f9dc" /></p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_19b72e84" /></h3>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 text-slate-300 transition duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_3adcde79" /></p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_c30855ca" /></span>
                        <kbd className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-[11px] font-black">TAB</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_f542166b" /></span>
                        <kbd className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-[11px] font-black"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_85b4dd4c" /></kbd>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_713e90fe" /></p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_9f669e8d" /></span>
                        <kbd className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-[11px] font-black">↑ ↓</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_fbf62337" /></span>
                        <kbd className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-[11px] font-black"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_06732f1b" /></kbd>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_edc056ac" /></p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_9e79fe43" /></span>
                        <kbd className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-[11px] font-black">ESC</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span><AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_66c5c21c" /></span>
                        <span className="rounded-full bg-cyan-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                          <AutoI18nText i18nKey="auto.web.locale_grades_entry_page.k_57dfbee3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </section>
          </AnimatedContent>
        </main>
      </div>
    </>
  );
}
