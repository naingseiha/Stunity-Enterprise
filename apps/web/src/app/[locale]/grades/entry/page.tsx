'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
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
  X,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { gradeAPI, type ClassMonthGradeGrid, type GradeBatchInput } from '@/lib/api/grades';
import { TokenManager } from '@/lib/api/auth';
import { BEFORE_ACADEMIC_YEAR_CHANGE_EVENT } from '@/lib/academic-year-scope';
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

type CellUpdate = {
  studentId: string;
  subjectId: string;
  value: string;
};

type PendingAction = {
  label: string;
  run: () => void;
  navigation?: boolean;
};

type StoredGradeDraft = {
  version: 1;
  updatedAt: number;
  cells: Array<{ key: string; input: string }>;
};

function gradeDraftKey(grid: ClassMonthGradeGrid) {
  return `grade-entry-draft:${grid.class.id}:${grid.month.monthNumber}:${grid.month.year}`;
}

function removeStoredDraft(grid: ClassMonthGradeGrid | null) {
  if (!grid || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(gradeDraftKey(grid));
  } catch {
    // Draft recovery is best-effort; saving to the server must still succeed
    // when storage is disabled by browser privacy settings.
  }
}

type GradeScoreInputProps = {
  cell: LedgerCell | undefined;
  studentId: string;
  subjectId: string;
  studentIndex: number;
  subjectIndex: number;
  label: string;
  maxScore: number;
  disabled: boolean;
  readOnly: boolean;
  registerInput: (key: string, element: HTMLInputElement | null) => void;
  onUpdate: (studentId: string, subjectId: string, value: string) => void;
  onMove: (studentIndex: number, subjectIndex: number) => void;
  onPasteMatrix: (
    event: React.ClipboardEvent<HTMLInputElement>,
    studentIndex: number,
    subjectIndex: number,
  ) => void;
};

