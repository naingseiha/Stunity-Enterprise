'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Download, Printer, Users, UserCheck, CheckCircle2 } from 'lucide-react';
import { claimCodeService } from '@/lib/api/claimCodes';
import { getStudents } from '@/lib/api/students';
import { getTeachers } from '@/lib/api/teachers';
import { getClassStudents } from '@/lib/api/class-students';
import { getClasses } from '@/lib/api/classes';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import type { ClaimCode } from '@/lib/api/claimCodes';

interface GenerateCodesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodesGenerated: () => void;
}

type GenerationStep = 1 | 2 | 3;
type TargetMode = 'GENERAL' | 'SPECIFIC';
type SpecificUserScope = 'ALL' | 'GRADE' | 'CLASS';

export function GenerateCodesModal({ open, onOpenChange, onCodesGenerated }: GenerateCodesModalProps) {
  const { schoolId } = useAcademicYear();
  const [step, setStep] = useState<GenerationStep>(1);
  const [targetMode, setTargetMode] = useState<TargetMode>('GENERAL');

  // General configuration
  const [type, setType] = useState('STUDENT');
  const [count, setCount] = useState(10);
  const [expiresIn, setExpiresIn] = useState(30);

  // Specific user configuration
  const [specificType, setSpecificType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [studentScope, setStudentScope] = useState<SpecificUserScope>('ALL');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // Data for specific selection
  const [classes, setClasses] = useState<any[]>([]);
  const [targetUsersCount, setTargetUsersCount] = useState<number | null>(null);
  const [fetchingClasses, setFetchingClasses] = useState(false);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<ClaimCode[] | null>(null);

  // Load classes if specific student mode chosen
  useEffect(() => {
    if (open && targetMode === 'SPECIFIC' && specificType === 'STUDENT' && classes.length === 0) {
      const loadClasses = async () => {
        setFetchingClasses(true);
        try {
          const res = await getClasses();
          // getClasses returns an array or object depending on implementation, let's just handle both
          if (Array.isArray(res)) {
            setClasses(res);
          } else if (res && (res as any).data && (res as any).data.classes) {
            setClasses((res as any).data.classes);
          } else if (res && (res as any).classes) {
            setClasses((res as any).classes);
          } else {
            // Fallback if the raw response is returned differently
            setClasses((res as any) || []);
          }
        } catch (e) {
          console.error('Failed to load classes', e);
        } finally {
          setFetchingClasses(false);
        }
      };
      loadClasses();
    }
  }, [open, targetMode, specificType, classes.length]);

  // Calculate target users whenever filters change
  useEffect(() => {
    if (!open || targetMode !== 'SPECIFIC') return;

    const countTargets = async () => {
      setLoading(true);
      setError(null);
      try {
        if (specificType === 'TEACHER') {
          const res = await getTeachers({ page: 1, limit: 1 });
          setTargetUsersCount(res.data?.pagination?.total || 0);
        } else if (specificType === 'STUDENT') {
          if (studentScope === 'ALL') {
            const res = await getStudents({ page: 1, limit: 1 });
            setTargetUsersCount(res.data?.pagination?.total || 0);
          } else if (studentScope === 'CLASS') {
            if (!selectedClassId) { setTargetUsersCount(null); return; }
            const res = await getClassStudents(selectedClassId);
            setTargetUsersCount(res.length || 0);
          } else if (studentScope === 'GRADE') {
            if (!selectedGrade) { setTargetUsersCount(null); return; }
            // Find matching classes for grade
            const matchingClasses = classes.filter(c => c.grade?.toString() === selectedGrade);
            if (matchingClasses.length === 0) {
              setTargetUsersCount(0);
            } else {
              // Simplest robust way without custom backend route is get total student count
              // or just fetch all and measure length for exact measure.
              setTargetUsersCount(null); // Force loading state
              const res = await getStudents({ limit: 1000 }); // Assuming max 1000 students for UI sake
              const validIds = matchingClasses.map(c => c.id);
              const filtered = res.data?.students?.filter(s => s.classId && validIds.includes(s.classId));
              setTargetUsersCount(filtered?.length || 0);
            }
          }
        }
      } catch (err) {
        console.error('Failed to count users', err);
        setTargetUsersCount(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce slightly to handle rapid typing if there were text inputs, though mostly selects here
    const timer = setTimeout(() => countTargets(), 300);
    return () => clearTimeout(timer);
  }, [open, targetMode, specificType, studentScope, selectedClassId, selectedGrade, classes]);

  const handleGenerate = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);

    try {
      let codeResults: ClaimCode[] = [];

      if (targetMode === 'GENERAL') {
        const codes = await claimCodeService.generate(schoolId, {
          type: type as any,
          count,
          expiresInDays: expiresIn,
        });
        // We assume backend returns standard strings or basic objects if not specific
        codeResults = codes as any[];
      } else {
        // Build specific user IDs
        let studentIds: string[] = [];
        let teacherIds: string[] = [];

        if (specificType === 'TEACHER') {
          // Fetch all teachers to get IDs
          const res = await getTeachers({ page: 1, limit: 5000 });
          teacherIds = res.data?.teachers?.map((t: any) => t.id) || [];
        } else {
          // STUDENT logic
          const params: any = { page: 1, limit: 5000 };
          if (studentScope === 'CLASS' && selectedClassId) {
            const classRes = await getClassStudents(selectedClassId);
            studentIds = classRes.map((s: any) => s.id) || [];
          } else {
            // For Grade / All
            const res = await getStudents(params);
            let filteredStudents = res.data?.students || [];

            if (studentScope === 'GRADE' && selectedGrade) {
              const validClassIds = classes.filter(c => c.grade?.toString() === selectedGrade).map(c => c.id);
              filteredStudents = filteredStudents.filter(s => s.classId && validClassIds.includes(s.classId));
            }
            studentIds = filteredStudents.map(s => s.id);
          }
        }

        if ((!studentIds?.length) && (!teacherIds?.length)) {
          throw new Error('No users found matching the selected criteria.');
        }

        const codes = await claimCodeService.generate(schoolId, {
          type: specificType,
          studentIds,
          teacherIds,
          expiresInDays: expiresIn,
        });
        codeResults = codes;
      }

      setGeneratedCodes(codeResults);
      setStep(3);
      onCodesGenerated();
    } catch (err: any) {
      setError(err.message || 'Failed to generate claim codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCodes = () => {
    if (!generatedCodes) return;

    // Create CSV content
    const header = targetMode === 'SPECIFIC' ? 'Name,Role,Code\n' : 'Code\n';
    const rows = generatedCodes.map(c => {
      const user: any = c.student || c.teacher || (c as any).verificationData;
      if (targetMode === 'SPECIFIC' && user) {
        return `"${user.firstName} ${user.lastName}",${c.type},${c.code}`;
      }
      return c.code;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claim-codes-${targetMode.toLowerCase()}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    setGeneratedCodes(null);
    setError(null);
    setStep(1);
    setTargetMode('GENERAL');
    setType('STUDENT');
    setCount(10);
    setExpiresIn(30);
    setSpecificType('STUDENT');
    setStudentScope('ALL');
    setSelectedClassId('');
    setSelectedGrade('');
    setTargetUsersCount(null);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:block">
      <div className={`bg-white rounded-2xl shadow-2xl flex flex-col print:shadow-none print:w-full print:h-full ${step === 3 && targetMode === 'SPECIFIC' ? 'w-full max-w-4xl max-h-[90vh]' : 'w-full max-w-lg'}`}>

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 3 ? 'Codes Generated' : 'Generate Claim Codes'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 3
                ? 'Save or distribute these codes immediately.'
                : 'Create access codes for users to join the school platform.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto print:p-0 print:overflow-visible flex-1">

          {/* STEP 1: Choose Generation Mode */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTargetMode('GENERAL')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${targetMode === 'GENERAL' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${targetMode === 'GENERAL' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">General Codes</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Generate random unused codes. Anyone with the code can claim the role.</p>
                </button>

                <button
                  onClick={() => setTargetMode('SPECIFIC')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${targetMode === 'SPECIFIC' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${targetMode === 'SPECIFIC' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Specific Users</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Assign codes to existing students/teachers in the database.</p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Options (GENERAL) */}
          {step === 2 && targetMode === 'GENERAL' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STAFF">Staff</option>
                  <option value="PARENT">Parent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Number of Codes</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expires In (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Configure Options (SPECIFIC) */}
          {step === 2 && targetMode === 'SPECIFIC' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Generate for</label>
                <select
                  value={specificType}
                  onChange={(e) => setSpecificType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
                >
                  <option value="STUDENT">Existing Students</option>
                  <option value="TEACHER">Existing Teachers</option>
                </select>
              </div>

              {specificType === 'STUDENT' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Scope</label>
                  <select
                    value={studentScope}
                    onChange={(e) => setStudentScope(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
                  >
                    <option value="ALL">Whole School</option>
                    <option value="GRADE">Specific Grade</option>
                    <option value="CLASS">Specific Class</option>
                  </select>
                </div>
              )}

              {specificType === 'STUDENT' && studentScope === 'GRADE' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Grade</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
                  >
                    <option value="">Choose Grade...</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                      <option key={g} value={g.toString()}>Grade {g}</option>
                    ))}
                  </select>
                </div>
              )}

              {specificType === 'STUDENT' && studentScope === 'CLASS' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Class</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    disabled={fetchingClasses}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700 disabled:opacity-50"
                  >
                    <option value="">{fetchingClasses ? 'Loading classes...' : 'Choose Class...'}</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Grade {c.grade})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">Target Users</h4>
                  {loading ? (
                    <p className="text-xs text-blue-700 flex items-center gap-2 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Calculating...</p>
                  ) : targetUsersCount !== null ? (
                    <p className="text-sm text-blue-800 mt-1">Codes will be generated for <strong>{targetUsersCount}</strong> matching user{targetUsersCount !== 1 && 's'}.</p>
                  ) : (
                    <p className="text-xs text-blue-700 mt-1">Select filters above to see user count.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expires In (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
                />
              </div>
            </div>
          )}

          {error && step !== 3 && (
            <div className="mt-4 p-4 bg-red-50/80 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* STEP 3: Success View */}
          {step === 3 && generatedCodes && (
            <div className="space-y-6">
              <div className="print:hidden p-5 bg-green-50/50 border border-green-100 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="text-green-800 font-semibold mb-1">
                    Successfully generated {generatedCodes.length} claim codes!
                  </h3>
                  <p className="text-sm text-green-700">
                    {targetMode === 'SPECIFIC'
                      ? 'These codes are tightly bound to the specific users below. They must use these exact codes to register.'
                      : 'These codes can be distributed to anyone.'}
                  </p>
                </div>
              </div>

              {/* Printable Area Wrapper for the Document Structure */}
              <div className="print:block">
                {/* Print Header (Only visible when printing) */}
                <div className="hidden print:block mb-8 text-center border-b border-gray-300 pb-6">
                  <img src="/Stunity.png" alt="Stunity Logo" className="h-10 mx-auto mb-4 object-contain" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Codes Roster</h1>
                  <p className="text-gray-600">
                    Generated on {new Date().toLocaleDateString()}
                  </p>
                  {targetMode === 'SPECIFIC' && specificType === 'STUDENT' && studentScope === 'CLASS' && (
                    <p className="text-gray-800 font-medium mt-2 text-lg uppercase bg-gray-100 inline-block px-4 py-1 rounded">
                      Class: {classes.find(c => c.id === selectedClassId)?.name || 'Unknown'}
                    </p>
                  )}
                </div>

                {/* Results Table - Optimized for screen and print */}
                <div className="border border-gray-200 rounded-lg overflow-hidden print:border-none print:shadow-none">
                  <div className="max-h-[50vh] overflow-y-auto print:max-h-none print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 sticky top-0 print:static print:bg-gray-100 shadow-sm print:shadow-none">
                        <tr>
                          {targetMode === 'SPECIFIC' && (
                            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 print:text-black print:border-gray-400">Name</th>
                          )}
                          <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 print:text-black print:border-gray-400">Role</th>
                          <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase tracking-wide border-b border-gray-200 print:text-black print:border-gray-400">Claim Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                        {generatedCodes.map((codeObj, index) => (
                          <tr key={index} className="hover:bg-gray-50 print:break-inside-avoid">
                            {targetMode === 'SPECIFIC' && (
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium print:py-2">
                                {(codeObj.student || codeObj.teacher || (codeObj as any).verificationData) ? `${(codeObj.student || codeObj.teacher || (codeObj as any).verificationData).firstName} ${(codeObj.student || codeObj.teacher || (codeObj as any).verificationData).lastName}` : '-'}
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm text-gray-500 print:py-2 print:text-black">
                              {codeObj.type || specificType}
                            </td>
                            <td className="px-4 py-3 print:py-2">
                              <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded print:bg-transparent print:p-0 print:text-black">
                                {codeObj.code}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions - Hidden during standard print */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl print:hidden shrink-0 mt-auto">
          {step === 1 ? (
            <>
              <button onClick={handleClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
              <button onClick={() => setStep(2)} className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm">Continue</button>
            </>
          ) : step === 2 ? (
            <>
              <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Back</button>
              <button
                onClick={handleGenerate}
                disabled={loading || (targetMode === 'SPECIFIC' && (targetUsersCount === 0 || targetUsersCount === null))}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate {targetMode === 'SPECIFIC' ? `(${targetUsersCount || 0})` : ''}
              </button>
            </>
          ) : (
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownloadCodes}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" /> CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print PDF
              </button>
              <button
                onClick={handleClose}
                className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
