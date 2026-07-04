/**
 * Seed: mini-lessons + formula sheets for the grade-9 Math units.
 *
 * Fills Topic.miniLessonKh / Topic.formulaSheet for every unit seeded by
 * seed-topics-math-g9.ts (matched by unit name under MATH-G9). Shown by the
 * mobile UnitLessonScreen before practice, rendered through the same
 * markdown+KaTeX pipeline (MarkdownMathView) as the AI tutor's answers.
 *
 * Content status: rewritten 2026-07-04, grounded directly in the real
 * official MoEYS Grade 9 Math textbook (Ebooks/Grade9/Math, 2013 edition —
 * see that folder's README for the reconciliation notes). Each lesson
 * follows the same structure/style already established for the AI tutor's
 * answers: ## headings per subsection, **bold** key terms, a single
 * blockquote (> ) highlighting the one most important definition/formula,
 * $...$ / $$...$$ for all math. Still worth an educator review before this
 * is treated as final, but it is no longer a generic/unverified draft.
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: rewrites only
 * when content differs; never touches rows whose unit name doesn't match.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-lessons-math-g9.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-lessons-math-g9.ts --apply  # write
 */

import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const SUBJECT_CODE = 'MATH-G9';

type Formula = { expr: string; noteKh?: string };
type LessonSeed = { lessonKh: string; formulas: Formula[] };

