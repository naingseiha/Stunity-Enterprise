'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Plus,
  Trash2,
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Sparkles,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CalendarDays,
  School,
  ArrowLeft,
} from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Term {
  name: string;
  termNumber: number;
  startDate: string;
  endDate: string;
}

interface ExamType {
  name: string;
  weight: number;
  maxScore: number;
  order: number;
}

interface GradeRange {
  grade: string;
  minScore: number;
  maxScore: number;
  gpa: number;
  description: string;
  color: string;
}

interface GradingScale {
  name: string;
  isDefault: boolean;
  ranges: GradeRange[];
}

interface ClassConfig {
  gradeLevel: number;
  sections: string[];
  capacity: number;
}

interface Holiday {
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  description?: string;
}

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Calendar, description: 'Name and dates' },
  { id: 2, title: 'Terms', icon: Clock, description: 'Semesters/terms' },
  { id: 3, title: 'Exam Types', icon: BookOpen, description: 'Assessment types' },
  { id: 4, title: 'Grading', icon: Award, description: 'Grade scales' },
  { id: 5, title: 'Classes', icon: School, description: 'Class structure' },
  { id: 6, title: 'Calendar', icon: CalendarDays, description: 'Holidays' },
];

const DEFAULT_GRADE_RANGES: GradeRange[] = [
  { grade: 'A', minScore: 90, maxScore: 100, gpa: 4.0, description: 'Excellent', color: '#10B981' },
  { grade: 'B', minScore: 80, maxScore: 89, gpa: 3.0, description: 'Very Good', color: '#3B82F6' },
  { grade: 'C', minScore: 70, maxScore: 79, gpa: 2.5, description: 'Good', color: '#22D3EE' },
  { grade: 'D', minScore: 60, maxScore: 69, gpa: 2.0, description: 'Fair', color: '#F59E0B' },
  { grade: 'E', minScore: 50, maxScore: 59, gpa: 1.0, description: 'Pass', color: '#FB923C' },
  { grade: 'F', minScore: 0, maxScore: 49, gpa: 0.0, description: 'Fail', color: '#EF4444' },
];

