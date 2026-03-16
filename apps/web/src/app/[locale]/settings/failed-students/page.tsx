'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { SCHOOL_SERVICE_URL, STUDENT_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  khmerName: string | null;
  gender: string;
  grade: number;
  className: string;
}

export default function FailedStudentsPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${params.locale}/login`);
  };

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    if (fromYearId) {
      loadStudents();
    }
  }, [fromYearId]);

  const loadAcademicYears = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${params.locale}/auth/login`);
        return;
      }

      const response = await fetch(
        `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const result = await response.json();
      if (result.success) {
        const sortedYears = result.data.sort(
          (a: AcademicYear, b: AcademicYear) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        setYears(sortedYears);
        
        // Auto-select current year as from year
        const current = sortedYears.find((y: AcademicYear) => y.isCurrent);
        if (current) {
          setFromYearId(current.id);
          // Auto-select next year as to year
          const nextYear = sortedYears.find(
            (y: AcademicYear) =>
              new Date(y.startDate) > new Date(current.startDate)
          );
          if (nextYear) {
            setToYearId(nextYear.id);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      // Get all students with their current classes
      const response = await fetch(
        `${STUDENT_SERVICE_URL}/schools/${schoolId}/students`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const result = await response.json();
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsFailed = async () => {
    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    if (!fromYearId || !toYearId) {
      setError('Please select academic years');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const token = TokenManager.getAccessToken();

      const response = await fetch(`${STUDENT_SERVICE_URL}/students/mark-failed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          fromAcademicYearId: fromYearId,
          toAcademicYearId: toYearId,
          notes: 'Marked as failed - repeating grade',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully processed ${result.data.processed} student(s)`);
        setSelectedStudents(new Set());
        if (result.data.failed.length > 0) {
          setError(`Failed: ${result.data.failed.length} student(s)`);
        }
      } else {
        setError(result.error || 'Failed to mark students');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const filteredStudents = students.filter(s =>
    s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.khmerName && s.khmerName.includes(searchQuery))
  );

  const fromYear = years.find(y => y.id === fromYearId);
  const toYear = years.find(y => y.id === toYearId);

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-950/40 dark:to-orange-950/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 relative z-10">
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-all hover:-translate-x-1 group"
            >
              <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </div>
              <span className="font-bold uppercase tracking-widest text-xs">Academic Years</span>
            </button>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                    Repeat Registry
                  </h1>
                </div>
                <p className="text-white/60 font-medium max-w-xl lg:text-lg">
                  Curate the module for students requiring academic reinforcement and grade repetition.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-[2rem] border border-white/10">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Status Context</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-white font-black uppercase tracking-tight text-sm">Action Required</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          {/* Alert Messages */}
          {error && (
            <div className="mb-8 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-[2rem] p-6 flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-rose-900 dark:text-rose-200 font-bold">{error}</p>
              <button onClick={() => setError('')} className="ml-auto p-2 text-rose-300 hover:text-rose-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-8 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-[2rem] p-6 flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-emerald-900 dark:text-emerald-200 font-bold">{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto p-2 text-emerald-300 hover:text-emerald-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Year Selection */}
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 mb-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-orange-500/10 transition-all duration-700" />
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Temporal Mapping</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Source Epoch (Current)
                  </label>
                  <select
                    value={fromYearId}
                    onChange={(e) => setFromYearId(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                  >
                    <option value="">Select source year</option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '— CURRENT PLATFORM'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Target Epoch (Repeat In)
                  </label>
                  <select
                    value={toYearId}
                    onChange={(e) => setToYearId(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                  >
                    <option value="">Select target year</option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {fromYear && toYear && (
                <div className="mt-8 p-6 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/50 rounded-[2rem] flex items-start gap-4">
                  <div className="p-3 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-orange-900 dark:text-orange-200 font-bold mb-1">Grade Repetition Matrix</p>
                    <p className="text-sm text-orange-700/80 dark:text-orange-400/80 font-medium">
                      Selected candidates will maintain their current academic tier (e.g., Grade 7 → Grade 7) for the {toYear.name} session.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student Selection */}
          {fromYearId && (
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Active Enrollment</h2>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{selectedStudents.size} Modules Selected</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 flex-1 lg:max-w-2xl">
                  {/* Search */}
                  <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Identify students by name or Khmer script..."
                      className="w-full pl-14 pr-5 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                    />
                  </div>
                  
                  <button
                    onClick={loadStudents}
                    className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl hover:text-blue-500 dark:hover:text-blue-400 transition-all active:scale-95 group"
                    title="Refresh Registry"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  </button>
                </div>
              </div>

              {/* Select All */}
              <div className="mb-6 px-4">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleAll}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center group-hover:scale-110">
                      <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    Registry Manifest ({filteredStudents.length} entries)
                  </span>
                </label>
              </div>

              {/* Student List */}
              <div className="bg-gray-50/50 dark:bg-gray-950/50 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden">
                {loading ? (
                  <div className="text-center py-24">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500/10 border-t-blue-500 mb-6" />
                    <p className="font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-xs">Synchronizing Database...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform group-hover:scale-110 transition-transform">
                      <Users className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                    </div>
                    <p className="font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest text-xs">No records matching criteria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-h-[30rem] overflow-y-auto custom-scrollbar">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedStudents.has(student.id);
                      return (
                        <label
                          key={student.id}
                          className={`flex items-center gap-5 p-5 rounded-[1.5rem] border transition-all cursor-pointer group/item ${
                            isSelected 
                              ? 'bg-white dark:bg-gray-900 border-blue-500 shadow-lg shadow-blue-500/10' 
                              : 'bg-white/50 dark:bg-gray-900/30 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                          }`}
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudent(student.id)}
                              className="peer sr-only"
                            />
                            <div className={`w-6 h-6 border-2 rounded-lg transition-all flex items-center justify-center group-hover/item:scale-110 ${
                              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-800'
                            }`}>
                              <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`font-black tracking-tight truncate transition-colors ${isSelected ? 'text-blue-500' : 'text-gray-900 dark:text-white'}`}>
                                {student.firstName} {student.lastName}
                              </p>
                              <span className="text-xs text-gray-300 dark:text-gray-700 font-black">/</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold font-khmer -mb-0.5">{student.khmerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                                  isSelected ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }`}>
                                  Grade {student.grade}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest">
                                  {student.className || 'ORPHAN_ENTRY'}
                                </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Button */}
              {selectedStudents.size > 0 && toYearId && (
                <div className="mt-10 pt-10 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <button
                      onClick={handleMarkAsFailed}
                      disabled={processing}
                      className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm hover:scale-105 active:scale-95 shadow-2xl shadow-orange-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {processing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Finalizing registry...</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5" />
                          <span>Execute Repetition ({selectedStudents.size})</span>
                        </>
                      )}
                    </button>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Impact Scenario</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Candidates will re-enter the academic curriculum within the <span className="text-orange-500 font-black">{toYear?.name}</span> session.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
      {/* End main content wrapper */}
    </div>
    </>
  );
}