const LESSONS: Record<string, LessonSeed> = {
  // ម.១ ចំនួនអសនិទាន — p1
  'Real Numbers': {
    lessonKh: `## និយមន័យ

**ចំនួនអសនិទាន** គឺជាចំនួនពិតដែល **មិនអាច** សរសេរជា **ប្រភាគ** $\\frac{a}{b}$ (ដែល $a$ និង $b$ ជាចំនួនគត់ ហើយ $b \\neq 0$) បានឡើយ។ ខ្ទង់ក្រោយក្បៀសទសភាគរបស់វា **មិនចេះចប់ និងមិនចេះដដែលៗ**។

> ចំនួនអសនិទាន = ចំនួនពិតដែលមិនអាចសរសេរជាប្រភាគ $\\frac{a}{b}$ បាន (ឧទាហរណ៍ $\\sqrt{2}$, $\\pi$)

## ចំណាត់ថ្នាក់ចំនួន

- ចំនួនពិត
  - **ចំនួនសនិទាន**៖ ចំនួនគត់, ប្រភាគ, ទសភាគកំណត់ ឬដដែលៗ
  - **ចំនួនអសនិទាន**៖ ឫសការេមិនទៀងគត់ ($\\sqrt{2}$, $\\sqrt{3}$, $\\sqrt{5}$...), $\\pi$, $e$

ចំពោះឫសការេនៃចំនួនធម្មជាតិណាមួយ ប្រសិនបើចំនួននោះមិនមែនជា **ការេពេញលេញ** (1, 4, 9, 16...) នោះឫសការេរបស់វានឹងជាចំនួនអសនិទានជានិច្ច។ ឧទាហរណ៍ $\\sqrt{4} = 2$ ជាចំនួនសនិទាន ប៉ុន្តែ $\\sqrt{7}$ ជាចំនួនអសនិទាន។

## ឫសការេ និងឫសគូប

**ឫសការេ** $\\sqrt{a}$ (ដែល $a \\geq 0$) ជាចំនួនវិជ្ជមានដែលពេលគុណនឹងខ្លួនឯងស្មើ $a$។ **ឫសគូប** $\\sqrt[3]{a}$ ជាចំនួនដែលគុណបីដងនឹងខ្លួនឯងស្មើ $a$។

## និទស្សន្ត និងកំណត់សម្គាល់វិទ្យាសាស្ត្រ

**និទស្សន្ត** $a^n$ មានន័យថាគុណ $a$ ចំនួន $n$ ដង។ **កំណត់សម្គាល់វិទ្យាសាស្ត្រ** សរសេរចំនួនធំ ឬតូចជា $a \\times 10^n$ ដែល $1 \\leq a < 10$ — មានប្រយោជន៍សម្រាប់សរសេរចំនួនដ៏ធំ (ចម្ងាយផ្កាយ) ឬដ៏តូច (ទំហំអាតូម)។`,
    formulas: [
      { expr: '\\sqrt{a \\cdot b} = \\sqrt{a} \\cdot \\sqrt{b}', noteKh: 'ឫសការេនៃផលគុណ' },
      { expr: '\\sqrt{\\dfrac{a}{b}} = \\dfrac{\\sqrt{a}}{\\sqrt{b}} \\ (b \\neq 0)', noteKh: 'ឫសការេនៃភាគលាភ' },
      { expr: 'a^m \\cdot a^n = a^{m+n}', noteKh: 'គុណនិទស្សន្តគោលដូចគ្នា' },
      { expr: '(a^m)^n = a^{mn}', noteKh: 'និទស្សន្តនៃនិទស្សន្ត' },
      { expr: 'a^{-n} = \\dfrac{1}{a^n}', noteKh: 'និទស្សន្តអវិជ្ជមាន' },
      { expr: 'N = a \\times 10^n \\ (1 \\le a < 10)', noteKh: 'កំណត់សម្គាល់វិទ្យាសាស្ត្រ' },
    ],
  },

  // ម.២ សមាមាត្រ — p17 — NEW
  Proportion: {
    lessonKh: `## និយមន័យ

**សមាមាត្រ** គឺជាសមភាពរវាងផលធៀបពីរ៖ $\\dfrac{a}{b} = \\dfrac{c}{d}$។ លក្ខណៈគន្លឹះគឺ **ផលគុណឆ្លង** (cross-multiplication)៖

> $\\dfrac{a}{b} = \\dfrac{c}{d} \\iff a \\times d = b \\times c$

## ការអនុវត្ត៖ ការបំលែងឯកតា

សមាមាត្រប្រើសម្រាប់បំលែងឯកតារង្វាស់ ដោយប្រៀបធៀបនឹងតម្លៃដែលដឹងស្រាប់។ ឧទាហរណ៍ ដឹងថា $1\\ inch \\to 2.54cm$ ចង់រក $1m$ (=100cm) ស្មើប៉ុន្មាន inch៖

$$\\dfrac{1}{x} = \\dfrac{2.54}{100} \\implies x = \\dfrac{100}{2.54} \\approx 39.37 \\ inch$$

## ការវិភាគចំណែក (Ratio) និងភាគរយ

ចំណែក (ratio) $a:b$ ស្មើសមាមាត្រ $\\dfrac{a}{b}$។ ភាគរយ គឺជាសមាមាត្រពិសេសមួយប្រៀបធៀបទៅនឹង 100 (ចំណែក ចែកនឹងសរុប គុណនឹង 100)។`,
    formulas: [
      { expr: '\\dfrac{a}{b} = \\dfrac{c}{d} \\implies a \\times d = b \\times c', noteKh: 'ផលគុណឆ្លង' },
      { expr: '\\dfrac{x}{1} = \\dfrac{\\text{known}}{\\text{base}}', noteKh: 'របៀបបំលែងឯកតា (x = តម្លៃចង់រក, 1 = ឯកតាគោល)' },
      { expr: '\\dfrac{\\text{part}}{\\text{total}} \\times 100\\%', noteKh: 'គណនាភាគរយ (part = ចំណែក, total = សរុប)' },
    ],
  },

  // ម.៣ កន្សោមពីជគណិត — p27
  'Polynomials & Algebraic Expressions': {
    lessonKh: `## និយមន័យ

**ពហុធា** គឺជាកន្សោមផ្សំពី **អថេរ** និងចំនួន ភ្ជាប់ដោយប្រមាណវិធីបូក ដក គុណ (ឧទាហរណ៍ $3x^2 + 2x - 5$)។ **ដឺក្រេ** នៃពហុធាគឺនិទស្សន្តធំបំផុតរបស់អថេរ។

## ការបំបែកជាផលគុណកត្តា

ការបំបែកជាផលគុណកត្តា (Factoring) គឺការសរសេរពហុធាជាផលគុណនៃកន្សោមសាមញ្ញៗ។ ជំហានទី ១ គឺរកកត្តារួម (GCF) ជាមុនសិន បន្ទាប់មកប្រើ **អត្តសញ្ញាណសំខាន់ៗ** ខាងក្រោម។

> ត្រូវចាំអត្តសញ្ញាណបួននេះមុនគេ៖ $(a+b)^2$, $(a-b)^2$, $a^2-b^2$, និងបំបែកត្រីធាដឺក្រេ ២

## ប្រភាគពីជគណិត

ប្រភាគពីជគណិតដោះស្រាយដូចប្រភាគលេខដែរ — ត្រូវរកកត្តារួម/បំបែកកត្តាភាគយក-ភាគបែងជាមុន សិន ទើបធ្វើសាមញ្ញកម្ម ឬបូក/ដកបាន។`,
    formulas: [
      { expr: '(a+b)^2 = a^2 + 2ab + b^2', noteKh: 'ការេនៃផលបូក' },
      { expr: '(a-b)^2 = a^2 - 2ab + b^2', noteKh: 'ការេនៃផលដក' },
      { expr: 'a^2 - b^2 = (a+b)(a-b)', noteKh: 'ផលដកការេ' },
      { expr: 'x^2 + (p+q)x + pq = (x+p)(x+q)', noteKh: 'បំបែកត្រីធាដឺក្រេ ២' },
    ],
  },

  // ម.៤ សមីការដឺក្រេទី១ មានមួយអញ្ញាត — p41
  'Linear Equations': {
    lessonKh: `## និយមន័យ

**សមីការដឺក្រេទី១ មានមួយអញ្ញាត** មានរាង $ax + b = 0$ ($a \\neq 0$)។ ដោះស្រាយសមីការ គឺរកតម្លៃ $x$ ដែលធ្វើឲ្យសមីការក្លាយជាសម្មភាពពិត។

## វិធីដោះស្រាយ

1. បំបាត់វង់ក្រចក (ប្រសិនបើមាន)
2. ប្តូរតួមានអថេរទៅខាងឆ្វេង តួជាចំនួនទៅខាងស្តាំ **ដោយប្តូរសញ្ញា**
3. ចែកអង្គទាំងពីរនឹងមេគុណរបស់ $x$

> $ax + b = 0 \\implies x = -\\dfrac{b}{a}$

## ចំណោទជាអក្សរ

សម្រាប់ចំណោទជាអក្សរ (word problems)៖ តាងចំនួនមិនស្គាល់ជា $x$ រួចបកប្រែឃ្លាភាសាទៅជាសមីការគណិតវិទ្យា មុននឹងដោះស្រាយ។`,
    formulas: [
      { expr: 'ax + b = 0 \\implies x = -\\dfrac{b}{a}', noteKh: 'រូបមន្តទូទៅ' },
      { expr: 'a + x = b \\implies x = b - a', noteKh: 'ប្តូរតួ ប្តូរសញ្ញា' },
      { expr: 'ax = b \\implies x = \\dfrac{b}{a}', noteKh: 'ចែកនឹងមេគុណ' },
    ],
  },

  // ម.៥ វិសមីការដឺក្រេទី១ មានមួយអញ្ញាត — p51
  'Linear Inequalities': {
    lessonKh: `## និយមន័យ

**វិសមីការដឺក្រេទី១** ដោះស្រាយដូចសមីការដែរ (ប្តូរតួ ចែកនឹងមេគុណ) ប៉ុន្តែចម្លើយចេញជា **ចន្លោះតម្លៃ** មិនមែនតម្លៃតែមួយទេ។

## ច្បាប់សំខាន់បំផុត

> ពេលគុណ ឬចែកអង្គទាំងពីរនឹង **ចំនួនអវិជ្ជមាន** ត្រូវ **ត្រឡប់ទិសសញ្ញាវិសមភាព** ($<$ ក្លាយជា $>$ និងផ្ទុយមកវិញ)

នេះជាកំហុសញឹកញាប់បំផុតរបស់សិស្ស — ត្រូវប្រយ័ត្នជានិច្ចរាល់ពេលចែក/គុណនឹងចំនួនអវិជ្ជមាន។`,
    formulas: [
      { expr: 'x + a < b \\implies x < b - a', noteKh: 'បូក/ដក មិនប្តូរទិស' },
      { expr: 'ax < b \\ (a>0) \\implies x < \\dfrac{b}{a}', noteKh: 'ចែកនឹងចំនួនវិជ្ជមាន' },
      { expr: '-ax < b \\ (a>0) \\implies x > -\\dfrac{b}{a}', noteKh: 'ចែកនឹងចំនួនអវិជ្ជមាន — ត្រឡប់ទិស' },
    ],
  },

  // ម.៦ បំណែងចែកប្រេកង់ — p61 — NEW
  'Frequency Distribution': {
    lessonKh: `## និយមន័យ

ការចាត់ថ្នាក់ទិន្នន័យឆៅទៅជា **តារាងប្រេកង់** (frequency table) ជួយឲ្យមើលការចែកចាយទិន្នន័យបានងាយស្រួល។

- **ថ្នាក់** (class): ចន្លោះតម្លៃដែលទិន្នន័យត្រូវបានចាត់ចូល
- **ប្រេកង់** (frequency): ចំនួនដងដែលទិន្នន័យធ្លាក់ក្នុងថ្នាក់នីមួយៗ
- **ប្រេកង់ជាបូក** (cumulative frequency): ផលបូកប្រេកង់រហូតដល់ថ្នាក់នោះ
- **ប្រេកង់ជាភាគរយ**: ប្រេកង់ គិតជាភាគរយនៃទិន្នន័យសរុប

> ប្រេកង់ជាបូក (Cumulative Frequency) = ផលបូកប្រេកង់ទាំងអស់រហូតដល់ថ្នាក់នោះ

## របៀបអាន

តារាងប្រេកង់ជាបូក ជួយឆ្លើយសំណួរដូចជា "តើមានប៉ុន្មាននាក់ទទួលបានក្រោមតម្លៃណាមួយ?" ដោយមិនចាំបាច់រាប់ម្តងទៀត។`,
    formulas: [
      { expr: '\\text{Relative Freq \\%} = \\dfrac{f_i}{\\text{total}} \\times 100\\%', noteKh: 'ប្រេកង់ជាភាគរយ (f = ប្រេកង់)' },
      { expr: '\\text{Cumulative Freq}_k = \\sum_{i=1}^{k} f_i', noteKh: 'ប្រេកង់ជាបូក (f = ប្រេកង់)' },
    ],
  },

  // ម.៧ មធ្យមស្ថិតិ — p75
  Statistics: {
    lessonKh: `## និយមន័យ

**ស្ថិតិមូលដ្ឋាន** សិក្សាពីរបៀបសង្ខេបទិន្នន័យតាមរយៈតម្លៃតំណាងតែមួយ។

## មធ្យមភាគ (Mean)

**មធ្យមភាគ** ស្មើនឹងផលបូកទិន្នន័យទាំងអស់ ចែកនឹងចំនួនទិន្នន័យ។

> $\\bar{x} = \\dfrac{x_1 + x_2 + \\cdots + x_n}{n}$

## មេដ្យាន និងម៉ូដ

**មេដ្យាន** (median) គឺជាតម្លៃកណ្តាល នៅពេលរៀបទិន្នន័យតាមលំដាប់ (បើចំនួនគូ យកមធ្យមភាគនៃពីរតម្លៃកណ្តាល)។ **ម៉ូដ** (mode) គឺជាតម្លៃដែលកើតឡើងញឹកញាប់បំផុត។

## វិសាលភាព (Range)

**វិសាលភាព** ស្មើនឹងតម្លៃធំបំផុត ដកនឹងតម្លៃតូចបំផុត — ជារង្វាស់ភាពខ្ចាត់ខ្ចាយសាមញ្ញបំផុត។`,
    formulas: [
      { expr: '\\bar{x} = \\dfrac{x_1 + x_2 + \\cdots + x_n}{n}', noteKh: 'មធ្យមភាគ' },
      { expr: '\\text{Range} = \\max - \\min', noteKh: 'វិសាលភាព' },
    ],
  },

  // ម.៨ ប្រូបាប — p85 — NEW
  Probability: {
    lessonKh: `## និយមន័យ

**ព្រឹត្តិការណ៍** (event) $A$ ជាផ្នែកមួយនៃ **លទ្ធផលដែលអាចកើតមាន** (sample space) $S$។ **ប្រូបាប៊ីលីតេ** នៃ $A$ គណនាដោយ៖

> $P(A) = \\dfrac{n(A)}{n(S)}$ — $n(A)$ ជាចំនួនករណីស្រប, $n(S)$ ជាចំនួនករណីអាចទាំងអស់

## ជួរតម្លៃ

ប្រូបាប៊ីលីតេនៃព្រឹត្តិការណ៍ណាមួយស្ថិតនៅចន្លោះ $0$ (មិនអាចកើតឡើងសោះ) និង $1$ (ប្រាកដជាកើតឡើង)។ ប្រូបាប៊ីលីតេជាភាគរយ គឺគុណលទ្ធផលនឹង $100\\%$។

## ឧទាហរណ៍

បើគូសបានស្លាកអក្សរ $A, A, A, B, N, N$ ពីពាក្យ BANANA ចំនួនករណីអាចគឺ $6$។ ប្រូបាប៊ីលីតេនៃការគូសបានអក្សរ $A$ គឺ $\\dfrac{3}{6} = \\dfrac{1}{2} = 50\\%$។`,
    formulas: [
      { expr: 'P(A) = \\dfrac{n(A)}{n(S)}', noteKh: 'រូបមន្តប្រូបាប៊ីលីតេ' },
      { expr: '0 \\le P(A) \\le 1', noteKh: 'ជួរតម្លៃ' },
    ],
  },

  // ម.៩ ចម្ងាយវាងពីរចំណុច — p97 — NEW
  'Distance Between Two Points': {
    lessonKh: `## និយមន័យ

ចម្ងាយរវាងចំណុច $A(x_1, y_1)$ និង $B(x_2, y_2)$ ក្នុងប្លង់កូអរដោនេ គណនាដោយប្រើ **ទ្រឹស្តីបទពីតាករ** លើត្រីកោណកែងដែលកកើតឡើងពីភាពខុសគ្នារវាង $x$ និង $y$។

> $AB = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$

## ការអនុវត្ត៖ កំណត់ប្រភេទត្រីកោណ

ដោយប្រើទ្រឹស្តីបទពីតាករច្រាស (converse), បើគណនាបាន $AB^2 = AC^2 + BC^2$ សម្រាប់ចំណុចបី $A, B, C$ ណាមួយ នោះត្រីកោណ $ABC$ ជាត្រីកោណកែងត្រង់ $C$។

ឧទាហរណ៍៖ $A(2,5)$, $B(6,2)$ → $AB = \\sqrt{(6-2)^2+(2-5)^2} = \\sqrt{16+9} = \\sqrt{25} = 5$។`,
    formulas: [
      { expr: 'AB = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}', noteKh: 'ចម្ងាយវាងពីរចំណុច' },
    ],
  },

  // ម.១០ សមីការនៃបន្ទាត់ — p105 (was "Functions & Graphs")
  'Functions & Graphs': {
    lessonKh: `## និយមន័យ

**សមីការនៃបន្ទាត់** មានរាង $y = ax + b$។ ក្រាហ្វរបស់វាជាបន្ទាត់ត្រង់ក្នុងប្លង់កូអរដោនេ។

- $a$ ហៅថា **មេគុណប្រាប់ទិស** (slope)៖ បើ $a > 0$ បន្ទាត់ឡើងពីឆ្វេងទៅស្តាំ, បើ $a < 0$ បន្ទាត់ចុះ
- $b$ ជាកន្លែងដែលបន្ទាត់កាត់អ័ក្ស $y$ (y-intercept)

> $y = ax + b$ — $a$ ជាមេគុណប្រាប់ទិស, $b$ ជាចំណុចកាត់អ័ក្ស $y$

## រកមេគុណប្រាប់ទិសពីចំណុចពីរ

បើដឹងចំណុចពីរ $(x_1, y_1)$ និង $(x_2, y_2)$ លើបន្ទាត់តែមួយ អាចរកមេគុណប្រាប់ទិសបាន៖

$$a = \\dfrac{y_2 - y_1}{x_2 - x_1}$$

## គណនាតម្លៃអនុគមន៍

ដើម្បីគណនាតម្លៃអនុគមន៍ $f(x)$ ត្រង់ $x = k$ គ្រាន់តែជំនួស $x$ ដោយ $k$ ចូលក្នុងរូបមន្ត។`,
    formulas: [
      { expr: 'y = ax + b', noteKh: 'សមីការនៃបន្ទាត់' },
      { expr: 'a = \\dfrac{y_2 - y_1}{x_2 - x_1}', noteKh: 'មេគុណប្រាប់ទិសពីចំណុចពីរ' },
      { expr: 'f(k) = a \\cdot k + b', noteKh: 'តម្លៃអនុគមន៍ត្រង់ x = k' },
    ],
  },

  // ម.១១ ប្រព័ន្ធសមីការដឺក្រេទី១ ពីរអញ្ញាត — p121
  'Systems of Linear Equations': {
    lessonKh: `## និយមន័យ

**ប្រព័ន្ធសមីការដឺក្រេទី១ ពីរអញ្ញាត** គឺជាសមីការពីរដែលមានអថេរ $x$ និង $y$ រួមគ្នា។ ចម្លើយគឺជាគូ $(x, y)$ ដែលផ្ទៀងផ្ទាត់សមីការទាំងពីរក្នុងពេលតែមួយ។

## វិធីជំនួស (Substitution)

ដោះស្រាយអថេរមួយពីសមីការមួយ រួចជំនួសកន្សោមនោះចូលក្នុងសមីការមួយទៀត។

## វិធីលុប (Elimination)

គុណសមីការមួយ ឬទាំងពីរ ឲ្យមេគុណអថេរមួយស្មើគ្នា (ឬផ្ទុយសញ្ញា) រួចបូក ឬដកសមីការទាំងពីរដើម្បីលុបអថេរនោះចេញ។

> ជំហានសំខាន់៖ ជ្រើសរើសវិធីណាដែលធ្វើឲ្យលេខគណនាសាមញ្ញបំផុត — មិនចាំបាច់ប្រើតែវិធីមួយជានិច្ចទេ`,
    formulas: [
      { expr: 'ax + by = c \\ ; \\ a\'x + b\'y = c\'', noteKh: 'រាងទូទៅនៃប្រព័ន្ធ' },
      { expr: 'y = \\dfrac{c - ax}{b}', noteKh: 'ដោះស្រាយ y សម្រាប់វិធីជំនួស' },
    ],
  },

  // ម.១២ ទ្រឹស្តីបទពីតាករ — p135
  'Pythagorean Theorem': {
    lessonKh: `## និយមន័យ

ក្នុង **ត្រីកោណកែង** ការេ **អ៊ីប៉ូតេនុស** (ជ្រុងទល់មុខមុំកែង) ស្មើនឹងផលបូកការេជ្រុងកែងទាំងពីរ។

> $a^2 + b^2 = c^2$ ដែល $c$ ជាអ៊ីប៉ូតេនុស

## ទ្រឹស្តីបទច្រាស

បើត្រីកោណណាមួយមានជ្រុងបី $a, b, c$ ដែល $a^2 + b^2 = c^2$ នោះត្រីកោណនោះជា **ត្រីកោណកែង** ជានិច្ច (ប្រើដើម្បីផ្ទៀងផ្ទាត់ថាតើត្រីកោណជាកែងឬអត់)។

## ត្រីកោណកែងល្បីៗ

ត្រីកូនចំនួនគត់ដែលបំពេញលក្ខខណ្ឌនេះ ហៅថា "ត្រីភាគពីតាករ" — មានប្រយោជន៍ក្នុងការគណនាលឿន៖ $(3,4,5)$, $(6,8,10)$, $(5,12,13)$។`,
    formulas: [
      { expr: 'a^2 + b^2 = c^2', noteKh: 'c ជាអ៊ីប៉ូតេនុស' },
      { expr: 'c = \\sqrt{a^2 + b^2}', noteKh: 'រកអ៊ីប៉ូតេនុស' },
      { expr: 'a = \\sqrt{c^2 - b^2}', noteKh: 'រកជ្រុងកែង' },
    ],
  },

  // ម.១៣ រង្វង់និងបន្ទាត់ — p143 (was "Circles")
  Circles: {
    lessonKh: `## លក្ខណៈអង្កត់កែងទៅនឹងខ្សែបន្ទាត់ចំណុច

បើគូសអង្កត់កែងពីផ្ចិត $O$ របស់រង្វង់ទៅកាន់ខ្សែបន្ទាត់ចំណុច (chord) $AB$ ត្រង់ចំណុច $M$ នោះ៖

> ចំណុច $M$ ជាចំណុចកណ្តាលនៃខ្សែបន្ទាត់ចំណុច $AB$ (អង្កត់កែងពីផ្ចិតទៅកាន់ខ្សែបន្ទាត់ចំណុច តែងតែកាត់វាកន្លះ)

ច្បាប់ច្រាស ក៏ពិតដែរ៖ បន្ទាត់ណាដែលកែងទៅនឹងកន្លះកណ្តាលនៃខ្សែបន្ទាត់ចំណុច ត្រូវតែឆ្លងកាត់ផ្ចិតរង្វង់។

## បន្ទាត់ប៉ះនៃរង្វង់ (Tangent Line)

**បន្ទាត់ប៉ះ** ជាបន្ទាត់ដែលប៉ះនឹងរង្វង់ត្រឹមតែចំណុចមួយ។ លក្ខណៈគន្លឹះ៖ កាំរង្វង់ត្រង់ចំណុចប៉ះ **កែងទៅនឹងបន្ទាត់ប៉ះ** នោះ។

## ទីតាំងទំនាក់ទំនងរវាងបន្ទាត់ និងរង្វង់

ដោយប្រៀបធៀបចម្ងាយ $d$ ពីផ្ចិតទៅបន្ទាត់ជាមួយកាំ $r$៖
- $d > r$ → បន្ទាត់ស្ថិតនៅខាងក្រៅរង្វង់ (មិនប៉ះ)
- $d = r$ → បន្ទាត់ជាបន្ទាត់ប៉ះ (ប៉ះមួយចំណុច)
- $d < r$ → បន្ទាត់កាត់រង្វង់ (ចម្ងាយ២ចំណុច)`,
    formulas: [
      { expr: 'OM \\perp AB \\implies AM = MB', noteKh: 'អង្កត់កែងកាត់ខ្សែបន្ទាត់ចំណុចជាកន្លះ' },
      { expr: 'OT \\perp \\ell', noteKh: 'កាំ OT ត្រង់ចំណុចប៉ះ T កែងនឹងបន្ទាត់ប៉ះ ℓ' },
      { expr: 'd = r', noteKh: 'ចម្ងាយ d ស្មើកាំ r — លក្ខខណ្ឌនៃបន្ទាត់ប៉ះ' },
    ],
  },

  // ម.១៤ លក្ខណៈមុំនៃរង្វង់ — p159 — NEW
  'Angle Properties of a Circle': {
    lessonKh: `## មុំទីរង្វង់ (Central Angle)

**មុំទីរង្វង់** មានកំពូលនៅចំណុចផ្ចិត $O$។ ចម្រៀកធ្នូដែលមុំកាត់ហៅថា ធ្នូនៃមុំនោះ (រង្វាស់អង្សាធ្នូ = រង្វាស់មុំទីរង្វង់)។

## មុំចារឹកក្នុងរង្វង់ (Inscribed Angle)

**មុំចារឹកក្នុងរង្វង់** មានកំពូលស្ថិតនៅលើរង្វង់ ហើយជ្រុងទាំងពីររាងជាខ្សែបន្ទាត់ចំណុចកាត់ធ្នូតែមួយ។

> មុំចារឹកក្នុងរង្វង់ ស្មើពាក់កណ្តាលមុំទីរង្វង់ដែលកាត់ធ្នូដូចគ្នា

## ផលវិបាក

- មុំចារឹកទាំងអស់ដែលកាត់ធ្នូតែមួយ មានរង្វាស់ស្មើគ្នា
- មុំចារឹកកាត់អង្កត់ផ្ចិត (ធ្នូពាក់ក្រុងទាំងមូល $180°$) តែងតែជាមុំកែង ($90°$)`,
    formulas: [
      { expr: '\\angle_{\\text{inscribed}} = \\dfrac{1}{2}\\angle_{\\text{central}}', noteKh: 'មុំចារឹក = ពាក់កណ្តាលមុំទីរង្វង់' },
      { expr: '\\angle_{\\text{inscribed in semicircle}} = 90^\\circ', noteKh: 'មុំចារឹកកាត់អង្កត់ផ្ចិត = មុំកែង' },
    ],
  },

  // ម.១៥ ទ្រឹស្តីបទតាលេស — p181 — NEW
  "Thales' Theorem": {
    lessonKh: `## ខ្លឹមសារទ្រឹស្តីបទ

បើបន្ទាត់ស្របគ្នាបី $(AA')$, $(BB')$, $(CC')$ កាត់ខ្សែកាត់ (transversal) ពីរផ្សេងគ្នា នោះ៖

> បើ $(AA') /\\!/ (BB') /\\!/ (CC')$ គេបាន $\\dfrac{AB}{A'B'} = \\dfrac{BC}{B'C'} = \\dfrac{AC}{A'C'}$

## ការអនុវត្តលើត្រីកោណ

ក្នុងត្រីកោណ បើខ្សែបន្ទាត់មួយស្របនឹងជ្រុងមួយ វានឹងកាត់ជ្រុងពីរផ្សេងទៀតតាមសមាមាត្រដូចគ្នា។ ច្បាប់ច្រាសក៏ត្រូវផងដែរ៖ បើសមាមាត្រពីរជ្រុងស្មើគ្នា នោះខ្សែកាត់ស្របនឹងជ្រុងទី ៣។

## ការអនុវត្តជាក់ស្តែង

ទ្រឹស្តីបទតាលេសប្រើសម្រាប់វាស់ចម្ងាយ ឬកម្ពស់ដែលពិបាកវាស់ដោយផ្ទាល់ (ឧទាហរណ៍ កម្ពស់ដើមឈើ ដោយប្រៀបធៀបនឹងស្រមោលនិងបង្គោលមួយដើមដែលដឹងកម្ពស់រួច)។`,
    formulas: [
      { expr: '\\dfrac{AB}{A\'B\'} = \\dfrac{BC}{B\'C\'} = \\dfrac{AC}{A\'C\'}', noteKh: 'ខ្សែស្របកាត់ខ្សែកាត់ពីរ' },
    ],
  },

  // ម.១៦ ត្រីកោណដូចគ្នា — p191
  'Similar Triangles': {
    lessonKh: `## និយមន័យ

ត្រីកោណពីរ **ដូចគ្នា** (similar) នៅពេលមុំរៀងគ្នាស្មើគ្នា ហើយជ្រុងរៀងគ្នាមានសមាមាត្រដូចគ្នា (មិនចាំបាច់ទំហំដូចគ្នា)។

> $\\dfrac{AB}{A'B'} = \\dfrac{BC}{B'C'} = \\dfrac{CA}{C'A'} = k$ — $k$ ជាមេគុណសមាមាត្រ

## លក្ខខណ្ឌដូចគ្នា

- **មុំ-មុំ** (AA): មុំពីរគូស្មើគ្នា
- **ជ្រុង-មុំ-ជ្រុង** (SAS): ជ្រុងពីរសមាមាត្រគ្នា ហើយមុំរវាងជ្រុងទាំងនោះស្មើគ្នា
- **ជ្រុង-ជ្រុង-ជ្រុង** (SSS): ជ្រុងទាំងបីសមាមាត្រគ្នា

## ផលធៀបក្រឡាផ្ទៃ

បើផលធៀបជ្រុងគឺ $k$ នោះផលធៀបក្រឡាផ្ទៃរវាងត្រីកោណទាំងពីរស្មើ $k^2$។`,
    formulas: [
      { expr: '\\dfrac{AB}{A\'B\'} = \\dfrac{BC}{B\'C\'} = \\dfrac{CA}{C\'A\'} = k', noteKh: 'ជ្រុងរៀងគ្នាសមាមាត្រ' },
      { expr: '\\dfrac{S}{S\'} = k^2', noteKh: 'ផលធៀបក្រឡាផ្ទៃ' },
    ],
  },

  // ម.១៧ ពហុកោណ — p213 — NEW
  Polygons: {
    lessonKh: `## និយមន័យ

**ពហុកោណ** ជាផ្ទៃកម្រិតបួនឬច្រើនជ្រុងដែលបង្កើតដោយខ្សែកាត់បិទជិត។ ពហុកោណដាក់ឈ្មោះតាមចំនួនជ្រុង៖ ត្រីកោណ (3), ចតុកោណ (4), បញ្ចកោណ (5), ឆកោណ (6)...

## ពហុកោណប៉ោង និងផៃ

- **ពហុកោណប៉ោង** (convex): ខ្សែកាត់ណាមួយភ្ជាប់ចំណុចពីរក្នុងពហុកោណ ស្ថិតនៅខាងក្នុងទាំងស្រុង
- **ពហុកោណផៃ** (concave): មានយ៉ាងហោចណាស់ជ្រុងក្នុងមួយធំជាង $180°$

## ចំនួនអង្កត់ទ្រូង

ពហុកោណ $n$ ជ្រុង មានចំនួនអង្កត់ទ្រូង (diagonals) គណនាដោយ៖

> ចំនួនអង្កត់ទ្រូង $= \\dfrac{n(n-3)}{2}$

## ផលបូកមុំក្នុង

ចាប់ផ្តើមពីត្រីកោណ (ផលបូកមុំក្នុង $= 180°$) ពហុកោណ $n$ ជ្រុងអាចបំបែកជាត្រីកោណ $(n-2)$ ដោយគូសអង្កត់ទ្រូងទាំងអស់ពីកំពូលតែមួយ។ ដូច្នេះ៖

> ផលបូកមុំក្នុងនៃពហុកោណ $n$ ជ្រុង $= (n-2) \\times 180°$`,
    formulas: [
      { expr: '\\text{Diagonals} = \\dfrac{n(n-3)}{2}', noteKh: 'ចំនួនអង្កត់ទ្រូង' },
      { expr: '\\text{Interior Angle Sum} = (n-2) \\times 180^\\circ', noteKh: 'ផលបូកមុំក្នុងពហុកោណ n ជ្រុង' },
    ],
  },

  // ម.១៨ សូលីត — p223
  'Solid Geometry & Volume': {
    lessonKh: `## និយមន័យ

**មាឌ** (volume) គឺជារង្វាស់ទំហំផ្ទុករបស់សូលីត។ **ផ្ទៃក្រឡា** (surface area) គឺជាផលបូកផ្ទៃក្រឡានៃមុខទាំងអស់របស់សូលីត។

## គូប និងបរិមាត្រកែង

**គូប** ជ្រុង $a$ មានមាឌ $a^3$។ **បរិមាត្រកែង** (ប្រអប់) មានមាឌ $= $ បណ្តោយ $\\times$ ទទឹង $\\times$ កម្ពស់។

## ស៊ីឡាំង, កោណ, ស្វ៊ែរ

**ស៊ីឡាំង** $= $ ក្រឡាផ្ទៃបាត $\\times$ កម្ពស់។ **កោណ** $= \\dfrac{1}{3}$ នៃស៊ីឡាំងដែលមានបាត និងកម្ពស់ដូចគ្នា។ **ស្វ៊ែរ** កាំ $r$ មានមាឌ $\\dfrac{4}{3}\\pi r^3$។

> ចាំច្បាប់មួយនេះ៖ កោណតែងតែមានមាឌស្មើ $\\dfrac{1}{3}$ នៃស៊ីឡាំងដែលមានបាត និងកម្ពស់ស្មើគ្នា`,
    formulas: [
      { expr: 'V_{\\text{cube}} = a^3', noteKh: 'គូបជ្រុង a' },
      { expr: 'V_{\\text{box}} = l \\times w \\times h', noteKh: 'បរិមាត្រកែង' },
      { expr: 'V_{\\text{cylinder}} = \\pi r^2 h', noteKh: 'ស៊ីឡាំង' },
      { expr: 'V_{\\text{cone}} = \\dfrac{1}{3}\\pi r^2 h', noteKh: 'កោណ' },
      { expr: 'V_{\\text{sphere}} = \\dfrac{4}{3}\\pi r^3', noteKh: 'ស្វ៊ែរ' },
    ],
  },
};

async function seed() {
  console.log(`🌱 Grade-9 Math lesson seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const subject = await prisma.subject.findUnique({
    where: { code: SUBJECT_CODE },
    select: { id: true },
  });
  if (!subject) throw new Error(`Subject ${SUBJECT_CODE} not found`);

  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const [unitName, lesson] of Object.entries(LESSONS)) {
    const topic = await prisma.topic.findFirst({
      where: { subjectId: subject.id, parentId: null, name: unitName },
      select: { id: true, miniLessonKh: true, formulaSheet: true },
    });
    if (!topic) {
      console.log(`  ⏭️  unit "${unitName}" not found — run seed-topics-math-g9 first`);
      missing += 1;
      continue;
    }

    const sameLesson = topic.miniLessonKh === lesson.lessonKh;
    const sameFormulas = JSON.stringify(topic.formulaSheet) === JSON.stringify(lesson.formulas);
    if (sameLesson && sameFormulas) {
      unchanged += 1;
      continue;
    }

    console.log(`  ✏️  ${unitName} — lesson ${lesson.lessonKh.length} chars, ${lesson.formulas.length} formulas`);
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
