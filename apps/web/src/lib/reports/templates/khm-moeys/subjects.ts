import type { KhmerMonthlyReportSubject } from '@/lib/api/grades';

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
  'អក្សរសាស្ត្រខ្មែរ': 'ខ្មែរ',
};

/** Match backend `KHMER_SUBJECT_ORDER` for client-side re-order when subjects are toggled */
const ORDER_KEYS: Record<string, number> = {
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

function norm(v?: string | null) {
  return (v || '').trim().toLowerCase();
}

function priority(subject: KhmerMonthlyReportSubject): number {
  const keys = [subject.code, subject.nameKh, subject.nameEn, subject.name].map(norm);
  for (const k of keys) {
    const p = ORDER_KEYS[k];
    if (p) return p;
  }
  return 999;
}

export function getSubjectAbbreviation(subject: KhmerMonthlyReportSubject) {
  const shortKh = subject.nameKhShort?.trim();
  if (shortKh) return shortKh;
  const kh = subject.nameKh?.trim();
  if (kh && SUBJECT_ABBREVIATIONS[kh]) return SUBJECT_ABBREVIATIONS[kh];
  const shortEn = subject.nameEnShort?.trim();
  if (shortEn) return shortEn;
  return subject.nameKh || subject.name || subject.code;
}

export function sortSubjectsByOrder<T extends KhmerMonthlyReportSubject>(subjects: T[], _grade?: string | number): T[] {
  return [...subjects].sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return (a.nameKh || a.name || '').localeCompare(b.nameKh || b.name || '', 'km');
  });
}
