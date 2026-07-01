// Slides generator — static deck builder, themes, and helpers.
// Ported from the "Lesson Planner" Claude Design (MoEYS teaching-deck tool).
// Reuses the shared curriculum (chapters/subjects/grades/objectives/toKh) from
// the Lesson Planner so the creator tools stay consistent.

import { CHAPTERS, SAMPLE_OBJECTIVES, SUBJECTS, GRADES, type Chapter, toKh } from '../lesson-planner/data';

export { CHAPTERS, SUBJECTS, GRADES, toKh };
export type { Chapter };

// ─── Themes ────────────────────────────────────────────────────────
export type Theme = {
  id: string;
  name: string;
  bg: string;
  panel: string;
  ink: string;
  accent: string;
  sub: string;
  band: string;
  dot: string;
  sw: string;
};

export const THEMES: Theme[] = [
  { id: 'classic', name: 'បុរាណ', bg: '#fffdf9', panel: 'linear-gradient(135deg,#fbeede,#f6e2cb)', ink: '#2f2519', accent: '#a84d22', sub: '#8a7a63', band: 'linear-gradient(90deg,#a84d22,#d2703f,#e0a45a)', dot: '#d2703f', sw: 'linear-gradient(135deg,#d2703f,#a84d22)' },
  { id: 'night', name: 'ងងឹត', bg: '#241d18', panel: 'linear-gradient(135deg,#3a2f27,#2c2521)', ink: '#f3e8d8', accent: '#e8b06a', sub: '#b3a386', band: 'linear-gradient(90deg,#e0a45a,#d2703f)', dot: '#e8b06a', sw: 'linear-gradient(135deg,#3a2f27,#211b17)' },
  { id: 'mint', name: 'បៃតង', bg: '#f4f8f3', panel: 'linear-gradient(135deg,#e4f0e4,#d6e8d8)', ink: '#23332a', accent: '#3f7a52', sub: '#5d7565', band: 'linear-gradient(90deg,#3f7a52,#6bbf86)', dot: '#4f9d69', sw: 'linear-gradient(135deg,#6bbf86,#3f7a52)' },
];

export const SLIDE_ACCENTS: { id: string; c: string; name: string }[] = [
  { id: 'blue', c: '#4a5d8a', name: 'ខៀវ' },
  { id: 'green', c: '#3f7a52', name: 'បៃតង' },
  { id: 'plum', c: '#8a4a7a', name: 'ស្វាយ' },
  { id: 'gold', c: '#c98a2b', name: 'មាស' },
  { id: 'rose', c: '#c0503f', name: 'ផ្កាឈូក' },
];

export const SLIDE_LENGTHS = [
  { id: 'short', name: 'ខ្លី', n: '៣' },
  { id: 'medium', name: 'មធ្យម', n: '៦' },
  { id: 'long', name: 'លម្អិត', n: '១១' },
];

export const SLIDE_GEN_STEPS = [
  'អានខ្លឹមសារមេរៀន',
  'រៀបចំរចនាសម្ព័ន្ធស្លាយ',
  'សរសេរចំណុចសំខាន់ៗ',
  'បង្កើតឧទាហរណ៍',
  'អនុវត្តរចនាបថ',
];

/** Native slide canvas size (16:9). All slide markup is laid out at this size
 *  and scaled by the viewer / thumbnails / present mode. */
export const SLIDE_W = 880;
export const SLIDE_H = 495;

/** Resolve a theme, applying an optional accent-colour override. */
export function resolveTheme(themeId: string, accentId: string): Theme {
  const base = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const a = SLIDE_ACCENTS.find((x) => x.id === accentId);
  if (!a) return base;
  return {
    ...base,
    accent: a.c,
    dot: a.c,
    band: `linear-gradient(90deg,${a.c},${a.c}cc)`,
    sw: `linear-gradient(135deg,${a.c},${a.c}cc)`,
  };
}

// ─── Slide backgrounds (abstract presets + gradients + image) ──────
export type SlideBg =
  | { type: 'abstract'; value: string }
  | { type: 'gradient'; value: string }
  | { type: 'image'; value: string };

/** Curated, vivid colour gradients (Gamma-style full-bleed fills). Independent
 *  of the slide theme; a readability scrim keeps theme-coloured text legible. */
