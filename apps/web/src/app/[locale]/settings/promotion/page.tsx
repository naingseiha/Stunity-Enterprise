'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Filter,
  GraduationCap,
  Info,
  LayoutList,
  Loader2,
  LockKeyhole,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import { useClasses } from '@/hooks/useClasses';
import {
  yearEndApi,
  type PromotionPolicy,
  type YearEndCycle,
  type YearEndCycleStatus,
  type YearEndDecision,
  type YearEndOutcome,
} from '@/lib/api/year-end';

type Translate = (km: string, en: string) => string;
type ReviewView = 'AUTO_ELIGIBLE' | 'GRADUATION_CANDIDATES' | 'ATTENTION' | 'ALL' | YearEndOutcome;
type TransitionAction = 'recalculate' | 'accept-recommendations' | 'submit' | 'approve' | 'finalize';

const DEFAULT_POLICY: PromotionPolicy = {
  passAverage: 50,
  minAttendanceRate: 75,
  terminalGrade: 12,
  maxUnexcusedAbsences: null,
  maxDisciplineIncidents: null,
  requireCompleteGrades: false,
  allowConditionalPromotion: true,
  allowSupplementaryExam: true,
  requireReasonForOverride: true,
  requireSecondApproval: false,
  additionalRules: {},
};

const OUTCOMES: YearEndOutcome[] = ['PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT', 'GRADUATE', 'WITHDRAWN', 'PENDING'];
const REASONS = [
  'MEETS_SCHOOL_POLICY',
  'ACADEMIC_BELOW_THRESHOLD',
  'SUPPLEMENTARY_EXAM_PASSED',
  'REMEDIAL_PROGRAM_COMPLETED',
  'ATTENDANCE_BELOW_THRESHOLD',
  'EXCESSIVE_UNEXCUSED_ABSENCE',
  'DISCIPLINE_REVIEW_REQUIRED',
  'SPECIAL_COMMITTEE_DECISION',
  'PARENT_REQUEST',
  'HEALTH_OR_WELFARE_CONSIDERATION',
  'TRANSFER_OR_WITHDRAWAL',
  'OTHER',
];
const INTERVENTIONS = ['REMEDIAL_COURSE', 'SUPPLEMENTARY_EXAM', 'ATTENDANCE_REVIEW', 'DISCIPLINE_REVIEW', 'COUNSELING', 'SPECIAL_COMMITTEE'];

const outcomeTone: Record<YearEndOutcome, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  PROMOTE: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  CONDITIONAL_PROMOTE: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  REPEAT: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  GRADUATE: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200',
  WITHDRAWN: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

const parseGrade = (value: string | number | null | undefined) => {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : null;
};

const studentName = (decision: YearEndDecision) => [
  decision.student.englishFirstName || decision.student.firstName,
  decision.student.englishLastName || decision.student.lastName,
].filter(Boolean).join(' ');

const studentInitials = (decision: YearEndDecision) => [
  decision.student.firstName?.[0],
  decision.student.lastName?.[0],
].filter(Boolean).join('').toUpperCase() || 'S';

function outcomeLabel(outcome: YearEndOutcome, tx: Translate) {
  const labels: Record<YearEndOutcome, [string, string]> = {
    PENDING: ['មិនទាន់សម្រេច', 'Decision pending'],
    PROMOTE: ['ឡើងថ្នាក់', 'Promote'],
    CONDITIONAL_PROMOTE: ['ឡើងថ្នាក់មានលក្ខខណ្ឌ', 'Conditional promotion'],
    REPEAT: ['ត្រួតថ្នាក់', 'Repeat grade'],
    GRADUATE: ['បញ្ចប់ការសិក្សា', 'Graduate'],
    WITHDRAWN: ['ដក/ផ្ទេរចេញ', 'Withdraw / transfer'],
  };
  return tx(...labels[outcome]);
}

function reasonLabel(reason: string, tx: Translate) {
  const labels: Record<string, [string, string]> = {
    MEETS_SCHOOL_POLICY: ['បំពេញតាមគោលការណ៍សាលា', 'Meets school policy'],
    ACADEMIC_BELOW_THRESHOLD: ['មធ្យមភាគក្រោមកម្រិតកំណត់', 'Average below threshold'],
    SUPPLEMENTARY_EXAM_PASSED: ['ប្រឡងបំពេញបន្ថែមជាប់', 'Passed supplementary exam'],
    REMEDIAL_PROGRAM_COMPLETED: ['បានបញ្ចប់កម្មវិធីបំប៉ន', 'Completed remedial program'],
    ATTENDANCE_BELOW_THRESHOLD: ['វត្តមានក្រោមកម្រិតកំណត់', 'Attendance below threshold'],
    EXCESSIVE_UNEXCUSED_ABSENCE: ['អវត្តមានឥតច្បាប់ច្រើនពេក', 'Excessive unexcused absence'],
    DISCIPLINE_REVIEW_REQUIRED: ['ត្រូវពិនិត្យបញ្ហាវិន័យ', 'Discipline review required'],
    SPECIAL_COMMITTEE_DECISION: ['សេចក្តីសម្រេចរបស់គណៈកម្មការ', 'Special committee decision'],
    PARENT_REQUEST: ['សំណើរបស់អាណាព្យាបាល', 'Parent request'],
    HEALTH_OR_WELFARE_CONSIDERATION: ['ហេតុផលសុខភាព ឬសុខុមាលភាព', 'Health or welfare consideration'],
    TRANSFER_OR_WITHDRAWAL: ['ផ្ទេរ ឬឈប់សិក្សា', 'Transfer or withdrawal'],
    SEMESTER_1_RESULT_MISSING: ['ខ្វះលទ្ធផលឆមាសទី១', 'Semester 1 result missing'],
    SEMESTER_2_RESULT_MISSING: ['ខ្វះលទ្ធផលឆមាសទី២', 'Semester 2 result missing'],
    ANNUAL_RESULT_INCOMPLETE: ['លទ្ធផលប្រចាំឆ្នាំមិនទាន់គ្រប់', 'Annual result incomplete'],
    TARGET_CLASS_REQUIRED: ['ត្រូវកំណត់ថ្នាក់គោលដៅ', 'Target class required'],
    OTHER: ['មូលហេតុផ្សេងទៀត', 'Other reason'],
  };
  return labels[reason] ? tx(...labels[reason]) : reason.replaceAll('_', ' ');
}

function interventionLabel(intervention: string, tx: Translate) {
  const labels: Record<string, [string, string]> = {
    REMEDIAL_COURSE: ['រៀនបំប៉នបន្ថែម', 'Remedial course'],
    SUPPLEMENTARY_EXAM: ['ប្រឡងបំពេញបន្ថែម', 'Supplementary exam'],
    ATTENDANCE_REVIEW: ['ពិនិត្យវត្តមាន', 'Attendance review'],
    DISCIPLINE_REVIEW: ['ពិនិត្យវិន័យ', 'Discipline review'],
    COUNSELING: ['ប្រឹក្សាយោបល់', 'Counseling'],
    SPECIAL_COMMITTEE: ['គណៈកម្មការពិសេស', 'Special committee'],
  };
  return labels[intervention] ? tx(...labels[intervention]) : intervention.replaceAll('_', ' ');
}

function flagLabel(flag: string, tx: Translate) {
  const labels: Record<string, [string, string]> = {
    ACADEMIC_BELOW_THRESHOLD: ['ពិន្ទុក្រោមកម្រិត', 'Low academic average'],
    ATTENDANCE_BELOW_THRESHOLD: ['វត្តមានទាប', 'Low attendance'],
    EXCESSIVE_UNEXCUSED_ABSENCE: ['អវត្តមានច្រើន', 'Excessive absence'],
    DISCIPLINE_REVIEW_REQUIRED: ['ត្រូវពិនិត្យវិន័យ', 'Discipline review'],
    INCOMPLETE_GRADE_EVIDENCE: ['ពិន្ទុមិនទាន់គ្រប់', 'Incomplete grades'],
    TARGET_CLASS_UNAVAILABLE: ['មិនមានថ្នាក់គោលដៅ', 'No target class'],
    TARGET_CLASS_REQUIRED: ['ត្រូវកំណត់ថ្នាក់គោលដៅ', 'Target class required'],
    SEMESTER_1_RESULT_MISSING: ['ខ្វះលទ្ធផលឆមាសទី១', 'Semester 1 result missing'],
    SEMESTER_2_RESULT_MISSING: ['ខ្វះលទ្ធផលឆមាសទី២', 'Semester 2 result missing'],
    ANNUAL_RESULT_INCOMPLETE: ['លទ្ធផលប្រចាំឆ្នាំមិនទាន់គ្រប់', 'Annual result incomplete'],
  };
  return labels[flag] ? tx(...labels[flag]) : flag.replaceAll('_', ' ');
}

