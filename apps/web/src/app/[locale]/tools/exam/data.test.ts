import { buildExercises, CHAPTERS, toKh } from './data';

// Khmer-numeral string back to a JS number, for asserting on point values.
const KH = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const fromKh = (s: string) => Number([...s].map((c) => String(KH.indexOf(c))).join(''));

describe('buildExercises', () => {
  const twoChapters = [CHAPTERS[1], CHAPTERS[2]]; // ប្រភាគ, ទសភាគ

  it('produces exactly `count` exercises', () => {
    expect(buildExercises(10, [CHAPTERS[1]])).toHaveLength(10);
    expect(buildExercises(3, twoChapters)).toHaveLength(3);
  });

  it('always distributes exactly 100 points in total', () => {
    for (const count of [3, 7, 10, 13, 20]) {
      const total = buildExercises(count, twoChapters).reduce((s, e) => s + fromKh(e.points), 0);
      expect(total).toBe(100);
    }
  });

  it('gives the remainder to the last exercise (no points lost to rounding)', () => {
    // 100 / 3 = 33 each, last carries the +1 remainder → 34
    const ex = buildExercises(3, [CHAPTERS[1]]);
    expect(ex.map((e) => fromKh(e.points))).toEqual([33, 33, 34]);
  });

  it('flags Mix mode and cycles chapter tags across multiple chapters', () => {
    const ex = buildExercises(4, twoChapters);
    expect(ex.every((e) => e.showChip)).toBe(true);
    // exercise i draws from chapter i % 2 → alternating tags
    expect(ex[0].chapTag).toContain(CHAPTERS[1].title);
    expect(ex[1].chapTag).toContain(CHAPTERS[2].title);
    expect(ex[2].chapTag).toContain(CHAPTERS[1].title);
  });

  it('hides the chapter chip for a single-chapter exam', () => {
    expect(buildExercises(5, [CHAPTERS[1]]).every((e) => !e.showChip)).toBe(true);
  });

  it('numbers exercises with Khmer numerals starting at ១', () => {
    const ex = buildExercises(3, [CHAPTERS[1]]);
    expect(ex.map((e) => e.no)).toEqual(['១', '២', '៣']);
  });

  it('falls back to a generic statement for a chapter with no question bank', () => {
    const empty = { no: '៩', title: 'មុខវិជ្ជាគ្មានធនាគារ', lessons: [] };
    const ex = buildExercises(2, [empty]);
    expect(ex[0].statement).toContain(empty.title);
  });
});

describe('toKh', () => {
  it('maps western digits to Khmer numerals', () => {
    expect(toKh(2026)).toBe('២០២៦');
    expect(toKh(0)).toBe('០');
    expect(toKh('50 នាទី')).toBe('៥០ នាទី');
  });
});
