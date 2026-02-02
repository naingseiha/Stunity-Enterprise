'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
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

interface Student {
  id: string;
  studentId: string;
  name: {
    latin: string;
    khmer: string | null;
  };
  gender: string;
  photo: string | null;
  canPromote: boolean;
}

interface PromotionPreview {
  fromClass: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
    studentCount: number;
  };
  toClass: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
  } | null;
  students: Student[];
}

export default function StudentPromotionPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const { allYears: academicYears, selectedYear, setSelectedYear: selectYear } = useAcademicYear();
  
  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };
  
  const [step, setStep] = useState(1); // 1: Select Years, 2: Preview, 3: Execute, 4: Complete
  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [preview, setPreview] = useState<PromotionPreview[]>([]);
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
    if (!fromYearId || !toYearId) {
      setError('Please select both academic years');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/promote/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fromAcademicYearId: fromYearId,
            toAcademicYearId: toYearId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setPreview(data.data.preview);
        setStep(2);
      } else {
        setError(data.message || 'Failed to load preview');
      }
    } catch (err: any) {
      setError('Error loading preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePromotion = async () => {
    setExecuting(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      
      // Build promotions array
      const promotions = preview
        .filter((p) => p.toClass) // Only promotable classes
        .flatMap((p) =>
          p.students
            .filter((s) => s.canPromote)
            .map((s) => ({
              studentId: s.id,
              fromClassId: p.fromClass.id,
              toClassId: p.toClass!.id,
            }))
        );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/promote/automatic`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fromAcademicYearId: fromYearId,
            toAcademicYearId: toYearId,
            promotions,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        setStep(4);
      } else {
        setError(data.message || 'Failed to execute promotion');
      }
    } catch (err: any) {
      setError('Error executing promotion: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  const fromYear = academicYears.find((y) => y.id === fromYearId);
  const toYear = academicYears.find((y) => y.id === toYearId);
  
  const totalStudents = preview.reduce((sum, p) => sum + p.students.length, 0);
  const promotableStudents = preview
    .filter((p) => p.toClass)
    .reduce((sum, p) => sum + p.students.filter((s) => s.canPromote).length, 0);
  const nonPromotableStudents = totalStudents - promotableStudents;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
      
      {/* Main Content - Add left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Promotion Wizard</h1>
          <p className="text-gray-600">
            Promote students from one academic year to the next automatically
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[
            { num: 1, label: 'Select Years' },
            { num: 2, label: 'Preview' },
            { num: 3, label: 'Execute' },
            { num: 4, label: 'Complete' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${
                    step >= s.num
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">{s.label}</span>
              {idx < 3 && <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Select Academic Years */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-500" />
              Select Academic Years
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* From Year */}
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
                    </option>
                  ))}
                </select>
              </div>

              {/* To Year */}
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
              disabled={!fromYearId || !toYearId || loading}
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

        {/* Step 2: Preview */}
        {step === 2 && (
          <div>
            {/* Summary Cards */}
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
                  <span className="text-sm font-medium text-gray-600">Cannot Promote</span>
                  <UserX className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-600">{nonPromotableStudents}</p>
              </div>
            </div>

            {/* Preview List */}
            <div className="space-y-4 mb-6">
              {preview.map((p) => (
                <div
                  key={p.fromClass.id}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{p.fromClass.name}</h3>
                      <p className="text-sm text-gray-600">
                        {p.students.length} students
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      {p.toClass ? (
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

                  {/* Student List Preview (first 5) */}
                  {p.students.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-600 mb-2">Students:</p>
                      <div className="flex flex-wrap gap-2">
                        {p.students.slice(0, 5).map((s) => (
                          <span
                            key={s.id}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            {s.name.latin}
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

            {/* Action Buttons */}
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

        {/* Step 3: Confirmation */}
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
                This action will create progression records and assign students to their new classes.
                This cannot be easily undone.
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

        {/* Step 4: Results */}
        {step === 4 && results && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Promotion Complete!</h2>
              <p className="text-gray-600">
                Successfully promoted {results.successCount} students
              </p>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{results.successCount}</p>
                <p className="text-sm text-green-700">Successful</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{results.failureCount}</p>
                <p className="text-sm text-red-700">Failed</p>
              </div>
            </div>

            {/* Failed Students (if any) */}
            {results.failureCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="font-semibold text-red-900 mb-2">Failed Promotions:</p>
                <ul className="text-sm text-red-800 space-y-1">
                  {results.results.failed.map((f: any, idx: number) => (
                    <li key={idx}>
                      {f.studentId}: {f.reason}
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
                  setPreview([]);
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
      {/* End main content wrapper */}
    </div>
    </>
  );
}
