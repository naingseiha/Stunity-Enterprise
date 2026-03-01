'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import {
  getEligibleStudents,
  getPromotionPreview,
  promoteStudents,
  type EligibleStudentsResponse,
  type PromotionPreviewResponse,
  type PromotionRequest,
} from '@/lib/api/promotion';
import { getAcademicYears, type AcademicYear } from '@/lib/api/academic-years';
import { TokenManager } from '@/lib/api/auth';

export default function PromotionWizardPage() {
  const params = useParams();
  const router = useRouter();
  const fromYearId = params.id as string;
  const { schoolId } = useAcademicYear();
  const user = TokenManager.getUserData()?.user;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Data
  const [fromYear, setFromYear] = useState<AcademicYear | null>(null);
  const [toYear, setToYear] = useState<AcademicYear | null>(null);
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudentsResponse | null>(null);
  const [preview, setPreview] = useState<PromotionPreviewResponse | null>(null);
  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [result, setResult] = useState<any>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        console.log('🔍 Loading promotion data...', { schoolId, fromYearId });
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token || !schoolId) {
          console.error('Missing token or schoolId');
          return;
        }
        
        // Get all academic years
        const years = await getAcademicYears(schoolId!, token);
        console.log('✅ Loaded years:', years.length);
        setAllYears(years);
        
        // Find the from year
        const from = years.find(y => y.id === fromYearId);
        console.log('✅ From year:', from?.name);
        setFromYear(from || null);
        
        // Find the NEXT year only (not all future years)
        // Sort years by start date and find the year immediately after fromYear
        if (from) {
          const sortedYears = years
            .filter(y => y.id !== fromYearId) // Exclude current year
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
          
          // Find first year that starts after current year
          const nextYear = sortedYears.find(y => 
            new Date(y.startDate) > new Date(from.endDate)
          );
          
          if (nextYear) {
            console.log('✅ Next year (auto-selected):', nextYear.name);
            setToYear(nextYear);
          } else {
            console.warn('⚠️ No next year found');
          }
        }
        
        // Get eligible students
        console.log('📚 Fetching eligible students...');
        const eligible = await getEligibleStudents(schoolId!, fromYearId, token || undefined);
        console.log('✅ Eligible students:', eligible.totalStudents);
        setEligibleStudents(eligible);
      } catch (error: any) {
        console.error('❌ Error loading promotion data:', error);
        alert(`Error loading data: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
    
    if (schoolId && fromYearId) {
      loadData();
    } else {
      console.warn('⚠️ Missing required data:', { schoolId, fromYearId });
      setLoading(false);
    }
  }, [schoolId, fromYearId]);

  // Generate preview when target year selected
  useEffect(() => {
    async function loadPreview() {
      if (!toYear || !schoolId || !eligibleStudents) return;
      
      try {
        console.log('🔄 Loading promotion preview...');
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const previewData = await getPromotionPreview(schoolId, fromYearId, toYear.id, token || undefined);
        setPreview(previewData);
        
        console.log('✅ Preview loaded:', previewData);
        console.log('📚 Eligible students:', eligibleStudents);
        
        // Auto-generate promotion requests
        const requests: PromotionRequest[] = [];
        
        // Iterate through each class in eligible students
        eligibleStudents.classesByGrade?.forEach((classData) => {
          // Find matching preview data for this class
          const classPreview = previewData.preview.find(
            p => p.fromClass.id === classData.class.id
          );
          
          if (!classPreview) {
            console.warn(`⚠️ No preview found for class ${classData.class.name}`);
            return;
          }
          
          if (classPreview.willGraduate) {
            console.log(`🎓 Skipping graduates in ${classData.class.name}`);
            return;
          }
          
          // Get first available target class
          const targetClass = classPreview.targetClasses[0];
          if (!targetClass) {
            console.warn(`⚠️ No target class for ${classData.class.name}`);
            return;
          }
          
          console.log(`✅ Mapping ${classData.class.name} (${classData.students.length} students) → ${targetClass.name}`);
          
          // Add all students from this class
          classData.students.forEach(student => {
            requests.push({
              studentId: student.id,
              fromClassId: classData.class.id,
              toClassId: targetClass.id,
              promotionType: 'AUTOMATIC',
            });
          });
        });
        
        console.log(`✅ Built ${requests.length} promotion requests`);
        setPromotions(requests);
      } catch (error) {
        console.error('❌ Error loading preview:', error);
      }
    }
    
    loadPreview();
  }, [toYear, schoolId, fromYearId, eligibleStudents]);

  const handlePromote = async () => {
    if (!toYear || !schoolId) return;
    
    // Validate promotions array
    if (!promotions || promotions.length === 0) {
      alert('Error: No students to promote. Please go back and select a target year.');
      return;
    }
    
    console.log(`🚀 Starting promotion of ${promotions.length} students...`);
    console.log('Promotions:', promotions.slice(0, 3)); // Log first 3
    
    try {
      setProcessing(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await promoteStudents(
        schoolId,
        fromYearId,
        toYear.id,
        promotions,
        user?.id || 'SYSTEM',
        token || undefined
      );
      
      console.log('✅ Promotion successful:', response);
      setResult(response);
      setStep(5); // Move to results step
    } catch (error: any) {
      console.error('❌ Promotion failed:', error);
      alert(`Error: ${error.message || 'Failed to promote students'}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading promotion wizard...</p>
          <p className="mt-2 text-xs text-gray-500">School ID: {schoolId?.substring(0, 8)}...</p>
          <p className="text-xs text-gray-500">Year ID: {fromYearId?.substring(0, 8)}...</p>
        </div>
      </div>
    );
  }

  // Show error if data failed to load
  if (!fromYear) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-semibold text-red-800 mb-2">Unable to Load Promotion Data</h2>
          <p className="text-red-600 mb-4">
            The academic year could not be found. This may be due to:
          </p>
          <ul className="text-left text-red-700 mb-4 space-y-1">
            <li>• The academic year does not exist</li>
            <li>• You don't have permission to access this year</li>
            <li>• The school ID is incorrect</li>
          </ul>
          <div className="text-xs text-gray-600 bg-gray-100 p-3 rounded mb-4">
            <p>School ID: {schoolId}</p>
            <p>Year ID: {fromYearId}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Back to Academic Years
          </button>
        </div>
      </div>
    );
  }

  // Promotion already completed for this year — block re-run and explain
  if (fromYear.isPromotionDone) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-amber-900 mb-2">Promotion already completed</h2>
          <p className="text-amber-800 mb-4">
            Students from <strong>{fromYear.name}</strong> have already been promoted. Running promotion again from this year is not allowed, and the system will not change any data if you try.
          </p>
          <p className="text-sm text-amber-700 mb-6">
            To promote students, use a source year that has not yet had its promotion run (e.g. the next year when it ends).
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            ← Back to Academic Years
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          ← Back to Academic Years
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Student Promotion Wizard</h1>
        <p className="text-gray-600 mt-2">
          Promote students from {fromYear?.name} to the next academic year
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 5 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    s < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-gray-600">Select</span>
          <span className="text-gray-600">Review</span>
          <span className="text-gray-600">Adjust</span>
          <span className="text-gray-600">Confirm</span>
          <span className="text-gray-600">Results</span>
        </div>
      </div>

      {/* Step 1: Confirm Target Year (Auto-selected) */}
      {step === 1 && toYear && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Step 1: Confirm Target Academic Year</h2>
          <p className="text-gray-600 mb-6">
            Students will be promoted to the next academic year:
          </p>

          <div className="max-w-md">
            <div className="p-6 border-2 border-blue-500 bg-blue-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{toYear.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(toYear.startDate).toLocaleDateString()} -{' '}
                    {new Date(toYear.endDate).toLocaleDateString()}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      toYear.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : toYear.status === 'PLANNING'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {toYear.status}
                  </span>
                </div>
                <div className="text-green-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ The next academic year has been automatically selected. Students will be promoted one grade level up.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Show error if no next year found */}
      {step === 1 && !toYear && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Next Year Available</h3>
            <p className="text-yellow-700">
              There is no academic year configured after {fromYear?.name}. 
              Please create the next academic year before promoting students.
            </p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              ← Back to Academic Years
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review Preview - Continued in next message due to length */}
      {step === 2 && preview && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Step 2: Review Promotion Preview</h2>
          <p className="text-gray-600 mb-6">
            Preview of student promotions from {fromYear?.name} to {toYear?.name}
          </p>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-blue-600">{preview.summary.totalStudents}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Promoting</p>
              <p className="text-2xl font-bold text-green-600">{preview.summary.promotingStudents}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Graduating</p>
              <p className="text-2xl font-bold text-purple-600">{preview.summary.graduatingStudents}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Classes</p>
              <p className="text-2xl font-bold text-gray-600">{preview.summary.totalClasses}</p>
            </div>
          </div>

          {/* Class-by-class breakdown */}
          <div className="space-y-4">
            {preview.preview.map((classPreview, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {classPreview.fromClass.name} ({classPreview.studentCount} students)
                    </h3>
                    {classPreview.willGraduate ? (
                      <p className="text-purple-600 mt-1">→ Will Graduate 🎓</p>
                    ) : classPreview.targetClasses.length > 0 ? (
                      <p className="text-gray-600 mt-1">
                        → {classPreview.targetClasses.map(c => c.name).join(', ')}
                      </p>
                    ) : (
                      <p className="text-red-600 mt-1">⚠️ No target class available</p>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">Grade {classPreview.fromClass.grade}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={promotions.length === 0}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Adjust */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Step 3: Review Assignments</h2>
          <p className="text-gray-600 mb-6">
            {promotions.length} students ready for promotion
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">
              ✓ All students have been automatically assigned to target classes based on their current grade.
            </p>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue to Confirmation
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Step 4: Confirm Promotion</h2>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important</h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>This will move {promotions.length} students to {toYear?.name}</li>
              <li>Student progression history will be recorded</li>
              <li>You can undo this action within 24 hours</li>
              <li>The academic year status will be updated to ENDED</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 mb-6">
            <p className="text-gray-900 font-semibold">Promotion Summary:</p>
            <p className="text-gray-600">From: {fromYear?.name}</p>
            <p className="text-gray-600">To: {toYear?.name}</p>
            <p className="text-gray-600">Students: {promotions.length}</p>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={processing}
            >
              Back
            </button>
            <button
              onClick={handlePromote}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400"
              disabled={processing}
            >
              {processing ? 'Promoting Students...' : 'Confirm & Promote Students'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 5 && result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">✅ Promotion Complete!</h2>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">{result.results.promoted}</p>
              <p className="text-sm text-gray-600">Promoted</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600">{result.results.repeated}</p>
              <p className="text-sm text-gray-600">Repeated</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-purple-600">{result.results.graduated}</p>
              <p className="text-sm text-gray-600">Graduated</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600">{result.results.failed}</p>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
          </div>

          {result.results.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-900 mb-2">Errors:</h3>
              <ul className="text-sm text-red-800 space-y-1">
                {result.results.errors.map((err: any, idx: number) => (
                  <li key={idx}>Student {err.studentId}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              💡 You can undo this promotion within 24 hours from the academic years page.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => router.push('/en/settings/academic-years')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Return to Academic Years
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