export const GRADIENTS: { id: string; name: string; css: string }[] = [
  { id: 'sunrise', name: 'ព្រឹក', css: 'linear-gradient(135deg,#ffe7ba 0%,#ffb88c 48%,#ff8aa0 100%)' },
  { id: 'sky', name: 'មេឃ', css: 'linear-gradient(135deg,#a8edea 0%,#86a8e7 55%,#b5a7f5 100%)' },
  { id: 'leaf', name: 'ស្លឹក', css: 'linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)' },
  { id: 'bloom', name: 'ផ្ការីក', css: 'linear-gradient(135deg,#ffd1dc 0%,#ffaeb9 52%,#ffc3a0 100%)' },
  { id: 'lavender', name: 'ស្វាយ', css: 'linear-gradient(135deg,#e0c3fc 0%,#8ec5fc 100%)' },
  { id: 'sand', name: 'ខ្សាច់', css: 'linear-gradient(135deg,#f6e6c7 0%,#e7c8a0 100%)' },
  { id: 'dusk', name: 'ល្ងាច', css: 'linear-gradient(135deg,#5b6ab0 0%,#8a5bb0 55%,#b05b8e 100%)' },
  { id: 'forest', name: 'ព្រៃ', css: 'linear-gradient(135deg,#234b3b 0%,#3f7a52 60%,#6bbf86 100%)' },
];

export function gradientById(id: string) {
  return GRADIENTS.find((g) => g.id === id);
}

