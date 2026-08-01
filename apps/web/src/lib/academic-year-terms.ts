export interface AcademicTermFormValue {
  id?: string;
  name: string;
  nameKh?: string | null;
  termNumber: number;
  startDate: string;
  endDate: string;
  gradeLevels: number[];
  examMonth?: number | null;
  excludedMonths: number[];
}

export const GRADE_LEVELS = Array.from({ length: 12 }, (_, index) => index + 1);

export const MONTHS = [
  { value: 1, en: 'January', km: 'មករា' },
  { value: 2, en: 'February', km: 'កុម្ភៈ' },
  { value: 3, en: 'March', km: 'មីនា' },
  { value: 4, en: 'April', km: 'មេសា' },
  { value: 5, en: 'May', km: 'ឧសភា' },
  { value: 6, en: 'June', km: 'មិថុនា' },
  { value: 7, en: 'July', km: 'កក្កដា' },
  { value: 8, en: 'August', km: 'សីហា' },
  { value: 9, en: 'September', km: 'កញ្ញា' },
  { value: 10, en: 'October', km: 'តុលា' },
  { value: 11, en: 'November', km: 'វិច្ឆិកា' },
  { value: 12, en: 'December', km: 'ធ្នូ' },
] as const;

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

function atMonth(startYear: number, month: number, day: number) {
  const year = month < 9 ? startYear + 1 : startYear;
  return new Date(Date.UTC(year, month - 1, day));
}

function earlierDate(left: Date, right: Date) {
  return left < right ? left : right;
}

function preferredMonthWithinTerm(startDate: Date, endDate: Date, preferredMonths: number[]) {
  const includedMonths = monthsInTerm(dateOnly(startDate), dateOnly(endDate));
  return preferredMonths.find((month) => includedMonths.includes(month)) ?? includedMonths.at(-1) ?? null;
}

