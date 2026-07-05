/**
 * Seed: mini-lessons + formula sheets for the grade-12 Math units (Bac II exam preparation).
 *
 * Fills Topic.miniLessonKh / Topic.formulaSheet for every unit seeded by
 * seed-topics-math-g12.ts (matched by unit name under MATH-G12-SCIENCE and MATH-G12-SOCIAL).
 * Shown by the mobile UnitLessonScreen before practice, rendered through the same
 * markdown+KaTeX pipeline (MarkdownMathView).
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: rewrites only
 * when content differs; never touches rows whose unit name doesn't match.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-lessons-math-g12.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-lessons-math-g12.ts --apply  # write
 */

import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');

type Formula = { expr: string; noteKh?: string };
type LessonSeed = { lessonKh: string; formulas: Formula[] };

// Lessons mapped by exact Khmer unit name across Science and Social tracks
const LESSONS: Record<string, LessonSeed> = {
  // =========================================================================
  // SCIENCE TRACK UNITS (Advanced / ថ្នាក់វិទ្យាសាស្ត្រ)
  // =========================================================================

  // 1. លីមីតនៃអនុគមន៍
  'លីមីតនៃអនុគមន៍': {
    lessonKh: `## និយមន័យ និងទម្រង់មិនកំណត់
លីមីតនៃអនុគមន៍ $f(x)$ កាលណា $x$ ខិតជិតតម្លៃ $a$ គឺជិតតម្លៃ $L$៖ $\\lim_{x \\to a} f(x) = L$។
ទម្រង់មិនកំណត់សំខាន់ៗដែលជួបប្រទះញឹកញាប់ក្នុងការប្រឡងបាក់ឌុបមាន៖ $\\dfrac{0}{0}, \\dfrac{\\infty}{\\infty}, 0 \\times \\infty, \\infty - \\infty$។

## វិធានឡូពីតាល់ (L'Hôpital's Rule)
ចំពោះទម្រង់មិនកំណត់ $\\dfrac{0}{0}$ ឬ $\\dfrac{\\infty}{\\infty}$ គេអាចគណនាលីមីតដោយប្រើដេរីវេ៖
$$\\lim_{x \\to a} \\dfrac{f(x)}{g(x)} = \\lim_{x \\to a} \\dfrac{f'(x)}{g'(x)}$$

## លីមីតត្រីកោណមាត្រ
រូបមន្តគ្រឹះនៃលីមីតអនុគមន៍ត្រីកោណមាត្រកាលណា $x \\to 0$ ៖
$$\\lim_{x \\to 0} \\dfrac{\\sin x}{x} = 1, \\qquad \\lim_{x \\to 0} \\dfrac{1 - \\cos x}{x^2} = \\dfrac{1}{2}, \\qquad \\lim_{x \\to 0} \\dfrac{\\tan x}{x} = 1$$

## លីមីតអ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត
$$\\lim_{x \\to \\infty} \\left(1 + \\dfrac{1}{x}\\right)^x = e, \\qquad \\lim_{x \\to 0} \\dfrac{e^x - 1}{x} = 1, \\qquad \\lim_{x \\to 0} \\dfrac{\\ln(1+x)}{x} = 1$$`,
    formulas: [
      { expr: '\\lim_{x \\to a} \\dfrac{f(x)}{g(x)} = \\lim_{x \\to a} \\dfrac{f\'(x)}{g\'(x)}', noteKh: 'វិធានឡូពីតាល់' },
      { expr: '\\lim_{x \\to 0} \\dfrac{\\sin x}{x} = 1', noteKh: 'លីមីតត្រីកោណមាត្រគ្រឹះ' },
      { expr: '\\lim_{x \\to 0} \\dfrac{1 - \\cos x}{x^2} = \\dfrac{1}{2}', noteKh: 'លីមីតកូស៊ីនុស' },
      { expr: '\\lim_{x \\to 0} \\dfrac{e^x - 1}{x} = 1', noteKh: 'លីមីតអ៊ិចស្ប៉ូណង់ស្យែល' },
      { expr: '\\lim_{x \\to 0} \\dfrac{\\ln(1+x)}{x} = 1', noteKh: 'លីមីតឡូការីត' },
    ],
  },

  // 2. ដេរីវេនៃអនុគមន៍
  'ដេរីវេនៃអនុគមន៍': {
    lessonKh: `## រូបមន្តដេរីវេគ្រឹះ
ដេរីវេជាអត្រាបម្រែបម្រួលខណៈនៃអនុគមន៍ និងជាមេគុណប្រាប់ទិសនៃបន្ទាត់ប៉ះត្រង់ចំណុចមួយ។
* $(x^n)' = n x^{n-1}$
* $(\\sqrt{x})' = \\dfrac{1}{2\\sqrt{x}}$
* $(\\sin x)' = \\cos x, \\quad (\\cos x)' = -\\sin x, \\quad (\\tan x)' = \\dfrac{1}{\\cos^2 x} = 1 + \\tan^2 x$

## ដេរីវេនៃអនុគមន៍បណ្ដាក់ និងផលគុណ/ផលចែក
* **ផលគុណ**៖ $(u \\cdot v)' = u'v + uv'$
* **ផលចែក**៖ $\\left(\\dfrac{u}{v}\\right)' = \\dfrac{u'v - uv'}{v^2}$
* **អនុគមន៍បណ្ដាក់ (Chain Rule)**៖ $[f(g(x))]' = g'(x) \\cdot f'(g(x))$ ឬ $(u^n)' = n u' u^{n-1}$

## ការអនុវត្តដេរីវេ៖ អនូតោនភាព និងចំណុចរបត់
* បើ $f'(x) > 0$ លើចន្លោះណា អនុគមន៍ $f(x)$ កើនលើចន្លោះនោះ។
* បើ $f'(x) < 0$ លើចន្លោះណា អនុគមន៍ $f(x)$ ចុះលើចន្លោះនោះ។
* **ចំណុចរបត់ (Inflection Point)** គឺជាចំណុចដែលខ្សែរកោងប្តូរភាពប៉ោង-ផត ដែលត្រង់នោះ $f''(x) = 0$ ហើយប្តូរសញ្ញា។`,
    formulas: [
      { expr: '(u \\cdot v)\' = u\'v + uv\'', noteKh: 'ដេរីវេផលគុណ' },
      { expr: '\\left(\\dfrac{u}{v}\\right)\' = \\dfrac{u\'v - uv\'}{v^2}', noteKh: 'ដេរីវេផលចែក' },
      { expr: '(u^n)\' = n u\' u^{n-1}', noteKh: 'ដេរីវេស្វ័យគុណអនុគមន៍' },
      { expr: '(\\sin u)\' = u\' \\cos u, \\quad (\\cos u)\' = -u\' \\sin u', noteKh: 'ដេរីវេត្រីកោណមាត្របណ្ដាក់' },
      { expr: '(e^u)\' = u\' e^u, \\quad (\\ln u)\' = \\dfrac{u\'}{u}', noteKh: 'ដេរីវេអ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត' },
    ],
  },

  // 3. អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត
  'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត': {
    lessonKh: `## អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល $y = e^x$
អនុគមន៍ $y = e^x$ កំណត់លើ $\\mathbb{R}$ ហើយមានតម្លៃវិជ្ជមានជានិច្ច ($e^x > 0$)។
* **លក្ខណៈស្វ័យគុណ**៖ $e^a \\cdot e^b = e^{a+b}, \\quad \\dfrac{e^a}{e^b} = e^{a-b}, \\quad (e^a)^b = e^{ab}$
* **ដេរីវេ**៖ $(e^x)' = e^x$ និង $(e^u)' = u' e^u$

## អនុគមន៍ឡូការីតនេពែរ $y = \\ln x$
អនុគមន៍ឡូការីតនេពែរ កំណត់តែចំពោះ $x > 0$ ប៉ុណ្ណោះ។ វាជាអនុគមន៍ច្រាសនៃ $y = e^x$។
* **លក្ខណៈឡូការីត**៖
  $$\\ln(ab) = \\ln a + \\ln b, \\qquad \\ln\\left(\\dfrac{a}{b}\\right) = \\ln a - \\ln b, \\qquad \\ln(a^n) = n \\ln a$$
* **ទំនាក់ទំនងច្រាស**៖ $\\ln(e^x) = x$ និង $e^{\\ln x} = x$ (ចំពោះ $x > 0$)
* **ដេរីវេ**៖ $(\\ln x)' = \\dfrac{1}{x}$ និង $(\\ln u)' = \\dfrac{u'}{u}$`,
    formulas: [
      { expr: 'e^{\\ln x} = x \\quad (x > 0), \\qquad \\ln(e^x) = x', noteKh: 'ទំនាក់ទំនងច្រាស' },
      { expr: '\\ln(ab) = \\ln a + \\ln b', noteKh: 'ឡូការីតនៃផលគុណ' },
      { expr: '\\ln\\left(\\dfrac{a}{b}\\right) = \\ln a - \\ln b', noteKh: 'ឡូការីតនៃផលចែក' },
      { expr: '(e^u)\' = u\' e^u', noteKh: 'ដេរីវេអ៊ិចស្ប៉ូណង់ស្យែល' },
      { expr: '(\\ln u)\' = \\dfrac{u\'}{u}', noteKh: 'ដេរីវេឡូការីត' },
    ],
  },

  // 4. អាំងតេក្រាល
  'អាំងតេក្រាល': {
    lessonKh: `## ព្រីមីទីវ និងអាំងតេក្រាលមិនកំណត់
អនុគមន៍ $F(x)$ ជាព្រីមីទីវនៃ $f(x)$ លុះត្រាតែ $F'(x) = f(x)$។
$$\\int f(x) dx = F(x) + C$$
* $\\int x^n dx = \\dfrac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$
* $\\int \\dfrac{1}{x} dx = \\ln|x| + C$
* $\\int e^x dx = e^x + C, \\qquad \\int \\sin x dx = -\\cos x + C, \\qquad \\int \\cos x dx = \\sin x + C$

## អាំងតេក្រាលកំណត់ និងការគណនាក្រឡាផ្ទៃ
អាំងតេក្រាលកំណត់ពី $a$ ទៅ $b$ គណនាតាមរូបមន្តញូតុន-ឡែបនីស៖
$$\\int_a^b f(x) dx = [F(x)]_a^b = F(b) - F(a)$$
* **ក្រឡាផ្ទៃខណ្ឌដោយខ្សែរកោង និងអ័ក្សអាប់ស៊ីស**៖ $S = \\int_a^b |f(x)| dx$
* **ក្រឡាផ្ទៃខណ្ឌដោយខ្សែរកោងពីរ**៖ $S = \\int_a^b |f(x) - g(x)| dx$
* **មាឌសូលីតបរិវត្តន៍** (ជុំវិញអ័ក្ស $x$)៖ $V = \\pi \\int_a^b [f(x)]^2 dx$

## អាំងតេក្រាលដោយផ្នែក (Integration by Parts)
$$\\int u dv = uv - \\int v du$$`,
    formulas: [
      { expr: '\\int u\' u^n dx = \\dfrac{u^{n+1}}{n+1} + C', noteKh: 'អាំងតេក្រាលស្វ័យគុណ' },
      { expr: '\\int \\dfrac{u\'}{u} dx = \\ln|u| + C', noteKh: 'អាំងតេក្រាលឡូការីត' },
      { expr: '\\int u\' e^u dx = e^u + C', noteKh: 'អាំងតេក្រាលអ៊ិចស្ប៉ូណង់ស្យែល' },
      { expr: '\\int u dv = uv - \\int v du', noteKh: 'អាំងតេក្រាលដោយផ្នែក' },
      { expr: 'V = \\pi \\int_a^b [f(x)]^2 dx', noteKh: 'មាឌសូលីតបរិវត្តន៍ជុំវិញអ័ក្ស x' },
    ],
  },

  // 5. សមីការឌីផេរ៉ង់ស្យែល
  'សមីការឌីផេរ៉ង់ស្យែល': {
    lessonKh: `## សមីការឌីផេរ៉ង់ស្យែលលំដាប់ទី ១
* **ទម្រង់អូម៉ូសែន $y' + ay = 0$**៖ ចម្លើយទូទៅគឺ $y = A e^{-ax}$ ដែល $A$ ជាចំនួនថេរណាមួយ។
* **ទម្រង់មិនអូម៉ូសែន $y' + ay = P(x)$**៖ ចម្លើយទូទៅគឺ $y = y_h + y_p$ ដែល $y_h = A e^{-ax}$ ជាចម្លើយសមីការអូម៉ូសែន ហើយ $y_p$ ជាចម្លើយពិសេស។

## សមីការឌីផេរ៉ង់ស្យែលលំដាប់ទី ២ អូម៉ូសែន ($ay'' + by' + cy = 0$)
ដើម្បីដោះស្រាយ គេត្រូវបង្កើត **សមីការសម្គាល់** (Characteristic Equation)៖ $ar^2 + br + c = 0$ ($\\Delta = b^2 - 4ac$)។
1. **ករណី $\\Delta > 0$** (មានឫសពិតពីរផ្សេងគ្នា $r_1, r_2$)៖
   $$y = A e^{r_1 x} + B e^{r_2 x}$$
2. **ករណី $\\Delta = 0$** (មានឫសឌុប $r_0 = -b/(2a)$)៖
   $$y = (Ax + B) e^{r_0 x}$$
3. **ករណី $\\Delta < 0$** (មានឫសកុំផ្លិចឆ្លាស់ $r = \\alpha \\pm i\\beta$)៖
   $$y = e^{\\alpha x} (A \\cos\\beta x + B \\sin\\beta x)$$`,
    formulas: [
      { expr: 'y\' + ay = 0 \\implies y = A e^{-ax}', noteKh: 'ចម្លើយសមីការលំដាប់ទី ១ អូម៉ូសែន' },
      { expr: 'ar^2 + br + c = 0', noteKh: 'សមីការសម្គាល់សម្រាប់លំដាប់ទី ២' },
      { expr: '\\Delta > 0 \\implies y = A e^{r_1 x} + B e^{r_2 x}', noteKh: 'ករណីឫសពិតពីរផ្សេងគ្នា' },
      { expr: '\\Delta = 0 \\implies y = (Ax + B) e^{r_0 x}', noteKh: 'ករណីឫសពិតឌុប' },
      { expr: '\\Delta < 0 \\implies y = e^{\\alpha x} (A \\cos\\beta x + B \\sin\\beta x)', noteKh: 'ករណីឫសកុំផ្លិច' },
    ],
  },

  // 6. ចំនួនកុំផ្លិច
  'ចំនួនកុំផ្លិច': {
    lessonKh: `## ទម្រង់ពីជគណិត
ចំនួនកុំផ្លិច $z = a + bi$ ដែល $a, b \\in \\mathbb{R}$ ហើយ $i^2 = -1$។
* $a$ ហៅថា ផ្នែកពិត $\\text{Re}(z)$ ហើយ $b$ ហៅថា ផ្នែកនិម្មិត $\\text{Im}(z)$។
* **ចំនួនកុំផ្លិចឆ្លាស់ (Conjugate)**៖ $\\bar{z} = a - bi$
* **ម៉ូឌុល (Modulus)**៖ $|z| = r = \\sqrt{a^2 + b^2}$
* ផលគុណពិសេស៖ $z \\cdot \\bar{z} = (a+bi)(a-bi) = a^2 + b^2 = |z|^2$

## ទម្រង់ត្រីកោណមាត្រ និងអ៊ិចស្ប៉ូណង់ស្យែល
* **ទម្រង់ត្រីកោណមាត្រ**៖ $z = r(\\cos\\theta + i\\sin\\theta)$ ដែល $\\theta = \\arg(z)$ ជាអាគុយម៉ង់។
  * $\\cos\\theta = \\dfrac{a}{r}, \\quad \\sin\\theta = \\dfrac{b}{r}$
* **ទម្រង់អ៊ិចស្ប៉ូណង់ស្យែល**៖ $z = r e^{i\\theta}$ (រូបមន្តអយល័រ $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$)

## ទ្រឹស្ដីបទដឺម័រ (De Moivre's Theorem)
$$[r(\\cos\\theta + i\\sin\\theta)]^n = r^n(\\cos n\\theta + i\\sin n\\theta) = r^n e^{in\\theta}$$

## ឫសទី $n$ នៃចំនួនកុំផ្លិច
ឫសទី $n$ នៃ $z = r e^{i\\theta}$ មាន $n$ ចម្លើយផ្សេងគ្នា៖
$$w_k = \\sqrt[n]{r} \\left[ \\cos\\left(\\dfrac{\\theta + 2k\\pi}{n}\\right) + i\\sin\\left(\\dfrac{\\theta + 2k\\pi}{n}\\right) \\right], \\quad k = 0, 1, ..., n-1$$`,
    formulas: [
      { expr: '|z| = \\sqrt{a^2 + b^2}, \\qquad z \\cdot \\bar{z} = |z|^2', noteKh: 'ម៉ូឌុល និងកុំផ្លិចឆ្លាស់' },
      { expr: 'z = r(\\cos\\theta + i\\sin\\theta) = r e^{i\\theta}', noteKh: 'ទម្រង់ត្រីកោណមាត្រ និងអ៊ិចស្ប៉ូណង់ស្យែល' },
      { expr: '(\\cos\\theta + i\\sin\\theta)^n = \\cos n\\theta + i\\sin n\\theta', noteKh: 'ទ្រឹស្ដីបទដឺម័រ' },
      { expr: 'z_1 \\cdot z_2 = r_1 r_2 e^{i(\\theta_1 + \\theta_2)}', noteKh: 'ផលគុណទម្រង់អ៊ិចស្ប៉ូណង់ស្យែល' },
      { expr: '\\dfrac{z_1}{z_2} = \\dfrac{r_1}{r_2} e^{i(\\theta_1 - \\theta_2)}', noteKh: 'ផលចែកទម្រង់អ៊ិចស្ប៉ូណង់ស្យែល' },
    ],
  },

  // 7. ធរណីមាត្រក្នុងលំហ
  'ធរណីមាត្រក្នុងលំហ': {
    lessonKh: `## ប្រព័ន្ធកូអរដោនេក្នុងលំហ $(O, \\vec{i}, \\vec{j}, \\vec{k})$
* **ចម្ងាយរវាងពីរចំណុច $A(x_1, y_1, z_1)$ និង $B(x_2, y_2, z_2)$**៖
  $$AB = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2 + (z_2-z_1)^2}$$
* **កូអរដោនេវ៉ិចទ័រ $\\overrightarrow{AB}$**៖ $\\overrightarrow{AB} = (x_2-x_1, y_2-y_1, z_2-z_1)$

## ផលគុណស្កាលែរ (Dot Product)
ចំពោះវ៉ិចទ័រ $\\vec{u}=(x_1, y_1, z_1)$ និង $\\vec{v}=(x_2, y_2, z_2)$ ៖
* $\\vec{u} \\cdot \\vec{v} = x_1 x_2 + y_1 y_2 + z_1 z_2 = |\\vec{u}| |\\vec{v}| \\cos\\theta$
* **លក្ខខណ្ឌកែងគ្នា**៖ $\\vec{u} \\perp \\vec{v} \\iff \\vec{u} \\cdot \\vec{v} = 0$

## ផលគុណនៃពីរវ៉ិចទ័រ (Cross Product)
ផលគុណវ៉ិចទ័រ $\\vec{w} = \\vec{u} \\times \\vec{v}$ គឺជាវ៉ិចទ័រដែលកែងនឹង $\\vec{u}$ ផង និងកែងនឹង $\\vec{v}$ ផង៖
$$\\vec{u} \\times \\vec{v} = \\begin{vmatrix} \\vec{i} & \\vec{j} & \\vec{k} \\\\ x_1 & y_1 & z_1 \\\\ x_2 & y_2 & z_2 \\end{vmatrix} = (y_1 z_2 - z_1 y_2)\\vec{i} - (x_1 z_2 - z_1 x_2)\\vec{j} + (x_1 y_2 - y_1 x_2)\\vec{k}$$
* **លក្ខខណ្ឌស្របគ្នា**៖ $\\vec{u} // \\vec{v} \\iff \\vec{u} \\times \\vec{v} = \\vec{0}$
* **ក្រឡាផ្ទៃប្រលេឡូក្រាម**៖ $S = |\\vec{u} \\times \\vec{v}|$
* **ក្រឡាផ្ទៃត្រីកោណ $ABC$**៖ $S_{ABC} = \\dfrac{1}{2} |\\overrightarrow{AB} \\times \\overrightarrow{AC}|$
* **មាឌប្រលេពីប៉ែត និងតេត្រាអែត (ចំហុះ ៤)**៖
  $$V_{\\text{box}} = |(\\vec{u} \\times \\vec{v}) \\cdot \\vec{w}|, \\qquad V_{ABCD} = \\dfrac{1}{6} |(\\overrightarrow{AB} \\times \\overrightarrow{AC}) \\cdot \\overrightarrow{AD}|$$`,
    formulas: [
      { expr: '\\vec{u} \\cdot \\vec{v} = x_1 x_2 + y_1 y_2 + z_1 z_2', noteKh: 'ផលគុណស្កាលែរ' },
      { expr: '\\vec{u} \\perp \\vec{v} \\iff \\vec{u} \\cdot \\vec{v} = 0', noteKh: 'លក្ខខណ្ឌវ៉ិចទ័រកែងគ្នា' },
      { expr: 'S_{ABC} = \\dfrac{1}{2} |\\overrightarrow{AB} \\times \\overrightarrow{AC}|', noteKh: 'ក្រឡាផ្ទៃត្រីកោណក្នុងលំហ' },
      { expr: 'V_{ABCD} = \\dfrac{1}{6} |(\\overrightarrow{AB} \\times \\overrightarrow{AC}) \\cdot \\overrightarrow{AD}|', noteKh: 'មាឌតេត្រាអែត (ចំហុះ ៤)' },
    ],
  },

  // 8. សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់ និងប្លង់ក្នុងលំហ
  'សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់ និងប្លង់ក្នុងលំហ': {
    lessonKh: `## សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់ $(L)$
បន្ទាត់ $(L)$ ឆ្លងកាត់ចំណុច $A(x_0, y_0, z_0)$ ហើយមានវ៉ិចទ័រប្រាប់ទិស $\\vec{u} = (a, b, c)$ មានសមីការប៉ារ៉ាម៉ែត្រ៖
$$\\begin{cases} x = x_0 + at \\\\ y = y_0 + bt \\\\ z = z_0 + ct \\end{cases} \\quad (t \\in \\mathbb{R})$$

## សមីការប្លង់ $(P)$
ប្លង់ $(P)$ ឆ្លងកាត់ចំណុច $A(x_0, y_0, z_0)$ ហើយមានវ៉ិចទ័រន័រម៉ាល់ (កែងនឹងប្លង់) $\\vec{n} = (a, b, c)$ មានសមីការទូទៅ៖
$$a(x - x_0) + b(y - y_0) + c(z - z_0) = 0 \\implies ax + by + cz + d = 0$$

## ចម្ងាយពីចំណុចមួយទៅប្លង់
ចម្ងាយពីចំណុច $M(x_0, y_0, z_0)$ ទៅប្លង់ $(P): ax + by + cz + d = 0$ គឺ៖
$$d(M, P) = \\dfrac{|a x_0 + b y_0 + c z_0 + d|}{\\sqrt{a^2 + b^2 + c^2}}$$`,
    formulas: [
      { expr: '\\begin{cases} x = x_0 + at \\\\ y = y_0 + bt \\\\ z = z_0 + ct \\end{cases}', noteKh: 'សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់' },
      { expr: 'a(x - x_0) + b(y - y_0) + c(z - z_0) = 0', noteKh: 'សមីការប្លង់តាមចំណុច និងន័រម៉ាល់' },
      { expr: 'ax + by + cz + d = 0', noteKh: 'សមីការទូទៅនៃប្លង់' },
      { expr: 'd(M, P) = \\dfrac{|a x_0 + b y_0 + c z_0 + d|}{\\sqrt{a^2 + b^2 + c^2}}', noteKh: 'ចម្ងាយពីចំណុចទៅប្លង់' },
    ],
  },

  // 9. ប្រូបាប (Shared between Science and Social Science)
  'ប្រូបាប': {
    lessonKh: `## ប្រូបាបមានលក្ខខណ្ឌ
ប្រូបាបនៃព្រឹត្តិការណ៍ $A$ ដោយដឹងថាព្រឹត្តិការណ៍ $B$ បានកើតឡើងរួចហើយ (ប្រូបាប $A$ ដោយលក្ខខណ្ឌ $B$)៖
$$P(A|B) = \\dfrac{P(A \\cap B)}{P(B)} \\implies P(A \\cap B) = P(B) \\times P(A|B)$$

## ព្រឹត្តិការណ៍មិនទាក់ទងគ្នា (Independent Events)
ព្រឹត្តិការណ៍ $A$ និង $B$ មិនទាក់ទងគ្នា លុះត្រាតែ៖
$$P(A \\cap B) = P(A) \\times P(B)$$

## ទ្រឹស្ដីបទប្រូបាបសរុប និងរូបមន្តបាយ៉េស (Bayes' Theorem)
បើ $E_1, E_2, ..., E_n$ ជាបំណែងចែកនៃលំហសំណាក នោះប្រូបាបសរុបនៃព្រឹត្តិការណ៍ $A$ គឺ៖
$$P(A) = \\sum_{i=1}^n P(E_i) \\times P(A|E_i)$$
**រូបមន្តបាយ៉េស**៖ $P(E_k|A) = \\dfrac{P(E_k) \\times P(A|E_k)}{P(A)}$

## ច្បាប់ប៊ែរនូលី និងបំណែងចែកទ្វេធា (Binomial Distribution)
ក្នុងការពិសោធន៍ប៊ែរនូលី $n$ ដង (ជោគជ័យមានប្រូបាប $p$, បរាជ័យមានប្រូបាប $q = 1-p$) ប្រូបាបដែលទទួលបានជោគជ័យ $k$ ដងគឺ៖
$$P(X = k) = C(n, k) \\cdot p^k \\cdot q^{n-k} = \\dfrac{n!}{k!(n-k)!} p^k (1-p)^{n-k}$$`,
    formulas: [
      { expr: 'P(A|B) = \\dfrac{P(A \\cap B)}{P(B)}', noteKh: 'ប្រូបាបមានលក្ខខណ្ឌ' },
      { expr: 'P(A \\cap B) = P(A) \\times P(B)', noteKh: 'លក្ខខណ្ឌព្រឹត្តិការណ៍មិនទាក់ទងគ្នា' },
      { expr: 'P(A) = P(B_1)P(A|B_1) + P(B_2)P(A|B_2)', noteKh: 'ទ្រឹស្ដីបទប្រូបាបសរុប (២ ករណី)' },
      { expr: 'P(X = k) = C(n, k) p^k (1-p)^{n-k}', noteKh: 'រូបមន្តប្រូបាបបំណែងចែកទ្វេធា' },
    ],
  },

  // 10. ស្ថិតិ និងបំណែងចែកប្រូបាប (Science Track Unit 10)
  'ស្ថិតិ និងបំណែងចែកប្រូបាប': {
    lessonKh: `## អញ្ញាតចៃដន្យដាច់ (Discrete Random Variable)
បំណែងចែកប្រូបាបនៃអញ្ញាតចៃដន្យ $X$ ផ្ទៀងផ្ទាត់ $\\sum P(X = x_i) = 1$។
* **សង្ឃឹមគណិត (Expected Value)**៖ $\\mu = E(X) = \\sum x_i \\cdot P(X = x_i)$
* **វ៉ារ្យង់ (Variance)**៖ $V(X) = \\sigma^2 = \\sum (x_i - \\mu)^2 \\cdot P(X = x_i) = E(X^2) - [E(X)]^2$
* **គម្លាតស្តង់ដា (Standard Deviation)**៖ $\\sigma = \\sqrt{V(X)}$

## បំណែងចែកទ្វេធា $B(n, p)$
ចំពោះអញ្ញាតចៃដន្យទ្វេធា $X \\sim B(n, p)$ ៖
* **សង្ឃឹមគណិត**៖ $E(X) = np$
* **វ៉ារ្យង់**៖ $V(X) = npq = np(1-p)$
* **គម្លាតស្តង់ដា**៖ $\\sigma = \\sqrt{npq}$

## បំណែងចែកណ័រម៉ាល់ (Normal Distribution)
ខ្សែរកោងកណ្ដឹងស៊ីមេត្រីជុំវិញមធ្យម $\\mu$។ ដើម្បីគណនាប្រូបាប គេបំលែងទៅជាអញ្ញាតណ័រម៉ាល់ស្តង់ដា $Z \\sim N(0, 1)$ ៖
$$Z = \\dfrac{X - \\mu}{\\sigma}$$`,
    formulas: [
      { expr: 'E(X) = \\sum x_i \\cdot P(X = x_i)', noteKh: 'សង្ឃឹមគណិត (មធ្យម)' },
      { expr: 'V(X) = E(X^2) - [E(X)]^2', noteKh: 'រូបមន្តវ៉ារ្យង់កាត់' },
      { expr: 'E(X) = np, \\quad V(X) = npq', noteKh: 'សង្ឃឹមគណិត និងវ៉ារ្យង់នៃបំណែងចែកទ្វេធា' },
      { expr: 'Z = \\dfrac{X - \\mu}{\\sigma}', noteKh: 'ការបំលែងទៅជាណ័រម៉ាល់ស្តង់ដា Z' },
    ],
  },

  // =========================================================================
  // SOCIAL SCIENCE TRACK EXCLUSIVE UNITS (Basic / ថ្នាក់វិទ្យាសាស្ត្រសង្គម)
  // =========================================================================

  // Social Unit 1: លីមីត និងដេរីវេនៃអនុគមន៍
  'លីមីត និងដេរីវេនៃអនុគមន៍': {
    lessonKh: `## លីមីតនៃអនុគមន៍សនិទាន និងពហុធា
ក្នុងការគណនាលីមីតត្រង់អានន្ត ($\\pm\\infty$) នៃអនុគមន៍សនិទាន គេទាញតួដែលមានដឺក្រេខ្ពស់ជាងគេជាកត្តា៖
$$\\lim_{x \\to \\pm\\infty} \\dfrac{a_n x^n + ...}{b_m x^m + ...} = \\lim_{x \\to \\pm\\infty} \\dfrac{a_n x^n}{b_m x^m}$$

## រូបមន្តដេរីវេ និងការសិក្សាអនូតោនភាព
* $(x^n)' = n x^{n-1}, \\qquad (ku)' = k u', \\qquad (u \\pm v)' = u' \\pm v'$
* ផលគុណ៖ $(uv)' = u'v + uv', \\qquad$ ផលចែក៖ $\\left(\\dfrac{u}{v}\\right)' = \\dfrac{u'v - uv'}{v^2}$
* **ការរកបរិមា (អតិបរមា / អប្បបរមា)**៖ ត្រង់ចំណុចបរិមា ដេរីវេទី ១ ស្មើកូដូន $(f'(x) = 0)$ ហើយប្តូរសញ្ញា។`,
    formulas: [
      { expr: '\\lim_{x \\to \\infty} \\dfrac{ax^n}{bx^n} = \\dfrac{a}{b}', noteKh: 'លីមីតត្រង់អានន្តដឺក្រេស្មើគ្នា' },
      { expr: '(x^n)\' = n x^{n-1}', noteKh: 'ដេរីវេស្វ័យគុណ' },
      { expr: '(u \\cdot v)\' = u\'v + uv\'', noteKh: 'ដេរីវេផលគុណ' },
      { expr: '\\left(\\dfrac{u}{v}\\right)\' = \\dfrac{u\'v - uv\'}{v^2}', noteKh: 'ដេរីវេផលចែក' },
    ],
  },

  // Social Unit 3: អាំងតេក្រាល និងអនុវត្តន៍
  'អាំងតេក្រាល និងអនុវត្តន៍': {
    lessonKh: `## ព្រីមីទីវ និងអាំងតេក្រាលមិនកំណត់
$$\\int x^n dx = \\dfrac{x^{n+1}}{n+1} + C \\quad (n \\neq -1), \\qquad \\int \\dfrac{1}{x} dx = \\ln|x| + C, \\qquad \\int e^{ax} dx = \\dfrac{1}{a} e^{ax} + C$$

## អាំងតេក្រាលកំណត់ និងការគណនាក្រឡាផ្ទៃ
$$\\int_a^b f(x) dx = F(b) - F(a)$$
* **ក្រឡាផ្ទៃខណ្ឌដោយខ្សែរកោង $y=f(x)$ និងអ័ក្ស $x$ លើចន្លោះ $[a, b]$**៖
  $$S = \\int_a^b |f(x)| dx$$
* **ក្រឡាផ្ទៃខណ្ឌដោយខ្សែរកោងពីរ $y=f(x)$ និង $y=g(x)$**៖
  $$S = \\int_a^b |f(x) - g(x)| dx$$`,
    formulas: [
      { expr: '\\int x^n dx = \\dfrac{x^{n+1}}{n+1} + C', noteKh: 'អាំងតេក្រាលស្វ័យគុណ' },
      { expr: '\\int \\dfrac{1}{x} dx = \\ln|x| + C', noteKh: 'អាំងតេក្រាល ១/x' },
      { expr: '\\int_a^b f(x) dx = F(b) - F(a)', noteKh: 'រូបមន្តញូតុន-ឡែបនីស' },
      { expr: 'S = \\int_a^b |f(x) - g(x)| dx', noteKh: 'ក្រឡាផ្ទៃខណ្ឌដោយខ្សែរកោងពីរ' },
    ],
  },

  // Social Unit 4: ស្ថិតិមានពីរអញ្ញាត
  'ស្ថិតិមានពីរអញ្ញាត': {
    lessonKh: `## ចំណុចមធ្យម (ទីប្រជុំទម្ងន់)
ចំពោះទិន្នន័យពីរអញ្ញាត $(x_i, y_i)$ ចំណុចមធ្យមគឺ $G(\\bar{x}, \\bar{y})$ ដែល៖
$$\\bar{x} = \\dfrac{1}{n} \\sum x_i, \\qquad \\bar{y} = \\dfrac{1}{n} \\sum y_i$$
បន្ទាត់តម្រឹមលីនេអ៊ែរតែងតែឆ្លងកាត់ចំណុចមធ្យម $G(\\bar{x}, \\bar{y})$ ជានិច្ច។

## កូវ៉ារ្យង់ (Covariance)
$$Cov(X, Y) = \\dfrac{1}{n} \\sum (x_i - \\bar{x})(y_i - \\bar{y}) = \\dfrac{1}{n} \\sum x_i y_i - \\bar{x}\\bar{y}$$

## មេគុណកូរ៉េឡាស្យុងលីនេអ៊ែរ (Correlation Coefficient $r$)
$$r = \\dfrac{Cov(X, Y)}{\\sigma_X \\cdot \\sigma_Y} = \\dfrac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum (x_i - \\bar{x})^2 \\cdot \\sum (y_i - \\bar{y})^2}}$$
* តម្លៃ $-1 \\leq r \\leq 1$។
* បើ $|r|$ ខិតជិត ១ នោះអញ្ញាតទាំងពីរមានទំនាក់ទំនងលីនេអ៊ែរខ្លាំង។

## បន្ទាត់តម្រឹមលីនេអ៊ែរ (Linear Regression Equation)
សមីការបន្ទាត់តម្រឹម $y = ax + b$ តាមវិធីកាដារេអប្បបរមា៖
$$a = \\dfrac{Cov(X, Y)}{V(X)} = \\dfrac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2}, \\qquad b = \\bar{y} - a\\bar{x}$$`,
    formulas: [
      { expr: 'G(\\bar{x}, \\bar{y}) = \\left(\\dfrac{\\sum x_i}{n}, \\dfrac{\\sum y_i}{n}\\right)', noteKh: 'ចំណុចមធ្យម (ទីប្រជុំទម្ងន់)' },
      { expr: 'Cov(X, Y) = \\dfrac{1}{n} \\sum x_i y_i - \\bar{x}\\bar{y}', noteKh: 'កូវ៉ារ្យង់' },
      { expr: 'r = \\dfrac{Cov(X, Y)}{\\sigma_X \\cdot \\sigma_Y}', noteKh: 'មេគុណកូរ៉េឡាស្យុងលីនេអ៊ែរ' },
      { expr: 'a = \\dfrac{Cov(X, Y)}{V(X)}, \\quad b = \\bar{y} - a\\bar{x}', noteKh: 'មេគុណបន្ទាត់តម្រឹមលីនេអ៊ែរ' },
    ],
  },

  // Social Unit 6: គណិតវិទ្យាហិរញ្ញវត្ថុ
  'គណិតវិទ្យាហិរញ្ញវត្ថុ': {
    lessonKh: `## ការប្រាក់ទោល (Simple Interest)
ការប្រាក់គិតតែលើដើមទុនដើមប៉ុណ្ណោះ៖
$$I = P \\cdot r \\cdot t, \\qquad A = P + I = P(1 + rt)$$
* $P$ = ដើមទុនដើម (Principal), $r$ = អត្រាការប្រាក់ប្រចាំឆ្នាំ (Rate), $t$ = រយៈពេលគិតជាឆ្នាំ (Time), $A$ = ប្រាក់សរុប។

## ការប្រាក់សមាស (Compound Interest)
ការប្រាក់ដែលទទួលបានត្រូវបានបូកបញ្ចូលទៅក្នុងដើមទុនដើម្បីបង្កើតការប្រាក់នៅគ្រាបន្ទាប់៖
$$A = P \\left(1 + \\dfrac{r}{n}\\right)^{nt}$$
* $n$ = ចំនួនដងនៃការគិតការប្រាក់ក្នុងមួយឆ្នាំ (ឧ. ប្រចាំខែ $n=12$, ប្រចាំត្រីមាស $n=4$)។

## តម្លៃអនាគត និងតម្លៃបច្ចុប្បន្ននៃអាប៊ុយនីតេ (Annuities)
* **តម្លៃអនាគត (Future Value - FV)** នៃការបង់ប្រាក់ប្រចាំគ្រាស្មើៗគ្នា $R$ ៖
  $$FV = R \\cdot \\dfrac{(1+i)^m - 1}{i}$$
* **តម្លៃបច្ចុប្បន្ន (Present Value - PV)** នៃការបង់ប្រាក់ ឬកម្ចី៖
  $$PV = R \\cdot \\dfrac{1 - (1+i)^{-m}}{i}$$
  * ដែល $i = r/n$ ជាអត្រាការប្រាក់ប្រចាំគ្រា ហើយ $m = nt$ ជាចំនួនគ្រាសរុប។

## រំលស់បំណុល (Loan Amortization)
ប្រាក់បង់ប្រចាំគ្រា $R$ សម្រាប់សងកម្ចីដើម $PV$ ៖
$$R = \\dfrac{PV \\cdot i}{1 - (1+i)^{-m}}$$`,
    formulas: [
      { expr: 'I = P \\cdot r \\cdot t', noteKh: 'ការប្រាក់ទោល' },
      { expr: 'A = P \\left(1 + \\dfrac{r}{n}\\right)^{nt}', noteKh: 'ការប្រាក់សមាស' },
      { expr: 'FV = R \\cdot \\dfrac{(1+i)^m - 1}{i}', noteKh: 'តម្លៃអនាគតនៃអាប៊ុយនីតេ' },
      { expr: 'PV = R \\cdot \\dfrac{1 - (1+i)^{-m}}{i}', noteKh: 'តម្លៃបច្ចុប្បន្ន (កម្ចី)' },
      { expr: 'R = \\dfrac{PV \\cdot i}{1 - (1+i)^{-m}}', noteKh: 'ប្រាក់បង់រំលស់ប្រចាំគ្រា' },
    ],
  },
};

