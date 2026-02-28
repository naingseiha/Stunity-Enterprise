'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { SCHOOL_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
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
} from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
  isPromotionDone: boolean;
}

export default function YearEndWorkflowPage({ params }: { params: { locale: string } }) {
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

  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (yearId) {
      loadYearDetails();
    } else {
      loadCurrentYear();
    }
  }, [yearId]);

  const loadYearDetails = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${params.locale}/auth/login`);
        return;
      }

      const response = await fetch(
        `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${yearId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setCurrentYear(result.data);
      } else {
        setError('Failed to load academic year');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentYear = async () => {
    try {
      setLoading(true);
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
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        const current = result.data.find((y: AcademicYear) => y.isCurrent);
        if (current) {
          setCurrentYear(current);
        } else {
          setError('No current academic year found');
        }
      } else {
        setError('Failed to load academic years');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseYear = async () => {
    if (!currentYear) return;

    try {
      setProcessing(true);
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      const response = await fetch(
        `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${currentYear.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'ENDED',
            isCurrent: false,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setStep(step + 1);
        loadYearDetails();
      } else {
        setError('Failed to close academic year');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleArchiveYear = async () => {
    if (!currentYear) return;

    try {
      setProcessing(true);
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) return;

      const response = await fetch(
        `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${currentYear.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'ARCHIVED',
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setStep(step + 1);
      } else {
        setError('Failed to archive academic year');
      }
    } catch (err: any) {
      setError(err.message);
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
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Academic Years
          </button>
          <h1 className="text-3xl font-bold mb-2">Year-End Workflow</h1>
          <p className="text-orange-50">Complete academic year: {currentYear.name}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => {
              const StepIcon = s.icon;
              const isActive = step === s.number;
              const isCompleted = step > s.number;

              return (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : isActive
                          ? 'bg-gradient-to-br from-orange-500 to-yellow-500 text-white ring-4 ring-orange-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <StepIcon className="w-6 h-6" />}
                    </div>
                    <p className={`text-sm font-medium text-center hidden md:block ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {s.title}
                    </p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 rounded-full transition-colors ${step > s.number ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Academic Year</h2>
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Academic Year</p>
                      <p className="text-sm text-gray-600">{currentYear.name}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentYear.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {currentYear.status}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Student Promotion</p>
                      <p className="text-sm text-gray-600">{currentYear.isPromotionDone ? 'Completed' : 'Not started'}</p>
                    </div>
                  </div>
                  {currentYear.isPromotionDone ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Promote Students</h2>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
                {currentYear.isPromotionDone ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Promotion Complete</h3>
                      <p className="text-sm text-green-800">All students promoted.</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-orange-900 mb-2">Promotion Required</h3>
                    <button
                      onClick={() => router.push(`/${params.locale}/settings/promotion?yearId=${currentYear.id}`)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4" /> Promotion Wizard
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl flex items-center justify-center gap-2">
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!currentYear.isPromotionDone}
                  className={`flex-1 px-6 py-3 rounded-xl flex items-center justify-center gap-2 ${
                    currentYear.isPromotionDone ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Close Academic Year</h2>
              <p className="text-gray-600 mb-8">Mark year as ended (read-only).</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl flex items-center justify-center gap-2">
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button
                  onClick={handleCloseYear}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  {processing ? 'Closing...' : <><Lock className="w-5 h-5" /> Close Year</>}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Archive Year</h2>
              <p className="text-gray-600 mb-8">Move to historical records.</p>
              <div className="flex gap-3">
                <button onClick={() => router.push(`/${params.locale}/settings/academic-years`)} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl">
                  Skip
                </button>
                <button
                  onClick={handleArchiveYear}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  {processing ? 'Archiving...' : <><Archive className="w-5 h-5" /> Archive</>}
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Complete!</h2>
              <p className="text-gray-600 mb-8">Year {currentYear.name} closed and archived.</p>
              <button
                onClick={() => router.push(`/${params.locale}/settings/academic-years`)}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold"
              >
                Back to Academic Years
              </button>
            </div>
          )}
        </div>
      </div>
      {/* End main content wrapper */}
    </div>
    </>
  );
}
