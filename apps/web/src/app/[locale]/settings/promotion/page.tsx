'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

interface MergedPreviewItem {
  fromClass: { id: string; name: string; grade: string; section: string | null };
  toClass: { id: string; name: string } | null;
  studentCount: number;
  students: Array<{ id: string; firstName: string; lastName: string }>;
  willGraduate: boolean;
}

export default function StudentPromotionPage({ params: { locale } }: { params: { locale: string } }) {
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

      <div className="lg:ml-64 min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Promotion Wizard</h1>
            <p className="text-gray-600">
              Promote students from one academic year to the next automatically
            </p>
          </div>

          <div className="mb-8 flex items-center justify-center gap-4">
            {[1, 2, 3, 4].map((num, idx) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= num
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {['Select Years', 'Preview', 'Execute', 'Complete'][num - 1]}
                </span>
                {idx < 3 && <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-500" />
                Select Academic Years
              </h2>
              {fromYear?.isPromotionDone && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Promotion already completed</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Students from {fromYear.name} have already been promoted. You cannot run promotion from this year again. No data will be changed if you try—the system will block the action.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Academic Year (Source)
                  </label>
                  <select
                    value={fromYearId}
                    onChange={(e) => setFromYearId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select source year...</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} ({year.isCurrent ? 'Current' : 'Past'})
                        {year.isPromotionDone ? ' — promotion done' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Academic Year (Target)
                  </label>
                  <select
                    value={toYearId}
                    onChange={(e) => setToYearId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select target year...</option>
                    {academicYears
                      .filter((y) => y.id !== fromYearId)
                      .map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name} ({year.isCurrent ? 'Current' : 'Future'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleLoadPreview}
                disabled={!fromYearId || !toYearId || loading || fromYear?.isPromotionDone === true}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading Preview...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Load Preview
                  </>
                )}
              </button>
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

          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                Confirm Promotion
              </h2>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
                <p className="text-orange-900 mb-4">
                  You are about to promote <strong>{promotableStudents} students</strong> from{' '}
                  <strong>{fromYear?.name}</strong> to <strong>{toYear?.name}</strong>.
                </p>
                <p className="text-sm text-orange-800">
                  This action will create progression records, assign students to their new classes,
                  and deactivate old enrollments. This cannot be easily undone.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={executing}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back to Preview
                </button>
                <button
                  onClick={handleExecutePromotion}
                  disabled={executing}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {executing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Execute Promotion
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 4 && results && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Promotion Complete!</h2>
                <p className="text-gray-600">
                  Successfully promoted {results.results?.promoted ?? results.results?.successCount ?? 0}{' '}
                  students
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {results.results?.promoted ?? results.results?.successCount ?? 0}
                  </p>
                  <p className="text-sm text-green-700">Successful</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {results.results?.failed ?? results.results?.failureCount ?? 0}
                  </p>
                  <p className="text-sm text-red-700">Failed</p>
                </div>
              </div>
              {(results.results?.errors?.length > 0 || results.results?.failed > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="font-semibold text-red-900 mb-2">Failed Promotions:</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    {(results.results.errors || []).map((e: any, idx: number) => (
                      <li key={idx}>
                        {e.studentId}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={() => router.push(`/${locale}/students`)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  View Students
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
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
                >
                  <RefreshCw className="w-5 h-5" />
                  Start New Promotion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
