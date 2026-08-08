'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, use, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { SCHOOL_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import { useAcademicYearTemplate, useSetupTemplates } from '@/hooks/useAcademicYearResources';
import {
  buildCambodiaAcademicTerms,
  validateAcademicTerms,
  type AcademicTermFormValue as Term,
} from '@/lib/academic-year-terms';
import AcademicCalendarEditor from '@/components/academic-years/AcademicCalendarEditor';
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
  { id: 1, title: 'ព័ត៌មានទូទៅ', icon: Calendar, description: 'ឈ្មោះ និងកាលបរិច្ឆេទ' },
  { id: 2, title: 'ឆមាស', icon: Clock, description: 'ក្រុមថ្នាក់ និងខែប្រឡង' },
  { id: 3, title: 'ប្រភេទប្រឡង', icon: BookOpen, description: 'ការវាយតម្លៃ' },
  { id: 4, title: 'និទ្ទេស', icon: Award, description: 'កម្រិតពិន្ទុ' },
  { id: 5, title: 'ថ្នាក់រៀន', icon: School, description: 'កម្រិត និងបន្ទប់' },
  { id: 6, title: 'ប្រតិទិន', icon: CalendarDays, description: 'ថ្ងៃឈប់ និងព្រឹត្តិការណ៍' },
] as const;

