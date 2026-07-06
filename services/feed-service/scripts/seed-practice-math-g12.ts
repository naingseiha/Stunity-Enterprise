/**
 * Seed: practice question banks for grade-12 Mathematics (Bac II exam preparation).
 *
 * Supports both Science Track (MATH-G12-SCIENCE) and Social Science Track (MATH-G12-SOCIAL).
 * For each unit, seeds a comprehensive set of practice exercises covering all 6 schemas:
 *   - MULTIPLE_CHOICE, TRUE_FALSE (row-backed for Spaced Repetition / Recall Cards)
 *   - SHORT_ANSWER, FILL_IN_BLANK, ORDERING, MATCHING (authoring/grading JSON schemas)
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: updates existing QUIZ posts
 * or creates new ones.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-practice-math-g12.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-practice-math-g12.ts --apply  # write
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { prepareQuizQuestions } from '../src/utils/quizQuestionRows';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const AUTHOR_OVERRIDE = process.env.SEED_AUTHOR_ID || null;

type QuestionSeed = {
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';
  options?: string[];
  correctAnswer: any;
  points?: number;
  explanation: string;
  /** 1 (easiest) .. 5 (hardest) — optional, only for newly-authored questions. */
  difficulty?: number;
};

// =========================================================================
// 1. SCIENCE TRACK PRACTICE BANK (Advanced / ថ្នាក់វិទ្យាសាស្ត្រ)
// =========================================================================
const SCIENCE_PRACTICE: Record<string, QuestionSeed[]> = {
  'លីមីតនៃអនុគមន៍': [
    {
      text: 'គណនាលីមីត $L = \\lim_{x \\to 0} \\dfrac{\\sin(3x)}{x}$។',
      type: 'MULTIPLE_CHOICE',
      options: ['3', '1', '0', '1/3'],
      correctAnswer: 0,
      points: 10,
      explanation: 'តាមរូបមន្ត $\\lim_{x \\to 0} \\dfrac{\\sin(ax)}{x} = a$។ ដូច្នេះ $\\lim_{x \\to 0} \\dfrac{\\sin(3x)}{x} = 3$។',
    },
    {
      text: 'គណនាលីមីត $L = \\lim_{x \\to 0} \\dfrac{1 - \\cos(2x)}{x^2}$។',
      type: 'MULTIPLE_CHOICE',
      options: ['2', '1', '4', '1/2'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ប្រើរូបមន្តត្រីកោណមាត្រ $1 - \\cos(2x) = 2\\sin^2 x$។ គេបាន $L = \\lim_{x \\to 0} \\dfrac{2\\sin^2 x}{x^2} = 2(1)^2 = 2$។',
    },
    {
      text: 'លីមីត $\\lim_{x \\to \\infty} \\left(1 + \\dfrac{1}{x}\\right)^x$ មានតម្លៃស្មើនឹងចំនួនអយល័រ $e$។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'នេះជានិយមន័យគ្រឹះនៃចំនួនអ៊ិចស្ប៉ូណង់ស្យែល $e \\approx 2.71828$។',
    },
    {
      text: 'គណនាលីមីត $L = \\lim_{x \\to 0} \\dfrac{e^{2x} - 1}{x}$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '2',
      points: 10,
      explanation: 'ប្រើរូបមន្ត $\\lim_{u \\to 0} \\dfrac{e^u - 1}{u} = 1$ ដោយតាង $u = 2x \\implies L = 2 \\lim_{u \\to 0} \\dfrac{e^u - 1}{u} = 2$។',
    },
    {
      text: 'បំពេញតម្លៃលីមីត៖ $\\lim_{x \\to 0} \\dfrac{\\ln(1 + 5x)}{x} = [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: '5',
      points: 10,
      explanation: 'តាមវិធានឡូពីតាល់ ឬរូបមន្តគ្រឹះ $\\lim_{x \\to 0} \\dfrac{\\ln(1 + ax)}{x} = a$ ដូច្នេះចម្លើយគឺ 5។',
    },
    {
      text: 'រៀបចំលំដាប់លំដោយនៃជំហានគណនាលីមីត $\\lim_{x \\to 2} \\dfrac{x^2 - 4}{x - 2}$៖',
      type: 'ORDERING',
      options: [
        'ជំនួស $x = 2$ បានទម្រង់មិនកំណត់ $\\dfrac{0}{0}$',
        'ដាក់ភាគយប់ជាកត្តា៖ $x^2 - 4 = (x-2)(x+2)$',
        'សម្រួលកត្តា $(x-2)$ ចោល សល់ $\\lim_{x \\to 2} (x+2)$',
        'ជំនួស $x = 2$ ចូល បានចម្លើយ $2 + 2 = 4$',
      ],
      correctAnswer: [0, 1, 2, 3],
      points: 15,
      explanation: 'ក្នុងការគណនាលីមីតទម្រង់ 0/0 គេត្រូវដាក់ជាកត្តា រួចសម្រួលកត្តារួមចោលទើបជំនួសលេខ។',
    },
    {
      text: 'ផ្គូរផ្គងលីមីតខាងក្រោមទៅនឹងតម្លៃត្រឹមត្រូវរបស់វា៖',
      type: 'MATCHING',
      options: ['$\\lim_{x \\to 0} \\dfrac{\\sin x}{x}$', '$\\lim_{x \\to 0} \\dfrac{1-\\cos x}{x^2}$', '$\\lim_{x \\to 0} \\dfrac{e^x-1}{x}$', '$\\lim_{x \\to 0} \\dfrac{\\tan x}{x}$'],
      correctAnswer: ['1', '1/2', '1', '1'],
      points: 15,
      explanation: 'រូបមន្តលីមីតគ្រឹះត្រីកោណមាត្រ និងអ៊ិចស្ប៉ូណង់ស្យែល។',
    },
  ],

  'ដេរីវេនៃអនុគមន៍': [
    {
      text: 'រកដេរីវេនៃអនុគមន៍ $f(x) = x^3 - 5x^2 + 4x - 2$។',
      type: 'MULTIPLE_CHOICE',
      options: ['3x^2 - 10x + 4', '3x^2 - 5x + 4', 'x^2 - 10x + 4', '3x^2 - 10x - 2'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ប្រើរូបមន្ត $(x^n)\' = n x^{n-1}$ គេបាន $f\'(x) = 3x^2 - 10x + 4$។',
    },
    {
      text: 'គណនាដេរីវេនៃអនុគមន៍ $y = \\sin(3x + 1)$។',
      type: 'MULTIPLE_CHOICE',
      options: ['3\\cos(3x + 1)', '\\cos(3x + 1)', '-3\\cos(3x + 1)', '3\\sin(3x + 1)'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ប្រើរូបមន្តអនុគមន៍បណ្ដាក់ $(\\sin u)\' = u\' \\cos u$ ដែល $u = 3x+1 \\implies u\' = 3$។',
    },
    {
      text: 'ត្រង់ចំណុចរបត់ (Inflection Point) នៃខ្សែរកោង ដេរីវេទី ២ ស្មើកូដូន $(f\'\'(x) = 0)$ ហើយប្តូរសញ្ញា។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'ចំណុចរបត់ជាចំណុចដែលខ្សែរកោងប្តូរភាពប៉ោង-ផត ដែលកំណត់ដោយ $f\'\'(x) = 0$ និងប្តូរសញ្ញា។',
    },
    {
      text: 'បើ $f(x) = e^{4x}$ នោះដេរីវេទី ១ $f\'(0)$ មានតម្លៃស្មើប៉ុន្មាន?',
      type: 'SHORT_ANSWER',
      correctAnswer: '4',
      points: 10,
      explanation: '$f\'(x) = (4x)\' e^{4x} = 4e^{4x}$។ ពេល $x=0 \\implies f\'(0) = 4e^0 = 4$។',
    },
    {
      text: 'ដេរីវេនៃអនុគមន៍ផលគុណ $(uv)\' = u\'v + [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'uv\'',
      points: 10,
      explanation: 'រូបមន្តដេរីវេផលគុណគឺ $(uv)\' = u\'v + uv\'$។',
    },
    {
      text: 'រៀបចំជំហានក្នុងការរកចំណុចបរិមា (អតិបរមា/អប្បបរមា) នៃអនុគមន៍ $f(x)$៖',
      type: 'ORDERING',
      options: [
        'គណនាដេរីវេទី ១ $f\'(x)$',
        'ដោះស្រាយសមីការ $f\'(x) = 0$ ដើម្បីរកឫស',
        'សិក្សាសញ្ញានៃ $f\'(x)$ លើតារាងអនូតោនភាព',
        'កំណត់ប្រភេទបរិមា (អតិបរមាបើប្តូរពី + ទៅ - / អប្បបរមាបើប្តូរពី - ទៅ +)',
      ],
      correctAnswer: [0, 1, 2, 3],
      points: 15,
      explanation: 'នេះជាលំដាប់លំដោយស្តង់ដាក្នុងការសិក្សាអនូតោនភាព និងរកបរិមានៃអនុគមន៍។',
    },
    {
      text: 'ផ្គូរផ្គងអនុគមន៍ទៅនឹងដេរីវេរបស់វា៖',
      type: 'MATCHING',
      options: ['$\\sin x$', '$\\cos x$', '$\\tan x$', '$\\ln x$'],
      correctAnswer: ['$\\cos x$', '$-\\sin x$', '$1/\\cos^2 x$', '$1/x$'],
      points: 15,
      explanation: 'រូបមន្តដេរីវេគ្រឹះនៃអនុគមន៍ត្រីកោណមាត្រ និងឡូការីត។',
    },
  ],

  'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត': [
    {
      text: 'ដោះស្រាយសមីការអ៊ិចស្ប៉ូណង់ស្យែល $2^{x+1} = 16$។',
      type: 'MULTIPLE_CHOICE',
      options: ['x = 3', 'x = 4', 'x = 2', 'x = 5'],
      correctAnswer: 0,
      points: 10,
      explanation: '$16 = 2^4 \\implies 2^{x+1} = 2^4 \\implies x + 1 = 4 \\implies x = 3$។',
    },
    {
      text: 'គណនាតម្លៃនៃកន្សោម $\\ln(e^5) + e^{\\ln 3}$។',
      type: 'MULTIPLE_CHOICE',
      options: ['8', '15', '5e + 3', '2'],
      correctAnswer: 0,
      points: 10,
      explanation: 'តាមលក្ខណៈឡូការីត និងអ៊ិចស្ប៉ូណង់ស្យែល៖ $\\ln(e^5) = 5$ និង $e^{\\ln 3} = 3$។ ដូច្នេះ $5 + 3 = 8$។',
    },
    {
      text: 'អនុគមន៍ឡូការីតនេពែរ $y = \\ln x$ កំណត់ចំពោះគ្រប់តម្លៃ $x \\in \\mathbb{R}$។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'FALSE',
      points: 5,
      explanation: 'អនុគមន៍ឡូការីតកំណត់តែចំពោះ $x > 0$ ប៉ុណ្ណោះ (មិនកំណត់ចំពោះលេខអវិជ្ជមាន និងសូន្យ)។',
    },
    {
      text: 'ដោះស្រាយសមីការ $\\ln(x - 1) = 0$។ តើ $x$ ស្មើប៉ុន្មាន?',
      type: 'SHORT_ANSWER',
      correctAnswer: '2',
      points: 10,
      explanation: '$\\ln(x - 1) = 0 \\implies x - 1 = e^0 = 1 \\implies x = 2$។',
    },
    {
      text: 'តាមលក្ខណៈឡូការីត៖ $\\ln(a \\cdot b) = \\ln a + [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: '\\ln b',
      points: 10,
      explanation: 'ឡូការីតនៃផលគុណស្មើនឹងផលបូកឡូការីត៖ $\\ln(ab) = \\ln a + \\ln b$។',
    },
    {
      text: 'រៀបចំជំហានដោះស្រាយសមីការ $\\ln x + \\ln(x+2) = \\ln 3$៖',
      type: 'ORDERING',
      options: [
        'កំណត់លក្ខខណ្ឌ៖ $x > 0$ និង $x+2 > 0 \\implies x > 0$',
        'ប្រើលក្ខណៈផលគុណ៖ $\\ln[x(x+2)] = \\ln 3$',
        'លុបឡូការីត៖ $x^2 + 2x = 3 \\implies x^2 + 2x - 3 = 0$',
        'ដោះស្រាយសមីការបាន $x = 1$ ឬ $x = -3$ (យកតែ $x=1$ តាមលក្ខខណ្ឌ)',
      ],
      correctAnswer: [0, 1, 2, 3],
      points: 15,
      explanation: 'ការដោះស្រាយសមីការឡូការីតត្រូវតែកំណត់លក្ខខណ្ឌជាមុនជានិច្ច។',
    },
  ],

  'អាំងតេក្រាល': [
    {
      text: 'គណនាអាំងតេក្រាលមិនកំណត់ $\\int (3x^2 - 4x + 1) dx$។',
      type: 'MULTIPLE_CHOICE',
      options: ['x^3 - 2x^2 + x + C', '3x^3 - 4x^2 + x + C', 'x^3 - 4x^2 + x + C', '6x - 4 + C'],
      correctAnswer: 0,
      points: 10,
      explanation: '$\\int 3x^2 dx - \\int 4x dx + \\int 1 dx = x^3 - 2x^2 + x + C$។',
    },
    {
      text: 'គណនាអាំងតេក្រាលកំណត់ $I = \\int_0^1 e^{2x} dx$។',
      type: 'MULTIPLE_CHOICE',
      options: ['\\dfrac{e^2 - 1}{2}', 'e^2 - 1', '\\dfrac{e^2 + 1}{2}', '2(e^2 - 1)'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ព្រីមីទីវនៃ $e^{2x}$ គឺ $\\dfrac{1}{2}e^{2x}$។ ដូច្នេះ $I = [\\dfrac{1}{2}e^{2x}]_0^1 = \\dfrac{e^2 - 1}{2}$។',
    },
    {
      text: 'រូបមន្តអាំងតេក្រាលដោយផ្នែក (Integration by Parts) គឺ $\\int u dv = uv - \\int v du$។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'នេះជារូបមន្តគ្រឹះនៃអាំងតេក្រាលដោយផ្នែក។',
    },
    {
      text: 'គណនាអាំងតេក្រាលកំណត់ $I = \\int_1^2 \\dfrac{1}{x} dx$។ (សរសេរចម្លើយជា $\\ln ...$)',
      type: 'SHORT_ANSWER',
      correctAnswer: '\\ln 2',
      points: 10,
      explanation: '$\\int_1^2 \\dfrac{1}{x} dx = [\\ln|x|]_1^2 = \\ln 2 - \\ln 1 = \\ln 2$។',
    },
    {
      text: 'ក្រឡាផ្ទៃខណ្ឌដោយខ្សែរកោង $y = f(x) > 0$ និងអ័ក្ស $x$ ពី $x=a$ ទៅ $x=b$ គឺ $S = \\int_a^b [___] dx$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'f(x)',
      points: 10,
      explanation: 'ក្រឡាផ្ទៃខណ្ឌដោយខ្សែរកោងនិងអ័ក្សអាប់ស៊ីសគឺ $S = \\int_a^b f(x) dx$។',
    },
    {
      text: 'រៀបចំជំហានគណនាអាំងតេក្រាលដោយផ្នែក $I = \\int x e^x dx$៖',
      type: 'ORDERING',
      options: [
        'តាង $u = x \\implies du = dx$',
        'តាង $dv = e^x dx \\implies v = e^x$',
        'អនុវត្តរូបមន្ត៖ $I = x e^x - \\int e^x dx$',
        'គណនាចុងក្រោយ៖ $I = x e^x - e^x + C = e^x(x - 1) + C$',
      ],
      correctAnswer: [0, 1, 2, 3],
      points: 15,
      explanation: 'វិធីអាំងតេក្រាលដោយផ្នែកដោយជ្រើសរើស u និង dv អោយបានត្រឹមត្រូវ។',
    },
  ],

  'សមីការឌីផេរ៉ង់ស្យែល': [
    {
      text: 'រកចម្លើយទូទៅនៃសមីការឌីផេរ៉ង់ស្យែល $y\' + 3y = 0$។',
      type: 'MULTIPLE_CHOICE',
      options: ['y = A e^{-3x}', 'y = A e^{3x}', 'y = 3 e^{Ax}', 'y = A x^{-3}'],
      correctAnswer: 0,
      points: 10,
      explanation: 'សមីការទម្រង់ $y\' + ay = 0$ មានចម្លើយទូទៅ $y = A e^{-ax}$។ ក្នុងទីនេះ $a=3 \\implies y = A e^{-3x}$។',
    },
    {
      text: 'សមីការសម្គាល់នៃសមីការឌីផេរ៉ង់ស្យែល $y\'\' - 5y\' + 6y = 0$ គឺ៖',
      type: 'MULTIPLE_CHOICE',
      options: ['r^2 - 5r + 6 = 0', 'r^2 + 5r + 6 = 0', 'r^2 - 5r - 6 = 0', '2r - 5 = 0'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ជំនួស $y\'\' \\to r^2, y\' \\to r, y \\to 1$ គេបានសមីការសម្គាល់ $r^2 - 5r + 6 = 0$។',
    },
    {
      text: 'បើប្លែកដេលតា ($\\Delta$) នៃសមីការសម្គាល់តូចជាងសូន្យ ($\\Delta < 0$) នោះចម្លើយសមីការឌីផេរ៉ង់ស្យែលលំដាប់ទី ២ មានទម្រង់ជាអនុគមន៍ត្រីកោណមាត្រស៊ីនុស និងកូស៊ីនុស។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'កាលណា $\\Delta < 0$ ឫសជាចំនួនកុំផ្លិចឆ្លាស់ $r = \\alpha \\pm i\\beta$ ដែលនាំអោយចម្លើយមានទម្រង់ $y = e^{\\alpha x}(A\\cos\\beta x + B\\sin\\beta x)$។',
    },
    {
      text: 'សមីការសម្គាល់ $r^2 - 4 = 0$ មានឫសវិជ្ជមានស្មើប៉ុន្មាន?',
      type: 'SHORT_ANSWER',
      correctAnswer: '2',
      points: 10,
      explanation: '$r^2 - 4 = 0 \\implies r^2 = 4 \\implies r = \\pm 2$។ ឫសវិជ្ជមានគឺ 2។',
    },
    {
      text: 'ចម្លើយទូទៅនៃសមីការ $y\'\' = 0$ គឺ $y = Ax + [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'B',
      points: 10,
      explanation: 'អាំងតេក្រាលពីរដងនៃ 0៖ $y\' = A \\implies y = Ax + B$។',
    },
    {
      text: 'រៀបចំជំហានដោះស្រាយសមីការឌីផេរ៉ង់ស្យែល $y\'\' - 4y\' + 4y = 0$៖',
      type: 'ORDERING',
      options: [
        'សរសេរកន្សោមសមីការសម្គាល់៖ $r^2 - 4r + 4 = 0$',
        'គណនាឫស៖ $(r-2)^2 = 0 \\implies$ មានឫសឌុប $r_0 = 2$',
        'អនុវត្តរូបមន្តឫសឌុប៖ $y = (Ax + B) e^{r_0 x}$',
        'សរសេរចម្លើយទូទៅ៖ $y = (Ax + B) e^{2x}$',
      ],
      correctAnswer: [0, 1, 2, 3],
      points: 15,
      explanation: 'ជំហានដោះស្រាយសមីការលំដាប់ទី ២ ករណីឫសឌុប ($\\Delta = 0$)។',
    },
  ],

  'ចំនួនកុំផ្លិច': [
    {
      text: 'គណនាម៉ូឌុលនៃចំនួនកុំផ្លិច $z = 3 + 4i$។',
      type: 'MULTIPLE_CHOICE',
      options: ['5', '7', '25', '1'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ម៉ូឌុល $|z| = \\sqrt{a^2 + b^2} = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$។',
    },
    {
      text: 'រកចំនួនកុំផ្លិចឆ្លាស់ (Conjugate) នៃ $z = -2 + 5i$។',
      type: 'MULTIPLE_CHOICE',
      options: ['-2 - 5i', '2 - 5i', '2 + 5i', '-2 + 5i'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ចំនួនកុំផ្លិចឆ្លាស់នៃ $a + bi$ គឺ $\\bar{z} = a - bi$។ ដូច្នេះ $\\bar{z} = -2 - 5i$។',
    },
    {
      text: 'ក្នុងសំណុំចំនួនកុំផ្លិច ការេនៃឯកតានិម្មិតស្មើនឹងដកមួយ ($i^2 = -1$)។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'នេះជានិយមន័យគ្រឹះនៃឯកតានិម្មិត $i$។',
    },
    {
      text: 'គណនាផលគុណ $(1 + i)(1 - i)$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '2',
      points: 10,
      explanation: 'ប្រើរូបមន្ត $(a+bi)(a-bi) = a^2 + b^2 = 1^2 + 1^2 = 2$។',
    },
    {
      text: 'តាមទ្រឹស្ដីបទដឺម័រ៖ $(\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin([___])$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'n\\theta',
      points: 10,
      explanation: 'ទ្រឹស្ដីបទដឺម័រ៖ $(\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta)$។',
    },
    {
      text: 'រៀបចំជំហានសរសេរចំនួនកុំផ្លិច $z = 1 + i\\sqrt{3}$ ជាទម្រង់ត្រីកោណមាត្រ៖',
      type: 'ORDERING',
      options: [
        'គណនាម៉ូឌុល $r = \\sqrt{1^2 + (\\sqrt{3})^2} = \\sqrt{4} = 2$',
        'ទាញម៉ូឌុលជាកត្តា៖ $z = 2\\left(\\dfrac{1}{2} + i\\dfrac{\\sqrt{3}}{2}\\right)$',
        'រកអាគុយម៉ង់ $\\theta$៖ $\\cos\\theta = 1/2$ និង $\\sin\\theta = \\sqrt{3}/2 \\implies \\theta = \\pi/3$',
        'សរសេរទម្រង់ត្រីកោណមាត្រ៖ $z = 2\\left(\\cos\\dfrac{\\pi}{3} + i\\sin\\dfrac{\\pi}{3}\\right)$',
      ],
      correctAnswer: [0, 1, 2, 3],
      points: 15,
      explanation: 'របៀបបំលែងចំនួនកុំផ្លិចពីទម្រង់ពីជគណិតទៅទម្រង់ត្រីកោណមាត្រ។',
    },
  ],

  'ធរណីមាត្រក្នុងលំហ': [
    {
      text: 'គណនាចម្ងាយរវាងចំណុច $A(1, 0, 0)$ និង $B(0, 2, 2)$ ក្នុងលំហកូអរដោនេ $(O, \\vec{i}, \\vec{j}, \\vec{k})$។',
      type: 'MULTIPLE_CHOICE',
      options: ['3', 'sqrt(8)', '9', '2'],
      correctAnswer: 0,
      points: 10,
      explanation: '$AB = \\sqrt{(0-1)^2 + (2-0)^2 + (2-0)^2} = \\sqrt{1 + 4 + 4} = \\sqrt{9} = 3$។',
    },
    {
      text: 'គណនាផលគុណស្កាលែរ $\\vec{u} \\cdot \\vec{v}$ បើ $\\vec{u} = (2, -1, 3)$ និង $\\vec{v} = (1, 4, -2)$។',
      type: 'MULTIPLE_CHOICE',
      options: ['-8', '8', '0', '-2'],
      correctAnswer: 0,
      points: 10,
      explanation: '$\\vec{u} \\cdot \\vec{v} = (2)(1) + (-1)(4) + (3)(-2) = 2 - 4 - 6 = -8$។',
    },
    {
      text: 'វ៉ិចទ័រពីរ $\\vec{u}$ និង $\\vec{v}$ កែងគ្នា លុះត្រាតែផលគុណស្កាលែររបស់វាស្មើសូន្យ $(\\vec{u} \\cdot \\vec{v} = 0)$។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'លក្ខខណ្ឌវ៉ិចទ័រកែងគ្នាគឺផលគុណស្កាលែរស្មើសូន្យ។',
    },
    {
      text: 'រកកូអរដោនេទី ១ (អាប់ស៊ីស x) នៃវ៉ិចទ័រ $\\overrightarrow{AB}$ បើ $A(2, 3, -1)$ និង $B(5, 1, 4)$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '3',
      points: 10,
      explanation: '$x_B - x_A = 5 - 2 = 3$។',
    },
    {
      text: 'វ៉ិចទ័រពីរស្របគ្នា លុះត្រាតែផលគុណវ៉ិចទ័រ (Cross Product) របស់វាស្មើនឹងវ៉ិចទ័រ [___]',
      type: 'FILL_IN_BLANK',
      correctAnswer: '0',
      points: 10,
      explanation: '$\\vec{u} // \\vec{v} \\iff \\vec{u} \\times \\vec{v} = \\vec{0}$។',
    },
    {
      text: 'រៀបចំជំហានគណនាក្រឡាផ្ទៃត្រីកោណ $ABC$ ក្នុងលំហ៖',
      type: 'ORDERING',
      options: [
        'រកកូអរដោនេវ៉ិចទ័រ $\\overrightarrow{AB}$ និង $\\overrightarrow{AC}$',
        'គណនាផលគុណវ៉ិចទ័រ $\\vec{w} = \\overrightarrow{AB} \\times \\overrightarrow{AC}$',
        'គណនាម៉ូឌុលនៃវ៉ិចទ័រ $|\\vec{w}| = \\sqrt{x^2 + y^2 + z^2}$',
        'អនុវត្តរូបមន្តក្រឡាផ្ទៃត្រីកោណ៖ $S = \\dfrac{1}{2} |\\overrightarrow{AB} \\times \\overrightarrow{AC}|$',
      ],
      correctAnswer: [0, 1, 2, 3],
      points: 15,
      explanation: 'វិធីគណនាក្រឡាផ្ទៃត្រីកោណក្នុងលំហដោយប្រើផលគុណវ៉ិចទ័រ។',
    },
  ],

  'សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់ និងប្លង់ក្នុងលំហ': [
    {
      text: 'វ៉ិចទ័រន័រម៉ាល់នៃប្លង់ $(P): 2x - 3y + z - 5 = 0$ គឺ៖',
      type: 'MULTIPLE_CHOICE',
      options: ['(2, -3, 1)', '(2, 3, 1)', '(-3, 1, -5)', '(2, -3, -5)'],
      correctAnswer: 0,
      points: 10,
      explanation: 'មេគុណនៃ $x, y, z$ ក្នុងសមីការប្លង់ $ax + by + cz + d = 0$ គឺជាកូអរដោនេនៃវ៉ិចទ័រន័រម៉ាល់ $\\vec{n} = (a, b, c)$។',
    },
    {
      text: 'ចំណុច $A(1, 2, -1)$ ស្ថិតនៅលើប្លង់ $(P): x + y + z - 2 = 0$។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'ជំនួសកូអរដោនេ $A$ ចូល៖ $1 + 2 + (-1) - 2 = 3 - 3 = 0$ ផ្ទៀងផ្ទាត់សមីការ។',
    },
    {
      text: 'រកចម្ងាយពីគល់កូអរដោនេ $O(0,0,0)$ ទៅប្លង់ $(P): 2x + 2y + z - 6 = 0$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '2',
      points: 10,
      explanation: '$d(O, P) = \\dfrac{|-6|}{\\sqrt{2^2 + 2^2 + 1^2}} = \\dfrac{6}{\\sqrt{9}} = \\dfrac{6}{3} = 2$។',
    },
    {
      text: 'សមីការប្លង់ឆ្លងកាត់ចំណុច $A(x_0, y_0, z_0)$ មានវ៉ិចទ័រន័រម៉ាល់ $\\vec{n}=(a,b,c)$ គឺ $a(x-x_0) + b(y-y_0) + c(z-z_0) = [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: '0',
      points: 10,
      explanation: 'សមីការប្លង់កំណត់ដោយផលគុណស្កាលែរ $\\vec{n} \\cdot \\overrightarrow{AM} = 0$។',
    },
  ],

  'ប្រូបាប': [
    {
      text: 'កាក់មួយត្រូវបានបោះ 3 ដង។ តើប្រូបាបដែលចេញមុខ "ក្បាល" (H) ទាំង 3 ដងស្មើប៉ុន្មាន?',
      type: 'MULTIPLE_CHOICE',
      options: ['1/8', '1/4', '3/8', '1/2'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ក្នុងការបោះកាក់មួយដង ប្រូបាបចេញក្បាលគឺ $1/2$។ ព្រឹត្តិការណ៍ទាំង 3 មិនទាក់ទងគ្នា $\\implies (1/2)^3 = 1/8$។',
    },
    {
      text: 'បើព្រឹត្តិការណ៍ $A$ និង $B$ មិនទាក់ទងគ្នា (Independent) នោះ $P(A \\cap B) = P(A) \\times P(B)$។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'នេះជានិយមន័យនៃព្រឹត្តិការណ៍មិនទាក់ទងគ្នា។',
    },
    {
      text: 'ក្នុងថង់មួយមានប៊ូលក្រហម 3 និងខៀវ 2។ ចាប់យកប៊ូលមួយដោយចៃដន្យ។ តើប្រូបាបបានប៊ូលក្រហមស្មើប៉ុន្មាន? (សរសេរជាប្រភាគ a/b)',
      type: 'SHORT_ANSWER',
      correctAnswer: '3/5',
      points: 10,
      explanation: 'ចំនួនករណីស្រប = 3 (ក្រហម), ចំនួនករណីអាច = 3 + 2 = 5។ ប្រូបាប = 3/5។',
    },
    {
      text: 'រូបមន្តប្រូបាបមានលក្ខខណ្ឌ៖ $P(A|B) = \\dfrac{P(A \\cap B)}{[___]}$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'P(B)',
      points: 10,
      explanation: 'ប្រូបាប A ដោយលក្ខខណ្ឌ B ចែកនឹងប្រូបាបនៃលក្ខខណ្ឌ B។',
    },
  ],

  'ស្ថិតិ និងបំណែងចែកប្រូបាប': [
    {
      text: 'ចំពោះបំណែងចែកទ្វេធា $B(n, p)$ សង្ឃឹមគណិត (មធ្យម) ស្មើនឹង៖',
      type: 'MULTIPLE_CHOICE',
      options: ['np', 'npq', 'sqrt(npq)', 'p/n'],
      correctAnswer: 0,
      points: 10,
      explanation: 'រូបមន្តសង្ឃឹមគណិតនៃបំណែងចែកទ្វេធាគឺ $\\mu = E(X) = np$។',
    },
    {
      text: 'ផលបូកប្រូបាបសរុបនៃគ្រប់តម្លៃទាំងអស់របស់អញ្ញាតចៃដន្យដាច់ ត្រូវតែស្មើនឹង ១ ជានិច្ច ($\\sum P_i = 1$)។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'លក្ខណៈគ្រឹះនៃបំណែងចែកប្រូបាបគឺផលបូកប្រូបាបសរុបស្មើ ១។',
    },
    {
      text: 'រកសង្ឃឹមគណិត $E(X)$ នៃបំណែងចែកទ្វេធាដែលមាន $n = 10$ និង $p = 0.5$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '5',
      points: 10,
      explanation: '$E(X) = n \\times p = 10 \\times 0.5 = 5$។',
    },
    {
      text: 'រូបមន្តវ៉ារ្យង់នៃបំណែងចែកទ្វេធាគឺ $V(X) = n \\cdot p \\cdot [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'q',
      points: 10,
      explanation: '$V(X) = npq$ ដែល $q = 1 - p$ ជាប្រូបាបបរាជ័យ។',
    },
  ],
};

// =========================================================================
// 2. SOCIAL SCIENCE TRACK PRACTICE BANK (Basic / ថ្នាក់វិទ្យាសាស្ត្រសង្គម)
// =========================================================================
const SOCIAL_PRACTICE: Record<string, QuestionSeed[]> = {
  'លីមីត និងដេរីវេនៃអនុគមន៍': [
    {
      text: 'គណនាលីមីត $\\lim_{x \\to 3} (2x^2 - 5)$។',
      type: 'MULTIPLE_CHOICE',
      options: ['13', '18', '7', '11'],
      correctAnswer: 0,
      points: 10,
      explanation: 'ជំនួស $x=3$ ចូលកន្សោម៖ $2(3)^2 - 5 = 2(9) - 5 = 18 - 5 = 13$។',
    },
    {
      text: 'ដេរីវេនៃអនុគមន៍ $y = 5x^4 - 3x^2 + 7$ គឺ៖',
      type: 'MULTIPLE_CHOICE',
      options: ['20x^3 - 6x', '20x^3 - 3x', '5x^3 - 6x', '20x^4 - 6x'],
      correctAnswer: 0,
      points: 10,
      explanation: '$(5x^4)\' - (3x^2)\' + (7)\' = 20x^3 - 6x$។',
    },
    {
      text: 'ដេរីវេនៃចំនួនថេរណាមួយ (Constant) គឺស្មើនឹងសូន្យជានិច្ច។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'ចំនួនថេរមិនប្រែប្រួល ដូច្នេះអត្រាបម្រែបម្រួល (ដេរីវេ) របស់វាស្មើសូន្យ។',
    },
    {
      text: 'គណនាតម្លៃដេរីវេ $f\'(1)$ បើ $f(x) = x^2 + 4x$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '6',
      points: 10,
      explanation: '$f\'(x) = 2x + 4 \\implies f\'(1) = 2(1) + 4 = 6$។',
    },
    {
      text: 'បើ $f\'(x) > 0$ លើចន្លោះ $[a, b]$ នោះអនុគមន៍ $f(x)$ ជាអនុគមន៍ [___] លើចន្លោះនោះ។',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'កើន',
      points: 10,
      explanation: 'ដេរីវេវិជ្ជមានបញ្ជាក់ថាអនុគមន៍កើន (Increasing function)។',
    },
  ],

  'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត': [
    {
      text: 'គណនាតម្លៃនៃ $\\log_{10}(1000)$។',
      type: 'MULTIPLE_CHOICE',
      options: ['3', '2', '10', '100'],
      correctAnswer: 0,
      points: 10,
      explanation: '$1000 = 10^3 \\implies \\log_{10}(10^3) = 3$។',
    },
    {
      text: 'សម្រួលកន្សោម $e^{2\\ln 5}$។',
      type: 'MULTIPLE_CHOICE',
      options: ['25', '10', '5', 'e^10'],
      correctAnswer: 0,
      points: 10,
      explanation: '$e^{2\\ln 5} = e^{\\ln(5^2)} = 5^2 = 25$។',
    },
    {
      text: 'តាមលក្ខណៈស្វ័យគុណ៖ $a^m \\times a^n = a^{m+n}$។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'ផលគុណស្វ័យគុណគោលដូចគ្នា គេបូកនិទស្សន្ត។',
    },
    {
      text: 'ដោះស្រាយសមីការ $3^x = 81$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '4',
      points: 10,
      explanation: '$81 = 3^4 \\implies 3^x = 3^4 \\implies x = 4$។',
    },
  ],

  'អាំងតេក្រាល និងអនុវត្តន៍': [
    {
      text: 'គណនាអាំងតេក្រាល $\\int 4x^3 dx$។',
      type: 'MULTIPLE_CHOICE',
      options: ['x^4 + C', '12x^2 + C', '4x^4 + C', 'x^3 + C'],
      correctAnswer: 0,
      points: 10,
      explanation: '$\\int 4x^3 dx = 4 \\left(\\dfrac{x^4}{4}\\right) + C = x^4 + C$។',
    },
    {
      text: 'គណនាអាំងតេក្រាលកំណត់ $\\int_0^2 3x^2 dx$។',
      type: 'MULTIPLE_CHOICE',
      options: ['8', '6', '12', '4'],
      correctAnswer: 0,
      points: 10,
      explanation: '$\\int_0^2 3x^2 dx = [x^3]_0^2 = 2^3 - 0 = 8$។',
    },
    {
      text: 'អាំងតេក្រាលកំណត់ពី $a$ ទៅ $a$ នៃអនុគមន៍ណាមួយគឺស្មើនឹងសូន្យ ($\\int_a^a f(x) dx = 0$)។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'គោលកាត់ទាបនិងលើដូចគ្នា នាំអោយ $F(a) - F(a) = 0$។',
    },
    {
      text: 'គណនាក្រឡាផ្ទៃខណ្ឌដោយបន្ទាត់ $y = 2x$ និងអ័ក្ស $x$ ពី $x=0$ ទៅ $x=3$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '9',
      points: 10,
      explanation: '$S = \\int_0^3 2x dx = [x^2]_0^3 = 3^2 - 0 = 9$។',
    },
  ],

  'ស្ថិតិមានពីរអញ្ញាត': [
    {
      text: 'ចំណុចមធ្យម $G(\\bar{x}, \\bar{y})$ នៃទិន្នន័យពីរអញ្ញាត តែងតែស្ថិតនៅលើបន្ទាត់តម្រឹមលីនេអ៊ែរជានិច្ច។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'បន្ទាត់តម្រឹមលីនេអ៊ែរតាមវិធីកាដារេអប្បបរមា តែងតែឆ្លងកាត់ទីប្រជុំទម្ងន់ $G(\\bar{x}, \\bar{y})$។',
    },
    {
      text: 'បើមេគុណកូរ៉េឡាស្យុងលីនេអ៊ែរ $r = 0.95$ តើវាបញ្ជាក់ពីអ្វី?',
      type: 'MULTIPLE_CHOICE',
      options: ['អញ្ញាតទាំងពីរមានទំនាក់ទំនងលីនេអ៊ែរខ្លាំង', 'អញ្ញាតទាំងពីរគ្មានទំនាក់ទំនងគ្នាទេ', 'អញ្ញាតទាំងពីរមានទំនាក់ទំនងច្រាសគ្នាខ្លាំង', 'ទិន្នន័យមានកំហុស'],
      correctAnswer: 0,
      points: 10,
      explanation: 'កាលណា $r$ ខិតជិត ១ បញ្ជាក់ថាទិន្នន័យមានទំនាក់ទំនងលីនេអ៊ែរវិជ្ជមានខ្លាំង។',
    },
    {
      text: 'គណនាមធ្យម $\\bar{x}$ នៃទិន្នន័យ $x: 2, 4, 6, 8, 10$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '6',
      points: 10,
      explanation: '$\\bar{x} = \\dfrac{2+4+6+8+10}{5} = \\dfrac{30}{5} = 6$។',
    },
    {
      text: 'សមីការបន្ទាត់តម្រឹមលីនេអ៊ែរមានទម្រង់ទូទៅ $y = ax + [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 'b',
      points: 10,
      explanation: 'សមីការបន្ទាត់តម្រឹមគឺ $y = ax + b$។',
    },
  ],

  'ប្រូបាប': [
    {
      text: 'ក្នុងថ្នាក់មួយមានសិស្សប្រុស 12 នាក់ និងស្រី 18 នាក់។ ជ្រើសរើសសិស្សម្នាក់ដោយចៃដន្យ។ តើប្រូបាបបានសិស្សស្រីស្មើប៉ុន្មាន?',
      type: 'MULTIPLE_CHOICE',
      options: ['3/5', '2/5', '18/12', '1/2'],
      correctAnswer: 0,
      points: 10,
      explanation: 'សិស្សសរុប = $12 + 18 = 30$។ ប្រូបាបបានសិស្សស្រី = $18/30 = 3/5$។',
    },
    {
      text: 'ប្រូបាបនៃព្រឹត្តិការណ៍ប្រាកដ (Sure Event) គឺស្មើនឹង ១ ជានិច្ច។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'ព្រឹត្តិការណ៍ប្រាកដមានប្រូបាបស្មើ ១ (ឬ 100%)។',
    },
    {
      text: 'បោះគ្រាប់ឡុកឡាក់មួយគ្រាប់។ តើប្រូបាបចេញលេខគូស្មើប៉ុន្មាន? (សរសេរជាប្រភាគ a/b)',
      type: 'SHORT_ANSWER',
      correctAnswer: '1/2',
      points: 10,
      explanation: 'លេខគូមាន 2, 4, 6 (3 ករណី) ក្នុងចំណោម 6 ករណី។ ប្រូបាប = 3/6 = 1/2។',
    },
  ],

  'គណិតវិទ្យាហិរញ្ញវត្ថុ': [
    {
      text: 'ប្រាក់បញ្ញើដើម $1000 ទទួលបានការប្រាក់ទោល 5% ក្នុងមួយឆ្នាំ។ តើប្រាក់ការសរុបទទួលបានក្រោយរយៈពេល 2 ឆ្នាំស្មើប៉ុន្មានដុល្លារ?',
      type: 'MULTIPLE_CHOICE',
      options: ['$100', '$50', '$1050', '$1100'],
      correctAnswer: 0,
      points: 10,
      explanation: 'តាមរូបមន្តការប្រាក់ទោល $I = P \\times r \\times t = 1000 \\times 0.05 \\times 2 = 100$ ដុល្លារ។',
    },
    {
      text: 'ការប្រាក់សមាស (Compound Interest) គឺជាការប្រាក់ដែលគិតទាំងលើដើមទុន និងលើការប្រាក់ដែលបានបង្កើតនៅគ្រាមុនៗ។',
      type: 'TRUE_FALSE',
      options: ['TRUE', 'FALSE'],
      correctAnswer: 'TRUE',
      points: 5,
      explanation: 'នេះជានិយមន័យនៃការប្រាក់សមាស (ការប្រាក់កូនជាន់ចៅ)។',
    },
    {
      text: 'គណនាប្រាក់សរុប $A$ តាមការប្រាក់ទោល បើដើមទុន $P = 500$ និងការប្រាក់ $I = 75$។',
      type: 'SHORT_ANSWER',
      correctAnswer: '575',
      points: 10,
      explanation: 'ប្រាក់សរុប $A = P + I = 500 + 75 = 575$។',
    },
    {
      text: 'រូបមន្តការប្រាក់ទោល៖ $I = P \\cdot r \\cdot [___]$',
      type: 'FILL_IN_BLANK',
      correctAnswer: 't',
      points: 10,
      explanation: 'ការប្រាក់ស្មើដើមទុន គុណអត្រាការប្រាក់ គុណរយៈពេល $t$។',
    },
  ],
};

async function seedTrackPractice(
  subjectCode: string,
  trackKh: string,
  practiceMap: Record<string, QuestionSeed[]>,
) {
  console.log(`\n======================================================`);
  console.log(`🎯 Seeding Practice Bank: ${subjectCode} (${trackKh})`);
  console.log(`======================================================`);

  const subject = await prisma.subject.findUnique({
    where: { code: subjectCode },
    select: { id: true },
  });

  if (!subject) {
    console.log(`⚠️ Subject ${subjectCode} not found in DB. Run seed-topics-math-g12 first.`);
    return;
  }

  const author = AUTHOR_OVERRIDE
    ? await prisma.user.findUnique({ where: { id: AUTHOR_OVERRIDE }, select: { id: true, role: true } })
    : await prisma.user.findFirst({
        where: { role: { in: ['TEACHER', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true, role: true },
      });

  if (!author) {
    console.log(`⚠️ No teacher/admin user found to author practice quizzes.`);
    return;
  }

  let created = 0;
  let updated = 0;
  let missing = 0;

  for (const [unitName, rawQuestions] of Object.entries(practiceMap)) {
    const topic = await prisma.topic.findFirst({
      where: { subjectId: subject.id, parentId: null, name: unitName },
      select: { id: true, nameKh: true },
    });

    if (!topic) {
      console.log(`  ⏭️  Unit "${unitName}" not found under ${subjectCode} — skipping.`);
      missing += 1;
      continue;
    }

    const title = `Practice: ${unitName}`;
    const prepared = prepareQuizQuestions(
      rawQuestions.map((q, idx) => ({ ...q, id: `g12-${subjectCode}-${idx}`, topicId: topic.id })),
      { validTopicIds: new Set([topic.id]) },
    );

    const existing = await prisma.post.findFirst({
      where: { authorId: author.id, postType: 'QUIZ', title },
      select: { id: true },
    });

    if (existing) {
      console.log(`  ✏️  [UPDATE] "${title}" — ${prepared.rows.length} row-backed questions -> topic ${topic.id}`);
      updated += 1;
      if (APPLY) {
        await prisma.$transaction(async (tx) => {
          await tx.post.update({
            where: { id: existing.id },
            data: {
              content: `លំហាត់អនុវត្តន៍ ${topic.nameKh ?? unitName} (គណិតវិទ្យា ថ្នាក់ទី១២ - ${trackKh})`,
            },
          });
          const quiz = await tx.quiz.findFirst({ where: { postId: existing.id }, select: { id: true } });
          if (quiz) {
            await tx.quiz.update({
              where: { id: quiz.id },
              data: {
                questions: prepared.questionsJson as any,
                timeLimit: 0,
                passingScore: 70,
                totalPoints: prepared.questionsJson.reduce((sum, q) => sum + q.points, 0),
              },
            });
            await tx.quizQuestion.deleteMany({ where: { postId: existing.id } });
            await tx.quizQuestion.createMany({
              data: prepared.rows.map((row) => ({
                id: row.id,
                postId: existing.id,
                question: row.question,
                options: row.options,
                correctAnswer: row.correctAnswer,
                points: row.points,
                position: row.position,
                explanation: row.explanation,
                topicId: row.topicId,
                difficulty: row.difficulty,
              })),
            });
          }
        }, { maxWait: 20000, timeout: 60000 });
      }
    } else {
      console.log(`  ➕ [CREATE] "${title}" — ${prepared.rows.length} row-backed questions -> topic ${topic.id}`);
      created += 1;
      if (APPLY) {
        await prisma.post.create({
          data: {
            authorId: author.id,
            title,
            content: `លំហាត់អនុវត្តន៍ ${topic.nameKh ?? unitName} (គណិតវិទ្យា ថ្នាក់ទី១២ - ${trackKh})`,
            postType: 'QUIZ',
            visibility: 'PUBLIC',
            quizQuestions: {
              create: prepared.rows.map((row) => ({
                id: row.id,
                question: row.question,
                options: row.options,
                correctAnswer: row.correctAnswer,
                points: row.points,
                position: row.position,
                explanation: row.explanation,
                topicId: row.topicId,
                difficulty: row.difficulty,
              })),
            },
            quiz: {
              create: {
                questions: prepared.questionsJson as any,
                timeLimit: 0,
                passingScore: 70,
                totalPoints: prepared.questionsJson.reduce((sum, q) => sum + q.points, 0),
              },
            },
          },
        });
      }
    }
  }

  console.log(`\n✅ Track ${subjectCode} Done: ${created} created, ${updated} updated, ${missing} missing.`);
}

async function seed() {
  console.log(`🌱 Grade-12 Math practice seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  await seedTrackPractice('MATH-G12-SCIENCE', 'ថ្នាក់វិទ្យាសាស្ត្រ', SCIENCE_PRACTICE);
  await seedTrackPractice('MATH-G12-SOCIAL', 'ថ្នាក់វិទ្យាសាស្ត្រសង្គម', SOCIAL_PRACTICE);

  console.log(`\n🎉 All Grade 12 practice banks processed successfully!`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
