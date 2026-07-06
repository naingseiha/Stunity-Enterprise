/**
 * Seed: Bac II Simulated Exam Papers (2021–2024) for Grade 12 Mathematics.
 *
 * Supports both Science Track (MATH-G12-SCIENCE, 150 mins, 125 marks)
 * and Social Science Track (MATH-G12-SOCIAL, 120 mins, 75 marks).
 *
 * Each exam paper is created as a QUIZ post with simulated national exam questions
 * covering multiple schemas (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ORDERING, MATCHING).
 * Each question is tagged with its corresponding topicId so that Spaced Repetition (SM-2)
 * and Recall Cards index the student's mastery per unit even during full simulated exams!
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: updates existing QUIZ posts
 * or creates new ones.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-exams-math-g12.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-exams-math-g12.ts --apply  # write
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

type ExamQuestionSeed = {
  unitName: string; // Used to lookup topicId in DB
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';
  options?: string[];
  correctAnswer: any;
  points: number;
  explanation: string;
  /** 1 (easiest) .. 5 (hardest) — optional, only for newly-authored questions. */
  difficulty?: number;
};

type ExamPaperSeed = {
  title: string;
  year: number;
  timeLimit: number; // minutes
  passingScore: number; // marks
  questions: ExamQuestionSeed[];
};