const DEFAULT_GRADE_RANGES: GradeRange[] = [
  { grade: 'A', minScore: 90, maxScore: 100, gpa: 4.0, description: 'ល្អប្រសើរ', color: '#10B981' },
  { grade: 'B', minScore: 80, maxScore: 89, gpa: 3.0, description: 'ល្អណាស់', color: '#3B82F6' },
  { grade: 'C', minScore: 70, maxScore: 79, gpa: 2.5, description: 'ល្អ', color: '#22D3EE' },
  { grade: 'D', minScore: 60, maxScore: 69, gpa: 2.0, description: 'មធ្យម', color: '#F59E0B' },
  { grade: 'E', minScore: 50, maxScore: 59, gpa: 1.0, description: 'ជាប់', color: '#FB923C' },
  { grade: 'F', minScore: 0, maxScore: 49, gpa: 0.0, description: 'ធ្លាក់', color: '#EF4444' },
];

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  return `${date.getUTCDate()} ${khmerMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getSuggestedAcademicYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return {
    name: `${startYear}-${startYear + 1}`,
    startDate: `${startYear}-11-01`,
    endDate: `${startYear + 1}-08-31`,
  };
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
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/30',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/30',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/30',
    slate:
      'border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/80 shadow-slate-200/30',
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
            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:cursor-not-allowed'
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${
          active
            ? 'bg-white dark:bg-gray-900 text-slate-950'
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
            active ? 'text-white/60' : complete ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          ជំហានទី {String(number).padStart(2, '0')}
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
    <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
  const autoT = useTranslations();
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const t = useTranslations('common');
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
  const didChooseDefaultSource = useRef(false);
  const suggestedAcademicYear = useMemo(getSuggestedAcademicYear, []);

  const [yearName, setYearName] = useState(suggestedAcademicYear.name);
  const [startDate, setStartDate] = useState(suggestedAcademicYear.startDate);
  const [endDate, setEndDate] = useState(suggestedAcademicYear.endDate);
  const [copyFromYearId, setCopyFromYearId] = useState(copyFromId || '');
  const [copyOptions, setCopyOptions] = useState({
    terms: true,
    examTypes: true,
    gradingScales: true,
    classes: true,
    subjects: true,
    holidays: true,
  });

  const [terms, setTerms] = useState<Term[]>(() =>
    buildCambodiaAcademicTerms(suggestedAcademicYear.startDate, suggestedAcademicYear.endDate)
  );

  const [examTypes, setExamTypes] = useState<ExamType[]>([
    { name: 'ការប្រឡងប្រចាំខែ', weight: 10, maxScore: 100, order: 1 },
    { name: 'ការប្រឡងពាក់កណ្តាលឆមាស', weight: 30, maxScore: 100, order: 2 },
    { name: 'ការប្រឡងបញ្ចប់ឆមាស', weight: 60, maxScore: 100, order: 3 },
  ]);

  const [gradingScales, setGradingScales] = useState<GradingScale[]>([
    { name: 'កម្រិតនិទ្ទេសស្តង់ដារ', isDefault: true, ranges: [...DEFAULT_GRADE_RANGES] },
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
    if (didChooseDefaultSource.current || copyFromId || !existingYears.length) return;
    didChooseDefaultSource.current = true;
    const defaultSource = existingYears.find((year) => year.isCurrent)
      || [...existingYears].sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime())[0];
    if (defaultSource) setCopyFromYearId(defaultSource.id);
  }, [copyFromId, existingYears]);

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
      setError('សូមបញ្ចូលឈ្មោះឆ្នាំសិក្សា។');
      return false;
    }
    if (!startDate || !endDate) {
      setError('សូមជ្រើសថ្ងៃចាប់ផ្តើម និងថ្ងៃបញ្ចប់។');
      return false;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('ថ្ងៃបញ្ចប់ត្រូវនៅក្រោយថ្ងៃចាប់ផ្តើម។');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    const termError = validateAcademicTerms(terms, startDate, endDate);
    if (termError) {
      setError(termError);
      return false;
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    const totalWeight = examTypes.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      setError(`ភាគរយនៃការវាយតម្លៃត្រូវសរុបស្មើ ១០០% (បច្ចុប្បន្ន ${totalWeight}%)។`);
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
      if (!schoolId) throw new Error('រកមិនឃើញព័ត៌មានសាលា។');

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
        payload.copySubjects = copyOptions.subjects;
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
        throw new Error(data?.error || 'មិនអាចបង្កើតឆ្នាំសិក្សាបានទេ។');
      }

      router.push(`/${locale}/settings/academic-years/${data.data.year.id}`);
    } catch (err: any) {
      setError(err.message || 'មិនអាចបង្កើតឆ្នាំសិក្សាបានទេ។');
    } finally {
      setSubmitting(false);
    }
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
        <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-500" />
          <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_e9a3989a" /></p>
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
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      ត្រឡប់ទៅបញ្ជីឆ្នាំសិក្សា
                    </button>
                    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.3em] text-amber-500">រៀបចំឆ្នាំសិក្សាថ្មី</p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-[2.65rem]">
                      បង្កើតឆ្នាំសិក្សាថ្មីតាមជំហានងាយៗ
                    </h1>
                    <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
                      កំណត់ព័ត៌មានមូលដ្ឋាន ឆមាស ការវាយតម្លៃ ថ្នាក់រៀន និងប្រតិទិននៅកន្លែងតែមួយ។
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        ជំហានទី {currentStep} ក្នុងចំណោម {STEPS.length}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-3 py-1.5 text-sm font-semibold text-slate-600">
                        <Copy className="h-4 w-4 text-sky-500" />
                        {usingCopyMode ? 'កំពុងប្រើគំរូពីឆ្នាំសិក្សាមុន' : 'កំពុងកំណត់ថ្មីដោយខ្លួនឯង'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.9rem] border border-amber-200/70 bg-[linear-gradient(145deg,rgba(120,53,15,0.96),rgba(146,64,14,0.94)_48%,rgba(30,64,175,0.88))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(120,53,15,0.56)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-100/80">វឌ្ឍនភាពរៀបចំ</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{readyScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-amber-100/75"><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_2499f75c" /></span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <Sparkles className="h-7 w-7 text-amber-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-200 via-orange-200 to-sky-200"
                    style={{ width: `${readyScore}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'ឆមាស', value: totalTerms },
                    { label: 'ថ្នាក់រៀន', value: totalClasses },
                    { label: 'ព្រឹត្តិការណ៍', value: holidayCount },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-amber-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-amber-50/90">
                  {usingCopyMode ? 'កំពុងរៀបចំដោយជំនួយពីគំរូ' : 'កំពុងរៀបចំថ្មីដោយខ្លួនឯង'}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="ជំហានបច្ចុប្បន្ន" value={currentStep} helper={STEPS[currentStep - 1].title} tone="amber" />
              <MetricCard label="ឆមាស" value={totalTerms} helper="ចំនួនឆមាសដែលបានកំណត់" tone="sky" />
              <MetricCard label="គម្រោងថ្នាក់រៀន" value={totalClasses} helper="ចំនួនថ្នាក់រៀនដែលនឹងបង្កើត" tone="emerald" />
              <MetricCard label="ប្រតិទិន" value={holidayCount} helper="ថ្ងៃឈប់ និងថ្ងៃពិសេស" tone="slate" />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.08}>
            <div className="mt-5 overflow-x-auto rounded-[1.55rem] border border-white/70 bg-white dark:bg-none dark:bg-gray-900/80 p-2 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl">
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
                  <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_c76f3aaa" /></p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.12}>
            <div className="mt-5 space-y-5">
              {currentStep === 1 ? (
                <SectionShell
                  eyebrow="ព័ត៌មានមូលដ្ឋាន"
                  title="ព័ត៌មានទូទៅនៃឆ្នាំសិក្សា"
                  description="ដាក់ឈ្មោះ កំណត់ថ្ងៃចាប់ផ្តើម និងថ្ងៃបញ្ចប់ ឬចម្លងការកំណត់ពីឆ្នាំសិក្សាមុន។"
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_320px]">
                    <div className="space-y-5">
                      <div className="rounded-[1.35rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/50 p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-100/70">
                            <Copy className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-950">ចម្លងពីឆ្នាំសិក្សាដែលមានស្រាប់</p>
                            <p className="mt-1 text-sm text-slate-500">ប្រើឆ្នាំមុនជាគំរូ ដើម្បីមិនចាំបាច់កំណត់ឆមាស មុខវិជ្ជា ថ្នាក់រៀន និទ្ទេស និងថ្ងៃឈប់ឡើងវិញ។</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <FieldLabel>ឆ្នាំសិក្សាគំរូ</FieldLabel>
                          <select
                            value={copyFromYearId}
                            onChange={(event) => setCopyFromYearId(event.target.value)}
                            className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                          >
                            <option value="">កំណត់ថ្មីដោយខ្លួនឯង</option>
                            {existingYears.map((year) => (
                              <option key={year.id} value={year.id}>
                                {year.name} ({year.status})
                              </option>
                            ))}
                          </select>
                        </div>

                        {copyFromYearId && sourceYearData ? (
                          <div className="mt-4 rounded-[1.15rem] border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 p-4 ring-1 ring-slate-200/60">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_1b91bcfd" /></p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {[
                                { key: 'terms', label: `ឆមាស (${sourceYearData.copyOptions.terms})` },
                                { key: 'examTypes', label: `ប្រភេទប្រឡង (${sourceYearData.copyOptions.examTypes})` },
                                { key: 'gradingScales', label: `និទ្ទេស (${sourceYearData.copyOptions.gradingScales})` },
                                { key: 'subjects', label: `មុខវិជ្ជា (${sourceYearData.copyOptions.subjects ?? 0})` },
                                { key: 'classes', label: `ថ្នាក់រៀន (${sourceYearData.copyOptions.classes})` },
                                { key: 'holidays', label: `ថ្ងៃឈប់ (${sourceYearData.copyOptions.holidays})` },
                              ].map((option) => (
                                <label
                                  key={option.key}
                                  className="flex items-center gap-3 rounded-[1rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={copyOptions[option.key as keyof typeof copyOptions]}
                                    onChange={(event) =>
                                      setCopyOptions({ ...copyOptions, [option.key]: event.target.checked })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 dark:border-gray-700 text-sky-600 focus:ring-sky-500"
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
                          <FieldLabel>ឈ្មោះឆ្នាំសិក្សា</FieldLabel>
                          <input
                            type="text"
                            value={yearName}
                            onChange={(event) => setYearName(event.target.value)}
                            placeholder="ឧ. ២០២៦-២០២៧"
                            className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>
                        <div>
                          <FieldLabel><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_0d18b33c" /></FieldLabel>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>
                        <div>
                          <FieldLabel><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_cef3772d" /></FieldLabel>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.35rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_1af9b76a" /></p>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{yearName || 'ឈ្មោះឆ្នាំសិក្សា'}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {startDate && endDate ? `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}` : 'បញ្ចូលកាលបរិច្ឆេទ ដើម្បីមើលរយៈពេលឆ្នាំសិក្សា។'}
                        </p>
                      </div>
                      <div className="rounded-[1.35rem] border border-amber-100 bg-amber-50/80 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">របៀបរៀបចំ</p>
                        <p className="mt-3 text-sm font-semibold text-amber-900">
                          {usingCopyMode ? 'កំពុងប្រើទម្រង់ចម្លង។' : 'កំពុងរៀបចំថ្មីដោយខ្លួនឯង។'}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-amber-800">
                          {usingCopyMode
                            ? 'ប្រព័ន្ធនឹងចម្លងតែ configuration និង class shells ដែលបានជ្រើស។ សិស្ស ពិន្ទុ វត្តមាន timetable និងការចាត់គ្រូ មិនត្រូវបានចម្លងទេ។'
                            : 'ពេលរក្សាទុក ប្រព័ន្ធនឹងប្រើឆមាស ប្រភេទប្រឡង និទ្ទេស ថ្នាក់រៀន និងប្រតិទិនដែលអ្នកកំណត់នៅជំហានបន្ទាប់។'}
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionShell>
              ) : null}

              {currentStep === 2 ? (
                <SectionShell
                  eyebrow="រចនាសម្ព័ន្ធឆ្នាំសិក្សា"
                  title="កំណត់ឆមាសតាមក្រុមថ្នាក់"
                  description="រៀបចំថ្នាក់ដែលប្រើកាលវិភាគដូចគ្នាជាក្រុម ដើម្បីងាយគ្រប់គ្រងឆមាស ខែប្រឡង និងខែឈប់សម្រាក។"
                >
                  <AcademicCalendarEditor
                    terms={terms}
                    academicYearStart={startDate}
                    academicYearEnd={endDate}
                    onChange={setTerms}
                  />
                </SectionShell>
              ) : null}

              {currentStep === 3 ? (
                <SectionShell
                  eyebrow="ការវាយតម្លៃ"
                  title="ប្រភេទប្រឡង និងទម្ងន់ពិន្ទុ"
                  description="កំណត់ប្រភេទប្រឡង និងទម្ងន់ពិន្ទុ។ ផលបូកទម្ងន់គួរតែស្មើ ១០០%។"
                  action={
                    <button
                      onClick={addExamType}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      បន្ថែមប្រភេទប្រឡង
                    </button>
                  }
                >
                  <div className="rounded-[1.25rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-4 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">ផលបូកទម្ងន់ពិន្ទុ</p>
                      <span className={`text-lg font-black ${Math.abs(examWeightTotal - 100) < 0.1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {examWeightTotal}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {examTypes.map((exam, index) => (
                      <div key={index} className="rounded-[1.3rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">ប្រភេទប្រឡងទី {index + 1}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-gray-200">សមាសភាគនៃការវាយតម្លៃ</p>
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
                            <FieldLabel><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_36f1b49f" /></FieldLabel>
                            <input
                              type="text"
                              value={exam.name}
                              onChange={(event) => updateExamType(index, 'name', event.target.value)}
                              placeholder="ឈ្មោះប្រភេទប្រឡង"
                              className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                          <div>
                            <FieldLabel>ទម្ងន់ (%)</FieldLabel>
                            <input
                              type="number"
                              value={exam.weight}
                              onChange={(event) => updateExamType(index, 'weight', parseFloat(event.target.value) || 0)}
                              min="0"
                              max="100"
                              className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                          </div>
                          <div>
                            <FieldLabel><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_17b56aa2" /></FieldLabel>
                            <input
                              type="number"
                              value={exam.maxScore}
                              onChange={(event) => updateExamType(index, 'maxScore', parseInt(event.target.value, 10) || 100)}
                              min="1"
                              className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
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
                  eyebrow="ការកំណត់និទ្ទេស"
                  title="កម្រិតនិទ្ទេស"
                  description="កំណត់ចន្លោះពិន្ទុ និទ្ទេស និងតម្លៃ GPA សម្រាប់ឆ្នាំសិក្សានេះ។"
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
                            className="rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                          />
                          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-2 text-sm font-medium text-slate-600">
                            <input
                              type="checkbox"
                              checked={scale.isDefault}
                              onChange={(event) => {
                                const updated = [...gradingScales];
                                updated[scaleIndex].isDefault = event.target.checked;
                                setGradingScales(updated);
                              }}
                              className="h-4 w-4 rounded border-slate-300 dark:border-gray-700 text-amber-600 focus:ring-amber-500"
                            />
                            ប្រើជាកម្រិតលំនាំដើម
                          </label>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm">
                        <div className="hidden grid-cols-[80px_repeat(3,120px)_minmax(0,1fr)_96px] gap-3 border-b border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 md:grid">
                          <p>និទ្ទេស</p>
                          <p>ពិន្ទុអប្បបរមា</p>
                          <p>ពិន្ទុអតិបរមា</p>
                          <p>GPA</p>
                          <p><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_c40b7939" /></p>
                          <p>ពណ៌</p>
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-gray-800/80">
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
                                className="rounded-[0.9rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="number"
                                value={range.minScore}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].minScore = parseFloat(event.target.value) || 0;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="number"
                                value={range.maxScore}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].maxScore = parseFloat(event.target.value) || 100;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
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
                                className="rounded-[0.9rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="text"
                                value={range.description}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].description = event.target.value;
                                  setGradingScales(updated);
                                }}
                                className="rounded-[0.9rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                              <input
                                type="color"
                                value={range.color}
                                onChange={(event) => {
                                  const updated = [...gradingScales];
                                  updated[scaleIndex].ranges[rangeIndex].color = event.target.value;
                                  setGradingScales(updated);
                                }}
                                className="h-11 w-full rounded-[0.9rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 cursor-pointer"
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
                  eyebrow="រចនាសម្ព័ន្ធថ្នាក់រៀន"
                  title="រចនាសម្ព័ន្ធថ្នាក់រៀន"
                  description={`កំណត់កម្រិតថ្នាក់ បន្ទប់ និងចំនួនសិស្សអតិបរមា។ បច្ចុប្បន្នមានគម្រោងបង្កើត ${totalClasses} ថ្នាក់។`}
                  action={
                    <button
                      onClick={addGradeLevel}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      បន្ថែមកម្រិតថ្នាក់
                    </button>
                  }
                >
                  <div className="space-y-4">
                    {classConfigs.map((config, index) => (
                      <div key={index} className="rounded-[1.3rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="grid flex-1 gap-4 md:grid-cols-3">
                            <div>
                              <FieldLabel>កម្រិតថ្នាក់</FieldLabel>
                              <input
                                type="number"
                                value={config.gradeLevel}
                                onChange={(event) => updateClassConfig(index, 'gradeLevel', parseInt(event.target.value, 10) || 1)}
                                min="1"
                                max="12"
                                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                            <div>
                              <FieldLabel>បន្ទប់</FieldLabel>
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
                                  className="rounded-full border border-dashed border-slate-300 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-amber-300 hover:text-amber-600"
                                >
                                  + បន្ថែម
                                </button>
                              </div>
                            </div>
                            <div>
                              <FieldLabel>ចំនួនសិស្សអតិបរមាក្នុងមួយថ្នាក់</FieldLabel>
                              <input
                                type="number"
                                value={config.capacity}
                                onChange={(event) => updateClassConfig(index, 'capacity', parseInt(event.target.value, 10) || 40)}
                                min="1"
                                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
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

                  <div className="mt-5 rounded-[1.35rem] border border-amber-100 bg-amber-50/80 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">ថ្នាក់រៀនដែលនឹងបង្កើត</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {classConfigs.flatMap((config) =>
                        config.sections.map((section) => (
                          <span
                            key={`${config.gradeLevel}-${section}`}
                            className="rounded-full border border-white/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 shadow-sm"
                          >
                            <AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_66e7b55d" /> {config.gradeLevel}
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
                  eyebrow="ប្រតិទិនសិក្សា"
                  title="ប្រតិទិនឆ្នាំសិក្សា"
                  description="ប្រើថ្ងៃឈប់សម្រាកគំរូ ឬបន្ថែមថ្ងៃពិសេសដោយខ្លួនឯង។"
                  action={
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        onClick={loadDefaultTemplates}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        <Sparkles className="h-4 w-4" />
                        ប្រើថ្ងៃឈប់សម្រាកគំរូកម្ពុជា
                      </button>
                      <button
                        onClick={addHoliday}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                        បន្ថែមថ្ងៃឈប់
                      </button>
                    </div>
                  }
                >
                  {holidays.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-14 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white dark:bg-gray-900 shadow-sm ring-1 ring-slate-200/70">
                        <CalendarDays className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-slate-950">មិនទាន់មានថ្ងៃឈប់សម្រាក</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                        ប្រើគំរូថ្ងៃឈប់សម្រាកស្តង់ដាររបស់កម្ពុជា ឬបន្ថែមកាលបរិច្ឆេទដោយខ្លួនឯង។
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {holidays.map((holiday, index) => (
                        <div key={index} className="rounded-[1.3rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{holiday.type === 'HOLIDAY' ? 'ថ្ងៃឈប់សម្រាក' : holiday.type}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-gray-200">កាលបរិច្ឆេទក្នុងប្រតិទិន</p>
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
                              <FieldLabel>ឈ្មោះថ្ងៃឈប់សម្រាក</FieldLabel>
                              <input
                                type="text"
                                value={holiday.title}
                                onChange={(event) => updateHoliday(index, 'title', event.target.value)}
                                placeholder="ឧ. ពិធីបុណ្យចូលឆ្នាំខ្មែរ"
                                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                            <div>
                              <FieldLabel><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_b1ad75c0" /></FieldLabel>
                              <input
                                type="date"
                                value={holiday.startDate}
                                onChange={(event) => updateHoliday(index, 'startDate', event.target.value)}
                                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                              />
                            </div>
                            <div>
                              <FieldLabel><AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_b85e8584" /></FieldLabel>
                              <input
                                type="date"
                                value={holiday.endDate}
                                onChange={(event) => updateHoliday(index, 'endDate', event.target.value)}
                                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
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
            <div className="mt-6 flex flex-col gap-3 rounded-[1.55rem] border border-white/75 bg-white dark:bg-gray-900/80 px-5 py-5 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`inline-flex items-center justify-center gap-2 rounded-[1rem] px-5 py-3 text-sm font-semibold transition ${
                  currentStep === 1
                    ? 'cursor-not-allowed border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 text-slate-400'
                    : 'border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_9b606c39" />
              </button>

              {currentStep < 6 ? (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <AutoI18nText i18nKey="auto.web.years_new_wizard_page.k_16305dc1" />
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-24px_rgba(16,185,129,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'កំពុងបង្កើតឆ្នាំសិក្សា...' : 'បង្កើតឆ្នាំសិក្សា'}
                </button>
              )}
            </div>
          </AnimatedContent>
        </div>
      </div>
    </>
  );
}
