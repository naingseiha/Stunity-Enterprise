'use client';

import { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  buildCambodiaAcademicTerms,
  GRADE_LEVELS,
  MONTHS,
  monthsInTerm,
  type AcademicTermFormValue,
} from '@/lib/academic-year-terms';

type AcademicCalendarEditorProps = {
  terms: AcademicTermFormValue[];
  academicYearStart: string;
  academicYearEnd: string;
  onChange: (terms: AcademicTermFormValue[]) => void;
};

type TermGroup = {
  key: string;
  gradeLevels: number[];
  items: Array<{ term: AcademicTermFormValue; index: number }>;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-sky-950';

const monthLabel = (monthNumber: number) =>
  MONTHS.find((month) => month.value === monthNumber)?.km || `ខែ ${monthNumber}`;

function gradeScopeKey(grades: number[]) {
  return grades.length === 0 ? 'all' : [...grades].sort((a, b) => a - b).join('-');
}

function gradeScopeLabel(grades: number[]) {
  return grades.length === 0 ? 'គ្រប់ថ្នាក់' : `ថ្នាក់ទី ${grades.join(', ')}`;
}

function termKhmerName(termNumber: number) {
  return `ឆមាសទី${termNumber}`;
}

function buildUniversalTerms(startDate: string, endDate: string) {
  return buildCambodiaAcademicTerms(startDate, endDate)
    .slice(0, 2)
    .map((term) => ({
      ...term,
      name: termKhmerName(term.termNumber),
      nameKh: termKhmerName(term.termNumber),
      gradeLevels: [],
    }));
}

export default function AcademicCalendarEditor({
  terms,
  academicYearStart,
  academicYearEnd,
  onChange,
}: AcademicCalendarEditorProps) {
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({});

  const groups = useMemo<TermGroup[]>(() => {
    const grouped = new Map<string, TermGroup>();
    terms.forEach((term, index) => {
      const scope = gradeScopeKey(term.gradeLevels);
      const current = grouped.get(scope);
      if (current) {
        current.items.push({ term, index });
      } else {
        grouped.set(scope, {
          key: `${scope}-${term.id || index}`,
          gradeLevels: [...term.gradeLevels],
          items: [{ term, index }],
        });
      }
    });
    return Array.from(grouped.values()).map((group) => ({
      ...group,
      items: group.items.sort((left, right) => left.term.termNumber - right.term.termNumber),
    }));
  }, [terms]);

  const yearMonths = useMemo(
    () => monthsInTerm(academicYearStart, academicYearEnd),
    [academicYearEnd, academicYearStart],
  );
  const hasUniversalGroup = groups.some((group) => group.gradeLevels.length === 0);

  const updateTerm = (index: number, patch: Partial<AcademicTermFormValue>) => {
    onChange(terms.map((term, termIndex) => (termIndex === index ? { ...term, ...patch } : term)));
  };

  const updateGroupGrades = (group: TermGroup, gradeLevels: number[]) => {
    const targetIndexes = new Set(group.items.map((item) => item.index));
    const sortedGrades = [...gradeLevels].sort((a, b) => a - b);
    onChange(terms.map((term, index) => (
      targetIndexes.has(index) ? { ...term, gradeLevels: sortedGrades } : term
    )));
  };

  const removeGroup = (group: TermGroup) => {
    const targetIndexes = new Set(group.items.map((item) => item.index));
    onChange(terms.filter((_, index) => !targetIndexes.has(index)));
  };

  const removeTerm = (index: number) => onChange(terms.filter((_, termIndex) => termIndex !== index));

  const addTermToGroup = (group: TermGroup) => {
    const nextNumber = Math.max(0, ...group.items.map((item) => item.term.termNumber)) + 1;
    onChange([
      ...terms,
      {
        id: `new-${Date.now()}`,
        name: termKhmerName(nextNumber),
        nameKh: termKhmerName(nextNumber),
        termNumber: nextNumber,
        startDate: academicYearStart,
        endDate: academicYearEnd,
        gradeLevels: [...group.gradeLevels],
        examMonth: null,
        excludedMonths: [],
      },
    ]);
  };

  const addGradeGroup = () => {
    const explicitlyUsed = new Set(terms.flatMap((term) => term.gradeLevels));
    const firstAvailableGrade = GRADE_LEVELS.find((grade) => !explicitlyUsed.has(grade)) || 1;
    const stamp = Date.now();
    const source = buildUniversalTerms(academicYearStart, academicYearEnd);
    onChange([
      ...terms,
      ...source.map((term, index) => ({
        ...term,
        id: `new-${stamp}-${index}`,
        gradeLevels: [firstAvailableGrade],
      })),
    ]);
  };

  const applyCambodiaPreset = () => {
    onChange(buildCambodiaAcademicTerms(academicYearStart, academicYearEnd).map((term, index) => ({
      ...term,
      id: `new-${Date.now()}-${index}`,
      name: termKhmerName(term.termNumber),
    })));
  };

  const applyUniversalPreset = () => {
    onChange(buildUniversalTerms(academicYearStart, academicYearEnd).map((term, index) => ({
      ...term,
      id: `new-${Date.now()}-${index}`,
    })));
  };

  if (!academicYearStart || !academicYearEnd) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-8 text-center dark:border-amber-900 dark:bg-amber-950/30">
        <CalendarCheck2 className="mx-auto h-8 w-8 text-amber-600" />
        <p className="mt-3 font-bold text-amber-900 dark:text-amber-200">សូមកំណត់ថ្ងៃចាប់ផ្តើម និងថ្ងៃបញ្ចប់ឆ្នាំសិក្សាជាមុនសិន</p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">បន្ទាប់មកប្រព័ន្ធនឹងរៀបចំខែ និងឆមាសឱ្យស្របតាមឆ្នាំសិក្សានោះ។</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-gray-950 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-black uppercase tracking-[0.16em]">ចាប់ផ្តើមឱ្យលឿន</p>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-300">
              ជ្រើសគំរូមួយ រួចកែថ្ងៃ ខែប្រឡង ឬក្រុមថ្នាក់តាមការសម្រេចរបស់សាលា។
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={applyCambodiaPreset}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              <Sparkles className="h-4 w-4" />
              ប្រើគំរូសាលាកម្ពុជា
            </button>
            <button
              type="button"
              onClick={applyUniversalPreset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <Users className="h-4 w-4" />
              កាលវិភាគតែមួយគ្រប់ថ្នាក់
            </button>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <Users className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 font-bold text-slate-800 dark:text-gray-100">មិនទាន់មានក្រុមថ្នាក់</p>
          <p className="mt-1 text-sm text-slate-500">ប្រើគំរូខាងលើ ឬបង្កើតក្រុមថ្នាក់ថ្មីដោយខ្លួនឯង។</p>
        </div>
      ) : null}

      {groups.map((group, groupIndex) => (
        <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="border-b border-slate-100 bg-slate-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/70 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
                    {groupIndex + 1}
                  </span>
                  <h3 className="font-black text-slate-950 dark:text-white">ក្រុមកាលវិភាគ៖ {gradeScopeLabel(group.gradeLevels)}</h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-gray-950 dark:ring-gray-700">
                    {group.items.length} ឆមាស
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">ថ្នាក់ក្នុងក្រុមនេះប្រើថ្ងៃឆមាស និងខែប្រឡងដូចគ្នា។</p>
              </div>
              <button
                type="button"
                onClick={() => removeGroup(group)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="h-4 w-4" />
                លុបក្រុម
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-black text-slate-500">ជ្រើសថ្នាក់សម្រាប់ក្រុមនេះ</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateGroupGrades(group, [])}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${group.gradeLevels.length === 0 ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'}`}
                >
                  គ្រប់ថ្នាក់
                </button>
                {GRADE_LEVELS.map((grade) => {
                  const selected = group.gradeLevels.includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => updateGroupGrades(
                        group,
                        selected
                          ? (group.gradeLevels.length > 1
                              ? group.gradeLevels.filter((item) => item !== grade)
                              : group.gradeLevels)
                          : [...group.gradeLevels, grade],
                      )}
                      className={`h-9 min-w-9 rounded-lg border px-2.5 text-xs font-black transition ${selected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'}`}
                    >
                      {grade}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {group.items.map(({ term, index }) => {
              const termKey = term.id || `${group.key}-${index}`;
              const isExpanded = Boolean(expandedTerms[termKey]);
              const includedMonths = monthsInTerm(term.startDate, term.endDate);
              return (
                <article key={termKey} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/50">
                  <div className="grid gap-3 xl:grid-cols-[150px_1fr_1fr_220px_auto] xl:items-end">
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-slate-500">ឆមាស</label>
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                          {term.termNumber}
                        </span>
                        <input
                          aria-label="លេខឆមាស"
                          type="number"
                          min={1}
                          value={term.termNumber}
                          onChange={(event) => {
                            const termNumber = Number(event.target.value);
                            updateTerm(index, {
                              termNumber,
                              name: termKhmerName(termNumber),
                              nameKh: termKhmerName(termNumber),
                            });
                          }}
                          className={`${inputClass} min-w-0`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-slate-500">ថ្ងៃចាប់ផ្តើម</label>
                      <input
                        aria-label={`${termKhmerName(term.termNumber)} ថ្ងៃចាប់ផ្តើម`}
                        type="date"
                        value={term.startDate}
                        onChange={(event) => updateTerm(index, { startDate: event.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-slate-500">ថ្ងៃបញ្ចប់</label>
                      <input
                        aria-label={`${termKhmerName(term.termNumber)} ថ្ងៃបញ្ចប់`}
                        type="date"
                        value={term.endDate}
                        onChange={(event) => updateTerm(index, { endDate: event.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-slate-500">ខែប្រឡងឆមាស</label>
                      <select
                        aria-label={`${termKhmerName(term.termNumber)} ខែប្រឡង`}
                        value={term.examMonth || ''}
                        onChange={(event) => updateTerm(index, { examMonth: event.target.value ? Number(event.target.value) : null })}
                        className={inputClass}
                      >
                        <option value="">មិនកំណត់</option>
                        {MONTHS.filter((month) => includedMonths.includes(month.value)).map((month) => (
                          <option key={month.value} value={month.value}>{month.km}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      aria-label={`លុប${termKhmerName(term.termNumber)}`}
                      onClick={() => removeTerm(index)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {yearMonths.map((monthNumber) => {
                      const isInside = includedMonths.includes(monthNumber);
                      const isBreak = isInside && term.excludedMonths.includes(monthNumber);
                      const isExam = isInside && term.examMonth === monthNumber;
                      return (
                        <span
                          key={monthNumber}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                            isExam
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isBreak
                                ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : isInside
                                  ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300'
                                  : 'border-slate-100 bg-slate-50 text-slate-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-700'
                          }`}
                        >
                          {monthLabel(monthNumber)}{isExam ? ' · ប្រឡង' : isBreak ? ' · ឈប់' : ''}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedTerms((current) => ({ ...current, [termKey]: !isExpanded }))}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-800 dark:hover:text-gray-200"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? 'លាក់ការកំណត់បន្ថែម' : 'ការកំណត់បន្ថែម'}
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 grid gap-4 rounded-xl bg-slate-50 p-4 dark:bg-gray-950 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-black text-slate-500">ឈ្មោះឆមាស</label>
                        <input
                          type="text"
                          value={term.nameKh || term.name}
                          onChange={(event) => updateTerm(index, { name: event.target.value, nameKh: event.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-black text-slate-500">ខែដែលឈប់សិក្សាពេញមួយខែ</p>
                        <div className="flex flex-wrap gap-2">
                          {MONTHS.filter((month) => includedMonths.includes(month.value)).map((month) => {
                            const selected = term.excludedMonths.includes(month.value);
                            return (
                              <button
                                key={month.value}
                                type="button"
                                onClick={() => updateTerm(index, {
                                  excludedMonths: selected
                                    ? term.excludedMonths.filter((item) => item !== month.value)
                                    : [...term.excludedMonths, month.value].sort((a, b) => a - b),
                                })}
                                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${selected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}
                              >
                                {month.km}
                              </button>
                            );
                          })}
                          {includedMonths.length === 0 ? <span className="text-xs text-slate-400">សូមកំណត់ថ្ងៃឆមាសជាមុន</span> : null}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                          ជ្រើសខែដែលឈប់ពេញមួយខែ (ឧ. មេសា = វិសសមកាល)។ ខែទាំងនេះ{' '}
                          <strong>មិនត្រូវបានបូកមធ្យម</strong>ក្នុងរបាយប្រចាំឆមាស។
                          វិសសមកាលត្រឹមចន្លោះថ្ងៃក៏ដកស្វ័យប្រវត្តិពីប្រតិទិន VACATION/HOLIDAY ដែរ។
                        </p>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}

            <button
              type="button"
              onClick={() => addTermToGroup(group)}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-sky-950/30"
            >
              <Plus className="h-4 w-4" />
              បន្ថែមឆមាសក្នុងក្រុមនេះ
            </button>
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={addGradeGroup}
        disabled={hasUniversalGroup}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm font-black text-slate-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-sky-950/30"
      >
        <Plus className="h-5 w-5" />
        {hasUniversalGroup ? 'សូមជ្រើសថ្នាក់ជាក់លាក់ មុនបន្ថែមក្រុមថ្មី' : 'បន្ថែមក្រុមថ្នាក់ថ្មី'}
      </button>

      <div className="flex flex-wrap gap-4 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-gray-900">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-sky-100 ring-1 ring-sky-200" /> ខែសិក្សា</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> ខែប្រឡង</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" /> ឈប់សិក្សាពេញមួយខែ</span>
      </div>
    </div>
  );
}