export function monthsInTerm(startDate: string, endDate: string): number[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const values: number[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth() + 1;
  const endValue = end.getUTCFullYear() * 100 + end.getUTCMonth() + 1;
  while (year * 100 + month <= endValue) {
    values.push(month);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return values;
}

export function buildCambodiaAcademicTerms(startDate: string, endDate: string): AcademicTermFormValue[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = Number.isNaN(start.getTime()) ? new Date().getUTCFullYear() : start.getUTCFullYear();
  const safeStart = Number.isNaN(start.getTime()) ? atMonth(startYear, 11, 1) : start;
  const safeEnd = Number.isNaN(end.getTime()) ? atMonth(startYear, 8, 31) : end;
  const standardSemesterOneEnd = earlierDate(atMonth(startYear, 3, 31), safeEnd);
  const examSemesterOneEnd = earlierDate(atMonth(startYear, 3, 0), safeEnd);
  const standardSemesterTwoStart = atMonth(startYear, 5, 1);
  const examSemesterTwoStart = atMonth(startYear, 3, 1);

  return [
    {
      name: 'Semester 1 — Grades 7, 8, 10, 11',
      nameKh: 'ឆមាសទី១ — ថ្នាក់ទី ៧, ៨, ១០, ១១',
      termNumber: 1,
      startDate: dateOnly(safeStart),
      endDate: dateOnly(standardSemesterOneEnd),
      gradeLevels: [7, 8, 10, 11],
      examMonth: preferredMonthWithinTerm(safeStart, standardSemesterOneEnd, [3, 2]),
      excludedMonths: [],
    },
    {
      name: 'Semester 2 — Grades 7, 8, 10, 11',
      nameKh: 'ឆមាសទី២ — ថ្នាក់ទី ៧, ៨, ១០, ១១',
      termNumber: 2,
      startDate: dateOnly(standardSemesterTwoStart),
      endDate: dateOnly(safeEnd),
      gradeLevels: [7, 8, 10, 11],
      examMonth: preferredMonthWithinTerm(standardSemesterTwoStart, safeEnd, [8, 7]),
      excludedMonths: [],
    },
    {
      name: 'Semester 1 — Grades 9, 12',
      nameKh: 'ឆមាសទី១ — ថ្នាក់ទី ៩, ១២',
      termNumber: 1,
      startDate: dateOnly(safeStart),
      endDate: dateOnly(examSemesterOneEnd),
      gradeLevels: [9, 12],
      examMonth: preferredMonthWithinTerm(safeStart, examSemesterOneEnd, [2]),
      excludedMonths: [],
    },
    {
      name: 'Semester 2 — Grades 9, 12',
      nameKh: 'ឆមាសទី២ — ថ្នាក់ទី ៩, ១២',
      termNumber: 2,
      startDate: dateOnly(examSemesterTwoStart),
      endDate: dateOnly(safeEnd),
      gradeLevels: [9, 12],
      examMonth: preferredMonthWithinTerm(examSemesterTwoStart, safeEnd, [7, 6]),
      excludedMonths: [],
    },
  ];
}

export function normalizeAcademicTerm(value: any): AcademicTermFormValue {
  const gradeLevels = Array.isArray(value?.gradeLevels)
    ? value.gradeLevels.map(Number).filter((grade: number) => Number.isInteger(grade))
    : value?.gradePattern === 'standard'
      ? [7, 8, 10, 11]
      : value?.gradePattern === 'exam-grade'
        ? [9, 12]
        : [];
  return {
    ...value,
    startDate: value?.startDate?.split?.('T')[0] || '',
    endDate: value?.endDate?.split?.('T')[0] || '',
    gradeLevels,
    examMonth: value?.examMonth == null ? null : Number(value.examMonth),
    excludedMonths: Array.isArray(value?.excludedMonths)
      ? value.excludedMonths.map(Number)
      : Array.isArray(value?.skipMonths)
        ? value.skipMonths.map(Number)
        : [],
  };
}

export function validateAcademicTerms(
  terms: AcademicTermFormValue[],
  academicYearStart: string,
  academicYearEnd: string,
): string | null {
  if (terms.length === 0) return 'សូមបន្ថែមឆមាសយ៉ាងហោចណាស់មួយ។';
  const yearStart = new Date(academicYearStart);
  const yearEnd = new Date(academicYearEnd);
  for (const term of terms) {
    const start = new Date(term.startDate);
    const end = new Date(term.endDate);
    if (!term.name || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'ឆមាសនីមួយៗត្រូវមានឈ្មោះ ថ្ងៃចាប់ផ្តើម និងថ្ងៃបញ្ចប់។';
    }
    if (end < start) return `${term.name}៖ ថ្ងៃបញ្ចប់ត្រូវនៅក្រោយថ្ងៃចាប់ផ្តើម។`;
    if (start < yearStart || end > yearEnd) return `${term.name} ត្រូវស្ថិតក្នុងចន្លោះឆ្នាំសិក្សា។`;
    const months = monthsInTerm(term.startDate, term.endDate);
    if (term.examMonth && !months.includes(term.examMonth)) return `${term.name}៖ ខែប្រឡងមិនស្ថិតក្នុងចន្លោះឆមាស។`;
    if (term.examMonth && term.excludedMonths.includes(term.examMonth)) {
      return `${term.name}៖ ខែប្រឡងមិនអាចជាខែឈប់សម្រាកក្នុងពេលតែមួយបានទេ។`;
    }
  }
  for (let left = 0; left < terms.length; left += 1) {
    for (let right = left + 1; right < terms.length; right += 1) {
      const a = terms[left];
      const b = terms[right];
      const overlap = a.gradeLevels.length === 0 || b.gradeLevels.length === 0 || a.gradeLevels.some((g) => b.gradeLevels.includes(g));
      if (a.termNumber === b.termNumber && overlap) {
        return `${a.name} និង ${b.name} អនុវត្តជាន់គ្នាលើថ្នាក់ដូចគ្នាក្នុងឆមាសទី${a.termNumber}។`;
      }
    }
  }
  return null;
}
