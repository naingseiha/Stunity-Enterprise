'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { gradeAPI, GradeGridItem, getGradeLevelColor, getScoreColor } from '@/lib/api/grades';
import { getClasses, Class } from '@/lib/api/classes';
import { subjectAPI, Subject } from '@/lib/api/subjects';
import { getAcademicYears, AcademicYear } from '@/lib/api/academic-years';
import { TokenManager } from '@/lib/api/auth';
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
  const [user, setUser] = useState<any>(null);
  
  // Selectors
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
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
  
  // Statistics
  const [statistics, setStatistics] = useState<Statistics>({
    average: 0,
    highest: 0,
    lowest: 0,
    passRate: 0,
  });

  // Check authentication
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, [router]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadAcademicYears();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAcademicYear) {
      loadClasses();
    }
  }, [selectedAcademicYear]);

  useEffect(() => {
    if (selectedClass) {
      loadSubjects();
    }
  }, [selectedClass]);

  // Load academic years
  const loadAcademicYears = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token || !user?.schoolId) return;
      
      const years = await getAcademicYears(user.schoolId, token);
      setAcademicYears(years);
      
      // Select current year by default
      const currentYear = years.find(y => y.isCurrent);
      if (currentYear) {
        setSelectedAcademicYear(currentYear.id);
      }
    } catch (error) {
      console.error('Failed to load academic years:', error);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-100">
      <UnifiedNavigation user={user} />
      
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grade Entry</h1>
          <p className="text-gray-600">Enter and manage student grades with Excel-like grid</p>
        </div>

        {/* Selectors Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select Year</option>
                {academicYears.map(year => (
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
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
              onClick={clearAllGrades}
              disabled={gridData.length === 0}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>

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
                            className={`w-full px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                              score !== null && score > maxScore
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className={`text-center font-medium ${getScoreColor(percentage)}`}>
                            {score !== null ? `${percentage.toFixed(1)}%` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getGradeLevelColor(gradeLevel)}`}>
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
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Class Average</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {statistics.average.toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Highest Score</div>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.highest.toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Lowest Score</div>
                  <div className="text-2xl font-bold text-red-600">
                    {statistics.lowest.toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Pass Rate</div>
                  <div className="text-2xl font-bold text-blue-600">
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

        {/* Keyboard Shortcuts Help */}
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
      </div>
    </div>
  );
}
