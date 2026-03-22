'use client';

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
  ChevronRight,
  ChevronDown,
  Home,
  ClipboardList,
  Zap,
  Award,
  TrendingUp,
  TrendingDown,
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

  return (
    <>
      <UnifiedNavigation user={user} />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-500">
        <main className="p-4 lg:p-8 max-w-[1600px] mx-auto">

          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 mb-6">
                <div className="flex items-center gap-2 hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors">
                  <Home className="h-3.5 w-3.5" />
                  <span>Stunity</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-700" />
                <span className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors">Academic Ledger</span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-700" />
                <span className="text-slate-900 dark:text-white underline decoration-orange-500/30 underline-offset-4">Grade Entry Grid</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-gradient-to-br from-orange-600 to-yellow-500 rounded-2xl text-white shadow-xl shadow-orange-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <ClipboardList className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                       Academic <span className="bg-gradient-to-r from-orange-600 to-yellow-500 bg-clip-text text-transparent">Ledger</span>
                    </h1>
                    <div className="flex items-center gap-3">
                      <p className="text-slate-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">
                        Standardized Evaluation System
                      </p>
                      <div className="w-1.5 h-1.5 bg-orange-500/30 rounded-full" />
                      <span className="text-orange-600 dark:text-orange-500 font-black text-xs uppercase tracking-[0.2em]">
                        Live Entry Mode
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Save Status */}
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Saved
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="flex items-center gap-2 text-sm text-red-600">
                      <XCircle className="h-4 w-4" />
                      Error
                    </span>
                  )}
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Selectors Section - Genesis style */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 mb-8 transition-all hover:shadow-xl dark:hover:shadow-black/20">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                {/* Academic Year */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                    Academic Year
                  </label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => {
                      const year = allYears.find(y => y.id === e.target.value);
                      if (year) setSelectedYear(year);
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all text-sm dark:text-gray-200"
                  >
                    <option value="">Select Year</option>
                    {allYears.map(year => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                    Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={!selectedAcademicYear}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800/50 transition-all text-sm dark:text-gray-200"
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedClass}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800/50 transition-all text-sm dark:text-gray-200"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} (Max: {subject.maxScore})
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-transparent text-sm dark:text-gray-200"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    Month {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Load Button */}
            <div className="flex items-end">
              <button
                onClick={loadGrades}
                disabled={!selectedClass || !selectedSubject || loadingGrid}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                {loadingGrid ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load Grades'
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2.5 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={downloadTemplate}
              disabled={!selectedClass || !selectedSubject}
              className="px-4 py-2.5 bg-blue-500/10 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl disabled:opacity-50 transition-all font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
            
            <button
              onClick={calculateClassAverages}
              disabled={!selectedClass || gridData.length === 0}
              className="px-4 py-2.5 bg-emerald-500/10 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl disabled:opacity-50 transition-all font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"
            >
              <Calculator className="w-4 h-4" />
              Calculate Averages
            </button>
            
            <button
              onClick={exportToExcel}
              disabled={gridData.length === 0}
              className="px-4 py-2.5 bg-purple-500/10 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white rounded-xl disabled:opacity-50 transition-all font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"
            >
              <Upload className="w-4 h-4" />
              Export to Excel
            </button>
            
            <button
              onClick={() => setShowQuickFill(true)}
              disabled={gridData.length === 0}
              className="px-4 py-2.5 bg-indigo-500/10 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl disabled:opacity-50 transition-all font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"
            >
              <Zap className="w-4 h-4" />
              Quick Fill
            </button>
            
            <button
              onClick={clearAllGrades}
              disabled={gridData.length === 0}
              className="px-4 py-2.5 bg-rose-500/10 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl disabled:opacity-50 transition-all font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
          </AnimatedContent>
          
          {/* Main Grid Area - Genesis style */}
          <div className="relative">
            {/* Quick Fill Modal */}
            {showQuickFill && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-10 max-w-md w-full border border-white dark:border-gray-800 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-orange-500/10 rounded-2xl">
                      <Zap className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Quick <span className="text-orange-600">Fill</span></h3>
                      <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">Bulk Ledger Operations</p>
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="group/input">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">
                        Assignment Score (Max: {maxScore})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={maxScore}
                        step="0.5"
                        value={quickFillScore}
                        onChange={(e) => setQuickFillScore(e.target.value)}
                        className="w-full px-8 py-6 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black text-3xl text-center transition-all"
                        placeholder="0.0"
                        autoFocus
                      />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          const score = parseFloat(quickFillScore);
                          if (!isNaN(score) && score >= 0 && score <= maxScore) {
                            const count = quickFillEmptyScores(score);
                            if (count === 0) alert('No empty cells to fill!');
                          } else {
                            alert(`Please enter a valid score between 0 and ${maxScore}`);
                          }
                        }}
                        disabled={!quickFillScore}
                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-xl"
                      >
                        Fill Empty Records
                      </button>
                      <button
                        onClick={() => {
                          const score = parseFloat(quickFillScore);
                          if (!isNaN(score) && score >= 0 && score <= maxScore) {
                            if (confirm('This will overwrite ALL existing scores. Continue?')) {
                              quickFillAllScores(score);
                            }
                          } else {
                            alert(`Please enter a valid score between 0 and ${maxScore}`);
                          }
                        }}
                        disabled={!quickFillScore}
                        className="w-full py-5 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-gray-700 transition-all"
                      >
                        Overwrite Entire Ledger
                      </button>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowQuickFill(false);
                        setQuickFillScore('');
                      }}
                      className="w-full text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                    >
                      Dismiss Control
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Status Floating Indicator */}
            {saveStatus !== 'idle' && (
              <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-top-4 duration-500">
                <div className={`px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 backdrop-blur-2xl border transition-all ${
                  saveStatus === 'saving' ? 'bg-orange-500/90 border-orange-400 text-white' :
                  saveStatus === 'saved' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                  'bg-rose-500/90 border-rose-400 text-white'
                }`}>
                  <div className="p-2 bg-white/20 rounded-xl">
                    {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saveStatus === 'saved' && <CheckCircle className="w-4 h-4" />}
                    {saveStatus === 'error' && <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-[10px] uppercase tracking-[0.2em]">
                      {saveStatus === 'saving' ? 'Synchronizing' :
                       saveStatus === 'saved' ? 'Ledger Updated' :
                       'Sync Failure'}
                    </span>
                    <span className="text-[9px] opacity-70 font-bold uppercase tracking-widest leading-none">
                      Cloud Systems Integrated
                    </span>
                  </div>
                </div>
              </div>
            )}

            <AnimatedContent animation="slide-up" delay={100}>
              <BlurLoader 
            isLoading={loadingGrid}
            skeleton={
              <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
                      <tr>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">No.</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[80px]">Photo</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[200px]">Student Name</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Student ID</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[120px]">Score</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Percentage</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Grade</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[200px]">Remarks</th>
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
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-gray-800/30 border-b border-slate-100 dark:border-gray-800 sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Rank</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[80px]">Identity</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[200px]">Student Scholar</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Registry ID</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[120px]">
                          Performance Score (/{maxScore})
                        </th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Percentage</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em]">Tier</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] min-w-[200px]">Annotated Remarks</th>
                      </tr>
                    </thead>
                <tbody>
                  {gridData.map((item, index) => {
                    const entry = gradeEntries.get(item.student.id);
                    const score = entry?.score;
                    const remarks = entry?.remarks || '';
                    const percentage = getPercentage(score ?? null, maxScore);
                    const gradeLevel = getGradeLevel(score ?? null, maxScore);
                    const isEven = index % 2 === 0;

                    return (
                      <tr
                        key={item.student.id}
                        className={`group border-b border-slate-100 dark:border-gray-800/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-all duration-300 ${
                          isEven ? 'bg-white/40 dark:bg-gray-900/40' : 'bg-slate-50/20 dark:bg-gray-800/10'
                        }`}
                      >
                        <td className="px-8 py-6">
                           <span className="text-[10px] font-black text-slate-400 dark:text-gray-600 font-mono tracking-tighter bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                             {String(index + 1).padStart(2, '0')}
                           </span>
                        </td>
                        <td className="px-6 py-6">
                          <div className="relative group/photo flex-shrink-0">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-0.5 group-hover/row:scale-110 group-hover/row:rotate-3 transition-all duration-500 shadow-sm group-hover/row:shadow-xl group-hover/row:shadow-orange-500/10">
                              <img
                                src={item.student.photoUrl || '/default-avatar.png'}
                                alt={item.student.firstName}
                                className="w-full h-full object-cover rounded-[14px]"
                              />
                            </div>
                            {percentage >= 90 && (
                              <div className="absolute -top-2 -right-2 p-1 bg-amber-400 rounded-full shadow-lg border-2 border-white dark:border-gray-900">
                                <Award className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="text-base font-black text-slate-900 dark:text-white group-hover/row:text-orange-600 transition-colors tracking-tight leading-none mb-1">
                              {item.student.firstName} {item.student.lastName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                              {item.student.khmerName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-xs font-black text-slate-500 dark:text-gray-400 font-mono bg-slate-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-gray-700">
                            {item.student.studentId || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-6 h-full">
                          <div className="relative group/field max-w-[120px] mx-auto">
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
                              className={`w-full px-4 py-4 bg-white/50 dark:bg-gray-800/50 border rounded-2xl text-center font-black text-xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                                score !== null && score !== undefined
                                  ? score > maxScore
                                    ? 'border-red-500 text-red-600 dark:text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                    : percentage >= 50
                                      ? 'border-emerald-500/30 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : 'border-rose-500/30 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : 'border-slate-100 dark:border-gray-800 text-slate-900 dark:text-gray-100'
                              }`}
                            />
                            <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-orange-500 scale-x-0 group-focus-within/field:scale-x-100 transition-transform duration-300 origin-center" />
                          </div>
                        </td>
                        <td className="px-6 py-6">
                           <div className="flex flex-col items-center">
                            <span className={`text-lg font-black tracking-tight leading-none mb-1 ${
                              score !== null 
                                ? percentage >= 50 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-200 dark:text-gray-800'
                            }`}>
                              {score !== null ? `${percentage.toFixed(1)}%` : '—'}
                            </span>
                            {score !== null && (
                              <div className="w-16 h-1 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ${percentage >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            )}
                           </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex justify-center">
                            <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all duration-500 group-hover/row:scale-110 ${
                              gradeLevel === '-'
                                ? 'bg-slate-50 dark:bg-gray-800/50 text-slate-300 dark:text-gray-700 border-slate-100 dark:border-gray-800'
                                : gradeLevel === 'F'
                                  ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'
                                  : gradeLevel === 'E' || gradeLevel === 'D'
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                            }`}>
                              {gradeLevel === 'F' ? 'FAIL' : gradeLevel === '-' ? 'UNGRADED' : `GRADE ${gradeLevel}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="relative group/remarks">
                            <input
                              ref={(el) => {
                                if (el) inputRefs.current.set(`${item.student.id}-remarks`, el);
                              }}
                              type="text"
                              value={remarks}
                              onChange={(e) => handleRemarksChange(item.student.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, item.student.id, 'remarks')}
                              placeholder="Clinical notes..."
                              className="w-full px-5 py-4 text-xs bg-slate-50/50 dark:bg-gray-800/50 border border-slate-100/50 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold dark:text-gray-300 placeholder:text-slate-300 dark:placeholder:text-gray-700"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/remarks:opacity-100 transition-opacity">
                              <Edit3 className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistics Footer - Genesis style cards */}
            <div className="bg-slate-50/50 dark:bg-black/20 px-8 py-10 border-t border-slate-100 dark:border-gray-800">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-gray-800 group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
                  <div className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                      <Calculator className="w-4 h-4 text-blue-500" />
                    </div>
                    Class average
                  </div>
                  <div className={`text-3xl font-black tracking-tighter group-hover:scale-105 transition-transform duration-500 ${
                    statistics.average >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {statistics.average.toFixed(1)}%
                  </div>
                  <div className="mt-2 h-1 w-full bg-slate-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${statistics.average}%` }} />
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-gray-800 group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
                  <div className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    Highest Peak
                  </div>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                    {statistics.highest.toFixed(1)}%
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Achieved Excellence</p>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-gray-800 group hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-500">
                  <div className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                    Critical Low
                  </div>
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                    {statistics.lowest.toFixed(1)}%
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Support Required</p>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-gray-800 group hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500">
                  <div className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                      <Zap className="w-4 h-4 text-orange-500" />
                    </div>
                    Pass Rate (≥50%)
                  </div>
                  <div className={`text-3xl font-black tracking-tighter group-hover:scale-105 transition-transform duration-500 ${
                    statistics.passRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 
                    statistics.passRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {statistics.passRate.toFixed(1)}%
                  </div>
                  <div className="flex gap-1 mt-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1 flex-1 rounded-full ${i < (statistics.passRate / 20) ? 'bg-orange-500' : 'bg-slate-100 dark:bg-gray-800'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
                </div>
              </div>
            ) : (
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-16 text-center">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">No Data Available</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto">
                Please select academic year, class, subject, and month, then click "Load Grades" to start entering grades.
              </p>
            </div>
          )}
          </BlurLoader>
        </AnimatedContent>
      </div>

      {/* Keyboard Shortcuts Help - Genesis style */}
      <AnimatedContent animation="fade" delay={150}>
        <div className="mt-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[3rem] shadow-sm border border-slate-100 dark:border-gray-800 p-10 overflow-hidden hover:shadow-2xl transition-all duration-500">
          <details className="group">
            <summary className="cursor-pointer font-black text-slate-900 dark:text-white flex items-center justify-between list-none">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-2xl group-open:bg-orange-500/10 transition-all">
                  <Zap className="w-6 h-6 text-slate-400 group-open:text-orange-500 transition-colors" />
                </div>
                <div>
                  <span className="text-xl tracking-tight leading-none">Pro Ledger Shortcuts</span>
                  <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">Accelerated Workflow Guide</p>
                </div>
              </div>
              <ChevronDown className="w-6 h-6 text-slate-300 group-open:rotate-180 transition-transform duration-500" />
            </summary>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-top-4 duration-500">
              <div className="p-6 bg-slate-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-slate-100 dark:border-gray-800/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Focus & Navigation</div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Next Record</span>
                    <kbd className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl font-mono text-[10px] font-black shadow-sm">TAB</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Jump Vertical</span>
                    <kbd className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl font-mono text-[10px] font-black shadow-sm">ENTER</kbd>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-slate-100 dark:border-gray-800/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Grid Precision</div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Step Control</span>
                    <kbd className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl font-mono text-[10px] font-black shadow-sm">↑ ↓</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Reverse Step</span>
                    <kbd className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl font-mono text-[10px] font-black shadow-sm">⇧ TAB</kbd>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-slate-100 dark:border-gray-800/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">System Protocols</div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Abort Edit</span>
                    <kbd className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl font-mono text-[10px] font-black shadow-sm">ESC</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Synchronization</span>
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-1 rounded-lg">Active Auto-Save</span>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </AnimatedContent>
    </main>
  </div>
</>
);
}
