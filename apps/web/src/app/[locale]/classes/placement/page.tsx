'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Dice5,
  Download,
  GripVertical,
  Layers3,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Undo2,
  Upload,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { TokenManager } from '@/lib/api/auth';
import {
  classPlacementApi,
  type PlacementBatch,
  type PlacementPreview,
  type PlacementStrategy,
  type PlacementWorkspace,
} from '@/lib/api/classes';

const GRADES = ['7', '8', '9', '10', '11', '12'];

const csvEscape = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { cells.push(cell); cell = ''; }
    else cell += character;
  }
  cells.push(cell);
  return cells;
};

const downloadCsv = (filename: string, rows: unknown[][]) => {
  const body = `\uFEFF${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function ClassPlacementPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = use(props.params);
  const isKm = locale.toLowerCase().startsWith('km');
  const tx = (km: string, en: string) => isKm ? km : en;
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = TokenManager.getUserData();
  const user = auth?.user;
  const school = auth?.school;
  const { selectedYear, allYears, setSelectedYear } = useAcademicYear();

  const [grade, setGrade] = useState('11');
  const [capacity, setCapacity] = useState(50);
  const [classCount, setClassCount] = useState(6);
  const [workspace, setWorkspace] = useState<PlacementWorkspace | null>(null);
  const [preview, setPreview] = useState<PlacementPreview | null>(null);
  const [strategy, setStrategy] = useState<PlacementStrategy>('RANDOM_BALANCED');
  const [seed, setSeed] = useState(() => String(Date.now()));
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<Map<string, string>>(new Map());
  const [pinTargetClassId, setPinTargetClassId] = useState('');
  const [search, setSearch] = useState('');
  const [topCount, setTopCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [batches, setBatches] = useState<PlacementBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<PlacementBatch | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const isHistoricalYear = selectedYear?.status === 'ENDED' || selectedYear?.status === 'ARCHIVED';

  useEffect(() => {
    const requestedYearId = searchParams.get('yearId');
    if (!requestedYearId || requestedYearId === selectedYear?.id) return;
    const requestedYear = allYears.find((year) => year.id === requestedYearId);
    if (requestedYear) setSelectedYear(requestedYear);
  }, [allYears, searchParams, selectedYear?.id, setSelectedYear]);

  const loadWorkspace = async (clearMessage = true) => {
    if (!selectedYear?.id) return;
    setLoading(true);
    if (clearMessage) setMessage(null);
    try {
      const [data, batchData] = await Promise.all([
        classPlacementApi.getWorkspace(selectedYear.id, grade),
        classPlacementApi.listBatches(selectedYear.id, grade),
      ]);
      setWorkspace(data);
      setBatches(batchData);
      setActiveBatch((current) => batchData.find((item) => item.id === current?.id) || null);
      setSelectedClassIds(new Set(data.classes.map((item) => item.id)));
      setPinTargetClassId(data.classes[0]?.id || '');
      setPreview(null);
      setActiveBatch(null);
      setPinned(new Map());
      setSelectedStudentIds(new Set());
      const recommended = Math.max(1, Math.ceil(data.candidates.length / capacity));
      setClassCount(recommended);
    } catch (error: any) {
      setMessage({ tone: 'error', text: error.message || tx('មិនអាចទាញយកបញ្ជីបែងចែកថ្នាក់បានទេ។', 'Unable to load placement workspace.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear?.id, grade]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workspace?.candidates || [];
    return (workspace?.candidates || []).filter((student) =>
      [student.studentId, student.firstName, student.lastName, student.englishFirstName, student.englishLastName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search, workspace?.candidates]);

  const previewAssignments = useMemo(() => preview?.assignments || [], [preview?.assignments]);
  const candidateById = useMemo(
    () => new Map((workspace?.candidates || []).map((item) => [item.id, item])),
    [workspace?.candidates],
  );
  const previewGroups = useMemo(() => (workspace?.classes || [])
    .filter((item) => selectedClassIds.has(item.id))
    .map((classItem) => {
      const students = previewAssignments
        .filter((item) => item.classId === classItem.id)
        .map((item) => ({ ...item, student: candidateById.get(item.studentId)! }))
        .filter((item) => item.student);
      const scores = students.map((item) => item.student.academicAverage).filter((value): value is number => value != null);
      return {
        ...classItem,
        students,
        projectedCount: classItem.currentCount + students.length,
        femaleCount: students.filter((item) => item.student.gender === 'FEMALE').length,
        averageScore: scores.length ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)) : null,
      };
    }), [candidateById, previewAssignments, selectedClassIds, workspace?.classes]);

  const generateClasses = async () => {
    if (!selectedYear?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await classPlacementApi.generateClasses({ academicYearId: selectedYear.id, grade, capacity, classCount });
      setWorkspace(data);
      setSelectedClassIds(new Set(data.classes.map((item) => item.id)));
      setPinTargetClassId(data.classes[0]?.id || '');
      setPreview(null);
      setMessage({ tone: 'success', text: tx(`បានរៀបចំថ្នាក់ Grade ${grade} ចំនួន ${data.classes.length}។`, `Prepared ${data.classes.length} Grade ${grade} classes.`) });
    } catch (error: any) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const pinSelected = () => {
    if (!pinTargetClassId || !selectedStudentIds.size) return;
    setPinned((previous) => {
      const next = new Map(previous);
      selectedStudentIds.forEach((studentId) => next.set(studentId, pinTargetClassId));
      return next;
    });
    setSelectedStudentIds(new Set());
    setPreview(null);
  };

  const selectTopRanked = () => {
    const ids = (workspace?.candidates || []).slice(0, Math.max(0, topCount)).map((item) => item.id);
    setSelectedStudentIds(new Set(ids));
  };

  const runPreview = async () => {
    if (!selectedYear?.id || !selectedClassIds.size) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await classPlacementApi.preview({
        academicYearId: selectedYear.id,
        grade,
        classIds: [...selectedClassIds],
        strategy,
        seed,
        pinned: [...pinned].map(([studentId, classId]) => ({ studentId, classId })),
      });
      setPreview(data);
      setActiveBatch(null);
      if (data.unassignedStudentIds.length) {
        setMessage({ tone: 'error', text: tx(`នៅសល់ ${data.unassignedStudentIds.length} នាក់ ព្រោះកៅអីមិនគ្រប់។`, `${data.unassignedStudentIds.length} students remain because capacity is insufficient.`) });
      }
    } catch (error: any) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const movePreviewStudent = (studentId: string, classId: string) => {
    if (!preview) return;
    const target = workspace?.classes.find((item) => item.id === classId);
    const currentTargetCount = preview.assignments.filter((item) => item.classId === classId && item.studentId !== studentId).length + (target?.currentCount || 0);
    if (target?.capacity != null && currentTargetCount >= target.capacity) {
      setMessage({ tone: 'error', text: tx(`${target.name} ពេញហើយ។`, `${target.name} is already full.`) });
      return;
    }
    setPreview({
      ...preview,
      assignments: preview.assignments.map((item) => item.studentId === studentId ? { ...item, classId, pinned: true } : item),
    });
    setPinned((previous) => new Map(previous).set(studentId, classId));
  };

  const loadSavedBatch = (batch: PlacementBatch) => {
    if (!workspace || !batch.latestVersion) return;
    const assignments = batch.latestVersion.assignments || [];
    const assignedIds = new Set(assignments.map((item) => item.studentId));
    setStrategy(batch.latestVersion.strategy);
    setSeed(batch.latestVersion.seed);
    setSelectedClassIds(new Set(batch.latestVersion.classIds));
    setPinned(new Map(assignments.filter((item) => item.pinned).map((item) => [item.studentId, item.classId])));
    setPreview({
      ...workspace,
      strategy: batch.latestVersion.strategy,
      seed: batch.latestVersion.seed,
      assignments,
      unassignedStudentIds: workspace.candidates.filter((item) => !assignedIds.has(item.id)).map((item) => item.id),
      classSummaries: [],
    });
    setActiveBatch(batch);
    setMessage({ tone: 'success', text: tx(`បានបើក Draft version ${batch.currentVersion}។`, `Loaded draft version ${batch.currentVersion}.`) });
  };

  const saveDraft = async () => {
    if (!selectedYear?.id || !preview || preview.unassignedStudentIds.length || (activeBatch && activeBatch.status !== 'DRAFT')) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await classPlacementApi.saveDraft({
        batchId: activeBatch?.id,
        expectedVersion: activeBatch?.currentVersion,
        academicYearId: selectedYear.id,
        grade,
        strategy,
        seed,
        assignments: preview.assignments,
        summary: {
          assignmentCount: preview.assignments.length,
          classes: previewGroups.map((item) => ({ classId: item.id, projectedCount: item.projectedCount, femaleCount: item.femaleCount, averageScore: item.averageScore })),
        },
      });
      setActiveBatch(saved);
      setBatches((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setMessage({ tone: 'success', text: tx(`បានរក្សា Draft version ${saved.currentVersion}។`, `Saved draft version ${saved.currentVersion}.`) });
    } catch (error: any) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleBatchAction = async (batch: PlacementBatch, action: 'submit' | 'approve' | 'apply' | 'undo') => {
    if (isHistoricalYear && action !== 'undo') return;
    if (action === 'undo') {
      const confirmed = window.confirm(tx('Undo នឹងបិទ enrollment ដែល batch នេះបានបង្កើត។ វាអាចធ្វើបានតែក្នុងករណីមិនទាន់មានពិន្ទុ ឬវត្តមាន។ បន្តឬទេ?', 'Undo will close the enrollments created by this batch. It is allowed only before grades or attendance exist. Continue?'));
      if (!confirmed) return;
    }
    setSaving(true);
    setMessage(null);
    try {
      let updated: PlacementBatch | null = null;
      if (action === 'submit') updated = await classPlacementApi.submitBatch(batch.id);
      if (action === 'approve') updated = await classPlacementApi.approveBatch(batch.id);
      if (action === 'apply') {
        const result = await classPlacementApi.applyBatch(batch.id);
        setMessage({ tone: 'success', text: tx(`បាន enroll សិស្ស ${result.assigned} នាក់តាម approved batch។`, `Enrolled ${result.assigned} students from the approved batch.`) });
        await loadWorkspace(false);
        return;
      }
      if (action === 'undo') {
        const result = await classPlacementApi.undoBatch(batch.id, 'Administrative placement correction');
        setMessage({ tone: 'success', text: tx(`បាន Undo enrollment ${result.reversed} នាក់ និងរក្សា audit history។`, `Reversed ${result.reversed} enrollments and preserved the audit history.`) });
        await loadWorkspace(false);
        return;
      }
      if (updated) {
        setActiveBatch(updated);
        setBatches((current) => [updated!, ...current.filter((item) => item.id !== updated!.id)]);
        setMessage({ tone: 'success', text: action === 'submit' ? tx('បានបញ្ជូន Draft ទៅពិនិត្យ។', 'Draft submitted for review.') : tx('Batch ត្រូវបានអនុម័ត។', 'Placement batch approved.') });
      }
    } catch (error: any) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const exportPlacementCsv = () => {
    if (!preview || !workspace) return;
    const classById = new Map(workspace.classes.map((item) => [item.id, item]));
    downloadCsv(`grade-${grade}-placement-v${activeBatch?.currentVersion || 'draft'}.csv`, [
      ['student_uuid', 'student_code', 'student_name', 'class_uuid', 'class_name', 'pinned'],
      ...preview.assignments.map((item) => {
        const student = candidateById.get(item.studentId);
        const target = classById.get(item.classId);
        return [item.studentId, student?.studentId || '', `${student?.firstName || ''} ${student?.lastName || ''}`.trim(), item.classId, target?.name || '', item.pinned ? 'true' : 'false'];
      }),
    ]);
  };

  const importPlacementCsv = async (file: File) => {
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) throw new Error(tx('CSV គ្មានទិន្នន័យ។', 'CSV contains no assignment rows.'));
      const headers = parseCsvLine(lines[0]).map((item) => item.trim().toLowerCase());
      const studentIndex = headers.indexOf('student_uuid');
      const classIndex = headers.indexOf('class_uuid');
      const pinnedIndex = headers.indexOf('pinned');
      if (studentIndex < 0 || classIndex < 0) throw new Error(tx('CSV ត្រូវមាន column student_uuid និង class_uuid។', 'CSV must include student_uuid and class_uuid columns.'));
      const candidateIds = new Set((workspace?.candidates || []).map((item) => item.id));
      const classIds = new Set((workspace?.classes || []).map((item) => item.id));
      const assignments = lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        return { studentId: String(cells[studentIndex] || '').trim(), classId: String(cells[classIndex] || '').trim(), pinned: pinnedIndex >= 0 && String(cells[pinnedIndex]).trim().toLowerCase() === 'true' };
      });
      if (new Set(assignments.map((item) => item.studentId)).size !== assignments.length) throw new Error(tx('CSV មានសិស្សស្ទួន។', 'CSV contains duplicate students.'));
      if (assignments.some((item) => !candidateIds.has(item.studentId) || !classIds.has(item.classId))) throw new Error(tx('CSV មានសិស្ស ឬថ្នាក់ដែលមិនស្ថិតក្នុងឆ្នាំ/កម្រិតនេះ។', 'CSV contains a student or class outside this academic year and grade.'));
      if (assignments.length !== candidateIds.size) throw new Error(tx(`CSV ត្រូវមានសិស្សរង់ចាំទាំងអស់ ${candidateIds.size} នាក់។`, `CSV must contain all ${candidateIds.size} pending students.`));
      const importedCounts = new Map<string, number>();
      assignments.forEach((item) => importedCounts.set(item.classId, (importedCounts.get(item.classId) || 0) + 1));
      const overCapacity = (workspace?.classes || []).find((item) => item.capacity != null && item.currentCount + (importedCounts.get(item.id) || 0) > item.capacity);
      if (overCapacity) throw new Error(tx(`${overCapacity.name} លើសចំណុះ ${overCapacity.capacity} នាក់។`, `${overCapacity.name} exceeds its capacity of ${overCapacity.capacity}.`));
      setPreview({ ...workspace!, strategy, seed, assignments, unassignedStudentIds: [], classSummaries: [] });
      setPinned(new Map(assignments.filter((item) => item.pinned).map((item) => [item.studentId, item.classId])));
      setActiveBatch(null);
      setMessage({ tone: 'success', text: tx(`បាន validate និង import assignment ${assignments.length} នាក់។ សូម Preview/Save មុន Apply។`, `Validated and imported ${assignments.length} assignments. Review and save before apply.`) });
    } catch (error: any) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  if (!user || !school) return null;

  return (
    <>
      <UnifiedNavigation user={user} school={school} />
      <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-gray-950 lg:ml-64 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-900 to-cyan-800 p-6 text-white shadow-xl sm:p-8">
            <button onClick={() => router.push(`/${locale}/classes`)} className="inline-flex items-center gap-2 text-sm font-bold text-blue-100 hover:text-white"><ArrowLeft className="h-4 w-4" />{tx('ត្រឡប់ទៅថ្នាក់រៀន', 'Back to classes')}</button>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Grade-wide placement</p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">{tx('បែងចែកសិស្សទៅថ្នាក់ឆ្នាំថ្មី', 'New-year class allocation')}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">{tx('ជ្រើសសិស្សសំខាន់ៗដាក់ថ្នាក់ជាក់លាក់ រួចចែកសិស្សដែលនៅសល់ដោយ random ឬតុល្យភាពពិន្ទុ។ ប្រព័ន្ធមិនសរសេរទិន្នន័យរហូតដល់អ្នកចុច Apply។', 'Pin selected students to specific sections, then distribute the rest randomly or by academic balance. Nothing is written until Apply.')}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15"><p className="text-xs text-blue-100">{tx('ឆ្នាំសិក្សា', 'Academic year')}</p><p className="mt-1 text-xl font-black">{selectedYear?.name || '—'}</p></div>
            </div>
          </div>

          {message && <div className={`mt-5 flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold ${message.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.tone === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}<span>{message.text}</span></div>}
          {isHistoricalYear && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900"><LockKeyhole className="h-5 w-5 shrink-0" /><span>{tx('ឆ្នាំសិក្សាប្រវត្តិសាស្ត្រអាចមើលបានប៉ុណ្ណោះ។ ការបង្កើតថ្នាក់ និង Apply enrollment ត្រូវបានបិទ។', 'Historical academic years are read-only. Class generation and enrollment apply are disabled.')}</span></div>}

          {batches.length > 0 && <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="flex items-center justify-between"><div><h2 className="font-black">{tx('ប្រវត្តិ Placement Batch', 'Placement batch history')}</h2><p className="mt-1 text-xs text-slate-500">{tx('Draft នីមួយៗមាន version និងត្រូវឆ្លងការអនុម័តមុន Apply។', 'Every draft is versioned and must be approved before apply.')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{batches.length}</span></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{batches.map((batch) => { const canLoad = ['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(batch.status) && Boolean(batch.latestVersion); return <div key={batch.id} className={`rounded-xl border p-4 ${activeBatch?.id === batch.id ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-gray-700'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">Grade {batch.grade} · v{batch.currentVersion}</p><p className="mt-1 text-[11px] text-slate-500">{new Date(batch.updatedAt).toLocaleString()}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${batch.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-700' : batch.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : batch.status === 'IN_REVIEW' ? 'bg-amber-100 text-amber-800' : batch.status === 'REVERSED' ? 'bg-slate-200 text-slate-700' : 'bg-indigo-100 text-indigo-700'}`}>{batch.status}</span></div><div className="mt-3 flex flex-wrap gap-2">{canLoad && <button onClick={() => loadSavedBatch(batch)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold">{tx('បើក', 'Load')}</button>}{batch.status === 'DRAFT' && <button onClick={() => handleBatchAction(batch, 'submit')} disabled={saving || isHistoricalYear} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" />{tx('បញ្ជូនពិនិត្យ', 'Submit')}</button>}{batch.status === 'IN_REVIEW' && <button onClick={() => handleBatchAction(batch, 'approve')} disabled={saving || isHistoricalYear} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"><ShieldCheck className="h-3.5 w-3.5" />{tx('អនុម័ត', 'Approve')}</button>}{batch.status === 'APPROVED' && <button onClick={() => handleBatchAction(batch, 'apply')} disabled={saving || isHistoricalYear} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"><UserRoundCheck className="h-3.5 w-3.5" />Apply</button>}{batch.status === 'APPLIED' && <button onClick={() => handleBatchAction(batch, 'undo')} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 disabled:opacity-40"><Undo2 className="h-3.5 w-3.5" />{tx('Undo ដោយសុវត្ថិភាព', 'Safe undo')}</button>}</div></div>; })}</div></section>}

          <section className="mt-5 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="font-black text-slate-900 dark:text-white">1. {tx('កំណត់រចនាសម្ព័ន្ធ', 'Class structure')}</h2>
                <label className="mt-4 block text-xs font-bold text-slate-500">Grade</label>
                <select value={grade} onChange={(event) => setGrade(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950">{GRADES.map((item) => <option key={item}>{item}</option>)}</select>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-slate-500">{tx('ចំនួនថ្នាក់', 'Sections')}<input type="number" min={1} max={52} value={classCount} onChange={(event) => setClassCount(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-950" /></label>
                  <label className="text-xs font-bold text-slate-500">{tx('សិស្ស/ថ្នាក់', 'Capacity')}<input type="number" min={1} max={200} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-950" /></label>
                </div>
                <button onClick={generateClasses} disabled={saving || !selectedYear || isHistoricalYear} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Layers3 className="h-4 w-4" />{tx('បង្កើត/បំពេញ A, B, C...', 'Create/fill A, B, C...')}</button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="font-black text-slate-900 dark:text-white">2. {tx('របៀបចែក', 'Allocation mode')}</h2>
                {[{ value: 'RANDOM_BALANCED', icon: Dice5, label: tx('Random និងចំនួនស្មើគ្នា', 'Random, equal class sizes') }, { value: 'ACADEMIC_BALANCED', icon: Trophy, label: tx('ចែកតុល្យភាពតាមពិន្ទុ', 'Balance academic performance') }, { value: 'MULTI_FACTOR_BALANCED', icon: Users, label: tx('តុល្យភាពពិន្ទុ និងភេទ', 'Balance performance and gender') }].map((option) => <button key={option.value} onClick={() => { setStrategy(option.value as PlacementStrategy); setPreview(null); }} className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-bold ${strategy === option.value ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200'}`}><option.icon className="h-5 w-5" />{option.label}{strategy === option.value && <Check className="ml-auto h-4 w-4" />}</button>)}
                <div className="mt-4 flex gap-2"><input value={seed} onChange={(event) => { setSeed(event.target.value); setPreview(null); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-950" /><button onClick={() => { setSeed(String(Date.now())); setPreview(null); }} className="rounded-xl border border-slate-200 p-2"><RefreshCw className="h-4 w-4" /></button></div>
              </div>

              <button onClick={runPreview} disabled={saving || !workspace?.candidates.length || !selectedClassIds.size} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 font-black text-white shadow-lg disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}{tx('បង្កើត Preview', 'Generate preview')}</button>
            </aside>

            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {[{ label: tx('រង់ចាំបែងចែក', 'Pending placement'), value: workspace?.candidates.length || 0, icon: Users }, { label: tx('ថ្នាក់គោលដៅ', 'Target classes'), value: workspace?.classes.length || 0, icon: Layers3 }, { label: tx('បាន Pin', 'Pinned students'), value: pinned.size, icon: LockKeyhole }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="flex items-center justify-between"><item.icon className="h-5 w-5 text-indigo-600" /><span className="text-2xl font-black">{item.value}</span></div><p className="mt-2 text-xs font-bold text-slate-500">{item.label}</p></div>)}
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-slate-200 p-5 dark:border-gray-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-black text-slate-900 dark:text-white">3. {tx('ជ្រើស និង Pin សិស្ស', 'Select and pin students')}</h2><p className="mt-1 text-xs text-slate-500">{tx('តារាងតម្រៀបតាមចំណាត់ថ្នាក់ពីល្អទៅទាប។', 'Candidates are ranked from highest to lowest academic average.')}</p></div><div className="flex flex-wrap gap-2"><input type="number" min={1} value={topCount} onChange={(event) => setTopCount(Number(event.target.value))} className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" /><button onClick={selectTopRanked} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">{tx('ជ្រើស Top Rank', 'Select top ranks')}</button><select value={pinTargetClassId} onChange={(event) => setPinTargetClassId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-950">{workspace?.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button onClick={pinSelected} disabled={!selectedStudentIds.size || !pinTargetClassId} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40">{tx('Pin ទៅថ្នាក់', 'Pin to class')}</button></div></div>
                  <div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx('ស្វែងរកសិស្ស...', 'Search students...')} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-950" /></div>
                </div>
                <div className="max-h-[430px] overflow-auto">
                  {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" /></div> : filteredCandidates.map((student) => {
                    const selected = selectedStudentIds.has(student.id);
                    const pinnedClassId = pinned.get(student.id);
                    return <button key={student.id} onClick={() => setSelectedStudentIds((previous) => { const next = new Set(previous); if (next.has(student.id)) next.delete(student.id); else next.add(student.id); return next; })} className={`grid w-full grid-cols-[38px_55px_minmax(180px,1fr)_90px_90px_110px] items-center gap-3 border-b border-slate-100 px-5 py-3 text-left text-sm hover:bg-slate-50 dark:border-gray-800 dark:hover:bg-gray-800 ${selected ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}><span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>{selected && <Check className="h-3.5 w-3.5" />}</span><span className="font-black text-amber-600">#{student.academicRank}</span><span className="min-w-0"><span className="block truncate font-bold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</span><span className="block truncate text-xs text-slate-500">{student.studentId} · {student.previousClass.name}</span></span><span>{student.gender === 'FEMALE' ? tx('ស្រី', 'Female') : tx('ប្រុស', 'Male')}</span><span className="font-bold">{student.academicAverage == null ? '—' : student.academicAverage.toFixed(2)}</span><span className="truncate text-xs font-bold text-indigo-700">{pinnedClassId ? workspace?.classes.find((item) => item.id === pinnedClassId)?.name : '—'}</span></button>;
                  })}
                </div>
              </section>

              {preview && <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="font-black text-slate-900 dark:text-white">4. {tx('Preview និងកែចុងក្រោយ', 'Preview and fine-tune')} {activeBatch && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-1 text-[10px] text-indigo-700">v{activeBatch.currentVersion} · {activeBatch.status}</span>}</h2><p className="mt-1 text-xs text-slate-500">{tx('អូសសិស្សរវាងថ្នាក់ រួច Save Draft។ Apply អាចធ្វើបានតែបន្ទាប់ពី Admin ផ្សេងអនុម័ត។', 'Drag students between classes, then save a draft. Apply is available only after approval by another administrator.')}</p></div><div className="flex flex-wrap gap-2"><button onClick={exportPlacementCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black"><Download className="h-4 w-4" />CSV</button><button onClick={() => importInputRef.current?.click()} disabled={isHistoricalYear} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black disabled:opacity-40"><Upload className="h-4 w-4" />CSV</button><input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPlacementCsv(file); }} /><button onClick={saveDraft} disabled={saving || isHistoricalYear || preview.unassignedStudentIds.length > 0 || Boolean(activeBatch && activeBatch.status !== 'DRAFT')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{activeBatch?.status === 'DRAFT' ? tx('រក្សា Version ថ្មី', 'Save new version') : tx('រក្សា Draft', 'Save draft')}</button></div></div><div className="mt-5 grid gap-4 xl:grid-cols-2">{previewGroups.map((group) => <div key={group.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedStudentId) movePreviewStudent(draggedStudentId, group.id); setDraggedStudentId(null); }} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900"><div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><div><p className="font-black">{group.name}</p><p className="text-xs text-slate-300">{group.projectedCount}/{group.capacity || '∞'} · {tx('ស្រី', 'F')} {group.femaleCount} · Avg {group.averageScore ?? '—'}</p></div><button onClick={() => router.push(`/${locale}/classes/${group.id}/manage`)} className="text-xs font-bold text-cyan-300">Manage</button></div><div className="max-h-72 overflow-auto">{group.students.map(({ studentId, student, pinned: isPinned }) => <div key={studentId} draggable onDragStart={() => setDraggedStudentId(studentId)} onDragEnd={() => setDraggedStudentId(null)} className="flex cursor-grab items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm active:cursor-grabbing dark:border-gray-800"><GripVertical className="h-4 w-4 text-slate-400" /><span className="w-8 font-black text-amber-600">#{student.academicRank}</span><span className="min-w-0 flex-1 truncate font-bold">{student.firstName} {student.lastName}</span><span className="text-xs text-slate-500">{student.academicAverage ?? '—'}</span>{isPinned && <LockKeyhole className="h-3.5 w-3.5 text-indigo-600" />}</div>)}</div></div>)}</div></section>}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