// =========================================================================
// 1. SCIENCE TRACK EXAM PAPERS (150 mins, Max 125 marks)
// =========================================================================
const SCIENCE_EXAMS: ExamPaperSeed[] = [
  {
    title: 'វិញ្ញាសាប្រឡងបាក់ឌុប គណិតវិទ្យា ឆ្នាំ២០២៤ (ថ្នាក់វិទ្យាសាស្ត្រ)',
    year: 2024,
    timeLimit: 150,
    passingScore: 63,
    questions: [
      {
        unitName: 'លីមីតនៃអនុគមន៍',
        text: 'គណនាលីមីត $L = \\lim_{x \\to 0} \\dfrac{\\sqrt{1+4x} - 1}{x}$។',
        type: 'MULTIPLE_CHOICE',
        options: ['2', '4', '1', '1/2'],
        correctAnswer: 0,
        points: 15,
        explanation: 'គុណនឹងកន្សោមឆ្លាស់ $\\dfrac{(\\sqrt{1+4x}-1)(\\sqrt{1+4x}+1)}{x(\\sqrt{1+4x}+1)} = \\dfrac{4x}{x(\\sqrt{1+4x}+1)} \\implies L = \\dfrac{4}{1+1} = 2$។',
      },
      {
        unitName: 'ចំនួនកុំផ្លិច',
        text: 'ដោះស្រាយសមីការកុំផ្លិច $z^2 - 2z + 5 = 0$ ក្នុងសំណុំចំនួនកុំផ្លិច $\\mathbb{C}$។',
        type: 'MULTIPLE_CHOICE',
        options: ['z = 1 \\pm 2i', 'z = -1 \\pm 2i', 'z = 2 \\pm i', 'z = 1 \\pm 3i'],
        correctAnswer: 0,
        points: 15,
        explanation: '$\\Delta\' = (-1)^2 - (1)(5) = 1 - 5 = -4 = (2i)^2$។ ឫសគឺ $z = 1 \\pm 2i$។',
      },
      {
        unitName: 'អាំងតេក្រាល',
        text: 'គណនាអាំងតេក្រាលកំណត់ $I = \\int_0^{\\pi/2} \\sin^3 x \\cos x dx$។',
        type: 'MULTIPLE_CHOICE',
        options: ['1/4', '1/2', '1', '1/3'],
        correctAnswer: 0,
        points: 15,
        explanation: 'តាង $u = \\sin x \\implies du = \\cos x dx$។ ពេល $x=0, u=0$; ពេល $x=\\pi/2, u=1$។ $I = \\int_0^1 u^3 du = [\\dfrac{u^4}{4}]_0^1 = \\dfrac{1}{4}$។',
      },
      {
        unitName: 'សមីការឌីផេរ៉ង់ស្យែល',
        text: 'សមីការឌីផេរ៉ង់ស្យែល $y\'\' + 4y = 0$ មានចម្លើយទូទៅគឺ $y = A\\cos(2x) + B\\sin(2x)$។',
        type: 'TRUE_FALSE',
        options: ['TRUE', 'FALSE'],
        correctAnswer: 'TRUE',
        points: 10,
        explanation: 'សមីការសម្គាល់ $r^2 + 4 = 0 \\implies r = \\pm 2i$។ ចម្លើយទូទៅគឺ $y = A\\cos(2x) + B\\sin(2x)$។',
      },
      {
        unitName: 'ធរណីមាត្រក្នុងលំហ',
        text: 'ក្នុងលំហកូអរដោនេ $(O, \\vec{i}, \\vec{j}, \\vec{k})$ រកចម្ងាយពីចំណុច $A(1, 2, 3)$ ទៅប្លង់ $(P): 2x - y + 2z - 3 = 0$។',
        type: 'SHORT_ANSWER',
        correctAnswer: '1',
        points: 15,
        explanation: '$d(A, P) = \\dfrac{|2(1) - (2) + 2(3) - 3|}{\\sqrt{2^2 + (-1)^2 + 2^2}} = \\dfrac{|2 - 2 + 6 - 3|}{\\sqrt{9}} = \\dfrac{3}{3} = 1$។',
      },
      {
        unitName: 'ដេរីវេនៃអនុគមន៍',
        text: 'រៀបចំជំហានសិក្សាអនូតោនភាពនៃអនុគមន៍ $f(x) = x^3 - 3x$៖',
        type: 'ORDERING',
        options: [
          'គណនាដេរីវេ៖ $f\'(x) = 3x^2 - 3$',
          'ដាក់ជាកត្តា និងរកឫស៖ $3(x-1)(x+1) = 0 \\implies x = -1$ ឬ $x = 1$',
          'សង់តារាងសញ្ញា៖ $f\'(x) > 0$ លើ $(-\\infty, -1) \\cup (1, +\\infty)$ និង $f\'(x) < 0$ លើ $(-1, 1)$',
          'កំណត់បរិមា៖ អតិបរមាធៀបត្រង់ $x = -1$ គឺ $y = 2$ និងអប្បបរមាធៀបត្រង់ $x = 1$ គឺ $y = -2$',
        ],
        correctAnswer: [0, 1, 2, 3],
        points: 20,
        explanation: 'ជំហានស្តង់ដាក្នុងការសិក្សាអនូតោនភាព និងរកចំណុចបរិមានៃអនុគមន៍ពហុធា។',
      },
      {
        unitName: 'ប្រូបាប',
        text: 'ក្នុងថង់មួយមានប៊ូលក្រហម 4 និងស 6។ ចាប់យកប៊ូល 2 ព្រមគ្នាដោយចៃដន្យ។ តើប្រូបាបបានប៊ូលក្រហមទាំង 2 ស្មើប៉ុន្មាន? (សរសេរជាប្រភាគ a/b)',
        type: 'SHORT_ANSWER',
        correctAnswer: '2/15',
        points: 15,
        explanation: 'ចំនួនករណីអាច $C(10, 2) = 45$។ ចំនួនករណីស្រប $C(4, 2) = 6$។ ប្រូបាប $= 6/45 = 2/15$។',
      },
      {
        unitName: 'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត',
        text: 'ដោះស្រាយសមីការ $\\ln(x+2) + \\ln(x-1) = \\ln 4$។ (ចម្លើយជាលេខវិជ្ជមាន)',
        type: 'SHORT_ANSWER',
        correctAnswer: '2',
        points: 20,
        explanation: 'លក្ខខណ្ឌ $x > 1$។ $\\ln[(x+2)(x-1)] = \\ln 4 \\implies x^2 + x - 2 = 4 \\implies x^2 + x - 6 = 0 \\implies x = 2$ ឬ $x = -3$។ តាមលក្ខខណ្ឌយក $x=2$។',
      },
    ],
  },
  {
    title: 'វិញ្ញាសាប្រឡងបាក់ឌុប គណិតវិទ្យា ឆ្នាំ២០២៣ (ថ្នាក់វិទ្យាសាស្ត្រ)',
    year: 2023,
    timeLimit: 150,
    passingScore: 63,
    questions: [
      {
        unitName: 'លីមីតនៃអនុគមន៍',
        text: 'គណនាលីមីត $L = \\lim_{x \\to 0} \\dfrac{1 - \\cos(4x)}{x^2}$។',
        type: 'MULTIPLE_CHOICE',
        options: ['8', '4', '16', '2'],
        correctAnswer: 0,
        points: 15,
        explanation: '$1 - \\cos(4x) = 2\\sin^2(2x)$។ $L = \\lim_{x \\to 0} \\dfrac{2\\sin^2(2x)}{x^2} = 2 \\times 2^2 = 8$។',
      },
      {
        unitName: 'ចំនួនកុំផ្លិច',
        text: 'គណនាម៉ូឌុលនៃចំនួនកុំផ្លិច $z = (1 + i\\sqrt{3})^2$។',
        type: 'MULTIPLE_CHOICE',
        options: ['4', '2', '8', '16'],
        correctAnswer: 0,
        points: 15,
        explanation: 'ម៉ូឌុល $|1 + i\\sqrt{3}| = \\sqrt{1 + 3} = 2$។ ដូច្នេះ $|z| = 2^2 = 4$។',
      },
      {
        unitName: 'អាំងតេក្រាល',
        text: 'គណនាអាំងតេក្រាល $\\int_0^1 x e^{x^2} dx$។',
        type: 'MULTIPLE_CHOICE',
        options: ['\\dfrac{e - 1}{2}', 'e - 1', '\\dfrac{e + 1}{2}', '2(e - 1)'],
        correctAnswer: 0,
        points: 15,
        explanation: 'តាង $u = x^2 \\implies du = 2x dx \\implies x dx = du/2$។ $I = \\dfrac{1}{2} [e^u]_0^1 = \\dfrac{e - 1}{2}$។',
      },
      {
        unitName: 'សមីការឌីផេរ៉ង់ស្យែល',
        text: 'ដោះស្រាយសមីការឌីផេរ៉ង់ស្យែល $y\' - 2y = 4$។',
        type: 'MULTIPLE_CHOICE',
        options: ['y = A e^{2x} - 2', 'y = A e^{-2x} + 2', 'y = A e^{2x} + 4', 'y = 2 e^{Ax} - 2'],
        correctAnswer: 0,
        points: 15,
        explanation: 'ចម្លើយទូទៅនៃ $y\' - ay = b$ គឺ $y = A e^{ax} - b/a$។ ក្នុងទីនេះ $a=2, b=4 \\implies y = A e^{2x} - 2$។',
      },
      {
        unitName: 'ធរណីមាត្រក្នុងលំហ',
        text: 'សមីការប្លង់មេដ្យាទ័រនៃអង្កត់ $[AB]$ ដែល $A(0, 2, 4)$ និង $B(2, 4, 6)$ គឺ $x + y + z - [___] = 0$',
        type: 'FILL_IN_BLANK',
        correctAnswer: '9',
        points: 20,
        explanation: 'ចំណុចកណ្តាល $I(1, 3, 5)$។ វ៉ិចទ័រ $\\overrightarrow{AB} = (2, 2, 2) // (1, 1, 1)$។ សមីការ៖ $1(x-1) + 1(y-3) + 1(z-5) = 0 \\implies x+y+z-9=0$។',
      },
      {
        unitName: 'ស្ថិតិ និងបំណែងចែកប្រូបាប',
        text: 'សង្ឃឹមគណិតនៃបំណែងចែកទ្វេធា $B(20, 0.4)$ គឺស្មើនឹង៖',
        type: 'SHORT_ANSWER',
        correctAnswer: '8',
        points: 15,
        explanation: '$E(X) = n \\times p = 20 \\times 0.4 = 8$។',
      },
      {
        unitName: 'ដេរីវេនៃអនុគមន៍',
        text: 'បើ $f(x) = x \\ln x$ នោះដេរីវេទី ២ $f\'\'(1)$ ស្មើប៉ុន្មាន?',
        type: 'SHORT_ANSWER',
        correctAnswer: '1',
        points: 15,
        explanation: '$f\'(x) = \\ln x + 1 \\implies f\'\'(x) = 1/x \\implies f\'\'(1) = 1$។',
      },
      {
        unitName: 'សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់ និងប្លង់ក្នុងលំហ',
        text: 'ផ្គូរផ្គងសមីការទៅនឹងប្រភេទរូបធរណីមាត្រក្នុងលំហ៖',
        type: 'MATCHING',
        options: ['2x - y + z - 4 = 0', 'x^2 + y^2 + z^2 = 9', 'x = 1+t, y = 2-t, z = 3t'],
        correctAnswer: ['សមីការប្លង់', 'សមីការស្វ៊ែរ', 'សមីការប៉ារ៉ាម៉ែត្របន្ទាត់'],
        points: 15,
        explanation: 'ទម្រង់ទូទៅនៃសមីការប្លង់ ស្វ៊ែរ និងបន្ទាត់ក្នុងលំហ។',
      },
    ],
  },
];

