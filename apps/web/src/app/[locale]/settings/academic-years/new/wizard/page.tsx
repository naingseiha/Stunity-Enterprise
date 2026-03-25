'use client';

import { useEffect, useMemo, useState, use, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { SCHOOL_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import { useAcademicYearTemplate, useSetupTemplates } from '@/hooks/useAcademicYearResources';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Plus,
  School,
  Sparkles,
  Trash2,
} from 'lucide-react';

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
  { id: 2, title: 'Terms', icon: Clock, description: 'Semesters / terms' },
  { id: 3, title: 'Exam Types', icon: BookOpen, description: 'Assessment types' },
  { id: 4, title: 'Grading', icon: Award, description: 'Grade scales' },
  { id: 5, title: 'Classes', icon: School, description: 'Structure and sections' },
  { id: 6, title: 'Calendar', icon: CalendarDays, description: 'Holidays and dates' },
] as const;

const DEFAULT_GRADE_RANGES: GradeRange[] = [
  { grade: 'A', minScore: 90, maxScore: 100, gpa: 4.0, description: 'Excellent', color: '#10B981' },
  { grade: 'B', minScore: 80, maxScore: 89, gpa: 3.0, description: 'Very Good', color: '#3B82F6' },
  { grade: 'C', minScore: 70, maxScore: 79, gpa: 2.5, description: 'Good', color: '#22D3EE' },
  { grade: 'D', minScore: 60, maxScore: 69, gpa: 2.0, description: 'Fair', color: '#F59E0B' },
  { grade: 'E', minScore: 50, maxScore: 59, gpa: 1.0, description: 'Pass', color: '#FB923C' },
  { grade: 'F', minScore: 0, maxScore: 49, gpa: 0.0, description: 'Fail', color: '#EF4444' },
];

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'amber' | 'sky' | 'emerald' | 'slate';
}) {
  const tones = {
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/35',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/35',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/35',
    slate:
      'border-slate-200/80 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/80 shadow-slate-200/35',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.26)] ring-1 ring-white/75 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function StepBadge({
  number,
  title,
  description,
  icon: Icon,
  active,
  complete,
  onClick,
  disabled,
}: {
  number: number;
  title: string;
  description: string;
  icon: typeof Calendar;
  active: boolean;
  complete: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-[180px] items-center gap-3 rounded-[1.15rem] px-4 py-3 text-left transition ${
        active
          ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
          : complete
            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            : 'text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed'
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${
          active
            ? 'bg-white text-slate-950'
            : complete
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-200 text-slate-400'
        }`}
      >
        {complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p
          className={`text-[10px] font-black uppercase tracking-[0.22em] ${
            active ? 'text-white/65' : complete ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          Step 0{number}
        </p>
        <p className="mt-1 text-sm font-bold">{title}</p>
        <p
          className={`mt-1 text-xs ${
            active ? 'text-white/70' : complete ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

function SectionShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/92 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
      {children}
    </label>
  );
}

export default function AcademicYearWizardPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { years: existingYears } = useAcademicYearsList(school?.id);

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

  const [terms, setTerms] = useState<Term[]>([
    { name: 'Semester 1', termNumber: 1, startDate: '', endDate: '' },
    { name: 'Semester 2', termNumber: 2, startDate: '', endDate: '' },
  ]);

  const [examTypes, setExamTypes] = useState<ExamType[]>([
    { name: 'Monthly Test', weight: 10, maxScore: 100, order: 1 },
    { name: 'Midterm Exam', weight: 30, maxScore: 100, order: 2 },
    { name: 'Final Exam', weight: 60, maxScore: 100, order: 3 },
  ]);

  const [gradingScales, setGradingScales] = useState<GradingScale[]>([
    { name: 'Standard Scale', isDefault: true, ranges: [...DEFAULT_GRADE_RANGES] },
  ]);

  const [classConfigs, setClassConfigs] = useState<ClassConfig[]>([
    { gradeLevel: 7, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 8, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 9, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 10, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 11, sections: ['A', 'B'], capacity: 40 },
    { gradeLevel: 12, sections: ['A', 'B'], capacity: 40 },
  ]);

  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const { data: sourceYearData } = useAcademicYearTemplate<any>(school?.id, copyFromYearId || undefined);
  const { data: setupTemplates, mutate: mutateSetupTemplates } = useSetupTemplates<any>(school?.id);

  useEffect(() => {
    if (!copyFromId) return;
    setCopyFromYearId(copyFromId);
  }, [copyFromId]);

  useEffect(() => {
    if (!copyFromYearId || !sourceYearData?.suggested) return;
    setYearName(sourceYearData.suggested.name);
    setStartDate(sourceYearData.suggested.startDate);
    setEndDate(sourceYearData.suggested.endDate);
  }, [copyFromYearId, sourceYearData]);

  const loadDefaultTemplates = async () => {
    try {
      const refreshedTemplates = setupTemplates ? null : await mutateSetupTemplates();
      const templateData = setupTemplates || refreshedTemplates?.data;
      if (!templateData) return;

      const defaultHolidays = templateData.cambodianHolidays.map((holiday: any) => ({
        title: holiday.title,
        type: 'HOLIDAY',
        startDate: holiday.date,
        endDate: holiday.endDate || holiday.date,
        description: holiday.titleKh,
      }));

      setHolidays(defaultHolidays);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const validateStep1 = () => {
    if (!yearName.trim()) {
      setError('Please enter a year name.');
      return false;
    }
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return false;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (terms.length === 0) {
      setError('Please add at least one term.');
      return false;
    }
    for (const term of terms) {
      if (!term.name || !term.startDate || !term.endDate) {
        setError('Please fill in all term fields.');
        return false;
      }
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    const totalWeight = examTypes.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      setError(`Exam weights must total 100% (currently ${totalWeight}%).`);
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    if (currentStep < 6) setCurrentStep((step) => step + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((step) => step - 1);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = school?.id;
      if (!schoolId) throw new Error('School not found.');

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
        payload.terms = terms;
        payload.examTypes = examTypes;
        payload.gradingScales = gradingScales.map((scale) => ({
          name: scale.name,
          isDefault: scale.isDefault,
          ranges: scale.ranges,
        }));
        payload.classes = classesData;
        payload.holidays = holidays;
      }

      const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/wizard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to create academic year.');
      }

      router.push(`/${locale}/settings/academic-years/${data.data.year.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create academic year.');
    } finally {
      setSubmitting(false);
    }
  };

  const addTerm = () => {
    const nextNumber = terms.length + 1;
    setTerms([...terms, { name: `Term ${nextNumber}`, termNumber: nextNumber, startDate: '', endDate: '' }]);
  };

  const removeTerm = (index: number) => setTerms(terms.filter((_, termIndex) => termIndex !== index));

  const updateTerm = (index: number, field: keyof Term, value: string | number) => {
    const updated = [...terms];
    updated[index] = { ...updated[index], [field]: value };
    setTerms(updated);
  };

  const addExamType = () => {
    setExamTypes([...examTypes, { name: '', weight: 0, maxScore: 100, order: examTypes.length + 1 }]);
  };

  const removeExamType = (index: number) => setExamTypes(examTypes.filter((_, examIndex) => examIndex !== index));

  const updateExamType = (index: number, field: keyof ExamType, value: string | number) => {
    const updated = [...examTypes];
    updated[index] = { ...updated[index], [field]: value };
    setExamTypes(updated);
  };

  const addGradeLevel = () => {
    const maxGrade = classConfigs.length > 0 ? Math.max(...classConfigs.map((item) => item.gradeLevel)) : 6;
    setClassConfigs([...classConfigs, { gradeLevel: maxGrade + 1, sections: ['A'], capacity: 40 }]);
  };

  const removeGradeLevel = (index: number) =>
    setClassConfigs(classConfigs.filter((_, configIndex) => configIndex !== index));

  const updateClassConfig = (index: number, field: keyof ClassConfig, value: number | string[]) => {
    const updated = [...classConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setClassConfigs(updated);
  };

  const addSectionToGrade = (index: number) => {
    const current = classConfigs[index];
    const nextSection = String.fromCharCode(65 + current.sections.length);
    updateClassConfig(index, 'sections', [...current.sections, nextSection]);
  };

  const removeSectionFromGrade = (gradeIndex: number, sectionIndex: number) => {
    const current = classConfigs[gradeIndex];
    updateClassConfig(
      gradeIndex,
      'sections',
      current.sections.filter((_, index) => index !== sectionIndex)
    );
  };

  const addHoliday = () => {
    setHolidays([...holidays, { title: '', type: 'HOLIDAY', startDate: '', endDate: '', description: '' }]);
  };

  const removeHoliday = (index: number) =>
    setHolidays(holidays.filter((_, holidayIndex) => holidayIndex !== index));

  const updateHoliday = (index: number, field: keyof Holiday, value: string) => {
    const updated = [...holidays];
    updated[index] = { ...updated[index], [field]: value };
    setHolidays(updated);
  };

  const examWeightTotal = useMemo(() => examTypes.reduce((sum, item) => sum + item.weight, 0), [examTypes]);
  const totalClasses = useMemo(() => classConfigs.reduce((sum, item) => sum + item.sections.length, 0), [classConfigs]);
  const totalTerms = terms.length;
  const holidayCount = holidays.length;
  const usingCopyMode = Boolean(copyFromYearId);
  const readyScore = Math.min(
    100,
    16 + currentStep * 12 + (usingCopyMode ? 8 : 0) + (holidayCount > 0 ? 6 : 0)
  );

  if (!user || !school) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.15),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6">
        <div className="rounded-[1.75rem] border border-white/75 bg-white/92 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-500" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading wizard workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_50%,#f8fafc_100%)] lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_360px]">
              <div className="overflow-hidden rounded-[1.95rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(255,247,237,0.96)_54%,rgba(239,246,255,0.9))] p-6 shadow-[0_38px_110px_-48px_rgba(245,158,11,0.32)] ring-1 ring-amber-100/70 sm:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <button
                      onClick={() => router.push(`/${locale}/settings/academic-years`)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to academic years
                    </button>
                    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.3em] text-amber-500">Cycle Setup Wizard</p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-[2.65rem]">
                      Create a new academic year with a cleaner setup flow.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
                      Configure the cycle foundation, assessment structure, class model, and calendar from one guided workspace.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3 py-1.5 text-sm font-semibold text-slate-600">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        Step {currentStep} of {STEPS.length}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3 py-1.5 text-sm font-semibold text-slate-600">
                        <Copy className="h-4 w-4 text-sky-500" />
                        {usingCopyMode ? 'Using source year template' : 'Starting from custom setup'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.9rem] border border-amber-200/70 bg-[linear-gradient(145deg,rgba(120,53,15,0.96),rgba(146,64,14,0.94)_48%,rgba(30,64,175,0.88))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(120,53,15,0.56)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-100/80">Wizard Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{readyScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-amber-100/75">Ready</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <Sparkles className="h-7 w-7 text-amber-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-200 via-orange-200 to-sky-200"
                    style={{ width: `${readyScore}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Terms', value: totalTerms },
                    { label: 'Classes', value: totalClasses },
                    { label: 'Events', value: holidayCount },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-amber-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-amber-50/90">
                  {usingCopyMode ? 'Template-assisted setup is active' : 'Custom setup will be submitted'}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Current Step" value={currentStep} helper={STEPS[currentStep - 1].title} tone="amber" />
              <MetricCard label="Terms" value={totalTerms} helper="Academic segments configured" tone="sky" />
              <MetricCard label="Class Plan" value={totalClasses} helper="Classes that will be created" tone="emerald" />
              <MetricCard label="Calendar" value={holidayCount} helper="Holiday and special date entries" tone="slate" />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.08}>
            <div className="mt-5 overflow-x-auto rounded-[1.55rem] border border-white/70 bg-white/85 p-2 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex min-w-max gap-2">
                {STEPS.map((step) => (
                  <StepBadge
                    key={step.id}
                    number={step.id}
                    title={step.title}
                    description={step.description}
                    icon={step.icon}
                    active={step.id === currentStep}
                    complete={step.id < currentStep}
                    disabled={step.id > currentStep}
                    onClick={() => {
                      if (step.id < currentStep) setCurrentStep(step.id);
                    }}
                  />
                ))}
              </div>
            </div>
          </AnimatedContent>

          {error ? (
            <AnimatedContent delay={0.1}>
              <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.12}>
            <div className="mt-5 space-y-5">
              {currentStep === 1 ? (
                <SectionShell
                  eyebrow="Cycle Foundation"
                  title="Basic information"
                  description="Name the academic year, set the date range, and optionally copy from an earlier cycle to accelerate setup."
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_320px]">
                    <div className="space-y-5">
                      <div className="rounded-[1.35rem] border border-slate-200/80 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/55 p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-100/70">
                            <Copy className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-950">Copy from an existing year</p>
                            <p className="mt-1 text-sm text-slate-500">Use a previous cycle as the base so terms, classes, grading, and holidays are ready faster.</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <FieldLabel>Source Year</FieldLabel>
                          <select
                            value={copyFromYearId}
                            onChange={(event) => setCopyFromYearId(event.target.value)}
                            className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                          >
                            <option value="">Start fresh with custom setup</option>
                            {existingYears.map((year) => (
                              <option key={year.id} value={year.id}>
                                {year.name} ({year.status})
                              </option>
                            ))}
                          </select>
                        </div>

                        {copyFromYearId && sourceYearData ? (
                          <div className="mt-4 rounded-[1.15rem] border border-white/80 bg-white/85 p-4 ring-1 ring-slate-200/60">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Copy Scope</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {[
                                { key: 'terms', label: `Terms (${sourceYearData.copyOptions.terms})` },
                                { key: 'examTypes', label: `Exam Types (${sourceYearData.copyOptions.examTypes})` },
                                { key: 'gradingScales', label: `Grading (${sourceYearData.copyOptions.gradingScales})` },
                                { key: 'classes', label: `Classes (${sourceYearData.copyOptions.classes})` },
                                { key: 'holidays', label: `Holidays (${sourceYearData.copyOptions.holidays})` },
                              ].map((option) => (
                                <label
                                  key={option.key}
                                  className="flex items-center gap-3 rounded-[1rem] border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={copyOptions[option.key as keyof typeof copyOptions]}
                                    onChange={(event) =>
                                      setCopyOptions({ ...copyOptions, [option.key]: event.target.checked })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                  />
                                  <span>{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <FieldLabel>Academic Year Name</FieldLabel>
                          <input
                            type="text"
                            value={yearName}
                            onChange={(event) => setYearName(event.target.value)}
                            placeholder="e.g. 2026-2027"
                            className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>
                        <div>
                          <FieldLabel>Start Date</FieldLabel>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>
                        <div>
                          <FieldLabel>End Date</FieldLabel>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Preview</p>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{yearName || 'Academic year title'}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {startDate && endDate ? `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}` : 'Add dates to preview the cycle range.'}
                        </p>
                      </div>
                      <div className="rounded-[1.35rem] border border-amber-100 bg-amber-50/85 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Setup Mode</p>
                        <p className="mt-3 text-sm font-semibold text-amber-900">
                          {usingCopyMode ? 'Copy mode is active.' : 'Fresh custom setup is active.'}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-amber-800">
                          {usingCopyMode
                            ? 'The final submission will copy the selected resources from the source year according to the options above.'
                            : 'The final submission will use the terms, exam types, grading, class plan, and calendar you define in the next steps.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionShell>
              ) : null}

              {currentStep === 2 ? (
                <SectionShell
                  eyebrow="Academic Structure"
                  title="Terms and semesters"
                  description="Define the academic segments that shape reporting windows, calendars, and performance tracking."
                  action={
                    <button
                      onClick={addTerm}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      Add term
                    </button>
                  }
                >
                  <div className="space-y-4">
                    {terms.map((term, index) => (
                      <div key={index} className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/75 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Term {index + 1}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">Academic segment</p>
                          </div>
                          {terms.length > 1 ? (
                            <button
                              onClick={() => removeTerm(index)}
                              className="rounded-full p-2 text-rose-500 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-4">
                          <div className="md:col-span-2">
                            <FieldLabel>Name</FieldLabel>
                            <input
                              type="text"
                              value={term.name}
                              onChange={(event) => updateTerm(index, 'name', event.target.value)}
                              placeholder="Term name"
                              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                          <div>
                            <FieldLabel>Start</FieldLabel>
                            <input
                              type="date"
                              value={term.startDate}
                              onChange={(event) => updateTerm(index, 'startDate', event.target.value)}
                              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                          <div>
                            <FieldLabel>End</FieldLabel>
                            <input
                              type="date"
                              value={term.endDate}
                              onChange={(event) => updateTerm(index, 'endDate', event.target.value)}
                              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionShell>
              ) : null}

              {currentStep === 3 ? (
                <SectionShell
                  eyebrow="Assessment"
                  title="Exam types"
                  description="Configure how the year is assessed. Weights should total 100% for a balanced grading model."
                  action={
                    <button
                      onClick={addExamType}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      Add exam type
                    </button>
                  }
                >
                  <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/85 px-4 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Weight balance</p>
                      <span className={`text-lg font-black ${Math.abs(examWeightTotal - 100) < 0.1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {examWeightTotal}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {examTypes.map((exam, index) => (
                      <div key={index} className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/75 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Exam Type {index + 1}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">Assessment component</p>
                          </div>
                          {examTypes.length > 1 ? (
                            <button
                              onClick={() => removeExamType(index)}
                              className="rounded-full p-2 text-rose-500 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <div>
                            <FieldLabel>Name</FieldLabel>
                            <input
                              type="text"
                              value={exam.name}
                              onChange={(event) => updateExamType(index, 'name', event.target.value)}
                              placeholder="Exam name"
                              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                          <div>
                            <FieldLabel>Weight %</FieldLabel>
                            <input
                              type="number"
                              value={exam.weight}
                              onChange={(event) => updateExamType(index, 'weight', parseFloat(event.target.value) || 0)}
                              min="0"
                              max="100"
                              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                          <div>
                            <FieldLabel>Max Score</FieldLabel>
                            <input
                              type="number"
                              value={exam.maxScore}
                              onChange={(event) => updateExamType(index, 'maxScore', parseInt(event.target.value, 10) || 100)}
                              min="1"
                              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionShell>
              ) : null}

              {currentStep === 4 ? (
                <SectionShell
                  eyebrow="Grading"
                  title="Grade scale"
                  description="Define how raw scores map into grade letters and GPA values for this academic cycle."
                >
                  {gradingScales.map((scale, scaleIndex) => (
                    <div key={scaleIndex} className="space-y-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            type="text"
                            value={scale.name}
                            onChange={(event) => {
                              const updated = [...gradingScales];
                              updated[scaleIndex].name = event.target.value;
                              setGradingScales(updated);
                            }}
                            className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                            <input
                              type="checkbox"
                              checked={scale.isDefault}
                              onChange={(event) => {
                                const updated = [...gradingScales];
                                updated[scaleIndex].isDefault = event.target.checked;
                                setGradingScales(updated);
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            Default scale
                          </label>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-sm">
                        <div className="hidden grid-cols-[80px_repeat(3,120px)_minmax(0,1fr)_96px] gap-3 border-b border-slate-200/80 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 md:grid">
                          <p>Grade</p>
                          <p>Min</p>
                          <p>Max</p>
                          <p>GPA</p>
                          <p>Description</p>
                          <p>Color</p>
                        </div>
                        <div className="divide-y divide-slate-200/80">
                          {scale.ranges.map((range, rangeIndex) => (
                            <div key={rangeIndex} className="grid gap-3 px-4 py-4 md:grid-cols-[80px_repeat(3,120px)_minmax(0,1fr)_96px] md:items-center">
                              <input
                                type="text"
                                value={range.grade}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].grade = event.target.value;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="number"
                                value={range.minScore}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].minScore = parseFloat(event.target.value) || 0;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="number"
                                value={range.maxScore}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].maxScore = parseFloat(event.target.value) || 100;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="number"
                                step="0.1"
                                value={range.gpa}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].gpa = parseFloat(event.target.value) || 0;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="text"
                                value={range.description}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].description = event.target.value;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="color"
                                value={range.color}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].color = event.target.value;
                                  setGradingScales(updated);
                                }}
                                className="h-11 w-full rounded-[0.9rem] border border-slate-200 bg-white p-1 cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </SectionShell>
              ) : null}

              {currentStep === 5 ? (
                <SectionShell
                  eyebrow="Class Model"
                  title="Class structure"
                  description={`Define grade levels, sections, and capacity. ${totalClasses} classes are currently planned.`}
                  action={
                    <button
                      onClick={addGradeLevel}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      Add grade level
                    </button>
                  }
                >
                  <div className="space-y-4">
                    {classConfigs.map((config, index) => (
                      <div key={index} className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/75 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="grid flex-1 gap-4 md:grid-cols-3">
                            <div>
                              <FieldLabel>Grade Level</FieldLabel>
                              <input
                                type="number"
                                value={config.gradeLevel}
                                onChange={(event) => updateClassConfig(index, 'gradeLevel', parseInt(event.target.value, 10) || 1)}
                                min="1"
                                max="12"
                                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                            <div>
                              <FieldLabel>Sections</FieldLabel>
                              <div className="flex flex-wrap gap-2">
                                {config.sections.map((section, sectionIndex) => (
                                  <span
                                    key={sectionIndex}
                                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
                                  >
                                    {section}
                                    {config.sections.length > 1 ? (
                                      <button onClick={() => removeSectionFromGrade(index, sectionIndex)}>×</button>
                                    ) : null}
                                  </span>
                                ))}
                                <button
                                  onClick={() => addSectionToGrade(index)}
                                  className="rounded-full border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-amber-300 hover:text-amber-600"
                                >
                                  + Add
                                </button>
                              </div>
                            </div>
                            <div>
                              <FieldLabel>Capacity Per Class</FieldLabel>
                              <input
                                type="number"
                                value={config.capacity}
                                onChange={(event) => updateClassConfig(index, 'capacity', parseInt(event.target.value, 10) || 40)}
                                min="1"
                                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                          </div>

                          {classConfigs.length > 1 ? (
                            <button
                              onClick={() => removeGradeLevel(index)}
                              className="self-start rounded-full p-2 text-rose-500 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.35rem] border border-amber-100 bg-amber-50/85 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Creation Preview</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {classConfigs.flatMap((config) =>
                        config.sections.map((section) => (
                          <span
                            key={`${config.gradeLevel}-${section}`}
                            className="rounded-full border border-white/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
                          >
                            Grade {config.gradeLevel}
                            {section}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </SectionShell>
              ) : null}

              {currentStep === 6 ? (
                <SectionShell
                  eyebrow="Calendar"
                  title="Academic calendar"
                  description="Load default holidays or add special dates manually so the year begins with a clean scheduling baseline."
                  action={
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        onClick={loadDefaultTemplates}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        <Sparkles className="h-4 w-4" />
                        Load Cambodian holidays
                      </button>
                      <button
                        onClick={addHoliday}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                        Add holiday
                      </button>
                    </div>
                  }
                >
                  {holidays.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white shadow-sm ring-1 ring-slate-200/70">
                        <CalendarDays className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-slate-950">No holidays added yet</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                        Load the standard Cambodian holiday template or add dates manually.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {holidays.map((holiday, index) => (
                        <div key={index} className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/75 p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{holiday.type}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">Calendar entry</p>
                            </div>
                            <button
                              onClick={() => removeHoliday(index)}
                              className="rounded-full p-2 text-rose-500 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-4">
                            <div className="md:col-span-2">
                              <FieldLabel>Title</FieldLabel>
                              <input
                                type="text"
                                value={holiday.title}
                                onChange={(event) => updateHoliday(index, 'title', event.target.value)}
                                placeholder="Holiday name"
                                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                            <div>
                              <FieldLabel>Start</FieldLabel>
                              <input
                                type="date"
                                value={holiday.startDate}
                                onChange={(event) => updateHoliday(index, 'startDate', event.target.value)}
                                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                            <div>
                              <FieldLabel>End</FieldLabel>
                              <input
                                type="date"
                                value={holiday.endDate}
                                onChange={(event) => updateHoliday(index, 'endDate', event.target.value)}
                                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionShell>
              ) : null}
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.14}>
            <div className="mt-6 flex flex-col gap-3 rounded-[1.55rem] border border-white/75 bg-white/88 px-5 py-5 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`inline-flex items-center justify-center gap-2 rounded-[1rem] px-5 py-3 text-sm font-semibold transition ${
                  currentStep === 1
                    ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              {currentStep < 6 ? (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-24px_rgba(16,185,129,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Creating academic year...' : 'Create academic year'}
                </button>
              )}
            </div>
          </AnimatedContent>
        </div>
      </div>
    </>
  );
}
