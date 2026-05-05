/** Pure helpers & constants for Khmer MOEYS monthly / semester-1 reports */

export const KHMER_MONTH_REPORT_TEMPLATE = 'KHM_MOEYS_MONTHLY';
export const KHMER_MONTH_PASSING_AVERAGE = 25;
export const ENGLISH_SCORE_BASELINE = 25;

export const KHMER_MONTH_LABELS: Record<number, string> = {
  1: 'មករា',
  2: 'កុម្ភៈ',
  3: 'មីនា',
  4: 'មេសា',
  5: 'ឧសភា',
  6: 'មិថុនា',
  7: 'កក្កដា',
  8: 'សីហា',
  9: 'កញ្ញា',
  10: 'តុលា',
  11: 'វិច្ឆិកា',
  12: 'ធ្នូ',
};

/** Months averaged before the semester exam month (SchoolManagementApp parity) */
export const MOEYS_SEMESTER_ONE_PRE_MONTHS = [11, 12, 1] as const;

export const KHMER_SUBJECT_ORDER: Record<string, number> = {
  khmer: 1,
  'ភាសាខ្មែរ': 1,
  'អក្សរសាស្ត្រខ្មែរ': 1,
  'តែងសេចក្តី': 2,
  'សរសេរតាមអាន': 3,
  mathematics: 4,
  math: 4,
  'គណិតវិទ្យា': 4,
  physics: 5,
  'រូបវិទ្យា': 5,
  chemistry: 6,
  'គីមីវិទ្យា': 6,
  biology: 7,
  'ជីវវិទ្យា': 7,
  earth: 8,
  'ផែនដីវិទ្យា': 8,
  morality: 9,
  'សីលធម៌-ពលរដ្ឋវិជ្ជា': 9,
  geography: 10,
  'ភូមិវិទ្យា': 10,
  history: 11,
  'ប្រវត្តិវិទ្យា': 11,
  english: 12,
  'ភាសាអង់គ្លេស': 12,
  ict: 13,
  'ព័ត៌មានវិទ្យា': 13,
  home: 14,
  'គេហវិទ្យា': 14,
  agriculture: 15,
  'កសិកម្ម': 15,
  sport: 16,
  'កីឡា': 16,
};