// =========================================================================
// 2. SOCIAL SCIENCE TRACK EXAM PAPERS (120 mins, Max 75 marks)
// =========================================================================
const SOCIAL_EXAMS: ExamPaperSeed[] = [
  {
    title: 'វិញ្ញាសាប្រឡងបាក់ឌុប គណិតវិទ្យា ឆ្នាំ២០២៤ (ថ្នាក់វិទ្យាសាស្ត្រសង្គម)',
    year: 2024,
    timeLimit: 120,
    passingScore: 38,
    questions: [
      {
        unitName: 'លីមីត និងដេរីវេនៃអនុគមន៍',
        text: 'គណនាលីមីត $\\lim_{x \\to 2} \\dfrac{x^2 - 4}{x - 2}$។',
        type: 'MULTIPLE_CHOICE',
        options: ['4', '2', '0', '8'],
        correctAnswer: 0,
        points: 10,
        explanation: '$\\lim_{x \\to 2} \\dfrac{(x-2)(x+2)}{x-2} = \\lim_{x \\to 2} (x+2) = 2 + 2 = 4$។',
      },
      {
        unitName: 'លីមីត និងដេរីវេនៃអនុគមន៍',
        text: 'ដេរីវេនៃអនុគមន៍ $y = 3x^3 - 4x^2 + 5x - 1$ ត្រង់ $x=1$ គឺស្មើនឹង៖',
        type: 'MULTIPLE_CHOICE',
        options: ['6', '5', '1', '14'],
        correctAnswer: 0,
        points: 10,
        explanation: '$y\' = 9x^2 - 8x + 5 \\implies y\'(1) = 9(1) - 8(1) + 5 = 6$។',
      },
      {
        unitName: 'អាំងតេក្រាល និងអនុវត្តន៍',
        text: 'គណនាអាំងតេក្រាលកំណត់ $\\int_1^3 (2x + 1) dx$។',
        type: 'MULTIPLE_CHOICE',
        options: ['10', '8', '12', '14'],
        correctAnswer: 0,
        points: 10,
        explanation: '$\\int_1^3 (2x + 1) dx = [x^2 + x]_1^3 = (9 + 3) - (1 + 1) = 12 - 2 = 10$។',
      },
      {
        unitName: 'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត',
        text: 'ដោះស្រាយសមីការ $2^{2x} = 16$។ តើ $x$ ស្មើប៉ុន្មាន?',
        type: 'SHORT_ANSWER',
        correctAnswer: '2',
        points: 10,
        explanation: '$16 = 2^4 \\implies 2^{2x} = 2^4 \\implies 2x = 4 \\implies x = 2$។',
      },
      {
        unitName: 'ស្ថិតិមានពីរអញ្ញាត',
        text: 'ទីប្រជុំទម្ងន់នៃទិន្នន័យ $(2, 4), (4, 6), (6, 8)$ គឺចំណុច $G(4, [___])$',
        type: 'FILL_IN_BLANK',
        correctAnswer: '6',
        points: 10,
        explanation: '$\\bar{y} = \\dfrac{4 + 6 + 8}{3} = \\dfrac{18}{3} = 6$។',
      },
      {
        unitName: 'ប្រូបាប',
        text: 'បោះកាក់ ២ ព្រមគ្នា។ តើប្រូបាបបានមុខក្បាល (H) យ៉ាងតិច ១ ស្មើប៉ុន្មាន? (សរសេរជាប្រភាគ a/b)',
        type: 'SHORT_ANSWER',
        correctAnswer: '3/4',
        points: 10,
        explanation: 'ករណីអាចទាំងអស់មាន {HH, HT, TH, TT} = 4។ ករណីបានក្បាលយ៉ាងតិច ១ មាន {HH, HT, TH} = 3។ ប្រូបាប = 3/4។',
      },
      {
        unitName: 'គណិតវិទ្យាហិរញ្ញវត្ថុ',
        text: 'ប្រាក់ដើម $500 ដាក់បញ្ញើដោយការប្រាក់ទោល 6% ក្នុងមួយឆ្នាំ។ តើប្រាក់ការទទួលបានក្នុងរយៈពេល 3 ឆ្នាំស្មើប៉ុន្មានដុល្លារ?',
        type: 'SHORT_ANSWER',
        correctAnswer: '90',
        points: 15,
        explanation: '$I = P \\times r \\times t = 500 \\times 0.06 \\times 3 = 90$ ដុល្លារ។',
      },
    ],
  },
  {
    title: 'វិញ្ញាសាប្រឡងបាក់ឌុប គណិតវិទ្យា ឆ្នាំ២០២៣ (ថ្នាក់វិទ្យាសាស្ត្រសង្គម)',
    year: 2023,
    timeLimit: 120,
    passingScore: 38,
    questions: [
      {
        unitName: 'លីមីត និងដេរីវេនៃអនុគមន៍',
        text: 'គណនាលីមីត $\\lim_{x \\to 1} \\dfrac{x^2 + 3x - 4}{x - 1}$។',
        type: 'MULTIPLE_CHOICE',
        options: ['5', '4', '1', '0'],
        correctAnswer: 0,
        points: 10,
        explanation: '$x^2 + 3x - 4 = (x-1)(x+4) \\implies \\lim_{x \\to 1} (x+4) = 1 + 4 = 5$។',
      },
      {
        unitName: 'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត',
        text: 'កន្សោម $\\ln(e^3) + \\ln(1)$ ស្មើនឹង៖',
        type: 'MULTIPLE_CHOICE',
        options: ['3', '4', 'e^3', '0'],
        correctAnswer: 0,
        points: 10,
        explanation: '$\\ln(e^3) = 3$ និង $\\ln(1) = 0 \\implies 3 + 0 = 3$។',
      },
      {
        unitName: 'អាំងតេក្រាល និងអនុវត្តន៍',
        text: 'អាំងតេក្រាលមិនកំណត់ $\\int (6x^2 - 2x + 5) dx = 2x^3 - x^2 + 5x + C$។',
        type: 'TRUE_FALSE',
        options: ['TRUE', 'FALSE'],
        correctAnswer: 'TRUE',
        points: 10,
        explanation: 'ធ្វើដេរីវេនៃ $2x^3 - x^2 + 5x + C$ គឺបាន $6x^2 - 2x + 5$ ពិតប្រាកដមែន។',
      },
      {
        unitName: 'ស្ថិតិមានពីរអញ្ញាត',
        text: 'ក្នុងសមីការបន្ទាត់តម្រឹមលីនេអ៊ែរ $y = ax + b$ មេគុណប្រាប់ទិស $a$ ហៅថាមេគុណ [___]',
        type: 'FILL_IN_BLANK',
        correctAnswer: 'តម្រឹម',
        points: 10,
        explanation: 'មេគុណ a ហៅថាមេគុណតម្រឹមលីនេអ៊ែររបស់ y លើ x។',
      },
      {
        unitName: 'ប្រូបាប',
        text: 'ក្នុងប្រអប់មួយមានប៊ូលលឿង 5 និងខៀវ 3។ ចាប់យកប៊ូលមួយដោយចៃដន្យ។ តើប្រូបាបបានប៊ូលខៀវស្មើប៉ុន្មាន? (សរសេរជាប្រភាគ a/b)',
        type: 'SHORT_ANSWER',
        correctAnswer: '3/8',
        points: 15,
        explanation: 'ចំនួនប៊ូលខៀវ = 3, ចំនួនសរុប = 8។ ប្រូបាប = 3/8។',
      },
      {
        unitName: 'គណិតវិទ្យាហិរញ្ញវត្ថុ',
        text: 'រៀបចំជំហានគណនាប្រាក់សរុប $A$ តាមការប្រាក់សមាស (Compound Interest)៖',
        type: 'ORDERING',
        options: [
          'កំណត់ប្រាក់ដើម $P$, អត្រាការប្រាក់ប្រចាំគ្រា $r$, និងចំនួនគ្រា $n$',
          'សរសេររូបមន្តការប្រាក់សមាស៖ $A = P(1 + r)^n$',
          'ជំនួសលេខចូលក្នុងរូបមន្ត',
          'គណនាតម្លៃចុងក្រោយ $A$',
        ],
        correctAnswer: [0, 1, 2, 3],
        points: 20,
        explanation: 'ជំហានស្តង់ដាក្នុងការគណនាប្រាក់សរុបតាមការប្រាក់សមាស។',
      },
    ],
  },
];

