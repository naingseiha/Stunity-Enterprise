'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  GraduationCap,
  Loader2,
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
  type YearEndDecision,
  type YearEndOutcome,
} from '@/lib/api/year-end';

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

const OUTCOMES: YearEndOutcome[] = ['PENDING', 'PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT', 'GRADUATE', 'WITHDRAWN'];
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

function OutcomeBadge({ outcome, compact = false }: { outcome: YearEndOutcome; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border font-black tracking-wide ${compact ? 'px-2 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]'} ${outcomeTone[outcome]}`}>
      {outcome.replaceAll('_', ' ')}
    </span>
  );
}

function Metric({ icon: Icon, label, value, helper, tone }: { icon: typeof Users; label: string; value: number | string; helper: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

export default function PromotionReviewPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = use(props.params);
  const isKm = locale.toLowerCase().startsWith('km');
  const tx = (km: string, en: string) => (isKm ? km : en);
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
  const [outcomeFilter, setOutcomeFilter] = useState<YearEndOutcome | 'ALL'>('ALL');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [editing, setEditing] = useState<YearEndDecision | null>(null);
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
    const target = sortedYears.find((year) => source && new Date(year.startDate) > new Date(source.endDate));
    if ((!toYearId || toYearId === source?.id) && target) setToYearId(target.id);
  }, [fromYearId, sortedYears, toYearId]);

  useEffect(() => {
    if (!schoolId) return;
    yearEndApi.getPolicy(schoolId).then(setPolicy).catch(() => setPolicy(DEFAULT_POLICY));
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !fromYearId) return;
    setLoading(true);
    setError('');
    yearEndApi.getCycle(schoolId, fromYearId, toYearId || undefined)
      .then(setCycle)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fromYearId, schoolId, toYearId]);

  const fromYear = sortedYears.find((year) => year.id === fromYearId);
  const toYear = sortedYears.find((year) => year.id === toYearId);
  const sourceClasses = useMemo(() => Array.from(new Map((cycle?.decisions || []).map((decision) => [decision.fromClass.id, decision.fromClass])).values()), [cycle]);
  const visibleDecisions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (cycle?.decisions || []).filter((decision) => {
      const student = decision.student;
      const names = [student.firstName, student.lastName, student.englishFirstName, student.englishLastName, student.studentId, decision.fromClass.name].filter(Boolean).join(' ').toLowerCase();
      return (!query || names.includes(query))
        && (classFilter === 'ALL' || decision.fromClassId === classFilter)
        && (outcomeFilter === 'ALL' || decision.finalOutcome === outcomeFilter)
        && (!attentionOnly || decision.finalOutcome === 'PENDING' || decision.decisionSource === 'OVERRIDE');
    });
  }, [attentionOnly, classFilter, cycle, outcomeFilter, search]);

  const reloadCycle = async () => {
    if (!schoolId || !fromYearId) return;
    setCycle(await yearEndApi.getCycle(schoolId, fromYearId, toYearId || undefined));
  };

  const generate = async () => {
    if (!schoolId || !fromYearId || !toYearId) return;
    try {
      setLoading(true); setError(''); setSuccess('');
      const generated = await yearEndApi.generate(schoolId, fromYearId, toYearId);
      setCycle(generated);
      setSuccess(tx('បានបង្កើតបញ្ជីវាយតម្លៃចុងឆ្នាំរួចរាល់។', 'Year-end evaluation list generated.'));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const savePolicy = async () => {
    if (!schoolId) return;
    try {
      setSaving(true); setError('');
      setPolicy(await yearEndApi.savePolicy(schoolId, policy));
      setSuccess(tx('បានរក្សាទុកគោលការណ៍សាលា។ Policy ថ្មីនឹងប្រើសម្រាប់បញ្ជីដែលបង្កើតបន្ទាប់។', 'School policy saved. It will apply to newly generated cycles.'));
      setShowPolicy(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
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
    if (['PROMOTE', 'CONDITIONAL_PROMOTE'].includes(editForm.finalOutcome)) return targetClasses.filter((target) => parseGrade(target.grade) === (sourceGrade ?? -2) + 1);
    return [];
  }, [editForm.finalOutcome, editing, targetClasses]);

  useEffect(() => {
    if (!editing || !['PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT'].includes(editForm.finalOutcome)) return;
    if (!eligibleTargetClasses.some((target) => target.id === editForm.targetClassId)) {
      setEditForm((current) => ({ ...current, targetClassId: eligibleTargetClasses[0]?.id || '' }));
    }
  }, [editForm.finalOutcome, editForm.targetClassId, editing, eligibleTargetClasses]);

  const saveDecision = async () => {
    if (!editing || !schoolId) return;
    try {
      setSaving(true); setError('');
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
      setSuccess(tx('បានរក្សាទុកសេចក្តីសម្រេច និង audit trail។', 'Decision and audit trail saved.'));
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const transition = async (action: 'submit' | 'approve' | 'finalize') => {
    if (!cycle || !schoolId) return;
    const message = action === 'finalize'
      ? tx('Finalize នឹងផ្លាស់ទីសិស្សទៅថ្នាក់ឆ្នាំថ្មី និងបិទឆ្នាំចាស់។ តើអ្នកប្រាកដទេ?', 'Finalizing will create next-year enrollments and close the source year. Continue?')
      : tx('តើអ្នកចង់បន្តដំណាក់កាលនេះមែនទេ?', 'Continue with this workflow action?');
    if (!window.confirm(message)) return;
    try {
      setSaving(true); setError(''); setSuccess('');
      await yearEndApi.transition(schoolId, fromYearId, cycle.id, action);
      await Promise.all([reloadCycle(), mutateYears()]);
      setSuccess(action === 'finalize'
        ? tx('បាន finalize បញ្ជីចុងឆ្នាំ និងបង្កើត enrollment ឆ្នាំថ្មីដោយជោគជ័យ។', 'Year-end decisions finalized and next-year enrollments created.')
        : tx('បានប្តូរស្ថានភាព workflow ដោយជោគជ័យ។', 'Workflow status updated.'));
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const logout = async () => { await TokenManager.logout(); router.push(`/${locale}/auth/login`); };
  if (yearsLoading && !years.length) return <PageSkeleton user={user} school={school} type="table" showFilters />;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={logout} />
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_50%,#f8fafc_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1120_52%,#020617_100%)] dark:text-white lg:ml-64">
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_50%,#eef2ff_100%)] p-6 shadow-[0_30px_90px_-45px_rgba(249,115,22,0.5)] dark:border-gray-800 dark:bg-[linear-gradient(135deg,#0f172a,#111827_50%,#172554)] sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                  <ClipboardCheck className="h-4 w-4" /> Enterprise year-end governance
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  {tx('បញ្ជីវាយតម្លៃ និងសម្រេចចុងឆ្នាំសិក្សា', 'Year-end evaluation & progression decisions')}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-gray-300">
                  {tx('ពិនិត្យពិន្ទុ វត្តមាន វិន័យ និងកម្មវិធីជួយសិស្ស មុនសម្រេចឡើងថ្នាក់ ឡើងថ្នាក់មានលក្ខខណ្ឌ ត្រួតថ្នាក់ ឬបញ្ចប់ការសិក្សា។', 'Review grades, attendance, discipline and interventions before promotion, conditional promotion, retention or graduation.')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowPolicy(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                  <Settings2 className="h-4 w-4" /> {tx('គោលការណ៍សាលា', 'School policy')}
                </button>
                {cycle && <button onClick={reloadCycle} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><RefreshCw className="h-4 w-4" /> {tx('ផ្ទុកឡើងវិញ', 'Refresh')}</button>}
              </div>
            </div>

            <div className="mt-7 grid gap-4 rounded-2xl border border-white/80 bg-white/75 p-4 backdrop-blur dark:border-gray-700 dark:bg-gray-950/45 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
              <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{tx('ឆ្នាំប្រភព', 'Source year')}</span><select value={fromYearId} onChange={(event) => { setFromYearId(event.target.value); setCycle(null); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900">{sortedYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
              <ArrowRight className="mb-3 hidden h-5 w-5 text-orange-500 md:block" />
              <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{tx('ឆ្នាំគោលដៅ', 'Target year')}</span><select value={toYearId} onChange={(event) => { setToYearId(event.target.value); setCycle(null); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900"> <option value="">{tx('ជ្រើសរើសឆ្នាំ', 'Select year')}</option>{sortedYears.filter((year) => year.id !== fromYearId).map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
              {!cycle && <button onClick={generate} disabled={!fromYearId || !toYearId || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{tx('បង្កើតបញ្ជីវាយតម្លៃ', 'Generate evaluation list')}</button>}
              {cycle && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-gray-700 dark:bg-gray-800"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p><p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{cycle.status.replaceAll('_', ' ')}</p></div>}
            </div>
          </section>

          {(error || success) && <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${error ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'}`}>{error ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}<p className="flex-1">{error || success}</p><button onClick={() => { setError(''); setSuccess(''); }}><X className="h-4 w-4" /></button></div>}

          {loading && !cycle && <div className="mt-8 flex justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-orange-500" /></div>}

          {cycle && (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Metric icon={Users} label={tx('សរុប', 'Total learners')} value={cycle.summary.total} helper={`${fromYear?.name || ''} → ${toYear?.name || ''}`} tone="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                <Metric icon={UserRoundCheck} label={tx('ឡើងថ្នាក់', 'Promote')} value={(cycle.summary.PROMOTE || 0) + (cycle.summary.CONDITIONAL_PROMOTE || 0)} helper={tx('រួមមានមានលក្ខខណ្ឌ', 'Includes conditional')} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
                <Metric icon={UserRoundX} label={tx('ត្រួតថ្នាក់', 'Repeat')} value={cycle.summary.REPEAT || 0} helper={tx('ត្រូវមានមូលហេតុ', 'Reason required')} tone="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" />
                <Metric icon={Clock3} label={tx('រង់ចាំសម្រេច', 'Pending review')} value={cycle.summary.PENDING || 0} helper={tx('ត្រូវដោះស្រាយមុន submit', 'Resolve before submit')} tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
                <Metric icon={GraduationCap} label={tx('បញ្ចប់ការសិក្សា', 'Graduate')} value={cycle.summary.GRADUATE || 0} helper={tx('ថ្នាក់ចុងក្រោយ', 'Terminal grade')} tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" />
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                <div className="border-b border-slate-200 p-5 dark:border-gray-800">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-500">Decision register</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{tx('បញ្ជីសិស្សចុងឆ្នាំ', 'End-of-year student list')}</h2></div>
                    <div className="flex flex-wrap gap-2">
                      {cycle.status === 'DRAFT' && <button onClick={() => transition('submit')} disabled={saving || (cycle.summary.PENDING || 0) > 0} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"><ClipboardCheck className="h-4 w-4" />{tx('បញ្ជូនទៅអនុម័ត', 'Submit for approval')}</button>}
                      {cycle.status === 'IN_REVIEW' && <button onClick={() => transition('approve')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white"><ShieldCheck className="h-4 w-4" />{tx('អនុម័តបញ្ជី', 'Approve register')}</button>}
                      {cycle.status === 'APPROVED' && <button onClick={() => transition('finalize')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"><Check className="h-4 w-4" />{tx('Finalize និងផ្ទេរថ្នាក់', 'Finalize & enroll')}</button>}
                      {cycle.status === 'FINALIZED' && <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{tx('បានបញ្ចប់', 'Finalized')}</span>}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
                    <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx('ស្វែងរកឈ្មោះ ឬលេខសម្គាល់...', 'Search name or student ID...')} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950" /></label>
                    <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"><option value="ALL">{tx('គ្រប់ថ្នាក់', 'All classes')}</option>{sourceClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                    <select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value as YearEndOutcome | 'ALL')} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"><option value="ALL">{tx('គ្រប់លទ្ធផល', 'All outcomes')}</option>{OUTCOMES.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"><input type="checkbox" checked={attentionOnly} onChange={(event) => setAttentionOnly(event.target.checked)} className="rounded border-slate-300 text-orange-600" /><Filter className="h-4 w-4" />{tx('ត្រូវពិនិត្យ', 'Needs attention')}</label>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[1180px] w-full">
                    <thead className="bg-slate-50 text-left dark:bg-gray-950/70"><tr>{[tx('សិស្ស', 'Student'), tx('ថ្នាក់បច្ចុប្បន្ន', 'Current class'), tx('មធ្យមភាគ', 'Average'), tx('វត្តមាន', 'Attendance'), tx('សំណើប្រព័ន្ធ', 'Recommendation'), tx('សេចក្តីសម្រេច', 'Final decision'), tx('មូលហេតុ/ជំនួយ', 'Reason / intervention'), tx('សកម្មភាព', 'Action')].map((label) => <th key={label} className="border-b border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:border-gray-800">{label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                      {visibleDecisions.map((decision) => {
                        const displayName = [decision.student.englishFirstName || decision.student.firstName, decision.student.englishLastName || decision.student.lastName].filter(Boolean).join(' ');
                        const flags = decision.evidence?.flags || [];
                        return <tr key={decision.id} className={decision.finalOutcome === 'PENDING' ? 'bg-amber-50/40 dark:bg-amber-500/[0.03]' : ''}>
                          <td className="px-4 py-4"><p className="font-black text-slate-950 dark:text-white">{displayName}</p><p className="mt-1 text-xs font-semibold text-slate-400">{decision.student.studentId || '—'}</p></td>
                          <td className="px-4 py-4"><p className="text-sm font-bold text-slate-800 dark:text-gray-200">{decision.fromClass.name}</p><p className="mt-1 text-xs text-slate-400">Grade {decision.fromClass.grade}</p></td>
                          <td className="px-4 py-4"><p className={`text-lg font-black ${decision.academicAverage !== null && decision.academicAverage < cycle.policySnapshot.passAverage ? 'text-rose-600' : 'text-slate-950 dark:text-white'}`}>{decision.academicAverage === null ? '—' : `${decision.academicAverage}%`}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{decision.evidence?.gradeRecordCount || 0} records</p></td>
                          <td className="px-4 py-4"><p className={`text-lg font-black ${decision.attendanceRate !== null && decision.attendanceRate < cycle.policySnapshot.minAttendanceRate ? 'text-rose-600' : 'text-slate-950 dark:text-white'}`}>{decision.attendanceRate === null ? '—' : `${decision.attendanceRate}%`}</p><p className="mt-1 text-[10px] font-bold text-slate-400">A {decision.absentCount} · L {decision.lateCount} · E {decision.excusedCount}</p></td>
                          <td className="px-4 py-4"><OutcomeBadge outcome={decision.recommendedOutcome} compact />{flags.length > 0 && <p className="mt-2 max-w-[190px] text-[10px] font-bold leading-4 text-amber-700 dark:text-amber-300">{flags.join(', ').replaceAll('_', ' ')}</p>}</td>
                          <td className="px-4 py-4"><OutcomeBadge outcome={decision.finalOutcome} /><p className="mt-2 text-[10px] font-bold text-slate-400">{decision.targetClass?.name || (decision.finalOutcome === 'GRADUATE' ? tx('បញ្ចប់ការសិក្សា', 'Graduate') : '—')}</p></td>
                          <td className="px-4 py-4"><p className="max-w-[220px] text-xs font-bold text-slate-700 dark:text-gray-300">{(decision.reasonCode || '—').replaceAll('_', ' ')}</p>{decision.reasonDetails && <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400" title={decision.reasonDetails}>{decision.reasonDetails}</p>}{(decision.interventions || []).length > 0 && <p className="mt-2 text-[10px] font-black text-sky-600">{decision.interventions?.length} intervention(s)</p>}</td>
                          <td className="px-4 py-4"><button onClick={() => openEdit(decision)} disabled={!['DRAFT', 'IN_REVIEW'].includes(cycle.status)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"><PencilLine className="h-3.5 w-3.5" />{tx('ពិនិត្យ', 'Review')}</button></td>
                        </tr>;
                      })}
                      {visibleDecisions.length === 0 && <tr><td colSpan={8} className="px-6 py-20 text-center text-sm font-semibold text-slate-400">{tx('មិនមានសិស្សត្រូវនឹង filter នេះទេ។', 'No students match these filters.')}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-xs font-bold text-slate-500 dark:border-gray-800"><span>{tx('បង្ហាញ', 'Showing')} {visibleDecisions.length} / {cycle.decisions.length}</span><span>{tx('បានពិនិត្យ', 'Reviewed')} {cycle.summary.reviewed} · Overrides {cycle.summary.overrides}</span></div>
              </section>
            </>
          )}
        </main>
      </div>

      {showPolicy && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"><div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-500">Recommendation policy</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{tx('គោលការណ៍ឡើងថ្នាក់របស់សាលា', 'School progression policy')}</h2><p className="mt-2 text-sm text-slate-500">{tx('ប្រព័ន្ធប្រើ policy នេះដើម្បីផ្តល់សំណើប៉ុណ្ណោះ។ អ្នកគ្រប់គ្រងជាអ្នកសម្រេចចុងក្រោយ។', 'The system uses this policy for recommendations; administrators retain the final decision.')}</p></div><button onClick={() => setShowPolicy(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button></div><div className="grid gap-5 p-6 sm:grid-cols-2">
        <label><span className="text-xs font-black text-slate-700 dark:text-gray-200">{tx('មធ្យមភាគជាប់ (%)', 'Passing average (%)')}</span><input type="number" min={0} max={100} value={policy.passAverage} onChange={(event) => setPolicy({ ...policy, passAverage: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950" /></label>
        <label><span className="text-xs font-black text-slate-700 dark:text-gray-200">{tx('វត្តមានអប្បបរមា (%)', 'Minimum attendance (%)')}</span><input type="number" min={0} max={100} value={policy.minAttendanceRate} onChange={(event) => setPolicy({ ...policy, minAttendanceRate: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950" /></label>
        <label><span className="text-xs font-black text-slate-700 dark:text-gray-200">{tx('ថ្នាក់បញ្ចប់ការសិក្សា', 'Terminal grade')}</span><input data-testid="terminal-grade-policy" type="number" min={1} max={20} value={policy.terminalGrade} onChange={(event) => setPolicy({ ...policy, terminalGrade: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950" /></label>
        <label><span className="text-xs font-black text-slate-700 dark:text-gray-200">{tx('អវត្តមានឥតច្បាប់អតិបរមា', 'Max unexcused absences')}</span><input type="number" min={0} value={policy.maxUnexcusedAbsences ?? ''} placeholder={tx('មិនកំណត់', 'Not enforced')} onChange={(event) => setPolicy({ ...policy, maxUnexcusedAbsences: event.target.value === '' ? null : Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950" /></label>
        <label><span className="text-xs font-black text-slate-700 dark:text-gray-200">{tx('ករណីវិន័យអតិបរមា', 'Max discipline incidents')}</span><input type="number" min={0} value={policy.maxDisciplineIncidents ?? ''} placeholder={tx('មិនកំណត់', 'Not enforced')} onChange={(event) => setPolicy({ ...policy, maxDisciplineIncidents: event.target.value === '' ? null : Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950" /></label>
        {[['requireCompleteGrades', tx('តម្រូវឱ្យបញ្ចូលពិន្ទុគ្រប់គ្រាន់', 'Require complete grade evidence')], ['allowConditionalPromotion', tx('អនុញ្ញាតឡើងថ្នាក់មានលក្ខខណ្ឌ', 'Allow conditional promotion')], ['allowSupplementaryExam', tx('អនុញ្ញាតប្រឡងបំពេញបន្ថែម', 'Allow supplementary exams')], ['requireReasonForOverride', tx('តម្រូវមូលហេតុពេល override', 'Require an override reason')], ['requireSecondApproval', tx('តម្រូវអ្នកអនុម័តទីពីរ', 'Require a second approver')]].map(([key, label]) => <label key={key as string} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-gray-700"><input type="checkbox" checked={Boolean(policy[key as keyof PromotionPolicy])} onChange={(event) => setPolicy({ ...policy, [key]: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-orange-600" /><span className="text-sm font-bold text-slate-700 dark:text-gray-200">{label as string}</span></label>)}
      </div><div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><button onClick={() => setShowPolicy(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-gray-700">{tx('បោះបង់', 'Cancel')}</button><button onClick={savePolicy} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{tx('រក្សាទុក policy', 'Save policy')}</button></div></div></div>}

      {editing && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-500">Individual review</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{[editing.student.englishFirstName || editing.student.firstName, editing.student.englishLastName || editing.student.lastName].filter(Boolean).join(' ')}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{editing.fromClass.name} · {editing.student.studentId || '—'}</p></div><button onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button></div>
        <div className="p-6"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4 dark:bg-gray-950"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average</p><p className="mt-1 text-2xl font-black">{editing.academicAverage === null ? '—' : `${editing.academicAverage}%`}</p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-gray-950"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance</p><p className="mt-1 text-2xl font-black">{editing.attendanceRate === null ? '—' : `${editing.attendanceRate}%`}</p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-gray-950"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recommendation</p><div className="mt-2"><OutcomeBadge outcome={editing.recommendedOutcome} compact /></div></div></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2"><label><span className="text-xs font-black">{tx('សេចក្តីសម្រេចចុងក្រោយ', 'Final decision')}</span><select value={editForm.finalOutcome} onChange={(event) => setEditForm({ ...editForm, finalOutcome: event.target.value as YearEndOutcome })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950">{OUTCOMES.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
          {['PROMOTE', 'CONDITIONAL_PROMOTE', 'REPEAT'].includes(editForm.finalOutcome) && <label><span className="text-xs font-black">{tx('ថ្នាក់គោលដៅ', 'Target class')}</span><select value={editForm.targetClassId} onChange={(event) => setEditForm({ ...editForm, targetClassId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"><option value="">{tx('ជ្រើសរើសថ្នាក់', 'Select class')}</option>{eligibleTargetClasses.map((target) => <option key={target.id} value={target.id}>{target.name} · Grade {target.grade}</option>)}</select></label>}
          <label><span className="text-xs font-black">{tx('កូដមូលហេតុ', 'Reason code')}</span><select value={editForm.reasonCode} onChange={(event) => setEditForm({ ...editForm, reasonCode: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"><option value="">{tx('ជ្រើសរើសមូលហេតុ', 'Select reason')}</option>{REASONS.map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label>
          <label><span className="text-xs font-black">{tx('ចំនួនករណីវិន័យ', 'Discipline incident count')}</span><input type="number" min={0} value={editForm.disciplineIncidentCount} onChange={(event) => setEditForm({ ...editForm, disciplineIncidentCount: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-950" /></label></div>
          <label className="mt-5 block"><span className="text-xs font-black">{tx('សេចក្តីពន្យល់/ភស្តុតាង', 'Explanation / evidence')}</span><textarea value={editForm.reasonDetails} onChange={(event) => setEditForm({ ...editForm, reasonDetails: event.target.value })} rows={3} placeholder={tx('សរសេរមូលហេតុជាក់លាក់ និងសេចក្តីសម្រេចរបស់គណៈកម្មការ...', 'Document the specific reason and committee rationale...')} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950" /></label>
          <div className="mt-5"><p className="text-xs font-black">{tx('កម្មវិធីជួយ/ការវាយតម្លៃបន្ថែម', 'Interventions / additional evaluation')}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{INTERVENTIONS.map((intervention) => <label key={intervention} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-gray-700"><input type="checkbox" checked={editForm.interventions.includes(intervention)} onChange={(event) => setEditForm({ ...editForm, interventions: event.target.checked ? [...editForm.interventions, intervention] : editForm.interventions.filter((item) => item !== intervention) })} className="rounded border-slate-300 text-orange-600" />{intervention.replaceAll('_', ' ')}</label>)}</div></div>
          {editForm.interventions.length > 0 && <label className="mt-5 block"><span className="text-xs font-black">{tx('ស្ថានភាពកម្មវិធីជួយ', 'Intervention status')}</span><select value={editForm.interventionStatus} onChange={(event) => setEditForm({ ...editForm, interventionStatus: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950"><option value="">{tx('ជ្រើសរើសស្ថានភាព', 'Select status')}</option><option value="PLANNED">PLANNED</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="COMPLETED_PASSED">COMPLETED · PASSED</option><option value="COMPLETED_NOT_PASSED">COMPLETED · NOT PASSED</option><option value="WAIVED">WAIVED</option></select></label>}
        </div><div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-gray-700">{tx('បោះបង់', 'Cancel')}</button><button onClick={saveDecision} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}{tx('រក្សាទុកសេចក្តីសម្រេច', 'Save decision')}</button></div></div></div>}
    </>
  );
}
