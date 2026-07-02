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
  { id: 'sunset', name: 'ថ្ងៃលិច', bg: '#fff8f2', panel: 'linear-gradient(135deg,#ffe1c7,#ffc7a3)', ink: '#3a2417', accent: '#d1521f', sub: '#9c7457', band: 'linear-gradient(90deg,#d1521f,#f0803f,#f7ab5c)', dot: '#f0803f', sw: 'linear-gradient(135deg,#f7ab5c,#d1521f)' },
  { id: 'ocean', name: 'សមុទ្រជ្រៅ', bg: '#f2f8fa', panel: 'linear-gradient(135deg,#d6ecf2,#bcdde8)', ink: '#152a33', accent: '#146b82', sub: '#4f7986', band: 'linear-gradient(90deg,#0f4c5c,#146b82,#3f9cb3)', dot: '#146b82', sw: 'linear-gradient(135deg,#3f9cb3,#0f4c5c)' },
  { id: 'royal', name: 'ស្វាយ', bg: '#faf7fd', panel: 'linear-gradient(135deg,#e6d9f5,#d6c1ec)', ink: '#2a1f38', accent: '#6b3fa0', sub: '#7d6b93', band: 'linear-gradient(90deg,#4d2b7a,#6b3fa0,#9166c4)', dot: '#6b3fa0', sw: 'linear-gradient(135deg,#9166c4,#4d2b7a)' },
  { id: 'rose', name: 'ផ្កាកុលាប', bg: '#fdf6f6', panel: 'linear-gradient(135deg,#f6dde0,#f0c6cb)', ink: '#3a2124', accent: '#b8425a', sub: '#976c74', band: 'linear-gradient(90deg,#96324a,#b8425a,#d97a8c)', dot: '#b8425a', sw: 'linear-gradient(135deg,#d97a8c,#96324a)' },
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

// ─── Scene artwork (curated illustrated backgrounds) ───────────────
// Fixed, vivid compositions — unlike ABSTRACTS these aren't theme-tinted,
// they're standalone illustrations (Memphis dots, wave mesh, poster blob,
// organic tide). Applied as an `image` background so the existing
// readability scrim keeps slide text legible over the busier artwork.
function svgDataUri(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function memphisScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <defs>
      <linearGradient id='m1' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#c7b7fb'/><stop offset='100%' stop-color='#f3b8e6'/></linearGradient>
      <pattern id='mdots' width='13' height='13' patternUnits='userSpaceOnUse'><circle cx='2' cy='2' r='1.3' fill='#8f7fd6' opacity='.55'/></pattern>
    </defs>
    <rect width='880' height='495' fill='#faf9ff'/>
    <rect x='-20' y='-20' width='190' height='190' fill='url(#mdots)'/>
    <rect x='714' y='330' width='186' height='185' fill='url(#mdots)'/>
    <path d='M30 90 Q 210 20 380 110 T 720 70' stroke='#a78bfa' stroke-width='1.6' fill='none' opacity='.45'/>
    <circle cx='118' cy='250' r='50' fill='url(#m1)'/>
    <circle cx='792' cy='118' r='34' fill='url(#m1)' opacity='.9'/>
    <circle cx='806' cy='400' r='26' fill='url(#m1)' opacity='.85'/>
    <g stroke='#a78bfa' stroke-width='1.4' fill='none' opacity='.5'>
      <circle cx='214' cy='392' r='7'/><circle cx='214' cy='418' r='7'/><circle cx='214' cy='444' r='7'/>
    </g>
    <rect x='606' y='56' width='150' height='24' rx='12' fill='none' stroke='#a78bfa' stroke-width='1.4' opacity='.4'/>
  </svg>`;
}

function waveMeshScene(): string {
  const lines = Array.from({ length: 16 }, (_, i) => {
    const y = 20 + i * 7.5;
    const o = (0.12 + i * 0.018).toFixed(2);
    return `<path d='M470 ${y} C 610 ${y - 34}, 700 ${y + 46}, 880 ${y - 12}' stroke='#ffffff' stroke-width='1' fill='none' opacity='${o}'/>`;
  }).join('');
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <defs>
      <linearGradient id='w1' x1='0' y1='1' x2='1' y2='0'><stop offset='0%' stop-color='#7c93c9'/><stop offset='55%' stop-color='#e2a3a0'/><stop offset='100%' stop-color='#ef7f5f'/></linearGradient>
      <pattern id='wgrid' width='15' height='15' patternUnits='userSpaceOnUse'><path d='M15 0H0V15' fill='none' stroke='#5b6a8f' stroke-width='.6' opacity='.6'/></pattern>
      <clipPath id='wclip'><circle cx='58' cy='58' r='58'/></clipPath>
    </defs>
    <rect width='880' height='495' fill='url(#w1)'/>
    ${lines}
    <rect x='0' y='0' width='116' height='116' fill='url(#wgrid)' clip-path='url(#wclip)' opacity='.6'/>
    <rect x='18' y='400' width='150' height='22' rx='11' fill='none' stroke='#ffffff' stroke-width='1' opacity='.55'/>
  </svg>`;
}

function posterScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <defs>
      <linearGradient id='p1' x1='0' y1='1' x2='1' y2='0'><stop offset='0%' stop-color='#3552c9'/><stop offset='55%' stop-color='#6d4fd1'/><stop offset='100%' stop-color='#b34fd1'/></linearGradient>
      <linearGradient id='p2' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#e879c9'/><stop offset='100%' stop-color='#7c6cff'/></linearGradient>
    </defs>
    <rect width='880' height='495' fill='url(#p1)'/>
    <path d='M560 470 C 500 400 520 330 590 280 C 670 225 690 150 630 60 C 700 130 730 220 660 300 C 600 360 610 420 660 470 Z' fill='url(#p2)' opacity='.55'/>
    <line x1='70' y1='430' x2='190' y2='320' stroke='#ffffff' stroke-width='1' opacity='.5'/>
    <polyline points='40,470 60,450 55,430 75,415' fill='none' stroke='#ffffff' stroke-width='1' opacity='.5'/>
    <rect x='700' y='40' width='150' height='6' rx='3' fill='#ffffff' opacity='.7'/>
    <rect x='700' y='52' width='110' height='6' rx='3' fill='#ffffff' opacity='.4'/>
  </svg>`;
}

function organicScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <defs>
      <linearGradient id='o1' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#38b6d9'/><stop offset='100%' stop-color='#2f5fe0'/></linearGradient>
      <linearGradient id='o2' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#5fd0c8'/><stop offset='100%' stop-color='#3d8fe0'/></linearGradient>
    </defs>
    <rect width='880' height='495' fill='#dcf0fb'/>
    <path d='M0 40 C 60 -10 130 20 118 80 C 106 140 40 170 0 150 Z' fill='url(#o2)'/>
    <path d='M120 150 L 195 90' stroke='url(#o1)' stroke-width='26' stroke-linecap='round'/>
    <path d='M60 250 L 110 205' stroke='url(#o1)' stroke-width='18' stroke-linecap='round'/>
    <circle cx='34' cy='190' r='13' fill='url(#o1)'/>
    <path d='M880 300 C 830 260 850 220 900 235 C 940 250 930 320 890 330 Z' fill='url(#o2)'/>
    <path d='M760 300 L 840 340' stroke='url(#o1)' stroke-width='22' stroke-linecap='round'/>
    <circle cx='700' cy='330' r='11' fill='url(#o1)'/>
    <path d='M120 470 Q 220 410 300 470 T 480 460' stroke='url(#o2)' stroke-width='34' fill='none' stroke-linecap='round' opacity='.9'/>
  </svg>`;
}