function wavesSvg(a: string) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495'><path d='M0 360 C 220 300 380 430 600 370 S 880 350 880 395 L880 495 L0 495 Z' fill='${a}' opacity='0.10'/><path d='M0 410 C 250 360 430 470 660 415 S 880 405 880 440 L880 495 L0 495 Z' fill='${a}' opacity='0.17'/></svg>`;
}
function blobsSvg(a: string, b: string) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495'><defs><filter id='b' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='55'/></filter></defs><g filter='url(#b)'><circle cx='120' cy='80' r='190' fill='${a}' opacity='0.16'/><circle cx='810' cy='440' r='230' fill='${b}' opacity='0.15'/></g></svg>`;
}
function svgUrl(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Professional, theme-aware abstract backgrounds. Each returns inline-style
 *  props layered over the slide's base colour. */
export const ABSTRACTS: { id: string; name: string; css: (t: Theme) => Record<string, string> }[] = [
  { id: 'aurora', name: 'រស្មី', css: (t) => ({ background: `radial-gradient(70% 90% at 6% -12%, ${t.accent}38, transparent 60%), radial-gradient(64% 84% at 106% 112%, ${t.dot}30, transparent 56%), ${t.bg}` }) },
  { id: 'mesh', name: 'Mesh', css: (t) => ({ background: `radial-gradient(42% 52% at 0% 0%, ${t.accent}30, transparent), radial-gradient(42% 52% at 100% 0%, ${t.dot}28, transparent), radial-gradient(54% 64% at 50% 122%, ${t.accent}28, transparent), ${t.bg}` }) },
  { id: 'glow', name: 'ពន្លឺ', css: (t) => ({ background: `radial-gradient(95% 130% at 102% -8%, ${t.accent}40, transparent 56%), ${t.bg}` }) },
  { id: 'spotlight', name: 'Spotlight', css: (t) => ({ background: `radial-gradient(58% 70% at 50% 26%, ${t.accent}26, transparent 70%), ${t.bg}` }) },
  { id: 'bands', name: 'ឆ្នូត', css: (t) => ({ background: `repeating-linear-gradient(135deg, ${t.accent}12 0 2px, transparent 2px 30px), ${t.bg}` }) },
  { id: 'grid', name: 'ក្រឡា', css: (t) => ({ backgroundColor: t.bg, backgroundImage: `linear-gradient(${t.accent}16 1px, transparent 1px), linear-gradient(90deg, ${t.accent}16 1px, transparent 1px)`, backgroundSize: '44px 44px' }) },
  { id: 'waves', name: 'រលក', css: (t) => ({ backgroundColor: t.bg, backgroundImage: svgUrl(wavesSvg(t.accent)), backgroundSize: 'cover', backgroundPosition: 'bottom' }) },
  { id: 'blobs', name: 'Blob', css: (t) => ({ backgroundColor: t.bg, backgroundImage: svgUrl(blobsSvg(t.accent, t.dot)), backgroundSize: 'cover' }) },
  { id: 'corner', name: 'ជ្រុង', css: (t) => ({ background: `radial-gradient(82% 82% at 112% 116%, ${t.accent}3a, transparent 58%), radial-gradient(46% 46% at -8% -8%, ${t.dot}24, transparent 60%), ${t.bg}` }) },
  { id: 'duotone', name: 'ពីរពណ៌', css: (t) => ({ background: `linear-gradient(118deg, ${t.accent}1f 0%, transparent 46%), linear-gradient(300deg, ${t.dot}1c 0%, transparent 46%), ${t.bg}` }) },
  { id: 'rays', name: 'កាំរស្មី', css: (t) => ({ backgroundColor: t.bg, backgroundImage: `repeating-conic-gradient(from 0deg at 50% -6%, ${t.accent}12 0deg 5deg, transparent 5deg 13deg)` }) },
];

export function abstractById(id: string) {
  return ABSTRACTS.find((a) => a.id === id);
}

/** Resolve a slide's background into render layers (base colour + overlay + an
 *  optional readability scrim for images). */
export function slideBackground(bg: SlideBg | undefined, theme: Theme): { base: string; layer: Record<string, string>; scrim?: string } {
  if (!bg) return { base: theme.bg, layer: {} };
  const dark = theme.bg === '#241d18';
  // Soft, theme-aware scrim that keeps theme-coloured text legible over a busy
  // fill while preserving most of the colour.
  const imageScrim = dark ? 'linear-gradient(rgba(18,14,10,.55),rgba(18,14,10,.42))' : 'linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.4))';
  const colorScrim = dark ? 'linear-gradient(rgba(18,14,10,.4),rgba(18,14,10,.28))' : 'linear-gradient(rgba(255,255,255,.42),rgba(255,255,255,.28))';
  if (bg.type === 'image') {
    return {
      base: theme.bg,
      layer: { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' },
      scrim: imageScrim,
    };
  }
  if (bg.type === 'gradient') {
    const g = gradientById(bg.value);
    return { base: theme.bg, layer: g ? { backgroundImage: g.css } : {}, scrim: g ? colorScrim : undefined };
  }
  const a = abstractById(bg.value);
  return { base: theme.bg, layer: a ? a.css(theme) : {} };
}

// ─── Deck ──────────────────────────────────────────────────────────
type SlideBase = { no: string; label: string; bg?: SlideBg; notes?: string };
export type Slide = SlideBase &
  (
    | { kind: 'title'; kicker: string; title: string; sub: string; foot: string }
    | { kind: 'list'; title: string; bullets: string[] }
    | { kind: 'two-col'; title: string; bullets: string[] }
    | { kind: 'example'; title: string; steps: string[] }
    | { kind: 'data'; title: string; stats: { num: string; label: string }[] }
    | { kind: 'quote'; quote: string; author: string }
    | { kind: 'timeline'; title: string; steps: string[] }
    | { kind: 'summary'; title: string; sub: string; bullets: string[] }
  );

/** Which slides from the full deck appear for each length preset. */
export const LENGTH_PICK: Record<string, number[]> = {
  short: [0, 1, 10],
  medium: [0, 1, 2, 4, 7, 10],
  long: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

export type DeckInput = {
  subject: string;
  grade: string;
  chapter: Chapter;
  lessonTitle: string;
  length: string;
};

/** Build a teaching deck for the chosen lesson. Slides are renumbered after the
 *  length preset trims the full deck. */
export function buildDeck(input: DeckInput): Slide[] {
  const { subject, grade, chapter, lessonTitle, length } = input;
  const objectives = SAMPLE_OBJECTIVES.map((o) => o.text);

  const full: Slide[] = [
    { kind: 'title', no: '', label: 'ក្រប', kicker: `${subject} · ${grade}`, title: lessonTitle, sub: `ជំពូកទី ${chapter.no} ៖ ${chapter.title}`, foot: `${subject} · ${grade}` },
    { kind: 'list', no: '', label: 'គោលបំណង', title: 'គោលបំណងសិក្សា', bullets: objectives },
    { kind: 'two-col', no: '', label: 'មាតិកា', title: 'ខ្លឹមសារសំខាន់', bullets: ['ណែនាំនិយមន័យ និងគោលគំនិតមូលដ្ឋាន', 'បង្ហាញរូបមន្ត និងលក្ខណៈសំខាន់ៗ', 'ភ្ជាប់ចំណេះដឹងពីមេរៀនមុន', 'ស្វែងយល់ការអនុវត្ត', 'ពិនិត្យ និងវាយតម្លៃ', 'សេចក្ដីសន្និដ្ឋាន'] },
    { kind: 'list', no: '', label: 'គោលគំនិត', title: 'និយមន័យ និងគោលគំនិតស្នូល', bullets: ['ពន្យល់ពាក្យគន្លឹះ និងនិយមន័យសំខាន់ៗ ឲ្យបានច្បាស់លាស់', 'បង្ហាញលក្ខណៈ និងលក្ខខណ្ឌនៃគោលគំនិត', 'លើកឧទាហរណ៍ខ្លីៗ ដើម្បីបញ្ជាក់ការយល់ដឹង'] },
    { kind: 'example', no: '', label: 'ឧទាហរណ៍', title: 'ឧទាហរណ៍អនុវត្ត', steps: [`ចំណោទ ៖ ដោះស្រាយបញ្ហាគំរូទាក់ទងនឹង ${lessonTitle}`, 'ដំណើរការ ៖ វិភាគ → ជ្រើសរូបមន្ត → គណនា', 'លទ្ធផល ៖ ផ្ទៀងផ្ទាត់ចម្លើយ និងសន្និដ្ឋាន'] },
    { kind: 'data', no: '', label: 'ស្ថិតិ', title: 'ចំណុចទិន្នន័យសំខាន់', stats: [{ num: '៩០%', label: 'អត្រាប្រសិទ្ធភាពការសិក្សា' }, { num: 'TP', label: 'ចំណុចជំហានស្នូល' }, { num: 'A+', label: 'ប្រព័ន្ធវាយតម្លៃ' }, { num: 'x²', label: 'រូបមន្តគន្លឹះ' }] },
    { kind: 'quote', no: '', label: 'ពាក្យស្នូល', quote: `«${lessonTitle} គឺជាមូលដ្ឋានសំខាន់ដែលត្រូវភ្ជាប់ទ្រឹស្ដី និងការអនុវត្ត»`, author: '— គ្រូសន្ធានគំនិតខ្មែរ' },
    { kind: 'timeline', no: '', label: 'ដំណាក់កាល', title: 'ដំណាក់កាលសំខាន់', steps: ['ការស្ដាប់', 'ការយល់ដឹង', 'ការអនុវត្ត', 'ការវាយតម្លៃ'] },
    { kind: 'list', no: '', label: 'ពិភាក្សា', title: 'សំណួរ និងការពិភាក្សា', bullets: ['តើគោលគំនិតនេះអនុវត្តក្នុងជីវិតប្រចាំថ្ងៃយ៉ាងណា?', 'ចែកក្រុមពិភាក្សា រួចបង្ហាញចម្លើយ', 'គ្រូសង្ខេប និងបំពេញបន្ថែម'] },
    { kind: 'list', no: '', label: 'ការអនុវត្ត', title: 'ការអនុវត្ត និងលំហាត់', bullets: ['ធ្វើលំហាត់គំរូជាមួយគ្នា', 'ដោះស្រាយលំហាត់ផ្ទាល់ខ្លួន', 'ពិនិត្យចម្លើយ និងកែតម្រូវ'] },
    { kind: 'summary', no: '', label: 'សង្ខេប', title: 'សង្ខេប', sub: 'ការសិក្សាថ្ងៃនេះបានបញ្ចប់ • ត្រៀមមេរៀនបន្ទាប់', bullets: ['រំលឹកគោលគំនិត', 'កិច្ចការផ្ទះ', 'ត្រៀមមេរៀនបន្ទាប់'] },
  ];

  const pick = LENGTH_PICK[length] || LENGTH_PICK.medium;
  return renumber(pick.map((i) => full[i]));
}

// ─── Editing (Phase B) ─────────────────────────────────────────────
// The deck becomes editable state once generated. These helpers keep slide
// numbering, layout conversion, and inline-text edits pure + testable.

/** Slide kinds offered in the "add slide" / "change layout" pickers. */
export const SLIDE_KINDS: { id: Slide['kind']; name: string }[] = [
  { id: 'title', name: 'ក្រប' },
  { id: 'list', name: 'បញ្ជី' },
  { id: 'two-col', name: '២ ជួរ' },
  { id: 'example', name: 'ជំហាន' },
  { id: 'timeline', name: 'Timeline' },
  { id: 'data', name: 'ស្ថិតិ' },
  { id: 'quote', name: 'ដកស្រង់' },
  { id: 'summary', name: 'សង្ខេប' },
];

/** Re-apply sequential zero-padded Khmer numbers after any structural change. */
export function renumber(deck: Slide[]): Slide[] {
  return deck.map((s, i) => ({ ...s, no: toKh(String(i + 1).padStart(2, '0')) }));
}

/** The slide's headline (the quote, for a quote slide). */
export function slideTitle(s: Slide): string {
  return s.kind === 'quote' ? s.quote : s.title;
}

/** The slide's editable body lines, normalised across kinds. */
export function slideLines(s: Slide): string[] {
  switch (s.kind) {
    case 'list':
    case 'two-col':
    case 'summary':
      return s.bullets;
    case 'example':
    case 'timeline':
      return s.steps;
    case 'data':
      return s.stats.map((x) => x.label);
    case 'quote':
      return [s.quote];
    case 'title':
      return [s.sub];
  }
}

/** A starter slide of the given kind (unnumbered — caller renumbers). */
export function blankSlide(kind: Slide['kind']): Slide {
  switch (kind) {
    case 'title':
      return { kind, no: '', label: 'ក្រប', kicker: 'មុខវិជ្ជា · ថ្នាក់', title: 'ចំណងជើងស្លាយ', sub: 'ចំណងជើងរង', foot: '' };
    case 'list':
      return { kind, no: '', label: 'បញ្ជី', title: 'ចំណងជើង', bullets: ['ចំណុចទី១', 'ចំណុចទី២', 'ចំណុចទី៣'] };
    case 'two-col':
      return { kind, no: '', label: 'មាតិកា', title: 'ចំណងជើង', bullets: ['ចំណុចទី១', 'ចំណុចទី២', 'ចំណុចទី៣', 'ចំណុចទី៤'] };
    case 'example':
      return { kind, no: '', label: 'ឧទាហរណ៍', title: 'ចំណងជើង', steps: ['ជំហានទី១', 'ជំហានទី២', 'ជំហានទី៣'] };
    case 'timeline':
      return { kind, no: '', label: 'ដំណាក់កាល', title: 'ចំណងជើង', steps: ['ដំណាក់១', 'ដំណាក់២', 'ដំណាក់៣', 'ដំណាក់៤'] };
    case 'data':
      return { kind, no: '', label: 'ស្ថិតិ', title: 'ចំណងជើង', stats: [{ num: '០%', label: 'ស្លាក' }, { num: '០', label: 'ស្លាក' }, { num: 'A', label: 'ស្លាក' }, { num: 'x', label: 'ស្លាក' }] };
    case 'quote':
      return { kind, no: '', label: 'ដកស្រង់', quote: '«សរសេរសម្រង់នៅទីនេះ»', author: '— អ្នកនិពន្ធ' };
    case 'summary':
      return { kind, no: '', label: 'សង្ខេប', title: 'សង្ខេប', sub: 'សេចក្ដីសង្ខេប', bullets: ['ចំណុច១', 'ចំណុច២', 'ចំណុច៣'] };
  }
}

/** Convert a slide to another layout, carrying over title + body lines + bg + notes. */
export function convertSlide(s: Slide, kind: Slide['kind']): Slide {
  if (s.kind === kind) return s;
  const no = s.no;
  const bg = s.bg;
  const notes = s.notes;
  const title = slideTitle(s) || 'ចំណងជើង';
  const lines = slideLines(s).filter(Boolean);
  const take = (n: number, fb: string[]) => {
    const r = lines.slice(0, n);
    return r.length ? r : fb;
  };
  const out = ((): Slide => {
  switch (kind) {
    case 'title':
      return { kind, no, label: 'ក្រប', kicker: '', title, sub: lines[0] || '', foot: '' };
    case 'list':
      return { kind, no, label: 'បញ្ជី', title, bullets: take(6, ['ចំណុចទី១']) };
    case 'two-col':
      return { kind, no, label: 'មាតិកា', title, bullets: take(6, ['ចំណុចទី១', 'ចំណុចទី២']) };
    case 'example':
      return { kind, no, label: 'ឧទាហរណ៍', title, steps: take(5, ['ជំហានទី១']) };
    case 'timeline':
      return { kind, no, label: 'ដំណាក់កាល', title, steps: take(5, ['ដំណាក់១']) };
    case 'data':
      return { kind, no, label: 'ស្ថិតិ', title, stats: take(4, ['ស្លាក']).map((l, i) => ({ num: ['៩០%', 'x', 'A+', '#'][i] || '•', label: l })) };
    case 'quote':
      return { kind, no, label: 'ដកស្រង់', quote: title, author: '—' };
    case 'summary':
      return { kind, no, label: 'សង្ខេប', title, sub: lines[0] || '', bullets: take(3, ['ចំណុច១']) };
  }
  })();
  const merged = bg ? { ...out, bg } : out;
  return notes ? { ...merged, notes } : merged;
}

export type EditField = 'title' | 'sub' | 'kicker' | 'foot' | 'quote' | 'author' | 'bullet' | 'step' | 'statNum' | 'statLabel';
export type EditPatch = { field: EditField; index?: number; value: string };

/** Apply an inline-text edit, returning a new slide (no mutation). */
export function applyEdit(s: Slide, patch: EditPatch): Slide {
  const { field, index = 0, value } = patch;
  const at = <T,>(arr: T[], make: (cur: T) => T) => arr.map((x, i) => (i === index ? make(x) : x));
  switch (field) {
    case 'title':
      return s.kind === 'quote' ? s : ({ ...s, title: value } as Slide);
    case 'sub':
      return s.kind === 'title' || s.kind === 'summary' ? { ...s, sub: value } : s;
    case 'kicker':
      return s.kind === 'title' ? { ...s, kicker: value } : s;
    case 'foot':
      return s.kind === 'title' ? { ...s, foot: value } : s;
    case 'quote':
      return s.kind === 'quote' ? { ...s, quote: value } : s;
    case 'author':
      return s.kind === 'quote' ? { ...s, author: value } : s;
    case 'bullet':
      return 'bullets' in s ? ({ ...s, bullets: at(s.bullets, () => value) } as Slide) : s;
    case 'step':
      return 'steps' in s ? ({ ...s, steps: at(s.steps, () => value) } as Slide) : s;
    case 'statNum':
      return s.kind === 'data' ? { ...s, stats: at(s.stats, (x) => ({ ...x, num: value })) } : s;
    case 'statLabel':
      return s.kind === 'data' ? { ...s, stats: at(s.stats, (x) => ({ ...x, label: value })) } : s;
    default:
      return s;
  }
}

/** Kinds whose body is a list of editable lines that can grow / shrink. */
export function lineKind(s: Slide): 'bullets' | 'steps' | 'stats' | null {
  if ('bullets' in s) return 'bullets';
  if ('steps' in s) return 'steps';
  if (s.kind === 'data') return 'stats';
  return null;
}

const MAX_LINES: Record<string, number> = { bullets: 8, steps: 6, stats: 5 };

/** Insert a blank line after `index` (clamped to the kind's max). */
export function addLine(s: Slide, index: number): Slide {
  const k = lineKind(s);
  if (!k) return s;
  if (k === 'stats' && s.kind === 'data') {
    if (s.stats.length >= MAX_LINES.stats) return s;
    const stats = [...s.stats];
    stats.splice(index + 1, 0, { num: '០', label: 'ស្លាក' });
    return { ...s, stats };
  }
  const arr = (s as unknown as Record<string, string[]>)[k];
  if (arr.length >= (MAX_LINES[k] ?? 8)) return s;
  const next = [...arr];
  next.splice(index + 1, 0, 'ចំណុចថ្មី');
  return { ...s, [k]: next } as Slide;
}

/** Remove the line at `index` (keeps at least one line). */
export function removeLine(s: Slide, index: number): Slide {
  const k = lineKind(s);
  if (!k) return s;
  if (k === 'stats' && s.kind === 'data') {
    if (s.stats.length <= 1) return s;
    return { ...s, stats: s.stats.filter((_, i) => i !== index) };
  }
  const arr = (s as unknown as Record<string, string[]>)[k];
  if (arr.length <= 1) return s;
  return { ...s, [k]: arr.filter((_, i) => i !== index) } as Slide;
}
