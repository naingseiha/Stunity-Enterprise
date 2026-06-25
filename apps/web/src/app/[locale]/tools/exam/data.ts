// Exam generator — static curriculum + question bank.
// Ported from the "Lesson Planner" Claude Design (MoEYS exam tool).
// Reuses the shared curriculum (chapters/subjects/grades/toKh) from the
// Lesson Planner so the two tools stay consistent.

import { CHAPTERS, type Chapter, toKh } from '../lesson-planner/data';

export { CHAPTERS, toKh };
export type { Chapter };

export const EXAM_DURATIONS = [
  { v: '60', l: '១ ម៉ោង' },
  { v: '90', l: '១ ម៉ោង ៣០ នាទី' },
  { v: '120', l: '២ ម៉ោង' },
  { v: '150', l: '២ ម៉ោង ៣០ នាទី' },
  { v: '180', l: '៣ ម៉ោង' },
];

export const DURATION_LABEL: Record<string, string> = {
  '60': '១ ម៉ោង',
  '90': '១ ម៉ោង ៣០',
  '120': '២ ម៉ោង',
  '150': '២ ម៉ោង ៣០',
  '180': '៣ ម៉ោង',
};

export const DIFFICULTIES = [
  { id: 'easy', label: 'ងាយ' },
  { id: 'mixed', label: 'ចម្រុះ' },
  { id: 'hard', label: 'ពិបាក' },
];

export const FORMATS = [
  { id: 'moeys', label: 'ទម្រង់ MoEYS', sub: 'ស្តង់ដារផ្លូវការ' },
  { id: 'custom', label: 'Customize', sub: 'រចនាតាមបំណង' },
];

export const EXAM_GEN_STEPS = [
  'វិភាគជំពូក និងមេរៀនដែលជ្រើស',
  'ជ្រើសរើសលំហាត់ពីធនាគារសំណួរ',
  'លាយលំហាត់ច្រើនជំពូក (Mix)',
  'កំណត់ពិន្ទុ និងកម្រិតលំបាក',
  'រៀបចំទម្រង់តាមស្តង់ដារ',
];

/** Question bank keyed by chapter title. */
export const PROB_BANK: Record<string, string[]> = {
  ចំនួនទាំងមូល: [
    'គណនា ៖ ៤ ៥៦៧ + ៨ ៩៨៥ − ៣ ២១០។',
    'រកផលគុណ ៖ ២៣៤ × ៥៦ ហើយផ្ទៀងផ្ទាត់លទ្ធផល។',
    'ចែក ៩ ៨៧៦ ដោយ ១២ រួចសរសេរផលចែក និងសំណល់។',
    'រកផ.ស.ច.ធ និង ប.ស.ម.ត នៃ ២៤ និង ៣៦។',
  ],
  ប្រភាគ: [
    'បូកប្រភាគ ៖ ២/៣ + ៣/៤ រួចធ្វើឲ្យសាមញ្ញ។',
    'ធ្វើឲ្យសាមញ្ញ ៖ ១២/១៨ និង ១៥/២៥។',
    'ប្រៀបធៀប ៥/៦ និង ៧/៩ ដោយប្រើសញ្ញា (< > =)។',
    'គណនា ៖ ៣/៤ × ៨/៩ ÷ ២/៣។',
    'ដោះស្រាយ ៖ បើ x − ២/៥ = ៣/១០ តើ x = ?',
  ],
  ទសភាគ: [
    'គណនា ៖ ៣,៥ + ២,៧៥ − ១,២។',
    'បំប្លែង ៣/៤ និង ៥/៨ ទៅជាទសភាគ។',
    'រកផលគុណ ៖ ២,៤ × ១,៥។',
    'ចែក ៧,២ ដោយ ០,៩។',
  ],
  ធរណីមាត្រ: [
    'គណនាក្រឡាផ្ទៃ និងបរិមាត្រត្រីកោណកែងជ្រុង ៦សម និង ៨សម។',
    'គណនាបរិមាត្ររង្វង់កាំ ៤សម (π ≈ ៣,១៤)។',
    'រកមុំទីបីនៃត្រីកោណ បើមុំពីរស្មើ ៥០° និង ៦០°។',
    'គណនាក្រឡាផ្ទៃចតុកោណកែង ប្រវែង ១២សម ទទឹង ៧សម។',
  ],
};

export type Exercise = {
  no: string;
  points: string;
  statement: string;
  showChip: boolean;
  chapTag: string;
};

/** Build `count` exercises spread across the selected chapters, totalling 100 pts. */
export function buildExercises(count: number, chapters: Chapter[]): Exercise[] {
  const eff = chapters.length ? chapters : [CHAPTERS[0]];
  const isMix = eff.length > 1;
  const total = 100;
  const per = Math.floor(total / count);
  return Array.from({ length: count }).map((_, i) => {
    const ch = eff[i % eff.length];
    const bank = PROB_BANK[ch.title] || [];
    const statement = bank.length
      ? bank[Math.floor(i / eff.length) % bank.length]
      : `ដោះស្រាយលំហាត់ផ្អែកលើខ្លឹមសារនៃ ${ch.title}។`;
    const pts = i === count - 1 ? total - per * (count - 1) : per;
    return {
      no: toKh(i + 1),
      points: toKh(pts),
      statement,
      showChip: isMix,
      chapTag: `ជំពូក ${ch.no} · ${ch.title}`,
    };
  });
}