export const SCENES: { id: string; name: string; dataUrl: string }[] = [
  { id: 'memphis', name: 'Memphis', dataUrl: svgDataUri(memphisScene()) },
  { id: 'wavemesh', name: 'រលកលាយ', dataUrl: svgDataUri(waveMeshScene()) },
  { id: 'poster', name: 'ផ្ទាំងប៉ូស្ទ័រ', dataUrl: svgDataUri(posterScene()) },
  { id: 'organic', name: 'សរីរាង្គ', dataUrl: svgDataUri(organicScene()) },
];

export function sceneById(id: string) {
  return SCENES.find((s) => s.id === id);
}

// ─── Icon accents (curated glyph backgrounds) ───────────────────────
// A large centered line-art icon over a soft colour blob — same `image`
// background mechanism as SCENES, just simpler/more graphic. Fixed palettes
// (not theme-tinted), one distinct colourway per icon for variety.
function iconScene(inner: string, blobA: string, blobB: string, stroke: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <defs>
      <radialGradient id='ib' cx='50%' cy='50%' r='62%'>
        <stop offset='0%' stop-color='${blobA}'/>
        <stop offset='100%' stop-color='${blobB}'/>
      </radialGradient>
    </defs>
    <rect width='880' height='495' fill='#faf9f6'/>
    <circle cx='440' cy='247' r='150' fill='url(#ib)'/>
    <g transform='translate(380,187) scale(5)' stroke='${stroke}' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'>
      ${inner}
    </g>
  </svg>`;
}

const ICON_DEFS: { id: string; name: string; blobA: string; blobB: string; stroke: string; inner: string }[] = [
  { id: 'grad-cap', name: 'បញ្ចប់ការសិក្សា', blobA: '#dbe9ff', blobB: '#a9c6ff', stroke: '#2c4a8a', inner: `<path d='M2 10 L12 5 L22 10 L12 15 Z'/><path d='M6 12 v5 c0 1.5 3 3 6 3 s6 -1.5 6 -3 v-5'/><path d='M22 10 v6'/>` },
  { id: 'idea', name: 'គំនិត', blobA: '#fff3c4', blobB: '#ffdd77', stroke: '#a3720a', inner: `<path d='M9 18 h6'/><path d='M10 21 h4'/><path d='M12 3 a6 6 0 0 0 -3 11 c1 1 1 2 1 3 h4 c0 -1 0 -2 1 -3 a6 6 0 0 0 -3 -11 Z'/>` },
  { id: 'book', name: 'សៀវភៅ', blobA: '#e3f5e0', blobB: '#b9e6ae', stroke: '#2f6b3f', inner: `<path d='M12 6 c-2 -2 -6 -2 -9 -1 v13 c3 -1 7 -1 9 1 c2 -2 6 -2 9 -1 v-13 c-3 -1 -7 -1 -9 1 Z'/><path d='M12 6 v13'/>` },
  { id: 'target', name: 'គោលដៅ', blobA: '#ffe1d6', blobB: '#ffb199', stroke: '#a83c1f', inner: `<circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='5.4'/><circle cx='12' cy='12' r='1.6' fill='#a83c1f'/>` },
  { id: 'star', name: 'ផ្កាយ', blobA: '#f0e3ff', blobB: '#d5b3ff', stroke: '#6b3fa0', inner: `<path d='M12 2 L14.8 8.6 L22 9.3 L16.7 14.1 L18.2 21 L12 17.3 L5.8 21 L7.3 14.1 L2 9.3 L9.2 8.6 Z'/>` },
  { id: 'trophy', name: 'ពានរង្វាន់', blobA: '#fff0c2', blobB: '#ffd35c', stroke: '#96690a', inner: `<path d='M7 4 h10 v5 a5 5 0 0 1 -10 0 Z'/><path d='M7 5 H3 v2 a4 4 0 0 0 4 4'/><path d='M17 5 h4 v2 a4 4 0 0 1 -4 4'/><path d='M12 14 v4'/><path d='M8 21 h8'/><path d='M9 18 h6 l1 3 h-8 Z'/>` },
  { id: 'check-badge', name: 'ត្រឹមត្រូវ', blobA: '#d7f5f0', blobB: '#a3e6d9', stroke: '#146b5c', inner: `<path d='M12 2 L14.5 4.2 L17.8 3.6 L18.6 6.8 L21.5 8.5 L20 11.5 L21.5 14.5 L18.6 16.2 L17.8 19.4 L14.5 18.8 L12 21 L9.5 18.8 L6.2 19.4 L5.4 16.2 L2.5 14.5 L4 11.5 L2.5 8.5 L5.4 6.8 L6.2 3.6 L9.5 4.2 Z'/><path d='M8.5 12 l2.5 2.5 l4.5 -5'/>` },
  { id: 'rocket', name: 'ចរឿនលឿន', blobA: '#ffe3f0', blobB: '#ffb3d1', stroke: '#a8305f', inner: `<path d='M12 2 c3 2 5 6 5 10 c0 2 -1 4 -2 5 l-6 0 c-1 -1 -2 -3 -2 -5 c0 -4 2 -8 5 -10 Z'/><circle cx='12' cy='9' r='1.6'/><path d='M9 15 l-3 5'/><path d='M15 15 l3 5'/><path d='M10 20 h4'/>` },
];

export const ICONS: { id: string; name: string; dataUrl: string }[] = ICON_DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  dataUrl: svgDataUri(iconScene(d.inner, d.blobA, d.blobB, d.stroke)),
}));

export function iconById(id: string) {
  return ICONS.find((i) => i.id === id);
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

// ─── Content illustrations (curated images for the 'media' slide kind) ─────
// Flat-style scene illustrations, same svgDataUri() mechanism as SCENES, but
// composed to work as a *content* image (via MediaImageMenu) rather than a
// full-slide background — cropped with objectFit:cover wherever they're used.
function classroomScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#fdf6ec'/>
    <rect x='60' y='40' width='400' height='150' rx='10' fill='#3f7a52'/>
    <rect x='84' y='64' width='150' height='8' rx='4' fill='#eaf4e6' opacity='.85'/>
    <rect x='84' y='86' width='230' height='8' rx='4' fill='#eaf4e6' opacity='.6'/>
    <rect x='84' y='108' width='190' height='8' rx='4' fill='#eaf4e6' opacity='.6'/>
    ${[0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => {
      const x = 90 + col * 175;
      const y = 260 + row * 78;
      return `<rect x='${x}' y='${y}' width='120' height='16' rx='4' fill='#d2703f' opacity='.85'/><rect x='${x + 14}' y='${y + 16}' width='14' height='40' fill='#e0a45a' opacity='.7'/><rect x='${x + 92}' y='${y + 16}' width='14' height='40' fill='#e0a45a' opacity='.7'/>`;
    }).join('')).join('')}
  </svg>`;
}

function bookStackScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#faf6ff'/>
    <g transform='translate(340,120)'>
      <rect x='0' y='260' width='260' height='34' rx='6' fill='#8a4a7a'/>
      <rect x='14' y='218' width='232' height='34' rx='6' fill='#6d5bf0' transform='rotate(-2 130 235)'/>
      <rect x='4' y='176' width='250' height='34' rx='6' fill='#c98a2b'/>
      <rect x='20' y='134' width='214' height='34' rx='6' fill='#3f7a52' transform='rotate(2 130 151)'/>
      <rect x='96' y='40' width='70' height='94' rx='6' fill='#c0503f'/>
      <circle cx='131' cy='72' r='14' fill='#faf6ff' opacity='.85'/>
    </g>
  </svg>`;
}

function teamworkScene(): string {
  const person = (cx: number, y: number, fill: string) => `<circle cx='${cx}' cy='${y}' r='30' fill='${fill}'/><path d='M${cx - 46} ${y + 120} a46 66 0 0 1 92 0 Z' fill='${fill}'/>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#f2f8fa'/>
    ${person(230, 260, '#146b82')}
    ${person(440, 240, '#c98a2b')}
    ${person(650, 260, '#8a4a7a')}
    <path d='M300 220 Q 340 160 400 190' stroke='#146b82' stroke-width='2' fill='none' stroke-dasharray='6 8' opacity='.6'/>
    <path d='M500 190 Q 560 160 590 220' stroke='#8a4a7a' stroke-width='2' fill='none' stroke-dasharray='6 8' opacity='.6'/>
    <g transform='translate(400,60)'>
      <rect width='160' height='70' rx='16' fill='#ffffff' stroke='#146b82' stroke-width='2'/>
      <path d='M50 70 l14 20 l14 -20 Z' fill='#ffffff' stroke='#146b82' stroke-width='2'/>
      <rect x='20' y='22' width='120' height='8' rx='4' fill='#146b82' opacity='.5'/>
      <rect x='20' y='40' width='80' height='8' rx='4' fill='#146b82' opacity='.3'/>
    </g>
  </svg>`;
}

function scienceScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#eefaf3'/>
    <g transform='translate(340,60)'>
      <path d='M60 0 h80 v70 l70 150 a30 30 0 0 1 -28 42 h-164 a30 30 0 0 1 -28 -42 l70 -150 Z' fill='#ffffff' stroke='#3f7a52' stroke-width='4'/>
      <path d='M38 190 a30 30 0 0 0 -0.4 20 h164 a30 30 0 0 0 -0.4 -20 Z' fill='#6bbf86'/>
      <rect x='55' y='0' width='90' height='16' rx='4' fill='#3f7a52'/>
      <circle cx='80' cy='150' r='9' fill='#3f9d6b' opacity='.7'/>
      <circle cx='120' cy='170' r='6' fill='#3f9d6b' opacity='.6'/>
      <circle cx='150' cy='140' r='5' fill='#3f9d6b' opacity='.5'/>
      <circle cx='95' cy='210' r='30' fill='none' stroke='#3f9d6b' stroke-width='2' opacity='.35'/>
    </g>
    <circle cx='680' cy='120' r='16' fill='#ffdd77' opacity='.8'/>
    <circle cx='150' cy='380' r='22' fill='#a9c6ff' opacity='.7'/>
  </svg>`;
}