function statusLabel(status: YearEndCycleStatus, tx: Translate) {
  const labels: Record<YearEndCycleStatus, [string, string]> = {
    DRAFT: ['កំពុងវាយតម្លៃ', 'Draft review'],
    IN_REVIEW: ['រង់ចាំអនុម័ត', 'Awaiting approval'],
    APPROVED: ['បានអនុម័ត', 'Approved'],
    FINALIZED: ['បានបញ្ចប់', 'Finalized'],
    CANCELLED: ['បានបោះបង់', 'Cancelled'],
  };
  return tx(...labels[status]);
}

function OutcomeBadge({ outcome, tx, compact = false }: { outcome: YearEndOutcome; tx: Translate; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border font-bold ${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} ${outcomeTone[outcome]}`}>
      {outcomeLabel(outcome, tx)}
    </span>
  );
}

function WorkflowStep({ number, title, helper, state }: { number: number; title: string; helper: string; state: 'done' | 'current' | 'upcoming' }) {
  return (
    <div className="relative flex min-w-[150px] flex-1 items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
        state === 'done'
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : state === 'current'
            ? 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-500/15'
            : 'border-slate-200 bg-white text-slate-400 dark:border-gray-700 dark:bg-gray-900'
      }`}>
        {state === 'done' ? <Check className="h-4 w-4" /> : number}
      </div>
      <div className="pt-0.5">
        <p className={`text-xs font-black ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{title}</p>
        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-gray-400">{helper}</p>
      </div>
      {number < 5 && <ChevronRight className="absolute -right-1 top-2.5 hidden h-4 w-4 text-slate-300 xl:block" />}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone, onClick, active }: {
  icon: LucideIcon;
  label: string;
  value: number;
  helper: string;
  tone: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition dark:bg-gray-900/95 ${active ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-500/15' : 'border-slate-200 hover:border-slate-300 dark:border-gray-800'} ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></div>
        <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</span>
      </div>
      <p className="mt-3 text-sm font-black text-slate-800 dark:text-gray-100">{label}</p>
      <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500 dark:text-gray-400">{helper}</p>
    </Component>
  );
}

function ReadinessItem({ ready, label, detail }: { ready: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ready ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>
        {ready ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800 dark:text-gray-100">{label}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-gray-400">{detail}</p>
      </div>
    </div>
  );
}

export default function PromotionReviewPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = use(props.params);
  const isKm = locale.toLowerCase().startsWith('km');
  const tx: Translate = (km, en) => (isKm ? km : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;
  const schoolId = user?.schoolId || school?.id;

  const { years, isLoading: yearsLoading, mutate: mutateYears } = useAcademicYearsList(schoolId);
  const sortedYears = useMemo(() => [...years].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [years]);
  const [fromYearId, setFromYearId] = useState(searchParams.get('yearId') || '');
  const [toYearId, setToYearId] = useState('');
  const { classes: targetClasses } = useClasses({ academicYearId: toYearId || undefined, limit: 500 });

  const [cycle, setCycle] = useState<YearEndCycle | null>(null);
  const [policy, setPolicy] = useState<PromotionPolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const requestedView = searchParams.get('filter');
  const [reviewView, setReviewView] = useState<ReviewView>(
    requestedView === 'ALL' || requestedView === 'ATTENTION' || requestedView === 'AUTO_ELIGIBLE' || requestedView === 'GRADUATION_CANDIDATES' || OUTCOMES.includes(requestedView as YearEndOutcome)
      ? requestedView as ReviewView
      : 'ATTENTION',
  );
  const [editing, setEditing] = useState<YearEndDecision | null>(null);
  const [transitionIntent, setTransitionIntent] = useState<TransitionAction | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [finalizeAcknowledged, setFinalizeAcknowledged] = useState(false);
  const [editForm, setEditForm] = useState({
    finalOutcome: 'PENDING' as YearEndOutcome,
    targetClassId: '',
    reasonCode: '',
    reasonDetails: '',
    interventions: [] as string[],
    interventionStatus: '',
    disciplineIncidentCount: '',
  });

  useEffect(() => {
    if (!TokenManager.getAccessToken()) router.replace(`/${locale}/auth/login`);
  }, [locale, router]);

  useEffect(() => {
    if (!sortedYears.length) return;
    const source = sortedYears.find((year) => year.id === fromYearId)
      || sortedYears.find((year) => year.isCurrent)
      || sortedYears[sortedYears.length - 1];
    if (!fromYearId && source) setFromYearId(source.id);
    if (!source) return;
    const selectedTarget = sortedYears.find((year) => year.id === toYearId);
    const targetIsValid = selectedTarget && new Date(selectedTarget.startDate) > new Date(source.startDate);
    if (!targetIsValid) {
      const target = sortedYears.find((year) => new Date(year.startDate) > new Date(source.startDate));
      setToYearId(target?.id || '');
    }
  }, [fromYearId, sortedYears, toYearId]);

  useEffect(() => {
    if (!schoolId) return;
    yearEndApi.getPolicy(schoolId).then(setPolicy).catch(() => setPolicy(DEFAULT_POLICY));
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !fromYearId) return;
    let active = true;
    setLoading(true);
    setError('');
    yearEndApi.getCycle(schoolId, fromYearId, toYearId || undefined)
      .then((data) => { if (active) setCycle(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fromYearId, schoolId, toYearId]);

  const fromYear = sortedYears.find((year) => year.id === fromYearId);
  const toYear = sortedYears.find((year) => year.id === toYearId);
  const sourceClasses = useMemo(() => Array.from(new Map((cycle?.decisions || []).map((decision) => [decision.fromClass.id, decision.fromClass])).values()), [cycle]);
  const canEdit = cycle?.status === 'DRAFT' || cycle?.status === 'IN_REVIEW';
  const effectivePolicy = cycle?.policySnapshot || policy;

  const decisionNeedsAttention = (decision: YearEndDecision) => {
    const flags = decision.evidence?.flags || [];
    return decision.recommendedOutcome === 'PENDING'
      || decision.recommendedOutcome === 'CONDITIONAL_PROMOTE'
      || decision.finalOutcome === 'CONDITIONAL_PROMOTE'
      || decision.finalOutcome === 'REPEAT'
      || decision.decisionSource === 'OVERRIDE'
      || flags.length > 0;
  };

  const isAcademicPass = (decision: YearEndDecision) =>
    decision.evidence?.annualResultComplete === true
      && (decision.evidence.academicStatus === 'PASS'
        || (decision.evidence.annualAverage != null && decision.evidence.annualAverage >= effectivePolicy.passAverage));

  const isGraduationCandidate = (decision: YearEndDecision) =>
    (parseGrade(decision.fromClass.grade) ?? -1) >= effectivePolicy.terminalGrade
      && (isAcademicPass(decision)
        || decision.recommendedOutcome === 'GRADUATE'
        || decision.finalOutcome === 'GRADUATE');

  const classScopedDecisions = useMemo(() => (cycle?.decisions || []).filter((decision) =>
    classFilter === 'ALL' || decision.fromClassId === classFilter,
  ), [classFilter, cycle]);
  const attentionCount = classScopedDecisions.filter(decisionNeedsAttention).length;
  const academicPassCount = classScopedDecisions.filter(isAcademicPass).length;
  const scopedRepeatCount = classScopedDecisions.filter((decision) => decision.finalOutcome === 'REPEAT').length;
  const graduationCandidateCount = classScopedDecisions.filter(isGraduationCandidate).length;
  const confirmableRecommendationCount = (cycle?.decisions || []).filter((decision) =>
    decision.finalOutcome === 'PENDING'
      && (decision.recommendedOutcome === 'GRADUATE'
        || (decision.recommendedOutcome === 'PROMOTE' && Boolean(decision.targetClassId))),
  ).length;
  const legacyCalculationCount = (cycle?.decisions || []).filter((decision) =>
    decision.evidence?.academicCalculationMethod !== 'TWO_SEMESTER_AVERAGE',
  ).length;
  const attentionReasonCounts = classScopedDecisions
    .filter(decisionNeedsAttention)
    .reduce<Record<string, number>>((counts, decision) => {
      const reason = decision.reasonCode || decision.evidence?.flags?.[0] || 'OTHER';
      counts[reason] = (counts[reason] || 0) + 1;
      return counts;
    }, {});
  const missingTargetCount = useMemo(() => (cycle?.decisions || []).filter((decision) =>
    ['PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT'].includes(decision.finalOutcome) && !decision.targetClassId,
  ).length, [cycle]);
  const pendingCount = cycle?.summary.PENDING || 0;
  const reviewedCount = cycle?.summary.reviewed || 0;
  const canSubmit = Boolean(cycle?.summary.total) && pendingCount === 0 && missingTargetCount === 0;

  const visibleDecisions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (cycle?.decisions || []).filter((decision) => {
      const names = [
        decision.student.firstName,
        decision.student.lastName,
        decision.student.englishFirstName,
        decision.student.englishLastName,
        decision.student.studentId,
        decision.fromClass.name,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesView = reviewView === 'ALL'
        || (reviewView === 'AUTO_ELIGIBLE'
          ? isAcademicPass(decision)
          : reviewView === 'GRADUATION_CANDIDATES'
            ? isGraduationCandidate(decision)
            : reviewView === 'ATTENTION' ? decisionNeedsAttention(decision) : decision.finalOutcome === reviewView);
      return (!query || names.includes(query))
        && (classFilter === 'ALL' || decision.fromClassId === classFilter)
        && matchesView;
    });
  }, [classFilter, cycle, reviewView, search]);

  const workflowStep = !cycle ? 1
    : cycle.status === 'DRAFT' ? 3
      : cycle.status === 'IN_REVIEW' ? 4
        : cycle.status === 'APPROVED' ? 5
          : cycle.status === 'FINALIZED' ? 6
            : 1;

  const reloadCycle = async () => {
    if (!schoolId || !fromYearId) return;
    setCycle(await yearEndApi.getCycle(schoolId, fromYearId, toYearId || undefined));
  };

  const generate = async () => {
    if (!schoolId || !fromYearId || !toYearId) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const generated = await yearEndApi.generate(schoolId, fromYearId, toYearId);
      setCycle(generated);
      setReviewView('AUTO_ELIGIBLE');
      setSuccess(tx('ប្រព័ន្ធបានវិភាគលទ្ធផលសិក្សា។ ពណ៌បៃតងមានន័យថា «ជាប់តាមលទ្ធផល» ប៉ុន្តែមិនទាន់ជាសេចក្តីសម្រេចឡើងថ្នាក់ទេ។', 'Academic results were evaluated. Green means academically passed, not yet a final promotion decision.'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async () => {
    if (!schoolId) return;
    try {
      setSaving(true);
      setError('');
      setPolicy(await yearEndApi.savePolicy(schoolId, policy));
      setSuccess(tx('បានរក្សាទុកគោលការណ៍សាលា។ វានឹងប្រើសម្រាប់បញ្ជីដែលបង្កើតថ្មី។', 'School policy saved. It will apply to newly generated registers.'));
      setShowPolicy(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (decision: YearEndDecision) => {
    setEditing(decision);
    setEditForm({
      finalOutcome: decision.finalOutcome,
      targetClassId: decision.targetClassId || '',
      reasonCode: decision.reasonCode || '',
      reasonDetails: decision.reasonDetails || '',
      interventions: Array.isArray(decision.interventions) ? decision.interventions : [],
      interventionStatus: decision.interventionStatus || '',
      disciplineIncidentCount: decision.disciplineIncidentCount === null ? '' : String(decision.disciplineIncidentCount),
    });
  };

  const eligibleTargetClasses = useMemo(() => {
    if (!editing) return targetClasses;
    const sourceGrade = parseGrade(editing.fromClass.grade);
    if (editForm.finalOutcome === 'REPEAT') return targetClasses.filter((target) => parseGrade(target.grade) === sourceGrade);
    if (['PROMOTE', 'CONDITIONAL_PROMOTE'].includes(editForm.finalOutcome)) {
      return targetClasses.filter((target) => parseGrade(target.grade) === (sourceGrade ?? -2) + 1);
    }
    return [];
  }, [editForm.finalOutcome, editing, targetClasses]);

  useEffect(() => {
    if (!editing || !['PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT'].includes(editForm.finalOutcome)) return;
    if (!eligibleTargetClasses.some((target) => target.id === editForm.targetClassId)) {
      setEditForm((current) => ({ ...current, targetClassId: eligibleTargetClasses[0]?.id || '' }));
    }
  }, [editForm.finalOutcome, editForm.targetClassId, editing, eligibleTargetClasses]);

  const editIsOverride = Boolean(editing && editForm.finalOutcome !== editing.recommendedOutcome);
  const editNeedsTarget = ['PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT'].includes(editForm.finalOutcome);
  const editIsValid = (!editNeedsTarget || Boolean(editForm.targetClassId))
    && (!editIsOverride || !effectivePolicy.requireReasonForOverride || (Boolean(editForm.reasonCode) && editForm.reasonDetails.trim().length >= 3));

  const saveDecision = async () => {
    if (!editing || !schoolId || !editIsValid) return;
    try {
      setSaving(true);
      setError('');
      await yearEndApi.updateDecision(schoolId, fromYearId, editing.id, {
        version: editing.version,
        finalOutcome: editForm.finalOutcome,
        targetClassId: editForm.targetClassId || null,
        reasonCode: editForm.reasonCode || null,
        reasonDetails: editForm.reasonDetails || null,
        interventions: editForm.interventions,
        interventionStatus: editForm.interventionStatus || null,
        disciplineIncidentCount: editForm.disciplineIncidentCount === '' ? null : Number(editForm.disciplineIncidentCount),
      });
      await reloadCycle();
      setEditing(null);
      setSuccess(tx('បានរក្សាទុកសេចក្តីសម្រេច និងប្រវត្តិត្រួតពិនិត្យ។', 'Decision and audit history saved.'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const requestTransition = (action: TransitionAction) => {
    setTransitionNotes('');
    setFinalizeAcknowledged(false);
    setTransitionIntent(action);
  };

  const confirmTransition = async () => {
    if (!cycle || !schoolId || !transitionIntent) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const action = transitionIntent;
      if (action === 'recalculate') {
        const recalculated = await yearEndApi.generate(schoolId, fromYearId, cycle.toAcademicYearId, true);
        setCycle(recalculated);
        setReviewView('AUTO_ELIGIBLE');
        setTransitionIntent(null);
        setSuccess(tx(
          'បានគណនាបញ្ជីឡើងវិញតាមលទ្ធផលឆមាសទី១ និងទី២។ មិនមាន enrollment ណាត្រូវបានផ្ទេរ ឬលុបទេ។',
          'The register was recalculated from Semester 1 and Semester 2 results. No enrollment was moved or deleted.',
        ));
        return;
      }
      if (action === 'accept-recommendations') {
        const accepted = await yearEndApi.acceptRecommendations(schoolId, fromYearId, cycle.id);
        setCycle(accepted);
        setTransitionIntent(null);
        setSuccess(tx(
          `បានបញ្ជាក់សំណើដែលគ្មានករណីរារាំង ${accepted.acceptedCount} នាក់។ សិស្សដែលត្រូវវាយតម្លៃបន្ថែមនៅតែ «មិនទាន់សម្រេច»។`,
          `${accepted.acceptedCount} clear recommendations were confirmed. Exception cases remain pending.`,
        ));
        return;
      }
      await yearEndApi.transition(schoolId, fromYearId, cycle.id, action, transitionNotes.trim() || undefined);
      setTransitionIntent(null);
      await Promise.all([reloadCycle(), mutateYears()]);
      setSuccess(action === 'finalize'
        ? tx('បានផ្ទេរសិស្សទៅឆ្នាំថ្មី និងបិទ enrollment ឆ្នាំចាស់ដោយជោគជ័យ។', 'Students were enrolled into the new year and source enrollments were safely closed.')
        : action === 'approve'
          ? tx('បញ្ជីត្រូវបានអនុម័ត និងត្រៀមសម្រាប់ finalize។', 'The register is approved and ready for finalization.')
          : tx('បញ្ជីត្រូវបានបញ្ជូនទៅអ្នកអនុម័ត។', 'The register was submitted for approval.'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (yearsLoading && !years.length) return <PageSkeleton user={user} school={school} type="table" showFilters />;

  const steps = [
    [tx('កំណត់ឆ្នាំ', 'Choose years'), tx('ឆ្នាំចាស់ → ឆ្នាំថ្មី', 'Source → target')],
    [tx('ប្រព័ន្ធវិភាគ', 'System evaluation'), tx('ពិន្ទុ វត្តមាន វិន័យ', 'Grades, attendance, discipline')],
    [tx('ពិនិត្យករណី', 'Review exceptions'), tx('សម្រេច និងបញ្ជាក់មូលហេតុ', 'Decide and document')],
    [tx('អនុម័ត', 'Approve'), tx('ត្រួតពិនិត្យដោយអ្នកទីពីរ', 'Second-level control')],
    [tx('ផ្ទេរទៅឆ្នាំថ្មី', 'Enroll new year'), tx('Finalize ដោយសុវត្ថិភាព', 'Safe finalization')],
  ];

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={logout} />
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-white lg:ml-64">
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/95 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                  <button onClick={() => router.push(`/${locale}/settings/academic-years`)} className="hover:text-blue-600">{tx('ឆ្នាំសិក្សា', 'Academic years')}</button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-slate-800 dark:text-gray-200">{tx('វាយតម្លៃចុងឆ្នាំ', 'Year-end review')}</span>
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                      {tx('វាយតម្លៃ និងឡើងថ្នាក់ចុងឆ្នាំ', 'Year-end progression review')}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-gray-300">
                      {tx('ដំណើរការជាជំហាន ដើម្បីពិនិត្យករណីពិសេស អនុម័តសេចក្តីសម្រេច និងផ្ទេរសិស្សទៅឆ្នាំថ្មីដោយរក្សាប្រវត្តិទាំងអស់។', 'A guided process to review exceptions, approve decisions, and safely enroll students into the next academic year with a complete audit trail.')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowPolicy(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                  <Settings2 className="h-4 w-4" /> {tx('គោលការណ៍សាលា', 'School policy')}
                </button>
                {cycle?.status === 'DRAFT' && reviewedCount === 0 && (
                  <button onClick={() => requestTransition('recalculate')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                    <RefreshCw className="h-4 w-4" /> {tx('គណនាលទ្ធផលឡើងវិញ', 'Recalculate results')}
                  </button>
                )}
                {cycle && (
                  <button onClick={reloadCycle} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {tx('ផ្ទុកឡើងវិញ', 'Refresh')}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto border-t border-slate-100 pt-5 dark:border-gray-800">
              <div className="flex min-w-[760px] gap-6">
                {steps.map(([title, helper], index) => (
                  <WorkflowStep
                    key={title}
                    number={index + 1}
                    title={title}
                    helper={helper}
                    state={workflowStep > index + 1 ? 'done' : workflowStep === index + 1 ? 'current' : 'upcoming'}
                  />
                ))}
              </div>
            </div>
          </header>

          {(error || success) && (
            <div role="alert" className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm font-semibold ${error ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'}`}>
              {error ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
              <p className="flex-1">{error || success}</p>
              <button aria-label={tx('បិទសារ', 'Dismiss message')} onClick={() => { setError(''); setSuccess(''); }}><X className="h-4 w-4" /></button>
            </div>
          )}

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/95 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">1</div>
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">{tx('ជ្រើសរើសវគ្គផ្ទេរសិស្ស', 'Choose the progression cycle')}</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">{tx('ត្រូវជ្រើសឆ្នាំគោលដៅដែលចាប់ផ្ដើមក្រោយឆ្នាំប្រភព។', 'The target year must begin after the source year.')}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('ពីឆ្នាំសិក្សា', 'From academic year')}</span>
                  <select value={fromYearId} disabled={Boolean(cycle)} onChange={(event) => { setFromYearId(event.target.value); setCycle(null); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950">
                    {sortedYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
                  </select>
                </label>
                <div className="mb-3 hidden rounded-full bg-slate-100 p-2 text-slate-500 dark:bg-gray-800 md:block"><ArrowRight className="h-4 w-4" /></div>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('ទៅឆ្នាំសិក្សា', 'To academic year')}</span>
                  <select value={toYearId} disabled={Boolean(cycle)} onChange={(event) => { setToYearId(event.target.value); setCycle(null); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950">
                    <option value="">{tx('ជ្រើសរើសឆ្នាំគោលដៅ', 'Select target year')}</option>
                    {sortedYears.filter((year) => year.id !== fromYearId && (!fromYear || new Date(year.startDate) > new Date(fromYear.startDate))).map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
                  </select>
                </label>
              </div>
              {!cycle ? (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
                    <div>
                      <p className="text-sm font-bold text-blue-950 dark:text-blue-100">{tx('ប្រព័ន្ធនឹងបង្កើតសំណើសម្រាប់សិស្សម្នាក់ៗ', 'The system will recommend an outcome for every student')}</p>
                      <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-200/80">{tx('លទ្ធផលប្រចាំឆ្នាំ = មធ្យមភាគឆមាសទី១ និងទី២។ សិស្សធ្លាក់ ឬខ្វះឆមាសណាមួយនឹងចូលបញ្ជីរង់ចាំវាយតម្លៃ; គ្មាន enrollment ណាត្រូវបានផ្ទេរនៅជំហាននេះទេ។', 'Annual result is the average of Semester 1 and Semester 2. Failed or incomplete cases go to later evaluation; no enrollment is moved at this stage.')}</p>
                    </div>
                  </div>
                  <button onClick={generate} disabled={!fromYearId || !toYearId || loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {tx('ចាប់ផ្ដើមវាយតម្លៃ', 'Start evaluation')}
                  </button>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-950/60">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-300"><FileCheck2 className="h-5 w-5" /></div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{fromYear?.name} <span className="px-1 text-slate-400">→</span> {toYear?.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{tx('បញ្ជីត្រូវបានបង្កើតរួច ហើយឆ្នាំមិនអាចប្ដូរនៅក្នុង cycle នេះទេ។', 'The register exists; years are locked for this cycle.')}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${cycle.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'}`}>{statusLabel(cycle.status, tx)}</span>
                </div>
              )}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{tx('ច្បាប់វាយតម្លៃ', 'Evaluation rules')}</p>
                  <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">{tx('គោលការណ៍សាលា', 'School policy')}</h2>
                </div>
                <button onClick={() => setShowPolicy(true)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"><PencilLine className="h-4 w-4" /></button>
              </div>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-500 dark:text-gray-400">{tx('មធ្យមភាគជាប់', 'Passing average')}</dt><dd className="font-black">≥ {effectivePolicy.passAverage}%</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-500 dark:text-gray-400">{tx('វត្តមានអប្បបរមា', 'Minimum attendance')}</dt><dd className="font-black">≥ {effectivePolicy.minAttendanceRate}%</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-500 dark:text-gray-400">{tx('ថ្នាក់បញ្ចប់', 'Terminal grade')}</dt><dd className="font-black">{effectivePolicy.terminalGrade}</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-500 dark:text-gray-400">{tx('ឡើងថ្នាក់មានលក្ខខណ្ឌ', 'Conditional promotion')}</dt><dd className={`font-black ${effectivePolicy.allowConditionalPromotion ? 'text-emerald-600' : 'text-slate-400'}`}>{effectivePolicy.allowConditionalPromotion ? tx('អនុញ្ញាត', 'Allowed') : tx('មិនអនុញ្ញាត', 'Disabled')}</dd></div>
              </dl>
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 dark:bg-gray-950 dark:text-gray-400">
                <Info className="mr-1 inline h-3.5 w-3.5" />
                {cycle
                  ? tx('Cycle នេះរក្សា policy snapshot ដើម។ ការកែ policy ឥឡូវនឹងអនុវត្តចំពោះ cycle ថ្មីប៉ុណ្ណោះ។', 'This cycle retains its original policy snapshot. Changes now apply only to future cycles.')
                  : tx('អ្នកអាចកែគោលការណ៍មុនចាប់ផ្ដើមវាយតម្លៃ។', 'You can adjust the policy before starting the evaluation.')}
              </div>
            </aside>
          </section>

          {loading && !cycle && <div className="mt-6 flex justify-center rounded-2xl border border-slate-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}

          {cycle && (
            <>
              <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard icon={Users} label={tx('សិស្សសរុប', 'Total students')} value={classScopedDecisions.length} helper={classFilter === 'ALL' ? tx('ក្នុងបញ្ជីចុងឆ្នាំ', 'In this year-end register') : tx('ក្នុងថ្នាក់ដែលបានជ្រើស', 'In the selected class')} tone="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={() => setReviewView('ALL')} active={reviewView === 'ALL'} />
                <MetricCard icon={AlertTriangle} label={tx('ត្រូវពិនិត្យ', 'Needs attention')} value={attentionCount} helper={tx('ករណីលើកលែង ឬមានហានិភ័យ', 'Exceptions and flagged cases')} tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" onClick={() => setReviewView('ATTENTION')} active={reviewView === 'ATTENTION'} />
                <MetricCard icon={UserRoundCheck} label={tx('ជាប់ស្វ័យប្រវត្តិ', 'Automatically eligible')} value={automaticEligibleCount} helper={tx('ជាប់លទ្ធផលទាំងពីរឆមាស', 'Passed both-semester annual result')} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" onClick={() => setReviewView('AUTO_ELIGIBLE')} active={reviewView === 'AUTO_ELIGIBLE'} />
                <MetricCard icon={UserRoundX} label={tx('ត្រួតថ្នាក់', 'Repeat')} value={scopedRepeatCount} helper={tx('ត្រូវមានមូលហេតុច្បាស់លាស់', 'Documented reason required')} tone="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" onClick={() => setReviewView('REPEAT')} active={reviewView === 'REPEAT'} />
                <MetricCard icon={GraduationCap} label={tx('បញ្ចប់ការសិក្សា', 'Graduate')} value={scopedGraduateCount} helper={tx('សិស្សថ្នាក់ចុងក្រោយ', 'Terminal-grade students')} tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" onClick={() => setReviewView('GRADUATE')} active={reviewView === 'GRADUATE'} />
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                  <div className="border-b border-slate-200 p-5 dark:border-gray-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300"><LayoutList className="h-4 w-4" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">{tx('បញ្ជីសម្រេច', 'Decision register')}</p></div>
                        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{reviewView === 'AUTO_ELIGIBLE' ? tx('សិស្សមានលទ្ធភាពឡើងថ្នាក់ស្វ័យប្រវត្តិ', 'Students automatically eligible for promotion') : reviewView === 'ATTENTION' ? tx('សិស្សរង់ចាំវាយតម្លៃបន្ថែម', 'Students awaiting further evaluation') : reviewView === 'ALL' ? tx('សិស្សទាំងអស់', 'All students') : outcomeLabel(reviewView, tx)}</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">{tx(`បង្ហាញ ${visibleDecisions.length} នាក់`, `Showing ${visibleDecisions.length} students`)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['AUTO_ELIGIBLE', 'ATTENTION', 'ALL', 'CONDITIONAL_PROMOTE'] as ReviewView[]).map((view) => {
                          const label = view === 'AUTO_ELIGIBLE' ? tx('ជាប់ស្វ័យប្រវត្តិ', 'Auto eligible') : view === 'ATTENTION' ? tx('រង់ចាំវាយតម្លៃ', 'Later evaluation') : view === 'ALL' ? tx('ទាំងអស់', 'All') : outcomeLabel(view, tx);
                          return <button key={view} onClick={() => setReviewView(view)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${reviewView === view ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{label}</button>;
                        })}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px]">
                      <label className="relative">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx('ស្វែងរកឈ្មោះ ឬលេខសម្គាល់...', 'Search name or student ID...')} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" />
                      </label>
                      <label className="relative">
                        <Filter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <select value={classFilter} onChange={(event) => { setClassFilter(event.target.value); if (event.target.value !== 'ALL') setReviewView('AUTO_ELIGIBLE'); }} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950">
                          <option value="ALL">{tx('គ្រប់ថ្នាក់', 'All classes')}</option>
                          {sourceClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </label>
                    </div>
                    {classFilter !== 'ALL' && reviewView === 'AUTO_ELIGIBLE' && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-200">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        {tx('កំពុងបង្ហាញសិស្សក្នុងថ្នាក់នេះដែលមានលទ្ធផលឆមាសទី១ និងទី២គ្រប់ មធ្យមភាគប្រចាំឆ្នាំជាប់ និងគ្មានករណីរារាំងផ្សេង។ ប្ដូរទៅ «រង់ចាំវាយតម្លៃ» ដើម្បីមើលសិស្សធ្លាក់ ឬខ្វះភស្តុតាង។', 'Showing students in this class with complete Semester 1 and Semester 2 results, a passing annual average, and no other blockers. Switch to Later evaluation for failed or incomplete cases.')}
                      </div>
                    )}
                    {classFilter !== 'ALL' && reviewView === 'ATTENTION' && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {tx('កំពុងបង្ហាញសិស្សធ្លាក់ ខ្វះលទ្ធផលឆមាស ឬមានបញ្ហាវត្តមាន/វិន័យ។ ករណីទាំងនេះមិនត្រូវបានកំណត់ថា «ត្រួតថ្នាក់» ភ្លាមៗទេ—ត្រូវកត់ត្រាលទ្ធផលរៀនបំប៉ន ប្រឡងបំពេញបន្ថែម ឬសេចក្តីសម្រេចគណៈកម្មការ។', 'Showing failed, semester-incomplete, attendance, or discipline cases. These students are not marked to repeat automatically—record remedial learning, a supplementary exam, or a committee decision first.')}
                      </div>
                    )}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[920px] border-collapse text-left">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-gray-950/70 dark:text-gray-400">
                        <tr>
                          <th className="px-5 py-3">{tx('សិស្ស', 'Student')}</th>
                          <th className="px-4 py-3">{tx('ភស្តុតាង', 'Evidence')}</th>
                          <th className="px-4 py-3">{tx('សំណើប្រព័ន្ធ', 'Recommendation')}</th>
                          <th className="px-4 py-3">{tx('សេចក្តីសម្រេច', 'Final decision')}</th>
                          <th className="px-4 py-3">{tx('ថ្នាក់ថ្មី', 'Target class')}</th>
                          <th className="px-5 py-3 text-right">{tx('សកម្មភាព', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                        {visibleDecisions.map((decision) => {
                          const flags = decision.evidence?.flags || [];
                          return (
                            <tr key={decision.id} className="transition hover:bg-blue-50/40 dark:hover:bg-blue-500/5">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-200">
                                    {decision.student.photoUrl ? <Image src={decision.student.photoUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" /> : studentInitials(decision)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{studentName(decision)}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">{decision.student.studentId || '—'} · {decision.fromClass.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                  <span><span className="text-slate-400">{tx('ឆមាស១', 'S1')}</span> <strong>{decision.evidence?.semester1Average == null ? '—' : `${decision.evidence.semester1Average}%`}</strong></span>
                                  <span><span className="text-slate-400">{tx('ឆមាស២', 'S2')}</span> <strong>{decision.evidence?.semester2Average == null ? '—' : `${decision.evidence.semester2Average}%`}</strong></span>
                                  <span><span className="text-slate-400">{tx('ប្រចាំឆ្នាំ', 'Annual')}</span> <strong>{decision.academicAverage === null ? '—' : `${decision.academicAverage}%`}</strong></span>
                                  <span><span className="text-slate-400">{tx('វត្តមាន', 'Att')}</span> <strong>{decision.attendanceRate === null ? '—' : `${decision.attendanceRate}%`}</strong></span>
                                </div>
                                {flags.length > 0 && <p className="mt-1.5 max-w-[220px] truncate text-[10px] font-bold text-amber-700 dark:text-amber-300">{flags.map((flag) => flagLabel(flag, tx)).join(' · ')}</p>}
                              </td>
                              <td className="px-4 py-4"><OutcomeBadge outcome={decision.recommendedOutcome} tx={tx} compact /></td>
                              <td className="px-4 py-4">
                                <OutcomeBadge outcome={decision.finalOutcome} tx={tx} compact />
                                {decision.decisionSource === 'OVERRIDE' && <p className="mt-1 text-[10px] font-black text-blue-600 dark:text-blue-300">{tx('បានកែដោយអ្នកគ្រប់គ្រង', 'Administrator override')}</p>}
                              </td>
                              <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-gray-200">{decision.targetClass?.name || (['GRADUATE', 'WITHDRAWN'].includes(decision.finalOutcome) ? '—' : <span className="text-amber-600">{tx('មិនទាន់កំណត់', 'Not assigned')}</span>)}</td>
                              <td className="px-5 py-4 text-right">
                                <button onClick={() => openEdit(decision)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-blue-500/10">
                                  {canEdit ? <PencilLine className="h-3.5 w-3.5" /> : <FileCheck2 className="h-3.5 w-3.5" />}
                                  {canEdit ? tx('ពិនិត្យ', 'Review') : tx('មើល', 'View')}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-gray-800 md:hidden">
                    {visibleDecisions.map((decision) => (
                      <button key={decision.id} onClick={() => openEdit(decision)} className="block w-full p-4 text-left hover:bg-blue-50/40 dark:hover:bg-blue-500/5">
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="text-sm font-black">{studentName(decision)}</p><p className="mt-1 text-[11px] text-slate-500">{decision.student.studentId || '—'} · {decision.fromClass.name}</p></div>
                          <OutcomeBadge outcome={decision.finalOutcome} tx={tx} compact />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><span className="text-slate-500">S1 <strong className="text-slate-900 dark:text-white">{decision.evidence?.semester1Average == null ? '—' : `${decision.evidence.semester1Average}%`}</strong></span><span className="text-slate-500">S2 <strong className="text-slate-900 dark:text-white">{decision.evidence?.semester2Average == null ? '—' : `${decision.evidence.semester2Average}%`}</strong></span><span className="text-slate-500">{tx('ប្រចាំឆ្នាំ', 'Annual')} <strong className="text-slate-900 dark:text-white">{decision.academicAverage === null ? '—' : `${decision.academicAverage}%`}</strong></span></div>
                      </button>
                    ))}
                  </div>

                  {visibleDecisions.length === 0 && (
                    <div className="px-6 py-16 text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                      <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">{tx('មិនមានករណីក្នុងបញ្ជីនេះទេ', 'No cases in this view')}</h3>
                      <p className="mt-1 text-xs text-slate-500">{tx('សាកល្បងប្ដូរ filter ឬមើលសិស្សទាំងអស់។', 'Change the filters or view all students.')}</p>
                      <button onClick={() => { setReviewView('ALL'); setSearch(''); setClassFilter('ALL'); }} className="mt-4 text-xs font-bold text-blue-600 hover:underline">{tx('មើលសិស្សទាំងអស់', 'View all students')}</button>
                    </div>
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                    <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-300" /><h2 className="text-base font-black">{tx('ភាពត្រៀមរួចរាល់', 'Submission readiness')}</h2></div>
                    <div className="mt-3 divide-y divide-slate-100 dark:divide-gray-800">
                      <ReadinessItem ready={cycle.summary.total > 0} label={tx('មានសិស្សក្នុងបញ្ជី', 'Register contains students')} detail={tx(`${cycle.summary.total} នាក់`, `${cycle.summary.total} students`)} />
                      <ReadinessItem ready={pendingCount === 0} label={tx('គ្មានសេចក្តីសម្រេចរង់ចាំ', 'No pending decisions')} detail={pendingCount ? tx(`នៅសល់ ${pendingCount} នាក់`, `${pendingCount} still unresolved`) : tx('បានសម្រេចគ្រប់ករណី', 'Every case has an outcome')} />
                      <ReadinessItem ready={missingTargetCount === 0} label={tx('ថ្នាក់គោលដៅបានកំណត់', 'Target classes assigned')} detail={missingTargetCount ? tx(`ខ្វះ ${missingTargetCount} នាក់`, `${missingTargetCount} assignments missing`) : tx('ការឡើង/ត្រួតថ្នាក់មានថ្នាក់ថ្មី', 'All applicable students have a class')} />
                      <ReadinessItem ready label={tx('រក្សាប្រវត្តិសម្រេច', 'Audit trail enabled')} detail={tx(`បានពិនិត្យដោយដៃ ${reviewedCount} ករណី`, `${reviewedCount} manually reviewed decisions`)} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                    {cycle.status === 'DRAFT' && (
                      <>
                        <h3 className="text-sm font-black">{tx('ជំហានបន្ទាប់៖ បញ្ជូនទៅអនុម័ត', 'Next: submit for approval')}</h3>
                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-gray-400">{canSubmit ? tx('បញ្ជីបានត្រៀមរួចរាល់។ អ្នកអនុម័តអាចធ្វើការត្រួតពិនិត្យមុន finalize។', 'The register is ready for an approver to verify before finalization.') : tx('សូមដោះស្រាយសេចក្តីសម្រេច និងថ្នាក់គោលដៅដែលនៅសល់។', 'Resolve pending decisions and missing target classes first.')}</p>
                        <button onClick={() => requestTransition('submit')} disabled={!canSubmit || saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><ClipboardCheck className="h-4 w-4" />{tx('បញ្ជូនទៅអនុម័ត', 'Submit for approval')}</button>
                      </>
                    )}
                    {cycle.status === 'IN_REVIEW' && (
                      <>
                        <h3 className="text-sm font-black">{tx('ជំហានបន្ទាប់៖ អនុម័តបញ្ជី', 'Next: approve the register')}</h3>
                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-gray-400">{tx('ផ្ទៀងផ្ទាត់ចំនួនសិស្ស ករណី override និងថ្នាក់គោលដៅ មុនអនុម័ត។', 'Verify totals, overrides, and target classes before approval.')}</p>
                        <button onClick={() => requestTransition('approve')} disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{tx('អនុម័តបញ្ជី', 'Approve register')}</button>
                      </>
                    )}
                    {cycle.status === 'APPROVED' && (
                      <>
                        <h3 className="text-sm font-black">{tx('ជំហានចុងក្រោយ៖ ផ្ទេរសិស្ស', 'Final step: enroll students')}</h3>
                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-gray-400">{tx('ប្រព័ន្ធនឹងបិទ enrollment ឆ្នាំចាស់ បង្កើត enrollment ឆ្នាំថ្មី និងរក្សា progression history។', 'The system will close source enrollments, create next-year enrollments, and preserve progression history.')}</p>
                        <button onClick={() => requestTransition('finalize')} disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"><LockKeyhole className="h-4 w-4" />{tx('Finalize និងផ្ទេរសិស្ស', 'Finalize and enroll')}</button>
                      </>
                    )}
                    {cycle.status === 'FINALIZED' && (
                      <div className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><BadgeCheck className="h-6 w-6" /></div>
                        <h3 className="mt-3 text-sm font-black">{tx('បានបញ្ចប់ដោយជោគជ័យ', 'Year-end cycle completed')}</h3>
                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-gray-400">{tx('សិស្សត្រូវបានផ្ទេរ ហើយបញ្ជីនេះត្រូវបានចាក់សោសម្រាប់ audit។', 'Students were enrolled and this register is locked for audit.')}</p>
                      </div>
                    )}
                  </div>
                </aside>
              </section>
            </>
          )}
        </main>
      </div>

      {showPolicy && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900 sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">{tx('ការកំណត់របស់សាលា', 'School governance')}</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{tx('គោលការណ៍វាយតម្លៃចុងឆ្នាំ', 'Year-end evaluation policy')}</h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 dark:text-gray-400">{tx('Policy ផ្ដល់សំណើដំបូងប៉ុណ្ណោះ។ អ្នកគ្រប់គ្រងអាច override ដោយមានមូលហេតុ និង audit trail។', 'The policy creates an initial recommendation. Authorized staff may override it with a reason and an audit trail.')}</p>
              </div>
              <button aria-label={tx('បិទ', 'Close')} onClick={() => setShowPolicy(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-black">{tx('លទ្ធផលសិក្សា', 'Academic requirements')}</h3></div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label><span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('មធ្យមភាគជាប់ (%)', 'Passing average (%)')}</span><input type="number" min={0} max={100} value={policy.passAverage} onChange={(event) => setPolicy({ ...policy, passAverage: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>
                  <label><span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('ថ្នាក់បញ្ចប់ការសិក្សា', 'Terminal grade')}</span><input data-testid="terminal-grade-policy" type="number" min={1} max={20} value={policy.terminalGrade} onChange={(event) => setPolicy({ ...policy, terminalGrade: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>
                </div>
                <label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-gray-700"><input type="checkbox" checked={policy.requireCompleteGrades} onChange={(event) => setPolicy({ ...policy, requireCompleteGrades: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" /><span><span className="block text-sm font-bold">{tx('តម្រូវឱ្យមានពិន្ទុគ្រប់គ្រាន់', 'Require complete grade evidence')}</span><span className="mt-1 block text-xs text-slate-500">{tx('ករណីខ្វះពិន្ទុនឹងត្រូវបញ្ជូនទៅពិនិត្យដោយដៃ។', 'Students with incomplete grades will require manual review.')}</span></span></label>
              </section>

              <section className="border-t border-slate-100 pt-5 dark:border-gray-800">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-black">{tx('វត្តមាន និងវិន័យ', 'Attendance and discipline')}</h3></div>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <label><span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('វត្តមានអប្បបរមា (%)', 'Minimum attendance (%)')}</span><input type="number" min={0} max={100} value={policy.minAttendanceRate} onChange={(event) => setPolicy({ ...policy, minAttendanceRate: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>
                  <label><span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('អវត្តមានឥតច្បាប់អតិបរមា', 'Max unexcused absences')}</span><input type="number" min={0} value={policy.maxUnexcusedAbsences ?? ''} placeholder={tx('មិនកំណត់', 'Not enforced')} onChange={(event) => setPolicy({ ...policy, maxUnexcusedAbsences: event.target.value === '' ? null : Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>
                  <label><span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('ករណីវិន័យអតិបរមា', 'Max discipline incidents')}</span><input type="number" min={0} value={policy.maxDisciplineIncidents ?? ''} placeholder={tx('មិនកំណត់', 'Not enforced')} onChange={(event) => setPolicy({ ...policy, maxDisciplineIncidents: event.target.value === '' ? null : Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5 dark:border-gray-800">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-black">{tx('ករណីពិសេស និងការអនុម័ត', 'Exceptions and approval controls')}</h3></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ['allowConditionalPromotion', tx('អនុញ្ញាតឡើងថ្នាក់មានលក្ខខណ្ឌ', 'Allow conditional promotion'), tx('ប្រើសម្រាប់សិស្សដែលត្រូវបំពេញលក្ខខណ្ឌបន្ថែម។', 'For students who must complete additional requirements.')],
                    ['allowSupplementaryExam', tx('អនុញ្ញាតប្រឡងបំពេញបន្ថែម', 'Allow supplementary exams'), tx('កត់ត្រាការប្រឡង និងលទ្ធផលជាភស្តុតាង។', 'Document the exam and result as evidence.')],
                    ['requireReasonForOverride', tx('តម្រូវមូលហេតុពេល override', 'Require an override reason'), tx('ការសម្រេចខុសពីសំណើប្រព័ន្ធត្រូវមានការពន្យល់។', 'Decisions differing from the recommendation need an explanation.')],
                    ['requireSecondApproval', tx('តម្រូវអ្នកអនុម័តទីពីរ', 'Require a second approver'), tx('បំបែកអ្នកវាយតម្លៃពីអ្នកអនុម័តចុងក្រោយ។', 'Separate evaluation from final approval.')],
                  ].map(([key, label, helper]) => (
                    <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-gray-700">
                      <input type="checkbox" checked={Boolean(policy[key as keyof PromotionPolicy])} onChange={(event) => setPolicy({ ...policy, [key]: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" />
                      <span><span className="block text-sm font-bold text-slate-800 dark:text-gray-100">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-gray-400">{helper}</span></span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <button onClick={() => setPolicy(DEFAULT_POLICY)} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">{tx('ស្ដារតម្លៃស្តង់ដារ', 'Restore defaults')}</button>
              <div className="flex gap-2"><button onClick={() => setShowPolicy(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-gray-700">{tx('បោះបង់', 'Cancel')}</button><button onClick={savePolicy} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{tx('រក្សាទុកគោលការណ៍', 'Save policy')}</button></div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button aria-label={tx('បិទ', 'Close')} onClick={() => setEditing(null)} className="absolute inset-0 h-full w-full cursor-default" />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-gray-800 sm:p-6">
              <div>
                <div className="flex items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">{tx('ពិនិត្យសិស្សម្នាក់', 'Individual review')}</p>{!canEdit && <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500 dark:bg-gray-800">{tx('បានចាក់សោ', 'READ ONLY')}</span>}</div>
                <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{studentName(editing)}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{editing.student.studentId || '—'} · {editing.fromClass.name}</p>
              </div>
              <button onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-950"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tx('ឆមាសទី១', 'Semester 1')}</p><p className="mt-2 text-xl font-black">{editing.evidence?.semester1Average == null ? '—' : `${editing.evidence.semester1Average}%`}</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-950"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tx('ឆមាសទី២', 'Semester 2')}</p><p className="mt-2 text-xl font-black">{editing.evidence?.semester2Average == null ? '—' : `${editing.evidence.semester2Average}%`}</p></div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/5"><p className="text-[9px] font-black uppercase tracking-wider text-blue-500">{tx('ប្រចាំឆ្នាំ', 'Annual')}</p><p className="mt-2 text-xl font-black text-blue-900 dark:text-blue-100">{editing.academicAverage === null ? '—' : `${editing.academicAverage}%`}</p><p className="mt-1 text-[10px] text-blue-600 dark:text-blue-300">{tx('ជាប់ពី', 'Pass at')} {effectivePolicy.passAverage}%</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-950"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tx('វត្តមាន', 'Attendance')}</p><p className="mt-2 text-xl font-black">{editing.attendanceRate === null ? '—' : `${editing.attendanceRate}%`}</p><p className="mt-1 text-[10px] text-slate-500">{tx('អវត្តមាន', 'Absent')} {editing.absentCount}</p></div>
              </section>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-gray-700">
                <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{tx('សំណើប្រព័ន្ធ', 'System recommendation')}</p><p className="mt-1 text-[11px] text-slate-500">{editing.reasonCode ? reasonLabel(editing.reasonCode, tx) : tx('គ្មានមូលហេតុកំណត់', 'No reason recorded')}</p></div>
                <OutcomeBadge outcome={editing.recommendedOutcome} tx={tx} compact />
              </div>

              {(editing.evidence?.flags || []).length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-200"><AlertTriangle className="h-4 w-4" />{tx('ចំណុចដែលត្រូវយកចិត្តទុកដាក់', 'Items requiring attention')}</div>
                  <div className="mt-2 flex flex-wrap gap-2">{(editing.evidence?.flags || []).map((flag) => <span key={flag} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm dark:bg-gray-900 dark:text-amber-200">{flagLabel(flag, tx)}</span>)}</div>
                </div>
              )}

              <section className="mt-6">
                <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black">{tx('១. ជ្រើសសេចក្តីសម្រេចចុងក្រោយ', '1. Choose the final decision')}</h3><p className="mt-1 text-xs text-slate-500">{tx('ជ្រើសលទ្ធផលដែលគណៈកម្មការសាលាសម្រេច។', 'Select the outcome approved by the school review team.')}</p></div>{editIsOverride && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">OVERRIDE</span>}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {OUTCOMES.map((outcome) => (
                    <button key={outcome} disabled={!canEdit} onClick={() => setEditForm({ ...editForm, finalOutcome: outcome })} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed ${editForm.finalOutcome === outcome ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/15' : 'border-slate-200 hover:border-blue-300 dark:border-gray-700'}`}>
                      <span className="text-sm font-bold">{outcomeLabel(outcome, tx)}</span>{editForm.finalOutcome === outcome && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </section>

              {editNeedsTarget && (
                <section className="mt-6">
                  <h3 className="text-sm font-black">{tx('២. កំណត់ថ្នាក់គោលដៅ', '2. Assign the target class')}</h3>
                  <p className="mt-1 text-xs text-slate-500">{editForm.finalOutcome === 'REPEAT' ? tx('សម្រាប់ត្រួតថ្នាក់ ប្រព័ន្ធបង្ហាញតែថ្នាក់កម្រិតដដែលក្នុងឆ្នាំថ្មី។', 'For repetition, only the same grade in the new year is available.') : tx('ប្រព័ន្ធបង្ហាញតែថ្នាក់កម្រិតបន្ទាប់ក្នុងឆ្នាំថ្មី។', 'Only the next grade in the target year is available.')}</p>
                  <select disabled={!canEdit} value={editForm.targetClassId} onChange={(event) => setEditForm({ ...editForm, targetClassId: event.target.value })} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950">
                    <option value="">{tx('ជ្រើសរើសថ្នាក់', 'Select a class')}</option>
                    {eligibleTargetClasses.map((target) => <option key={target.id} value={target.id}>{target.name} · {tx('ថ្នាក់ទី', 'Grade')} {target.grade}{target.capacity ? ` · ${tx('សមត្ថភាព', 'Capacity')} ${target.capacity}` : ''}</option>)}
                  </select>
                  {eligibleTargetClasses.length === 0 && <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300"><AlertCircle className="h-3.5 w-3.5" />{tx('មិនមានថ្នាក់សមស្របក្នុងឆ្នាំគោលដៅទេ។ សូមបង្កើតថ្នាក់ជាមុន។', 'No eligible class exists in the target year. Create the class first.')}</p>}
                </section>
              )}

              <section className="mt-6">
                <h3 className="text-sm font-black">{editNeedsTarget ? tx('៣. កត់ត្រាមូលហេតុ និងភស្តុតាង', '3. Document reason and evidence') : tx('២. កត់ត្រាមូលហេតុ និងភស្តុតាង', '2. Document reason and evidence')}</h3>
                {editIsOverride && effectivePolicy.requireReasonForOverride && <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-200"><Info className="mt-0.5 h-4 w-4 shrink-0" />{tx('សេចក្តីសម្រេចនេះខុសពីសំណើប្រព័ន្ធ ដូច្នេះត្រូវជ្រើសមូលហេតុ និងសរសេរការពន្យល់យ៉ាងហោចណាស់ ៣ តួអក្សរ។', 'This differs from the system recommendation, so a reason and a short explanation are required.')}</div>}
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label><span className="text-xs font-bold">{tx('មូលហេតុ', 'Reason')}</span><select disabled={!canEdit} value={editForm.reasonCode} onChange={(event) => setEditForm({ ...editForm, reasonCode: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"><option value="">{tx('ជ្រើសរើសមូលហេតុ', 'Select a reason')}</option>{REASONS.map((reason) => <option key={reason} value={reason}>{reasonLabel(reason, tx)}</option>)}</select></label>
                  <label><span className="text-xs font-bold">{tx('ចំនួនករណីវិន័យ', 'Discipline incidents')}</span><input disabled={!canEdit} type="number" min={0} value={editForm.disciplineIncidentCount} onChange={(event) => setEditForm({ ...editForm, disciplineIncidentCount: event.target.value })} placeholder="0" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950" /></label>
                </div>
                <label className="mt-4 block"><span className="text-xs font-bold">{tx('ការពន្យល់ និងភស្តុតាង', 'Explanation and evidence')}</span><textarea disabled={!canEdit} value={editForm.reasonDetails} onChange={(event) => setEditForm({ ...editForm, reasonDetails: event.target.value })} rows={3} placeholder={tx('ឧ. បានប្រឡងបំពេញបន្ថែមនៅថ្ងៃទី... និងទទួលបាន...', 'Example: Completed the supplementary exam on... with a result of...')} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950" /></label>
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-black">{tx('កម្មវិធីជួយ ឬការវាយតម្លៃបន្ថែម', 'Interventions or additional evaluation')}</h3>
                <p className="mt-1 text-xs text-slate-500">{tx('ជ្រើសរើសតែអ្វីដែលបានអនុវត្ត ឬបានគ្រោងទុកសម្រាប់សិស្សនេះ។', 'Select only the support that was completed or planned for this student.')}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">{INTERVENTIONS.map((intervention) => <label key={intervention} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-gray-700"><input disabled={!canEdit} type="checkbox" checked={editForm.interventions.includes(intervention)} onChange={(event) => setEditForm({ ...editForm, interventions: event.target.checked ? [...editForm.interventions, intervention] : editForm.interventions.filter((item) => item !== intervention) })} className="rounded border-slate-300 text-blue-600 disabled:opacity-60" />{interventionLabel(intervention, tx)}</label>)}</div>
                {editForm.interventions.length > 0 && <label className="mt-4 block"><span className="text-xs font-bold">{tx('ស្ថានភាពកម្មវិធីជួយ', 'Intervention status')}</span><select disabled={!canEdit} value={editForm.interventionStatus} onChange={(event) => setEditForm({ ...editForm, interventionStatus: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"><option value="">{tx('ជ្រើសរើសស្ថានភាព', 'Select status')}</option><option value="PLANNED">{tx('បានគ្រោងទុក', 'Planned')}</option><option value="IN_PROGRESS">{tx('កំពុងអនុវត្ត', 'In progress')}</option><option value="COMPLETED_PASSED">{tx('បានបញ្ចប់ និងជាប់', 'Completed · passed')}</option><option value="COMPLETED_NOT_PASSED">{tx('បានបញ្ចប់ តែមិនជាប់', 'Completed · not passed')}</option><option value="WAIVED">{tx('បានលើកលែង', 'Waived')}</option></select></label>}
              </section>
            </div>

            <div className="border-t border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-gray-700">{tx('បិទ', 'Close')}</button>
                {canEdit && <button onClick={saveDecision} disabled={saving || !editIsValid} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{tx('រក្សាទុកសេចក្តីសម្រេច', 'Save decision')}</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {transitionIntent && cycle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:p-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${transitionIntent === 'finalize' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'}`}>
              {transitionIntent === 'finalize' ? <LockKeyhole className="h-6 w-6" /> : transitionIntent === 'approve' ? <ShieldCheck className="h-6 w-6" /> : transitionIntent === 'recalculate' ? <RefreshCw className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">{transitionIntent === 'finalize' ? tx('បញ្ជាក់ការផ្ទេរសិស្សទៅឆ្នាំថ្មី', 'Confirm next-year enrollment') : transitionIntent === 'approve' ? tx('បញ្ជាក់ការអនុម័តបញ្ជី', 'Confirm register approval') : transitionIntent === 'recalculate' ? tx('គណនាបញ្ជីឡើងវិញតាមឆមាសទាំងពីរ', 'Recalculate from both semesters') : tx('បញ្ជាក់ការបញ្ជូនទៅអនុម័ត', 'Confirm submission for approval')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">{transitionIntent === 'finalize' ? tx(`សិស្ស ${cycle.summary.total} នាក់នឹងត្រូវបានដំណើរការតាមសេចក្តីសម្រេចចុងក្រោយ។`, `${cycle.summary.total} students will be processed using the approved final decisions.`) : transitionIntent === 'approve' ? tx('ក្រោយអនុម័ត បញ្ជីនឹងត្រូវចាក់សោមិនអាចកែសេចក្តីសម្រេចបានទៀត។', 'After approval, decisions are locked and can no longer be edited.') : transitionIntent === 'recalculate' ? tx('ប្រព័ន្ធនឹងជំនួសតែសេចក្តីសម្រេចស្វ័យប្រវត្តិក្នុង Draft ដែលមិនទាន់បានពិនិត្យ ដោយប្រើមធ្យមភាគឆមាសទី១ និងទី២។ វាមិនផ្ទេរ ឬលុប enrollment ទេ។', 'The system will replace only the unreviewed draft recommendations using the Semester 1 and Semester 2 average. It will not move or delete enrollments.') : tx('បញ្ជីនឹងផ្លាស់ទៅស្ថានភាពរង់ចាំអនុម័ត ហើយនៅតែអាចកែបានរហូតដល់ពេលអនុម័ត។', 'The register will move to approval review and remains editable until approved.')}</p>

            {transitionIntent === 'finalize' && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                <p className="text-xs font-black text-amber-900 dark:text-amber-200">{tx('អ្វីដែលប្រព័ន្ធនឹងធ្វើ', 'What the system will do')}</p>
                <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-800 dark:text-amber-200/90">
                  <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tx('បិទ enrollment ឆ្នាំប្រភពដោយរក្សាប្រវត្តិ', 'Close source-year enrollments without deleting history')}</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tx('បង្កើត enrollment តែមួយក្នុងឆ្នាំថ្មី', 'Create one protected enrollment in the target year')}</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tx('រក្សា progression និង audit trail', 'Preserve progression records and the audit trail')}</li>
                </ul>
                <label className="mt-4 flex items-start gap-3 border-t border-amber-200 pt-3 dark:border-amber-500/20"><input type="checkbox" checked={finalizeAcknowledged} onChange={(event) => setFinalizeAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-400 text-emerald-600" /><span className="text-xs font-bold leading-5 text-amber-950 dark:text-amber-100">{tx('ខ្ញុំបានពិនិត្យចំនួនសិស្ស សេចក្តីសម្រេច និងថ្នាក់គោលដៅរួចរាល់។', 'I verified student totals, final decisions, and target-class assignments.')}</span></label>
              </div>
            )}

            {transitionIntent !== 'recalculate' && <label className="mt-4 block"><span className="text-xs font-bold text-slate-700 dark:text-gray-200">{tx('កំណត់សម្គាល់ (ជាជម្រើស)', 'Approval note (optional)')}</span><textarea value={transitionNotes} onChange={(event) => setTransitionNotes(event.target.value)} rows={2} placeholder={tx('ឧ. បានពិនិត្យដោយគណៈកម្មការនៅថ្ងៃទី...', 'Example: Reviewed by the committee on...')} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setTransitionIntent(null)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold disabled:opacity-50 dark:border-gray-700">{tx('ត្រឡប់ក្រោយ', 'Go back')}</button>
              <button onClick={confirmTransition} disabled={saving || (transitionIntent === 'finalize' && !finalizeAcknowledged)} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 ${transitionIntent === 'finalize' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : transitionIntent === 'finalize' ? <LockKeyhole className="h-4 w-4" /> : transitionIntent === 'recalculate' ? <RefreshCw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{transitionIntent === 'finalize' ? tx('បញ្ជាក់ និងផ្ទេរសិស្ស', 'Confirm and enroll') : transitionIntent === 'approve' ? tx('បញ្ជាក់ការអនុម័ត', 'Confirm approval') : transitionIntent === 'recalculate' ? tx('គណនាឡើងវិញ', 'Recalculate') : tx('បញ្ជូនទៅអនុម័ត', 'Submit for approval')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