async function seed() {
  console.log(`🌱 Grade-12 Math lesson seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const subjects = await prisma.subject.findMany({
    where: { code: { in: ['MATH-G12-SCIENCE', 'MATH-G12-SOCIAL'] } },
    select: { id: true, code: true },
  });

  if (subjects.length === 0) {
    console.log(`⚠️ No Grade 12 Math subjects found. In dry run or run seed-topics-math-g12 first.`);
  }

  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const [unitName, lesson] of Object.entries(LESSONS)) {
    // Search across both Science and Social subjects
    const topics = await prisma.topic.findMany({
      where: {
        subjectId: { in: subjects.map((s) => s.id) },
        parentId: null,
        name: unitName,
      },
      select: { id: true, subjectId: true, miniLessonKh: true, formulaSheet: true },
    });

    if (topics.length === 0) {
      console.log(`  ⏭️  unit "${unitName}" not found in DB — run seed-topics-math-g12 first`);
      missing += 1;
      continue;
    }

    for (const topic of topics) {
      const subjCode = subjects.find((s) => s.id === topic.subjectId)?.code || 'UNKNOWN';
      const sameLesson = topic.miniLessonKh === lesson.lessonKh;
      const sameFormulas = JSON.stringify(topic.formulaSheet) === JSON.stringify(lesson.formulas);
      
      if (sameLesson && sameFormulas) {
        unchanged += 1;
        continue;
      }

      console.log(`  ✏️  [${subjCode}] ${unitName} — lesson ${lesson.lessonKh.length} chars, ${lesson.formulas.length} formulas`);
      updated += 1;
      if (!APPLY) continue;

      await prisma.topic.update({
        where: { id: topic.id },
        data: {
          miniLessonKh: lesson.lessonKh,
          formulaSheet: lesson.formulas as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${updated} updated, ${unchanged} unchanged, ${missing} missing.`,
  );
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