function mathScene(): string {
  const sym = (x: number, y: number, s: number, ch: string, fill: string, rot = 0) => `<text x='${x}' y='${y}' font-family='Georgia,serif' font-size='${s}' fill='${fill}' opacity='.85' text-anchor='middle' transform='rotate(${rot} ${x} ${y})'>${ch}</text>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#f4f0ff'/>
    ${sym(150, 160, 120, '+', '#6d5bf0', -8)}
    ${sym(340, 340, 110, '%', '#8a4a7a', 6)}
    ${sym(560, 150, 130, '=', '#146b82', -4)}
    ${sym(740, 360, 120, 'π', '#c98a2b', 0)}
    ${sym(700, 130, 90, '√', '#c0503f', 10)}
    <circle cx='440' cy='247' r='150' fill='none' stroke='#6d5bf0' stroke-width='2' stroke-dasharray='4 10' opacity='.35'/>
  </svg>`;
}

function laptopScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#f2f4fb'/>
    <g transform='translate(240,120)'>
      <rect x='0' y='0' width='400' height='250' rx='16' fill='#2c4a8a'/>
      <rect x='16' y='16' width='368' height='218' rx='6' fill='#eaf0ff'/>
      <rect x='40' y='170' width='40' height='40' fill='#a9c6ff'/>
      <rect x='96' y='140' width='40' height='70' fill='#6d5bf0'/>
      <rect x='152' y='110' width='40' height='100' fill='#3f9d6b'/>
      <rect x='208' y='150' width='40' height='60' fill='#c98a2b'/>
      <rect x='40' y='40' width='200' height='10' rx='5' fill='#2c4a8a' opacity='.5'/>
      <path d='M-40 250 h480 l-40 46 h-400 Z' fill='#3a5aa8'/>
    </g>
  </svg>`;
}

function presentationScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#fff5ea'/>
    <g transform='translate(260,50)'>
      <rect x='0' y='0' width='380' height='260' rx='12' fill='#ffffff' stroke='#d1521f' stroke-width='4'/>
      <rect x='24' y='24' width='140' height='12' rx='6' fill='#d1521f' opacity='.7'/>
      <rect x='40' y='190' width='36' height='50' fill='#f0803f'/>
      <rect x='100' y='150' width='36' height='90' fill='#d1521f'/>
      <rect x='160' y='110' width='36' height='130' fill='#f7ab5c'/>
      <rect x='220' y='170' width='36' height='70' fill='#f0803f'/>
      <path d='M-30 260 l30 100 h420 l30 -100 Z' fill='#e6dccb'/>
      <path d='M180 260 v40' stroke='#a3855e' stroke-width='10'/>
    </g>
    <circle cx='740' cy='400' r='24' fill='#d1521f' opacity='.85'/>
  </svg>`;
}

