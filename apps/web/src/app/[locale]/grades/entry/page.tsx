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
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        <main className="p-4 lg:p-8">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span>Grades</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">Grade Entry</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ClipboardList className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Grade Entry</h1>
                    <p className="text-gray-600 mt-1">
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

          {/* Selectors Section */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year
                  </label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => {
                      const year = allYears.find(y => y.id === e.target.value);
                      if (year) setSelectedYear(year);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={!selectedAcademicYear}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 transition-shadow"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedClass}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 transition-shadow"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={downloadTemplate}
              disabled={!selectedClass || !selectedSubject}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
            
            <button
              onClick={calculateClassAverages}
              disabled={!selectedClass || gridData.length === 0}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Calculator className="w-4 h-4" />
              Calculate Averages
            </button>
            
            <button
              onClick={exportToExcel}
              disabled={gridData.length === 0}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Export to Excel
            </button>
            
            <button
              onClick={() => setShowQuickFill(true)}
              disabled={gridData.length === 0}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Zap className="w-4 h-4" />
              Quick Fill
            </button>
            
            <button
              onClick={clearAllGrades}
              disabled={gridData.length === 0}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
          </AnimatedContent>

        {/* Quick Fill Modal */}
        {showQuickFill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-500" />
                Quick Fill Scores
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Score to Fill (max {maxScore})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={maxScore}
                    step="0.5"
                    value={quickFillScore}
                    onChange={(e) => setQuickFillScore(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={`Enter score (0-${maxScore})`}
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-2">
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
                    className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 font-medium"
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
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                  >
                    Fill All
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setShowQuickFill(false);
                    setQuickFillScore('');
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Save Indicator */}
        {saveStatus !== 'idle' && (
          <div className="fixed top-20 right-4 z-50">
            <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
              saveStatus === 'saving' ? 'bg-blue-500 text-white' :
              saveStatus === 'saved' ? 'bg-green-500 text-white' :
              'bg-red-500 text-white'
            }`}>
              {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle className="w-4 h-4" />}
              {saveStatus === 'error' && <XCircle className="w-4 h-4" />}
              <span className="font-medium">
                {saveStatus === 'saving' ? 'Saving...' :
                 saveStatus === 'saved' ? 'Saved ✓' :
                 'Error ✗'}
              </span>
            </div>
          </div>
        )}

        {/* Excel-Like Grid */}
        <AnimatedContent animation="slide-up" delay={100}>
          <BlurLoader 
            isLoading={loadingGrid}
            skeleton={
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">No.</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[80px]">Photo</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Student Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Student ID</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold min-w-[120px]">Score</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Percentage</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Grade</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Remarks</th>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">No.</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[80px]">Photo</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Student Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Student ID</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold min-w-[120px]">
                          Score (/{maxScore})
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Percentage</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Grade</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Remarks</th>
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
                        className={`border-b border-gray-200 hover:bg-orange-50 transition-colors ${
                          isEven ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <img
                            src={item.student.photoUrl || '/default-avatar.png'}
                            alt={item.student.firstName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-orange-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.student.firstName} {item.student.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.student.khmerName}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.student.studentId || '-'}
                        </td>
                        <td className="px-4 py-3">
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
                            className={`w-full px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                              score !== null && score !== undefined
                                ? score > maxScore
                                  ? 'border-red-500 bg-red-50 text-red-700'
                                  : percentage >= 50
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-red-300 bg-red-50'
                                : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className={`text-center font-medium ${
                            score !== null 
                              ? percentage >= 50 
                                ? 'text-green-600' 
                                : 'text-red-600'
                              : 'text-gray-400'
                          }`}>
                            {score !== null ? `${percentage.toFixed(1)}%` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                              gradeLevel === '-'
                                ? 'bg-gray-100 text-gray-500 border-gray-200'
                                : gradeLevel === 'F'
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : gradeLevel === 'E' || gradeLevel === 'D'
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    : 'bg-green-100 text-green-700 border-green-200'
                            }`}>
                              {gradeLevel}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            ref={(el) => {
                              if (el) inputRefs.current.set(`${item.student.id}-remarks`, el);
                            }}
                            type="text"
                            value={remarks}
                            onChange={(e) => handleRemarksChange(item.student.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item.student.id, 'remarks')}
                            placeholder="Optional remarks..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistics Footer */}
            <div className="bg-gradient-to-r from-orange-100 to-yellow-100 px-6 py-4 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center bg-white/50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
                    <Calculator className="w-4 h-4" />
                    Class Average
                  </div>
                  <div className={`text-2xl font-bold ${
                    statistics.average >= 50 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {statistics.average.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center bg-white/50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
                    ⬆️ Highest Score
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.highest.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center bg-white/50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
                    ⬇️ Lowest Score
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {statistics.lowest.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center bg-white/50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
                    ✓ Pass Rate (≥50%)
                  </div>
                  <div className={`text-2xl font-bold ${
                    statistics.passRate >= 80 ? 'text-green-600' : 
                    statistics.passRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {statistics.passRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">
                  Please select academic year, class, subject, and month, then click "Load Grades" to start entering grades.
                </p>
              </div>
            )}
          </BlurLoader>
        </AnimatedContent>

        {/* Keyboard Shortcuts Help */}
        <AnimatedContent animation="fade" delay={150}>
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <details>
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Keyboard Shortcuts
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium">Tab:</span> Move to next field
                </div>
                <div>
                  <span className="font-medium">Shift+Tab:</span> Move to previous field
                </div>
                <div>
                  <span className="font-medium">Enter:</span> Move down
                </div>
                <div>
                  <span className="font-medium">↑/↓:</span> Navigate up/down
                </div>
                <div>
                  <span className="font-medium">Escape:</span> Cancel edit
                </div>
                <div>
                  <span className="font-medium">Auto-save:</span> 2 seconds after typing
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
