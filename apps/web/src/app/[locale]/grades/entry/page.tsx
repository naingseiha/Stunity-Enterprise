'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Home,
  Info,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Table2,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { gradeAPI, type ClassMonthGradeGrid, type GradeBatchInput } from '@/lib/api/grades';
import { TokenManager } from '@/lib/api/auth';
import { getAvailableMonthsForGrade, getKhmerMonthDisplayName } from '@/lib/reports/khmerMonthly';
import { sortSubjectsByOrder } from '@/lib/reports/templates/khm-moeys/subjects';
import {
  gradeCellKey,
  parseScoreValue,
  parseTabularClipboard,
  resolveAcademicCalendarYear,
} from '@/lib/grades/grade-ledger-grid';

type LedgerCell = {
  studentId: string;
  subjectId: string;
  input: string;
  score: number | null;
  originalScore: number | null;
  remarks: string;
  dirty: boolean;
  error: string | null;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function csvValue(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export default function GradeEntryPage() {
  const router = useRouter();
  const locale = useLocale();
  const { selectedYear, terms } = useAcademicYear();
  const selectedAcademicYearId = selectedYear?.id || '';
  const canWriteOperationalData = Boolean(
    selectedYear?.isCurrent && selectedYear.status === 'ACTIVE',
  );
  const [user, setUser] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('classId') || '';
  });
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [grid, setGrid] = useState<ClassMonthGradeGrid | null>(null);
  const [cells, setCells] = useState<Map<string, LedgerCell>>(new Map());
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    setUser(userData?.user || userData || null);
  }, [locale, router]);

  const { classes } = useClasses({
    academicYearId: selectedAcademicYearId || undefined,
    limit: 100,
  });
  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const academicTerms = useMemo(
    () => (terms.length ? terms : selectedYear?.terms || []),
    [selectedYear?.terms, terms],
  );
  const availableMonths = useMemo(
    () => getAvailableMonthsForGrade(academicTerms, selectedClass?.grade || ''),
    [academicTerms, selectedClass?.grade],
  );

  useEffect(() => {
    if (selectedClassId && !classes.some((item) => item.id === selectedClassId)) {
      setSelectedClassId('');
      setGrid(null);
      setCells(new Map());
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (availableMonths.length && !availableMonths.some((item) => item.number === selectedMonth)) {
      setSelectedMonth(availableMonths[0].number);
    }
  }, [availableMonths, selectedMonth]);

  const monthOption = availableMonths.find((item) => item.number === selectedMonth);
  const monthLabel = monthOption
    ? getKhmerMonthDisplayName(
        monthOption.number,
        monthOption.label,
        monthOption.isExamMonth,
        monthOption.termNumber,
      )
    : `Month ${selectedMonth}`;
  const calendarYear = resolveAcademicCalendarYear(
    selectedYear?.startDate,
    selectedYear?.endDate,
    selectedMonth,
  );
  const isSelectionReady = Boolean(
    selectedAcademicYearId && selectedClassId && availableMonths.length,
  );

  const dirtyCells = useMemo(
    () => Array.from(cells.values()).filter((cell) => cell.dirty),
    [cells],
  );
  const invalidCells = useMemo(
    () => dirtyCells.filter((cell) => Boolean(cell.error)),
    [dirtyCells],
  );
  const scoredCells = useMemo(
    () => Array.from(cells.values()).filter((cell) => cell.score !== null && !cell.error).length,
    [cells],
  );
  const totalCells = (grid?.students.length || 0) * (grid?.subjects.length || 0);

  const filteredStudents = useMemo(() => {
    if (!grid) return [];
    const query = studentSearch.trim().toLocaleLowerCase();
    if (!query) return grid.students;
    return grid.students.filter((student) =>
      [student.studentId, student.firstName, student.lastName, student.khmerName]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [grid, studentSearch]);

  const confirmDiscard = useCallback(() => {
    if (!dirtyCells.length) return true;
    return window.confirm('មានការកែប្រែមិនទាន់រក្សាទុក។ តើអ្នកចង់បោះបង់ការកែប្រែទាំងនេះឬ?');
  }, [dirtyCells.length]);

  const clearLoadedGrid = useCallback(() => {
    setGrid(null);
    setCells(new Map());
    setStudentSearch('');
    setMessage(null);
  }, []);

  const loadGrid = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await gradeAPI.getClassMonthGradeGrid({
        classId: selectedClassId,
        month: monthLabel,
        monthNumber: selectedMonth,
        year: calendarYear,
      });
      data.subjects = sortSubjectsByOrder(data.subjects, data.class.grade);
      const gradesByCell = new Map(
        data.grades.map((grade) => [gradeCellKey(grade.studentId, grade.subjectId), grade]),
      );
      const nextCells = new Map<string, LedgerCell>();
      data.students.forEach((student) => {
        data.subjects.forEach((subject) => {
          const key = gradeCellKey(student.id, subject.id);
          const grade = gradesByCell.get(key);
          const score = grade?.score ?? null;
          nextCells.set(key, {
            studentId: student.id,
            subjectId: subject.id,
            input: score === null ? '' : String(score),
            score,
            originalScore: score,
            remarks: grade?.remarks || '',
            dirty: false,
            error: null,
          });
        });
      });
      setGrid(data);
      setCells(nextCells);
      setSaveStatus('idle');
      setMessage({
        tone: 'success',
        text: `បានផ្ទុកសិស្ស ${data.students.length} នាក់ និងមុខវិជ្ជា ${data.subjects.length} មុខ សម្រាប់ ${data.month.label} ${data.month.year}`,
      });
    } catch (error: any) {
      setMessage({ tone: 'error', text: error?.message || 'មិនអាចផ្ទុកសៀវភៅពិន្ទុបានទេ' });
    } finally {
      setLoading(false);
    }
  }, [calendarYear, monthLabel, selectedClassId, selectedMonth]);

  const updateCell = useCallback(
    (studentId: string, subjectId: string, value: string) => {
      if (!grid) return;
      const subject = grid.subjects.find((item) => item.id === subjectId);
      if (!subject) return;
      const parsed = parseScoreValue(value, subject.maxScore);
      const key = gradeCellKey(studentId, subjectId);
      setCells((current) => {
        const existing = current.get(key);
        if (!existing) return current;
        const next = new Map(current);
        next.set(key, {
          ...existing,
          input: value,
          score: parsed.score,
          error: parsed.error,
          dirty: parsed.error ? true : parsed.score !== existing.originalScore,
        });
        return next;
      });
      setSaveStatus('idle');
    },
    [grid],
  );

  const focusCell = useCallback((studentIndex: number, subjectIndex: number) => {
    const student = filteredStudents[studentIndex];
    const subject = grid?.subjects[subjectIndex];
    if (!student || !subject) return;
    const key = gradeCellKey(student.id, subject.id);
    const input = inputRefs.current.get(key);
    input?.focus();
    input?.select();
  }, [filteredStudents, grid?.subjects]);

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    subjectIndex: number,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      document.getElementById('save-grade-grid')?.click();
      return;
    }

    let row = studentIndex;
    let column = subjectIndex;
    if (event.key === 'Enter') row += event.shiftKey ? -1 : 1;
    else if (event.key === 'ArrowDown') row += 1;
    else if (event.key === 'ArrowUp') row -= 1;
    else if (event.key === 'Tab') {
      event.preventDefault();
      column += event.shiftKey ? -1 : 1;
      if (column >= (grid?.subjects.length || 0)) {
        column = 0;
        row += 1;
      } else if (column < 0) {
        column = (grid?.subjects.length || 1) - 1;
        row -= 1;
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      const student = filteredStudents[studentIndex];
      const subject = grid?.subjects[subjectIndex];
      if (student && subject) {
        const cell = cells.get(gradeCellKey(student.id, subject.id));
        updateCell(student.id, subject.id, cell?.originalScore == null ? '' : String(cell.originalScore));
      }
      (event.currentTarget as HTMLInputElement).blur();
      return;
    } else return;

    event.preventDefault();
    focusCell(row, column);
  }, [cells, filteredStudents, focusCell, grid?.subjects, updateCell]);

  const handlePaste = useCallback((
    event: React.ClipboardEvent<HTMLInputElement>,
    startStudentIndex: number,
    startSubjectIndex: number,
  ) => {
    const matrix = parseTabularClipboard(event.clipboardData.getData('text'));
    if (!matrix.length || (matrix.length === 1 && matrix[0].length === 1)) return;
    event.preventDefault();
    matrix.forEach((row, rowOffset) => {
      row.forEach((value, columnOffset) => {
        const student = filteredStudents[startStudentIndex + rowOffset];
        const subject = grid?.subjects[startSubjectIndex + columnOffset];
        if (student && subject) updateCell(student.id, subject.id, value.trim());
      });
    });
    setMessage({ tone: 'info', text: `បានបិទភ្ជាប់ទិន្នន័យ ${matrix.length} ជួរដេកពី Excel` });
  }, [filteredStudents, grid?.subjects, updateCell]);

  const saveChanges = useCallback(async () => {
    if (!canWriteOperationalData || !grid || !dirtyCells.length || invalidCells.length) return;
    setSaveStatus('saving');
    setMessage(null);
    const subjectById = new Map(grid.subjects.map((subject) => [subject.id, subject]));
    const payload: GradeBatchInput[] = dirtyCells.map((cell) => ({
      studentId: cell.studentId,
      subjectId: cell.subjectId,
      classId: grid.class.id,
      score: cell.score,
      maxScore: subjectById.get(cell.subjectId)?.maxScore || 100,
      month: grid.month.label,
      monthNumber: grid.month.monthNumber,
      year: grid.month.year,
      remarks: cell.remarks || undefined,
    }));

    try {
      const result = await gradeAPI.batchGrades(payload);
      if (result.errors?.length) {
        throw new Error(`${result.errors.length} ក្រឡាមិនអាចរក្សាទុកបាន`);
      }
      setSaveStatus('saved');
      setMessage({
        tone: 'success',
        text: `បានរក្សាទុក៖ បង្កើត ${result.created} · កែ ${result.updated} · លុប ${result.deleted || 0}`,
      });
      await loadGrid();
      window.setTimeout(() => setSaveStatus('idle'), 1800);
    } catch (error: any) {
      setSaveStatus('error');
      setMessage({ tone: 'error', text: error?.message || 'ការរក្សាទុកបានបរាជ័យ' });
    }
  }, [canWriteOperationalData, dirtyCells, grid, invalidCells.length, loadGrid]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyCells.length) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirtyCells.length]);

  const exportCsv = useCallback(() => {
    if (!grid) return;
    const header = ['ល.រ', 'អត្តលេខ', 'ឈ្មោះសិស្ស', ...grid.subjects.map((subject) => subject.nameKhShort || subject.nameKh || subject.name)];
    const rows = grid.students.map((student, index) => [
      index + 1,
      student.studentId || '',
      student.khmerName || `${student.lastName} ${student.firstName}`.trim(),
      ...grid.subjects.map((subject) => cells.get(gradeCellKey(student.id, subject.id))?.input || ''),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvValue).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${grid.class.name}-${grid.month.monthNumber}-${grid.month.year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [cells, grid]);

  const subjectCompletion = useMemo(() => {
    if (!grid) return new Map<string, number>();
    return new Map(grid.subjects.map((subject) => [
      subject.id,
      grid.students.filter((student) => {
        const cell = cells.get(gradeCellKey(student.id, subject.id));
        return cell?.score !== null && !cell?.error;
      }).length,
    ]));
  }, [cells, grid]);

  return (
    <>
      <UnifiedNavigation user={user} />
      <div className="min-h-screen bg-slate-50 text-slate-900 lg:ml-64">
        <main className="mx-auto max-w-[1900px] p-4 lg:p-7">
          <section className="mx-auto mb-6 max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="p-4 sm:p-5">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Home className="h-3.5 w-3.5" />
                  <span>ទំព័រដើម</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-600">បញ្ចូលពិន្ទុ</span>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-[1.7rem]">បញ្ចូលពិន្ទុគ្រប់មុខវិជ្ជា</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      កែពិន្ទុគ្រប់មុខវិជ្ជាក្នុងតារាងតែមួយ និងអាច Copy/Paste ពី Excel បានដោយផ្ទាល់។
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {selectedYear?.name || 'មិនទាន់កំណត់ឆ្នាំសិក្សា'}
                      </span>
                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {selectedClass?.name || 'មិនទាន់ជ្រើសរើសថ្នាក់'}
                      </span>
                      {isSelectionReady ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {monthLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:px-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_auto] xl:items-end">
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">ឆ្នាំសិក្សា</span>
                  <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700">{selectedYear?.name || 'មិនទាន់កំណត់ឆ្នាំសិក្សា'}</p>
                      <p className="text-[10px] font-medium text-slate-400">កំណត់ពី Academic Year ខាងលើ</p>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">ថ្នាក់</span>
                  <select
                    value={selectedClassId}
                    disabled={!selectedAcademicYearId}
                    onChange={(event) => {
                      if (!confirmDiscard()) return;
                      setSelectedClassId(event.target.value);
                      clearLoadedGrid();
                    }}
                    className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">ជ្រើសរើសថ្នាក់</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">ខែ / ប្រឡង</span>
                  <select
                    value={availableMonths.length ? selectedMonth : ''}
                    disabled={!selectedClassId || !availableMonths.length}
                    onChange={(event) => {
                      if (!confirmDiscard()) return;
                      setSelectedMonth(Number(event.target.value));
                      clearLoadedGrid();
                    }}
                    className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {!selectedClassId ? (
                      <option value="">សូមជ្រើសរើសថ្នាក់ជាមុន</option>
                    ) : !availableMonths.length ? (
                      <option value="">មិនទាន់មានខែក្នុង Academic Year Setting</option>
                    ) : null}
                    {availableMonths.map((month) => (
                      <option key={month.number} value={month.number}>
                        {getKhmerMonthDisplayName(month.number, month.label, month.isExamMonth, month.termNumber)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={loadGrid}
                  disabled={!isSelectionReady || loading}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {loading ? 'កំពុងផ្ទុក…' : 'Load ទិន្នន័យ'}
                </button>
              </div>

              {selectedClassId && !availableMonths.length ? (
                <p className="mt-2 text-xs font-medium text-amber-700">សូមពិនិត្យ Semester និង Grade level ក្នុង Academic Year Setting។</p>
              ) : null}
            </div>
          </section>

          {message ? (
            <div className={`mx-auto mt-4 max-w-7xl flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              message.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : message.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}>
              {message.tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : message.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          ) : null}

          <section className={`mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white ${grid ? '' : 'mx-auto max-w-7xl'}`}>
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Table2 className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-slate-900">
                    {grid ? `${grid.class.name} · ${grid.month.label} ${grid.month.year}` : 'Excel-style grade ledger'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {grid ? `${scoredCells}/${totalCells} ក្រឡាមានពិន្ទុ · ${dirtyCells.length} ក្រឡាបានកែ` : 'សូមជ្រើសរើសថ្នាក់ និងខែ រួច Load ទិន្នន័យ'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[220px] flex-1 xl:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    disabled={!grid}
                    placeholder="ស្វែងរកសិស្ស…"
                    className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </label>
                <button type="button" onClick={exportCsv} disabled={!grid} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                  <Download className="h-4 w-4" /> Export
                </button>
                <button
                  id="save-grade-grid"
                  type="button"
                  onClick={saveChanges}
                  disabled={!canWriteOperationalData || !dirtyCells.length || Boolean(invalidCells.length) || saveStatus === 'saving'}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saveStatus === 'saving' ? 'កំពុងរក្សាទុក…' : `រក្សាទុក${dirtyCells.length ? ` (${dirtyCells.length})` : ''}`}
                </button>
              </div>
            </div>

            {invalidCells.length ? (
              <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4" /> មាន {invalidCells.length} ក្រឡាមិនត្រឹមត្រូវ។ សូមកែពិន្ទុមុនរក្សាទុក។
              </div>
            ) : null}

            {grid ? (
              <div className="max-h-[calc(100vh-315px)] min-h-[420px] overflow-auto">
                <table className="min-w-max border-separate border-spacing-0 text-xs">
                  <thead className="sticky top-0 z-30">
                    <tr>
                      <th className="sticky left-0 z-50 w-12 border-b border-r border-slate-300 bg-slate-100 px-2 py-3 text-center font-bold text-slate-600">ល.រ</th>
                      <th className="sticky left-12 z-50 w-[250px] min-w-[250px] border-b border-r border-slate-300 bg-slate-100 px-3 py-3 text-left font-bold text-slate-700">សិស្ស</th>
                      <th className="sticky left-[298px] z-50 w-[105px] min-w-[105px] border-b border-r border-slate-300 bg-slate-100 px-3 py-3 text-left font-bold text-slate-700 shadow-[5px_0_8px_-7px_rgba(15,23,42,0.55)]">អត្តលេខ</th>
                      {grid.subjects.map((subject) => (
                        <th key={subject.id} className="w-[108px] min-w-[108px] border-b border-r border-slate-300 bg-slate-100 px-2 py-2 text-center align-bottom">
                          <div className="line-clamp-2 min-h-8 font-bold leading-4 text-slate-800" title={subject.nameKh || subject.name}>
                            {subject.nameKhShort || subject.nameKh || subject.name}
                          </div>
                          <div className="mt-1 text-[10px] font-medium text-slate-500">អតិបរមា {subject.maxScore}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, studentIndex) => {
                      const rowBackground = studentIndex % 2 ? 'bg-slate-50' : 'bg-white';
                      return (
                        <tr key={student.id} className="group">
                          <td className={`sticky left-0 z-20 border-b border-r border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-500 group-hover:bg-blue-50 ${rowBackground}`}>{studentIndex + 1}</td>
                          <td className={`sticky left-12 z-20 border-b border-r border-slate-200 px-3 py-1.5 group-hover:bg-blue-50 ${rowBackground}`}>
                            <div className="truncate font-semibold text-slate-900">{student.khmerName || `${student.lastName} ${student.firstName}`.trim()}</div>
                            {student.khmerName ? <div className="truncate text-[10px] text-slate-500">{student.firstName} {student.lastName}</div> : null}
                          </td>
                          <td className={`sticky left-[298px] z-20 border-b border-r border-slate-200 px-3 py-1.5 font-mono text-[11px] text-slate-500 shadow-[5px_0_8px_-7px_rgba(15,23,42,0.45)] group-hover:bg-blue-50 ${rowBackground}`}>{student.studentId || '—'}</td>
                          {grid.subjects.map((subject, subjectIndex) => {
                            const key = gradeCellKey(student.id, subject.id);
                            const cell = cells.get(key);
                            return (
                              <td key={subject.id} className={`border-b border-r border-slate-200 p-1 ${rowBackground}`}>
                                <input
                                  ref={(element) => {
                                    if (element) inputRefs.current.set(key, element);
                                    else inputRefs.current.delete(key);
                                  }}
                                  type="text"
                                  disabled={!canWriteOperationalData}
                                  inputMode="decimal"
                                  value={cell?.input || ''}
                                  onChange={(event) => updateCell(student.id, subject.id, event.target.value)}
                                  onKeyDown={(event) => handleKeyDown(event, studentIndex, subjectIndex)}
                                  onPaste={(event) => handlePaste(event, studentIndex, subjectIndex)}
                                  aria-label={`${student.khmerName || student.firstName} · ${subject.nameKh || subject.name}`}
                                  title={cell?.error || `${subject.nameKh || subject.name} · 0–${subject.maxScore}`}
                                  className={`h-9 w-full rounded-md border px-2 text-center text-sm font-semibold outline-none transition focus:relative focus:z-10 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
                                    cell?.error
                                      ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200'
                                      : cell?.dirty
                                        ? 'border-blue-400 bg-blue-50 text-blue-800 focus:ring-blue-200'
                                        : cell?.score !== null
                                          ? 'border-transparent bg-transparent text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-blue-100'
                                          : 'border-transparent bg-transparent text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-blue-100'
                                  }`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-30">
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-t border-slate-300 bg-slate-100" />
                      <td className="sticky left-12 z-40 border-r border-t border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-700">បានបញ្ចូល</td>
                      <td className="sticky left-[298px] z-40 border-r border-t border-slate-300 bg-slate-100 px-3 py-2 text-[10px] text-slate-500 shadow-[5px_0_8px_-7px_rgba(15,23,42,0.45)]">ក្នុងមួយមុខវិជ្ជា</td>
                      {grid.subjects.map((subject) => (
                        <td key={subject.id} className="border-r border-t border-slate-300 bg-slate-100 px-2 py-2 text-center font-bold text-slate-700">
                          {subjectCompletion.get(subject.id) || 0}/{grid.students.length}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : loading ? (
              <div className="flex min-h-[320px] items-center justify-center gap-3 text-sm font-medium text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> កំពុងរៀបចំតារាងពិន្ទុ…
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <div className="rounded-2xl bg-blue-50 p-4 text-blue-700"><ClipboardPaste className="h-8 w-8" /></div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Load តារាងពិន្ទុរបស់ថ្នាក់</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">ប្រព័ន្ធនឹងទាញយកសិស្ស មុខវិជ្ជាទាំងអស់ និងពិន្ទុដែលបានបញ្ចូលរួចសម្រាប់ខែដែលបានជ្រើសរើសមកបង្ហាញក្នុង Grid តែមួយ។</p>
              </div>
            )}
          </section>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[11px] text-slate-500">
            <span><kbd className="rounded border bg-white px-1.5 py-0.5 font-semibold">Tab</kbd> ទៅក្រឡាបន្ទាប់</span>
            <span><kbd className="rounded border bg-white px-1.5 py-0.5 font-semibold">Enter</kbd> ទៅសិស្សបន្ទាប់</span>
            <span><kbd className="rounded border bg-white px-1.5 py-0.5 font-semibold">Esc</kbd> ត្រឡប់តម្លៃដើម</span>
            <span><kbd className="rounded border bg-white px-1.5 py-0.5 font-semibold">⌘/Ctrl + S</kbd> រក្សាទុក</span>
            <span>Paste តារាងច្រើនក្រឡាពី Excel បានដោយផ្ទាល់</span>
          </div>
        </main>
      </div>
    </>
  );
}
