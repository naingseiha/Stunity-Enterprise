'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { archiveAcademicYear, updateAcademicYear } from '@/lib/api/academic-years';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import {
  Calendar,
  CheckCircle,
  TrendingUp,
  Archive,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  AlertCircle,
  Lock,
  Sparkles,
  Settings,
  X,
  Loader2,
} from 'lucide-react';

export default function YearEndWorkflowPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearId = searchParams.get('yearId');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${params.locale}/login`);
  };

  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const { years, isLoading: isLoadingYears, mutate: mutateYears } = useAcademicYearsList(school?.id);
  const currentYear = useMemo(() => {
    if (!years.length) return null;
    if (yearId) {
      return years.find((year) => year.id === yearId) || null;
    }
    return years.find((year) => year.isCurrent) || null;
  }, [yearId, years]);
  const loading = Boolean(school?.id) && isLoadingYears && years.length === 0;

  useEffect(() => {
    if (TokenManager.getAccessToken() && school?.id) return;
    router.push(`/${params.locale}/auth/login`);
  }, [params.locale, router, school?.id]);

  const handleCloseYear = async () => {
    if (!currentYear) return;

    try {
      setProcessing(true);
      const token = TokenManager.getAccessToken();
      if (!token || !school?.id) return;

      await updateAcademicYear(
        school.id,
        currentYear.id,
        {
          status: 'ENDED',
          isCurrent: false,
        },
        token
      );

      await mutateYears();
      setStep((currentStep) => currentStep + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to close academic year');
    } finally {
      setProcessing(false);
    }
  };

  const handleArchiveYear = async () => {
    if (!currentYear) return;

    try {
      setProcessing(true);
      const token = TokenManager.getAccessToken();
      if (!token || !school?.id) return;

      await archiveAcademicYear(school.id, currentYear.id, token);
      await mutateYears();
      setStep((currentStep) => currentStep + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to archive academic year');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    const userData = TokenManager.getUserData();
    return <PageSkeleton user={userData?.user} school={userData?.school} type="form" showFilters={false} />;
  }

  if (error || !currentYear) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
            <p className="text-red-700 mb-4">{error || 'Academic year not found'}</p>
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              Back to Academic Years
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Review', description: 'Check completion', icon: FileText },
    { number: 2, title: 'Promote', description: 'Move students', icon: TrendingUp },
    { number: 3, title: 'Close', description: 'Mark ended', icon: Lock },
    { number: 4, title: 'Archive', description: 'For records', icon: Archive },
    { number: 5, title: 'Complete', description: 'Finished', icon: CheckCircle },
  ];

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-950/40 dark:via-amber-950/40 dark:to-yellow-950/40 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
          <div className="max-w-7xl mx-auto px-6 py-16 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest mb-6">
              <Settings className="w-3.5 h-3.5" />
              Temporal Lifecycle
            </div>
            <button
              onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
              className="group mx-auto flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-all text-xs font-bold uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return to Year Registry
            </button>
            <h1 className="text-4xl lg:text-7xl font-black text-white tracking-tighter mb-4">
              Year-End <span className="text-orange-300">Workflow</span>
            </h1>
            <p className="text-white/70 font-medium max-w-2xl mx-auto text-lg leading-relaxed mb-6">
              Orchestrate the final closure and archival sequence for the {currentYear.name} academic epoch.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Progress Steps */}
          <div className="mb-16 flex items-center justify-center gap-2 sm:gap-6 flex-wrap">
            {steps.map((s, idx) => {
              const StepIcon = s.icon;
              const isActive = step >= s.number;
              const isCurrent = step === s.number;
              const isCompleted = step > s.number;

              return (
                <div key={s.number} className="flex items-center">
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center font-black transition-all duration-700 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                        : isActive
                        ? 'bg-gradient-to-br from-orange-500 to-yellow-500 text-white shadow-xl shadow-orange-500/20'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-800'
                    } ${isCurrent ? 'ring-4 ring-orange-500/10 scale-110' : ''}`}
                  >
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : <StepIcon className="w-6 h-6" />}
                    {isCurrent && (
                      <div className="absolute -inset-1 rounded-full border-2 border-orange-500 animate-ping opacity-20" />
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                      {s.title}
                    </p>
                    <p className={`text-[9px] font-bold leading-none mt-1 ${isActive ? 'text-orange-500' : 'text-gray-400 dark:text-gray-600'}`}>
                      {s.description}
                    </p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-4 rounded-full transition-colors duration-700 ${step > s.number ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-gray-900'}`} />
                  )}
                </div>
              );
            })}
          </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-12 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:bg-orange-500/10 transition-all duration-700" />
          
          <div className="relative z-10">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8 tracking-tighter">Diagnostic Review</h2>
                <div className="space-y-6 mb-12">
                  <div className="flex items-center justify-between p-8 bg-gray-50 dark:bg-gray-950 rounded-[2rem] border border-gray-100 dark:border-gray-800 group/item">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-inner text-blue-600 dark:text-blue-400 group-hover/item:scale-110 transition-transform">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Target Module</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{currentYear.name}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      currentYear.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                    }`}>
                      {currentYear.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-8 bg-gray-50 dark:bg-gray-950 rounded-[2rem] border border-gray-100 dark:border-gray-800 group/item">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-inner text-purple-600 dark:text-purple-400 group-hover/item:scale-110 transition-transform">
                        <Users className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Student Transition</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{currentYear.isPromotionDone ? 'VALIDATED' : 'PENDING ACTION'}</p>
                      </div>
                    </div>
                    {currentYear.isPromotionDone ? (
                      <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="p-3 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20 animate-pulse">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-6">
                  <button
                    onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                    className="flex-1 px-10 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:text-gray-900 dark:hover:text-white transition-all shadow-xl shadow-gray-200/50 dark:shadow-none"
                  >
                    Abort Workflow
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-[2] group relative px-10 py-5 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-orange-500/30 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-4">
                      Advance Phase <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 text-center">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">Temporal Transition</h2>
                <div className="max-w-xl mx-auto mb-10">
                  <div className={`p-10 rounded-[3rem] border transition-all ${
                    currentYear.isPromotionDone 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50' 
                      : 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/50'
                  }`}>
                    {currentYear.isPromotionDone ? (
                      <div className="space-y-6">
                        <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-500/20">
                          <CheckCircle className="w-10 h-10" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight mb-2">Promotion Sync Verified</h3>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-bold opacity-70">All academic profiles have been migrated to the subsequent epoch.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="w-20 h-20 bg-orange-500 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-orange-500/20 animate-bounce">
                          <TrendingUp className="w-10 h-10" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-orange-900 dark:text-orange-100 tracking-tight mb-4">Critical Action Required</h3>
                          <button
                            onClick={() => router.push(`/${params.locale}/settings/promotion?yearId=${currentYear.id}`)}
                            className="w-full flex items-center justify-center gap-4 px-8 py-5 bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 rounded-3xl font-black uppercase tracking-widest text-xs border-2 border-orange-500/20 hover:bg-orange-600 hover:text-white transition-all shadow-xl"
                          >
                            Execute Promotion Wizard
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-6">
                  <button onClick={() => setStep(1)} className="flex-1 px-10 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:text-gray-900 dark:hover:text-white transition-all">
                    Back to Review
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!currentYear.isPromotionDone}
                    className={`flex-[2] group relative px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-2xl overflow-hidden ${
                      currentYear.isPromotionDone 
                        ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white shadow-orange-500/30' 
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-4">
                      Advance Workflow <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 text-center">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">System Lock Initiation</h2>
                <div className="p-10 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-[3rem] mb-12 max-w-xl mx-auto">
                    <div className="w-20 h-20 bg-rose-500 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-2xl shadow-rose-500/20 mb-8">
                        <Lock className="w-10 h-10" />
                    </div>
                    <p className="text-rose-900 dark:text-rose-100 font-bold text-lg mb-4 tracking-tight">Authorizing Final Epoch Closure</p>
                    <p className="text-sm text-rose-700 dark:text-rose-400 font-bold opacity-80 leading-relaxed uppercase tracking-widest text-[10px]">
                        This sequence will transition the registry to read-only Status. This action is architecturally permanent for the {currentYear.name} block.
                    </p>
                </div>

                <div className="flex gap-6">
                  <button onClick={() => setStep(2)} className="flex-1 px-10 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-[10px]">
                    Back
                  </button>
                  <button
                    onClick={handleCloseYear}
                    disabled={processing}
                    className="flex-[2] group relative px-10 py-5 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-rose-500/30 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-4">
                      {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                      Executive Force-Close
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 text-center">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">Cold Archive Sequence</h2>
                <div className="p-10 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-[3rem] mb-12 max-w-xl mx-auto">
                    <div className="w-20 h-20 bg-gray-900 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-2xl mb-8">
                        <Archive className="w-10 h-10" />
                    </div>
                    <p className="text-gray-900 dark:text-white font-bold text-lg mb-4 tracking-tight">Temporal Archival Protocol</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 font-bold opacity-80 leading-relaxed uppercase tracking-widest text-[10px]">
                        Migrate the validated registry to historical data storage. Active temporal presence will be terminated.
                    </p>
                </div>

                <div className="flex gap-6">
                  <button onClick={() => router.push(`/${params.locale}/settings/academic-years`)} className="flex-1 px-10 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-[10px]">
                    Skip Archival
                  </button>
                  <button
                    onClick={handleArchiveYear}
                    disabled={processing}
                    className="flex-[2] group relative px-10 py-5 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-4">
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                      Initialize Cold Storage
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="text-center py-20 animate-in zoom-in-95 duration-1000">
                <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[3rem] shadow-2xl shadow-emerald-500/30 flex items-center justify-center mx-auto mb-10 group transition-transform hover:rotate-[360deg] duration-1000">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>
                <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">Cycle <span className="text-emerald-500">Terminated</span></h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-12">Registry Block {currentYear.name} is now archived</p>
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                  className="px-12 py-6 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-500/30"
                >
                  Return to Year Registry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* End main content wrapper */}
    </div>
    </>
  );
}