export default function AcademicYearWizardPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = params;
  const copyFromId = searchParams.get('copyFrom');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingYears, setExistingYears] = useState<AcademicYear[]>([]);
  const [sourceYearData, setSourceYearData] = useState<any>(null);

  // Step 1: Basic Info
  const [yearName, setYearName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copyFromYearId, setCopyFromYearId] = useState(copyFromId || '');
  const [copyOptions, setCopyOptions] = useState({
    terms: true,
    examTypes: true,
    gradingScales: true,
    classes: true,
    holidays: true,
  });

  // Step 2: Terms
  const [terms, setTerms] = useState<Term[]>([
    { name: 'Semester 1', termNumber: 1, startDate: '', endDate: '' },
    { name: 'Semester 2', termNumber: 2, startDate: '', endDate: '' },
  ]);

  // Step 3: Exam Types
  const [examTypes, setExamTypes] = useState<ExamType[]>([
    { name: 'Monthly Test', weight: 10, maxScore: 100, order: 1 },
    { name: 'Midterm Exam', weight: 30, maxScore: 100, order: 2 },
    { name: 'Final Exam', weight: 60, maxScore: 100, order: 3 },
  ]);

  // Step 4: Grading Scale
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([
    { name: 'Standard Scale', isDefault: true, ranges: [...DEFAULT_GRADE_RANGES] },
  ]);

  // Step 5: Classes
  const [classConfigs, setClassConfigs] = useState<ClassConfig[]>([
    { gradeLevel: 7, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 8, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 9, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 10, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 11, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 12, sections: ['A', 'B'], capacity: 40 },
  ]);

  // Step 6: Holidays
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Load existing years and source template if copyFrom is provided
  useEffect(() => {
    loadExistingYears();
    if (copyFromId) {
      loadSourceYearTemplate(copyFromId);
    }
  }, [copyFromId]);

  const loadExistingYears = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = school?.id;
      if (!schoolId) return;

      const response = await fetch(`http://localhost:3002/schools/${schoolId}/academic-years`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setExistingYears(data.data || []);
      }
    } catch (err) {
      console.error('Error loading years:', err);
    }
  };

  const loadSourceYearTemplate = async (yearId: string) => {
    setLoading(true);
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = school?.id;
      if (!schoolId) return;

      const response = await fetch(
        `http://localhost:3002/schools/${schoolId}/academic-years/${yearId}/template`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setSourceYearData(data.data);
        // Pre-fill suggested values
        setYearName(data.data.suggested.name);
        setStartDate(data.data.suggested.startDate);
        setEndDate(data.data.suggested.endDate);
        setCopyFromYearId(yearId);
      }
    } catch (err) {
      console.error('Error loading template:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplates = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = school?.id;
      if (!schoolId) return;

      const response = await fetch(`http://localhost:3002/schools/${schoolId}/setup-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // Apply default holidays
        const year = new Date(startDate || new Date()).getFullYear();
        const defaultHolidays = data.data.cambodianHolidays.map((h: any) => ({
          title: h.title,
          type: 'HOLIDAY',
          startDate: h.date,
          endDate: h.endDate || h.date,
          description: h.titleKh,
        }));
        setHolidays(defaultHolidays);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep1 = () => {
    if (!yearName.trim()) {
      setError('Please enter a year name');
      return false;
    }
    if (!startDate || !endDate) {
      setError('Please select start and end dates');
      return false;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (terms.length === 0) {
      setError('Please add at least one term');
      return false;
    }
    for (const term of terms) {
      if (!term.name || !term.startDate || !term.endDate) {
        setError('Please fill in all term fields');
        return false;
      }
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    const totalWeight = examTypes.reduce((sum, et) => sum + et.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      setError(`Exam weights must total 100% (currently ${totalWeight}%)`);
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = school?.id;
      if (!schoolId) throw new Error('School not found');

      // Build classes array from configs
      const classesData: any[] = [];
      for (const config of classConfigs) {
        for (const section of config.sections) {
          classesData.push({
            name: `Grade ${config.gradeLevel}${section}`,
            gradeLevel: config.gradeLevel,
            section,
            capacity: config.capacity,
          });
        }
      }

      const payload: any = {
        name: yearName,
        startDate,
        endDate,
      };

      if (copyFromYearId) {
        payload.copyFromYearId = copyFromYearId;
        payload.copyTerms = copyOptions.terms;
        payload.copyExamTypes = copyOptions.examTypes;
        payload.copyGradingScales = copyOptions.gradingScales;
        payload.copyClasses = copyOptions.classes;
        payload.copyHolidays = copyOptions.holidays;
      } else {
        // Use custom configurations
        payload.terms = terms;
        payload.examTypes = examTypes;
        payload.gradingScales = gradingScales.map((gs) => ({
          name: gs.name,
          isDefault: gs.isDefault,
          ranges: gs.ranges,
        }));
        payload.classes = classesData;
        payload.holidays = holidays;
      }

      const response = await fetch(`http://localhost:3002/schools/${schoolId}/academic-years/wizard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create academic year');
      }

      // Success - redirect to the new year's detail page
      router.push(`/${locale}/settings/academic-years/${data.data.year.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create academic year');
    } finally {
      setSubmitting(false);
    }
  };

  // Term management
  const addTerm = () => {
    const nextNumber = terms.length + 1;
    setTerms([...terms, { name: `Term ${nextNumber}`, termNumber: nextNumber, startDate: '', endDate: '' }]);
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const updateTerm = (index: number, field: keyof Term, value: any) => {
    const updated = [...terms];
    updated[index] = { ...updated[index], [field]: value };
    setTerms(updated);
  };

  // Exam type management
  const addExamType = () => {
    setExamTypes([
      ...examTypes,
      { name: '', weight: 0, maxScore: 100, order: examTypes.length + 1 },
    ]);
  };

  const removeExamType = (index: number) => {
    setExamTypes(examTypes.filter((_, i) => i !== index));
  };

  const updateExamType = (index: number, field: keyof ExamType, value: any) => {
    const updated = [...examTypes];
    updated[index] = { ...updated[index], [field]: value };
    setExamTypes(updated);
  };

  // Class config management
  const addGradeLevel = () => {
    const maxGrade = classConfigs.length > 0 ? Math.max(...classConfigs.map((c) => c.gradeLevel)) : 6;
    setClassConfigs([...classConfigs, { gradeLevel: maxGrade + 1, sections: ['A'], capacity: 40 }]);
  };

  const removeGradeLevel = (index: number) => {
    setClassConfigs(classConfigs.filter((_, i) => i !== index));
  };

  const updateClassConfig = (index: number, field: keyof ClassConfig, value: any) => {
    const updated = [...classConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setClassConfigs(updated);
  };

  const addSectionToGrade = (index: number) => {
    const current = classConfigs[index];
    const nextSection = String.fromCharCode(65 + current.sections.length); // A, B, C, ...
    updateClassConfig(index, 'sections', [...current.sections, nextSection]);
  };

  const removeSectionFromGrade = (gradeIndex: number, sectionIndex: number) => {
    const current = classConfigs[gradeIndex];
    updateClassConfig(
      gradeIndex,
      'sections',
      current.sections.filter((_, i) => i !== sectionIndex)
    );
  };

  // Holiday management
  const addHoliday = () => {
    setHolidays([
      ...holidays,
      { title: '', type: 'HOLIDAY', startDate: '', endDate: '', description: '' },
    ]);
  };

  const removeHoliday = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
  };

  const updateHoliday = (index: number, field: keyof Holiday, value: any) => {
    const updated = [...holidays];
    updated[index] = { ...updated[index], [field]: value };
    setHolidays(updated);
  };

  // Calculate total classes
  const totalClasses = classConfigs.reduce((sum, c) => sum + c.sections.length, 0);

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation
        user={user}
        school={school}
        onLogout={handleLogout}
      />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-8">
          <button
            onClick={() => router.push(`/${locale}/settings/academic-years`)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Academic Years
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">New Academic Year Wizard</h1>
              <p className="text-white/80 mt-1">
                Set up a new academic year with all configurations
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white border-b px-8 py-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                    step.id === currentStep
                      ? 'bg-orange-100 text-orange-600'
                      : step.id < currentStep
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.id === currentStep
                        ? 'bg-orange-500 text-white'
                        : step.id < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs opacity-70">{step.description}</p>
                  </div>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
              <p className="text-gray-600 mb-8">
                Enter the name and dates for the new academic year
              </p>

              {/* Copy from existing year */}
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <Copy className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Copy from Previous Year</h3>
                </div>
                <p className="text-sm text-blue-700 mb-4">
                  Start with an existing year's settings to save time
                </p>
                <select
                  value={copyFromYearId}
                  onChange={(e) => {
                    setCopyFromYearId(e.target.value);
                    if (e.target.value) loadSourceYearTemplate(e.target.value);
                  }}
                  className="w-full px-4 py-3 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Start fresh (no copy)</option>
                  {existingYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.status})
                    </option>
                  ))}
                </select>

                {copyFromYearId && sourceYearData && (
                  <div className="mt-4 p-4 bg-white rounded-lg">
                    <p className="font-medium text-gray-900 mb-3">What to copy:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'terms', label: `Terms (${sourceYearData.copyOptions.terms})` },
                        { key: 'examTypes', label: `Exam Types (${sourceYearData.copyOptions.examTypes})` },
                        { key: 'gradingScales', label: `Grading Scales (${sourceYearData.copyOptions.gradingScales})` },
                        { key: 'classes', label: `Classes (${sourceYearData.copyOptions.classes})` },
                        { key: 'holidays', label: `Holidays (${sourceYearData.copyOptions.holidays})` },
                      ].map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={copyOptions[option.key as keyof typeof copyOptions]}
                            onChange={(e) =>
                              setCopyOptions({ ...copyOptions, [option.key]: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Year Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year Name *
                </label>
                <input
                  type="text"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  placeholder="e.g., 2025-2026"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Terms */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Terms / Semesters</h2>
                  <p className="text-gray-600 mt-1">
                    Define the academic terms within this year
                  </p>
                </div>
                <button
                  onClick={addTerm}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Term
                </button>
              </div>

              <div className="space-y-4">
                {terms.map((term, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-500">
                        Term {index + 1}
                      </span>
                      {terms.length > 1 && (
                        <button
                          onClick={() => removeTerm(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={term.name}
                          onChange={(e) => updateTerm(index, 'name', e.target.value)}
                          placeholder="Term name"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={term.startDate}
                          onChange={(e) => updateTerm(index, 'startDate', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Start</p>
                      </div>
                      <div>
                        <input
                          type="date"
                          value={term.endDate}
                          onChange={(e) => updateTerm(index, 'endDate', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">End</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Exam Types */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Exam Types</h2>
                  <p className="text-gray-600 mt-1">
                    Define assessment types and their weights (must total 100%)
                  </p>
                </div>
                <button
                  onClick={addExamType}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Exam Type
                </button>
              </div>

              {/* Weight summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Weight:</span>
                  <span
                    className={`text-lg font-bold ${
                      Math.abs(examTypes.reduce((s, e) => s + e.weight, 0) - 100) < 0.1
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {examTypes.reduce((s, e) => s + e.weight, 0)}%
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {examTypes.map((exam, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-500">
                        Exam Type {index + 1}
                      </span>
                      {examTypes.length > 1 && (
                        <button
                          onClick={() => removeExamType(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <input
                          type="text"
                          value={exam.name}
                          onChange={(e) => updateExamType(index, 'name', e.target.value)}
                          placeholder="Exam name"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={exam.weight}
                            onChange={(e) =>
                              updateExamType(index, 'weight', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Weight</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          value={exam.maxScore}
                          onChange={(e) =>
                            updateExamType(index, 'maxScore', parseInt(e.target.value) || 100)
                          }
                          min="1"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Max Score</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Grading Scale */}
          {currentStep === 4 && (
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Grading Scale</h2>
              <p className="text-gray-600 mb-8">
                Define how scores translate to letter grades
              </p>

              {gradingScales.map((scale, scaleIndex) => (
                <div key={scaleIndex} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="text"
                      value={scale.name}
                      onChange={(e) => {
                        const updated = [...gradingScales];
                        updated[scaleIndex].name = e.target.value;
                        setGradingScales(updated);
                      }}
                      className="text-lg font-semibold px-3 py-1 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={scale.isDefault}
                        onChange={(e) => {
                          const updated = [...gradingScales];
                          updated[scaleIndex].isDefault = e.target.checked;
                          setGradingScales(updated);
                        }}
                        className="rounded text-orange-500 focus:ring-orange-500"
                      />
                      Default
                    </label>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Grade
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Min Score
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Max Score
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            GPA
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Color
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {scale.ranges.map((range, rangeIndex) => (
                          <tr key={rangeIndex}>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={range.grade}
                                onChange={(e) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].grade = e.target.value;
                                  setGradingScales(updated);
                                }}
                                className="w-16 px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={range.minScore}
                                onChange={(e) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].minScore =
                                    parseFloat(e.target.value) || 0;
                                  setGradingScales(updated);
                                }}
                                className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={range.maxScore}
                                onChange={(e) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].maxScore =
                                    parseFloat(e.target.value) || 100;
                                  setGradingScales(updated);
                                }}
                                className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.1"
                                value={range.gpa}
                                onChange={(e) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].gpa =
                                    parseFloat(e.target.value) || 0;
                                  setGradingScales(updated);
                                }}
                                className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={range.description}
                                onChange={(e) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].description =
                                    e.target.value;
                                  setGradingScales(updated);
                                }}
                                className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="color"
                                value={range.color}
                                onChange={(e) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].color = e.target.value;
                                  setGradingScales(updated);
                                }}
                                className="w-10 h-8 rounded cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 5: Classes */}
          {currentStep === 5 && (
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Class Structure</h2>
                  <p className="text-gray-600 mt-1">
                    Define grade levels and sections for this year ({totalClasses} classes total)
                  </p>
                </div>
                <button
                  onClick={addGradeLevel}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Grade Level
                </button>
              </div>

              <div className="space-y-4">
                {classConfigs.map((config, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Grade Level
                          </label>
                          <input
                            type="number"
                            value={config.gradeLevel}
                            onChange={(e) =>
                              updateClassConfig(index, 'gradeLevel', parseInt(e.target.value) || 1)
                            }
                            min="1"
                            max="12"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Sections ({config.sections.length})
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {config.sections.map((section, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm"
                              >
                                {section}
                                {config.sections.length > 1 && (
                                  <button
                                    onClick={() => removeSectionFromGrade(index, sIdx)}
                                    className="hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                            <button
                              onClick={() => addSectionToGrade(index)}
                              className="px-2 py-1 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Capacity per class
                          </label>
                          <input
                            type="number"
                            value={config.capacity}
                            onChange={(e) =>
                              updateClassConfig(index, 'capacity', parseInt(e.target.value) || 40)
                            }
                            min="1"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                      {classConfigs.length > 1 && (
                        <button
                          onClick={() => removeGradeLevel(index)}
                          className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-orange-50 rounded-xl">
                <h3 className="font-medium text-orange-800 mb-2">Classes to be created:</h3>
                <div className="flex flex-wrap gap-2">
                  {classConfigs.map((config) =>
                    config.sections.map((section) => (
                      <span
                        key={`${config.gradeLevel}-${section}`}
                        className="px-2 py-1 bg-white rounded text-sm text-gray-700 shadow-sm"
                      >
                        Grade {config.gradeLevel}
                        {section}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Calendar */}
          {currentStep === 6 && (
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Academic Calendar</h2>
                  <p className="text-gray-600 mt-1">
                    Add holidays and important dates
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadDefaultTemplates}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Load Cambodian Holidays
                  </button>
                  <button
                    onClick={addHoliday}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Holiday
                  </button>
                </div>
              </div>

              {holidays.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No holidays added yet</p>
                  <p className="text-sm">Click "Load Cambodian Holidays" or add manually</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {holidays.map((holiday, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {holiday.type}
                        </span>
                        <button
                          onClick={() => removeHoliday(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={holiday.title}
                            onChange={(e) => updateHoliday(index, 'title', e.target.value)}
                            placeholder="Holiday name"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <input
                            type="date"
                            value={holiday.startDate}
                            onChange={(e) => updateHoliday(index, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Start</p>
                        </div>
                        <div>
                          <input
                            type="date"
                            value={holiday.endDate}
                            onChange={(e) => updateHoliday(index, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">End</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {currentStep < 6 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Create Academic Year
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