function bulbBigScene(): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='495' viewBox='0 0 880 495'>
    <rect width='880' height='495' fill='#fffaeb'/>
    <g stroke='#c98a2b' stroke-width='4' opacity='.5'>
      <line x1='440' y1='30' x2='440' y2='70'/>
      <line x1='280' y1='75' x2='310' y2='100'/>
      <line x1='600' y1='75' x2='570' y2='100'/>
      <line x1='240' y1='190' x2='280' y2='190'/>
      <line x1='640' y1='190' x2='600' y2='190'/>
    </g>
    <g transform='translate(340,90)'>
      <path d='M100 0 a100 100 0 0 0 -40 190 c14 14 14 26 14 40 h52 c0 -14 0 -26 14 -40 a100 100 0 0 0 -40 -190 Z' fill='#ffdd77' stroke='#c98a2b' stroke-width='4'/>
      <rect x='62' y='230' width='76' height='16' rx='6' fill='#a3720a'/>
      <rect x='68' y='252' width='64' height='14' rx='6' fill='#a3720a' opacity='.7'/>
      <path d='M76 130 l24 -50 l-14 0 l30 -50' fill='none' stroke='#a3720a' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/>
    </g>
  </svg>`;
}

export const ILLUSTRATIONS: { id: string; name: string; dataUrl: string }[] = [
  { id: 'classroom', name: 'ថ្នាក់រៀន', dataUrl: svgDataUri(classroomScene()) },
  { id: 'books', name: 'ជង់សៀវភៅ', dataUrl: svgDataUri(bookStackScene()) },
  { id: 'teamwork', name: 'ការងារជាក្រុម', dataUrl: svgDataUri(teamworkScene()) },
  { id: 'science', name: 'វិទ្យាសាស្ត្រ', dataUrl: svgDataUri(scienceScene()) },
  { id: 'math', name: 'គណិតវិទ្យា', dataUrl: svgDataUri(mathScene()) },
  { id: 'laptop', name: 'កុំព្យូទ័រ', dataUrl: svgDataUri(laptopScene()) },
  { id: 'presentation', name: 'បទបង្ហាញ', dataUrl: svgDataUri(presentationScene()) },
  { id: 'idea-big', name: 'គំនិតច្នៃប្រឌិត', dataUrl: svgDataUri(bulbBigScene()) },
];

export function illustrationById(id: string) {
  return ILLUSTRATIONS.find((i) => i.id === id);
}

// ─── Deck ──────────────────────────────────────────────────────────
// A freely-positioned text/shape element any slide can carry, layered on top
// of its kind-specific template content. Additive and orthogonal to `kind` —
// existing per-kind helpers (blankSlide, applyEdit, slideLines, lineKind,
// addLine/removeLine) don't need to know about it.
export type FreeformElement = {
  id: string;
  type: 'text' | 'shape';
  /** Slide-space px — the native canvas is SLIDE_W × SLIDE_H (880×495). */
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  text?: string;
  fontSize?: number;
  color?: string;
  shapeKind?: 'rect' | 'circle';
  fill?: string;
};

type SlideBase = { no: string; label: string; bg?: SlideBg; notes?: string; elements?: FreeformElement[] };
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
    | { kind: 'media'; title: string; caption: string; image?: string }
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
  { id: 'media', name: 'រូបភាព' },
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
    case 'media':
      return [s.caption];
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
    case 'media':
      return { kind, no: '', label: 'រូបភាព', title: 'ចំណងជើង', caption: 'សរសេរការពិពណ៌នារូបភាព' };
  }
}

/** Convert a slide to another layout, carrying over title + body lines + bg + notes + elements. */
export function convertSlide(s: Slide, kind: Slide['kind']): Slide {
  if (s.kind === kind) return s;
  const no = s.no;
  const bg = s.bg;
  const notes = s.notes;
  const elements = s.elements;
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
    case 'media':
      return { kind, no, label: 'រូបភាព', title, caption: lines[0] || 'សរសេរការពិពណ៌នារូបភាព' };
  }
  })();
  const merged = bg ? { ...out, bg } : out;
  const merged2 = notes ? { ...merged, notes } : merged;
  return elements ? { ...merged2, elements } : merged2;
}

/** Add a freeform element to a slide, returning a new slide (no mutation). */
export function addElement(s: Slide, el: FreeformElement): Slide {
  return { ...s, elements: [...(s.elements || []), el] };
}

/** Patch a freeform element by id, returning a new slide (no mutation). No-op
 *  if the id isn't found. */
export function updateElement(s: Slide, id: string, patch: Partial<FreeformElement>): Slide {
  if (!s.elements) return s;
  return { ...s, elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}

/** Remove a freeform element by id, returning a new slide (no mutation). */
export function removeElement(s: Slide, id: string): Slide {
  if (!s.elements) return s;
  return { ...s, elements: s.elements.filter((e) => e.id !== id) };
}

export type EditField = 'title' | 'sub' | 'kicker' | 'foot' | 'quote' | 'author' | 'bullet' | 'step' | 'statNum' | 'statLabel' | 'caption';
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
    case 'caption':
      return s.kind === 'media' ? { ...s, caption: value } : s;
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

// ─── Deck-wide header / footer chrome ──────────────────────────────
// Unlike per-slide fields above, these apply to the whole deck (like
// PowerPoint's "Insert > Header & Footer" dialog) — not undo-tracked,
// same as theme/accent selection.

/** Arrangement of the logo / footer text / page number along the bottom. */
export type FooterLayout = 'branded' | 'minimal' | 'centered' | 'split';

export const FOOTER_LAYOUTS: { id: FooterLayout; name: string }[] = [
  { id: 'branded', name: 'តាមម៉ាក' },
  { id: 'minimal', name: 'សាមញ្ញ' },
  { id: 'centered', name: 'កណ្ដាល' },
  { id: 'split', name: 'ពីរចុង' },
];

export type SlideTransition = 'none' | 'fade' | 'slide' | 'zoom';

export const SLIDE_TRANSITIONS: { id: SlideTransition; name: string }[] = [
  { id: 'none', name: 'គ្មាន' },
  { id: 'fade', name: 'លាយបញ្ចូល' },
  { id: 'slide', name: 'អូស' },
  { id: 'zoom', name: 'ពង្រីក' },
];

export type DeckSettings = {
  headerEnabled: boolean;
  headerText: string;
  headerAlign: 'left' | 'right';
  footerLayout: FooterLayout;
  footerLogo: boolean;
  footerTextEnabled: boolean;
  footerText: string;
  pageNumber: boolean;
  /** Show header/footer chrome on the title (cover) slide too. */
  showOnCover: boolean;
  /** Slide-to-slide animation used in Present mode. */
  transition: SlideTransition;
};

export const DEFAULT_DECK_SETTINGS: DeckSettings = {
  headerEnabled: false,
  headerText: '',
  headerAlign: 'right',
  footerLayout: 'branded',
  footerLogo: true,
  footerTextEnabled: true,
  footerText: 'Stunity',
  pageNumber: true,
  showOnCover: false,
  transition: 'fade',
};