export function normalizeKhmerReportKey(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

export function khmerMonthlyGradeLevel(average: number): string {
  if (average >= 45) return 'A';
  if (average >= 40) return 'B';
  if (average >= 35) return 'C';
  if (average >= 30) return 'D';
  if (average >= 25) return 'E';
  return 'F';
}

export function isFemaleGender(gender?: string | null) {
  const normalized = normalizeKhmerReportKey(gender);
  return normalized === 'female' || normalized === 'f' || normalized === 'ស្រី';
}

export function isEnglishSubject(subject: {
  name?: string | null;
  nameKh?: string | null;
  nameEn?: string | null;
  code?: string | null;
}) {
  return [subject.name, subject.nameKh, subject.nameEn, subject.code].some((value) => {
    const normalized = normalizeKhmerReportKey(value);
    return normalized.includes('english') || normalized.includes('អង់គ្លេស') || normalized === 'eng';
  });
}

export function shouldApplySemesterOneEnglishRule(
  grade?: string | null,
  monthNumber?: number | null,
  month?: string | null
) {
  const normalizedGrade = String(grade || '').replace(/[^\d]/g, '');
  const normalizedMonth = normalizeKhmerReportKey(month);
  return (
    (normalizedGrade === '9' || normalizedGrade === '12') &&
    (monthNumber === 2 || normalizedMonth.includes('កុម្ភៈ') || normalizedMonth.includes('ឆមាសទី១'))
  );
}

export function getKhmerStudentName(student: {
  firstName?: string | null;
  lastName?: string | null;
  customFields?: any;
}) {
  return (
    student.customFields?.regional?.khmerName ||
    student.customFields?.khmerName ||
    `${student.lastName || ''} ${student.firstName || ''}`.trim() ||
    student.firstName ||
    student.lastName ||
    ''
  );
}

export function resolveKhmerMonthLabel(monthNumber: number, month?: string | null) {
  return (month && month.trim()) || KHMER_MONTH_LABELS[monthNumber] || `Month ${monthNumber}`;
}

export function resolveKhmerMonthlyReportPeriod(
  academicStartYear: number,
  monthNumber: number,
  periodYear?: string | number | null
) {
  const explicitPeriodYear = Number(periodYear);
  if (Number.isInteger(explicitPeriodYear)) return explicitPeriodYear;
  return monthNumber <= 8 ? academicStartYear + 1 : academicStartYear;
}

export function compareSubjectsForKhmerMonthlyReport(a: any, b: any) {
  const aKeys = [a.code, a.nameKh, a.nameEn, a.name].map(normalizeKhmerReportKey);
  const bKeys = [b.code, b.nameKh, b.nameEn, b.name].map(normalizeKhmerReportKey);
  const aOrder = aKeys.map((key) => KHMER_SUBJECT_ORDER[key]).find((order) => order) || 999;
  const bOrder = bKeys.map((key) => KHMER_SUBJECT_ORDER[key]).find((order) => order) || 999;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return (a.nameKh || a.name || '').localeCompare(b.nameKh || b.name || '', 'km');
}

export function getKhmerMonthlySubjectGroupKey(subject: {
  nameKh?: string | null;
  name?: string | null;
  nameEn?: string | null;
  code?: string | null;
}) {
  const values = [subject.nameKh, subject.name, subject.nameEn, subject.code]
    .map(normalizeKhmerReportKey)
    .filter(Boolean);
  const joined = values.join(' ');

  if (joined.includes('អង់គ្លេស') || joined.includes('english') || values.includes('eng')) return 'canonical:english';
  if (joined.includes('គីមី') || joined.includes('chemistry')) return 'canonical:chemistry';
  if (joined.includes('ប្រវត្តិ') || joined.includes('history')) return 'canonical:history';
  if (joined.includes('គណិត') || joined.includes('math')) return 'canonical:mathematics';
  if (joined.includes('រូបវិទ្យា') || joined.includes('physics')) return 'canonical:physics';
  if (joined.includes('ជីវ') || joined.includes('biology')) return 'canonical:biology';
  if (joined.includes('ផែនដី') || joined.includes('earth')) return 'canonical:earth';
  if (joined.includes('សីលធម៌') || joined.includes('morality') || joined.includes('civics')) return 'canonical:morality';
  if (joined.includes('ភូមិ') || joined.includes('geography')) return 'canonical:geography';
  if (joined.includes('ភាសាខ្មែរ') || joined.includes('khmer')) return 'canonical:khmer';
  if (joined.includes('ព័ត៌មាន') || joined.includes('កុំព្យូទ័រ') || joined.includes('computer') || joined.includes('ict'))
    return 'canonical:ict';
  if (joined.includes('កីឡា') || joined.includes('sport')) return 'canonical:sport';
  if (joined.includes('កសិកម្ម') || joined.includes('agriculture')) return 'canonical:agriculture';
  if (joined.includes('គេហ') || joined.includes('home')) return 'canonical:home-economics';

  const khmerName = normalizeKhmerReportKey(subject.nameKh);
  if (khmerName) return `kh:${khmerName}`;

  const englishName = normalizeKhmerReportKey(subject.nameEn || subject.name);
  if (englishName) return `name:${englishName}`;

  return `code:${normalizeKhmerReportKey(subject.code)}`;
}

export function buildMonthlyGradeWhere(monthNumber: number, monthLabel: string, actualYear: number) {
  return {
    year: actualYear,
    OR: [{ monthNumber }, { month: monthLabel }],
  };
}

export function monthStart(year: number, monthNumber: number) {
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

export function monthEnd(year: number, monthNumber: number) {
  return new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
}
