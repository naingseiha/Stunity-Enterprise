'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { gradeAPI, GradeGridItem, getGradeLevelColor, getScoreColor } from '@/lib/api/grades';
import { getClasses, Class } from '@/lib/api/classes';
import { subjectAPI, Subject } from '@/lib/api/subjects';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import {
  Download,
  Upload,
  Save,
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
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  
  // Grid data
  const [gridData, setGridData] = useState<GradeGridItem[]>([]);
  const [gradeEntries, setGradeEntries] = useState<Map<string, GradeEntry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  
  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Focus and navigation
  const [focusedCell, setFocusedCell] = useState<{ studentId: string; field: string } | null>(null);
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
  }, [router]);

  // Load classes when academic year changes
  useEffect(() => {
    if (user && selectedAcademicYear) {
      loadClasses();
    }
  }, [user, selectedAcademicYear]);

  useEffect(() => {
    if (selectedClass) {
      loadSubjects();
    }
  }, [selectedClass]);

  // Load classes
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

  // Load subjects
  const loadSubjects = async () => {
    try {
      setLoading(true);
      const selectedClassObj = classes.find(c => c.id === selectedClass);
      if (!selectedClassObj) return;
      
      const subjects = await subjectAPI.getSubjectsByGrade(selectedClassObj.grade.toString());
      setSubjects(subjects.filter(s => s.isActive));
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

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
              <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 mb-6 font-medium uppercase tracking-widest text-[10px]">
                <Home className="h-3.5 w-3.5" />
                <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-700" />
                <span>Grades</span>
                <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-700" />
                <span className="text-gray-900 dark:text-white">Grade Entry</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                    <ClipboardList className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Grade Entry</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      Enter and manage student grades with Excel-like grid
                    </p>
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
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all hover:shadow-2xl dark:hover:shadow-black/20">


        {/* Quick Fill Modal */}
        {showQuickFill && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Zap className="w-6 h-6 text-indigo-500" />
                </div>
                Quick Fill Scores
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                    Score to Fill (max {maxScore})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={maxScore}
                    step="0.5"
                    value={quickFillScore}
                    onChange={(e) => setQuickFillScore(e.target.value)}
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-lg text-center dark:text-white"
                    placeholder={`0 - ${maxScore}`}
                    autoFocus
                  />
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      const score = parseFloat(quickFillScore);
                      if (!isNaN(score) && score >= 0 && score <= maxScore) {
                        const count = quickFillEmptyScores(score);
                        if (count === 0) {
                          alert('No empty cells to fill!');
                        }
                      } else {
                        alert(`Please enter a valid score between 0 and ${maxScore}`);
                      }
                    }}
                    disabled={!quickFillScore}
                    className="w-full px-6 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                  >
                    Fill Empty Only
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
                    className="w-full px-6 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 font-bold transition-all active:scale-[0.98]"
                  >
                    Overwrite All
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setShowQuickFill(false);
                    setQuickFillScore('');
                  }}
                  className="w-full px-6 py-3 text-gray-500 dark:text-gray-400 rounded-2xl hover:text-gray-900 dark:hover:text-white font-bold text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Save Indicator */}
        {saveStatus !== 'idle' && (
          <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right duration-300">
            <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              saveStatus === 'saving' ? 'bg-blue-500/90 border-blue-400 text-white' :
              saveStatus === 'saved' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
              'bg-rose-500/90 border-rose-400 text-white'
            }`}>
              {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle className="w-4 h-4" />}
              {saveStatus === 'error' && <XCircle className="w-4 h-4" />}
              <span className="font-bold text-xs uppercase tracking-wider">
                {saveStatus === 'saving' ? 'Saving Changes' :
                 saveStatus === 'saved' ? 'All Changes Saved' :
                 'Save Failed'}
              </span>
            </div>
          </div>
        )}

        {/* Excel-Like Grid */}
        <AnimatedContent animation="slide-up" delay={100}>
          <BlurLoader 
            isLoading={loadingGrid}
            skeleton={
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">No.</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[80px]">Photo</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[200px]">Student Name</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Student ID</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[120px]">Score</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Percentage</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Grade</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[200px]">Remarks</th>
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
              <div className="transition-all">
                <div className="overflow-x-auto">

                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">No.</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[80px]">Photo</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[200px]">Student Name</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Student ID</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[120px]">
                          Score (/{maxScore})
                        </th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Percentage</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Grade</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-[200px]">Remarks</th>
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
                        className={`transition-colors h-22 group/row ${
                          isEven ? 'bg-white/40 dark:bg-gray-900/40' : 'bg-gray-50/20 dark:bg-gray-800/10'
                        } hover:bg-orange-50/40 dark:hover:bg-orange-500/10`}
                      >

                        <td className="px-6 py-4 text-sm font-black text-gray-400 dark:text-gray-600">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0.5 group-hover/row:scale-105 transition-transform duration-300">
                            <img
                              src={item.student.photoUrl || '/default-avatar.png'}
                              alt={item.student.firstName}
                              className="w-full h-full object-cover rounded-[14px]"
                            />
                          </div>

                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-black text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                              {item.student.firstName} {item.student.lastName}
                            </div>
                            <div className="text-xs font-medium text-gray-400 dark:text-gray-500">
                              {item.student.khmerName}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-500 dark:text-gray-400 tracking-tight">
                          {item.student.studentId || '-'}
                        </td>
                        <td className="px-6 py-4">
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
                            className={`w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border rounded-xl text-center font-black focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                              score !== null && score !== undefined
                                ? score > maxScore
                                  ? 'border-red-500 text-red-700 dark:text-red-400'
                                  : percentage >= 50
                                    ? 'border-emerald-500/50 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                    : 'border-rose-500/50 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
                                : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                            }`}

                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-center font-black tracking-tight ${
                            score !== null 
                              ? percentage >= 50 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-rose-600 dark:text-rose-400'
                              : 'text-gray-300 dark:text-gray-700'
                          }`}>
                            {score !== null ? `${percentage.toFixed(1)}%` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-transparent shadow-sm ${
                              gradeLevel === '-'
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                                : gradeLevel === 'F'
                                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                  : gradeLevel === 'E' || gradeLevel === 'D'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {gradeLevel}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            ref={(el) => {
                              if (el) inputRefs.current.set(`${item.student.id}-remarks`, el);
                            }}
                            type="text"
                            value={remarks}
                            onChange={(e) => handleRemarksChange(item.student.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item.student.id, 'remarks')}
                            placeholder="Note..."
                            className="w-full px-4 py-2 text-xs bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-medium dark:text-gray-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistics Footer - Genesis style cards */}
            <div className="bg-gray-50/50 dark:bg-black/20 px-8 py-8 border-t border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-xl dark:hover:shadow-black/20 transition-all">
                  <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                      <Calculator className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    Class Average
                  </div>
                  <div className={`text-2xl font-black tracking-tight group-hover:scale-105 transition-transform duration-500 ${
                    statistics.average >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {statistics.average.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-xl dark:hover:shadow-black/20 transition-all">
                  <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                      <span className="text-xs">⬆️</span>
                    </div>
                    Highest Score
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight group-hover:scale-105 transition-transform duration-500">
                    {statistics.highest.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-xl dark:hover:shadow-black/20 transition-all">
                  <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                      <span className="text-xs">⬇️</span>
                    </div>
                    Lowest Score
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight group-hover:scale-105 transition-transform duration-500">
                    {statistics.lowest.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-xl dark:hover:shadow-black/20 transition-all">
                  <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg">
                      <span className="text-xs">✓</span>
                    </div>
                    Pass Rate (≥50%)
                  </div>
                  <div className={`text-2xl font-black tracking-tight group-hover:scale-105 transition-transform duration-500 ${
                    statistics.passRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 
                    statistics.passRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {statistics.passRate.toFixed(1)}%
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
  </AnimatedContent>

  {/* Keyboard Shortcuts Help - Genesis style */}
  <AnimatedContent animation="fade" delay={150}>
    <div className="mt-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 overflow-hidden transition-all hover:shadow-xl dark:hover:shadow-black/20">
      <details className="group">
        <summary className="cursor-pointer font-black text-gray-900 dark:text-white flex items-center justify-between list-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl group-open:bg-orange-50 dark:group-open:bg-orange-500/10 transition-colors">
              <Zap className="w-5 h-5 text-gray-400 dark:text-gray-500 group-open:text-orange-500 transition-colors" />
            </div>
            <span className="text-sm tracking-tight">Pro Keyboard Shortcuts & Tips</span>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
          <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Navigation</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Next Field</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-sans font-bold shadow-sm">Tab</kbd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Previous Field</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-sans font-bold shadow-sm">Shift + Tab</kbd>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Grid Actions</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Move Down</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-sans font-bold shadow-sm">Enter</kbd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Arrow Keys</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-sans shadow-sm">↑</kbd>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-sans shadow-sm">↓</kbd>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Miscellaneous</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Cancel Edit</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-sans font-bold shadow-sm">Esc</kbd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Auto-save</span>
                <span className="font-bold text-orange-500">2s Inactivity</span>
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