async function seedTrackExams(subjectCode: string, trackKh: string, examPapers: ExamPaperSeed[]) {
  console.log(`\n======================================================`);
  console.log(`📜 Seeding Bac II Exam Papers: ${subjectCode} (${trackKh})`);
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
    console.log(`⚠️ No teacher/admin user found to author exam quizzes.`);
    return;
  }

  // Pre-fetch all topics for this subject to map unit names to topicIds
  const topics = await prisma.topic.findMany({
    where: { subjectId: subject.id },
    select: { id: true, name: true, nameKh: true },
  });

  const topicMap = new Map<string, string>();
  for (const t of topics) {
    topicMap.set(t.name, t.id);
    if (t.nameKh) topicMap.set(t.nameKh, t.id);
  }

  let created = 0;
  let updated = 0;

  for (const paper of examPapers) {
    // Map each question to its unit topicId
    const rawQuestionsWithTopic = paper.questions.map((q, idx) => {
      const topicId = topicMap.get(q.unitName) || null;
      return {
        ...q,
        id: `bac2-${paper.year}-${subjectCode}-${idx}`,
        topicId,
      };
    });

    const validTopicIds = new Set(Array.from(topicMap.values()));
    const prepared = prepareQuizQuestions(rawQuestionsWithTopic, { validTopicIds });

    const existing = await prisma.post.findFirst({
      where: { authorId: author.id, postType: 'QUIZ', title: paper.title },
      select: { id: true },
    });

    const totalPoints = prepared.questionsJson.reduce((sum, q) => sum + q.points, 0);

    if (existing) {
      console.log(`  ✏️  [UPDATE] "${paper.title}" (${paper.year}) — ${prepared.rows.length} row-backed questions`);
      updated += 1;
      if (APPLY) {
        await prisma.$transaction(async (tx) => {
          await tx.post.update({
            where: { id: existing.id },
            data: {
              content: `វិញ្ញាសាត្រៀមប្រឡងសញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ (បាក់ឌុប) ឆ្នាំ${paper.year} - ${trackKh}។ រយៈពេល ៖ ${paper.timeLimit} នាទី, ពិន្ទុសរុប ៖ ${totalPoints}។`,
              courseCode: subjectCode,
              examDate: new Date(`${paper.year}-11-01`),
              examDuration: paper.timeLimit,
              examTotalPoints: totalPoints,
              examPassingScore: paper.passingScore,
            },
          });
          const quiz = await tx.quiz.findFirst({ where: { postId: existing.id }, select: { id: true } });
          if (quiz) {
            await tx.quiz.update({
              where: { id: quiz.id },
              data: {
                questions: prepared.questionsJson as any,
                timeLimit: paper.timeLimit,
                passingScore: paper.passingScore,
                totalPoints,
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
      console.log(`  ➕ [CREATE] "${paper.title}" (${paper.year}) — ${prepared.rows.length} row-backed questions`);
      created += 1;
      if (APPLY) {
        await prisma.post.create({
          data: {
            authorId: author.id,
            title: paper.title,
            content: `វិញ្ញាសាត្រៀមប្រឡងសញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ (បាក់ឌុប) ឆ្នាំ${paper.year} - ${trackKh}។ រយៈពេល ៖ ${paper.timeLimit} នាទី, ពិន្ទុសរុប ៖ ${totalPoints}។`,
            postType: 'QUIZ',
            visibility: 'PUBLIC',
            courseCode: subjectCode,
            examDate: new Date(`${paper.year}-11-01`),
            examDuration: paper.timeLimit,
            examTotalPoints: totalPoints,
            examPassingScore: paper.passingScore,
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
                timeLimit: paper.timeLimit,
                passingScore: paper.passingScore,
                totalPoints,
              },
            },
          },
        });
      }
    }
  }

  console.log(`\n✅ Track ${subjectCode} Exams Done: ${created} created, ${updated} updated.`);
}

async function seed() {
  console.log(`🌱 Grade-12 Math Bac II Exam Papers seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  await seedTrackExams('MATH-G12-SCIENCE', 'ថ្នាក់វិទ្យាសាស្ត្រ', SCIENCE_EXAMS);
  await seedTrackExams('MATH-G12-SOCIAL', 'ថ្នាក់វិទ្យាសាស្ត្រសង្គម', SOCIAL_EXAMS);

  console.log(`\n🎉 All Bac II Exam Papers processed successfully!`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
