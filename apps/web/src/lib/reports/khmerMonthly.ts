import type { KhmerMonthlyReportStudent, KhmerMonthlyReportSubject } from '@/lib/api/grades';

export const KHMER_MONTHS = [
  { number: 11, label: 'វិច្ឆិកា' },
  { number: 12, label: 'ធ្នូ' },
  { number: 1, label: 'មករា' },
  { number: 2, label: 'កុម្ភៈ' },
  { number: 3, label: 'មីនា' },
  { number: 4, label: 'មេសា' },
  { number: 5, label: 'ឧសភា' },
  { number: 6, label: 'មិថុនា' },
  { number: 7, label: 'កក្កដា' },
  { number: 8, label: 'សីហា' },
];

const SUBJECT_ABBREVIATIONS: Record<string, string> = {
  'តែងសេចក្តី': 'តែង',
  'សរសេរតាមអាន': 'ស. អាន',
  'គណិតវិទ្យា': 'គណិត',
  'រូបវិទ្យា': 'រូប',
  'គីមីវិទ្យា': 'គីមី',
  'ជីវវិទ្យា': 'ជីវៈ',
  'ផែនដីវិទ្យា': 'ផែនដី',
  'សីលធម៌-ពលរដ្ឋវិជ្ជា': 'សីលធម៌',
  'ភូមិវិទ្យា': 'ភូមិ',
  'ប្រវត្តិវិទ្យា': 'ប្រវត្តិ',
  'ភាសាអង់គ្លេស': 'អង់គ្លេស',
  'គេហវិទ្យា': 'គេហ',
  'កីឡា': 'កីឡា',
  'កសិកម្ម': 'កសិកម្ម',
  'ព័ត៌មានវិទ្យា': 'ICT',
  'ភាសាខ្មែរ': 'ខ្មែរ',
};

export function getKhmerMonthLabel(monthNumber: number) {
  const month = KHMER_MONTHS.find((entry) => entry.number === monthNumber);
  return month?.label || `Month ${monthNumber}`;
}

export function getKhmerMonthDisplayName(monthNumber: number, label?: string) {
  if (monthNumber === 2) return 'ឆមាសទី១';
  return label || getKhmerMonthLabel(monthNumber);
}

export function getSubjectAbbreviation(subject: KhmerMonthlyReportSubject) {
  return SUBJECT_ABBREVIATIONS[subject.nameKh] || subject.nameKh || subject.name || subject.code;
}

export function paginateKhmerMonthlyReport(
  students: KhmerMonthlyReportStudent[],
  firstPageCount = 29,
  nextPageCount = 34
) {
  if (students.length <= firstPageCount) return [students];

  const pages = [students.slice(0, firstPageCount)];
  let index = firstPageCount;
  while (index < students.length) {
    pages.push(students.slice(index, index + nextPageCount));
    index += nextPageCount;
  }
  return pages;
}