const GradeScoreInput = memo(function GradeScoreInput({
  cell,
  studentId,
  subjectId,
  studentIndex,
  subjectIndex,
  label,
  maxScore,
  disabled,
  readOnly,
  registerInput,
  onUpdate,
  onMove,
  onPasteMatrix,
}: GradeScoreInputProps) {
  const key = gradeCellKey(studentId, subjectId);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
    else if (event.key === 'ArrowRight') column += 1;
    else if (event.key === 'ArrowLeft') column -= 1;
    else if (event.key === 'Tab') {
      column += event.shiftKey ? -1 : 1;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onUpdate(studentId, subjectId, cell?.originalScore == null ? '' : String(cell.originalScore));
      event.currentTarget.blur();
      return;
    } else return;

    event.preventDefault();
    onMove(row, column);
  };

  return (
    <input
      ref={(element) => registerInput(key, element)}
      type="text"
      disabled={disabled}
      readOnly={readOnly}
      inputMode="decimal"
      value={cell?.input ?? ''}
      onChange={(event) => onUpdate(studentId, subjectId, event.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={(event) => onPasteMatrix(event, studentIndex, subjectIndex)}
      onFocus={(event) => event.currentTarget.select()}
      aria-label={label}
      aria-invalid={Boolean(cell?.error)}
      title={cell?.error || `${label} · 0–${maxScore}`}
      className={`h-9 w-full rounded-md border px-2 text-center text-sm font-semibold outline-none transition focus:relative focus:z-10 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 read-only:cursor-wait ${
        cell?.error
          ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200'
          : cell?.dirty
            ? 'border-blue-400 bg-blue-50 text-blue-800 focus:ring-blue-200'
            : cell?.score !== null
              ? 'border-transparent bg-transparent text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-blue-100'
              : 'border-transparent bg-transparent text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-blue-100'
      }`}
    />
  );
});

function csvValue(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export default function GradeEntryPage() {
  const router = useRouter();
  const locale = useLocale();
  const { selectedYear, terms, allYears, setSelectedYear } = useAcademicYear();
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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const allowNavigationRef = useRef(false);
  const dirtyCountRef = useRef(0);
  const loadRequestIdRef = useRef(0);
  const historyGuardRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const afterGuardRemovedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    setUser(userData?.user || userData || null);
  }, [locale, router]);

  const { classes, isLoading: classesLoading } = useClasses({
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
    if (selectedAcademicYearId && !classesLoading && selectedClassId && !classes.some((item) => item.id === selectedClassId)) {
      setSelectedClassId('');
      setGrid(null);
      setCells(new Map());
    }
  }, [classes, classesLoading, selectedAcademicYearId, selectedClassId]);

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
  dirtyCountRef.current = dirtyCells.length;

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

  const requestAction = useCallback((action: () => void, label: string, navigation = false) => {
    if (!dirtyCountRef.current) {
      action();
      return;
    }
    setPendingAction({ run: action, label, navigation });
  }, []);

  const leaveAfterRemovingHistoryGuard = useCallback((action: () => void) => {
    if (!historyGuardRef.current) {
      action();
      return;
    }
    historyGuardRef.current = false;
    ignoreNextPopRef.current = true;
    afterGuardRemovedRef.current = action;
    window.history.back();
  }, []);

  const clearLoadedGrid = useCallback(() => {
    loadRequestIdRef.current += 1;
    removeStoredDraft(grid);
    setGrid(null);
    setCells(new Map());
    setStudentSearch('');
    setMessage(null);
  }, [grid]);

  const loadGrid = useCallback(async () => {
    if (!selectedClassId) return;
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setMessage(null);
    try {
      const data = await gradeAPI.getClassMonthGradeGrid({
        classId: selectedClassId,
        month: monthLabel,
        monthNumber: selectedMonth,
        year: calendarYear,
      });
      if (requestId !== loadRequestIdRef.current) return;
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

      let restoredCount = 0;
      try {
        const rawDraft = window.sessionStorage.getItem(gradeDraftKey(data));
        const draft = rawDraft ? JSON.parse(rawDraft) as StoredGradeDraft : null;
        if (draft?.version === 1 && Array.isArray(draft.cells)) {
          const subjectsById = new Map(data.subjects.map((subject) => [subject.id, subject]));
          draft.cells.forEach(({ key, input }) => {
            const existing = nextCells.get(key);
            const subject = existing ? subjectsById.get(existing.subjectId) : undefined;
            if (!existing || !subject || typeof input !== 'string') return;
            const parsed = parseScoreValue(input, subject.maxScore);
            const dirty = Boolean(parsed.error) || parsed.score !== existing.originalScore;
            nextCells.set(key, {
              ...existing,
              input,
              score: parsed.score,
              error: parsed.error,
              dirty,
            });
            if (dirty) restoredCount += 1;
          });
        }
      } catch {
        removeStoredDraft(data);
      }
      setGrid(data);
      setCells(nextCells);
      setSaveStatus('idle');
      setMessage({
        tone: restoredCount ? 'info' : 'success',
        text: restoredCount
          ? `បានស្តារ ${restoredCount} ក្រឡាដែលមិនទាន់រក្សាទុកពីមុន។ សូមពិនិត្យ ហើយចុចរក្សាទុក។`
          : `បានផ្ទុកសិស្ស ${data.students.length} នាក់ និងមុខវិជ្ជា ${data.subjects.length} មុខ សម្រាប់ ${data.month.label} ${data.month.year}`,
      });
    } catch (error: any) {
      if (requestId !== loadRequestIdRef.current) return;
      setMessage({ tone: 'error', text: error?.message || 'មិនអាចផ្ទុកសៀវភៅពិន្ទុបានទេ' });
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, [calendarYear, monthLabel, selectedClassId, selectedMonth]);

  const subjectById = useMemo(
    () => new Map((grid?.subjects || []).map((subject) => [subject.id, subject])),
    [grid?.subjects],
  );

  const applyCellUpdates = useCallback((updates: CellUpdate[]) => {
    if (!updates.length) return;
    setCells((current) => {
      let next: Map<string, LedgerCell> | null = null;
      updates.forEach(({ studentId, subjectId, value }) => {
        const subject = subjectById.get(subjectId);
        if (!subject) return;
        const key = gradeCellKey(studentId, subjectId);
        const existing = (next || current).get(key);
        if (!existing || existing.input === value) return;
        const parsed = parseScoreValue(value, subject.maxScore);
        if (!next) next = new Map(current);
        next.set(key, {
          ...existing,
          input: value,
          score: parsed.score,
          error: parsed.error,
          dirty: Boolean(parsed.error) || parsed.score !== existing.originalScore,
        });
      });
      return next || current;
    });
    setSaveStatus('idle');
  }, [subjectById]);

  const updateCell = useCallback((studentId: string, subjectId: string, value: string) => {
    applyCellUpdates([{ studentId, subjectId, value }]);
  }, [applyCellUpdates]);

  const registerInput = useCallback((key: string, element: HTMLInputElement | null) => {
    if (element) inputRefs.current.set(key, element);
    else inputRefs.current.delete(key);
  }, []);

  const focusCell = useCallback((studentIndex: number, subjectIndex: number) => {
    const subjectCount = grid?.subjects.length || 0;
    if (!subjectCount) return;
    let nextRow = studentIndex;
    let nextColumn = subjectIndex;
    if (nextColumn >= subjectCount) {
      nextColumn = 0;
      nextRow += 1;
    } else if (nextColumn < 0) {
      nextColumn = subjectCount - 1;
      nextRow -= 1;
    }
    const student = filteredStudents[nextRow];
    const subject = grid?.subjects[nextColumn];
    if (!student || !subject) return;
    const input = inputRefs.current.get(gradeCellKey(student.id, subject.id));
    input?.focus();
    input?.select();
  }, [filteredStudents, grid?.subjects]);

  const handlePaste = useCallback((
    event: React.ClipboardEvent<HTMLInputElement>,
    startStudentIndex: number,
    startSubjectIndex: number,
  ) => {
    const matrix = parseTabularClipboard(event.clipboardData.getData('text'));
    if (!matrix.length || (matrix.length === 1 && matrix[0].length === 1)) return;
    event.preventDefault();
    const updates: CellUpdate[] = [];
    matrix.forEach((row, rowOffset) => {
      row.forEach((value, columnOffset) => {
        const student = filteredStudents[startStudentIndex + rowOffset];
        const subject = grid?.subjects[startSubjectIndex + columnOffset];
        if (student && subject) {
          updates.push({ studentId: student.id, subjectId: subject.id, value: value.trim() });
        }
      });
    });
    applyCellUpdates(updates);
    setMessage({ tone: 'info', text: `បានបិទភ្ជាប់ ${updates.length} ក្រឡាពី Excel ក្នុងពេលតែមួយ` });
  }, [applyCellUpdates, filteredStudents, grid?.subjects]);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!canWriteOperationalData || !grid || !dirtyCells.length || invalidCells.length) return false;
    setSaveStatus('saving');
    setMessage(null);
    const savingCells = [...dirtyCells];
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
      setCells((current) => {
        const next = new Map(current);
        savingCells.forEach((savedCell) => {
          const latest = next.get(gradeCellKey(savedCell.studentId, savedCell.subjectId));
          if (!latest) return;
          const unchangedWhileSaving = latest.input === savedCell.input;
          next.set(gradeCellKey(savedCell.studentId, savedCell.subjectId), {
            ...latest,
            originalScore: savedCell.score,
            dirty: unchangedWhileSaving
              ? false
              : Boolean(latest.error) || latest.score !== savedCell.score,
          });
        });
        return next;
      });
      removeStoredDraft(grid);
      return true;
    } catch (error: any) {
      setSaveStatus('error');
      setMessage({ tone: 'error', text: error?.message || 'ការរក្សាទុកបានបរាជ័យ' });
      return false;
    }
  }, [canWriteOperationalData, dirtyCells, grid, invalidCells.length, subjectById]);

  useEffect(() => {
    if (!grid) return;
    const timeout = window.setTimeout(() => {
      const draftCells = Array.from(cells.entries())
        .filter(([, cell]) => cell.dirty)
        .map(([key, cell]) => ({ key, input: cell.input }));
      if (!draftCells.length) {
        removeStoredDraft(grid);
        return;
      }
      const draft: StoredGradeDraft = {
        version: 1,
        updatedAt: Date.now(),
        cells: draftCells,
      };
      try {
        window.sessionStorage.setItem(gradeDraftKey(grid), JSON.stringify(draft));
      } catch {
        // The beforeunload guard remains active if session storage is unavailable.
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [cells, grid]);

  useEffect(() => {
    if (dirtyCells.length && !historyGuardRef.current) {
      window.history.pushState(
        { ...window.history.state, __gradeEntryUnsavedGuard: true },
        '',
        window.location.href,
      );
      historyGuardRef.current = true;
      return;
    }

    if (!dirtyCells.length && historyGuardRef.current && !allowNavigationRef.current) {
      historyGuardRef.current = false;
      ignoreNextPopRef.current = true;
      window.history.back();
    }
  }, [dirtyCells.length]);

  useEffect(() => {
    const handlePopState = () => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        const next = afterGuardRemovedRef.current;
        afterGuardRemovedRef.current = null;
        next?.();
        return;
      }
      if (!dirtyCountRef.current || !historyGuardRef.current || allowNavigationRef.current) return;

      // Browser history cannot be cancelled. Restore this same URL immediately,
      // then let the user explicitly save or discard before going back.
      window.history.pushState(
        { ...window.history.state, __gradeEntryUnsavedGuard: true },
        '',
        window.location.href,
      );
      requestAction(() => {
        allowNavigationRef.current = true;
        historyGuardRef.current = false;
        window.history.go(-2);
      }, 'ត្រឡប់ទៅទំព័រមុន', true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [requestAction]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyCountRef.current || allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  useEffect(() => {
    const interceptLink = (event: MouseEvent) => {
      if (!dirtyCountRef.current || allowNavigationRef.current || event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.download || target.target === '_blank') return;
      const url = new URL(target.href, window.location.href);
      if (url.href === window.location.href || (url.pathname === window.location.pathname && url.hash)) return;
      event.preventDefault();
      event.stopPropagation();
      requestAction(() => {
        allowNavigationRef.current = true;
        leaveAfterRemovingHistoryGuard(() => {
          if (url.origin === window.location.origin) {
            router.push(`${url.pathname}${url.search}${url.hash}`);
          } else {
            window.location.assign(url.href);
          }
        });
      }, `ចាកចេញទៅ ${target.textContent?.trim() || url.pathname}`, true);
    };

    document.addEventListener('click', interceptLink, true);
    return () => document.removeEventListener('click', interceptLink, true);
  }, [leaveAfterRemovingHistoryGuard, requestAction, router]);

  useEffect(() => {
    const interceptReloadShortcut = (event: KeyboardEvent) => {
      const isReload = event.key === 'F5'
        || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r');
      if (!isReload || !dirtyCountRef.current || allowNavigationRef.current) return;
      event.preventDefault();
      requestAction(() => {
        allowNavigationRef.current = true;
        leaveAfterRemovingHistoryGuard(() => window.location.reload());
      }, 'Reload ទំព័រនេះ', true);
    };
    window.addEventListener('keydown', interceptReloadShortcut, true);
    return () => window.removeEventListener('keydown', interceptReloadShortcut, true);
  }, [leaveAfterRemovingHistoryGuard, requestAction]);

  useEffect(() => {
    const guardAcademicYearChange = (event: Event) => {
      if (!dirtyCountRef.current || allowNavigationRef.current) return;
      const detail = (event as CustomEvent<{ toAcademicYearId?: string }>).detail;
      const nextYear = allYears.find((year) => year.id === detail?.toAcademicYearId);
      if (!nextYear) return;
      event.preventDefault();
      requestAction(() => {
        allowNavigationRef.current = true;
        setSelectedYear(nextYear);
        allowNavigationRef.current = false;
        setSelectedClassId('');
        clearLoadedGrid();
      }, `ប្តូរទៅឆ្នាំសិក្សា ${nextYear.name}`);
    };
    window.addEventListener(BEFORE_ACADEMIC_YEAR_CHANGE_EVENT, guardAcademicYearChange);
    return () => window.removeEventListener(BEFORE_ACADEMIC_YEAR_CHANGE_EVENT, guardAcademicYearChange);
  }, [allYears, clearLoadedGrid, requestAction, setSelectedYear]);

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

  const discardAndContinue = useCallback(() => {
    if (!pendingAction) return;
    const action = pendingAction.run;
    removeStoredDraft(grid);
    allowNavigationRef.current = Boolean(pendingAction.navigation);
    setPendingAction(null);
    action();
  }, [grid, pendingAction]);

  const saveAndContinue = useCallback(async () => {
    if (!pendingAction) return;
    if (pendingAction.navigation) allowNavigationRef.current = true;
    setModalSaving(true);
    const saved = await saveChanges();
    setModalSaving(false);
    if (!saved) {
      allowNavigationRef.current = false;
      return;
    }
    const action = pendingAction.run;
    allowNavigationRef.current = Boolean(pendingAction.navigation);
    setPendingAction(null);
    action();
  }, [pendingAction, saveChanges]);

  useEffect(() => {
    if (!pendingAction || modalSaving) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingAction(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modalSaving, pendingAction]);

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
                      const nextClassId = event.target.value;
                      requestAction(() => {
                        setSelectedClassId(nextClassId);
                        clearLoadedGrid();
                      }, 'ប្តូរទៅថ្នាក់ផ្សេង');
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
                      const nextMonth = Number(event.target.value);
                      requestAction(() => {
                        setSelectedMonth(nextMonth);
                        clearLoadedGrid();
                      }, 'ប្តូរខែ / ប្រឡង');
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
                  onClick={() => requestAction(() => void loadGrid(), 'ផ្ទុកតារាងឡើងវិញ')}
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
                  {dirtyCells.length ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700" role="status">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                      មិនទាន់ Save — draft ត្រូវបានរក្សាទុកបណ្តោះអាសន្ន
                    </p>
                  ) : null}
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
                            const label = `${student.khmerName || student.firstName} · ${subject.nameKh || subject.name}`;
                            return (
                              <td key={subject.id} className={`border-b border-r border-slate-200 p-1 ${rowBackground}`}>
                                <GradeScoreInput
                                  cell={cell}
                                  studentId={student.id}
                                  subjectId={subject.id}
                                  studentIndex={studentIndex}
                                  subjectIndex={subjectIndex}
                                  label={label}
                                  maxScore={subject.maxScore}
                                  disabled={!canWriteOperationalData}
                                  readOnly={saveStatus === 'saving'}
                                  registerInput={registerInput}
                                  onUpdate={updateCell}
                                  onMove={focusCell}
                                  onPasteMatrix={handlePaste}
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
            <span><kbd className="rounded border bg-white px-1.5 py-0.5 font-semibold">← ↑ ↓ →</kbd> ផ្លាស់ទីក្នុង Grid</span>
            <span><kbd className="rounded border bg-white px-1.5 py-0.5 font-semibold">Esc</kbd> ត្រឡប់តម្លៃដើម</span>
            <span><kbd className="rounded border bg-white px-1.5 py-0.5 font-semibold">⌘/Ctrl + S</kbd> រក្សាទុក</span>
            <span>Paste តារាងច្រើនក្រឡាពី Excel បានដោយផ្ទាល់</span>
          </div>
        </main>
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-grade-title"
            aria-describedby="unsaved-grade-description"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20"
          >
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">Unsaved changes</p>
                    <h2 id="unsaved-grade-title" className="mt-1 text-xl font-black text-slate-950">សូមរក្សាទុកពិន្ទុជាមុនសិន</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAction(null)}
                    disabled={modalSaving}
                    aria-label="បិទ dialog"
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p id="unsaved-grade-description" className="mt-3 text-sm leading-6 text-slate-600">
                  អ្នកបានកែពិន្ទុ <strong className="text-slate-900">{dirtyCells.length} ក្រឡា</strong> ហើយមិនទាន់ Save។
                  ប្រសិនបើបន្ត “{pendingAction.label}” ដោយបោះបង់ ការកែទាំងនេះនឹងមិនត្រូវបានផ្ញើទៅ server ទេ។
                </p>
                {invalidCells.length ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    សូមកែ {invalidCells.length} ក្រឡាដែលមិនត្រឹមត្រូវ មុន Save &amp; Continue។
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={discardAndContinue}
                disabled={modalSaving}
                className="h-11 rounded-xl px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
              >
                បោះបង់ការកែ ហើយបន្ត
              </button>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={modalSaving}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              >
                នៅទំព័រនេះ
              </button>
              <button
                type="button"
                onClick={() => void saveAndContinue()}
                disabled={modalSaving || Boolean(invalidCells.length) || !canWriteOperationalData}
                autoFocus
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {modalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {modalSaving ? 'កំពុងរក្សាទុក…' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
