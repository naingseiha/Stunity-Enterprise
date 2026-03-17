'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import {
  getEligibleStudents,
  getPromotionPreview,
  promoteStudents,
  type EligibleStudentsResponse,
  type PromotionPreviewResponse,
  type PromotionRequest,
} from '@/lib/api/promotion';
import { STUDENT_SERVICE_URL } from '@/lib/api/config';
import { useSWRConfig } from 'swr';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  ArrowRight,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronRight,
  Settings,
  X,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface MergedPreviewItem {
  fromClass: { id: string; name: string; grade: string; section: string | null };
  toClass: { id: string; name: string } | null;
  studentCount: number;
  students: Array<{ id: string; firstName: string; lastName: string }>;
  willGraduate: boolean;
}

export default function StudentPromotionPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);

  const {
    locale
  } = params;

  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { allYears: academicYears } = useAcademicYear();

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;
  const schoolId = user?.schoolId || school?.id;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  };

  const [step, setStep] = useState(1);
  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudentsResponse | null>(null);
  const [previewData, setPreviewData] = useState<PromotionPreviewResponse | null>(null);
  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  const handleLoadPreview = async () => {
    if (!fromYearId || !toYearId || !schoolId) {
      setError('Please select both academic years');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      const [eligible, preview] = await Promise.all([
        getEligibleStudents(schoolId, fromYearId, token || undefined),
        getPromotionPreview(schoolId, fromYearId, toYearId, token || undefined),
      ]);

      setEligibleStudents(eligible);
      setPreviewData(preview);

      const requests: PromotionRequest[] = [];
      eligible.classesByGrade?.forEach((classData) => {
        const classPreview = preview.preview.find((p) => p.fromClass.id === classData.class.id);
        if (!classPreview || classPreview.willGraduate) return;

        const targetClass = classPreview.targetClasses[0];
        if (!targetClass) return;

        classData.students.forEach((student) => {
          requests.push({
            studentId: student.id,
            fromClassId: classData.class.id,
            toClassId: targetClass.id,
            promotionType: 'AUTOMATIC',
          });
        });
      });

      setPromotions(requests);
      setStep(2);
    } catch (err: any) {
      setError('Error loading preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePromotion = async () => {
    if (!schoolId || promotions.length === 0) return;

    setExecuting(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      const userId = user?.id || 'SYSTEM';

      const response = await promoteStudents(
        schoolId,
        fromYearId,
        toYearId,
        promotions,
        userId,
        token || undefined
      );

      setResults(response);

      mutate(
        (key) => typeof key === 'string' && key.startsWith(`${STUDENT_SERVICE_URL}/students`),
        undefined,
        { revalidate: true }
      );

      setStep(4);
    } catch (err: any) {
      setError('Error executing promotion: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  const fromYear = academicYears.find((y) => y.id === fromYearId);
  const toYear = academicYears.find((y) => y.id === toYearId);

  const mergedPreview: MergedPreviewItem[] =
    eligibleStudents && previewData
      ? (eligibleStudents.classesByGrade || [])
          .map((classData) => {
            const p = previewData.preview.find((x) => x.fromClass.id === classData.class.id);
            if (!p) return null;
            const targetClass = p.willGraduate ? null : p.targetClasses[0];
            return {
              fromClass: classData.class,
              toClass: targetClass ? { id: targetClass.id, name: targetClass.name } : null,
              studentCount: classData.studentCount,
              students: classData.students.map((s) => ({
                id: s.id,
                firstName: s.firstName || '',
                lastName: s.lastName || '',
              })),
              willGraduate: p.willGraduate,
            };
          })
          .filter(Boolean) as MergedPreviewItem[]
      : [];

  const promotableStudents = mergedPreview
    .filter((p) => !p.willGraduate && p.toClass)
    .reduce((sum, p) => sum + p.studentCount, 0);
  const totalStudents = mergedPreview.reduce((sum, p) => sum + p.studentCount, 0);
  const graduatingStudents = mergedPreview
    .filter((p) => p.willGraduate)
    .reduce((sum, p) => sum + p.studentCount, 0);
  const nonPromotableStudents = totalStudents - promotableStudents - graduatingStudents;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-950/40 dark:via-amber-950/40 dark:to-yellow-950/40 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
          <div className="max-w-7xl mx-auto px-6 py-16 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest mb-6">
              <Settings className="w-3.5 h-3.5" />
              Administrative Logic
            </div>
            <h1 className="text-4xl lg:text-7xl font-black text-white tracking-tighter mb-4">
              Student <span className="text-orange-300">Promotion</span> Wizard
            </h1>
            <p className="text-white/70 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
              Orchestrate the seamless transition of student academic profiles across the temporal continuum.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Multi-Step Registry Stepper */}
          <div className="mb-16 flex items-center justify-center gap-2 sm:gap-6 flex-wrap">
            {[1, 2, 3, 4].map((num, idx) => {
              const isActive = step >= num;
              const isCurrent = step === num;
              return (
                <div key={num} className="flex items-center">
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center font-black transition-all duration-700 ${
                      isActive 
                        ? 'bg-gradient-to-br from-orange-500 to-yellow-500 text-white shadow-xl shadow-orange-500/20' 
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-800'
                    } ${isCurrent ? 'ring-4 ring-orange-500/10 scale-110' : ''}`}
                  >
                    {step > num ? <CheckCircle2 className="w-6 h-6" /> : num}
                    {isCurrent && (
                      <div className="absolute -inset-1 rounded-full border-2 border-orange-500 animate-ping opacity-20" />
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                      Step 0{num}
                    </p>
                    <p className={`text-xs font-bold leading-none mt-1 ${isActive ? 'text-orange-500' : 'text-gray-400 dark:text-gray-600'}`}>
                      {['Configuration', 'Simulation', 'Validation', 'Commitment'][num - 1]}
                    </p>
                  </div>
                  {idx < 3 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-4 rounded-full transition-colors duration-700 ${step > num ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-900'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-10 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-[2rem] p-6 flex items-center gap-4 animate-in slide-in-from-top-4">
              <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-widest text-[10px] mb-0.5">Wizard Aborted</p>
                <p className="text-sm text-rose-700 dark:text-rose-400 font-bold">{error}</p>
              </div>
              <button onClick={() => setError('')} className="p-2 text-rose-300 hover:text-rose-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-12 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:bg-orange-500/10 transition-all duration-700" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-12">
                  <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-[2rem] shadow-inner text-orange-600 dark:text-orange-400">
                    <Users className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Year Mapping</h2>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Select temporal boundaries for promotion</p>
                  </div>
                </div>

                {fromYear?.isPromotionDone && (
                  <div className="mb-10 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-[2rem] p-8 flex items-start gap-5 animate-in slide-in-from-left-4">
                    <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest text-[10px] mb-1">Status: Finalized</p>
                      <p className="text-amber-800 dark:text-amber-300 font-bold mb-1">Temporal Shift Already Executed</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                        The promotion cycle for {fromYear.name} has reached its conclusion. Subsequent attempts to re-initiate this cycle will be system-blocked to maintain record integrity.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">
                      Origin Epoch (Source)
                    </label>
                    <div className="relative group/select">
                      <select
                        value={fromYearId}
                        onChange={(e) => setFromYearId(e.target.value)}
                        className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black tracking-tight appearance-none transition-all"
                      >
                        <option value="">Select source year</option>
                        {academicYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name} — {year.isCurrent ? 'ACTIVE' : 'ARCHIVED'}
                            {year.isPromotionDone ? ' [CONSIDERED DONE]' : ''}
                          </option>
                        ))}
                      </select>
                      <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-hover/select:text-orange-500 transition-colors pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">
                      Target Horizon (Future)
                    </label>
                    <div className="relative group/select">
                      <select
                        value={toYearId}
                        onChange={(e) => setToYearId(e.target.value)}
                        className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black tracking-tight appearance-none transition-all"
                      >
                        <option value="">Select target year</option>
                        {academicYears
                          .filter((y) => y.id !== fromYearId)
                          .map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name} — {year.isCurrent ? 'PLATFORM CORE' : 'FUTURE'}
                            </option>
                          ))}
                      </select>
                      <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-hover/select:text-orange-500 transition-colors pointer-events-none" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLoadPreview}
                  disabled={!fromYearId || !toYearId || loading || fromYear?.isPromotionDone === true}
                  className="w-full group relative px-10 py-6 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-orange-500/30 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-4">
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Calculating Trajectories...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        Initialize Logic Simulation
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Students</span>
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Can Promote</span>
                    <UserCheck className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-green-600">{promotableStudents}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Graduating / Other</span>
                    <UserX className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-600">
                    {graduatingStudents + nonPromotableStudents}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {mergedPreview.map((p) => (
                  <div
                    key={p.fromClass.id}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900">{p.fromClass.name}</h3>
                        <p className="text-sm text-gray-600">{p.studentCount} students</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        {p.willGraduate ? (
                          <div>
                            <p className="font-bold text-gray-600">Graduating</p>
                            <p className="text-xs text-gray-500">Grade 12</p>
                          </div>
                        ) : p.toClass ? (
                          <div>
                            <p className="font-bold text-green-600">{p.toClass.name}</p>
                            <p className="text-xs text-green-600">✓ Available</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-red-600">No Target Class</p>
                            <p className="text-xs text-red-600">✗ Cannot promote</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {p.students.length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm text-gray-600 mb-2">Students:</p>
                        <div className="flex flex-wrap gap-2">
                          {p.students.slice(0, 5).map((s) => (
                            <span
                              key={s.id}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {s.firstName} {s.lastName}
                            </span>
                          ))}
                          {p.students.length > 5 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                              +{p.students.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={promotableStudents === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Execute
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none hover:translate-y-[-5px] transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Manifest</p>
                      <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{totalStudents}</h3>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none hover:translate-y-[-5px] transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Validated Shift</p>
                      <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{promotableStudents}</h3>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none hover:translate-y-[-5px] transition-all group overflow-hidden relative text-gray-400">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all duration-700" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1">Graduation Exit</p>
                      <h3 className="text-4xl font-black tracking-tighter">
                        {graduatingStudents + nonPromotableStudents}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3 ml-2">
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                  Promotion Matrix Preview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mergedPreview.map((p) => (
                    <div
                      key={p.fromClass.id}
                      className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 hover:shadow-2xl transition-all group/card"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Source Block</p>
                          <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{p.fromClass.name}</h4>
                          <span className="inline-block mt-2 px-3 py-1 bg-gray-50 dark:bg-gray-950 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg">{p.studentCount} Modules</span>
                        </div>
                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-950 rounded-2xl flex items-center justify-center text-gray-400 group-hover/card:scale-110 transition-transform">
                          <ArrowRight className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          {p.willGraduate ? (
                            <>
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">System Exit</p>
                              <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-none uppercase">GRADUATE</h4>
                            </>
                          ) : p.toClass ? (
                            <>
                              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Target Horizon</p>
                              <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{p.toClass.name}</h4>
                            </>
                          ) : (
                            <>
                              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Blockage Detected</p>
                              <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none uppercase">NO_TARGET</h4>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {p.students.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                          <div className="flex flex-wrap gap-2">
                            {p.students.slice(0, 5).map((s) => (
                              <span
                                key={s.id}
                                className="px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold rounded-xl text-[10px] border border-gray-200 dark:border-gray-800 shadow-sm"
                              >
                                {s.firstName} {s.lastName}
                              </span>
                            ))}
                            {p.students.length > 5 && (
                              <span className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-black rounded-xl text-[10px] uppercase tracking-widest">
                                +{p.students.length - 5} Others
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-10 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:text-gray-900 dark:hover:text-white transition-all shadow-xl shadow-gray-200/50 dark:shadow-none"
                >
                  Regen Sim Logic
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={promotableStudents === 0}
                  className="flex-[2] group relative px-10 py-5 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-orange-500/30 overflow-hidden disabled:opacity-50"
                >
                   <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                   <span className="relative flex items-center justify-center gap-3">
                     Finalize Data Stream <ChevronRight className="w-4 h-4" />
                   </span>
                </button>
              </div>
            </div>
          )}

          {step === 4 && results && (
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-12 overflow-hidden relative group animate-in zoom-in-95 duration-700">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:bg-emerald-500/10 transition-all duration-700" />
              
              <div className="relative z-10">
                <div className="text-center mb-12">
                  <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce-subtle">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] mb-2">Protocol Successful</p>
                  <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">Promotion Finalized</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto">
                    The student academic trajectories have been successfully remapped to the new temporal horizon.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-[2rem] p-8 border border-emerald-100/50 dark:border-emerald-500/10 text-center group/stat">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Modules Promoted</p>
                    <p className="text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter group-hover:scale-110 transition-transform">
                      {results.results?.promoted ?? results.results?.successCount ?? 0}
                    </p>
                  </div>
                  <div className="bg-rose-50/50 dark:bg-rose-500/5 rounded-[2rem] p-8 border border-rose-100/50 dark:border-rose-500/10 text-center group/stat">
                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-2">Anomalies Detected</p>
                    <p className="text-5xl font-black text-rose-600 dark:text-rose-400 tracking-tighter group-hover:scale-110 transition-transform">
                      {results.results?.failed ?? results.results?.failureCount ?? 0}
                    </p>
                  </div>
                </div>

                {(results.results?.errors?.length > 0 || results.results?.failed > 0) && (
                  <div className="bg-gray-50 dark:bg-gray-950 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 mb-12 animate-in slide-in-from-bottom-4">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <AlertCircle className="w-3.5 h-3.5" />
                       Anomaly Log
                    </p>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                      {(results.results.errors || []).map((e: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                          <span className="text-[10px] font-mono text-gray-400">#{e.studentId?.slice(-4) || idx}</span>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{e.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-6">
                  <button
                    onClick={() => router.push(`/${locale}/students`)}
                    className="flex-1 px-10 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:text-gray-900 dark:hover:text-white transition-all shadow-xl shadow-gray-200/50 dark:shadow-none"
                  >
                    Return to Registry
                  </button>
                  <button
                    onClick={() => {
                      setStep(1);
                      setFromYearId('');
                      setToYearId('');
                      setEligibleStudents(null);
                      setPreviewData(null);
                      setPromotions([]);
                      setResults(null);
                      setError('');
                    }}
                    className="flex-[1.5] group relative px-10 py-5 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-orange-500/30 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-3">
                      <RefreshCw className="w-4 h-4" />
                      Initialize New Cycle
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
